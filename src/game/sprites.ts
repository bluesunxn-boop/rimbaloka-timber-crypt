const PALETTE: Record<string, string> = {
  '.': 'transparent',
  k: '#0b0e0d', // deep outline
  w: '#f8fafc', // crisp highlight white
  s: '#cbd5e1', // steel light
  g: '#64748b', // steel mid
  d: '#334155', // steel dark
  b: '#5c3a21', // bark brown
  B: '#3b2313', // dark bark
  l: '#8b5a2b', // light wood
  L: '#b97a45', // warm wood highlight
  e: '#10b981', // emerald
  E: '#065f46', // dark emerald
  m: '#34d399', // bright moss
  M: '#166534', // forest green
  f: '#14532d', // deep pine
  a: '#f59e0b', // amber glow
  A: '#b45309', // dark amber
  r: '#ef4444', // crimson
  R: '#991b1b', // dark red
  c: '#38bdf8', // arcane cyan
  C: '#0284c7', // deep cyan
  p: '#c084fc', // mystic purple
  P: '#6b21a8', // dark purple
  y: '#fde047', // bright gold
  h: '#f3c6a5', // skin / peach
  v: '#84cc16', // goblin / sap lime
  V: '#4d7c0f', // dark goblin green
};

function bakeSprite(rows: string[], scale = 1): HTMLCanvasElement {
  const h = rows.length;
  const w = rows[0].length;
  const canvas = document.createElement('canvas');
  canvas.width = w * scale;
  canvas.height = h * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  for (let y = 0; y < h; y++) {
    const row = rows[y];
    for (let x = 0; x < w; x++) {
      const ch = row[x];
      const color = PALETTE[ch];
      if (!color || color === 'transparent') continue;
      ctx.fillStyle = color;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  return canvas;
}

const KNIGHT_16 = [
  '......kkkk......',
  '.....krrrrk.....',
  '....kksssskk....',
  '....kssssssk....',
  '....ksskkssk....',
  '....kswwwwsk....',
  '.....kggggk.....',
  '...kksssssskk...',
  '..kddssyyssddk..',
  '..kddssssssddk..',
  '..kddssddssddk..',
  '...kkddddddkk...',
  '....kddkkddk....',
  '....kdd..ddk....',
  '....kBB..BBk....',
  '....kkk..kkk....',
];

const ARCHER_16 = [
  '.....kkkkkk.....',
  '....kMMMMMMk....',
  '...kMMmmmmMMk...',
  '...kMkkkkkkMk...',
  '...kMhhkkhhMk...',
  '...kMhhhhhhMk...',
  '....kkEEEEkk....',
  '..kkMMllllMMkk..',
  '.kllMMlfflMMllk.',
  '.kllMMllllMMllk.',
  '..kkEEllllEEkk..',
  '....kEEEEEEk....',
  '....kBB..BBk....',
  '....kBB..BBk....',
  '....kdd..ddk....',
  '....kkk..kkk....',
];

const MAGE_16 = [
  '.......kk.......',
  '......kPPk......',
  '.....kPppPk.....',
  '....kPPppPPk....',
  '..kkPPPPPPPPkk..',
  '.kppppppppppppk.',
  '...kkcccccckk...',
  '....kcckkcck....',
  '....kcccccck....',
  '...kkPPPPPPkk...',
  '..kPPpcYYcpPPk..',
  '..kPPppppppPPk..',
  '..kPPppppppPPk..',
  '...kkPPPPPPkk...',
  '....kdd..ddk....',
  '....kkk..kkk....',
];

const WOOD_SLIME_16 = [
  '.......kk.......',
  '......kmmk......',
  '.......kMk......',
  '....kkkMMkkk....',
  '...kMMMMMMMMk...',
  '..kMMmmMMmmMMk..',
  '..kMvvvvvvvvMk..',
  '.kMvvkkvvkkvvMk.',
  '.kMvvwwvvwwvvMk.',
  '.kMvvvvvvvvvvMk.',
  '.kMbbbbbbbbbbMk.',
  '.kBbbbbllbbbbBk.',
  '..kBBBBBBBBBBk..',
  '...kkkkkkkkkk...',
  '................',
  '................',
];

const THORN_SLIME_16 = [
  '....k......k....',
  '...kPk....kPk...',
  '....kPkkkkPk....',
  '...kPPPPPPPPk...',
  '..kPPppPPppPPk..',
  '.kPppkkppkkppPk.',
  '.kPpprrPprrppPk.',
  '.kPppppppppppPk.',
  'kPPBppppppppBPPk',
  '.kPBBBBBBBBBBPk.',
  '..kBBBBBBBBBBk..',
  '...kkkkkkkkkk...',
  '................',
  '................',
  '................',
  '................',
];

const GOBLIN_SCOUT_16 = [
  '................',
  '.kk..kkkkkk..kk.',
  '.kVk.kVVVVk.kVk.',
  '..kVkVVvvVVkVk..',
  '...kVVvvvvVVk...',
  '...kVrkVVkrVk...',
  '...kVVvwwvVVk...',
  '....kkbbbbkk....',
  '...kbbllllbbk...',
  '..kVVbllllbVVk..',
  '..kVVbbbbbbVVk..',
  '...kkBBBBBBkk...',
  '....kVV..VVk....',
  '....kBB..BBk....',
  '....kkk..kkk....',
  '................',
];

const GOBLIN_SLINGER_16 = [
  '.....kkkkkk.....',
  '....kAAAAAAk....',
  '.kk.kAaaaaAk.kk.',
  '.kVk.kVVVVk.kVk.',
  '..kVkVvvvvVkVk..',
  '...kVVrkkrrVk...',
  '...kVVvvvvVVk...',
  '....kkEEEEkk....',
  '...kEEllllEEk...',
  '..kVVElfflEEVk..',
  '...kkEEEEEEkk...',
  '....kVV..VVk....',
  '....kBB..BBk....',
  '....kkk..kkk....',
  '................',
  '................',
];

const BOSS_TREANT_24 = [
  '......kkk......kkk......',
  '....kkfffkk..kkfffkk....',
  '...kfMMMMMfkfMMMMMffk...',
  '..kffMmmmMMMMMmmmMMffk..',
  '.kfMMmmmmMMMMMmmmmMMffk.',
  '.kfMMbBBBBBBBBBBBBbMMfk.',
  '..kkBBBBbbbbbbbbBBBBkk..',
  '...kBBbbllBBBBllbbBBk...',
  '..kBBbbrrkkBBkkrrbBBBk..',
  '..kBBbbyywkBBkwyybBBBk..',
  '..kBBbbrrkkBBkkrrbBBBk..',
  '..kBBbbbbbbbbbbbbbbBBk..',
  '.kBBBbbBkkkkkkkkBbbBBBk.',
  'kBBbbBBkrrrrrrrrkBBbbBBk',
  'kBBbBBBkrrraaarrrkBBbBBk',
  '.kBBBBBBkrrrrrrrkBBBBBBk',
  '..kBBbBBkkkkkkkkBBbBBBk.',
  '..kBBbbBBBBbbbbBBBBbBBk.',
  '..kBBbBBbBBllBBbBBbBBBk.',
  '.kBBB.kBBbBBBBbBBk.BBBk.',
  'kBBk..kBBbBBBBbBBk..kBBk',
  'kkk...kBBk....kBBk...kkk',
  '......kBBk....kBBk......',
  '......kkkk....kkkk......',
];

const PINE_TREE_20 = [
  '.........kk.........',
  '........kMMk........',
  '.......kMmmMk.......',
  '......kMMmmMMk......',
  '.....kfMMMMMMfk.....',
  '....kffMMmmMMffk....',
  '...kfffMMMMMMfffk...',
  '.....kfMMMMMMfk.....',
  '...kkffMMmmMMffkk...',
  '..kffffMMMMMMffffk..',
  '.kfffffMMmmMMfffffk.',
  '..kkfffMMMMMMfffkk..',
  '....kkkffffffkkk....',
  '.......kBllBk.......',
  '.......kBbbBk.......',
  '.......kBllBk.......',
  '.......kBbbBk.......',
  '......kBBbbBBk......',
  '.....kkkkkkkkkk.....',
  '....................',
];

const ELDER_TREE_20 = [
  '......kkkkkkkk......',
  '....kkMMMMMMMMkk....',
  '...kMMmmmmmmmmMMk...',
  '..kMMmmEEEEEEmmMMk..',
  '..kMmEEccccccEEmMk..',
  '.kMMEEccwwwwccEEMMk.',
  '..kMMEEccccccEEMMk..',
  '..kMMmmEEEEEEmmMMk..',
  '...kkMMMMMMMMMMkk...',
  '.....kBBBBBBBBk.....',
  '....kBBllccbbBBk....',
  '....kBBblccbbBBk....',
  '....kBBbbbbbbBBk....',
  '....kBBllbbbbBBk....',
  '....kBBbbbbbbBBk....',
  '...kBBBbbbbbbBBBk...',
  '..kBBBBbbbbbbBBBBk..',
  '..kkkkkkkkkkkkkkkk..',
  '....................',
  '....................',
];

const CRATE_16 = [
  '................',
  '..kkkkkkkkkkkk..',
  '.kLLLLLLLLLLLLk.',
  '.kLbbbbbbbbbbLk.',
  '.kLbLLbbbbbbLLk.',
  '.kLbbLLbbbbLLbk.',
  '.kLbbbLLbbLLbbk.',
  '.kLbbbbLLLLbbbk.',
  '.kLbbbbLLLLbbbk.',
  '.kLbbbLLbbLLbbk.',
  '.kLbbLLbbbbLLbk.',
  '.kLbLLbbbbbbLLk.',
  '.kLbbbbbbbbbbLk.',
  '.kBBBBBBBBBBBBk.',
  '..kkkkkkkkkkkk..',
  '................',
];

const WOOD_LOG_12 = [
  '............',
  '...kkkkkk...',
  '..kLLLLLLk..',
  '.kLbbllbbLk.',
  '.kbbbbbbbbk.',
  '.kbbllbbbbk.',
  '.kBBBBBBBBk.',
  '..kkkkkkkk..',
  '............',
  '............',
  '............',
  '............',
];

const IRONWOOD_LOG_12 = [
  '............',
  '...kkkkkk...',
  '..kssssssk..',
  '.ksccllccsk.',
  '.ksddddddsk.',
  '.kddccddddk.',
  '.kddddddddk.',
  '..kkkkkkkk..',
  '............',
  '............',
  '............',
  '............',
];

const ELDERWOOD_CORE_12 = [
  '............',
  '....kkkk....',
  '..kkyyyyk...',
  '.kyyaaaayyk.',
  '.kyarrrrayk.',
  '.kyyaaaayyk.',
  '..kkyyyyk...',
  '....kkkk....',
  '............',
  '............',
  '............',
  '............',
];

const POTION_12 = [
  '....kkkk....',
  '....kllk....',
  '....kssk....',
  '...kssssk...',
  '..kssrrssk..',
  '.ksrrrrrrsk.',
  '.ksrwwrrrsk.',
  '.ksrrrrrrsk.',
  '.kssrrrrssk.',
  '..kssssssk..',
  '...kkkkkk...',
  '............',
];

const BERRY_12 = [
  '.....kk.....',
  '....kmmk....',
  '...krrrrk...',
  '..krrwwrrk..',
  '..krrrrrrk..',
  '..krrRRrrk..',
  '...kRRRRk...',
  '....kkkk....',
  '............',
  '............',
  '............',
  '............',
];

const MANA_12 = [
  '.....kk.....',
  '....kcck....',
  '...kcwwck...',
  '..kcCCCCck..',
  '..kcccccck..',
  '..kcCCCCck..',
  '...kCCCCk...',
  '....kkkk....',
  '............',
  '............',
  '............',
  '............',
];

export interface SpriteAtlas {
  knight: HTMLCanvasElement;
  archer: HTMLCanvasElement;
  mage: HTMLCanvasElement;
  wood_slime: HTMLCanvasElement;
  thorn_slime: HTMLCanvasElement;
  goblin_scout: HTMLCanvasElement;
  goblin_slinger: HTMLCanvasElement;
  boss_treant: HTMLCanvasElement;
  pine_tree: HTMLCanvasElement;
  elder_tree: HTMLCanvasElement;
  crate: HTMLCanvasElement;
  wood_log: HTMLCanvasElement;
  ironwood_log: HTMLCanvasElement;
  elderwood_core: HTMLCanvasElement;
  potion: HTMLCanvasElement;
  berry: HTMLCanvasElement;
  mana: HTMLCanvasElement;
  floorTileA: HTMLCanvasElement;
  floorTileB: HTMLCanvasElement;
  wallTile: HTMLCanvasElement;
  torchTile: HTMLCanvasElement;
}

function createFloorTile(variant: 'A' | 'B' | 'torch'): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = 32;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  // Dark mossy wooden planks
  ctx.fillStyle = variant === 'A' ? '#17231c' : '#152019';
  ctx.fillRect(0, 0, 32, 32);

  // Plank horizontal grooves
  ctx.fillStyle = '#0f1712';
  ctx.fillRect(0, 7, 32, 1);
  ctx.fillRect(0, 15, 32, 1);
  ctx.fillRect(0, 23, 32, 1);
  ctx.fillRect(0, 31, 32, 1);

  // Vertical plank joints
  ctx.fillRect(variant === 'A' ? 12 : 20, 0, 1, 8);
  ctx.fillRect(variant === 'A' ? 24 : 8, 8, 1, 8);
  ctx.fillRect(variant === 'A' ? 6 : 16, 16, 1, 8);
  ctx.fillRect(variant === 'A' ? 18 : 26, 24, 1, 8);

  // Subtle wood grain & moss specks
  ctx.fillStyle = '#1f3026';
  ctx.fillRect(4, 3, 6, 1);
  ctx.fillRect(18, 11, 5, 1);
  ctx.fillRect(10, 19, 7, 1);
  ctx.fillRect(22, 27, 4, 1);

  if (variant === 'B') {
    ctx.fillStyle = '#1e3a28';
    ctx.fillRect(3, 12, 2, 2);
    ctx.fillRect(25, 4, 2, 1);
  }

  if (variant === 'torch') {
    // Brazier base on floor
    ctx.fillStyle = '#3b2313';
    ctx.fillRect(11, 11, 10, 10);
    ctx.fillStyle = '#5c3a21';
    ctx.fillRect(12, 12, 8, 8);
    ctx.fillStyle = '#b45309';
    ctx.fillRect(13, 13, 6, 6);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(14, 13, 4, 4);
    ctx.fillStyle = '#fde047';
    ctx.fillRect(15, 14, 2, 2);
  }

  return c;
}

function createWallTile(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = 32;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  // Deep forest canopy / bark wall
  ctx.fillStyle = '#09100c';
  ctx.fillRect(0, 0, 32, 32);

  // Textured dark foliage/bark top
  ctx.fillStyle = '#0f1d15';
  ctx.fillRect(1, 1, 30, 22);
  ctx.fillStyle = '#162b1e';
  ctx.fillRect(3, 3, 12, 8);
  ctx.fillRect(17, 6, 11, 10);
  ctx.fillRect(5, 14, 14, 6);

  // Bark cliff face at bottom edge
  ctx.fillStyle = '#251911';
  ctx.fillRect(0, 23, 32, 9);
  ctx.fillStyle = '#362417';
  ctx.fillRect(2, 24, 8, 6);
  ctx.fillRect(13, 24, 9, 6);
  ctx.fillRect(24, 24, 6, 6);
  ctx.fillStyle = '#0b0e0d';
  ctx.fillRect(0, 31, 32, 1);

  return c;
}

let cachedAtlas: SpriteAtlas | null = null;

export function getSpriteAtlas(): SpriteAtlas {
  if (cachedAtlas) return cachedAtlas;
  cachedAtlas = {
    knight: bakeSprite(KNIGHT_16, 2),
    archer: bakeSprite(ARCHER_16, 2),
    mage: bakeSprite(MAGE_16, 2),
    wood_slime: bakeSprite(WOOD_SLIME_16, 2),
    thorn_slime: bakeSprite(THORN_SLIME_16, 2),
    goblin_scout: bakeSprite(GOBLIN_SCOUT_16, 2),
    goblin_slinger: bakeSprite(GOBLIN_SLINGER_16, 2),
    boss_treant: bakeSprite(BOSS_TREANT_24, 3),
    pine_tree: bakeSprite(PINE_TREE_20, 2),
    elder_tree: bakeSprite(ELDER_TREE_20, 2),
    crate: bakeSprite(CRATE_16, 2),
    wood_log: bakeSprite(WOOD_LOG_12, 2),
    ironwood_log: bakeSprite(IRONWOOD_LOG_12, 2),
    elderwood_core: bakeSprite(ELDERWOOD_CORE_12, 2),
    potion: bakeSprite(POTION_12, 2),
    berry: bakeSprite(BERRY_12, 2),
    mana: bakeSprite(MANA_12, 2),
    floorTileA: createFloorTile('A'),
    floorTileB: createFloorTile('B'),
    wallTile: createWallTile(),
    torchTile: createFloorTile('torch'),
  };
  return cachedAtlas;
}
