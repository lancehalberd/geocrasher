import { maxScale, minScale } from 'app/gameConstants';
import { handleDungeonClick } from 'app/scenes/dungeonScene';
import { handleMapClick } from 'app/scenes/mapScene';
import { handleSkillsClick } from 'app/scenes/skillsScene';
import { handleTitleClick } from 'app/scenes/titleScene';
import { handleTreasureMapClick } from 'app/scenes/treasureMapScene';
import { getState } from 'app/state';
import {getActualScale} from 'app/utils/world';

const mouseMoveThreshold = 5;
const touchMoveThreshold = 5;

let lastTouchEvent: TouchEvent | null, firstTouchEvent: TouchEvent | null;
let lastMouseEvent: MouseEvent | null, mouseDownEvent: MouseEvent | null;
let touchMoved = false, mouseMoved = false;

function handleTouchStart(event: TouchEvent) {
    event.preventDefault();
    lastTouchEvent = event;
    firstTouchEvent = event;
    touchMoved = false;
}
function handleTouchMove(event: TouchEvent) {
    event.preventDefault();
    if (!lastTouchEvent || !firstTouchEvent) {
        return;
    }
    if (Math.abs(firstTouchEvent.touches[0].pageX - event.touches[0].pageX) > touchMoveThreshold
        || Math.abs(firstTouchEvent.touches[0].pageY - event.touches[0].pageY) > touchMoveThreshold
    ) {
        touchMoved = true;
    }
    // Dragging is only supported in the map scene currently.
    const state = getState();
    if (state.currentScene !== 'map') {
        return;
    }
    if (lastTouchEvent.touches.length === 1 && event.touches.length === 1) {
        const dx = event.touches[0].pageX - lastTouchEvent.touches[0].pageX;
        const dy = event.touches[0].pageY - lastTouchEvent.touches[0].pageY;
        if (state.world.origin) {
            state.world.origin[0] -= dx / getActualScale(state);
            state.world.origin[1] -= dy / getActualScale(state);
        }
        lastTouchEvent = event;
        if (!state.battle.engagedMonster) {
            delete state.selectedTile;
        }
        return;
    }
    //if (isDebugMode) alert([lastTouchEvent.touches.length,event.touches.length]);
    if (lastTouchEvent.touches.length === 2 && event.touches.length === 2) {
        let touchScale = getTouchEventDistance(event) / getTouchEventDistance(lastTouchEvent);
        //if (isDebugMode) alert([getTouchEventDistance(event), getTouchEventDistance(lastTouchEvent)]);
        touchScale = Math.max(.8, Math.min(1.2, isNaN(touchScale) ? 1 : touchScale));
        state.world.displayScale = Math.min(maxScale, Math.max(minScale, state.world.displayScale * touchScale));
        lastTouchEvent = event;
        return;
    }
}
function handleTouchEnd(event: TouchEvent) {
    const state = getState();
    event.preventDefault();
    /*if (isDebugMode) {
        alert('end');
        alert(touchMoved);
        alert(lastTouchEvent.touches.length);
        alert(firstTouchEvent.touches.length);
    }*/
    if (!touchMoved && lastTouchEvent?.touches.length === 1 && firstTouchEvent?.touches.length === 1) {
        //if (isDebugMode) alert([lastTouchEvent.touches[0].pageX , lastTouchEvent.touches[0].pageY]);
        //if (isDebugMode) alert([$(this).offset().left , $(this).offset().top]);
        const x = lastTouchEvent.touches[0].pageX;
        const y = lastTouchEvent.touches[0].pageY;
        handleClick(state, x, y);
        //if (isDebugMode) alert([x, y]);
    }
    lastTouchEvent = null;
    firstTouchEvent = null;
    touchMoved = false;
}

function handleClick(state: GameState, x: number, y: number): void {
    switch (state.currentScene) {
        case 'title':
            handleTitleClick(state, x, y);
            break;
        case 'journey':
        case 'map':
        case 'voyage':
            handleMapClick(state, x, y);
            break;
        case 'dungeon':
            handleDungeonClick(state, x, y);
            break;
        case 'treasureMap':
            handleTreasureMapClick(state, x, y);
            break;
        case 'skills':
            handleSkillsClick(state, x, y);
            break;
    }
}

function handleMouseDown(event: MouseEvent) {
    mouseDownEvent = lastMouseEvent = event;
    mouseMoved = false;
}
function handleMouseMove(event: MouseEvent) {
    if (!lastMouseEvent || !mouseDownEvent) {
        return;
    }
    if (Math.abs(event.pageX - mouseDownEvent.pageX) > mouseMoveThreshold
        || Math.abs(event.pageY - mouseDownEvent.pageY) > mouseMoveThreshold
    ) {
        mouseMoved = true;
    }
    const state = getState();
    // Dragging is only supported in the map scene currently.
    if (state.currentScene !== 'map') {
        return;
    }
    const dx = event.pageX - lastMouseEvent.pageX;
    const dy = event.pageY - lastMouseEvent.pageY;
    if (state.world.origin) {
        state.world.origin[0] -= dx / getActualScale(state);
        state.world.origin[1] -= dy / getActualScale(state);
    }
    lastMouseEvent = event;
}
function handleMouseUp(event: MouseEvent) {
    const state = getState();
    if (!mouseMoved) {
        const x = event.pageX;
        const y = event.pageY;
        handleClick(state, x, y);
    }
    lastMouseEvent = null;
    mouseMoved = false;
}

export function registerTouchEvents() {
    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);
}

export function registerMouseEvents() {
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    document.addEventListener('wheel', (event: WheelEvent) => {
        const state = getState();
        const scrollScale = Math.pow(0.99, event.deltaY);
        state.world.displayScale = Math.min(maxScale, Math.max(minScale, state.world.displayScale * scrollScale));
    });
}

function getTouchEventDistance(touchEvent: TouchEvent) {
    const dx = touchEvent.touches[0].pageX - touchEvent.touches[1].pageX;
    const dy = touchEvent.touches[0].pageY - touchEvent.touches[1].pageY;
    return Math.sqrt(dx * dx + dy * dy);
}
