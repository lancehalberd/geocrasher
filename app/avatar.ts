import { gridLength } from 'app/gameConstants';
import { getAttackSkillBonus, getDefenseSkillBonus, getHealthSkillBonus, getSkillValue } from 'app/scenes/skillsScene';
import { resetLootTotals } from 'app/loot';

import { GameState } from 'app/types';

export function gainExperience(state: GameState, experienceGained: number): void {
    state.saved.avatar.experience += experienceGained * (1 + getSkillValue(state, 'moneyPowerups'));
    const forNextLevel = experienceForNextLevel(state);
    if (state.saved.avatar.experience >= forNextLevel) {
        state.saved.avatar.experience -= forNextLevel;
        // Show the loot total to display level up + stats gained.
        state.loot.lootCollectedTime = state.time + 5000;
        resetLootTotals(state);
        state.saved.avatar.level++;
        updatePlayerStats(state);
        state.saved.avatar.currentHealth = state.avatar.maxHealth;
    }
}

export function experienceForNextLevel(state: GameState): number {
    return Math.round(10 * state.saved.avatar.level * Math.pow(1.3, state.saved.avatar.level - 1));
}

export function getLevelBonus(state: GameState): number {
    return Math.pow(1.1, state.saved.avatar.level - 1);
}

export function updatePlayerStats(state: GameState) {
    const levelBonus = getLevelBonus(state);
    const { currentHealth, attackBonus, defenseBonus, healthBonus } = state.saved.avatar;
    state.avatar.maxHealth = Math.round(healthBonus * levelBonus * getHealthSkillBonus(state));
    const baseAttack = attackBonus * levelBonus + getSkillValue(state, 'healthOffense') * currentHealth / 100;
    state.avatar.attack = Math.round(baseAttack * getAttackSkillBonus(state));
    const missingHealth = state.avatar.maxHealth - currentHealth;
    const baseDefense = defenseBonus * levelBonus + getSkillValue(state, 'healthDefense') * missingHealth / 100
    state.avatar.defense = Math.round(baseDefense * getDefenseSkillBonus(state));
}

export function getAvatarPosition(state: GameState) {
    return state.dungeon.currentDungeon
        ? [(state.dungeon.dungeonPosition[0] + .5) * gridLength, (state.dungeon.dungeonPosition[1] + .1) * gridLength]
        : state.world.currentPosition;
}

export function gainHealth(state: GameState, amount: number): void {
    state.saved.avatar.currentHealth = Math.min(state.avatar.maxHealth, state.saved.avatar.currentHealth + amount);
}

// Regenerate health based on the players current regeneration skill.
export function regenerateHealth(state: GameState): void {
    const regenerationRate = 0.05 + getSkillValue(state, 'regeneration');
    gainHealth(state, Math.ceil(state.avatar.maxHealth * regenerationRate));
}

export function getAttackWithoutHealthBonuses(state: GameState): number {
    return Math.round(state.saved.avatar.attackBonus * getLevelBonus(state) * getAttackSkillBonus(state));
}
export function getDefenseWithoutHealthBonuses(state: GameState): number {
    return Math.round(state.saved.avatar.defenseBonus * getLevelBonus(state) * getDefenseSkillBonus(state));
}
