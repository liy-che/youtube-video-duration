let navigateEnd = false;

document.addEventListener('yt-navigate-start', () => navigateEnd = false);
document.addEventListener('yt-navigate-finish', () => navigateEnd = true);

// mutations.addedNodes.find(node => node.matchesSelector("..."))

// wait for element to exist
function waitForElm(selector) {
    return new Promise(resolve => {
        if (document.querySelector(selector)) {
            return resolve(document.querySelector(selector));
        }

        const observer = new MutationObserver((mutations, obs) => {
            if (document.querySelector(selector)) {
                obs.disconnect();
                resolve(document.querySelector(selector));
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
}

async function afterDOMLoaded(){
    //Everything that needs to happen after the DOM has initially loaded.
    let elt = await waitForElm('h1 yt-formatted-string.style-scope.ytd-video-primary-info-renderer');
    let video = document.querySelector('video')
    let duration = video.duration;
    let title = elt.innerText;
    let info = {vidTitle: title, durationInSec: duration, speed: video.playbackRate};
    sendMessage('videoInfo', info);
}


function sendMessage(type, msg={}) {
    msg['msgType'] = type;
    chrome.runtime.sendMessage(msg, function(response) {
        console.log(response.farewell);
    });
}


chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.msgType === 'requestStatus') {
            sendResponse({msgType: 'status', navigateEnd: navigateEnd});
        }
        // else if (request.msgType === 'requestInfo') {
        //     // get video info
        // }
        // else if (request.msgType === 'setSpeed') {
        //     document.querySelector('video').playbackRate = request.speed;
        // }
        // sendResponse({farewell: "goodbye"});
    }
);