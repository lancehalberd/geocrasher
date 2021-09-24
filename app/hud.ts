import { isPointInRectangle } from 'app/utils/index';

import { GameState, HudButton } from 'app/types';

export function renderHudButtons(context: CanvasRenderingContext2D, state: GameState, buttons: HudButton[]): void {
    for (const button of buttons) {
        if (button.isVisible?.(state) === false) {
            continue;
        }
        button.render(context, state);
    }
}

export function handleHudButtonClick(state: GameState, x: number, y: number, buttons: HudButton[]): boolean {
    for (const button of buttons) {
        if (button.isVisible?.(state) === false) {
            continue;
        }
        if (isPointInRectangle(x, y, button.target)) {
            if (button.isDisabled?.(state) !== true) {
                button.onClick(state);
            }
            return true;
        }
    }
    return false;
}
