import { maxScale, minScale } from 'app/gameConstants';
import { handleDungeonClick } from 'app/scenes/dungeonScene';
import { handleMapClick } from 'app/scenes/mapScene';
import { handleSkillsClick } from 'app/scenes/skillsScene';
import { handleTitleClick } from 'app/scenes/titleScene';
import { handleTreasureMapClick } from 'app/scenes/treasureMapScene';
import { getState } from 'app/state';
import { getActualScale } from 'app/world';

let lastTouchEvent: TouchEvent = null, firstTouchEvent: TouchEvent = null;
let lastMouseEvent: MouseEvent = null, firstMouseEvent: MouseEvent = null;
let touchMoved = false, mouseMoved = false;

function handleTouchStart(event: TouchEvent) {
    event.preventDefault();
    lastTouchEvent = event;
    firstTouchEvent = event;
    touchMoved = false;
}
function handleTouchMove(event: TouchEvent) {
    event.preventDefault();
    const state = getState();
    touchMoved = true;
    if (state.currentScene !== 'map') {
        return;
    }
    if (!lastTouchEvent) {
        return;
    }
    if (lastTouchEvent.touches.length === 1 && event.touches.length === 1) {
        const dx = event.touches[0].pageX - lastTouchEvent.touches[0].pageX;
        const dy = event.touches[0].pageY - lastTouchEvent.touches[0].pageY;
        state.world.origin[0] -= dx / getActualScale(state);
        state.world.origin[1] += dy / getActualScale(state);
        lastTouchEvent = event;
        if (!state.battle.engagedMonster) {
            state.selectedTile = null;
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
    if (!touchMoved && lastTouchEvent.touches.length === 1 && firstTouchEvent.touches.length === 1) {
        //if (isDebugMode) alert([lastTouchEvent.touches[0].pageX , lastTouchEvent.touches[0].pageY]);
        //if (isDebugMode) alert([$(this).offset().left , $(this).offset().top]);
        var x = lastTouchEvent.touches[0].pageX;
        var y = lastTouchEvent.touches[0].pageY;
        //if (isDebugMode) alert([x, y]);
        switch (state.currentScene) {
            case 'title':
                handleTitleClick(state, x, y);
                break;
            case 'map':
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
    lastTouchEvent = null;
    firstTouchEvent = null;
    touchMoved = false;
}

function handleMouseDown(event: MouseEvent) {
    lastMouseEvent = event;
    firstMouseEvent = event;
    mouseMoved = false;
}
function handleMouseMove(event: MouseEvent) {
    const state = getState();
    if (state.currentScene !== 'map') return;
    if (!lastMouseEvent) return;
    var dx = event.pageX - lastMouseEvent.pageX;
    var dy = event.pageY - firstMouseEvent.pageY;
    state.world.origin[0] -= dx / getActualScale(state);
    state.world.origin[1] += dy / getActualScale(state);
    lastMouseEvent = event;
    mouseMoved = true;
}
function handleMouseUp(event: MouseEvent) {
    const state = getState();
    if (!mouseMoved) {
        var x = lastMouseEvent.pageX;
        var y = lastMouseEvent.pageY;
        switch (state.currentScene) {
            case 'title':
                handleTitleClick(state, x, y);
                break;
            case 'map':
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
    lastMouseEvent = null;
    firstMouseEvent = null;
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
}

function getTouchEventDistance(touchEvent: TouchEvent) {
    const dx = touchEvent.touches[0].pageX - touchEvent.touches[1].pageX;
    const dy = touchEvent.touches[0].pageY - touchEvent.touches[1].pageY;
    return Math.sqrt(dx * dx + dy * dy);
}