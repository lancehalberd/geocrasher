import {drawAvatar, regenerateHealth, resetLootTotals} from 'app/avatar';
import { drawDamageIndicators, getFightOrFleeButton} from 'app/battle';
import { drawEmbossedText, drawFrame, drawOutlinedImage, fillRectangle, pad } from 'app/draw';
import { gridLength } from 'app/gameConstants';
import { handleHudButtonClick, renderHudButtons } from 'app/hud';
import { darkStoneImage, exitSource, portalSource } from 'app/images';
import {
    drawLootTotals,
    generateLootCoins,
    getCollectButton,
    getWeightedPowerup,
    updateLootCollection,
} from 'app/loot';
import { drawTileMonster, makeBossMonster, makeMonster } from 'app/monsters';
import {getSkillButton} from 'app/scenes/skillsScene';
import {drawCoinsIndicator, drawLifeIndicator, drawLootMarker} from 'app/utils/hud';
import {exitDungeon, hideTreasureMap} from 'app/handleBackAction';
import {getTreasureLocation} from 'app/utils/treasureMap';
import {pushScene } from 'app/state';
import { drawAvatarStats, drawMonsterStats } from 'app/statsBox';
import {getAllNeighbors} from 'app/utils/dungeon';
import Random from 'app/utils/Random';
import {getMoneySkillBonus} from 'app/utils/skills';
import {getActualScale, getGridRectangle, toGridCoords, toRealCoords, unproject} from 'app/utils/world';




export function startDungeon(state: GameState, dungeon: Dungeon) {
    state.dungeon.currentDungeon = dungeon;
    pushScene(state, 'dungeon');
    startNewFloor(state);
}
function startNewFloor(state: GameState) {
    delete state.battle.engagedMonster;
    delete state.selectedTile;
    state.world.activeMonsterMarkers = [];
    const { currentDungeon } = state.dungeon;
    if (!currentDungeon) {
        return;
    }
    const currentFloor: DungeonFloor = {tiles: []};
    const { allFloors } = currentDungeon;
    currentDungeon.currentFloor = currentFloor;
    allFloors.push(currentFloor);
    const tileThings: DungeonTileContent[] = [{type: 'upstairs', frame: exitSource}];
    const numberOfMonsters = Random.integerRange(6, 8);
    const minPower = currentDungeon.level * .9, maxPower = currentDungeon.level * 1.1;
    const floorPower = minPower + (maxPower - minPower) * allFloors.length / currentDungeon.numberOfFloors;
    for (let i = 0; i < numberOfMonsters; i++) {
        tileThings.push(makeMonster(state, floorPower - .2 + Math.random() * .4));
    }
    if (allFloors.length < currentDungeon.numberOfFloors) {
        tileThings.push({type: 'downstairs', frame: portalSource})
    }
    if (allFloors.length === currentDungeon.numberOfFloors) {
        tileThings.push(makeBossMonster(state, floorPower));
    }
    // Add at least one power up to each floor, then there is a 20% chance for additional powerups.
    do {
        const powerUpValue = (0.8 + Math.random() * 0.4) * floorPower;
        tileThings.push({type: 'loot', loot: getWeightedPowerup(state, powerUpValue)});
    } while (tileThings.length < 25 && Math.random() < 0.2);

    const floorCoins = Math.ceil((0.8 + Math.random() * 0.4) * getMoneySkillBonus(state) * Math.pow(1.1, floorPower) * floorPower * 50);
    // Intentionally allow more coins than we can hold. Then what the player actually gets will be somewhat random.
    let coinDrops = generateLootCoins(floorCoins, 30);
    // Fewer than 5 coin drops looks too sparse but I don't want to change how generateLootCoins works,
    // so in this case just add another set of coins worth ~1/2 the original amount. So now such floors
    // will have higher value of coins even if by some chance they still have a small # of coins.
    if (coinDrops.length < 5) {
        coinDrops = coinDrops.concat(generateLootCoins(Math.ceil(floorCoins / 2), 30));
    }
    while (tileThings.length < 25 && coinDrops.length) {
        tileThings.push({type: 'loot', loot: Random.removeElement(coinDrops), });
    }
    let startingTile: MapTile | null = null;
    for (let tileY = 0; tileY < 5; tileY++) {
        currentFloor.tiles[tileY] = [];
        for (let tileX = 0; tileX < 5; tileX++) {
            const realCoords = toRealCoords(state, [tileX, tileY]);
            const newTile: MapTile = {
                x: tileX, y: tileY,
                level: 0,
                centerX: realCoords[0] + gridLength / 2,
                centerY: realCoords[1] + gridLength / 2,
                dungeonContents: Random.removeElement(tileThings),
                lootMarkers: [],
                dungeonContentsRevealed: false,
                guards: 0,
                journeyDistance: 0,
                journeyPowerLevel: 0,
                target: {x: 0, y: 0, w: 0, h: 0},
            };
            const { dungeonContents } = newTile;
            if (dungeonContents) {
                const x = newTile.centerX;
                const y = newTile.centerY;
                if (dungeonContents.type === 'loot') {
                    newTile.lootMarkers = [{
                        loot: dungeonContents.loot,
                        tile: newTile,
                        x, y, tx: x, ty: y,
                    }];
                }
                if (dungeonContents.type === 'upstairs') {
                    currentDungeon.dungeonPosition = [tileX, tileY];
                    startingTile = newTile;
                }
                if (dungeonContents.type === 'monster') {
                    newTile.monsterMarker = {
                        type: 'monster',
                        tile: newTile,
                        monster: dungeonContents,
                        x, y,
                    };
                    dungeonContents.marker = newTile.monsterMarker;
                }
            }
            currentFloor.tiles[tileY][tileX] = newTile;
        }
    }
    if (startingTile) {
        revealTile(state, startingTile);
    }
}

export function updateDungeon(state: GameState): void {
    updateLootCollection(state);
}

function revealTile(state: GameState, tile: MapTile): void {
    if (tile.lootMarkers.length) {
        resetLootTotals(state);
        setTimeout(function () {
            for (const lootMarker of tile.lootMarkers) {
                state.loot.collectingLoot.push(lootMarker);
            }
        }, 400);
    }
    if (tile.monsterMarker) {
        state.world.activeMonsterMarkers.push(tile.monsterMarker);
        for (const neighbor of getAllNeighbors(state, tile)) {
            neighbor.guards++;
        }
    }
    regenerateHealth(state);
    tile.dungeonContentsRevealed = true;
    for (const neighbor of getSideNeighbors(state, tile)) {
        neighbor.dungeonContentsRevealable = true;
    }
}

function getSideNeighbors(state: GameState, tile: MapTile): MapTile[] {
    const sideNeighbors: MapTile[] = [];
    if (!state.dungeon.currentDungeon) {
        throw new Error('Current dungeon is not defined');
    }
    for (let y = -1; y <= 1; y++) {
        for (let x = -1; x <= 1; x++) {
            if (x === 0 && y === 0 || (x !==0 && y !== 0)) continue;
            const neighbor = state.dungeon.currentDungeon.currentFloor.tiles[tile.y + y]?.[tile.x + x];
            if (neighbor) {
                sideNeighbors.push(neighbor);
            }
        }
    }
    return sideNeighbors;
}

let lastCanvasSize: {w: number, h: number};
function getDungeonHudButtons(): HudButton[] {
    return [
        getFightOrFleeButton(),
        getSkillButton(),
        getCollectButton(),
        enterExitButton,
    ];
}
// Update the targets for skill buttons for the current display settings.
// This should be called each frame before checking for user clicks or rendering the buttons.
function updateAllDungeonButtonTargets(state: GameState): void {
    const { canvas } = state.display;
    if (lastCanvasSize?.w === canvas.width && lastCanvasSize?.h === canvas.height) {
        return;
    }
    lastCanvasSize = {w: canvas.width, h: canvas.height};
    for (const button of getDungeonHudButtons()) {
        button.updateTarget(state);
    }
}
export function handleDungeonClick(state: GameState, x: number, y: number): boolean {
    if (!state.dungeon.currentDungeon) {
        return false;
    }
    updateAllDungeonButtonTargets(state);
    if (handleHudButtonClick(state, x, y, getDungeonHudButtons())) {
        return true;
    }
    // Cannot explore tiles while fighting a monster
    if (state.battle.engagedMonster) {
        return false;
    }
    // Tile interactions
    const clickedCoords = unproject(state, [x, y]);
    const clickedGridCoords = toGridCoords(state, clickedCoords);
    const tile = state.dungeon.currentDungeon.currentFloor.tiles[clickedGridCoords[1]]?.[clickedGridCoords[0]];
    if (!tile) {
        return false;
    }
    const canRevealTile = tile.dungeonContentsRevealable && tile.guards <= 0;
    if (!tile.dungeonContentsRevealed && canRevealTile) {
        delete state.selectedTile;
        revealTile(state, tile);
        return true;
    } else if (tile === state.selectedTile) {
        delete state.selectedTile;
        return true;
    } else if (tile.dungeonContentsRevealed) {
        state.selectedTile = tile;
        return true;
    }
    return false;
}

export function drawDungeonScene(context: CanvasRenderingContext2D, state: GameState) {
    if (!state.dungeon.currentDungeon) {
        return;
    }
    const { canvas } = state.display;
    const { selectedTile } = state;
    const scaleToUse = getActualScale(state);
    context.fillStyle = context.createPattern(darkStoneImage, 'repeat') as CanvasPattern;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = 'bold ' + Math.floor(gridLength * scaleToUse) + 'px sans-serif';
    const border = 3;
    const allRevealedTiles = [];
    const currentFloor = state.dungeon.currentDungeon.currentFloor;
    for (let y = 0; y < currentFloor.tiles.length; y++) {
        for (let x = 0; x < currentFloor.tiles[y].length; x++) {
            const tile = currentFloor.tiles[y][x];
            tile.target = getGridRectangle(state, [tile.x, tile.y]);
            if (!tile.dungeonContentsRevealed) {
                const canReveal = tile.dungeonContentsRevealable && tile.guards <= 0;
                // Top and left edges.
                fillRectangle(context, (tile === selectedTile) ? 'red' : '#444', tile.target);
                // Bottom and right edges
                context.fillStyle = (tile === selectedTile) ? '#f00' : '#eee';
                context.fillRect(tile.target.x, tile.target.y, tile.target.w - border, tile.target.h - border);
                // Background
                fillRectangle(context, (tile === selectedTile) ? '#600' : (canReveal ? '#bbb' : '#777'), pad(tile.target, -border));
                context.fillStyle = (tile === selectedTile) ? 'red' : '#666';
                context.fillText('?', tile.target.x + tile.target.w / 2, tile.target.y + tile.target.h / 2);
                if (tile.guards) {
                    context.save();
                        context.globalAlpha *= 0.4;
                        fillRectangle(context, 'red', tile.target);
                    context.restore();
                }
                continue;
            }
            allRevealedTiles.push(tile);
            context.save();
                context.globalAlpha = 0.2;
                // Top and left edges.
                fillRectangle(context, '#aaa', tile.target);
                // Bottom and right edges.
                context.fillStyle = '#fff';
                context.fillRect(tile.target.x, tile.target.y, tile.target.w - border, tile.target.h - border);
                // Background.
                fillRectangle(context, '#aaa', pad(tile.target, -border));
            context.restore();
            if (selectedTile === tile) {
                context.beginPath();
                context.rect(tile.target.x, tile.target.y, tile.target.w, tile.target.h);
                context.rect(tile.target.x + border, tile.target.y + border, tile.target.w - 2 * border, tile.target.h - 2 * border);
                context.fillStyle = 'green';
                context.fill('evenodd');
            }
        }
    }
    for (const tile of allRevealedTiles) {
        if (!tile.dungeonContents) {
            continue;
        }
        if (tile.dungeonContents.type === 'loot') {
            // Draw later
        } else if (tile.dungeonContents.type === 'monster') {
            // Draw later
        } else {
            const frame = tile.dungeonContents.frame;
            if (!frame) {
                console.log('Tile with undrawable dungeon contents:', tile);
                continue;
            }
            if (tile === selectedTile) {
                drawOutlinedImage(context, 'red', 2, frame, tile.target);
            } else {
                drawFrame(context, frame, tile.target);
            }
        }
    }
    drawAvatar(context, state);
    for (const tile of allRevealedTiles) {
        if (tile.lootMarkers) {
            for (const loot of tile.lootMarkers) {
                drawLootMarker(context, state, loot, scaleToUse);
            }
        }
        drawTileMonster(context, state, tile, scaleToUse);
    }
    drawDamageIndicators(context, state);
    drawCoinsIndicator(context, state);
    drawLootTotals(context, state, 1000);
    const hideStatsIn = state.loot.hideStatsAt - state.time;
    if (hideStatsIn > 0) {
        context.save();
            context.globalAlpha = Math.max(0, Math.min(1, hideStatsIn / 1000));
            drawAvatarStats(context, state);
        context.restore();
    } else {
        drawLifeIndicator(context, state);
    }
    drawMonsterStats(context, state);
    renderHudButtons(context, state, getDungeonHudButtons());
    // Force the stats box to display indefinitely if the tile the avatar is in is selected.
    if (selectedTile?.x === state.dungeon.currentDungeon.dungeonPosition[0]
        && selectedTile?.y === state.dungeon.currentDungeon.dungeonPosition[1]
    ) {
        state.loot.hideStatsAt = state.time + 1500;
    }
}

const enterExitButton: HudButton = {
    onClick(state: GameState): void {
        const { selectedTile } = state;
        if (state.currentScene === 'treasureMap') {
            if (state.treasureHunt.currentMap?.dungeon) {
                hideTreasureMap(state);
                startDungeon(state, state.treasureHunt.currentMap.dungeon);
                delete state.saved.treasureHunt.currentMap;
            }
            return;
        }
        if (!selectedTile) {
            return;
        }
        // This is used on the world map for entering a dungeon.
        if (selectedTile.dungeonMarker) {
            startDungeon(state, selectedTile.dungeonMarker.dungeon);
            // The dungeon marker is consumed after entering the dungeon.
            delete selectedTile.dungeonMarker;
            return;
        }
        if (selectedTile.dungeonContents?.type === 'downstairs') {
            startNewFloor(state);
            return;
        }
        // The upstairs leave the dungeon entirely no matter what floor you are on.
        if (selectedTile.dungeonContents?.type === 'upstairs') {
            exitDungeon(state);
            return;
        }
        return;
    },
    isVisible(state: GameState) {
        const { selectedTile } = state;
        if (state.currentScene === 'treasureMap') {
            return !!state.treasureHunt.currentMap?.dungeon;
        }
        if (!selectedTile) {
            return false;
        }
        return !!selectedTile.dungeonMarker
            || selectedTile.dungeonContents?.type === 'downstairs'
            || selectedTile.dungeonContents?.type === 'upstairs';
    },
    render(context: CanvasRenderingContext2D, state: GameState): void {
        const { iconSize } = state.display;
        const { selectedTile } = state;
        const isEntrance = (
            state.currentScene === 'treasureMap'
            || selectedTile?.dungeonMarker
            || selectedTile?.dungeonContents?.type === 'downstairs'
        );
        const text = isEntrance ? 'Enter' : 'Exit';

        context.textBaseline = 'middle';
        context.textAlign = 'left';
        context.font = Math.floor(3 * iconSize / 4) + 'px sans-serif';
        drawFrame(context, exitSource, { ...this.target, w: iconSize, h: iconSize});
        drawEmbossedText(context, text, 'gold', 'black', this.target.x + iconSize,this.target.y + iconSize / 2);
    },
    updateTarget(state: GameState): void {
        const { canvas, iconSize } = state.display;
        const w = iconSize * 4;
        // Enter or Exit button is shown in the bottom center of the screen,
        // just like the collect treasure or upgrade tile button.
        this.target = {
            x: Math.floor((canvas.width - w) / 2),
            y: canvas.height - 10 - iconSize,
            w,
            h: iconSize,
        };
    },
    target: { x: 0, y: 0, w: 0, h: 0}
};

export function getEnterExitButton() {
    return enterExitButton;
}
export function drawEnterExitButton(context: CanvasRenderingContext2D, state: GameState) {
    enterExitButton.render(context, state);
}

export function drawDungeonStats(context: CanvasRenderingContext2D, state: GameState, dungeon: Dungeon) {
    const { canvas, iconSize } = state.display;
    const { selectedTile } = state;
    if (!dungeon) {
        return;
    }
    let rectangle = selectedTile?.target;
    if (state.currentScene === 'treasureMap' && state.saved.treasureHunt.currentMap) {
        const [tx, ty] = getTreasureLocation(state.saved.treasureHunt.currentMap);
        rectangle = getGridRectangle(state, [tx, ty]);
    }
    // Fallback.
    if (!rectangle) {
        rectangle = {
            x: (canvas.width - iconSize) / 2, y: 2 * iconSize, w: iconSize, h: iconSize,
        };
    }
    const localIconSize = Math.floor(iconSize / 2);
    const text = 'Lv ' + dungeon.level + ' ' + dungeon.name;
    const fontSize = Math.floor(3 * localIconSize / 4);
    context.font = 'bold ' + fontSize + 'px sans-serif';
    const w = context.measureText(text).width + localIconSize / 2;
    const h = localIconSize * 1.5;
    let x = Math.floor(rectangle.x + (rectangle.w - w) / 2);

    if (x < 10) x = 10;
    if (x > canvas.width - w - 10) x = canvas.width - w - 10;
    let y = rectangle.y - h - 5;
    if (y < 10) y = 10;
    const padding = Math.floor(localIconSize / 4);
    context.fillStyle = '#BBB';
    context.fillRect(x, y, w, h);
    context.fillStyle = '#FFF';
    context.fillRect(x + 1, y + 1, w - 2, h - 2);
    context.fillStyle = '#222';
    context.fillRect(x + 3, y + 3, w - 6, h - 6);
    context.textBaseline = 'middle';
    context.textAlign = 'left';
    context.fillStyle = '#C00';
    context.fillText(text, x + padding, y + padding + localIconSize / 2);
}
