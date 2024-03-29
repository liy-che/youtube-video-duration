/******************************* program states *******************************/
const defaultSpeed = 1.0;
const minSpeed = 0.25;
const interval = 0.25;
const maxSpeed = 16;
const seekInterval = 10;
const zeroTime = '0:00';

let playSpeed = 1;
let secondarySpeed = defaultSpeed;

// Displays
const timeDisplay = document.querySelector('#time-display');
const speedDisplay = document.querySelector('#speed');
const titleDisplay = document.querySelector('#main h3');

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

// User settings, only using keys to get settings from chrome storage
let settings = {
    seen: false,
    enable: true,
    enableController: true,
    enableShortcuts: true
};

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
document.querySelector('.closebtn').addEventListener('click', function(e) {
    chrome.storage.sync.set({seen: true});
    let div = e.target.parentElement;
    div.style.opacity = 0;
    setTimeout(function(){ div.style.display = "none"; }, 600);
});

setNormalButton.addEventListener('click', function() {
    if (playSpeed !== defaultSpeed) {
        secondarySpeed = playSpeed;
        setPlaySpeed(defaultSpeed);
    } else setPlaySpeed(secondarySpeed);
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
    return key === 'ArrowUp' || key === 'KeyW';
}

function isDownKey(key) {
    return key === 'ArrowDown' || key === 'KeyS';
}

function isLeftKey(key) {
    return key === 'ArrowLeft' || key === 'KeyA';
}

function isRightKey(key) {
    return key === 'ArrowRight' || key === 'KeyD';
}


// listen for key press
document.onkeydown = event => {
    const pressedCode = event.code;
    if (isLeftKey(pressedCode)) {
        decreButton.click();
        if (decreButton.classList.contains('gray-out')) return;
        decreButton.classList.add('pressed-decre');
    }
    else if (isRightKey(pressedCode)) {
        increButton.click();
        if (increButton.classList.contains('gray-out')) return;
        increButton.classList.add('pressed-incre');
    }
    else if (isDownKey(pressedCode)) {
        setNormalButton.click();
        setNormalButton.classList.add('pressed');
    }
    else if (pressedCode === 'KeyR') {
        restartButton.click();
        restartButton.classList.add('pressed');
    }
    else if (pressedCode === 'KeyJ') {
        rewindButton.click();
        rewindButton.classList.add('pressed');
    }
    else if (pressedCode === 'KeyK') {
        playPauseButton.click();
        playPauseButton.classList.add('pressed');
    }
    else if (pressedCode === 'KeyL') {
        advanceButton.click();
        advanceButton.classList.add('pressed');
    }
    else if (pressedCode === 'KeyM') {
        volumeButton.click();
        volumeButton.classList.add('pressed');
    }
    else if (pressedCode === 'Space') window.close();
};

document.onkeyup = event => {
    const pressedCode = event.code;
    if (isLeftKey(pressedCode)) {
        decreButton.classList.remove('pressed-decre');
    }
    else if (isRightKey(pressedCode)) {
        increButton.classList.remove('pressed-incre');
    }
    else if (isUpKey(pressedCode)) {
        if (tab1.checked) tab2.checked = true;
        else if (tab2.checked) tab3.checked = true;
        else if (tab3.checked) tab4.checked = true;
        else tab1.checked = true;
    }
    else if (isDownKey(pressedCode)) {
        setNormalButton.classList.remove('pressed');
    }
    else if (pressedCode === 'KeyR') {
        restartButton.classList.remove('pressed');
    }
    else if (pressedCode === 'KeyJ') {
        rewindButton.classList.remove('pressed');
    }
    else if (pressedCode === 'KeyK') {
        playPauseButton.classList.remove('pressed');
    }
    else if (pressedCode === 'KeyL') {
        advanceButton.classList.remove('pressed');
    }
    else if (pressedCode === 'KeyM') {
        volumeButton.classList.remove('pressed');
    }
    else if (pressedCode === 'KeyV') {
        enableController.click();
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

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
      if (request.msgType === 'updatePopup')
        process(request);
    }
);

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

function togglePlayPauseButton(isPlaying) {
    if (isPlaying) {
        playPauseIcon.classList.replace('fa-play', 'fa-pause');
        playPauseButton.setAttribute("title", "pause (k)");
    }
    else {
        playPauseIcon.classList.replace('fa-pause', 'fa-play');
        playPauseButton.setAttribute('title', 'play (k)');
    }
}

function updateShowTime(timeBlock) {
    //console.log("Updating showtime")
    let [remainTimestamp, diffTimestamp, sign] = timeBlock;

    if (sign === '▲') {
        sign = `<span id="upArrow">${sign}</span>`;
    } else if (sign === '▼') {
        sign = `<span id="downArrow">${sign}</span>`
    }

    if (diffTimestamp) {
        timeDisplay.innerHTML = `
            <span id="remain">${remainTimestamp}&nbsp;</span>${sign}<!--
            --><span id="diff">${diffTimestamp}</span>
        `
    } else {
        timeDisplay.innerHTML = `
            <span id="remain">${remainTimestamp}</span>
        `
    }
}

/********************************* functions **********************************/

function process(info) {
    hideBlock('loading');
    titleDisplay.innerText = info.vidTitle;
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
            if (chrome.runtime.lastError) {
                setTimeout(sendMessage, 500, 'videoInfo');
            }
            else if (response.msgType === 'videoInfo') {
                process(response);
                connectPort();
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
                togglePlayPauseButton(response.playing);
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

function connectPort() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        const port = chrome.tabs.connect(tabs[0].id, {name: "video-progress"});
        port.onMessage.addListener(function(msg) {
            titleDisplay.innerText = msg.vidTitle;
            updateShowTime(msg.timeDisplay);
            togglePlayPauseButton(!msg.paused);
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

// restore options
document.addEventListener('DOMContentLoaded', function() {
    chrome.storage.sync.get(settings, function(storage) {
        enable.checked = storage.enable;
        enableController.checked = storage.enableController;
        enableShortcuts.checked = storage.enableShortcuts;

        if(!storage.seen) {
            document.querySelector('.alert').style.display = 'block';
        }

        // force reflow
        // https://stackoverflow.com/questions/11131875/what-is-the-cleanest-way-to-disable-css-transition-effects-temporarily
        document.body.offsetHeight;
        document.body.classList.remove('preload');
    });
});

// when pop up is opened, get video duration
hideBlock('main');

sendMessage('videoInfo')

chrome.runtime.sendMessage({msgType: "handshake"});

enable.addEventListener('click', function() {
    enableController.checked = enableShortcuts.checked = enable.checked;
    chrome.storage.sync.set({
        enable: enable.checked,
        enableController: enableController.checked,
        enableShortcuts: enableShortcuts.checked
    });

});

enableController.addEventListener('click', function() {
    enable.checked = enableController.checked || enableShortcuts.checked ? true : false;
    chrome.storage.sync.set({
        enable: enable.checked,
        enableController: enableController.checked
    });
});

enableShortcuts.addEventListener('click', function() {
    enable.checked = enableShortcuts.checked || enableController.checked? true : false;
    chrome.storage.sync.set({
        enable: enable.checked,
        enableShortcuts: enableShortcuts.checked
    });
});