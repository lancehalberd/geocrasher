import { isTestMode } from 'app/context';
import { clearAllGems } from 'app/gems';
import { resetLootTotals } from 'app/loot';
import { GameState } from 'app/types';

const maxThreshold = 500;
export function updateFastMode(state: GameState, millisecondsBetweenUpdates: number) {
    if (state.globalPosition.isFixingGPS || isTestMode) {
        return;
    }
    if (state.currentScene === 'loading' || state.currentScene === 'title' || state.dungeon.currentDungeon) return;
    if (!state.globalPosition.isStartingFastMode && !state.globalPosition.isFastMode) {
        if (millisecondsBetweenUpdates <= maxThreshold) {
            state.globalPosition.isStartingFastMode = true;
        }
        return;
    }
    if (state.globalPosition.isStartingFastMode && !state.globalPosition.isFastMode) {
        if (millisecondsBetweenUpdates > maxThreshold) {
            state.globalPosition.isStartingFastMode = false;
            return;
        }
        state.globalPosition.isFastMode = true;
        resetLootTotals(state);
        clearAllGems();
        radius = maxRadius;
        selectedTile = null;
        state.battle.engagedMonster = null;
        endFastModeTime = state.time + 10000;
        return;
    }
    if (millisecondsBetweenUpdates <= maxThreshold) {
        endFastModeTime = state.time + 5000;
    }
}
