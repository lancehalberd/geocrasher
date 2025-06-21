
interface GameState {
    saveSlots: SavedGameState[]
    saveSlotIndex: number
    battle: BattleState
    display: {
        canvas: HTMLCanvasElement
        context: CanvasRenderingContext2D
        iconSize: number
        dungeonScale: number
    }
    dungeon: DungeonState
    // These accumulate various coordinates until the player reached the
    // "goal" of moving a certain distance, which is determined when
    // their current location is at least that distance from one of
    // these coordinates, then the coordinates are reset.
    goalCoordinates: number[][]
    lastGoalTime?: number
    selectedTile?: MapTile
    currentScene: Scene
    sceneStack: Scene[]
    ignoreNextScenePop: boolean
    saved: SavedGameState
    avatar: AvatarState
    time: number
    treasureHunt: TreasureHuntState
    world: WorldState
    gems: {
        colorCounters: {
            orange?: number,
            green?: number,
            blue?: number,
        }
        gemMarkers: LootMarker[]
        // The next time to animate the gem collection effect.
        // Initially it is delayed until all loot finishes collecting,
        // then the ticks are at a constant rate.
        nextTickTime?: number
    }
    globalPosition: {
        direction: 'up' | 'down' | 'left' | 'right',
        lastPosition?: {
            coords: {
                longitude: number
                latitude: number
            }
        }
        // This flag is set to true when we have no confidence in the current GPS coords
        isFixingGPS: boolean
        // The time we will wait until t
        endFixingGPSTime: number
        endFastModeTime: number
        // This flag is set when the user is moving too quickly for normal game play.
        // We want to discourage players from playing while riding a bicycle or driving a car.
        isFastMode: boolean
        restartWatchTime: number
        isStartingFastMode: boolean
    }
    loot: {
        activePowerupMarkers: Set<LootMarker>
        collectingLoot: LootMarker[]
        coinsCollected: number
        hideStatsAt: number
        lootCollectedTime: number
        lootInRadius: LootMarker[]
        lootInMonsterRadius: LootMarker[]
        collectionBonus: number
        initialLevel: number
        initialSkillPoints: number
        initialMaxHealth: number
        initialAttack: number
        initialDefense: number
    }
}


type GemColor = 'orange' | 'green' | 'blue';
interface SavedGemsState {
    recentLocations: {
        x: number
        y: number
        time: number
    }[]
}

interface SavedGameState {
    // The current size of the collection radius.
    radius: number
    // This will be changed to 'geo' eventually.
    coins: number
    avatar: SavedAvatarState
    gems: SavedGemsState
    treasureHunt: SavedTreasureHuntState
    world: SavedWorldState
}



interface SavedAvatarState {
    level: number
    experience: number
    currentHealth: number
    healthBonus: number
    attackBonus: number
    defenseBonus: number
    skillLevels: {[key: string]: number}
}
interface AvatarState {
    affinityBonuses: {
        [key in SkillAffinity]: number
    }
    animationTime: number
    selectedSkill?: Skill
    usedSkillPoints: number
    // Computer stats that are actually used in combat.
    maxHealth: number
    attack: number
    defense: number
}


interface SavedWorldState {
    dungeonLevelCap: number
    journeySkillPoints: number
    tiles: SavedMapTile[]
    gemData: {history: number[]}[]
}
// Used for the `mapScene`, `journeyMode`, `voyageMode` and `fastMode`.
interface WorldState {
    activeTiles: MapTile[]
    activeMonsterMarkers: MonsterMarker[]
    displayScale: number
    origin?: number[]
    currentPosition?: number[]
    currentGridCoords?: number[]
    levelSums: number[]
    // Tiles that are being used for the current map scene.
    // This will get reset when the player changes to journey/voyage/fast modes.
    allTiles: Record<string, MapTile>
    // Tiles that will be saved and restored when returning to the primary map scene.
    savedTiles: Record<string, MapTile>
    selectableTiles: Set<MapTile>

    // The location of the player when they started journey mode/voyage mode
    journeyModeOrigin: number[]
    // The power of the tile the player selected for journey mode
    journeyModePower: number
    // The level of the tile the player selected for journey mode.
    // The tiles in the journey will be relative to this selected tile.
    journeyModeTileLevel: number
    journeyModeRewardBonus: number
    journeyModeNextBossLevel: number
}


interface SavedTreasureHuntState {
    hadMap: boolean
    mapCount: number
    currentMap?: SavedTreasureHuntMap
}
interface TreasureHuntState {
    currentMap?: TreasureHuntMap
}
