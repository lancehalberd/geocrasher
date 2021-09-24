import { gridLength, maxTileLevel } from 'app/gameConstants';
import {
    shallowSource,
    sandSource,
    dirtSource,
    grassSource,
    forestSource,
    hillSource,
    mountainSource,
    peakSource,
    iceSource,
} from 'app/images';
import { getState } from 'app/state';

import { GameState, MapTile, Rectangle } from 'app/types';

export const levelColors = [
    shallowSource,
    sandSource,
    dirtSource,
    grassSource,
    forestSource,
    hillSource,
    mountainSource,
    peakSource,
    iceSource,
];

if (levelColors.length !== maxTileLevel + 1) {
    console.error(`Incorrect number of tiles found, expected ${maxTileLevel + 1} found ${levelColors.length}`, levelColors.length);
}

export function getIconSize() {
    const { canvas } = getState().display;
    return 16 * Math.floor(Math.min(canvas.width / 6, canvas.height / 6) / 16);
}

export function getActualScale(state: GameState): number {
    const { canvas, iconSize } = state.display;
    if (state.currentScene === 'treasureMap') {
        const { currentMap } = state.saved.treasureHunt;
        return Math.min(
            (canvas.height - 2 * iconSize) / (currentMap.size * gridLength),
            (canvas.width - iconSize) / (currentMap.size * gridLength)
        );
    }
    if (state.dungeon.currentDungeon) {
        return Math.min((canvas.height - 20) / (5 * gridLength), (canvas.width - 20) / (5 * gridLength));
    }
    return state.world.displayScale;
}

export function getOrigin(state: GameState): number[] {
    if (state.currentScene === 'treasureMap') {
        const { currentMap } = state.saved.treasureHunt;
        return [gridLength * (currentMap.size) / 2,
                gridLength * (currentMap.size - 1) / 2];
    }
    return state.dungeon.currentDungeon ? [gridLength / 2, gridLength / 2] : state.world.origin;
}

export function getGridRectangle(state: GameState, coords: number[]): Rectangle {
    const topLeft = project(state, [coords[0] * gridLength, (coords[1] + 1) * gridLength]);
    const bottomRight = project(state, [(coords[0] + 1) * gridLength, (coords[1]) * gridLength]);
    return {
        x: Math.ceil(topLeft[0]),
        y: Math.ceil(topLeft[1]),
        w: Math.ceil(bottomRight[0] - topLeft[0]),
        h: Math.ceil(bottomRight[1] - topLeft[1])
    };
}
export function project(state: GameState, coords: number[]): number[] {
    const { canvas } = state.display;
    const origin = getOrigin(state);
    const scaleToUse = getActualScale(state);
    const x = Math.round((coords[0] - origin[0]) * scaleToUse) + Math.round(canvas.width / 2);
    const y = Math.round(-(coords[1] - origin[1]) * scaleToUse) + Math.round(canvas.height / 2);
    return [x, y];
}
export function unproject(state: GameState, screenCoords: number[]): number[] {
    const { canvas } = state.display;
    const origin = getOrigin(state);
    const scaleToUse = getActualScale(state);
    const longitude = (screenCoords[0] - canvas.width / 2) / scaleToUse + origin[0];
    const lat = -(screenCoords[1] - canvas.height / 2) / scaleToUse + origin[1];
    return [longitude, lat];
}
export function toGridCoords(realCoords: number[]): number[] {
    return [Math.floor(realCoords[0] / gridLength), Math.floor(realCoords[1] / gridLength)];
}
export function toRealCoords(gridCoords: number[]): number[] {
    return [gridCoords[0] * gridLength, gridCoords[1] * gridLength];
}

export function tileIsExplored(gridCoords: number[]) {
    var key = gridCoords[0] + 'x' + gridCoords[1];
    return !!gridData[key];
}
export function getTileData(gridCoords: number[], returnDefault: boolean = false) {
    var key = gridCoords[0] + 'x' + gridCoords[1];
    return gridData[key] ?? (returnDefault ? {'level': 0, 'power': 0, 'key': key, 'x': gridCoords[0], 'y': gridCoords[1]} : null);
}

export function exhaustTile(tile: MapTile): void {
    tile.exhaustedDuration = tile.level * 2 + 8;
    tile.exhaustCounter = 0;
}

var activeTiles = [];
var selectableTiles = [];
export function setCurrentPosition(realCoords: number[]) {
    currentPosition = realCoords;
    if (!lastGoalPoint || state.globalPosition.isFixingGPS) {
        lastGoalPoint = currentPosition;
        lastGoalTime = state.time;
    } else if (getDistance(currentPosition, lastGoalPoint) > gridLength / 2) {
        lastGoalPoint = currentPosition;
        updateFastMode(state.time - lastGoalTime);
        lastGoalTime = state.time;
        advanceGameState(state);
    }
    if (state.globalPosition.isFastMode && state.time > endFastModeTime) {
        state.globalPosition.isFastMode = startingFastMode = false;
        checkToSpawnGems();
    }
    if (state.globalPosition.isFixingGPS && state.time > endFixingGPSTime) {
        state.globalPosition.isFixingGPS = false;
         if ((currentScene !== 'loading' && currentScene !== 'title') && currentGridCoords) {
            exploreSurroundingTiles();
        }
        checkToSpawnGems();
    }
    // Only apply updates for moving if we are displaying the map scene.
    if (currentScene === 'loading' || currentScene === 'title') return;
    var newGridCoords = toGridCoords(realCoords);
    if (currentGridCoords && currentGridCoords[0] === newGridCoords[0] && currentGridCoords[1] === newGridCoords[1]) {
        // If your coords haven't changed and this location is already explored, do nothing,
        // but if the location isn't explored yet (say fixing gps was on previously), then DO
        // allow exploring this tile.
        // getTileData returns null if the second parameter is false and the tile is unexplored.
        const tileData = getTileData(currentGridCoords, false);
        if (tileData && tileData.level >= 0) return;
    }
    currentGridCoords = newGridCoords;

    if (!state.globalPosition.isFixingGPS) exploreSurroundingTiles();
    refreshActiveTiles();
}
function exploreSurroundingTiles() {
    var newTileFound = false;
    for (var dy = -1; dy <=1; dy++) {
        for (var dx = -1; dx <=1; dx++) {
            var tileData = getTileData([currentGridCoords[0] + dx, currentGridCoords[1] + dy], true);
            if (tileData.level < 0) {
                gridData[tileData.key] = tileData;
                initializeTile(tileData);
                tileData.level = 0;
                checkToGenerateLootForTile(tileData);
                newTileFound = true;
            }
        }
    }
    if (newTileFound) {
        saveGame();
        refreshActiveTiles();
    }
}

export function refreshActiveTiles(state: GameState) {
    if (currentDungeon) return;
    var oldActiveTiles = activeTiles;
    activeTiles = [];
    selectableTiles = [];
    state.world.activeMonsterMarkers = [];
    activePowerupMarkers = [];
    for (var y = currentGridCoords[1] - 4; y <= currentGridCoords[1] + 4; y++) {
        for (var x = currentGridCoords[0] - 4; x <= currentGridCoords[0] + 4; x++) {
            var key = x + 'x' + y;
            if (!gridData[key]) {
                var tileData = getTileData([x, y], true);
                tileData.level = -1;
                gridData[key] = tileData;
                initializeTile(tileData);
            }
            var tileData = gridData[key];
            if (x >= currentGridCoords[0] - 3 && x <= currentGridCoords[0] + 3
                && y >= currentGridCoords[1] - 3 && y <= currentGridCoords[1] + 3) {
                selectableTiles.push(tileData);
            }
            activeTiles.push(tileData);
            if (tileData.monster) state.world.activeMonsterMarkers.push(tileData.monster);
            for (var loot of tileData.loot) {
                if (loot.treasure.type !== 'coins') {
                    activePowerupMarkers.push(loot);
                }
            }
            // If a tile becomes active with no loot and isn't exhausted, make it spawn loot.
            if (tileData.exhausted) continue;
            if (tileData.loot.length) continue;
            checkToGenerateLootForTile(tileData);
            checkToGenerateMonster(tileData, .25);
        }
    }
    if (selectedTile && selectableTiles.indexOf(selectedTile) < 0) selectedTile = null;
    for (var tile of oldActiveTiles) {
        if (activeTiles.indexOf(tile) < 0 ) delete tile.canvas;
    }
}
