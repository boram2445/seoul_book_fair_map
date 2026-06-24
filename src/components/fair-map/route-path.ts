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
 *
 * A/B 분리벽(y≈1893): SVG `Subtract` path 실측 기준.
 *   - 좌측 솔리드: x 120 → 1601
 *   - 중앙 단일 개구부: x 1601 → 2344 (~743px, 부스 장애물이 실제 복도를 자동 형성)
 *   - 우측 솔리드: x 2344 → 2907
 * (구 모델의 가짜 중앙벽 x1794–2201 및 좁은 통로 2개는 SVG에 존재하지 않음)
 */
const wallSegments: WallSegment[] = [
  { x1: 1228, y1: 470,  x2: 1228, y2: 1394 },
  { x1: 1228, y1: 1394, x2: 1602, y2: 1394 },
  { x1: 1602, y1: 1394, x2: 1602, y2: 1894 },
  // A/B 분리벽 — SVG 실측 2구간, 중앙 개구부(x 1601~2344) 1곳
  { x1: 120,  y1: 1893, x2: 1601, y2: 1893 }, // 좌측 솔리드 (실측)
  { x1: 2344, y1: 1893, x2: 2907, y2: 1893 }, // 우측 솔리드 (실측)
  { x1: 2470, y1: 1393, x2: 2957, y2: 1393 },
  { x1: 2470, y1: 1393, x2: 2470, y2: 1750 },
  { x1: 2344, y1: 1750, x2: 2470, y2: 1750 },
  { x1: 2344, y1: 1750, x2: 2344, y2: 1894 },
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

// ─── 보행 가능 영역 마스크 ────────────────────────────────────────────────────

/**
 * 보행 가능 영역(allowlist). 여기에 포함되지 않는 셀은 전부 blocked 처리한다.
 * SVG에는 홀 외곽선이 없어 홀 바깥 흰 여백이 장애물 없는 통로로 취급되는 문제를 차단.
 *
 * 좌표 근거:
 *   R1 Hall A  — 부스 bbox x[193,2823] y[1965,3204] 에 여유(~20px) 추가
 *   R2 Hall B  — 부스 bbox x[1301,2718] y[542,1780]  에 여유 추가
 *   R3 중앙 개구부 — SVG `Subtract` 실측 단일 개구부 x[1601,2344] 를 덮는 밴드;
 *                   개구부 안 부스 장애물이 실제 복도(~73px 간격 복도열)를 자동 형성한다.
 *                   (구 R3 우측 로비: SVG상 우측 횡단 없음, 벽이 x2907까지 솔리드 — 제거)
 *                   (구 R4·R5: 가짜 통로 좌표, Hall A 부스에 잠식 — 단일 밴드로 대체)
 */
const WALKABLE: Rect[] = [
  { x: 170,  y: 1945, width: 2675, height: 1280 }, // R1 Hall A  (x 170~2845, y 1945~3225)
  { x: 1280, y: 520,  width: 1460, height: 1275 }, // R2 Hall B  (x 1280~2740, y 520~1795)
  { x: 1601, y: 1780, width: 743,  height: 185  }, // R3 중앙 개구부 밴드 (x 1601~2344, y 1780~1965)
];

function inWalkable(cx: number, cy: number): boolean {
  for (const r of WALKABLE) {
    if (cx >= r.x && cx <= r.x + r.width && cy >= r.y && cy <= r.y + r.height) return true;
  }
  return false;
}

// 보행 불가 영역(홀 바깥 여백) 차단
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    const cx = c * CELL + CELL / 2;
    const cy = r * CELL + CELL / 2;
    if (!inWalkable(cx, cy)) blocked[r * COLS + c] = 1;
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
  // 벽 세그먼트 정밀 교차 검사 — 격자 DDA 샘플링만으로 잡히지 않는
  // corner-cut을 방지한다. 벽은 0폭 선분 그대로 검사해 개구부를 보존한다.
  for (const seg of wallSegments) {
    if (segmentsIntersect(a, b, { x: seg.x1, y: seg.y1 }, { x: seg.x2, y: seg.y2 })) return false;
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

// ─── 경로 길이 ────────────────────────────────────────────────────────────────

/**
 * 두 격자 셀 인덱스 간 A* 경로 길이(맵 px 단위)를 반환한다.
 * 경로를 찾지 못하면 Infinity.
 */
function pathLength(startI: number, endI: number): number {
  if (startI === endI) return 0;
  const path = findPath(startI, endI);
  if (!path || path.length < 2) return Infinity;
  let len = 0;
  for (let k = 1; k < path.length; k++) {
    const dc = gcol(path[k]) - gcol(path[k - 1]);
    const dr = grow(path[k]) - grow(path[k - 1]);
    len += Math.sqrt(dc * dc + dr * dr) * CELL;
  }
  return len;
}

// ─── 방문 순서 최적화 (TSP 근사, 입구 고정 출발) ─────────────────────────────

/**
 * 전시장 입구 좌표 — SVG 출입구 화살표 기준.
 */
export const HALL_ENTRANCES: Record<"A" | "B", { x: number; y: number }> = {
  A: { x: 2252, y: 3200 }, // A홀 하단 입구 복도 ↑ 화살표 팁
  B: { x: 2953, y: 850 },  // B1홀 우측 출입구 ← → 화살표 중심
};

/**
 * 찜 부스 분포 기반 자동 기본 입구.
 * 부스번호 prefix(`A`/`B`) 카운트 — B가 더 많으면 B, 그 외(동수 포함)는 A.
 */
export function getAutoEntrance(booths: string[]): "A" | "B" {
  let aCount = 0;
  let bCount = 0;
  for (const booth of booths) {
    if (booth.startsWith("A")) aCount++;
    else if (booth.startsWith("B")) bCount++;
  }
  return bCount > aCount ? "B" : "A";
}

/**
 * 부스 번호 배열을 받아 지정 입구에서 출발해 실제 도보 이동거리가 최소가 되는
 * 방문 순서를 **원본 인덱스 순열**로 반환한다.
 *
 * 알고리즘:
 * 1. 입구를 가상 노드 0으로 둔 (n+1)×(n+1) A* 거리 행렬 구성
 * 2. 입구(0)에서 출발하는 최근접 이웃으로 초기 경로 구성
 * 3. 2-opt 개선 (입구는 항상 0번 위치에 고정)
 *
 * 좌표를 알 수 없는 부스(shapes에 없음)는 계산에서 제외하고
 * 원래 순서대로 결과 끝에 덧붙인다.
 */
export function optimizeRouteOrder(
  booths: string[],
  start: { x: number; y: number } = HALL_ENTRANCES.A,
): number[] {
  if (booths.length <= 1) return booths.map((_, i) => i);

  // 부스 → 중심 좌표 매핑
  type BoothEntry = { idx: number; center: { x: number; y: number } | null };
  const entries: BoothEntry[] = booths.map((booth, idx) => {
    const shape = shapes.find((s) => s.boothNumber === booth);
    if (!shape) return { idx, center: null };
    return { idx, center: { x: shape.x + shape.width / 2, y: shape.y + shape.height / 2 } };
  });

  const valid = entries.filter((e): e is BoothEntry & { center: { x: number; y: number } } =>
    e.center !== null,
  );
  const invalid = entries.filter((e) => e.center === null);

  if (valid.length <= 1) return booths.map((_, i) => i);

  const n = valid.length;

  // 격자 스냅 (인덱스 0 = 입구, 1..n = 부스)
  const startSnap = snapToFree(start.x, start.y);
  const boothSnaps = valid.map((e) => snapToFree(e.center.x, e.center.y));

  // 거리 행렬: (n+1)×(n+1)
  const dist: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(n + 1).fill(0));

  // 입구 ↔ 부스
  for (let i = 0; i < n; i++) {
    const astar = pathLength(startSnap, boothSnaps[i]);
    const d =
      astar === Infinity
        ? Math.hypot(start.x - valid[i].center.x, start.y - valid[i].center.y)
        : astar;
    dist[0][i + 1] = d;
    dist[i + 1][0] = d;
  }
  // 부스 ↔ 부스 (상삼각 → 대칭)
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const astar = pathLength(boothSnaps[i], boothSnaps[j]);
      const d =
        astar === Infinity
          ? Math.hypot(
              valid[i].center.x - valid[j].center.x,
              valid[i].center.y - valid[j].center.y,
            )
          : astar;
      dist[i + 1][j + 1] = d;
      dist[j + 1][i + 1] = d;
    }
  }

  // 최근접 이웃 — 입구(0)에서 출발, greedy로 부스 1..n 순회
  const visited = new Set<number>([0]);
  const path = [0];
  while (path.length < n + 1) {
    const last = path[path.length - 1];
    let best = -1;
    let bestD = Infinity;
    for (let j = 1; j <= n; j++) {
      if (!visited.has(j) && dist[last][j] < bestD) {
        bestD = dist[last][j];
        best = j;
      }
    }
    if (best === -1) break;
    visited.add(best);
    path.push(best);
  }

  // 2-opt 개선 (path[0] = 0 입구 항상 고정)
  let improved = true;
  while (improved) {
    improved = false;
    outer: for (let i = 0; i < n; i++) {
      for (let j = i + 2; j <= n; j++) {
        const edgeBefore =
          dist[path[i]][path[i + 1]] + (j + 1 <= n ? dist[path[j]][path[j + 1]] : 0);
        const edgeAfter =
          dist[path[i]][path[j]] + (j + 1 <= n ? dist[path[i + 1]][path[j + 1]] : 0);
        if (edgeAfter < edgeBefore - 1e-6) {
          // [i+1 .. j] 구간 역순
          let lo = i + 1;
          let hi = j;
          while (lo < hi) {
            [path[lo], path[hi]] = [path[hi], path[lo]];
            lo++;
            hi--;
          }
          improved = true;
          break outer;
        }
      }
    }
  }

  // 입구 노드(0) 제거 후 부스 인덱스 순열 (1..n → 0..n-1) 로 변환
  const result = path.slice(1).map((node) => valid[node - 1].idx);
  // 좌표 없는 부스는 끝에 원래 순서대로 추가
  for (const e of invalid) result.push(e.idx);
  return result;
}

// ─── A/B 분리벽 통로 정보 ────────────────────────────────────────────────────

/** A/B 분리벽 y좌표 (실측). */
const DIVIDER_Y = 1893;

/**
 * 분리벽 중앙 개구부(x 1601~2344) 안에서 부스와 겹치지 않는 통로 x 중심.
 * 격자 A* 폴백이 실패할 경우 최후 경유점으로 사용한다.
 * (부스 복도 실측: x≈1616~1689, 1799~1875, 1990~2063 등 — 그 중심을 선택)
 */
const DIVIDER_PASSAGE_FALLBACK = { x: 1840, y: DIVIDER_Y }; // x1799~1875 복도 중심

/**
 * A* 실패 폴백용 — 직선을 그리지 않고 반드시 격자 위에서 경로를 찾는다.
 *
 * 같은 홀이면: to 로 다시 A* 1단계 (이미 실패했으므로 null 반환 → 구간 생략).
 * 반대 홀이면: 분리벽 개구부 밴드 안의 통로 셀을 경유지로 삼아 A* 2단계 시도.
 *             경유지 스냅이 성공하면 [from→경유→to] A* 경로 셀 목록을 반환.
 *             그래도 실패하면 null 반환 → 구간 생략(직선 절대 미출력).
 */
function fallbackViaGrid(
  fromSnap: number,
  toSnap: number,
  from: { x: number; y: number },
  to: { x: number; y: number },
): { x: number; y: number }[] | null {
  const fromBelow = from.y > DIVIDER_Y;
  const toBelow = to.y > DIVIDER_Y;

  if (fromBelow === toBelow) {
    // 같은 홀 — 이미 A* 실패한 구간이므로 null(생략)
    return null;
  }

  // 반대 홀 — 개구부 밴드 안 경유 셀을 찾아 2단계 A* 시도
  // from 측 x를 clamp해 개구부 범위(1601~2344) 안에 경유점 배치
  const clampedX = Math.max(1620, Math.min(2324, from.x));
  const viaY = fromBelow ? DIVIDER_Y - 60 : DIVIDER_Y + 60; // 벽 하중 쪽으로 살짝 오프셋
  const viaSnap = snapToFree(clampedX, viaY);
  // clamped 위치가 개구부 밖으로 스냅되면 고정 경유점 사용
  const fallbackViaSnap = snapToFree(DIVIDER_PASSAGE_FALLBACK.x, viaY);
  const via = viaSnap !== fromSnap && viaSnap !== toSnap ? viaSnap : fallbackViaSnap;

  const seg1 = findPath(fromSnap, via);
  if (!seg1 || seg1.length < 1) return null;
  const seg2 = findPath(via, toSnap);
  if (!seg2 || seg2.length < 1) return null;

  // 두 구간 합치기 (중복 경유 셀 제거)
  const combined = [...seg1, ...seg2.slice(1)];
  const pulled = stringPull(combined);
  return pulled.map(cellCenter);
}

// ─── 메인 익스포트 ────────────────────────────────────────────────────────────

/**
 * 찜 부스 순서대로 통로를 따라 우회하는 경로를 반환한다.
 * SVG polyline의 points로 바로 쓸 수 있는 {x, y}[] 배열.
 * 경로를 찾지 못한 구간은 격자 A* 우회(개구부 경유)를 시도하고, 그래도 실패하면 구간을 생략한다.
 *
 * @param start 출발 입구 좌표(`HALL_ENTRANCES[key]`). 지정 시 폴리라인이 입구에서 시작한다.
 */
export function buildRoute(
  boothSequence: string[],
  start?: { x: number; y: number },
): { x: number; y: number }[] {
  if (boothSequence.length < 2) return [];

  const boothCenters = boothSequence
    .map((booth) => {
      const shape = shapes.find((s) => s.boothNumber === booth);
      return shape ? { x: shape.x + shape.width / 2, y: shape.y + shape.height / 2 } : null;
    })
    .filter((c): c is { x: number; y: number } => c !== null);

  if (boothCenters.length < 2) return [];

  // 입구가 주어지면 출발점으로 prepend
  const centers = start ? [start, ...boothCenters] : boothCenters;

  const all: { x: number; y: number }[] = [centers[0]];

  for (let i = 0; i < centers.length - 1; i++) {
    const fromSnap = snapToFree(centers[i].x, centers[i].y);
    const toSnap = snapToFree(centers[i + 1].x, centers[i + 1].y);
    const rawPath = findPath(fromSnap, toSnap);

    if (!rawPath || rawPath.length < 2) {
      // 경로 없음 → 격자 위에서만 우회(직선 절대 미출력). 그래도 실패하면 구간 생략.
      const fallback = fallbackViaGrid(fromSnap, toSnap, centers[i], centers[i + 1]);
      if (fallback) {
        for (const wp of fallback) all.push(wp);
        all.push(centers[i + 1]);
      }
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
