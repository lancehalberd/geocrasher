import { advanceGameState } from 'app/advanceGameState';
import {gemData} from 'app/gems';

export function updateGems(state: GameState): void {
    for (const gem of gemData) {
        const currentTick = state.gems.colorCounters[gem.color] || 0;
        if (!currentTick) {
            continue;
        }
        if (state.loot.collectingLoot.length) {
            state.gems.nextTickTime = state.time + gem.tickDuration;
        }
        if (state.gems.nextTickTime && state.time >= state.gems.nextTickTime) {
            state.gems.colorCounters[gem.color] = currentTick - 1;
            advanceGameState(state);
            state.gems.nextTickTime = state.time + gem.tickDuration;
            for (const monsterMarker of state.world.activeMonsterMarkers) {
                if (monsterMarker.monster.tint?.color !== gem.color) {
                    monsterMarker.monster.tint = {
                        color: gem.color,
                        amount: 0,
                    };
                }
                monsterMarker.monster.tint.amount += gem.tintAmount;
                monsterMarker.monster.currentHealth = Math.max(1, Math.floor(monsterMarker.monster.currentHealth * gem.debuff));
                monsterMarker.monster.attack = Math.max(1, Math.floor(monsterMarker.monster.attack * gem.debuff));
                monsterMarker.monster.defense = Math.max(1, Math.floor(monsterMarker.monster.defense * gem.debuff));
            }
        }
    }
}
