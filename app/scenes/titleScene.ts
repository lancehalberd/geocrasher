import { getLevelBonus } from 'app/avatar';
import { drawFrame, drawOutlinedText } from 'app/draw';
import { handleHudButtonClick, renderHudButtons } from 'app/hud';
import { heartSource, outlinedMoneySource, requireImage, shieldSource, swordSource, trashSource } from 'app/images';
import { deleteSaveSlot, loadSaveSlot } from 'app/saveGame';
import { abbreviateNumber } from 'app/utils/index';
import { GameState, HudButton, Rectangle } from 'app/types';

const titleBackground = requireImage('gfx/beach.jpg');
const saveColors = ['red', 'green', 'blue'];
const saveLabels = ['A', 'B', 'C'];

function getTitleDisplayValues(state: GameState) {
    const { canvas, iconSize } = state.display;
    const titleFontSize = Math.min(200, Math.floor(canvas.height / 4), Math.floor(canvas.width / 5));
    const narrow = canvas.height > canvas.width;
    let loadButtonWidth = Math.ceil(narrow ? Math.min(300, canvas.width / 2) : canvas.width / 5);
    const buttonHeight = Math.ceil( loadButtonWidth / 2);
    const deleteButtonWidth = Math.floor(buttonHeight / 3);
    loadButtonWidth = Math.round(loadButtonWidth * 4 / 3);
    const totalButtonWidth = loadButtonWidth + deleteButtonWidth;
    const padding = 10;
    let x, y;
    if (narrow) {
        x = 2 * titleFontSize + Math.max(0, ((canvas.height - 2 * titleFontSize) - buttonHeight * 3 - padding * 2) / 2);
        y = Math.floor((canvas.width - totalButtonWidth) / 2);
    } else {
        x = 2 * titleFontSize + Math.max(0, ((canvas.height - 2 * titleFontSize) - buttonHeight) / 2);
        y = Math.floor((canvas.width - totalButtonWidth * 3 - 2 *padding) / 2);
    }
    const border = 4;
    return {
        canvas,
        narrow,
        // Width of the
        loadButtonWidth,
        deleteButtonWidth,
        totalButtonWidth,
        buttonHeight,
        w: canvas.width,
        h: canvas.height,
        x, y,
        border,
        titleFontSize,
        iconSize,
        padding,
    };
}

class LoadSaveSlotButton implements HudButton {
    index: number
    target: Rectangle = { x: 0, y: 0, w: 0, h: 0};
    deleteTarget: Rectangle = { x: 0, y: 0, w: 0, h: 0};
    constructor(index: number) {
        this.index = index;
    }
    onClick(state: GameState, x: number, y: number) {
        loadSaveSlot(state, this.index);
    }
    render(context: CanvasRenderingContext2D, state: GameState) {
        const { border, buttonHeight } = getTitleDisplayValues(state);
        const statsPadding = 4;
        const localIconSize = Math.round((buttonHeight - 4 * statsPadding - 2 * border) / 3);
        const smallFontSize = Math.floor(localIconSize * .9);
        const smallFont = smallFontSize + 'px sans-serif';
        const saveSlot = state.saveSlots[this.index];
        const slotLabelWidth = Math.round(buttonHeight / 4);
        context.fillStyle = 'black';
        context.fillRect(this.target.x, this.target.y, this.target.w, this.target.h);
        context.fillStyle = 'white';
        context.fillRect(this.target.x + border, this.target.y + border, this.target.w - 2 * border, this.target.h - 2 * border);
        context.fillStyle = saveColors.shift();
        context.fillRect(this.target.x + border, this.target.y + border, slotLabelWidth, this.target.h - 2 * border);
        context.font = Math.floor(buttonHeight / 4) + 'px sans-serif';
        context.fillStyle = 'white';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(saveLabels.shift(), this.target.x + border + Math.round(slotLabelWidth / 2), this.target.y + Math.round(buttonHeight / 2));
        let statsTop = this.target.y + border + statsPadding;
        const statsLeft = this.target.x + border + statsPadding + slotLabelWidth;
        const statsWidth = this.target.w - slotLabelWidth;
        context.font = smallFont;
        context.textAlign = 'left';
        context.textBaseline = 'middle';
        context.fillStyle = 'black';
        const level = abbreviateNumber(saveSlot.avatar.level);
        const levelBonus = getLevelBonus(state);
        // Level
        const levelText = 'Lv ' + level;
        context.fillText(levelText, statsLeft + statsPadding, statsTop + Math.round(localIconSize / 2));
        // Health
        const middleLeft = statsLeft + Math.ceil(statsWidth / 2);
        const lifeText = abbreviateNumber(Math.round(saveSlot.avatar.healthBonus * levelBonus));
        drawFrame(context, heartSource, {x: middleLeft, y: statsTop, w: localIconSize, h: localIconSize});
        context.fillStyle = 'red';
        context.fillText(lifeText, middleLeft + localIconSize, statsTop + Math.round(localIconSize / 2));
        statsTop += localIconSize + statsPadding;

        context.fillStyle = 'black';
        const attackText = abbreviateNumber(Math.round(saveSlot.avatar.attackBonus * levelBonus));
        drawFrame(context, swordSource, {x: statsLeft, y: statsTop, w: localIconSize, h: localIconSize});
        context.fillText(attackText, statsLeft + localIconSize, statsTop + Math.round(localIconSize / 2));

        const defenseText = abbreviateNumber(Math.round(saveSlot.avatar.defenseBonus * levelBonus));
        drawFrame(context, shieldSource, {x: middleLeft, y: statsTop, w: localIconSize, h: localIconSize});
        context.fillText(defenseText, middleLeft + localIconSize, statsTop + Math.round(localIconSize / 2) );
        statsTop += localIconSize + statsPadding;

        const coinsText = abbreviateNumber(Math.round(saveSlot.coins));
        context.fillStyle = 'gold';
        const coinsLeft = statsLeft + Math.ceil(statsWidth / 4);
        drawFrame(context, outlinedMoneySource, {x: coinsLeft, y: statsTop, w: localIconSize, h: localIconSize});
        context.fillText(coinsText, coinsLeft + localIconSize, statsTop + Math.round(localIconSize / 2));
    }
    updateTarget(state: GameState): void {
        const { buttonHeight, loadButtonWidth, narrow, padding, totalButtonWidth, x, y } = getTitleDisplayValues(state);
        if (narrow) {
            this.target = {
                x,
                y: y + this.index * (buttonHeight + padding),
                w: loadButtonWidth,
                h: buttonHeight
            };
        } else {
            this.target = {
                x: x + this.index * (totalButtonWidth + padding),
                y,
                w: loadButtonWidth,
                h: buttonHeight
            };
        }
    }
}

class DeleteSaveSlotButton implements HudButton {
    index: number
    target: Rectangle = { x: 0, y: 0, w: 0, h: 0};
    constructor(index: number) {
        this.index = index;
    }
    onClick(state: GameState) {
        deleteSaveSlot(state, this.index);
    }
    render(context: CanvasRenderingContext2D, state: GameState) {
        const { border, buttonHeight } = getTitleDisplayValues(state);
        context.fillStyle = 'black';
        context.fillRect(this.target.x, this.target.y, this.target.w, this.target.h);
        context.fillStyle = '#AAA';
        context.fillRect(this.target.x, this.target.y + border, this.target.w - border, this.target.h - 2 * border);
        const trashSize = this.target.w;
        const trashTarget = {x: this.target.x - Math.round(border / 2), y: this.target.y + (buttonHeight - trashSize) / 2, w: trashSize, h: trashSize};
        drawFrame(context, trashSource, trashTarget);
    }
    updateTarget(state: GameState): void {
        const { buttonHeight, deleteButtonWidth, loadButtonWidth, narrow, padding, totalButtonWidth, x, y } = getTitleDisplayValues(state);
        if (narrow) {
            this.target = {
                x: x + loadButtonWidth,
                y: y + this.index * (buttonHeight + padding),
                w: deleteButtonWidth,
                h: buttonHeight
            };
        } else {
            this.target = {
                x: x + loadButtonWidth + this.index * (totalButtonWidth + padding),
                y,
                w: deleteButtonWidth,
                h: buttonHeight
            };
        }
    }
}
const titleButtons = [
    new LoadSaveSlotButton(0), new LoadSaveSlotButton(1), new LoadSaveSlotButton(2),
    new DeleteSaveSlotButton(0), new DeleteSaveSlotButton(1), new DeleteSaveSlotButton(2),
];

function getTitleButtons(): HudButton[] {
    return titleButtons;
}

let lastCanvasSize: {w: number, h: number} = null;
function updateAllTitleButtonTargets(state: GameState): void {
    const { canvas } = state.display;
    if (lastCanvasSize?.w === canvas.width && lastCanvasSize?.h === canvas.height) {
        return;
    }
    lastCanvasSize = {w: canvas.width, h: canvas.height};
    for (const button of getTitleButtons()) {
        button.updateTarget(state);
    }
}

export function handleTitleClick(state: GameState, x: number, y: number): void {
    updateAllTitleButtonTargets(state);
    handleHudButtonClick(state, x, y, getTitleButtons());
}

function drawTitleBackground(context: CanvasRenderingContext2D, state: GameState) {
    const { canvas } = state.display;
    const backgroundScale = Math.max(canvas.width / titleBackground.width, canvas.height / titleBackground.height);
    const w = Math.ceil(titleBackground.width * backgroundScale);
    const h = Math.ceil(titleBackground.height * backgroundScale);
    drawFrame(context, {image: titleBackground, x: 0, y: 0, w: titleBackground.width, h: titleBackground.height},
        {x: (canvas.width - w) / 2, y: (canvas.height - h) / 2, w, h}
    );
}

export function drawTitleScene(context: CanvasRenderingContext2D, state: GameState) {
    const { canvas, titleFontSize } = getTitleDisplayValues(state);
    drawTitleBackground(context, state);
    context.fillStyle = 'gold';
    context.font = 'bold ' + titleFontSize + 'px sans-serif';
    context.textAlign = 'center'
    context.textBaseline = 'top';
    drawOutlinedText(context, 'Geo', 'brown', 'white', 3, canvas.width / 2, 10);
    drawOutlinedText(context, 'Crasher', 'gold', 'white', 3, canvas.width / 2, titleFontSize);
    updateAllTitleButtonTargets(state);
    renderHudButtons(context, state, getTitleButtons());
}
