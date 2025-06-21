import {gridLength, maxScale} from 'app/gameConstants';
import {getState } from 'app/state';

export function isTileExplored(state: GameState, gridCoords: number[]) {
    const key = `${gridCoords[0]}x${gridCoords[1]}`;
    return !!state.world.allTiles[key];
}
export function exhaustTile(tile: MapTile): void {
    tile.exhaustedDuration = tile.level * 2 + 8;
    tile.exhaustCounter = 0;
}

export function getActualScale(state: GameState): number {
    const { canvas, iconSize } = state.display;
    if (state.currentScene === 'journey' || state.currentScene === 'voyage') {
        return maxScale;
    }
    if (state.currentScene === 'treasureMap') {
        const savedMap = state.saved.treasureHunt.currentMap as SavedTreasureHuntMap;
        return Math.min(
            (canvas.height - 2 * iconSize) / (savedMap.size * gridLength),
            (canvas.width - iconSize) / (savedMap.size * gridLength)
        );
    }
    if (state.dungeon.currentDungeon) {
        return Math.min((canvas.height - 20) / (5 * gridLength), (canvas.width - 20) / (5 * gridLength));
    }
    // Math.round(gridLength * state.world.displayScale) / gridLength;
    return state.world.displayScale;
}

export function getGridRectangle(state: GameState, coords: number[]): Rectangle {
    const topLeft = project(state, toRealCoords(state, coords));
    const bottomRight = project(state, toRealCoords(state,[coords[0] + 1, coords[1] + 1]));
    return {
        x: Math.ceil(topLeft[0]),
        y: Math.ceil(topLeft[1]),
        w: Math.ceil(bottomRight[0]) - Math.ceil(topLeft[0]),
        h: Math.ceil(bottomRight[1]) - Math.ceil(topLeft[1]),
    };
}

export function getIconSize() {
    const { canvas } = getState().display;
    return 16 * Math.floor(Math.min(canvas.width / 6, canvas.height / 6) / 16);
}


// Returns the global coordinates of the top left corner of the tile with coordinates [0, 0].
export function getGridOrigin(state: GameState): readonly number[] {
    if (state.currentScene === 'journey' || state.currentScene === 'voyage') {
        return state.world.journeyModeOrigin;
    }
    return [0, 0];
}

// Returns the global coordinates of the origin, which is mapped to the center of the canvas.
export function getOrigin(state: GameState): readonly number[] {
    if (state.currentScene === 'treasureMap') {
        const savedMap = state.saved.treasureHunt.currentMap as SavedTreasureHuntMap;
        return [gridLength * (savedMap.size) / 2, gridLength * (savedMap.size - 1) / 2];
    }
    return state.dungeon.currentDungeon
        // The origin is always the middle of the center square.
        ? [gridLength * 2.5, gridLength * 2.5]
        : (state.world.origin ?? [0, 0]);
}

export function project(state: GameState, coords: number[]): number[] {
    const { canvas } = state.display;
    const origin = getOrigin(state);
    const scaleToUse = getActualScale(state);
    const x = Math.round((coords[0] - origin[0]) * scaleToUse) + Math.round(canvas.width / 2);
    const y = Math.round((coords[1] - origin[1]) * scaleToUse) + Math.round(canvas.height / 2);
    return [x, y];
}
export function unproject(state: GameState, screenCoords: number[]): number[] {
    const { canvas } = state.display;
    const origin = getOrigin(state);
    const scaleToUse = getActualScale(state);
    const longitude = (screenCoords[0] - canvas.width / 2) / scaleToUse + origin[0];
    const lat = (screenCoords[1] - canvas.height / 2) / scaleToUse + origin[1];
    return [longitude, lat];
}
export function toGridCoords(state: GameState, realCoords: number[]): number[] {
    const gridOrigin = getGridOrigin(state);
    return [
        Math.floor((realCoords[0] - gridOrigin[0]) / gridLength),
        Math.floor((realCoords[1] - gridOrigin[1]) / gridLength),
    ];
}
export function toRealCoords(state: GameState, gridCoords: number[]): number[] {
    const gridOrigin = getGridOrigin(state);
    return [
        gridCoords[0] * gridLength + gridOrigin[0],
        gridCoords[1] * gridLength + gridOrigin[1],
    ];
}


export function getTileData(state: GameState, gridCoords: number[], returnDefault: boolean = false): MapTile {
    const key = `${gridCoords[0]}x${gridCoords[1]}`;
    const mapTile = state.world.allTiles[key];
    return mapTile ?? (returnDefault ? {level: -1, x: gridCoords[0], y: gridCoords[1]} : null);
}


export function getTilePower(state: GameState, tile: MapTile): number {
    // In journey/voyage modes, each tile is just assigned a specific power on creation.
    if (state.currentScene === 'journey' || state.currentScene === 'voyage') {
        return tile.journeyPowerLevel;
    }
    // In the normal map scene, the power of tiles depends on how many tiles have been upgraded
    // as well as the level of the tile and its neighbors.
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
