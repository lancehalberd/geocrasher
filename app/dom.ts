
export function query(className: string): HTMLElement {
    return document.querySelector(className);
}
export function queryAll(className: string): NodeListOf<HTMLElement> {
    return document.querySelectorAll(className);
}

export const mainCanvas:HTMLCanvasElement = query('.js-mainCanvas') as HTMLCanvasElement;
export const mainContext = mainCanvas.getContext('2d');
mainContext.imageSmoothingEnabled = false;

export function createCanvas(width: number, height: number, classes = ''): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.className = classes;
    canvas.width = width;
    canvas.height = height;
    return canvas;
}
export function createCanvasAndContext(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
    const canvas = createCanvas(width, height);
    const context = canvas.getContext('2d');
    context.imageSmoothingEnabled = false;
    return [canvas, context];
}
export var debugCanvas = (canvas: HTMLCanvasElement) => {
    document.body.append(canvas);
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.backgroundColor = 'blue';
};

export function tag(type: string, classes: string = '', content: string | number = '') {
    return '<' + type + ' class="' + classes + '">' + content + '</' + type + '>';
}
export function tagElement(type: string, classes: string = '', content: string | number = ''):HTMLElement {
    const element:HTMLElement = document.createElement(type);
    element.className = classes || '';
    element.innerHTML = '' + (content || '');
    return element;
}
export const divider = tag('div', 'centered medium', tag('div', 'divider'));
export function titleDiv(titleMarkup: string) {
    return titleMarkup && tag('div', 'title', titleMarkup);
}
export function bodyDiv(bodyMarkup: string) {
    return bodyMarkup && tag('div', 'body', bodyMarkup)
};
export function toggleElements(elements: NodeListOf<HTMLElement>, show: boolean) {
    elements.forEach(element => toggleElement(element, show));
}
export function toggleElement(element: HTMLElement, show: boolean) {
    element.style.display = show ? '' : 'none';
}
export function getElementIndex(element: HTMLElement) {
    return [...element.parentElement.children].indexOf(element);
}
