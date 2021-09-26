import { drawEmbossedText, drawFrame, drawOutlinedImage, drawRectangle, fillRectangle, pad } from 'app/draw';
import { frameLength, gridLength } from 'app/gameConstants';
import { handleHudButtonClick, renderHudButtons } from 'app/hud';
import {
    darkStoneImage,
    grassSource,
    oceanSource,
    sandSource,
    shallowSource,
    oldMapImage,
    treasureMapSource,
} from 'app/images';
import { drawLootTotals } from 'app/loot';
import { saveGame } from 'app/saveGame';
import { createDungeon, drawDungeonStats, getDungeonLevel, getEnterExitButton } from 'app/scenes/dungeonScene';
import { drawCoinsIndicator, drawLifeIndicator } from 'app/scenes/mapScene';
import { popScene, pushScene } from 'app/state';
import SRandom from 'app/utils/SRandom';
import { getActualScale, getGridRectangle, refreshActiveTiles, toGridCoords, unproject } from 'app/world'
import { GameState, HudButton, SavedTreasureHuntMap, TreasureHuntMap } from 'app/types';

function startNewTreasureMap(state: GameState): void {
    const size = 3 + Math.ceil(Math.sqrt(state.saved.avatar.level));
    state.saved.treasureHunt.currentMap = {
        seed: Math.random(),
        size,
        revealedCoordinates: [],
    };
    initializeTreasureMapStateFromSave(state);
}
function makeMap(size: number): TreasureHuntMap {
    const map: TreasureHuntMap = {
        tiles: [],
        revealAnimationTime: 0,
    };
    for (let y = 0; y < size; y++) {
        map.tiles[y] = [];
        for (let x = 0; x < size; x++) {
            map.tiles[y][x] = {};
        }
    }
    return map;
}
export function initializeTreasureMapStateFromSave(state: GameState) {
    const savedMap = state.saved.treasureHunt.currentMap;
    if (!savedMap) {
        state.treasureHunt.currentMap = null;
        return;
    }
    const [tx, ty] = getTreasureLocation(savedMap);
    const currentMap = makeMap(savedMap.size);
    if (savedMap.revealedCoordinates.length) {
        for (const [x, y] of savedMap.revealedCoordinates) {
            currentMap.tiles[y][x].isRevealed = true;
            // In case something changes in our generator and the dungeon is newly uncovered on load
            // make sure to set the dungeonLevel, which indicates the dungeon has been found.
            if (x === tx && y === ty && !savedMap.dungeonLevel) {
                savedMap.dungeonLevel = getDungeonLevel(state, state.saved.avatar.level);
            }
        }
    }
    state.treasureHunt.currentMap = currentMap;
    if (savedMap.dungeonLevel) {
        currentMap.dungeon = createDungeon(state, savedMap.dungeonLevel);
    }
}

function getTreasureLocation(savedMap: SavedTreasureHuntMap): number[] {
    const random = SRandom.seed(savedMap.seed);
    return [
        random.range(0, savedMap.size - 1),
        random.nextSeed().range(0, savedMap.size - 1),
    ];
}
function showTreasureMapScene(state: GameState) {
    state.selectedTile = null;
    state.battle.engagedMonster = null;
    if (!state.saved.treasureHunt.currentMap) {
        startNewTreasureMap(state);
    }
    pushScene(state, 'treasureMap');
}
export function hideTreasureMap(state: GameState) {
    state.selectedTile = null;
    state.world.origin = state.world.currentPosition;
    popScene(state);
    refreshActiveTiles(state);
}
export function updateTreasureMap(state: GameState): void {
    const savedMap = state.saved.treasureHunt.currentMap;
    // Advance the reveal animation time once the dungeon is discovered.
    if (savedMap?.dungeonLevel) {
        state.treasureHunt.currentMap.revealAnimationTime += frameLength;
    }
}

function revealTreasureMapTile(state: GameState, x: number, y: number) {
    if (!state.saved.treasureHunt.mapCount) {
        return;
    }
    const savedMap = state.saved.treasureHunt.currentMap;
    const currentMap = state.treasureHunt.currentMap;
    if (x < 0 || y < 0 || x >= savedMap.size || y >= savedMap.size) {
        return;
    }
    if (currentMap.tiles[y][x].isRevealed) {
        return;
    }
    savedMap.revealedCoordinates.push([x, y]);
    currentMap.tiles[y][x].isRevealed = true;
    state.saved.treasureHunt.mapCount--;
    const [tx, ty] = getTreasureLocation(savedMap);
    if (tx === x && ty === y) {
        savedMap.dungeonLevel = getDungeonLevel(state, state.saved.avatar.level);
        currentMap.dungeon = createDungeon(state, savedMap.dungeonLevel);
    }
    saveGame(state);
}


export function handleTreasureMapClick(state: GameState, x: number, y: number) {
    updateAllTreasureMapButtonTargets(state);
    if (handleHudButtonClick(state, x, y, getTreasureMapButtons())) {
        return;
    }
    // The treasure map is not interactive after the dungeon has been discovered.
    if (state.treasureHunt.currentMap?.dungeon) {
        return
    }
    const clickedCoords = unproject(state, [x, y]);
    const clickedGridCoords = toGridCoords(clickedCoords);
    revealTreasureMapTile(state, clickedGridCoords[0], clickedGridCoords[1]);
}

function getTreasureMapButtons(): HudButton[] {
    return [
        getEnterExitButton(),
        getTreasureMapButton(),
    ];
}
// Update the targets for skill buttons for the current display settings.
// This should be called each frame before checking for user clicks or rendering the buttons.
let lastCanvasSize: {w: number, h: number} = null;
function updateAllTreasureMapButtonTargets(state: GameState): void {
    const { canvas } = state.display;
    if (lastCanvasSize?.w === canvas.width && lastCanvasSize?.h === canvas.height) {
        return;
    }
    lastCanvasSize = {w: canvas.width, h: canvas.height};
    for (const button of getTreasureMapButtons()) {
        button.updateTarget(state);
    }
}

export function drawTreasureMapScene(context: CanvasRenderingContext2D, state: GameState) {
    const { canvas } = state.display;
    const scaleToUse = getActualScale(state);
    context.fillStyle = context.createPattern(darkStoneImage, 'repeat');
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = 'bold ' + Math.floor(gridLength * scaleToUse) + 'px sans-serif';
    const mapPattern = context.createPattern(oldMapImage, 'repeat');
    const savedMap = state.saved.treasureHunt.currentMap;
    const currentMap = state.treasureHunt.currentMap;
    const [tx, ty] = getTreasureLocation(savedMap);
    for (let y = 0; y < currentMap.tiles.length; y++) {
        for (let x = 0; x < currentMap.tiles[y].length; x++) {
            const tile = currentMap.tiles[y][x];
            const target = getGridRectangle(state, [x, y]);
            const distance = Math.abs(y - ty) + Math.abs(x - tx);
            const isRevealed = tile.isRevealed || distance < currentMap.revealAnimationTime / 200;
            if (!isRevealed) {
                fillRectangle(context, mapPattern, target);
                context.beginPath();
                drawRectangle(context, target);
                drawRectangle(context, pad(target, -2));
                context.fillStyle = '#444';
                context.fill('evenodd');
                context.fillStyle = '#666';
                context.fillText('?', target.x + target.w / 2,target.y + target.h / 2);
                continue;
            }
            let frame = grassSource;
            if (distance > 6) {
                frame = oceanSource;
            } else if (distance > 3) {
                frame = shallowSource;
            } else if (distance > 1) {
                frame = sandSource;
            }
            drawFrame(context, frame, target);
            if (x === tx && y === ty) {
                drawOutlinedImage(context, 'red', 1, currentMap.dungeon.frame, target);
            }
            // Experimental rendering logic for indicating which squares the user has not manually explored
            // after the entire treasure map is revealed. Allows players to review their guesses
            // and brag if they find the dungeon in only a few guesses.
            if (!tile.isRevealed) {
                context.save();
                    context.globalAlpha *= 0.3;
                    fillRectangle(context, 'black', target);
                context.restore();
            }
        }
    }
    if (savedMap.dungeonLevel) {
        drawDungeonStats(context, state, currentMap.dungeon);
    }
    drawCoinsIndicator(context, state);
    drawLootTotals(context, state, 1000);
    drawLifeIndicator(context, state);
    updateAllTreasureMapButtonTargets(state);
    renderHudButtons(context, state, getTreasureMapButtons());
}

const treasureMapButton: HudButton = {
    onClick(state: GameState): void {
        if (state.currentScene === 'treasureMap') {
            hideTreasureMap(state);
        } else {
            showTreasureMapScene(state);
        }
    },
    isDisabled(state: GameState) {
        return state.battle.engagedMonster && state.loot.collectingLoot.length > 0;
    },
    isVisible(state: GameState) {
        return state.saved.treasureHunt.hadMap || state.saved.treasureHunt.mapCount > 0;
    },
    render(context: CanvasRenderingContext2D, state: GameState): void {
        const { iconSize } = state.display;
        context.textBaseline = 'middle';
        context.textAlign = 'right';
        context.font = Math.floor(iconSize / 3) + 'px sans-serif';
        drawFrame(context, treasureMapSource, this.target);
        drawEmbossedText(context, 'x' + state.saved.treasureHunt, 'white', 'black',
            this.target.x + Math.floor(iconSize * .8),
            this.target.y + 3 * this.target.h / 4
        );
    },
    updateTarget(state: GameState): void {
        const { canvas, iconSize } = state.display;
        this.target = {
            x: 10,
            y: canvas.height - 10 - iconSize,
            w: iconSize,
            h: iconSize,
        };
    },
    target: { x: 0, y: 0, w: 0, h: 0},
};
export function getTreasureMapButton(): HudButton {
    return treasureMapButton;
}
