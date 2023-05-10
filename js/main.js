/******************************* program states *******************************/

const minSpeed = 0.25;
const interval = 0.25;
const maxSpeed = 16;
const seekInterval = 10;

let playSpeed = 1;

// Displays
const timeDisplay = document.querySelector('#time-display');
const speedDisplay = document.querySelector('#speed');

// Buttons
const decreButton = document.querySelector('#decre');
const increButton = document.querySelector('#incre');
const setNormalButton = document.querySelector('#set-normal');
const restartButton = document.querySelector('#restart');
const playPauseButton = document.querySelector('#play-pause');
const playPauseIcon = document.querySelector('#play-pause i');
const rewindButton = document.querySelector('#rewind');
const advanceButton = document.querySelector('#advance');
const volumeButton = document.querySelector('#volume');
const enable = document.querySelector('#enable');
const enableController = document.querySelector('#enableController');
const enableShortcuts = document.querySelector('#enableShortcuts');

// Tabs
const tab1 = document.getElementById('tab1');
const tab2 = document.getElementById('tab2');

function showBlock(elt) {
    document.getElementById(elt).style.display ='block';
  } 
 
function hideBlock(elt) {
    document.getElementById(elt).style.display ='none';
}

/******************************* event listeners ******************************/

setNormalButton.addEventListener('click', function() {
    setPlaySpeed(1);
    disablePersistentState(increButton, 'gray-out');
    disablePersistentState(decreButton, 'gray-out');
});

restartButton.addEventListener('click', function() {
    sendMessage('restartVideo');
});

playPauseButton.addEventListener('click', function() {
    sendMessage('playPauseVideo');
});

rewindButton.addEventListener('click', function() {
    sendMessage('seek', {interval: -seekInterval});
});

advanceButton.addEventListener('click', function() {
    sendMessage('seek', {interval: seekInterval});
});

volumeButton.addEventListener('click', function() {
    sendMessage('changeVolume');
});

// change speed with arrow
decreButton.addEventListener('click', decreSpeed);

function decreSpeed() {
    if (increButton.classList.contains('gray-out')) disablePersistentState(increButton, 'gray-out');
    if (playSpeed > minSpeed) {
        setPlaySpeed(playSpeed-interval);
    }
}

increButton.addEventListener('click', increSpeed);

function increSpeed() {
    if (decreButton.classList.contains('gray-out')) disablePersistentState(decreButton, 'gray-out');
    if (playSpeed < maxSpeed) {
        setPlaySpeed(playSpeed+interval);
    }
}


function isUpKey(key) {
    return key === 'arrowup' || key === 'w';
}

function isDownKey(key) {
    return key === 'arrowdown' || key === 's';
}

function isLeftKey(key) {
    return key === 'arrowleft' || key === 'a';
}

function isRightKey(key) {
    return key === 'arrowright' || key === 'd';
}

// TODO can use key codes instead of characters
// listen for key press
document.onkeydown = event => {
    const pressedKey = event.key.toLowerCase();
    if (isLeftKey(pressedKey)) {
        decreButton.click();
        if (decreButton.classList.contains('gray-out')) return;
        decreButton.classList.add('pressed-decre');
    }
    else if (isRightKey(pressedKey)) {
        increButton.click();
        if (increButton.classList.contains('gray-out')) return;
        increButton.classList.add('pressed-incre');
    }
    else if (isDownKey(pressedKey)) {
        setNormalButton.click();
        setNormalButton.classList.add('pressed');
    }
    else if (pressedKey === 'r') {
        restartButton.click();
        restartButton.classList.add('pressed');
    }
    else if (pressedKey === 'j') {
        rewindButton.click();
        rewindButton.classList.add('pressed');
    }
    else if (pressedKey === 'k') {
        playPauseButton.click();
        playPauseButton.classList.add('pressed');
    }
    else if (pressedKey === 'l') {
        advanceButton.click();
        advanceButton.classList.add('pressed');
    }
    else if (pressedKey === 'm') {
        volumeButton.click();
        volumeButton.classList.add('pressed');
    }
    else if (pressedKey === ' ') window.close();
};

document.onkeyup = event => {
    const pressedKey = event.key.toLowerCase();
    if (isLeftKey(pressedKey)) {
        decreButton.classList.remove('pressed-decre');
    }
    else if (isRightKey(pressedKey)) {
        increButton.classList.remove('pressed-incre');
    }
    else if (isUpKey(pressedKey)) {
        if (tab1.checked) tab2.checked = true;
        else tab1.checked = true;
    }
    else if (isDownKey(pressedKey)) {
        setNormalButton.classList.remove('pressed');
    }
    else if (pressedKey === 'r') {
        restartButton.classList.remove('pressed');
    }
    else if (pressedKey === 'j') {
        rewindButton.classList.remove('pressed');
    }
    else if (pressedKey === 'k') {
        playPauseButton.classList.remove('pressed');
    }
    else if (pressedKey === 'l') {
        advanceButton.classList.remove('pressed');
    }
    else if (pressedKey === 'm') {
        volumeButton.classList.remove('pressed');
    }
};

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

function enablePersistentState(elt, persistentState) {
    if (elt.classList.contains('on-hover')) elt.classList.remove('on-hover');
    if (!elt.classList.contains(persistentState)) elt.classList.add(persistentState);
}

function disablePersistentState(elt, persistentState) {
    if (!elt.classList.contains('on-hover')) elt.classList.add('on-hover');
    if (elt.classList.contains(persistentState)) elt.classList.remove(persistentState);
}

function checkSpeed() {
    if (playSpeed === maxSpeed) enablePersistentState(increButton, 'gray-out');
    else if (playSpeed === minSpeed) enablePersistentState(decreButton, 'gray-out');
    else if (playSpeed === 0) enablePersistentState(decreButton, 'gray-out');
}

function updateShowTime(timeBlock) {
    timeDisplay.innerHTML = timeBlock;
}

/********************************* functions **********************************/

function process(info) {
    hideBlock('loading');
    document.querySelector('h3').innerText = info.vidTitle;
    playSpeed = info.speed;
    updateShowSpeed();
    updateShowTime(info.timeDisplay);
    if (info.playing) {
        playPauseIcon.classList.replace('fa-play', 'fa-pause');
        playPauseButton.setAttribute('title', 'pause (k)');
    }
    if (info.muted) {
        volumeButton.classList.add('chosen');
        volumeButton.setAttribute('title', 'unmute (m)');
    }
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
                playSpeed = response.speed;
                updateShowSpeed();
                updateShowTime(response.timeDisplay);
            }
            else if (response.msgType === 'seek') {
                updateShowTime(response.timeDisplay);
            }
            else if (response.msgType === 'restartVideo' || response.msgType === 'playPauseVideo') {
                if (response.playing) {
                    playPauseIcon.classList.replace('fa-play', 'fa-pause');
                    playPauseButton.setAttribute("title", "pause (k)");
                }
                else {
                    playPauseIcon.classList.replace('fa-pause', 'fa-play');
                    playPauseButton.setAttribute('title', 'play (k)');
                }
            }
            else if (response.msgType === 'changeVolume') {
                let isPressed = volumeButton.classList.contains('chosen');
                if (response.muted && !isPressed) {
                    volumeButton.classList.add('chosen');
                    volumeButton.setAttribute('title', 'unmute (m)');
                }
                else if (!response.muted && isPressed) {
                    volumeButton.classList.remove('chosen');
                    volumeButton.setAttribute('title', 'mute (m)');
                }
            }
        });
    });
}

function setPlaySpeed(newSpeed) {
    sendMessage('setSpeed', {speed: newSpeed});
}

function updateShowSpeed() {
    speedDisplay.innerText = playSpeed.toFixed(2);
    checkSpeed();
}

/******************************* main program *********************************/

// when pop up is opened, get video duration
hideBlock('main');

sendMessage('videoInfo')

chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const port = chrome.tabs.connect(tabs[0].id, {name: "video-progress"});
    port.onMessage.addListener(function(msg) {
        updateShowTime(msg.timeDisplay);
        if (msg.remainingTime === 0) {
            playPauseIcon.classList.replace('fa-pause', 'fa-play');
            playPauseButton.setAttribute('title', 'play (k)');
        }
    });
});

chrome.runtime.sendMessage({msgType: "handshake"});

enable.addEventListener('click', function() {
    if (enable.checked) {
        enableController.checked = true;
        enableShortcuts.checked = true;
    }
    else {
        enableController.checked = false;
        enableShortcuts.checked = false;
    }
});

enableController.addEventListener('click', function() {
    if (enableController.checked) {
        enable.checked = true;
    }
    else if (!enableShortcuts.checked) {
        enable.checked = false;
    }
});

enableShortcuts.addEventListener('click', function() {
    if (enableShortcuts.checked) {
        enable.checked = true;
    }
    else if (!enableController.checked) {
        enable.checked = false;
    }
});

// document.addEventListener('DOMContentLoaded', restoreOptions);