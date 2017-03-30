
var activeMonsters = [];
function makeMonster(tile) {
    var powerFactor = Math.pow(4, tile.level - 1) * getTilePower(tile);
    var rollA = Random.range(-2, 2);
    var rollB = Random.range(-2, 2);
    var rollC = -rollA - rollB;
    var rolls = [1 + .2 * rollA, 1 + .2 * rollB, 1 + .2 * rollC];
    var health = Math.round(20 * powerFactor * Random.removeElement(rolls));
    var attack = Math.round(5 * powerFactor * Random.removeElement(rolls));
    var defense = Math.round(5 * powerFactor * Random.removeElement(rolls));
    var minMonsterRadius = gridLength * 2 / 3;
    var maxMonsterRadius = gridLength * 4 / 3;
    return {
        'level': tile.level, 'name': 'Snapper',
        'currentHealth': health,
        'maxHealth': health, 'attack': attack, 'defense': defense,
        'source': turtleSource,
        'experience': Math.round(powerFactor * 2),
        'radius': minMonsterRadius + (maxMonsterRadius - minMonsterRadius) * Math.random()
    };
}

function checkToGenerateMonster(tile) {
    // Monsters cannot spawn in shallows.
    if (tile.level < 1) return;
    // Prevent monster from spawning within 2 tiles of another monster
    for (var otherTile of activeTiles) {
        if (!otherTile.monster) continue;
        if (getDistance([tile.x, tile.y], [otherTile.x, otherTile.y]) <= 2) return;
    }
    // Chance to spawn a monster decreases with # of active monsters and the level of the tile.
    var chanceToSpawn = .5 * ((10 - activeMonsters.length) / 10) * ((maxLevel + 1 - tile.level) / (maxLevel));
    if (Math.random() > chanceToSpawn) return;
    tile.monster = makeMonster(tile);
    tile.monster.tile = tile;
    activeMonsters.push(tile.monster);
    if (tile === selectedTile) selectedTile = null;
}
