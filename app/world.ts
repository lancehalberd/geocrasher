import { advanceGameState } from 'app/advanceGameState';
import { updateFastMode } from 'app/fastMode';
import { gridLength } from 'app/gameConstants';
import { checkToSpawnGems } from 'app/gems';
import { checkToGenerateLootForTile } from 'app/loot';
import { checkToGenerateMonster } from 'app/monsters';
import { saveGame } from 'app/saveGame';
import { getState } from 'app/state';
import { getDistance } from 'app/utils/index';

import { GameState, MapTile, Rectangle } from 'app/types';

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
    // Math.round(gridLength * state.world.displayScale) / gridLength;
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

export function isTileExplored(state: GameState, gridCoords: number[]) {
    return !!state.world.tileGrid[gridCoords[1]]?.[gridCoords[0]];
}
export function getTileData(state: GameState, gridCoords: number[], returnDefault: boolean = false): MapTile {
    const mapTile = state.world.tileGrid[gridCoords[1]]?.[gridCoords[0]];
    return mapTile ?? (returnDefault ? {level: 0, x: gridCoords[0], y: gridCoords[1]} : null);
}

export function exhaustTile(tile: MapTile): void {
    tile.exhaustedDuration = tile.level * 2 + 8;
    tile.exhaustCounter = 0;
}

export function setCurrentPosition(state: GameState, realCoords: number[]) {
    state.world.currentPosition = realCoords;
    // Only apply updates for moving if we have selected and loaded saved game.
    if (state.currentScene === 'loading' || state.currentScene === 'title') {
        return;
    }
    if (!state.lastGoalPoint || state.globalPosition.isFixingGPS) {
        state.lastGoalPoint = state.world.currentPosition;
        state.lastGoalTime = state.time;
    } else if (getDistance(state.world.currentPosition, state.lastGoalPoint) > gridLength / 2) {
        state.lastGoalPoint = state.world.currentPosition;
        updateFastMode(state, state.time - state.lastGoalTime);
        state.lastGoalTime = state.time;
        advanceGameState(state);
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
    const newGridCoords = toGridCoords(realCoords);
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
    let newTileFound = false;
    for (let dy = -1; dy <=1; dy++) {
        for (let dx = -1; dx <=1; dx++) {
            const mapTile = getTileData(state, [state.world.currentGridCoords[0] + dx, state.world.currentGridCoords[1] + dy], true);
            if (mapTile.level < 0) {
                initializeWorldMapTile(state, mapTile);
                mapTile.level = 0;
                checkToGenerateLootForTile(state, mapTile);
                newTileFound = true;
            }
        }
    }
    if (newTileFound) {
        saveGame(state);
        refreshActiveTiles(state);
    }
}

export function refreshActiveTiles(state: GameState) {
    if (state.dungeon.currentDungeon) {
        return;
    }
    const oldActiveTiles = state.world.activeTiles;
    const { currentGridCoords, tileGrid } = state.world;
    state.world.activeTiles = [];
    state.world.selectableTiles = new Set();
    state.world.activeMonsterMarkers = [];
    state.loot.activePowerupMarkers = new Set();
    for (let y = currentGridCoords[1] - 4; y <= currentGridCoords[1] + 4; y++) {
        for (let x = currentGridCoords[0] - 4; x <= currentGridCoords[0] + 4; x++) {
            let mapTile = tileGrid[y]?.[x];
            if (!mapTile) {
                mapTile = getTileData(state, [x, y], true);
                mapTile.level = -1;
                initializeWorldMapTile(state, mapTile);
            }
            if (x >= currentGridCoords[0] - 3 && x <= currentGridCoords[0] + 3
                && y >= currentGridCoords[1] - 3 && y <= currentGridCoords[1] + 3) {
                state.world.selectableTiles.add(mapTile);
            }
            state.world.activeTiles.push(mapTile);
            if (mapTile.monsterMarker) {
                state.world.activeMonsterMarkers.push(mapTile.monsterMarker);
            }
            for (const lootMarker of mapTile.lootMarkers) {
                if (lootMarker.loot.type !== 'coins') {
                    state.loot.activePowerupMarkers.add(lootMarker);
                }
            }
            // If a tile becomes active with no loot and isn't exhausted, make it spawn loot.
            if (!mapTile.exhaustedDuration && !mapTile.lootMarkers.length) {
                checkToGenerateLootForTile(state, mapTile);
                checkToGenerateMonster(state, mapTile, 0.25);
            }
        }
    }
    if (!state.world.selectableTiles.has(state.selectedTile)) {
        state.selectedTile = null;
    }
    for (const mapTile of oldActiveTiles) {
        if (state.world.activeTiles.indexOf(mapTile) < 0 ) {
            delete mapTile.canvas;
        }
    }
}

export function initializeWorldMapTile(state: GameState, mapTile: MapTile): MapTile {
    const realCoords = toRealCoords([mapTile.x, mapTile.y]);
    mapTile.centerX = realCoords[0] + gridLength / 2;
    mapTile.centerY = realCoords[1] + gridLength / 2;
    if (!mapTile.lootMarkers) {
        mapTile.lootMarkers = [];
    }
    if (!mapTile.neighbors) {
        mapTile.neighbors = [];
        for (let y = 0; y <= 2; y++) {
            for (let x = 0; x <= 2; x++) {
                const i = 3 * y + x;
                if (x === 0 && y === 0) {
                    mapTile.neighbors[i] = mapTile;
                    continue;
                }
                const otherTile = state.world.tileGrid[y]?.[x];
                if (!otherTile) continue;
                mapTile.neighbors[i] = otherTile;
                otherTile.neighbors[9 - i] = mapTile;
            }
        }
    }
    for (let i = 0; i <= mapTile.level; i++) {
        state.world.levelSums[i] = (state.world.levelSums[i] ?? 0) + (1 + mapTile.level - i);
    }
    state.world.tileGrid[mapTile.y] = state.world.tileGrid[mapTile.y] ?? [];
    state.world.tileGrid[mapTile.y][mapTile.x] = mapTile;
    return mapTile;
}
