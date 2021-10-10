import { advanceGameState } from 'app/advanceGameState';
import { updateFastMode } from 'app/fastMode';
import { emptyJourneyRadius, gridLength, maxTileLevel } from 'app/gameConstants';
import { checkToSpawnGems } from 'app/gems';
import { checkToGenerateLootForTile } from 'app/loot';
import { checkToGenerateMonster } from 'app/monsters';
import { saveGame } from 'app/saveGame';
import { getState } from 'app/state';
import { getDistance } from 'app/utils/index';
import Random from 'app/utils/Random';

import { GameState, MapTile, Rectangle, SavedTreasureHuntMap } from 'app/types';

export function getIconSize() {
    const { canvas } = getState().display;
    return 16 * Math.floor(Math.min(canvas.width / 6, canvas.height / 6) / 16);
}

export function getActualScale(state: GameState): number {
    const { canvas, iconSize } = state.display;
    if (state.currentScene === 'treasureMap') {
        const savedMap = state.saved.treasureHunt.currentMap as SavedTreasureHuntMap;
        return Math.min(
            (canvas.height - 2 * iconSize) / (savedMap.size * gridLength),
            (canvas.width - iconSize) / (savedMap.size * gridLength)
        );
    }
    if (state.dungeon.currentDungeon) {
        return Math.min((canvas.height - 20) / (5 * gridLength), (canvas.width - 20) / (5 * gridLength));
    }
    // Math.round(gridLength * state.world.displayScale) / gridLength;
    return state.world.displayScale;
}

// Returns the global coordinates of the top left corner of the tile with coordinates [0, 0].
export function getGridOrigin(state: GameState): readonly number[] {
    if (state.currentScene === 'journey' || state.currentScene === 'voyage') {
        return state.world.journeyModeOrigin;
    }
    return [0, 0];
}

// Returns the global coordinates of the origin, which is mapped to the center of the canvas.
export function getOrigin(state: GameState): readonly number[] {
    if (state.currentScene === 'treasureMap') {
        const savedMap = state.saved.treasureHunt.currentMap as SavedTreasureHuntMap;
        return [gridLength * (savedMap.size) / 2, gridLength * (savedMap.size - 1) / 2];
    }
    return state.dungeon.currentDungeon
        // The origin is always the middle of the center square.
        ? [gridLength * 2.5, gridLength * 2.5]
        : (state.world.origin ?? [0, 0]);
}

export function getGridRectangle(state: GameState, coords: number[]): Rectangle {
    const topLeft = project(state, toRealCoords(state, coords));
    const bottomRight = project(state, toRealCoords(state,[coords[0] + 1, coords[1] + 1]));
    return {
        x: Math.ceil(topLeft[0]),
        y: Math.ceil(topLeft[1]),
        w: Math.ceil(bottomRight[0]) - Math.ceil(topLeft[0]),
        h: Math.ceil(bottomRight[1]) - Math.ceil(topLeft[1]),
    };
}
export function project(state: GameState, coords: number[]): number[] {
    const { canvas } = state.display;
    const origin = getOrigin(state);
    const scaleToUse = getActualScale(state);
    const x = Math.round((coords[0] - origin[0]) * scaleToUse) + Math.round(canvas.width / 2);
    const y = Math.round((coords[1] - origin[1]) * scaleToUse) + Math.round(canvas.height / 2);
    return [x, y];
}
export function unproject(state: GameState, screenCoords: number[]): number[] {
    const { canvas } = state.display;
    const origin = getOrigin(state);
    const scaleToUse = getActualScale(state);
    const longitude = (screenCoords[0] - canvas.width / 2) / scaleToUse + origin[0];
    const lat = (screenCoords[1] - canvas.height / 2) / scaleToUse + origin[1];
    return [longitude, lat];
}
export function toGridCoords(state: GameState, realCoords: number[]): number[] {
    const gridOrigin = getGridOrigin(state);
    return [
        Math.floor((realCoords[0] - gridOrigin[0]) / gridLength),
        Math.floor((realCoords[1] - gridOrigin[1]) / gridLength),
    ];
}
export function toRealCoords(state: GameState, gridCoords: number[]): number[] {
    const gridOrigin = getGridOrigin(state);
    return [
        gridCoords[0] * gridLength + gridOrigin[0],
        gridCoords[1] * gridLength + gridOrigin[1],
    ];
}

export function isTileExplored(state: GameState, gridCoords: number[]) {
    const key = `${gridCoords[0]}x${gridCoords[1]}`;
    return !!state.world.allTiles[key];
}
export function getTileData(state: GameState, gridCoords: number[], returnDefault: boolean = false): MapTile {
    const key = `${gridCoords[0]}x${gridCoords[1]}`;
    const mapTile = state.world.allTiles[key];
    return mapTile ?? (returnDefault ? {level: -1, x: gridCoords[0], y: gridCoords[1]} : null);
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
                checkToGenerateLootForTile(state, mapTile);
                if (state.currentScene === 'journey' || state.currentScene === 'voyage') {
                    checkToGenerateMonster(state, mapTile, 1 / 6);
                }
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
    if (!state.world.currentGridCoords) {
        return;
    }
    if (state.dungeon.currentDungeon) {
        return;
    }
    const oldActiveTiles = state.world.activeTiles;
    const { currentGridCoords, allTiles } = state.world;
    state.world.activeTiles = [];
    state.world.selectableTiles = new Set();
    state.world.activeMonsterMarkers = [];
    state.loot.activePowerupMarkers = new Set();
    for (let y = currentGridCoords[1] - 4; y <= currentGridCoords[1] + 4; y++) {
        for (let x = currentGridCoords[0] - 4; x <= currentGridCoords[0] + 4; x++) {
            const key = `${x}x${y}`;
            let mapTile = allTiles[key];
            if (!mapTile) {
                if (state.currentScene === 'journey' || state.currentScene === 'voyage') {
                    continue;
                }
                mapTile = getTileData(state, [x, y], true);
                mapTile.level = -1;
                initializeWorldMapTile(state, mapTile);
            }
            if (x >= currentGridCoords[0] - 3 && x <= currentGridCoords[0] + 3
                && y >= currentGridCoords[1] - 3 && y <= currentGridCoords[1] + 3
            ) {
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
    if (state.selectedTile && !state.world.selectableTiles.has(state.selectedTile)) {
        delete state.selectedTile;
    }
    for (const mapTile of oldActiveTiles) {
        if (state.world.activeTiles.indexOf(mapTile) < 0 ) {
            delete mapTile.canvas;
        }
    }
}

export function initializeWorldMapTile(state: GameState, mapTile: MapTile): MapTile {
    const realCoords = toRealCoords(state, [mapTile.x, mapTile.y]);
    mapTile.centerX = realCoords[0] + gridLength / 2;
    mapTile.centerY = realCoords[1] + gridLength / 2;
    if (state.currentScene === 'journey' || state.currentScene === 'voyage') {
        mapTile.journeyDistance = getDistance(state.world.journeyModeOrigin, realCoords);
        const gridDistance = mapTile.journeyDistance / gridLength;
        const minPowerLevel = state.world.journeyModePower - 0.5 + gridDistance / 16;
        const maxPowerLevel = state.world.journeyModePower + 0.5 + gridDistance / 12;

        mapTile.journeyPowerLevel = Random.range(minPowerLevel, maxPowerLevel);
        // Calculation for journey mode tile level:
        // First choose a range of desired levels based on the starting tile level and a desired range
        // of tiles based on distance (so tiles will be more varied the further you travel).
        // The bottom range is at least tile level - 1, and the top range is at most maxTileLevel.
        // The variance can be as high as 4 resulting in 5 different tiles.
        // Then the tiles power is converted to a % based on its relative power to the min and max possible values
        // and that percentage is mapped linearly from the lowest to highest level tiles.
        if (mapTile.journeyDistance < emptyJourneyRadius) {
            mapTile.level = state.world.journeyModeTileLevel;
        } else {
            const desiredVariance = Math.min(4, Math.ceil(gridDistance / 8));
            // The chance for a tile with level below the base tile only exists at the start of each journey.
            const lowerTileOffset = gridDistance >= 10 ? 0 : 1;
            const maxLevel = Math.min(maxTileLevel, state.world.journeyModeTileLevel - lowerTileOffset + desiredVariance);
            const minLevel = Math.max(0, state.world.journeyModeTileLevel - 1, maxLevel - desiredVariance);
            const powerPercent = (mapTile.journeyPowerLevel - minPowerLevel) / (maxPowerLevel - minPowerLevel);
            mapTile.level = minLevel + Math.round((maxLevel - minLevel) * powerPercent);
            //console.log([minPowerLevel, maxPowerLevel], desiredVariance, [minLevel, maxLevel], powerPercent, mapTile.level);
            //console.log(mapTile);
        }
        // For simplicity, all journey tiles are considered exhausted to avoid generating new loot/monsters.
        mapTile.exhaustedDuration = 100;
    } else {
        // Level sums are only calculated for map mode tiles.
        for (let i = 0; i <= mapTile.level; i++) {
            state.world.levelSums[i] = (state.world.levelSums[i] ?? 0) + (1 + mapTile.level - i);
        }
    }
    delete mapTile.canvas;
    if (!mapTile.lootMarkers) {
        mapTile.lootMarkers = [];
    }
    mapTile.neighbors = [];
    for (let y = -1; y <= 1; y++) {
        for (let x = -1; x <= 1; x++) {
            const i = 3 * (y + 1) + (x + 1);
            if (x === 0 && y === 0) {
                mapTile.neighbors[i] = mapTile;
                continue;
            }
            const otherTile = state.world.allTiles[`${mapTile.x + x}x${mapTile.y + y}`];
            if (!otherTile) continue;
            // The other tile will need to be deleted if it is not explored yet.
            if (otherTile.level < 0) {
                delete otherTile.canvas;
            }
            mapTile.neighbors[i] = otherTile;
            if (otherTile.neighbors) {
                otherTile.neighbors[8 - i] = mapTile;
            }
        }
    }
    state.world.allTiles[`${mapTile.x}x${mapTile.y}`] = mapTile;
    return mapTile;
}
