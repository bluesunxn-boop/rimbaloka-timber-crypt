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
  o: '#f97316', // bright orange
  n: '#ec4899', // vibrant pink/magenta
  t: '#14b8a6', // teal
  u: '#78350f', // umber brown
  z: '#1e293b', // slate dark
  x: '#ff3b30', // blazing S1 red
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

const BOSS_DURIAN_24 = [
  '..........kkkk..........',
  '.........kBllBk.........',
  '....k....kBbbBk....k....',
  '...kyk..kkBBBBkk..kyk...',
  '..kvykkkyyVVVVyykkkyvk..',
  '..kVVyyyyyvvvvyyyyyVVk..',
  '.kyVVvvvvvvvvvvvvvvVVyk.',
  'kyyVvvyyyyvvvvyyyyvvVyyk',
  '.kVVvvyVVyvvvvyVVyvVVVk.',
  'kyVVvvvyyvvvvvvyyvvvVVyk',
  'kVVvvkkrrkkvvkkrrkkvvVVk',
  'kVVvvkwwwwkVVkwwwwkvvVVk',
  'kVVvvkrrrrkVVkrrrrkvvVVk',
  '.kVVvvkkkkvvvvkkkkvvVVk.',
  'kyVVvvvvyyyyyyyyvvvvVVyk',
  'kVVvvvvykkkkkkkkYvvvVVVk'.replace('Y', 'y'),
  '.kVVvvvkrrrrrrrrkvvvVVk.',
  'kyVVvvvkraaaaarkvvvVVyk.'.replace('kraaaaark', 'krrraaark'),
  '.kyVVvvvkkkkkkkkvvvVVyk.',
  '..kVVyyyyvvvvvvyyyyVVk..',
  '..kyVkkVVyyyyyyVVkkVyk..',
  '...k...kyVk..kVyk...k...',
  '........kk....kk........',
  '........................',
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

const GOLD_COIN_12 = [
  '....kkkk....',
  '..kkyyyyk...',
  '.kyyaaaayyk.',
  '.kyawaaayyk.',
  '.kywaAaayyk.',
  '.kyyaAaayyk.',
  '.kyaaaAAayk.',
  '..kkyAAyk...',
  '....kkkk....',
  '............',
  '............',
  '............',
];

const TIMBER_SHARD_12 = [
  '.....kk.....',
  '....kmmk....',
  '...kmeemk...',
  '..kmewwemk..',
  '..kmeeEemk..',
  '..kmeEEemk..',
  '...kEEEEk...',
  '....kEEk....',
  '.....kk.....',
  '............',
  '............',
  '............',
];

const BOSS_SOUL_12 = [
  '....kkkk....',
  '..kkppppkk..',
  '.kppwwwwppk.',
  '.kpprkkrppk.',
  '.kppppppppk.',
  '..kPPppPPk..',
  '..kPkkkkPk..',
  '...kP..Pk...',
  '....kkkk....',
  '............',
  '............',
  '............',
];

const BLUEPRINT_12 = [
  '..kkkkkkkk..',
  '.kCccccccCk.',
  '.kccwwwwcck.',
  '.kcwcCCcwck.',
  '.kccwwwwcck.',
  '.kcwcCCcwck.',
  '.kcccyyccck.',
  '.kCccccccCk.',
  '..kkkkkkkk..',
  '............',
  '............',
  '............',
];

const MINI_DURIAN_12 = [
  '....k..k....',
  '..kyk..kyk..',
  '.kVyyyyyyVk.',
  'kyVvvvvvvVyk',
  '.kVvvyyvvVk.',
  'kVVvyrrvyVVk',
  'kVVvyrrvyVVk',
  '.kVvvyyvvVk.',
  'kyVvvvvvvVyk',
  '.kVyyyyyyVk.',
  '..kyk..kyk..',
  '....k..k....',
];

const SANDAL_SWALLOW_16 = [
  '.....kkkkkk.....',
  '....kwwwwwwk....',
  '...kwwsssswwk...',
  '...kwsPPPPswk...',
  '...kwPppppPwk...',
  '..kwwPppppPwwk..',
  '..kwpPwwwwPpwk..',
  '..kwpPwwwwPpwk..',
  '..kwpPssssPpwk..',
  '..kwwPssssPwwk..',
  '...kwsssssswk...',
  '...kwsssssswk...',
  '...kwwsssswwk...',
  '....kssssssk....',
  '....kggggggk....',
  '.....kkkkkk.....',
];

const SANDAL_SWALLOW_V2_16 = [
  '.....kkkkkk.....',
  '....kyyyyyyk....',
  '...kyyrrrrryyk..',
  '...kyrRRRRRryk..',
  '...kyRrrrrrRyk..',
  '..kyyRrrrrrRyyk.',
  '..kyrRwwwwRryyk.',
  '..kyrRwwwwRryyk.',
  '..kyrRyyyyRryyk.',
  '..kyyRyyyyRyyk..',
  '...kyyyyyyyyk...',
  '...kyyaaaayyk...',
  '...kyyrrrrryyk..',
  '....krrrrrrk....',
  '....kRRRRRRk....',
  '.....kkkkkk.....',
];

const GODSLAYER_16 = [
  '...........kkkk.',
  '..........krrrk.',
  '.........krrwwk.',
  '........krrwwrk.',
  '.......krrwwrk..',
  '......krrwwrk...',
  '.....krrwwrk....',
  '....krrwwrk.....',
  '..kkrrrwrk......',
  '.kyyrrrk........',
  '..kkyyk.........',
  '..kykRk.........',
  '.kyk.k..........',
  '.kk.............',
  '................',
  '................',
];

const GEM_12 = [
  '....kkkk....',
  '...kcccck...',
  '..kcwwwwck..',
  '.kcwCCCCwck.',
  '.kCCCCCCCCk.',
  '..kCCccCCk..',
  '...kCCCCk...',
  '....kCCk....',
  '.....kk.....',
  '............',
  '............',
  '............',
];

const BAKSO_12 = [
  '....kkkk....',
  '...kggggk...',
  '..kgssssgk..',
  '..kgsggsgg..'.replace('gg', 'gk'),
  '.kkllllllkk.',
  '.kwwwwwwwwk.',
  '.krrrrrrrrk.',
  '..kwwwwwwk..',
  '...kkkkkk...',
  '............',
  '............',
  '............',
];

const ALLY_KULI_16 = [
  '.....kkkkkk.....',
  '....kAAAAAAk....',
  '...kAaaaaaaAk...',
  '...khhhhhhhhk...',
  '...khhkhhkhhk...',
  '...khhhhhhhhk...',
  '....kllbbllk....',
  '...kbllllllbk...',
  '..khhbllllbhhk..',
  '...kkbbbbbbkk...',
  '....kzz..zzk....',
  '....kBB..BBk....',
  '....kkk..kkk....',
  '................',
  '................',
  '................',
];

const ALLY_MANDOR_16 = [
  '....kkkkkkkk....',
  '...kyyyyyyyyk...',
  '...kyaaaaaayk...',
  '...khhhhhhhhk...',
  '...khhkhhkhhk...',
  '...khhBBBBhhk...',
  '..kkrrrrrrrrkk..',
  '.krrryyyyyyrrrk.',
  '.khhrrrrrrrrhhk.',
  '..kkrrrrrrrrkk..',
  '....kzz..zzk....',
  '....kdd..ddk....',
  '....kkk..kkk....',
  '................',
  '................',
  '................',
];

const TOTEM_16 = [
  '.....kkkkkk.....',
  '....kBBBBBBk....',
  '...kBbmmmmbBk...',
  '...kBbkkbkkBk...',
  '...kBbeeeebBk...',
  '....kBbbbbBk....',
  '...kBBllllBBk...',
  '...kBbeeeebBk...',
  '....kBbbbbBk....',
  '....kBllllBk....',
  '....kBbbbbBk....',
  '...kBBBBBBBBk...',
  '...kkkkkkkkkk...',
  '................',
  '................',
  '................',
];

const TOTEM_CURSE_16 = [
  '.....kkkkkk.....',
  '....kPPPPPPk....',
  '...kPpccccpPk...',
  '...kPpkkpkkPk...',
  '...kPprrrrpPk...',
  '....kPppppPk....',
  '...kPPxxxxPPk...',
  '...kPpccccpPk...',
  '....kPppppPk....',
  '....kPppppPk....',
  '....kPPPPPPk....',
  '...kPPPPPPPPk...',
  '...kkkkkkkkkk...',
  '................',
  '................',
  '................',
];

const MINI_TREANT_16 = [
  '....kkkkkkkk....',
  '...kMMMMMMMMk...',
  '..kMMmmmmmmMMk..',
  '..kMbBBBBBBbMk..',
  '...kBbkBBkbBk...',
  '...kBbyBBbyBk...',
  '...kBbbbbbbBk...',
  '..kBBbllllbBBk..',
  '..kBBbbbbbbBBk..',
  '...kBBk..kBBk...',
  '...kBBk..kBBk...',
  '...kkk....kkk...',
  '................',
  '................',
  '................',
  '................',
];

const MAGE_TREANT_16 = [
  '......kkkk......',
  '....kkppppkk....',
  '...kpMMMMMMpk...',
  '..kMMccccccMMk..',
  '...kBbkBBkbBk...',
  '...kBbcBBbcBk...',
  '...kBbbbbbbBk...',
  '..kPPbccccbPPk..',
  '..kPPbbbbbbPPk..',
  '...kPPk..kPPk...',
  '...kBBk..kBBk...',
  '...kkk....kkk...',
  '................',
  '................',
  '................',
  '................',
];

// === 20 CHIBI CHARACTER SPRITES ===
const CHAR_BRAM_16 = [
  '....kkkkkkkk....',
  '...kRRRRRRRRk...',
  '...kRrrrrrrRk...',
  '...khhhhhhhhk...',
  '...khhkhhkhhk...',
  '...khhsssshhk...',
  '...kksssssskk...',
  '..kRRbllllbRRk..',
  '.khhRbllllbRhhk.',
  '..kkbbbbbbbbkk..',
  '....kbb..bbk....',
  '....kzz..zzk....',
  '....kBB..BBk....',
  '....kkk..kkk....',
  '................',
  '................',
];

const CHAR_KALA_16 = [
  '.....kkkkkk.....',
  '....keeeeeeek...'.slice(0, 16),
  '...keemmmmeek...',
  '...khhhhhhhhk...',
  '...khhkhhkhhk...',
  '...khhhhhhhhk...',
  '..kkddddddddkk..',
  '.kooeeeeeeeeook.',
  '.khhddddddddhhk.',
  '..kkddddddddkk..',
  '....kzz..zzk....',
  '....kzz..zzk....',
  '....koo..ook....',
  '....kkk..kkk....',
  '................',
  '................',
];

const CHAR_JAKA_16 = [
  '....kkkkkkkk....',
  '...kwwwwwwwwk...',
  '...kwwggggwwk...',
  '...khhhhhhhhk...',
  '...khhkhhkhhk...',
  '...khhhhhhhhk...',
  '..kkwwwwwwwwkk..',
  '.khhwwrrrrwwhhk.',
  '.khhwwwwwwwwhhk.',
  '..kkzzzzzzzzkk..',
  '....kzz..zzk....',
  '....kzz..zzk....',
  '....kBB..BBk....',
  '....kkk..kkk....',
  '................',
  '................',
];

const CHAR_RONI_16 = [
  '....kkkkkkkk....',
  '...kzzzzzzzzk...',
  '...kzcccccczk...',
  '...khhhhhhhhk...',
  '...khhkhhkhhk...',
  '...khhhhhhhhk...',
  '..kkzzzzzzzzkk..',
  '.khhzzcccczzhhk.',
  '.khhzzzzzzzzhhk.',
  '..kkddddddddkk..',
  '....kzz..zzk....',
  '....kzz..zzk....',
  '....kkk..kkk....',
  '................',
  '................',
  '................',
];

const CHAR_UJANG_16 = [
  '.....kkkkkk.....',
  '....kllllllk....',
  '...kllbbbbllk...',
  '...khhhhhhhhk...',
  '...khhkhhkhhk...',
  '...khhhhhhhhk...',
  '..kLLhhhhhhLLk..',
  '.khhBllbbllBhhk.',
  '..kkbbbbbbbbkk..',
  '....kzz..zzk....',
  '....kBB..BBk....',
  '....kkk..kkk....',
  '................',
  '................',
  '................',
  '................',
];

const CHAR_CECEP_16 = [
  '....kkkkkkkk....',
  '...kcccccccck...',
  '...kccnnnncck...',
  '...khhhhhhhhk...',
  '...khhkhhkhhk...',
  '...khhhhhhhhk...',
  '..kknnnnnnnnkk..',
  '.khhnnccccnnhhk.',
  '..kkzzzzzzzzkk..',
  '....kzz..zzk....',
  '....kcc..cck....',
  '....kkk..kkk....',
  '................',
  '................',
  '................',
  '................',
];

const CHAR_SUTAR_16 = [
  '....kkkkkkkk....',
  '...kAAAAAAAAk...',
  '..kAaaaaaaaaAk..',
  '...khhhhhhhhk...',
  '...khhkhhkhhk...',
  '...khhhhhhhhk...',
  '..kkMMMMMMMMkk..',
  '.khhMMvvvvMMhhk.',
  '..kkbbbbbbbbkk..',
  '....kbb..bbk....',
  '....kBB..BBk....',
  '....kkk..kkk....',
  '................',
  '................',
  '................',
  '................',
];

const CHAR_MANDOR_GUPAL_16 = [
  '....kkkkkkkk....',
  '...kyyyyyyyyk...',
  '..kyyaaaaaayyk..',
  '...khhhhhhhhk...',
  '...khhkhhkhhk...',
  '...khhBBBBhhk...',
  '..kkyyyyyyyykk..',
  '.khhyaaaaaayhhk.',
  '..kkrrrrrrrrkk..',
  '....kzz..zzk....',
  '....kdd..ddk....',
  '....kkk..kkk....',
  '................',
  '................',
  '................',
  '................',
];

const CHAR_DEWI_RIMBA_16 = [
  '....kkkkkkkk....',
  '...kMMMMMMMMk...',
  '..kMMmmmmmmMMk..',
  '...khhhhhhhhk...',
  '...khhkhhkhhk...',
  '...khhhhhhhhk...',
  '..kkEEEEEEEEkk..',
  '.khhEyyyyyyEhhk.',
  '..kkMMMMMMMMkk..',
  '....kEE..EEk....',
  '....kBB..BBk....',
  '....kkk..kkk....',
  '................',
  '................',
  '................',
  '................',
];

const CHAR_MBAH_JAGAT_16 = [
  '....kkkkkkkk....',
  '...kbbbbbbbbk...',
  '..kbppppppppbk..',
  '...khhhhhhhhk...',
  '...khhkhhkhhk...',
  '...khhwwwwhhk...',
  '..kkwwwwwwwwkk..',
  '.khhbppppppbhhk.',
  '..kkbbbbbbbbkk..',
  '....kbb..bbk....',
  '....kBB..BBk....',
  '....kkk..kkk....',
  '................',
  '................',
  '................',
  '................',
];

const CHAR_AGNI_16 = [
  '.....kkkkkk.....',
  '....kooooook....',
  '...koyyyyyyok...',
  '...khhhhhhhhk...',
  '...khhkhhkhhk...',
  '...khhhhhhhhk...',
  '..kkrrrrrrrrkk..',
  '.khhroooooorhhk.',
  '..kkooooooookk..',
  '....kzz..zzk....',
  '....krr..rrk....',
  '....kkk..kkk....',
  '................',
  '................',
  '................',
  '................',
];

const CHAR_SARKA_16 = [
  '....kkkkkkkk....',
  '...kbbbbbbbbk...',
  '...kbrrrrrrbk...',
  '...khhhhhhhhk...',
  '...khhkhhkhhk...',
  '...khhzzzzhhk...',
  '..kkddddddddkk..',
  '.khhdyaaaaydhhk.',
  '..kkzzzzzzzzkk..',
  '....kzz..zzk....',
  '....kBB..BBk....',
  '....kkk..kkk....',
  '................',
  '................',
  '................',
  '................',
];

const CHAR_LESTI_16 = [
  '....kkkkkkkk....',
  '...kCCCCCCCCk...',
  '..kCCccccccCCk..',
  '...khhhhhhhhk...',
  '...khhkhhkhhk...',
  '...khhhhhhhhk...',
  '..kkttttttttkk..',
  '.khhCyyyyyyChhk.',
  '..kkCCCCCCCCkk..',
  '....kzz..zzk....',
  '....kcc..cck....',
  '....kkk..kkk....',
  '................',
  '................',
  '................',
  '................',
];

const CHAR_RATU_DURIAN_16 = [
  '....k.kkkk.k....',
  '...kykyyyykvk...',
  '..kVVyyyyyyVVk..',
  '...khhhhhhhhk...',
  '...khhkhhkhhk...',
  '...khhhhhhhhk...',
  '..kkPPPPPPPPkk..',
  '.khhPyyyyyyPhhk.',
  '..kkVVVVVVVVkk..',
  '....kPP..PPk....',
  '....kyy..yyk....',
  '....kkk..kkk....',
  '................',
  '................',
  '................',
  '................',
];

const CHAR_SILUMAN_KAYU_16 = [
  '....kkkkkkkk....',
  '...kPPPPPPPPk...',
  '..kPpmmmmmmpPk..',
  '...kbbbbbbbbk...',
  '...kbbckkcbBk...',
  '...kbbbbbbbbk...',
  '..kkPPPPPPPPkk..',
  '.kbbPmmmmmmPbbk.',
  '..kkbbbbbbbbkk..',
  '....kbb..bbk....',
  '....kPP..PPk....',
  '....kkk..kkk....',
  '................',
  '................',
  '................',
  '................',
];

const CHAR_NYI_BLORONG_16 = [
  '.....kkkkkk.....',
  '....kyyyyyyk....',
  '...kttttttttk...',
  '...khhhhhhhhk...',
  '...khhkhhkhhk...',
  '...khhhhhhhhk...',
  '..kkEEEEEEEEkk..',
  '.khhEttttttEhhk.',
  '..kkmmmmmmmmkk..',
  '...kttttttttk...',
  '....kEEEEEEk....',
  '.....kkkkkk.....',
  '................',
  '................',
  '................',
  '................',
];

const CHAR_BOCAH_HUTAN_16 = [
  '....kkkkkkkk....',
  '...kMMMMMMMMk...',
  '..kMMppppppMMk..',
  '...kbbbbbbbbk...',
  '...kbbpkkpbbk...',
  '...kbbbbbbbbk...',
  '..kkbbbbbbbbkk..',
  '.khhbppppppbhhk.',
  '..kkMMMMMMMMkk..',
  '....kbb..bbk....',
  '....kBB..BBk....',
  '....kkk..kkk....',
  '................',
  '................',
  '................',
  '................',
];

const CHAR_RIMBA_16 = [
  '...k..kkkk..k...',
  '..kxkxxyyxxkxk..',
  '..kxxMMMMMMxxk..',
  '...kbbbbbbbbk...',
  '...kbbxkkxbbk...',
  '...kbbbyybbbk...',
  '..kkxxxxxxxxkk..',
  '.kxxbMMMMMMbxxk.',
  '..kkxxxxxxxxkk..',
  '....kxx..xxk....',
  '....kyy..yyk....',
  '....kkk..kkk....',
  '................',
  '................',
  '................',
  '................',
];

const CHAR_LOKA_16 = [
  '....k.kkkk.k....',
  '...kxkxxxxkxk...',
  '..kPPxxxxxxPPk..',
  '...kssssssssk...',
  '...kssxkkxssk...',
  '...kssssssssk...',
  '..kkxxxxxxxxkk..',
  '.kssPxxxxxxPssk.',
  '..kkPPPPPPPPkk..',
  '....kxx..xxk....',
  '....kPP..PPk....',
  '....kkk..kkk....',
  '................',
  '................',
  '................',
  '................',
];

const CHAR_DRAKSA_16 = [
  '..k.kkkkkkkk.k..',
  '.kxkyyxxxxxykxk.',
  '..kVVxxxxxxVVk..',
  '...kssssssssk...',
  '...ksxxkkxxsk...',
  '...kssyyyyssk...',
  '..kkxxxxxxxxkk..',
  '.kxxVyyyyyyVxxk.',
  '..kkxxxxxxxxkk..',
  '....kxx..xxk....',
  '....kyy..yyk....',
  '....kkk..kkk....',
  '................',
  '................',
  '................',
  '................',
];

export interface BiomeTileSet {
  floorA: HTMLCanvasElement;
  floorB: HTMLCanvasElement;
  wall: HTMLCanvasElement;
  torch: HTMLCanvasElement;
  mud: HTMLCanvasElement;
}

export interface SpriteAtlas {
  knight: HTMLCanvasElement;
  archer: HTMLCanvasElement;
  mage: HTMLCanvasElement;
  wood_slime: HTMLCanvasElement;
  thorn_slime: HTMLCanvasElement;
  goblin_scout: HTMLCanvasElement;
  goblin_slinger: HTMLCanvasElement;
  boss_treant: HTMLCanvasElement;
  boss_durian: HTMLCanvasElement;
  mini_durian: HTMLCanvasElement;
  sandal_swallow: HTMLCanvasElement;
  sandal_swallow_v2: HTMLCanvasElement;
  godslayer: HTMLCanvasElement;
  pine_tree: HTMLCanvasElement;
  elder_tree: HTMLCanvasElement;
  crate: HTMLCanvasElement;
  wood_log: HTMLCanvasElement;
  ironwood_log: HTMLCanvasElement;
  elderwood_core: HTMLCanvasElement;
  potion: HTMLCanvasElement;
  berry: HTMLCanvasElement;
  mana: HTMLCanvasElement;
  gold_coin: HTMLCanvasElement;
  timber_shard: HTMLCanvasElement;
  boss_soul: HTMLCanvasElement;
  blueprint: HTMLCanvasElement;
  gem: HTMLCanvasElement;
  bakso: HTMLCanvasElement;
  ally_kuli: HTMLCanvasElement;
  ally_mandor: HTMLCanvasElement;
  totem: HTMLCanvasElement;
  totem_curse: HTMLCanvasElement;
  mini_treant: HTMLCanvasElement;
  mage_treant: HTMLCanvasElement;
  char_bram: HTMLCanvasElement;
  char_kala: HTMLCanvasElement;
  char_jaka: HTMLCanvasElement;
  char_roni: HTMLCanvasElement;
  char_ujang: HTMLCanvasElement;
  char_cecep: HTMLCanvasElement;
  char_sutar: HTMLCanvasElement;
  char_mandor_gupal: HTMLCanvasElement;
  char_dewi_rimba: HTMLCanvasElement;
  char_mbah_jagat: HTMLCanvasElement;
  char_agni: HTMLCanvasElement;
  char_sarka: HTMLCanvasElement;
  char_lesti: HTMLCanvasElement;
  char_ratu_durian: HTMLCanvasElement;
  char_siluman_kayu: HTMLCanvasElement;
  char_nyi_blorong: HTMLCanvasElement;
  char_bocah_hutan: HTMLCanvasElement;
  char_rimba: HTMLCanvasElement;
  char_loka: HTMLCanvasElement;
  char_draksa: HTMLCanvasElement;
  biomes: {
    rotten_forest: BiomeTileSet;
    durian_swamp: BiomeTileSet;
    ice_crypt: BiomeTileSet;
  };
}

const BIOME_PALETTES = {
  rotten_forest: {
    floorA: '#162417',
    floorB: '#132014',
    groove: '#0b140c',
    grain: '#203821',
    moss: '#2d5a27',
    wallVoid: '#070f08',
    wallTop: '#0f1f11',
    wallLeaf: '#18331a',
    cliffA: '#231911',
    cliffB: '#332418',
    mud: '#1c2b14',
  },
  durian_swamp: {
    floorA: '#241d12',
    floorB: '#20190f',
    groove: '#130e08',
    grain: '#342919',
    moss: '#4d6b1a',
    wallVoid: '#100c07',
    wallTop: '#1d180e',
    wallLeaf: '#2d2613',
    cliffA: '#3b2c15',
    cliffB: '#4f3a1c',
    mud: '#3b3312',
  },
  ice_crypt: {
    floorA: '#132233',
    floorB: '#101d2c',
    groove: '#09121c',
    grain: '#1e354d',
    moss: '#38bdf8',
    wallVoid: '#060c14',
    wallTop: '#0d1a29',
    wallLeaf: '#172d44',
    cliffA: '#1d3247',
    cliffB: '#2a4763',
    mud: '#1a3854',
  },
} as const;

function createBiomeFloorTile(
  biome: keyof typeof BIOME_PALETTES,
  variant: 'A' | 'B' | 'torch' | 'mud'
): HTMLCanvasElement {
  const pal = BIOME_PALETTES[biome];
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = 32;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  ctx.fillStyle = variant === 'A' ? pal.floorA : pal.floorB;
  ctx.fillRect(0, 0, 32, 32);

  ctx.fillStyle = pal.groove;
  ctx.fillRect(0, 7, 32, 1);
  ctx.fillRect(0, 15, 32, 1);
  ctx.fillRect(0, 23, 32, 1);
  ctx.fillRect(0, 31, 32, 1);

  ctx.fillRect(variant === 'A' ? 12 : 20, 0, 1, 8);
  ctx.fillRect(variant === 'A' ? 24 : 8, 8, 1, 8);
  ctx.fillRect(variant === 'A' ? 6 : 16, 16, 1, 8);
  ctx.fillRect(variant === 'A' ? 18 : 26, 24, 1, 8);

  ctx.fillStyle = pal.grain;
  ctx.fillRect(4, 3, 6, 1);
  ctx.fillRect(18, 11, 5, 1);
  ctx.fillRect(10, 19, 7, 1);
  ctx.fillRect(22, 27, 4, 1);

  if (variant === 'B') {
    ctx.fillStyle = pal.moss;
    ctx.fillRect(3, 12, 2, 2);
    ctx.fillRect(25, 4, 2, 1);
  }

  if (variant === 'mud') {
    ctx.fillStyle = pal.mud;
    ctx.fillRect(3, 3, 26, 26);
    ctx.fillStyle = pal.moss;
    ctx.fillRect(6, 7, 8, 5);
    ctx.fillRect(17, 18, 9, 6);
    ctx.fillStyle = biome === 'ice_crypt' ? '#BAE6FD' : '#84CC16';
    ctx.fillRect(9, 9, 2, 2);
    ctx.fillRect(20, 20, 2, 2);
  }

  if (variant === 'torch') {
    ctx.fillStyle = pal.cliffA;
    ctx.fillRect(11, 11, 10, 10);
    ctx.fillStyle = pal.cliffB;
    ctx.fillRect(12, 12, 8, 8);
    ctx.fillStyle = biome === 'ice_crypt' ? '#0284C7' : biome === 'rotten_forest' ? '#15803D' : '#B45309';
    ctx.fillRect(13, 13, 6, 6);
    ctx.fillStyle = biome === 'ice_crypt' ? '#38BDF8' : biome === 'rotten_forest' ? '#4ADE80' : '#F59E0B';
    ctx.fillRect(14, 13, 4, 4);
    ctx.fillStyle = biome === 'ice_crypt' ? '#E0F2FE' : '#FDE047';
    ctx.fillRect(15, 14, 2, 2);
  }

  return c;
}

function createBiomeWallTile(biome: keyof typeof BIOME_PALETTES): HTMLCanvasElement {
  const pal = BIOME_PALETTES[biome];
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = 32;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  ctx.fillStyle = pal.wallVoid;
  ctx.fillRect(0, 0, 32, 32);

  ctx.fillStyle = pal.wallTop;
  ctx.fillRect(1, 1, 30, 22);
  ctx.fillStyle = pal.wallLeaf;
  ctx.fillRect(3, 3, 12, 8);
  ctx.fillRect(17, 6, 11, 10);
  ctx.fillRect(5, 14, 14, 6);

  ctx.fillStyle = pal.cliffA;
  ctx.fillRect(0, 23, 32, 9);
  ctx.fillStyle = pal.cliffB;
  ctx.fillRect(2, 24, 8, 6);
  ctx.fillRect(13, 24, 9, 6);
  ctx.fillRect(24, 24, 6, 6);
  ctx.fillStyle = '#0b0e0d';
  ctx.fillRect(0, 31, 32, 1);

  return c;
}

function createBiomeTileSet(biome: keyof typeof BIOME_PALETTES): BiomeTileSet {
  return {
    floorA: createBiomeFloorTile(biome, 'A'),
    floorB: createBiomeFloorTile(biome, 'B'),
    wall: createBiomeWallTile(biome),
    torch: createBiomeFloorTile(biome, 'torch'),
    mud: createBiomeFloorTile(biome, 'mud'),
  };
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
    boss_durian: bakeSprite(BOSS_DURIAN_24, 3),
    mini_durian: bakeSprite(MINI_DURIAN_12, 2),
    sandal_swallow: bakeSprite(SANDAL_SWALLOW_16, 2),
    sandal_swallow_v2: bakeSprite(SANDAL_SWALLOW_V2_16, 2),
    godslayer: bakeSprite(GODSLAYER_16, 2),
    pine_tree: bakeSprite(PINE_TREE_20, 2),
    elder_tree: bakeSprite(ELDER_TREE_20, 2),
    crate: bakeSprite(CRATE_16, 2),
    wood_log: bakeSprite(WOOD_LOG_12, 2),
    ironwood_log: bakeSprite(IRONWOOD_LOG_12, 2),
    elderwood_core: bakeSprite(ELDERWOOD_CORE_12, 2),
    potion: bakeSprite(POTION_12, 2),
    berry: bakeSprite(BERRY_12, 2),
    mana: bakeSprite(MANA_12, 2),
    gold_coin: bakeSprite(GOLD_COIN_12, 2),
    timber_shard: bakeSprite(TIMBER_SHARD_12, 2),
    boss_soul: bakeSprite(BOSS_SOUL_12, 2),
    blueprint: bakeSprite(BLUEPRINT_12, 2),
    gem: bakeSprite(GEM_12, 2),
    bakso: bakeSprite(BAKSO_12, 2),
    ally_kuli: bakeSprite(ALLY_KULI_16, 2),
    ally_mandor: bakeSprite(ALLY_MANDOR_16, 2),
    totem: bakeSprite(TOTEM_16, 2),
    totem_curse: bakeSprite(TOTEM_CURSE_16, 2),
    mini_treant: bakeSprite(MINI_TREANT_16, 2),
    mage_treant: bakeSprite(MAGE_TREANT_16, 2),
    char_bram: bakeSprite(CHAR_BRAM_16, 2),
    char_kala: bakeSprite(CHAR_KALA_16, 2),
    char_jaka: bakeSprite(CHAR_JAKA_16, 2),
    char_roni: bakeSprite(CHAR_RONI_16, 2),
    char_ujang: bakeSprite(CHAR_UJANG_16, 2),
    char_cecep: bakeSprite(CHAR_CECEP_16, 2),
    char_sutar: bakeSprite(CHAR_SUTAR_16, 2),
    char_mandor_gupal: bakeSprite(CHAR_MANDOR_GUPAL_16, 2),
    char_dewi_rimba: bakeSprite(CHAR_DEWI_RIMBA_16, 2),
    char_mbah_jagat: bakeSprite(CHAR_MBAH_JAGAT_16, 2),
    char_agni: bakeSprite(CHAR_AGNI_16, 2),
    char_sarka: bakeSprite(CHAR_SARKA_16, 2),
    char_lesti: bakeSprite(CHAR_LESTI_16, 2),
    char_ratu_durian: bakeSprite(CHAR_RATU_DURIAN_16, 2),
    char_siluman_kayu: bakeSprite(CHAR_SILUMAN_KAYU_16, 2),
    char_nyi_blorong: bakeSprite(CHAR_NYI_BLORONG_16, 2),
    char_bocah_hutan: bakeSprite(CHAR_BOCAH_HUTAN_16, 2),
    char_rimba: bakeSprite(CHAR_RIMBA_16, 2),
    char_loka: bakeSprite(CHAR_LOKA_16, 2),
    char_draksa: bakeSprite(CHAR_DRAKSA_16, 2),
    biomes: {
      rotten_forest: createBiomeTileSet('rotten_forest'),
      durian_swamp: createBiomeTileSet('durian_swamp'),
      ice_crypt: createBiomeTileSet('ice_crypt'),
    },
  };
  return cachedAtlas;
}
