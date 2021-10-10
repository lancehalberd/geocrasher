import { advanceGameState } from 'app/advanceGameState';
import { gridLength, maxRadius } from 'app/gameConstants';
import { blueGemSource, greenGemSource, orangeGemSource } from 'app/images';
import { addLootToTile } from 'app/loot';
import { getDistance } from 'app/utils/index';
import { getActualScale, getTileData, project, toGridCoords } from 'app/world';

import { Frame, GameState, GemColor, GemLoot, MapTile } from 'app/types';

// How long recent gem pickup locations are excluded from possible gem spawn locations.
const historyDuration = 15 * 60 * 1000;
// The radius around which gems cannot spawn.
const exclusionRadius = 6 * gridLength
const gemData = <const>[
    {
        color: 'orange', frame: orangeGemSource, scale: 0.4, spawnRadius: gridLength * 6,
        collectRadius: maxRadius * 1.5, ticks: 4, debuff: .95,
        tintAmount: .07, tickDuration: 500,
    },
    {
        color: 'green', frame: greenGemSource, scale: 0.4, spawnRadius: gridLength * 10,
        collectRadius: maxRadius * 2, ticks: 8, debuff: .95,
        tintAmount: .04, tickDuration: 300,
    },
    {
        color: 'blue', frame: blueGemSource, scale: 0.4, spawnRadius: gridLength * 14,
        collectRadius: maxRadius * 3, ticks: 16, debuff: .95,
        tintAmount: .03, tickDuration: 200,
    },
];

class GemLootClass implements GemLoot {
    type = <const>'gem';
    color: GemColor;
    gem: typeof gemData[number]
    frame: Frame;
    scale = 1;
    constructor(color: GemColor) {
        this.color = color;
        this.gem = gemData.find(gem => gem.color === this.color) as typeof gemData[number];
        this.frame = this.gem.frame;
        this.scale = this.gem.scale;
    }
    onObtain(this: GemLootClass, state: GameState) {
        const [x, y] = state.world.currentPosition as number[];
        state.saved.gems.recentLocations.push({
            x,
            y,
            time: state.time,
        });
        if (state.saved.gems.recentLocations.length > 3) {
            state.saved.gems.recentLocations.shift();
        }
        const radiusSquared = this.gem.collectRadius * this.gem.collectRadius;
        // We don't need to restart bonus counter because it is already counting for this pickup.
        for (const tileData of state.world.activeTiles) {
            for (const lootMarker of tileData.lootMarkers) {
                // ignore loot already being collected.
                if (state.loot.collectingLoot.indexOf(lootMarker) >= 0) {
                    continue;
                }
                const dx = x - lootMarker.x, dy = y - lootMarker.y;
                // We go ahead and allow claiming monster loot this way.
                if (dx * dx + dy * dy <= radiusSquared) {
                    state.loot.collectingLoot.push(lootMarker);
                }
            }
        }
        state.gems.colorCounters[this.gem.color] = this.gem.ticks;
    }
}

export function checkToSpawnGems(state: GameState): void {
    if (state.globalPosition.isFastMode
        || state.globalPosition.isFixingGPS
        || !state.world.currentPosition
        || state.currentScene !== 'map'
    ) {
        return;
    }
    const { gemMarkers } = state.gems;
    for (const gem of gemData) {
        const currentGemMarker = gemMarkers.find(gemMarker => (gemMarker.loot as GemLoot).color === gem.color);
        if (currentGemMarker) {
            if (getDistance([currentGemMarker.x, currentGemMarker.y], state.world.currentPosition) < gem.spawnRadius + gridLength * 5) {
                continue;
            }
            // Remove the current gem marker if it is too far from the avatar's current location.
            gemMarkers.splice(gemMarkers.indexOf(currentGemMarker));
        }
        const theta = Math.random() * 2 * Math.PI;
        let bestTile: MapTile | null = null;
        for (let dt = 0; dt < 2 * Math.PI; dt += Math.PI / 20) {
            const coords = [
                state.world.currentPosition[0] + Math.cos(theta + dt) * gem.spawnRadius,
                state.world.currentPosition[1] + Math.sin(theta + dt) * gem.spawnRadius,
            ];
            const gridCoords = toGridCoords(state, coords);
            const tile = getTileData(state, gridCoords);
            if (!tile || areCoordsInGemHistory(state, coords)) {
                continue;
            }
            if (!bestTile || tile.level > bestTile.level) {
                bestTile = tile;
            }
        }
        if (bestTile) {
            bestTile.gemMarker = addLootToTile(state, bestTile, new GemLootClass(gem.color));
            gemMarkers.push(bestTile.gemMarker);
        }
    }
}
export function clearAllGems(state: GameState) {
    for (const gemMarker of state.gems.gemMarkers) {
        const mapTile = gemMarker.tile;
        mapTile.lootMarkers.splice(mapTile.lootMarkers.indexOf(gemMarker), 1);
        delete mapTile.gemMarker;
    }
}

function areCoordsInGemHistory(state: GameState, coords: number[]) {
    for (let i = 0; i < state.saved.gems.recentLocations.length; i++) {
        const recentLocation = state.saved.gems.recentLocations[i];
        if (state.time - recentLocation.time >= historyDuration) {
            state.saved.gems.recentLocations.splice(i--, 1);
            continue;
        }
        if (getDistance(coords, [recentLocation.x, recentLocation.y]) < exclusionRadius) {
            return true;
        }
    }
    return false;
}

export function updateGems(state: GameState): void {
    for (const gem of gemData) {
        const currentTick = state.gems.colorCounters[gem.color] || 0;
        if (!currentTick) {
            continue;
        }
        if (state.loot.collectingLoot.length) {
            state.gems.nextTickTime = state.time + gem.tickDuration;
        }
        if (state.gems.nextTickTime && state.time >= state.gems.nextTickTime) {
            state.gems.colorCounters[gem.color] = currentTick - 1;
            advanceGameState(state);
            state.gems.nextTickTime = state.time + gem.tickDuration;
            for (const monsterMarker of state.world.activeMonsterMarkers) {
                if (monsterMarker.monster.tint?.color !== gem.color) {
                    monsterMarker.monster.tint = {
                        color: gem.color,
                        amount: 0,
                    };
                }
                monsterMarker.monster.tint.amount += gem.tintAmount;
                monsterMarker.monster.currentHealth = Math.max(1, Math.floor(monsterMarker.monster.currentHealth * gem.debuff));
                monsterMarker.monster.attack = Math.max(1, Math.floor(monsterMarker.monster.attack * gem.debuff));
                monsterMarker.monster.defense = Math.max(1, Math.floor(monsterMarker.monster.defense * gem.debuff));
            }
        }
    }
}

export function drawGemIndicators(context: CanvasRenderingContext2D, state: GameState) {
    const { canvas } = state.display;
    const scaleToUse = getActualScale(state);
    const { currentPosition } = state.world;
    if (!currentPosition) {
        return;
    }
    const playerScreenCoords = project(state, currentPosition);
    // Draw effects for any gem being collected.
    for (const gem of gemData) {
        const currentTick = state.gems.colorCounters[gem.color] || 0;
        if (state.gems.nextTickTime && currentTick) {
            const percent = currentTick / gem.ticks
            context.save();
                context.globalAlpha = (percent >= 1) ? .3 : .2 + .3 * (state.gems.nextTickTime - state.time) / gem.tickDuration;
                context.fillStyle = gem.color;
                context.beginPath();
                if (percent < 1) {
                    context.moveTo(playerScreenCoords[0], playerScreenCoords[1]);
                }
                context.arc(playerScreenCoords[0], playerScreenCoords[1], gem.collectRadius * scaleToUse, -Math.PI / 2 - percent * 2 * Math.PI, -Math.PI / 2);
                if (percent < 1) {
                    context.closePath();
                }
                context.fill();
            context.restore();
        }
    }
    // Gems are only collectible in the map scene, so don't draw indicators for them
    // in other scenes (journey/voyage mode specifically).
    if (state.currentScene !== 'map') {
        return;
    }
    for (const gemMarker of state.gems.gemMarkers) {
        if (state.loot.collectingLoot.indexOf(gemMarker) >= 0) continue;
        const distance = getDistance([gemMarker.x, gemMarker.y], currentPosition);
        const pixelDistance = distance * scaleToUse;
        let indicatorScreenCoords;
        let distanceFactor = (pixelDistance - 40) / pixelDistance;
        const dx = (gemMarker.x - currentPosition[0]);
        const dy = (gemMarker.y - currentPosition[1]);
        //console.log(distanceFactor);
        if (currentPosition[0] < gemMarker.x) {
            distanceFactor = Math.min(distanceFactor, (canvas.width - playerScreenCoords[0] - 20) / (dx * scaleToUse));
        }
        if (currentPosition[0] > gemMarker.x) {
            distanceFactor = Math.min(distanceFactor, (playerScreenCoords[0] - 20) / (-dx * scaleToUse));
        }
        if (currentPosition[1] < gemMarker.y) {
            distanceFactor = Math.min(distanceFactor, (canvas.height - playerScreenCoords[1] - 20) / (dy * scaleToUse));
        }
        if (currentPosition[1] > gemMarker.y) {
            distanceFactor = Math.min(distanceFactor, (playerScreenCoords[1] - 20) / (-dy * scaleToUse));
        }

        //console.log([pixelDistance, distanceFactor]);
        indicatorScreenCoords = [
            distanceFactor * dx * scaleToUse + playerScreenCoords[0],
            distanceFactor * dy * scaleToUse + playerScreenCoords[1]
        ];
        context.lineWidth = 1;
        context.fillStyle = (gemMarker.loot as GemLoot).color;
        context.strokeStyle = 'white';
        const normal = [dx / distance, dy / distance];
        context.beginPath();
        context.moveTo(indicatorScreenCoords[0], indicatorScreenCoords[1]);
        context.lineTo(indicatorScreenCoords[0] - 8 * normal[0] + 20 * normal[1], indicatorScreenCoords[1] - 8 * normal[1] - 20 * normal[0]);
        context.lineTo(indicatorScreenCoords[0] - 8 * normal[0] - 20 * normal[1], indicatorScreenCoords[1] - 8 * normal[1] + 20 * normal[0]);
        context.closePath();
        context.fill();
        context.stroke();
        if (distance >= 10 * gridLength) {
            context.beginPath();
            context.moveTo(indicatorScreenCoords[0] - 15 * normal[0] , indicatorScreenCoords[1] - 15 * normal[1]);
            context.lineTo(indicatorScreenCoords[0] - 20 * normal[0] + 18 * normal[1], indicatorScreenCoords[1] - 20 * normal[1] - 18 * normal[0]);
            context.lineTo(indicatorScreenCoords[0] - 20 * normal[0] - 18 * normal[1], indicatorScreenCoords[1] - 20 * normal[1] + 18 * normal[0]);
            context.closePath();
            context.fill();
            context.stroke();
        }
        if (distance >= 15 * gridLength) {
            context.beginPath();
            context.moveTo(indicatorScreenCoords[0] - 27 * normal[0] , indicatorScreenCoords[1] - 27 * normal[1]);
            context.lineTo(indicatorScreenCoords[0] - 30 * normal[0] + 15 * normal[1], indicatorScreenCoords[1] - 30 * normal[1] - 15 * normal[0]);
            context.lineTo(indicatorScreenCoords[0] - 30 * normal[0] - 15 * normal[1], indicatorScreenCoords[1] - 30 * normal[1] + 15 * normal[0]);
            context.closePath();
            context.fill();
            context.stroke();
        }
    }
}
