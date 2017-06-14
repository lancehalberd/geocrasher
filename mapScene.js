
var lootInMonsterRadius = [];
function updateMap() {
    lootInRadius = [];
    lootInMonsterRadius = [];
    if (collectingLoot.length) {
        updateLootCollection();
    }
    for (var tileData of activeTiles) {
        for (var i = 0; i < tileData.loot.length; i++) {
            var loot = tileData.loot[i];
            // Remove all non coin loot during fastMode.
            if (fastMode && loot === tileData.powerup) {
                tileData.powerup = null;
                tileData.loot.splice(i--, 1);
                continue;
            }
            if (fastMode && loot === tileData.gem) {
                tileData.gem = null;
                tileData.loot.splice(i--, 1);
                continue;
            }
            loot.x = (loot.x + loot.tx) / 2;
            loot.y = (loot.y + loot.ty) / 2;
            loot.inRadius = isLootInRadius(loot);
            loot.inMonsterRadius = !fastMode && !loot.treasure.gem && isPointInMonsterRadius(loot.x, loot.y);
            if (fastMode && loot.inRadius) {
                if (collectingLoot.indexOf(loot) < 0) collectingLoot.push(loot);
            } else if (loot.inRadius && !loot.inMonsterRadius) {
                lootInRadius.push(loot);
            }
            if (loot.inMonsterRadius) {
                lootInMonsterRadius.push(loot);
            }
        }
    }
    if (fightingMonster) updateBattle(now());
    if (damageIndicators.length) updateDamageIndicators();
}
function handleMapClick(x, y) {
    if (fastMode || fixingGPS) return;
    if (!selectedTile && lootInRadius.length && collectingLoot.length === 0 && isPointInRectObject(x, y, collectCoinsButton.target)) {
        collectLoot();
        return;
    }
    if (handleSkillButtonClick(x, y)) return;
    if (handleFightFleeButtonClick(x, y)) return;
    if (handleEnterExitButtonClick(x, y)) return;
    if (selectedTile && !selectedTile.monster && !selectedTile.dungeon && canUpgradeTile(selectedTile) && isPointInRectObject(x, y, upgradeButton.target)) {
        upgradeTile(selectedTile);
        return;
    }
    clickedCoords = unproject([x, y]);
    var clickedGridCoords = toGridCoords(clickedCoords);
    if (tileIsExplored(clickedGridCoords) && !fightingMonster) {
        if (!selectedTile || selectedTile.x !== clickedGridCoords[0] || selectedTile.y !== clickedGridCoords[1]){
            var clickedTile = getTileData(clickedGridCoords);
            if (selectableTiles.indexOf(clickedTile) >= 0) selectedTile = clickedTile;
        } else {
            selectedTile = null;
        }
    }
}

var direction = 'right';
var directionOffsets = {
    'down': 0,
    'left': 48,
    'up': 96,
    'right': 144
};
var walkOffsets = [0, 48, 0, 96], walkTime = 0;
function drawPerson() {
    var personPosition = getCurrentPosition();
    if (!personPosition) return;
    // draw current location
    var point = project(personPosition);
    var scaleToUse = getActualScale();
    var targetSize = Math.round(Math.min(gridLength * scaleToUse * .7, 64));
    var personDirection = direction;
    if (currentDungeon) {
        targetSize = Math.round(gridLength * scaleToUse * 1.2);
        personDirection = 'down';
    }
    var frame = Math.floor(walkTime / 250) % walkOffsets.length;
    var source = {
        'left': walkOffsets[frame],
        'top': directionOffsets[personDirection] + 1,
        'width': personSource.width, 'height': personSource.height - 1
    }
    var target = {
        'left': point[0] - Math.round(targetSize / 2),
        'top': point[1] - targetSize,
        'width': targetSize, 'height': targetSize
    };
    drawOutlinedImage(context, personSource.image, 'white', 1, source, target);
}
function drawMapScene() {
    drawGrid();
    drawPerson();
    if (currentPosition && (fastMode || collectingLoot.length === 0)) {
        var point = project(currentPosition);
        context.save();
        context.globalAlpha = .3;
        context.strokeStyle = 'gold';
        context.lineWidth = 4;
        context.beginPath();
        context.arc(point[0], point[1], getCollectionRadius() * getActualScale(), 0 , 2 * Math.PI);
        context.stroke();
        context.restore();
    }

    if (damageIndicators.length) drawDamageIndicators();

    if (selectedTile && !selectedTile.monster && !selectedTile.dungeon) {
        var rectangle = getGridRectangle([selectedTile.x, selectedTile.y]);
        var canUpgrade = canUpgradeTile(selectedTile);
        context.save();
        context.globalAlpha = .4;
        context.fillStyle = canUpgrade ? 'green' : 'red';
        var thickness = 4;
        context.fillRect(rectangle.left, rectangle.top, rectangle.width, thickness);
        context.fillRect(rectangle.left, rectangle.top + rectangle.height - thickness, rectangle.width, thickness);
        context.fillRect(rectangle.left, rectangle.top + thickness, thickness, rectangle.height - 2 * thickness);
        context.fillRect(rectangle.left + rectangle.width - thickness, rectangle.top + thickness, thickness, rectangle.height - 2 * thickness);
        context.restore();
        drawUpgradeButton(canUpgrade, costToUpgrade(selectedTile));
    }
    var hideStatsIn = hideStatsAt - now();
    if (!fastMode && !fixingGPS && (hideStatsIn > 0 || !playerStatsRectangle)) {
        context.save();
        context.globalAlpha = Math.max(0, Math.min(1, hideStatsIn / 1000));
        playerStatsRectangle = drawStatsBox(5, 5, level, 'Hero', currentHealth, maxHealth, attack, defense, experience, experienceForNextLevel());
        context.restore();
    } else {
        drawLifeIndicator();
    }
    if (selectedTile && selectedTile.x === currentGridCoords[0] && selectedTile.y === currentGridCoords[1]) {
        hideStatsAt = now() + 1500;
    }
    drawMonsterStats();
    if (selectedTile && selectedTile.dungeon) drawDungeonStats();
    // collect coins button is replaced by 'Fight!' button when a monster is selected.
    if (fixingGPS) {
        var fontSize = Math.floor(3 * iconSize / 4);
        context.font = fontSize + 'px sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'bottom';
        var text = 'Updating';
        for (var i = 0; i < (endFixingGPSTime - now()) / 1000; i++) {
            text = '-' + text + '-';
        }
        embossText(context, text, 'gold', 'black', canvas.width / 2, canvas.height - 10);
    } else if (fastMode) {
        var fontSize = Math.floor(3 * iconSize / 4);
        context.font = fontSize + 'px sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'bottom';
        var text = 'Fast Mode';
        for (var i = 0; i < (endFastModeTime - now()) / 2000; i++) {
            text = '-' + text + '-';
        }
        embossText(context, text, 'gold', 'black', canvas.width / 2, canvas.height - 10);
    } else {
        if (!selectedTile) {
            if (collectingLoot.length === 0) drawCollectCoinsButton();
        } else if (selectedTile.monster) drawFightFleeButton();
        else if (selectedTile.dungeon) drawEnterExitButton();
        drawGemIndicators();
        drawSkillButton();
    }

    drawCoinsIndicator();
    drawLootTotals();
}
var playerStatsRectangle;

function drawCoinsIndicator() {
    var localIconSize = Math.floor(iconSize / 2);
    var coinsText = coins.abbreviate();
    var fontSize = Math.floor( localIconSize * .9);
    context.font = fontSize + 'px sans-serif';
    context.textAlign = 'left'
    context.textBaseline = 'middle';
    var metrics = context.measureText(coinsText)
    var margin = 10;
    var left = canvas.width - margin - metrics.width - margin - localIconSize - margin;
    var top = margin;
    drawImage(context, outlinedMoneySource.image, outlinedMoneySource, {'left': left, 'top': margin, 'width': localIconSize, 'height': localIconSize});
    embossText(context, coinsText, 'gold', 'white', left + localIconSize, margin + Math.round(localIconSize / 2));
}

function drawLifeIndicator() {
    var localIconSize = Math.floor(iconSize / 2);
    var fontSize = Math.floor(3 * localIconSize / 4);
    context.font = fontSize + 'px sans-serif';
    context.textAlign = 'left';
    context.textBaseline = 'top';

    drawImage(context, heartSource.image, heartSource, {'left': 10, 'top': 10, 'width': localIconSize, 'height': localIconSize});
    embossText(context, currentHealth.abbreviate() + ' / ' + maxHealth.abbreviate(), 'red', 'white', 10 + localIconSize + 5, 10);
    drawBar(context, 10, 10 + localIconSize + 5, localIconSize * 4, 6, 'white', 'red', currentHealth / maxHealth);
}

var upgradeButton = {'target': {}};
function drawUpgradeButton(canUpgrade, cost) {
    context.save();
    if (cost > coins || !canUpgrade) context.globalAlpha = .5;
    context.textBaseline = 'middle';
    context.textAlign = 'left';
    context.font = Math.floor(3 * iconSize / 4) + 'px sans-serif';
    var text = canUpgrade ? '-' + cost.abbreviate() : '---';
    var metrics = context.measureText(text);
    var target = upgradeButton.target;
    target.width = iconSize + metrics.width;
    target.left = Math.floor((canvas.width - target.width) / 2);
    target.top = canvas.height - 10 - iconSize;
    target.height = iconSize;

    drawSolidTintedImage(context, upArrows.image, (cost <= coins && canUpgrade) ? 'green' : 'red', upArrows, {'left': target.left, 'top': target.top, 'width': iconSize, 'height': iconSize});
    embossText(context, text, (cost <= coins) ? 'white' : 'red', 'black', target.left + iconSize, canvas.height - 10 - iconSize / 2);

    context.restore();
}

function upgradeTile(tile) {
    var cost = costToUpgrade(tile);
    if (!cost || coins < cost) return;
    tile.level++;
    delete tile.canvas;
    for (var neighborKey in tile.neighbors) {
        delete tile.neighbors[neighborKey].canvas;
    }
    coins -= cost;
    for (var i = 0; i <= tile.level; i++) {
        levelSums[i] = ifdefor(levelSums[i], 0) + 1;
    }
    tile.exhausted = false;
    checkToGenerateLootForTile(tile);
    checkToGenerateMonster(tile, .5);
    selectedTile = null;
    saveGame();
}
function canUpgradeTile(tile) {
    var neighborSum = 0;
    var numNeighbors = 0;
    for (var key in tile.neighbors) {
        numNeighbors++;
        var neighbor = tile.neighbors[key];
        neighborSum += neighbor.level;
    }
    return (numNeighbors >= 8) && (neighborSum >= (8 * tile.level));
}
function costToUpgrade(data) {
    if (data.level >= maxLevel) return false;
    var cost = 5;
    for (var i = 1; i <= data.level + 1; i++) {
        cost += 2 * (ifdefor(levelSums[i], 0) + 1) * Math.pow(10, i - 1);
    }
    return Math.floor(cost * (1 - getSkillValue(skillTree.money.explorer)));
}

var tileMask = createCanvas(200, 200);
function createOrUpdateTileCanvas(tile, scaleToUse) {
    var rectangle = tile.target;
    if (!tile.canvas) tile.canvas = createCanvas(rectangle.width, rectangle.height);
    else {
        tile.canvas.width = rectangle.width;
        tile.canvas.height = rectangle.height;
    }
    if (tileMask.width != rectangle.width) tileMask.width = rectangle.width;
    if (tileMask.height != rectangle.height) tileMask.height = rectangle.height;
    var tileContext = tile.canvas.getContext('2d');
    var context = tileMask.getContext('2d');

    tile.scale = scaleToUse;
    var padding = Math.round(rectangle.width / 30);
    for (var i = 0; i <= tile.level; i++) {
        context.save();
        var totalPadding = padding * i;
        var color = levelColors[i];
        context.globalCompositeOperation = 'source-over';
        context.clearRect(0, 0, rectangle.width, rectangle.height);
        context.fillStyle = 'black';
        context.fillRect(padding + totalPadding, totalPadding, rectangle.width - 2 * (totalPadding + padding), rectangle.height - 2 * totalPadding);
        context.fillRect(totalPadding, padding + totalPadding, rectangle.width - 2 * totalPadding, rectangle.height - 2 * (totalPadding + padding));

        context.beginPath();
        context.arc(totalPadding + padding, totalPadding + padding, padding, 0, 2 * Math.PI);
        context.fill();
        context.beginPath();
        context.arc(rectangle.width - totalPadding - padding, totalPadding + padding, padding,  0, 2 * Math.PI );
        context.fill();
        context.beginPath();
        context.arc(padding + totalPadding, rectangle.height - totalPadding - padding, padding, 0, 2 * Math.PI);
        context.fill();
        context.beginPath();
        context.arc(rectangle.width - totalPadding - padding, rectangle.height - totalPadding - padding, padding,  0, 2 * Math.PI);
        context.fill();
        if (tile.neighbors['0x-1'] && tile.neighbors['0x-1'].level >= i) {
            context.fillRect(totalPadding, rectangle.height - totalPadding - padding, rectangle.width - 2 * totalPadding, totalPadding + padding);
            if (tile.neighbors['-1x0'] && tile.neighbors['-1x0'].level >= i && tile.neighbors['-1x-1'] && tile.neighbors['-1x-1'].level >= i) {
                context.fillRect(0, rectangle.height - totalPadding, totalPadding, totalPadding);
            }
            if (tile.neighbors['1x0'] && tile.neighbors['1x0'].level >= i && tile.neighbors['1x-1'] && tile.neighbors['1x-1'].level >= i) {
                context.fillRect(rectangle.width - totalPadding, rectangle.height - totalPadding, totalPadding, totalPadding);
            }
        }
        if (tile.neighbors['0x1'] && tile.neighbors['0x1'].level >= i) {
            context.fillRect(totalPadding, 0, rectangle.width - 2 * totalPadding, totalPadding + padding);
            if (tile.neighbors['-1x0'] && tile.neighbors['-1x0'].level >= i && tile.neighbors['-1x1'] && tile.neighbors['-1x1'].level >= i) {
                context.fillRect(0, 0, totalPadding, totalPadding);
            }
            if (tile.neighbors['1x0'] && tile.neighbors['1x0'].level >= i && tile.neighbors['1x1'] && tile.neighbors['1x1'].level >= i) {
                context.fillRect(rectangle.width - totalPadding, 0, totalPadding, totalPadding);
            }
        }
        if (tile.neighbors['-1x0'] && tile.neighbors['-1x0'].level >= i) {
            context.fillRect(0, totalPadding, totalPadding + padding, rectangle.height - 2 * totalPadding);
        }
        if (tile.neighbors['1x0'] && tile.neighbors['1x0'].level >= i) {
            context.fillRect(rectangle.width - totalPadding - padding, totalPadding, totalPadding + padding, rectangle.height - 2 * totalPadding);
        }
        if (i === 0 ) context.globalAlpha = .75;
        context.globalCompositeOperation = 'source-in';
        if (color.image) {
            drawImage(context, color.image, color, {'left': 0, 'top': 0, 'width': rectangle.width, 'height': rectangle.height});
        } else {
            context.fillStyle = color;
            context.fillRect(0, 0, rectangle.width, rectangle.height);
        }
        tileContext.drawImage(tileMask, 0, 0, rectangle.width, rectangle.height, 0, 0, rectangle.width, rectangle.height);
        context.restore();
    }
}

function drawGrid() {
    var scaleToUse = getActualScale();
    var origin = getOrigin();
    var canvasRectangle = {'left': 0, 'top': 0, 'width': canvas.width, 'height': canvas.height};
    context.fillStyle = 'black';
    context.fillRect(0, 0, canvas.width, canvas.height);
    if (!currentGridCoords) return;
    var gradientLength = .3 * scaleToUse * gridLength;
    var topLeftCorner = project([currentPosition[0] - 4 * gridLength, currentPosition[1] + 4 * gridLength]);
    var visibleRectangle = {
        'left': Math.max(-gradientLength / 2, topLeftCorner[0]), 'top': Math.max(-gradientLength / 2, topLeftCorner[1])
    };
    var gridSize = gridLength * scaleToUse;
    visibleRectangle.width = Math.min(canvas.width + gradientLength / 2, topLeftCorner[0] + 8 * gridSize) - visibleRectangle.left;
    visibleRectangle.height = Math.min(canvas.height + gradientLength / 2, topLeftCorner[1] + 8 * gridSize) - visibleRectangle.top;
    context.save();
    context.translate((((now() / 20)) % 1000 / 1000 - 1) * gridSize, -(((now() / 30)) % 1000 / 1000 + 1) * gridSize);
    var topLeftGridCorner = project([(currentGridCoords[0] - 4) * gridLength, (currentGridCoords[1] + 4) * gridLength]);
    for (var top = topLeftGridCorner[1]; top <= topLeftGridCorner[1] + 9 * gridSize; top += gridSize) {
        for (var left = topLeftGridCorner[0]; left <= topLeftGridCorner[0] + 9 * gridSize; left += gridSize) {
            var target = {
                'left': left, 'top': top, 'width': gridSize, 'height': gridSize
            };
            drawImage(context, oceanSource.image, oceanSource, target);
        }
    }
    context.restore();

    var draws = 0;
    for (var tileData of activeTiles) {
        var rectangle = getGridRectangle([tileData.x, tileData.y]);
        tileData.target = rectangle;
        tileData.visible = rectanglesOverlap(rectangle, canvasRectangle);
        if (!tileData.visible) continue;
        draws++;
        if (!tileData.canvas || tileData.scale !== scaleToUse) createOrUpdateTileCanvas(tileData, scaleToUse);
        context.drawImage(tileData.canvas, 0, 0, tileData.canvas.width, tileData.canvas.height,
            rectangle.left, rectangle.top, rectangle.width, rectangle.height);
        if (tileData.exhausted) {
            var exhaustRadius = Math.min(rectangle.width / 2, rectangle.height / 2) - (1 + tileData.level) * Math.round(rectangle.width / 30);
            context.save();
            var percent = (tileData.exhausted - tileData.exhaustCounter) / tileData.exhausted;

            context.globalAlpha = .25;
            context.fillStyle = 'black';
            context.lineWidth = 3;
            context.strokeStyle = 'white';
            context.beginPath();
            if (percent < 1) context.moveTo(rectangle.left + rectangle.width / 2, rectangle.top + rectangle.height / 2);
            context.arc(rectangle.left + rectangle.width / 2, rectangle.top + rectangle.height / 2, exhaustRadius, -Math.PI / 2 - percent * 2 * Math.PI, -Math.PI / 2);
            if (percent < 1) context.closePath();
            context.stroke();
            context.fill();
            context.restore();
        }
    }
    for (var tileData of activeTiles) {
        if (!tileData.visible) continue;
        for (var loot of tileData.loot) {
            draws++;
            if (loot !== tileData.powerup && loot !== tileData.gem) drawLoot(loot, scaleToUse);
        }
    }
    for (var tileData of activeTiles) {
        if (!tileData.visible) continue;
        if (tileData.powerup) drawLoot(tileData.powerup, scaleToUse);
        if (tileData.gem) drawLoot(tileData.gem, scaleToUse);
    }
    for (var tile of activeTiles) {
        if (tile.dungeon) {
            var source = tile.dungeon.source;
            var target = {'left': tile.target.left + tile.target.width / 6, 'width':  2 * tile.target.width / 3,
                'top': tile.target.top + tile.target.height / 6, 'height':  2 * tile.target.width / 3};
            if (tile === selectedTile) drawOutlinedImage(context, source.image, 'red', 2, source, target);
            else drawImage(context, source.image, source, target);
        }
        var monster = tile.monster;
        if (!monster) continue;
        if (!tile.visible) continue;
        draws++;
        drawTileMonster(tile, scaleToUse);
    }
    if (visibleRectangle.left + gradientLength > 0) {
        var gradient = context.createLinearGradient(visibleRectangle.left, 0, visibleRectangle.left + gradientLength, 0);
        gradient.addColorStop(0, 'black');
        gradient.addColorStop(1, 'transparent');
        context.fillStyle = gradient;
        context.fillRect(0, 0, visibleRectangle.left + gradientLength, canvas.height);
    }
    if (visibleRectangle.top + gradientLength > 0) {
        var gradient = context.createLinearGradient(0, visibleRectangle.top, 0, visibleRectangle.top + gradientLength);
        gradient.addColorStop(0, 'black');
        gradient.addColorStop(1, 'transparent');
        context.fillStyle = gradient;
        context.fillRect(0, 0, canvas.width, visibleRectangle.top + gradientLength);
    }
    if (visibleRectangle.left + visibleRectangle.width - gradientLength < canvas.width) {
        var left = visibleRectangle.left + visibleRectangle.width - gradientLength;
        var gradient = context.createLinearGradient(left, 0, visibleRectangle.left + visibleRectangle.width, 0);
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(1, 'black');
        context.fillStyle = gradient;
        context.fillRect(left, 0, canvas.width - left, canvas.height);
    }
    if (visibleRectangle.top + gradientLength > 0) {
        var top = visibleRectangle.top + visibleRectangle.height - gradientLength;
        var gradient = context.createLinearGradient(0, top, 0, visibleRectangle.top + visibleRectangle.height);
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(1, 'black');
        context.fillStyle = gradient;
        context.fillRect(0, top, canvas.width, canvas.height - top);
    }
    if (debugMode) {
        context.font = Math.round(iconSize / 2) + 'px sans-serif';
        context.textAlign = 'center';
        context.testBaseline = 'top';
        embossText(context, draws, 'white', 'black', canvas.width / 2, 5);
    }
}
function drawLoot(loot, scaleToUse) {
    var center = project([loot.x, loot.y]);
    var lootScale = gridLength * scaleToUse / 64;
    var targetWidth = loot.treasure.width * loot.treasure.scale * lootScale;
    var targetHeight = loot.treasure.height * loot.treasure.scale * lootScale;
    var target = {
        'left': Math.round(center[0] - targetWidth / 2),
        'top': Math.round(center[1] - targetHeight / 2),
        'width': targetWidth, 'height': targetHeight
    };
    if (loot.inMonsterRadius || loot.inRadius) {
        var tintColor = loot.inMonsterRadius ? 'red' : 'gold';
        drawTintedImage(context, loot.treasure.image, tintColor, .25 + Math.cos(now() / 200) * .25, loot.treasure, target);
    } else {
        drawImage(context, loot.treasure.image, loot.treasure, target);
    }
}

function isPointInMonsterRadius(x, y) {
    for (var monster of activeMonsters) {
        if (getDistance([monster.tile.centerX, monster.tile.centerY], [x, y]) <= monster.radius) {
            return true;
        }
    }
    return false;
}