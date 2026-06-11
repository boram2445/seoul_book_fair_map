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

/**
 * 셀 막힘 여부 — 셀 중심이 부스 안이면 1(blocked).
 * 모듈 로드 시 1회 생성 (정적 데이터이므로 캐싱).
 */
const blocked = new Uint8Array(COLS * ROWS);

for (const shape of shapes) {
  const c0 = Math.max(0, Math.floor(shape.x / CELL));
  const c1 = Math.min(COLS - 1, Math.ceil((shape.x + shape.width) / CELL));
  const r0 = Math.max(0, Math.floor(shape.y / CELL));
  const r1 = Math.min(ROWS - 1, Math.ceil((shape.y + shape.height) / CELL));
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const cx = c * CELL + CELL / 2;
      const cy = r * CELL + CELL / 2;
      if (
        cx >= shape.x &&
        cx < shape.x + shape.width &&
        cy >= shape.y &&
        cy < shape.y + shape.height
      ) {
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
    if (nc >= 0 && nc < COLS && nr >= 0 && nr < ROWS && !blocked[gi(nc, nr)]) {
      result.push([gi(nc, nr), cost]);
    }
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
    // 첫 점은 이미 추가됨, 중간 꺾임점 추가, 마지막은 실제 부스 중심으로 교체
    for (let j = 1; j < simplified.length - 1; j++) {
      all.push(cellCenter(simplified[j]));
    }
    all.push(centers[i + 1]);
  }

  return all;
}
