/******************************* program states *******************************/
const _interval = 0.25;
const _seekInterval = 10;

const enableExt = document.querySelector('#enable');
const enableController = document.querySelector('#enableController');
const enableShortcuts = document.querySelector('#enableShortcuts');
const setLocation = document.querySelectorAll('input[name="location"]');
const controllerOptions = document.querySelectorAll('.options label input');
const showProgress = document.querySelector('#progress');
const showRemaining = document.querySelector('#remaining');

// User settings, only using keys to get settings from chrome storage
let settings = {
  seen: false,
  enable: true,
  enableController: true,
  enableShortcuts: true,
  setLocation: 'right',
  showRemaining: true,
  showProgress: false,
};

// Tabs
const tab1 = document.getElementById('tab1');
const tab2 = document.getElementById('tab2');
const tab3 = document.getElementById('tab3');

/******************************* event listeners ******************************/
document.querySelector('.closebtn').addEventListener('click', function (e) {
  chrome.storage.sync.set({ seen: true });
  let div = e.target.parentElement;
  div.style.opacity = 0;
  setTimeout(function () {
    div.style.display = 'none';
  }, 600);
});

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
document.onkeydown = (event) => {
  const pressedCode = event.code;
  if (isLeftKey(pressedCode)) {
    sendMessage('decreSpeed');
  } else if (isRightKey(pressedCode)) {
    sendMessage('increSpeed');
  } else if (isDownKey(pressedCode)) {
    sendMessage('jumpSpeed');
  } else if (pressedCode === 'KeyJ') {
    sendMessage('rewind');
  } else if (pressedCode === 'KeyL') {
    sendMessage('advance');
  } else if (pressedCode === 'KeyR') {
    sendMessage('restartVideo');
  } else if (pressedCode === 'KeyK') {
    sendMessage('playPauseVideo');
  } else if (pressedCode === 'KeyM') {
    sendMessage('changeVolume');
  } else if (pressedCode === 'Space') window.close();
};

document.onkeyup = (event) => {
  const pressedCode = event.code;
  if (isUpKey(pressedCode)) {
    if (tab1.checked) tab2.checked = true;
    else if (tab2.checked) tab3.checked = true;
    else tab1.checked = true;
  } else if (pressedCode === 'KeyV') {
    enableController.click();
  } else if (pressedCode === 'KeyE') {
    showRemaining.click();
  } else if (pressedCode === 'KeyP') {
    showProgress.click();
  }
};

/********************************* functions **********************************/

function sendMessage(type, msg = {}) {
  msg['msgType'] = type;
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, msg);
  });
}

/******************************* main program *********************************/

// restore options
document.addEventListener('DOMContentLoaded', function () {
  chrome.storage.sync.get(settings, function (storage) {
    enableExt.checked = storage.enable;
    enableController.checked = storage.enableController;
    enableShortcuts.checked = storage.enableShortcuts;
    document.querySelector(
      `input[name="location"][value="${storage.setLocation}`,
    ).checked = true;
    showProgress.checked = storage.showProgress;
    showRemaining.checked = storage.showRemaining;
    toggleControllerOptions();

    if (!storage.seen) {
      document.querySelector('.alert').style.display = 'block';
    }

    // force reflow
    // https://stackoverflow.com/questions/11131875/what-is-the-cleanest-way-to-disable-css-transition-effects-temporarily
    document.body.offsetHeight;
    document.body.classList.remove('preload');
  });
});

chrome.storage.sync.get(['opened']).then((result) => {
  if (!result.opened) chrome.runtime.sendMessage({ msgType: 'handshake' });
});

enableExt.addEventListener('click', function () {
  enableController.checked = enableShortcuts.checked = enableExt.checked;
  toggleControllerOptions();
  chrome.storage.sync.set({
    enable: enableExt.checked,
    enableController: enableController.checked,
    enableShortcuts: enableShortcuts.checked,
  });
});

enableController.addEventListener('click', function () {
  enableExt.checked =
    enableController.checked || enableShortcuts.checked ? true : false;
  toggleControllerOptions();
  chrome.storage.sync.set({
    enable: enableExt.checked,
    enableController: enableController.checked,
  });
});

enableShortcuts.addEventListener('click', function () {
  enableExt.checked =
    enableShortcuts.checked || enableController.checked ? true : false;
  toggleControllerOptions();
  if (enableShortcuts.checked) sendMessage('flashLocation');
  chrome.storage.sync.set({
    enable: enableExt.checked,
    enableShortcuts: enableShortcuts.checked,
  });
});

showRemaining.addEventListener('click', function () {
  chrome.storage.sync.set({
    showRemaining: showRemaining.checked,
  });
  sendMessage('flashLocation');
});

showProgress.addEventListener('click', function () {
  chrome.storage.sync.set({
    showProgress: showProgress.checked,
  });
  sendMessage('flashLocation');
});

function toggleControllerOptions() {
  controllerOptions.forEach((option) => {
    option.disabled = !enableExt.checked;
  });
}

setLocation.forEach((radio) => {
  radio.addEventListener('change', function () {
    if (this.checked) {
      chrome.storage.sync.set({
        setLocation: this.value,
      });
      sendMessage('flashLocation');
    }
  });
});
