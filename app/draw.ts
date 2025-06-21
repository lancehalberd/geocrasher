import {createCanvasAndContext} from 'app/dom';
import {frameLength} from 'app/gameConstants';

export function frame(
    x: number, y: number, w: number, h: number,
    content?: Rectangle
): FrameRectangle {
    return {x, y, w, h, content};
}

// Make a single frame into an FrameAnimation.
export function frameAnimation(frame: Frame): FrameAnimation {
    return {frames: [frame], frameDuration: 1, duration: 1};
}

export function framesAnimation(frames: Frame[], duration = 8, props: ExtraAnimationProperties = {}): FrameAnimation {
    return {frames, frameDuration: duration, ...props, duration: frameLength * frames.length * duration};
}

export function getFrame(animation: FrameAnimation, animationTime: number): Frame {
    animationTime = Math.max(animationTime, 0);
    let frameIndex = Math.floor(animationTime / (frameLength * (animation.frameDuration || 1)));
    if (animation.loop === false) { // You can set this to prevent an animation from looping.
        frameIndex = Math.min(frameIndex, animation.frames.length - 1);
    }
    if (animation.loopFrame && frameIndex >= animation.frames.length) {
        frameIndex -= animation.loopFrame;
        frameIndex %= (animation.frames.length - animation.loopFrame);
        frameIndex += animation.loopFrame;
    }
    return animation.frames[frameIndex % animation.frames.length];
};

export function drawFrame(
    context: CanvasRenderingContext2D,
    {image, x, y, w, h}: Frame,
    {x: tx, y: ty, w: tw, h: th}: Rectangle
): void {
    // (x | 0) is faster than Math.floor(x)
    context.drawImage(image, x | 0, y | 0, w | 0, h | 0, tx | 0, ty | 0, tw | 0, th | 0);
}

export function drawFrameAt(
    context: CanvasRenderingContext2D,
    {image, content, x, y, w, h}: Frame,
    {x: tx, y: ty, w: tw, h: th}: {x: number, y: number, w?: number, h?: number}
): void {
    const cw = content?.w ?? w;
    const ch = content?.h ?? h;
    // First set tw/th to the target size of the content of the frame.
    tw = tw ?? cw;
    th = th ?? ch;
    const xScale = tw / cw;
    const yScale = th / ch;
    // Adjust tx/ty so that x/y will be the top left corner of the content of the frame.
    tx = tx - (content?.x || 0) * xScale;
    ty = ty - (content?.y || 0) * yScale;
    // Before drawing, set tw/th to the target size of the entire frame.
    tw = xScale * w;
    th = yScale * h;
    // (x | 0) is faster than Math.floor(x)
    context.drawImage(image,
        x | 0, y | 0, w | 0, h | 0,
        tx | 0, ty | 0, tw | 0, th | 0);
}

export function drawFrameCenteredAt(
    context: CanvasRenderingContext2D,
    {image, content, x, y, w, h}: Frame,
    {x: tx, y: ty, w: tw, h: th}: {x: number, y: number, w: number, h: number}
): void {
    const cw = content?.w ?? w;
    const ch = content?.h ?? h;
    // Adjust tx/ty so that x/y will be the top left corner of the content of the frame.
    tx = tx - (content?.x || 0) + (tw - cw) / 2;
    ty = ty - (content?.y || 0) + (th - ch) / 2;
    // (x | 0) is faster than Math.floor(x)
    context.drawImage(image,
        x | 0, y | 0, w | 0, h | 0,
        tx | 0, ty | 0, w | 0, h | 0);
}

export function getFrameHitBox({content, w, h}: Frame, {x, y}: {x: number, y: number}): Rectangle {
    return {
        x, y,
        w: content?.w ?? w,
        h: content?.h ?? h,
    };
}

export function drawSolidTintedImage(context: CanvasRenderingContext2D, tint: string, frame: Frame, target: Rectangle) {
    // First make a solid color in the shape of the image to tint.
    globalTintContext.save();
    globalTintContext.fillStyle = tint;
    globalTintContext.clearRect(0, 0, frame.w, frame.h);
    const tintRectangle = {x: 0, y: 0, w: frame.w, h: frame.h};
    drawFrame(globalTintContext, frame, tintRectangle);
    globalTintContext.globalCompositeOperation = "source-in";
    globalTintContext.fillRect(0, 0, frame.w, frame.h);
    drawFrame(context, { image: globalTintCanvas, ...tintRectangle}, target);
    globalTintContext.restore();
}


const [globalTintCanvas, globalTintContext] = createCanvasAndContext(150, 300);
globalTintContext.imageSmoothingEnabled = false;
export function drawTintedImage(context: CanvasRenderingContext2D, {color, amount}: Tint, frame: Frame, target: Rectangle): void {
    context.save();
        // First make a solid color in the shape of the image to tint.
        globalTintContext.save();
        globalTintContext.fillStyle = color;
        globalTintContext.clearRect(0, 0, frame.w, frame.h);
        drawFrame(globalTintContext, frame, {...frame, x: 0, y: 0});
        globalTintContext.globalCompositeOperation = "source-in";
        globalTintContext.fillRect(0, 0, frame.w, frame.h);
        globalTintContext.restore();
        // Next draw the untinted image to the target.
        drawFrame(context, frame, target);
        // Finally draw the tint color on y of the target with the desired opacity.
        context.globalAlpha *= amount; // This needs to be multiplicative since we might be drawing a partially transparent image already.
        drawFrame(context, {image: globalTintCanvas, x: 0, y: 0, w: frame.w, h: frame.h}, target);
    context.restore();
}
const [globalCompositeCanvas, globalCompositeContext] = createCanvasAndContext(150, 150);
export function prepareTintedImage(): void {
    globalCompositeContext.clearRect(0, 0, globalCompositeCanvas.width, globalCompositeCanvas.height);
}
export function getTintedImage(frame: Frame, tint: Tint): Frame {
    const target: Rectangle = {x: 0, y: 0, w: frame.w, h: frame.h};
    drawTintedImage(globalCompositeContext, tint, frame, target);
    return { image: globalCompositeCanvas, ...target };
}

export function drawOutlinedImage(context: CanvasRenderingContext2D, color: string, thickness: number, frame: Frame, target: Rectangle): void {
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            if ((dy == 0 && dx == 0) || (dx !== 0 && dy !== 0)) continue;
            drawSolidTintedImage(context, color, frame, {
                ...target,
                x: target.x + dx * thickness,
                y: target.y + dy * thickness,
            });
        }
    }
    drawFrame(context, frame, target);
}
export function logPixel(context: CanvasRenderingContext2D, x: number, y: number): void {
    console.log(context.getImageData(x, y, 1, 1).data)
}

export function drawBar(context: CanvasRenderingContext2D, r: Rectangle, background: string, color: string, percent: number): void {
    percent = Math.max(0, Math.min(1, percent));
    if (background) {
        fillRectangle(context, background, r);
    }
    const fill = pad(r, 1);
    fill.w *= percent;
    fillRectangle(context, color, fill);
}

export function pad({x, y, w, h}: Rectangle, m: number): Rectangle {
    return {x: x - m, w: w + 2 * m, y: y - m, h: h + 2 * m};
}

export function fillRectangle(context: CanvasRenderingContext2D, color: string | CanvasPattern, {x, y, w, h}: Rectangle): void {
    context.fillStyle = color;
    context.fillRect(x, y, w, h);
}
export function drawRectangleFrame(context: CanvasRenderingContext2D, color: string, thickness: number, {x, y, w, h}: Rectangle) {
    context.beginPath();
    context.rect(x, y, w, h);
    context.rect(x + thickness, y + thickness, w - 2 * thickness, h - 2 * thickness);
    context.fillStyle = color;
    context.fill('evenodd');
}
export function drawRectangle(context: CanvasRenderingContext2D, {x, y, w, h}: Rectangle): void {
    context.rect(x, y, w, h);
}

export function drawOutlinedText(
    context: CanvasRenderingContext2D,
    text: string,
    textColor: string,
    borderColor: string,
    thickness: number,
    x: number,
    y: number
) {
    context.fillStyle = borderColor;
    for (let dy = -1; dy <=1; dy++)
        for (let dx = -1; dx <=1; dx++)
            if (dx !== 0 || dy !== 0) context.fillText(text, x + dx * thickness, y + dy * thickness);
    context.fillStyle = textColor;
    context.fillText(text, x, y);
}

export function drawEmbossedText(context: CanvasRenderingContext2D, text: string, colorA: string, colorB: string, x: number, y: number) {
    context.fillStyle = colorB;
    context.fillText(text, x + 1, y + 1);
    context.fillStyle = colorA;
    context.fillText(text, x, y);
}
