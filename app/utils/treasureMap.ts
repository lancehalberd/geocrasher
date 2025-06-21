import {createDungeon, getDungeonLevel} from 'app/utils/dungeon';
import SRandom from 'app/utils/SRandom';

export function getTreasureLocation(savedMap: SavedTreasureHuntMap): number[] {
    const random = SRandom.seed(savedMap.seed);
    return [
        random.range(0, savedMap.size - 1),
        random.nextSeed().range(0, savedMap.size - 1),
    ];
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
        delete state.treasureHunt.currentMap;
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

