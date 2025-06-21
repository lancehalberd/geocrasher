import { regenerateHealth } from 'app/avatar';
import { maxRadius } from 'app/gameConstants';
import { checkToSpawnGems } from 'app/gems';
import { checkToGenerateLootForTile } from 'app/loot';
import { checkToGenerateMonster } from 'app/monsters';

// Function that is called to advance time in the world.
// Increments exhaust counter on exhausted tiles
// Avatar restores % of max health
// Chance to spawn more coins, monsters, powerups and gems.
// Eventually: advance timer for resource mining/crafting/training etc.
export function advanceGameState(state: GameState) {
    state.saved.radius = (state.saved.radius * 2 + maxRadius) / 3;
    if (state.saved.avatar.currentHealth < state.avatar.maxHealth && !state.battle.engagedMonster) {
        regenerateHealth(state);
    }
    const isJourneyMode = state.currentScene === 'journey' || state.currentScene === 'voyage';
    // Gems do not spawn and tiles do not refresh during journey mode.
    if (!isJourneyMode) {
        for (const tile of state.world.activeTiles) {
            if (tile.exhaustedDuration) {
                tile.exhaustCounter = (tile.exhaustCounter || 0) + 1;
                if (tile.exhaustCounter >= tile.exhaustedDuration) {
                    tile.exhaustedDuration = 0;
                    checkToGenerateMonster(state, tile, .5);
                }
            }
            if (!tile.exhaustedDuration) {
                checkToGenerateLootForTile(state, tile);
                checkToGenerateMonster(state, tile, .05);
            }
        }
        checkToSpawnGems(state);
    }
}
