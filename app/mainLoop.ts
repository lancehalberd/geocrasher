import { updatePlayerStats } from 'app/avatar';
import { isDebugMode, isTestMode } from 'app/context';
import { mainCanvas } from 'app/dom';
import { drawScene } from 'app/drawScene';
import { gridLength, maxRadius } from 'app/gameConstants';
import { checkToWatchPosition } from 'app/globalPosition';
import { finishedLoadingImages } from 'app/images';
import { getSkillValue, handleSkillsClick } from 'app/scenes/skillsScene';
import { updateMap } from 'app/scenes/mapScene';
import { getState } from 'app/state';

import { GameState, MapTile } from 'app/types';


let mainLoopId: NodeJS.Timer;
export function startMainLoop() {
    mainLoopId = setInterval(mainLoop, 40);
}
function mainLoop() {
    try {
        const state = getState();
        checkToWatchPosition(state);
        if (state.globalPosition.lastPosition) {
            var targetPosition = [lastPositionData.coords.longitude + 360, lastPositionData.coords.latitude + 360];
            if (!currentPosition || state.globalPosition.isFixingGPS) {
                setCurrentPosition(targetPosition);
            } else {
                // GPS provided position can jump around a bit, so ease towards the new location once we have a current position.
                setCurrentPosition([(currentPosition[0] * 9 + targetPosition[0]) / 10, (currentPosition[1] * 9 + targetPosition[1]) / 10]);
                var lastDirection = direction;
                var dx = targetPosition[0] - currentPosition[0];
                var dy = targetPosition[1] - currentPosition[1];
                if (Math.abs(dx) >= Math.abs(dy)) {
                    if (dx > 0) direction = 'right';
                    else if (dx < 0) direction = 'left';
                } else {
                    if (dy > 0) direction = 'up';
                    else if (dy < 0) direction = 'down';
                }
                if (Math.abs(dx) < gridLength / 200 && Math.abs(dy) < gridLength / 200 && Math.floor(walkTime / 250) % walkOffsets.length === 0) {
                    walkTime = 0;
                } else if (direction !== lastDirection) {
                    walkTime = 250;
                } else {
                    walkTime += 40;
                }
            }
            // Because everything is on root, this is messed up by the introduction of window.origin.
            // Fixed by checking if it is a string, but really I shouldn't be using global vars everywhere.
            if (!origin || typeof(origin) === 'string') origin = currentPosition;
            var target = [origin[0], origin[1]];
            if (state.globalPosition.isFastMode || state.globalPosition.isFixingGPS) {
                target = currentPosition;
            } else if (currentScene === 'map' && selectedTile) {
                target = [selectedTile.centerX, selectedTile.centerY];
            } else {
                screenCoords = project(currentPosition);
                var scaleToUse = getActualScale();
                if (screenCoords[0] < 120) target[0] = currentPosition[0] + (canvas.width / 2 - 120) / scaleToUse;
                if (screenCoords[0] > canvas.width - 120) target[0] = currentPosition[0] - (canvas.width / 2 - 120) / scaleToUse;
                if (screenCoords[1] < 120) target[1] = currentPosition[1] - (canvas.height / 2 - 120) / scaleToUse;
                if (screenCoords[1] > canvas.height - 120) target[1] = currentPosition[1] + (canvas.height / 2 - 120) / scaleToUse;
                //target = ifdefor(currentPosition, [180 + gridLength / 2, 180 + gridLength / 2]);
            }
            if (!origin) origin = target;
            else {
                origin[0] = (origin[0] * 10 + target[0]) / 11;
                origin[1] = (origin[1] * 10 + target[1]) / 11;
            }
        }
        if (state.currentScene !== 'loading' && state.currentScene !== 'title') {
            updatePlayerStats(state);
        }
        switch (state.currentScene) {
            case 'loading':
                // Show the title scene once all images are loaded.
                if(finishedLoadingImages()) {
                    createOutlinedMoneyImage(state);
                    state.currentScene = 'title';
                }
                break;
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
    } catch (error) {
        clearTimeout(mainLoopId);
        console.log(error.message);
        if (isDebugMode) alert(error.message);
        throw error;
    }
}
