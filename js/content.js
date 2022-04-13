if(document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded',afterDOMLoaded);
} else {
    afterDOMLoaded();
}


function afterDOMLoaded(){
    //Everything that needs to happen after the DOM has initially loaded.
    let duration = document.querySelector('video').duration;
    let title = document.querySelector('h1 yt-formatted-string.style-scope.ytd-video-primary-info-renderer').innerText;
    chrome.runtime.sendMessage({msgType: 1, vidTitle: title, durationInSec: duration}, function(response) {
        console.log(response.farewell);
    });
}