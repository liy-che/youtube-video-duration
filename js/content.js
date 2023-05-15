let video;
let controllerExists;
let controllerNode;
let showButtons;
let showTimeDisplay;
let resetButton;
let increButton;
let decreButton;
let rewindButton;
let advanceButton;
let speedDisplay;
let timeDisplay;

const minSpeed = 0.25;
const interval = 0.25;
const maxSpeed = 16;
const seekInterval = 10;
const zeroTime = '00:00';
const infTime = '&infin;';
const downArrow = chrome.runtime.getURL('../images/arrow-216-24.png');
const upArrow = chrome.runtime.getURL('../images/arrow-154-24.png');

let navigateEnd = true;
document.addEventListener('yt-navigate-start', () => navigateEnd = false);
document.addEventListener('yt-navigate-finish', () => navigateEnd = true);

// mutations.addedNodes.find(node => node.matchesSelector("..."))

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

let settings = {
    enable: true,
    enableController: true,
    enableShortcuts: true
};

let handleRewind = () => {
    seekVideo(-seekInterval);
};

let handleAdvance = () => {
    seekVideo(seekInterval);
};

let handleReset = () => {
    setPlaySpeed(1);
};

let handleIncre = () => {
    setPlaySpeed(video.playbackRate+interval);
};

let handleDecre = () => {
    setPlaySpeed(video.playbackRate-interval);
};

// TODO can use key codes instead of characters
let setupShortcuts = (event) => {
    const pressedKey = event.key.toLowerCase();
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

    if (pressedKey === 'd') handleIncre();
    else if (pressedKey === 'a') handleDecre();
    else if (pressedKey === 's') {
        handleReset();
        showButtons();
        showTimeDisplay();
    }
    else if (pressedKey === 'r') restartVideo();

    return false;
};

// initialize user settings
chrome.storage.sync.get(settings, async function(storage) {
    settings = storage;
    chrome.storage.sync.set(settings);
    // page does not reload (ie. no content script is inserted on watch page) when video is chosen from home page
    // so content script is inserted on home page
    // wait for user to click into a video watch page from the home page
    video = await waitForElm('video');
    injectController();

    chrome.storage.onChanged.addListener((changes, area) => {
        if (changes.enableController) {
            changes.enableController.newValue ? 
                controllerNode.classList.remove('vdc-disable') : controllerNode.classList.add('vdc-disable');
        }
    
        if (changes.enableShortcuts) {
            changes.enableShortcuts.newValue ? 
                document.addEventListener('keydown', setupShortcuts, true) : document.removeEventListener('keydown', setupShortcuts, true);
        }
    });
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
    
    if (!totalSeconds) return '.' + timeStr;
    return (totalSeconds > 0? '+' : '-') + timeStr;
}


// calculates remaining time at chosen speed
function calcDuration(time, speed) {
    return time/speed;
}


function getTimestamps() {
    let speed = video.playbackRate;
    if (!speed) {
        return [infTime, '+'+infTime];
    }
    // 1. remaining video time at 1x speed
    let remainTime = video.duration - video.currentTime;
    // 2. remaining video time at chosen speed (display in timestamp)
    let remainTimeAtSpeed = calcDuration(remainTime, video.playbackRate);
    let remainTimestamp = convertSecondToTimestamp(remainTimeAtSpeed).substring(1);

    if (speed === 1) return [remainTimestamp, '.'+zeroTime];

    // 3. differece between 1 and 2 (display in timestamp)
    let timeDiff = remainTimeAtSpeed - remainTime;
    let diffTimestamp = convertSecondToTimestamp(timeDiff);
    return [remainTimestamp, diffTimestamp];
}


function getVideoInfo(msgType){
    //Everything that needs to happen after the DOM has initially loaded.
    let elt = document.querySelector('a.ytp-title-link');
    let title = elt.textContent;
    let info = {msgType: msgType, 
        vidTitle: title, 
        timeDisplay: getTimeDisplay(),
        speed: video.playbackRate,
        playing: !video.paused,
        muted: video.muted};
    return info;
}


/***************************** Message handlers ******************************/


chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.msgType === 'videoInfo') {
            sendResponse(getVideoInfo(request.msgType));
        }
        else if (request.msgType === 'setSpeed') {
            setPlaySpeed(request.speed);
            sendResponse({msgType: request.msgType, speed: video.playbackRate, timeDisplay: getTimeDisplay()});
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
        else if (request.msgType === 'seek') {
            seekVideo(request.interval);
            sendResponse({msgType: request.msgType, timeDisplay: getTimeDisplay()});
        }
        else if (request.msgType === 'changeVolume') {
            video.muted = !video.muted;
            sendResponse({msgType: request.msgType, muted: video.muted});
        }
    }
);


// handle incoming connections from popup
chrome.runtime.onConnect.addListener(function(port) {
    let heartBeatId = setInterval(function() {
        port.postMessage({"timeDisplay": getTimeDisplay()});
    }, 1000);

    port.onDisconnect.addListener(function(port) {
        clearInterval(heartBeatId);
    });
});

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
    timeDisplay.innerHTML = getTimeDisplay();
}


function showTimeUp(isUp) {
    let src;
    let alt;

    if (isUp) {
        src = upArrow;
        alt = 'Up';
    }
    else {
        src = downArrow;
        alt = 'Down';
    }

    return `<img id="sign" style="display:inline" src="${src}" alt="${alt}"/>`;
}


// TODO can use documentFragment here
// diffTimestamp has a prefix that indicates direction of difference
    // the prefix can be '+', '-', or '.'
    // if speed is 0, diffTimestamp = '+InfTime'
    // if speed is 1, diffTimestamp = '.zeroTime'
function getTimeInfo(remainTimestamp, diffTimestamp) {
    let sign;
    if (diffTimestamp.charAt(0) === '-') sign = showTimeUp(0);
    else if (diffTimestamp.charAt(0) === '+') sign = showTimeUp(1);
    else sign = `<img id="sign" style="display:none"/>`;

    return `
        <span id="remain">${remainTimestamp}</span> (<!--
        -->${sign}<!--
        --><span id="diff">${diffTimestamp.substring(1)})</span>
    `
}


function getTimeDisplay() {
    let [remainTimestamp, diffTimestamp] = getTimestamps();
    return getTimeInfo(remainTimestamp, diffTimestamp);
}


function showController(controller) {
    let timer;

    function show() {
        controller.classList.add("vdc-show");
    
        if (timer) clearTimeout(timer);
    
        timer = setTimeout(function () {
        controller.classList.remove("vdc-show");
        timer = false;
        }, 2000);
    }

    return show;
}


function constructShadowDOM() {
    // construct a new node with a shadow DOM and insert node into DOM
    let newNode = document.createElement("div");
    newNode.classList.add("vdc-controller");
    newNode.classList.add("no-button");
    let shadowRoot = newNode.attachShadow({ mode: "open" });

    let shadowTemplate = `
    <style>
        * {
            line-height: 1.8em;
            font-family: sans-serif;
            font-size: 13px;
        }
        #controller {
            position: absolute;
            top: 0;
            right: 0;
            
            background: transparent;
            color: black;

            margin: 5px 5px 5px 10px;
            
            cursor: default;
            z-index: 9999999;
            user-select: none;
        }
        button {
            opacity: 0.6;
            cursor: pointer;
            color: black;
            background: #F5F5F5;
            font-weight: normal;
            padding: 1px 5px 3px 5px;
            font-size: 20px;
            line-height: 20px;
            border: 1px solid #696969;
            font-family: "Lucida Console", Monaco, monospace;
            margin: 0px;
            transition: background 0.2s, color 0.2s;
            border-radius: 5px;
        }
        button:focus {
            outline: 0;
        }
        button:hover {
            opacity: 0.8;
            background: #F5F5F5;
            color: black;
        }
        button:active {
            background: #F5F5F5;
            color: black;
            font-weight: bold;
        }
        button.left, button.backward {
            border-radius: 5px 0 0 5px;
            margin-left: 2px;
        }
        button.right, button.forward {
            border-radius: 0 5px 5px 0;
            margin-right: 2px;
        }
        .reset {
            margin: 0 2px;
        }
        .display {
            color: white;
            background-color: rgba(48, 48, 48, 0.6);
            padding: 5px 5px 4px 5px;
            font-size: 15px;
            line-height: 15px;
        }
        .time {
            border-radius: 5px;
            margin-right: 2px;
            display: none;
        }
        .vdc-show,
        #controller:hover .time {
            display: inline;
        }
        #sign {
            height: 1em;
        }
        .vdc-hidden {
            display: none;
        }
        :host(.no-button) button {
            display: none;
        }
    </style>
        <div id="controller">
            <span class="display time"> 
            </span><!--
            --><button class="left">&minus;</button><!--
            --><span class="display speed">${video.playbackRate}</span><!--
            --><button class="right">&plus;</button><!--
            --><button class="reset">&#49;&times;</button><!--
            --><button class="backward">&laquo;</button><!--
            --><button class="forward">&raquo;</button>
        </div>
    `
    shadowRoot.innerHTML = shadowTemplate;
    let videoContainer = document.querySelector('.html5-video-container');
    videoContainer.parentElement.insertBefore(newNode, videoContainer.parentElement.firstChild);

    return newNode;
}


function setupListeners() {
    let shadowRoot = controllerNode.shadowRoot;
    speedDisplay = shadowRoot.querySelector('.speed');
    timeDisplay = shadowRoot.querySelector('.time');

    showButtons = showController(controllerNode);
    showTimeDisplay = showController(timeDisplay);

    resetButton = shadowRoot.querySelector('.reset');
    increButton = shadowRoot.querySelector('.right');
    decreButton = shadowRoot.querySelector('.left');
    rewindButton = shadowRoot.querySelector('.backward');
    advanceButton = shadowRoot.querySelector('.forward');

    // let timer;
    // function showDisplay() {
    //     let nodes = shadowRoot.querySelectorAll('button');
    //     nodes.forEach((node)=>{
    //         node.classList.add('vdc-hidden');
    //     });
    
    //     if (timer) clearTimeout(timer);
    
    //     timer = setTimeout(function () {
    //     nodes.forEach((node)=>{
    //         node.classList.remove('vdc-hidden');
    //     });
    //     timer = false;
    //     }, 2000);
    // }

    if (controllerExists) return;

    updateShowSpeed();
    document.addEventListener('loadedmetadata', function() {
        updateShowTime();
    }, true);

    document.addEventListener('ratechange', function(e) {
        updateShowSpeed();
        updateShowTime();
        showButtons();
        showTimeDisplay();
    }, true);

    document.addEventListener('seeked', function() {
        updateShowTime();
        showButtons();
        showTimeDisplay();
    }, true);

    let updateTime;
    const controller = shadowRoot.querySelector('#controller');
    controller.addEventListener('mouseover', function() {
        // for immediate update
        updateShowTime();
        updateTime = setInterval(function() {
            updateShowTime();
        }, 1000);
    });

    controller.addEventListener('mouseout', function() {
        clearInterval(updateTime);
    });

    rewindButton.addEventListener('click', handleRewind);
    
    advanceButton.addEventListener('click', handleAdvance);

    resetButton.addEventListener('click', handleReset);

    increButton.addEventListener('click', handleIncre);

    decreButton.addEventListener('click', handleDecre);

    let player = document.querySelector('.html5-video-player');
    player.addEventListener('mouseenter', function() {
        controllerNode.classList.remove('no-button');
    });

    player.addEventListener('mouseleave', function() {
        controllerNode.classList.add('no-button');
    });
}


function injectController() {

    controllerNode = document.querySelector(".vdc-controller");
    controllerExists = Boolean(controllerNode);

    // if controller already exists on the page, don't inject
    if (!controllerExists) {
        // detects when YouTube video is changed, even when change is dynamic, ie. no page reload
        observer = new MutationObserver((changes) => {
            changes.forEach(change => {
                if(change.attributeName.includes('src')){
                    chrome.runtime.sendMessage(getVideoInfo('updatePopup'));
                    updateShowSpeed();
                }
            });
        });
        observer.observe(video, {attributes : true});

        // construct a new node with a shadow DOM and insert node into DOM
        controllerNode = constructShadowDOM();
    }

    // set up event listeners for controller
    setupListeners();

    if (!settings.enableController) controllerNode.classList.add('vdc-disable');
    // set up listener for keyboard shortcuts
    if (settings.enableShortcuts) {
        if (!controllerExists) document.addEventListener('keydown', setupShortcuts, true);
    }
    else {
        document.removeEventListener('keydown', setupShortcuts, true);
    }
}