import { updatePlayerStats } from 'app/avatar';
import { isDebugMode } from 'app/context';
import { frameLength, gridLength } from 'app/gameConstants';
import { checkToWatchPosition } from 'app/globalPosition';
import { avatarAnimations, finishedLoadingImages } from 'app/images';
import { updateDungeon } from 'app/scenes/dungeonScene';
import { updateMap } from 'app/scenes/mapScene';
import { updateTreasureMap } from 'app/scenes/treasureMapScene';
import { getState } from 'app/state';
import { getActualScale, project, setCurrentPosition } from 'app/world';

let mainLoopId: NodeJS.Timer;
export function startMainLoop() {
    mainLoopId = setInterval(mainLoop, frameLength);
}
function mainLoop() {
    try {
        const state = getState();
        const { canvas } = state.display;
        checkToWatchPosition(state);
        if (state.globalPosition.lastPosition) {
            // Make target coords always positive.
            const targetPosition = [
                state.globalPosition.lastPosition.coords.longitude + 360,
                360 - state.globalPosition.lastPosition.coords.latitude
            ];
            if (!state.world.currentPosition || state.globalPosition.isFixingGPS) {
                setCurrentPosition(state, targetPosition);
            } else {
                // GPS provided position can jump around a bit, so ease towards the new location once we have a current position.
                // Note that this kind of easing won't work well around the poles or the international dateline.
                setCurrentPosition(state, [
                    (state.world.currentPosition[0] * 9 + targetPosition[0]) / 10,
                    (state.world.currentPosition[1] * 9 + targetPosition[1]) / 10,
                ]);
                const lastDirection = state.globalPosition.direction;
                const dx = targetPosition[0] - state.world.currentPosition[0];
                const dy = targetPosition[1] - state.world.currentPosition[1];
                if (Math.abs(dx) >= Math.abs(dy)) {
                    if (dx > 0) state.globalPosition.direction = 'right';
                    else if (dx < 0) state.globalPosition.direction = 'left';
                } else {
                    if (dy < 0) state.globalPosition.direction = 'up';
                    else if (dy > 0) state.globalPosition.direction = 'down';
                }
                const exampleAnimation = avatarAnimations.up;
                if (Math.abs(dx) < gridLength / 200 && Math.abs(dy) < gridLength / 200 &&
                    // This is intended to prevent the animation from stopping mid walk cycle.
                    state.avatar.animationTime % exampleAnimation.duration < frameLength * exampleAnimation.frameDuration
                ) {
                    state.avatar.animationTime = 0;
                } else if (state.globalPosition.direction !== lastDirection) {
                    // Start mid step when switching frames
                    state.avatar.animationTime = frameLength * exampleAnimation.frameDuration;
                } else {
                    state.avatar.animationTime += frameLength;
                }
            }
            // Current position will be set by one of the two blocks above.
            const currentPosition = state.world.currentPosition as number[];
            // Because everything is on root, this is messed up by the introduction of window.origin.
            // Fixed by checking if it is a string, but really I shouldn't be using global vars everywhere.
            if (!state.world.origin) {
                state.world.origin = currentPosition;
            }
            let target = state.world.origin;
            if (state.globalPosition.isFastMode
                || state.globalPosition.isFixingGPS
                || state.currentScene === 'journey'
                || state.currentScene === 'voyage'
            ) {
                target = currentPosition;
            } else if (state.currentScene === 'map' && state.selectedTile) {
                target = [state.selectedTile.centerX, state.selectedTile.centerY];
            } else {
                // Scroll towards the visible area when it is too far off screen.
                const screenCoords = project(state, currentPosition);
                const scaleToUse = getActualScale(state);
                if (screenCoords[0] < 120) {
                    target[0] = currentPosition[0] + (canvas.width / 2 - 120) / scaleToUse;
                }
                if (screenCoords[0] > canvas.width - 120) {
                    target[0] = currentPosition[0] - (canvas.width / 2 - 120) / scaleToUse;
                }
                if (screenCoords[1] < 120) {
                    target[1] = currentPosition[1] + (canvas.height / 2 - 120) / scaleToUse;
                }
                if (screenCoords[1] > canvas.height - 120) {
                    target[1] = currentPosition[1] - (canvas.height / 2 - 120) / scaleToUse;
                }
            }
            if (!state.world.origin) {
                state.world.origin = target;
            } else {
                state.world.origin[0] = (state.world.origin[0] * 10 + target[0]) / 11;
                state.world.origin[1] = (state.world.origin[1] * 10 + target[1]) / 11;
            }
        }
        if (state.currentScene !== 'loading' && state.currentScene !== 'title') {
            updatePlayerStats(state);
        }
        switch (state.currentScene) {
            case 'loading':
                // Show the title scene once all images are loaded.
                if (finishedLoadingImages()) {
                    state.currentScene = 'title';
                }
                break;
            case 'journey':
            case 'voyage':
            case 'map':
                updateMap(state);
                break;
            case 'dungeon':
                updateDungeon(state);
                break;
            case 'treasureMap':
                updateTreasureMap(state);
                break;
        }
        state.time += frameLength;
    } catch (error) {
        clearTimeout(mainLoopId);
        console.log(error.message);
        if (isDebugMode) alert(error.message);
        throw error;
    }
}
