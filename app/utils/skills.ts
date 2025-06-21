import {
    clockSource, crabSource,
    heartSource, outlinedMoneySource,
    scrollSource, shieldSource, shoeSource, swordSource,
    turtleSource,
} from 'app/images';

export const skills: Skill[] = [
    // Health Skills
    {
        key: 'regeneration',
        affinity: 'health',
        name: 'Regeneration', description: '% increased health regeneration.',
        value: 0.2, type: '*',
        x: 0, y: -1,
        source: clockSource, secondSource: heartSource,
    },
    {
        key: 'healthPower',
        requires: 'regeneration',
        affinity: 'health',
        name: 'Vitality', description: '% increased value of health power ups.',
        value: 0.1, type: '*',
        x: 0, y: -2,
        source: heartSource,
    },
    {
        key: 'healthOffense',
        requires: 'healthPower',
        affinity: 'health',
        name: 'Full Power', description: '# attack per 100 current health.',
        value: 2, type: '+',
        x: -1, y: -2,
        source: heartSource, secondSource: swordSource,
    },
    {
        key: 'healthDefense',
        requires: 'healthPower',
        affinity: 'health',
        name: 'Caution', description: '# defense per 100 missing health.',
        value: 4, type: '+',
        x: 1, y: -2,
        source: heartSource, secondSource: shieldSource,
    },
    // Attack skills
    {
        key: 'attackSpeed',
        affinity: 'attack',
        name: 'Ferocity', description: '% increased attack speed.',
        value: 0.1, type: '*',
        x: -1, y: 0,
        source: shoeSource, secondSource: swordSource,
    },
    {
        key: 'attackPower',
        requires: 'attackSpeed',
        affinity: 'attack',
        name: 'Strength', description: '% increased value of attack power ups.',
        value: 0.1, type: '*',
        x: -2, y: 0,
        source: swordSource,
    },
    {
        key: 'attackOffense',
        requires: 'attackPower',
        affinity: 'attack',
        name: 'Shredder', description: 'Permanently reduce enemy defense by % of your attack on each attack.',
        value: 0.02, type: '+',
        x: -2, y: -1,
        source: swordSource, secondSource: crabSource,
    },
    {
        key: 'attackDefense',
        requires: 'attackPower',
        affinity: 'attack',
        name: 'Vampiric Strike', description: '% of damage is gained as health.',
        value: 0.02, type: '+',
        x: -2, y: 1,
        source: swordSource, secondSource: heartSource,
    },
    // Defense skills
    {
        key: 'dodge',
        affinity: 'defense',
        name: 'Acrobat', description: '% chance to dodge attacks.',
        value: 0.05, type: '/',
        x: 1, y: 0,
        source: shoeSource, secondSource: shieldSource,
    },
    {
        key: 'defensePower',
        requires: 'dodge',
        affinity: 'defense',
        name: 'Toughness', description: '% increased value of defense power ups.',
        value: 0.1, type: '*',
        x: 2, y: 0,
        source: shieldSource,
    },
    {
        key: 'defenseOffense',
        requires: 'defensePower',
        affinity: 'defense',
        name: 'Urchin', description: 'Attackers take % of damage blocked as damage.',
        value: 0.5, type: '+',
        x: 2, y: -1,
        source: shieldSource, secondSource: crabSource,
    },
    {
        key: 'defenseDefense',
        requires: 'defensePower',
        affinity: 'defense',
        name: 'Iron Shell', description: 'Permanently reduce enemy attack by % of your defense on each block.',
        value: 0.02, type: '+',
        x: 2, y: 1,
        source: shieldSource, secondSource: turtleSource,
    },
    // Utility skills
    {
        key: 'radius',
        affinity: 'money',
        name: 'Adventurer', description: '% increased collection area.',
        value: 0.1, type: '*',
        x: 0, y: 1,
        source: shoeSource,
    },
    {
        key: 'experiencePower',
        requires: 'radius',
        affinity: 'money',
        name: 'Wisdom', description: '% increased experience gained.',
        value: 0.1, type: '*',
        x: 0, y: 2,
        source: scrollSource,
    },
    {
        key: 'explorer',
        requires: 'experiencePower',
        affinity: 'money',
        name: 'Explorer', description: '% reduced cost to upgrade islands.',
        value: 0.1, type: '/',
        x: -1, y: 2,
        source: shoeSource, secondSource: outlinedMoneySource
    },
    {
        key: 'conquerer',
        requires: 'experiencePower',
        affinity: 'money',
        name: 'Conquerer', description: '% reduced power of discovered monsters.',
        value: 0.1, type: '/',
        x: 1, y: 2,
        source: shoeSource, secondSource: outlinedMoneySource
    },
];

const skillsByKey = {} as {[key in SkillKey]: Skill};
for (const skill of skills) {
    skillsByKey[skill.key] = skill;
}

export function getSkillLevel(state: GameState, key: string): number {
    return state.saved.avatar.skillLevels[key] ?? 0;
}

export function getTotalSkillPoints(state: GameState): number {
    return (state.saved.avatar.level - 1)
        + state.saved.world.journeySkillPoints
        + (state.saved.world.dungeonLevelCap / 2 - 1);
}
export function getAvailableSkillPoints(state: GameState) {
    return getTotalSkillPoints(state) - state.avatar.usedSkillPoints;
}
export function canLearnSkill(state: GameState, skill: Skill): boolean {
    if (!skill.requires) return true;
    // If this skill requires another skill, we can only learn it if its current level
    // is less than the level of the skill it requres.
    return getSkillLevel(state, skill.key) < getSkillLevel(state, skill.requires);
}
export function canAffordSkill(state: GameState, skill: Skill): boolean {
    return getAvailableSkillPoints(state) >= getSkillCost(state, skill);
}
export function getSkillCost(state: GameState, skill: Skill): number {
    return getSkillLevel(state, skill.key) + 1;
}

export function getSkillValue(state: GameState, skillKey: SkillKey, level?: number): number {
    const skill = skillsByKey[skillKey];
    level = level ?? getSkillLevel(state, skillKey);
    if (level === 0) return 0;
    if (skill.type === '+') return level * skill.value;
    if (skill.type === '*') return Math.pow(1 + skill.value, level) - 1;
    if (skill.type === '/') return 1 - Math.pow(1 - skill.value, level);
    throw new Error('Unknown skill type: ' + skill.type);
}

// An unspent skill point gives you 1% to all stats.
// A spent skill point gives you 2% to that stat, 1% to adjacent stats, and 0% to polar stat.
export function getHealthSkillBonus(state: GameState) {
    const { affinityBonuses } = state.avatar;
    return 1 + (affinityBonuses.health * 2 + affinityBonuses.attack + affinityBonuses.defense + getAvailableSkillPoints(state)) / 100;
}
export function getAttackSkillBonus(state: GameState) {
    const { affinityBonuses } = state.avatar;
    return 1 + (affinityBonuses.attack * 2 + affinityBonuses.health + affinityBonuses.money + getAvailableSkillPoints(state)) / 100;
}
export function getDefenseSkillBonus(state: GameState) {
    const { affinityBonuses } = state.avatar;
    return 1 + (affinityBonuses.defense * 2 + affinityBonuses.health + affinityBonuses.money + getAvailableSkillPoints(state)) / 100;
}
export function getMoneySkillBonus(state: GameState) {
    const { affinityBonuses } = state.avatar;
    return 1 + (affinityBonuses.money * 2 + affinityBonuses.attack + affinityBonuses.defense + getAvailableSkillPoints(state)) / 100;
}
