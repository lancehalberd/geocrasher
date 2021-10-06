import { mainCanvas, mainContext } from 'app/dom';
import { maxScale, minRadius } from 'app/gameConstants';
import { initializeSaveSlots } from 'app/saveGame';

import { GameState, SavedGameState, Scene } from 'app/types';

export function getDefaultSavedState(): SavedGameState {
    return {
        coins: 10,
        radius: minRadius,
        avatar: {
            level: 1,
            experience: 0,
            currentHealth: 100,
            healthBonus: 100,
            attackBonus: 8,
            defenseBonus: 6,
            skillLevels: {},
        },
        gems: {
            recentLocations: []
        },
        treasureHunt: {
            hadMap: false,
            mapCount: 0,
        },
        world: {
            dungeonLevelCap: 2,
            gemData: [{history: []}, {history: []}, {history: []}],
            tiles: [],
        },
    };
}

export function getDefaultState(): GameState {
    return {
        currentScene: 'loading',
        ignoreNextScenePop: false,
        sceneStack: [],
        // Start a few seconds into the future so that
        // other time stamps can be initialized to 0 without
        // having any effect.
        time: 10000,
        goalCoordinates: [],
        saveSlotIndex: -1,
        saveSlots: [],
        saved: getDefaultSavedState(),
        display: {
            canvas: mainCanvas,
            dungeonScale: 5, // ??? What value.
            context: mainContext,
            iconSize: 16,
        },
        avatar: {
            animationTime: 0,
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
        battle: {
            damageIndicators: [],
        },
        dungeon: {},
        gems: {
            colorCounters: {},
            gemMarkers: [],
        },
        globalPosition: {
            restartWatchTime: 0,
            direction: 'up',
            isFixingGPS: false,
            endFastModeTime: 0,
            endFixingGPSTime: 0,
            isFastMode: false,
            isStartingFastMode: false,
        },
        loot: {
            activePowerupMarkers: new Set(),
            collectingLoot: [],
            collectionBonus: 0,
            coinsCollected: 0,
            lootCollectedTime: 0,
            lootInRadius: [],
            lootInMonsterRadius: [],
            hideStatsAt: 0,
            initialLevel: 0,
            initialSkillPoints: 0,
            initialMaxHealth: 0,
            initialAttack: 0,
            initialDefense: 0,
        },
        treasureHunt: {

        },
        world: {
            activeTiles: [],
            displayScale: maxScale,
            allTiles: {},
            activeMonsterMarkers: [],
            levelSums: [],
            selectableTiles: new Set(),
        }
    };
}

let state: GameState;

export function getState() {
    return state;
}

export function initializeState() {
    state = getDefaultState();
    // @ts-expect-error
    window.state = state;
    initializeSaveSlots(state);
}

export function pushScene(state: GameState, newScene: Scene) {
    window.history.pushState({'scene': newScene}, '');
    state.sceneStack.push(state.currentScene);
    state.currentScene = newScene;
}
export function popScene(state: GameState) {
    const newScene = state.sceneStack.pop();
    if (newScene) {
        state.currentScene = newScene;
    }
}
