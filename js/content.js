let video;
let flashButtons;
let resetButton;
let increButton;
let decreButton;
let rewindButton;
let advanceButton;
let speedDisplay;
let remainDisplay;
let diffDisplay;
let progressDisplay;
let videoContainer;
let insertedNode;
let showTime;
let hasListeners;
let hasTimeUpdateListeners;
let _titleElt;
let timer;
let diffTimer;
let showDiff;
let handleSpaceDown;
let handleSpaceUp;
let isPlaying = false;
let shortsTimeoutId;

const resetSpeed = 1.0;
let secondarySpeed = resetSpeed;
const minSpeed = 0.0625;
const maxSpeed = 16;
const seekInterval = 10;
const zeroTime = '0:00';
let lastSpeed = null;

// TODO: stop everything when disabled, including in the popup
// enabled -> disabled -> enabled
// disabled -> enabled -> disabled
// at start, only initialize the minimum i.e. default disabled, then add on if enabled
// all intervals, timeouts, inserted elements, and some events must be deleted on disable
// reinsert elements (if controlled enabled) and all events (if shortcuts enabled) on enable

// values set default for first-time users
let settings = {
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

/***************************** Initialize extension ******************************/

function msgHandler(request, sender, sendResponse) {
  if (request.msgType === 'decreSpeed') {
    handleDecre();
    sendResponse({
      msgType: request.msgType,
      speed: video.playbackRate,
      timeDisplay: getTimeDisplay(),
    });
  } else if (request.msgType === 'increSpeed') {
    handleIncre();
    sendResponse({
      msgType: request.msgType,
      speed: video.playbackRate,
      timeDisplay: getTimeDisplay(),
    });
  } else if (request.msgType === 'jumpSpeed') {
    handleReset();
    sendResponse({ msgType: request.msgType, speed: video.playbackRate });
  } else if (request.msgType === 'rewind') {
    handleRewind();
    sendResponse({
      msgType: request.msgType,
      timeDisplay: getTimeDisplay(),
    });
  } else if (request.msgType === 'advance') {
    handleAdvance();
    sendResponse({
      msgType: request.msgType,
      timeDisplay: getTimeDisplay(),
    });
  } else if (request.msgType === 'restartVideo') {
    restartVideo();
    sendResponse({ msgType: request.msgType, playing: !video.paused });
  } else if (request.msgType === 'playPauseVideo') {
    if (video.paused) video.play();
    else video.pause();
    sendResponse({ msgType: request.msgType, playing: !video.paused });
  } else if (request.msgType === 'changeVolume') {
    video.muted = !video.muted;
    sendResponse({ msgType: request.msgType, muted: video.muted });
  } else if (request.msgType === 'inject') {
    document.dispatchEvent(new CustomEvent('vdc-initialize'));
  }
}

// initialize user settings
// RUNS
chrome.storage.sync.get(settings, async function (storage) {
  settings = storage;
  showDiff = settings.showDifference;
  lastSpeed = settings.rememberSpeed.lastSpeed;

  chrome.storage.onChanged.addListener(async function (changes, _area) {
    if (changes.enable) {
      settings.enable = changes.enable.newValue;
      if (settings.enable) {
        document.dispatchEvent(new CustomEvent('vdc-initialize'));
        chrome.runtime.onMessage.addListener(msgHandler);
      } else {
        document.removeEventListener('keydown', handleSpaceDown);
        document.removeEventListener('keyup', handleSpaceUp);
        if (insertedNode) {
          insertedNode.remove();
          insertedNode = null;
        }
      }
    }

    if (!insertedNode) insertedNode = await waitForElm('.vdc-controller');

    if (changes.enableController) {
      settings.enableController = changes.enableController.newValue;
      showHideController();
    }

    if (changes.enableShortcuts) {
      settings.enableShortcuts = changes.enableShortcuts.newValue;
      if (settings.enableShortcuts) {
        flashButtons(2000);
        document.addEventListener('keydown', handleShortcuts, true);
      } else {
        document.removeEventListener('keydown', handleShortcuts, true);
      }
    }

    if (changes.setLocation) {
      settings.setLocation = changes.setLocation.newValue;
      if (settings.setLocation === 'left') {
        insertedNode.classList.replace('top-right', 'top-left');
      } else {
        insertedNode.classList.replace('top-left', 'top-right');
      }
      flashButtons(2000);
    }

    if (changes.showRemaining) {
      settings.showRemaining = changes.showRemaining.newValue;
      if (settings.showRemaining) {
        updateShowTime();
      } else {
        remainDisplay.textContent = '';
      }
      flashButtons(2000);
    }

    if (changes.showDifference) {
      settings.showDifference = changes.showDifference.newValue;
      if (settings.showDifference) {
        showDiff = true;
        if (diffTimer) clearTimeout(diffTimer);
        updateShowTime();
      } else {
        showDiff = false;
        diffDisplay.innerHTML = '';
      }
      flashButtons(2000);
    }

    if (changes.showProgress) {
      settings.showProgress = changes.showProgress.newValue;
      if (settings.showProgress) {
        updateShowTime();
      } else {
        progressDisplay.innerHTML = '';
      }
      flashButtons(2000);
    }

    // get from storage and set local, then use local after
    // set to storage and update local, continue using local
    if (changes.rememberSpeed) {
      settings.rememberSpeed = changes.rememberSpeed.newValue;
      if (settings.rememberSpeed.set) {
        lastSpeed =
          video.playbackRate === 1 ? settings.defaultSpeed : video.playbackRate;
        chrome.storage.sync.set({
          rememberSpeed: {
            ...settings.rememberSpeed,
            lastSpeed: lastSpeed,
          },
        });
      } else {
        lastSpeed = null;
      }
    }

    if (changes.defaultSpeed) {
      settings.defaultSpeed = changes.defaultSpeed.newValue;
    }

    if (changes.increInterval) {
      settings.increInterval = changes.increInterval.newValue;
    }

    if (changes.decreInterval) {
      settings.decreInterval = changes.decreInterval.newValue;
    }
  });

  // RUNS disable
  if (settings.enable) {
    chrome.runtime.onMessage.addListener(msgHandler);
  }

  if (self !== top) {
    document.dispatchEvent(new CustomEvent('vdc-initialize'));
  }
});

// disable
let navigateEnd = true;
document.addEventListener('yt-navigate-start', () => {
  navigateEnd = false;
});
document.addEventListener('yt-navigate-finish', () => {
  navigateEnd = true;
  document.dispatchEvent(new CustomEvent('vdc-initialize'));
});
document.addEventListener('vdc-initialize', async () => {
  if (!settings.enable) return;

  video = await waitForElm('video[src]');

  videoContainer = video.parentElement; // html5-video-container
  // remove controller for video tags without src attribute
  // find the video controller inserted previously if exists
  // remove the inserted controller
  if (insertedNode) {
    insertedNode.remove();
    insertedNode = null;
  }

  // inject controller for video tag with src attribute
  // construct a new node with a shadow DOM and insert node into DOM
  insertedNode = constructShadowDOM();

  // set up event listeners for controller
  setupListeners();
  handleSpaceDown, (handleSpaceUp = handleSpaceHold());

  // set up listener for keyboard shortcuts
  if (settings.enableShortcuts) {
    document.addEventListener('keydown', handleShortcuts, true);
  }
});

// wait for element to exist
function waitForElm(selector) {
  return new Promise((resolve) => {
    if (navigateEnd && document.querySelector(selector)) {
      return resolve(document.querySelector(selector));
    }

    const observer = new MutationObserver((mutations, obs) => {
      if (navigateEnd && document.querySelector(selector)) {
        obs.disconnect();
        resolve(document.querySelector(selector));
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  });
}

let handleRewind = () => {
  seekVideo(-seekInterval);
};

let handleAdvance = () => {
  seekVideo(seekInterval);
};

let handleReset = () => {
  if (video.playbackRate !== resetSpeed) {
    secondarySpeed = video.playbackRate;
    setPlaySpeed(resetSpeed);
  } else setPlaySpeed(secondarySpeed);
};

let handleIncre = () => {
  setPlaySpeed(video.playbackRate + settings.increInterval);
};

let handleDecre = () => {
  setPlaySpeed(video.playbackRate - settings.decreInterval);
};

let handleShortcuts = (event) => {
  const pressedCode = event.code;
  // Ignore if following modifier is active.
  if (
    !event.getModifierState ||
    event.getModifierState('Alt') ||
    event.getModifierState('Control') ||
    event.getModifierState('Fn') ||
    event.getModifierState('Meta') ||
    event.getModifierState('Hyper') ||
    event.getModifierState('OS')
  ) {
    return;
  }

  // Ignore keydown event if typing in an input box
  if (
    event.target.nodeName === 'INPUT' ||
    event.target.nodeName === 'TEXTAREA' ||
    event.target.isContentEditable
  ) {
    return false;
  }

  if (pressedCode === 'KeyD') handleIncre();
  else if (pressedCode === 'KeyA') handleDecre();
  else if (pressedCode === 'KeyS') {
    if (video.playbackRate === resetSpeed) updateShowTime();
    handleReset();
    flashButtons();
  } else if (pressedCode === 'KeyL') {
    event.preventDefault();
    handleAdvance();
  } else if (pressedCode === 'KeyJ') {
    event.preventDefault();
    handleRewind();
  } else if (pressedCode === 'KeyR') restartVideo();
  else if (pressedCode === 'KeyV') controlController();
  else if (pressedCode === 'KeyE') {
    settings.showRemaining = !settings.showRemaining;
    chrome.storage.sync.set({
      showRemaining: settings.showRemaining,
    });
    flashButtons();
  } else if (pressedCode === 'KeyP') {
    settings.showProgress = !settings.showProgress;
    chrome.storage.sync.set({
      showProgress: settings.showProgress,
    });
    flashButtons();
  } else if (pressedCode === 'KeyZ') {
    settings.setLocation = 'left';
    chrome.storage.sync.set({
      setLocation: 'left',
    });
    flashButtons();
  } else if (pressedCode === 'KeyX') {
    settings.setLocation = 'right';
    chrome.storage.sync.set({
      setLocation: 'right',
    });
    flashButtons();
  }

  return false;
};

// RUNS disable, need to initialize, and react on setting update
function handleSpaceHold() {
  let lastSpeed;
  let spacePressed = false;
  let spaceHeld = false;

  function handleSpaceDown(event) {
    if (event.code !== 'Space') return;
    if (!spacePressed) {
      lastSpeed = video.playbackRate;
      spacePressed = true;
    } else {
      spaceHeld = true;
    }
  }

  function handleSpaceUp(event) {
    if (event.code !== 'Space') return;
    if (spaceHeld) {
      setPlaySpeed(lastSpeed);
      spaceHeld = false;
    }
    spacePressed = false;
  }

  document.addEventListener('keydown', handleSpaceDown);
  document.addEventListener('keyup', handleSpaceUp);

  return handleSpaceDown, handleSpaceUp;
}

function controlController() {
  // toggle controller
  if (timer) {
    clearTimeout(timer);
    timer = false;
    insertedNode.classList.add('vdc-disable');
    return;
  }
  settings.enableController = !settings.enableController;
  // update settings var and sync to chrome storage
  chrome.storage.sync.set({
    enableController: settings.enableController,
  });
}

function showHideController() {
  if (settings.enableController) {
    setupTimeUpdates();
    insertedNode.classList.remove('vdc-disable');
  } else {
    removeTimeUpdates();
    insertedNode.classList.add('vdc-disable');
  }
}

/******************************* calculations *******************************/

function zeroPad(num, numFigure = 2, char = '0') {
  // assume num is a number
  num = num.toString();
  return num < 10 ? num.padStart(numFigure, char) : num;
}

function convertSecondToTimestamp(totalSeconds) {
  const totalSecondsAbs = Math.floor(Math.abs(totalSeconds));
  const hours = Math.floor(totalSecondsAbs / 3600);
  const minutes = Math.floor((totalSecondsAbs % 3600) / 60);
  const seconds = totalSecondsAbs % 60;

  let timeStr = hours !== 0 ? `${hours}:` : '';
  timeStr += hours !== 0 ? `${zeroPad(minutes)}:` : `${minutes}:`;
  timeStr += zeroPad(seconds);

  return timeStr;
}

// calculates remaining time at chosen speed
function calcDuration(time, speed) {
  return time / speed;
}

/************************* Onscreen video controller **************************/

function seekVideo(interval) {
  if (interval < 0 && video.currentTime <= Math.abs(interval)) {
    video.currentTime = 0;
  } else if (interval > 0 && video.currentTime >= video.duration - interval) {
    video.currentTime = video.duration;
  } else video.currentTime += interval;
}

function restartVideo() {
  video.currentTime = 0;
  if (video.ended) video.play();
}

function setPlaySpeed(newSpeed) {
  // when ratechange event is triggered by rate change, updateShowSpeed is called
  newSpeed = newSpeed < minSpeed ? minSpeed : newSpeed;
  newSpeed = newSpeed > maxSpeed ? maxSpeed : newSpeed;
  video.playbackRate = newSpeed;
  if (settings.rememberSpeed.set) {
    lastSpeed = newSpeed;
    chrome.storage.sync.set({
      rememberSpeed: { ...settings.rememberSpeed, lastSpeed: newSpeed },
    });
  }
}

function updateShowSpeed() {
  speedDisplay.textContent = video.playbackRate.toFixed(2);
}

function updateShowTime(forced = true) {
  if (!forced && !isPlaying) return;

  let { remainTimestamp, diffTimestamp, sign, playProgress } = getTimeDisplay();

  if (remainTimestamp === zeroTime) {
    remainDisplay.textContent = '';
  } else if (remainTimestamp !== '') {
    remainDisplay.textContent = remainTimestamp;
  }

  if (diffTimestamp !== '') {
    if (sign === '▲') {
      sign = `<span id="upArrow">${sign}</span>`;
    } else if (sign === '▼') {
      sign = `<span id="downArrow">${sign}</span>`;
    }
    if (diffTimestamp === zeroTime) {
      diffDisplay.innerHTML = '';
    } else {
      diffDisplay.innerHTML = `<span id="diff">${sign}${diffTimestamp}</span>`;
    }
  }

  if (playProgress !== -1) {
    progressDisplay.innerHTML = `
            <span id="percentage">${playProgress === 100 ? 'Complete 🎉' : playProgress + '%'}</span>
        `;
  }
}

// speed==1, difference==0   -------> no sign ('')
// speed < 1                          -------> up sign
// speed > 1                          -------> down sign
function getTimeDisplay() {
  let speed = video.playbackRate;

  // options: showRemaining, showDifference, showProgress
  // showRemaining: need remainTimestamp, diffTimestamp, and sign
  // showDifference: need diffTimestamp and sign
  // showProgress: need playProgress
  // returning [remainTimestamp, diffTimestamp, sign, playProgress]
  let remainTimestamp = '';
  let diffTimestamp = '';
  let sign = '';
  let playProgress = -1;

  // 1. remaining video time at 1x speed
  let remainTime = video.duration - video.currentTime;
  if (isNaN(remainTime))
    return { remainTimestamp, diffTimestamp, sign, playProgress };

  // 2. remaining video time at chosen speed
  let remainTimeAtSpeed = calcDuration(remainTime, speed);

  if (settings.showRemaining) {
    remainTimestamp = convertSecondToTimestamp(remainTimeAtSpeed);
  }

  if (showDiff || settings.showDifference) {
    // 3. differece between 1 and 2 (displayed in timestamp)
    diffTimestamp = convertSecondToTimestamp(remainTimeAtSpeed - remainTime);

    if (diffTimestamp === zeroTime) sign = '';
    else if (speed > 1) sign = '▼';
    else if (speed < 1) sign = '▲';
  }

  if (settings.showProgress) {
    if (remainTimestamp === zeroTime) playProgress = 100;
    else playProgress = Math.floor((video.currentTime / video.duration) * 100);
  }

  return { remainTimestamp, diffTimestamp, sign, playProgress };
}

function flashDiff() {
  if (diffTimer) clearTimeout(diffTimer);
  if (settings.showDifference) return;

  showDiff = true;
  diffTimer = setTimeout(function () {
    showDiff = false;
    diffDisplay.innerHTML = '';
  }, 2500);
}

function flashController(controller) {
  function show(duration = 2500) {
    if (!settings.enable || settings.enableController) return;

    controller.classList.add('vdc-temp');

    if (timer) clearTimeout(timer);

    timer = setTimeout(function () {
      if (!settings.enableController) controller.classList.remove('vdc-temp');
      timer = false;
    }, duration);
  }

  return show;
}

function constructShadowDOM() {
  // construct a new node with a shadow DOM and insert node into DOM
  let newNode = document.createElement('div');
  newNode.classList.add('vdc-controller', `top-${settings.setLocation}`);
  if (!settings.enableController) newNode.classList.add('vdc-disable');
  let shadowRoot = newNode.attachShadow({ mode: 'open' });

  let shadowTemplate = `
        <style>
            :host {
                --controller-height: 20px;
                --text-size: 13px;
            }
            * {
                font-family: sans-serif;
                box-sizing: border-box;
                margin: 0;
                padding: 0;
            }           
            #controller {     
                background: transparent;
                color: black;     
                display: flex;
                flex-direction: var(--controller-direction);
                gap: 2px;
                align-items: stretch;
                height: var(--controller-height);
                cursor: default;
                user-select: none;
                opacity: 0.9;
            }
            #controller:hover {
                opacity: 1;
            }
            .speed, .seek {
                display: flex;
            }
            button {
                font-size: var(--text-size);
                line-height: var(--text-size);
                opacity: 0.6;
                cursor: pointer;
                color: black;
                background: #F5F5F5;
                font-weight: normal;
                border: 1px solid #696969;
                font-family: "Lucida Console", Monaco, monospace;
                transition: background 0.2s, color 0.2s;
                border-radius: 5px;
                display: none;
                width: var(--controller-height);
            }
            button:focus {
                outline: 0;
            }
            button:hover {
                opacity: 0.8;
                background: #F5F5F5;
            }
            button:active {
                background: #F5F5F5;
                font-weight: bold;
            }
            button.left, button.backward {
                border-radius: 5px 0 0 5px;
            }
            button.right, button.forward {
                border-radius: 0 5px 5px 0;
            }
            .display {
                font-size: var(--text-size);
                line-height: var(--text-size);
                color: white;
                background-color: rgba(48, 48, 48, 0.6);
                padding: 0 5px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 5px;
            }
            .display:empty {
                display: none;
            }
            span {
                display: flex;
                justify-content: center;
                align-items: center;
            }
            #upArrow {
                color: #FF4C4C;
            }
            #downArrow {
                color: #99cc33;
            }
            #sign {
                height: 1em;
            }
            :host(:hover) button {
                display: inline;
            }
            :host(:hover) .speed .display {
                border-radius: 0;
            }
        </style>

        <div id="controller">
            <div class="seek">
                <button class="backward">&laquo;</button>
                <button class="forward">&raquo;</button>
            </div>
            <button class="reset">&rlarr;</button>
            <div class="speed">
                <button class="left">&minus;</button>
                <span class="display"></span>
                <button class="right">&plus;</button>
            </div>

            <span class="display time"id="remain"></span>
            <span class="display time"id="diff"></span>

            <div class="display progress"></div>
        </div>
    `;
  shadowRoot.innerHTML = shadowTemplate;

  speedDisplay = shadowRoot.querySelector('.speed .display');
  remainDisplay = shadowRoot.querySelector('#remain');
  diffDisplay = shadowRoot.querySelector('#diff');
  progressDisplay = shadowRoot.querySelector('.display.progress');

  flashButtons = flashController(newNode);

  resetButton = shadowRoot.querySelector('.reset');
  increButton = shadowRoot.querySelector('.right');
  decreButton = shadowRoot.querySelector('.left');
  rewindButton = shadowRoot.querySelector('.backward');
  advanceButton = shadowRoot.querySelector('.forward');

  switch (videoContainer.parentElement.id) {
    case 'movie_player':
      insertedNode = videoContainer.parentElement.insertBefore(
        newNode,
        videoContainer,
      );
      initSpeed();
      break;
    case 'shorts-player':
      // inserting right away blocks the video from playing
      if (shortsTimeoutId) clearTimeout(shortsTimeoutId);
      shortsTimeoutId = setTimeout(() => {
        insertedNode = videoContainer.parentElement.parentElement.insertBefore(
          newNode,
          videoContainer.parentElement,
        );
        initSpeed();
      }, 500);
      break;
    case 'inline-preview-player': {
      let mediaContainer = document.getElementById('media-container');
      insertedNode = mediaContainer.insertBefore(
        newNode,
        mediaContainer.children[0],
      );
      initSpeed();
      break;
    }
  }

  return newNode;
}

function setupListeners() {
  rewindButton.addEventListener('click', handleRewind);
  advanceButton.addEventListener('click', handleAdvance);
  resetButton.addEventListener('click', handleReset);
  increButton.addEventListener('click', handleIncre);
  decreButton.addEventListener('click', handleDecre);

  updateShowSpeed();

  if (!hasListeners) {
    document.addEventListener('loadedmetadata', handleLoadedMetadata, true);
    document.addEventListener('ratechange', handleRatechange, true);
    document.addEventListener('seeked', handleSeeked, true);

    hasListeners = true;
  }

  setupTimeUpdates();
}

function setupTimeUpdates() {
  if (!settings.enableController) return;

  clearInterval(showTime);
  updateShowTime();
  showTime = setInterval(function () {
    updateShowTime();
  }, 1000);

  if (hasTimeUpdateListeners) return;

  document.addEventListener('pause', handlePause, true);

  document.addEventListener('waiting', handleWaiting, true);

  document.addEventListener('playing', handlePlaying, true);

  document.addEventListener('emptied', handleEmptied, true);

  hasTimeUpdateListeners = true;
}

function removeTimeUpdates() {
  clearInterval(showTime);
  document.removeEventListener('pause', handlePause, true);
  document.removeEventListener('waiting', handleWaiting, true);
  document.removeEventListener('playing', handlePlaying, true);
  document.removeEventListener('emptied', handleEmptied, true);
  hasTimeUpdateListeners = false;
}

function initSpeed() {
  if (settings.rememberSpeed.set) {
    speedDisplay.textContent = lastSpeed.toFixed(2);
    setPlaySpeed(lastSpeed);
  } else {
    setPlaySpeed(settings.defaultSpeed);
    updateShowSpeed();
  }
}

let handleLoadedMetadata = () => {
  initSpeed();
  updateShowTime(false);
};

let handleRatechange = () => {
  flashDiff();
  updateShowSpeed();
  updateShowTime();
  flashButtons();
};

let handleSeeked = () => {
  flashDiff();
  updateShowTime();
  flashButtons();
};

let handleWaiting = () => {
  isPlaying = false;
  clearTimeout(diffTimer);
  showDiff = true;
  updateShowTime();
  clearInterval(showTime);
};

let handlePause = handleWaiting;

let handlePlaying = () => {
  isPlaying = true;
  flashDiff();
  clearInterval(showTime);
  updateShowTime();
  showTime = setInterval(function () {
    updateShowTime();
  }, 1000);
};

let handleEmptied = () => {
  isPlaying = false;
  speedDisplay.textContent = '';
  remainDisplay.textContent = '';
  diffDisplay.innerHTML = '';
  progressDisplay.innerHTML = '';
  clearInterval(showTime);
};
