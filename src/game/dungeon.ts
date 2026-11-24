import { ChoppableTree, DungeonState, EnemyEntity, EnemyKind, RoomRect, TileType } from './types';

export const TILE_SIZE = 32;

let idCounter = 1;
export function nextId(prefix = 'e'): string {
  idCounter += 1;
  return `${prefix}_${idCounter}_${Math.random().toString(36).slice(2, 6)}`;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makeEnemy(
  kind: EnemyKind,
  x: number,
  y: number,
  roomId: number,
  floor: number,
  isMiniBoss = false
): EnemyEntity {
  // +10% HP & Damage per floor
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
      id: nextId('miniboss'),
      kind,
      name: `Panglima Rimba Lv.${floor}`,
      x,
      y,
      vx: 0,
      vy: 0,
      radius: 21,
      hp: Math.round(210 * scale),
      maxHp: Math.round(210 * scale),
      speed: 92 + floor * 3,
      damage: Math.round(18 * scale),
      roomId,
      patrolOriginX: x,
      patrolOriginY: y,
      patrolTargetX: x,
      patrolTargetY: y,
      patrolWait: 0.3,
      alerted: false,
      attackCooldown: 1.1,
      windupTimer: 0,
      windupKind: 'none',
      facingX: 1,
      hitFlash: 0,
      freezeTimer: 0,
      animTime: 0,
      phase: 1,
      expReward: 85,
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
        hp: Math.round(38 * scale),
        maxHp: Math.round(38 * scale),
        speed: 74 + floor * 4,
        damage: Math.round(10 * scale),
        roomId,
        patrolOriginX: x,
        patrolOriginY: y,
        patrolTargetX: x,
        patrolTargetY: y,
        patrolWait: 0.4,
        alerted: false,
        attackCooldown: 0.9,
        windupTimer: 0,
        windupKind: 'none',
        facingX: 1,
        hitFlash: 0,
        freezeTimer: 0,
        animTime: Math.random() * 4,
        phase: 1,
        expReward: 18,
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
        hp: Math.round(52 * scale),
        maxHp: Math.round(52 * scale),
        speed: 62 + floor * 3,
        damage: Math.round(13 * scale),
        roomId,
        patrolOriginX: x,
        patrolOriginY: y,
        patrolTargetX: x,
        patrolTargetY: y,
        patrolWait: 0.6,
        alerted: false,
        attackCooldown: 1.5,
        windupTimer: 0,
        windupKind: 'none',
        facingX: 1,
        hitFlash: 0,
        freezeTimer: 0,
        animTime: Math.random() * 4,
        phase: 1,
        expReward: 26,
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
        hp: Math.round(48 * scale),
        maxHp: Math.round(48 * scale),
        speed: 105 + floor * 5,
        damage: Math.round(14 * scale),
        roomId,
        patrolOriginX: x,
        patrolOriginY: y,
        patrolTargetX: x,
        patrolTargetY: y,
        patrolWait: 0.5,
        alerted: false,
        attackCooldown: 1.1,
        windupTimer: 0,
        windupKind: 'none',
        facingX: 1,
        hitFlash: 0,
        freezeTimer: 0,
        animTime: Math.random() * 4,
        phase: 1,
        expReward: 25,
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
        hp: Math.round(40 * scale),
        maxHp: Math.round(40 * scale),
        speed: 82 + floor * 4,
        damage: Math.round(12 * scale),
        roomId,
        patrolOriginX: x,
        patrolOriginY: y,
        patrolTargetX: x,
        patrolTargetY: y,
        patrolWait: 0.7,
        alerted: false,
        attackCooldown: 1.6,
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
    case 'boss_treant': {
      const isMegaBoss = floor % 5 === 0;
      const bossHp = Math.round(460 * scale * (isMegaBoss ? 3 : 1));
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
        speed: 62 + floor * 4,
        damage: Math.round(22 * scale),
        roomId,
        patrolOriginX: x,
        patrolOriginY: y,
        patrolTargetX: x,
        patrolTargetY: y,
        patrolWait: 0.2,
        alerted: false,
        attackCooldown: 1.6,
        windupTimer: 0,
        windupKind: 'none',
        facingX: 1,
        hitFlash: 0,
        freezeTimer: 0,
        animTime: 0,
        phase: 1,
        expReward: isMegaBoss ? 320 : 160,
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

export function generateDungeon(floor: number): DungeonState {
  const width = 76;
  const height = 58;
  const tiles: TileType[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => 0 as TileType)
  );

  // Layout rooms in a readable branching grid so corridors never overlap awkwardly
  // 3x3 sector grid, each cell ~23x17 tiles
  const sectors: Array<{ gx: number; gy: number; kind: RoomRect['kind'] }> = [
    { gx: 0, gy: 1, kind: 'start' },
    { gx: 1, gy: 1, kind: 'combat' },
    { gx: 1, gy: 0, kind: 'timber' },
    { gx: 1, gy: 2, kind: 'combat' },
    { gx: 2, gy: 0, kind: 'shrine' },
    { gx: 2, gy: 1, kind: 'combat' },
    { gx: 2, gy: 2, kind: 'boss' },
  ];

  // Add slight variation to sector routing on higher floors
  if (floor % 2 === 0) {
    sectors[4].kind = 'combat';
    sectors[3].kind = 'shrine';
  }

  const cellW = 24;
  const cellH = 18;
  const rooms: RoomRect[] = sectors.map((sec, idx) => {
    const isBoss = sec.kind === 'boss';
    const isStart = sec.kind === 'start';
    const w = isBoss ? 17 : isStart ? 11 : randInt(12, 15);
    const h = isBoss ? 14 : isStart ? 10 : randInt(10, 12);
    const baseX = sec.gx * cellW + 3;
    const baseY = sec.gy * cellH + 3;
    const ox = Math.max(2, baseX + Math.floor((cellW - 4 - w) / 2) + randInt(-1, 1));
    const oy = Math.max(2, baseY + Math.floor((cellH - 4 - h) / 2) + randInt(-1, 1));
    return {
      id: idx,
      x: ox,
      y: oy,
      w,
      h,
      kind: sec.kind,
      cleared: sec.kind === 'start' || sec.kind === 'shrine',
      discovered: sec.kind === 'start',
    };
  });

  // Carve rooms
  for (const r of rooms) {
    for (let y = r.y; y < r.y + r.h; y++) {
      for (let x = r.x; x < r.x + r.w; x++) {
        tiles[y][x] = 1;
      }
    }
    // Corner torches for dark forest ambiance
    if (r.w >= 10 && r.h >= 8) {
      tiles[r.y + 1][r.x + 1] = 3;
      tiles[r.y + 1][r.x + r.w - 2] = 3;
      tiles[r.y + r.h - 2][r.x + 1] = 3;
      tiles[r.y + r.h - 2][r.x + r.w - 2] = 3;
    }
  }

  // Connections (room indices)
  const edges: Array<[number, number, boolean]> = [
    [0, 1, true],  // start -> central combat (blocked by choppable trees!)
    [1, 2, true],  // central -> north timber grove
    [1, 3, true],  // central -> south combat
    [2, 4, false], // north -> shrine
    [1, 5, true],  // central -> east combat
    [5, 6, true],  // east -> boss grove (guarded by Elder Trees!)
  ];

  const trees: ChoppableTree[] = [];
  const treeTileKeys = new Set<string>();

  const addTree = (
    tx: number,
    ty: number,
    variant: ChoppableTree['variant'],
    blocksPath: boolean
  ) => {
    const key = `${tx},${ty}`;
    if (treeTileKeys.has(key)) return;
    treeTileKeys.add(key);
    const maxHp =
      variant === 'crate'
        ? 22
        : variant === 'elder'
        ? 65 + floor * 12
        : 36 + floor * 8;
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

  // Carve 3-tile-wide corridors and place choppable trees across key passages
  for (const [aIdx, bIdx, barricade] of edges) {
    const a = rooms[aIdx];
    const b = rooms[bIdx];
    const ax = Math.floor(a.x + a.w / 2);
    const ay = Math.floor(a.y + a.h / 2);
    const bx = Math.floor(b.x + b.w / 2);
    const by = Math.floor(b.y + b.h / 2);

    // Horizontal segment first, then vertical
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

    if (barricade) {
      // Place a row of 3 choppable trees mid-corridor so the player MUST chop at least 1 tree to pass!
      if (Math.abs(ax - bx) >= Math.abs(ay - by)) {
        const midX = Math.floor((ax + bx) / 2);
        const variant = b.kind === 'boss' ? 'elder' : 'pine';
        for (let dy = -1; dy <= 1; dy++) {
          addTree(midX, ay + dy, variant, true);
        }
      } else {
        const midY = Math.floor((ay + by) / 2);
        const variant = b.kind === 'boss' ? 'elder' : 'pine';
        for (let dx = -1; dx <= 1; dx++) {
          addTree(bx + dx, midY, variant, true);
        }
      }
    }
  }

  // Surround all floor tiles with bark walls (tile = 2)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (tiles[y][x] === 0) {
        let touchesFloor = false;
        for (let oy = -1; oy <= 1; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            const nt = tiles[y + oy][x + ox];
            if (nt === 1 || nt === 3) {
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

  // Populate rooms with harvestable trees, crates, and patrolling enemies
  const enemies: EnemyEntity[] = [];

  for (const r of rooms) {
    if (r.kind === 'start') {
      // A couple of friendly starter crates / young pine in corner to teach chopping right away
      addTree(r.x + r.w - 3, r.y + 2, 'crate', false);
      addTree(r.x + r.w - 3, r.y + r.h - 3, 'pine', false);
      continue;
    }

    if (r.kind === 'shrine') {
      // Timber & Crate sanctuary
      addTree(r.x + 3, r.y + 3, 'elder', false);
      addTree(r.x + r.w - 4, r.y + 3, 'crate', false);
      addTree(r.x + 3, r.y + r.h - 4, 'crate', false);
      addTree(r.x + r.w - 4, r.y + r.h - 4, 'elder', false);
      continue;
    }

    if (r.kind === 'boss') {
      // Corner cover trees inside boss grove
      addTree(r.x + 3, r.y + 3, 'pine', false);
      addTree(r.x + r.w - 4, r.y + 3, 'pine', false);
      addTree(r.x + 3, r.y + r.h - 4, 'pine', false);
      addTree(r.x + r.w - 4, r.y + r.h - 4, 'pine', false);
      const bx = (r.x + r.w / 2) * TILE_SIZE;
      const by = (r.y + r.h / 2) * TILE_SIZE;
      enemies.push(makeEnemy('boss_treant', bx, by, r.id, floor));
      continue;
    }

    // Combat or Timber room: scatter inner trees/crates
    const treeCount = r.kind === 'timber' ? randInt(5, 7) : randInt(2, 4);
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

    // Spawn Mini-Boss on floors 3, 6, 9... in room 5 (east room guarding boss grove)
    if (floor % 3 === 0 && r.id === 5) {
      const mx = (r.x + r.w / 2) * TILE_SIZE;
      const my = (r.y + r.h / 2) * TILE_SIZE;
      const mbKind: EnemyKind = floor % 2 === 0 ? 'goblin_slinger' : 'thorn_slime';
      enemies.push(makeEnemy(mbKind, mx, my, r.id, floor, true));
    }

    // Spawn patrolling Slimes & Goblins
    const enemyCount = r.kind === 'timber' ? randInt(3, 4) : randInt(4, 6);
    for (let i = 0; i < enemyCount; i++) {
      let ex = 0;
      let ey = 0;
      for (let tries = 0; tries < 10; tries++) {
        const tx = randInt(r.x + 2, r.x + r.w - 3);
        const ty = randInt(r.y + 2, r.y + r.h - 3);
        if (!treeTileKeys.has(`${tx},${ty}`)) {
          ex = tx * TILE_SIZE + TILE_SIZE / 2;
          ey = ty * TILE_SIZE + TILE_SIZE / 2;
          break;
        }
      }
      if (!ex) continue;

      const roll = Math.random();
      let kind: EnemyKind = 'wood_slime';
      if (roll > 0.78) kind = 'goblin_slinger';
      else if (roll > 0.5) kind = 'goblin_scout';
      else if (roll > 0.32) kind = 'thorn_slime';
      enemies.push(makeEnemy(kind, ex, ey, r.id, floor));
    }
  }

  const bossRoom = rooms.find((r) => r.kind === 'boss')!;
  return {
    floor,
    width,
    height,
    tiles,
    rooms,
    trees,
    enemies,
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
