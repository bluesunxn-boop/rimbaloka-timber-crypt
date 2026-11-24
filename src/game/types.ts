export type HeroClassId = 'knight' | 'archer' | 'mage';

export type Rarity = 'common' | 'rare' | 'epic' | 'langka' | 'mythic' | 'legendary';

export type WeaponKind = 'melee' | 'bow' | 'staff';

export type GameScreen =
  | 'CLASS_SELECT'
  | 'PLAYING'
  | 'PAUSED'
  | 'INVENTORY'
  | 'SKILL_TREE'
  | 'VICTORY'
  | 'GAME_OVER';

export interface WeaponDef {
  id: string;
  name: string;
  rarity: Rarity;
  kind: WeaponKind;
  damage: number;
  cooldown: number; // seconds
  manaCost: number;
  range: number; // pixels
  projectileSpeed?: number;
  projectileCount?: number;
  spreadAngle?: number; // radians
  critBonus: number; // 0 - 1
  chopMultiplier: number;
  description: string;
  spriteKey: string;
  color: string;
}

export interface WeaponInstance {
  uid: string;
  defId: string;
}

export interface CraftingRecipe {
  id: string;
  resultType: 'weapon' | 'potion';
  weaponId?: string;
  name: string;
  rarity: Rarity;
  description: string;
  cost: {
    wood: number;
    ironwood: number;
    elderwood: number;
  };
}

export type SkillBranch = 'base' | 'surga' | 'neraka';

export interface SkillNodeDef {
  id: string;
  name: string;
  tier: 1 | 2 | 3 | 4;
  branch: SkillBranch;
  minLevel: number;
  requires?: string;
  cost: number;
  summary: string;
}

export interface HeroClassDef {
  id: HeroClassId;
  name: string;
  title: string;
  description: string;
  maxHp: number;
  maxMana: number;
  manaRegen: number;
  speed: number;
  defense: number;
  critChance: number;
  startingWeaponId: string;
  activeSkillName: string;
  activeSkillCooldown: number;
  activeSkillManaCost: number;
  activeSkillDesc: string;
  accentColor: string;
  skills: SkillNodeDef[];
}

export interface MaterialsBag {
  wood: number;
  ironwood: number;
  elderwood: number;
  potions: number;
}

export interface PlayerState {
  classId: HeroClassId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facingX: number;
  facingY: number;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  level: number;
  exp: number;
  expToNext: number;
  skillPoints: number;
  unlockedSkills: string[];
  chosenPath: 'surga' | 'neraka' | null;
  heavenShieldReady: boolean;
  heavenShieldCooldown: number;
  equippedWeapons: [WeaponInstance, WeaponInstance | null];
  activeWeaponSlot: 0 | 1;
  backpack: WeaponInstance[];
  materials: MaterialsBag;
  attackTimer: number;
  skillTimer: number;
  skillCooldownMax: number;
  invulnTimer: number;
  shieldTimer: number;
  hasteTimer: number;
  animTime: number;
  kills: number;
  treesChopped: number;
  score: number;
}

export type TileType = 0 | 1 | 2 | 3;
// 0 = void/dark canopy, 1 = mossy wooden floor, 2 = dark bark wall, 3 = torch floor

export interface RoomRect {
  id: number;
  x: number; // tile coords
  y: number;
  w: number;
  h: number;
  kind: 'start' | 'combat' | 'timber' | 'shrine' | 'boss';
  cleared: boolean;
  discovered: boolean;
}

export interface ChoppableTree {
  id: string;
  tx: number; // tile x
  ty: number; // tile y
  x: number; // world center x
  y: number; // world center y
  hp: number;
  maxHp: number;
  variant: 'pine' | 'elder' | 'crate';
  hitFlash: number;
  shakeTimer: number;
  blocksPath: boolean;
}

export type EnemyKind =
  | 'wood_slime'
  | 'thorn_slime'
  | 'goblin_scout'
  | 'goblin_slinger'
  | 'boss_treant';

export interface EnemyEntity {
  id: string;
  kind: EnemyKind;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  roomId: number;
  patrolOriginX: number;
  patrolOriginY: number;
  patrolTargetX: number;
  patrolTargetY: number;
  patrolWait: number;
  alerted: boolean;
  attackCooldown: number;
  windupTimer: number;
  windupKind: 'none' | 'lunge' | 'shoot' | 'radial' | 'slam' | 'summon';
  facingX: number;
  hitFlash: number;
  freezeTimer: number;
  poisonTimer: number;
  poisonDps: number;
  burnTimer: number;
  burnDps: number;
  isMiniBoss?: boolean;
  animTime: number;
  phase: 1 | 2;
  expReward: number;
}

export interface Projectile {
  id: string;
  fromPlayer: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  isCrit: boolean;
  life: number;
  color: string;
  kind: 'arrow' | 'orb' | 'slash_wave' | 'sap' | 'dart' | 'thorn';
  pierceLeft: number;
  hitIds: string[];
  aoeRadius?: number;
  chainCount?: number;
  chopMultiplier: number;
}

export interface GroundDrop {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  kind: 'wood' | 'ironwood' | 'elderwood' | 'hp_berry' | 'mana_shard' | 'potion' | 'weapon';
  amount: number;
  rarity: Rarity;
  weaponDefId?: string;
  bobPhase: number;
  life: number;
}

export interface SlamTelegraph {
  id: string;
  x: number;
  y: number;
  radius: number;
  timer: number;
  maxTimer: number;
  damage: number;
}

export interface SlashArc {
  x: number;
  y: number;
  angle: number;
  range: number;
  color: string;
  timer: number;
  maxTimer: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  gravity?: number;
}

export interface FloatingText {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  scale?: number;
}

export interface DungeonState {
  floor: number;
  width: number;
  height: number;
  tiles: TileType[][];
  rooms: RoomRect[];
  trees: ChoppableTree[];
  enemies: EnemyEntity[];
  drops: GroundDrop[];
  projectiles: Projectile[];
  slams: SlamTelegraph[];
  slashes: SlashArc[];
  particles: Particle[];
  floatingTexts: FloatingText[];
  portalOpen: boolean;
  portalX: number;
  portalY: number;
  bossDefeated: boolean;
}

export interface HudSnapshot {
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  level: number;
  exp: number;
  expToNext: number;
  skillPoints: number;
  chosenPath: 'surga' | 'neraka' | null;
  heavenShieldReady: boolean;
  classId: HeroClassId;
  activeWeapon: WeaponDef;
  secondaryWeapon: WeaponDef | null;
  activeWeaponSlot: 0 | 1;
  materials: MaterialsBag;
  skillCooldown: number;
  skillCooldownMax: number;
  floor: number;
  kills: number;
  treesChopped: number;
  score: number;
  boss: {
    name: string;
    hp: number;
    maxHp: number;
    phase: 1 | 2;
  } | null;
  nearInteractHint: string | null;
  portalOpen: boolean;
  roomsDiscovered: number;
  totalRooms: number;
  minimapRooms: Array<{
    x: number;
    y: number;
    w: number;
    h: number;
    kind: RoomRect['kind'];
    discovered: boolean;
    cleared: boolean;
  }>;
  playerTileX: number;
  playerTileY: number;
  mapWidth: number;
  mapHeight: number;
}

export interface ActiveRunSave {
  savedAt: number;
  floor: number;
  player: Omit<PlayerState, 'vx' | 'vy' | 'attackTimer' | 'invulnTimer' | 'shieldTimer' | 'hasteTimer' | 'animTime'>;
}

export interface MetaProgress {
  totalRuns: number;
  bestFloor: number;
  bossesSlain: number;
  totalWoodHarvested: number;
  bestScore: number;
}
