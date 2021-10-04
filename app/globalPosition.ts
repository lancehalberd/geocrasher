import { isTestMode } from 'app/context';
import { gridLength } from 'app/gameConstants';
import { clearAllGems } from 'app/gems';
import { getState } from 'app/state';
import { getDistance } from 'app/utils/index';

import { GameState } from 'app/types';

const updatePosition: PositionCallback = (position: GeolocationPosition): void => {
    const state = getState();
    // After receiving a position update, we will attempt to restart the position listener
    // if 2 seconds pass without an update.
    state.globalPosition.restartWatchTime = state.time + 2000;
    if (state.globalPosition.lastPosition) {
        const oldCoords = [state.globalPosition.lastPosition.coords.longitude, state.globalPosition.lastPosition.coords.latitude];
        const newCoords = [position.coords.longitude, position.coords.latitude];
        // If the user ever moves an entire grid length in one click we assume the GPS is unreliable
        // and enter 'fixing GPS' mode to wait for a more reliable pattern.
        if (getDistance(oldCoords, newCoords) > gridLength) {
            setFixingGPS(state);
        }
    }
    state.globalPosition.lastPosition = position;
}

function setFixingGPS(state: GameState): void {
    state.globalPosition.isFixingGPS = true;
    state.globalPosition.isFastMode = false;
    state.globalPosition.isStartingFastMode = false;
    state.globalPosition.endFixingGPSTime = state.time + 2000;
    clearAllGems(state);
}

let watchPositionId: number;
export function checkToWatchPosition(state: GameState): void {
    if (!navigator.geolocation || isTestMode) {
        return;
    }
    if (state.time < state.globalPosition.restartWatchTime) {
        return;
    }
    // When we initially start listening for position updates, we wait 5 seconds without getting any updates
    // before we try to restart the position listener.
    state.globalPosition.restartWatchTime = state.time + 5000;
    // Clear previous listener, if any.
    if (watchPositionId) navigator.geolocation.clearWatch(watchPositionId);
    watchPositionId = navigator.geolocation.watchPosition(updatePosition,
        () => {
        // document.body.innerHTML = '<div style="color: white;">There was an error getting position!</div>';
    }, { enableHighAccuracy: true, maximumAge: 100, timeout: 50000 });
}
