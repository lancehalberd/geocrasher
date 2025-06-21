import { updatePlayerStats } from 'app/avatar';
import { checkToSpawnGems, clearAllGems } from 'app/gems';
import {getSkillLevel, skills} from 'app/utils/skills';
import {fixSavedData} from 'app/saveGame';
import {pushScene } from 'app/state';
import {initializeWorldMapTile} from 'app/utils/refreshActiveTiles';
import {initializeTreasureMapStateFromSave} from 'app/utils/treasureMap';

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
            journeyDistance: 0,
            journeyPowerLevel: 0,
            lootMarkers: [],
        });
    }
    state.world.savedTiles = state.world.allTiles;
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
    state.goalCoordinates = [];
    state.loot.hideStatsAt = state.time + 2000;
    pushScene(state, 'map');
    clearAllGems(state);
    checkToSpawnGems(state);
}
