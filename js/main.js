const buttons = document.querySelectorAll('input[name="speed"]');

Array.from(buttons).forEach(button => button.addEventListener('change', calcTime));

function calcTime(click) {
    document.querySelector('#time').innerText = click.target.value;
}