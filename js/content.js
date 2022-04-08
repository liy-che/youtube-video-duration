if(document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded',afterDOMLoaded);
} else {
    afterDOMLoaded();
}


function afterDOMLoaded(){
    //Everything that needs to happen after the DOM has initially loaded.

    alert(document.querySelector('video').duration);
    // chrome.runtime.sendMessage({videoTime: 1}, function(response) {
    //     console.log(response.farewell);
    // });
}