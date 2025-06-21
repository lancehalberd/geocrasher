import {saveGame} from 'app/saveGame';
import {refreshActiveTiles} from 'app/utils/refreshActiveTiles';
import {getState, popScene} from 'app/state';

export function hideTreasureMap(state: GameState) {
    delete state.selectedTile;
    state.world.origin = state.world.currentPosition;
    popScene(state);
    refreshActiveTiles(state);
}

export function exitDungeon(state: GameState) {
    state.world.origin = state.world.currentPosition;
    delete state.battle.engagedMonster;
    delete state.selectedTile;
    delete state.dungeon.currentDungeon;
    popScene(state);
    refreshActiveTiles(state);
}

function handlePopState(event: PopStateEvent): void {
    const state = getState();
    const { currentScene, sceneStack } = state;
    if (sceneStack.length) {
        if (currentScene === 'skills') {
            state.currentScene = sceneStack.pop() as Scene;
        } else if (currentScene === 'treasureMap') {
            hideTreasureMap(state);
        } else if (currentScene === 'map') {
            if (confirm('Are you sure you want to quit and return to the main menu?')) {
                saveGame(state);
                state.currentScene = sceneStack.pop() as Scene;
            } else {
                history.pushState({}, '');
            }
        } else if (state.dungeon.currentDungeon) {
            if (confirm('Are you sure you want to exit the dungeon?')) {
                exitDungeon(state);
            } else {
                history.pushState({}, '');
            }
        }
    }
}

export function registerBackAction() {
    window.addEventListener('popstate', handlePopState);
}

export function triggerBackAction() {
    window.history.back();
}
