
import {
    drawBar, drawEmbossedText, drawFrame, drawTintedImage,
} from 'app/draw';
import { gridLength } from 'app/gameConstants';
import {
    heartSource, outlinedMoneySource,
} from 'app/images';
import { abbreviateNumber } from 'app/utils/index';
import {project} from 'app/utils/world';

export function drawCoinsIndicator(context: CanvasRenderingContext2D, state: GameState) {
    const { canvas, iconSize } = state.display;
    const localIconSize = Math.floor(iconSize / 2);
    const coinsText = abbreviateNumber(state.saved.coins);
    const fontSize = Math.floor( localIconSize * .9);
    context.font = fontSize + 'px sans-serif';
    context.textAlign = 'left'
    context.textBaseline = 'middle';
    const metrics = context.measureText(coinsText);
    const margin = 10;
    const x = canvas.width - metrics.width - localIconSize - 3 * margin;
    const y = margin;
    drawFrame(context, outlinedMoneySource, {x, y, w: localIconSize, h: localIconSize});
    drawEmbossedText(context, coinsText, 'gold', 'white', x + localIconSize, y + Math.round(localIconSize / 2));
}


export function drawLifeIndicator(context: CanvasRenderingContext2D, state: GameState) {
    const { iconSize } = state.display;
    const localIconSize = Math.floor(iconSize / 2);
    const fontSize = Math.floor(3 * localIconSize / 4);
    context.font = fontSize + 'px sans-serif';
    context.textAlign = 'left';
    context.textBaseline = 'top';

    drawFrame(context, heartSource, {x: 10, y: 10, w: localIconSize, h: localIconSize});
    const { currentHealth } = state.saved.avatar;
    const { maxHealth } = state.avatar;
    const healthText = abbreviateNumber(currentHealth) + ' / ' + abbreviateNumber(maxHealth);
    drawEmbossedText(context, healthText, 'red', 'white', 10 + localIconSize + 5, 10);
    drawBar(context, {x: 10, y: 10 + localIconSize + 5, w: localIconSize * 4, h: 6}, 'white', 'red', currentHealth / maxHealth);
}

export function drawLootMarker(context: CanvasRenderingContext2D, state: GameState, lootMarker: LootMarker, scaleToUse: number) {
    const center = project(state, [lootMarker.x, lootMarker.y]);
    const lootScale = gridLength * scaleToUse / 64;
    const w = lootMarker.loot.frame.w * (lootMarker.loot.scale ?? 1) * lootScale;
    const h = lootMarker.loot.frame.h * (lootMarker.loot.scale ?? 1) * lootScale;
    const target = {
        x: Math.round(center[0] - w / 2),
        y: Math.round(center[1] - h / 2),
        w, h,
    };
    if (lootMarker.isInMonsterRadius || lootMarker.isInAvatarRadius) {
        const tintColor = lootMarker.isInMonsterRadius ? 'red' : 'gold';
        drawTintedImage(context, {color: tintColor, amount: .4 + Math.cos(state.time / 150) * .3}, lootMarker.loot.frame, target);
    } else {
        drawFrame(context, lootMarker.loot.frame, target);
    }
}
