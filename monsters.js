
var activeMonsters = [];
function getMonsterPowerForTile(tile) {
    return tile.level / 2 + 2 * (getTilePower(tile) - 1);
}
function makeBossMonster(monsterPower) {
    var boss = makeMonster(monsterPower);
    boss.maxHealth = boss.currentHealth = boss.maxHealth * 3;
    boss.attack = Math.ceil(boss.attack * .8);
    boss.defense = Math.ceil(boss.defense * 1.5);
    boss.experience *= 4;
    boss.isBoss = true;
    boss.tint = 'red';
    boss.tintAmount = .6;
    return boss;
}
function makeMonster(monsterPower) {
    var monsterLevel = Math.max(1, Math.floor(monsterPower));
    var powerFactor = Math.pow(1.4, monsterLevel - 1) * (1 + Math.max(0, monsterPower - monsterLevel) / 4);
    //var powerFactor = Math.pow(3, tile.level - 1) * getTilePower(tile);
    var rollA = Random.range(-2, 2);
    var rollB = Random.range(-2, 2);
    var rollC = -rollA - rollB;
    var rolls = [1 + .2 * rollA, 1 + .2 * rollB, 1 + .2 * rollC];
    var healthRoll = Random.removeElement(rolls);
    var attackRoll = Random.removeElement(rolls);
    var defenseRoll = Random.removeElement(rolls);
    var name = 'Giant Bug', source = bugSource;
    if (healthRoll > attackRoll && healthRoll > defenseRoll) {
        name = 'Shroomie';
        source = fungusSource;
    } else if (attackRoll > healthRoll && attackRoll > defenseRoll) {
        name = 'Pincher';
        source = crabSource;
    } else if (defenseRoll > attackRoll && defenseRoll > healthRoll) {
        name = 'Iron Shell';
        source = turtleSource;
    } else if (defenseRoll === attackRoll) {
        name = 'Giant Bug';
        source = bugSource;
    } else if (defenseRoll >= healthRoll && defenseRoll >= defenseRoll) {
        name = 'Guard Snail';
        source = snailSource;
    } else if (attackRoll >= healthRoll && attackRoll >= defenseRoll) {
        name = 'Stinger';
        source = waspSource;
    }
    // console.log([healthRoll, attackRoll, defenseRoll, name]);
    var statReduction = 1 - getSkillValue(skillTree.money.conquerer);
    var health = Math.round(30 * powerFactor * healthRoll * statReduction);
    var attack = Math.round(5 * powerFactor * attackRoll * statReduction);
    var defense = Math.round(5 * powerFactor * defenseRoll * statReduction);
    var minMonsterRadius = gridLength * 2 / 3;
    var maxMonsterRadius = gridLength * 4 / 3;
    return {
        'level': monsterLevel, 'name': name,
        'type': 'monster',
        'currentHealth': health,
        'maxHealth': health, 'attack': attack, 'defense': defense,
        'source': source,
        'experience': Math.round(powerFactor * 2),
        'radius': minMonsterRadius + (maxMonsterRadius - minMonsterRadius) * Math.random()
    };
}

function checkToGenerateMonster(tile, baseChance) {
    baseChance = ifdefor(baseChance, .05);
    // Monsters cannot spawn in shallows.
    if (tile.level < 1) return;
    // Prevent monster from spawning within 2 tiles of another monster
    for (var otherMonster of activeMonsters) {
        if (getDistance([tile.x, tile.y], [otherMonster.tile.x, otherMonster.tile.y]) <= 2) return;
    }
    // Chance to spawn a monster decreases with # of active monsters and the level of the tile.
    var chanceToSpawn = baseChance * ((8 - activeMonsters.length) / 8) * ((maxLevel + 1 - tile.level) / (maxLevel));
    if (Math.random() > chanceToSpawn) return;
    tile.monster = makeMonster(getMonsterPowerForTile(tile));
    tile.monster.tile = tile;
    activeMonsters.push(tile.monster);
    if (tile === selectedTile) selectedTile = null;
}

function drawTileMonster(tile, scaleToUse) {
    var monster = tile.monster;
    var tileTarget = tile.target;
    var source = tile.monster.source;
    var monsterScale = .8;
    if (monster.maxHealth < maxHealth / 2 && monster.attack < attack && monster.defense < defense) monsterScale =  .6;
    else if (monster.maxHealth > maxHealth / 2 && monster.attack > attack && monster.defense > defense) monsterScale = 1;
    if (monster.isBoss) monsterScale = 1;
    var targetWidth = Math.round(Math.min(tileTarget.width * .9, 128) * monsterScale);
    var targetHeight = Math.round(Math.min(tileTarget.height * .9, 128) * monsterScale);
    var target = {
        'left': tileTarget.left + (tileTarget.width - targetWidth) / 2,
        'top': tileTarget.top + (tileTarget.height - targetHeight) / 2,
        'width': targetWidth, 'height': targetHeight
    };

    var sourceImage = source.image;
    var sourceRectangle = source;
    if (monster.tint) {
        prepareTintedImage();
        sourceImage = getTintedImage(sourceImage, monster.tint, monster.tintAmount, sourceRectangle);
        sourceRectangle = {'left': 0, 'top': 0, 'width': sourceRectangle.width, 'height': sourceRectangle.height};
    }
    if (tile === selectedTile) {
        drawOutlinedImage(context, sourceImage, 'red', 2, sourceRectangle, target);
        context.save();
        context.globalAlpha = .15;
        context.fillStyle = 'red';
        context.beginPath();
        context.arc(tileTarget.left + tileTarget.width / 2, tileTarget.top + tileTarget.height / 2,
                    tile.monster.radius * scaleToUse, 0, 2 * Math.PI);
        context.fill();
        context.restore();
    } else {
        drawImage(context, sourceImage, sourceRectangle, target);
    }
    if (monster.currentHealth < monster.maxHealth || tile === selectedTile) {
        drawBar(context, Math.round(target.left + target.width / 6), target.top - 5,
                Math.round(target.width * 2 / 3), 6, 'white', 'red',
                monster.currentHealth / monster.maxHealth);
    }
}

function drawMonsterStats() {
    if (!selectedTile || !selectedTile.monster) return;
    var monster = selectedTile.monster;
    var rectangle = selectedTile.target;
    hideStatsAt = now() + 1500;
    var x = canvas.width - playerStatsRectangle.width - 5;
    var y = rectangle.top + rectangle.height;

    if (y + playerStatsRectangle.height > canvas.height - iconSize) y = canvas.height - playerStatsRectangle.height - iconSize;
    if (y < iconSize) y = iconSize;
    drawStatsBox(x, y, monster.level, monster.name, monster.currentHealth, monster.maxHealth, monster.attack, monster.defense);
}
