
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

function updatePlayerStats() {
    var levelBonus = getLevelBonus(level);
    maxHealth = Math.round(healthBonus * levelBonus * (1 + treeBonuses.health / 50));
    attack = Math.round(attackBonus * levelBonus * (1 + treeBonuses.attack / 50) + getSkillValue(skillTree.health.offense) * currentHealth / 100);
    defense = Math.round(defenseBonus * levelBonus * (1 + treeBonuses.defense / 50) + getSkillValue(skillTree.health.defense) * (maxHealth - currentHealth) / 100);
}

function getAttackWithoutHealthBonuses() {
    return Math.round(attackBonus * getLevelBonus(level) * (1 + treeBonuses.attack / 50));
}
function getDefenseWithoutHealthBonuses() {
    return Math.round(defenseBonus * getLevelBonus(level) * (1 + treeBonuses.defense / 50));
}

var hideStatsAt;
function drawStatsBox(x, y, level, name, currentHealth, maxHealth, attack, defense, experience, nextLevel) {
    var localIconSize = Math.floor(iconSize / 2);
    var width = localIconSize * 8;
    var height = localIconSize * 4;
    var padding = Math.floor(localIconSize / 4);
    var rectangle = {'left': x, 'top': y, 'width': width, 'height':  height};
    context.fillStyle = '#BBB';
    context.fillRect(x, y, width, height);
    context.fillStyle = '#FFF';
    context.fillRect(x + 1, y + 1, width - 2, height - 2);
    context.fillStyle = '#004';
    context.fillRect(x + 3, y + 3, width - 6, height - 6);
    context.textBaseline = 'top';
    context.textAlign = 'left';
    var fontSize = Math.floor(3 * localIconSize / 4);
    context.font = fontSize + 'px sans-serif';
    context.fillStyle = 'white';
    y += padding;
    var text = 'Lv ' + level + ' ' + name;
    context.fillText(text, x + padding, y);
    if (nextLevel) {
        var metrics = context.measureText(text);
        var left = x + padding + metrics.width + 5;
        drawBar(context, left, y, width - metrics.width - 2 * padding - 5, localIconSize - 5, '#ccc', 'orange', experience / nextLevel);
    }
    y += localIconSize;
    drawBar(context, x + padding, y, width - 2 * padding, 6, 'white', 'red', currentHealth / maxHealth);
    y += padding;

    drawImage(context, heartSource.image, heartSource, {'left': x + padding, 'top': y, 'width': localIconSize, 'height': localIconSize});
    context.fillText(currentHealth.abbreviate() + ' / ' + maxHealth.abbreviate(), x + localIconSize + 2 * padding, y);

    y += localIconSize + padding;
    drawImage(context, swordSource.image, swordSource, {'left': x + padding, 'top': y, 'width': localIconSize, 'height': localIconSize});
    context.fillText(attack.abbreviate(), x + localIconSize + 2 * padding, y);
    var centerX = Math.floor(x + width / 2);
    drawImage(context, shieldSource.image, shieldSource, {'left': centerX + padding, 'top': y, 'width': localIconSize, 'height': localIconSize});
    context.fillText(defense.abbreviate(), centerX + localIconSize + padding, y);
    return rectangle;
}
function getAttackTime() {
    return 800 - Math.min(400, (level - 1) * 50);
}
function getPlayerAttackTime() {
    return getAttackTime() / (1 + getSkillValue(skillTree.attack.attackSpeed));
}

function getCurrentPosition() {
    return currentScene === 'dungeon' ? [(dungeonPosition[0] + .5) * gridLength, (dungeonPosition[1] + .1) * gridLength] : currentPosition;
}

var monsterAttackTime, playerAttackTime;
function updateBattle(time) {
    // End battle if the player is too far from the monster.
    if (activeMonsters.indexOf(fightingMonster) < 0) {
        fightingMonster = null;
        return;
    }
    var currentBattlePosition = getCurrentPosition();
    if (time > monsterAttackTime) {
        var dodgeChance = getSkillValue(skillTree.defense.dodge);
        if (Math.random() < dodgeChance) {
            createDamageIndicator(currentBattlePosition, [fightingMonster.tile.centerX, fightingMonster.tile.centerY], 'Dodge', 'blue');
        } else {

            var attackRoll = getAttackRoll(fightingMonster.attack);
            var damage = calculateDamage(attackRoll, getDefenseRoll(defense));
            createDamageIndicator(currentBattlePosition, [fightingMonster.tile.centerX, fightingMonster.tile.centerY], damage.abbreviate());
            currentHealth = Math.max(0, currentHealth - damage);

            // Blocked damage is difference between the attackRoll and actual damage. Reflected damage is a percentage of this value.
            var reflectedDamage = Math.ceil((attackRoll - damage) * getSkillValue(skillTree.defense.offense));
            if (reflectedDamage) {
                createDamageIndicator([fightingMonster.tile.centerX, fightingMonster.tile.centerY], currentBattlePosition, reflectedDamage.abbreviate(), 'orange');
                fightingMonster.currentHealth = Math.max(0, fightingMonster.currentHealth - reflectedDamage);
            }
            fightingMonster.attack = Math.max(1, fightingMonster.attack - Math.ceil(defense * getSkillValue(skillTree.defense.defense)));
        }
        monsterAttackTime += getAttackTime();
    }
    if (time > playerAttackTime) {
        var damage = calculateDamage(getAttackRoll(attack), getDefenseRoll(fightingMonster.defense));
        createDamageIndicator([fightingMonster.tile.centerX, fightingMonster.tile.centerY], currentBattlePosition, damage.abbreviate());
        fightingMonster.currentHealth = Math.max(0, fightingMonster.currentHealth - damage);
        fightingMonster.defense = Math.max(0, fightingMonster.defense - Math.ceil(attack * getSkillValue(skillTree.attack.offense)));
        currentHealth = Math.min(maxHealth, currentHealth + Math.ceil(damage * getSkillValue(skillTree.attack.defense)));
        playerAttackTime += getPlayerAttackTime();
    }
    if (fightingMonster.currentHealth <= 0) {
        var defeatedMonster = fightingMonster;
        if (currentScene !== 'dungeon') {
            updateGameState();
            exhaustTile(fightingMonster.tile);
        }
        fightingMonster.tile.monster = null;

        if (Math.random() < 0.05 && currentScene !== 'dungeon') {
            var dungeonLevel = Math.max(1, Random.range(fightingMonster.level - 1, fightingMonster.level + 1));
            addDungeonToTile(fightingMonster.tile, dungeonLevel);
        }
        var monsterTile = fightingMonster.tile;
        fightingMonster.tile = null;
        activeMonsters.splice(activeMonsters.indexOf(fightingMonster), 1);
        var currentLootInMonsterRadius = lootInMonsterRadius;
        fightingMonster = null;
        selectedTile = null;
        // Outside of dungeons, you get nearby treasure for fighting monsters.
        if (currentScene !== 'dungeon') {
            updateMap();
            resetLootTotals();
            for (var loot of currentLootInMonsterRadius) {
                if (lootInMonsterRadius.indexOf(loot) < 0) {
                    collectingLoot.push(loot);
                }
            }
        } else {
            for (var neighbor of getAllNeighbors(monsterTile)) {
                neighbor.guards--;
            }
            if (defeatedMonster.isBoss) {
                var loot;
                if (currentDungeon.isQuestDungeon) {
                    loot = {'treasure': makeMagicStoneLoot(), 'type': 'loot'};
                } else {
                    var coins = Math.ceil((.9 + Math.random() * .2) * (1 + treeBonuses.money / 50) * Math.pow(1.1, defeatedMonster.level) * defeatedMonster.level * 100);
                    loot = {'treasure': $.extend({'value': coins, 'type': 'coins', 'scale': 1, 'onObtain': onObtainCoins}, chestSource), 'type': 'loot'};
                }
                var realCoords = toRealCoords([monsterTile.x, monsterTile.y]);
                loot.tx = loot.x = realCoords[0] + gridLength / 2;
                loot.ty = loot.y = realCoords[1] + gridLength / 2;
                loot.tile = monsterTile;
                monsterTile.loot = [loot];
            }
        }
        gainExperience(defeatedMonster.experience);
    }
    if (currentHealth <= 0) {
        fightingMonster = null;
        selectedTile = null;
    }
}

function getAttackRoll(attack) {
    return Math.round((.9 + Math.random() * .2) * attack);
}
function getDefenseRoll(defense) {
    return Math.round((.9 + Math.random() * .2) * defense);
}

function calculateDamage(attackRoll, defenseRoll) {
    var mitigationFactor = Math.pow(.5, Math.max(0,  Math.log((attackRoll / 2 + defenseRoll) / (attackRoll / 2))) / Math.log(2));
    // Damage is 1/2 when attack = defense, then halves roughly each time defense doubles.
    return Math.max(1, Math.ceil(attackRoll * mitigationFactor));
}
function calculateOldDamage(attack, defense) {
    // New formula, damage halves for every power of attack defense is.
    return Math.max(1, Math.ceil(attack * Math.pow(.5, Math.max(0, (Math.log(defense)) / Math.log(attack)))));
}
function calculateOlderDamage(attack, defense) {
    // Old formula, damage halves for every factor of attack defense is.
    return Math.max(1, Math.ceil(attack * Math.pow(.5, defense / attack)));
}

var fightingMonster = null;
var fightFleeButton = {'target': {}};
function handleFightFleeButtonClick(x, y) {
    if (!selectedTile || !selectedTile.monster) return false;
    if (currentHealth <= 0 || !isPointInRectObject(x, y, fightFleeButton.target)) return false;
    if (!fightingMonster) {
        fightingMonster = selectedTile.monster;
        // Monster always attacks first.
        monsterAttackTime = now() + 300;
        playerAttackTime = now() + 300 + getPlayerAttackTime() / 2;
    } else {
        fightingMonster = null;
    }
    return true;
}
function drawFightFleeButton() {
    context.textBaseline = 'middle';
    context.textAlign = 'left';
    context.font = Math.floor(3 * iconSize / 4) + 'px sans-serif';
    var text = fightingMonster ? 'Flee' : 'Fight';
    var metrics = context.measureText(text);

    var target = fightFleeButton.target;
    target.width = iconSize + metrics.width;
    target.left = Math.floor((canvas.width - target.width) / 2);
    target.top = canvas.height - 10 - iconSize;
    target.height = iconSize;

    if (fightingMonster) {
        drawImage(context, shoeSource.image, shoeSource, {'left': target.left, 'top': target.top, 'width': iconSize, 'height': iconSize});
    } else {
        context.save();
        var halfSize = Math.floor(iconSize / 2);
        context.translate(target.left + halfSize, target.top + halfSize);
        context.scale(-1, 1);
        drawImage(context, swordSource.image, swordSource, {'left': -halfSize + 6, 'top': -halfSize, 'width': iconSize, 'height': iconSize});
        context.scale(-1, 1);
        drawImage(context, swordSource.image, swordSource, {'left': -halfSize + 6, 'top': -halfSize, 'width': iconSize, 'height': iconSize});
        context.restore();
    }

    embossText(context, text, 'gold', 'black', target.left + iconSize, canvas.height - 10 - iconSize / 2);
}

function embossText(context, text, colorA, colorB, left, top) {
    context.fillStyle = colorB;
    context.fillText(text, left + 1, top + 1);
    context.fillStyle = colorA;
    context.fillText(text, left, top);
}

var damageIndicators = [];

function createDamageIndicator(targetPosition, sourcePosition, value, color) {
    var dx = targetPosition[0] - sourcePosition[0] + (Math.random() - .5) * gridLength / 5;
    var dy = targetPosition[1] - sourcePosition[1] + (Math.random() - .5) * gridLength / 5;
    if (dx == 0 && dy == 0) {
        dx = Math.random() - .5;
        dy = Math.random() - .5;
    }
    var mag = Math.sqrt(dx * dx + dy * dy);
    damageIndicators.push({
        'value': value,
        'color': ifdefor(color, 'red'),
        'x': targetPosition[0], 'y': targetPosition[1], 'z': gridLength / 10,
        'vx': dx / mag * gridLength / 20, 'vy': dy / mag * gridLength / 20, 'vz': gridLength / 12
    })
}

function updateDamageIndicators() {
    for (var i = 0; i < damageIndicators.length; i++) {
        var damage = damageIndicators[i];
        damage.x += damage.vx;
        damage.y += damage.vy;
        damage.z += damage.vz;
        damage.vz -= gridLength / 150;
        if (damage.z <= 0) {
            damageIndicators.splice(i--, 1);
        }
    }
}

function drawDamageIndicators() {
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    for (var damage of damageIndicators) {
        context.font = Math.round(iconSize / 8 * (1 + 4 * damage.z / gridLength)) + 'px sans-serif';
        var coords = project([damage.x, damage.y + damage.z]);
        embossText(context, damage.value, damage.color, 'white', coords[0], coords[1]);
    }
}