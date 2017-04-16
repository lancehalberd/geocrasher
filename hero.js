var level, experience, currentHealth, healthBonus, attackBonus, defenseBonus;
var maxHealth, attack, defense;
function gainExperience(experienceGained) {
    experience += experienceGained * (1 + getSkillValue(skillTree.money.powerups));
    var forNextLevel = experienceForNextLevel();
    if (experience >= forNextLevel) {
        experience -= forNextLevel;
        // Show the loot total to display level up + stats gained.
        lootCollectedTime = now() + 5000;
        resetLootTotals();
        level++;
        updatePlayerStats();
        currentHealth = maxHealth;
    }
}

function experienceForNextLevel() {
    return Math.round(10 * level * Math.pow(1.3, level - 1));
}

function getLevelBonus(level) {
    return Math.pow(1.1, level - 1);
}

// An unspent skill point gives you 1% to all stats.
// A spent skill point gives you 2% to that stat, 1% to adjacent stats, and 0% to polar stat.
function getHealthSkillBonus() {
    return 1 + (treeBonuses.health * 2 + treeBonuses.attack + treeBonuses.defense + getAvailableSkillPoints()) / 100;
}
function getAttackSkillBonus() {
    return 1 + (treeBonuses.attack * 2 + treeBonuses.health + treeBonuses.money + getAvailableSkillPoints()) / 100;
}
function getDefenseSkillBonus() {
    return 1 + (treeBonuses.defense * 2 + treeBonuses.health + treeBonuses.money + getAvailableSkillPoints()) / 100;
}
function getMoneySkillBonus() {
    return 1 + (treeBonuses.money * 2 + treeBonuses.attack + treeBonuses.defense + getAvailableSkillPoints()) / 100;
}

function updatePlayerStats() {
    var levelBonus = getLevelBonus(level);
    maxHealth = Math.round(healthBonus * levelBonus * getHealthSkillBonus());
    var baseAttack = attackBonus * levelBonus + getSkillValue(skillTree.health.offense) * currentHealth / 100;
    attack = Math.round(baseAttack * getAttackSkillBonus());
    var baseDefense = defenseBonus * levelBonus + getSkillValue(skillTree.health.defense) * (maxHealth - currentHealth) / 100
    defense = Math.round(baseDefense * getDefenseSkillBonus());
}

function getAttackWithoutHealthBonuses() {
    return Math.round(attackBonus * getLevelBonus(level) * getAttackSkillBonus());
}
function getDefenseWithoutHealthBonuses() {
    return Math.round(defenseBonus * getLevelBonus(level) * getDefenseSkillBonus());
}