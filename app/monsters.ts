import { getAttackWithoutHealthBonuses, getDefenseWithoutHealthBonuses } from 'app/avatar';
import { drawBar, drawFrame, drawOutlinedImage, getTintedImage, prepareTintedImage } from 'app/draw';
import { emptyJourneyRadius, gridLength, maxTileLevel } from 'app/gameConstants';
import { bugSource, crabSource, fungusSource, snailSource, turtleSource, waspSource } from 'app/images';
import { getTilePower } from 'app/scenes/mapScene';
import { getSkillValue } from 'app/scenes/skillsScene';
import { getDistance } from 'app/utils/index';
import Random from 'app/utils/Random';

import { GameState, MapTile, Monster } from 'app/types';

const minMonsterRadius = gridLength * 2 / 3;
const maxMonsterRadius = gridLength * 4 / 3;


function getMonsterPowerForTile(state: GameState, tile: MapTile): number {
    // This formula is designed to make the monsters in journey mode have scaling
    // similar to the tile selected for journey mode.
    if (state.currentScene === 'journey') {
        return state.world.journeyModeTileLevel / 2 + 2 * (getTilePower(state, tile) - 1);
    }
    return tile.level / 2 + 2 * (getTilePower(state, tile) - 1);
}
export function makeBossMonster(state: GameState, monsterPower: number): Monster {
    const boss = makeMonster(state, monsterPower);
    boss.maxHealth = boss.currentHealth = boss.maxHealth * 3;
    boss.attack = Math.ceil(boss.attack * 1.1);
    boss.defense = Math.ceil(boss.defense * 1.4);
    boss.experience *= 4;
    boss.isBoss = true;
    boss.tint = {color:'red', amount: 0.6};
    return boss;
}
export function makeMonster(state: GameState, monsterPower: number): Monster {
    const monsterLevel = Math.max(1, Math.floor(monsterPower));
    // Monsters gain 30% more power each level, and gain up to an additional 20% more power before leveling again.
    const powerFactor = Math.pow(1.3, monsterLevel - 1) * (1 + Math.max(0, monsterPower - monsterLevel) / 5);
    //const powerFactor = Math.pow(3, tile.level - 1) * getTilePower(tile);
    const rollA = Random.integerRange(-2, 2);
    const rollB = Random.integerRange(-2, 2);
    const rollC = -rollA - rollB;
    // Average roll is 1, min is 0.2 max is 1.8.
    const rolls = [1 + .2 * rollA, 1 + .2 * rollB, 1 + .2 * rollC];
    const healthRoll = Random.removeElement(rolls);
    const attackRoll = Random.removeElement(rolls);
    const defenseRoll = Random.removeElement(rolls);
    let name = 'Giant Bug', frame = bugSource;
    if (healthRoll > attackRoll && healthRoll > defenseRoll) {
        name = 'Shroomie';
        frame = fungusSource;
    } else if (attackRoll > healthRoll && attackRoll > defenseRoll) {
        name = 'Pincher';
        frame = crabSource;
    } else if (defenseRoll > attackRoll && defenseRoll > healthRoll) {
        name = 'Iron Shell';
        frame = turtleSource;
    } else if (defenseRoll === attackRoll) {
        name = 'Giant Bug';
        frame = bugSource;
    } else if (defenseRoll >= healthRoll && defenseRoll >= attackRoll) {
        name = 'Guard Snail';
        frame = snailSource;
    } else if (attackRoll >= healthRoll && attackRoll >= defenseRoll) {
        name = 'Stinger';
        frame = waspSource;
    }
    // console.log([healthRoll, attackRoll, defenseRoll, name]);
    const statReduction = 1 - getSkillValue(state, 'conquerer');
    const health = Math.round(30 * powerFactor * healthRoll * statReduction);
    const attack = Math.round(5 * powerFactor * attackRoll * statReduction);
    const defense = Math.round(5 * powerFactor * defenseRoll * statReduction);
    return {
        level: monsterLevel, name: name,
        type: 'monster',
        currentHealth: health,
        maxHealth: health, attack, defense,
        frame,
        experience: Math.round(powerFactor * 2),
        radius: Random.range(minMonsterRadius, maxMonsterRadius),
    };
}

export function checkToGenerateMonster(state: GameState, tile: MapTile, baseChance: number = 0.05) {
    // Monsters cannot spawn in shallows or on top of dungeons.
    if (tile.level < 1 || tile.dungeonMarker) {
        return;
    }
    // Prevent monster from spawning within 2 tiles of another monster
    for (const otherMonster of state.world.activeMonsterMarkers) {
        if (getDistance([tile.x, tile.y], [otherMonster.tile.x, otherMonster.tile.y]) <= 2) {
            return;
        }
    }
    const isJourneyMode = state.currentScene === 'journey' || state.currentScene === 'voyage';
    // Don't generate monsters inside the empty radius in journey mode.
    if (isJourneyMode && tile.journeyDistance < emptyJourneyRadius) {
        return;
    }
    // Chance to spawn a monster decreases with # of active monsters and the level of the tile.
    const chanceToSpawn = isJourneyMode
        // In Journey mode the base chance is the exact chance for a monster to spawn.
        ? baseChance
        // In the normal map scene, monsters are less likely to spawn the more active monsters are
        // present and the more powerful the tile they are spawning on is.
        : baseChance * ((8 - state.world.activeMonsterMarkers.length) / 8) * ((maxTileLevel + 1 - tile.level) / (maxTileLevel));
    if (Math.random() > chanceToSpawn) {
        return;
    }
    const monsterPower = getMonsterPowerForTile(state, tile);
    const monster = (isJourneyMode && monsterPower >= state.world.journeyModeNextBossLevel + 1)
        ? makeBossMonster(state, state.world.journeyModeNextBossLevel)
        : makeMonster(state, getMonsterPowerForTile(state, tile));
    if (monster.isBoss) {
        state.world.journeyModeNextBossLevel += 2;
    }

    state.world.journeyModeNextBossLevel
    tile.monsterMarker = {
        type: 'monster',
        x: tile.x + gridLength / 2,
        y: tile.y + gridLength / 2,
        monster,
        tile,
    };
    tile.monsterMarker.monster.marker = tile.monsterMarker;
    state.world.activeMonsterMarkers.push(tile.monsterMarker );
    if (tile === state.selectedTile) {
        delete state.selectedTile;
    }
}

export function drawTileMonster(context: CanvasRenderingContext2D, state: GameState, tile: MapTile, scaleToUse: number) {
    if (!tile.monsterMarker) {
        return;
    }
    const monster = tile.monsterMarker.monster;
    const baseAvatarAttack = getAttackWithoutHealthBonuses(state);
    const baseAvatarDefense = getDefenseWithoutHealthBonuses(state);
    let monsterScale = .8;
    if (monster.maxHealth < state.avatar.maxHealth / 2
        && monster.attack < baseAvatarAttack
        && monster.defense < baseAvatarDefense
    ) {
        monsterScale =  .6;
    } else if (monster.maxHealth > state.avatar.maxHealth / 2
        && monster.attack > baseAvatarAttack
        && monster.defense > baseAvatarDefense
    ) {
        monsterScale = 1;
    }
    if (monster.isBoss) monsterScale = 1;
    const w = Math.round(Math.min(tile.target.w * .9, 128) * monsterScale);
    const h = Math.round(Math.min(tile.target.h * .9, 128) * monsterScale);
    const target = {
        x: tile.target.x + (tile.target.w - w) / 2,
        y: tile.target.y + (tile.target.h - h) / 2,
        w, h
    };

    let frame = monster.frame;
    if (monster.tint) {
        prepareTintedImage();
        frame = getTintedImage(frame, monster.tint);
    }
    if (tile === state.selectedTile) {
        // Outline the monster and draw its radius when the tile is selected.
        drawOutlinedImage(context, 'red', 2, frame, target);
        context.save();
            context.globalAlpha = .15;
            context.fillStyle = 'red';
            context.beginPath();
            context.arc(tile.target.x + tile.target.w / 2, tile.target.y + tile.target.h / 2,
                        tile.monsterMarker.monster.radius * scaleToUse, 0, 2 * Math.PI);
            context.fill();
        context.restore();
    } else {
        drawFrame(context, frame, target);
    }
    // Draw the health bar if the monster is damaged or selected.
    if (monster.currentHealth < monster.maxHealth || tile === state.selectedTile) {
        drawBar(context,
            {x: Math.round(target.x + target.w / 6), y: target.y - 5, w: Math.round(target.w * 2 / 3), h: 6},
            'white', 'red', monster.currentHealth / monster.maxHealth
        );
    }
}
