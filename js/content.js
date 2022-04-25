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
  alert('url change');
  afterDOMLoaded();
  alert('after changge');
}

async function afterDOMLoaded(){
    //Everything that needs to happen after the DOM has initially loaded.]
    alert(location.href);
    if (!location.href.includes('www.youtube.com/watch?v=')) return;
    let elt = await waitForElm('h1 yt-formatted-string.style-scope.ytd-video-primary-info-renderer');
    let video = document.querySelector('video')
    let duration = video.duration;
    let title = elt.innerText;
    alert('send msg about');
    chrome.runtime.sendMessage({msgType: 1, vidTitle: title, durationInSec: duration, speed: video.playbackRate}, function(response) {
        console.log(response.farewell);
    });
    alert('after msg sent');
}

afterDOMLoaded();
alert('inserted my ');

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.msgType === 1) {
            document.querySelector('video').playbackRate = request.speed;
        }
        sendResponse({farewell: "goodbye"});
    }
);