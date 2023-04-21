let video;
let resetButton;
let increButton;
let decreButton;
let rewindButton;
let advanceButton;
let speedDisplay;
let timeDisplay;
let navigateEnd = true;

const minSpeed = 0.25;
const interval = 0.25;
const maxSpeed = 16;
const seekInterval = 10;
const zeroTime = '00:00';
const infTime = '&infin;';
const downArrow = chrome.runtime.getURL('../images/arrow-216-24.png');
const upArrow = chrome.runtime.getURL('../images/arrow-154-24.png');

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

async function afterDOMLoaded(msgType){
    //Everything that needs to happen after the DOM has initially loaded.
    let elt = await waitForElm('a.ytp-title-link');
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
            afterDOMLoaded(request.msgType).then(sendResponse);
            return true;
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


async function waitForVideo() {
    video = await waitForElm('video');

    if (document.querySelector(".vdc-controller")) return;

    observer = new MutationObserver((changes) => {
    changes.forEach(change => {
        if(change.attributeName.includes('src')){
            updateShowSpeed();
        }
    });
    });
    observer.observe(video, {attributes : true});

    let newNode = document.createElement("div");
    newNode.classList.add("vdc-controller");
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

    speedDisplay = shadowRoot.querySelector('.speed');
    timeDisplay = shadowRoot.querySelector('.time');
    const controller = shadowRoot.querySelector('#controller');

    updateShowSpeed();
    document.addEventListener('loadedmetadata', function() {
        updateShowTime();
    }, true);

    let showButtons = showController(newNode);
    let showTimeDisplay = showController(timeDisplay);
    document.addEventListener('ratechange', function() {
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

    resetButton = shadowRoot.querySelector('.reset');
    increButton = shadowRoot.querySelector('.right');
    decreButton = shadowRoot.querySelector('.left');
    rewindButton = shadowRoot.querySelector('.backward');
    advanceButton = shadowRoot.querySelector('.forward');

    rewindButton.addEventListener('click', function() {
        seekVideo(-seekInterval);
    });
    
    advanceButton.addEventListener('click', function() {
        seekVideo(seekInterval);
    });

    resetButton.addEventListener('click', function() {
        setPlaySpeed(1);
    });

    increButton.addEventListener('click', function() {
        setPlaySpeed(video.playbackRate+interval);
    });

    decreButton.addEventListener('click', function() {
        setPlaySpeed(video.playbackRate-interval);
    });

    // TODO can use key codes instead of characters
    document.addEventListener('keydown', function(event) {
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

        if (pressedKey === 'd') increButton.click();
        else if (pressedKey === 'a') decreButton.click();
        else if (pressedKey === 's') {
            resetButton.click();
            showButtons();
            showTimeDisplay();
        }
        else if (pressedKey === 'r') restartVideo();

        return false;

    }, true);
}

waitForVideo();