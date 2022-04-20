/******************************* program states *******************************/


let vidDuration;
let playSpeed = 1;
let showSpeed = playSpeed;
const decreButton = document.querySelector('#decre');
const increButton = document.querySelector('#incre');


/******************************* event listeners ******************************/


// listen to message from content script
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
      if (request.msgType === 1) {
          document.querySelector('h1').innerText = request.vidTitle;
          vidDuration = request.durationInSec;
          updateCalcResult(calcDuration(request.speed));
          updatePlaySpeed(request.speed);
          sendResponse({farewell: "goodbye"});
      }
    }
);

// change speed with arrow
decreButton.addEventListener('click', decreSpeed);

function decreSpeed() {
    if (showSpeed > 0.25) {
        updateShowSpeed(showSpeed-0.25);
        updateCalcResult(calcDuration(showSpeed));
    }
}

increButton.addEventListener('click', increSpeed);

function increSpeed() {
    if (showSpeed < 2) {
        updateShowSpeed(showSpeed+0.25);
        updateCalcResult(calcDuration(showSpeed));
    }
}

// listen for key press
document.onkeydown = event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        decreSpeed();
        decreButton.classList.add('pressed-decre');
    }
    else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        increSpeed();
        increButton.classList.add('pressed-incre');
    }
    else if (event.key === 'Enter') {
        if (showSpeed === playSpeed) {
            window.close();
            return;
        }
        playSpeed = showSpeed;
        sendMessage({msgType: 1, speed: showSpeed});
    }
    else if (event.key === ' ') window.close();
}

document.onkeyup = event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        decreButton.classList.remove('pressed-decre');
    }
    else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        increButton.classList.remove('pressed-incre');
    }
}

decreButton.addEventListener('mousedown', toggleColor);
decreButton.addEventListener('mouseup', toggleColor);
increButton.addEventListener('mousedown', toggleColor);
increButton.addEventListener('mouseup', toggleColor);

function toggleColor(event) {
    const classList = event.target.classList;
    if (classList.contains('left-arrow')) {
        classList.toggle('pressed-decre');
    }
    else if (classList.contains('right-arrow')) {
        classList.toggle('pressed-incre');
    }
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

function calcDuration(speed) {
    return vidDuration/speed;
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
    const sign = document.querySelector('#sign');
    const timeDiff = newTime - vidDuration;

    document.querySelector('#time').innerText = convertSecondToTimestamp(newTime);
    document.querySelector('#diff').innerText = convertSecondToTimestamp(Math.abs(timeDiff));

    if (timeDiff < 0) sign.innerText = '-';
    else if (timeDiff > 0) sign.innerText = '+';
    else {
        sign.innerText = '=';
        document.querySelector('#diff').innerText = '00:00';
    }
}

function updatePlaySpeed(curSpeed) {
    if (curSpeed != playSpeed) {
        playSpeed = curSpeed;
        updateShowSpeed(playSpeed);
    }
}

function updateShowSpeed(newSpeed) {
    showSpeed = newSpeed;
    document.querySelector('#speed').innerText = showSpeed.toFixed(2);
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