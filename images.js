
var assetVersion = ifdefor(assetVersion, '0.3');
var images = {};
function loadImage(source, callback) {
    images[source] = new Image();
    images[source].onload = function () {
        callback();
    };
    images[source].src = source + '?v=' + assetVersion;
    return images[source];
}

var numberOfImagesLeftToLoad = 0;
var imagesLoading = {};
function requireImage(imageFile) {
    if (images[imageFile]) return images[imageFile];
    imagesLoading[imageFile] = true;
    numberOfImagesLeftToLoad++;
    return loadImage(imageFile, function () {
        numberOfImagesLeftToLoad--;
        delete imagesLoading[imageFile];
    });
}
var initialImagesToLoad = [];
// Modified from http://maxpixel.freegreatpicture.com/Seamless-Sand-Background-Texture-1657465
var shallowSource = {'image': requireImage('gfx/map/shallow.png'), 'top': 0, 'left': 0, 'width': 64, 'height': 64};

// Modified from http://maxpixel.freegreatpicture.com/Seamless-Sand-Background-Texture-1657465
var sandSource = {'image': requireImage('gfx/map/sand.png'), 'top': 0, 'left': 0, 'width': 64, 'height': 64};

// Modified from https://pixabay.com/en/seamless-tileable-texture-ground-1807373/
var dirtSource = {'image': requireImage('gfx/map/dirt2.png'), 'top': 0, 'left': 0, 'width': 72, 'height': 72};

// Modified from https://pixabay.com/en/retro-flower-pattern-design-batik-1422325/
var grassSource = {'image': requireImage('gfx/map/grass.png'), 'top': 0, 'left': 0, 'width': 72, 'height': 72};
var forestSource = {'image': requireImage('gfx/map/forest.png'), 'top': 0, 'left': 0, 'width': 72, 'height': 72};

// Modified from http://maxpixel.freegreatpicture.com/Background-Texture-Seamless-Stone-Rocks-1657467
var hillSource = {'image': requireImage('gfx/map/hill.png'), 'top': 0, 'left': 0, 'width': 64, 'height': 64};
var mountainSource = {'image': requireImage('gfx/map/mountain.png'), 'top': 0, 'left': 0, 'width': 64, 'height': 64};
var peakSource = {'image': requireImage('gfx/map/peak.png'), 'top': 0, 'left': 0, 'width': 64, 'height': 64};
var oceanImage = requireImage('gfx/map/ocean.png');
var oceanSource = {'image': oceanImage, 'top': 0, 'left': 0, 'width': 64, 'height': 64};

// Modified from https://pixabay.com/en/seamless-texture-texture-ice-cold-219909/
var iceSource = {'image': requireImage('gfx/map/ice.png'), 'top': 0, 'left': 0, 'width': 64, 'height': 64};

// Might use this for a new round of tiles: http://alucus.deviantart.com/art/Pallet-town-tiles-157214973


// http://opengameart.org/content/treasure-chests
var chestSource = {'image': requireImage('gfx/chest-open.png'), 'left': 0, 'top': 0, 'width': 32, 'height': 32};

// Icons by Hillary originally created for Treasure Tycoon
var coinImage = requireImage('gfx/loot/moneyIcon.png');
var moneySource = {'image': coinImage, 'left': 64, 'top': 64, 'width': 24, 'height': 24};
// Original images by Hillary created for Geo Crasher
var personSource = {'image': requireImage('gfx/person.png'), 'left': 0, 'top': 0, 'width': 48, 'height': 48};
var outlinedMoneyImage = createCanvas(moneySource.width + 2, moneySource.height + 2);
var outlinedMoneySource = {'image': outlinedMoneyImage, 'left': 0, 'top': 0, 'width': 26, 'height': 26};

function createOutlinedMoneyImage() {
    var context = outlinedMoneyImage.getContext('2d')
    context.globalAlpha = .7;
    drawOutlinedImage(context, moneySource.image, 'white', 1, moneySource, {'left': 1, 'top': 1, 'width': moneySource.width, 'height': moneySource.height});
}

// From open source game prototyping images: http://www.lostgarden.com/2007/05/dancs-miraculously-flexible-game.html
var heartSource = {'image': requireImage('gfx/loot/heart.png'), 'top': 0, 'left': 0, 'width': 50, 'height': 50};
var bugSource = {'image': requireImage('gfx/monsters/bug.png'), 'left': 0, 'top': 0, 'width': 100, 'height': 100};
var orangeGemSource = {'image': requireImage('gfx/loot/orangeGem.png'), 'left': 0, 'top': 0, 'width': 50, 'height': 55};
var greenGemSource = {'image': requireImage('gfx/loot/greenGem.png'), 'left': 0, 'top': 0, 'width': 50, 'height': 55};
var blueGemSource = {'image': requireImage('gfx/loot/blueGem.png'), 'left': 0, 'top': 0, 'width': 50, 'height': 55};

// Icons from http://opengameart.org/content/496-pixel-art-icons-for-medievalfantasy-rpg
var swordSource = {'image': requireImage('gfx/loot/sword.png'), 'top': 0, 'left': 0, 'width': 34, 'height': 34};
var shieldSource = {'image': requireImage('gfx/loot/shield.png'), 'top': 0, 'left': 0, 'width': 34, 'height': 34};
var shoeSource = {'image': requireImage('gfx/shoe.png'), 'top': 0, 'left': 0, 'width': 34, 'height': 34};

// Icon by Chris Brewer originally created for Treasure Tycoon
var upArrows = {'image': requireImage('gfx/upArrows.png'), 'left': 0, 'top': 0, 'width': 32, 'height': 32};

// Trash icon from: https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Trash_font_awesome.svg/480px-Trash_font_awesome.svg.png
var trashSource = {'image': requireImage('gfx/trash.png'), 'left': 0, 'top': 0, 'width': 480, 'height': 480};

// Image by Noah originally created for Lazy RPG
var turtleSource = {'image': requireImage('gfx/monsters/turtle.png'), 'left': 0, 'top': 0, 'width': 128, 'height': 128};


// Requires Attribution (http://creativecommons.org/licenses/by/3.0/)
// http://opengameart.org/content/monsterboy-in-wonder-world-mockup-assets
var waspSource = {'image': requireImage('gfx/monsters/wasp.png'), 'left': 0, 'top': 0, 'width': 32, 'height': 32};
var fungusSource = {'image': requireImage('gfx/monsters/fungus.png'), 'left': 0, 'top': 0, 'width': 32, 'height': 32};
var crabSource = {'image': requireImage('gfx/monsters/crab.png'), 'left': 0, 'top': 0, 'width': 32, 'height': 32};
var snailSource = {'image': requireImage('gfx/monsters/snail.png'), 'left': 0, 'top': 0, 'width': 32, 'height': 32};


for (var initialImageToLoad of initialImagesToLoad) {
    requireImage(initialImageToLoad);
}

function drawImage(context, image, source, target) {
    context.save();
    context.translate(target.left + target.width / 2, target.top + target.height / 2);
    if (target.xScale || target.yScale) {
        context.scale(ifdefor(target.xScale, 1), ifdefor(target.yScale, 1));
    }
    context.drawImage(image, source.left, source.top, source.width, source.height, -target.width / 2, -target.height / 2, target.width, target.height);
    context.restore();
}

function drawSolidTintedImage(context, image, tint, source, target) {
    // First make a solid color in the shape of the image to tint.
    globalTintContext.save();
    globalTintContext.fillStyle = tint;
    globalTintContext.clearRect(0, 0, source.width, source.height);
    var tintRectangle = {'left': 0, 'top': 0, 'width': source.width, 'height': source.height};
    drawImage(globalTintContext, image, source, tintRectangle)
    globalTintContext.globalCompositeOperation = "source-in";
    globalTintContext.fillRect(0, 0, source.width, source.height);
    drawImage(context, globalTintCanvas, tintRectangle, target);
    globalTintContext.restore();
}

function makeTintedImage(image, tint) {
    var tintCanvas = createCanvas(image.width, image.height);
    var tintContext = tintCanvas.getContext('2d');
    tintContext.clearRect(0, 0, image.width, image.height);
    tintContext.fillStyle = tint;
    tintContext.fillRect(0,0, image.width, image.height);
    tintContext.globalCompositeOperation = "destination-atop";
    tintContext.drawImage(image, 0, 0, image.width, image.height, 0, 0, image.width, image.height);
    var resultCanvas = createCanvas(image.width, image.height);
    var resultContext = resultCanvas.getContext('2d');
    resultContext.drawImage(image, 0, 0, image.width, image.height, 0, 0, image.width, image.height);
    resultContext.globalAlpha = 0.3;
    resultContext.drawImage(tintCanvas, 0, 0, image.width, image.height, 0, 0, image.width, image.height);
    resultContext.globalAlpha = 1;
    return resultCanvas;
}
var globalTintCanvas = createCanvas(150, 300);
var globalTintContext = globalTintCanvas.getContext('2d');
globalTintContext.imageSmoothingEnabled = false;
function drawTintedImage(context, image, tint, amount, source, target) {
    context.save();
    // First make a solid color in the shape of the image to tint.
    globalTintContext.save();
    globalTintContext.fillStyle = tint;
    globalTintContext.clearRect(0, 0, source.width, source.height);
    globalTintContext.drawImage(image, source.left, source.top, source.width, source.height, 0, 0, source.width, source.height);
    globalTintContext.globalCompositeOperation = "source-in";
    globalTintContext.fillRect(0, 0, source.width, source.height);
    globalTintContext.restore();
    // Next draw the untinted image to the target.
    context.drawImage(image, source.left, source.top, source.width, source.height, target.left, target.top, target.width, target.height);
    // Finally draw the tint color on top of the target with the desired opacity.
    context.globalAlpha *= amount; // This needs to be multiplicative since we might be drawing a partially transparent image already.
    context.drawImage(globalTintCanvas, 0, 0, source.width, source.height, target.left, target.top, target.width, target.height);
    context.restore();
}
var globalCompositeCanvas = createCanvas(150, 150);
var globalCompositeContext = globalCompositeCanvas.getContext('2d');
function prepareTintedImage() {
    globalCompositeContext.clearRect(0, 0, globalCompositeCanvas.width, globalCompositeCanvas.height);
}
function getTintedImage(image, tint, amount, sourceRectangle) {
    drawTintedImage(globalCompositeContext, image, tint, amount, sourceRectangle, {'left': 0, 'top': 0, 'width': sourceRectangle.width, 'height': sourceRectangle.height});
    return globalCompositeCanvas;
}

function drawSourceWithOutline(context, source, color, thickness, target) {
    if (source.drawWithOutline) {
        source.drawWithOutline(context, color, thickness, target);
        return;
    }
    context.save();
    var smallTarget = $.extend({}, target);
    for (var dy = -1; dy < 2; dy++) {
        for (var dx = -1; dx < 2; dx++) {
            if (dy == 0 && dx == 0) continue;
            smallTarget.left = target.left + dx * thickness;
            smallTarget.top = target.top + dy * thickness;
            drawSourceAsSolidTint(context, source, color, smallTarget);
        }
    }
    source.draw(context, target);
}
function drawSourceAsSolidTint(context, source, tint, target) {
    // First make a solid color in the shape of the image to tint.
    globalTintContext.save();
    globalTintContext.fillStyle = tint;
    globalTintContext.clearRect(0, 0, source.width, source.height);
    var tintRectangle = {'left': 0, 'top': 0, 'width': source.width, 'height': source.height};
    source.draw(globalTintContext, tintRectangle);
    globalTintContext.globalCompositeOperation = "source-in";
    globalTintContext.fillRect(0, 0, source.width, source.height);
    drawImage(context, globalTintCanvas, tintRectangle, target);
    globalTintContext.restore();
}
function drawOutlinedImage(context, image, color, thickness, source, target) {
    context.save();
    var smallTarget = $.extend({}, target);
    for (var dy = -1; dy < 2; dy++) {
        for (var dx = -1; dx < 2; dx++) {
            if (dy == 0 && dx == 0) continue;
            smallTarget.left = target.left + dx * thickness;
            smallTarget.top = target.top + dy * thickness;
            drawSolidTintedImage(context, image, color, source, smallTarget);
        }
    }
    drawImage(context, image, source, target);
}
function logPixel(context, x, y) {
    var imgd = context.getImageData(x, y, 1, 1);
    console.log(imgd.data)
}
function setupSource(source) {
    source.width = ifdefor(source.width, 48);
    source.height = ifdefor(source.height, 64);
    source.actualHeight = ifdefor(source.actualHeight, source.height);
    source.actualWidth = ifdefor(source.actualWidth, source.width);
    source.xOffset = ifdefor(source.xOffset, 0);
    source.yOffset = ifdefor(source.yOffset, 0);
    source.xCenter = ifdefor(source.xCenter, source.actualWidth / 2 + source.xOffset);
    source.yCenter = ifdefor(source.yCenter, source.actualHeight / 2 + source.yOffset);
    return source;
}

function drawBar(context, x, y, width, height, background, color, percent) {
    percent = Math.max(0, Math.min(1, percent));
    if (background) {
        context.fillStyle = background;
        context.fillRect(x, y, width, height);
    }
    context.fillStyle = color;
    context.fillRect(x + 1, y + 1, Math.floor((width - 2) * percent), height - 2);
}
