/******************************* program states *******************************/


let vidDuration;
let speedChosen = 1.0;


/******************************* event listeners ******************************/


// listen to message from content script
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
      if (request.msgType === 1) {
          document.querySelector('h1').innerText = request.vidTitle;
          vidDuration = request.durationInSec;
          updateCalcResult(vidDuration/request.speed);
          updateChecked(request.speed);
          sendResponse({farewell: "goodbye"});
      }
    }
);

// calculate time for selected speed
const buttons = document.querySelectorAll('input[name="speed"]');
Array.from(buttons).forEach(button => button.addEventListener('change', calcTime));

function calcTime(evt) {
    speedChosen = evt.target.value; 
    const newTime = vidDuration / speedChosen;
    updateCalcResult(newTime);
}

// listening for enter key up on radio buttons
const radioButtons = document.querySelectorAll('input[name="speed"]');
Array.from(radioButtons).forEach(button => button.addEventListener("keyup", keyPressHandler));

function keyPressHandler(evt) {
    if (evt.keyCode === 13) {
        evt.preventDefault();
        sendMessage({msgType: 1, speed: speedChosen});
    } 
    else if (evt.keyCode === 32) window.close();
}


/******************************* helper functions *****************************/


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


/********************************* functions **********************************/


function sendMessage(msg) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, msg, function(response) {
          console.log(response.farewell);
        });
    });
}

function updateCalcResult(newTime) {
    const diffWord = document.querySelector('#diff-word');
    const diff = newTime - vidDuration
    const timeDiff = newTime - vidDuration;

    document.querySelector('#time').innerText = convertSecondToTimestamp(newTime);
    document.querySelector('#diff').innerText = convertSecondToTimestamp(Math.abs(timeDiff));

    if (timeDiff < 0) diffWord.innerText = 'Saved: ';
    else if (timeDiff > 0) diffWord.innerText = 'Added: ';
    else {
        diffWord.innerText = '';
        document.querySelector('#diff').innerText = '';
    }
}

function updateChecked(curSpeed) {
    if (curSpeed != speedChosen) {
        speedChosen = curSpeed;
        const curSelected = document.querySelector('input[checked]');
        curSelected.removeAttribute('checked');
        curSelected.removeAttribute('autofocus');

        // update selection
        const newSelected = document.querySelector(`input[value="${curSpeed}"]`);
        newSelected.setAttribute('checked', '');
        newSelected.focus();
    }
}

async function injectScript() {
    let [tab] = await chrome.tabs.query({active: true, currentWindow: true});

    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['js/content.js']
    });
}


/******************************* main program *********************************/

// when pop up is opened, get video duration
injectScript();