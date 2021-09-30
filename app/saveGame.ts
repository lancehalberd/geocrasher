import { updatePlayerStats } from 'app/avatar';
import { checkToSpawnGems, clearAllGems } from 'app/gems';
import { getSkillLevel, skills } from 'app/scenes/skillsScene';
import { initializeTreasureMapStateFromSave } from 'app/scenes/treasureMapScene';
import { getDefaultSavedState, pushScene } from 'app/state';
import { initializeWorldMapTile } from 'app/world';

import { GameState, SavedGameState } from 'app/types';

export function initializeSaveSlots(state: GameState): void {
    const importedSaveDataString = window.localStorage.getItem('geocrasher2Saves');
    const importedSaveData: {
        saveSlots?: SavedGameState[]
    } = importedSaveDataString ? JSON.parse(importedSaveDataString) : {};
    let { saveSlots } = importedSaveData;
    if (!saveSlots) saveSlots = [];
    for (let i = 0; i < 3; i++) {
        saveSlots[i] = fixSavedData(saveSlots[i] ?? {});
    }
    state.saveSlots = saveSlots;
}

export function deleteSaveSlot(this: void, state: GameState, saveSlotIndex: number): void {
    if (confirm('Are you sure you want to delete this save data? This cannot be undone.')) {
        state.saveSlots[saveSlotIndex] = getDefaultSavedState();
        window.localStorage.setItem('geocrasher2Saves', JSON.stringify(state.saveSlots));
    }
}

export function loadSaveSlot(state: GameState, saveSlotIndex: number): void {
    state.saveSlotIndex = saveSlotIndex;
    state.saved = fixSavedData(state.saveSlots[saveSlotIndex]);
    state.world.levelSums = [];
    state.world.allTiles = {};
    for (const tile of state.saved.world.tiles) {
        const key = `${tile.x}x${tile.y}`;
        state.world.allTiles[key] = initializeWorldMapTile(state, {
            ...tile,
            centerX: 0,
            centerY: 0,
            target: {x: 0, y: 0, w: 0, h: 0},
            guards: 0,
            lootMarkers: [],
        });
    }
    state.avatar.usedSkillPoints = 0;
    state.avatar.affinityBonuses = {
        health: 0,
        attack: 0,
        defense: 0,
        money: 0,
    };
    for (const skill of skills) {
        const level = getSkillLevel(state, skill.key);
        const pointsUsed = (level * (level + 1)) / 2;
        state.avatar.usedSkillPoints += pointsUsed;
        state.avatar.affinityBonuses[skill.affinity] += pointsUsed;
    }
    initializeTreasureMapStateFromSave(state);
    updatePlayerStats(state);
    delete state.world.currentGridCoords;
    delete state.selectedTile;
    delete state.lastGoalPoint;
    state.loot.hideStatsAt = state.time + 2000;
    pushScene(state, 'map');
    clearAllGems(state);
    checkToSpawnGems(state);
}

export function saveGame(state: GameState) {
    if (state.saveSlotIndex < 0 || state.saveSlotIndex > 2) {
        throw Error(`Attempted to save to invalid slot: ${state.saveSlotIndex}`);
    }
    prepareSavedData(state);
    state.saveSlots[state.saveSlotIndex] = state.saved;
    window.localStorage.setItem('geocrasher2Saves', JSON.stringify({ saveSlots: state.saveSlots }));
}

function prepareSavedData(state: GameState): void {
    state.saved.world.tiles = [];
    for (let key in state.world.allTiles) {
        const tileData = state.world.allTiles[key];
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
