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
let lastUrl = location.href; 
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    onUrlChange();
  }
}).observe(document, {subtree: true, childList: true});
 
 
function onUrlChange() {
  afterDOMLoaded();
}

async function afterDOMLoaded(){
    //Everything that needs to happen after the DOM has initially loaded.
    let video = document.querySelector('video')
    let duration = video.duration;
    let elt = await waitForElm('h1 yt-formatted-string.style-scope.ytd-video-primary-info-renderer');
    let title = elt.innerText;
    chrome.runtime.sendMessage({msgType: 1, vidTitle: title, durationInSec: duration, speed: video.playbackRate}, function(response) {
        console.log(response.farewell);
    });
}

afterDOMLoaded();


chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.msgType === 1) {
            document.querySelector('video').playbackRate = request.speed;
        }
        sendResponse({farewell: "goodbye"});
    }
);