// runs on extension install, extension update, and browser update
// does not run on extension enable
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'update' || details.reason === 'install') {
    chrome.storage.sync.set({ opened: false });
    chrome.action.setBadgeText({
      text: 'New',
    });

    chrome.storage.sync.set({ seen: false });

    let feedbackLink =
      'https://docs.google.com/forms/d/e/1FAIpQLSegS8BO6kGBKUNNnMlfZknkwHoQCdMTmcYC98CT6iote4s45g/viewform?usp=pp_url&entry.114183664=n/a&entry.1747003213=No,+thank+you';
    if (chrome.runtime.setUninstallURL) {
      chrome.runtime.setUninstallURL(feedbackLink);
    }
  }

  if (details.reason === 'install') {
    // re-inject content scripts and set badge to matches after install or update
    for (const cs of chrome.runtime.getManifest().content_scripts) {
      chrome.tabs.query({}, (tabs) => {
        for (const tab of tabs) {
          chrome.scripting
            .executeScript({
              target: { tabId: tab.id, allFrames: true },
              files: cs.js,
            })
            .then(() => {
              chrome.tabs.sendMessage(tab.id, {
                msgType: 'inject',
              });
            });

          chrome.scripting.insertCSS({
            target: { tabId: tab.id, allFrames: true },
            files: cs.css,
          });
        }
      });
    }
  }
});

chrome.runtime.onMessage.addListener(
  function (request, _sender, _sendResponse) {
    if (request.msgType === 'handshake') {
      chrome.storage.sync.set({ opened: true });
      for (const _cs of chrome.runtime.getManifest().content_scripts) {
        chrome.tabs.query({}, (tabs) => {
          for (const _tab of tabs) {
            chrome.action.setBadgeText({
              text: '',
            });
          }
        });
      }
    }
  },
);
