import { isTestMode } from 'app/context';
import { mainCanvas } from 'app/dom';
import { drawScene } from 'app/drawScene';
import { gridLength } from 'app/gameConstants';
import { checkToWatchPosition } from 'app/globalPosition';
import { registerBackAction } from 'app/handleBackAction';
import { registerMouseEvents, registerTouchEvents } from 'app/handleTouchEvents';
import { startMainLoop } from 'app/mainLoop';

import { getState, initializeState } from 'app/state';

setTimeout(startMainLoop, 400);

initializeState();

let lastRenderedTime = 0;
function animate() {
    const state = getState();
    window.requestAnimationFrame(animate);
    if (lastRenderedTime >= state.time) {
        return;
    }
    lastRenderedTime = state.time;
    drawScene(state.display.context, state);
}
animate();

function resizeCanvas() {
    mainCanvas.width = window.innerWidth;
    mainCanvas.height = window.innerHeight;
    const state = getState();
    state.display.iconSize = 16 * Math.floor(Math.min(mainCanvas.width / 6, mainCanvas.height / 6) / 16);
    state.display.dungeonScale = Math.min((mainCanvas.height - 20) / (5 * gridLength), (mainCanvas.width - 20) / (5 * gridLength));
    drawScene(state.display.context, state);
}
window.onresize = resizeCanvas;

if (!isTestMode) {
    // Regular play assumes you are walking around playing on a touch device.
    registerTouchEvents();
    if (navigator.geolocation) {
        checkToWatchPosition(getState());
    } else {
        document.body.innerHTML = 'Geolocation is not supported by this browser :(';
    }
} else {
    // Test play allows you to play with a mouse and keyboard.
    registerMouseEvents();
    const stepSize = gridLength / 3;
    const state = getState();
    state.globalPosition.lastPosition = {coords: {longitude: gridLength / 2, latitude: gridLength / 2}};
    document.addEventListener('keydown', function(event) {
        const state = getState();
        if (!state.globalPosition.lastPosition) {
            throw new Error('Expeceted `state.globalPosition.lastPosition` to be defined.');
        }
        //console.log(event.which)
        if (event.which === 37 || event.which === 'A'.charCodeAt(0)) {
            state.globalPosition.lastPosition.coords.longitude -= stepSize;
        }
        if (event.which === 39 || event.which === 'D'.charCodeAt(0)) {
            state.globalPosition.lastPosition.coords.longitude += stepSize;
        }
        if (event.which === 38 || event.which === 'W'.charCodeAt(0)) {
            state.globalPosition.lastPosition.coords.latitude += stepSize;
        }
        if (event.which === 40 || event.which === 'S'.charCodeAt(0)) {
            state.globalPosition.lastPosition.coords.latitude -= stepSize;
        }
    });
}
registerBackAction();

resizeCanvas();