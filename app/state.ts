import { mainCanvas, mainContext } from 'app/dom';
import { minRadius, minScale } from 'app/gameConstants';

import { GameState, SavedGameState, Scene } from 'app/types';

export function getDefaultSavedState(): SavedGameState {
    return {
        coins: 10,
        radius: minRadius,
        treasureHunt: {
            hadMap: false,
            mapCount: 0,
            currentMap: null,
        },
        avatar: {
            level: 1,
            experience: 0,
            currentHealth: 100,
            healthBonus: 100,
            attackBonus: 8,
            defenseBonus: 6,
            skillLevels: {},
        },
        world: {
            dungeonLevelCap: 2,
            gemData: [{history: []}, {history: []}, {history: []}],
            tiles: [],
        }
    }
}

export function getDefaultState(): GameState {
    return {
        display: {
            canvas: mainCanvas,
            dungeonScale: 5, // ??? What value.
            context: mainContext,
            iconSize: 16,
        },
        dungeon: {
            activeDungeons: [],
            dungeonLevelCap: 2
        },
        levelSums: [],
        currentScene: 'loading',
        ignoreNextScenePop: false,
        sceneStack: [],
        avatar: {
            maxHealth: 0,
            attack: 0,
            defense: 0,
            affinityBonuses: {
                health: 0,
                attack: 0,
                defense: 0,
                money: 0,
            },
            usedSkillPoints: 0,
        },
        time: 0,
        loot: {
            collectingLoot: []
        },
        world: {
            displayScale: minScale,
            tileGrid: [],
        },
        globalPosition: {
            restartWatchTime: 0,
        }
    };
}

let state: GameState;

export function getState() {
    return state;
}

export function resetState() {
    state = getDefaultState();
}

export function pushScene(state: GameState, newScene: Scene) {
    window.history.pushState({'scene': newScene}, '');
    state.sceneStack.push(state.currentScene);
    state.currentScene = newScene;
}
export function popScene(state: GameState) {
    state.currentScene = state.sceneStack.pop();
}
