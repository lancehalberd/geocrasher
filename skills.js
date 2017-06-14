var usedSkillPoints = 0;
var treeBonuses = {'health': 0, 'attack': 0, 'defense': 0, 'money':  0};
var skillTree = {
    'health': {
        'regeneration': {'value': 0.01, 'type': '+', 'x': 0, 'y': -1, 'source': clockSource, 'secondSource': heartSource, 'level': 0, 'name': 'Regeneration', 'description': '% of max health regenerated per tick.'},
        'powerups': {'requires': 'regeneration', 'value': 0.1, 'type': '+', 'x': 0, 'y': -2, 'source': heartSource, 'level': 0, 'name': 'Vitality', 'description': '% increased value of health power ups.'},
        'offense': {'requires': 'powerups', 'value': 2, 'type': '+', 'x': -1, 'y': -2, 'source': heartSource, 'secondSource': swordSource, 'level': 0, 'name': 'Full Power', 'description': '# attack per 100 current health.'},
        'defense': {'requires': 'powerups', 'value': 4, 'type': '+', 'x': 1, 'y': -2, 'source': heartSource, 'secondSource': shieldSource, 'level': 0, 'name': 'Caution', 'description': '# defense per 100 missing health.'}
    },
    'attack': {
        'attackSpeed': {'value': 0.1, 'type': '+', 'x': -1, 'y': 0, 'source': shoeSource, 'secondSource': swordSource, 'level': 0, 'name': 'Ferocity', 'description': '% increased attack speed.'},
        'powerups': {'requires': 'attackSpeed', 'value': 0.1, 'type': '+', 'x': -2, 'y': 0, 'source': swordSource, 'level': 0, 'name': 'Strength', 'description': '% increased value of attack power ups.'},
        'offense': {'requires': 'powerups', 'value': 0.02, 'type': '+', 'x': -2, 'y': -1, 'source': swordSource, 'secondSource': crabSource, 'level': 0, 'name': 'Shredder', 'description': 'Permanently reduce enemy defense by % of your attack on each attack.'},
        'defense': {'requires': 'powerups', 'value': 0.02, 'type': '+', 'x': -2, 'y': 1, 'source': swordSource, 'secondSource': heartSource, 'level': 0, 'name': 'Vampiric Strikes', 'description': '% of damage is gained as health.'}
    },
    'defense': {
        'dodge': {'value': 0.05, 'type': '*', 'x': 1, 'y': 0, 'source': shoeSource, 'secondSource': shieldSource, 'level': 0, 'name': 'Acrobat', 'description': '% chance to dodge attacks.'},
        'powerups': {'requires': 'dodge', 'value': 0.1, 'type': '+', 'x': 2, 'y': 0, 'source': shieldSource, 'level': 0, 'name': 'Toughness', 'description': '% increased value of defense power ups.'},
        'offense': {'requires': 'powerups', 'value': 0.1, 'type': '+', 'x': 2, 'y': -1, 'source': shieldSource, 'secondSource': crabSource, 'level': 0, 'name': 'Urchin', 'description': 'Attackers take % of damage blocked as damage.'},
        'defense': {'requires': 'powerups', 'value': 0.02, 'type': '+', 'x': 2, 'y': 1, 'source': shieldSource, 'secondSource': turtleSource, 'level': 0, 'name': 'Iron Shell', 'description': 'Permanently reduce enemy attack by % of your defense on each block.'}
    },
    'money': {
        'radius': {'value': 0.1, 'type': '+', 'x': 0, 'y': 1, 'source': shoeSource, 'level': 0, 'name': 'Adventurer', 'description': '% increased collection area.'},
        'powerups': {'requires': 'radius', 'value': 0.1, 'type': '+', 'x': 0, 'y': 2, 'source': scrollSource, 'level': 0, 'name': 'Wisdom', 'description': '% increased experience gained.'},
        'explorer': {'requires': 'powerups', 'value': 0.05, 'type': '*', 'x': -1, 'y': 2, 'source': shoeSource, 'secondSource': outlinedMoneySource, 'level': 0, 'name': 'Explorer', 'description': '% reduced cost to upgrade islands.'},
        'conquerer': {'requires': 'powerups', 'value': 0.05, 'type': '*', 'x': 1, 'y': 2, 'source': bugSource, 'level': 0, 'name': 'Conquerer', 'description': '% reduced power of discovered monsters.'}
    }
}
for (var treeKey in skillTree) {
    for (var skillKey in skillTree[treeKey]) {
        skillTree[treeKey][skillKey].treeKey = treeKey;
        skillTree[treeKey][skillKey].skillKey = skillKey;
    }
}
function isSkillButtonVisible() {
    return getTotalSkillPoints() > 0 && !fastMode && !fixingGPS;
}
function getTotalSkillPoints() {
    return (level - 1) + (dungeonLevelCap / 2 - 1);
}
function getAvailableSkillPoints() {
    return getTotalSkillPoints() - usedSkillPoints;
}
function handleSkillButtonClick(x, y) {
    if (!isSkillButtonVisible()) return;
    if (isPointInRectObject(x, y, collectSkillButton.target)) {
        if (currentScene === 'skills') {
            // return to the previous scene.
            popScene();
            selectedSkill = null;
        } else {
            // store the previous scene to return to it when we close the skill scene.
            pushScene('skills');
        }
    }
}
function canLearnSkill(skill) {
    if (!skill.requires) return true;
    return skill.level < skillTree[skill.treeKey][skill.requires].level;
}
function canAffordSkill(skill) {
    return getAvailableSkillPoints() >= getSkillCost(skill);
}
function getSkillCost(skill) {
    return skill.level + 1;
}

function getSkillValue(skill, level) {
    level = ifdefor(level, skill.level);
    if (level === 0) return 0;
    if (skill.type === '+') return level * skill.value;
    if (skill.type === '*') return 1 - Math.pow(1 - skill.value, level);
    throw new Error('Unknown skill type: ' + skill.type);
}

function drawSkillsScene() {
    context.fillStyle = context.createPattern(darkStoneImage, 'repeat');
    context.fillRect(0, 0, canvas.width, canvas.height);
    drawSkillButton();
    var padding = 5;
    var border = 3;
    var skillSize = Math.round(Math.min((canvas.width - 8 * padding) / 7, (canvas.height - iconSize - 8 * padding) / 7) / 2) * 2;
    var skillSpacing = skillSize + padding;
    var centerX = Math.round(canvas.width / 2);
    var centerY = Math.round((canvas.height - iconSize) / 2);
    var netPoints = getAvailableSkillPoints();
    var color = '#0c0';
    var selectedSkillType, selectedSkillCost;
    if (selectedSkill) {
        var skillIsAvailable = canLearnSkill(selectedSkill);
        selectedSkillType = selectedSkill.treeKey;
        selectedSkillCost = getSkillCost(selectedSkill);
        netPoints = skillIsAvailable ? netPoints - selectedSkillCost : '- -';
        var reqiurementsSatisfied = skillIsAvailable && (netPoints >= 0);
        color = reqiurementsSatisfied ? 'green' : 'red';
        context.save();
        if (!reqiurementsSatisfied) context.globalAlpha = .5;
        drawUpgradeSkillButton(skillIsAvailable ? selectedSkillCost : '---', reqiurementsSatisfied ? 'green' : 'red', reqiurementsSatisfied ? 'white' : 'red');
        context.restore();
    }
    drawImage(context, outlinedMoneySource.image, outlinedMoneySource, {'left': centerX - skillSpacing, 'top': centerY + skillSpacing * 3 - skillSize / 2, 'width': skillSize, 'height': skillSize});

    context.font =  Math.floor(skillSize / 3) + 'px sans-serif';
    context.textBaseline = 'middle';
    context.textAlign = 'left';
    var bonus = getMoneySkillBonus() - 1;
    var color = 'green';
    if (selectedSkillType === 'health') {
        bonus -= selectedSkillCost / 100;
        color = 'red'
    } else if (selectedSkillType === 'money') {
        bonus += selectedSkillCost / 100;
        color = '#0F0';
    }
    embossText(context, (bonus >= 0 ? '+' : '') + bonus.percent(), color, 'white', centerX, centerY + skillSpacing * 3);


    bonus = getHealthSkillBonus() - 1;
    color = 'green';
    if (selectedSkillType === 'money') {
        bonus -= selectedSkillCost / 100;
        color = 'red'
    } else if (selectedSkillType === 'health') {
        bonus += selectedSkillCost / 100;
        color = '#0F0';
    }
    drawImage(context, heartSource.image, heartSource, {'left': centerX - skillSpacing, 'top': centerY - skillSpacing * 3 - skillSize / 2, 'width': skillSize, 'height': skillSize});
    embossText(context, (bonus >= 0 ? '+' : '') + bonus.percent(), color, 'white', centerX, centerY - skillSpacing * 3);

    bonus = getAttackSkillBonus() - 1;
    color = 'green';
    if (selectedSkillType === 'defense') {
        bonus -= selectedSkillCost / 100;
        color = 'red'
    } else if (selectedSkillType === 'attack') {
        bonus += selectedSkillCost / 100;
        color = '#0F0';
    }
    drawImage(context, swordSource.image, swordSource, {'left': centerX - 3 * skillSpacing - skillSize / 2, 'top': centerY - skillSpacing, 'width': skillSize, 'height': skillSize});
    context.textBaseline = 'top';
    context.textAlign = 'right';
    embossText(context, (bonus >= 0 ? '+' : '') + bonus.percent(), color, 'white', centerX - skillSpacing * 3 + skillSize / 2, centerY);

    bonus = getDefenseSkillBonus() - 1;
    color = 'green';
    if (selectedSkillType === 'attack') {
        bonus -= selectedSkillCost / 100;
        color = 'red'
    } else if (selectedSkillType === 'defense') {
        bonus += selectedSkillCost / 100;
        color = '#0F0';
    }
    drawImage(context, shieldSource.image, shieldSource, {'left': centerX + 3 * skillSpacing - skillSize / 2, 'top': centerY - skillSpacing, 'width': skillSize, 'height': skillSize});
    context.textAlign = 'left';
    embossText(context, (bonus >= 0 ? '+' : '') + bonus.percent(), color, 'white', centerX + skillSpacing * 3 - skillSize / 2, centerY);


    context.textBaseline = 'middle';
    context.textAlign = 'center';
    context.font = 'bold ' + Math.floor(skillSize / 2) + 'px sans-serif';
    outlineText(context, netPoints, color, 'white', 1, centerX, centerY);
    for (var treeKey in skillTree) {
        for (var skillKey in skillTree[treeKey]) {
            var skill = skillTree[treeKey][skillKey];
            var skillIsAvailable = canLearnSkill(skill);
            var skillIsAffordable = canAffordSkill(skill);
            var target = {'left':centerX + skill.x * skillSpacing - skillSize / 2, 'width': skillSize,
            'top':centerY + skill.y * skillSpacing - skillSize / 2, 'height': skillSize};
            skill.target = target;
            context.save();
            context.fillStyle = (!skill.level && selectedSkill !== skill) ? '#777' : '#aaa';
            if (!skill.level && selectedSkill !== skill && !skillIsAvailable)  context.globalAlpha = .2;
            else context.globalAlpha = .5;
            context.fillRect(target.left, target.top, target.width, target.height - 2);
            context.restore();
            context.save();
            if (!skill.level && selectedSkill !== skill) context.globalAlpha = .3;

            // Icon is drawn transparent if the ability hasn't been learned yet.
            drawImage(context, skill.source.image, skill.source, target);
            if (skill.secondSource) {
                drawImage(context, skill.secondSource.image, skill.secondSource,
                    {'left': target.left + target.width / 2, 'top': target.top + target.height / 2,
                     'width': target.width / 2, 'height': target.height / 2});
            }
            context.restore();

            // Use evenodd to draw the border over the background+icon
            context.fillStyle = (selectedSkill === skill)
                ? ((skillIsAvailable && skillIsAffordable) ?  '#080' : 'red')
                : (skillIsAvailable ? 'white' : '#333');
            context.beginPath();
            context.rect(target.left, target.top, target.width, target.height);
            context.rect(target.left + border, target.top + border, target.width - 2 * border, target.height - 2 * border);
            context.fill('evenodd');

            if (skill.level || selectedSkill === skill) {
                var level = skill.level, color = 'white';
                if (selectedSkill === skill) {
                    level++;
                    color = (skillIsAffordable && skillIsAvailable) ? 'green' : 'red';
                }
                context.textBaseline = 'bottom';
                context.textAlign = 'left';
                context.font = 'bold ' + Math.floor(skillSize / 3) + 'px sans-serif';
                outlineText(context, level, color, 'black', 1, target.left + 2 * border, target.top + target.height - 2);

            }
            context.restore();
        }
    }
    if (selectedSkill) {
        var fontSize = Math.floor(skillSize / 3)
        var currentValue = getSkillValue(selectedSkill, selectedSkill.level);
        var newValue = getSkillValue(selectedSkill, selectedSkill.level + 1);
        var parts, leftDescription, formattedValue, formattedNewValue, rightDescription;
        if (selectedSkill.description.indexOf('%') >= 0) {
            parts = selectedSkill.description.split('%');
            leftDescription = parts[0];
            formattedValue = currentValue.percent(1);
            formattedNewValue = newValue.percent(1);
            rightDescription = parts[1];
        } else {
            parts = selectedSkill.description.split('#');
            leftDescription = parts[0];
            formattedValue = '+' + currentValue;
            formattedNewValue = '+' +newValue;
            rightDescription = parts[1];
        }
        if (leftDescription.length) leftDescription = leftDescription.substring(0, leftDescription.length);
        rightDescription = rightDescription.substring(1);
        context.font = fontSize + 'px sans-serif';
        var width = Math.max(context.measureText(leftDescription).width, context.measureText(rightDescription).width) + 10;
        var skillCenterX = selectedSkill.target.left + selectedSkill.target.width / 2;
        //var left = Math.round(Math.min(canvas.width - 10 - width, Math.max(10, skillCenterX - width / 2)));
        var height = Math.ceil(fontSize * 3.2 + 25);
        if (leftDescription) height += fontSize + 5;
        var top = 10;
        var left = 10;
        var titleHeight = 10 + fontSize;
        //var top = (selectedSkill.target.top < centerY) ? canvas.height - iconSize - 10 - height : 10;
        //var top = Math.floor(selectedSkill.target.top - 10 - height);
        //if (top < 10) top = selectedSkill.target.top + selectedSkill.target.height + 10;

        // Box
        context.fillStyle = '#EEE';
        context.fillRect(left - 2, top - 2, width + 4, height + 4);
        context.fillStyle = '#666';
        context.fillRect(left, top + titleHeight, width, height - titleHeight);

        var descriptionCenterX = left + width / 2;
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
        if (selectedSkill.level === 0) {
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

Number.prototype.percent = function (digits) {
    return parseFloat((100 * this).toFixed(digits)) + '%';
}
var selectedSkill = null;
function handleSkillsClick(x, y) {
    if (handleSkillButtonClick(x, y)) return;
    if (selectedSkill && canLearnSkill(selectedSkill) && canAffordSkill(selectedSkill) && isPointInRectObject(x, y, upgradeSkillButton.target)) {
        usedSkillPoints += getSkillCost(selectedSkill);
        treeBonuses[selectedSkill.treeKey] += getSkillCost(selectedSkill);
        selectedSkill.level++;
        selectedSkill = null;
        updatePlayerStats();
    }
    for (var treeKey in skillTree) {
        for (var skillKey in skillTree[treeKey]) {
            var skill = skillTree[treeKey][skillKey];
            if (isPointInRectObject(x, y, skill.target)) {
                if (selectedSkill !== skill) selectedSkill = skill;
                else selectedSkill = null;
            }
        }
    }
}

var collectSkillButton = {'target': {}};
function drawSkillButton() {
    context.textBaseline = 'middle';
    context.textAlign = 'center';
    context.font = 'bold ' + Math.floor(iconSize * 1.25) + 'px sans-serif';

    var target = collectSkillButton.target;
    target.width = iconSize;
    target.height = iconSize;
    target.left = canvas.width - 10 - target.width;
    target.top = canvas.height - 10 - target.height;
    // console.log([target.left, target.width, iconSize]);

    if (isSkillButtonVisible()) {
        var points = getAvailableSkillPoints();
        /*context.save();
        context.globalAlpha = .5;
        context.fillStyle = '#AAA';
        context.fillRect(target.left, target.top, target.width, target.height);
        context.restore();*/
        context.fillStyle = 'white';
        var padding = Math.floor(target.width / 10);
        var size = Math.floor(target.width / 4);
        context.fillRect(target.left + padding, target.top + Math.floor((target.height - size)/ 2), target.width - 2 * padding, size);
        context.fillRect(target.left + Math.floor((target.width - size)/ 2), target.top + padding, size, target.height - 2 * padding);
        context.fillStyle = points ? 'red' : '#888';
        context.fillRect(target.left + padding + 2, target.top + Math.floor((target.height- size)/ 2) + 2, target.width - padding * 2 - 4, size - 4);
        context.fillRect(target.left + Math.floor((target.width - size) / 2) + 2, target.top + padding + 2, size - 4, target.height - 2 * padding - 4);
        //outlineText(context, (currentScene === 'skills') ? 'x' : '+', points ? 'red' : '#AAA', 'white', 2, target.left + target.width / 2 - 1, target.top + target.height / 2 - 1);
        if (points) {
            context.textBaseline = 'bottom';
            context.textAlign = 'right';
            context.font = 'bold ' + Math.floor(iconSize / 4) + 'px sans-serif';
            outlineText(context, points, 'red', 'white', 1, target.left + target.width - 2, target.top + target.height);
        }
    }
}

var upgradeSkillButton = {'target': {}};
function drawUpgradeSkillButton(text, arrowColor, textColor) {
    context.save();
    context.textBaseline = 'middle';
    context.textAlign = 'left';
    context.font = Math.floor(3 * iconSize / 4) + 'px sans-serif';
    var metrics = context.measureText(text);
    var target = upgradeSkillButton.target;
    target.width = iconSize + metrics.width;
    target.left = Math.floor((canvas.width - target.width) / 2);
    target.top = canvas.height - 10 - iconSize;
    target.height = iconSize;

    drawSolidTintedImage(context, upArrows.image, arrowColor, upArrows, {'left': target.left, 'top': target.top, 'width': iconSize, 'height': iconSize});
    embossText(context, text, textColor, 'black', target.left + iconSize, canvas.height - 10 - iconSize / 2);

    context.restore();
}