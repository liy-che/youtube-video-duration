let video;
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

// document.querySelector('h1 yt-formatted-string.style-scope.ytd-video-primary-info-renderer').innerText
// document.querySelector('a.ytp-title-link').textContent

async function afterDOMLoaded(msgType){
    //Everything that needs to happen after the DOM has initially loaded.
    let elt = await waitForElm('a.ytp-title-link');
    video = document.querySelector('video');
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
            video.playbackRate = request.speed;
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
            const interval = request.interval;
            if (interval < 0 && video.currentTime <= Math.abs(interval)) {
                video.currentTime = 0;
            }
            else if (interval > 0 && video.currentTime >= video.duration - interval) {
                video.currentTime = video.duration;
            }
            else video.currentTime += request.interval;
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
