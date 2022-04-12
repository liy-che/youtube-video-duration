if(document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded',afterDOMLoaded);
} else {
    afterDOMLoaded();
}


function afterDOMLoaded(){
    //Everything that needs to happen after the DOM has initially loaded.
    let duration = document.querySelector('video').duration;

    chrome.runtime.sendMessage({msgType: 1, durationInSec: duration}, function(response) {
        console.log(response.farewell);
    });
}