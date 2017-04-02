
var titleBackground = requireImage('gfx/beach.jpg');
var titleButtons = [];

function handleTitleClick(x, y) {
    for (var saveIndex = 0; saveIndex < saveSlots.length; saveIndex++) {
        var saveSlot = saveSlots[saveIndex];
        if (isPointInRectObject(x, y, saveSlot.target)) {
            loadSaveSlot(saveIndex);
            break;
        }
        if (isPointInRectObject(x, y, saveSlot.deleteTarget)) {
            if (confirm('Are you sure you want to delete this save data? This cannot be undone.')) {
                saveSlotIndex = saveIndex;
                saveSlots[saveIndex] = newGameData();
                $.jStorage.set("geoGrasherSaves", saveSlots);
            }
            break;
        }
    }
}
function drawTitleScene() {
    var narrow = canvas.height > canvas.width;
    var backgroundScale = Math.max(canvas.width / titleBackground.width, canvas.height / titleBackground.height);
    var targetWidth = Math.ceil(titleBackground.width * backgroundScale);
    var targetHeight = Math.ceil(titleBackground.height * backgroundScale);
    drawImage(context, titleBackground,
        {'left': 0, 'top': 0, 'width': titleBackground.width, 'height': titleBackground.height},
        {'left': (canvas.width - targetWidth) / 2, 'top': (canvas.height - targetHeight) / 2, 'width': targetWidth, 'height': targetHeight}
    );
    context.fillStyle = 'gold';
    var titleFontSize = Math.min(200, Math.floor(canvas.height / 4), Math.floor(canvas.width / 5));
    context.font = 'bold ' + titleFontSize + 'px sans-serif';
    context.textAlign = 'center'
    context.textBaseline = 'top';
    outlineText(context, 'Geo', 'brown', 'white', 3, canvas.width / 2, 10);
    outlineText(context, 'Crasher', 'gold', 'white', 3, canvas.width / 2, titleFontSize);
    var mainButtonWidth = Math.ceil(narrow ? Math.min(300, canvas.width / 2) : canvas.width / 5);
    var buttonHeight = Math.ceil( mainButtonWidth / 2);
    var deleteButtonWidth = Math.floor(buttonHeight / 3);
    mainButtonWidth = Math.round(mainButtonWidth * 5 / 4);
    var totalButtonWidth = mainButtonWidth + deleteButtonWidth;
    var padding = 10;
    var top, left;
    if (narrow) {
        top = 2 * titleFontSize + Math.max(0, ((canvas.height - 2 * titleFontSize) - buttonHeight * 3 - padding * 2) / 2);
        left = Math.floor((canvas.width - totalButtonWidth) / 2);
    } else {
        top = 2 * titleFontSize + Math.max(0, ((canvas.height - 2 * titleFontSize) - buttonHeight) / 2);
        left = Math.floor((canvas.width - totalButtonWidth * 3 - 2 *padding) / 2);
    }
    var border = 4;
    var statsPadding = 4;
    var localIconSize = Math.round((buttonHeight - 4 * statsPadding - 2 * border) / 3);
    var largeFontSize = Math.floor(mainButtonWidth / 6)
    var largeFont = largeFontSize + 'px sans-serif';
    var smallFontSize = Math.floor(localIconSize * .9);
    var smallFont = smallFontSize + 'px sans-serif';
    var saveColors = ['red', 'green', 'blue'];
    var saveLabels = ['A', 'B', 'C'];
    for (var saveSlot of saveSlots) {
        // Slot
        var slotLabelWidth = Math.round(buttonHeight / 4);
        saveSlot.target = {'left': left, 'top': top, 'width': mainButtonWidth, 'height': buttonHeight};
        context.fillStyle = 'black';
        context.fillRect(saveSlot.target.left, saveSlot.target.top, saveSlot.target.width, saveSlot.target.height);
        context.fillStyle = 'white';
        context.fillRect(saveSlot.target.left + border, saveSlot.target.top + border, saveSlot.target.width - 2 * border, saveSlot.target.height - 2 * border);
        context.fillStyle = saveColors.shift();
        context.fillRect(saveSlot.target.left + border, saveSlot.target.top + border, slotLabelWidth, saveSlot.target.height - 2 * border);
        context.font = Math.floor(buttonHeight / 4) + 'px sans-serif';
        context.fillStyle = 'white';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(saveLabels.shift(), saveSlot.target.left + border + Math.round(slotLabelWidth / 2), saveSlot.target.top + Math.round(buttonHeight / 2));
        var statsTop = top + border + statsPadding;
        var statsLeft = saveSlot.target.left + border + statsPadding + slotLabelWidth;
        var statsWidth = saveSlot.target.width - slotLabelWidth;
        context.font = smallFont;
        context.textAlign = 'left';
        context.textBaseline = 'middle';
        context.fillStyle = 'black';
        var defaults = newGameData();
        var level = fixNumber(saveSlot.level, defaults.level).abbreviate();
        var levelBonus = getLevelBonus(level);
        // Level
        var levelText = 'Lv ' + level;
        context.fillText(levelText, statsLeft + statsPadding, statsTop + Math.round(localIconSize / 2));
        // Health
        var middleLeft = statsLeft + Math.ceil(statsWidth / 2);
        drawImage(context, heartSource.image, heartSource, {'left': middleLeft, 'top': statsTop, 'width': localIconSize, 'height': localIconSize});
        context.fillStyle = 'red';
        context.fillText(Math.round(fixNumber(saveSlot.healthBonus, defaults.healthBonus) * levelBonus), middleLeft + localIconSize, statsTop + Math.round(localIconSize / 2));
        statsTop += localIconSize + statsPadding;

        context.fillStyle = 'black';
        // Attack
        drawImage(context, swordSource.image, swordSource, {'left': statsLeft, 'top': statsTop, 'width': localIconSize, 'height': localIconSize});
        context.fillText(Math.round(fixNumber(saveSlot.attackBonus, defaults.attackBonus) * levelBonus), statsLeft + localIconSize, statsTop + Math.round(localIconSize / 2));
        // Defense
        drawImage(context, shieldSource.image, shieldSource, {'left': middleLeft, 'top': statsTop, 'width': localIconSize, 'height': localIconSize});
        context.fillText(Math.round(fixNumber(saveSlot.defenseBonus, defaults.defenseBonus) * levelBonus), middleLeft + localIconSize, statsTop + Math.round(localIconSize / 2) );
        statsTop += localIconSize + statsPadding;

        // Coins
        context.fillStyle = 'gold';
        var coinsText = fixNumber(saveSlot.coins).abbreviate();
        var totalCoinsWidth = localIconSize + context.measureText(coinsText).width;
        var coinsLeft = statsLeft + Math.ceil(statsWidth / 4); //Math.floor(statsLeft + (statsWidth - totalCoinsWidth) / 2);
        drawImage(context, outlinedMoneySource.image, outlinedMoneySource, {'left': coinsLeft, 'top': statsTop, 'width': localIconSize, 'height': localIconSize});
        context.fillText(coinsText, coinsLeft + localIconSize, statsTop + Math.round(localIconSize / 2));

        // Trash
        saveSlot.deleteTarget = {'left': left + mainButtonWidth, 'top': top, 'width': deleteButtonWidth, 'height': buttonHeight};
        context.fillStyle = 'black';
        context.fillRect(saveSlot.deleteTarget.left, saveSlot.deleteTarget.top, saveSlot.deleteTarget.width, saveSlot.deleteTarget.height);
        context.fillStyle = '#AAA';
        context.fillRect(saveSlot.deleteTarget.left, saveSlot.deleteTarget.top + border, saveSlot.deleteTarget.width - border, saveSlot.deleteTarget.height - 2 * border);
        var trashSize = saveSlot.deleteTarget.width;
        var trashTarget = {'left': left + mainButtonWidth - Math.round(border / 2), 'top': top + (buttonHeight - trashSize) / 2, 'width': trashSize, 'height': trashSize};
        drawImage(context, trashSource.image, trashSource, trashTarget);

        if (narrow) {
            top += buttonHeight + padding;
        } else {
            left += totalButtonWidth + padding;
        }
    }
}

function outlineText(context, text, textColor, borderColor, thickness, left, top) {
    context.fillStyle = borderColor;
    for (var dy = -1; dy <=1; dy++)
        for (var dx = -1; dx <=1; dx++)
            if (dx != 0 || dy !=0) context.fillText(text, left + dx * thickness, top + dy * thickness);
    context.fillStyle = textColor;
    context.fillText(text, left, top);
}