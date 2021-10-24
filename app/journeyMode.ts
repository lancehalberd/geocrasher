import { drawFrame } from 'app/draw';
import { gridLength, minRadius } from 'app/gameConstants';
import {
    exitSource,
    shoeSource,
} from 'app/images';

import { getTilePower } from 'app/scenes/mapScene';
import { popScene, pushScene } from 'app/state';
import { GameState, HudButton, MapTile } from 'app/types';

const journeyButton: HudButton = {
    onClick(state: GameState): void {
        if (state.currentScene === 'journey') {
            endJourneyMode(state);
            return;
        }
        if (state.currentScene === 'map') {
            if (!state.selectedTile) {
                throw new Error('Expected state.selectedTile to be defined');
            }
            startJourneyMode(state, state.selectedTile);
        }
    },
    isVisible(state: GameState) {
        const { selectedTile } = state;
        if (!state.world.currentPosition) {
            return false;
        }
        if (state.battle.engagedMonster) {
            return false;
        }
        if (state.currentScene === 'journey') {
            // This button is used to exit journey mode while in journey mode.
            return true;
        }
        if (state.currentScene !== 'map') {
            return false;
        }
        if (!selectedTile) {
            return false;
        }
        if (selectedTile.monsterMarker || selectedTile.dungeonMarker) {
            return false;
        }
        // When we add voyage mode, we can remove this requirement and
        // just have this display voyage mode for level 0 tiles.
        if (selectedTile.level < 1) {
            return false;
        }
        return true;
    },
    render(context: CanvasRenderingContext2D, state: GameState): void {
        if (state.currentScene === 'journey' || state.currentScene === 'voyage') {
            drawFrame(context, exitSource, this.target);
        } else {
            drawFrame(context, shoeSource, this.target);
        }
    },
    updateTarget(state: GameState): void {
        const { canvas, iconSize } = state.display;
        const w = iconSize;
        const h = iconSize;
        // Bottom center of the screen.
        this.target = {
            x: 10,
            y: canvas.height - 10 - h,
            w,
            h,
        };
    },
    target: { x: 0, y: 0, w: 0, h: 0},
};

export function getJourneyButton(): HudButton {
    return journeyButton;
}

function startJourneyMode(state: GameState, tile: MapTile): void {
    if (!state.world.currentPosition) {
        throw new Error('Expected state.world.currentPosition to be defined');
    }
    // Set the origin so that the player always starts journey mode in the center of
    // the tiles at [0, 0].
    state.world.journeyModeOrigin = [
        state.world.currentPosition[0] - gridLength / 2,
        state.world.currentPosition[1] - gridLength / 2,
    ];
    state.world.journeyModePower = getTilePower(state, tile);
    state.world.journeyModeTileLevel = tile.level;
    const maxInitialMonsterPower = getMonsterPowerForJourneyMode(state, state.world.journeyModePower + 0.5);
    state.world.journeyModeNextBossLevel = Math.floor(maxInitialMonsterPower);
    state.world.savedTiles = state.world.allTiles;
    state.world.allTiles = {};
    state.saved.radius = minRadius;
    // This needs to be called after `getTilePower`, otherwise
    // the tile power won't be generated correctly.
    pushScene(state, 'journey');
}

function endJourneyMode(state: GameState): void {
    popScene(state);
    state.world.allTiles = state.world.savedTiles;
    state.saved.radius = minRadius;
}

export function getMonsterPowerForJourneyMode(state: GameState, tilePower: number): number {
    return state.world.journeyModeTileLevel / 2 + 2 * (tilePower - 1);
}
