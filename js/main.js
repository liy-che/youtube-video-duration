let vidDuration;    

async function injectFunc(func) {
    let [tab] = await chrome.tabs.query({active: true, currentWindow: true});

    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: func
    });
}

function getDuration() {
    let duration = document.querySelector('video').duration;
    chrome.storage.sync.set({ duration });
}

function calcTime(evt) {
    document.querySelector('#time').innerText = vidDuration / evt.target.value;
}

function setUpEvent() {
    // add event listeners to speed option buttons
    const buttons = document.querySelectorAll('input[name="speed"]');
    Array.from(buttons).forEach(button => button.addEventListener('change', calcTime));

    chrome.storage.sync.get("duration", ({ duration }) => {
        vidDuration = duration;
        document.querySelector('#time').innerText = duration;
    })
}

// when pop up is opened, get video duration
let durationPromise = injectFunc(getDuration);

// calculate video duration under different speeds
durationPromise.then(setUpEvent);