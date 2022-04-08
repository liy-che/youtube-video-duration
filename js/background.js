// Send message to inform content script that url has been changed
function sendMsg(msg) {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, msg, function(response) {
      console.log(response);
    });
  });
}

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
      console.log(sender.tab ?
                  "from a content script:" + sender.tab.url :
                  "from the extension");
      console.log(request.videoTime);
    //   if (request.greeting === "hello")
    //     sendResponse({farewell: "goodbye"});
    }
);



chrome.webNavigation.onHistoryStateUpdated.addListener(()=>{

});