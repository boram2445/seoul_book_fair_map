/**
 * A* 기반 전시장 경로 탐색 유틸
 * 부스 사각형을 장애물로 둔 격자에서 A*로 통로를 따라 우회 경로를 계산한다.
 */

import { shapes } from "./map-data";

export const MAP_WIDTH = 3230;
export const MAP_HEIGHT = 3650;

// ─── 격자 설정 ────────────────────────────────────────────────────────────────

/** 셀 크기(map px). 부스 내벽 간격(~5px)은 막고, 실제 통로(≥30px)는 열어둔다. */
const CELL = 15;
const COLS = Math.ceil(MAP_WIDTH / CELL);
const ROWS = Math.ceil(MAP_HEIGHT / CELL);
const BOOTH_BUFFER = CELL * 0.75;
const WALL_BUFFER = CELL * 0.75;

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type WallSegment = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

/**
 * 배경 SVG의 Hall A/B 외곽선(Subtract path) 중 통행을 막는 실제 벽 구간.
 * 부스 데이터에는 없는 선이라 경로 탐색용 장애물로 별도 반영한다.
 */
const wallSegments: WallSegment[] = [
  { x1: 1228, y1: 470, x2: 1228, y2: 1394 },
  { x1: 1228, y1: 1394, x2: 1602, y2: 1394 },
  { x1: 1602, y1: 1394, x2: 1602, y2: 1894 },
  { x1: 120, y1: 1893, x2: 1602, y2: 1893 },
  { x1: 2470, y1: 1393, x2: 2957, y2: 1393 },
  { x1: 2470, y1: 1393, x2: 2470, y2: 1750 },
  { x1: 2344, y1: 1750, x2: 2470, y2: 1750 },
  { x1: 2344, y1: 1750, x2: 2344, y2: 1894 },
  { x1: 2344, y1: 1893, x2: 2907, y2: 1893 },
];

/**
 * 셀 막힘 여부 — 셀 중심이 부스 안이면 1(blocked).
 * 모듈 로드 시 1회 생성 (정적 데이터이므로 캐싱).
 */
const blocked = new Uint8Array(COLS * ROWS);

function getShapeObstacleRect(shape: Rect): Rect {
  return {
    x: shape.x - BOOTH_BUFFER,
    y: shape.y - BOOTH_BUFFER,
    width: shape.width + BOOTH_BUFFER * 2,
    height: shape.height + BOOTH_BUFFER * 2,
  };
}

for (const shape of shapes) {
  const obstacle = getShapeObstacleRect(shape);
  const c0 = Math.max(0, Math.floor(obstacle.x / CELL));
  const c1 = Math.min(COLS - 1, Math.ceil((obstacle.x + obstacle.width) / CELL));
  const r0 = Math.max(0, Math.floor(obstacle.y / CELL));
  const r1 = Math.min(ROWS - 1, Math.ceil((obstacle.y + obstacle.height) / CELL));
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const cx = c * CELL + CELL / 2;
      const cy = r * CELL + CELL / 2;
      if (
        cx >= obstacle.x &&
        cx < obstacle.x + obstacle.width &&
        cy >= obstacle.y &&
        cy < obstacle.y + obstacle.height
      ) {
        blocked[r * COLS + c] = 1;
      }
    }
  }
}

function distanceToSegment(px: number, py: number, segment: WallSegment): number {
  const vx = segment.x2 - segment.x1;
  const vy = segment.y2 - segment.y1;
  const wx = px - segment.x1;
  const wy = py - segment.y1;
  const lenSq = vx * vx + vy * vy;
  const t = lenSq === 0 ? 0 : clamp((wx * vx + wy * vy) / lenSq, 0, 1);
  const x = segment.x1 + vx * t;
  const y = segment.y1 + vy * t;
  return Math.hypot(px - x, py - y);
}

function pointInRect(px: number, py: number, rect: Rect): boolean {
  return px >= rect.x && px <= rect.x + rect.width && py >= rect.y && py <= rect.y + rect.height;
}

function orientation(ax: number, ay: number, bx: number, by: number, cx: number, cy: number): number {
  return (by - ay) * (cx - bx) - (bx - ax) * (cy - by);
}

function onSegment(ax: number, ay: number, bx: number, by: number, cx: number, cy: number): boolean {
  return (
    bx >= Math.min(ax, cx) &&
    bx <= Math.max(ax, cx) &&
    by >= Math.min(ay, cy) &&
    by <= Math.max(ay, cy)
  );
}

function segmentsIntersect(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number },
  d: { x: number; y: number },
): boolean {
  const o1 = orientation(a.x, a.y, b.x, b.y, c.x, c.y);
  const o2 = orientation(a.x, a.y, b.x, b.y, d.x, d.y);
  const o3 = orientation(c.x, c.y, d.x, d.y, a.x, a.y);
  const o4 = orientation(c.x, c.y, d.x, d.y, b.x, b.y);

  if (o1 === 0 && onSegment(a.x, a.y, c.x, c.y, b.x, b.y)) return true;
  if (o2 === 0 && onSegment(a.x, a.y, d.x, d.y, b.x, b.y)) return true;
  if (o3 === 0 && onSegment(c.x, c.y, a.x, a.y, d.x, d.y)) return true;
  if (o4 === 0 && onSegment(c.x, c.y, b.x, b.y, d.x, d.y)) return true;

  return (o1 > 0) !== (o2 > 0) && (o3 > 0) !== (o4 > 0);
}

function segmentIntersectsRect(a: { x: number; y: number }, b: { x: number; y: number }, rect: Rect): boolean {
  if (pointInRect(a.x, a.y, rect) || pointInRect(b.x, b.y, rect)) return true;

  const topLeft = { x: rect.x, y: rect.y };
  const topRight = { x: rect.x + rect.width, y: rect.y };
  const bottomRight = { x: rect.x + rect.width, y: rect.y + rect.height };
  const bottomLeft = { x: rect.x, y: rect.y + rect.height };

  return (
    segmentsIntersect(a, b, topLeft, topRight) ||
    segmentsIntersect(a, b, topRight, bottomRight) ||
    segmentsIntersect(a, b, bottomRight, bottomLeft) ||
    segmentsIntersect(a, b, bottomLeft, topLeft)
  );
}

for (const segment of wallSegments) {
  const minX = Math.min(segment.x1, segment.x2) - WALL_BUFFER;
  const maxX = Math.max(segment.x1, segment.x2) + WALL_BUFFER;
  const minY = Math.min(segment.y1, segment.y2) - WALL_BUFFER;
  const maxY = Math.max(segment.y1, segment.y2) + WALL_BUFFER;
  const c0 = Math.max(0, Math.floor(minX / CELL));
  const c1 = Math.min(COLS - 1, Math.ceil(maxX / CELL));
  const r0 = Math.max(0, Math.floor(minY / CELL));
  const r1 = Math.min(ROWS - 1, Math.ceil(maxY / CELL));
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const cx = c * CELL + CELL / 2;
      const cy = r * CELL + CELL / 2;
      if (distanceToSegment(cx, cy, segment) <= WALL_BUFFER) {
        blocked[r * COLS + c] = 1;
      }
    }
  }
}

// ─── 격자 유틸 ───────────────────────────────────────────────────────────────

function gi(c: number, r: number) {
  return r * COLS + c;
}
function gcol(i: number) {
  return i % COLS;
}
function grow(i: number) {
  return Math.floor(i / COLS);
}
function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v;
}

// ─── 가장 가까운 빈 셀 탐색 (BFS) ────────────────────────────────────────────

/**
 * 부스 중심은 blocked 셀이므로, BFS로 가장 가까운 빈 셀을 찾아 반환한다.
 * A*의 시작·도착점을 통로 위로 스냅하는 데 사용한다.
 */
function snapToFree(mapX: number, mapY: number): number {
  const c0 = clamp(Math.floor(mapX / CELL), 0, COLS - 1);
  const r0 = clamp(Math.floor(mapY / CELL), 0, ROWS - 1);
  if (!blocked[gi(c0, r0)]) return gi(c0, r0);

  const queue: [number, number][] = [[c0, r0]];
  const seen = new Set<number>([gi(c0, r0)]);
  while (queue.length > 0) {
    const [c, r] = queue.shift()!;
    for (const [dc, dr] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
      const nc = c + dc, nr = r + dr;
      if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) continue;
      const ni = gi(nc, nr);
      if (seen.has(ni)) continue;
      seen.add(ni);
      if (!blocked[ni]) return ni;
      queue.push([nc, nr]);
    }
  }
  return gi(c0, r0);
}

// ─── A* 우선순위 큐 (이진 최소 힙) ───────────────────────────────────────────

class MinHeap {
  private data: [number, number][] = []; // [f-value, cell-index]

  get size() {
    return this.data.length;
  }

  push(f: number, i: number) {
    this.data.push([f, i]);
    let k = this.data.length - 1;
    while (k > 0) {
      const p = (k - 1) >> 1;
      if (this.data[p][0] <= this.data[k][0]) break;
      [this.data[p], this.data[k]] = [this.data[k], this.data[p]];
      k = p;
    }
  }

  pop(): [number, number] | undefined {
    if (!this.data.length) return undefined;
    const top = this.data[0];
    const last = this.data.pop()!;
    if (this.data.length > 0) {
      this.data[0] = last;
      let k = 0;
      while (true) {
        const l = 2 * k + 1;
        const r = 2 * k + 2;
        let min = k;
        if (l < this.data.length && this.data[l][0] < this.data[min][0]) min = l;
        if (r < this.data.length && this.data[r][0] < this.data[min][0]) min = r;
        if (min === k) break;
        [this.data[min], this.data[k]] = [this.data[k], this.data[min]];
        k = min;
      }
    }
    return top;
  }
}

// ─── 8방향 이웃 셀 ───────────────────────────────────────────────────────────

const DIRS: [number, number, number][] = [
  [-1, 0, 1],
  [1, 0, 1],
  [0, -1, 1],
  [0, 1, 1],
  [-1, -1, Math.SQRT2],
  [1, -1, Math.SQRT2],
  [-1, 1, Math.SQRT2],
  [1, 1, Math.SQRT2],
];

function getNeighbors(i: number): [number, number][] {
  const c = gcol(i);
  const r = grow(i);
  const result: [number, number][] = [];
  for (const [dc, dr, cost] of DIRS) {
    const nc = c + dc;
    const nr = r + dr;
    if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS || blocked[gi(nc, nr)]) continue;
    if (dc !== 0 && dr !== 0 && (blocked[gi(c + dc, r)] || blocked[gi(c, r + dr)])) continue;
    result.push([gi(nc, nr), cost]);
  }
  return result;
}

// ─── A* 경로 탐색 ────────────────────────────────────────────────────────────

/** Chebyshev 거리 휴리스틱 (8방향 이동에 정확) */
function heuristic(i: number, goal: number): number {
  return Math.max(Math.abs(gcol(i) - gcol(goal)), Math.abs(grow(i) - grow(goal)));
}

function findPath(startI: number, endI: number): number[] | null {
  if (startI === endI) return [startI];

  const gScore = new Map<number, number>([[startI, 0]]);
  const cameFrom = new Map<number, number>();
  const heap = new MinHeap();
  heap.push(heuristic(startI, endI), startI);
  const closed = new Set<number>();

  while (heap.size > 0) {
    const [, current] = heap.pop()!;
    if (current === endI) {
      const path = [current];
      let node = current;
      while (cameFrom.has(node)) {
        node = cameFrom.get(node)!;
        path.unshift(node);
      }
      return path;
    }
    if (closed.has(current)) continue;
    closed.add(current);
    for (const [ni, cost] of getNeighbors(current)) {
      if (closed.has(ni)) continue;
      const tentG = (gScore.get(current) ?? Infinity) + cost;
      if (tentG < (gScore.get(ni) ?? Infinity)) {
        cameFrom.set(ni, current);
        gScore.set(ni, tentG);
        heap.push(tentG + heuristic(ni, endI), ni);
      }
    }
  }
  return null;
}

// ─── 경로 단순화 (가시선 기반 string-pulling) ────────────────────────────────

/** 두 셀 사이의 가시선(line-of-sight)이 막히지 않으면 true */
function hasLOS(aI: number, bI: number): boolean {
  const ac = gcol(aI);
  const ar = grow(aI);
  const bc = gcol(bI);
  const br = grow(bI);
  const dc = bc - ac;
  const dr = br - ar;
  const steps = Math.max(Math.abs(dc), Math.abs(dr));
  if (steps === 0) return true;
  for (let t = 1; t < steps; t++) {
    const c = Math.round(ac + (dc * t) / steps);
    const r = Math.round(ar + (dr * t) / steps);
    if (blocked[gi(c, r)]) return false;
  }

  const a = cellCenter(aI);
  const b = cellCenter(bI);
  for (const shape of shapes) {
    if (segmentIntersectsRect(a, b, getShapeObstacleRect(shape))) return false;
  }

  return true;
}

/** 불필요한 중간 노드 제거 — 가시선이 닿으면 건너뜀 */
function stringPull(path: number[]): number[] {
  if (path.length <= 2) return path;
  const result = [path[0]];
  let anchor = 0;
  for (let i = 2; i < path.length; i++) {
    if (!hasLOS(path[anchor], path[i])) {
      result.push(path[i - 1]);
      anchor = i - 1;
    }
  }
  result.push(path[path.length - 1]);
  return result;
}

function cellCenter(i: number): { x: number; y: number } {
  return { x: gcol(i) * CELL + CELL / 2, y: grow(i) * CELL + CELL / 2 };
}

// ─── 메인 익스포트 ────────────────────────────────────────────────────────────

/**
 * 찜 부스 순서대로 통로를 따라 우회하는 경로를 반환한다.
 * SVG polyline의 points로 바로 쓸 수 있는 {x, y}[] 배열.
 * 경로를 찾지 못한 구간은 직선으로 폴백한다.
 */
export function buildRoute(boothSequence: string[]): { x: number; y: number }[] {
  if (boothSequence.length < 2) return [];

  const centers = boothSequence
    .map((booth) => {
      const shape = shapes.find((s) => s.boothNumber === booth);
      return shape ? { x: shape.x + shape.width / 2, y: shape.y + shape.height / 2 } : null;
    })
    .filter((c): c is { x: number; y: number } => c !== null);

  if (centers.length < 2) return [];

  const all: { x: number; y: number }[] = [centers[0]];

  for (let i = 0; i < centers.length - 1; i++) {
    const fromSnap = snapToFree(centers[i].x, centers[i].y);
    const toSnap = snapToFree(centers[i + 1].x, centers[i + 1].y);
    const rawPath = findPath(fromSnap, toSnap);

    if (!rawPath || rawPath.length < 2) {
      // 경로 없음 → 직선 폴백
      all.push(centers[i + 1]);
      continue;
    }

    const simplified = stringPull(rawPath);
    // 실제 부스 중심 전후에 스냅 지점을 포함해 중심선이 벽을 가로지르지 않게 한다.
    for (let j = 0; j < simplified.length; j++) {
      all.push(cellCenter(simplified[j]));
    }
    all.push(centers[i + 1]);
  }

  return all;
}
