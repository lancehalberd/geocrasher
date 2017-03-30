
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
                saveGame();
            }
            break;
        }
    }
}
function drawTitleScene() {
    var backgroundScale = Math.max(canvas.width / titleBackground.width, canvas.height / titleBackground.height);
    var targetWidth = Math.ceil(titleBackground.width * backgroundScale);
    var targetHeight = Math.ceil(titleBackground.height * backgroundScale);
    drawImage(context, titleBackground,
        {'left': 0, 'top': 0, 'width': titleBackground.width, 'height': titleBackground.height},
        {'left': (canvas.width - targetWidth) / 2, 'top': (canvas.height - targetHeight) / 2, 'width': targetWidth, 'height': targetHeight}
    );
    context.fillStyle = 'gold';
    var titleFontSize = Math.floor(canvas.width / 10);
    context.font = titleFontSize + 'px sans-serif';
    context.textAlign = 'center'
    context.textBaseline = 'top';
    context.fillText('GeoCrasher', canvas.width / 2, 10);
    var narrow = canvas.height > canvas.width;
    var buttonWidth = Math.ceil(narrow ? canvas.width / 2 : canvas.width / 5);
    var buttonHeight = Math.ceil( buttonWidth / 2);
    var buttonLeft = Math.floor((canvas.width - buttonWidth) / 2);
    var padding = 10;
    var top = titleFontSize + 20 + Math.max(0, ((canvas.height - titleFontSize - 20) - buttonHeight * 3 - padding * 2) / 2);
    var largeFontSize = Math.floor(buttonWidth / 6)
    var largeFont = largeFontSize + 'px sans-serif';
    var smallFont = Math.floor(buttonWidth / 8) + 'px sans-serif';
    var border = 4;
    var saveColors = ['red', 'green', 'blue'];
    var saveLabels = ['A', 'B', 'C'];
    for (var saveSlot of saveSlots) {
        saveSlot.target = {'left': buttonLeft, 'top': top, 'width': buttonWidth, 'height': buttonHeight};
        context.fillStyle = 'black';
        context.fillRect(saveSlot.target.left, saveSlot.target.top, saveSlot.target.width, saveSlot.target.height);
        context.fillStyle = 'white';
        context.fillRect(saveSlot.target.left + border, saveSlot.target.top + border, saveSlot.target.width - 2 * border, saveSlot.target.height - 2 * border);
        context.fillStyle = saveColors.shift();
        context.font = largeFont;
        context.textAlign = 'center';
        context.textBaseline = 'top';
        context.fillText('Save ' + saveLabels.shift(), Math.floor(saveSlot.target.left + saveSlot.target.width / 2), saveSlot.target.top + 2 * border);
        context.font = smallFont;
        context.fillStyle = 'gold';
        context.fillText(fixNumber(saveSlot.coins).abbreviate() + ' Coins', Math.floor(saveSlot.target.left + saveSlot.target.width / 2), saveSlot.target.top + largeFontSize + 4 * border);


        saveSlot.deleteTarget = {'left': buttonLeft + buttonWidth + 20, 'top': top + buttonHeight / 4, 'width': buttonHeight / 2, 'height': buttonHeight / 2};
        context.fillStyle = 'red';
        context.fillRect(saveSlot.deleteTarget.left, saveSlot.deleteTarget.top, saveSlot.deleteTarget.width, saveSlot.deleteTarget.height);
        context.fillStyle = 'white';
        context.fillRect(saveSlot.deleteTarget.left + border, saveSlot.deleteTarget.top + border, saveSlot.deleteTarget.width - 2 * border, saveSlot.deleteTarget.height - 2 * border);
        context.beginPath();
        context.strokeStyle = 'red';
        context.lineWidth = border;
        context.moveTo(saveSlot.deleteTarget.left, saveSlot.deleteTarget.top);
        context.lineTo(saveSlot.deleteTarget.left + saveSlot.deleteTarget.width, saveSlot.deleteTarget.top + saveSlot.deleteTarget.height);
        context.moveTo(saveSlot.deleteTarget.left + saveSlot.deleteTarget.width, saveSlot.deleteTarget.top);
        context.lineTo(saveSlot.deleteTarget.left, saveSlot.deleteTarget.top + saveSlot.deleteTarget.height);
        context.stroke();

        top += buttonHeight + padding;
    }
}