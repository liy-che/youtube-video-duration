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

// change speed with arrow
decreButton.addEventListener('click', decreSpeed);

function decreSpeed() {
    if (increButton.classList.contains('gray-out')) disablePersistentState(increButton, 'gray-out');
    if (showSpeed > minSpeed) {
        updateShowSpeed(showSpeed-interval);
        updateCalcResult(calcDuration(showSpeed));
    }
    checkSpeed();
}

increButton.addEventListener('click', increSpeed);

function increSpeed() {
    if (decreButton.classList.contains('gray-out')) disablePersistentState(decreButton, 'gray-out');
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

function enablePersistentState(elt, persistentState) {
    elt.classList.remove('on-hover');
    elt.classList.add(persistentState);
}

function disablePersistentState(elt, persistentState) {
    elt.classList.add('on-hover');
    elt.classList.remove(persistentState);
}

function checkSpeed() {
    if (showSpeed == playSpeed) {
        enablePersistentState(setButton, 'selected');
    }
    else {
        disablePersistentState(setButton, 'selected');
    }

    if (showSpeed === maxSpeed) enablePersistentState(increButton, 'gray-out');
    else if (showSpeed === minSpeed) enablePersistentState(decreButton, 'gray-out');
    else if (showSpeed === 0) enablePersistentState(decreButton, 'gray-out');
}

/********************************* functions **********************************/

function process(info) {
    hideIcon();
    document.querySelector('h1').innerText = info.vidTitle;
    vidDuration = info.durationInSec;
    updatePlaySpeed(info.speed);
    updateCalcResult(calcDuration(info.speed));
    checkSpeed();
}


function sendMessage(type, msg={}) {
    msg['msgType'] = type;
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, msg, function(response) {
            if (response.msgType === 'videoInfo') {
                process(response);
            }
            else if (response.msgType === 'setSpeed') {
                console.log(response.success);
            }
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
    enablePersistentState(setButton, 'selected');
    playSpeed = showSpeed;
    sendMessage('setSpeed', {speed: showSpeed});
}

/******************************* main program *********************************/

// when pop up is opened, get video duration
sendMessage('videoInfo');