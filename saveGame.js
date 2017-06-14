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
        'gemData': [{'history': []}, {'history': []}, {'history': []}],
        'dungeonLevelCap': 2,
        'skillData': {}
    };
}
function loadSaveSlot(index) {
    saveSlotIndex = index;
    var defaults = newGameData();
    var saveSlot = saveSlots[saveSlotIndex];
    // We run fixSaveSlot once on load, but if something gets corrupted after that, we will
    // need to run it again on load to fix it. This wasn't a problem before when we could
    // not return to the title scene.
    saveSlot = fixSaveSlot(saveSlot);
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

    levelSums = [];
    gridData = {};
    for (var tileData of saveSlot.tileData) {
        var key = tileData.x + 'x' + tileData.y;
        gridData[key] = {'level': tileData.level, 'key': key, 'x': tileData.x, 'y': tileData.y, 'exhausted': tileData.exhausted, 'exhaustCounter': fixNumber(tileData.exhaustCounter)};
        initializeTile(gridData[key]);
    }

    dungeonLevelCap = saveSlot.dungeonLevelCap;

    usedSkillPoints = 0;
    for (var treeKey in skillTree) {
        var treeData = ifdefor(saveSlot.skillData[treeKey], {});
        treeBonuses[treeKey] = 0;
        for (var skillKey in skillTree[treeKey]) {
            skillTree[treeKey][skillKey].level = ifdefor(treeData[skillKey], 0);
            var pointsUsed = (skillTree[treeKey][skillKey].level * (skillTree[treeKey][skillKey].level + 1)) / 2;
            usedSkillPoints += pointsUsed;
            treeBonuses[treeKey] += pointsUsed;
        }
    }
    updatePlayerStats();
    currentGridCoords = null;
    clickedCoords = selectedTile = lastGoalPoint = null;
    hideStatsAt = now() + 2000;
    pushScene('map');
    clearAllGems();
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
    data.dungeonLevelCap = dungeonLevelCap;
    data.skillData = {};
    for (var treeKey in skillTree) {
        data.skillData[treeKey] = {};
        for (var skillKey in skillTree[treeKey]) {
            if (skillTree[treeKey][skillKey].level > 0) {
                data.skillData[treeKey][skillKey] = skillTree[treeKey][skillKey].level;
            }
        }
    }
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
    saveSlot.dungeonLevelCap = ifdefor(saveSlot.dungeonLevelCap, defaults.dungeonLevelCap);
    saveSlot.skillData = ifdefor(saveSlot.skillData, defaults.skillData);
    for (var i = 0; i < defaults.gemData.length; i++) {
        if (!saveSlot.gemData[i]) saveSlot.gemData[i] = defaults.gemData[i];
        for (var key in defaults.gemData[i]) {
            if (!saveSlot.gemData[i][key]) saveSlot.gemData[i][key] = defaults.gemData[i][key];
        }
    }
    return saveSlot
}

function fixNumber(value, defaultValue) {
    value = parseFloat(value);
    return isNaN(value) ? ifdefor(defaultValue, 0) : value;
}
