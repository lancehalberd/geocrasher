
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

function generateLootForTile(tile) {
    var coins = Math.ceil((.5 + Math.random()) * getTilePower(tile) * Math.pow(4, tile.level));
    var coinDrops = generateLootCoins(coins, 4 - tile.loot.length);
    var realCoords = toRealCoords([tile.x, tile.y]);
    for (var coinDrop of coinDrops) {
        tile.loot.push({'treasure': coinDrop, 'tile': tile,
            'x': realCoords[0] + gridLength / 2, 'y': realCoords[1] + gridLength / 2,
            'tx': realCoords[0] + Math.random() * gridLength, 'ty': realCoords[1] + Math.random() * gridLength});
    }
    checkToGeneratePowerUp(tile);
}

var activePowerups = [];
function checkToGeneratePowerUp(tile) {
    if (fastMode) return;
    // Monsters cannot spawn in shallows.
    if (tile.level < 1) return;
    // Chance to spawn a monster decreases with # of active monsters and the level of the tile.
    var chanceToSpawn = .5 * ((5 - activePowerups.length) / 5) * ((maxLevel + 1 - tile.level) / (maxLevel));
    if (Math.random() > chanceToSpawn) return;
    var value = Math.ceil((.4 + Math.random() * .2) * getTilePower(tile) * Math.pow(1.3, tile.level - 1));
    var lootMethod = Random.element(
        [makeHealthLoot, makeHealthLoot, makeHealthLoot, makeHealthLoot,
         makeHealthLoot, makeHealthLoot, makeHealthLoot, makeHealthLoot,
         makeAttackLoot, makeAttackLoot, makeAttackLoot,
         makeDefenseLoot, makeDefenseLoot]);
    var loot = {'treasure': lootMethod(value), 'tile': tile,
        'x': tile.centerX, 'y': tile.centerY,
        'tx': tile.centerX + (Math.random() - 0.5) * gridLength,
        'ty': tile.centerY + (Math.random() - 0.5) * gridLength};
    tile.loot.push(loot);
    activePowerups.push(loot);
}

function makeHealthLoot(value) {
    return $.extend({'value': 4 * value, 'type': 'health', 'scale': .4, 'onObtain': onObtainHealthLoot}, heartSource);
}
function onObtainHealthLoot() {
    healthBonus += this.value;
    updatePlayerStats();
    currentHealth = Math.min(maxHealth, currentHealth + Math.round(2 * this.value * getLevelBonus()));
    showStats();
}
function makeAttackLoot(value) {
    return $.extend({'value': value, 'type': 'attack', 'scale': .5, 'onObtain': onObtainAttackLoot}, swordSource);
}
function onObtainAttackLoot() {
    attackBonus += this.value;
    updatePlayerStats();
    showStats();
}
function makeDefenseLoot(value) {
    return $.extend({'value': value, 'type': 'defense', 'scale': .5, 'onObtain': onObtainDefenseLoot}, shieldSource);
}
function onObtainDefenseLoot() {
    defenseBonus += this.value;
    updatePlayerStats();
    showStats();
}
var lootInRadius = [];
var collectingLoot = [];
var coinsCollected, collectionBonus, initialMaxHealth, initialAttack, initialDefense;
var lootCollectedTime = 0;
function resetLootTotals() {
    collectionBonus = .9;
    coinsCollected = 0;
    initialMaxHealth = maxHealth;
    initialAttack = attack;
    initialDefense = defense;
}

function collectLoot() {
    if (collectingLoot.length) return;
    resetLootTotals()
    radius = minRadius;
    for (var loot of lootInRadius) collectingLoot.push(loot);
}
function isLootInRadius(loot) {
    var dx = currentPosition[0] - loot.x;
    var dy = currentPosition[1] - loot.y;
    return dx * dx + dy * dy < radius * radius;
}


function updateLootCollection() {
    for (var i = 0; i < collectingLoot.length; i++) {
        // Pull coins towards the player's position, the front of the queue quicker than the rest.
        var factor = Math.min(10, fastMode ? 2 : (3 * i + 1));
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
    if (fastMode) {
        collectionBonus = 1;
    } else if (collectionBonus < 2) collectionBonus += .1;
    else collectionBonus += .05;
    var tile = loot.tile;
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
    if (!lootInRadius.length) context.globalAlpha = .6;
    context.textBaseline = 'middle';
    context.textAlign = 'left';
    context.font = Math.floor(3 * iconSize / 4) + 'px sans-serif';
    var metrics = context.measureText('x' + lootInRadius.length);

    var target = collectCoinsButton.target;
    target.width = iconSize - 10 + metrics.width;

    target.left = Math.floor((canvas.width - target.width) / 2);
    target.top = canvas.height - 10 - iconSize;
    target.height = iconSize;

    drawImage(context, chestSource.image, chestSource, {'left': target.left, 'top': target.top, 'width': iconSize, 'height': iconSize});

    embossText(context, 'x' + lootInRadius.length, 'white', 'black', target.left + iconSize - 10, canvas.height - 10 - iconSize / 2);
    context.restore();
}
