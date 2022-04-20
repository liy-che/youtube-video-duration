if(document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded',afterDOMLoaded);
} else {
    afterDOMLoaded();
}


function afterDOMLoaded(){
    //Everything that needs to happen after the DOM has initially loaded.
    let video = document.querySelector('video')
    let duration = video.duration;
    let title = document.querySelector('h1 yt-formatted-string.style-scope.ytd-video-primary-info-renderer').innerText;
    chrome.runtime.sendMessage({msgType: 1, vidTitle: title, durationInSec: duration, speed: video.playbackRate}, function(response) {
        console.log(response.farewell);
    });
}


chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.msgType === 1) {
            document.querySelector('video').playbackRate = request.speed;
        }
        sendResponse({farewell: "goodbye"});
    }
);