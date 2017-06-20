var currentPosition, currentGridCoords, clickedCoords, lastGoalPoint, lastGoalTime, selectedTile = null;
var canvas = $('canvas')[0];
var context = canvas.getContext('2d');
context.imageSmoothingEnabled = false;
var path = [];
var heading= [0, -1]; //north
var testMode = window.location.search.substr(1).indexOf('test') >= 0;
var debugMode = window.location.search.substr(1).indexOf('debug') >= 0;
var coins = testMode ? 10 : 10;
var gridData = {};
var levelColors = [shallowSource, sandSource, dirtSource, grassSource, forestSource, hillSource, mountainSource, peakSource, iceSource];
var maxLevel = levelColors.length - 1;
var levelSums = [];
var radius = minRadius;
var currentScene = 'loading';
var sceneStack = [];
var mainLoopId, updatedScene = false;
setTimeout(function () {
    mainLoopId = setInterval(mainLoop, 40);
}, 400);
function mainLoop() {
    try {
        updatedScene = true;
        if (now() > restartWatchPositionTime) {
            if (navigator.geolocation && !testMode) watchPosition();
        }
        if (lastPositionData) {
            var targetPosition = [lastPositionData.coords.longitude + 360, lastPositionData.coords.latitude + 360];
            if (!currentPosition || fixingGPS) {
                setCurrentPosition(targetPosition);
            } else {
                // GPS provided position can jump around a bit, so ease towards the new location once we have a current position.
                setCurrentPosition([(currentPosition[0] * 9 + targetPosition[0]) / 10, (currentPosition[1] * 9 + targetPosition[1]) / 10]);
                var lastDirection = direction;
                var dx = targetPosition[0] - currentPosition[0];
                var dy = targetPosition[1] - currentPosition[1];
                if (Math.abs(dx) >= Math.abs(dy)) {
                    if (dx > 0) direction = 'right';
                    else if (dx < 0) direction = 'left';
                } else {
                    if (dy > 0) direction = 'up';
                    else if (dy < 0) direction = 'down';
                }
                if (Math.abs(dx) < gridLength / 200 && Math.abs(dy) < gridLength / 200 && Math.floor(walkTime / 250) % walkOffsets.length === 0) {
                    walkTime = 0;
                } else if (direction !== lastDirection) {
                    walkTime = 250;
                } else {
                    walkTime += 40;
                }
            }
            if (!origin) origin = currentPosition;
            var target = [origin[0], origin[1]];
            if (fastMode || fixingGPS) {
                target = currentPosition;
            } else if (currentScene === 'map' && selectedTile) {
                target = [selectedTile.centerX, selectedTile.centerY];
            } else {
                screenCoords = project(currentPosition);
                var scaleToUse = getActualScale();
                if (screenCoords[0] < 120) target[0] = currentPosition[0] + (canvas.width / 2 - 120) / scaleToUse;
                if (screenCoords[0] > canvas.width - 120) target[0] = currentPosition[0] - (canvas.width / 2 - 120) / scaleToUse;
                if (screenCoords[1] < 120) target[1] = currentPosition[1] - (canvas.height / 2 - 120) / scaleToUse;
                if (screenCoords[1] > canvas.height - 120) target[1] = currentPosition[1] + (canvas.height / 2 - 120) / scaleToUse;
                //target = ifdefor(currentPosition, [180 + gridLength / 2, 180 + gridLength / 2]);
            }
            if (!origin) origin = target;
            else {
                origin[0] = (origin[0] * 10 + target[0]) / 11;
                origin[1] = (origin[1] * 10 + target[1]) / 11;
            }
        }
        if (currentScene !== 'loading' && currentScene !== 'title') {
            updatePlayerStats();
        }
        switch (currentScene) {
            case 'loading':
                // Show the title scene once all images are loaded.
                /*if (!confirm(Object.keys(imagesLoading).join(','))) {
                    clearTimeout(mainLoopId);
                }*/
                if(numberOfImagesLeftToLoad === 0) {
                    createOutlinedMoneyImage();
                    currentScene = 'title';
                }
                break;
            case 'map':
                updateMap();
                break;
            case 'dungeon':
                updateDungeon();
                break;
            case 'treasureMap':
                updateTreasureMap();
                break;
        }
    } catch (error) {
        clearTimeout(mainLoopId);
        console.log(error.message);
        if (debugMode) alert(error.message);
        throw error;
    }
}

function animate() {
    window.requestAnimationFrame(animate);
    if (!updatedScene) return;
    updatedScene = false;
    drawScene();
}
animate();

function watchError() {
    $('body').append('<div>There was an error getting position!</div>');
}
var iconSize = 32, dungeonScale;
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    iconSize = 16 * Math.floor(Math.min(canvas.width / 6, canvas.height / 6) / 16);
    dungeonScale = Math.min((canvas.height - 20) / (5 * gridLength), (canvas.width - 20) / (5 * gridLength));
    drawScene();
}
$( window ).resize(resizeCanvas);
var lastPositionData;
function updatePosition(position) {
    restartWatchPositionTime = now() + 2000;
    if (lastPositionData) {
        var oldCoords = [lastPositionData.coords.longitude, lastPositionData.coords.latitude];
        var newCoords = [position.coords.longitude, position.coords.latitude];
        if (getDistance(oldCoords, newCoords) > gridLength) {
            setFixingGPS();
        }
    }
    lastPositionData = position;
    //console.log([position.coords.longitude, position.coords.latitude]);
    //console.log((Math.round((position.coords.longitude + 360) * 1e10)));
    //console.log((Math.round((position.coords.longitude + 360) * 1e10) % 1000000));
    //var currentPosition = [(Math.round((position.coords.longitude + 360) * 1e10) % 1000000), (Math.round((position.coords.latitude + 360) * 1e10) % 1000000)];

    //$('body').append('<div>' + (currentPosition[0] - firstPosition[0]) + '/' + (currentPosition[1] - firstPosition[1]) + ' -> ' + project(currentPosition) +'</div>');
    //$('body').append('<div>' + project(currentPosition) +'</div>');
    /*path.push(currentPosition);
    if (position.coords.heading) {
        var radians = position.coords.heading * Math.PI / 180;
        heading = [Math.sin(radians), -Math.cos(radians)];
    }*/
    //drawScene();
}
function setFixingGPS() {
    fixingGPS = true;
    fastMode = false;
    startingFastMode = false;
    endFixingGPSTime = now() + 2000;
    clearAllGems();
}
function getGridRectangle(coords) {
    var topLeft = project([coords[0] * gridLength, (coords[1] + 1) * gridLength]);
    var bottomRight = project([(coords[0] + 1) * gridLength, (coords[1]) * gridLength]);
    return {'left': Math.ceil(topLeft[0]), 'top':Math.ceil(topLeft[1]), 'width': Math.ceil(bottomRight[0] - topLeft[0]), 'height': Math.ceil(bottomRight[1] - topLeft[1])};
}
function project(coords) {
    var origin = getOrigin();
    var scaleToUse = getActualScale();
    var x = Math.round((coords[0] - origin[0]) * scaleToUse) + Math.round(canvas.width / 2);
    var y = Math.round(-(coords[1] - origin[1]) * scaleToUse) + Math.round(canvas.height / 2);
    return [x, y];
}
function unproject(screenCoords) {
    var origin = getOrigin();
    var scaleToUse = getActualScale();
    var longitude = (screenCoords[0] - canvas.width / 2) / scaleToUse + origin[0];
    var lat = -(screenCoords[1] - canvas.height / 2) / scaleToUse + origin[1];
    return [longitude, lat];
}
function toGridCoords(realCoords) {
    return [Math.floor(realCoords[0] / gridLength), Math.floor(realCoords[1] / gridLength)];
}
function toRealCoords(gridCoords) {
    return [gridCoords[0] * gridLength, gridCoords[1] * gridLength];
}
function updateGameState() {
    radius = (radius * 2 + maxRadius) / 3;
    if (currentHealth < maxHealth && !fightingMonster) {
        currentHealth = Math.min(maxHealth, currentHealth + Math.ceil(maxHealth / 20 + maxHealth * getSkillValue(skillTree.health.regeneration)));
    }
    for (var tile of activeTiles) {
        if (tile.exhausted) {
            tile.exhaustCounter++;
            if (tile.exhaustCounter >= tile.exhausted) {
                tile.exhausted = false;
                checkToGenerateMonster(tile, .5);
            }
        }
        if (!tile.exhausted) {
            checkToGenerateLootForTile(tile);
            checkToGenerateMonster(tile, .05);
        }
    }
    checkToSpawnGems();
}
function exhaustTile(tile) {
    tile.exhausted = tile.level * 2 + 8;
    tile.exhaustCounter = 0;
}
function getTilePower(tile) {
    var power = 1 + ifdefor(levelSums[1], 0) / 50 + tile.level / 5;
    for (var sideKey of ['-1x0', '1x0', '0x-1', '0x1']) {
        if (tile.neighbors[sideKey]) power += (tile.neighbors[sideKey].level) / 5;
    }
    for (var cornerKey of ['-1x-1', '-1x1', '1x-1', '1x1']) {
        if (tile.neighbors[cornerKey]) power += (tile.neighbors[cornerKey].level) / 10;
    }
    return power;
}
var activeTiles = [];
var selectableTiles = [];
function setCurrentPosition(realCoords) {
    currentPosition = realCoords;
    if (!lastGoalPoint || fixingGPS) {
        lastGoalPoint = currentPosition;
        lastGoalTime = now();
    } else if (getDistance(currentPosition, lastGoalPoint) > gridLength / 2) {
        lastGoalPoint = currentPosition;
        updateFastMode(now() - lastGoalTime);
        lastGoalTime = now();
        updateGameState();
    }
    if (fastMode && now() > endFastModeTime) {
        fastMode = startingFastMode = false;
        checkToSpawnGems();
    }
    if (fixingGPS && now() > endFixingGPSTime) {
        fixingGPS = false;
         if ((currentScene !== 'loading' && currentScene !== 'title') && currentGridCoords) {
            exploreSurroundingTiles();
        }
        checkToSpawnGems();
    }
    // Only apply updates for moving if we are displaying the map scene.
    if (currentScene === 'loading' || currentScene === 'title') return;
    var newGridCoords = toGridCoords(realCoords);
    if (currentGridCoords && currentGridCoords[0] === newGridCoords[0] && currentGridCoords[1] === newGridCoords[1]) {
        return;
    }
    currentGridCoords = newGridCoords;

    if (!fixingGPS) exploreSurroundingTiles();
    refreshActiveTiles();
}
function exploreSurroundingTiles() {
    var newTileFound = false;
    for (var dy = -1; dy <=1; dy++) {
        for (var dx = -1; dx <=1; dx++) {
            var tileData = getTileData([currentGridCoords[0] + dx, currentGridCoords[1] + dy], true);
            if (tileData.level < 0) {
                gridData[tileData.key] = tileData;
                initializeTile(tileData);
                tileData.level = 0;
                checkToGenerateLootForTile(tileData);
                newTileFound = true;
            }
        }
    }
    if (newTileFound) {
        saveGame();
        refreshActiveTiles();
    }
}
function refreshActiveTiles() {
    if (currentDungeon) return;
    var oldActiveTiles = activeTiles;
    activeTiles = [];
    selectableTiles = [];
    activeMonsters = [];
    activePowerups = [];
    for (var y = currentGridCoords[1] - 4; y <= currentGridCoords[1] + 4; y++) {
        for (var x = currentGridCoords[0] - 4; x <= currentGridCoords[0] + 4; x++) {
            var key = x + 'x' + y;
            if (!gridData[key]) {
                var tileData = getTileData([x, y], true);
                tileData.level = -1;
                gridData[key] = tileData;
                initializeTile(tileData);
            }
            var tileData = gridData[key];
            if (x >= currentGridCoords[0] - 3 && x <= currentGridCoords[0] + 3
                && y >= currentGridCoords[1] - 3 && y <= currentGridCoords[1] + 3) {
                selectableTiles.push(tileData);
            }
            activeTiles.push(tileData);
            if (tileData.monster) activeMonsters.push(tileData.monster);
            for (var loot of tileData.loot) {
                if (loot.treasure.type !== 'coins') {
                    activePowerups.push(loot);
                }
            }
            // If a tile becomes active with no loot and isn't exhausted, make it spawn loot.
            if (tileData.exhausted) continue;
            if (tileData.loot.length) continue;
            checkToGenerateLootForTile(tileData);
            checkToGenerateMonster(tileData, .25);
        }
    }
    if (selectedTile && selectableTiles.indexOf(selectedTile) < 0) selectedTile = null;
    for (var tile of oldActiveTiles) {
        if (activeTiles.indexOf(tile) < 0 ) delete tile.canvas;
    }
}
function initializeTile(tileData) {
    var realCoords = toRealCoords([tileData.x, tileData.y]);
    tileData.centerX = realCoords[0] + gridLength / 2;
    tileData.centerY = realCoords[1] + gridLength / 2;
    if (!tileData.loot) tileData.loot = [];
    if (!tileData.neighbors) {
        tileData.neighbors = {};
        for (var y = -1; y <= 1; y++) {
            for (var x = -1; x <= 1; x++) {
                if (x === 0 && y === 0) continue;
                var neighbor = gridData[(tileData.x + x) +'x' + (tileData.y + y)];
                if (!neighbor) continue;
                tileData.neighbors[x + 'x' + y] = neighbor;
                neighbor.neighbors[(-x) + 'x' + (-y)] = tileData;
            }
        }
    }
    for (var i = 0; i <= tileData.level; i++) {
        levelSums[i] = ifdefor(levelSums[i], 0) + (1 + tileData.level - i);
    }
}
var origin;
var watchPositionId, restartWatchPositionTime = 0;
function getOrigin() {
    if (currentScene === 'treasureMap') {
        return [gridLength * (currentMap.size) / 2,
                gridLength * (currentMap.size - 1) / 2];
    }
    return currentDungeon ? [gridLength / 2, gridLength / 2] : origin;
}
if (testMode) {
    var stepSize = gridLength / 3;
    lastPositionData = {'coords': {'longitude': gridLength / 2, 'latitude': gridLength / 2}};
    $(document).on('keydown', function(event) {
        //console.log(event.which)
        if (event.which === 37) lastPositionData.coords.longitude -= stepSize;
        if (event.which === 39) lastPositionData.coords.longitude += stepSize;
        if (event.which === 38) lastPositionData.coords.latitude += stepSize;
        if (event.which === 40) lastPositionData.coords.latitude -= stepSize;
        // setFixingGPS();
    });
} else if (navigator.geolocation) {
    watchPosition();
} else {
    $('body').html("Geolocation is not supported by this browser.");
}
function watchPosition() {
    restartWatchPositionTime = now() + 5000;
    // Clear previous listener, if any.
    if (watchPositionId) navigator.geolocation.clearWatch(watchPositionId);
    watchPositionId = navigator.geolocation.watchPosition(updatePosition, watchError, { enableHighAccuracy: true, maximumAge: 100, timeout: 50000 });
}
function tileIsExplored(gridCoords) {
    var key = gridCoords[0] + 'x' + gridCoords[1];
    return !!gridData[key];
}
function getTileData(gridCoords, returnDefault) {
    var key = gridCoords[0] + 'x' + gridCoords[1];
    return ifdefor(gridData[key], returnDefault ? {'level': 0, 'power': 0, 'key': key, 'x': gridCoords[0], 'y': gridCoords[1]} : null);
}

var maxScale = 5e5;
var minScale = 1.5e5;
var actualScale = scale;
function getActualScale() {
    if (currentScene === 'treasureMap') {
        return Math.min(
                (canvas.height - 2 * iconSize) / (currentMap.size * gridLength),
                (canvas.width - iconSize) / (currentMap.size * gridLength));
    }
    if (currentDungeon) {
        return dungeonScale;
    }
    return actualScale;
}
var lastTouchEvent = null, firstTouchEvent = null;
var lastClick = [0,0];
var touchMoved = false;
document.addEventListener('touchstart', function(event) {
    event.preventDefault();
    lastTouchEvent = event;
    firstTouchEvent = event;
    touchMoved = false;
});
document.addEventListener('touchmove', function (event) {
    event.preventDefault();
    touchMoved = true;
    if (currentScene !== 'map') return;
    if (!lastTouchEvent) return;
    if (lastTouchEvent.touches.length === 1 && event.touches.length === 1) {
        var dx = event.touches[0].pageX - lastTouchEvent.touches[0].pageX;
        var dy = event.touches[0].pageY - lastTouchEvent.touches[0].pageY;
        origin[0] -= dx / getActualScale();
        origin[1] += dy / getActualScale();
        lastTouchEvent = event;
        if (!fightingMonster) selectedTile = null
        return;
    }
    //if (debugMode) alert([lastTouchEvent.touches.length,event.touches.length]);
    if (lastTouchEvent.touches.length === 2 && event.touches.length === 2) {
        var touchScale = getTouchEventDistance(event) / getTouchEventDistance(lastTouchEvent);
        //if (debugMode) alert([getTouchEventDistance(event), getTouchEventDistance(lastTouchEvent)]);
        touchScale = Math.max(.8, Math.min(1.2, isNaN(touchScale) ? 1 : touchScale));
        scale = Math.min(maxScale, Math.max(minScale, scale * touchScale));
        actualScale = Math.round(gridLength * scale) / gridLength;
        lastTouchEvent = event;
        return;
    }
});
document.addEventListener('touchend', function(event) {
    event.preventDefault();
    /*if (debugMode) {
        alert('end');
        alert(touchMoved);
        alert(lastTouchEvent.touches.length);
        alert(firstTouchEvent.touches.length);
    }*/
    if (!touchMoved && lastTouchEvent.touches.length === 1 && firstTouchEvent.touches.length === 1) {
        //if (debugMode) alert([lastTouchEvent.touches[0].pageX , lastTouchEvent.touches[0].pageY]);
        //if (debugMode) alert([$(this).offset().left , $(this).offset().top]);
        var x = lastTouchEvent.touches[0].pageX;
        var y = lastTouchEvent.touches[0].pageY;
        //if (debugMode) alert([x, y]);
        lastClick = [x, y];
        switch (currentScene) {
            case 'title':
                handleTitleClick(x, y);
                break;
            case 'map':
                handleMapClick(x, y);
                break;
            case 'dungeon':
                handleDungeonClick(x, y);
                break;
            case 'treasureMap':
                handleTreasureMapClick(x, y);
                break;
            case 'skills':
                handleSkillsClick(x, y);
                break;
        }
    }
    lastTouchEvent = null;
    firstTouchEvent = null;
    touchMoved = false;
});
if (testMode) {
    document.addEventListener('mousedown', function(event) {
        lastTouchEvent = event;
        firstTouchEvent = event;
        touchMoved = false;
    });
    document.addEventListener('mousemove', function (event) {
        if (currentScene !== 'map') return;
        if (!lastTouchEvent) return;
        var dx = event.pageX - lastTouchEvent.pageX;
        var dy = event.pageY - lastTouchEvent.pageY;
        origin[0] -= dx / getActualScale();
        origin[1] += dy / getActualScale();
        lastTouchEvent = event;
        touchMoved = true;
    });
    document.addEventListener('mouseup', function(event) {
        if (!touchMoved) {
            var x = lastTouchEvent.pageX;
            var y = lastTouchEvent.pageY;
            lastClick = [x, y];
            switch (currentScene) {
                case 'title':
                    handleTitleClick(x, y);
                    break;
                case 'map':
                    handleMapClick(x, y);
                    break;
                case 'dungeon':
                    handleDungeonClick(x, y);
                    break;
                case 'treasureMap':
                    handleTreasureMapClick(x, y);
                    break;
                case 'skills':
                    handleSkillsClick(x, y);
                    break;
            }
        }
        lastTouchEvent = null;
        firstTouchEvent = null;
        touchMoved = false;
    });
}
function pushScene(newScene) {
    history.pushState({'scene': newScene}, '');
    sceneStack.push(currentScene);
    currentScene = newScene;
}
function popScene() {
    history.back();
}
var ignoreNextPop = false;
window.onpopstate = function (event) {
    if (ignoreNextPop) {
        ignoreNextPop = false;
        return;
    }
    if (sceneStack.length) {
        /*
         * This code prevents the forward button from acting like the back button, but
         * it isn't clear it works in all cases.
        if (history.state && history.state.scene !== sceneStack[sceneStack.length - 1]) {
            ignoreNextPop = true;
            history.back();
            return;
        }*/
        if (currentScene === 'skills') {
            currentScene = sceneStack.pop();
        } else if (currentScene === 'treasureMap') {
            hideTreasureMap();
        } else if (currentScene === 'map') {
            if (confirm('Are you sure you want to quit and return to the main menu?')) {
                saveGame();
                currentScene = sceneStack.pop();
            } else {
                history.pushState({}, '');
            }
        } else if (currentDungeon) {
            if (confirm('Are you sure you want to exit the dungeon?')) {
                exitDungeon();
            } else {
                history.pushState({}, '');
            }
        }
    }
}
function getTouchEventDistance(touchEvent) {
    var dx = touchEvent.touches[0].pageX - touchEvent.touches[1].pageX;
    var dy = touchEvent.touches[0].pageY - touchEvent.touches[1].pageY;
    return Math.sqrt(dx * dx, dy *dy);
}
function getDistance(A, B) {
    return Math.sqrt((A[0] - B[0]) * (A[0] - B[0]) + (A[1] - B[1]) * (A[1] - B[1]));
}
resizeCanvas();