let video;
let curSpeed = 1;
let resetButton;
let increButton;
let decreButton;
let rewindButton;
let advanceButton;
let speedDisplay;
let navigateEnd = true;

const minSpeed = 0.25;
const interval = 0.25;
const maxSpeed = 16;
const seekInterval = 10;

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


// document.querySelector('h1 yt-formatted-string.style-scope.ytd-video-primary-info-renderer').innerText
// document.querySelector('a.ytp-title-link').textContent

async function afterDOMLoaded(msgType){
    //Everything that needs to happen after the DOM has initially loaded.
    let elt = await waitForElm('a.ytp-title-link');
    let duration = video.duration - video.currentTime;
    let title = elt.textContent;
    let info = {msgType: msgType, 
        vidTitle: title, 
        durationInSec: duration, 
        speed: video.playbackRate,
        playing: !video.paused,
        muted: video.muted};
    return info;
}


function sendMessage(type, msg={}) {
    msg['msgType'] = type;
    chrome.runtime.sendMessage(msg, function(response) {
        console.log(response.farewell);
    });
}

function getRemainingTime() {
    return video.duration - video.currentTime;
}

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.msgType === 'videoInfo') {
            afterDOMLoaded(request.msgType).then(sendResponse);
            return true;
        }
        else if (request.msgType === 'setSpeed') {
            changeSpeed(request.speed);
            sendResponse({msgType: request.msgType, success: true});
        }
        else if (request.msgType === 'getRemaining') {
            sendResponse({msgType: request.msgType, durationInSec: getRemainingTime()});
        }
        else if (request.msgType === 'restartVideo') {
            video.currentTime = 0;
            if (request.remainingTime === 0) video.play();
            sendResponse({msgType: request.msgType, playing: !video.paused});
        }
        else if (request.msgType === 'playPauseVideo') {
            if (video.paused) video.play();
            else video.pause();
            sendResponse({msgType: request.msgType, playing: !video.paused});
        }
        else if (request.msgType === 'seek') {
            seekVideo(request.interval);
            sendResponse({msgType: request.msgType, success: true});
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
        port.postMessage({"remainingTime": getRemainingTime()});
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

function changeSpeed(newSpeed) {
    newSpeed = newSpeed < minSpeed ? minSpeed : newSpeed;
    newSpeed = newSpeed > maxSpeed ? maxSpeed : newSpeed;
    curSpeed = video.playbackRate = newSpeed;
}

function displaySpeed(newSpeed) {
    speedDisplay.textContent = newSpeed.toFixed(2);
}

function updateSpeed(newSpeed) {
    changeSpeed(newSpeed);
    displaySpeed(curSpeed);
}


async function waitForVideo() {
    video = await waitForElm('video');

    observer = new MutationObserver((changes) => {
    changes.forEach(change => {
        if(change.attributeName.includes('src')){
            updateSpeed(video.playbackRate);
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
        .remain {
            border-radius: 5px;
            margin-right: 2px;
            display: none;
        }
        #controller:hover .remain {
            display: inline-block;
        }
        
    </style>
        <div id="controller">
            <span class="display remain">1:20:01</span><!--
            --><button class="reset">&#49;&times;</button><!--
            --><button class="left">&minus;</button><!--
            --><span class="display speed">${curSpeed}</span><!--
            --><button class="right">&plus;</button><!--
            --><button class="backward">&laquo;</button><!--
            --><button class="forward">&raquo;</button>
        </div>
    `
    shadowRoot.innerHTML = shadowTemplate;
    let videoContainer = document.querySelector('.html5-video-container');
    videoContainer.parentElement.insertBefore(newNode, videoContainer.parentElement.firstChild);

    speedDisplay = shadowRoot.querySelector('.speed');
    displaySpeed(curSpeed);

    document.addEventListener('ratechange', function() {
        if (curSpeed !== video.playbackRate) {
            curSpeed = video.playbackRate;
            displaySpeed(curSpeed);
        }
    }, true);

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
        updateSpeed(1);
    });

    increButton.addEventListener('click', function() {
        updateSpeed(curSpeed+interval);
    });

    decreButton.addEventListener('click', function() {
        updateSpeed(curSpeed-interval);
    });
}

waitForVideo();