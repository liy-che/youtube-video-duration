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
    let video = document.querySelector('video');
    let duration = video.duration - video.currentTime;
    let title = elt.textContent;
    let info = {msgType: msgType, vidTitle: title, durationInSec: duration, speed: video.playbackRate};
    return info;
}


function sendMessage(type, msg={}) {
    msg['msgType'] = type;
    chrome.runtime.sendMessage(msg, function(response) {
        console.log(response.farewell);
    });
}


chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.msgType === 'videoInfo') {
            afterDOMLoaded(request.msgType).then(sendResponse);
            return true;
        }
        else if (request.msgType === 'setSpeed') {
            document.querySelector('video').playbackRate = request.speed;
            sendResponse({msgType: request.msgType, success: true});
        }
        else if (request.msgType === 'getRemaining') {
            let video = document.querySelector('video');
            let remainingTime = video.duration - video.currentTime;
            sendResponse({msgType: request.msgType, durationInSec: remainingTime});
        }
        else if (request.msgType === 'pauseVideo') {
            document.querySelector('video').pause();
            sendResponse({msgType: request.msgType, success: true});
        }
        else if (request.msgType === 'playVideo') {
            document.querySelector('video').play();
            sendResponse({msgType: request.msgType, success: true});
        }
    }
);