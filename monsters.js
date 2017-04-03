
var activeMonsters = [];
function makeMonster(tile) {
    var totalPower = tile.level / 2 + 2 * (getTilePower(tile) - 1);
    var monsterLevel = Math.floor(totalPower);
    var powerFactor = Math.pow(1.4, monsterLevel - 1) * (1 + (totalPower % 1) / 4);
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
    var health = Math.round(30 * powerFactor * healthRoll);
    var attack = Math.round(5 * powerFactor * attackRoll);
    var defense = Math.round(5 * powerFactor * defenseRoll);
    var minMonsterRadius = gridLength * 2 / 3;
    var maxMonsterRadius = gridLength * 4 / 3;
    return {
        'level': monsterLevel, 'name': name,
        'currentHealth': health,
        'maxHealth': health, 'attack': attack, 'defense': defense,
        'source': source,
        'experience': Math.round(powerFactor * 2),
        'radius': minMonsterRadius + (maxMonsterRadius - minMonsterRadius) * Math.random()
    };
}

function checkToGenerateMonster(tile) {
    // Monsters cannot spawn in shallows.
    if (tile.level < 1) return;
    // Prevent monster from spawning within 2 tiles of another monster
    for (var otherMonster of activeMonsters) {
        if (getDistance([tile.x, tile.y], [otherMonster.tile.x, otherMonster.tile.y]) <= 2) return;
    }
    // Chance to spawn a monster decreases with # of active monsters and the level of the tile.
    var chanceToSpawn = .5 * ((8 - activeMonsters.length) / 8) * ((maxLevel + 1 - tile.level) / (maxLevel));
    if (Math.random() > chanceToSpawn) return;
    tile.monster = makeMonster(tile);
    tile.monster.tile = tile;
    activeMonsters.push(tile.monster);
    if (tile === selectedTile) selectedTile = null;
}
