
var level, experience, currentHealth, healthBonus, attackBonus, defenseBonus;
var maxHealth, attack, defense;
function gainExperience(experienceGained) {
    experience += experienceGained;
    var forNextLevel = experienceForNextLevel();
    if (experience >= forNextLevel) {
        experience -= forNextLevel;
        level++;
        updatePlayerStats();
    }
}

function experienceForNextLevel() {
    return Math.round(10 * level * Math.pow(1.3, level - 1));
}

function getLevelBonus() {
    return Math.pow(1.1, level - 1);
}

function updatePlayerStats() {
    var levelBonus = getLevelBonus();
    maxHealth = Math.round(healthBonus * levelBonus);
    attack = Math.round(attackBonus * levelBonus);
    defense = Math.round(defenseBonus * levelBonus);
}

var hideStatsAt;
function drawStatsBox(x, y, level, name, currentHealth, maxHealth, attack, defense, experience, nextLevel) {
    var localIconSize = Math.floor(iconSize / 2);
    var width = localIconSize * 7;
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
    context.fillText(attack, x + localIconSize + 2 * padding, y);
    var centerX = Math.floor(x + width / 2);
    drawImage(context, shieldSource.image, shieldSource, {'left': centerX + padding, 'top': y, 'width': localIconSize, 'height': localIconSize});
    context.fillText(defense, centerX + localIconSize + padding, y);
    return rectangle;
}
function getAttackTime() {
    return 800 - Math.min(400, (level - 1) * 50);
}

var monsterAttackTime, playerAttackTime;
function updateBattle(time) {
    // End battle if the player is too far from the monster.
    if (activeMonsters.indexOf(fightingMonster) < 0) {
        fightingMonster = null;
        selectedTile = null;
        return;
    }
    if (time > monsterAttackTime) {
        var damage = calculateDamage(fightingMonster.attack, defense);
        currentHealth = Math.max(0, currentHealth - damage);
        monsterAttackTime += getAttackTime();
        if (currentHealth <= 0) {
            fightingMonster = null;
            selectedTile = null;
        }
    }
    if (time > playerAttackTime) {
        var damage = calculateDamage(attack, fightingMonster.defense);
        fightingMonster.currentHealth = Math.max(0, fightingMonster.currentHealth - damage);
        playerAttackTime += getAttackTime();
        if (fightingMonster.currentHealth <= 0) {
            updateGameState();
            fightingMonster.tile.monster = null;
            exhaustTile(fightingMonster.tile);
            fightingMonster.tile = null;
            activeMonsters.splice(activeMonsters.indexOf(fightingMonster), 1);
            var currentLootInMonsterRadius = lootInMonsterRadius;
            gainExperience(fightingMonster.experience);
            fightingMonster = null;
            selectedTile = null;
            updateMap();
            resetLootTotals();
            for (var loot of currentLootInMonsterRadius) {
                if (lootInMonsterRadius.indexOf(loot) < 0) {
                    collectingLoot.push(loot);
                }
            }
        }
    }
}

function calculateDamage(attack, defense) {
    // New formula, damage halves for every power of attack defense is.
    return Math.max(1, Math.ceil(attack * Math.pow(.5, Math.max(0, Math.log(defense) / Math.log(attack)))));
    // Old formula, damage halves for every factor of attack defense ise
    //return Math.max(1, Math.ceil(attack * Math.pow(.5, defense / attack)));
}

var fightingMonster = null;
var fightFleeButton = {'target': {}};
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
