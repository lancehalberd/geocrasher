import { saveGame } from 'app/saveGame';
import { exitDungeon } from 'app/scenes/dungeonScene';
import { hideTreasureMap } from 'app/scenes/treasureMapScene';
import { getState } from 'app/state';

function handlePopState(event: PopStateEvent): void {
    const state = getState();
    if (state.ignoreNextPop) {
        state.ignoreNextPop = false;
        return;
    }
    const { currentScene, sceneStack } = state;
    if (sceneStack.length) {
        /*
         * This code prevents the forward button from acting like the back button, but
         * it isn't clear it works in all cases.
        if (history.state && history.state.scene !== sceneStack[sceneStack.length - 1]) {
            ignoreNextPop = true;
            history.back();
            return;
        }*/
        if (currentScene === 'skills') {
            state.currentScene = sceneStack.pop();
        } else if (currentScene === 'treasureMap') {
            hideTreasureMap(state);
        } else if (currentScene === 'map') {
            if (confirm('Are you sure you want to quit and return to the main menu?')) {
                saveGame(state);
                state.currentScene = sceneStack.pop();
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