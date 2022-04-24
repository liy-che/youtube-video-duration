/******************************* program states *******************************/

const minSpeed = 0;
const interval = 0.25;
const maxSpeed = 2;

let vidDuration;
let playSpeed = 1;
let showSpeed = playSpeed;
const decreButton = document.querySelector('#decre');
const increButton = document.querySelector('#incre');
const setButton = document.querySelector('#set-speed');
const timeDisplay = document.querySelector('#time');
const diffDisplay = document.querySelector('#diff');
const sign = document.querySelector('#sign');

function showIcon() {
    document.getElementById('loading').style.display ='block';
  } 
 
function hideIcon() {
    document.getElementById('loading').style.display ='none';
}


/******************************* event listeners ******************************/


// listen to message from content script
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
      if (request.msgType === 1) {
          hideIcon();
          document.querySelector('h1').innerText = request.vidTitle;
          vidDuration = request.durationInSec;
          updatePlaySpeed(request.speed);
          updateCalcResult(calcDuration(request.speed));
          checkSpeed();
      }
      sendResponse({farewell: "goodbye"});
    }
);

// change speed with arrow
decreButton.addEventListener('click', decreSpeed);

function decreSpeed() {
    if (increButton.classList.contains('gray-out')) enableClick(increButton);
    if (showSpeed > minSpeed) {
        updateShowSpeed(showSpeed-interval);
        updateCalcResult(calcDuration(showSpeed));
    }
    checkSpeed();
}

increButton.addEventListener('click', increSpeed);

function increSpeed() {
    if (decreButton.classList.contains('gray-out')) enableClick(decreButton);
    if (showSpeed < maxSpeed) {
        updateShowSpeed(showSpeed+interval);
        updateCalcResult(calcDuration(showSpeed));
    }
    checkSpeed();
}

setButton.addEventListener('click', setSpeed);

// listen for key press
document.onkeydown = event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        decreSpeed();
        if (decreButton.classList.contains('gray-out')) return;
        decreButton.classList.add('pressed-decre');
    }
    else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        increSpeed();
        if (increButton.classList.contains('gray-out')) return;
        increButton.classList.add('pressed-incre');
    }
    else if (event.key === 'Enter') {
        if (showSpeed === playSpeed) {
            window.close();
            return;
        }
        setSpeed();
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
    if (classList.contains('gray-out')) return;
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

function disableClick(elt) {
    elt.classList.remove('on-hover');
    elt.classList.add('gray-out');
}

function enableClick(elt) {
    elt.classList.add('on-hover');
    elt.classList.remove('gray-out');
}

function checkSpeed() {
    if (showSpeed == playSpeed) {
        setButton.classList.add('selected');
    }
    else setButton.classList.remove('selected');

    if (showSpeed === maxSpeed) disableClick(increButton);
    else if (showSpeed === minSpeed) disableClick(decreButton);
    else if (showSpeed === 0) disableClick(decreButton);
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
    if (!isFinite(newTime)) {
        timeDisplay.innerHTML = '&infin;';
        diffDisplay.innerHTML = '&infin;';
        sign.innerText = '+';
        return;
    }

    const timeDiff = newTime - vidDuration;

    timeDisplay.innerText = convertSecondToTimestamp(newTime);
    diffDisplay.innerText = convertSecondToTimestamp(Math.abs(timeDiff));

    if (timeDiff < 0) sign.innerText = '-';
    else if (timeDiff > 0) sign.innerText = '+';
    else {
        sign.innerText = '=';
        diffDisplay.innerText = '00:00';
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

function setSpeed() {
    setButton.classList.add('selected');
    playSpeed = showSpeed;
    sendMessage({msgType: 1, speed: showSpeed});
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