import { drawAvatar } from 'app/avatar';
import { drawDamageIndicators, getFightOrFleeButton, updateBattle } from 'app/battle';
import { isDebugMode } from 'app/context';
import { createCanvas } from 'app/dom';
import {
    drawBar, drawEmbossedText, drawFrame, drawOutlinedImage,
    drawRectangleFrame, drawSolidTintedImage, drawTintedImage, pad,
} from 'app/draw';
import { gridLength, maxTileLevel } from 'app/gameConstants';
import { drawGemIndicators, updateGems } from 'app/gems';
import { handleHudButtonClick, renderHudButtons } from 'app/hud';
import {
    heartSource, outlinedMoneySource, upArrows,
    oceanSource,
    shallowSource,
    sandSource,
    dirtSource,
    grassSource,
    forestSource,
    hillSource,
    mountainSource,
    iceSource,
} from 'app/images';
import {
    checkToGenerateLootForTile, drawLootTotals, getCollectButton,
    getCollectionRadius, updateLootCollection, updateTileLoot,
} from 'app/loot';
import { checkToGenerateMonster, drawTileMonster } from 'app/monsters';
import { saveGame } from 'app/saveGame';
import { drawDungeonStats, getEnterExitButton } from 'app/scenes/dungeonScene';
import { getSkillValue, getSkillButton } from 'app/scenes/skillsScene';
import { getTreasureMapButton } from 'app/scenes/treasureMapScene';
import { drawAvatarStats, drawMonsterStats } from 'app/statsBox';
import { abbreviateNumber, rectanglesOverlap } from 'app/utils/index';
import {
    getActualScale, getGridRectangle, getTileData,
    project, isTileExplored, toGridCoords, unproject,
} from 'app/world';
import { Frame, GameState, HudButton, LootMarker, MapTile } from 'app/types';

export const levelColors = [
    shallowSource,
    sandSource,
    dirtSource,
    grassSource,
    forestSource,
    hillSource,
    mountainSource,
    iceSource,
];

if (levelColors.length !== maxTileLevel + 1) {
    console.error(`Incorrect number of tiles found, expected ${maxTileLevel + 1} found ${levelColors.length}`, levelColors.length);
}

export function getTilePower(state: GameState, tile: MapTile): number {
    if (!tile.neighbors) {
        console.error(tile);
        throw new Error('Expected tile.neighbors to be defined');
    }
    // Base power is 1 + 5% of total tiles leveled + 25% of current tile level.
    let power = 1 + (state.world.levelSums[1] ?? 0) / 20 + tile.level / 4;
    // Tile gains 10% of each of its neighbors level.
    for (const sideKey of [1, 3, 5, 7]) {
        power += (tile.neighbors[sideKey]?.level ?? 0) / 10;
    }
    // Tile gains 5% of each of its corner neighbors level.
    for (const cornerKey of [0, 2, 6, 8]) {
        power += (tile.neighbors[cornerKey]?.level ?? 0) / 20;
    }
    return power;
}

export function updateMap(state: GameState) {
    state.loot.lootInRadius = [];
    state.loot.lootInMonsterRadius = [];
    updateLootCollection(state);
    for (const mapTile of state.world.activeTiles) {
        updateTileLoot(state, mapTile);
    }
    updateBattle(state);
    updateGems(state);
}

function getMapHudButtons(): HudButton[] {
    return [
        getFightOrFleeButton(),
        getSkillButton(),
        getCollectButton(),
        getEnterExitButton(),
        getTreasureMapButton(),
        upgradeTileButton,
    ];
}
// Update the targets for skill buttons for the current display settings.
// This should be called each frame before checking for user clicks or rendering the buttons.
let lastCanvasSize: {w: number, h: number};
function updateAllMapButtonTargets(state: GameState): void {
    const { canvas } = state.display;
    if (lastCanvasSize?.w === canvas.width && lastCanvasSize?.h === canvas.height) {
        return;
    }
    lastCanvasSize = {w: canvas.width, h: canvas.height};
    for (const button of getMapHudButtons()) {
        button.updateTarget(state);
    }
}

export function handleMapClick(state: GameState, x: number, y: number): void {
    if (state.globalPosition.isFastMode || state.globalPosition.isFixingGPS) {
        return;
    }
    updateAllMapButtonTargets(state);
    if (handleHudButtonClick(state, x, y, getMapHudButtons())) {
        return;
    }
    const clickedCoords = unproject(state, [x, y]);
    const clickedGridCoords = toGridCoords(clickedCoords);
    if (isTileExplored(state, clickedGridCoords) && !state.battle.engagedMonster) {
        const clickedTile = getTileData(state, clickedGridCoords);
        if (state.selectedTile === clickedTile) {
            delete state.selectedTile;
        } else if (state.world.selectableTiles.has(clickedTile)) {
            state.selectedTile = clickedTile;
        }
    }
}

export function drawMapScene(context: CanvasRenderingContext2D, state: GameState) {
    const { canvas, iconSize } = state.display;
    // Draws the background as well as all markers (loot, monsters + dungeons).
    drawGrid(context, state);
    // Draw the collection radius ring, but only if we know the current position and the player
    // is not currently collecting loot or the player is auto-collecting loot in fast mode.
    if (state.world.currentPosition && (state.globalPosition.isFastMode || state.loot.collectingLoot.length === 0)) {
        //
        const point = project(state, state.world.currentPosition);
        context.save();
            context.globalAlpha = .3;
            context.strokeStyle = 'gold';
            context.lineWidth = 4;
            context.beginPath();
            context.arc(point[0], point[1], getCollectionRadius(state) * getActualScale(state), 0 , 2 * Math.PI);
            context.stroke();
        context.restore();
    }
    drawAvatar(context, state);
    drawDamageIndicators(context, state);

    const { selectedTile } = state;
    if (selectedTile && !selectedTile.monsterMarker && !selectedTile.dungeonMarker) {
        const rectangle = getGridRectangle(state, [selectedTile.x, selectedTile.y]);
        const canUpgrade = canUpgradeTile(state, selectedTile);
        context.save();
            context.globalAlpha *= 0.6;
            drawRectangleFrame(context, 'white', 4, pad(rectangle, 1));
        context.restore();
        drawRectangleFrame(context, canUpgrade ? 'green' : 'red', 2, rectangle);
    }
    const hideStatsIn = state.loot.hideStatsAt - state.time;
    if (!state.globalPosition.isFastMode && !state.globalPosition.isFixingGPS && hideStatsIn > 0) {
        context.save();
            context.globalAlpha = Math.max(0, Math.min(1, hideStatsIn / 1000));
            drawAvatarStats(context, state);
        context.restore();
    } else {
        drawLifeIndicator(context, state);
    }
    // Force showing stats if the avatar is in the selected tile.
    if (selectedTile?.x === state.world.currentGridCoords?.[0] && selectedTile?.y === state.world.currentGridCoords?.[1]) {
        state.loot.hideStatsAt = state.time + 1500;
    }
    drawMonsterStats(context, state);
    if (selectedTile?.dungeonMarker) {
        drawDungeonStats(context, state, selectedTile.dungeonMarker.dungeon);
    }
    // collect coins button is replaced by 'Fight!' button when a monster is selected.
    if (state.globalPosition.isFixingGPS) {
        const fontSize = Math.floor(3 * iconSize / 4);
        context.font = fontSize + 'px sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'bottom';
        let text = 'Updating';
        for (let i = 0; i < (state.globalPosition.endFixingGPSTime - state.time) / 1000; i++) {
            text = '-' + text + '-';
        }
        drawEmbossedText(context, text, 'gold', 'black', canvas.width / 2, canvas.height - 10);
    } else if (state.globalPosition.isFastMode) {
        const fontSize = Math.floor(3 * iconSize / 4);
        context.font = fontSize + 'px sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'bottom';
        let text = 'Fast Mode';
        for (let i = 0; i < (state.globalPosition.endFastModeTime - state.time) / 2000; i++) {
            text = '-' + text + '-';
        }
        drawEmbossedText(context, text, 'gold', 'black', canvas.width / 2, canvas.height - 10);
    } else {
        drawGemIndicators(context, state);
        updateAllMapButtonTargets(state);
        renderHudButtons(context, state, getMapHudButtons());
    }
    drawCoinsIndicator(context, state);
    drawLootTotals(context, state);
}

export function drawCoinsIndicator(context: CanvasRenderingContext2D, state: GameState) {
    const { canvas, iconSize } = state.display;
    const localIconSize = Math.floor(iconSize / 2);
    const coinsText = abbreviateNumber(state.saved.coins);
    const fontSize = Math.floor( localIconSize * .9);
    context.font = fontSize + 'px sans-serif';
    context.textAlign = 'left'
    context.textBaseline = 'middle';
    const metrics = context.measureText(coinsText);
    const margin = 10;
    const x = canvas.width - metrics.width - localIconSize - 3 * margin;
    const y = margin;
    drawFrame(context, outlinedMoneySource, {x, y, w: localIconSize, h: localIconSize});
    drawEmbossedText(context, coinsText, 'gold', 'white', x + localIconSize, y + Math.round(localIconSize / 2));
}

export function drawLifeIndicator(context: CanvasRenderingContext2D, state: GameState) {
    const { iconSize } = state.display;
    const localIconSize = Math.floor(iconSize / 2);
    const fontSize = Math.floor(3 * localIconSize / 4);
    context.font = fontSize + 'px sans-serif';
    context.textAlign = 'left';
    context.textBaseline = 'top';

    drawFrame(context, heartSource, {x: 10, y: 10, w: localIconSize, h: localIconSize});
    const { currentHealth } = state.saved.avatar;
    const { maxHealth } = state.avatar;
    const healthText = abbreviateNumber(currentHealth) + ' / ' + abbreviateNumber(maxHealth);
    drawEmbossedText(context, healthText, 'red', 'white', 10 + localIconSize + 5, 10);
    drawBar(context, {x: 10, y: 10 + localIconSize + 5, w: localIconSize * 4, h: 6}, 'white', 'red', currentHealth / maxHealth);
}

const upgradeTileButton: HudButton = {
    onClick(state: GameState): void {
        if (!state.selectedTile) {
            throw new Error('Expected state.selectedTile to be defined');
        }
        upgradeTile(state, state.selectedTile);
    },
    isDisabled(state: GameState) {
        const { selectedTile } = state;
        if (!selectedTile) {
            return true;
        }
        const cost = costToUpgrade(state, selectedTile);
        return !canUpgradeTile(state, selectedTile) || cost > state.saved.coins;
    },
    isVisible(state: GameState) {
        const { selectedTile } = state;
        if (!selectedTile) {
            return false;
        }
        if (selectedTile.monsterMarker || selectedTile.dungeonMarker) {
            return false;
        }
        return true;
    },
    render(context: CanvasRenderingContext2D, state: GameState): void {
        const { iconSize } = state.display;
        const { selectedTile } = state;
        if (!selectedTile) {
            return;
        }

        const canUpgrade = canUpgradeTile(state, selectedTile);
        const cost = costToUpgrade(state, selectedTile);
        const canAfford = cost <= state.saved.coins;
        context.save();
            if (!canAfford || !canUpgrade) {
                context.globalAlpha = .5;
            }
            context.textBaseline = 'middle';
            context.textAlign = 'left';
            context.font = Math.floor(3 * iconSize / 4) + 'px sans-serif';
            var text = canUpgrade ? '-' + abbreviateNumber(cost) : '---';
            drawSolidTintedImage(context, (canAfford && canUpgrade) ? 'green' : 'red', upArrows, {...this.target, w: iconSize, h: iconSize});
            drawEmbossedText(context, text, canAfford ? 'white' : 'red', 'black', this.target.x + iconSize, this.target.y + iconSize / 2);
        context.restore();
    },
    updateTarget(state: GameState): void {
        const { canvas, iconSize } = state.display;
        const w = iconSize;
        // Bottom center of the screen.
        this.target = {
            x: Math.floor((canvas.width - w) / 2),
            y: canvas.height - 10 - iconSize,
            w,
            h: iconSize
        };
    },
    target: { x: 0, y: 0, w: 0, h: 0}
};

function upgradeTile(state: GameState, tile: MapTile): void {
    const cost = costToUpgrade(state, tile);
    if (!cost || state.saved.coins < cost) {
        return;
    }
    tile.level++;
    delete tile.canvas;
    if (tile.neighbors) {
        for (const neighbor of tile.neighbors) {
            delete neighbor.canvas;
        }
    }
    state.saved.coins -= cost;
    for (var i = 0; i <= tile.level; i++) {
        state.world.levelSums[i] = (state.world.levelSums[i] ?? 0) + 1;
    }
    tile.exhaustedDuration = 0;
    checkToGenerateLootForTile(state, tile);
    checkToGenerateMonster(state, tile, .5);
    delete state.selectedTile;
    saveGame(state);
}
function canUpgradeTile(state: GameState, tile: MapTile): boolean {
    if (!tile.neighbors) {
        return false;
    }
    let neighborSum = 0;
    let numNeighbors = 0;
    for (let i = 0; i < tile.neighbors.length; i++) {
        if (tile === tile.neighbors[i] || !tile.neighbors[i]) {
            continue;
        }
        numNeighbors++;
        neighborSum += tile.neighbors[i].level ?? 0;
    }
    return tile.level >= 0 && (numNeighbors >= 8) && (neighborSum >= (8 * tile.level));
}
function costToUpgrade(state: GameState, tile: MapTile): number {
    if (tile.level >= maxTileLevel) {
        return -1;
    }
    let cost = 5;
    for (let i = 1; i <= tile.level + 1; i++) {
        cost += 2 * ((state.world.levelSums[i] ?? 0) + 1) * Math.pow(10, i - 1);
    }
    return Math.floor(cost * (1 - getSkillValue(state, 'explorer')));
}

function createOrUpdateTileCanvas(state: GameState, tile: MapTile, scaleToUse: number) {
    if (!tile.neighbors) {
        return;
    }
    tile.scale = scaleToUse;
    const neighbors = tile.neighbors;
    const rectangle = tile.target;
    const neighborLevel = (dx: number, dy: number): number => {
        return neighbors[(dx + 1) + 3 * (dy + 1)]?.level ?? -1;
    }
    if (!tile.canvas) {
        tile.canvas = createCanvas(rectangle.w, rectangle.h);
    } else {
        tile.canvas.width = rectangle.w;
        tile.canvas.height = rectangle.h;
    }
    const tileContext = tile.canvas.getContext('2d') as CanvasRenderingContext2D;
    tileContext.imageSmoothingEnabled = false;
    // Draw the current tile's pattern to all four corners
    if (tile.level >= 0) {
        const patternSource = levelColors[tile.level];
        drawFrame(tileContext, patternSource,
            {x: 0, y: 0, w: rectangle.w / 2, h: rectangle.h / 2});
        drawFrame(tileContext, patternSource,
            {x: rectangle.w / 2, y: 0, w: rectangle.w / 2, h: rectangle.h / 2});
        drawFrame(tileContext, patternSource,
            {x: 0, y: rectangle.h / 2, w: rectangle.w / 2, h: rectangle.h / 2});
        drawFrame(tileContext, patternSource,
            {x: rectangle.w / 2, y: rectangle.h / 2, w: rectangle.w / 2, h: rectangle.h / 2});
    }
    for (let i = tile.level + 1; i < levelColors.length; i++) {
        // top left
        const patternSource = levelColors[i];
        let cornerSource: Frame | null = {...patternSource};
        if (neighborLevel(0, -1) >= i && neighborLevel(-1, 0) >= i) {
            // top and left filled in
            cornerSource.x += 34;
            cornerSource.y -= 17;
        } else if (neighborLevel(0, -1) >= i) {
            // only top filled in
            cornerSource.y += 17;
        } else if (neighborLevel(-1, 0) >= i) {
            // only left filled in
            cornerSource.x += 17;
        } else if (neighborLevel(-1, -1) >= i) {
            // only corner filled in
            cornerSource.x += 17;
            cornerSource.y += 17;
        } else {
            cornerSource = null;
        }
        /*if (i === 0 && tile === state.selectedTile) {
            console.log('T ', neighborLevel(0, -1));
            console.log('TL', neighborLevel(-1, -1));
            console.log('L ', neighborLevel(-1, 0));
            console.log(patternSource.x, patternSource.y, cornerSource?.x, cornerSource?.y);
        }*/
        if (cornerSource) {
            drawFrame(tileContext, cornerSource, {x: 0, y: 0, w: rectangle.w / 2, h: rectangle.h / 2});
        }

        // top right
        cornerSource = {...patternSource};
        if (neighborLevel(0, -1) >= i && neighborLevel(1, 0) >= i) {
            // top and left filled in
            cornerSource.x += 51;
            cornerSource.y -= 17;
        } else if (neighborLevel(0, -1) >= i) {
            // only top filled in
            cornerSource.y += 17;
        } else if (neighborLevel(1, 0) >= i) {
            // only left filled in
            cornerSource.x -= 17;
        } else if (neighborLevel(1, -1) >= i) {
            // only corner filled in
            cornerSource.x -= 17;
            cornerSource.y += 17;
        } else {
            cornerSource = null;
        }
        if (cornerSource) {
            drawFrame(tileContext, cornerSource,
                {x: rectangle.w / 2, y: 0, w: rectangle.w / 2, h: rectangle.h / 2});
        }

        // bottom left
        cornerSource = {...patternSource};
        if (neighborLevel(0, 1) >= i && neighborLevel(-1, 0) >= i) {
            // top and left filled in
            cornerSource.x += 34;
        } else if (neighborLevel(0, 1) >= i) {
            // only top filled in
            cornerSource.y -= 17;
        } else if (neighborLevel(-1, 0) >= i) {
            // only left filled in
            cornerSource.x += 17;
        } else if (neighborLevel(-1, 1) >= i) {
            // only corner filled in
            cornerSource.x += 17;
            cornerSource.y -= 17;
        } else {
            cornerSource = null;
        }
        if (cornerSource) {
            drawFrame(tileContext, cornerSource,
                {x: 0, y: rectangle.h / 2, w: rectangle.w / 2, h: rectangle.h / 2});
        }

        // bottom right
        cornerSource = {...patternSource};
        if (neighborLevel(0, 1) >= i && neighborLevel(1, 0) >= i) {
            // top and left filled in
            cornerSource.x += 51;
        } else if (neighborLevel(0, 1) >= i) {
            // only top filled in
            cornerSource.y -= 17;
        } else if (neighborLevel(1, 0) >= i) {
            // only left filled in
            cornerSource.x -= 17;
        } else if (neighborLevel(1, 1) >= i) {
            // only corner filled in
            cornerSource.x -= 17;
            cornerSource.y -= 17;
        } else {
            cornerSource = null;
        }
        if (cornerSource) {
            drawFrame(tileContext, cornerSource,
                {x: rectangle.w / 2, y: rectangle.h / 2, w: rectangle.w / 2, h: rectangle.h / 2});
        }
    }
}

function drawGrid(context: CanvasRenderingContext2D, state: GameState): void {
    const { canvas, iconSize } = state.display;
    const scaleToUse = getActualScale(state);
    const canvasRectangle = {x: 0, y: 0, w: canvas.width, h: canvas.height};
    context.fillStyle = 'black';
    context.fillRect(0, 0, canvas.width, canvas.height);
    const { currentGridCoords, currentPosition } = state.world;
    if (!currentGridCoords || !currentPosition) {
        return;
    }
    const gradientLength = 0.3 * scaleToUse * gridLength;
    const topLeftCorner = project(state, [currentPosition[0] - 4 * gridLength, currentPosition[1] - 4 * gridLength]);
    const gridSize = Math.round(gridLength * scaleToUse);
    let x = Math.max(-gradientLength / 2, topLeftCorner[0]);
    let y = Math.max(-gradientLength / 2, topLeftCorner[1]);
    const visibleRectangle = {
        x, y,
        w: Math.min(canvas.width + gradientLength / 2, topLeftCorner[0] + 8 * gridSize) - x,
        h: Math.min(canvas.height + gradientLength / 2, topLeftCorner[1] + 8 * gridSize) - y,
    };
    context.save();
        context.imageSmoothingEnabled = false;
        context.translate(
            Math.round((((state.time / 15)) % 1000 / 1000 - .5) * gridSize),
            Math.round((((state.time / 20)) % 1000 / 1000 - .5) * gridSize)
        );
        const topLeftGridCorner = project(state, [(currentGridCoords[0] - 4) * gridLength, (currentGridCoords[1] - 4) * gridLength]);
        for (let y = topLeftGridCorner[1]; y <= topLeftGridCorner[1] + 9 * gridSize; y += gridSize) {
            for (let x = topLeftGridCorner[0]; x <= topLeftGridCorner[0] + 9 * gridSize; x += gridSize) {
                drawFrame(context, oceanSource, { x, y, w: gridSize, h: gridSize });
            }
        }
    context.restore();

    const visibleTiles = new Set<MapTile>();
    let draws = 0;
    for (const mapTile of state.world.activeTiles) {
        const rectangle = getGridRectangle(state, [mapTile.x, mapTile.y]);
        mapTile.target = rectangle;
        if (!rectanglesOverlap(rectangle, canvasRectangle)) {
            continue;
        }
        visibleTiles.add(mapTile);
        draws++;
        if (!mapTile.canvas || mapTile.scale !== scaleToUse) {
            createOrUpdateTileCanvas(state, mapTile, scaleToUse);
        }
        if (!mapTile.canvas) {
            continue;
        }
        context.drawImage(mapTile.canvas, 0, 0, mapTile.canvas.width, mapTile.canvas.height,
            rectangle.x, rectangle.y, rectangle.w, rectangle.h);
        if (mapTile.exhaustedDuration && mapTile.exhaustCounter !== undefined) {
            const exhaustRadius = Math.min(rectangle.w / 2, rectangle.h / 2) - (1 + mapTile.level) * Math.round(rectangle.w / 30);
            context.save();
            const percent = (mapTile.exhaustedDuration - mapTile.exhaustCounter) / mapTile.exhaustedDuration;

            context.globalAlpha = .25;
            context.fillStyle = 'black';
            context.lineWidth = 3;
            context.strokeStyle = 'white';
            context.beginPath();
            if (percent < 1) context.moveTo(rectangle.x + rectangle.w / 2, rectangle.y + rectangle.h / 2);
            context.arc(rectangle.x + rectangle.w / 2, rectangle.y + rectangle.h / 2, exhaustRadius, -Math.PI / 2 - percent * 2 * Math.PI, -Math.PI / 2);
            if (percent < 1) context.closePath();
            context.stroke();
            context.fill();
            context.restore();
        }
    }
    // Draw coins first
    for (const mapTile of state.world.activeTiles) {
        if (!visibleTiles.has(mapTile)) {
            continue;
        }
        for (const loot of mapTile.lootMarkers) {
            draws++;
            if (loot !== mapTile.powerupMarker && loot !== mapTile.gemMarker) {
                drawLootMarker(context, state, loot, scaleToUse);
            }
        }
    }
    // Powerups + Gems are on top of coins so they don't get obscured.
    for (const mapTile of state.world.activeTiles) {
        if (!visibleTiles.has(mapTile)) {
            continue;
        }
        if (mapTile.powerupMarker) {
            drawLootMarker(context, state, mapTile.powerupMarker, scaleToUse);
        }
        if (mapTile.gemMarker) {
            drawLootMarker(context, state, mapTile.gemMarker, scaleToUse);
        }
    }
    // Draw dungeons + monsters last.
    for (const mapTile of state.world.activeTiles) {
        if (!visibleTiles.has(mapTile)) {
            continue;
        }
        if (mapTile.dungeonMarker) {
            const frame = mapTile.dungeonMarker.dungeon.frame;
            const target = {
                x: mapTile.target.x + mapTile.target.w / 6,
                y: mapTile.target.y + mapTile.target.h / 6,
                w: 2 * mapTile.target.w / 3,
                h: 2 * mapTile.target.w / 3,
            };
            draws++;
            if (mapTile === state.selectedTile) {
                drawOutlinedImage(context, 'red', 2, frame, target);
            } else {
                drawFrame(context, frame, target);
            }
        }
        drawTileMonster(context, state, mapTile, scaleToUse);
    }
    if (visibleRectangle.x + gradientLength > 0) {
        const gradient = context.createLinearGradient(visibleRectangle.x, 0, visibleRectangle.x + gradientLength, 0);
        gradient.addColorStop(0, 'black');
        gradient.addColorStop(1, 'transparent');
        context.fillStyle = gradient;
        context.fillRect(0, 0, visibleRectangle.x + gradientLength, canvas.height);
    }
    if (visibleRectangle.y + gradientLength > 0) {
        const gradient = context.createLinearGradient(0, visibleRectangle.y, 0, visibleRectangle.y + gradientLength);
        gradient.addColorStop(0, 'black');
        gradient.addColorStop(1, 'transparent');
        context.fillStyle = gradient;
        context.fillRect(0, 0, canvas.width, visibleRectangle.y + gradientLength);
    }
    if (visibleRectangle.x + visibleRectangle.w - gradientLength < canvas.width) {
        const left = visibleRectangle.x + visibleRectangle.w - gradientLength;
        const gradient = context.createLinearGradient(left, 0, visibleRectangle.x + visibleRectangle.w, 0);
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(1, 'black');
        context.fillStyle = gradient;
        context.fillRect(left, 0, canvas.width - left, canvas.height);
    }
    if (visibleRectangle.y + gradientLength > 0) {
        const top = visibleRectangle.y + visibleRectangle.h - gradientLength;
        const gradient = context.createLinearGradient(0, top, 0, visibleRectangle.y + visibleRectangle.h);
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(1, 'black');
        context.fillStyle = gradient;
        context.fillRect(0, top, canvas.width, canvas.height - top);
    }
    if (isDebugMode) {
        context.font = Math.round(iconSize / 2) + 'px sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'top';
        drawEmbossedText(context, `${draws}`, 'white', 'black', canvas.width / 2, 5);
    }
}
export function drawLootMarker(context: CanvasRenderingContext2D, state: GameState, lootMarker: LootMarker, scaleToUse: number) {
    const center = project(state, [lootMarker.x, lootMarker.y]);
    const lootScale = gridLength * scaleToUse / 64;
    const w = lootMarker.loot.frame.w * (lootMarker.loot.scale ?? 1) * lootScale;
    const h = lootMarker.loot.frame.h * (lootMarker.loot.scale ?? 1) * lootScale;
    const target = {
        x: Math.round(center[0] - w / 2),
        y: Math.round(center[1] - h / 2),
        w, h,
    };
    if (lootMarker.isInMonsterRadius || lootMarker.isInAvatarRadius) {
        const tintColor = lootMarker.isInMonsterRadius ? 'red' : 'gold';
        drawTintedImage(context, {color: tintColor, amount: .4 + Math.cos(state.time / 150) * .3}, lootMarker.loot.frame, target);
    } else {
        drawFrame(context, lootMarker.loot.frame, target);
    }
}
