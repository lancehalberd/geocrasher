
var coinLoot = [
    {'value': 1, 'type': 'coins', 'image': coinImage, 'left': 0, 'top': 0, 'width': 16, 'height': 16, 'scale': 1, 'onObtain': onObtainCoins},
    {'value': 5, 'type': 'coins', 'image': coinImage, 'left': 0, 'top': 32, 'width': 20, 'height': 20, 'scale': 1, 'onObtain': onObtainCoins},
    {'value': 20, 'type': 'coins', 'image': coinImage, 'left': 0, 'top': 64, 'width': 24, 'height': 24, 'scale': 1, 'onObtain': onObtainCoins},
    {'value': 100, 'type': 'coins', 'image': coinImage, 'left' : 32, 'top': 0, 'width': 16, 'height': 16, 'scale': 1, 'onObtain': onObtainCoins},
    {'value': 500, 'type': 'coins', 'image': coinImage, 'left': 32, 'top': 32, 'width': 20, 'height': 20, 'scale': 1, 'onObtain': onObtainCoins},
    {'value': 2000, 'type': 'coins', 'image': coinImage, 'left': 32, 'top': 64, 'width': 24, 'height': 24, 'scale': 1, 'onObtain': onObtainCoins},
    {'value': 10000, 'type': 'coins', 'image': coinImage, 'left': 64, 'top': 0, 'width': 16, 'height': 16, 'scale': 1, 'onObtain': onObtainCoins},
    {'value': 50000, 'type': 'coins', 'image': coinImage, 'left': 64, 'top': 32, 'width': 20, 'height': 20, 'scale': 1, 'onObtain': onObtainCoins},
    {'value': 200000, 'type': 'coins', 'image': coinImage, 'left': 64, 'top': 64, 'width': 24, 'height': 24, 'scale': 1, 'onObtain': onObtainCoins}
];

function onObtainCoins() {
    coins += this.value;
    coinsCollected += this.value;
}

function checkToGenerateLootForTile(tile) {
    if (tile.loot.length < 3) {
        var coins = Math.ceil((.5 + Math.random()) * getTilePower(tile) * (1 + treeBonuses.money / 50) * Math.pow(4, tile.level) / 3);
        var coinDrops = generateLootCoins(coins, 1);
        var realCoords = toRealCoords([tile.x, tile.y]);
        for (var coinDrop of coinDrops) {
            tile.loot.push({'treasure': coinDrop, 'tile': tile,
                'x': realCoords[0] + gridLength / 2, 'y': realCoords[1] + gridLength / 2,
                'tx': realCoords[0] + Math.random() * gridLength, 'ty': realCoords[1] + Math.random() * gridLength});
        }
    }
    checkToGeneratePowerUp(tile);
}

var activePowerups = [];
function checkToGeneratePowerUp(tile) {
    if (fastMode || fixingGPS || tile.powerup) return;
    // Monsters cannot spawn in shallows.
    if (tile.level < 1) return;
    // Chance to spawn a monster decreases with # of active monsters and the level of the tile.
    var chanceToSpawn = .1 * ((4 - activePowerups.length) / 4) * ((maxLevel + 1 - tile.level) / (maxLevel));
    if (Math.random() > chanceToSpawn) return;
    var value = (.4 + Math.random() * .2) * getTilePower(tile) * Math.pow(1.3, tile.level - 1);
    var loot = {'treasure': getWeightedPowerup(value), 'tile': tile,
        'x': tile.centerX, 'y': tile.centerY,
        'tx': tile.centerX + (Math.random() - 0.5) * gridLength,
        'ty': tile.centerY + (Math.random() - 0.5) * gridLength};
    tile.loot.push(loot);
    tile.powerup = loot;
    activePowerups.push(loot);
}
function getWeightedPowerup(value) {
    var lootMethod = Random.element(
        [makeHealthLoot, makeHealthLoot, makeHealthLoot, makeHealthLoot,
         makeHealthLoot, makeHealthLoot, makeHealthLoot, makeHealthLoot,
         makeAttackLoot, makeAttackLoot, makeAttackLoot,
         makeDefenseLoot, makeDefenseLoot]);
    return lootMethod(value);
}

function makeHealthLoot(value) {
    return $.extend({'value': Math.ceil(4 * value * (1 + getSkillValue(skillTree.health.powerups))), 'type': 'health', 'scale': .5, 'onObtain': onObtainHealthLoot}, heartSource);
}
function onObtainHealthLoot() {
    healthBonus += this.value;
    updatePlayerStats();
    currentHealth = Math.min(maxHealth, currentHealth + Math.round(2 * this.value * getLevelBonus(level)));
    showStats();
}
function makeAttackLoot(value) {
    return $.extend({'value': Math.ceil(value * (1 + getSkillValue(skillTree.attack.powerups))), 'type': 'attack', 'scale': .75, 'onObtain': onObtainAttackLoot}, swordSource);
}
function onObtainAttackLoot() {
    attackBonus += this.value;
    updatePlayerStats();
    showStats();
}
function makeDefenseLoot(value) {
    return $.extend({'value': Math.ceil(value * (1 + getSkillValue(skillTree.defense.powerups))), 'type': 'defense', 'scale': .75, 'onObtain': onObtainDefenseLoot}, shieldSource);
}
function onObtainDefenseLoot() {
    defenseBonus += this.value;
    updatePlayerStats();
    showStats();
}
function makeMagicStoneLoot() {
    return $.extend({'type': 'magicStone', 'scale': 1, 'onObtain': onObtainMagicStoneLoot}, magicStoneSource);
}
function onObtainMagicStoneLoot() {
    dungeonLevelCap += 2;
    // Display loot indication a bit longer for skill point bonus.
    lootCollectedTime = now() + 2000;
}
var lootInRadius = [];
var collectingLoot = [];
var coinsCollected, collectionBonus, initialMaxHealth, initialAttack, initialDefense;
var lootCollectedTime = 0;
function resetLootTotals() {
    collectionBonus = .9;
    coinsCollected = 0;
    updatePlayerStats();
    initialLevel = level;
    initialSkillPoints = getTotalSkillPoints();
    initialMaxHealth = maxHealth;
    initialAttack = getAttackWithoutHealthBonuses();
    initialDefense = getDefenseWithoutHealthBonuses();
}

function collectLoot() {
    if (collectingLoot.length) return;
    resetLootTotals()
    radius = minRadius;
    for (var loot of lootInRadius) collectingLoot.push(loot);
}
function isLootInRadius(loot) {
    var actualRadius = getCollectionRadius();
    var dx = currentPosition[0] - loot.x;
    var dy = currentPosition[1] - loot.y;
    return dx * dx + dy * dy < actualRadius * actualRadius;
}

function getCollectionRadius() {
    return Math.sqrt((1 + getSkillValue(skillTree.money.radius)) * radius * radius);
}


function updateLootCollection() {
    var currentPosition = getCurrentPosition();
    for (var i = 0; i < collectingLoot.length; i++) {
        // Pull coins towards the player's position, the front of the queue quicker than the rest.
        var factor = Math.min(10, 3 * i + 1);
        if (currentScene === 'dungeon') factor = 5;
        else if (fastMode) factor = 2;
        collectingLoot[i].x = collectingLoot[i].tx = (currentPosition[0] * 2 + collectingLoot[i].tx * factor) / (factor + 2);
        collectingLoot[i].y = collectingLoot[i].ty = (currentPosition[1] * 2 + collectingLoot[i].ty * factor) / (factor + 2);
    }
    // Collect all loot within range.
    for (var i = 0; i < collectingLoot.length; i++) {
        if (getDistance(currentPosition, [collectingLoot[i].x, collectingLoot[i].y]) < (fastMode ? gridLength / 10 : gridLength / 20)) {
            obtainloot(collectingLoot[i]);
            collectingLoot.splice(i--, 1);
        }
    }
    if (!collectingLoot.length) {
        // Gain bonus coins after all loot has been collected.
        coins += Math.round(coinsCollected * (collectionBonus - 1));
        saveGame();
    }
}

function obtainloot(loot) {
    lootCollectedTime = now();
    if (fastMode || currentScene === 'dungeon') {
        collectionBonus = 1;
    } else if (collectionBonus < 2) collectionBonus += .1;
    else collectionBonus += .05;
    var tile = loot.tile;
    if (tile.powerup === loot) tile.powerup = null;
    if (tile.gem === loot) tile.gem = null;
    var powerupIndex = activePowerups.indexOf(loot);
    if (powerupIndex >= 0) {
        activePowerups.splice(powerupIndex, 1);
    }
    if (loot.treasure.onObtain) loot.treasure.onObtain();
    tile.loot.splice(tile.loot.indexOf(loot), 1);
    if (!tile.exhausted) exhaustTile(tile);
}
function showStats() {
    hideStatsAt = now() + 1500;
}

function generateLootCoins(amount, limit) {
    var total = amount;
    var index = coinLoot.length - 1;
    var drops = 0;
    var loot = [];
    while (total > 0 && index >= 0 && drops < limit) {
        while (coinLoot[index].value <= total && drops < limit) {
            total -= coinLoot[index].value;
            loot.push(coinLoot[index]);
            drops++;
        }
        index--;
    }
    return loot;
}

var collectCoinsButton = {'target': {}};
function drawCollectCoinsButton() {
    context.save();
    var enabled = false
    var lootCount = 0;
    if (currentScene === 'dungeon') {
        lootCount = selectedTile.loot.length;
    } else {
        lootCount = lootInRadius.length;
    }
    if (!lootCount) context.globalAlpha = .6;
    context.textBaseline = 'middle';
    context.textAlign = 'left';
    context.font = Math.floor(3 * iconSize / 4) + 'px sans-serif';
    var metrics = context.measureText('x' + lootCount);

    var target = collectCoinsButton.target;
    target.width = iconSize - 10 + metrics.width;

    target.left = Math.floor((canvas.width - target.width) / 2);
    target.top = canvas.height - 10 - iconSize;
    target.height = iconSize;

    drawImage(context, chestSource.image, chestSource, {'left': target.left, 'top': target.top, 'width': iconSize, 'height': iconSize});

    embossText(context, 'x' + lootCount, 'white', 'black', target.left + iconSize - 10, canvas.height - 10 - iconSize / 2);
    context.restore();
}

function drawLootTotals(fadeTime) {
    fadeTime = ifdefor(fadeTime, 2000);
    if (now() > lootCollectedTime + fadeTime && (!fastMode || coinsCollected === 0)) return;
    var localIconSize = iconSize;
    context.save();
    context.globalAlpha = fastMode ? 1 : Math.min(1, 2 - (now() - lootCollectedTime) / (fadeTime / 2));
    var fontSize = Math.floor(3 * iconSize / 4);
    context.font = fontSize + 'px sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'bottom';
    var top = canvas.height / 2 + 2;
    if (coinsCollected > 0) {
        if (collectionBonus > 1) {
            embossText(context, coinsCollected.abbreviate() + 'x' + collectionBonus.toFixed(2), 'gold', 'black', canvas.width / 2, canvas.height / 2 - 2);
        } else {
            top = Math.floor((canvas.height - localIconSize) / 2);
        }
        context.textBaseline = 'middle';
        context.textAlign = 'left';
        var totalCoinsText = '+' + Math.round(coinsCollected * collectionBonus).abbreviate();
        var left = Math.floor(canvas.width / 2 - (context.measureText(totalCoinsText).width + localIconSize) / 2);
        embossText(context, totalCoinsText, 'gold', 'black', left + localIconSize, top + localIconSize / 2);
        drawImage(context, outlinedMoneySource.image, outlinedMoneySource, {'left':left, 'top': top, 'width': localIconSize, 'height': localIconSize});
    }
    var powerUpWidth = 0;
    var currentAttack = getAttackWithoutHealthBonuses();
    var currentDefense = getDefenseWithoutHealthBonuses();
    var healthBonusText = '+' + (maxHealth - initialMaxHealth).abbreviate();
    var attackBonusText = '+' + (currentAttack - initialAttack).abbreviate();
    var defenseBonusText = '+' + (currentDefense - initialDefense).abbreviate();
    if (maxHealth !== initialMaxHealth) powerUpWidth += localIconSize + context.measureText(healthBonusText).width;
    if (currentAttack !== initialAttack) powerUpWidth += localIconSize + context.measureText(attackBonusText).width;
    if (currentDefense !== initialDefense) powerUpWidth += localIconSize + context.measureText(defenseBonusText).width;
    if (level !== initialLevel) {
        context.textAlign = 'center';
        context.textBaseline = 'bottom';
        embossText(context, 'LEVEL UP', 'gold', 'black', canvas.width / 2, canvas.height / 2 - 2 * fontSize - 8);
    } else if (getTotalSkillPoints() !== initialSkillPoints) {
        context.textAlign = 'center';
        context.textBaseline = 'bottom';
        embossText(context, '+1 Skill Point', 'gold', 'black', canvas.width / 2, canvas.height / 2 - 2 * fontSize - 8);
    }
    if (powerUpWidth > 0) {
        var left = (canvas.width - powerUpWidth) / 2;
        context.textAlign = 'left';
        context.textBaseline = 'bottom';
        var bottom = canvas.height / 2 - fontSize - 4;
        if (maxHealth !== initialMaxHealth) {
            drawImage(context, heartSource.image, heartSource, {'left':left, 'top': bottom - localIconSize, 'width': localIconSize, 'height': localIconSize});
            embossText(context, healthBonusText, 'white', 'black', left + localIconSize, bottom);
            left += localIconSize + context.measureText(healthBonusText).width;
        }
        if (currentAttack !== initialAttack) {
            drawImage(context, swordSource.image, swordSource, {'left':left, 'top': bottom - localIconSize, 'width': localIconSize, 'height': localIconSize});
            embossText(context, attackBonusText, 'white', 'black', left + localIconSize, bottom);
            left += localIconSize + context.measureText(attackBonusText).width;
        }
        if (currentDefense !== initialDefense) {
            drawImage(context, shieldSource.image, shieldSource, {'left':left, 'top': bottom - localIconSize, 'width': localIconSize, 'height': localIconSize});
            embossText(context, defenseBonusText, 'white', 'black', left + localIconSize, bottom);
        }
    }
    context.restore();
}
