
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
var sandSource = {'image': requireImage('gfx/sand.png'), 'top': 0, 'left': 0, 'width': 64, 'height': 64};
// Modified from http://maxpixel.freegreatpicture.com/Seamless-Sand-Background-Texture-1657465
var shallowSource = {'image': requireImage('gfx/shallow.png'), 'top': 0, 'left': 0, 'width': 64, 'height': 64};

// http://opengameart.org/content/treasure-chests
var chestSource = {'image': requireImage('gfx/chest-open.png'), 'left': 0, 'top': 0, 'width': 32, 'height': 32};

// Icons by Hillary originally created for Treasure Tycoon
var coinImage = requireImage('gfx/moneyIcon.png');

// From open source game prototyping images: http://www.lostgarden.com/2007/05/dancs-miraculously-flexible-game.html
var heartSource = {'image': requireImage('gfx/heart.png'), 'top': 0, 'left': 0, 'width': 50, 'height': 50};

// Icons from http://opengameart.org/content/496-pixel-art-icons-for-medievalfantasy-rpg
var swordSource = {'image': requireImage('gfx/sword.png'), 'top': 0, 'left': 0, 'width': 34, 'height': 34};
var shieldSource = {'image': requireImage('gfx/shield.png'), 'top': 0, 'left': 0, 'width': 34, 'height': 34};
var shoeSource = {'image': requireImage('gfx/shoe.png'), 'top': 0, 'left': 0, 'width': 34, 'height': 34};

// Icon by Chris Brewer originally created for Treasure Tycoon
var upArrows = {'image': requireImage('gfx/upArrows.png'), 'left': 0, 'top': 0, 'width': 32, 'height': 32};

// Image by Noah originally created for Lazy RPG
var turtleSource = {'image': requireImage('gfx/noahTurtle.png'), 'left': 0, 'top': 0, 'width': 128, 'height': 128};


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
