let video;
let controllerNode;
let showButtons;
let resetButton;
let increButton;
let decreButton;
let rewindButton;
let advanceButton;
let speedDisplay;
let timeDisplay;
let videoContainer;
let insertedNode;
let showTime;
let hasListeners;
let hasTimeUpdateListeners;
let titleElt;
let timer;

const defaultSpeed = 1.0;
const minSpeed = 0.25;
const interval = 0.25;
const maxSpeed = 16;
const seekInterval = 10;
const infTime = '&infin;';
const noTime = '--:--:--';
const zeroTime = '0:00';

let secondarySpeed = defaultSpeed;

let navigateEnd = true;

document.addEventListener('yt-navigate-start', () => {
    navigateEnd = false;
});
document.addEventListener('yt-navigate-finish', () => {
    navigateEnd = true;
    document.dispatchEvent(
        new CustomEvent("start-inject")
    );
});
document.addEventListener('start-inject', async () => {
    video = await waitForElm('video[src]');
    videoContainer = video.parentElement; // html5-video-player
    // remove controller for video tags without src attribute
        // find the video controller inserted previously if exists
        // remove the inserted controller
    if (insertedNode) insertedNode.remove();

    // inject controller for video tag with src attribute
    injectController();
});


// wait for element to exist
function waitForElm(selector) {
    return new Promise(resolve => {
        if (navigateEnd && document.querySelector(selector)) {
            return resolve(document.querySelector(selector));
        }

        const observer = new MutationObserver((mutations, obs) => {
            if (navigateEnd && document.querySelector(selector)) {
                obs.disconnect();
                resolve(document.querySelector(selector));
            }
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    });
}

let handleRewind = () => {
    seekVideo(-seekInterval);
};

let handleAdvance = () => {
    seekVideo(seekInterval);
};

let handleReset = () => {
    if (video.playbackRate !== defaultSpeed) {
        secondarySpeed = video.playbackRate;
        setPlaySpeed(defaultSpeed);
    } else setPlaySpeed(secondarySpeed);
};

let handleIncre = () => {
    setPlaySpeed(video.playbackRate+interval);
};

let handleDecre = () => {
    setPlaySpeed(video.playbackRate-interval);
};

let handleShortcuts = (event) => {
    const pressedCode = event.code
    // Ignore if following modifier is active.
    if (
        !event.getModifierState ||
        event.getModifierState("Alt") ||
        event.getModifierState("Control") ||
        event.getModifierState("Fn") ||
        event.getModifierState("Meta") ||
        event.getModifierState("Hyper") ||
        event.getModifierState("OS")
    ) {
        return;
    }

    // Ignore keydown event if typing in an input box
    if (
        event.target.nodeName === "INPUT" ||
        event.target.nodeName === "TEXTAREA" ||
        event.target.isContentEditable
    ) {
        return false;
    }

    if (pressedCode === 'KeyD') handleIncre();
    else if (pressedCode === 'KeyA') handleDecre();
    else if (pressedCode === 'KeyS') {
        if (video.playbackRate === defaultSpeed) updateShowTime();
        handleReset();
        showButtons();
    }
    else if (pressedCode === 'KeyL') {
        event.preventDefault();
        handleAdvance();
    }
    else if (pressedCode === 'KeyJ') {
        event.preventDefault();
        handleRewind();
    }
    else if (pressedCode === 'KeyR') restartVideo();
    else if (pressedCode === 'KeyV') controlController();

    return false;
};

let lastSpeed;
let spacePressed = false;
let spaceHeld = false;
document.addEventListener('keydown', function(event) {
    if (event.code !== 'Space') return;
    if (!spacePressed) {
        lastSpeed = video.playbackRate;
        spacePressed = true;
    } else {
        spaceHeld = true;
    }
});

document.addEventListener('keyup', function(event) {
    if (event.code !== 'Space') return;
    if (spaceHeld) {
        setPlaySpeed(lastSpeed);
        spaceHeld = false;
    }
    spacePressed = false;
});


// TODO: stop everything when disabled, including in the popup
// values set default for first-time users
let settings = {
    enable: true,
    enableController: true,
    enableShortcuts: true
};

function controlController() {
    // toggle controller
    if (timer) {
        clearTimeout(timer);
        timer = false;
        controllerNode.classList.add('vdc-disable');
        return;
    }
    settings.enableController = !settings.enableController;
    // update settings var and sync to chrome storage
    chrome.storage.sync.set({
        enableController: settings.enableController
    });
    // update UI
    showHideController();
}

function showHideController() {
    if (settings.enableController) {
        setupTimeUpdates();
        controllerNode.classList.remove('vdc-disable');
    } else {
        removeTimeUpdates();
        controllerNode.classList.add('vdc-disable');
    }
}

// initialize user settings
chrome.storage.sync.get(settings, async function(storage) {
    settings = storage;

    chrome.storage.onChanged.addListener(async (changes, area) => {
        if (!controllerNode) controllerNode = await waitForElm(".vdc-controller");

        if (changes.enableController) {
            settings.enableController = changes.enableController.newValue;
            showHideController();
        }
    
        if (changes.enableShortcuts) {
            settings.enableShortcuts = changes.enableShortcuts.newValue;
            if (settings.enableShortcuts) {
                document.addEventListener('keydown', handleShortcuts, true);
            }
            else {
                // cannot simply remove event listener if shortcuts were enabled in orphaned content script
                document.dispatchEvent(
                    new CustomEvent("removeshortcuts")
                );
            }
        }
    });
});

// disable shortcuts in orphaned content script
document.addEventListener('removeshortcuts', function() {
    document.removeEventListener('keydown', handleShortcuts, true);
});

/******************************* calculations *******************************/


function zeroPad(num, numFigure=2, char='0') {
    // assume num is a number
    num = num.toString();
    return num < 10 ? num.padStart(numFigure, char) : num;
}


function convertSecondToTimestamp(totalSeconds) {
    const totalSecondsAbs = Math.abs(totalSeconds);
    const hours = Math.floor(totalSecondsAbs / 3600);
    const minutes = Math.floor(totalSecondsAbs/60 - hours*60);
    const seconds = Math.floor(totalSecondsAbs % 60);

    let timeStr = hours !== 0 ? `${hours}:` : '';
    timeStr += hours !== 0 ? `${zeroPad(minutes)}:` : `${minutes}:`;
    timeStr += zeroPad(seconds);
    
    return timeStr;
}


// calculates remaining time at chosen speed
function calcDuration(time, speed) {
    return time/speed;
}


/***************************** Message handlers ******************************/


chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.msgType === 'decreSpeed') {
            handleDecre();
            sendResponse({msgType: request.msgType, speed: video.playbackRate, timeDisplay: getTimeDisplay()});
        }
        else if (request.msgType === 'increSpeed') {
            handleIncre();
            sendResponse({msgType: request.msgType, speed: video.playbackRate, timeDisplay: getTimeDisplay()});
        }
        else if (request.msgType === 'jumpSpeed') {
            handleReset();
            sendResponse({msgType: request.msgType, speed: video.playbackRate});
        }
        else if (request.msgType === 'rewind') {
            handleRewind();
            sendResponse({msgType: request.msgType, timeDisplay: getTimeDisplay()});
        }
        else if (request.msgType === 'advance') {
            handleAdvance();
            sendResponse({msgType: request.msgType, timeDisplay: getTimeDisplay()});
        }
        else if (request.msgType === 'restartVideo') {
            restartVideo();
            sendResponse({msgType: request.msgType, playing: !video.paused});
        }
        else if (request.msgType === 'playPauseVideo') {
            if (video.paused) video.play();
            else video.pause();
            sendResponse({msgType: request.msgType, playing: !video.paused});
        }
        else if (request.msgType === 'changeVolume') {
            video.muted = !video.muted;
            sendResponse({msgType: request.msgType, muted: video.muted});
        }
        else if (request.msgType === 'inject') {
            document.dispatchEvent(
                new CustomEvent("start-inject")
            );
        }
    }
);


/************************* Onscreen video controller **************************/

function seekVideo(interval) {
    if (interval < 0 && video.currentTime <= Math.abs(interval)) {
        video.currentTime = 0;
    }
    else if (interval > 0 && video.currentTime >= video.duration - interval) {
        video.currentTime = video.duration;
    }
    else video.currentTime += interval;
}


function restartVideo() {
    video.currentTime = 0;
    if (video.ended) video.play();
}


function setPlaySpeed(newSpeed) {
    // when ratechange event is triggered by rate change, updateShowSpeed is called
    newSpeed = newSpeed < minSpeed ? minSpeed : newSpeed;
    newSpeed = newSpeed > maxSpeed ? maxSpeed : newSpeed;
    video.playbackRate = newSpeed;
}


function updateShowSpeed() {
    speedDisplay.textContent = video.playbackRate.toFixed(2);
}


function updateShowTime() {
    //console.log("Updating showtime")
    let [remainTimestamp, diffTimestamp, sign] = getTimeDisplay();

    if (sign === '▲') {
        sign = `<span id="upArrow">${sign}</span>`;
    } else if (sign === '▼') {
        sign = `<span id="downArrow">${sign}</span>`
    }

    if (diffTimestamp) {
        timeDisplay.innerHTML = `
            <span id="remain">${remainTimestamp}&nbsp;</span>${sign}<!--
            --><span id="diff">${diffTimestamp}</span>
        `
    } else {
        timeDisplay.innerHTML = `
            <span id="remain">${remainTimestamp}</span>
        `
    }
}


// loading, speed==1, difference==0   -------> no sign
// speed < 1                          -------> up sign
// speed > 1                          -------> down sign
function getTimeDisplay() {
    let speed = video.playbackRate;
    if (!speed) {
        return [infTime, infTime, '▲'];
    }

    // 1. remaining video time at 1x speed
    let remainTime = video.duration - video.currentTime;
    // if remainTime is NaN
    if (remainTime !== remainTime) return [noTime, noTime, ''];

    // 2. remaining video time at chosen speed (displayed in timestamp)
    let remainTimeAtSpeed = calcDuration(remainTime, speed);
    let remainTimestamp = convertSecondToTimestamp(remainTimeAtSpeed);

    if (speed === 1) return [remainTimestamp, '', ''];

    // 3. differece between 1 and 2 (displayed in timestamp)
    let timeDiff = remainTimeAtSpeed - remainTime;
    let diffTimestamp = convertSecondToTimestamp(timeDiff);

    let sign;
    if (diffTimestamp === zeroTime) sign = '';
    else if (speed > 1) sign = '▼';
    else if (speed < 1) sign = '▲';

    return [remainTimestamp, diffTimestamp, sign];
}


function showController(controller) {

    function show() {
        if (settings.enableController) return;

        controller.classList.remove("vdc-disable");
    
        if (timer) clearTimeout(timer);
    
        timer = setTimeout(function () {
            controller.classList.add("vdc-disable");
            timer = false;
        }, 2500);
    }

    return show;
}


function constructShadowDOM() {
    // construct a new node with a shadow DOM and insert node into DOM
    let newNode = document.createElement("div");
    newNode.classList.add("vdc-controller");
    if (!settings.enableController) newNode.classList.add('vdc-disable');
    let shadowRoot = newNode.attachShadow({ mode: "open" });

    let shadowTemplate = `
        <style>
            :host {
                --controller-height: 25px;
                --text-size: 20px;
            }
            * {
                font-family: sans-serif;
                box-sizing: border-box;
                margin: 0;
                padding: 0;
            }
            #controller {     
                background: transparent;
                color: black;     
                display: flex;
                flex-direction: row;
                gap: 4px;
                align-items: stretch;
                height: var(--controller-height);
                cursor: default;
                user-select: none;
            }
            .speed, .seek {
                display: flex;
            }
            button {
                font-size: var(--text-size);
                line-height: var(--text-size);
                opacity: 0.6;
                cursor: pointer;
                color: black;
                background: #F5F5F5;
                font-weight: normal;
                border: 1px solid #696969;
                font-family: "Lucida Console", Monaco, monospace;
                transition: background 0.2s, color 0.2s;
                border-radius: 5px;
                display: none;
                width: var(--controller-height);
            }
            button:focus {
                outline: 0;
            }
            button:hover {
                opacity: 0.8;
                background: #F5F5F5;
            }
            button:active {
                background: #F5F5F5;
                font-weight: bold;
            }
            button.left, button.backward {
                border-radius: 5px 0 0 5px;
            }
            button.right, button.forward {
                border-radius: 0 5px 5px 0;
            }
            .display {
                font-size: 15px;
                line-height: 15px;
                color: white;
                background-color: rgba(48, 48, 48, 0.6);
                padding: 0 5px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 5px;
            }
            span {
                display: flex;
                justify-content: center;
                align-items: center;
            }
            #upArrow {
                color: #cc3300;
            }
            #downArrow {
                color: #99cc33;
            }
            #sign {
                height: 1em;
            }
            :host(:hover) button {
                display: inline;
            }
            :host(:hover) .speed .display {
                border-radius: 0;
            }
            .time {
                order: 4;
            }
            .speed {
                order: 3;
            }
            .reset {
                order: 2;
            }
            .seek {
                order: 1;
            }
        </style>

        <div id="controller">
            <div class="display time">
                ${noTime}
            </div>

            <div class="speed">
                <button class="left">&minus;</button>
                <span class="display">${video.playbackRate}</span>
                <button class="right">&plus;</button>
            </div>

            <button class="reset">&rlarr;</button>

            <div class="seek">
                <button class="backward">&laquo;</button>
                <button class="forward">&raquo;</button>
            </div>
        </div>
    `
    shadowRoot.innerHTML = shadowTemplate;
    insertedNode = videoContainer.parentElement.insertBefore(newNode, videoContainer.parentElement.firstChild);

    speedDisplay = shadowRoot.querySelector('.speed .display');
    timeDisplay = shadowRoot.querySelector('.display.time');

    showButtons = showController(newNode);

    resetButton = shadowRoot.querySelector('.reset');
    increButton = shadowRoot.querySelector('.right');
    decreButton = shadowRoot.querySelector('.left');
    rewindButton = shadowRoot.querySelector('.backward');
    advanceButton = shadowRoot.querySelector('.forward');

    return newNode;
}


function setupListeners() {

    rewindButton.addEventListener('click', handleRewind);
    
    advanceButton.addEventListener('click', handleAdvance);

    resetButton.addEventListener('click', handleReset);

    increButton.addEventListener('click', handleIncre);

    decreButton.addEventListener('click', handleDecre);

    updateShowSpeed();

    if (!hasListeners) {
        document.addEventListener('loadedmetadata', handleLoadedMetadata, true);

        document.addEventListener('ratechange', handleRatechange, true);

        document.addEventListener('seeked', handleSeeked, true);

        hasListeners = true;
    }
    
    setupTimeUpdates();
}

function setupTimeUpdates() {
    if (!settings.enableController) return;

    clearInterval(showTime);
    updateShowTime();
    showTime = setInterval(function() {
        updateShowTime();
    }, 1000);

    if (hasTimeUpdateListeners) return;

    document.addEventListener('pause', handlePause, true);

    document.addEventListener('waiting', handleWaiting, true);

    document.addEventListener('playing', handlePlaying, true);

    hasTimeUpdateListeners = true;
}

function removeTimeUpdates() {
    clearInterval(showTime);
    document.removeEventListener('pause', handlePause, true);
    document.removeEventListener('waiting', handleWaiting, true);
    document.removeEventListener('playing', handlePlaying, true);
    hasTimeUpdateListeners = false;
}

let handleLoadedMetadata = () => {
    updateShowSpeed();
    updateShowTime();
};

let handleRatechange = () => {
    updateShowSpeed();
    updateShowTime();
    showButtons();
};

let handleSeeked = () => {
    updateShowTime();
    showButtons();
};

let handlePause = () => {
    clearInterval(showTime);
};

let handleWaiting = handlePause;

let handlePlaying = () => {
    clearInterval(showTime);
    updateShowTime();
    showTime = setInterval(function() {
        updateShowTime();
    }, 1000);
};


function injectController() {
    // construct a new node with a shadow DOM and insert node into DOM
    controllerNode = constructShadowDOM();

    // set up event listeners for controller
    setupListeners();

    // set up listener for keyboard shortcuts
    if (settings.enableShortcuts) {
        document.addEventListener('keydown', handleShortcuts, true);
    }
    else {
        document.dispatchEvent(
            new CustomEvent("removeshortcuts")
        );
    }
}