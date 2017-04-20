var currentMap, hadTreasureMaps = false, treasureMaps = 100;

// Could make this flat 3 maps per pickup, but trying to use value for now
function makeTreasureMapLoot(value) {
    return $.extend({'value': Math.ceil(value), 'type': 'treasureMap', 'scale': .5, 'onObtain': onObtainTreasureMap}, treasureMapSource);
}
function onObtainTreasureMap() {
    treasureMaps += this.value;
    hadTreasureMaps = true;
}
function makeNewMap() {
    var size = 3 + Math.ceil(Math.sqrt(level));
    return makeMap(size);
}
function makeMap(size) {
    var map = {'grid': {}, 'size': size};
    for (var row = 0; row < size; row++) {
        for (var col = 0; col < size; col++) {
            var tileKey = col + 'x' + row;
            var realCoords = toRealCoords([col, row]);
            var newTile = {
                'x': col,
                'y': row,
                'centerX': realCoords[0] + gridLength / 2,
                'centerY': realCoords[1] + gridLength / 2,
                'key': tileKey,
                'contents': null,
                'revealed': false,
                'guards': 0
            };
            map.grid[tileKey] = newTile;
        }
    }
    return map;
}
function exportTreasureMapsData (data) {
    data.hadTreasureMaps = hadTreasureMaps;
    data.treasureMaps = treasureMaps;
    if (currentMap) {
        data.currentMap = {'size': currentMap.size};
        if (currentMap.revealed) {
            data.currentMap.treasureX = currentMap.treasureX;
            data.currentMap.treasureY = currentMap.treasureY;
            data.currentMap.revealed = currentMap.revealed;
            if (currentMap.revealed[currentMap.treasureY][currentMap.treasureX]) {
                var treasureTile = currentMap.grid[currentMap.treasureX + 'x' + currentMap.treasureY];
                data.currentMap.level = treasureTile.dungeon.level;
            }
        }
    }
}
function importTreasureMapsData(saveSlot) {
    hadTreasureMaps = saveSlot.hadTreasureMaps;
    treasureMaps = saveSlot.treasureMaps;
    var savedMap = saveSlot.currentMap;
    if (savedMap) {
        currentMap = makeMap(savedMap.size);
        if (savedMap.revealed) {
            currentMap.treasureX = savedMap.treasureX;
            currentMap.treasureY = savedMap.treasureY;
            currentMap.grid[currentMap.treasureX + 'x' + currentMap.treasureY].contents = 'T';
            currentMap.revealed = [];
            for (var row = 0; row < currentMap.size; row++) {
                currentMap.revealed[row] = savedMap.revealed[row].slice();
            }
            if (currentMap.revealed[currentMap.treasureY][currentMap.treasureX]) {
                var treasureTile = currentMap.grid[currentMap.treasureX + 'x' + currentMap.treasureY];
                addDungeonToTile(treasureTile, savedMap.level);
            }
        }
    } else {
        currentMap = null;
    }
}
// I don't ever want people to find the treasure on their first click, so we populate
// the map the first time a user clicks a cell. This is similar to how mine sweeper prevents
// user's from clicking on a mine on their first click.
function populateNewMap(map, x, y) {
    var grid = map.grid;
    var size = map.size;
    var treasureX, treasureY;
    while (true) {
        treasureY = Random.range(0, size - 1);
        treasureX = Random.range(0, size - 1);
        if (treasureX == x && treasureY == y) continue;
        grid[treasureX + 'x' + treasureY].contents = 'T';
        map.treasureX = treasureX;
        map.treasureY = treasureY;
        break;
    }
    map.revealed = [];
    for (var row = 0; row < size; row++) map.revealed[row] = [];
}
function displayTreasureMap() {
    selectedTile = null;
    fightingMonster = null;
    if (!currentMap) {
        currentMap = makeNewMap();
    } else if (currentMap.revealed) {
        if (currentMap.revealed[currentMap.treasureY][currentMap.treasureX]) {
            selectedTile = currentMap.grid[currentMap.treasureX + 'x' + currentMap.treasureY];
        }
    }
    pushScene('treasureMap');
}
function hideTreasureMap() {
    selectedTile = null;
    origin = currentPosition;
    currentScene = sceneStack.pop();
    refreshActiveTiles();
}
function updateTreasureMap() {
    // Once the treasure is revealed, reveal all the squares on the map.
    if (!currentMap.revealed) return;
    if (!currentMap.revealed[currentMap.treasureY][currentMap.treasureX]) return;
    // Only reveal one per frame to make it less jarring.
    for (var row = 0; row < currentMap.size; row++) {
        for (var column = 0; column < currentMap.size; column++) {
            if (!currentMap.revealed[row][column]) {
                currentMap.revealed[row][column] = true;
                return;
            }
        }
    }
}

function revealTreasureMapTile(x, y) {
    if (!treasureMaps) return;
    if (x < 0 || y <0 || x >= currentMap.size || y >= currentMap.size) return;
    // Populate the map if the revealed table doesn't exist yet.
    if (!currentMap.revealed) populateNewMap(currentMap, x, y);
    if (!currentMap.revealed[y][x]) {
        currentMap.revealed[y][x] = true;
        treasureMaps--;
        var tile = currentMap.grid[x + 'x' + y];
        if (tile.contents === 'T') {
            selectedTile = tile;
            // This will be either the player level or the dungeon cap, whichever happens
            // to be lower.
            addDungeonToTile(tile, level);
        }
        saveGame();
    }
}


function handleTreasureMapClick(x, y) {
    // Hud interactions
    if (handleTreasureMapButtonClick(x, y)) return;
    // This only appears once the treasure is found and it is a dungeon entrance.
    if (handleEnterExitButtonClick(x, y)) return;
    // Tile interactions
    var clickedCoords = unproject([x, y]);
    var clickedGridCoords = toGridCoords(clickedCoords);
    revealTreasureMapTile(clickedGridCoords[0], clickedGridCoords[1]);
}

function drawTreasureMapScene() {
    var scaleToUse = getActualScale();
    context.fillStyle = context.createPattern(darkStoneImage, 'repeat');
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = 'bold ' + Math.floor(gridLength * scaleToUse) + 'px sans-serif';
    var border = 3;
    var mapPattern = context.createPattern(oldMapImage, 'repeat');
    for (var y = 0; y < currentMap.size; y++) {
        for (var x = 0; x < currentMap.size; x++) {
            var tile = currentMap.grid[x + 'x' + y];
            tile.target = getGridRectangle([tile.x, tile.y]);
            if (!currentMap.revealed || !currentMap.revealed[y][x]) {
                var canReveal = tile.revealable && tile.guards <= 0;
                context.fillStyle = mapPattern;
                fillRectangle(context, tile.target);
                context.beginPath();
                drawRectangle(context, tile.target);
                drawRectangle(context, shrinkRectangle(tile.target, 2));
                context.fillStyle = '#444';
                context.fill('evenodd');
                context.fillStyle = '#666';
                context.fillText('?', tile.target.left + tile.target.width / 2,tile.target.top + tile.target.height / 2);
                continue;
            }
            var distance = Math.abs(y - currentMap.treasureY) + Math.abs(x - currentMap.treasureX);
            var source = grassSource;
            if (distance > 6) {
                source = oceanSource;
            } else if (distance > 3) {
                source = shallowSource;
            } else if (distance > 0) {
                source = sandSource;
            }
            drawImage(context, source.image, source, tile.target);
            if (tile.dungeon) {
                drawOutlinedImage(context, tile.dungeon.source.image, 'red', 1, tile.dungeon.source, tile.target);
            } else if (tile.contents === 'T') {
                drawImage(context, chestSource.image, chestSource, tile.target);
            } /*else if (tile.contents) {
                context.save();
                context.fillStyle = '#040';
                context.globalAlpha = .3
                context.translate(tile.target.left + tile.target.width / 2, tile.target.top + tile.target.height / 2)
                if (tile.contents === '^') {
                    context.rotate(Math.PI);
                } else if (tile.contents === '<') {
                    context.rotate(Math.PI / 2);
                } else if (tile.contents === '>') {
                    context.rotate(- Math.PI / 2);
                }
                context.fillText('v', 0, 0);
                context.restore();
            }*/
        }
    }
    if (selectedTile && selectedTile.dungeon) drawDungeonStats();
    drawTreasureMapButton();
    drawCoinsIndicator();
    drawLootTotals(1000);
    drawLifeIndicator();
    if (selectedTile) drawEnterExitButton();
}

var treasureMapButton = {'target': {}};
function isTreasureMapButtonVisible() {
    return hadTreasureMaps || treasureMaps;
}
function isTreasureMapButtonClickable() {
    return !fightingMonster && !collectingLoot.length && (hadTreasureMaps || treasureMaps);
}
function handleTreasureMapButtonClick(x, y) {
    if (!isTreasureMapButtonVisible()) return false;
    if (!isTreasureMapButtonClickable()) return false;
    if (!isPointInRectObject(x, y, treasureMapButton.target)) return false;
    if (currentScene === 'treasureMap') hideTreasureMap();
    else displayTreasureMap();
    return true;
}
function drawTreasureMapButton() {
    if (!isTreasureMapButtonVisible()) return;
    context.textBaseline = 'middle';
    context.textAlign = 'right';
    context.font = Math.floor(iconSize / 3) + 'px sans-serif';
    var metrics = context.measureText('x' + treasureMaps);

    var target = treasureMapButton.target;
    target.width = iconSize;
    target.left = 10;
    target.top = canvas.height - 10 - iconSize;
    target.height = iconSize;

    drawImage(context, treasureMapSource.image, treasureMapSource,
        {'left': target.left, 'top': target.top, 'width': iconSize, 'height': iconSize});

    embossText(context, 'x' + treasureMaps, 'white', 'black', target.left + Math.floor(iconSize * .8) , target.top + 3 * target.height / 4);
}
