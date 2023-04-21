let opened = false;

// runs on extension install, extension update, and browser update
// does not run on extension enable
chrome.runtime.onInstalled.addListener((details) => {
  // Page actions are disabled by default and enabled on select tabs
  chrome.action.disable();

  // Clear all rules to ensure only our expected rules are set
  chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
    // Declare a rule to enable the action on example.com pages
    let exampleRule = {
      conditions: [
        new chrome.declarativeContent.PageStateMatcher({
          pageUrl: {urlContains: 'www.youtube.com/watch?v='},
        })
      ],
      actions: [new chrome.declarativeContent.ShowAction()],
    };

    // Finally, apply our new array of rules
    let rules = [exampleRule];
    chrome.declarativeContent.onPageChanged.addRules(rules);
  });

  // re-inject content scripts and set badge to matches after install or update
  for (const cs of chrome.runtime.getManifest().content_scripts) {
    chrome.tabs.query({url: cs.matches}, (tabs)=> {
      for (const tab of tabs) {
        chrome.scripting.executeScript({
          target: {tabId: tab.id},
          files: cs.js,
        });

        chrome.scripting.insertCSS({
          target: {tabId: tab.id},
          files: cs.css,
        });
        
        if (details.reason === 'update' || details.reason === 'install') {
          opened = false;
          chrome.action.setBadgeText({
            text: "new",
            tabId: tab.id,
          });
        }
      }
    });
  }
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (!opened && request.msgType === 'handshake') {
    opened = true;
    for (const cs of chrome.runtime.getManifest().content_scripts) {
      chrome.tabs.query({url: cs.matches}, (tabs)=> {
        for (const tab of tabs) {
            chrome.action.setBadgeText({
              text: "",
              tabId: tab.id,
            });
        }
      });
    }
  }
});