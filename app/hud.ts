import { isPointInRectangle } from 'app/utils/index';

export function renderHudButtons(context: CanvasRenderingContext2D, state: GameState, buttons: HudButton[]): void {
    for (const button of buttons) {
        if (button.isVisible?.(state) === false) {
            continue;
        }
        button.render(context, state);
    }
}

export function handleHudButtonClick(state: GameState, x: number, y: number, buttons: HudButton[]): boolean {
    // The buttons are considered in reverse order so that buttons drawn on top have highest priority.
    for (const button of [...buttons].reverse()) {
        if (button.isVisible?.(state) === false) {
            continue;
        }
        if (isPointInRectangle(x, y, button.target)) {
            if (button.isDisabled?.(state) !== true) {
                button.onClick(state, x, y);
            }
            return true;
        }
    }
    return false;
}
