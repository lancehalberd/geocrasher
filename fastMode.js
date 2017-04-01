var fastMode = false, startingFastMode = false, endFastModeTime = 0, minThreshold = 100, maxThreshold = 5000;

function updateFastMode(millisecondsBetweenUpdates) {
    if (!startingFastMode && !fastMode) {
        if (millisecondsBetweenUpdates <= maxThreshold) startingFastMode = true;
        return;
    }
    if (startingFastMode && !fastMode) {
        // We apply a min threshold here because starting and stopping fastmode could be annoying if
        // a player doesn't mean to. Sometimes when the GPS is wrong, it corrects itself and very rapidly
        // updates the GPS position. This minimum threshold is designed to prevent fastMode from starting
        // when GPS is updating too quickly.
        if (millisecondsBetweenUpdates <= minThreshold || millisecondsBetweenUpdates > maxThreshold) {
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
    if (millisecondsBetweenUpdates > minThreshold && millisecondsBetweenUpdates <= maxThreshold) {
        endFastModeTime = now() + 10000;
    }
}
