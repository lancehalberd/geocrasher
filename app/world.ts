import {advanceGameState} from 'app/advanceGameState';
import {updateFastMode} from 'app/fastMode';
import {gridLength} from 'app/gameConstants';
import {checkToSpawnGems} from 'app/gems';
import {checkToGenerateMonster} from 'app/monsters';
import {saveGame} from 'app/saveGame';
import {getDistance} from 'app/utils/index';
import {initializeWorldMapTile, refreshActiveTiles} from 'app/utils/refreshActiveTiles';
import {getTileData, toGridCoords} from 'app/utils/world';


export function setCurrentPosition(state: GameState, realCoords: number[]) {
    state.world.currentPosition = realCoords;
    // Only apply updates for moving if we have selected and loaded saved game.
    if (state.currentScene === 'loading' || state.currentScene === 'title') {
        return;
    }
    if (!state.goalCoordinates.length || state.globalPosition.isFixingGPS) {
        state.goalCoordinates = [state.world.currentPosition];
        state.lastGoalTime = state.time;
    } else if (state.lastGoalTime) {
        let shouldAddPoint = true;
        for (const recentPoint of state.goalCoordinates) {
            const distance = getDistance(state.world.currentPosition, recentPoint);
            if (distance >= gridLength / 2) {
                // Reset goal coordinates to only include the current position.
                state.goalCoordinates = [state.world.currentPosition];
                // Check if we need to move towards enabling fast mode in case the player
                // is moving too quickly.
                updateFastMode(state, state.time - state.lastGoalTime);
                state.lastGoalTime = state.time;
                advanceGameState(state);
            } else if (distance < gridLength / 20) {
                // We don't want to add too many points to check, so only add this new point if it is
                // least 1 / 10 of the required goal distance.
                shouldAddPoint = false;
                break;
            }
        }
        if (shouldAddPoint) {
            state.goalCoordinates.push(state.world.currentPosition);
        }
    }
    if (state.globalPosition.isFastMode && state.time > state.globalPosition.endFastModeTime) {
        state.globalPosition.isFastMode = state.globalPosition.isStartingFastMode = false;
        checkToSpawnGems(state);
    }
    if (state.globalPosition.isFixingGPS && state.time > state.globalPosition.endFixingGPSTime) {
        state.globalPosition.isFixingGPS = false;
        if (state.world.currentGridCoords) {
            exploreSurroundingTiles(state);
        }
        checkToSpawnGems(state);
    }
    const { currentGridCoords } = state.world;
    const newGridCoords = toGridCoords(state, realCoords);
    if (currentGridCoords?.[0] === newGridCoords[0] && currentGridCoords?.[1] === newGridCoords[1]) {
        // If your coords haven't changed and this location is already explored, do nothing,
        // but if the location isn't explored yet (say fixing gps was on previously), then DO
        // allow exploring this tile.
        // getTileData returns null if the second parameter is false and the tile is unexplored.
        const mapTile = getTileData(state, currentGridCoords, false);
        if (mapTile && mapTile.level >= 0) {
            return;
        }
    }
    state.world.currentGridCoords = newGridCoords;

    if (!state.globalPosition.isFixingGPS) {
        exploreSurroundingTiles(state);
    }
    refreshActiveTiles(state);
}
function exploreSurroundingTiles(state: GameState) {
    if (!state.world.currentGridCoords) {
        return;
    }
    let newTileFound = false;
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            const mapTile = getTileData(state, [state.world.currentGridCoords[0] + dx, state.world.currentGridCoords[1] + dy], true);
            if (mapTile.level < 0) {
                mapTile.level = 0;
                initializeWorldMapTile(state, mapTile);
                newTileFound = true;
            }
            if (!mapTile.isExplored) {
                mapTile.isExplored = true;
                if (state.currentScene === 'journey') {
                    checkToGenerateMonster(state, mapTile, 1 / 6);
                }
            }
        }
    }
    if (newTileFound) {
        saveGame(state);
        refreshActiveTiles(state);
    }
}

