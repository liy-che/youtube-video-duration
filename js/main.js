/******************************* program states *******************************/

const minSpeed = 0;
const interval = 0.25;
const maxSpeed = 16;

let vidDuration;
let playSpeed = 1;
const decreButton = document.querySelector('#decre');
const increButton = document.querySelector('#incre');
const timeDisplay = document.querySelector('#time');
const diffDisplay = document.querySelector('#diff');
const sign = document.querySelector('#sign');

function showBlock(elt) {
    document.getElementById(elt).style.display ='block';
  } 
 
function hideBlock(elt) {
    document.getElementById(elt).style.display ='none';
}


/******************************* event listeners ******************************/

// change speed with arrow
decreButton.addEventListener('click', decreSpeed);

function decreSpeed() {
    if (increButton.classList.contains('gray-out')) disablePersistentState(increButton, 'gray-out');
    if (playSpeed > minSpeed) {
        updatePlaySpeed(playSpeed-interval);
        updateCalcResult(calcDuration(playSpeed));
    }
    checkSpeed();
}

increButton.addEventListener('click', increSpeed);

function increSpeed() {
    if (decreButton.classList.contains('gray-out')) disablePersistentState(decreButton, 'gray-out');
    if (playSpeed < maxSpeed) {
        updatePlaySpeed(playSpeed+interval);
        updateCalcResult(calcDuration(playSpeed));
    }
    checkSpeed();
}

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
    if (playSpeed === maxSpeed) enablePersistentState(increButton, 'gray-out');
    else if (playSpeed === minSpeed) enablePersistentState(decreButton, 'gray-out');
    else if (playSpeed === 0) enablePersistentState(decreButton, 'gray-out');
}

/********************************* functions **********************************/

function process(info) {
    hideBlock('loading');
    document.querySelector('h1').innerText = info.vidTitle;
    vidDuration = info.durationInSec;
    updatePlaySpeed(info.speed, false);
    updateCalcResult(calcDuration(info.speed));
    checkSpeed();
    showBlock('main');
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

function showTimeUp() {
    sign.style.display = 'inline';
    sign.setAttribute('src', '../images/arrow-154-24.png');
    sign.setAttribute('alt', 'Up');
}

function showTimeDown() {
    sign.style.display = 'inline';
    sign.setAttribute('src', '../images/arrow-216-24.png')
    sign.setAttribute('alt', 'Down');
}

function updateCalcResult(newTime) {
    if (!isFinite(newTime)) {
        timeDisplay.innerHTML = '&infin;';
        diffDisplay.innerHTML = '&infin;';
        showTimeUp();
        return;
    }

    const timeDiff = newTime - vidDuration;

    timeDisplay.innerText = convertSecondToTimestamp(newTime);
    diffDisplay.innerText = convertSecondToTimestamp(Math.abs(timeDiff));

    if (timeDiff < 0) showTimeDown();
    else if (timeDiff > 0) showTimeUp();
    else {
        sign.style.display = 'none';
        diffDisplay.innerText = '00:00';
    }
}

function updatePlaySpeed(newSpeed, sendMsg=true) {
    playSpeed = newSpeed;
    if (sendMsg) sendMessage('setSpeed', {speed: playSpeed});
    document.querySelector('#speed').innerText = playSpeed.toFixed(2);
}

/******************************* main program *********************************/

// when pop up is opened, get video duration
hideBlock('main');
sendMessage('videoInfo');