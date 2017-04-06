var fastMode = false, startingFastMode = false, endFastModeTime = 0, maxThreshold = 5000;
var fixingGPS = false, endFixingGPSTime = 0;

function updateFastMode(millisecondsBetweenUpdates) {
    if (fixingGPS || testMode) return;
    if (currentScene === 'loading' || currentScene === 'title' || currentScene === 'dungeon') return;
    if (!startingFastMode && !fastMode) {
        if (millisecondsBetweenUpdates <= maxThreshold) startingFastMode = true;
        return;
    }
    if (startingFastMode && !fastMode) {
        if (millisecondsBetweenUpdates > maxThreshold) {
            startingFastMode = false;
            return;
        }
        fastMode = true;
        resetLootTotals();
        clearAllGems();
        radius = maxRadius;
        selectedTile = null;
        fightingMonster = null;
        endFastModeTime = now() + 10000;
        return;
    }
    if (millisecondsBetweenUpdates <= maxThreshold) {
        endFastModeTime = now() + 10000;
    }
}
