// document.addEventListener('yt-navigate-end', process);

// if (document.body) process();
// else document.addEventListener('DOMContentLoaded', process);

// function process() {
//     console.log('what the ant');
// }


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

// update on mutation
// let lastUrl = location.href; 
// new MutationObserver(() => {
//     const url = location.href;
//     if (url !== lastUrl) {
//         lastUrl = url;
//         onUrlChange();
//     }
// }).observe(document, {subtree: true, childList: true});

// function onUrlChange() {
//   alert('url change');
//   afterDOMLoaded();
// }

async function afterDOMLoaded(msgType){
    //Everything that needs to happen after the DOM has initially loaded.]
    // if (!location.href.includes('www.youtube.com/watch?v=')) return;
    let elt = await waitForElm('h1 yt-formatted-string.style-scope.ytd-video-primary-info-renderer');
    let video = document.querySelector('video')
    let duration = video.duration;
    let title = elt.innerText;

    // return video info for extension
    sendMessage({msgType: msgType, vidTitle: title, durationInSec: duration, speed: video.playbackRate});
}

// afterDOMLoaded();
// alert('inserted my ');

// send message
function sendMessage(msg) {
    chrome.runtime.sendMessage(msg);
}


// receive incoming message
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if (request.msgType === 1) { // sender wants us to collect and send info
            afterDOMLoaded(request.msgType);
        }
        else if (request.msgType === 2) { // sender wants set speed to given
            document.querySelector('video').playbackRate = request.speed;
        }
    }
);