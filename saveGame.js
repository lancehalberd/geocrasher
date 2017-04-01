var saveSlots = $.jStorage.get("geoGrasherSaves");
if (!saveSlots) {
    saveSlots = [newGameData(), newGameData(), newGameData()];
}

function newGameData() {
    return {
        'radius': minRadius,
        'coins': 10,
        'level': 1,
        'experience': 0,
        'currentHealth': 100,
        'healthBonus': 100,
        'attackBonus': 8,
        'defenseBonus': 6,
        'tileData': []
    };
}
function loadSaveSlot(index) {
    saveSlotIndex = index;
    var defaults = newGameData();
    var saveSlot = saveSlots[saveSlotIndex];
    radius = ifdefor(saveSlot.radius, defaults.radius);
    coins = fixNumber(ifdefor(saveSlot.coins, defaults.coins));
    level = ifdefor(saveSlot.level, defaults.level);
    experience = ifdefor(saveSlot.experience, defaults.experience);
    currentHealth = ifdefor(saveSlot.currentHealth, defaults.currentHealth);
    healthBonus = ifdefor(saveSlot.healthBonus, defaults.healthBonus);
    attackBonus = ifdefor(saveSlot.attackBonus, defaults.attackBonus);
    defenseBonus = ifdefor(saveSlot.defenseBonus, defaults.defenseBonus);

    gridData = {};
    for (var tileData of ifdefor(saveSlot.tileData, [])) {
        var key = tileData.x + 'x' + tileData.y;
        gridData[key] = {'level': tileData.level, 'key': key, 'x': tileData.x, 'y': tileData.y, 'exhausted': tileData.exhausted, 'exhaustCounter': fixNumber(tileData.exhaustCounter)};
        initializeTile(gridData[key]);
    }
    updatePlayerStats();
    clickedCoords = selectedTile = lastGoalPoint = null;
    hideStatsAt = now() + 2000;
    currentScene = 'map';
    checkToSpawnGems();
}

function saveGame() {
    saveSlots[saveSlotIndex] = exportSaveSlot();
    $.jStorage.set("geoGrasherSaves", saveSlots);
}

function exportSaveSlot() {
    var data = {};
    data.radius = radius;
    data.coins = coins;
    data.tileData = [];
    data.level = level;
    data.experience = experience;
    data.currentHealth = currentHealth;
    data.healthBonus = healthBonus;
    data.attackBonus = attackBonus;
    data.defenseBonus = defenseBonus;
    for (var tileKey in gridData) {
        var tileData = gridData[tileKey];
        data.tileData.push({
            'level': tileData.level,
            'power': tileData.power,
            'exhausted': tileData.exhausted,
            'exhaustCounter': tileData.exhaustCounter,
            'x': tileData.x,
            'y': tileData.y
        });
    }
    return data;
}

function fixNumber(value, defaultValue) {
    value = parseInt(value);
    return isNaN(value) ? ifdefor(defaultValue, 0) : value;
}
