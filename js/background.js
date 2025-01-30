// runs on extension install, extension update, and browser update
// does not run on extension enable
chrome.runtime.onInstalled.addListener((details) => {

  if (details.reason === 'update' || details.reason === 'install') {
    chrome.storage.sync.set({ opened: false });
      chrome.action.setBadgeText({
        text: "New",
      });

    chrome.storage.sync.set({seen: false});

    let feedbackLink = 'https://docs.google.com/forms/d/e/1FAIpQLSegS8BO6kGBKUNNnMlfZknkwHoQCdMTmcYC98CT6iote4s45g/viewform?usp=pp_url&entry.114183664=n/a&entry.1747003213=No,+thank+you';
    if (chrome.runtime.setUninstallURL) {
      chrome.runtime.setUninstallURL(feedbackLink);
    }
  }
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.msgType === 'handshake') {
    chrome.storage.sync.set({ opened: true });
    for (const cs of chrome.runtime.getManifest().content_scripts) {
      chrome.tabs.query({}, (tabs)=> {
        for (const tab of tabs) {
          chrome.action.setBadgeText({
            text: "",
          });
        }
      });
    }
  }
});