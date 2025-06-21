import {resetLootTotals} from 'app/avatar';
import {isTestMode} from 'app/context';
import {maxRadius} from 'app/gameConstants';
import {clearAllGems} from 'app/gems';

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
        clearAllGems(state);
        state.saved.radius = maxRadius;
        delete state.selectedTile;
        delete state.battle.engagedMonster;
        state.globalPosition.endFastModeTime = state.time + 10000;
        return;
    }
    if (millisecondsBetweenUpdates <= maxThreshold) {
        state.globalPosition.endFastModeTime = state.time + 5000;
    }
}
