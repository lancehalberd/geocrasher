
import { GameState, LootMarker, MapTile } from 'app/types';

export function getTilePower(state: GameState, tile: MapTile): number {
    // Base power is 1 + 2% of total tiles leveled + 20% of current tile level.
    let power = 1 + (state.world.levelSums[1] ?? 0) / 50 + tile.level / 5;
    // Tile gains 10% of each of its neighbors level.
    for (const sideKey of [1, 3, 4, 6]) {
        power += (tile.neighbors[sideKey].level ?? 0) / 10;
    }
    // Tile gains 5% of each of its corner neighbors level.
    for (const cornerKey of [0, 2, 5, 7]) {
        power += (tile.neighbors[cornerKey]?.level ?? 0) / 20;
    }
    return power;
}

var lootInMonsterRadius = [];
export function updateMap(state: GameState) {
    lootInRadius = [];
    lootInMonsterRadius = [];
    if (collectingLoot.length) {
        updateLootCollection();
    }
    for (const tileData of state.world.activeTiles) {
        updateTileLoot(state, tileData);
    }
    if (state.battle.engagedMonster) updateBattle(state.time);
    if (damageIndicators.length) updateDamageIndicators();
}
function handleMapClick(x, y) {
    if (state.globalPosition.isFastMode || state.globalPosition.isFixingGPS) return;
    if (!selectedTile && lootInRadius.length && collectingLoot.length === 0 && isPointInRectObject(x, y, collectCoinsButton.target)) {
        collectLoot();
        return;
    }
    if (handleTreasureMapButtonClick(x, y)) return;
    if (handleSkillButtonClick(x, y)) return;
    if (handleFightFleeButtonClick(x, y)) return;
    if (handleEnterExitButtonClick(x, y)) return;
    if (selectedTile && !selectedTile.monster && !selectedTile.dungeon && canUpgradeTile(selectedTile) && isPointInRectObject(x, y, upgradeButton.target)) {
        upgradeTile(selectedTile);
        return;
    }
    clickedCoords = unproject([x, y]);
    var clickedGridCoords = toGridCoords(clickedCoords);
    if (tileIsExplored(clickedGridCoords) && !state.battle.engagedMonster) {
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
    x: 48,
    'up': 96,
    'right': 144
};
var walkOffsets = [0, 48, 0, 96], walkTime = 0;
export function drawPerson(context: CanvasRenderingContext2D, state: GameState) {
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
        x: walkOffsets[frame],
        y: directionOffsets[personDirection] + 1,
        w: personSource.width, h: personSource.height + 1
    }
    var target = {
        x: point[0] - Math.round(targetSize / 2),
        y: point[1] - targetSize,
        w: targetSize, h: targetSize
    };
    drawImage(context, outlinedPersonImage, source, target);
}
export function drawMapScene(context: CanvasRenderingContext2D, state: GameState) {
    drawGrid();
    if (currentPosition && (state.globalPosition.isFastMode || collectingLoot.length === 0)) {
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
    drawPerson();

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
    var hideStatsIn = hideStatsAt - state.time;
    if (!state.globalPosition.isFastMode && !state.globalPosition.isFixingGPS && (hideStatsIn > 0 || !playerStatsRectangle)) {
        context.save();
        context.globalAlpha = Math.max(0, Math.min(1, hideStatsIn / 1000));
        playerStatsRectangle = drawStatsBox(5, 5, level, 'Hero', currentHealth, maxHealth, attack, defense, experience, experienceForNextLevel());
        context.restore();
    } else {
        drawLifeIndicator();
    }
    if (selectedTile && selectedTile.x === currentGridCoords[0] && selectedTile.y === currentGridCoords[1]) {
        hideStatsAt = state.time + 1500;
    }
    drawMonsterStats();
    if (selectedTile && selectedTile.dungeon) drawDungeonStats();
    // collect coins button is replaced by 'Fight!' button when a monster is selected.
    if (state.globalPosition.isFixingGPS) {
        var fontSize = Math.floor(3 * iconSize / 4);
        context.font = fontSize + 'px sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'bottom';
        var text = 'Updating';
        for (var i = 0; i < (endFixingGPSTime - state.time) / 1000; i++) {
            text = '-' + text + '-';
        }
        drawEmbossedText(context, text, 'gold', 'black', canvas.width / 2, canvas.height - 10);
    } else if (state.globalPosition.isFastMode) {
        var fontSize = Math.floor(3 * iconSize / 4);
        context.font = fontSize + 'px sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'bottom';
        var text = 'Fast Mode';
        for (var i = 0; i < (endFastModeTime - state.time) / 2000; i++) {
            text = '-' + text + '-';
        }
        drawEmbossedText(context, text, 'gold', 'black', canvas.width / 2, canvas.height - 10);
    } else {
        if (!selectedTile) {
            if (collectingLoot.length === 0) drawCollectCoinsButton();
        } else if (selectedTile.monster) drawFightFleeButton();
        else if (selectedTile.dungeon) drawEnterExitButton();
        drawGemIndicators();
        drawSkillButton();
        drawTreasureMapButton();
    }

    drawCoinsIndicator();
    drawLootTotals();
}
var playerStatsRectangle;

export function drawCoinsIndicator(context: CanvasRenderingContext2D, state: GameState) {
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
    drawImage(context, outlinedMoneySource.image, outlinedMoneySource, {x: left, y: margin, w: localIconSize, h: localIconSize});
    drawEmbossedText(context, coinsText, 'gold', 'white', left + localIconSize, margin + Math.round(localIconSize / 2));
}

export function drawLifeIndicator(context: CanvasRenderingContext2D, state: GameState) {
    const { iconSize } = state.display;
    var localIconSize = Math.floor(iconSize / 2);
    var fontSize = Math.floor(3 * localIconSize / 4);
    context.font = fontSize + 'px sans-serif';
    context.textAlign = 'left';
    context.textBaseline = 'top';

    drawImage(context, heartSource.image, heartSource, {x: 10, y: 10, w: localIconSize, h: localIconSize});
    drawEmbossedText(context, currentHealth.abbreviate() + ' / ' + maxHealth.abbreviate(), 'red', 'white', 10 + localIconSize + 5, 10);
    drawBar(context, 10, 10 + localIconSize + 5, localIconSize * 4, 6, 'white', 'red', currentHealth / maxHealth);
}

var upgradeButton = {'target': {}};
function drawUpgradeButton(context: CanvasRenderingContext2D, state: GameState, canUpgrade: boolean, cost: number) {
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

    drawSolidTintedImage(context, upArrows.image, (cost <= coins && canUpgrade) ? 'green' : 'red', upArrows, {x: target.left, y: target.top, w: iconSize, h: iconSize});
    drawEmbossedText(context, text, (cost <= coins) ? 'white' : 'red', 'black', target.left + iconSize, canvas.height - 10 - iconSize / 2);

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
    return tile.level >=0 && (numNeighbors >= 8) && (neighborSum >= (8 * tile.level));
}
function costToUpgrade(data) {
    if (data.level >= maxTileLevel) return false;
    var cost = 5;
    for (var i = 1; i <= data.level + 1; i++) {
        cost += 2 * (ifdefor(levelSums[i], 0) + 1) * Math.pow(10, i - 1);
    }
    return Math.floor(cost * (1 - getSkillValue(skillTree.money.explorer)));
}

var tileMask = createCanvas(200, 200);
function createOrUpdateTileCanvas(tile, scaleToUse) {
    var rectangle = tile.target;
    const neighbor = (dx, dy) => tile.neighbors[dx + 'x' + dy] || {level: -1};
    if (!tile.canvas) tile.canvas = createCanvas(rectangle.width, rectangle.height);
    else {
        tile.canvas.width = rectangle.width;
        tile.canvas.height = rectangle.height;
    }
    if (tileMask.width != rectangle.width) tileMask.width = rectangle.width;
    if (tileMask.height != rectangle.height) tileMask.height = rectangle.height;
    var tileContext = tile.canvas.getContext('2d');
    tileContext.imageSmoothingEnabled = false;
    // Draw the current tile's pattern to all four corners
    if (tile.level >= 0) {
        var patternSource = levelColors[tile.level];
        drawImage(tileContext, patternSource.image, patternSource,
            {x: 0, y: 0, w: rectangle.width / 2, h: rectangle.height / 2});
        drawImage(tileContext, patternSource.image, patternSource,
            {x: rectangle.width / 2, y: 0, w: rectangle.width / 2, h: rectangle.height / 2});
        drawImage(tileContext, patternSource.image, patternSource,
            {x: 0, y: rectangle.height / 2, w: rectangle.width / 2, h: rectangle.height / 2});
        drawImage(tileContext, patternSource.image, patternSource,
            {x: rectangle.width / 2, y: rectangle.height / 2, w: rectangle.width / 2, h: rectangle.height / 2});
    }
    for (var i = tile.level + 1; i < levelColors.length; i++) {
        // top left
        var patternSource = levelColors[i];
        var cornerSource = copy(patternSource);
        if (neighbor(0, 1).level >= i && neighbor(-1, 0).level >= i) {
            // top and left filled in
            cornerSource.left += 34;
            cornerSource.top -= 17;
        } else if (neighbor(0, 1).level >= i) {
            // only top filled in
            cornerSource.top += 17;
        } else if (neighbor(-1, 0).level >= i) {
            // only left filled in
            cornerSource.left += 17;
        } else if (neighbor(-1, 1).level >= i) {
            // only corner filled in
            cornerSource.left += 17;
            cornerSource.top += 17;
        } else {
            cornerSource = null;
        }
        if (cornerSource) {
            drawImage(tileContext, patternSource.image, cornerSource,
                {x: 0, y: 0, w: rectangle.width / 2, h: rectangle.height / 2});
        }

        // top right
        cornerSource = copy(patternSource);
        if (neighbor(0, 1).level >= i && neighbor(1, 0).level >= i) {
            // top and left filled in
            cornerSource.left += 51;
            cornerSource.top -= 17;
        } else if (neighbor(0, 1).level >= i) {
            // only top filled in
            cornerSource.top += 17;
        } else if (neighbor(1, 0).level >= i) {
            // only left filled in
            cornerSource.left -= 17;
        } else if (neighbor(1, 1).level >= i) {
            // only corner filled in
            cornerSource.left -= 17;
            cornerSource.top += 17;
        } else {
            cornerSource = null;
        }
        if (cornerSource) {
            drawImage(tileContext, patternSource.image, cornerSource,
                {x: rectangle.width / 2, y: 0, w: rectangle.width / 2, h: rectangle.height / 2});
        }

        // bottom left
        cornerSource = copy(patternSource);
        if (neighbor(0, -1).level >= i && neighbor(-1, 0).level >= i) {
            // top and left filled in
            cornerSource.left += 34;
        } else if (neighbor(0, -1).level >= i) {
            // only top filled in
            cornerSource.top -= 17;
        } else if (neighbor(-1, 0).level >= i) {
            // only left filled in
            cornerSource.left += 17;
        } else if (neighbor(-1, -1).level >= i) {
            // only corner filled in
            cornerSource.left += 17;
            cornerSource.top -= 17;
        } else {
            cornerSource = null;
        }
        if (cornerSource) {
            drawImage(tileContext, patternSource.image, cornerSource,
                {x: 0, y: rectangle.height / 2, w: rectangle.width / 2, h: rectangle.height / 2});
        }

        // bottom right
        cornerSource = copy(patternSource);
        if (neighbor(0, -1).level >= i && neighbor(1, 0).level >= i) {
            // top and left filled in
            cornerSource.left += 51;
        } else if (neighbor(0, -1).level >= i) {
            // only top filled in
            cornerSource.top -= 17;
        } else if (neighbor(1, 0).level >= i) {
            // only left filled in
            cornerSource.left -= 17;
        } else if (neighbor(1, -1).level >= i) {
            // only corner filled in
            cornerSource.left -= 17;
            cornerSource.top -= 17;
        } else {
            cornerSource = null;
        }
        if (cornerSource) {
            drawImage(tileContext, patternSource.image, cornerSource,
                {x: rectangle.width / 2, y: rectangle.height / 2, w: rectangle.width / 2, h: rectangle.height / 2});
        }
    }
}

function drawGrid(context: CanvasRenderingContext2D, state: GameState): void {
    var scaleToUse = getActualScale();
    var origin = getOrigin(state);
    var canvasRectangle = {x: 0, y: 0, w: canvas.width, h: canvas.height};
    context.fillStyle = 'black';
    context.fillRect(0, 0, canvas.width, canvas.height);
    if (!currentGridCoords) return;
    var gradientLength = .3 * scaleToUse * gridLength;
    var topLeftCorner = project([currentPosition[0] - 4 * gridLength, currentPosition[1] + 4 * gridLength]);
    var visibleRectangle = {
        x: Math.max(-gradientLength / 2, topLeftCorner[0]), y: Math.max(-gradientLength / 2, topLeftCorner[1])
    };
    var gridSize = Math.round(gridLength * scaleToUse);
    visibleRectangle.width = Math.min(canvas.width + gradientLength / 2, topLeftCorner[0] + 8 * gridSize) - visibleRectangle.left;
    visibleRectangle.height = Math.min(canvas.height + gradientLength / 2, topLeftCorner[1] + 8 * gridSize) - visibleRectangle.top;
    context.save();
    context.imageSmoothingEnabled = false;
    context.translate(
         Math.round((((state.time / 15)) % 1000 / 1000 - .5) * gridSize),
        -Math.round((((state.time / 20)) % 1000 / 1000 + .5) * gridSize)
    );
    var topLeftGridCorner = project([(currentGridCoords[0] - 4) * gridLength, (currentGridCoords[1] + 4) * gridLength]);
    for (var top = topLeftGridCorner[1]; top <= topLeftGridCorner[1] + 9 * gridSize; top += gridSize) {
        for (var left = topLeftGridCorner[0]; left <= topLeftGridCorner[0] + 9 * gridSize; left += gridSize) {
            var target = {
                x: left, y: top, w: gridSize, h: gridSize
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
            var target = {x: tile.target.left + tile.target.width / 6, w:  2 * tile.target.width / 3,
                y: tile.target.top + tile.target.height / 6, h:  2 * tile.target.width / 3};
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
    if (isDebugMode) {
        context.font = Math.round(iconSize / 2) + 'px sans-serif';
        context.textAlign = 'center';
        context.testBaseline = 'top';
        drawEmbossedText(context, draws, 'white', 'black', canvas.width / 2, 5);
    }
}
export function drawLootMarker(context: CanvasRenderingContext2D, state: GameState, loot: LootMarker, scaleToUse: number) {
    var center = project([loot.x, loot.y]);
    var lootScale = gridLength * scaleToUse / 64;
    var targetWidth = loot.treasure.width * loot.treasure.scale * lootScale;
    var targetHeight = loot.treasure.height * loot.treasure.scale * lootScale;
    var target = {
        x: Math.round(center[0] - targetWidth / 2),
        y: Math.round(center[1] - targetHeight / 2),
        w: targetWidth, h: targetHeight
    };
    if (loot.inMonsterRadius || loot.inRadius) {
        var tintColor = loot.inMonsterRadius ? 'red' : 'gold';
        drawTintedImage(context, loot.treasure.image, tintColor, .25 + Math.cos(state.time / 200) * .25, loot.treasure, target);
    } else {
        drawImage(context, loot.treasure.image, loot.treasure, target);
    }
}
