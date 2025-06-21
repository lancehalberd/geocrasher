import {minRadius} from 'app/gameConstants';

export function getDefaultSavedState(): SavedGameState {
    return {
        coins: 10,
        radius: minRadius,
        avatar: {
            level: 1,
            experience: 0,
            currentHealth: 100,
            healthBonus: 100,
            attackBonus: 8,
            defenseBonus: 6,
            skillLevels: {},
        },
        gems: {
            recentLocations: []
        },
        treasureHunt: {
            hadMap: false,
            mapCount: 0,
        },
        world: {
            dungeonLevelCap: 2,
            journeySkillPoints: 0,
            gemData: [{history: []}, {history: []}, {history: []}],
            tiles: [],
        },
    };
}

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
    for (let key in state.world.savedTiles) {
        const tileData = state.world.savedTiles[key];
        if (!tileData || tileData.level < 0) {
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
export function fixSavedData(savedState: Partial<SavedGameState>): SavedGameState {
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
