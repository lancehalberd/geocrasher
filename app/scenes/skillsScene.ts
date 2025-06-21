import { updatePlayerStats } from 'app/avatar';
import { drawFrame, drawEmbossedText, drawOutlinedText, drawSolidTintedImage } from 'app/draw';
import { triggerBackAction } from 'app/handleBackAction';
import { handleHudButtonClick, renderHudButtons } from 'app/hud';
import {
    darkStoneImage,
    heartSource, outlinedMoneySource,
    shieldSource, swordSource,
    upArrows,
} from 'app/images';
import { pushScene } from 'app/state';
import { percentText } from 'app/utils/index';
import {
    canAffordSkill, canLearnSkill,
    getAttackSkillBonus, getAvailableSkillPoints,
    getDefenseSkillBonus, getHealthSkillBonus,
    getMoneySkillBonus,
    getSkillCost, getSkillLevel, getSkillValue,
    getTotalSkillPoints,
    skills,
} from 'app/utils/skills';


function getSkillDisplayValues(state: GameState) {
    const { canvas, iconSize } = state.display;
    const centerX = Math.round(canvas.width / 2);
    const centerY = Math.round((canvas.height - iconSize) / 2);
    const padding = 5;
    const skillSize = Math.round(Math.min((canvas.width - 8 * padding) / 7, (canvas.height - iconSize - 8 * padding) / 7) / 2) * 2;
    const skillSpacing = skillSize + padding;
    const border = 3;
    return {
        canvas,
        w: canvas.width,
        h: canvas.height,
        border,
        centerX,
        centerY,
        skillSize,
        skillSpacing,
        iconSize,
        padding,
    };
}


export function drawSkillsScene(context: CanvasRenderingContext2D, state: GameState) {
    const {
        canvas,
        centerX,
        centerY,
        skillSize,
        skillSpacing,
    } = getSkillDisplayValues(state);
    // Draw background
    context.fillStyle = context.createPattern(darkStoneImage, 'repeat') as CanvasPattern;
    context.fillRect(0, 0, canvas.width, canvas.height);
    // Updated + Draw hud buttons
    updateAllSkillButtonTargets(state);
    renderHudButtons(context, state, getSkillHudButtons(state));
    const { selectedSkill } = state.avatar;
    const selectedSkillType = selectedSkill?.affinity;
    const selectedSkillCost = selectedSkill ? getSkillCost(state, selectedSkill) : 0;
    const netPoints = getAvailableSkillPoints(state) - selectedSkillCost;
    drawFrame(context, outlinedMoneySource, {x: centerX - skillSpacing, y: centerY + skillSpacing * 3 - skillSize / 2, w: skillSize, h: skillSize});

    context.font =  Math.floor(skillSize / 3) + 'px sans-serif';
    context.textBaseline = 'middle';
    context.textAlign = 'left';
    let bonus = getMoneySkillBonus(state) - 1;
    let color = 'green';
    if (selectedSkillType === 'health') {
        bonus -= selectedSkillCost / 100;
        color = 'red'
    } else if (selectedSkillType === 'money') {
        bonus += selectedSkillCost / 100;
        color = '#0F0';
    }
    drawEmbossedText(context, (bonus >= 0 ? '+' : '') + percentText(bonus, 0), color, 'white', centerX, centerY + skillSpacing * 3);

    bonus = getHealthSkillBonus(state) - 1;
    color = 'green';
    if (selectedSkillType === 'money') {
        bonus -= selectedSkillCost / 100;
        color = 'red'
    } else if (selectedSkillType === 'health') {
        bonus += selectedSkillCost / 100;
        color = '#0F0';
    }
    drawFrame(context, heartSource, {x: centerX - skillSpacing, y: centerY - skillSpacing * 3 - skillSize / 2, w: skillSize, h: skillSize});
    drawEmbossedText(context, (bonus >= 0 ? '+' : '') + percentText(bonus, 0), color, 'white', centerX, centerY - skillSpacing * 3);

    bonus = getAttackSkillBonus(state) - 1;
    color = 'green';
    if (selectedSkillType === 'defense') {
        bonus -= selectedSkillCost / 100;
        color = 'red'
    } else if (selectedSkillType === 'attack') {
        bonus += selectedSkillCost / 100;
        color = '#0F0';
    }
    drawFrame(context, swordSource, {x: centerX - 3 * skillSpacing - skillSize / 2, y: centerY - skillSpacing, w: skillSize, h: skillSize});
    context.textBaseline = 'top';
    context.textAlign = 'right';
    drawEmbossedText(context, (bonus >= 0 ? '+' : '') + percentText(bonus, 0), color, 'white', centerX - skillSpacing * 3 + skillSize / 2, centerY);

    bonus = getDefenseSkillBonus(state) - 1;
    color = 'green';
    if (selectedSkillType === 'attack') {
        bonus -= selectedSkillCost / 100;
        color = 'red'
    } else if (selectedSkillType === 'defense') {
        bonus += selectedSkillCost / 100;
        color = '#0F0';
    }
    drawFrame(context, shieldSource, {x: centerX + 3 * skillSpacing - skillSize / 2, y: centerY - skillSpacing, w: skillSize, h: skillSize});
    context.textAlign = 'left';
    drawEmbossedText(context, (bonus >= 0 ? '+' : '') + percentText(bonus, 0), color, 'white', centerX + skillSpacing * 3 - skillSize / 2, centerY);

    color = netPoints >= 0 ? 'green' : 'red';
    context.textBaseline = 'middle';
    context.textAlign = 'center';
    context.font = 'bold ' + Math.floor(skillSize / 2) + 'px sans-serif';
    drawOutlinedText(context, netPoints >= 0 ? `${netPoints}` : '- -', color, 'white', 1, centerX, centerY);

    if (selectedSkill) {
        const skillKey = selectedSkill.key as SkillKey;
        const skillLevel = getSkillLevel(state, skillKey);
        const fontSize = Math.floor(skillSize / 3)
        const currentValue = getSkillValue(state, skillKey, skillLevel);
        const newValue = getSkillValue(state, skillKey, skillLevel + 1);
        let parts, leftDescription, formattedValue, formattedNewValue, rightDescription;
        if (selectedSkill.description.indexOf('%') >= 0) {
            parts = selectedSkill.description.split('%');
            leftDescription = parts[0];
            formattedValue = percentText(currentValue, 1);
            formattedNewValue = percentText(newValue, 1);
            rightDescription = parts[1];
        } else {
            parts = selectedSkill.description.split('#');
            leftDescription = parts[0];
            formattedValue = '+' + currentValue;
            formattedNewValue = '+' +newValue;
            rightDescription = parts[1];
        }
        if (leftDescription.length) {
            leftDescription = leftDescription.substring(0, leftDescription.length);
        }
        rightDescription = rightDescription.substring(1);
        context.font = fontSize + 'px sans-serif';
        const width = Math.max(context.measureText(leftDescription).width, context.measureText(rightDescription).width) + 10;
        let height = Math.ceil(fontSize * 3.2 + 25);
        if (leftDescription) {
            height += fontSize + 5;
        }
        let top = 10;
        const left = 10;
        const titleHeight = 10 + fontSize;

        // Box
        context.fillStyle = '#EEE';
        context.fillRect(left - 2, top - 2, width + 4, height + 4);
        context.fillStyle = '#666';
        context.fillRect(left, top + titleHeight, width, height - titleHeight);

        const descriptionCenterX = left + width / 2;
        context.textBaseline = 'top';
        // skill name
        context.font = 'bold ' + fontSize + 'px sans-serif';
        context.textAlign = 'left';
        context.textBaseline = 'middle';
        context.fillStyle = '#080';
        context.fillText(selectedSkill.name, left + 5, top + Math.floor(titleHeight / 2));
        top += titleHeight + 5;

        context.textBaseline = 'top';
        if (leftDescription.length) {
            context.font = fontSize + 'px sans-serif';
            context.textAlign = 'center';
            context.fillStyle = 'white';
            context.fillText(leftDescription, descriptionCenterX, top);
            top += 5 + fontSize;
        }

        context.font = 'bold ' + Math.ceil(fontSize * 1.2) + 'px sans-serif';
        if (skillLevel === 0) {
            context.fillStyle = '#0C0';
            context.textAlign = 'center';
            context.fillText(formattedNewValue, descriptionCenterX, top);
        } else {
            context.fillStyle = 'white';
            context.textAlign = 'right';
            context.fillText(formattedValue, descriptionCenterX - 30, top);

            context.fillStyle = '#0C0';
            context.textAlign = 'center';
            context.fillText('->', descriptionCenterX, top);
            context.fillText('-', descriptionCenterX, top);
            context.fillText('--', descriptionCenterX, top);

            context.textAlign = 'left';
            context.fillText(formattedNewValue, descriptionCenterX + 30, top);
        }
        top += 5 + Math.ceil(fontSize * 1.2);

        context.textAlign = 'center';
        context.font = fontSize + 'px sans-serif';
        context.fillStyle = 'white';
        context.fillText(rightDescription, descriptionCenterX, top);
    }
}

const skillButton: HudButton = {
    onClick(state: GameState) {
        if (state.currentScene === 'skills') {
            // return to the previous scene.
            triggerBackAction();
            delete state.avatar.selectedSkill;
        } else {
            // store the previous scene to return to it when we close the skill scene.
            pushScene(state, 'skills');
        }
    },
    isVisible(state: GameState): boolean {
        return getTotalSkillPoints(state) > 0 && !state.globalPosition.isFastMode && !state.globalPosition.isFixingGPS;
    },
    render(context: CanvasRenderingContext2D, state: GameState) {
        const { iconSize } = state.display;
        context.textBaseline = 'middle';
        context.textAlign = 'center';
        context.font = 'bold ' + Math.floor(iconSize * 1.25) + 'px sans-serif';
        const points = getAvailableSkillPoints(state);
        context.fillStyle = 'white';
        const target = this.target;
        const padding = Math.floor(target.w / 10);
        const size = Math.floor(target.w / 4);
        context.fillRect(target.x + padding, target.y + Math.floor((target.h - size)/ 2), target.w - 2 * padding, size);
        context.fillRect(target.x + Math.floor((target.w - size)/ 2), target.y + padding, size, target.h - 2 * padding);
        context.fillStyle = points ? 'red' : '#888';
        context.fillRect(target.x + padding + 2, target.y + Math.floor((target.h- size)/ 2) + 2, target.w - padding * 2 - 4, size - 4);
        context.fillRect(target.x + Math.floor((target.w - size) / 2) + 2, target.y + padding + 2, size - 4, target.h - 2 * padding - 4);
        if (points) {
            context.textBaseline = 'bottom';
            context.textAlign = 'right';
            context.font = 'bold ' + Math.floor(iconSize / 4) + 'px sans-serif';
            drawOutlinedText(context, `${points}`, 'red', 'white', 1, target.x + target.w - 2, target.y + target.h);
        }
    },
    updateTarget(state: GameState): void {
        const { canvas, iconSize } = state.display;
        // Skill Button is in the bottom right corner.
        this.target = {
            w: iconSize,
            h: iconSize,
            x: canvas.width - 10 - iconSize,
            y: canvas.height - 10 - iconSize,
        };
    },
    target: { x: 0, y: 0, w: 0, h: 0},
};

export function getSkillButton(): HudButton {
    return skillButton;
}
const upgradeSkillButton: HudButton = {
    onClick(state: GameState): void {
        const { selectedSkill } = state.avatar;
        if (!selectedSkill) {
            return;
        }
        state.avatar.usedSkillPoints += getSkillCost(state, selectedSkill);
        state.avatar.affinityBonuses[selectedSkill.affinity] += getSkillCost(state, selectedSkill);
        state.saved.avatar.skillLevels[selectedSkill.key] = getSkillLevel(state, selectedSkill.key) + 1;
        delete state.avatar.selectedSkill;
        updatePlayerStats(state);
    },
    isDisabled(state: GameState): boolean {
         return !state.avatar.selectedSkill
             || !canLearnSkill(state, state.avatar.selectedSkill)
             || !canAffordSkill(state, state.avatar.selectedSkill);
    },
    isVisible(state: GameState): boolean {
        return !!state.avatar.selectedSkill;
    },
    render(context: CanvasRenderingContext2D, state: GameState): void {
        const { iconSize } = state.display;
        const { selectedSkill } = state.avatar;
        if (!selectedSkill) {
            return;
        }
        const isAvailable = canLearnSkill(state, selectedSkill);
        const cost = getSkillCost(state, selectedSkill);
        const remainingPoints = getAvailableSkillPoints(state) - cost;
        const reqiurementsSatisfied = isAvailable && (remainingPoints >= 0);
        const arrowColor = reqiurementsSatisfied ? 'green' : 'red';
        const textColor = reqiurementsSatisfied ? 'white' : 'red';
        context.save();
            if (!reqiurementsSatisfied) context.globalAlpha = .5;
            context.textBaseline = 'middle';
            context.textAlign = 'left';
            context.font = Math.floor(3 * iconSize / 4) + 'px sans-serif';
            drawSolidTintedImage(context, arrowColor, upArrows, this.target);
            const text = isAvailable ? `${cost}` : '---';
            drawEmbossedText(context, text, textColor, 'black', this.target.x + iconSize, this.target.y + this.target.h / 2);
        context.restore();
    },
    updateTarget(state: GameState): void {
        const { canvas, iconSize } = state.display;
        // Upgrade Button is in the bottom center.
        this.target = {
            w: iconSize,
            h: iconSize,
            x: Math.floor((canvas.width - iconSize) / 2),
            y: canvas.height - 10 - iconSize,
        };
    },
    target: { x: 0, y: 0, w: 0, h: 0}
};
const skillButtons: SkillButton[] = skills.map(skill => ({
    skill,
    target: { x: 0, y: 0, w: 0, h: 0},
    onClick(state: GameState): void {
        if (state.avatar.selectedSkill !== skill) {
            state.avatar.selectedSkill = skill;
        } else {
            delete state.avatar.selectedSkill;
        }
    },
    render(context: CanvasRenderingContext2D, state: GameState): void {
        const { border, skillSize } = getSkillDisplayValues(state);
        const skillIsAvailable = canLearnSkill(state, skill);
        const skillIsAffordable = canAffordSkill(state, skill);
        const skillLevel = getSkillLevel(state, skill.key);
        const { selectedSkill } = state.avatar;
        const target = this.target;
        context.save();
            context.fillStyle = (!skillLevel && selectedSkill !== skill) ? '#777' : '#aaa';
            if (!skillLevel && selectedSkill !== skill && !skillIsAvailable)  context.globalAlpha = .2;
            else context.globalAlpha = .5;
            context.fillRect(target.x, target.y, target.w, target.h - 2);
        context.restore();
        context.save();
            if (!skillLevel && selectedSkill !== skill) {
                context.globalAlpha = .3;
            }

            // Icon is drawn transparent if the ability hasn't been learned yet.
            drawFrame(context, skill.source, target);
            if (skill.secondSource) {
                drawFrame(context, skill.secondSource,
                    {x: target.x + target.w / 2, y: target.y + target.h / 2,
                     w: target.w / 2, h: target.h / 2});
            }
        context.restore();

        // Use evenodd to draw the border over the background+icon
        context.fillStyle = (selectedSkill === skill)
            ? ((skillIsAvailable && skillIsAffordable) ?  '#080' : 'red')
            : (skillIsAvailable ? 'white' : '#333');
        context.beginPath();
        context.rect(target.x, target.y, target.w, target.h);
        context.rect(target.x + border, target.y + border, target.w - 2 * border, target.h - 2 * border);
        context.fill('evenodd');

        if (skillLevel || selectedSkill === skill) {
            let level = skillLevel, color = 'white';
            if (selectedSkill === skill) {
                level++;
                color = (skillIsAffordable && skillIsAvailable) ? 'green' : 'red';
            }
            context.textBaseline = 'bottom';
            context.textAlign = 'left';
            context.font = 'bold ' + Math.floor(skillSize / 3) + 'px sans-serif';
            drawOutlinedText(context, `${level}`, color, 'black', 1, target.x + 2 * border, target.y + target.h - 2);
        }
    },
    updateTarget(state: GameState): void {
        const { centerX, centerY, skillSpacing, skillSize } = getSkillDisplayValues(state);
        this.target = {
            x: centerX + skill.x * skillSpacing - skillSize / 2, w: skillSize,
            y: centerY + skill.y * skillSpacing - skillSize / 2, h: skillSize,
        };
    },
}));

function getSkillHudButtons(state: GameState): HudButton[] {
    return [
        skillButton,
        upgradeSkillButton,
        ...skillButtons,
    ];
}
let lastCanvasSize: {w: number, h: number};
// Update the targets for skill buttons for the current display settings.
// This should be called each frame before checking for user clicks or rendering the buttons.
function updateAllSkillButtonTargets(state: GameState): void {
    const { canvas } = state.display;
    if (lastCanvasSize?.w === canvas.width && lastCanvasSize?.h === canvas.height) {
        return;
    }
    lastCanvasSize = {w: canvas.width, h: canvas.height};
    for (const skillButton of getSkillHudButtons(state)) {
        skillButton.updateTarget(state);
    }
}

export function handleSkillsClick(state: GameState, x: number, y: number): boolean {
    updateAllSkillButtonTargets(state);
    return handleHudButtonClick(state, x, y, getSkillHudButtons(state));
}

