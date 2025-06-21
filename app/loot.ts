import {
    gainHealth, getAttackWithoutHealthBonuses, getAvatarPosition, getDefenseWithoutHealthBonuses,
    getLevelBonus, resetLootTotals, updatePlayerStats
} from 'app/avatar';
import { drawEmbossedText, drawFrame, drawOutlinedImage } from 'app/draw';
import { emptyJourneyRadius, gridLength, maxTileLevel, minRadius } from 'app/gameConstants';
import {
    chestSource, coinImage, heartSource, magicStoneSource,
    outlinedMoneySource, shieldSource, swordSource, treasureMapSource,
} from 'app/images';
import {saveGame} from 'app/saveGame';
import {abbreviateNumber, getDistance} from 'app/utils/index';
import Random from 'app/utils/Random';
import {getMoneySkillBonus, getSkillValue, getTotalSkillPoints} from 'app/utils/skills';
import {exhaustTile, getTilePower, toRealCoords} from 'app/utils/world';

class CoinLootClass implements ScalarLoot {
    type = <const>'coins';
    constructor(public frame: Frame, public value: number) {}
    onObtain(state: GameState) {
        state.saved.coins += this.value;
        state.loot.coinsCollected = (state.loot.coinsCollected ?? 0 ) + this.value;
    }
}
class TreasureChestClass implements ScalarLoot {
    type = <const>'treasureChest';
    frame: Frame = chestSource;
    constructor(public value: number) {}
    onObtain(state: GameState) {
        state.saved.coins += this.value;
        state.loot.coinsCollected = (state.loot.coinsCollected ?? 0 ) + this.value;
    }
}
class HealthLootClass implements ScalarLoot {
    type = <const>'health';
    frame: Frame = heartSource;
    scale = 0.5;
    constructor(public value: number) {}
    onObtain(state: GameState) {
        state.saved.avatar.healthBonus += this.value;
        updatePlayerStats(state);
        gainHealth(state, Math.round(2 * this.value * getLevelBonus(state)));
        showStats(state);
    }
}
class AttackLootClass implements ScalarLoot {
    type = <const>'attack';
    frame: Frame = swordSource;
    scale = 0.75;
    constructor(public value: number) {}
    onObtain(state: GameState) {
        state.saved.avatar.attackBonus += this.value;
        updatePlayerStats(state);
        showStats(state);
    }
}
class DefenseLootClass implements ScalarLoot {
    type = <const>'defense';
    frame: Frame = shieldSource;
    scale = 0.75;
    constructor(public value: number) {}
    onObtain(state: GameState) {
        state.saved.avatar.defenseBonus += this.value;
        updatePlayerStats(state);
        showStats(state);
    }
}
class MagicStoneLootClass implements SimpleLoot {
    type = <const>'magicStone';
    frame: Frame = magicStoneSource;
    onObtain(this: SimpleLoot, state: GameState) {
        if (state.currentScene === 'journey') {
            state.saved.world.journeySkillPoints++;
        } else if (state.currentScene === 'dungeon') {
            state.saved.world.dungeonLevelCap += 2;
        }
        // Display loot indication a bit longer for skill point bonus.
        state.loot.lootCollectedTime = state.time + 2000;
    }
}
class TreasureMapLootClass implements ScalarLoot {
    type = <const>'treasureMap';
    frame: Frame = treasureMapSource;
    scale = 0.5;
    constructor(public value: number) {}
    onObtain(state: GameState) {
        state.saved.treasureHunt.mapCount += this.value;
        state.saved.treasureHunt.hadMap = true;
    }
}

const coinLoot = [
    new CoinLootClass({image: coinImage, x: 0, y: 0, w: 16, h: 16}, 1),
    new CoinLootClass({image: coinImage, x: 0, y: 32, w: 20, h: 20}, 5),
    new CoinLootClass({image: coinImage, x: 0, y: 64, w: 24, h: 24}, 20),
    new CoinLootClass({image: coinImage, x: 32, y: 0, w: 16, h: 16}, 100),
    new CoinLootClass({image: coinImage, x: 32, y: 32, w: 20, h: 20}, 500),
    new CoinLootClass({image: coinImage, x: 32, y: 64, w: 24, h: 24}, 2000),
    new CoinLootClass({image: coinImage, x: 64, y: 0, w: 16, h: 16}, 10000),
    new CoinLootClass({image: coinImage, x: 64, y: 32, w: 20, h: 20}, 50000),
    new CoinLootClass({image: coinImage, x: 64, y: 64, w: 24, h: 24}, 200000),
];

export function updateMapLoot(state: GameState) {
    state.loot.lootInRadius = [];
    state.loot.lootInMonsterRadius = [];
    updateLootCollection(state);
    for (const mapTile of state.world.activeTiles) {
        updateTileLoot(state, mapTile);
    }
}

export function checkToGenerateLootForTile(state: GameState, tile: MapTile): void {
    if (tile.level < 0) return;
    // Tiles around the start of journey/voyage mode do not generate loot.
    if (state.currentScene === 'journey' || state.currentScene === 'voyage') {
        if (tile.journeyDistance < emptyJourneyRadius) {
            return;
        }
    }
    // Only generate coins if there are fewer than 2 loot markers currently.
    if (tile.lootMarkers.length < 2) {
        const coins = Math.ceil((.5 + Math.random()) * getTilePower(state, tile) * getMoneySkillBonus(state) * Math.pow(4, tile.level) / 3);
        const coinDrops = generateLootCoins(coins, 1);
        for (const coinDrop of coinDrops) {
            addLootToTile(state, tile, coinDrop);
        }
    }
    checkToGeneratePowerUp(state, tile);
}

function checkToGeneratePowerUp(state: GameState, tile: MapTile) {
    if (state.globalPosition.isFastMode || state.globalPosition.isFixingGPS) return;
    // Only one powerup per tile, and no powerups spawn on shallow water.
    if (tile.powerupMarker || tile.level < 1) return;
    const isJourneyMode = state.currentScene === 'journey' || state.currentScene === 'voyage';
    let chanceToSpawn = isJourneyMode
        // In journey mode chance to spawn powerup is a flat chance based on distance from the starting location
        // that maxes out at 10%
        ? Math.min(0.1, 0.01 * tile.journeyDistance / gridLength)
        // In the regular map scene chance to spawn powerups is 10% max and decreases the better the tile is
        // as well as with the current number of active powerups.
        : 0.1 * ((4 - state.loot.activePowerupMarkers.size) / 4) * ((maxTileLevel + 1 - tile.level) / (maxTileLevel));
    if (Math.random() > chanceToSpawn) {
        return;
    }
    const value = (.4 + Math.random() * .2) * getTilePower(state, tile) * Math.pow(1.3, tile.level - 1);
    // On the world map only there is a small chance to find a treasure map.
    // I guess this could also be added to dungeons, but then you might miss a large
    // powerup for a map which doesn't seem great.
    const lootMarker = addLootToTile(state, tile, getWeightedPowerup(state, value, [makeTreasureMapLoot]));
    tile.powerupMarker = lootMarker;
    state.loot.activePowerupMarkers.add(lootMarker);
}
export function addLootToTile(state: GameState, tile: MapTile, loot: Loot) {
    const realCoords = toRealCoords(state, [tile.x, tile.y]);
    const lootMarker: LootMarker = {
        loot, tile,
        x: realCoords[0] + gridLength / 2,
        y: realCoords[1] + gridLength / 2,
        tx: realCoords[0] + Math.random() * gridLength,
        ty: realCoords[1] + Math.random() * gridLength,
    };
    tile.lootMarkers.push(lootMarker);
    return lootMarker;
}
export function getWeightedPowerup(state: GameState, value: number, additionalLoot: LootGenerator[] = []): Loot {
    const lootGeneratorMethod: LootGenerator = Random.element([
        makeHealthLoot, makeHealthLoot, makeHealthLoot, makeHealthLoot,
        makeHealthLoot, makeHealthLoot, makeHealthLoot, makeHealthLoot,
        makeAttackLoot, makeAttackLoot, makeAttackLoot,
        makeDefenseLoot, makeDefenseLoot, makeDefenseLoot,
        ...additionalLoot,
    ]);
    return lootGeneratorMethod(state, value);
}

function makeHealthLoot(state: GameState, value: number): Loot {
    return new HealthLootClass(Math.ceil(4 * value * (1 + getSkillValue(state, 'healthPower'))));
}
function makeAttackLoot(state: GameState, value: number): Loot  {
    return new AttackLootClass(Math.ceil(value * (1 + getSkillValue(state, 'attackPower'))));
}
function makeDefenseLoot(state: GameState, value: number): Loot {
    return new DefenseLootClass(Math.ceil(value * (1 + getSkillValue(state, 'defensePower'))));
}
const magicStoneLoot = new MagicStoneLootClass();
export function makeMagicStoneLoot() {
    return magicStoneLoot;
}
export function makeTreasureChestLoot(value: number) {
    return new TreasureChestClass(value);
}
export function makeTreasureMapLoot(state: GameState, value: number) {
    return new TreasureMapLootClass(Math.ceil(value));
}

export function updateTileLoot(state: GameState, tile: MapTile): void {
    for (let i = 0; i < tile.lootMarkers.length; i++) {
        const lootMarker = tile.lootMarkers[i];
        // Remove all non coin loot during state.globalPosition.isFastMode.
        if (state.globalPosition.isFastMode && lootMarker === tile.powerupMarker) {
            delete tile.powerupMarker;
            tile.lootMarkers.splice(i--, 1);
            continue;
        }
        if (state.globalPosition.isFastMode && lootMarker === tile.gemMarker) {
            delete tile.gemMarker;
            tile.lootMarkers.splice(i--, 1);
            continue;
        }
        lootMarker.x = (lootMarker.x + lootMarker.tx) / 2;
        lootMarker.y = (lootMarker.y + lootMarker.ty) / 2;
        lootMarker.isInAvatarRadius = isLootInRadius(state, lootMarker);
        lootMarker.isInMonsterRadius = !state.globalPosition.isFastMode && lootMarker.loot.type !== 'gem' && isPointInMonsterRadius(state, lootMarker.x, lootMarker.y);
        if (state.globalPosition.isFastMode && lootMarker.isInAvatarRadius) {
            if (state.loot.collectingLoot.indexOf(lootMarker) < 0) {
                state.loot.collectingLoot.push(lootMarker);
            }
        } else if (lootMarker.isInAvatarRadius && !lootMarker.isInMonsterRadius) {
            state.loot.lootInRadius.push(lootMarker);
        }
        if (lootMarker.isInMonsterRadius) {
            state.loot.lootInMonsterRadius.push(lootMarker);
        }
    }
}


function isPointInMonsterRadius(state: GameState, x: number, y: number): boolean {
    for (const monster of state.world.activeMonsterMarkers) {
        if (getDistance([monster.tile.centerX, monster.tile.centerY], [x, y]) <= monster.monster.radius) {
            return true;
        }
    }
    return false;
}

export function collectLoot(state: GameState) {
    // Don't collect loot until we are finished collecting the current batch of loot.
    if (state.loot.collectingLoot.length) {
        return;
    }
    resetLootTotals(state);
    state.saved.radius = minRadius;
    for (const lootMarker of state.loot.lootInRadius) {
        state.loot.collectingLoot.push(lootMarker);
    }
}
function isLootInRadius(state: GameState, loot: LootMarker): boolean {
    if (!state.world.currentPosition) {
        return false;
    }
    const actualRadius = getCollectionRadius(state);
    const dx = state.world.currentPosition[0] - loot.x;
    const dy = state.world.currentPosition[1] - loot.y;
    return dx * dx + dy * dy < actualRadius * actualRadius;
}

export function getCollectionRadius(state: GameState) {
    return state.saved.radius * Math.sqrt((1 + getSkillValue(state, 'radius')));
}

export function updateLootCollection(state: GameState) {
    const avatarPosition = getAvatarPosition(state);
    const { collectingLoot } = state.loot
    if (!avatarPosition || !collectingLoot.length) {
        return;
    }
    // Move all loot towards the player
    for (let i = 0; i < collectingLoot.length; i++) {
        const lootMarker = collectingLoot[i];
        // Pull coins towards the player's position, the front of the queue quicker than the rest.
        let factor = Math.min(10, 3 * i + 1);
        if (state.dungeon.currentDungeon) {
            // Loot is collected at a constant rate in dungeons since there is only one piece of loot collected at a time.
            factor = 5;
        }else if (state.globalPosition.isFastMode) {
            // Loot is collected at a constant rate in fast mode.
            factor = 2;
        }
        // By default, loot will move towards its target location so we need to udpate both the actual + target locations.
        lootMarker.x = lootMarker.tx = (avatarPosition[0] * 2 + lootMarker.tx * factor) / (factor + 2);
        lootMarker.y = lootMarker.ty = (avatarPosition[1] * 2 + lootMarker.ty * factor) / (factor + 2);

        // Collect the loot if it is in range.
        if (getDistance(avatarPosition, [lootMarker.x, lootMarker.y]) < (state.globalPosition.isFastMode ? gridLength / 10 : gridLength / 20)) {
            obtainloot(state, lootMarker);
            collectingLoot.splice(i--, 1);
        }
    }
    if (!collectingLoot.length) {
        // Gain bonus coins after all loot has been collected.
        state.saved.coins += Math.round(state.loot.coinsCollected * (state.loot.collectionBonus - 1));
        saveGame(state);
    }
}

function obtainloot(state: GameState, lootMarker: LootMarker): void {
    state.loot.lootCollectedTime = Math.max(state.loot.lootCollectedTime, state.time);
    if (state.globalPosition.isFastMode || state.dungeon.currentDungeon) {
        state.loot.collectionBonus = 1;
    } else if (state.loot.collectionBonus < 2) {
        // Gain 10% bonus coins up to 2x.
        state.loot.collectionBonus += .1;
    } else {
        // Gain 5% bonus coins after 2x.
        state.loot.collectionBonus += .05;
    }
    const tile = lootMarker.tile;
    if (tile.powerupMarker === lootMarker) {
        delete tile.powerupMarker;
    }
    if (tile.gemMarker === lootMarker) {
        delete tile.gemMarker;
    }
    const markerIndex = state.gems.gemMarkers.indexOf(lootMarker);
    if (markerIndex >= 0) {
        state.gems.gemMarkers.splice(markerIndex, 1);
    }
    state.loot.activePowerupMarkers.delete(lootMarker);
    if (lootMarker.loot.onObtain) {
        lootMarker.loot.onObtain(state);
    }
    tile.lootMarkers.splice(tile.lootMarkers.indexOf(lootMarker), 1);
    if (!tile.exhaustedDuration) {
        exhaustTile(tile);
    }
}
function showStats(state: GameState) {
    state.loot.hideStatsAt = state.time + 1500;
}

export function generateLootCoins(amount: number, limit: number): CoinLootClass[] {
    let remainingAmount = amount;
    // We will check through the coin loot amounts starting with the largest amount.
    let index = coinLoot.length - 1;
    let drops = 0;
    const loot: CoinLootClass[] = [];
    while (remainingAmount > 0 && index >= 0 && drops < limit) {
        while (coinLoot[index].value <= remainingAmount && drops < limit) {
            remainingAmount -= coinLoot[index].value;
            loot.push(coinLoot[index]);
            drops++;
        }
        index--;
    }
    return loot;
}

const collectButton: HudButton = {
    onClick(state: GameState): void {
        if (state.currentScene === 'map' || state.currentScene === 'journey') {
            collectLoot(state);
        } else if (state.currentScene === 'dungeon') {
            resetLootTotals(state);
            for (const loot of (state.selectedTile?.lootMarkers || [])) {
                if (state.loot.collectingLoot.indexOf(loot) <= 0) {
                    state.loot.collectingLoot.push(loot);
                }
            }
        }
    },
    isDisabled(state: GameState) {
        if (state.currentScene === 'map' || state.currentScene === 'journey') {
            return !state.loot.lootInRadius || state.loot.collectingLoot.length > 0;
        }
        if (state.currentScene === 'dungeon') {
            return state.loot.collectingLoot.length > 0;
        }
        return false;
    },
    isVisible(state: GameState) {
        if (state.currentScene === 'dungeon') {
            return !!state.selectedTile?.lootMarkers?.length;
        }
        // Loot is automatically collected in voyage mode.
        if (state.currentScene === 'map' || state.currentScene === 'journey') {
            return !state.selectedTile;
        }
        return false;
    },
    render(context: CanvasRenderingContext2D, state: GameState): void {
        const { iconSize } = state.display;
        context.save();
            let lootCount = 0;
            if (state.dungeon.currentDungeon) {
                lootCount = state.selectedTile?.lootMarkers?.length || 0;
            } else {
                lootCount = state.loot.lootInRadius.length;
            }
            if (!lootCount) {
                context.globalAlpha *= .6;
            }
            context.textBaseline = 'bottom';
            context.textAlign = 'left';
            context.font = Math.floor(3 * iconSize / 4) + 'px sans-serif';
            drawFrame(context, chestSource, {x: this.target.x, y: this.target.y, w: iconSize, h: iconSize});

            drawEmbossedText(context, 'x' + lootCount, 'white', 'black',
                this.target.x + this.target.w / 2,
                this.target.y + this.target.h
            );
        context.restore();
    },
    updateTarget(state: GameState): void {
        const { canvas, iconSize } = state.display;
        const w = iconSize;
        // Upgrade Button is in the bottom center.
        this.target = {
            x: Math.floor((canvas.width - w) / 2),
            y: canvas.height - 10 - iconSize,
            w,
            h: iconSize,
        };
    },
    target: { x: 0, y: 0, w: 0, h: 0}
};
export function getCollectButton(): HudButton {
    return collectButton;
}

export function drawCollectCoinsButton(context: CanvasRenderingContext2D, state: GameState) {
    collectButton.render(context, state);
}

export function drawLootTotals(context: CanvasRenderingContext2D, state: GameState, fadeTime: number = 2000) {
    const {
        coinsCollected,
        collectionBonus,
        initialAttack,
        initialDefense,
        initialLevel,
        initialMaxHealth,
        initialSkillPoints,
        lootCollectedTime
    } = state.loot;
    if (state.time > lootCollectedTime + fadeTime && (!state.globalPosition.isFastMode || coinsCollected === 0)) {
        return;
    }
    const { canvas, iconSize } = state.display;
    context.save();
        context.globalAlpha = state.globalPosition.isFastMode ? 1 : Math.min(1, 2 - (state.time - lootCollectedTime) / (fadeTime / 2));
        const fontSize = Math.floor(3 * iconSize / 4);
        context.font = fontSize + 'px sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'bottom';
        let top = canvas.height / 2 + 2;
        if (coinsCollected > 0) {
            if (collectionBonus > 1) {
                drawEmbossedText(context,
                    abbreviateNumber(coinsCollected) + 'x' + collectionBonus.toFixed(2), 'gold', 'black',
                    canvas.width / 2,
                    canvas.height / 2 - 2
                );
            } else {
                top = Math.floor((canvas.height - iconSize) / 2);
            }
            context.textBaseline = 'middle';
            context.textAlign = 'left';
            const totalCoinsText = '+' + abbreviateNumber(Math.round(coinsCollected * collectionBonus));
            const left = Math.floor(canvas.width / 2 - (context.measureText(totalCoinsText).width + iconSize) / 2);
            drawEmbossedText(context, totalCoinsText, 'gold', 'black', left + iconSize, top + iconSize / 2);
            drawFrame(context, outlinedMoneySource, {x: left, y: top, w: iconSize, h: iconSize});
        }
        const powerUpFontSize = Math.floor(iconSize / 2);
        let powerUpWidth = 0;
        const currentAttack = getAttackWithoutHealthBonuses(state);
        const currentDefense = getDefenseWithoutHealthBonuses(state);
        const healthBonusText = '+' + abbreviateNumber(state.avatar.maxHealth - initialMaxHealth);
        const attackBonusText = '+' + abbreviateNumber(currentAttack - initialAttack);
        const defenseBonusText = '+' + abbreviateNumber(currentDefense - initialDefense);
        context.font = powerUpFontSize + 'px sans-serif';
        if (state.avatar.maxHealth !== initialMaxHealth) powerUpWidth += powerUpFontSize + context.measureText(healthBonusText).width;
        if (currentAttack !== initialAttack) powerUpWidth += powerUpFontSize + context.measureText(attackBonusText).width;
        if (currentDefense !== initialDefense) powerUpWidth += powerUpFontSize + context.measureText(defenseBonusText).width;
        if (state.saved.avatar.level !== initialLevel) {
            context.textAlign = 'center';
            context.textBaseline = 'bottom';
            drawEmbossedText(context, 'LEVEL UP', 'gold', 'black', canvas.width / 2, canvas.height / 2 - fontSize - powerUpFontSize - 8);
        } else if (getTotalSkillPoints(state) !== initialSkillPoints) {
            context.textAlign = 'center';
            context.textBaseline = 'bottom';
            drawEmbossedText(context, '+1 Skill Point', 'gold', 'black', canvas.width / 2, canvas.height / 2 - fontSize - powerUpFontSize - 8);
        }
        if (powerUpWidth > 0) {
            let left = (canvas.width - powerUpWidth) / 2;
            context.textAlign = 'left';
            context.textBaseline = 'middle';
            const bottom = canvas.height / 2 - fontSize - 4;
            if (state.avatar.maxHealth !== initialMaxHealth) {
                drawOutlinedImage(context, 'white', 2, heartSource, {x: left, y: bottom - powerUpFontSize, w: powerUpFontSize, h: powerUpFontSize});
                drawEmbossedText(context, healthBonusText, 'white', 'black', left + powerUpFontSize, bottom - powerUpFontSize / 2);
                left += powerUpFontSize + context.measureText(healthBonusText).width;
            }
            if (currentAttack !== initialAttack) {
                drawOutlinedImage(context, 'white', 2, swordSource, {x: left, y: bottom - powerUpFontSize, w: powerUpFontSize, h: powerUpFontSize});
                drawEmbossedText(context, attackBonusText, 'white', 'black', left + powerUpFontSize,  bottom - powerUpFontSize / 2);
                left += powerUpFontSize + context.measureText(attackBonusText).width;
            }
            if (currentDefense !== initialDefense) {
                drawOutlinedImage(context, 'white', 2, shieldSource, {x: left, y: bottom - powerUpFontSize, w: powerUpFontSize, h: powerUpFontSize});
                drawEmbossedText(context, defenseBonusText, 'white', 'black', left + powerUpFontSize,  bottom - powerUpFontSize / 2);
            }
        }
    context.restore();
}
