export type FrameImage = HTMLCanvasElement | HTMLImageElement;

export interface ExtraAnimationProperties {
    // The animation will loop unless this is explicitly set to false.
    loop?: boolean
    // Frame to start from after looping.
    loopFrame?: number
}
export type FrameAnimation = {
    frames: Frame[]
    frameDuration: number
    duration: number
} & ExtraAnimationProperties;

export interface Rectangle {
    x: number
    y: number
    w: number
    h: number
}
export interface FrameDimensions {
    w: number
    h: number
    // This is a bit of a hack but it is a simple way of allowing me to
    // associate a depth value for an image.
    d?: number
    // If a frame is much larger than the content it represents, this rectangle
    // represents the position and dimension of the content relative to the whole frame.
    // The w/h here should be taken as the literal w/h of the rectangle in the image containing
    // the main content, not as actual in game geometry.
    // Contrast thiis with AreaObjectTarget where the `h` value is the height of the object in the game,
    // which is typically less than the height of the image (imageContentHeight = gameHeight + gameDepth / 2).
    content?: Rectangle
}
export interface FrameRectangle extends Rectangle {
    // When a frame does not perfectly fit the size of the content, this content rectangle can be
    // set to specify the portion of the image that is functionally part of the object in the frame.
    // For example, a character with a long time may have the content around the character's body and
    // exclude the tail when looking at the width/height of the character.
    content?: Rectangle
}

export interface Frame extends FrameRectangle {
    image: FrameImage
    // Additional property that may be used in some cases to indicate a frame should be flipped
    // horizontally about the center of its content. Only some contexts respect this.
    flipped?: boolean
}

export interface Sprite {
    x: number
    y: number
}

export interface BaseLoot  {
    type: string
    frame: Frame
    scale?: number
    onObtain: (this: BaseLoot, state: GameState) => void
}
export interface SimpleLoot extends BaseLoot {
    type: 'magicStone'
}
export interface ScalarLoot extends BaseLoot {
    type: 'coins' | 'health' | 'defense' | 'attack' | 'treasureChest' | 'treasureMap'
    value: number
}
export interface GemLoot extends BaseLoot {
    type: 'gem'
    color: GemColor
}

export type Loot = ScalarLoot | SimpleLoot | GemLoot;

export interface LootMarker {
    loot: Loot
    tile: MapTile
    x: number
    y: number
    tx: number
    ty: number
    isInMonsterRadius?: boolean
    isInAvatarRadius?: boolean
}
export type LootGenerator = (state: GameState, value: number) => Loot;


interface DungeonStairs {
    type: 'upstairs' | 'downstairs'
    frame: Frame
}
interface DungeonTileLoot {
    type: 'loot'
    loot: Loot
}
export type DungeonTileContent = DungeonStairs | DungeonTileLoot | Monster;

export interface SavedMapTile {
    x: number
    y: number
    // The tile is exhausted until this counter reaches the exhausted duration.
    exhaustCounter?: number
    // How long the tile is exhausted for.
    exhaustedDuration?: number
    level: number
}
export interface MapTile extends SavedMapTile {
    centerX: number
    centerY: number
    scale?: number
    target: Rectangle
    dungeonMarker?: DungeonMarker
    monsterMarker?: MonsterMarker
    // The number of monsters guarding this tile in a dungeon.
    // Dungeon tiles cannot be explored when they are guarded.
    guards: number
    // Array of 8 surrounding tiles keyed like:
    // [0, 1, 2]
    // [3, 4, 5]
    // [6, 7, 8]
    neighbors?: MapTile[]
    gemMarker?: LootMarker
    lootMarkers: LootMarker[]
    powerupMarker?: LootMarker
    dungeonContents?: DungeonTileContent
    dungeonContentsRevealed?: boolean
    dungeonContentsRevealable?: boolean
    canvas?: HTMLCanvasElement
    isVisible?: boolean
    // The distance this tile is from the start of the current journey
    journeyDistance: number
    // The computed power level of this tile in journey mode, which
    // determines the tile level, rather than the reverse.
    journeyPowerLevel: number
}

export interface Dungeon {
    level: number
    isQuestDungeon?: boolean
    name: string
    numberOfFloors: number
    frame: Frame
    allFloors: DungeonFloor[]
    currentFloor: DungeonFloor
    dungeonPosition: number[]
}

export interface DungeonFloor {
    tiles: MapTile[][]
}
export interface DungeonState {
    currentDungeon?: Dungeon
}

export interface DungeonMarker {
    dungeon: Dungeon
    tile: MapTile
    x: number
    y: number
}

export interface Tint {
    color: string
    amount: number
}

export interface Monster {
    type: 'monster'
    radius: number
    level: number
    name: string
    frame: Frame
    currentHealth: number
    maxHealth: number
    attack: number
    defense: number
    experience: number
    isBoss?: boolean
    marker?: MonsterMarker
    tint?: Tint
}

export interface MonsterMarker {
    x: number
    y: number
    type: 'monster'
    monster: Monster
    tile: MapTile
}

export interface SavedWorldState {
    dungeonLevelCap: number
    tiles: SavedMapTile[]
    gemData: {history: number[]}[]
}
// Used for the `mapScene`, `journeyMode`, `voyageMode` and `fastMode`.
export interface WorldState {
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
}
export interface SavedAvatarState {
    level: number
    experience: number
    currentHealth: number
    healthBonus: number
    attackBonus: number
    defenseBonus: number
    skillLevels: {[key: string]: number}
}
export interface AvatarState {
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

interface DamageIndicator {
    value: string
    color: string
    position: number[]
    velocity: number[]
}

interface BattleState {
    damageIndicators: DamageIndicator[]
    engagedMonster?: Monster
    monsterAttackTime?: number
    playerAttackTime?: number
}


export interface SavedTreasureHuntMap {
    size: number
    seed: number
    revealedCoordinates: number[][]
    // This isn't set until the entrance to the dungeon is discovered.
    dungeonLevel?: number
}
export interface TreasureHuntMap {
    dungeon?: Dungeon
    tiles: TreasureMapTile[][]
    revealAnimationTime: number
}
interface TreasureMapTile {
    isGoal?: boolean
    isRevealed?: boolean
}

export interface SavedTreasureHuntState {
    hadMap: boolean
    mapCount: number
    currentMap?: SavedTreasureHuntMap
}
export interface TreasureHuntState {
    currentMap?: TreasureHuntMap
}

export type GemColor = 'orange' | 'green' | 'blue';

interface SavedGemsState {
    recentLocations: {
        x: number
        y: number
        time: number
    }[]
}

export interface SavedGameState {
    // The current size of the collection radius.
    radius: number
    // This will be changed to 'geo' eventually.
    coins: number
    avatar: SavedAvatarState
    gems: SavedGemsState
    treasureHunt: SavedTreasureHuntState
    world: SavedWorldState
}

export type Scene = 'dungeon'
    | 'journey'
    | 'loading'
    | 'map'
    | 'skills'
    | 'title'
    | 'treasureMap'
    | 'voyage';


export interface GameState {
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

export type SkillAffinity = 'health' | 'attack' | 'defense' | 'money';

export interface Skill {
    key: string
    value: number
    requires?: string
    type: '+' | '*' | '/'
    x: number
    y: number
    source: Frame
    secondSource?: Frame
    name: string
    description: string
    affinity: SkillAffinity
}

export interface HudButton {
    target: Rectangle
    // Button is visible and blocks clicks but does nothing.
    isDisabled?: (this: HudButton, state: GameState) => boolean
    isVisible?: (this: HudButton, state: GameState) => boolean
    onClick: (this: HudButton, state: GameState, x: number, y: number) => void
    updateTarget(this: HudButton, state: GameState): void
    render: (this: HudButton, context: CanvasRenderingContext2D, state: GameState) => void
}

export interface SkillButton extends HudButton {
    skill: Skill
}
