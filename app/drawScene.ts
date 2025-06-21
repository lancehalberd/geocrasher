import { drawDungeonScene } from 'app/scenes/dungeonScene';
import { drawMapScene } from 'app/scenes/mapScene';
import { drawSkillsScene } from 'app/scenes/skillsScene';
import { drawTitleScene } from 'app/scenes/titleScene';
import { drawTreasureMapScene } from 'app/scenes/treasureMapScene';

export function drawScene(context: CanvasRenderingContext2D, state: GameState): void {
    const { canvas } = state.display;
    context.clearRect(0,0, canvas.width, canvas.height);
    switch (state.currentScene) {
        case 'loading':
            drawLoadingScene(context, state);
            break;
        case 'title':
            drawTitleScene(context, state);
            break;
        case 'journey':
        case 'voyage':
        case 'map':
            drawMapScene(context, state);
            break;
        case 'skills':
            drawSkillsScene(context, state);
            break;
        case 'dungeon':
            drawDungeonScene(context, state);
            break;
        case 'treasureMap':
            drawTreasureMapScene(context, state);
            break;
    }
}

function drawLoadingScene(context: CanvasRenderingContext2D, state: GameState): void {
    const { canvas } = state.display;
    context.fillStyle = 'black';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = 'white';
    context.font = Math.floor(canvas.width / 10) + 'px sans-serif';
    context.textAlign = 'center'
    context.textBaseline = 'middle';
    context.fillText('LOADING', canvas.width / 2, canvas.height / 2);
}
