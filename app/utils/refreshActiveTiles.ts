import { emptyJourneyRadius, gridLength, maxTileLevel } from 'app/gameConstants';
import { checkToGenerateLootForTile } from 'app/loot';
import { checkToGenerateMonster } from 'app/monsters';
import { getDistance } from 'app/utils/index';
import Random from 'app/utils/Random';
import {getTileData, toRealCoords} from 'app/utils/world';

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
    const isJourneyMode = state.currentScene === 'journey' || state.currentScene === 'voyage';
    for (let y = currentGridCoords[1] - 4; y <= currentGridCoords[1] + 4; y++) {
        for (let x = currentGridCoords[0] - 4; x <= currentGridCoords[0] + 4; x++) {
            const key = `${x}x${y}`;
            let mapTile = allTiles[key];
            if (!mapTile) {
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
                if (!isJourneyMode) {
                    checkToGenerateMonster(state, mapTile, 0.25);
                }
            }
            if (isJourneyMode) {
                // For simplicity, all journey tiles are considered exhausted to avoid generating new loot/monsters.
                mapTile.exhaustedDuration = 100;
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
            // Variance of 3 gives 4 distinct tile offsets: 0,1,2,3
            const desiredVariance = Math.min(3, Math.ceil(gridDistance / 8));
            // The chance for a tile with level below the base tile only exists at the start of each journey.
            //const lowerTileOffset = gridDistance >= 10 ? 0 : 1;
            const lowerTileOffset = Math.max(0, 1 - gridDistance / 10);
            const maxLevel = Math.min(maxTileLevel, state.world.journeyModeTileLevel - lowerTileOffset + desiredVariance);
            const minLevel = Math.max(0, state.world.journeyModeTileLevel - 1, maxLevel - desiredVariance);
            const powerPercent = (mapTile.journeyPowerLevel - minPowerLevel) / (maxPowerLevel - minPowerLevel);
            mapTile.level = Math.round(minLevel + (maxLevel - minLevel) * powerPercent);
            //console.log([minPowerLevel, maxPowerLevel], desiredVariance, [minLevel, maxLevel], powerPercent, mapTile.level);
            //console.log(mapTile);
        }
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
            // Delete the other tile canvas in case it needs to be updated.
            // In the normal scene this only really applies to ocean tiles since all newly
            // explored tiles are shallow water, but in journey mode this can apply to
            // anything.
            delete otherTile.canvas;
            mapTile.neighbors[i] = otherTile;
            if (otherTile.neighbors) {
                otherTile.neighbors[8 - i] = mapTile;
            }
        }
    }
    state.world.allTiles[`${mapTile.x}x${mapTile.y}`] = mapTile;
    return mapTile;
}
