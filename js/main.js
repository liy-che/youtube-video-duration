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
const showDifference = document.querySelector('#difference');
const rememberSpeed = document.querySelector('#remember-speed');
const defaultSpeedInput = document.querySelector('#default-speed');
const increIntervalInput = document.querySelector('#speed-incre-interval');
const decreIntervalInput = document.querySelector('#speed-decre-interval');
const saveButton = document.querySelector('.save-button');
const confirmText = document.querySelector('.confirm-text');
// Tabs
const tab1 = document.getElementById('tab1');
const tab2 = document.getElementById('tab2');
const tab3 = document.getElementById('tab3');

// User settings, only using keys to get settings from chrome storage
let settings = {
  seen: false,
  enable: true,
  enableController: true,
  enableShortcuts: true,
  setLocation: 'right',
  showRemaining: true,
  showDifference: false,
  showProgress: false,
  rememberSpeed: {
    set: false,
    lastSpeed: 1.0,
  },
  defaultSpeed: 1.0,
  increInterval: 0.25,
  decreInterval: 0.25,
};

/*
 - only allow numbers (integer or valid decimal with up to 3 decimal places)
- value must be between 0 and 16, inclusive
 */
function handleInput(input, defaultVal) {
  const raw = input.value !== '' ? input.value : defaultVal;

  // Allow only digits and at most one dot
  const cleaned = raw.replace(/[^\d.]/g, '');

  // If multiple dots, keep only the first
  const parts = cleaned.split('.');
  let numeric = parts[0];
  if (parts.length > 1) {
    numeric += '.' + parts[1].slice(0, 3); // limit to 3 decimal places
  }

  // Update input only if it's changed
  if (numeric !== raw) {
    input.value = numeric;
  }

  // Check validity and range
  let isInvalid = Number(numeric) < 0.063 || Number(numeric) > 16;
  input.classList.toggle('invalid', isInvalid);

  // Check if any input is invalid
  const invalid =
    defaultSpeedInput.classList.contains('invalid') ||
    increIntervalInput.classList.contains('invalid') ||
    decreIntervalInput.classList.contains('invalid');

  saveButton.disabled = invalid;
}

defaultSpeedInput.addEventListener('input', (e) => {
  handleInput(e.target, '1.0');
});

increIntervalInput.addEventListener('input', (e) => {
  handleInput(e.target, '0.25');
});

decreIntervalInput.addEventListener('input', (e) => {
  handleInput(e.target, '0.25');
});

/*
- auto format to a standard format eg: .15 to 0.15, 1 to 1.0, 0.250 to 0.25
  must have at least one to at most three decimal places, remove the redundant 
  ending 0s in decimal places. No rounding.
 */
function formatSpeed(input) {
  if (input === '') return input;

  const num = parseFloat(input);

  // Check validity and range
  if (isNaN(num) || num < 0.0625 || num > 16) return null;

  let str = num.toString(); // Removes trailing zeros already

  // Ensure at least one decimal
  if (!str.includes('.')) {
    str += '.0';
  }

  return str;
}

[defaultSpeedInput, increIntervalInput, decreIntervalInput].forEach((input) => {
  input.addEventListener('blur', (e) => {
    const formatted = formatSpeed(e.target.value);
    if (formatted !== null) e.target.value = formatted;
  });
});

saveButton.addEventListener('click', () => {
  confirmText.classList.toggle('show', true);
  setTimeout(() => {
    confirmText.classList.toggle('show', false);
  }, 1500);
  settings.defaultSpeed =
    defaultSpeedInput.value !== '' ? Number(defaultSpeedInput.value) : 1;
  settings.increInterval =
    increIntervalInput.value !== '' ? Number(increIntervalInput.value) : 0.25;
  settings.decreInterval =
    decreIntervalInput.value !== '' ? Number(decreIntervalInput.value) : 0.25;

  chrome.storage.sync.set({
    defaultSpeed: settings.defaultSpeed,
    increInterval: settings.increInterval,
    decreInterval: settings.decreInterval,
  });
});

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
document.addEventListener('keydown', (event) => {
  // Ignore keydown event if typing in an input box
  if (
    event.target.nodeName === 'INPUT' ||
    event.target.nodeName === 'TEXTAREA' ||
    event.target.isContentEditable
  ) {
    return false;
  }

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
});

document.addEventListener('keyup', (event) => {
  // Ignore keydown event if typing in an input box
  if (
    event.target.nodeName === 'INPUT' ||
    event.target.nodeName === 'TEXTAREA' ||
    event.target.isContentEditable
  ) {
    return false;
  }

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
  } else if (pressedCode === 'KeyZ') {
    document.querySelector('input[name="location"][value="left"]').click();
  } else if (pressedCode === 'KeyX') {
    document.querySelector('input[name="location"][value="right"]').click();
  }
});

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
    settings = storage;
    enableExt.checked = storage.enable;
    enableController.checked = storage.enableController;
    enableShortcuts.checked = storage.enableShortcuts;
    document.querySelector(
      `input[name="location"][value="${storage.setLocation}`,
    ).checked = true;
    showProgress.checked = storage.showProgress;
    showRemaining.checked = storage.showRemaining;
    toggleControllerOptions();
    showDifference.checked = storage.showDifference;
    rememberSpeed.checked = storage.rememberSpeed.set;
    defaultSpeedInput.value = formatSpeed(storage.defaultSpeed);
    increIntervalInput.value = formatSpeed(storage.increInterval);
    decreIntervalInput.value = formatSpeed(storage.decreInterval);

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
  chrome.storage.sync.set({
    enable: enableExt.checked,
    enableShortcuts: enableShortcuts.checked,
  });
});

showRemaining.addEventListener('click', function () {
  chrome.storage.sync.set({
    showRemaining: showRemaining.checked,
  });
});

showProgress.addEventListener('click', function () {
  chrome.storage.sync.set({
    showProgress: showProgress.checked,
  });
});

showDifference.addEventListener('click', function () {
  chrome.storage.sync.set({
    showDifference: showDifference.checked,
  });
});

rememberSpeed.addEventListener('click', function () {
  chrome.storage.sync.set({
    rememberSpeed: {
      set: rememberSpeed.checked,
      lastSpeed: settings.rememberSpeed.lastSpeed,
    },
  });
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
    }
  });
});
