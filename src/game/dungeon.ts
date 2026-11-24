import {
  BiomeId,
  ChoppableTree,
  DungeonState,
  EnemyEntity,
  EnemyKind,
  RoomRect,
  TileType,
  TrapEntity,
} from './types';

export const TILE_SIZE = 32;

let idCounter = 1;
export function nextId(prefix = 'e'): string {
  idCounter += 1;
  return `${prefix}_${idCounter}_${Math.random().toString(36).slice(2, 6)}`;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const BIOME_LIST: BiomeId[] = ['rotten_forest', 'durian_swamp', 'ice_crypt'];

export function pickRandomBiome(prevBiome?: BiomeId): BiomeId {
  const pool = prevBiome ? BIOME_LIST.filter((b) => b !== prevBiome) : BIOME_LIST;
  return pool[Math.floor(Math.random() * pool.length)];
}

function makeEnemy(
  kind: EnemyKind,
  x: number,
  y: number,
  roomId: number,
  floor: number,
  isMiniBoss = false
): EnemyEntity {
  const scale = Math.pow(1.1, floor - 1);
  const dotDefaults = {
    poisonTimer: 0,
    poisonDps: 0,
    burnTimer: 0,
    burnDps: 0,
    isMiniBoss,
  };

  if (isMiniBoss) {
    return {
      id: nextId('elite'),
      kind,
      name: `Elite Rimba Lv.${floor}`,
      x,
      y,
      vx: 0,
      vy: 0,
      radius: 21,
      hp: Math.round(230 * scale),
      maxHp: Math.round(230 * scale),
      speed: 98 + floor * 3,
      damage: Math.round(19 * scale),
      roomId,
      patrolOriginX: x,
      patrolOriginY: y,
      patrolTargetX: x,
      patrolTargetY: y,
      patrolWait: 0.1,
      alerted: false,
      attackCooldown: 1.0,
      windupTimer: 0,
      windupKind: 'none',
      facingX: 1,
      hitFlash: 0,
      freezeTimer: 0,
      animTime: 0,
      phase: 1,
      expReward: 95,
      ...dotDefaults,
    };
  }

  switch (kind) {
    case 'wood_slime':
      return {
        id: nextId('slime'),
        kind,
        name: 'Slime Kayu',
        x,
        y,
        vx: 0,
        vy: 0,
        radius: 13,
        hp: Math.round(42 * scale),
        maxHp: Math.round(42 * scale),
        speed: 84 + floor * 4,
        damage: Math.round(11 * scale),
        roomId,
        patrolOriginX: x,
        patrolOriginY: y,
        patrolTargetX: x,
        patrolTargetY: y,
        patrolWait: 0.12,
        alerted: false,
        attackCooldown: 0.85,
        windupTimer: 0,
        windupKind: 'none',
        facingX: 1,
        hitFlash: 0,
        freezeTimer: 0,
        animTime: Math.random() * 4,
        phase: 1,
        expReward: 20,
        ...dotDefaults,
      };
    case 'thorn_slime':
      return {
        id: nextId('tslime'),
        kind,
        name: 'Slime Duri',
        x,
        y,
        vx: 0,
        vy: 0,
        radius: 14,
        hp: Math.round(56 * scale),
        maxHp: Math.round(56 * scale),
        speed: 72 + floor * 3,
        damage: Math.round(14 * scale),
        roomId,
        patrolOriginX: x,
        patrolOriginY: y,
        patrolTargetX: x,
        patrolTargetY: y,
        patrolWait: 0.15,
        alerted: false,
        attackCooldown: 1.4,
        windupTimer: 0,
        windupKind: 'none',
        facingX: 1,
        hitFlash: 0,
        freezeTimer: 0,
        animTime: Math.random() * 4,
        phase: 1,
        expReward: 28,
        ...dotDefaults,
      };
    case 'goblin_scout':
      return {
        id: nextId('gscout'),
        kind,
        name: 'Goblin Pemburu',
        x,
        y,
        vx: 0,
        vy: 0,
        radius: 13,
        hp: Math.round(52 * scale),
        maxHp: Math.round(52 * scale),
        speed: 112 + floor * 5,
        damage: Math.round(15 * scale),
        roomId,
        patrolOriginX: x,
        patrolOriginY: y,
        patrolTargetX: x,
        patrolTargetY: y,
        patrolWait: 0.12,
        alerted: false,
        attackCooldown: 1.0,
        windupTimer: 0,
        windupKind: 'none',
        facingX: 1,
        hitFlash: 0,
        freezeTimer: 0,
        animTime: Math.random() * 4,
        phase: 1,
        expReward: 27,
        ...dotDefaults,
      };
    case 'goblin_slinger':
      return {
        id: nextId('gsling'),
        kind,
        name: 'Goblin Pelontar',
        x,
        y,
        vx: 0,
        vy: 0,
        radius: 13,
        hp: Math.round(44 * scale),
        maxHp: Math.round(44 * scale),
        speed: 90 + floor * 4,
        damage: Math.round(13 * scale),
        roomId,
        patrolOriginX: x,
        patrolOriginY: y,
        patrolTargetX: x,
        patrolTargetY: y,
        patrolWait: 0.15,
        alerted: false,
        attackCooldown: 1.45,
        windupTimer: 0,
        windupKind: 'none',
        facingX: 1,
        hitFlash: 0,
        freezeTimer: 0,
        animTime: Math.random() * 4,
        phase: 1,
        expReward: 30,
        ...dotDefaults,
      };
    case 'boss_treant': {
      const isMegaBoss = floor % 5 === 0;
      const bossHp = Math.round(480 * scale * (isMegaBoss ? 3 : 1));
      return {
        id: nextId('boss'),
        kind,
        name: isMegaBoss
          ? `Raja Treant Agung Lv.${floor}`
          : floor > 1
          ? `Raja Treant Purba Lv.${floor}`
          : 'Raja Treant Terkutuk',
        x,
        y,
        vx: 0,
        vy: 0,
        radius: 30,
        hp: bossHp,
        maxHp: bossHp,
        speed: 66 + floor * 4,
        damage: Math.round(23 * scale),
        roomId,
        patrolOriginX: x,
        patrolOriginY: y,
        patrolTargetX: x,
        patrolTargetY: y,
        patrolWait: 0.1,
        alerted: false,
        attackCooldown: 1.45,
        windupTimer: 0,
        windupKind: 'none',
        facingX: 1,
        hitFlash: 0,
        freezeTimer: 0,
        animTime: 0,
        phase: 1,
        expReward: isMegaBoss ? 340 : 180,
        ...dotDefaults,
      };
    }
    case 'boss_durian': {
      const bossHp = Math.round(480 * scale * 2.5);
      return {
        id: nextId('durian'),
        kind,
        name: 'DURIAN RAKSAK',
        x,
        y,
        vx: 0,
        vy: 0,
        radius: 32,
        hp: bossHp,
        maxHp: bossHp,
        speed: 48 + floor * 2,
        damage: Math.round(25 * scale),
        roomId,
        patrolOriginX: x,
        patrolOriginY: y,
        patrolTargetX: x,
        patrolTargetY: y,
        patrolWait: 0.1,
        alerted: false,
        attackCooldown: 1.4,
        windupTimer: 0,
        windupKind: 'none',
        facingX: 1,
        hitFlash: 0,
        freezeTimer: 0,
        animTime: 0,
        phase: 1,
        expReward: 360,
        spinAngle: 0,
        ...dotDefaults,
      };
    }
  }
}

export function spawnEnemyInRoom(
  kind: EnemyKind,
  x: number,
  y: number,
  roomId: number,
  floor: number
): EnemyEntity {
  return makeEnemy(kind, x, y, roomId, floor, false);
}

export function generateDungeon(floor: number, prevBiome?: BiomeId): DungeonState {
  const biome = pickRandomBiome(prevBiome);

  // 4x3 Random Maze grid -> randomized chambers + winding corridors + internal maze walls
  const cols = 4;
  const rows = 3;
  const cellW = 20;
  const cellH = 17;
  const width = cols * cellW + 4; // 84 tiles
  const height = rows * cellH + 4; // 55 tiles

  const tiles: TileType[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => 0 as TileType)
  );

  // 1. Randomized DFS Maze spanning 4x3 cells
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  const adj: Array<Array<number>> = Array.from({ length: cols * rows }, () => []);
  const cellId = (gx: number, gy: number) => gy * cols + gx;

  const startGx = 0;
  const startGy = randInt(0, rows - 1);
  const stack: Array<[number, number]> = [[startGx, startGy]];
  visited[startGy][startGx] = true;

  while (stack.length > 0) {
    const [cx, cy] = stack[stack.length - 1];
    const neighbors: Array<[number, number]> = [];
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    for (const [dx, dy] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx >= 0 && nx < cols && ny >= 0 && ny < rows && !visited[ny][nx]) {
        neighbors.push([nx, ny]);
      }
    }
    if (neighbors.length === 0) {
      stack.pop();
    } else {
      const [nx, ny] = neighbors[Math.floor(Math.random() * neighbors.length)];
      visited[ny][nx] = true;
      const a = cellId(cx, cy);
      const b = cellId(nx, ny);
      adj[a].push(b);
      adj[b].push(a);
      stack.push([nx, ny]);
    }
  }

  // Add 2 extra maze loop corridors so routing feels rich like Dead Cells
  let extraLoops = 2;
  for (let attempts = 0; attempts < 20 && extraLoops > 0; attempts++) {
    const gx = randInt(0, cols - 1);
    const gy = randInt(0, rows - 1);
    const nx = gx + (Math.random() < 0.5 ? 1 : 0);
    const ny = nx === gx ? gy + 1 : gy;
    if (nx < cols && ny < rows) {
      const a = cellId(gx, gy);
      const b = cellId(nx, ny);
      if (!adj[a].includes(b)) {
        adj[a].push(b);
        adj[b].push(a);
        extraLoops -= 1;
      }
    }
  }

  // 2. BFS from start cell to find farthest cell for Boss Room
  const startIdx = cellId(startGx, startGy);
  const distMap = Array(cols * rows).fill(-1);
  const q: number[] = [startIdx];
  distMap[startIdx] = 0;
  while (q.length > 0) {
    const u = q.shift()!;
    for (const v of adj[u]) {
      if (distMap[v] === -1) {
        distMap[v] = distMap[u] + 1;
        q.push(v);
      }
    }
  }

  let bossIdx = startIdx;
  let maxDist = -1;
  for (let i = 0; i < distMap.length; i++) {
    if (distMap[i] > maxDist) {
      maxDist = distMap[i];
      bossIdx = i;
    }
  }

  // Pick 1 shrine & 1 timber chamber from remaining non-start, non-boss cells
  const otherCells = Array.from({ length: cols * rows }, (_, i) => i).filter(
    (i) => i !== startIdx && i !== bossIdx
  );
  // Prefer dead-ends for shrine
  const deadEnds = otherCells.filter((i) => adj[i].length === 1);
  const shrineIdx =
    deadEnds.length > 0
      ? deadEnds[Math.floor(Math.random() * deadEnds.length)]
      : otherCells[0];
  const timberPool = otherCells.filter((i) => i !== shrineIdx);
  const timberIdx = timberPool[Math.floor(Math.random() * timberPool.length)];

  // 3. Carve rooms inside each cell with randomized dimensions
  const rooms: RoomRect[] = [];
  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      const id = cellId(gx, gy);
      const kind: RoomRect['kind'] =
        id === startIdx
          ? 'start'
          : id === bossIdx
          ? 'boss'
          : id === shrineIdx
          ? 'shrine'
          : id === timberIdx
          ? 'timber'
          : 'combat';

      const w = kind === 'boss' ? 16 : kind === 'start' ? 11 : randInt(12, 16);
      const h = kind === 'boss' ? 14 : kind === 'start' ? 10 : randInt(10, 13);
      const baseX = gx * cellW + 2;
      const baseY = gy * cellH + 2;
      const ox = Math.max(2, baseX + Math.floor((cellW - w) / 2) + randInt(-1, 1));
      const oy = Math.max(2, baseY + Math.floor((cellH - h) / 2) + randInt(-1, 1));

      rooms.push({
        id,
        x: ox,
        y: oy,
        w,
        h,
        kind,
        cleared: kind === 'start' || kind === 'shrine',
        discovered: kind === 'start',
      });
    }
  }

  // Carve room floors + corner torches
  for (const r of rooms) {
    for (let y = r.y; y < r.y + r.h; y++) {
      for (let x = r.x; x < r.x + r.w; x++) {
        tiles[y][x] = 1;
      }
    }
    if (r.w >= 10 && r.h >= 8) {
      tiles[r.y + 1][r.x + 1] = 3;
      tiles[r.y + 1][r.x + r.w - 2] = 3;
      tiles[r.y + r.h - 2][r.x + 1] = 3;
      tiles[r.y + r.h - 2][r.x + r.w - 2] = 3;
    }
  }

  // 4. Carve maze corridors between connected cells + place tree barricades
  const trees: ChoppableTree[] = [];
  const treeTileKeys = new Set<string>();
  const corridorCenters: Array<{ x: number; y: number; horizontal: boolean }> = [];

  const addTree = (
    tx: number,
    ty: number,
    variant: ChoppableTree['variant'],
    blocksPath: boolean
  ) => {
    const key = `${tx},${ty}`;
    if (treeTileKeys.has(key)) return;
    if (tiles[ty]?.[tx] !== 1) return;
    treeTileKeys.add(key);
    const maxHp =
      variant === 'crate'
        ? 24
        : variant === 'elder'
        ? 70 + floor * 14
        : 38 + floor * 9;
    trees.push({
      id: nextId('tree'),
      tx,
      ty,
      x: tx * TILE_SIZE + TILE_SIZE / 2,
      y: ty * TILE_SIZE + TILE_SIZE / 2,
      hp: maxHp,
      maxHp,
      variant,
      hitFlash: 0,
      shakeTimer: 0,
      blocksPath,
    });
  };

  const carvedEdges = new Set<string>();
  for (let u = 0; u < adj.length; u++) {
    for (const v of adj[u]) {
      const eKey = u < v ? `${u}-${v}` : `${v}-${u}`;
      if (carvedEdges.has(eKey)) continue;
      carvedEdges.add(eKey);

      const a = rooms[u];
      const b = rooms[v];
      const ax = Math.floor(a.x + a.w / 2);
      const ay = Math.floor(a.y + a.h / 2);
      const bx = Math.floor(b.x + b.w / 2);
      const by = Math.floor(b.y + b.h / 2);

      // L-shaped maze corridor (width 3 tiles so combat & dodging stay crisp)
      const xMin = Math.min(ax, bx);
      const xMax = Math.max(ax, bx);
      for (let x = xMin; x <= xMax; x++) {
        for (let dy = -1; dy <= 1; dy++) {
          tiles[ay + dy][x] = 1;
        }
      }
      const yMin = Math.min(ay, by);
      const yMax = Math.max(ay, by);
      for (let y = yMin; y <= yMax; y++) {
        for (let dx = -1; dx <= 1; dx++) {
          tiles[y][bx + dx] = 1;
        }
      }

      const horizontal = Math.abs(ax - bx) >= Math.abs(ay - by);
      const midX = horizontal ? Math.floor((ax + bx) / 2) : bx;
      const midY = horizontal ? ay : Math.floor((ay + by) / 2);
      corridorCenters.push({ x: midX, y: midY, horizontal });

      const barricade =
        a.kind === 'boss' ||
        b.kind === 'boss' ||
        a.kind === 'start' ||
        b.kind === 'start' ||
        Math.random() < 0.55;
      if (barricade) {
        const variant = a.kind === 'boss' || b.kind === 'boss' ? 'elder' : 'pine';
        if (horizontal) {
          for (let dy = -1; dy <= 1; dy++) {
            addTree(midX, ay + dy, variant, true);
          }
        } else {
          for (let dx = -1; dx <= 1; dx++) {
            addTree(bx + dx, midY, variant, true);
          }
        }
      }
    }
  }

  // 5. Internal maze walls/pillars inside combat/timber rooms (so rooms aren't empty boxes!)
  for (const r of rooms) {
    if (r.kind !== 'combat' && r.kind !== 'timber') continue;
    const cx = Math.floor(r.x + r.w / 2);
    const cy = Math.floor(r.y + r.h / 2);
    const pattern = randInt(0, 2);

    if (pattern === 0 && r.w >= 12 && r.h >= 10) {
      // Four tactical maze pillars leaving central cross lanes wide open
      const pts = [
        [r.x + 3, r.y + 3],
        [r.x + r.w - 4, r.y + 3],
        [r.x + 3, r.y + r.h - 4],
        [r.x + r.w - 4, r.y + r.h - 4],
      ];
      for (const [px, py] of pts) {
        tiles[py][px] = 2;
        tiles[py][px + (px < cx ? 1 : -1)] = 2;
      }
    } else if (pattern === 1 && r.w >= 12) {
      // Staggered maze baffle walls off-center
      for (let ox = -2; ox <= 2; ox++) {
        if (Math.abs(ox) === 0) continue;
        tiles[r.y + 3][cx + ox] = 2;
        tiles[r.y + r.h - 4][cx - ox] = 2;
      }
    } else {
      // Asymmetric cover blocks
      tiles[cy - 2][cx - 3] = 2;
      tiles[cy - 1][cx - 3] = 2;
      tiles[cy + 1][cx + 3] = 2;
      tiles[cy + 2][cx + 3] = 2;
    }

    // Sticky mud patches (tile = 4) in Rawa Durian!
    if (biome === 'durian_swamp') {
      const mudPatches = randInt(3, 5);
      for (let m = 0; m < mudPatches; m++) {
        const mx = randInt(r.x + 2, r.x + r.w - 4);
        const my = randInt(r.y + 2, r.y + r.h - 4);
        for (let dy = 0; dy <= 1; dy++) {
          for (let dx = 0; dx <= 1; dx++) {
            if (tiles[my + dy][mx + dx] === 1) {
              tiles[my + dy][mx + dx] = 4;
            }
          }
        }
      }
    }
  }

  // 6. Surround all walkable tiles with perimeter biome walls (tile = 2)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (tiles[y][x] === 0) {
        let touchesFloor = false;
        for (let oy = -1; oy <= 1; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            const nt = tiles[y + oy][x + ox];
            if (nt === 1 || nt === 3 || nt === 4) {
              touchesFloor = true;
            }
          }
        }
        if (touchesFloor) {
          tiles[y][x] = 2;
        }
      }
    }
  }

  // 7. Place Traps (Paku Tanah, Semburan Api, Durian Jatuh)
  const traps: TrapEntity[] = [];
  const baseTrapDmg = Math.round((12 + floor * 2) * Math.pow(1.06, floor - 1));

  for (const r of rooms) {
    if (r.kind === 'start' || r.kind === 'shrine') continue;
    const trapCount = r.kind === 'boss' ? 3 : randInt(2, 4);
    for (let t = 0; t < trapCount; t++) {
      const tx = randInt(r.x + 2, r.x + r.w - 3);
      const ty = randInt(r.y + 2, r.y + r.h - 3);
      const tile = tiles[ty]?.[tx];
      if (tile !== 1 && tile !== 4) continue;
      if (treeTileKeys.has(`${tx},${ty}`)) continue;

      const worldX = tx * TILE_SIZE + TILE_SIZE / 2;
      const worldY = ty * TILE_SIZE + TILE_SIZE / 2;
      const roll = Math.random();
      if (biome === 'durian_swamp' && roll < 0.45) {
        traps.push({
          id: nextId('trap'),
          kind: 'falling_durian',
          x: worldX,
          y: worldY,
          radius: 34,
          damage: baseTrapDmg + 6,
          cycleTimer: Math.random() * 2.4,
          period: 3.2,
          state: 'idle',
          stateTimer: 0,
        });
      } else if (roll < 0.52) {
        traps.push({
          id: nextId('trap'),
          kind: 'spikes',
          x: worldX,
          y: worldY,
          radius: 16,
          damage: baseTrapDmg,
          cycleTimer: Math.random() * 2.0,
          period: 2.6,
          state: 'idle',
          stateTimer: 0,
        });
      } else {
        traps.push({
          id: nextId('trap'),
          kind: 'flame_jet',
          x: worldX,
          y: worldY,
          radius: 26,
          damage: baseTrapDmg + 3,
          cycleTimer: Math.random() * 2.4,
          period: 3.1,
          state: 'idle',
          stateTimer: 0,
        });
      }
    }
  }

  // Corridor traps (spikes / flame jets offset from barricades)
  for (const c of corridorCenters) {
    if (Math.random() < 0.55) {
      const ox = c.horizontal ? randInt(-3, -2) : 0;
      const oy = c.horizontal ? 0 : randInt(-3, -2);
      const tx = c.x + ox;
      const ty = c.y + oy;
      if (tiles[ty]?.[tx] === 1 && !treeTileKeys.has(`${tx},${ty}`)) {
        traps.push({
          id: nextId('trap'),
          kind: Math.random() < 0.6 ? 'spikes' : 'flame_jet',
          x: tx * TILE_SIZE + TILE_SIZE / 2,
          y: ty * TILE_SIZE + TILE_SIZE / 2,
          radius: 18,
          damage: baseTrapDmg,
          cycleTimer: Math.random() * 2.0,
          period: 2.7,
          state: 'idle',
          stateTimer: 0,
        });
      }
    }
  }

  // 8. Populate trees/crates + exact scaled enemy budget (Lantai 1 = 3, Lantai 10 = 20 + 2 Elite)
  const enemies: EnemyEntity[] = [];
  const combatRooms = rooms.filter((r) => r.kind === 'combat' || r.kind === 'timber');

  for (const r of rooms) {
    if (r.kind === 'start') {
      addTree(r.x + r.w - 3, r.y + 2, 'crate', false);
      addTree(r.x + r.w - 3, r.y + r.h - 3, 'pine', false);
      continue;
    }

    if (r.kind === 'shrine') {
      addTree(r.x + 3, r.y + 3, 'elder', false);
      addTree(r.x + r.w - 4, r.y + 3, 'crate', false);
      addTree(r.x + 3, r.y + r.h - 4, 'crate', false);
      addTree(r.x + r.w - 4, r.y + r.h - 4, 'elder', false);
      continue;
    }

    if (r.kind === 'boss') {
      addTree(r.x + 3, r.y + 3, 'pine', false);
      addTree(r.x + r.w - 4, r.y + 3, 'pine', false);
      addTree(r.x + 3, r.y + r.h - 4, 'pine', false);
      addTree(r.x + r.w - 4, r.y + r.h - 4, 'pine', false);
      const bx = (r.x + r.w / 2) * TILE_SIZE;
      const by = (r.y + r.h / 2) * TILE_SIZE;
      const bossKind: EnemyKind =
        floor % 5 === 0 && floor % 10 !== 0 ? 'boss_durian' : 'boss_treant';
      enemies.push(makeEnemy(bossKind, bx, by, r.id, floor));
      continue;
    }

    const treeCount = r.kind === 'timber' ? randInt(4, 6) : randInt(2, 4);
    for (let i = 0; i < treeCount; i++) {
      const tx = randInt(r.x + 2, r.x + r.w - 3);
      const ty = randInt(r.y + 2, r.y + r.h - 3);
      const v =
        i === 0 && r.kind === 'timber'
          ? 'elder'
          : Math.random() < 0.35
          ? 'crate'
          : 'pine';
      addTree(tx, ty, v, false);
    }
  }

  // Exact normal enemy count: Floor 1 = 3, Floor 10 = 20
  const totalNormalEnemies =
    floor <= 10
      ? Math.round(3 + ((floor - 1) * 17) / 9)
      : 20 + (floor - 10) * 2;

  // Exact elite count: Floor 10 = 2 Elites (Mini-Boss on 3, 6, 9; 2+ Elites from Floor 10+)
  const eliteCount =
    floor >= 10
      ? 2 + Math.floor((floor - 10) / 3)
      : floor >= 6
      ? 1
      : floor % 3 === 0
      ? 1
      : 0;

  const findFreeSpotInRoom = (r: RoomRect): [number, number] | null => {
    for (let tries = 0; tries < 24; tries++) {
      const tx = randInt(r.x + 2, r.x + r.w - 3);
      const ty = randInt(r.y + 2, r.y + r.h - 3);
      const tVal = tiles[ty]?.[tx];
      if ((tVal === 1 || tVal === 4) && !treeTileKeys.has(`${tx},${ty}`)) {
        return [tx * TILE_SIZE + TILE_SIZE / 2, ty * TILE_SIZE + TILE_SIZE / 2];
      }
    }
    return null;
  };

  // Sort combat rooms by BFS distance from start so Floor 1 places its 3 enemies near early/mid rooms
  const sortedCombat = [...combatRooms].sort((a, b) => distMap[a.id] - distMap[b.id]);

  // Place normal enemies evenly across combat rooms
  for (let i = 0; i < totalNormalEnemies && sortedCombat.length > 0; i++) {
    const r = sortedCombat[i % sortedCombat.length];
    const spot = findFreeSpotInRoom(r);
    if (!spot) continue;
    const roll = Math.random();
    let kind: EnemyKind = 'wood_slime';
    if (roll > 0.78) kind = 'goblin_slinger';
    else if (roll > 0.5) kind = 'goblin_scout';
    else if (roll > 0.3) kind = 'thorn_slime';
    enemies.push(makeEnemy(kind, spot[0], spot[1], r.id, floor, false));
  }

  // Place Elite enemies in later combat rooms closer to the boss
  const lateCombat = [...sortedCombat].reverse();
  for (let i = 0; i < eliteCount && lateCombat.length > 0; i++) {
    const r = lateCombat[i % lateCombat.length];
    const spot = findFreeSpotInRoom(r) ?? [
      (r.x + r.w / 2) * TILE_SIZE,
      (r.y + r.h / 2) * TILE_SIZE,
    ];
    const mbKind: EnemyKind = i % 2 === 0 ? 'thorn_slime' : 'goblin_slinger';
    enemies.push(makeEnemy(mbKind, spot[0], spot[1], r.id, floor, true));
  }

  const startRoom = rooms.find((r) => r.kind === 'start')!;
  const bossRoom = rooms.find((r) => r.kind === 'boss')!;
  // Ensure start room reference stays clean (rooms[0] isn't necessarily start anymore, so sort start first!)
  const orderedRooms = [
    startRoom,
    ...rooms.filter((r) => r.id !== startRoom.id),
  ];

  return {
    floor,
    biome,
    width,
    height,
    tiles,
    rooms: orderedRooms,
    trees,
    traps,
    enemies,
    allies: [],
    zones: [],
    arcs: [],
    drops: [],
    projectiles: [],
    slams: [],
    slashes: [],
    particles: [],
    floatingTexts: [],
    portalOpen: false,
    portalX: (bossRoom.x + bossRoom.w / 2) * TILE_SIZE,
    portalY: (bossRoom.y + bossRoom.h / 2) * TILE_SIZE,
    bossDefeated: false,
  };
}
