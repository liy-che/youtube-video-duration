let navigateEnd = true;

document.addEventListener('yt-navigate-start', () => navigateEnd = false);
document.addEventListener('yt-navigate-finish', () => navigateEnd = true);

// mutations.addedNodes.find(node => node.matchesSelector("..."))

// wait for element to exist
function waitForElm(selector) {
    return new Promise(resolve => {
        if (document.querySelector(selector) && navigateEnd) {
            return resolve(document.querySelector(selector));
        }

        const observer = new MutationObserver((mutations, obs) => {
            if (document.querySelector(selector) && navigateEnd) {
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

async function afterDOMLoaded(msgType){
    //Everything that needs to happen after the DOM has initially loaded.
    let elt = await waitForElm('h1 yt-formatted-string.style-scope.ytd-video-primary-info-renderer');
    let video = document.querySelector('video')
    let duration = video.duration;
    let title = elt.innerText;
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
            sendResponse({success: true});
        }
    }
);