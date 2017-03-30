
var lootInMonsterRadius = [];
function updateMap() {
    lootInRadius = [];
    lootInMonsterRadius = [];
    if (collectingLoot.length) {
        updateLootCollection();
    }
    for (var tileData of activeTiles) {
        for (var loot of tileData.loot) {
            loot.x = (loot.x + loot.tx) / 2;
            loot.y = (loot.y + loot.ty) / 2;
            loot.inRadius = isLootInRadius(loot);
            loot.inMonsterRadius = isPointInMonsterRadius(loot.x, loot.y);
            if (loot.inRadius && !loot.inMonsterRadius) {
                lootInRadius.push(loot);
            }
            if (loot.inMonsterRadius) {
                lootInMonsterRadius.push(loot);
            }
        }
    }
    if (fightingMonster) updateBattle(now());
}
function handleMapClick(x, y) {
    if (!selectedTile && lootInRadius.length && collectingLoot.length === 0 && isPointInRectObject(x, y, collectCoinsButton.target)) {
        collectLoot();
        return;
    }
    if (selectedTile) {
        if (selectedTile.monster) {
            if (currentHealth > 0 && isPointInRectObject(x, y, fightFleeButton.target)) {
                if (!fightingMonster) {
                    fightingMonster = selectedTile.monster;
                    monsterAttackTime = now();
                    playerAttackTime = now() + 500;
                } else {
                    fightingMonster = null;
                }
                return;
            }
        } else if (canUpgradeTile(selectedTile) && isPointInRectObject(x, y, upgradeButton.target)) {
            upgradeTile(selectedTile);
            return;
        }
    }
    clickedCoords = unproject([x, y]);
    var clickedGridCoords = toGridCoords(clickedCoords);
    if (tileIsExplored(clickedGridCoords) && !fightingMonster) {
        if (!selectedTile || selectedTile.x !== clickedGridCoords[0] || selectedTile.y !== clickedGridCoords[1]){
            var clickedTile = getTileData(clickedGridCoords);
            if (activeTiles.indexOf(clickedTile) >= 0) selectedTile = clickedTile;
        } else {
            selectedTile = null;
        }
    }
}

function drawMapScene() {
    context.clearRect(0,0, canvas.width, canvas.height);
    drawGrid();

    if (currentPosition) {
        // draw current location
        var point = project(currentPosition);
        context.fillStyle = '#0C0';
        context.beginPath();
        context.arc(point[0], point[1], 8, 0, 2 * Math.PI);
        context.fill();
        if (collectingLoot.length === 0) {
            context.save();
            context.globalAlpha = .3;
            context.strokeStyle = 'gold';
            context.lineWidth = 4;
            context.beginPath();
            context.arc(point[0], point[1], radius * actualScale, 0 , 2 * Math.PI);
            context.stroke();
            context.restore();
        }
    }

    if (selectedTile && !selectedTile.monster) {
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
    if (hideStatsIn > 0 || !playerStatsRectangle) {
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
    if (selectedTile && selectedTile.monster) {
        var monster = selectedTile.monster;
        var rectangle = selectedTile.rectangle;
        hideStatsAt = now() + 1500;
        var x = canvas.width - playerStatsRectangle.width - 5;
        var y = rectangle.top + rectangle.height;

        if (y + playerStatsRectangle.height > canvas.height - iconSize) y = canvas.height - playerStatsRectangle.height - iconSize;
        if (y < iconSize) y = iconSize;
        drawStatsBox(x, y, monster.level, monster.name, monster.currentHealth, monster.maxHealth, monster.attack, monster.defense);
    }
    // collect coins button is replaced by 'Fight!' button when a monster is selected.
    if (!selectedTile) {
        if (collectingLoot.length === 0) drawCollectCoinsButton();
    } else if (selectedTile.monster) drawFightFleeButton();

    drawCoinsIndicator();
    if (now() < lootCollectedTime + 2000) {
        context.save();
        context.globalAlpha = Math.min(1, 2 - (now() - lootCollectedTime) / 1000);
        context.font = Math.floor(3 * iconSize / 4) + 'px sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'bottom';
        context.fillStyle = 'black'
        context.fillText(coinsCollected.abbreviate() + 'x' + collectionBonus.toFixed(2), canvas.width / 2 + 2, canvas.height / 2 - 2 + 2);
        context.fillStyle = 'gold'
        context.fillText(coinsCollected.abbreviate() + 'x' + collectionBonus.toFixed(2), canvas.width / 2, canvas.height / 2 - 2);
        context.textBaseline = 'top';
        context.fillStyle = 'black'
        context.fillText('+' + Math.round(coinsCollected * collectionBonus).abbreviate(), canvas.width / 2 + 2, canvas.height / 2 + 2 + 2);
        context.fillStyle = 'gold'
        context.fillText('+' + Math.round(coinsCollected * collectionBonus).abbreviate(), canvas.width / 2, canvas.height / 2 + 2);
        context.restore();
    }
}
var playerStatsRectangle;

function drawCoinsIndicator() {
    context.textAlign = 'left'
    context.textBaseline = 'top';
    var fontSize = Math.min(Math.ceil(canvas.width / 20), Math.ceil(canvas.height / 20));
    context.font = fontSize + 'px sans-serif';
    var coinsText = 'Coins: ' + coins.abbreviate();
    var metrics = context.measureText(coinsText);
    var margin = 10;
    var padding = 6;
    var left = canvas.width - metrics.width - margin - 2 * padding;
    var top = margin;
    context.globalAlpha = .8;
    context.fillStyle = 'black';
    context.fillRect(left, top, metrics.width + 2 * padding, fontSize + 2 * padding);
    context.globalAlpha = 1;
    context.fillStyle = 'yellow';
    context.fillText(coinsText, left + padding, top + padding);
}

function drawLifeIndicator() {
    var localIconSize = Math.floor(iconSize / 2);
    var fontSize = Math.floor(3 * localIconSize / 4);
    context.font = fontSize + 'px sans-serif';
    context.textAlign = 'left'
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
    embossText(context, text, (cost < coins) ? 'white' : 'red', 'black', target.left + iconSize, canvas.height - 10 - iconSize / 2);

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
    generateLootForTile(tile);
    checkToGenerateMonster(tile);
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
    return cost;
}

var tileMask = createCanvas(200, 200);
function createOrUpdateTileCanvas(tile) {
    var rectangle = tile.rectangle;
    if (!tile.canvas) tile.canvas = createCanvas(rectangle.width, rectangle.height);
    else {
        tile.canvas.width = rectangle.width;
        tile.canvas.height = rectangle.height;
    }
    if (tileMask.width != rectangle.width) tileMask.width = rectangle.width;
    if (tileMask.height != rectangle.height) tileMask.height = rectangle.height;
    var tileContext = tile.canvas.getContext('2d');
    var context = tileMask.getContext('2d');

    tile.scale = actualScale;
    var padding = Math.round(rectangle.width / 30);
    for (var i = 0; i <= tile.level; i++) {
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
        context.globalCompositeOperation = 'source-in';
        if (color.image) {
            drawImage(context, color.image, color, {'left': 0, 'top': 0, 'width': rectangle.width, 'height': rectangle.height});
        } else {
            context.fillStyle = color;
            context.fillRect(0, 0, rectangle.width, rectangle.height);
        }
        tileContext.drawImage(tileMask, 0, 0, rectangle.width, rectangle.height, 0, 0, rectangle.width, rectangle.height);
    }
}

function drawGrid() {
    var origin = getOrigin();
    var canvasRectangle = {'left': 0, 'top': 0, 'width': canvas.width, 'height': canvas.height};
    context.fillStyle = 'black';
    context.fillRect(0, 0, canvas.width, canvas.height);
    if (!currentGridCoords) return;
    context.fillStyle = 'blue';
    var activeRectangle = getGridRectangle([currentGridCoords[0] - 4, currentGridCoords[1] + 4]);
    activeRectangle.width = 9 * actualScale * gridLength;
    activeRectangle.height = 9 * actualScale * gridLength;
    var gradientLength = .3 * actualScale * gridLength;
    var blueRectangle = {
        'left': Math.max(-gradientLength / 2, activeRectangle.left), 'top': Math.max(-gradientLength / 2, activeRectangle.top)
    };
    blueRectangle.width = Math.min(canvas.width + gradientLength / 2, activeRectangle.left + activeRectangle.width) - blueRectangle.left;
    blueRectangle.height = Math.min(canvas.height + gradientLength / 2, activeRectangle.top + activeRectangle.height) - blueRectangle.top;
    fillRectangle(context, blueRectangle);

    var draws = 0;
    for (var tileData of visibleTiles) {
        var rectangle = getGridRectangle([tileData.x, tileData.y]);
        tileData.rectangle = rectangle;
        if (!rectanglesOverlap(rectangle, canvasRectangle)) continue;
        draws++;
        if (!tileData.canvas || tileData.scale !== actualScale) createOrUpdateTileCanvas(tileData);
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
        if (!rectanglesOverlap(tileData.rectangle, canvasRectangle)) continue;
        for (var loot of tileData.loot) {
            draws++;
            var center = project([loot.x, loot.y]);
            var targetWidth = loot.treasure.width * loot.treasure.scale * coinScale;
            var targetHeight = loot.treasure.height * loot.treasure.scale * coinScale;
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
    }
    for (var tileData of activeTiles) {
        var monster = tileData.monster;
        if (!monster) continue;
        if (!rectanglesOverlap(tileData.rectangle, canvasRectangle)) continue;
        draws++;
        var rectangle = tileData.rectangle;
        var source = tileData.monster.source;
        var targetWidth = Math.min(rectangle.width * 2 / 3, 128);
        var targetHeight = Math.min(rectangle.height * 2 / 3, 128);
        var target = {
            'left': rectangle.left + (rectangle.width - targetWidth) / 2,
            'top': rectangle.top + (rectangle.height - targetHeight) / 2,
            'width': targetWidth, 'height': targetHeight
        };
        if (tileData === selectedTile) {
            drawOutlinedImage(context, source.image, 'red', 2, source, target);
            context.save();
            context.globalAlpha = .15;
            context.fillStyle = 'red';
            context.beginPath();
            context.arc(rectangle.left + rectangle.width / 2, rectangle.top + rectangle.height / 2,
                        tileData.monster.radius * actualScale, 0, 2 * Math.PI);
            context.fill();
            context.restore();
        } else {
            drawImage(context, source.image, source, target);
        }
        if (monster.currentHealth < monster.maxHealth || tileData === selectedTile) {
            drawBar(context, Math.round(target.left + target.width / 6), target.top - 5,
                    Math.round(target.width * 2 / 3), 6, 'white', 'red',
                    monster.currentHealth / monster.maxHealth);
        }
    }
    if (blueRectangle.left + gradientLength > 0) {
        var gradient = context.createLinearGradient(blueRectangle.left, 0, blueRectangle.left + gradientLength, 0);
        gradient.addColorStop(0, 'black');
        gradient.addColorStop(1, 'transparent');
        context.fillStyle = gradient;
        context.fillRect(0, 0, blueRectangle.left + gradientLength, canvas.height);
    }
    if (blueRectangle.top + gradientLength > 0) {
        var gradient = context.createLinearGradient(0, blueRectangle.top, 0, blueRectangle.top + gradientLength);
        gradient.addColorStop(0, 'black');
        gradient.addColorStop(1, 'transparent');
        context.fillStyle = gradient;
        context.fillRect(0, 0, canvas.width, blueRectangle.top + gradientLength);
    }
    if (blueRectangle.left + blueRectangle.width - gradientLength < canvas.width) {
        var left = blueRectangle.left + blueRectangle.width - gradientLength;
        var gradient = context.createLinearGradient(left, 0, blueRectangle.left + blueRectangle.width, 0);
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(1, 'black');
        context.fillStyle = gradient;
        context.fillRect(left, 0, canvas.width - left, canvas.height);
    }
    if (blueRectangle.top + gradientLength > 0) {
        var top = blueRectangle.top + blueRectangle.height - gradientLength;
        var gradient = context.createLinearGradient(0, top, 0, blueRectangle.top + blueRectangle.height);
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

function isPointInMonsterRadius(x, y) {
    for (var monster of activeMonsters) {
        if (getDistance([monster.tile.centerX, monster.tile.centerY], [x, y]) <= monster.radius) {
            return true;
        }
    }
    return false;
}