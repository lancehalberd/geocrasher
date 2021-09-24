import { gridLength } from 'app/gameConstants';
import { skills } from 'app/scenes/skillsScene';
import { getDefaultSavedState, getState, resetState } from 'app/state';
import { toRealCoords } from 'app/world';

import { GameState, MapTile, SavedGameState, SavedMapTile } from 'app/types';

const importedSaveDataString = window.localStorage.getItem('geocrasher2Saves');
const importedSaveData: {
    saveSlots?: SavedGameState[]
} = importedSaveDataString ? JSON.parse(importedSaveDataString) : {};
let { saveSlots } = importedSaveData;
if (!saveSlots) saveSlots = [];
for (let i = 0; i < 3; i++) {
    saveSlots[i] = fixSavedData(saveSlots[i] ?? {});
}

export function loadSaveSlot(saveSlotIndex: number) {
    resetState();
    const state = getState();
    state.saveSlotIndex = saveSlotIndex;
    state.saved = fixSavedData(saveSlots[saveSlotIndex]);
    state.world.levelSums = [];
    state.world.tileGrid = [];
    for (const tile of state.saved.world.tiles) {
        state.world.tileGrid[tile.y] = state.world.tileGrid[tile.y] ?? [];
        state.world.tileGrid[tile.y][tile.x] = initializeTile(tile);
    }

    state.avatar.usedSkillPoints = 0;
    state.avatar.affinityBonuses = {
        health: 0,
        attack: 0,
        defense: 0,
        money: 0,
    };
    for (const skill of skills) {
        const level = state.saved.avatar.skillLevels[skill.key] ?? 0;
        const pointsUsed = (level * (level + 1)) / 2;
        state.avatar.usedSkillPoints += pointsUsed;
        state.avatar.affinityBonuses[skill.affinity] += pointsUsed;
    }
    importTreasureMapsData(saveSlot);
    updatePlayerStats();
    currentGridCoords = null;
    clickedCoords = selectedTile = lastGoalPoint = null;
    hideStatsAt = state.time + 2000;
    pushScene('map');
    clearAllGems();
    checkToSpawnGems();
}

export function initializeTile(tileData: SavedMapTile): MapTile {
    const realCoords = toRealCoords([tileData.x, tileData.y]);
    const centerX = realCoords[0] + gridLength / 2;
    const centerY = realCoords[1] + gridLength / 2;
    if (!tileData.loot) tileData.loot = [];
    if (!tileData.neighbors) {
        tileData.neighbors = {};
        for (var y = -1; y <= 1; y++) {
            for (var x = -1; x <= 1; x++) {
                if (x === 0 && y === 0) continue;
                var neighbor = gridData[(tileData.x + x) +'x' + (tileData.y + y)];
                if (!neighbor) continue;
                tileData.neighbors[x + 'x' + y] = neighbor;
                neighbor.neighbors[(-x) + 'x' + (-y)] = tileData;
            }
        }
    }
    for (var i = 0; i <= tileData.level; i++) {
        levelSums[i] = (levelSums[i] ?? 0) + (1 + tileData.level - i);
    }
    return {
        loot: [],
        ...tileData,
        centerX,
        centerY,
    };
}

export function saveGame(state: GameState) {
    prepareSavedData(state);
    saveSlots[state.saveSlotIndex] = state.saved;
    window.localStorage.setItem('geocrasher2Saves', JSON.stringify(saveSlots));
}

function prepareSavedData(state: GameState): void {
    state.saved.world.tiles = [];
    for (let y in state.world.tileGrid) {
        for (let x in (state.world.tileGrid[y] ?? [])) {
            const tileData = state.world.tileGrid[y][x];
            if (!tileData) {
                continue;
            }
            state.saved.world.tiles.push({
                level: tileData.level,
                exhaustedDuration: tileData.exhaustedDuration,
                exhaustCounter: tileData.exhaustCounter,
                x: tileData.x,
                y: tileData.y
            });
        }
    }
}

/**
 * Due to changes in the code or bugs that may be released, sometimes the data
 * in a save file is no longer valid. This method is applied to each save slot
 * on load to correct any issues with the save data found vs what is expected.
 */
function fixSavedData(savedState: Partial<SavedGameState>): SavedGameState {
    const defaultSavedState = getDefaultSavedState();
    return {
        ...defaultSavedState,
        ...savedState,
        treasureHunt: {
            ...defaultSavedState.treasureHunt,
            ...savedState.treasureHunt,
        },
        avatar: {
            ...defaultSavedState.avatar,
            ...savedState.avatar,
        },
        world: {
            ...defaultSavedState.world,
            ...savedState.world,
        },
    };
}
