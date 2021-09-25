import { skills } from 'app/scenes/skillsScene';
import { getDefaultSavedState, getState, pushScene, resetState } from 'app/state';
import { initializeWorldMapTile } from 'app/world';

import { GameState, SavedGameState } from 'app/types';

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
        state.world.tileGrid[tile.y][tile.x] = initializeWorldMapTile(state, tile);
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
    state.selectedTile = state.lastGoalPoint = null;
    state.loot.hideStatsAt = state.time + 2000;
    pushScene(state, 'map');
    clearAllGems();
    checkToSpawnGems();
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
