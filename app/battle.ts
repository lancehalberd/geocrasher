import { advanceGameState } from 'app/advanceGameState';
import {gainExperience, gainHealth, getAvatarPosition, resetLootTotals} from 'app/avatar';
import { drawEmbossedText, drawFrame } from 'app/draw';
import { gridLength } from 'app/gameConstants';
import { shoeSource, swordSource } from 'app/images';
import {
    addLootToTile,
    makeMagicStoneLoot,
    makeTreasureChestLoot,
    makeTreasureMapLoot,
    updateMapLoot,
} from 'app/loot'
import {addDungeonToTile, getAllNeighbors} from 'app/utils/dungeon';
import {abbreviateNumber} from 'app/utils/index';
import Random from 'app/utils/Random';
import {getMoneySkillBonus, getSkillValue} from 'app/utils/skills';
import {exhaustTile, project, toRealCoords} from 'app/utils/world';

function getAttackTime(level: number): number {
    return 600 - Math.min(200, (level - 1) * 50);
}
function getPlayerAttackTime(state: GameState) {
    return getAttackTime(state.saved.avatar.level) / (1 + getSkillValue(state, 'attackSpeed'));
}

export function updateBattle(state: GameState) {
    // End battle if the player is too far from the monster marker.
    const monster = state.battle.engagedMonster;
    const marker = state.battle.engagedMonster?.marker;
    if (state.battle.damageIndicators.length) {
        updateDamageIndicators(state);
    }
    // End battle if the monster marker is no longer active.
    if (marker && state.world.activeMonsterMarkers.indexOf(marker) < 0) {
        delete state.battle.engagedMonster;
        return;
    }
    if (!monster || !marker) {
        return;
    }
    const currentBattlePosition = getAvatarPosition(state) ?? [];
    if (state.battle.monsterAttackTime && state.time > state.battle.monsterAttackTime) {
        if (Math.random() < getSkillValue(state, 'dodge')) {
            pushDamageIndicator(state, currentBattlePosition, [marker.tile.centerX, marker.tile.centerY], 'Dodge', 'blue');
        } else {
            const attackRoll = getAttackRoll(monster.attack);
            const damage = calculateDamage(attackRoll, getDefenseRoll(state.avatar.defense));
            pushDamageIndicator(state, currentBattlePosition, [marker.tile.centerX, marker.tile.centerY], abbreviateNumber(damage));
            state.saved.avatar.currentHealth = Math.max(0, state.saved.avatar.currentHealth - damage);

            // Blocked damage is difference between the attackRoll and actual damage. Reflected damage is a percentage of this value.
            const reflectedDamage = Math.ceil((attackRoll - damage) * getSkillValue(state, 'defenseOffense'));
            if (reflectedDamage) {
                pushDamageIndicator(state, [marker.tile.centerX, marker.tile.centerY], currentBattlePosition, abbreviateNumber(reflectedDamage), 'orange');
                monster.currentHealth = Math.max(0, monster.currentHealth - reflectedDamage);
            }
            // Boss stats cannot be reduced.
            if (!monster.isBoss) {
                monster.attack = Math.max(1, monster.attack - Math.ceil(state.avatar.defense * getSkillValue(state, 'defenseDefense')));
            }
        }
        state.battle.monsterAttackTime += getAttackTime(monster.level);
    }
    if (state.battle.playerAttackTime && state.time > state.battle.playerAttackTime) {
        var damage = calculateDamage(getAttackRoll(state.avatar.attack), getDefenseRoll(monster.defense));
        pushDamageIndicator(state, [marker.tile.centerX, marker.tile.centerY], currentBattlePosition, abbreviateNumber(damage));
        monster.currentHealth = Math.max(0, monster.currentHealth - damage);
        // Boss stats cannot be reduced.
        if (!monster.isBoss) {
            monster.defense = Math.max(0, monster.defense - Math.ceil(state.avatar.attack * getSkillValue(state, 'attackOffense')));
        }
        gainHealth(state, damage * getSkillValue(state, 'attackDefense'));

        state.battle.playerAttackTime += getPlayerAttackTime(state);
    }
    if (monster.currentHealth <= 0) {
        const defeatedMonster = monster;
        if (!state.dungeon.currentDungeon) {
            advanceGameState(state);
            exhaustTile(marker.tile);
        }
        delete marker.tile.monsterMarker;
        delete defeatedMonster.marker;

        // Primarily you are supposed to access dungeons through treasure maps now, but there
        // is still a 1/50 chance a monster will drop a dungeon entrance.
        if (Math.random() < 0.02 && !state.dungeon.currentDungeon) {
            var dungeonLevel = Math.max(1, Random.integerRange(monster.level - 1, monster.level + 1));
            addDungeonToTile(state, marker.tile, dungeonLevel);
        } else if (Math.random() < .1 && !state.dungeon.currentDungeon) {
            // 2 at level 1 up to 7 at level 98
            var value = Math.max(2, Math.floor(Math.sqrt(monster.level / 2)));
            addLootToTile(state, marker.tile, makeTreasureMapLoot(state, value));
        }
        const monsterTile = marker.tile;
        state.world.activeMonsterMarkers.splice(state.world.activeMonsterMarkers.indexOf(marker), 1);
        const currentLootInMonsterRadius = state.loot.lootInMonsterRadius;
        delete state.battle.engagedMonster;
        delete state.selectedTile;
        // Outside of dungeons, you get nearby treasure for fighting monsters.
        if (!state.dungeon.currentDungeon) {
            updateMapLoot(state);
            resetLootTotals(state);
            for (const loot of currentLootInMonsterRadius) {
                if (state.loot.lootInMonsterRadius.indexOf(loot) < 0) {
                    state.loot.collectingLoot.push(loot);
                }
            }
            if (defeatedMonster.isBoss && state.currentScene === 'journey') {
                const loot = (defeatedMonster.level >= (1 + state.saved.world.journeySkillPoints) * 3)
                    ? makeMagicStoneLoot() : makeTreasureChestLoot(getCoinRoll(state, defeatedMonster));
                const x = monsterTile.centerX;
                const y = monsterTile.centerY;
                monsterTile.lootMarkers = [{
                    loot,
                    x, y, tx: x, ty: y,
                    tile: monsterTile,
                }];
                state.loot.collectingLoot.push(monsterTile.lootMarkers[0]);
            }
        } else {
            for (const neighbor of getAllNeighbors(state, monsterTile)) {
                neighbor.guards--;
            }
            // Bosses only appear in dungeons.
            // If the current dungeon is a quest dungeon they leave a magic stone behind.
            // Otherwise they leave a treasure chest behind with a lot of coins.
            if (defeatedMonster.isBoss) {
                let loot: Loot;
                if (state.dungeon.currentDungeon.isQuestDungeon) {
                    loot = makeMagicStoneLoot();
                } else {
                    loot = makeTreasureChestLoot(getCoinRoll(state, defeatedMonster));
                }
                const realCoords = toRealCoords(state, [monsterTile.x, monsterTile.y]);
                const x = realCoords[0] + gridLength / 2;
                const y = realCoords[1] + gridLength / 2;
                monsterTile.lootMarkers = [{
                    loot,
                    x, y, tx: x, ty: y,
                    tile: monsterTile,
                }];
            }
        }
        gainExperience(state, defeatedMonster.experience);
    }
    if (state.saved.avatar.currentHealth <= 0) {
        delete state.battle.engagedMonster;
        delete state.selectedTile;
    }
}
function getCoinRoll(state: GameState, monster: Monster): number {
    const baseValue = Math.pow(1.1, monster.level) * monster.level * 100;
    const roll = .9 + Math.random() * .2;
    return Math.ceil(baseValue * roll * getMoneySkillBonus(state));
}

function getAttackRoll(attack: number): number {
    return Math.round((.9 + Math.random() * .2) * attack);
}
function getDefenseRoll(defense: number): number {
    return Math.round((.9 + Math.random() * .2) * defense);
}

function calculateDamage(attackRoll: number, defenseRoll: number): number {
    // Damage is 1/n where n = 1 + 2 * (defenseRoll / attackRoll)
    // 1/2 if defense = 1/2 * attack
    // 1/3 if defense = attack
    // 1/5 if defense = 2 * attack
    // 1/9 if defense = 4 * attack
    const mitigationFactor = 1 / (1 + 2 * (defenseRoll / attackRoll));
    return Math.max(1, Math.ceil(attackRoll * mitigationFactor));
}

const fightOrFleeButton: HudButton = {
    onClick(state: GameState): void {
        // If not in battle, engage the selected monster in battle:
        if (!state.battle.engagedMonster) {
            if (!state.selectedTile?.monsterMarker) {
                return;
            }
            state.battle.engagedMonster = state.selectedTile.monsterMarker.monster;
            // Monster always attacks first.
            state.battle.monsterAttackTime = state.time + 300;
            state.battle.playerAttackTime = state.time + 300 + getPlayerAttackTime(state) / 2;
        } else {
            delete state.battle.engagedMonster;
        }
    },
    isDisabled(state: GameState) {
        return state.saved.avatar.currentHealth <= 0
    },
    isVisible(state: GameState) {
        return !!state.selectedTile?.monsterMarker;
    },
    render(context: CanvasRenderingContext2D, state: GameState): void {
        const { iconSize } = state.display;
        context.textBaseline = 'middle';
        context.textAlign = 'left';
        context.font = Math.floor(3 * iconSize / 4) + 'px sans-serif';
        const text = state.battle.engagedMonster ? 'Flee' : 'Fight';

        const halfIconSize = Math.floor(iconSize / 2);
        if (state.battle.engagedMonster) {
            drawFrame(context, shoeSource, {x: this.target.x, y: this.target.y, w: iconSize, h: iconSize});
        } else {
            context.save();
                context.translate(this.target.x + halfIconSize, this.target.y + halfIconSize);
                context.scale(-1, 1);
                drawFrame(context, swordSource, {x: -halfIconSize + 6, y: -halfIconSize, w: iconSize, h: iconSize});
                context.scale(-1, 1);
                drawFrame(context, swordSource, {x: -halfIconSize + 6, y: -halfIconSize, w: iconSize, h: iconSize});
            context.restore();
        }

        drawEmbossedText(context, text, 'gold', 'black', this.target.x + iconSize, this.target.y + halfIconSize);
    },
    updateTarget(state: GameState): void {
        const { canvas, iconSize } = state.display;
        const w = iconSize;
        // Fight or Flee button is shown in the bottom center of the screen,
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

export function getFightOrFleeButton(): HudButton {
    return fightOrFleeButton;
}

export function drawFightFleeButton(context: CanvasRenderingContext2D, state: GameState): void {
    fightOrFleeButton.render(context, state);
}

function pushDamageIndicator(state: GameState, targetPosition: number[], sourcePosition: number[], value: string, color: string = 'red') {
    var dx = targetPosition[0] - sourcePosition[0] + (Math.random() - .5) * gridLength / 5;
    var dy = targetPosition[1] - sourcePosition[1] + (Math.random() - .5) * gridLength / 5;
    if (dx == 0 && dy == 0) {
        dx = Math.random() - .5;
        dy = Math.random() - .5;
    }
    var mag = Math.sqrt(dx * dx + dy * dy);
    state.battle.damageIndicators.push({ value, color,
        position: [targetPosition[0], targetPosition[1], gridLength / 10],
        velocity: [dx / mag * gridLength / 20, dy / mag * gridLength / 20, gridLength / 12],
    });
}

function updateDamageIndicators(state: GameState): void {
    for (const indicator of state.battle.damageIndicators) {
        indicator.position[0] += indicator.velocity[0];
        indicator.position[1] += indicator.velocity[1];
        indicator.position[2] += indicator.velocity[2];
        indicator.velocity[2] -= gridLength / 150;
    }
    // Remove damage indicators when they hit z <= 0.
    state.battle.damageIndicators = state.battle.damageIndicators.filter(d => d.position[2] > 0);
}

export function drawDamageIndicators(context: CanvasRenderingContext2D, state: GameState) {
    const { iconSize } = state.display;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    for (const damage of state.battle.damageIndicators) {
        context.font = Math.round(iconSize / 8 * (1 + 4 * damage.position[2] / gridLength)) + 'px sans-serif';
        var coords = project(state, [damage.position[0], damage.position[1] - damage.position[2]]);
        drawEmbossedText(context, damage.value, damage.color, 'white', coords[0], coords[1]);
    }
}
