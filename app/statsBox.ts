import { experienceForNextLevel } from 'app/avatar';
import { drawBar, drawFrame } from 'app/draw';
import { heartSource, shieldSource, swordSource } from 'app/images';
import { abbreviateNumber } from 'app/utils/index';

import { GameState } from 'app/types';

function getStatsBoxSize(state: GameState): {w: number, h: number} {
    const { iconSize } = state.display;
    const localIconSize = Math.floor(iconSize / 2);
    return { w: localIconSize * 8, h: localIconSize * 4 };
}

export function drawStatsBox(context: CanvasRenderingContext2D, state: GameState,
    x: number, y: number,
    level: number, name: string,
    currentHealth: number, maxHealth: number,
    attack: number, defense: number,
    experience?: number, nextLevel?: number
): void {
    const { iconSize } = state.display;
    const localIconSize = Math.floor(iconSize / 2);
    const fontSize = Math.floor(3 * localIconSize / 4);
    const {w, h} = getStatsBoxSize(state);
    const padding = Math.floor(localIconSize / 4);
    context.fillStyle = '#BBB';
    context.fillRect(x, y, w, h);
    context.fillStyle = '#FFF';
    context.fillRect(x + 1, y + 1, w - 2, h - 2);
    context.fillStyle = '#004';
    context.fillRect(x + 3, y + 3, w - 6, h - 6);
    context.textBaseline = 'top';
    context.textAlign = 'left';
    context.font = fontSize + 'px sans-serif';
    context.fillStyle = 'white';
    y += padding;
    const text = 'Lv ' + level + ' ' + name;
    context.fillText(text, x + padding, y);
    if (nextLevel) {
        const metrics = context.measureText(text);
        const left = x + padding + metrics.width + 5;
        drawBar(context, { x: left, y, w: w - metrics.width - 2 * padding - 5, h: localIconSize - 5}, '#ccc', 'orange', experience / nextLevel);
    }
    y += localIconSize;
    drawBar(context, {x: x + padding, y, w: w - 2 * padding, h: 6}, 'white', 'red', currentHealth / maxHealth);
    y += padding;

    drawFrame(context, heartSource, {x: x + padding, y: y, w: localIconSize, h: localIconSize});
    context.fillText(abbreviateNumber(currentHealth) + ' / ' + abbreviateNumber(maxHealth), x + localIconSize + 2 * padding, y);

    y += localIconSize + padding;
    drawFrame(context, swordSource, {x: x + padding, y: y, w: localIconSize, h: localIconSize});
    context.fillText(abbreviateNumber(attack), x + localIconSize + 2 * padding, y);
    var centerX = Math.floor(x + w / 2);
    drawFrame(context, shieldSource, {x: centerX + padding, y: y, w: localIconSize, h: localIconSize});
    context.fillText(abbreviateNumber(defense), centerX + localIconSize + padding, y);
}

export function drawAvatarStats(context: CanvasRenderingContext2D, state: GameState) {
    drawStatsBox(context, state,
        5, 5,
        state.saved.avatar.level, 'Hero',
        state.saved.avatar.currentHealth, state.avatar.maxHealth,
        state.avatar.attack, state.avatar.defense,
        state.saved.avatar.experience, experienceForNextLevel(state)
    );
}

export function drawMonsterStats(context: CanvasRenderingContext2D, state: GameState) {
    if (!state.selectedTile?.monsterMarker) {
        return;
    }
    const { canvas, iconSize } = state.display;
    const monster = state.selectedTile.monsterMarker.monster;
    const rectangle = state.selectedTile.target;
    const {w, h} = getStatsBoxSize(state);
    state.loot.hideStatsAt = state.time + 1500;
    // The monster stats are drawn on the right side of the screen, ideally just below the monster:
    const x = canvas.width - w - 5;
    let y = rectangle.y + rectangle.h;
    // Make sure the box isn't shown too high or too low on the screen.
    y = Math.max(iconSize, Math.min(canvas.height - h - iconSize, y));
    drawStatsBox(context, state,
        x, y,
        monster.level, monster.name,
        monster.currentHealth, monster.maxHealth,
        monster.attack, monster.defense
    );
}
