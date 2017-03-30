function drawScene() {
    switch (currentScene) {
        case 'loading':
            drawLoadingScene();
            break;
        case 'title':
            drawTitleScene();
            break;
        case 'map':
            drawMapScene();
            break;
    }
    // context.fillStyle = '#0F0';
    // context.fillRect(lastClick[0] - 5, lastClick[1] - 5, 10, 10);
}

function drawLoadingScene() {
    context.fillStyle = 'black';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = 'white';
    context.font = Math.floor(canvas.width / 10) + 'px sans-serif';
    context.textAlign = 'center'
    context.textBaseline = 'middle';
    context.fillText('LOADING', canvas.width / 2, canvas.height / 2);
}

function fillRectangle(context, rectangle) {
    context.fillRect(rectangle.left, rectangle.top, rectangle.width, rectangle.height);
}