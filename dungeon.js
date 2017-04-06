var activeDungeons = [], currentDungeon, allFloors, currentFloor, dungeonPosition, dungeonLevelCap = 2;
function addDungeonToTile(tile, level) {
    var isQuestDungeon = level >= dungeonLevelCap;
    level = Math.min(dungeonLevelCap, level);
    var dungeon = {
        'level': level,
        'isQuestDungeon': isQuestDungeon,
        'name': isQuestDungeon ? 'Portal' : 'Hollow Shell',
        'numberOfFloors': Math.floor(Math.sqrt(level) / 2),
        'tile': tile,
        'source': isQuestDungeon ? portalSource : shellSource,
        'x': tile.x,
        'y': tile.y
    }
    if (isQuestDungeon) {
        dungeon.numberOfFloors++;
    }
    tile.dungeon = dungeon;
}

function enterDungeon(dungeon) {
    // A dungeon is consumed when it is visited.
    dungeon.tile.dungeon = null;
    currentDungeon = dungeon;
    pushScene('dungeon');
    allFloors = [];
    startNewFloor();
}
function exitDungeon() {
    origin = currentPosition;
    fightingMonster = null;
    selectedTile = null;
    currentScene = sceneStack.pop();
    refreshActiveTiles();
}
function startNewFloor() {
    fightingMonster = null;
    selectedTile = null;
    activeMonsters = [];
    currentFloor = {'grid': {}};
    allFloors.push(currentFloor);
    var tileThings = [{'type': 'upstairs', 'source': exitSource}];
    var numberOfMonsters = Random.range(8, 11);
    var minPower = currentDungeon.level * .9, maxPower = currentDungeon.level * 1.1;
    var floorPower = minPower + (maxPower - minPower) * allFloors.length / currentDungeon.numberOfFloors;
    for (var i = 0; i < numberOfMonsters; i++) {
        tileThings.push(makeMonster(floorPower - .2 + Math.random() * .4));
    }
    if (allFloors.length < currentDungeon.numberOfFloors) {
        tileThings.push({'type': 'downstairs', 'source': portalSource})
    }
    if (allFloors.length === currentDungeon.numberOfFloors) {
        tileThings.push(makeBossMonster(currentDungeon.level));
    }
    // Add at least one power up to each floor.
    do {
        var powerUpValue = (.8 + Math.random() * .4) * floorPower;
        tileThings.push({'treasure': getWeightedPowerup(powerUpValue), 'type': 'loot'});
    } while (tileThings.length < 25 && Math.random() < .1);

    var floorCoins = Math.ceil((.8 + Math.random() * .4) * (1 + treeBonuses.money / 50) * Math.pow(1.1, floorPower) * floorPower * 50);
    // Intentionally allow more coins than we can hold. Then what the player actually gets will be somewhat random.
    var coinDrops = generateLootCoins(floorCoins, 30);
    while (tileThings.length < 25 && coinDrops.length) {
        tileThings.push({'treasure': Random.removeElement(coinDrops), 'type': 'loot'});
    }
    var revealedTile;
    for (var y = -2; y <= 2; y++) {
        for (var x = -2; x <= 2; x++) {
            var tileKey = x + 'x' + y;
            var realCoords = toRealCoords([x, y]);;
            var newTile = {
                'x': x,
                'y': y,
                'centerX': realCoords[0] + gridLength / 2,
                'centerY': realCoords[1] + gridLength / 2,
                'key': tileKey,
                'contents': Random.removeElement(tileThings),
                'revealed': false,
                'guards': 0
            };
            if (newTile.contents) {
                newTile.contents.tile = newTile;
                if (newTile.contents.type === 'loot') {
                    var realCoords = toRealCoords([newTile.x, newTile.y]);
                    newTile.contents.tx = newTile.contents.x = realCoords[0] + gridLength / 2;
                    newTile.contents.ty = newTile.contents.y = realCoords[1] + gridLength / 2;
                    newTile.loot = [newTile.contents];
                }
                if (newTile.contents.type === 'upstairs') {
                    dungeonPosition = [x, y];
                    newTile.upstairs = true;
                    revealedTile = newTile;
                }
                if (newTile.contents.type === 'monster') {
                    newTile.monster = newTile.contents;
                }
            }
            currentFloor.grid[tileKey] = newTile;
        }
    }
    revealTile(revealedTile);
}

function updateDungeon() {
    if (fightingMonster) updateBattle(now());
    if (collectingLoot.length) updateLootCollection();
    if (damageIndicators.length) updateDamageIndicators();
}

function revealTile(tile) {
    if (tile.contents && tile.contents.type === 'loot') {
        resetLootTotals();
        setTimeout(function () {
            collectingLoot.push(tile.contents);
        }, 400);
    }
    if (tile.monster) {
        activeMonsters.push(tile.monster);
        for (var neighbor of getAllNeighbors(tile)) {
            neighbor.guards++;
        }
    }
    currentHealth = Math.min(maxHealth, currentHealth + Math.ceil(maxHealth / 20 + maxHealth * getSkillValue(skillTree.health.regeneration)));
    tile.revealed = true;
    for (var neighbor of getSideNeighbors(tile)) {
        neighbor.revealable = true;
    }
}

function getAllNeighbors(tile) {
    if (tile.neighbors) return tile.neighbors;
    tile.neighbors = [];
    for (var y = -1; y <= 1; y++) {
        for (var x = -1; x <= 1; x++) {
            if (x === 0 && y === 0) continue;
            var neighbor = currentFloor.grid[(tile.x + x) +'x' + (tile.y + y)];
            if (!neighbor) continue;
            tile.neighbors.push(neighbor);
        }
    }
    return tile.neighbors
}
function getSideNeighbors(tile) {
    if (tile.sideNeighbors) return tile.sideNeighbors;
    tile.sideNeighbors = [];
    for (var y = -1; y <= 1; y++) {
        for (var x = -1; x <= 1; x++) {
            if (x === 0 && y === 0 || (x !==0 && y !== 0)) continue;
            var neighbor = currentFloor.grid[(tile.x + x) +'x' + (tile.y + y)];
            if (!neighbor) continue;
            tile.sideNeighbors.push(neighbor);
        }
    }
    return tile.sideNeighbors
}

function handleDungeonClick(x, y) {
    // Hud interactions
    if (handleFightFleeButtonClick(x, y)) return;
    if (handleEnterExitButtonClick(x, y)) return;
    if (handleSkillButtonClick(x, y)) return;
    if (fightingMonster) return;
    if (selectedTile && selectedTile.loot && selectedTile.loot.length && isPointInRectObject(x, y, collectCoinsButton.target)) {
        resetLootTotals();
        for (var loot of selectedTile.loot) {
            if (collectingLoot.indexOf(loot) <= 0) collectingLoot.push(loot);
        }
        return;
    }
    // Tile interactions
    var clickedCoords = unproject([x, y]);
    var clickedGridCoords = toGridCoords(clickedCoords);
    var key = clickedGridCoords[0] + 'x' + clickedGridCoords[1];
    var tile = currentFloor.grid[key];
    if (!tile) return;
    var canRevealTile = tile.revealable && tile.guards <= 0;
    if (!tile.revealed && canRevealTile) {
        selectedTile = null;
        revealTile(tile);
        return;
    }
    if (tile === selectedTile && !fightingMonster) selectedTile = null;
    else if (tile.revealed || canRevealTile) {
        selectedTile = tile;
    }
}

function drawDungeonScene() {
    var scaleToUse = getActualScale();
    context.fillStyle = context.createPattern(darkStoneImage, 'repeat');
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = 'bold ' + Math.floor(gridLength * scaleToUse) + 'px sans-serif';
    var border = 3;
    var allRevealedTiles = []
    for (var y = -2; y <= 2; y++) {
        for (var x = -2; x <= 2; x++) {
            var tile = currentFloor.grid[x + 'x' + y];
            tile.target = getGridRectangle([tile.x, tile.y]);
            if (!tile.revealed) {
                var canReveal = tile.revealable && tile.guards <= 0;
                context.fillStyle = (tile === selectedTile) ? 'red' : '#444';
                fillRectangle(context, tile.target);
                context.fillStyle = (tile === selectedTile) ? '#f00' : '#eee';
                context.fillRect(tile.target.left, tile.target.top, tile.target.width - border, tile.target.height - border);
                context.fillStyle = (tile === selectedTile) ? '#600' : (canReveal ? '#bbb' : '#777');
                context.fillRect(tile.target.left + border, tile.target.top + border, tile.target.width - 2 * border, tile.target.height - 2 * border);
                context.fillStyle = (tile === selectedTile) ? 'red' : '#666';
                context.fillText('?', tile.target.left + tile.target.width / 2,tile.target.top + tile.target.height / 2);
                if (tile.guards) {
                    context.save();
                    context.globalAlpha = .4;
                    context.fillStyle = 'red';
                    fillRectangle(context, tile.target);
                    context.restore();
                }
                continue;
            }
            allRevealedTiles.push(tile);
            context.save();
            context.globalAlpha = .2;
            context.fillStyle = '#aaa';
            fillRectangle(context, tile.target);
            context.fillStyle = '#fff';
            context.fillRect(tile.target.left, tile.target.top, tile.target.width - border, tile.target.height - border);
            context.fillStyle = '#aaa';
            context.fillRect(tile.target.left + border, tile.target.top + border, tile.target.width - 2 * border, tile.target.height - 2 * border);
            context.restore();
            if (selectedTile === tile) {
                context.beginPath();
                context.rect(tile.target.left, tile.target.top, tile.target.width, tile.target.height);
                context.rect(tile.target.left + border, tile.target.top + border, tile.target.width - 2 * border, tile.target.height - 2 * border);
                context.fillStyle = 'green';
                context.fill('evenodd');
            }
        }
    }
    for (var tile of allRevealedTiles) {
        if (tile.contents) {
            if (tile.contents.type === 'loot') {
            } else if (tile.contents.type === 'monster') {
            } else {
                var source = tile.contents.source;
                if (source && source.image) {
                    if (tile=== selectedTile) drawOutlinedImage(context, source.image, 'red', 2, source, tile.target);
                    else drawImage(context, source.image, source, tile.target);
                }
                else console.log(source);
            }
        }
    }
    drawPerson();
    for (var tile of allRevealedTiles) {
        if (tile.loot) for (var loot of tile.loot) drawLoot(loot, scaleToUse);
        if (tile.monster) drawTileMonster(tile, scaleToUse);
    }
    drawSkillButton();
    drawDamageIndicators();
    drawCoinsIndicator();
    drawLootTotals(1000);
    var hideStatsIn = hideStatsAt - now();
    if (hideStatsIn > 0) {
        context.save();
        context.globalAlpha = Math.max(0, Math.min(1, hideStatsIn / 1000));
        playerStatsRectangle = drawStatsBox(5, 5, level, 'Hero', currentHealth, maxHealth, attack, defense, experience, experienceForNextLevel());
        context.restore();
    } else {
        drawLifeIndicator();
    }
    drawMonsterStats();
    if (selectedTile && selectedTile.x === dungeonPosition[0] && selectedTile.y === dungeonPosition[1]) {
        hideStatsAt = now() + 1500;
    }

    if (selectedTile && selectedTile.loot && selectedTile.loot.length) drawCollectCoinsButton();
    if (selectedTile && selectedTile.monster) drawFightFleeButton();
    if (selectedTile && (selectedTile.contents.type === 'upstairs' || selectedTile.contents.type === 'downstairs')) drawEnterExitButton();
}


var enterExitButton = {'target': {}};
function handleEnterExitButtonClick(x, y) {
    if (!selectedTile) return false;
    if (!isPointInRectObject(x, y, enterExitButton.target)) return false;
    // This is used on the world map.
    if (selectedTile.dungeon) {
        enterDungeon(selectedTile.dungeon);
        return true;
    }
    // The rest is for inside the dungeons.
    if (!selectedTile.contents) return false;
    if (selectedTile.contents.type === 'downstairs') {
        startNewFloor();
        return true;
    }
    if (selectedTile.contents.type === 'upstairs') {
        exitDungeon();
        return true;
    }
    return false;
}
function drawEnterExitButton() {
    if (!selectedTile) return;
    context.textBaseline = 'middle';
    context.textAlign = 'left';
    context.font = Math.floor(3 * iconSize / 4) + 'px sans-serif';
    var text = (selectedTile.dungeon || selectedTile.contents.type === 'downstairs') ? 'Enter' : 'Exit';
    var metrics = context.measureText(text);

    var target = enterExitButton.target;
    target.width = iconSize + metrics.width;
    target.left = Math.floor((canvas.width - target.width) / 2);
    target.top = canvas.height - 10 - iconSize;
    target.height = iconSize;

    drawImage(context, exitSource.image, shoeSource, {'left': target.left, 'top': target.top, 'width': iconSize, 'height': iconSize});

    embossText(context, text, 'gold', 'black', target.left + iconSize, canvas.height - 10 - iconSize / 2);
}


function drawDungeonStats() {
    if (!selectedTile || !selectedTile.dungeon) return;
    var dungeon = selectedTile.dungeon;
    var rectangle = selectedTile.target;
    var localIconSize = Math.floor(iconSize / 2);
    var text = 'Lv ' + dungeon.level + ' ' + dungeon.name;
    var fontSize = Math.floor(3 * localIconSize / 4);
    context.font = 'bold ' + fontSize + 'px sans-serif';
    var width = context.measureText(text).width + localIconSize / 2;
    var height = localIconSize * 1.5;
    var x = Math.floor(rectangle.left + (rectangle.width - width) / 2);

    if (x < 10) x = 10;
    if (x > canvas.width - width - 10) x = canvas.width - width - 10;
    var y = rectangle.top - height - 5;
    if (y < 10) y = 10;
    var padding = Math.floor(localIconSize / 4);
    var rectangle = {'left': x, 'top': y, 'width': width, 'height':  height};
    context.fillStyle = '#BBB';
    context.fillRect(x, y, width, height);
    context.fillStyle = '#FFF';
    context.fillRect(x + 1, y + 1, width - 2, height - 2);
    context.fillStyle = '#222';
    context.fillRect(x + 3, y + 3, width - 6, height - 6);
    context.textBaseline = 'middle';
    context.textAlign = 'left';
    context.fillStyle = '#C00';
    context.fillText(text, x + padding, y + padding + localIconSize / 2);
}
