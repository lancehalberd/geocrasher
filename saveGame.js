var saveSlots = $.jStorage.get("geoGrasherSaves");
if (!saveSlots) saveSlots = [];
for (var i = 0; i < 3; i++) {
    saveSlots[i] = fixSaveSlot(ifdefor(saveSlots[i], {}));
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
        'tileData': [],
        'gemData': [{'history': []}, {'history': []}, {'history': []}]
    };
}
function loadSaveSlot(index) {
    saveSlotIndex = index;
    var defaults = newGameData();
    var saveSlot = saveSlots[saveSlotIndex];
    radius = saveSlot.radius;
    coins = saveSlot.coins;
    level = saveSlot.level;
    experience = saveSlot.experience;
    currentHealth = saveSlot.currentHealth;
    healthBonus = saveSlot.healthBonus;
    attackBonus = saveSlot.attackBonus;
    defenseBonus = saveSlot.defenseBonus;
    for (var i = 0; i < saveSlot.gemData.length; i++) {
        gemData[i].history = ifdefor(saveSlot.gemData[i].history, []);
    }

    gridData = {};
    for (var tileData of saveSlot.tileData) {
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
    data.gemData = [];
    for (var i = 0; i < gemData.length; i++) {
        data.gemData[i] = {'history': gemData[i].history};
    }
    return data;
}

/**
 * Due to changes in the code or bugs that may be released, sometimes the data
 * in a save file is no longer valid. This method is applied to each save slot
 * on load to correct any issues with the save data found vs what is expected.
 */
function fixSaveSlot(saveSlot) {
    var defaults = newGameData();
    saveSlot.radius = fixNumber(saveSlot.radius, defaults.radius);
    saveSlot.coins = fixNumber(saveSlot.coins, defaults.coins);
    saveSlot.level = fixNumber(saveSlot.level, defaults.level);
    saveSlot.experience = fixNumber(saveSlot.experience, defaults.experience);
    saveSlot.currentHealth = fixNumber(saveSlot.currentHealth, defaults.currentHealth);
    saveSlot.healthBonus = fixNumber(saveSlot.healthBonus, defaults.healthBonus);
    saveSlot.attackBonus = fixNumber(saveSlot.attackBonus, defaults.attackBonus);
    saveSlot.defenseBonus = fixNumber(saveSlot.defenseBonus, defaults.defenseBonus);
    saveSlot.tileData = ifdefor(saveSlot.tileData, defaults.tileData);
    saveSlot.gemData = ifdefor(saveSlot.gemData, defaults.gemData);
    for (var i = 0; i < defaults.gemData.length; i++) {
        if (!saveSlot.gemData[i]) saveSlot.gemData[i] = defaults.gemData[i];
        for (var key in defaults.gemData[i]) {
            if (!saveSlot.gemData[i][key]) saveSlot.gemData[i][key] = defaults.gemData[i][key];
        }
    }
    return saveSlot
}

function fixNumber(value, defaultValue) {
    value = parseInt(value);
    return isNaN(value) ? ifdefor(defaultValue, 0) : value;
}
