import { Rectangle } from 'app/types';


export function getDistance(A: number[], B: number[]): number {
    return Math.sqrt((A[0] - B[0]) * (A[0] - B[0]) + (A[1] - B[1]) * (A[1] - B[1]));
}

export function isPointInRectangle(x: number, y: number, r: Rectangle): boolean {
    if ((r?.x ?? null) === null || (r?.y ?? null) === null || (r?.w ?? null) === null || (r?.h ?? null) === null) {
        return false;
    }
    return !(y <= r.y || y >= (r.y + r.h) || x <= r.x || x >= (r.x + r.w));
}

export function rectanglesOverlap(A: Rectangle, B: Rectangle): boolean {
    return !(A.y + A.h <= B.y || A.y >= B.y + B.h || A.x + A.w <= B.x || A.x >= B.x + B.w);
}
export function r(x, y, w, h): Rectangle {
    return {x, y, w, h};
}
export function rectangleCenter({x, y, w, h}: Rectangle): number[] {
    return [x + w / 2, y + h / 2];
}

export function abbreviateNumber(this: void, number: number): string {
    if (number >= 1000000000000) {
        return (number / 1000000000000 + '').slice(0, 5) + 'T';
    }
    if (number >= 1000000000) {
        return (number / 1000000000 + '').slice(0, 5) + 'B';
    }
    if (number >= 1000000) {
        return (number / 1000000 + '').slice(0, 5) + 'M';
    }
    if (number >= 10000) {
        return (number / 1000 + '').slice(0, 5) + 'K';
    }
    return `${number}`;
}

export function percentText(number: number, digits: number = 2) {
    return (100 * number).toFixed(digits) + '%';
}
