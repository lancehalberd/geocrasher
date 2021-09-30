import { createCanvasAndContext, debugCanvas } from 'app/dom';
import { createAnimation, drawOutlinedImage } from 'app/draw';

import { Frame, Rectangle } from 'app/types';

const assetVersion = '1';
const images: {[key: string]: HTMLImageElement} = {};
function loadImage(source: string, callback: () => void): HTMLImageElement {
    images[source] = new Image();
    images[source].onload = () => callback();
    images[source].src = source + '?v=' + assetVersion;
    return images[source];
}

let numberOfImagesLeftToLoad = 0;
export function requireImage(imageFile: string, callback?: (image: HTMLImageElement) => void): HTMLImageElement {
    if (images[imageFile]) {
        // Make sure this callback runs after the return value gets set.
        setTimeout(() => callback?.(images[imageFile]), 1);
        return images[imageFile];
    }
    numberOfImagesLeftToLoad++;
    return loadImage(imageFile, () => {
        numberOfImagesLeftToLoad--;
        callback?.(images[imageFile]);
    });
}
export function requireFrame(imageFile: string, {x, y, w, h}: Rectangle, callback?: (image: HTMLImageElement) => void): Frame {
    const image = requireImage(imageFile, callback);
    return { image, x, y, w, h };
}
export function finishedLoadingImages(): boolean {
    console.log(numberOfImagesLeftToLoad);
    return numberOfImagesLeftToLoad === 0;
}
// Modified from http://maxpixel.freegreatpicture.com/Seamless-Sand-Background-Texture-1657465
// const shallowSource = {image: requireImage('gfx/map/shallow.png'), x: 0, y: 0, w: 64, h: 64};
// Modified from http://maxpixel.freegreatpicture.com/Background-Texture-Seamless-Stone-Rocks-1657467
// Modified from http://maxpixel.freegreatpicture.com/Seamless-Sand-Background-Texture-1657465
// const sandSource = {image: requireImage('gfx/map/sand.png'), y: 0, y: 0, w: 64, h: 64};
// Modified from https://pixabay.com/en/seamless-tileable-texture-ground-1807373/
// const dirtSource = {image: requireImage('gfx/map/dirt2.png'), y: 0, y: 0, w: 72, h: 72};
// Modified from https://pixabay.com/en/retro-flower-pattern-design-batik-1422325/
//const grassSource = {image: requireImage('gfx/map/grass.png'), y: 0, y: 0, w: 72, h: 72};
//const forestSource = {image: requireImage('gfx/map/forest.png'),y: 0, y: 0, w: 72, h: 72};
// Modified from https://pixabay.com/en/seamless-texture-texture-ice-cold-219909/
//export const iceSource = {image: requireImage('gfx/map/ice.png'), x: 0, y: 0, w: 64, h: 64};


// Think this is FF1 ocean, will need to replace this at some point.
export const oceanImage = requireImage('gfx/map/landscapeTiles.png');
export const oceanSource: Frame = {image: oceanImage, x: 1, y: 1, w: 16, h: 16};

export const shallowSource: Frame = {image: requireImage('gfx/map/landscapeTiles.png'), y: 35, x: 18, w: 16, h: 16};
export const sandSource: Frame = {image: requireImage('gfx/map/landscapeTiles.png'), y: 86, x: 18, w: 16, h: 16};
export const dirtSource: Frame = {image: requireImage('gfx/map/landscapeTiles.png'), y: 137, x: 18, w: 16, h: 16};
export const grassSource: Frame = {image: requireImage('gfx/map/landscapeTiles.png'), y: 188, x: 18, w: 16, h: 16};
export const forestSource: Frame = {image: requireImage('gfx/map/landscapeTiles.png'), y: 239, x: 18, w: 16, h: 16};
export const hillSource: Frame = {image: requireImage('gfx/map/landscapeTiles.png'), y: 290, x: 18, w: 16, h: 16};
export const mountainSource: Frame = {image: requireImage('gfx/map/landscapeTiles.png'), y: 341, x: 18, w: 16, h: 16};
export const iceSource: Frame = {image: requireImage('gfx/map/landscapeTiles.png'), y: 392, x: 18, w: 64, h: 64};


// Might use this for a new round of tiles: http://alucus.deviantart.com/art/Pallet-town-tiles-157214973


// http://opengameart.org/content/treasure-chests
export const chestSource: Frame = {image: requireImage('gfx/chest-open.png'), x: 0, y: 0, w: 32, h: 32};

// Icons by Hillary originally created for Treasure Tycoon
export const coinImage = requireImage('gfx/loot/moneyIcon.png', () => {
    outlinedMoneyContext.globalAlpha = 0.7;
    drawOutlinedImage(outlinedMoneyContext, 'white', 1, moneySource, {...moneySource, x: 1, y: 1});
});
export const moneySource: Frame = {image: coinImage, x: 64, y: 64, w: 24, h: 24};
// Original images by Hillary created for Geo Crasher
export const personSource: Frame = requireFrame('gfx/person.png', {x: 0, y: 0, w: 144, h: 192}, () => {
    drawOutlinedImage(outlinedPersonContext, 'white', 1, personSource, {x: 0, y: 0, w: 144, h: 192});
    debugCanvas(outlinedPersonImage);
});
// The person image has enough room between cells for the outline, except at the bottom of the image.
export const [outlinedPersonImage, outlinedPersonContext] = createCanvasAndContext(144, 194);
export const [outlinedMoneyImage, outlinedMoneyContext] = createCanvasAndContext(moneySource.w + 2, moneySource.h + 2);
export const outlinedMoneySource: Frame = {image: outlinedMoneyImage, x: 0, y: 0, w: 26, h: 26};

export const avatarDimensions = {w: 48, h: 49};
export const walkFrames = [0, 1, 0, 2];
export const avatarAnimations = {
    up: createAnimation(outlinedPersonImage, avatarDimensions, {x: 0, y: 2, top: 1, cols: 3, frameMap: walkFrames}),
    down: createAnimation(outlinedPersonImage, avatarDimensions, {x: 0, y: 0, top: 1, cols: 3, frameMap: walkFrames}),
    left: createAnimation(outlinedPersonImage, avatarDimensions, {x: 0, y: 1, top: 1, cols: 3, frameMap: walkFrames}),
    right: createAnimation(outlinedPersonImage, avatarDimensions, {x: 0, y: 3, top: 1, cols: 3, frameMap: walkFrames}),
};

// From open source game prototyping images: http://www.lostgarden.com/2007/05/dancs-miraculously-flexible-game.html
export const heartSource: Frame = {image: requireImage('gfx/loot/heart.png'), x: 0, y: 0, w: 50, h: 50};
export const bugSource: Frame = {image: requireImage('gfx/monsters/bug.png'), x: 0, y: 0, w: 100, h: 100};
export const orangeGemSource: Frame = {image: requireImage('gfx/loot/orangeGem.png'), x: 0, y: 0, w: 50, h: 55};
export const greenGemSource: Frame = {image: requireImage('gfx/loot/greenGem.png'), x: 0, y: 0, w: 50, h: 55};
export const blueGemSource: Frame = {image: requireImage('gfx/loot/blueGem.png'), x: 0, y: 0, w: 50, h: 55};

// Icons from http://opengameart.org/content/496-pixel-art-icons-for-medievalfantasy-rpg
export const swordSource: Frame = {image: requireImage('gfx/loot/sword.png'), x: 0, y: 0, w: 34, h: 34};
export const shieldSource: Frame = {image: requireImage('gfx/loot/shield.png'), x: 0, y: 0, w: 34, h: 34};
export const shoeSource: Frame = {image: requireImage('gfx/shoe.png'), x: 0, y: 0, w: 34, h: 34};
export const clockSource: Frame = {image: requireImage('gfx/loot/clock.png'), x: 0, y: 0, w: 34, h: 34};
export const scrollSource: Frame = {image: requireImage('gfx/loot/scroll.png'), x: 0, y: 0, w: 34, h: 34};
export const portalSource: Frame = {image: requireImage('gfx/map/portal.png'), x: 0, y: 0, w: 34, h: 34};
export const shellSource: Frame = {image: requireImage('gfx/map/shell.png'), x: 0, y: 0, w: 34, h: 34};
export const exitSource: Frame = {image: requireImage('gfx/map/exit.png'), x: 0, y: 0, w: 34, h: 34};
export const magicStoneSource: Frame = {image: requireImage('gfx/loot/magicStone.png'), x: 0, y: 0, w: 34, h: 34};
export const treasureMapSource: Frame = {image: requireImage('gfx/map/map.png'), x: 0, y: 0, w: 34, h: 34};

// Icon by Chris Brewer originally created for Treasure Tycoon
export const upArrows: Frame = {image: requireImage('gfx/upArrows.png'), x: 0, y: 0, w: 32, h: 32};

// Trash icon from: https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Trash_font_awesome.svg/480px-Trash_font_awesome.svg.png
export const trashSource: Frame = {image: requireImage('gfx/trash.png'), x: 0, y: 0, w: 480, h: 480};

// Image by Noah originally created for Lazy RPG
export const turtleSource: Frame = {image: requireImage('gfx/monsters/turtle.png'), x: 0, y: 0, w: 128, h: 128};

// Modified version of https://www.toptal.com/designers/subtlepatterns/rocky-wall/
export const darkStoneImage = requireImage('gfx/darkStone.png');
// https://www.toptal.com/designers/subtlepatterns/old-map/
export const oldMapImage = requireImage('gfx/oldMap.png');


// Requires Attribution (http://creativecommons.org/licenses/by/3.0/)
// http://opengameart.org/content/monsterboy-in-wonder-world-mockup-assets
export const waspSource: Frame = {image: requireImage('gfx/monsters/wasp.png'), x: 0, y: 0, w: 32, h: 32};
export const fungusSource: Frame = {image: requireImage('gfx/monsters/fungus.png'), x: 0, y: 0, w: 32, h: 32};
export const crabSource: Frame = {image: requireImage('gfx/monsters/crab.png'), x: 0, y: 0, w: 32, h: 32};
export const snailSource: Frame = {image: requireImage('gfx/monsters/snail.png'), x: 0, y: 0, w: 32, h: 32};
