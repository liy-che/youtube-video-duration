let vidDuration;

const buttons = document.querySelectorAll('input[name="speed"]');
Array.from(buttons).forEach(button => button.addEventListener('change', calcTime));

async function injectScript() {
    let [tab] = await chrome.tabs.query({active: true, currentWindow: true});

    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['js/content.js']
    });
}

function calcTime(evt) {
    const newTime = vidDuration / evt.target.value;
    updateCalcResult(newTime, vidDuration-newTime);
}

function updateCalcResult(newTime, saved=0) {
    document.querySelector('#time').innerText = convertSecondToTimestamp(newTime);
    document.querySelector('#saved').innerText = convertSecondToTimestamp(saved);
}

function zeroPad(num, numFigure=2, char='0') {
    // assume num is a number
    num = num.toString();
    return num < 10 ? num.padStart(numFigure, char) : num;
}

function convertSecondToTimestamp(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor(totalSeconds/60 - hours*60);
    const seconds = Math.floor(totalSeconds % 60);

    let timeStr = hours !== 0 ? `${hours}:` : '';
    timeStr += hours !== 0 ? `${zeroPad(minutes)}:` : `${minutes}:`;
    timeStr += zeroPad(seconds);
    return timeStr;
}

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
      console.log(sender.tab ?
                  "from a content script:" + sender.tab.url :
                  "from the extension");
      if (request.msgType === 1) {
          vidDuration = request.durationInSec;
          updateCalcResult(vidDuration);
          sendResponse({farewell: "goodbye"});
      }
    }
);

// when pop up is opened, get video duration
injectScript();