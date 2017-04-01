
var gemData = [
    {'color': 'orange', 'source': orangeGemSource, 'scale': .25, 'loot': null, 'history': [], 'spawnRadius': gridLength * 8,
        'collectRadius': maxRadius * 1.5, 'ticks': 4, 'debuff': .95, 'tintAmount': .07, 'tickDuration': 500, 'historyDuration': 1000 * 20 * 15},
    {'color': 'green', 'source': greenGemSource, 'scale': .25, 'loot': null, 'history': [], 'spawnRadius': gridLength * 12,
        'collectRadius': maxRadius * 2, 'ticks': 8, 'debuff': .95, 'tintAmount': .04, 'tickDuration': 300, 'historyDuration': 1000 * 40 * 15},
    {'color': 'blue', 'source': blueGemSource, 'scale': .25, 'loot': null, 'history': [], 'spawnRadius': gridLength * 16,
        'collectRadius': maxRadius * 3, 'ticks': 16, 'debuff': .95, 'tintAmount': .03, 'tickDuration': 200, 'historyDuration': 1000 * 60 * 15}
];
function checkToSpawnGems() {
    if (fastMode) return;
    for (var gem of gemData) {
        if (gem.loot) {
            if (getDistance([gem.loot.x, gem.loot.y], currentPosition) < gem.spawnRadius + gridLength * 5) continue;
            var tile = gem.loot.tile;
            tile.loot.splice(tile.loot.indexOf(gem.loot), 1);
            gem.loot = null;
        }
        var theta = Math.random() * 2 * Math.PI, bestTile = null;
        for (var dt = 0; dt < 2 * Math.PI; dt += Math.PI / 20) {
            var coords = [currentPosition[0] + Math.cos(theta + dt) * gem.spawnRadius, currentPosition[1] + Math.sin(theta + dt) * gem.spawnRadius];
            var gridCoords = toGridCoords(coords);
            var tile = getTileData(gridCoords);
            if (!tile || areCoordsInGemHistory(coords, gem)) continue;
            if (!bestTile || tile.level > bestTile.level) bestTile = tile;
        }
        if (!bestTile) continue;
        var x = bestTile.centerX + (Math.random() - 0.5) * gridLength, y = bestTile.centerY + (Math.random() - 0.5) * gridLength;
        gem.loot =  {'treasure': $.extend({'gem': gem, 'scale': gem.scale, 'onObtain': onObtainGem}, gem.source),
            'tile': bestTile, 'x': x, 'y': y, 'tx': x, 'ty': y};
        bestTile.loot.push(gem.loot);
    }
}
function clearAllGems() {
    for (var gem of gemData) {
        if (!gem.loot) continue;
        var tile = gem.loot.tile;
        tile.loot.splice(tile.loot.indexOf(gem.loot), 1);
        gem.loot = null;
    }
}

function areCoordsInGemHistory(coords, gem) {
    for (var i = 0; i < gem.history.length; i++) {
        var oldLocation = gem.history[i];
        if (now() - oldLocation.time >= gem.historyDuration) {
            gem.history.splice(i--, 1);
            continue;
        }
        if (getDistance(coords, [oldLocation.x, oldLocation.y]) < gem.spawnRadius) {
            return true;
        }
    }
    return false;
}

function drawGemIndicators() {
    var playerScreenCoords = project(currentPosition);
    for (var gem of gemData) {
        if (gem.counter) {
            var percent = gem.counter / gem.ticks
            if (percent > 0) {
                context.save();
                context.globalAlpha = (percent >= 1) ? .3 : .2 + .3 * (gem.nextTick - now()) / gem.tickDuration;
                context.fillStyle = gem.color;
                context.beginPath();
                if (percent < 1) context.moveTo(playerScreenCoords[0], playerScreenCoords[1]);
                context.arc(playerScreenCoords[0], playerScreenCoords[1], gem.collectRadius * actualScale, -Math.PI / 2 - percent * 2 * Math.PI, -Math.PI / 2);
                if (percent < 1) context.closePath();
                context.fill();
                context.restore();
            }
            if (collectingLoot.length) gem.nextTick = now() + gem.tickDuration;
            if (now() >= gem.nextTick && gem.counter){
                gem.counter--;
                updateGameState();
                gem.nextTick = now() + gem.tickDuration;
                for (var monster of activeMonsters) {
                    if (monster.tint !== gem.color) monster.tintAmount = 0;
                    monster.tint = gem.color;
                    monster.tintAmount += gem.tintAmount;
                    monster.currentHealth = Math.max(1, Math.floor(monster.currentHealth * gem.debuff));
                    monster.attack = Math.max(1, Math.floor(monster.attack * gem.debuff));
                    monster.defense = Math.max(1, Math.floor(monster.defense * gem.debuff));
                }
            }
            continue;
        }
        if (!gem.loot || collectingLoot.indexOf(gem.loot) >= 0) continue;
        var screenCoords = project([gem.loot.x, gem.loot.y]);
        var distance = getDistance([gem.loot.x, gem.loot.y], currentPosition);
        var pixelDistance = distance * actualScale;
        var indicatorScreenCoords;
        var distanceFactor = (pixelDistance - 40) / pixelDistance;
        var dx = (gem.loot.x - currentPosition[0]);
        var dy = (gem.loot.y - currentPosition[1]);
        //console.log(distanceFactor);
        if (currentPosition[0] < gem.loot.x) distanceFactor = Math.min(distanceFactor, (canvas.width - playerScreenCoords[0] - 20) / (dx * actualScale));
        if (currentPosition[0] > gem.loot.x) distanceFactor = Math.min(distanceFactor, (playerScreenCoords[0] - 20) / (-dx * actualScale));
        if (currentPosition[1] < gem.loot.y) distanceFactor = Math.min(distanceFactor, (playerScreenCoords[1] - 20) / (dy * actualScale));
        if (currentPosition[1] > gem.loot.y) distanceFactor = Math.min(distanceFactor, (canvas.height - playerScreenCoords[1] - 20) / (-dy * actualScale));

        //console.log([pixelDistance, distanceFactor]);
        indicatorScreenCoords = [
            distanceFactor * dx * actualScale + playerScreenCoords[0],
            distanceFactor * -dy * actualScale + playerScreenCoords[1]
        ];
        context.lineWidth = 1;
        context.fillStyle = gem.color;
        context.strokeStyle = 'white';
        var normal = [dx / distance, -dy / distance];
        context.beginPath();
        context.moveTo(indicatorScreenCoords[0], indicatorScreenCoords[1]);
        context.lineTo(indicatorScreenCoords[0] - 8 * normal[0] + 20 * normal[1], indicatorScreenCoords[1] - 8 * normal[1] - 20 * normal[0]);
        context.lineTo(indicatorScreenCoords[0] - 8 * normal[0] - 20 * normal[1], indicatorScreenCoords[1] - 8 * normal[1] + 20 * normal[0]);
        context.closePath();
        context.fill();
        context.stroke();
        if (distance >= 10 * gridLength) {
            context.beginPath();
            context.moveTo(indicatorScreenCoords[0] - 15 * normal[0] , indicatorScreenCoords[1] - 15 * normal[1]);
            context.lineTo(indicatorScreenCoords[0] - 20 * normal[0] + 18 * normal[1], indicatorScreenCoords[1] - 20 * normal[1] - 18 * normal[0]);
            context.lineTo(indicatorScreenCoords[0] - 20 * normal[0] - 18 * normal[1], indicatorScreenCoords[1] - 20 * normal[1] + 18 * normal[0]);
            context.closePath();
            context.fill();
            context.stroke();
        }
        if (distance >= 15 * gridLength) {
            context.beginPath();
            context.moveTo(indicatorScreenCoords[0] - 27 * normal[0] , indicatorScreenCoords[1] - 27 * normal[1]);
            context.lineTo(indicatorScreenCoords[0] - 30 * normal[0] + 15 * normal[1], indicatorScreenCoords[1] - 30 * normal[1] - 15 * normal[0]);
            context.lineTo(indicatorScreenCoords[0] - 30 * normal[0] - 15 * normal[1], indicatorScreenCoords[1] - 30 * normal[1] + 15 * normal[0]);
            context.closePath();
            context.fill();
            context.stroke();
        }
        //context.arc(indicatorScreenCoords[0], indicatorScreenCoords[1], 20, 0, 2 * Math.PI);
        /*context.beginPath();
        context.arc(indicatorScreenCoords[0] - 20 * normal[0], indicatorScreenCoords[1] - 20 * normal[1], 20, 0, 2 * Math.PI);
        context.fill();
        context.stroke();*/
    }
}

function onObtainGem() {
    var gem = this.gem;
    var loot = this.gem.loot;
    gem.loot = null;
    gem.history.push({'x': currentPosition[0], 'y': currentPosition[1], 'time': now()});
    var radiusSquared = gem.collectRadius * gem.collectRadius;
    // We don't need to restart bonus counter because it is already counting for this pickup.
    for (var tileData of activeTiles) {
        for (var loot of tileData.loot) {
            // ignore loot already being collected.
            if (collectingLoot.indexOf(loot) >= 0) continue;
            var dx = currentPosition[0] - loot.x;
            var dy = currentPosition[1] - loot.y;
            // We go ahead and allow claiming monster loot this way.
            if (dx * dx + dy * dy <= radiusSquared) collectingLoot.push(loot);
        }
    }
    gem.counter = gem.ticks;
}
