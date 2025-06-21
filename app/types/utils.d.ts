type FrameImage = HTMLCanvasElement | HTMLImageElement;

interface ExtraAnimationProperties {
    // The animation will loop unless this is explicitly set to false.
    loop?: boolean
    // Frame to start from after looping.
    loopFrame?: number
}
type FrameAnimation = {
    frames: Frame[]
    frameDuration: number
    duration: number
} & ExtraAnimationProperties;

interface Rectangle {
    x: number
    y: number
    w: number
    h: number
}
interface FrameDimensions {
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
interface FrameRectangle extends Rectangle {
    // When a frame does not perfectly fit the size of the content, this content rectangle can be
    // set to specify the portion of the image that is functionally part of the object in the frame.
    // For example, a character with a long time may have the content around the character's body and
    // exclude the tail when looking at the width/height of the character.
    content?: Rectangle
}

interface Frame extends FrameRectangle {
    image: FrameImage
    // Additional property that may be used in some cases to indicate a frame should be flipped
    // horizontally about the center of its content. Only some contexts respect this.
    flipped?: boolean
}

interface Sprite {
    x: number
    y: number
}

interface BaseLoot  {
    type: string
    frame: Frame
    scale?: number
    onObtain: (state: GameState) => void
}
interface SimpleLoot extends BaseLoot {
    type: 'magicStone'
}
interface ScalarLoot extends BaseLoot {
    type: 'coins' | 'health' | 'defense' | 'attack' | 'treasureChest' | 'treasureMap'
    value: number
}
interface GemLoot extends BaseLoot {
    type: 'gem'
    color: GemColor
}

type Loot = ScalarLoot | SimpleLoot | GemLoot;

interface LootMarker {
    loot: Loot
    tile: MapTile
    x: number
    y: number
    tx: number
    ty: number
    isInMonsterRadius?: boolean
    isInAvatarRadius?: boolean
}
type LootGenerator = (state: GameState, value: number) => Loot;


interface DungeonStairs {
    type: 'upstairs' | 'downstairs'
    frame: Frame
}
interface DungeonTileLoot {
    type: 'loot'
    loot: Loot
}
type DungeonTileContent = DungeonStairs | DungeonTileLoot | Monster;

interface SavedMapTile {
    x: number
    y: number
    // The tile is exhausted until this counter reaches the exhausted duration.
    exhaustCounter?: number
    // How long the tile is exhausted for.
    exhaustedDuration?: number
    level: number
}
interface MapTile extends SavedMapTile {
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
    isExplored?: boolean
    isVisible?: boolean
    // The distance this tile is from the start of the current journey
    journeyDistance: number
    // The computed power level of this tile in journey mode, which
    // determines the tile level, rather than the reverse.
    journeyPowerLevel: number
}

interface Dungeon {
    level: number
    isQuestDungeon?: boolean
    name: string
    numberOfFloors: number
    frame: Frame
    allFloors: DungeonFloor[]
    currentFloor: DungeonFloor
    dungeonPosition: number[]
}

interface DungeonFloor {
    tiles: MapTile[][]
}
interface DungeonState {
    currentDungeon?: Dungeon
}

interface DungeonMarker {
    dungeon: Dungeon
    tile: MapTile
    x: number
    y: number
}

interface Tint {
    color: string
    amount: number
}

interface Monster {
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

interface MonsterMarker {
    x: number
    y: number
    type: 'monster'
    monster: Monster
    tile: MapTile
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


interface SavedTreasureHuntMap {
    size: number
    seed: number
    revealedCoordinates: number[][]
    // This isn't set until the entrance to the dungeon is discovered.
    dungeonLevel?: number
}
interface TreasureHuntMap {
    dungeon?: Dungeon
    tiles: TreasureMapTile[][]
    revealAnimationTime: number
}
interface TreasureMapTile {
    isGoal?: boolean
    isRevealed?: boolean
}




type Scene = 'dungeon'
    | 'journey'
    | 'loading'
    | 'map'
    | 'skills'
    | 'title'
    | 'treasureMap'
    | 'voyage';



type SkillAffinity = 'health' | 'attack' | 'defense' | 'money';

type SkillKey = 'regeneration' | 'healthPower' | 'healthOffense' | 'healthDefense'
    | 'attackSpeed' | 'attackPower' | 'attackOffense' |'attackDefense' | 'dodge' | 'defensePower'
    | 'defenseOffense' | 'defenseDefense' | 'radius' | 'experiencePower' | 'explorer' | 'conquerer';

interface Skill {
    key: SkillKey
    value: number
    requires?: SkillKey
    type: '+' | '*' | '/'
    x: number
    y: number
    source: Frame
    secondSource?: Frame
    name: string
    description: string
    affinity: SkillAffinity
}

interface HudButton {
    target: Rectangle
    // Button is visible and blocks clicks but does nothing.
    isDisabled?: (state: GameState) => boolean
    isVisible?: (state: GameState) => boolean
    onClick: (state: GameState, x: number, y: number) => void
    updateTarget(state: GameState): void
    render: (context: CanvasRenderingContext2D, state: GameState) => void
}

interface SkillButton extends HudButton {
    skill: Skill
}
