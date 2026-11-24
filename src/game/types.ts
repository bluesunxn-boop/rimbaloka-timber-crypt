export type HeroClassId = 'knight' | 'archer' | 'mage';

export type ControlMode = 'dpad' | 'analog';

export type DpadSize = 'small' | 'medium' | 'large';

export type CharacterId =
  | 'bram'
  | 'kala'
  | 'jaka'
  | 'roni'
  | 'ujang'
  | 'cecep'
  | 'sutar'
  | 'mandor_gupal'
  | 'dewi_rimba'
  | 'mbah_jagat'
  | 'agni'
  | 'sarka'
  | 'lesti'
  | 'ratu_durian'
  | 'siluman_kayu'
  | 'nyi_blorong'
  | 'bocah_hutan'
  | 'rimba'
  | 'loka'
  | 'draksa';

export type CharacterRarity = 'common' | 'gold' | 'mythic' | 's1';

export type Rarity =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'epic'
  | 'langka'
  | 'mythic'
  | 'legendary';

export type WeaponKind = 'melee' | 'bow' | 'staff';

export type BiomeId = 'rotten_forest' | 'durian_swamp' | 'ice_crypt';

export type GameScreen =
  | 'CLASS_SELECT'
  | 'PLAYING'
  | 'PAUSED'
  | 'INVENTORY'
  | 'SKILL_TREE'
  | 'VICTORY'
  | 'GAME_OVER';

export interface CharacterDef {
  id: CharacterId;
  name: string;
  title: string;
  rarity: CharacterRarity;
  spriteKey: string;
  signatureWeaponId: string;
  passiveName: string;
  passiveDesc: string;
  synergyClass: HeroClassId | 'any';
  synergyName: string;
  synergyDesc: string;
  isUltimate?: boolean;
  gachaVoicePitch: number;
  gachaSfxStyle: 'wood' | 'swift' | 'sizzle' | 'whistle' | 'mystic' | 'durian' | 'divine';
}

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
  knockbackMult?: number;
  sfxKind?: 'plok';
  swingVisual?: 'sandal_spin';
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

export interface BlueprintDef {
  id: string;
  weaponId: string;
  name: string;
  rarity: 'epic' | 'legendary';
  goldCost: number;
  shardCost: number;
  soulCost: number;
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
  gold: number;
  timberShards: number;
  bossSouls: number;
  gems: number;
}

export interface PlayerState {
  classId: HeroClassId;
  characterId: CharacterId;
  synergyActive: boolean;
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
  stunTimer: number;
  stealthTimer: number;
  stealthCooldown: number;
  umbrellaReady: boolean;
  umbrellaCooldown: number;
  rainTimer: number;
  rainCooldown: number;
  forestAliveTimer: number;
  reincarnatedUsed: boolean;
  ultimateUsed: boolean;
  dashCharges: number;
  dashRechargeTimer: number;
  killCounter: number;
  animTime: number;
  kills: number;
  treesChopped: number;
  score: number;
}

export type TileType = 0 | 1 | 2 | 3 | 4;
// 0 = void/dark canopy, 1 = biome floor, 2 = biome wall, 3 = torch floor, 4 = sticky mud / hazard tile

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
  | 'boss_treant'
  | 'boss_durian';

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
  windupKind:
    | 'none'
    | 'lunge'
    | 'shoot'
    | 'radial'
    | 'slam'
    | 'summon'
    | 'leap'
    | 'durian_throw'
    | 'roll_charge';
  facingX: number;
  hitFlash: number;
  freezeTimer: number;
  poisonTimer: number;
  poisonDps: number;
  burnTimer: number;
  burnDps: number;
  fearTimer?: number;
  pacifiedTimer?: number;
  atkDebuffTimer?: number;
  slipCooldown?: number;
  isMiniBoss?: boolean;
  rollTimer?: number;
  rollVx?: number;
  rollVy?: number;
  rollHitDone?: boolean;
  jumpTimer?: number;
  jumpMaxTimer?: number;
  jumpStartX?: number;
  jumpStartY?: number;
  jumpTargetX?: number;
  jumpTargetY?: number;
  spinAngle?: number;
  aimAngle?: number;
  kbVx?: number;
  kbVy?: number;
  kbTimer?: number;
  nightBuffed?: boolean;
  baseMaxHp?: number;
  baseDamage?: number;
  animTime: number;
  phase: 1 | 2;
  expReward: number;
}

export interface AllyEntity {
  id: string;
  kind: 'kuli' | 'mandor_elite' | 'totem' | 'totem_curse' | 'mini_treant' | 'mage_treant';
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  damage: number;
  life: number;
  attackTimer: number;
  pulseTimer: number;
  facingX: number;
}

export interface FloorZone {
  id: string;
  kind: 'fire_trail' | 'blackhole' | 'whirlpool' | 'root_spike' | 'meteor_telegraph';
  x: number;
  y: number;
  radius: number;
  damage: number;
  life: number;
  maxLife: number;
  tickTimer: number;
  pullStrength?: number;
}

export interface LightningArc {
  points: Array<{ x: number; y: number }>;
  color: string;
  life: number;
  maxLife: number;
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
  kind:
    | 'arrow'
    | 'orb'
    | 'slash_wave'
    | 'sap'
    | 'dart'
    | 'thorn'
    | 'mini_durian'
    | 'bakso'
    | 'rotten_durian'
    | 'doll';
  pierceLeft: number;
  hitIds: string[];
  aoeRadius?: number;
  chainCount?: number;
  stunDuration?: number;
  rootDuration?: number;
  poisonDps?: number;
  burnDps?: number;
  pullPlayerTarget?: boolean;
  spawnZoneKind?: FloorZone['kind'];
  summonKind?: AllyEntity['kind'];
  ignoreWalls?: boolean;
  explodeOnExpire?: boolean;
  chopMultiplier: number;
}

export interface GroundDrop {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  kind:
    | 'wood'
    | 'ironwood'
    | 'elderwood'
    | 'hp_berry'
    | 'mana_shard'
    | 'potion'
    | 'weapon'
    | 'gold'
    | 'timber_shard'
    | 'boss_soul'
    | 'blueprint'
    | 'gem'
    | 'bakso';
  amount: number;
  rarity: Rarity;
  weaponDefId?: string;
  blueprintId?: string;
  bobPhase: number;
  life: number;
}

export type TrapKind = 'spikes' | 'flame_jet' | 'falling_durian' | 'root_snare';

export interface TrapEntity {
  id: string;
  kind: TrapKind;
  x: number;
  y: number;
  radius: number;
  damage: number;
  cycleTimer: number;
  period: number;
  state: 'idle' | 'warning' | 'active';
  stateTimer: number;
  dirX?: number;
  dirY?: number;
  hitThisCycle?: boolean;
  oneShot?: boolean;
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
  visual?: 'arc' | 'sandal_spin';
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
  biome: BiomeId;
  width: number;
  height: number;
  tiles: TileType[][];
  rooms: RoomRect[];
  trees: ChoppableTree[];
  traps: TrapEntity[];
  enemies: EnemyEntity[];
  allies: AllyEntity[];
  zones: FloorZone[];
  arcs: LightningArc[];
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
  stunTimer: number;
  classId: HeroClassId;
  characterId: CharacterId;
  characterName: string;
  synergyActive: boolean;
  synergyName: string;
  stealthTimer: number;
  rainActive: boolean;
  forestAliveTimer: number;
  reincarnatedUsed: boolean;
  ultimateUsed: boolean;
  dashCharges: number;
  activeWeapon: WeaponDef;
  secondaryWeapon: WeaponDef | null;
  activeWeaponSlot: 0 | 1;
  materials: MaterialsBag;
  maxPotions: number;
  skillCooldown: number;
  skillCooldownMax: number;
  dodgeDashCooldown: number;
  floor: number;
  biome: BiomeId;
  biomeName: string;
  kills: number;
  treesChopped: number;
  score: number;
  goldLostOnDeath: number;
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
  timeOfDay: 'day' | 'night';
  cycleRemaining: number;
}

export interface ActiveRunSave {
  savedAt: number;
  floor: number;
  dayCycleTime?: number;
  player: Omit<
    PlayerState,
    | 'vx'
    | 'vy'
    | 'attackTimer'
    | 'invulnTimer'
    | 'shieldTimer'
    | 'hasteTimer'
    | 'stunTimer'
    | 'animTime'
  >;
}

export interface MetaProgress {
  totalRuns: number;
  bestFloor: number;
  bossesSlain: number;
  totalWoodHarvested: number;
  bestScore: number;
  gold: number;
  gems: number;
  timberShards: number;
  bossSouls: number;
  blueprints: string[];
  craftedWeapons: string[];
  equippedBlacksmithWeaponId: string | null;
  unlockedCharacters: CharacterId[];
  selectedCharacterId: CharacterId;
  controlMode: ControlMode;
  dpadSize: DpadSize;
  controlSchemaVersion?: number;
}
