import {portalSource, shellSource } from 'app/images';

export function getDungeonLevel(state: GameState, rawLevel: number): number {
    return Math.min(state.saved.world.dungeonLevelCap, rawLevel);
}
export function getDungeonFrame(state: GameState, dungeonLevel: number): Frame {
    const isQuestDungeon = dungeonLevel >= state.saved.world.dungeonLevelCap;
    return isQuestDungeon ? portalSource : shellSource;
}

export function createDungeon(state: GameState, rawLevel: number): Dungeon {
    const level = getDungeonLevel(state, rawLevel);
    const isQuestDungeon = level >= state.saved.world.dungeonLevelCap;
    const dungeon: Dungeon = {
        level,
        isQuestDungeon,
        name: isQuestDungeon ? 'Portal' : 'Hollow Shell',
        numberOfFloors: Math.max(1, Math.floor(Math.sqrt(level) / 2)),
        frame: getDungeonFrame(state, level),
        currentFloor: {
            tiles: [],
        },
        dungeonPosition: [0, 0],
        allFloors: []
    }
    if (isQuestDungeon) {
        dungeon.numberOfFloors++;
    }
    return dungeon;
}

export function addDungeonToTile(state: GameState, tile: MapTile, rawLevel: number): void {
    const dungeonMarker: DungeonMarker = {
        dungeon: createDungeon(state, rawLevel),
        tile,
        x: tile.x,
        y: tile.y
    }
    tile.dungeonMarker = dungeonMarker;
}

export function getAllNeighbors(state: GameState, tile: MapTile): MapTile[] {
    const neighbors: MapTile[] = [];
    if (!state.dungeon.currentDungeon) {
        throw new Error('Current dungeon is not defined');
    }
    for (let y = -1; y <= 1; y++) {
        for (let x = -1; x <= 1; x++) {
            if (x === 0 && y === 0) continue;
            const neighbor = state.dungeon.currentDungeon.currentFloor.tiles[tile.y + y]?.[tile.x + x];
            if (neighbor) {
                neighbors.push(neighbor);
            }
        }
    }
    return neighbors;
}
