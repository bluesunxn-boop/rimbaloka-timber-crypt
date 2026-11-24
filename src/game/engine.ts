import { sfx } from './audio';
import {
  BIOME_META,
  BLUEPRINTS,
  CHARACTER_MAP,
  CRAFTING_RECIPES,
  HERO_CLASSES,
  isCharacterSynergyActive,
  MAX_POTIONS,
  RARITY_META,
  WEAPONS,
} from './data';
import { generateDungeon, nextId, spawnEnemyInRoom, TILE_SIZE } from './dungeon';
import { getSpriteAtlas, SpriteAtlas } from './sprites';
import {
  addMetaLoot,
  loadMetaProgress,
  loseHalfGoldOnDeath,
  saveActiveRun,
  updateMetaProgress,
} from './storage';
import {
  ActiveRunSave,
  AllyEntity,
  CharacterId,
  ChoppableTree,
  DungeonState,
  EnemyEntity,
  FloorZone,
  GroundDrop,
  HeroClassId,
  HudSnapshot,
  PlayerState,
  Rarity,
  WeaponDef,
  WeaponInstance,
} from './types';

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  attack: boolean;
  skill: boolean;
  joyX: number;
  joyY: number;
  pointerAimActive: boolean;
  pointerWorldX: number;
  pointerWorldY: number;
}

interface Firefly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
}

export class GameEngine {
  public player: PlayerState;
  public dungeon: DungeonState;
  public input: InputState = {
    up: false,
    down: false,
    left: false,
    right: false,
    attack: false,
    skill: false,
    joyX: 0,
    joyY: 0,
    pointerAimActive: false,
    pointerWorldX: 0,
    pointerWorldY: 0,
  };

  private atlas: SpriteAtlas;
  private camX = 0;
  private camY = 0;
  private shakeTimer = 0;
  private shakeDuration = 0;
  private shakeMagnitude = 0;
  private damageFlashTimer = 0;
  private reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  private fireflies: Firefly[] = [];
  private saveCooldown = 0;
  private hudSyncCooldown = 0;
  private dotTickTimer = 0.5;
  private readonly phaseDuration = 120; // 2 menit siang, 2 menit malam
  public dayCycleTime = 0;
  private nightBlend = 0;
  private nightCanvas: HTMLCanvasElement | null = null;
  private torchSparkTimer = 0;
  private biomeHazardTimer = 3.5;
  private rootSlowTimer = 0;
  private mudFxTimer = 0;
  private iceSlideVx = 0;
  private iceSlideVy = 0;
  private goldLostOnDeath = 0;
  private mandorShoutTimer = 4;
  private godRootTimer = 6;
  private forestSpikeSpawnTimer = 0.45;
  private bossHalvedThisFloor = false;
  private dodgeDashTimer = 0;

  public onHudUpdate?: (hud: HudSnapshot) => void;
  public onVictory?: () => void;
  public onGameOver?: () => void;
  public onToast?: (msg: string, color?: string) => void;

  public get isNight(): boolean {
    return this.dayCycleTime >= this.phaseDuration;
  }

  public getMaxPotions(charId: CharacterId = this.player?.characterId ?? 'bram'): number {
    return charId === 'ujang' ? MAX_POTIONS + 1 : MAX_POTIONS;
  }

  constructor(
    classId: HeroClassId,
    characterId: CharacterId = 'bram',
    resumeSave?: ActiveRunSave | null
  ) {
    this.atlas = getSpriteAtlas();
    const meta = loadMetaProgress();
    if (resumeSave) {
      this.dayCycleTime = resumeSave.dayCycleTime ?? 0;
      this.nightBlend = this.isNight ? 1 : 0;
      this.dungeon = generateDungeon(resumeSave.floor);
      const startRoom = this.dungeon.rooms[0];
      const sp = resumeSave.player;
      const charId: CharacterId =
        sp.characterId && CHARACTER_MAP[sp.characterId] ? sp.characterId : characterId;
      const synergyActive = isCharacterSynergyActive(charId, sp.classId);
      const maxPot = this.getMaxPotions(charId);
      this.player = {
        ...sp,
        characterId: charId,
        synergyActive,
        materials: {
          ...sp.materials,
          potions: Math.min(maxPot, sp.materials.potions ?? 1),
          gold: meta.gold,
          timberShards: meta.timberShards,
          bossSouls: meta.bossSouls,
          gems: meta.gems,
        },
        chosenPath: sp.chosenPath ?? null,
        heavenShieldReady: sp.heavenShieldReady ?? false,
        heavenShieldCooldown: sp.heavenShieldCooldown ?? 0,
        stealthTimer: sp.stealthTimer ?? 0,
        stealthCooldown: sp.stealthCooldown ?? 0,
        umbrellaReady: sp.umbrellaReady ?? charId === 'lesti',
        umbrellaCooldown: sp.umbrellaCooldown ?? 0,
        rainTimer: sp.rainTimer ?? 0,
        rainCooldown: sp.rainCooldown ?? 30,
        forestAliveTimer: sp.forestAliveTimer ?? 0,
        reincarnatedUsed: sp.reincarnatedUsed ?? false,
        ultimateUsed: sp.ultimateUsed ?? false,
        dashCharges: sp.dashCharges ?? (charId === 'kala' && synergyActive ? 2 : 1),
        dashRechargeTimer: sp.dashRechargeTimer ?? 0,
        killCounter: sp.killCounter ?? 0,
        x: (startRoom.x + startRoom.w / 2) * TILE_SIZE,
        y: (startRoom.y + startRoom.h / 2) * TILE_SIZE,
        vx: 0,
        vy: 0,
        attackTimer: 0,
        invulnTimer: 0,
        shieldTimer: 0,
        hasteTimer: 0,
        stunTimer: 0,
        animTime: 0,
      };
    } else {
      this.dungeon = generateDungeon(1);
      const cls = HERO_CLASSES[classId];
      const charDef = CHARACTER_MAP[characterId] ?? CHARACTER_MAP.bram;
      const synergyActive = isCharacterSynergyActive(charDef.id, classId);
      const startRoom = this.dungeon.rooms[0];

      const forgedBonus =
        meta.equippedBlacksmithWeaponId &&
        meta.craftedWeapons.includes(meta.equippedBlacksmithWeaponId) &&
        WEAPONS[meta.equippedBlacksmithWeaponId]
          ? { uid: nextId('wpn'), defId: meta.equippedBlacksmithWeaponId }
          : null;

      const secondaryStart: WeaponInstance | null =
        forgedBonus ??
        (cls.startingWeaponId !== charDef.signatureWeaponId
          ? { uid: nextId('wpn'), defId: cls.startingWeaponId }
          : null);

      this.player = {
        classId,
        characterId: charDef.id,
        synergyActive,
        x: (startRoom.x + startRoom.w / 2) * TILE_SIZE,
        y: (startRoom.y + startRoom.h / 2) * TILE_SIZE,
        vx: 0,
        vy: 0,
        facingX: 1,
        facingY: 0,
        hp: cls.maxHp,
        maxHp: cls.maxHp,
        mana: cls.maxMana,
        maxMana: cls.maxMana,
        level: 1,
        exp: 0,
        expToNext: 60,
        skillPoints: 0,
        unlockedSkills: [],
        chosenPath: null,
        heavenShieldReady: false,
        heavenShieldCooldown: 0,
        equippedWeapons: [
          { uid: nextId('wpn'), defId: charDef.signatureWeaponId },
          secondaryStart,
        ],
        activeWeaponSlot: 0,
        backpack: [],
        materials: {
          wood: 4,
          ironwood: 0,
          elderwood: 0,
          potions: charDef.id === 'ujang' ? 2 : 1,
          gold: meta.gold,
          timberShards: meta.timberShards,
          bossSouls: meta.bossSouls,
          gems: meta.gems,
        },
        attackTimer: 0,
        skillTimer: 0,
        skillCooldownMax: cls.activeSkillCooldown,
        invulnTimer: 0,
        shieldTimer: 0,
        hasteTimer: 0,
        stunTimer: 0,
        stealthTimer: 0,
        stealthCooldown: 0,
        umbrellaReady: charDef.id === 'lesti',
        umbrellaCooldown: 0,
        rainTimer: 0,
        rainCooldown: 30,
        forestAliveTimer: 0,
        reincarnatedUsed: false,
        ultimateUsed: false,
        dashCharges: charDef.id === 'kala' && synergyActive ? 2 : 1,
        dashRechargeTimer: 0,
        killCounter: 0,
        animTime: 0,
        kills: 0,
        treesChopped: 0,
        score: 0,
      };
      updateMetaProgress({ totalRuns: meta.totalRuns + 1 });
    }

    this.camX = this.player.x;
    this.camY = this.player.y;
    this.initFireflies();
    this.syncNightEnemyBuffs();
    this.onFloorEntered();
    saveActiveRun(this.player, this.dungeon.floor, this.dayCycleTime);
  }

  private onFloorEntered() {
    this.bossHalvedThisFloor = false;

    // Mbah Jagat: Tiap lantai genap summon 1 Totem Kayu heal area
    if (this.player.characterId === 'mbah_jagat' && this.dungeon.floor % 2 === 0) {
      this.spawnAlly(
        this.player.synergyActive ? 'totem_curse' : 'totem',
        this.player.x + 26,
        this.player.y + 12,
        45
      );
      this.addFloatingText(
        this.player.x,
        this.player.y - 30,
        this.player.synergyActive ? 'Totem Kutukan Bangkit!' : 'Totem Kayu Bangkit!',
        '#4ADE80',
        1.1
      );
    }

    // Bocah Hutan: Boss Treant tidak langsung serang 5 detik pertama
    if (this.player.characterId === 'bocah_hutan') {
      for (const e of this.dungeon.enemies) {
        if (e.kind === 'boss_treant') {
          e.pacifiedTimer = 5.0;
        }
      }
    }
  }

  public setPointerScreenPos(sx: number, sy: number, viewW: number, viewH: number) {
    const zoom = viewW < 640 ? 1.35 : 1.55;
    this.input.pointerWorldX = this.camX + (sx - viewW / 2) / zoom;
    this.input.pointerWorldY = this.camY + (sy - viewH / 2) / zoom;
    this.input.pointerAimActive = true;
  }

  private initFireflies() {
    this.fireflies = [];
    for (let i = 0; i < 85; i++) {
      this.fireflies.push({
        x: Math.random() * this.dungeon.width * TILE_SIZE,
        y: Math.random() * this.dungeon.height * TILE_SIZE,
        vx: (Math.random() - 0.5) * 20,
        vy: (Math.random() - 0.5) * 20,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  private syncNightEnemyBuffs() {
    const night = this.isNight;
    for (const e of this.dungeon.enemies) {
      if (night && !e.nightBuffed) {
        e.baseMaxHp = e.maxHp;
        e.baseDamage = e.damage;
        e.maxHp = Math.round(e.baseMaxHp * 2);
        e.hp = Math.round(e.hp * 2);
        e.damage = Math.round(e.baseDamage * 1.5);
        e.nightBuffed = true;
      } else if (!night && e.nightBuffed) {
        e.maxHp = e.baseMaxHp ?? Math.max(1, Math.round(e.maxHp * 0.5));
        e.hp = Math.min(e.maxHp, Math.max(1, Math.round(e.hp * 0.5)));
        e.damage = e.baseDamage ?? Math.max(1, Math.round(e.damage / 1.5));
        e.nightBuffed = false;
      }
    }
  }

  public descendToNextFloor() {
    const nextFloor = this.dungeon.floor + 1;
    const prevBiome = this.dungeon.biome;
    this.dungeon = generateDungeon(nextFloor, prevBiome);
    const startRoom = this.dungeon.rooms[0];
    this.player.x = (startRoom.x + startRoom.w / 2) * TILE_SIZE;
    this.player.y = (startRoom.y + startRoom.h / 2) * TILE_SIZE;
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + Math.round(this.player.maxHp * 0.35));
    this.player.mana = this.player.maxMana;
    this.player.stunTimer = 0;
    this.iceSlideVx = 0;
    this.iceSlideVy = 0;
    this.rootSlowTimer = 0;
    this.biomeHazardTimer = 3.5;
    this.camX = this.player.x;
    this.camY = this.player.y;
    this.initFireflies();
    this.syncNightEnemyBuffs();
    this.onFloorEntered();
    updateMetaProgress({ bestFloor: nextFloor });
    saveActiveRun(this.player, this.dungeon.floor, this.dayCycleTime);
    const bMeta = BIOME_META[this.dungeon.biome];
    this.addFloatingText(this.player.x, this.player.y - 24, `Lantai ${nextFloor} · ${bMeta.name}`, bMeta.accent, 1.2);
    this.onToast?.(`Bioma ${bMeta.name}: ${bMeta.hazard}`, bMeta.accent);
    this.emitHud();
  }

  public hasSkill(id: string): boolean {
    return this.player.unlockedSkills.includes(id);
  }

  private getComputedStats() {
    const cls = HERO_CLASSES[this.player.classId];
    let maxHp = cls.maxHp + (this.player.level - 1) * 10;
    let maxMana = cls.maxMana + (this.player.level - 1) * 5;
    let manaRegen = cls.manaRegen;
    let speed = cls.speed;
    let defense = cls.defense;
    let critChance = cls.critChance;
    let critMult = 1.65;
    let meleeMult = 1;
    let bowMult = 1;
    let staffMult = 1;
    let chopBonus = 1;
    let atkSpeedMult = 1;

    if (this.hasSkill('k_iron_skin')) {
      maxHp += 25;
      defense += 2;
    }
    if (this.hasSkill('k_heavy_swing')) {
      meleeMult += 0.2;
      chopBonus += 0.4;
    }

    if (this.hasSkill('a_wind_step')) {
      speed *= 1.14;
      maxMana += 15;
    }
    if (this.hasSkill('a_eagle_eye')) {
      critChance += 0.14;
      critMult += 0.25;
    }

    if (this.hasSkill('m_mana_well')) {
      maxMana += 35;
      manaRegen *= 1.35;
    }
    if (this.hasSkill('m_arcane_edge')) {
      staffMult += 0.22;
    }

    if (this.hasSkill('a_surga_1')) {
      critChance += 0.15;
    }

    if (this.hasSkill('k_neraka_2')) {
      meleeMult += 0.45;
      bowMult += 0.45;
      staffMult += 0.45;
      atkSpeedMult += 0.25;
    }
    if (this.hasSkill('a_neraka_2')) {
      bowMult += 0.45;
      critMult += 0.2;
    }
    if (this.hasSkill('m_neraka_2')) {
      staffMult += 0.45;
    }

    if (this.player.hasteTimer > 0) speed *= 1.22;

    // 20-Character Passives in Stat Computation
    const cid = this.player.characterId;
    if (cid === 'kala' && this.player.hp < this.player.maxHp * 0.3) {
      speed *= 1.2;
    }
    if (cid === 'roni' && this.isNight) {
      defense = Math.round((defense + 3) * 1.3);
    }
    if (cid === 'cecep') {
      critChance += 0.1;
      meleeMult *= 0.95;
      bowMult *= 0.95;
      staffMult *= 0.95;
    }
    if (cid === 'sutar' && this.dungeon.biome === 'rotten_forest') {
      meleeMult *= 1.4;
      bowMult *= 1.4;
      staffMult *= 1.4;
    }
    const activeWep = this.getActiveWeapon();
    if (activeWep.id === 'sig_sabit_magang') {
      const missingRatio = Math.max(0, 1 - this.player.hp / Math.max(1, this.player.maxHp));
      atkSpeedMult += missingRatio * 0.85;
    }
    if (activeWep.id === 'sig_balok_kayu' && cid === 'ujang' && this.player.synergyActive) {
      meleeMult *= 1.35;
    }
    if (cid === 'siluman_kayu' && this.player.stealthTimer > 0 && this.player.synergyActive) {
      bowMult *= 1.85;
      critChance += 0.75;
    }

    return {
      maxHp,
      maxMana,
      manaRegen,
      speed,
      defense,
      critChance,
      critMult,
      meleeMult,
      bowMult,
      staffMult,
      chopBonus,
      atkSpeedMult,
    };
  }

  public getActiveWeapon(): WeaponDef {
    const inst =
      this.player.equippedWeapons[this.player.activeWeaponSlot] ||
      this.player.equippedWeapons[0];
    return WEAPONS[inst.defId] || WEAPONS.rusty_blade;
  }

  public switchWeapon() {
    if (!this.player.equippedWeapons[1]) return;
    this.player.activeWeaponSlot = this.player.activeWeaponSlot === 0 ? 1 : 0;
    const w = this.getActiveWeapon();
    this.addFloatingText(this.player.x, this.player.y - 20, w.name, w.color);
    sfx.pickup(false);
    this.emitHud();
  }

  public usePotion(): boolean {
    if (this.player.materials.potions <= 0) {
      this.onToast?.('Ramuan habis! Buat di menu Tas & Craft.', '#EF4444');
      return false;
    }
    if (this.player.hp >= this.player.maxHp && this.player.mana >= this.player.maxMana) {
      return false;
    }
    this.player.materials.potions -= 1;
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + 45);
    this.player.mana = Math.min(this.player.maxMana, this.player.mana + 25);
    this.spawnParticles(this.player.x, this.player.y, '#10B981', 14);
    this.addFloatingText(this.player.x, this.player.y - 22, '+45 HP +25 MP', '#34D399');
    sfx.pickup(true);
    saveActiveRun(this.player, this.dungeon.floor);
    this.emitHud();
    return true;
  }

  public unlockSkill(skillId: string): boolean {
    const cls = HERO_CLASSES[this.player.classId];
    const def = cls.skills.find((s) => s.id === skillId);
    if (!def) return false;
    if (this.hasSkill(skillId)) return false;
    if (this.player.level < def.minLevel) return false;
    if (this.player.skillPoints < def.cost) return false;
    if (def.requires && !this.hasSkill(def.requires)) return false;

    if (def.branch !== 'base') {
      if (this.player.chosenPath && this.player.chosenPath !== def.branch) {
        return false;
      }
      this.player.chosenPath = def.branch;
    }

    const prevMaxHp = this.player.maxHp;
    const prevMaxMana = this.player.maxMana;
    this.player.skillPoints -= def.cost;
    this.player.unlockedSkills.push(skillId);

    if (skillId.endsWith('_surga_1')) {
      this.player.heavenShieldReady = true;
      this.player.heavenShieldCooldown = 0;
    }

    const stats = this.getComputedStats();
    this.player.maxHp = Math.round(stats.maxHp);
    this.player.maxMana = Math.round(stats.maxMana);
    if (this.player.maxHp > prevMaxHp) {
      this.player.hp += this.player.maxHp - prevMaxHp;
    }
    if (this.player.maxMana > prevMaxMana) {
      this.player.mana += this.player.maxMana - prevMaxMana;
    }
    sfx.levelUp();
    saveActiveRun(this.player, this.dungeon.floor);
    this.emitHud();
    return true;
  }

  public craftItem(recipeId: string): { ok: boolean; message: string } {
    const recipe = CRAFTING_RECIPES.find((r) => r.id === recipeId);
    if (!recipe) return { ok: false, message: 'Resep tidak ditemukan.' };

    const m = this.player.materials;
    if (
      m.wood < recipe.cost.wood ||
      m.ironwood < recipe.cost.ironwood ||
      m.elderwood < recipe.cost.elderwood
    ) {
      return { ok: false, message: 'Kayu belum cukup!' };
    }

    if (recipe.resultType === 'potion') {
      const maxPot = this.getMaxPotions();
      if (m.potions >= maxPot) {
        return { ok: false, message: `Ramuan maksimal ${maxPot}/${maxPot}!` };
      }
      m.wood -= recipe.cost.wood;
      m.ironwood -= recipe.cost.ironwood;
      m.elderwood -= recipe.cost.elderwood;
      m.potions = Math.min(maxPot, m.potions + 1);
      sfx.craft();
      saveActiveRun(this.player, this.dungeon.floor, this.dayCycleTime);
      this.emitHud();
      return { ok: true, message: `${recipe.name} berhasil diracik!` };
    }

    m.wood -= recipe.cost.wood;
    m.ironwood -= recipe.cost.ironwood;
    m.elderwood -= recipe.cost.elderwood;

    if (recipe.weaponId) {
      const wInst: WeaponInstance = { uid: nextId('wpn'), defId: recipe.weaponId };
      if (!this.player.equippedWeapons[1]) {
        this.player.equippedWeapons[1] = wInst;
        this.player.activeWeaponSlot = 1;
      } else {
        this.player.backpack.push(wInst);
      }
      sfx.craft();
      saveActiveRun(this.player, this.dungeon.floor, this.dayCycleTime);
      this.emitHud();
      return { ok: true, message: `${recipe.name} berhasil ditempa!` };
    }
    return { ok: false, message: 'Gagal craft.' };
  }

  public equipFromBackpack(uid: string, slot: 0 | 1) {
    const idx = this.player.backpack.findIndex((w) => w.uid === uid);
    if (idx === -1) return;
    const item = this.player.backpack[idx];
    const currentInSlot = this.player.equippedWeapons[slot];
    this.player.equippedWeapons[slot] = item;
    this.player.backpack.splice(idx, 1);
    if (currentInSlot) {
      this.player.backpack.push(currentInSlot);
    }
    this.player.activeWeaponSlot = slot;
    sfx.pickup(false);
    saveActiveRun(this.player, this.dungeon.floor, this.dayCycleTime);
    this.emitHud();
  }

  public salvageWeapon(uid: string): number {
    const idx = this.player.backpack.findIndex((w) => w.uid === uid);
    if (idx === -1) return 0;
    const inst = this.player.backpack[idx];
    const def = WEAPONS[inst.defId];
    this.player.backpack.splice(idx, 1);
    const woodGain = def ? RARITY_META[def.rarity].salvageWood : 2;
    this.player.materials.wood += woodGain;
    sfx.chop();
    saveActiveRun(this.player, this.dungeon.floor, this.dayCycleTime);
    this.emitHud();
    return woodGain;
  }

  public buyPotionWithGold(): { ok: boolean; message: string } {
    const maxPot = this.getMaxPotions();
    if (this.player.materials.potions >= maxPot) {
      return { ok: false, message: `Maksimal hanya bisa bawa ${maxPot} Ramuan!` };
    }
    const cost = 30;
    if (this.player.materials.gold < cost) {
      return { ok: false, message: 'Gold belum cukup (butuh 30 Gold)!' };
    }
    this.player.materials.gold -= cost;
    this.player.materials.potions = Math.min(maxPot, this.player.materials.potions + 1);
    updateMetaProgress({ gold: this.player.materials.gold });
    sfx.craft();
    saveActiveRun(this.player, this.dungeon.floor, this.dayCycleTime);
    this.emitHud();
    return { ok: true, message: 'Berhasil membeli +1 Ramuan Embun!' };
  }

  public update(dt: number) {
    const clampedDt = Math.min(dt, 0.05);
    const stats = this.getComputedStats();

    // Dynamic Day/Night Cycle (2 min Siang -> 2 min Malam -> Siang)
    const wasNight = this.isNight;
    this.dayCycleTime = (this.dayCycleTime + clampedDt) % (this.phaseDuration * 2);
    const nowNight = this.isNight;
    const targetBlend = nowNight ? 1 : 0;
    this.nightBlend += (targetBlend - this.nightBlend) * Math.min(1, clampedDt * 1.4);
    if (wasNight !== nowNight) {
      this.syncNightEnemyBuffs();
      if (nowNight) {
        sfx.bossRoar();
        this.onToast?.(
          'MALAM TIBA! Musuh HP+100% & DMG+50% · Gold x2 & Timber Shard+!',
          '#93C5FD'
        );
        this.addFloatingText(this.player.x, this.player.y - 30, 'MALAM TIBA!', '#93C5FD', 1.2);
      } else {
        sfx.pickup(true);
        this.onToast?.('SIANG TIBA! Hutan kembali terang dan normal.', '#FACC15');
        this.addFloatingText(this.player.x, this.player.y - 30, 'FAJAR TIBA!', '#FDE047', 1.2);
      }
      saveActiveRun(this.player, this.dungeon.floor, this.dayCycleTime);
      this.emitHud();
    }

    // Knight's carried torch sparks at night
    if (this.player.classId === 'knight' && this.nightBlend > 0.25) {
      this.torchSparkTimer -= clampedDt;
      if (this.torchSparkTimer <= 0) {
        this.torchSparkTimer = 0.14;
        const perpX = -this.player.facingY;
        const perpY = this.player.facingX;
        this.dungeon.particles.push({
          x: this.player.x + perpX * 10 + (Math.random() - 0.5) * 3,
          y: this.player.y - 6 + perpY * 4,
          vx: (Math.random() - 0.5) * 14,
          vy: -18 - Math.random() * 14,
          size: 2,
          color: Math.random() < 0.55 ? '#FDE047' : '#F97316',
          life: 0.32,
          maxLife: 0.32,
        });
      }
    }

    // Update timers
    this.player.attackTimer = Math.max(0, this.player.attackTimer - clampedDt);
    this.player.skillTimer = Math.max(0, this.player.skillTimer - clampedDt);
    this.dodgeDashTimer = Math.max(0, this.dodgeDashTimer - clampedDt);
    this.player.invulnTimer = Math.max(0, this.player.invulnTimer - clampedDt);
    this.player.shieldTimer = Math.max(0, this.player.shieldTimer - clampedDt);
    this.player.hasteTimer = Math.max(0, this.player.hasteTimer - clampedDt);
    this.player.stunTimer = Math.max(0, this.player.stunTimer - clampedDt);
    this.rootSlowTimer = Math.max(0, this.rootSlowTimer - clampedDt);
    this.mudFxTimer = Math.max(0, this.mudFxTimer - clampedDt);
    this.shakeTimer = Math.max(0, this.shakeTimer - clampedDt);
    if (this.shakeTimer === 0) {
      this.shakeMagnitude = 0;
      this.shakeDuration = 0;
    }
    this.damageFlashTimer = Math.max(0, this.damageFlashTimer - clampedDt);

    // Character passive & ultimate timers
    this.player.stealthTimer = Math.max(0, this.player.stealthTimer - clampedDt);
    this.player.stealthCooldown = Math.max(0, this.player.stealthCooldown - clampedDt);
    this.player.rainTimer = Math.max(0, this.player.rainTimer - clampedDt);
    this.player.forestAliveTimer = Math.max(0, this.player.forestAliveTimer - clampedDt);

    if (this.player.characterId === 'kala' && this.player.synergyActive && this.player.dashCharges < 2) {
      this.player.dashRechargeTimer -= clampedDt;
      if (this.player.dashRechargeTimer <= 0) {
        this.player.dashCharges += 1;
        this.player.dashRechargeTimer = this.player.dashCharges < 2 ? 3.2 : 0;
      }
    }

    if (this.player.characterId === 'lesti') {
      if (!this.player.umbrellaReady) {
        this.player.umbrellaCooldown = Math.max(0, this.player.umbrellaCooldown - clampedDt);
        if (this.player.umbrellaCooldown <= 0) {
          this.player.umbrellaReady = true;
          this.addFloatingText(this.player.x, this.player.y - 24, 'Payung Petir Siap!', '#38BDF8', 0.95);
        }
      }
      this.player.rainCooldown -= clampedDt;
      if (this.player.rainCooldown <= 0) {
        this.player.rainCooldown = 30;
        this.player.rainTimer = 10;
        sfx.thunder();
        this.onToast?.('Hujan Lesti turun! Musuh & jebakan api -50% damage (10s).', '#38BDF8');
        this.addFloatingText(this.player.x, this.player.y - 28, 'HUJAN TURUN!', '#38BDF8', 1.1);
      }
    }

    if (this.player.characterId === 'mandor_gupal') {
      this.mandorShoutTimer -= clampedDt;
      if (this.mandorShoutTimer <= 0) {
        this.mandorShoutTimer = 20;
        sfx.whistle();
        this.triggerShake(0.14, 3.2);
        this.addFloatingText(this.player.x, this.player.y - 28, 'WOI KERJA!', '#FACC15', 1.15);
        for (const e of this.dungeon.enemies) {
          if (
            e.kind !== 'boss_treant' &&
            e.kind !== 'boss_durian' &&
            !e.isMiniBoss &&
            Math.hypot(e.x - this.player.x, e.y - this.player.y) <= 230
          ) {
            e.fearTimer = 2.0;
          }
        }
      }
    }

    if (this.player.characterId === 'siluman_kayu' && this.player.stealthCooldown <= 0 && this.player.stealthTimer <= 0) {
      const nearTree = this.dungeon.trees.find(
        (t) => Math.hypot(t.x - this.player.x, t.y - this.player.y) <= 78
      );
      if (nearTree && this.player.hp < this.player.maxHp * 0.65) {
        this.player.stealthTimer = 3.0;
        this.player.stealthCooldown = 25;
        this.spawnParticles(this.player.x, this.player.y, '#C084FC', 12);
        this.addFloatingText(this.player.x, this.player.y - 26, 'MASUK POHON (3s)', '#C084FC', 1.05);
      }
    }

    if (this.player.characterId === 'rimba' || this.player.characterId === 'draksa') {
      this.godRootTimer -= clampedDt;
      if (this.godRootTimer <= 0) {
        this.godRootTimer = 10;
        const targets = this.dungeon.enemies.slice(0, 3);
        if (targets.length > 0) {
          sfx.chop();
          for (const tgt of targets) {
            this.dungeon.zones.push({
              id: nextId('zone'),
              kind: 'root_spike',
              x: tgt.x,
              y: tgt.y,
              radius: 34,
              damage: 28 + this.dungeon.floor * 4,
              life: 0.7,
              maxLife: 0.7,
              tickTimer: 0.05,
            });
          }
        }
      }
    }

    if (this.player.forestAliveTimer > 0) {
      this.forestSpikeSpawnTimer -= clampedDt;
      if (this.forestSpikeSpawnTimer <= 0) {
        this.forestSpikeSpawnTimer = 0.4;
        this.triggerShake(0.22, 6.5);
        const visibleEnemies = this.dungeon.enemies.slice(0, 4);
        for (const tgt of visibleEnemies) {
          this.dungeon.zones.push({
            id: nextId('zone'),
            kind: 'root_spike',
            x: tgt.x,
            y: tgt.y,
            radius: 40,
            damage: 34 + this.dungeon.floor * 5,
            life: 0.65,
            maxLife: 0.65,
            tickTimer: 0.04,
          });
        }
      }
    }

    // Passive mana regen + Surga HP regen & Light Shield recharge
    this.player.mana = Math.min(
      this.player.maxMana,
      this.player.mana + stats.manaRegen * clampedDt
    );
    if (this.hasSkill('k_surga_1')) {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 2.5 * clampedDt);
    }
    if (this.hasSkill('m_surga_1')) {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 3.0 * clampedDt);
    }
    const hasHeavenShieldSkill =
      this.hasSkill('k_surga_1') ||
      this.hasSkill('a_surga_1') ||
      this.hasSkill('m_surga_1');
    if (hasHeavenShieldSkill && !this.player.heavenShieldReady) {
      this.player.heavenShieldCooldown = Math.max(
        0,
        this.player.heavenShieldCooldown - clampedDt
      );
      if (this.player.heavenShieldCooldown <= 0) {
        this.player.heavenShieldReady = true;
        this.addFloatingText(
          this.player.x,
          this.player.y - 24,
          'Perisai Cahaya Siap!',
          '#38BDF8',
          0.95
        );
      }
    }

    // Tile & Biome physics
    const ptxNow = Math.floor(this.player.x / TILE_SIZE);
    const ptyNow = Math.floor(this.player.y / TILE_SIZE);
    const tileUnder =
      ptyNow >= 0 &&
      ptyNow < this.dungeon.height &&
      ptxNow >= 0 &&
      ptxNow < this.dungeon.width
        ? this.dungeon.tiles[ptyNow][ptxNow]
        : 1;
    const onStickyMud = this.dungeon.biome === 'durian_swamp' && tileUnder === 4;
    const speedScale =
      (onStickyMud ? 0.62 : 1) * (this.rootSlowTimer > 0 ? 0.55 : 1);

    // Movement input (blocked while stunned)
    if (this.player.stunTimer <= 0) {
      let mx = (this.input.right ? 1 : 0) - (this.input.left ? 1 : 0) + this.input.joyX;
      let my = (this.input.down ? 1 : 0) - (this.input.up ? 1 : 0) + this.input.joyY;
      let len = Math.hypot(mx, my);
      if (len < 0.05) {
        mx = 0;
        my = 0;
        len = 0;
      } else if (len > 1) {
        mx /= len;
        my /= len;
        len = 1;
      }

      if (len > 0) {
        this.player.facingX = mx / len;
        this.player.facingY = my / len;
        this.player.animTime += clampedDt * 10;
        if (onStickyMud && this.mudFxTimer <= 0) {
          this.mudFxTimer = 0.28;
          this.spawnParticles(this.player.x, this.player.y + 8, '#84CC16', 2);
        }
      }

      const targetVx = mx * stats.speed * speedScale;
      const targetVy = my * stats.speed * speedScale;
      this.player.vx = targetVx;
      this.player.vy = targetVy;

      if (this.dungeon.biome === 'ice_crypt') {
        const frictionRate = len === 0 ? 11.5 : 5.5;
        const iceFriction = 1 - Math.exp(-frictionRate * clampedDt);
        this.iceSlideVx += (targetVx - this.iceSlideVx) * iceFriction;
        this.iceSlideVy += (targetVy - this.iceSlideVy) * iceFriction;
        if (len === 0 && Math.hypot(this.iceSlideVx, this.iceSlideVy) < 8) {
          this.iceSlideVx = 0;
          this.iceSlideVy = 0;
        }
        this.player.vx = this.iceSlideVx;
        this.player.vy = this.iceSlideVy;
        this.moveEntityWithCollision(
          this.player,
          this.iceSlideVx * clampedDt,
          this.iceSlideVy * clampedDt,
          11
        );
      } else {
        // High friction: 0ms instant stop when thumb/keys released
        this.iceSlideVx = 0;
        this.iceSlideVy = 0;
        if (len > 0) {
          this.moveEntityWithCollision(
            this.player,
            targetVx * clampedDt,
            targetVy * clampedDt,
            11
          );
        }
      }
    } else {
      this.player.vx = 0;
      this.player.vy = 0;
      if (this.dungeon.biome === 'ice_crypt') {
        const stopLerp = 1 - Math.exp(-10 * clampedDt);
        this.iceSlideVx *= 1 - stopLerp;
        this.iceSlideVy *= 1 - stopLerp;
        this.player.vx = this.iceSlideVx;
        this.player.vy = this.iceSlideVy;
        this.moveEntityWithCollision(
          this.player,
          this.iceSlideVx * clampedDt,
          this.iceSlideVy * clampedDt,
          11
        );
      }
    }

    // Discover rooms
    const ptx = Math.floor(this.player.x / TILE_SIZE);
    const pty = Math.floor(this.player.y / TILE_SIZE);
    let activeRoomKind: string | null = null;
    for (const r of this.dungeon.rooms) {
      if (ptx >= r.x && ptx < r.x + r.w && pty >= r.y && pty < r.y + r.h) {
        activeRoomKind = r.kind;
        if (!r.discovered) {
          r.discovered = true;
          if (r.kind === 'boss') {
            sfx.bossRoar();
            this.triggerShake(0.35, 6);
            const hasDurian = this.dungeon.enemies.some((e) => e.kind === 'boss_durian');
            if (hasDurian) {
              this.onToast?.('BOSS LANTAI 5 MUNCUL: DURIAN RAKSAK! (Drop Blueprint)', '#FACC15');
            } else {
              this.onToast?.(
                `BOSS LANTAI ${this.dungeon.floor}: Raja Treant! (Drop Blueprint & Boss Soul)`,
                '#EF4444'
              );
            }
          } else {
            const mb = this.dungeon.enemies.find((e) => e.roomId === r.id && e.isMiniBoss);
            if (mb) {
              sfx.bossRoar();
              this.triggerShake(0.24, 4.5);
              this.onToast?.(`ELITE MUNCUL: ${mb.name}!`, '#4ADE80');
            }
          }
        }
      }
    }

    // Dynamic biome hazards in active combat/boss rooms
    if (activeRoomKind && activeRoomKind !== 'start' && activeRoomKind !== 'shrine') {
      if (this.dungeon.biome === 'durian_swamp' || this.dungeon.biome === 'rotten_forest') {
        this.biomeHazardTimer -= clampedDt;
        if (this.biomeHazardTimer <= 0) {
          this.biomeHazardTimer = this.dungeon.biome === 'durian_swamp' ? 4.8 : 5.2;
          const hx = this.player.x + (Math.random() - 0.5) * 44;
          const hy = this.player.y + (Math.random() - 0.5) * 44;
          if (!this.isWallAtWorld(hx, hy)) {
            const isDurian = this.dungeon.biome === 'durian_swamp';
            this.dungeon.traps.push({
              id: nextId('bhaz'),
              kind: isDurian ? 'falling_durian' : 'root_snare',
              x: hx,
              y: hy,
              radius: isDurian ? 28 : 22,
              damage: Math.round((isDurian ? 16 : 13) + this.dungeon.floor * 1.4),
              cycleTimer: 0,
              period: 1.5,
              state: 'warning',
              stateTimer: isDurian ? 0.85 : 0.72,
              oneShot: true,
            });
          }
        }
      }
    }

    // Attack & Skill triggers (blocked while stunned)
    if (this.player.stunTimer <= 0) {
      if (this.input.attack && this.player.attackTimer <= 0) {
        this.performAttack();
      }
      if (this.input.skill && (this.player.skillTimer <= 0 || (this.player.characterId === 'kala' && this.player.synergyActive && this.player.dashCharges > 0))) {
        this.performActiveSkill();
      }
    }

    // Update portal entry when boss defeated
    if (this.dungeon.portalOpen) {
      const dPortal = Math.hypot(
        this.player.x - this.dungeon.portalX,
        this.player.y - this.dungeon.portalY
      );
      if (dPortal < 22) {
        this.descendToNextFloor();
      }
    }

    this.updateTrees(clampedDt);
    this.updateTraps(clampedDt, stats.defense);
    this.updateFloorZones(clampedDt);
    this.updateAllies(clampedDt);
    this.updateEnemies(clampedDt, stats.defense);
    this.updateProjectiles(clampedDt);
    this.updateSlams(clampedDt, stats.defense);
    this.updateDrops(clampedDt);
    this.updateParticles(clampedDt);
    this.updateFireflies(clampedDt);

    // Smooth camera follow
    const lerp = 1 - Math.exp(-10 * clampedDt);
    this.camX += (this.player.x - this.camX) * lerp;
    this.camY += (this.player.y - this.camY) * lerp;

    // Periodic autosave
    this.saveCooldown -= clampedDt;
    if (this.saveCooldown <= 0) {
      this.saveCooldown = 5;
      saveActiveRun(this.player, this.dungeon.floor, this.dayCycleTime);
    }

    this.hudSyncCooldown -= clampedDt;
    if (this.hudSyncCooldown <= 0) {
      this.hudSyncCooldown = 0.08;
      this.emitHud();
    }
  }

  private getAimAngle(): number {
    if (this.input.pointerAimActive) {
      return Math.atan2(
        this.input.pointerWorldY - this.player.y,
        this.input.pointerWorldX - this.player.x
      );
    }

    // Soul Knight style Smart Auto-Aim:
    // 1. Closest enemy within 340px (prioritize line-of-sight)
    let bestEnemy: EnemyEntity | null = null;
    let bestEnemyDist = 340;
    for (const e of this.dungeon.enemies) {
      const d = Math.hypot(e.x - this.player.x, e.y - this.player.y);
      if (d < bestEnemyDist && this.hasLineOfSight(this.player.x, this.player.y, e.x, e.y)) {
        bestEnemyDist = d;
        bestEnemy = e;
      }
    }
    if (bestEnemy) {
      return Math.atan2(bestEnemy.y - this.player.y, bestEnemy.x - this.player.x);
    }

    // 2. Nearest choppable tree within 90px
    let bestTree: ChoppableTree | null = null;
    let bestTreeDist = 96;
    for (const t of this.dungeon.trees) {
      const d = Math.hypot(t.x - this.player.x, t.y - this.player.y);
      if (d < bestTreeDist) {
        bestTreeDist = d;
        bestTree = t;
      }
    }
    if (bestTree) {
      return Math.atan2(bestTree.y - this.player.y, bestTree.x - this.player.x);
    }

    return Math.atan2(this.player.facingY, this.player.facingX);
  }

  private hasLineOfSight(x1: number, y1: number, x2: number, y2: number): boolean {
    const dist = Math.hypot(x2 - x1, y2 - y1);
    const steps = Math.ceil(dist / 16);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const sx = x1 + (x2 - x1) * t;
      const sy = y1 + (y2 - y1) * t;
      if (this.isWallAtWorld(sx, sy)) return false;
    }
    return true;
  }

  private performAttack() {
    const weapon = this.getActiveWeapon();
    const stats = this.getComputedStats();
    const cid = this.player.characterId;

    // Check mana; if insufficient for ranged weapon, fire weakened fallback bolt so player is never stuck!
    const hasMana = this.player.mana >= weapon.manaCost;
    if (hasMana) {
      this.player.mana -= weapon.manaCost;
    }

    this.player.attackTimer = weapon.cooldown / stats.atkSpeedMult;
    const angle = this.getAimAngle();
    this.player.facingX = Math.cos(angle);
    this.player.facingY = Math.sin(angle);

    const isCrit = Math.random() < stats.critChance + weapon.critBonus;
    let dmgMult = 1;
    if (weapon.kind === 'melee') dmgMult = stats.meleeMult;
    else if (weapon.kind === 'bow') dmgMult = stats.bowMult;
    else if (weapon.kind === 'staff') dmgMult = stats.staffMult;

    if (!hasMana && weapon.manaCost > 0) dmgMult *= 0.45;
    if (isCrit) dmgMult *= stats.critMult;

    let baseDmg = weapon.damage;
    if (weapon.id === 'sig_balok_kayu') {
      baseDmg += Math.min(38, Math.floor(this.player.materials.gold / 55));
    }

    const finalDmg = Math.max(4, Math.round(baseDmg * dmgMult));

    // Siluman Kayu + Archer Synergy can snipe from stealth without breaking invisibility
    if (this.player.stealthTimer > 0 && !(cid === 'siluman_kayu' && this.player.synergyActive)) {
      this.player.stealthTimer = 0;
    }

    // Special Signature Projectile Weapons (Mangkok Panas, Peluit Mandor, Mahkota Durian, Boneka Terkutuk)
    if (weapon.id === 'sig_mangkok_panas') {
      sfx.magic();
      const isLava = cid === 'jaka' && this.player.synergyActive;
      this.dungeon.projectiles.push({
        id: nextId('proj'),
        fromPlayer: true,
        x: this.player.x + Math.cos(angle) * 14,
        y: this.player.y + Math.sin(angle) * 14,
        vx: Math.cos(angle) * 390,
        vy: Math.sin(angle) * 390,
        radius: 7,
        damage: finalDmg,
        isCrit,
        life: 0.9,
        color: isLava ? '#FF3B30' : '#F97316',
        kind: 'bakso',
        pierceLeft: 0,
        hitIds: [],
        aoeRadius: isLava ? 72 : 52,
        burnDps: isLava ? 18 : 8,
        spawnZoneKind: isLava ? 'fire_trail' : undefined,
        explodeOnExpire: true,
        chopMultiplier: weapon.chopMultiplier * stats.chopBonus,
      });
      return;
    }

    if (weapon.id === 'sig_peluit_mandor') {
      sfx.whistle();
      const allyKind: AllyEntity['kind'] =
        cid === 'mandor_gupal' && this.player.synergyActive ? 'mandor_elite' : 'kuli';
      const existingKuli = this.dungeon.allies.filter(
        (a) => a.kind === 'kuli' || a.kind === 'mandor_elite'
      );
      if (existingKuli.length < 2) {
        const needed = 2 - existingKuli.length;
        for (let i = 0; i < needed; i++) {
          this.spawnAlly(
            allyKind,
            this.player.x + (i === 0 ? -24 : 24),
            this.player.y + 12,
            18
          );
        }
        this.addFloatingText(
          this.player.x,
          this.player.y - 24,
          allyKind === 'mandor_elite' ? 'MANDOR ELITE DIPANGGIL!' : '+2 Kuli Membantu!',
          '#FACC15',
          1.05
        );
      }
      this.dungeon.projectiles.push({
        id: nextId('proj'),
        fromPlayer: true,
        x: this.player.x + Math.cos(angle) * 14,
        y: this.player.y + Math.sin(angle) * 14,
        vx: Math.cos(angle) * 420,
        vy: Math.sin(angle) * 420,
        radius: 6,
        damage: finalDmg,
        isCrit,
        life: 0.78,
        color: '#FACC15',
        kind: 'orb',
        pierceLeft: 1,
        hitIds: [],
        chopMultiplier: weapon.chopMultiplier * stats.chopBonus,
      });
      return;
    }

    if (weapon.id === 'sig_mahkota_durian') {
      sfx.bow();
      const isMusang = cid === 'ratu_durian' && this.player.synergyActive;
      this.dungeon.projectiles.push({
        id: nextId('proj'),
        fromPlayer: true,
        x: this.player.x + Math.cos(angle) * 14,
        y: this.player.y + Math.sin(angle) * 14,
        vx: Math.cos(angle) * 410,
        vy: Math.sin(angle) * 410,
        radius: 8,
        damage: finalDmg,
        isCrit,
        life: 0.92,
        color: isMusang ? '#C084FC' : '#84CC16',
        kind: 'rotten_durian',
        pierceLeft: 0,
        hitIds: [],
        aoeRadius: 56,
        stunDuration: 1.2,
        poisonDps: 14,
        spawnZoneKind: isMusang ? 'blackhole' : undefined,
        explodeOnExpire: true,
        chopMultiplier: weapon.chopMultiplier * stats.chopBonus,
      });
      return;
    }

    if (weapon.id === 'sig_boneka_terkutuk') {
      sfx.magic();
      const treantKind: AllyEntity['kind'] =
        cid === 'bocah_hutan' && this.player.synergyActive ? 'mage_treant' : 'mini_treant';
      this.dungeon.projectiles.push({
        id: nextId('proj'),
        fromPlayer: true,
        x: this.player.x + Math.cos(angle) * 14,
        y: this.player.y + Math.sin(angle) * 14,
        vx: Math.cos(angle) * 390,
        vy: Math.sin(angle) * 390,
        radius: 7,
        damage: finalDmg,
        isCrit,
        life: 0.9,
        color: '#C084FC',
        kind: 'doll',
        pierceLeft: 0,
        hitIds: [],
        aoeRadius: 56,
        summonKind: treantKind,
        explodeOnExpire: true,
        chopMultiplier: weapon.chopMultiplier * stats.chopBonus,
      });
      return;
    }

    if (weapon.kind === 'melee') {
      if (weapon.sfxKind === 'plok') {
        sfx.plok();
        this.triggerShake(0.08, 2.4);
      } else {
        sfx.slash();
        if (weapon.damage >= 28 || isCrit) {
          this.triggerShake(0.11, weapon.damage >= 40 ? 4.5 : 2.8);
        }
      }
      const swingDuration = weapon.swingVisual === 'sandal_spin' ? 0.18 : 0.14;
      this.dungeon.slashes.push({
        x: this.player.x,
        y: this.player.y,
        angle,
        range: weapon.range,
        color: weapon.color,
        timer: swingDuration,
        maxTimer: swingDuration,
        visual: weapon.swingVisual === 'sandal_spin' ? 'sandal_spin' : 'arc',
      });

      const kbScale =
        (weapon.knockbackMult ?? 1) *
        (weapon.id === 'sig_balok_kayu' && cid === 'ujang' && this.player.synergyActive ? 1.5 : 1);

      // Hit enemies in frontal arc
      for (const e of [...this.dungeon.enemies]) {
        const dx = e.x - this.player.x;
        const dy = e.y - this.player.y;
        const dist = Math.hypot(dx, dy);
        if (dist <= weapon.range + e.radius) {
          const angDiff = Math.abs(
            Math.atan2(
              Math.sin(Math.atan2(dy, dx) - angle),
              Math.cos(Math.atan2(dy, dx) - angle)
            )
          );
          if (angDiff <= 1.15 || dist < 26) {
            // Sarka + Knight Synergy: Golok Insaf one-shots regular non-elite mobs!
            if (
              weapon.id === 'sig_golok_insaf' &&
              cid === 'sarka' &&
              this.player.synergyActive &&
              !e.isMiniBoss &&
              e.kind !== 'boss_treant' &&
              e.kind !== 'boss_durian'
            ) {
              this.addFloatingText(e.x, e.y - 26, 'TOBAT!', '#FACC15', 1.2);
              this.damageEnemy(e, e.hp + 999, true, Math.cos(angle) * 200, Math.sin(angle) * 200);
              continue;
            }

            this.damageEnemy(
              e,
              finalDmg,
              isCrit,
              Math.cos(angle) * 140 * kbScale,
              Math.sin(angle) * 140 * kbScale
            );

            // Roni Pentungan Satpam: 15% stun (3s + heal if Knight synergy)
            if (weapon.id === 'sig_pentungan_satpam' && Math.random() < 0.15) {
              const stunDur = cid === 'roni' && this.player.synergyActive ? 3.0 : 1.4;
              e.freezeTimer = Math.max(e.freezeTimer, stunDur);
              this.addFloatingText(e.x, e.y - 26, `STUN ${stunDur}s!`, '#38BDF8', 1.05);
              if (cid === 'roni' && this.player.synergyActive) {
                this.player.hp = Math.min(this.player.maxHp, this.player.hp + 8);
                this.addFloatingText(this.player.x, this.player.y - 20, '+8 HP', '#4ADE80', 0.95);
              }
            }

            // Nyi Blorong Selendang Rawa: pull enemies close + poison (+ whirlpool for Knight synergy)
            if (weapon.id === 'sig_selendang_rawa') {
              const pullAng = Math.atan2(this.player.y - e.y, this.player.x - e.x);
              this.moveEntityWithCollision(e, Math.cos(pullAng) * 32, Math.sin(pullAng) * 32, e.radius);
              e.poisonTimer = 3.0;
              e.poisonDps = 14;
              if (cid === 'nyi_blorong' && this.player.synergyActive) {
                this.dungeon.zones.push({
                  id: nextId('zone'),
                  kind: 'whirlpool',
                  x: this.player.x + Math.cos(angle) * 44,
                  y: this.player.y + Math.sin(angle) * 44,
                  radius: 66,
                  damage: 18,
                  life: 2.6,
                  maxLife: 2.6,
                  tickTimer: 0.25,
                  pullStrength: 85,
                });
              }
            }
          }
        }
      }

      // Sig Chainsaw Bara: fire trail zone
      if (weapon.id === 'sig_chainsaw_bara') {
        this.dungeon.zones.push({
          id: nextId('zone'),
          kind: 'fire_trail',
          x: this.player.x + Math.cos(angle) * 34,
          y: this.player.y + Math.sin(angle) * 34,
          radius: 30,
          damage: 14,
          life: 2.4,
          maxLife: 2.4,
          tickTimer: 0.2,
        });
      }

      // Sig Dodos Sawit: launch palm thorn projectile (poison if Mage synergy)
      if (weapon.id === 'sig_dodos_sawit') {
        const isPoison = cid === 'sutar' && this.player.synergyActive;
        this.dungeon.projectiles.push({
          id: nextId('proj'),
          fromPlayer: true,
          x: this.player.x + Math.cos(angle) * 18,
          y: this.player.y + Math.sin(angle) * 18,
          vx: Math.cos(angle) * 400,
          vy: Math.sin(angle) * 400,
          radius: 5,
          damage: Math.round(finalDmg * 0.68),
          isCrit,
          life: 0.65,
          color: isPoison ? '#4ADE80' : '#FACC15',
          kind: 'thorn',
          pierceLeft: 1,
          hitIds: [],
          poisonDps: isPoison ? 20 : 0,
          chopMultiplier: weapon.chopMultiplier * stats.chopBonus,
        });
      }

      // Sig Cakar Akar: underground root claw passing through obstacles
      if (weapon.id === 'sig_cakar_akar') {
        this.dungeon.projectiles.push({
          id: nextId('proj'),
          fromPlayer: true,
          x: this.player.x + Math.cos(angle) * 18,
          y: this.player.y + Math.sin(angle) * 18,
          vx: Math.cos(angle) * 430,
          vy: Math.sin(angle) * 430,
          radius: 8,
          damage: Math.round(finalDmg * 0.72),
          isCrit,
          life: 0.65,
          color: '#C084FC',
          kind: 'slash_wave',
          pierceLeft: 2,
          hitIds: [],
          ignoreWalls: true,
          chopMultiplier: weapon.chopMultiplier * stats.chopBonus,
        });
      }

      // Sig Durian Godslayer: emits deadly durian spikes
      if (weapon.id === 'sig_durian_godslayer') {
        for (const off of [-0.26, 0, 0.26]) {
          const a = angle + off;
          this.dungeon.projectiles.push({
            id: nextId('proj'),
            fromPlayer: true,
            x: this.player.x + Math.cos(a) * 20,
            y: this.player.y + Math.sin(a) * 20,
            vx: Math.cos(a) * 460,
            vy: Math.sin(a) * 460,
            radius: 6,
            damage: Math.round(finalDmg * 0.45),
            isCrit,
            life: 0.55,
            color: '#FF3B30',
            kind: 'thorn',
            pierceLeft: 1,
            hitIds: [],
            chopMultiplier: weapon.chopMultiplier * stats.chopBonus,
          });
        }
      }

      // Chop trees in frontal arc (Rimba & Draksa Godslayer chop ALL trees around!)
      const chopRadius =
        weapon.id === 'sig_godslayer_rimba' || weapon.id === 'sig_durian_godslayer'
          ? 112
          : weapon.range + 16;
      for (const t of [...this.dungeon.trees]) {
        const dx = t.x - this.player.x;
        const dy = t.y - this.player.y;
        const dist = Math.hypot(dx, dy);
        if (dist <= chopRadius) {
          const angDiff = Math.abs(
            Math.atan2(
              Math.sin(Math.atan2(dy, dx) - angle),
              Math.cos(Math.atan2(dy, dx) - angle)
            )
          );
          if (
            weapon.id === 'sig_godslayer_rimba' ||
            weapon.id === 'sig_durian_godslayer' ||
            angDiff <= 1.2 ||
            dist < 28
          ) {
            this.damageTree(
              t,
              Math.round(finalDmg * weapon.chopMultiplier * stats.chopBonus)
            );
          }
        }
      }

      // Knight Surga Tier 3: Radiant Blade Wave
      if (this.hasSkill('k_surga_2')) {
        this.dungeon.projectiles.push({
          id: nextId('proj'),
          fromPlayer: true,
          x: this.player.x + Math.cos(angle) * 18,
          y: this.player.y + Math.sin(angle) * 18,
          vx: Math.cos(angle) * 360,
          vy: Math.sin(angle) * 360,
          radius: 10,
          damage: Math.round(finalDmg * 0.65),
          isCrit,
          life: 0.6,
          color: '#FDE047',
          kind: 'slash_wave',
          pierceLeft: 2,
          hitIds: [],
          chopMultiplier: weapon.chopMultiplier * stats.chopBonus,
        });
      }
    } else {
      // Bow or Staff projectiles
      if (weapon.kind === 'bow') sfx.bow();
      else sfx.magic();

      let count = weapon.projectileCount || 1;
      if (weapon.kind === 'bow' && this.hasSkill('a_surga_2')) count += 1;
      if (cid === 'cecep' && this.player.synergyActive && isCrit) count = Math.max(count, 3);

      const spread = weapon.spreadAngle || (count > 1 ? 0.16 : 0);
      const speed = weapon.projectileSpeed || 420;
      const pierce = weapon.kind === 'bow' && this.hasSkill('a_neraka_2') ? 1 : 0;
      const aoe = weapon.kind === 'staff' && this.hasSkill('m_neraka_1') ? 48 : 0;
      let chain =
        weapon.kind === 'staff' && (this.hasSkill('m_surga_2') || this.hasSkill('m_neraka_2'))
          ? 1
          : 0;
      if (cid === 'lesti' && this.player.synergyActive) {
        chain = Math.max(chain, 5);
      }

      for (let i = 0; i < count; i++) {
        const offset = count === 1 ? 0 : (i - (count - 1) / 2) * spread;
        const a = angle + offset;
        const isRootArrow = weapon.id === 'sig_busur_akar';
        const isFireMeteorArrow = cid === 'agni' && this.player.synergyActive && weapon.kind === 'bow';
        this.dungeon.projectiles.push({
          id: nextId('proj'),
          fromPlayer: true,
          x: this.player.x + Math.cos(a) * 14,
          y: this.player.y + Math.sin(a) * 14,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          radius: weapon.kind === 'staff' ? 6 : 4,
          damage: finalDmg,
          isCrit,
          life: (weapon.range || 360) / speed,
          color: isFireMeteorArrow ? '#F97316' : weapon.color,
          kind: weapon.kind === 'bow' ? 'arrow' : 'orb',
          pierceLeft: pierce,
          hitIds: [],
          aoeRadius: aoe || (isRootArrow && cid === 'dewi_rimba' && this.player.synergyActive ? 54 : 0),
          chainCount: chain,
          rootDuration: isRootArrow ? 1.5 : 0,
          burnDps: isFireMeteorArrow ? 14 : 0,
          spawnZoneKind: isFireMeteorArrow ? 'meteor_telegraph' : undefined,
          chopMultiplier: weapon.chopMultiplier * stats.chopBonus,
        });
      }

      // Mbah Jagat Tongkat Arwah Kayu: pulse existing totems!
      if (weapon.id === 'sig_tongkat_arwah') {
        for (const ally of this.dungeon.allies) {
          if (ally.kind === 'totem' || ally.kind === 'totem_curse') {
            this.spawnParticles(ally.x, ally.y, '#4ADE80', 10);
            for (const e of [...this.dungeon.enemies]) {
              if (Math.hypot(e.x - ally.x, e.y - ally.y) <= 95) {
                this.damageEnemy(e, Math.round(finalDmg * 0.9), false, 0, 0);
              }
            }
          }
        }
      }
    }
  }

  public performQuickDash() {
    if (this.player.stunTimer > 0 || this.dodgeDashTimer > 0) return;

    let dx = this.input.joyX;
    let dy = this.input.joyY;
    if (this.input.left) dx -= 1;
    if (this.input.right) dx += 1;
    if (this.input.up) dy -= 1;
    if (this.input.down) dy += 1;

    const len = Math.hypot(dx, dy);
    const angle =
      len > 0.1
        ? Math.atan2(dy / len, dx / len)
        : Math.atan2(this.player.facingY || 0, this.player.facingX || 1);

    const dashDist = 68;
    const steps = 5;
    for (let i = 1; i <= steps; i++) {
      this.moveEntityWithCollision(
        this.player,
        (Math.cos(angle) * dashDist) / steps,
        (Math.sin(angle) * dashDist) / steps,
        11
      );
      this.spawnParticles(this.player.x, this.player.y, '#86EFAC', 2);
    }

    this.player.invulnTimer = Math.max(this.player.invulnTimer, 0.22);
    const isKalaSynergy = this.player.characterId === 'kala' && this.player.synergyActive;
    this.dodgeDashTimer = isKalaSynergy ? 0.9 : 1.8;
    sfx.dash();
  }

  public performActiveSkill() {
    const cls = HERO_CLASSES[this.player.classId];
    const cid = this.player.characterId;
    const isKalaDoubleDash =
      cid === 'kala' && this.player.synergyActive && this.player.dashCharges > 0;
    if (this.player.stunTimer > 0 || (this.player.skillTimer > 0 && !isKalaDoubleDash)) return;
    if (this.player.mana < cls.activeSkillManaCost) {
      this.addFloatingText(this.player.x, this.player.y - 22, 'Mana Kurang!', '#38BDF8');
      return;
    }

    // [S1] DRAKSA ULTIMATE: KIAMAT TIMBER (1x per dungeon, any class)
    if (cid === 'draksa' && !this.player.ultimateUsed) {
      this.player.ultimateUsed = true;
      this.player.mana -= cls.activeSkillManaCost;
      this.player.skillTimer = cls.activeSkillCooldown;
      this.player.skillCooldownMax = cls.activeSkillCooldown;
      sfx.ultimateRoar();
      sfx.blackHole();
      this.triggerShake(1.1, 12);
      this.onToast?.('ULTIMATE: KIAMAT TIMBER! Meteor Durian + Akar Dewa + Black Hole!', '#FF3B30');
      this.addFloatingText(this.player.x, this.player.y - 36, 'KIAMAT TIMBER!', '#FF3B30', 1.45);

      this.dungeon.zones.push({
        id: nextId('zone'),
        kind: 'blackhole',
        x: this.player.x,
        y: this.player.y,
        radius: 260,
        damage: 45,
        life: 3.5,
        maxLife: 3.5,
        tickTimer: 0.2,
        pullStrength: 220,
      });

      for (const e of [...this.dungeon.enemies]) {
        this.dungeon.zones.push({
          id: nextId('zone'),
          kind: 'meteor_telegraph',
          x: e.x,
          y: e.y,
          radius: 64,
          damage: 90,
          life: 0.8,
          maxLife: 0.8,
          tickTimer: 0.78,
        });
        if (e.kind === 'boss_treant' || e.kind === 'boss_durian') {
          this.damageEnemy(e, Math.round(e.maxHp * 0.45), true, 0, 0);
        } else {
          this.damageEnemy(e, e.hp + 9999, true, 0, 0);
        }
      }
      return;
    }

    // [S1] RIMBA + KNIGHT ULTIMATE: HUTAN HIDUP
    if (cid === 'rimba' && this.player.synergyActive) {
      this.player.mana -= cls.activeSkillManaCost;
      this.player.skillTimer = 14;
      this.player.skillCooldownMax = 14;
      this.player.forestAliveTimer = 10;
      this.forestSpikeSpawnTimer = 0.05;
      sfx.ultimateRoar();
      this.triggerShake(0.7, 9);
      this.onToast?.('ULTIMATE: HUTAN HIDUP! Akar dewa mengamuk 10 detik!', '#FF3B30');
      this.addFloatingText(this.player.x, this.player.y - 36, 'HUTAN HIDUP!', '#FF3B30', 1.4);
      return;
    }

    // [S1] LOKA + MAGE ULTIMATE: LUBANG NERAKA
    if (cid === 'loka' && this.player.synergyActive) {
      this.player.mana -= cls.activeSkillManaCost;
      this.player.skillTimer = 13;
      this.player.skillCooldownMax = 13;
      sfx.ultimateRoar();
      sfx.blackHole();
      this.triggerShake(0.75, 10);
      this.onToast?.('ULTIMATE: LUBANG NERAKA! Menyedot seluruh lantai!', '#FF3B30');
      this.addFloatingText(this.player.x, this.player.y - 36, 'LUBANG NERAKA!', '#FF3B30', 1.4);

      this.dungeon.zones.push({
        id: nextId('zone'),
        kind: 'blackhole',
        x: this.player.x,
        y: this.player.y,
        radius: 320,
        damage: 42 + this.dungeon.floor * 6,
        life: 4.0,
        maxLife: 4.0,
        tickTimer: 0.25,
        pullStrength: 260,
      });

      for (const e of [...this.dungeon.enemies]) {
        // Pull every enemy on the floor closer to portal
        const ang = Math.atan2(this.player.y - e.y, this.player.x - e.x);
        const dist = Math.hypot(this.player.x - e.x, this.player.y - e.y);
        const pull = Math.min(dist * 0.72, 260);
        this.moveEntityWithCollision(e, Math.cos(ang) * pull, Math.sin(ang) * pull, e.radius);

        if ((e.kind === 'boss_treant' || e.kind === 'boss_durian') && !this.bossHalvedThisFloor) {
          this.bossHalvedThisFloor = true;
          this.damageEnemy(e, Math.round(e.hp * 0.5), true, 0, 0);
        } else {
          this.damageEnemy(e, 55 + this.dungeon.floor * 8, true, 0, 0);
        }
      }
      return;
    }

    this.player.mana -= cls.activeSkillManaCost;
    if (isKalaDoubleDash) {
      this.player.dashCharges -= 1;
      if (this.player.dashRechargeTimer <= 0) this.player.dashRechargeTimer = 3.2;
      this.player.skillTimer = this.player.dashCharges > 0 ? 0.35 : 3.2;
      this.player.skillCooldownMax = 3.2;
    } else {
      this.player.skillTimer = cls.activeSkillCooldown;
      this.player.skillCooldownMax = cls.activeSkillCooldown;
    }
    const angle = this.getAimAngle();

    if (this.player.classId === 'knight') {
      sfx.slash();
      this.triggerShake(0.18, 5);
      const hasSurga = this.hasSkill('k_surga_3');
      const hasNeraka = this.hasSkill('k_neraka_3');
      const particleColor = hasNeraka ? '#FF3B30' : hasSurga ? '#FDE047' : '#F59E0B';
      const dashDist = 92;
      const steps = 6;
      for (let i = 1; i <= steps; i++) {
        this.moveEntityWithCollision(
          this.player,
          (Math.cos(angle) * dashDist) / steps,
          (Math.sin(angle) * dashDist) / steps,
          11
        );
        this.spawnParticles(this.player.x, this.player.y, particleColor, 3);
      }
      if (hasSurga) {
        const healAmt = Math.round(this.player.maxHp * 0.35);
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + healAmt);
        this.player.shieldTimer = 2.4;
        this.player.invulnTimer = 2.4;
        this.spawnParticles(this.player.x, this.player.y, '#38BDF8', 18);
        this.addFloatingText(this.player.x, this.player.y - 24, `+${healAmt} HP & Perisai!`, '#FDE047', 1.1);
      }
      const dmg = Math.round(38 * (hasNeraka ? 1.7 : hasSurga ? 1.3 : 1));
      this.dungeon.slashes.push({
        x: this.player.x,
        y: this.player.y,
        angle,
        range: hasSurga || hasNeraka ? 90 : 76,
        color: particleColor,
        timer: 0.22,
        maxTimer: 0.22,
      });
      for (const e of [...this.dungeon.enemies]) {
        if (Math.hypot(e.x - this.player.x, e.y - this.player.y) < 92) {
          this.damageEnemy(e, dmg, true, Math.cos(angle) * 200, Math.sin(angle) * 200);
        }
      }
      for (const t of [...this.dungeon.trees]) {
        if (Math.hypot(t.x - this.player.x, t.y - this.player.y) < 88) {
          this.damageTree(t, dmg * 2);
        }
      }
    } else if (this.player.classId === 'archer') {
      sfx.bow();
      this.triggerShake(0.14, 3.5);
      if (isKalaDoubleDash) {
        for (let i = 1; i <= 5; i++) {
          this.moveEntityWithCollision(
            this.player,
            (Math.cos(angle) * 76) / 5,
            (Math.sin(angle) * 76) / 5,
            11
          );
          this.spawnParticles(this.player.x, this.player.y, '#34D399', 2);
        }
      }
      const hasSurga = this.hasSkill('a_surga_3');
      const hasNeraka = this.hasSkill('a_neraka_3');
      const count = hasSurga || hasNeraka ? 8 : 5;
      const spread = 0.14;
      const arrowColor = hasNeraka ? '#F97316' : hasSurga ? '#FDE047' : '#34D399';
      if (hasSurga) {
        const healAmt = Math.round(this.player.maxHp * 0.28);
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + healAmt);
        this.player.shieldTimer = 1.8;
        this.player.invulnTimer = 1.8;
        this.spawnParticles(this.player.x, this.player.y, '#38BDF8', 14);
        this.addFloatingText(this.player.x, this.player.y - 24, `+${healAmt} HP & Perisai!`, '#FDE047', 1.1);
      }
      for (let i = 0; i < count; i++) {
        const a = angle + (i - (count - 1) / 2) * spread;
        this.dungeon.projectiles.push({
          id: nextId('proj'),
          fromPlayer: true,
          x: this.player.x + Math.cos(a) * 14,
          y: this.player.y + Math.sin(a) * 14,
          vx: Math.cos(a) * 540,
          vy: Math.sin(a) * 540,
          radius: 4,
          damage: hasNeraka ? 28 : 20,
          isCrit: true,
          life: 0.72,
          color: arrowColor,
          kind: 'arrow',
          pierceLeft: 1,
          hitIds: [],
          aoeRadius: hasNeraka ? 42 : 0,
          chopMultiplier: 1.4,
        });
      }
      this.player.hasteTimer = 1.8;
    } else {
      sfx.magic();
      this.triggerShake(0.2, 5);
      const hasSurga = this.hasSkill('m_surga_3');
      const hasNeraka = this.hasSkill('m_neraka_3');
      const radius = hasSurga || hasNeraka ? 160 : 112;
      const dmg = hasNeraka ? 68 : hasSurga ? 42 : 32;
      const freeze = hasSurga ? 2.5 : hasNeraka ? 0.6 : 1.0;
      const novaColor = hasNeraka ? '#EF4444' : hasSurga ? '#FDE047' : '#38BDF8';

      if (hasSurga) {
        const healAmt = Math.round(this.player.maxHp * 0.35);
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + healAmt);
        this.player.shieldTimer = 2.2;
        this.player.invulnTimer = 2.2;
        this.addFloatingText(this.player.x, this.player.y - 24, `+${healAmt} HP & Perisai!`, '#FDE047', 1.1);
      }

      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        this.dungeon.particles.push({
          x: this.player.x,
          y: this.player.y,
          vx: Math.cos(a) * (radius * 2.2),
          vy: Math.sin(a) * (radius * 2.2),
          size: 4,
          color: novaColor,
          life: 0.35,
          maxLife: 0.35,
        });
      }

      for (const e of [...this.dungeon.enemies]) {
        if (Math.hypot(e.x - this.player.x, e.y - this.player.y) <= radius + e.radius) {
          e.freezeTimer = Math.max(e.freezeTimer, freeze);
          this.damageEnemy(e, dmg, hasNeraka, 0, 0);
        }
      }
      for (const t of [...this.dungeon.trees]) {
        if (Math.hypot(t.x - this.player.x, t.y - this.player.y) <= radius) {
          this.damageTree(t, dmg);
        }
      }
    }
  }

  private damageTree(tree: ChoppableTree, dmg: number) {
    tree.hp -= dmg;
    tree.hitFlash = 0.1;
    tree.shakeTimer = 0.16;
    sfx.chop();
    this.spawnParticles(tree.x, tree.y, tree.variant === 'crate' ? '#B97A45' : '#4D7C0F', 5);
    this.addFloatingText(tree.x, tree.y - 16, `-${dmg}`, '#D6D3D1', 0.85);

    if (tree.hp <= 0) {
      const idx = this.dungeon.trees.findIndex((t) => t.id === tree.id);
      if (idx !== -1) this.dungeon.trees.splice(idx, 1);

      sfx.treeFall();
      this.triggerShake(0.14, 3.5);
      this.player.treesChopped += 1;
      this.player.score += 15;
      this.gainExp(tree.variant === 'elder' ? 14 : 7);

      this.spawnParticles(tree.x, tree.y, '#8B5A2B', 14);
      this.spawnParticles(tree.x, tree.y, '#166534', 10);

      // Bram Passive: Heal +5 HP saat menebang pohon
      if (this.player.characterId === 'bram' && tree.variant !== 'crate') {
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + 5);
        this.addFloatingText(this.player.x, this.player.y - 20, '+5 HP', '#4ADE80', 0.9);
      }

      // Drop Wood & possible Rare Ironwood / Berry / Timber Shard (max Rare weapon)
      const woodAmount = tree.variant === 'elder' ? 4 : tree.variant === 'pine' ? 2 : 2;
      this.spawnDrop(tree.x, tree.y, 'wood', woodAmount, 'common');
      if (tree.variant === 'elder' || Math.random() < 0.25) {
        this.spawnDrop(tree.x + 8, tree.y + 4, 'ironwood', 1, 'rare');
      }
      if (tree.variant === 'crate') {
        if (Math.random() < 0.45) {
          this.spawnDrop(tree.x - 6, tree.y + 5, Math.random() < 0.5 ? 'hp_berry' : 'mana_shard', 1, 'common');
        }
        if (Math.random() < 0.35) {
          this.spawnDrop(tree.x + 8, tree.y - 4, 'timber_shard', 1, 'uncommon');
        }
        if (Math.random() < 0.22) {
          const chestPool = ['oak_shortsword', 'moss_recurve_bow', 'amber_twig_wand', 'ironwood_axe', 'thorn_twinbow', 'spore_staff', 'sap_claymore'];
          const wId = chestPool[Math.floor(Math.random() * chestPool.length)];
          this.spawnDrop(tree.x, tree.y - 8, 'weapon', 1, WEAPONS[wId].rarity, wId);
        }
      }
      if (tree.blocksPath) {
        this.addFloatingText(tree.x, tree.y - 24, 'Jalur Terbuka!', '#34D399', 1.1);
      }
    }
  }

  private damageEnemy(
    e: EnemyEntity,
    dmg: number,
    isCrit: boolean,
    kbX: number,
    kbY: number,
    fromDot = false
  ) {
    // Sarka passive: +50% to Boss/Elite, -20% to normal mobs
    let scaledDmg = dmg;
    if (this.player.characterId === 'sarka') {
      const isBossOrElite =
        e.isMiniBoss || e.kind === 'boss_treant' || e.kind === 'boss_durian';
      scaledDmg = Math.max(2, Math.round(dmg * (isBossOrElite ? 1.5 : 0.8)));
    }
    e.hp -= scaledDmg;
    e.hitFlash = 0.12;
    e.alerted = true;

    const kbMag = Math.hypot(kbX, kbY);
    const isHeavyKnockback = kbMag >= 350;

    if (e.kind !== 'boss_treant' && e.kind !== 'boss_durian') {
      if (isHeavyKnockback) {
        const kbFactor = e.isMiniBoss ? 0.35 : 1.2;
        e.kbVx = kbX * kbFactor;
        e.kbVy = kbY * kbFactor;
        e.kbTimer = e.isMiniBoss ? 0.14 : 0.22;
      } else if (!e.isMiniBoss) {
        this.moveEntityWithCollision(e, kbX * 0.08, kbY * 0.08, e.radius);
      }
    }

    if (!fromDot) {
      if (isHeavyKnockback) {
        this.addFloatingText(e.x, e.y - 26, 'PLOK!', '#C084FC', 1.05);
        this.spawnParticles(e.x, e.y, '#C084FC', 8);
      }
      if (isCrit) {
        sfx.critHit();
        this.triggerShake(0.14, dmg >= 40 ? 5.5 : 4);
        this.addFloatingText(e.x, e.y - 18, `CRIT ${dmg}!`, '#FDE047', 1.15);
        if (this.hasSkill('a_surga_1')) {
          this.player.hp = Math.min(this.player.maxHp, this.player.hp + 3);
        }
      } else {
        sfx.hitEnemy();
        if (dmg >= 28 || e.kind === 'boss_treant' || e.kind === 'boss_durian' || e.isMiniBoss) {
          this.triggerShake(0.12, dmg >= 40 ? 4.5 : 2.8);
        }
        this.addFloatingText(e.x, e.y - 16, `${dmg}`, '#F8FAFC', 0.95);
      }

      // Neraka Tier 2: Poison + Fire DoT
      const dotDps = this.hasSkill('m_neraka_1')
        ? 16
        : this.hasSkill('a_neraka_1')
        ? 15
        : this.hasSkill('k_neraka_1')
        ? 14
        : 0;
      if (dotDps > 0) {
        e.poisonTimer = 3.0;
        e.poisonDps = Math.ceil(dotDps * 0.5);
        e.burnTimer = 3.0;
        e.burnDps = Math.floor(dotDps * 0.5);
      }
    }

    this.spawnParticles(
      e.x,
      e.y,
      e.kind.includes('slime') ? '#84CC16' : e.kind === 'boss_durian' ? '#FACC15' : '#EF4444',
      isCrit ? 9 : 5
    );

    if (e.hp <= 0) {
      if (e.kind !== 'boss_treant' && e.kind !== 'boss_durian') {
        this.triggerShake(0.15, e.isMiniBoss ? 5.5 : 3.8);
      }
      this.killEnemy(e);
    }
  }

  private killEnemy(e: EnemyEntity) {
    const idx = this.dungeon.enemies.findIndex((item) => item.id === e.id);
    if (idx === -1) return;
    this.dungeon.enemies.splice(idx, 1);

    this.player.kills += 1;
    this.player.killCounter += 1;
    this.player.score +=
      e.kind === 'boss_durian'
        ? 1200
        : e.kind === 'boss_treant'
        ? this.dungeon.floor % 5 === 0
          ? 1000
          : 500
        : e.isMiniBoss
        ? 180
        : 40;
    this.gainExp(e.expReward);

    // 20-Character On-Kill Effects
    const cid = this.player.characterId;
    if (cid === 'bram' && (e.kind === 'wood_slime' || e.kind === 'thorn_slime' || e.kind === 'boss_treant')) {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 5);
    }
    if (this.getActiveWeapon().id === 'sig_kapak_karat' && this.player.killCounter % 5 === 0) {
      const shieldDur = cid === 'bram' && this.player.synergyActive ? 4.5 : 2.2;
      this.player.shieldTimer = Math.max(this.player.shieldTimer, shieldDur);
      this.addFloatingText(this.player.x, this.player.y - 26, 'PERISAI KAYU!', '#FACC15', 1.05);
    }
    if (cid === 'jaka' && this.player.killCounter % 10 === 0) {
      this.spawnDrop(e.x, e.y, 'bakso', 1, 'rare');
      this.addFloatingText(e.x, e.y - 22, 'BAKSO DROP!', '#F97316', 1.05);
    }
    if (cid === 'agni' && Math.random() < 0.2) {
      this.spawnParticles(e.x, e.y, '#F97316', 16);
      this.triggerShake(0.15, 4);
      for (const other of [...this.dungeon.enemies]) {
        if (Math.hypot(other.x - e.x, other.y - e.y) <= 78) {
          this.damageEnemy(other, 38, false, 0, 0, true);
        }
      }
    }
    if (this.getActiveWeapon().id === 'sig_crypt_crown') {
      sfx.blackHole();
      this.dungeon.zones.push({
        id: nextId('zone'),
        kind: 'blackhole',
        x: e.x,
        y: e.y,
        radius: 88,
        damage: 20,
        life: 2.2,
        maxLife: 2.2,
        tickTimer: 0.2,
        pullStrength: 130,
      });
    }

    // Surga Tier 3 on-kill healing
    if (this.hasSkill('k_surga_2')) {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 7);
    }
    if (this.hasSkill('a_surga_2')) {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 6);
    }
    if (this.hasSkill('m_surga_2')) {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 6);
      this.player.mana = Math.min(this.player.maxMana, this.player.mana + 12);
    }

    // Neraka Tier 4 on-kill hellfire explosion
    const explosionDmg = this.hasSkill('m_neraka_3')
      ? 60
      : this.hasSkill('k_neraka_3')
      ? 55
      : this.hasSkill('a_neraka_3')
      ? 50
      : 0;
    if (explosionDmg > 0) {
      this.triggerShake(0.16, 4.5);
      this.spawnParticles(e.x, e.y, '#FF3B30', 18);
      this.spawnParticles(e.x, e.y, '#F97316', 12);
      for (const other of [...this.dungeon.enemies]) {
        if (Math.hypot(other.x - e.x, other.y - e.y) <= 88 + other.radius) {
          this.damageEnemy(other, explosionDmg, false, 0, 0, true);
        }
      }
    }

    this.spawnParticles(
      e.x,
      e.y,
      e.kind === 'boss_treant' || e.kind === 'boss_durian'
        ? '#F59E0B'
        : e.isMiniBoss
        ? '#C084FC'
        : '#84CC16',
      e.kind === 'boss_treant' || e.kind === 'boss_durian' ? 40 : e.isMiniBoss ? 26 : 14
    );

    // Maksimal drop senjata langsung: Common, Uncommon, Rare (Epic & Legendary HANYA via Blueprint + Blacksmith!)
    const commonPool = ['lumber_axe', 'rusty_blade', 'hunters_shortbow', 'root_wand'];
    const uncommonPool = ['oak_shortsword', 'moss_recurve_bow', 'amber_twig_wand'];
    const rarePool = ['ironwood_axe', 'thorn_twinbow', 'spore_staff', 'sap_claymore'];
    const maxRarePool = [...commonPool, ...uncommonPool, ...rarePool];

    const goldMult = this.isNight ? 2 : 1;
    const metaSnap = loadMetaProgress();

    const pickBossBlueprint = () => {
      const unowned = BLUEPRINTS.filter((bp) => !metaSnap.blueprints.includes(bp.id));
      const pool = unowned.length > 0 ? unowned : BLUEPRINTS;
      return pool[Math.floor(Math.random() * pool.length)];
    };

    if (e.kind === 'boss_durian') {
      // DURIAN RAKSAK meledak saat mati -> Blueprint Epic/Legendary + Boss Soul + 3 senjata random (max Rare)
      sfx.bossRoar();
      sfx.victory();
      this.triggerShake(0.55, 10);
      this.spawnParticles(e.x, e.y, '#84CC16', 28);
      this.spawnParticles(e.x, e.y, '#FACC15', 28);
      this.spawnParticles(e.x, e.y, '#FF3B30', 24);
      this.addFloatingText(e.x, e.y - 34, 'DURIAN MELEDAK!', '#FACC15', 1.35);

      this.dungeon.bossDefeated = true;
      this.dungeon.portalOpen = true;
      this.spawnDrop(e.x - 18, e.y + 14, 'wood', 8, 'common');
      this.spawnDrop(e.x + 18, e.y + 14, 'ironwood', 3, 'rare');
      this.spawnDrop(e.x - 16, e.y - 16, 'timber_shard', 3, 'uncommon');
      this.spawnDrop(e.x, e.y + 4, 'potion', 1, 'rare');
      this.spawnDrop(e.x + 12, e.y - 18, 'gold', (110 + Math.floor(Math.random() * 45)) * goldMult, 'rare');

      const bp = pickBossBlueprint();
      this.spawnDrop(e.x - 14, e.y - 28, 'blueprint', 1, bp.rarity, undefined, bp.id);
      this.spawnDrop(e.x + 16, e.y - 28, 'boss_soul', 1, 'epic');

      // Drop 3 senjata random (maksimal Rare)
      const pickedIds: string[] = [];
      const guaranteedRare = rarePool[Math.floor(Math.random() * rarePool.length)];
      pickedIds.push(guaranteedRare);
      while (pickedIds.length < 3) {
        const cand = maxRarePool[Math.floor(Math.random() * maxRarePool.length)];
        if (!pickedIds.includes(cand)) {
          pickedIds.push(cand);
        }
      }
      const dropOffsets: Array<[number, number]> = [
        [-30, 8],
        [30, 8],
        [0, 26],
      ];
      pickedIds.forEach((wid, idxOffset) => {
        const wDef = WEAPONS[wid];
        const [ox, oy] = dropOffsets[idxOffset];
        this.spawnDrop(e.x + ox, e.y + oy, 'weapon', 1, wDef.rarity, wid);
      });

      // Milestone Gems: Lantai 10, 20, 30 dst drop +100 Gem!
      if (this.dungeon.floor % 10 === 0) {
        this.spawnDrop(e.x, e.y - 34, 'gem', 100, 'epic');
        const gmMeta = addMetaLoot({ gems: 100 });
        this.player.materials.gems = gmMeta.gems;
        this.onToast?.(`MILESTONE LANTAI ${this.dungeon.floor}: +100 GEM GACHA!`, '#38BDF8');
      }

      updateMetaProgress({
        bossesSlain: metaSnap.bossesSlain + 1,
        bestFloor: this.dungeon.floor,
        bestScore: this.player.score,
      });
      saveActiveRun(this.player, this.dungeon.floor, this.dayCycleTime);
      this.onToast?.(`DURIAN RAKSAK Meledak! Drop ${bp.name} + Boss Soul!`, '#FACC15');
      setTimeout(() => {
        this.onVictory?.();
      }, 950);
    } else if (e.kind === 'boss_treant') {
      sfx.victory();
      this.triggerShake(0.45, 8);
      this.dungeon.bossDefeated = true;
      this.dungeon.portalOpen = true;
      this.spawnDrop(e.x - 18, e.y + 10, 'wood', 8, 'common');
      this.spawnDrop(e.x + 18, e.y + 10, 'ironwood', 3, 'rare');
      this.spawnDrop(e.x - 16, e.y - 12, 'timber_shard', 3, 'uncommon');
      this.spawnDrop(e.x, e.y - 12, 'potion', 1, 'rare');
      this.spawnDrop(e.x + 14, e.y - 16, 'gold', (100 + Math.floor(Math.random() * 40)) * goldMult, 'rare');

      const bp = pickBossBlueprint();
      this.spawnDrop(e.x - 14, e.y - 26, 'blueprint', 1, bp.rarity, undefined, bp.id);
      this.spawnDrop(e.x + 16, e.y - 26, 'boss_soul', 1, 'epic');

      // Milestone Gems: Lantai 10, 20, 30 dst drop +100 Gem!
      if (this.dungeon.floor % 10 === 0) {
        this.spawnDrop(e.x, e.y - 34, 'gem', 100, 'epic');
        const gmMeta = addMetaLoot({ gems: 100 });
        this.player.materials.gems = gmMeta.gems;
        this.onToast?.(`MILESTONE LANTAI ${this.dungeon.floor}: +100 GEM GACHA!`, '#38BDF8');
      }

      const rareDrop = rarePool[Math.floor(Math.random() * rarePool.length)];
      this.spawnDrop(e.x, e.y + 22, 'weapon', 1, 'rare', rareDrop);
      this.onToast?.(
        `Raja Treant Tumbang! Drop ${bp.name} + Boss Soul!`,
        bp.rarity === 'legendary' ? '#FF3B30' : '#C084FC'
      );

      updateMetaProgress({
        bossesSlain: metaSnap.bossesSlain + 1,
        bestFloor: this.dungeon.floor,
        bestScore: this.player.score,
      });
      saveActiveRun(this.player, this.dungeon.floor, this.dayCycleTime);
      setTimeout(() => {
        this.onVictory?.();
      }, 900);
    } else if (e.isMiniBoss) {
      // Elite enemy drops: max Rare weapon + 2x Timber Shard + Gold
      sfx.pickup(true);
      this.spawnDrop(e.x - 10, e.y + 8, 'wood', 4, 'common');
      this.spawnDrop(e.x + 12, e.y + 8, 'ironwood', 2, 'rare');
      this.spawnDrop(e.x + 8, e.y - 10, 'timber_shard', 2, 'uncommon');
      this.spawnDrop(e.x, e.y + 14, 'potion', 1, 'rare');
      this.spawnDrop(e.x - 14, e.y - 8, 'gold', (45 + Math.floor(Math.random() * 20)) * goldMult, 'rare');

      const useRare = Math.random() < 0.72;
      const pool = useRare ? rarePool : uncommonPool;
      const chosen = pool[Math.floor(Math.random() * pool.length)];
      this.spawnDrop(e.x, e.y - 12, 'weapon', 1, useRare ? 'rare' : 'uncommon', chosen);
      this.onToast?.(
        `Elite Tumbang! Drop +2 Timber Shard & Senjata ${useRare ? 'RARE' : 'UNCOMMON'}!`,
        '#4ADE80'
      );
    } else {
      // Standard enemy drops: Wood, Gold (+100% at night), Timber Shard, Common/Uncommon/Rare weapons max!
      this.spawnDrop(e.x, e.y, 'wood', 1 + (Math.random() < 0.4 ? 1 : 0), 'common');
      this.spawnDrop(
        e.x + 6,
        e.y + 6,
        'gold',
        (12 + Math.floor(Math.random() * 11)) * goldMult,
        'rare'
      );

      if (Math.random() < (this.isNight ? 0.76 : 0.48)) {
        this.spawnDrop(e.x - 8, e.y - 6, 'timber_shard', 1, 'uncommon');
      }

      if (Math.random() < 0.16) {
        this.spawnDrop(e.x + 10, e.y, 'ironwood', 1, 'rare');
      }

      if (Math.random() < 0.25) {
        this.spawnDrop(
          e.x - 10,
          e.y + 4,
          Math.random() < 0.5 ? 'hp_berry' : 'mana_shard',
          1,
          'common'
        );
      }

      const wRoll = Math.random();
      if (wRoll < 0.22) {
        const tierRoll = Math.random();
        if (tierRoll < 0.26) {
          this.spawnDrop(
            e.x,
            e.y - 10,
            'weapon',
            1,
            'rare',
            rarePool[Math.floor(Math.random() * rarePool.length)]
          );
        } else if (tierRoll < 0.62) {
          this.spawnDrop(
            e.x,
            e.y - 10,
            'weapon',
            1,
            'uncommon',
            uncommonPool[Math.floor(Math.random() * uncommonPool.length)]
          );
        } else {
          this.spawnDrop(
            e.x,
            e.y - 10,
            'weapon',
            1,
            'common',
            commonPool[Math.floor(Math.random() * commonPool.length)]
          );
        }
      }
    }

    // Check if room cleared
    const roomRemaining = this.dungeon.enemies.some((other) => other.roomId === e.roomId);
    if (!roomRemaining) {
      const rm = this.dungeon.rooms.find((r) => r.id === e.roomId);
      if (rm && !rm.cleared) {
        rm.cleared = true;
        this.addFloatingText(this.player.x, this.player.y - 28, 'Ruangan Bersih!', '#10B981', 1.1);
      }
    }
  }

  private gainExp(amount: number) {
    this.player.exp += amount;
    while (this.player.exp >= this.player.expToNext) {
      this.player.exp -= this.player.expToNext;
      this.player.level += 1;
      this.player.skillPoints += 1;
      this.player.expToNext = Math.round(this.player.expToNext * 1.32 + 20);
      const stats = this.getComputedStats();
      this.player.maxHp = Math.round(stats.maxHp);
      this.player.maxMana = Math.round(stats.maxMana);
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 25);
      this.player.mana = this.player.maxMana;
      sfx.levelUp();
      this.spawnParticles(this.player.x, this.player.y, '#FDE047', 22);
      this.addFloatingText(this.player.x, this.player.y - 28, `LEVEL UP! +1 Skill`, '#FDE047', 1.25);
      this.onToast?.(`Naik ke Level ${this.player.level}! +1 Skill Point tersedia.`, '#FDE047');
    }
  }

  private spawnDrop(
    x: number,
    y: number,
    kind: GroundDrop['kind'],
    amount: number,
    rarity: Rarity,
    weaponDefId?: string,
    blueprintId?: string
  ) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 45 + Math.random() * 45;
    this.dungeon.drops.push({
      id: nextId('drop'),
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      kind,
      amount,
      rarity,
      weaponDefId,
      blueprintId,
      bobPhase: Math.random() * Math.PI * 2,
      life: 120,
    });
  }

  private updateTrees(dt: number) {
    for (const t of this.dungeon.trees) {
      t.hitFlash = Math.max(0, t.hitFlash - dt);
      t.shakeTimer = Math.max(0, t.shakeTimer - dt);
    }
    for (let i = this.dungeon.slashes.length - 1; i >= 0; i--) {
      this.dungeon.slashes[i].timer -= dt;
      if (this.dungeon.slashes[i].timer <= 0) {
        this.dungeon.slashes.splice(i, 1);
      }
    }
  }

  private updateTraps(dt: number, playerDefense: number) {
    const isTrapImmune = this.player.characterId === 'dewi_rimba';
    const isDurianHeal = this.player.characterId === 'ratu_durian';
    const rainFireMult = this.player.rainTimer > 0 ? 0.5 : 1;

    for (let i = this.dungeon.traps.length - 1; i >= 0; i--) {
      const tr = this.dungeon.traps[i];
      if (tr.oneShot) {
        tr.stateTimer -= dt;
        if (tr.state === 'warning' && tr.stateTimer <= 0) {
          tr.state = 'active';
          tr.stateTimer = 0.25;
          if (tr.kind === 'falling_durian') {
            sfx.treeFall();
            this.triggerShake(0.22, 6);
            this.spawnParticles(tr.x, tr.y, '#84CC16', 14);
            this.spawnParticles(tr.x, tr.y, '#FACC15', 10);
            if (Math.hypot(this.player.x - tr.x, this.player.y - tr.y) <= tr.radius + 10) {
              if (isDurianHeal) {
                this.player.hp = Math.min(this.player.maxHp, this.player.hp + 15);
                this.addFloatingText(this.player.x, this.player.y - 24, '+15 HP (Durian)', '#4ADE80', 1.05);
              } else if (!isTrapImmune) {
                this.damagePlayer(tr.damage, playerDefense, 0.7);
              }
            }
          } else if (tr.kind === 'root_snare') {
            sfx.chop();
            this.triggerShake(0.14, 3.5);
            this.spawnParticles(tr.x, tr.y, '#22C55E', 10);
            this.spawnParticles(tr.x, tr.y, '#5C3A21', 8);
            if (!isTrapImmune && Math.hypot(this.player.x - tr.x, this.player.y - tr.y) <= tr.radius + 10) {
              this.damagePlayer(tr.damage, playerDefense, 0.55);
              this.rootSlowTimer = 1.6;
            }
          }
        } else if (tr.state === 'active' && tr.stateTimer <= 0) {
          this.dungeon.traps.splice(i, 1);
        }
        continue;
      }

      tr.stateTimer -= dt;
      if (tr.stateTimer <= 0) {
        if (tr.state === 'idle') {
          tr.state = 'warning';
          tr.stateTimer = 0.55;
        } else if (tr.state === 'warning') {
          tr.state = 'active';
          tr.stateTimer = tr.kind === 'flame_jet' ? 0.9 : 0.75;
          tr.hitThisCycle = false;
        } else {
          tr.state = 'idle';
          tr.stateTimer = tr.period;
        }
      }

      if (tr.state === 'active' && !isTrapImmune) {
        if (tr.kind === 'flame_jet') {
          const dx = tr.dirX ?? 1;
          const dy = tr.dirY ?? 0;
          if (Math.random() < 0.6) {
            this.dungeon.particles.push({
              x: tr.x + dx * (8 + Math.random() * 34),
              y: tr.y + dy * (8 + Math.random() * 34),
              vx: dx * 95 + (Math.random() - 0.5) * 20,
              vy: dy * 95 + (Math.random() - 0.5) * 20,
              size: 3,
              color: Math.random() < 0.5 ? '#F97316' : '#FDE047',
              life: 0.24,
              maxLife: 0.24,
            });
          }
          if (!tr.hitThisCycle) {
            const px = this.player.x - tr.x;
            const py = this.player.y - tr.y;
            const proj = px * dx + py * dy;
            const perp = Math.abs(px * -dy + py * dx);
            if (proj >= -6 && proj <= 48 && perp <= 15) {
              tr.hitThisCycle = true;
              this.damagePlayer(Math.round(tr.damage * rainFireMult), playerDefense);
            }
          }
        } else if (tr.kind === 'spikes' && !tr.hitThisCycle) {
          if (Math.hypot(this.player.x - tr.x, this.player.y - tr.y) <= tr.radius + 9) {
            tr.hitThisCycle = true;
            this.damagePlayer(tr.damage, playerDefense);
          }
        }
      }
    }
  }

  private spawnAlly(kind: AllyEntity['kind'], x: number, y: number, life = 20) {
    this.dungeon.allies.push({
      id: nextId('ally'),
      kind,
      x,
      y,
      hp: kind === 'mandor_elite' || kind === 'mage_treant' ? 120 : 80,
      maxHp: kind === 'mandor_elite' || kind === 'mage_treant' ? 120 : 80,
      damage: kind === 'mandor_elite' ? 28 : kind === 'mage_treant' ? 24 : 16,
      life,
      attackTimer: 0.4,
      pulseTimer: 1.5,
      facingX: 1,
    });
  }

  private updateFloorZones(dt: number) {
    for (let i = this.dungeon.zones.length - 1; i >= 0; i--) {
      const z = this.dungeon.zones[i];
      z.life -= dt;
      z.tickTimer -= dt;

      if (z.kind === 'blackhole' || z.kind === 'whirlpool') {
        const pull = z.pullStrength ?? 140;
        for (const e of this.dungeon.enemies) {
          const d = Math.hypot(z.x - e.x, z.y - e.y);
          if (d <= z.radius + e.radius && d > 8) {
            const a = Math.atan2(z.y - e.y, z.x - e.x);
            this.moveEntityWithCollision(e, Math.cos(a) * pull * dt, Math.sin(a) * pull * dt, e.radius);
          }
        }
      }

      if (z.tickTimer <= 0) {
        z.tickTimer = z.kind === 'fire_trail' ? 0.4 : z.kind === 'meteor_telegraph' ? 99 : 0.42;
        if (z.kind === 'meteor_telegraph') {
          sfx.treeFall();
          this.triggerShake(0.18, 4.5);
          this.spawnParticles(z.x, z.y, '#F97316', 18);
          this.spawnParticles(z.x, z.y, '#FF3B30', 12);
        }
        for (const e of [...this.dungeon.enemies]) {
          if (Math.hypot(e.x - z.x, e.y - z.y) <= z.radius + e.radius) {
            this.damageEnemy(e, z.damage, false, 0, 0, true);
            if (z.kind === 'root_spike') {
              e.freezeTimer = Math.max(e.freezeTimer, 0.7);
            }
          }
        }
      }

      if (z.life <= 0) {
        this.dungeon.zones.splice(i, 1);
      }
    }

    for (let i = this.dungeon.arcs.length - 1; i >= 0; i--) {
      this.dungeon.arcs[i].life -= dt;
      if (this.dungeon.arcs[i].life <= 0) {
        this.dungeon.arcs.splice(i, 1);
      }
    }
  }

  private updateAllies(dt: number) {
    for (let i = this.dungeon.allies.length - 1; i >= 0; i--) {
      const a = this.dungeon.allies[i];
      a.life -= dt;
      a.attackTimer = Math.max(0, a.attackTimer - dt);
      a.pulseTimer -= dt;

      if (a.kind === 'totem' || a.kind === 'totem_curse') {
        if (a.pulseTimer <= 0) {
          a.pulseTimer = 2.0;
          if (Math.hypot(this.player.x - a.x, this.player.y - a.y) <= 135) {
            this.player.hp = Math.min(this.player.maxHp, this.player.hp + 6);
            this.spawnParticles(a.x, a.y, '#4ADE80', 6);
            this.addFloatingText(this.player.x, this.player.y - 22, '+6 HP (Totem)', '#4ADE80', 0.85);
          }
          if (a.kind === 'totem_curse') {
            for (const e of this.dungeon.enemies) {
              if (Math.hypot(e.x - a.x, e.y - a.y) <= 160) {
                e.atkDebuffTimer = 3.0;
              }
            }
          }
        }
      } else {
        // Kuli, Mandor Elite, Mini Treant, Mage Treant
        let target: EnemyEntity | null = null;
        let bestDist = 260;
        for (const e of this.dungeon.enemies) {
          const d = Math.hypot(e.x - a.x, e.y - a.y);
          if (d < bestDist) {
            bestDist = d;
            target = e;
          }
        }

        if (target) {
          const ang = Math.atan2(target.y - a.y, target.x - a.x);
          a.facingX = Math.cos(ang) >= 0 ? 1 : -1;
          if (a.kind === 'mage_treant') {
            if (bestDist > 130) {
              this.moveEntityWithCollision(a, Math.cos(ang) * 95 * dt, Math.sin(ang) * 95 * dt, 10);
            }
            if (a.attackTimer <= 0) {
              a.attackTimer = 1.05;
              this.dungeon.projectiles.push({
                id: nextId('ap'),
                fromPlayer: true,
                x: a.x,
                y: a.y,
                vx: Math.cos(ang) * 320,
                vy: Math.sin(ang) * 320,
                radius: 6,
                damage: a.damage,
                isCrit: false,
                life: 0.9,
                color: '#C084FC',
                kind: 'orb',
                pierceLeft: 0,
                hitIds: [],
                chopMultiplier: 0.5,
              });
            }
          } else {
            if (bestDist > 24) {
              const spd = a.kind === 'mandor_elite' ? 145 : 120;
              this.moveEntityWithCollision(a, Math.cos(ang) * spd * dt, Math.sin(ang) * spd * dt, 10);
            } else if (a.attackTimer <= 0) {
              a.attackTimer = a.kind === 'mandor_elite' ? 0.35 : 0.7;
              this.damageEnemy(target, a.damage, false, Math.cos(ang) * 70, Math.sin(ang) * 70);
            }
          }
        } else {
          // Follow player gently
          const dp = Math.hypot(this.player.x - a.x, this.player.y - a.y);
          if (dp > 52) {
            const ang = Math.atan2(this.player.y - a.y, this.player.x - a.x);
            a.facingX = Math.cos(ang) >= 0 ? 1 : -1;
            this.moveEntityWithCollision(a, Math.cos(ang) * 120 * dt, Math.sin(ang) * 120 * dt, 10);
          }
        }
      }

      if (a.life <= 0) {
        this.dungeon.allies.splice(i, 1);
      }
    }
  }

  private steerChaseMove(e: EnemyEntity, angle: number, step: number) {
    const startX = e.x;
    const startY = e.y;
    this.moveEntityWithCollision(e, Math.cos(angle) * step, Math.sin(angle) * step, e.radius);
    const moved = Math.hypot(e.x - startX, e.y - startY);
    if (moved < step * 0.25) {
      const alternates = [0.65, -0.65, 1.15, -1.15];
      for (const off of alternates) {
        const ax = Math.cos(angle + off) * step;
        const ay = Math.sin(angle + off) * step;
        if (!this.collidesAt(e.x + ax, e.y + ay, e.radius)) {
          e.x += ax;
          e.y += ay;
          break;
        }
      }
    }
  }

  private updateEnemies(dt: number, playerDefense: number) {
    this.dotTickTimer -= dt;
    const shouldTickDot = this.dotTickTimer <= 0;
    if (shouldTickDot) {
      this.dotTickTimer = 0.5;
    }

    for (const e of [...this.dungeon.enemies]) {
      e.hitFlash = Math.max(0, e.hitFlash - dt);

      if (e.poisonTimer > 0 || e.burnTimer > 0) {
        if (shouldTickDot) {
          const rawTick =
            (e.poisonTimer > 0 ? e.poisonDps * 0.5 : 0) +
            (e.burnTimer > 0 ? e.burnDps * 0.5 : 0);
          const tickDmg = Math.max(1, Math.round(rawTick));
          e.hp -= tickDmg;
          if (e.poisonTimer > 0) this.spawnParticles(e.x, e.y, '#4ADE80', 3);
          if (e.burnTimer > 0) this.spawnParticles(e.x, e.y, '#F97316', 3);
          this.addFloatingText(
            e.x + (Math.random() - 0.5) * 10,
            e.y - 16,
            `${tickDmg}`,
            e.burnTimer > 0 ? '#FB923C' : '#4ADE80',
            0.85
          );
          if (e.hp <= 0) {
            this.killEnemy(e);
            continue;
          }
        }
        e.poisonTimer = Math.max(0, e.poisonTimer - dt);
        e.burnTimer = Math.max(0, e.burnTimer - dt);
      }

      if (e.kbTimer && e.kbTimer > 0) {
        e.kbTimer = Math.max(0, e.kbTimer - dt);
        const stepX = (e.kbVx || 0) * dt;
        const stepY = (e.kbVy || 0) * dt;
        this.moveEntityWithCollision(e, stepX * 0.5, stepY * 0.5, e.radius);
        this.moveEntityWithCollision(e, stepX * 0.5, stepY * 0.5, e.radius);
        e.kbVx = (e.kbVx || 0) * Math.exp(-6 * dt);
        e.kbVy = (e.kbVy || 0) * Math.exp(-6 * dt);
        if (Math.random() < 0.45) {
          this.spawnParticles(e.x, e.y + 6, '#CBD5E1', 1);
        }
      }

      e.animTime += dt * (e.freezeTimer > 0 ? 1.5 : 6);
      if (e.atkDebuffTimer && e.atkDebuffTimer > 0) {
        e.atkDebuffTimer = Math.max(0, e.atkDebuffTimer - dt);
      }
      if (e.slipCooldown && e.slipCooldown > 0) {
        e.slipCooldown = Math.max(0, e.slipCooldown - dt);
      }

      // Nyi Blorong Passive: Lantai Crypt Es bikin musuh terpeleset & jatuh!
      if (
        this.player.characterId === 'nyi_blorong' &&
        this.dungeon.biome === 'ice_crypt' &&
        e.freezeTimer <= 0 &&
        (!e.slipCooldown || e.slipCooldown <= 0) &&
        e.alerted &&
        e.kind !== 'boss_treant' &&
        e.kind !== 'boss_durian' &&
        Math.random() < 0.22 * dt
      ) {
        e.freezeTimer = 1.25;
        e.slipCooldown = 6.5;
        this.addFloatingText(e.x, e.y - 22, 'KEPELESET!', '#38BDF8', 0.95);
      }

      if (e.pacifiedTimer && e.pacifiedTimer > 0) {
        e.pacifiedTimer = Math.max(0, e.pacifiedTimer - dt);
        continue;
      }
      if (e.freezeTimer > 0) {
        e.freezeTimer = Math.max(0, e.freezeTimer - dt);
        continue;
      }

      // Mandor Gupal Passive: Feared small enemies flee away
      if (e.fearTimer && e.fearTimer > 0) {
        e.fearTimer = Math.max(0, e.fearTimer - dt);
        const awayA = Math.atan2(e.y - this.player.y, e.x - this.player.x);
        this.steerChaseMove(e, awayA, e.speed * 1.15 * dt);
        continue;
      }

      const dx = this.player.x - e.x;
      const dy = this.player.y - e.y;
      const dist = Math.hypot(dx, dy);
      const roomObj = this.dungeon.rooms.find((r) => r.id === e.roomId);
      const aggroRange =
        this.player.stealthTimer > 0
          ? 0
          : e.kind === 'boss_treant' || e.kind === 'boss_durian'
          ? 420
          : e.isMiniBoss
          ? 360
          : 310;

      if (
        this.player.stealthTimer <= 0 &&
        !e.alerted &&
        ((dist < aggroRange && (roomObj?.discovered || this.hasLineOfSight(e.x, e.y, this.player.x, this.player.y))) ||
          dist < 175)
      ) {
        e.alerted = true;
        this.addFloatingText(e.x, e.y - 20, '!', '#F59E0B', 1.1);
        for (const ally of this.dungeon.enemies) {
          if (ally.roomId === e.roomId && !ally.alerted) {
            ally.alerted = true;
          }
        }
      }

      if (!e.alerted || this.player.stealthTimer > 0) {
        // Active room patrol
        if (e.patrolWait > 0) {
          e.patrolWait -= dt;
        } else {
          const pd = Math.hypot(e.patrolTargetX - e.x, e.patrolTargetY - e.y);
          const prevX = e.x;
          const prevY = e.y;
          if (pd < 10) {
            const a = Math.random() * Math.PI * 2;
            const r = 42 + Math.random() * 68;
            const tx = e.patrolOriginX + Math.cos(a) * r;
            const ty = e.patrolOriginY + Math.sin(a) * r;
            if (!this.collidesAt(tx, ty, e.radius)) {
              e.patrolTargetX = tx;
              e.patrolTargetY = ty;
            }
            e.patrolWait = 0.25 + Math.random() * 0.45;
          } else {
            const pAng = Math.atan2(e.patrolTargetY - e.y, e.patrolTargetX - e.x);
            e.facingX = Math.cos(pAng) >= 0 ? 1 : -1;
            this.steerChaseMove(e, pAng, e.speed * 0.65 * dt);
            if (Math.hypot(e.x - prevX, e.y - prevY) < 0.2) {
              e.patrolTargetX = e.x;
              e.patrolTargetY = e.y;
            }
          }
        }
        continue;
      }

      e.facingX = dx >= 0 ? 1 : -1;
      e.attackCooldown = Math.max(0, e.attackCooldown - dt);

      const effEnemyDmg =
        e.damage *
        (e.atkDebuffTimer && e.atkDebuffTimer > 0 ? 0.5 : 1) *
        (this.player.rainTimer > 0 && (e.kind === 'goblin_slinger' || e.kind === 'thorn_slime')
          ? 0.5
          : 1);

      if (e.kind === 'boss_treant') {
        this.updateBossBehavior(e, dt, dx, dy, dist);
        continue;
      }
      if (e.kind === 'boss_durian') {
        this.updateDurianBossBehavior(e, dt, dx, dy, dist, playerDefense);
        continue;
      }

      // Windup telegraph
      if (e.windupTimer > 0) {
        e.windupTimer -= dt;
        if (e.windupTimer <= 0) {
          if (e.windupKind === 'lunge') {
            const a = Math.atan2(dy, dx);
            this.moveEntityWithCollision(e, Math.cos(a) * 48, Math.sin(a) * 48, e.radius);
            if (Math.hypot(this.player.x - e.x, this.player.y - e.y) < e.radius + 17) {
              this.damagePlayer(Math.round(effEnemyDmg), playerDefense);
            }
          } else if (e.windupKind === 'shoot') {
            const baseA = Math.atan2(dy, dx);
            const shots = e.isMiniBoss
              ? [-0.36, -0.18, 0, 0.18, 0.36]
              : e.kind === 'thorn_slime'
              ? [-0.24, 0, 0.24]
              : [0];
            for (const off of shots) {
              const a = baseA + off;
              this.dungeon.projectiles.push({
                id: nextId('ep'),
                fromPlayer: false,
                x: e.x + Math.cos(a) * 12,
                y: e.y + Math.sin(a) * 12,
                vx: Math.cos(a) * (e.isMiniBoss ? 235 : e.kind === 'thorn_slime' ? 200 : 240),
                vy: Math.sin(a) * (e.isMiniBoss ? 235 : e.kind === 'thorn_slime' ? 200 : 240),
                radius: e.isMiniBoss ? 6 : 5,
                damage: Math.round(effEnemyDmg),
                isCrit: false,
                life: 1.9,
                color: e.isMiniBoss ? '#C084FC' : e.kind === 'thorn_slime' ? '#C084FC' : '#F59E0B',
                kind: e.kind === 'thorn_slime' ? 'sap' : 'dart',
                pierceLeft: 0,
                hitIds: [],
                chopMultiplier: 0,
              });
            }
          }
          e.windupKind = 'none';
          e.attackCooldown = e.isMiniBoss ? 1.25 : e.kind === 'goblin_slinger' ? 1.55 : 1.05;
        }
        continue;
      }

      // Aggressive Chase or Kite
      const a = Math.atan2(dy, dx);
      if (e.kind === 'goblin_slinger' || e.kind === 'thorn_slime') {
        if (dist > 165) {
          this.steerChaseMove(e, a, e.speed * dt);
        } else if (dist < 82) {
          this.steerChaseMove(e, a + Math.PI, e.speed * 0.72 * dt);
        }
        if (e.attackCooldown <= 0 && dist < 290) {
          e.windupKind = 'shoot';
          e.windupTimer = 0.36;
        }
      } else {
        // Melee Slime & Goblin Scout relentlessly chase
        if (dist > 20) {
          this.steerChaseMove(e, a, e.speed * 1.12 * dt);
        }
        if (e.attackCooldown <= 0 && dist < 46) {
          e.windupKind = 'lunge';
          e.windupTimer = 0.25;
        }
      }
    }
  }

  private updateBossBehavior(
    boss: EnemyEntity,
    dt: number,
    dx: number,
    dy: number,
    dist: number
  ) {
    if (boss.phase === 1 && boss.hp < boss.maxHp * 0.6) {
      boss.phase = 2;
      sfx.bossRoar();
      this.triggerShake(0.3, 6);
      this.addFloatingText(boss.x, boss.y - 42, 'FASE 2: MURKA RIMBA!', '#EF4444', 1.3);
      // Summon 2 minions
      this.dungeon.enemies.push(
        spawnEnemyInRoom('wood_slime', boss.x - 56, boss.y + 30, boss.roomId, this.dungeon.floor),
        spawnEnemyInRoom('goblin_scout', boss.x + 56, boss.y + 30, boss.roomId, this.dungeon.floor)
      );
      this.syncNightEnemyBuffs();
    }

    if (boss.windupTimer > 0) {
      boss.windupTimer -= dt;
      if (boss.windupTimer <= 0) {
        if (boss.windupKind === 'radial') {
          this.triggerShake(0.2, 4.5);
          const count = boss.phase === 2 ? 12 : 8;
          const offset = Math.random() * Math.PI;
          for (let i = 0; i < count; i++) {
            const a = offset + (i / count) * Math.PI * 2;
            this.dungeon.projectiles.push({
              id: nextId('bp'),
              fromPlayer: false,
              x: boss.x + Math.cos(a) * 24,
              y: boss.y + Math.sin(a) * 24,
              vx: Math.cos(a) * 210,
              vy: Math.sin(a) * 210,
              radius: 6,
              damage: boss.damage,
              isCrit: false,
              life: 2.2,
              color: '#EF4444',
              kind: 'thorn',
              pierceLeft: 0,
              hitIds: [],
              chopMultiplier: 0,
            });
          }
        } else if (boss.windupKind === 'slam') {
          const slamCount = boss.phase === 2 ? 2 : 1;
          for (let i = 0; i < slamCount; i++) {
            const sx = this.player.x + (i === 0 ? 0 : (Math.random() - 0.5) * 90);
            const sy = this.player.y + (i === 0 ? 0 : (Math.random() - 0.5) * 90);
            this.dungeon.slams.push({
              id: nextId('slam'),
              x: sx,
              y: sy,
              radius: 44,
              timer: 0.78,
              maxTimer: 0.78,
              damage: boss.damage + 4,
            });
          }
        }
        boss.windupKind = 'none';
        boss.attackCooldown = boss.phase === 2 ? 1.15 : 1.55;
      }
      return;
    }

    // Stalk player slowly
    if (dist > 60) {
      const a = Math.atan2(dy, dx);
      this.moveEntityWithCollision(
        boss,
        Math.cos(a) * boss.speed * (boss.phase === 2 ? 1.2 : 1) * dt,
        Math.sin(a) * boss.speed * (boss.phase === 2 ? 1.2 : 1) * dt,
        boss.radius
      );
    }

    if (boss.attackCooldown <= 0) {
      boss.windupKind = Math.random() < 0.55 ? 'radial' : 'slam';
      boss.windupTimer = 0.45;
    }
  }

  private updateDurianBossBehavior(
    boss: EnemyEntity,
    dt: number,
    dx: number,
    dy: number,
    dist: number,
    playerDefense: number
  ) {
    if (boss.phase === 1 && boss.hp < boss.maxHp * 0.55) {
      boss.phase = 2;
      sfx.bossRoar();
      this.triggerShake(0.35, 7);
      this.addFloatingText(boss.x, boss.y - 44, 'FASE 2: DURIAN MENGAMUK!', '#FACC15', 1.3);
    }

    // Active jump arc (AOE leap slam)
    if (boss.jumpTimer && boss.jumpTimer > 0) {
      boss.jumpTimer = Math.max(0, boss.jumpTimer - dt);
      const maxT = boss.jumpMaxTimer || 0.62;
      const progress = Math.min(1, 1 - boss.jumpTimer / maxT);
      const sx = boss.jumpStartX ?? boss.x;
      const sy = boss.jumpStartY ?? boss.y;
      const tx = boss.jumpTargetX ?? boss.x;
      const ty = boss.jumpTargetY ?? boss.y;
      boss.x = sx + (tx - sx) * progress;
      boss.y = sy + (ty - sy) * progress;

      if (boss.jumpTimer <= 0) {
        // Big AOE shockwave upon landing
        sfx.treeFall();
        this.triggerShake(0.34, 9);
        this.spawnParticles(boss.x, boss.y, '#FACC15', 22);
        this.spawnParticles(boss.x, boss.y, '#84CC16', 18);
        this.spawnParticles(boss.x, boss.y, '#EF4444', 14);
        const aoeRadius = 92;
        if (Math.hypot(this.player.x - boss.x, this.player.y - boss.y) <= aoeRadius) {
          this.damagePlayer(boss.damage + 6, playerDefense);
        }
        for (const t of [...this.dungeon.trees]) {
          if (Math.hypot(t.x - boss.x, t.y - boss.y) <= 78) {
            this.damageTree(t, 95);
          }
        }
        boss.attackCooldown = boss.phase === 2 ? 1.15 : 1.45;
      }
      return;
    }

    // Skill 2: Active forward rolling ball (high damage)
    if (boss.rollTimer && boss.rollTimer > 0) {
      boss.rollTimer = Math.max(0, boss.rollTimer - dt);
      boss.spinAngle = (boss.spinAngle || 0) + dt * 18;
      const stepX = (boss.rollVx || 0) * dt;
      const stepY = (boss.rollVy || 0) * dt;

      if (this.collidesAt(boss.x + stepX, boss.y + stepY, boss.radius, true)) {
        boss.rollTimer = 0;
        sfx.treeFall();
        this.triggerShake(0.26, 7);
        this.spawnParticles(boss.x, boss.y, '#84CC16', 16);
      } else {
        boss.x += stepX;
        boss.y += stepY;
        if (Math.random() < 0.55) {
          this.spawnParticles(boss.x, boss.y, '#FACC15', 2);
        }
      }

      // Crush trees in rolling path
      for (const t of [...this.dungeon.trees]) {
        if (Math.hypot(t.x - boss.x, t.y - boss.y) <= boss.radius + 14) {
          this.damageTree(t, 120);
        }
      }

      // Heavy contact damage
      if (
        !boss.rollHitDone &&
        Math.hypot(this.player.x - boss.x, this.player.y - boss.y) <= boss.radius + 14
      ) {
        boss.rollHitDone = true;
        const heavyDmg = Math.round(boss.damage * 1.85);
        this.damagePlayer(heavyDmg, playerDefense);
        const kAng = Math.atan2(this.player.y - boss.y, this.player.x - boss.x);
        this.moveEntityWithCollision(this.player, Math.cos(kAng) * 28, Math.sin(kAng) * 28, 11);
      }

      if (boss.rollTimer <= 0) {
        boss.spinAngle = 0;
        boss.attackCooldown = boss.phase === 2 ? 1.1 : 1.4;
      }
      return;
    }

    if (boss.windupTimer > 0) {
      boss.windupTimer -= dt;
      if (boss.windupTimer <= 0) {
        if (boss.windupKind === 'leap') {
          // Screen shake right when DURIAN RAKSAK jumps!
          sfx.bossRoar();
          this.triggerShake(0.24, 6.5);
          this.spawnParticles(boss.x, boss.y, '#84CC16', 14);
          this.addFloatingText(boss.x, boss.y - 38, 'LOMPAT!', '#FACC15', 1.2);
          boss.jumpStartX = boss.x;
          boss.jumpStartY = boss.y;
          // Clamp jump target inside room floor
          let tx = this.player.x;
          let ty = this.player.y;
          if (this.collidesAt(tx, ty, boss.radius, true)) {
            tx = boss.x + (this.player.x - boss.x) * 0.5;
            ty = boss.y + (this.player.y - boss.y) * 0.5;
          }
          if (this.collidesAt(tx, ty, boss.radius, true)) {
            tx = boss.x;
            ty = boss.y;
          }
          boss.jumpTargetX = tx;
          boss.jumpTargetY = ty;
          boss.jumpMaxTimer = 0.62;
          boss.jumpTimer = 0.62;
          boss.windupKind = 'none';
          return;
        } else if (boss.windupKind === 'durian_throw') {
          // Skill 1: Lempar 5 durian kecil meledak + efek stun 1.5 detik
          sfx.bow();
          this.triggerShake(0.18, 4.2);
          const baseA = Math.atan2(dy, dx);
          const offsets = [-0.48, -0.24, 0, 0.24, 0.48];
          for (const off of offsets) {
            const a = baseA + off;
            this.dungeon.projectiles.push({
              id: nextId('mdur'),
              fromPlayer: false,
              x: boss.x + Math.cos(a) * 22,
              y: boss.y + Math.sin(a) * 22,
              vx: Math.cos(a) * 210,
              vy: Math.sin(a) * 210,
              radius: 8,
              damage: Math.round(boss.damage * 0.85),
              isCrit: false,
              life: 1.05,
              color: '#84CC16',
              kind: 'mini_durian',
              pierceLeft: 0,
              hitIds: [],
              aoeRadius: 52,
              stunDuration: 1.5,
              explodeOnExpire: true,
              chopMultiplier: 0,
            });
          }
        } else if (boss.windupKind === 'roll_charge') {
          // Skill 2: Guling ke depan kayak bola, damage gede
          sfx.bossRoar();
          this.triggerShake(0.2, 5);
          const a = boss.aimAngle ?? Math.atan2(dy, dx);
          const rollSpeed = boss.phase === 2 ? 360 : 320;
          boss.rollVx = Math.cos(a) * rollSpeed;
          boss.rollVy = Math.sin(a) * rollSpeed;
          boss.rollTimer = 0.78;
          boss.rollHitDone = false;
          boss.windupKind = 'none';
          return;
        }
        boss.windupKind = 'none';
        boss.attackCooldown = boss.phase === 2 ? 1.2 : 1.5;
      }
      return;
    }

    // Slow heavy stalk toward player
    if (dist > 64) {
      const a = Math.atan2(dy, dx);
      this.moveEntityWithCollision(
        boss,
        Math.cos(a) * boss.speed * dt,
        Math.sin(a) * boss.speed * dt,
        boss.radius
      );
    }

    if (boss.attackCooldown <= 0) {
      const r = Math.random();
      boss.aimAngle = Math.atan2(dy, dx);
      if (r < 0.36) {
        boss.windupKind = 'durian_throw';
        boss.windupTimer = 0.45;
      } else if (r < 0.7) {
        boss.windupKind = 'roll_charge';
        boss.windupTimer = 0.55;
      } else {
        boss.windupKind = 'leap';
        boss.windupTimer = 0.42;
      }
    }
  }

  private updateSlams(dt: number, playerDefense: number) {
    for (let i = this.dungeon.slams.length - 1; i >= 0; i--) {
      const s = this.dungeon.slams[i];
      s.timer -= dt;
      if (s.timer <= 0) {
        this.dungeon.slams.splice(i, 1);
        sfx.treeFall();
        this.triggerShake(0.18, 5);
        this.spawnParticles(s.x, s.y, '#EF4444', 18);
        this.spawnParticles(s.x, s.y, '#8B5A2B', 10);
        if (Math.hypot(this.player.x - s.x, this.player.y - s.y) <= s.radius) {
          this.damagePlayer(s.damage, playerDefense);
        }
      }
    }
  }

  private triggerChainLightning(startEnemy: EnemyEntity | null, baseDmg: number, maxTargets: number) {
    sfx.thunder();
    const hit = new Set<string>();
    const pts: Array<{ x: number; y: number }> = [{ x: this.player.x, y: this.player.y }];
    let curX = this.player.x;
    let curY = this.player.y;
    if (startEnemy) {
      pts.push({ x: startEnemy.x, y: startEnemy.y });
      hit.add(startEnemy.id);
      curX = startEnemy.x;
      curY = startEnemy.y;
      this.damageEnemy(startEnemy, baseDmg, true, 0, 0);
    }

    for (let step = hit.size; step < maxTargets; step++) {
      let best: EnemyEntity | null = null;
      let bestDist = 185;
      for (const cand of this.dungeon.enemies) {
        if (hit.has(cand.id)) continue;
        const d = Math.hypot(cand.x - curX, cand.y - curY);
        if (d < bestDist) {
          bestDist = d;
          best = cand;
        }
      }
      if (!best) break;
      hit.add(best.id);
      pts.push({ x: best.x, y: best.y });
      curX = best.x;
      curY = best.y;
      this.spawnParticles(best.x, best.y, '#38BDF8', 8);
      this.damageEnemy(best, Math.round(baseDmg * 0.8), false, 0, 0);
    }

    if (pts.length > 1) {
      this.dungeon.arcs.push({
        points: pts,
        color: '#38BDF8',
        life: 0.24,
        maxLife: 0.24,
      });
    }
  }

  private damagePlayer(rawDmg: number, defense: number, stunDuration = 0) {
    if (this.player.invulnTimer > 0 || this.player.stealthTimer > 0) return;

    // Bram + Knight Synergy thorns reflect when shielded
    if (this.player.shieldTimer > 0) {
      if (this.player.characterId === 'bram' && this.player.synergyActive) {
        for (const e of [...this.dungeon.enemies]) {
          if (Math.hypot(e.x - this.player.x, e.y - this.player.y) <= 95) {
            this.damageEnemy(e, Math.round(rawDmg * 1.5), true, 0, 0);
          }
        }
        this.addFloatingText(this.player.x, this.player.y - 26, 'PANTUL DURI!', '#4ADE80', 1.0);
      }
      return;
    }

    // Lesti Payung Petir: nahan 1 serangan + petir balik (5 musuh jika Mage synergy)
    if (this.player.characterId === 'lesti' && this.player.umbrellaReady) {
      this.player.umbrellaReady = false;
      this.player.umbrellaCooldown = 7;
      this.player.invulnTimer = 0.75;
      this.triggerShake(0.16, 4);
      this.addFloatingText(this.player.x, this.player.y - 26, 'PAYUNG PETIR!', '#38BDF8', 1.15);
      const nearest = this.dungeon.enemies.reduce<EnemyEntity | null>((best, cur) => {
        const d = Math.hypot(cur.x - this.player.x, cur.y - this.player.y);
        if (d > 220) return best;
        if (!best) return cur;
        return d < Math.hypot(best.x - this.player.x, best.y - this.player.y) ? cur : best;
      }, null);
      this.triggerChainLightning(
        nearest,
        36,
        this.player.synergyActive ? 5 : 1
      );
      this.emitHud();
      return;
    }

    if (this.player.heavenShieldReady) {
      this.player.heavenShieldReady = false;
      this.player.heavenShieldCooldown = this.player.classId === 'archer' ? 10 : 9;
      this.player.invulnTimer = 0.85;
      sfx.pickup(true);
      this.triggerShake(0.14, 3);
      this.spawnParticles(this.player.x, this.player.y, '#38BDF8', 16);
      this.spawnParticles(this.player.x, this.player.y, '#FDE047', 10);
      this.addFloatingText(this.player.x, this.player.y - 24, 'PERISAI CAHAYA!', '#38BDF8', 1.15);
      this.emitHud();
      return;
    }

    const dmg = Math.max(3, rawDmg - defense);
    this.player.hp = Math.max(0, this.player.hp - dmg);
    this.player.invulnTimer = 0.65;
    sfx.playerHurt();

    const stunImmune =
      this.player.characterId === 'draksa' ||
      (this.player.characterId === 'ujang' && this.player.synergyActive);
    if (stunDuration > 0 && !stunImmune) {
      this.player.stunTimer = Math.max(this.player.stunTimer, stunDuration);
      this.addFloatingText(
        this.player.x,
        this.player.y - 34,
        `STUN ${stunDuration.toFixed(1)}s!`,
        '#FACC15',
        1.15
      );
    }

    const hpRatio = dmg / Math.max(1, this.player.maxHp);
    const isSignificant = dmg >= 14 || hpRatio >= 0.12;
    const shakeDur = isSignificant ? 0.3 : 0.18;
    const shakeMag = isSignificant ? Math.min(11, 6 + hpRatio * 18) : 4.5;
    this.triggerShake(shakeDur, shakeMag);
    this.damageFlashTimer = isSignificant ? 0.28 : 0.16;

    this.spawnParticles(this.player.x, this.player.y, '#EF4444', isSignificant ? 16 : 10);
    this.addFloatingText(
      this.player.x,
      this.player.y - 20,
      `-${dmg}`,
      '#EF4444',
      isSignificant ? 1.25 : 1.05
    );

    if (this.player.hp <= 0) {
      // [S1] LOKA & [S1] DRAKSA Reinkarnasi: hidup lagi 1x per dungeon dengan 50% HP!
      if (
        (this.player.characterId === 'loka' || this.player.characterId === 'draksa') &&
        !this.player.reincarnatedUsed
      ) {
        this.player.reincarnatedUsed = true;
        this.player.hp = Math.max(1, Math.round(this.player.maxHp * 0.5));
        this.player.invulnTimer = 2.4;
        sfx.blackHole();
        sfx.levelUp();
        this.triggerShake(0.4, 8);
        this.spawnParticles(this.player.x, this.player.y, '#FF3B30', 28);
        this.spawnParticles(this.player.x, this.player.y, '#C084FC', 20);
        this.addFloatingText(this.player.x, this.player.y - 34, 'REINKARNASI! 50% HP', '#FF3B30', 1.3);
        this.onToast?.('REINKARNASI ABADI! Bangkit kembali dengan 50% HP!', '#FF3B30');
        for (const e of [...this.dungeon.enemies]) {
          if (Math.hypot(e.x - this.player.x, e.y - this.player.y) <= 130) {
            this.damageEnemy(e, 45, true, 0, 0);
          }
        }
        this.emitHud();
        return;
      }

      const { lost, remaining } = loseHalfGoldOnDeath();
      this.goldLostOnDeath = lost;
      this.player.materials.gold = remaining;
      updateMetaProgress({ bestScore: this.player.score, bestFloor: this.dungeon.floor });
      this.emitHud();
      this.onGameOver?.();
    }
  }

  private explodeEnemyProjectile(
    p: { x: number; y: number; damage: number; aoeRadius?: number; stunDuration?: number },
    defense: number
  ) {
    const aoe = p.aoeRadius || 50;
    sfx.treeFall();
    this.triggerShake(0.2, 5);
    this.spawnParticles(p.x, p.y, '#84CC16', 10);
    this.spawnParticles(p.x, p.y, '#FACC15', 10);
    this.spawnParticles(p.x, p.y, '#EF4444', 6);
    if (Math.hypot(this.player.x - p.x, this.player.y - p.y) <= aoe + 11) {
      this.damagePlayer(p.damage, defense, p.stunDuration || 0);
    }
  }

  private updateProjectiles(dt: number) {
    const stats = this.getComputedStats();
    for (let i = this.dungeon.projectiles.length - 1; i >= 0; i--) {
      const p = this.dungeon.projectiles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.life <= 0 || (!p.ignoreWalls && this.isWallAtWorld(p.x, p.y))) {
        if (!p.fromPlayer && p.explodeOnExpire) {
          this.explodeEnemyProjectile(p, stats.defense);
        } else if (p.fromPlayer && p.explodeOnExpire && p.summonKind) {
          this.spawnAlly(p.summonKind, p.x, p.y, 18);
          this.spawnParticles(p.x, p.y, p.color, 12);
        } else {
          this.spawnParticles(p.x, p.y, p.color, 4);
        }
        this.dungeon.projectiles.splice(i, 1);
        continue;
      }

      if (p.fromPlayer) {
        let destroyed = false;

        if (!p.ignoreWalls) {
          for (const t of [...this.dungeon.trees]) {
            if (p.hitIds.includes(t.id)) continue;
            if (Math.hypot(t.x - p.x, t.y - p.y) <= p.radius + 14) {
              p.hitIds.push(t.id);
              this.damageTree(t, Math.max(5, Math.round(p.damage * p.chopMultiplier)));
              if (p.pierceLeft > 0) {
                p.pierceLeft -= 1;
              } else {
                destroyed = true;
                break;
              }
            }
          }
          if (destroyed) {
            this.dungeon.projectiles.splice(i, 1);
            continue;
          }
        }

        for (const e of [...this.dungeon.enemies]) {
          if (p.hitIds.includes(e.id)) continue;
          if (Math.hypot(e.x - p.x, e.y - p.y) <= p.radius + e.radius) {
            p.hitIds.push(e.id);
            this.damageEnemy(e, p.damage, p.isCrit, p.vx * 0.25, p.vy * 0.25);

            if (p.stunDuration && p.stunDuration > 0) {
              e.freezeTimer = Math.max(e.freezeTimer, p.stunDuration);
            }
            if (p.rootDuration && p.rootDuration > 0) {
              e.freezeTimer = Math.max(e.freezeTimer, p.rootDuration);
              this.addFloatingText(e.x, e.y - 22, 'TERIKAT!', '#4ADE80', 0.95);
            }
            if (p.poisonDps && p.poisonDps > 0) {
              e.poisonTimer = 3.5;
              e.poisonDps = Math.max(e.poisonDps, p.poisonDps);
            }
            if (p.burnDps && p.burnDps > 0) {
              e.burnTimer = 3.0;
              e.burnDps = Math.max(e.burnDps, p.burnDps);
            }

            // AoE splash
            if (p.aoeRadius && p.aoeRadius > 0) {
              this.triggerShake(0.14, 3.8);
              this.spawnParticles(p.x, p.y, p.color, 12);
              for (const other of [...this.dungeon.enemies]) {
                if (other.id !== e.id && Math.hypot(other.x - p.x, other.y - p.y) <= p.aoeRadius) {
                  this.damageEnemy(other, Math.round(p.damage * 0.55), false, 0, 0);
                }
              }
            }

            if (p.spawnZoneKind) {
              this.dungeon.zones.push({
                id: nextId('zone'),
                kind: p.spawnZoneKind,
                x: p.x,
                y: p.y,
                radius: p.spawnZoneKind === 'blackhole' ? 100 : 48,
                damage: p.spawnZoneKind === 'meteor_telegraph' ? 48 : 16,
                life: p.spawnZoneKind === 'meteor_telegraph' ? 0.65 : 2.6,
                maxLife: p.spawnZoneKind === 'meteor_telegraph' ? 0.65 : 2.6,
                tickTimer: p.spawnZoneKind === 'meteor_telegraph' ? 0.62 : 0.25,
                pullStrength: p.spawnZoneKind === 'blackhole' ? 155 : undefined,
              });
            }

            if (p.summonKind) {
              this.spawnAlly(p.summonKind, p.x, p.y, 18);
              this.addFloatingText(p.x, p.y - 20, 'Treant Bangkit!', '#4ADE80', 0.95);
            }

            // Chain lightning (Lesti 5 targets or Mage skills)
            if (p.chainCount && p.chainCount > 0) {
              this.triggerChainLightning(e, Math.round(p.damage * 0.55), p.chainCount);
            }

            if (p.pierceLeft > 0) {
              p.pierceLeft -= 1;
            } else {
              destroyed = true;
              break;
            }
          }
        }
        if (destroyed) {
          this.dungeon.projectiles.splice(i, 1);
        }
      } else {
        let blockedByTree = false;
        for (const t of this.dungeon.trees) {
          if (Math.hypot(t.x - p.x, t.y - p.y) <= p.radius + 12) {
            if (p.explodeOnExpire) {
              this.explodeEnemyProjectile(p, stats.defense);
            } else {
              this.spawnParticles(p.x, p.y, p.color, 4);
            }
            blockedByTree = true;
            break;
          }
        }
        if (blockedByTree) {
          this.dungeon.projectiles.splice(i, 1);
          continue;
        }
        if (Math.hypot(this.player.x - p.x, this.player.y - p.y) <= p.radius + 11) {
          // Ratu Durian passive: heal from durian projectiles!
          if (p.kind === 'mini_durian' && this.player.characterId === 'ratu_durian') {
            this.player.hp = Math.min(this.player.maxHp, this.player.hp + 15);
            this.addFloatingText(this.player.x, this.player.y - 22, '+15 HP (Durian)', '#4ADE80', 1.05);
            this.dungeon.projectiles.splice(i, 1);
            continue;
          }
          if (p.explodeOnExpire || (p.aoeRadius && p.aoeRadius > 0)) {
            this.explodeEnemyProjectile(p, stats.defense);
          } else {
            this.damagePlayer(p.damage, stats.defense, p.stunDuration || 0);
          }
          this.dungeon.projectiles.splice(i, 1);
        }
      }
    }
  }

  private updateDrops(dt: number) {
    for (let i = this.dungeon.drops.length - 1; i >= 0; i--) {
      const d = this.dungeon.drops[i];
      d.bobPhase += dt * 4;
      d.vx *= Math.exp(-8 * dt);
      d.vy *= Math.exp(-8 * dt);
      d.x += d.vx * dt;
      d.y += d.vy * dt;

      const dist = Math.hypot(this.player.x - d.x, this.player.y - d.y);
      if (dist < 82) {
        // Magnetic pull
        const pull = 220 * dt;
        const a = Math.atan2(this.player.y - d.y, this.player.x - d.x);
        d.x += Math.cos(a) * pull;
        d.y += Math.sin(a) * pull;
      }

      if (dist < 18) {
        this.collectDrop(d);
        this.dungeon.drops.splice(i, 1);
      }
    }
  }

  private collectDrop(d: GroundDrop) {
    const color = RARITY_META[d.rarity].color;
    if (d.kind === 'wood') {
      this.player.materials.wood += d.amount;
      const meta = loadMetaProgress();
      updateMetaProgress({ totalWoodHarvested: meta.totalWoodHarvested + d.amount });
      this.addFloatingText(this.player.x, this.player.y - 22, `+${d.amount} Kayu`, color);
      sfx.pickup(false);
    } else if (d.kind === 'ironwood') {
      this.player.materials.ironwood += d.amount;
      this.addFloatingText(this.player.x, this.player.y - 22, `+${d.amount} Kayu Besi`, color);
      sfx.pickup(true);
    } else if (d.kind === 'elderwood') {
      this.player.materials.elderwood += d.amount;
      this.addFloatingText(this.player.x, this.player.y - 22, `+${d.amount} Kayu Purba`, color);
      sfx.pickup(true);
    } else if (d.kind === 'hp_berry') {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 18);
      this.addFloatingText(this.player.x, this.player.y - 22, '+18 HP', '#34D399');
      sfx.pickup(false);
    } else if (d.kind === 'mana_shard') {
      this.player.mana = Math.min(this.player.maxMana, this.player.mana + 20);
      this.addFloatingText(this.player.x, this.player.y - 22, '+20 Mana', '#38BDF8');
      sfx.pickup(false);
    } else if (d.kind === 'potion') {
      const maxPot = this.getMaxPotions();
      if (this.player.materials.potions < maxPot) {
        this.player.materials.potions = Math.min(maxPot, this.player.materials.potions + 1);
        this.addFloatingText(this.player.x, this.player.y - 22, '+1 Ramuan', '#34D399');
        sfx.pickup(true);
      } else if (this.player.hp < this.player.maxHp) {
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + 20);
        this.addFloatingText(this.player.x, this.player.y - 22, 'Tas Penuh · +20 HP', '#34D399');
        sfx.pickup(false);
      } else {
        this.addFloatingText(this.player.x, this.player.y - 22, `Ramuan Penuh (${maxPot}/${maxPot})`, '#94A3B8');
      }
    } else if (d.kind === 'bakso') {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 18);
      this.player.mana = Math.min(this.player.maxMana, this.player.mana + 10);
      this.addFloatingText(this.player.x, this.player.y - 22, '+18 HP +10 MP (Bakso)', '#F97316');
      sfx.pickup(true);
    } else if (d.kind === 'gem') {
      this.addFloatingText(this.player.x, this.player.y - 24, `+${d.amount} GEM!`, '#38BDF8', 1.2);
      sfx.levelUp();
    } else if (d.kind === 'gold') {
      const nextMeta = addMetaLoot({ gold: d.amount });
      this.player.materials.gold = nextMeta.gold;
      this.player.score += d.amount * 2;
      this.addFloatingText(this.player.x, this.player.y - 22, `+${d.amount} Gold`, '#FACC15');
      sfx.pickup(true);
    } else if (d.kind === 'timber_shard') {
      const nextMeta = addMetaLoot({ timberShards: d.amount });
      this.player.materials.timberShards = nextMeta.timberShards;
      this.player.score += d.amount * 15;
      this.addFloatingText(this.player.x, this.player.y - 22, `+${d.amount} Timber Shard`, '#38BDF8');
      sfx.pickup(true);
    } else if (d.kind === 'boss_soul') {
      const nextMeta = addMetaLoot({ bossSouls: d.amount });
      this.player.materials.bossSouls = nextMeta.bossSouls;
      this.player.score += d.amount * 100;
      this.addFloatingText(this.player.x, this.player.y - 24, `+${d.amount} Boss Soul`, '#C084FC', 1.15);
      sfx.pickup(true);
    } else if (d.kind === 'blueprint' && d.blueprintId) {
      const bp = BLUEPRINTS.find((b) => b.id === d.blueprintId);
      const nextMeta = addMetaLoot({ blueprintId: d.blueprintId });
      this.player.materials.timberShards = nextMeta.timberShards;
      this.player.materials.bossSouls = nextMeta.bossSouls;
      const bpLabel = bp ? bp.name : '[Blueprint]';
      const bpColor = bp?.rarity === 'legendary' ? '#FF3B30' : '#C084FC';
      this.addFloatingText(this.player.x, this.player.y - 28, bpLabel, bpColor, 1.2);
      this.onToast?.(`Blueprint Didapat: ${bpLabel}! Tempa di Blacksmith Lobby.`, bpColor);
      sfx.levelUp();
    } else if (d.kind === 'weapon' && d.weaponDefId) {
      const def = WEAPONS[d.weaponDefId];
      if (def) {
        const inst: WeaponInstance = { uid: nextId('wpn'), defId: def.id };
        if (!this.player.equippedWeapons[1]) {
          this.player.equippedWeapons[1] = inst;
        } else {
          this.player.backpack.push(inst);
        }
        const tag = RARITY_META[def.rarity].label;
        this.addFloatingText(this.player.x, this.player.y - 26, `[${tag}] ${def.name}`, def.color, 1.1);
        this.onToast?.(`Loot [${tag}]: ${def.name}`, def.color);
        sfx.pickup(def.rarity !== 'common');
      }
    }
    this.emitHud();
  }

  private updateParticles(dt: number) {
    for (let i = this.dungeon.particles.length - 1; i >= 0; i--) {
      const p = this.dungeon.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.exp(-5 * dt);
      p.vy *= Math.exp(-5 * dt);
      if (p.life <= 0) this.dungeon.particles.splice(i, 1);
    }
    for (let i = this.dungeon.floatingTexts.length - 1; i >= 0; i--) {
      const f = this.dungeon.floatingTexts[i];
      f.life -= dt;
      f.y += f.vy * dt;
      if (f.life <= 0) this.dungeon.floatingTexts.splice(i, 1);
    }
  }

  private updateFireflies(dt: number) {
    for (const f of this.fireflies) {
      f.phase += dt * 2.5;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
    }
  }

  private spawnParticles(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 40 + Math.random() * 120;
      const life = 0.25 + Math.random() * 0.28;
      this.dungeon.particles.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        size: 2 + Math.floor(Math.random() * 3),
        color,
        life,
        maxLife: life,
      });
    }
  }

  private addFloatingText(
    x: number,
    y: number,
    text: string,
    color: string,
    scale = 1
  ) {
    this.dungeon.floatingTexts.push({
      x,
      y,
      vy: -32,
      text,
      color,
      life: 0.85,
      maxLife: 0.85,
      scale,
    });
  }

  private triggerShake(duration: number, magnitude: number) {
    if (this.reducedMotion) return;
    if (magnitude >= this.shakeMagnitude || this.shakeTimer <= 0) {
      this.shakeMagnitude = magnitude;
      this.shakeDuration = Math.max(this.shakeDuration, duration);
    }
    this.shakeTimer = Math.max(this.shakeTimer, duration);
  }

  private isWallAtWorld(wx: number, wy: number): boolean {
    const tx = Math.floor(wx / TILE_SIZE);
    const ty = Math.floor(wy / TILE_SIZE);
    if (tx < 0 || ty < 0 || tx >= this.dungeon.width || ty >= this.dungeon.height) {
      return true;
    }
    const tile = this.dungeon.tiles[ty][tx];
    return tile === 0 || tile === 2;
  }

  private collidesAt(wx: number, wy: number, radius: number, ignoreTrees = false): boolean {
    const pts = [
      [wx - radius, wy - radius],
      [wx + radius, wy - radius],
      [wx - radius, wy + radius],
      [wx + radius, wy + radius],
    ];
    for (const [px, py] of pts) {
      if (this.isWallAtWorld(px, py)) return true;
    }
    if (!ignoreTrees) {
      for (const t of this.dungeon.trees) {
        if (Math.hypot(t.x - wx, t.y - wy) < radius + 12) {
          return true;
        }
      }
    }
    return false;
  }

  private moveEntityWithCollision(
    ent: { x: number; y: number },
    dx: number,
    dy: number,
    radius: number
  ) {
    const canMoveAxis = (nx: number, ny: number) => {
      if (!this.collidesAt(nx, ny, radius)) return true;
      // Allow stepping out if already overlapping a tree, as long as walls are clear and we move away from overlapping tree
      if (!this.collidesAt(nx, ny, radius, true)) {
        for (const t of this.dungeon.trees) {
          const curDist = Math.hypot(t.x - ent.x, t.y - ent.y);
          const nextDist = Math.hypot(t.x - nx, t.y - ny);
          if (curDist < radius + 12 && nextDist > curDist) {
            return true;
          }
        }
      }
      return false;
    };

    if (dx !== 0 && canMoveAxis(ent.x + dx, ent.y)) {
      ent.x += dx;
    }
    if (dy !== 0 && canMoveAxis(ent.x, ent.y + dy)) {
      ent.y += dy;
    }
  }

  public emitHud() {
    if (!this.onHudUpdate) return;
    const bossEntity = this.dungeon.enemies.find(
      (e) => e.kind === 'boss_treant' || e.kind === 'boss_durian'
    );
    const bossRoom = this.dungeon.rooms.find((r) => r.kind === 'boss');
    const miniBossEntity = this.dungeon.enemies.find(
      (e) =>
        e.isMiniBoss &&
        this.dungeon.rooms.find((r) => r.id === e.roomId)?.discovered
    );
    const showBoss =
      bossEntity && bossRoom?.discovered ? bossEntity : miniBossEntity ?? null;

    const activeWeapon = this.getActiveWeapon();
    const secInst = this.player.equippedWeapons[this.player.activeWeaponSlot === 0 ? 1 : 0];
    const secondaryWeapon = secInst ? WEAPONS[secInst.defId] || null : null;

    let nearInteractHint: string | null = null;
    for (const t of this.dungeon.trees) {
      if (Math.hypot(t.x - this.player.x, t.y - this.player.y) < 58) {
        nearInteractHint =
          t.variant === 'crate'
            ? 'Tekan Spasi / Serang untuk hancurkan peti'
            : 'Tekan Spasi / Serang untuk tebang pohon';
        break;
      }
    }

    const charDef = CHARACTER_MAP[this.player.characterId] ?? CHARACTER_MAP.bram;

    this.onHudUpdate({
      hp: Math.ceil(this.player.hp),
      maxHp: this.player.maxHp,
      mana: Math.floor(this.player.mana),
      maxMana: this.player.maxMana,
      level: this.player.level,
      exp: this.player.exp,
      expToNext: this.player.expToNext,
      skillPoints: this.player.skillPoints,
      chosenPath: this.player.chosenPath,
      heavenShieldReady: this.player.heavenShieldReady,
      stunTimer: this.player.stunTimer,
      classId: this.player.classId,
      characterId: this.player.characterId,
      characterName: charDef.name,
      synergyActive: this.player.synergyActive,
      synergyName: charDef.synergyName,
      stealthTimer: this.player.stealthTimer,
      rainActive: this.player.rainTimer > 0,
      forestAliveTimer: this.player.forestAliveTimer,
      reincarnatedUsed: this.player.reincarnatedUsed,
      ultimateUsed: this.player.ultimateUsed,
      dashCharges: this.player.dashCharges,
      activeWeapon,
      secondaryWeapon,
      activeWeaponSlot: this.player.activeWeaponSlot,
      materials: { ...this.player.materials },
      maxPotions: this.getMaxPotions(),
      skillCooldown: this.player.skillTimer,
      skillCooldownMax: this.player.skillCooldownMax,
      dodgeDashCooldown: this.dodgeDashTimer,
      floor: this.dungeon.floor,
      biome: this.dungeon.biome,
      biomeName: BIOME_META[this.dungeon.biome].name,
      kills: this.player.kills,
      treesChopped: this.player.treesChopped,
      score: this.player.score,
      goldLostOnDeath: this.goldLostOnDeath,
      boss: showBoss
        ? {
            name: showBoss.name,
            hp: Math.max(0, showBoss.hp),
            maxHp: showBoss.maxHp,
            phase: showBoss.phase,
          }
        : null,
      nearInteractHint,
      portalOpen: this.dungeon.portalOpen,
      roomsDiscovered: this.dungeon.rooms.filter((r) => r.discovered).length,
      totalRooms: this.dungeon.rooms.length,
      minimapRooms: this.dungeon.rooms.map((r) => ({
        x: r.x,
        y: r.y,
        w: r.w,
        h: r.h,
        kind: r.kind,
        discovered: r.discovered,
        cleared: r.cleared,
      })),
      playerTileX: Math.floor(this.player.x / TILE_SIZE),
      playerTileY: Math.floor(this.player.y / TILE_SIZE),
      mapWidth: this.dungeon.width,
      mapHeight: this.dungeon.height,
      timeOfDay: this.isNight ? 'night' : 'day',
      cycleRemaining: Math.max(
        0,
        Math.ceil(
          this.isNight
            ? this.phaseDuration * 2 - this.dayCycleTime
            : this.phaseDuration - this.dayCycleTime
        )
      ),
    });
  }

  public render(ctx: CanvasRenderingContext2D, viewW: number, viewH: number) {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = this.nightBlend > 0.3 ? '#040710' : '#070c09';
    ctx.fillRect(0, 0, viewW, viewH);

    // Zoom scale so pixel art feels crisp & cozy on any screen size
    const zoom = viewW < 640 ? 1.35 : 1.55;
    const shakeProgress =
      this.shakeTimer > 0 && this.shakeDuration > 0
        ? this.shakeTimer / this.shakeDuration
        : 0;
    const dampedMag = this.shakeMagnitude * shakeProgress * shakeProgress;
    const shakeX =
      dampedMag > 0.05 ? (Math.random() - 0.5) * 2 * dampedMag : 0;
    const shakeY =
      dampedMag > 0.05 ? (Math.random() - 0.5) * 2 * dampedMag : 0;
    const shakeRot =
      dampedMag > 3 ? ((Math.random() - 0.5) * dampedMag * 0.0022) : 0;

    ctx.save();
    ctx.translate(
      Math.round(viewW / 2 + shakeX),
      Math.round(viewH / 2 + shakeY)
    );
    if (shakeRot !== 0) {
      ctx.rotate(shakeRot);
    }
    ctx.scale(zoom, zoom);
    ctx.translate(Math.round(-this.camX), Math.round(-this.camY));

    const halfW = viewW / (2 * zoom) + 64;
    const halfH = viewH / (2 * zoom) + 64;
    const minTx = Math.max(0, Math.floor((this.camX - halfW) / TILE_SIZE));
    const maxTx = Math.min(this.dungeon.width - 1, Math.ceil((this.camX + halfW) / TILE_SIZE));
    const minTy = Math.max(0, Math.floor((this.camY - halfH) / TILE_SIZE));
    const maxTy = Math.min(this.dungeon.height - 1, Math.ceil((this.camY + halfH) / TILE_SIZE));

    const torchCenters: Array<[number, number]> = [];
    const tileSet = this.atlas.biomes[this.dungeon.biome];

    // 1. Draw Biome Floor, Mud & Bark Wall Tiles
    for (let ty = minTy; ty <= maxTy; ty++) {
      for (let tx = minTx; tx <= maxTx; tx++) {
        const t = this.dungeon.tiles[ty][tx];
        if (t === 0) continue;
        const wx = tx * TILE_SIZE;
        const wy = ty * TILE_SIZE;
        if (t === 2) {
          ctx.drawImage(tileSet.wall, wx, wy);
        } else if (t === 3) {
          ctx.drawImage(tileSet.torch, wx, wy);
          torchCenters.push([wx + 16, wy + 16]);
        } else if (t === 4) {
          ctx.drawImage(tileSet.mud, wx, wy);
        } else {
          const tileImg = (tx + ty) % 2 === 0 ? tileSet.floorA : tileSet.floorB;
          ctx.drawImage(tileImg, wx, wy);
        }
      }
    }

    // 1.5 Draw Floor Traps (Spikes, Flame Jets, Falling Durian, Root Snare)
    for (const tr of this.dungeon.traps) {
      if (tr.x < this.camX - halfW || tr.x > this.camX + halfW) continue;
      if (tr.y < this.camY - halfH || tr.y > this.camY + halfH) continue;

      if (tr.kind === 'spikes') {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(tr.x - 11, tr.y - 11, 22, 22);
        ctx.strokeStyle = tr.state === 'warning' ? '#FACC15' : tr.state === 'active' ? '#EF4444' : '#475569';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(tr.x - 11, tr.y - 11, 22, 22);
        const offsets = [-6, 0, 6];
        for (const ox of offsets) {
          for (const oy of offsets) {
            if (tr.state === 'active') {
              ctx.fillStyle = '#CBD5E1';
              ctx.fillRect(tr.x + ox - 1.5, tr.y + oy - 5, 3, 6);
              ctx.fillStyle = '#EF4444';
              ctx.fillRect(tr.x + ox - 1, tr.y + oy - 6, 2, 2);
            } else {
              ctx.fillStyle = tr.state === 'warning' ? '#FACC15' : '#64748B';
              ctx.fillRect(tr.x + ox - 1.5, tr.y + oy - 1.5, 3, 3);
            }
          }
        }
      } else if (tr.kind === 'flame_jet') {
        ctx.fillStyle = '#292524';
        ctx.fillRect(tr.x - 8, tr.y - 8, 16, 16);
        ctx.fillStyle = tr.state === 'active' ? '#F97316' : tr.state === 'warning' ? '#FACC15' : '#78350F';
        ctx.fillRect(tr.x - 4, tr.y - 4, 8, 8);
        if (tr.state === 'warning') {
          const dx = tr.dirX ?? 1;
          const dy = tr.dirY ?? 0;
          ctx.strokeStyle = 'rgba(249, 115, 22, 0.7)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(tr.x, tr.y);
          ctx.lineTo(tr.x + dx * 42, tr.y + dy * 42);
          ctx.stroke();
        }
      } else if (tr.kind === 'falling_durian') {
        if (tr.state === 'warning') {
          const prog = Math.max(0, 1 - tr.stateTimer / 0.85);
          ctx.fillStyle = 'rgba(250, 204, 21, 0.22)';
          ctx.beginPath();
          ctx.arc(tr.x, tr.y, tr.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#FACC15';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(tr.x, tr.y, tr.radius * prog, 0, Math.PI * 2);
          ctx.stroke();
          const dropY = tr.y - (1 - prog) * 76;
          ctx.drawImage(this.atlas.mini_durian, tr.x - 12, dropY - 12);
        } else {
          ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
          ctx.beginPath();
          ctx.arc(tr.x, tr.y, tr.radius, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (tr.kind === 'root_snare') {
        if (tr.state === 'warning') {
          ctx.strokeStyle = '#4ADE80';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(tr.x, tr.y, tr.radius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = 'rgba(74, 222, 128, 0.2)';
          ctx.fill();
        } else {
          ctx.fillStyle = '#5C3A21';
          for (let r = -12; r <= 12; r += 6) {
            ctx.fillRect(tr.x + r - 1.5, tr.y - 10, 3, 18);
          }
          ctx.fillStyle = '#4ADE80';
          ctx.fillRect(tr.x - 8, tr.y - 12, 4, 4);
          ctx.fillRect(tr.x + 5, tr.y - 11, 4, 4);
        }
      }
    }

    // 2. Warm torch glows
    for (const [lx, ly] of torchCenters) {
      const grad = ctx.createRadialGradient(lx, ly, 4, lx, ly, 78);
      grad.addColorStop(0, 'rgba(245, 158, 11, 0.24)');
      grad.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(lx, ly, 78, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Boss Portal
    if (this.dungeon.portalOpen) {
      const tNow = performance.now() / 1000;
      const pulse = 18 + Math.sin(tNow * 5) * 3;
      const pGrad = ctx.createRadialGradient(
        this.dungeon.portalX,
        this.dungeon.portalY,
        4,
        this.dungeon.portalX,
        this.dungeon.portalY,
        pulse + 16
      );
      pGrad.addColorStop(0, 'rgba(56, 189, 248, 0.95)');
      pGrad.addColorStop(0.6, 'rgba(16, 185, 129, 0.5)');
      pGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');
      ctx.fillStyle = pGrad;
      ctx.beginPath();
      ctx.arc(this.dungeon.portalX, this.dungeon.portalY, pulse + 16, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#E0F2FE';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.dungeon.portalX, this.dungeon.portalY, pulse, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 4. Slam telegraphs
    for (const s of this.dungeon.slams) {
      const progress = 1 - s.timer / s.maxTimer;
      ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius * progress, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 5. Drops
    for (const d of this.dungeon.drops) {
      const bob = Math.sin(d.bobPhase) * 3;
      const wDropDef = d.weaponDefId ? WEAPONS[d.weaponDefId] : undefined;
      const rarityColor = wDropDef ? wDropDef.color : RARITY_META[d.rarity].color;

      // Rarity glow aura underneath
      if (d.rarity !== 'common' || d.kind === 'weapon') {
        const glowMap: Record<Rarity, string> = {
          common: 'rgba(148, 163, 184, 0.18)',
          uncommon: 'rgba(134, 239, 172, 0.22)',
          rare: 'rgba(74, 222, 128, 0.26)',
          epic: 'rgba(192, 132, 252, 0.30)',
          langka: 'rgba(56, 189, 248, 0.30)',
          mythic: 'rgba(250, 204, 21, 0.34)',
          legendary: 'rgba(255, 59, 48, 0.44)',
        };
        const glowColor =
          d.weaponDefId === 'sandal_swallow'
            ? 'rgba(192, 132, 252, 0.38)'
            : glowMap[d.rarity];
        const glowRadius = d.rarity === 'legendary' ? 14 : d.rarity === 'mythic' ? 13 : 11;
        ctx.fillStyle = glowColor;
        ctx.beginPath();
        ctx.arc(d.x, d.y + 4, glowRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      if (d.kind === 'wood') {
        ctx.drawImage(this.atlas.wood_log, d.x - 12, d.y - 12 + bob);
      } else if (d.kind === 'ironwood') {
        ctx.drawImage(this.atlas.ironwood_log, d.x - 12, d.y - 12 + bob);
      } else if (d.kind === 'elderwood') {
        ctx.drawImage(this.atlas.elderwood_core, d.x - 12, d.y - 12 + bob);
      } else if (d.kind === 'potion') {
        ctx.drawImage(this.atlas.potion, d.x - 12, d.y - 12 + bob);
      } else if (d.kind === 'hp_berry') {
        ctx.drawImage(this.atlas.berry, d.x - 12, d.y - 12 + bob);
      } else if (d.kind === 'mana_shard') {
        ctx.drawImage(this.atlas.mana, d.x - 12, d.y - 12 + bob);
      } else if (d.kind === 'gold') {
        ctx.drawImage(this.atlas.gold_coin, d.x - 12, d.y - 12 + bob);
      } else if (d.kind === 'timber_shard') {
        ctx.drawImage(this.atlas.timber_shard, d.x - 12, d.y - 12 + bob);
      } else if (d.kind === 'boss_soul') {
        ctx.drawImage(this.atlas.boss_soul, d.x - 12, d.y - 12 + bob);
      } else if (d.kind === 'blueprint') {
        ctx.drawImage(this.atlas.blueprint, d.x - 12, d.y - 12 + bob);
      } else if (d.kind === 'gem') {
        ctx.drawImage(this.atlas.gem, d.x - 12, d.y - 12 + bob);
      } else if (d.kind === 'bakso') {
        ctx.drawImage(this.atlas.bakso, d.x - 12, d.y - 12 + bob);
      } else if (d.kind === 'weapon') {
        if (
          d.weaponDefId === 'sandal_swallow' ||
          d.weaponDefId === 'sandal_swallow_v2' ||
          d.weaponDefId === 'godslayer'
        ) {
          ctx.fillStyle = '#0f1713';
          ctx.fillRect(d.x - 9, d.y - 9 + bob, 18, 18);
          ctx.strokeStyle = rarityColor;
          ctx.lineWidth = 2;
          ctx.strokeRect(d.x - 9, d.y - 9 + bob, 18, 18);
          const spr =
            d.weaponDefId === 'godslayer'
              ? this.atlas.godslayer
              : d.weaponDefId === 'sandal_swallow_v2'
              ? this.atlas.sandal_swallow_v2
              : this.atlas.sandal_swallow;
          ctx.drawImage(spr, d.x - 8, d.y - 8 + bob, 16, 16);
        } else {
          // Draw crisp glowing weapon crate/sword icon
          ctx.fillStyle = '#0f1713';
          ctx.fillRect(d.x - 8, d.y - 8 + bob, 16, 16);
          ctx.strokeStyle = rarityColor;
          ctx.lineWidth = 2;
          ctx.strokeRect(d.x - 8, d.y - 8 + bob, 16, 16);
          ctx.fillStyle = rarityColor;
          ctx.fillRect(d.x - 2, d.y - 5 + bob, 4, 10);
          ctx.fillRect(d.x - 5, d.y + 1 + bob, 10, 2);
        }
      }
    }

    // 6. Trees & Crates
    for (const t of this.dungeon.trees) {
      if (t.x < this.camX - halfW || t.x > this.camX + halfW) continue;
      if (t.y < this.camY - halfH || t.y > this.camY + halfH) continue;

      const sx = t.shakeTimer > 0 ? (Math.random() - 0.5) * 4 : 0;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(t.x, t.y + 12, 13, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      if (t.variant === 'crate') {
        ctx.drawImage(this.atlas.crate, t.x - 16 + sx, t.y - 16);
      } else if (t.variant === 'elder') {
        ctx.drawImage(this.atlas.elder_tree, t.x - 20 + sx, t.y - 22);
      } else {
        ctx.drawImage(this.atlas.pine_tree, t.x - 20 + sx, t.y - 22);
      }

      if (t.hitFlash > 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.fillRect(t.x - 12 + sx, t.y - 14, 24, 24);
      }

      if (t.hp < t.maxHp) {
        const bw = 24;
        ctx.fillStyle = '#090d0b';
        ctx.fillRect(t.x - bw / 2, t.y - 24, bw, 4);
        ctx.fillStyle = t.blocksPath ? '#F59E0B' : '#34D399';
        ctx.fillRect(t.x - bw / 2, t.y - 24, bw * Math.max(0, t.hp / t.maxHp), 4);
      }
    }

    // 7. Enemies
    for (const e of this.dungeon.enemies) {
      if (e.x < this.camX - halfW - 60 || e.x > this.camX + halfW + 60) continue;
      if (e.y < this.camY - halfH - 60 || e.y > this.camY + halfH + 60) continue;

      const bounce = e.kind.includes('slime') ? Math.abs(Math.sin(e.animTime)) * 4 : Math.sin(e.animTime) * 1.5;
      let jumpLift = 0;
      if (e.kind === 'boss_durian' && e.jumpTimer && e.jumpTimer > 0) {
        const jt = 1 - e.jumpTimer / (e.jumpMaxTimer || 0.62);
        jumpLift = Math.sin(jt * Math.PI) * 58;
        // Landing AOE telegraph ring
        const ltx = e.jumpTargetX ?? e.x;
        const lty = e.jumpTargetY ?? e.y;
        ctx.fillStyle = 'rgba(250, 204, 21, 0.16)';
        ctx.beginPath();
        ctx.arc(ltx, lty, 92, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FACC15';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(ltx, lty, 92 * jt, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Roll charge line telegraph
      if (e.kind === 'boss_durian' && e.windupKind === 'roll_charge' && e.windupTimer > 0) {
        const ra = e.aimAngle ?? 0;
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.75)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(e.x, e.y);
        ctx.lineTo(e.x + Math.cos(ra) * 190, e.y + Math.sin(ra) * 190);
        ctx.stroke();
      }

      // Ground shadow
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      const shadowScale = jumpLift > 0 ? Math.max(0.45, 1 - jumpLift / 90) : 1;
      ctx.ellipse(
        e.x,
        e.y + (e.kind === 'boss_treant' || e.kind === 'boss_durian' ? 30 : e.isMiniBoss ? 18 : 12),
        e.radius * 0.85 * shadowScale,
        5 * shadowScale,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();

      if (e.isMiniBoss) {
        ctx.strokeStyle = 'rgba(192, 132, 252, 0.75)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius + 4, 0, Math.PI * 2);
        ctx.stroke();
      }

      const sprite = this.atlas[e.kind];
      const spriteScale = e.isMiniBoss ? 1.35 : 1;
      ctx.save();
      ctx.translate(e.x, e.y - bounce - jumpLift);
      if (e.spinAngle && e.spinAngle !== 0) {
        ctx.rotate(e.spinAngle);
      }
      if (e.facingX < 0) ctx.scale(-spriteScale, spriteScale);
      else if (spriteScale !== 1) ctx.scale(spriteScale, spriteScale);
      ctx.drawImage(sprite, -sprite.width / 2, -sprite.height / 2);
      ctx.restore();

      if (e.isMiniBoss) {
        ctx.fillStyle = '#FACC15';
        ctx.fillRect(e.x - 6, e.y - e.radius - 10, 12, 3);
        ctx.fillRect(e.x - 6, e.y - e.radius - 13, 3, 3);
        ctx.fillRect(e.x - 1.5, e.y - e.radius - 14, 3, 4);
        ctx.fillRect(e.x + 3, e.y - e.radius - 13, 3, 3);
      }

      if (e.hitFlash > 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath();
        ctx.arc(e.x, e.y - bounce - jumpLift, e.radius * 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
      if (e.freezeTimer > 0) {
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 2;
        ctx.strokeRect(e.x - e.radius, e.y - e.radius, e.radius * 2, e.radius * 2);
      }
      if (e.poisonTimer > 0 || e.burnTimer > 0) {
        if (e.poisonTimer > 0) {
          ctx.fillStyle = '#4ADE80';
          ctx.fillRect(e.x - 5, e.y - e.radius - 7, 4, 4);
        }
        if (e.burnTimer > 0) {
          ctx.fillStyle = '#F97316';
          ctx.fillRect(e.x + 1, e.y - e.radius - 7, 4, 4);
        }
      }
      if (e.windupTimer > 0) {
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(e.x, e.y - jumpLift, e.radius + 5, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Health bar on non-boss damaged enemies
      if (e.kind !== 'boss_treant' && e.kind !== 'boss_durian' && e.hp < e.maxHp) {
        const bw = e.isMiniBoss ? 38 : 26;
        const barY = e.isMiniBoss ? e.y - e.radius - 19 : e.y - 22;
        ctx.fillStyle = '#090d0b';
        ctx.fillRect(e.x - bw / 2, barY, bw, 4);
        ctx.fillStyle = e.isMiniBoss ? '#C084FC' : '#EF4444';
        ctx.fillRect(e.x - bw / 2, barY, bw * Math.max(0, e.hp / e.maxHp), 4);
      }
    }

    // 7.5 Floor Zones (Blackhole, Fire Trail, Whirlpool, Root Spike, Meteor Telegraph)
    for (const z of this.dungeon.zones) {
      const aRatio = Math.max(0.15, z.life / z.maxLife);
      ctx.save();
      if (z.kind === 'blackhole') {
        const g = ctx.createRadialGradient(z.x, z.y, 4, z.x, z.y, z.radius);
        g.addColorStop(0, 'rgba(15, 5, 25, 0.92)');
        g.addColorStop(0.5, 'rgba(192, 132, 252, 0.42)');
        g.addColorStop(1, 'rgba(255, 59, 48, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(z.x, z.y, z.radius, 0, Math.PI * 2);
        ctx.fill();
      } else if (z.kind === 'whirlpool') {
        ctx.strokeStyle = `rgba(56, 189, 248, ${(0.75 * aRatio).toFixed(2)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(z.x, z.y, z.radius * (0.6 + 0.4 * Math.sin(performance.now() * 0.01)), 0, Math.PI * 2);
        ctx.stroke();
      } else if (z.kind === 'fire_trail' || z.kind === 'meteor_telegraph') {
        ctx.fillStyle = z.kind === 'meteor_telegraph' ? 'rgba(255, 59, 48, 0.25)' : `rgba(249, 115, 22, ${(0.35 * aRatio).toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(z.x, z.y, z.radius, 0, Math.PI * 2);
        ctx.fill();
      } else if (z.kind === 'root_spike') {
        ctx.fillStyle = '#4ADE80';
        ctx.fillRect(z.x - 10, z.y - 8, 4, 14);
        ctx.fillRect(z.x - 2, z.y - 12, 4, 18);
        ctx.fillRect(z.x + 6, z.y - 7, 4, 13);
      }
      ctx.restore();
    }

    // 7.6 Allies (Kuli, Mandor Elite, Totems, Mini/Mage Treants)
    for (const a of this.dungeon.allies) {
      const spriteMap: Record<AllyEntity['kind'], HTMLCanvasElement> = {
        kuli: this.atlas.ally_kuli,
        mandor_elite: this.atlas.ally_mandor,
        totem: this.atlas.totem,
        totem_curse: this.atlas.totem_curse,
        mini_treant: this.atlas.mini_treant,
        mage_treant: this.atlas.mage_treant,
      };
      const spr = spriteMap[a.kind];
      ctx.save();
      ctx.translate(a.x, a.y);
      if (a.facingX < 0) ctx.scale(-1, 1);
      ctx.drawImage(spr, -spr.width / 2, -spr.height / 2);
      ctx.restore();
    }

    // 8. Player
    const bob = this.player.stunTimer > 0 ? 0 : Math.sin(this.player.animTime) * 1.5;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(this.player.x, this.player.y + 13, 11, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Perisai Cahaya passive shield ring
    if (this.player.heavenShieldReady) {
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.player.x, this.player.y, 17, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Active shield bubble
    if (this.player.shieldTimer > 0) {
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.player.x, this.player.y, 19, 0, Math.PI * 2);
      ctx.stroke();
    }

    const blink = this.player.invulnTimer > 0 && Math.floor(this.player.invulnTimer * 18) % 2 === 0;
    if (!blink) {
      const charSprKey = CHARACTER_MAP[this.player.characterId]?.spriteKey as keyof SpriteAtlas | undefined;
      const pSprite =
        (charSprKey && (this.atlas[charSprKey] as HTMLCanvasElement | undefined)) ||
        this.atlas[this.player.classId];
      ctx.save();
      if (this.player.stealthTimer > 0) ctx.globalAlpha = 0.42;
      ctx.translate(this.player.x, this.player.y - bob);
      if (this.player.facingX < 0) ctx.scale(-1, 1);
      ctx.drawImage(pSprite, -pSprite.width / 2, -pSprite.height / 2);
      ctx.restore();
    }

    // Knight carries a small lit torch during Night!
    let knightTorchX = this.player.x;
    let knightTorchY = this.player.y;
    const hasNightTorch = this.player.classId === 'knight' && this.nightBlend > 0.12;
    if (hasNightTorch) {
      const perpX = -this.player.facingY;
      const perpY = this.player.facingX;
      knightTorchX = this.player.x + perpX * 10;
      knightTorchY = this.player.y - bob + perpY * 4;
      const flicker = Math.sin(performance.now() * 0.025) * 1.1;

      // Warm glow aura around Knight's torch
      const tGrad = ctx.createRadialGradient(knightTorchX, knightTorchY - 6, 3, knightTorchX, knightTorchY - 6, 56);
      tGrad.addColorStop(0, `rgba(253, 224, 71, ${(0.32 * this.nightBlend).toFixed(2)})`);
      tGrad.addColorStop(0.5, `rgba(245, 158, 11, ${(0.18 * this.nightBlend).toFixed(2)})`);
      tGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.fillStyle = tGrad;
      ctx.beginPath();
      ctx.arc(knightTorchX, knightTorchY - 6, 56, 0, Math.PI * 2);
      ctx.fill();

      // Pixel torch handle + animated flame
      ctx.fillStyle = '#3b2313';
      ctx.fillRect(knightTorchX - 1.5, knightTorchY - 4, 3, 9);
      ctx.fillStyle = '#5c3a21';
      ctx.fillRect(knightTorchX - 1, knightTorchY - 3, 2, 7);
      ctx.fillStyle = '#B45309';
      ctx.fillRect(knightTorchX - 2.5, knightTorchY - 8, 5, 4);
      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(knightTorchX - 2, knightTorchY - 10 - flicker * 0.5, 4, 4);
      ctx.fillStyle = '#FDE047';
      ctx.fillRect(knightTorchX - 1, knightTorchY - 11 - flicker, 2, 3);
    }

    // Spinning stun stars above player
    if (this.player.stunTimer > 0) {
      const tStun = performance.now() / 160;
      for (let sIdx = 0; sIdx < 3; sIdx++) {
        const sa = tStun + (sIdx * Math.PI * 2) / 3;
        const sx = this.player.x + Math.cos(sa) * 11;
        const sy = this.player.y - 19 + Math.sin(sa) * 4;
        ctx.fillStyle = '#FACC15';
        ctx.fillRect(sx - 2, sy - 2, 4, 4);
      }
    }

    // Held weapon indicator next to player
    const activeW = this.getActiveWeapon();
    const aimA = Math.atan2(this.player.facingY, this.player.facingX);
    ctx.save();
    ctx.translate(
      this.player.x + Math.cos(aimA) * 12,
      this.player.y + Math.sin(aimA) * 12
    );
    ctx.rotate(aimA);
    ctx.fillStyle = activeW.color;
    if (activeW.swingVisual === 'sandal_spin') {
      const spr =
        activeW.id === 'sandal_swallow_v2'
          ? this.atlas.sandal_swallow_v2
          : this.atlas.sandal_swallow;
      ctx.drawImage(spr, -6, -8, 16, 16);
    } else if (activeW.id === 'godslayer') {
      ctx.drawImage(this.atlas.godslayer, -4, -10, 20, 20);
    } else if (activeW.kind === 'melee') {
      ctx.fillRect(0, -2, 12, 4);
    } else if (activeW.kind === 'bow') {
      ctx.strokeStyle = activeW.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 7, -1.1, 1.1);
      ctx.stroke();
    } else {
      ctx.fillRect(0, -1.5, 11, 3);
      ctx.fillStyle = '#E0F2FE';
      ctx.fillRect(9, -3, 4, 6);
    }
    ctx.restore();

    // 9. Slash Arcs (including spinning Sandal Swallow visual)
    for (const s of this.dungeon.slashes) {
      const alpha = s.timer / s.maxTimer;
      const progress = 1 - alpha;
      ctx.save();
      if (s.visual === 'sandal_spin') {
        const spinSpr =
          s.color === '#FF3B30' ? this.atlas.sandal_swallow_v2 : this.atlas.sandal_swallow;
        // Purple/Crimson swoosh trail
        ctx.globalAlpha = alpha * 0.65;
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.range * 0.72, s.angle - 1.1, s.angle + 1.1);
        ctx.stroke();

        // Ghost afterimage + main spinning flip-flop orbiting the arc
        const swingRadius = s.range * 0.72;
        for (let g = 1; g >= 0; g--) {
          const pSample = Math.max(0, progress - g * 0.16);
          const sweepAngle = s.angle - 1.15 + pSample * 2.3;
          const sx = s.x + Math.cos(sweepAngle) * swingRadius;
          const sy = s.y + Math.sin(sweepAngle) * swingRadius;
          const spinRot = pSample * Math.PI * 6;
          ctx.save();
          ctx.globalAlpha = g === 0 ? Math.min(1, alpha * 1.25) : alpha * 0.42;
          ctx.translate(sx, sy);
          ctx.rotate(spinRot);
          ctx.drawImage(spinSpr, -12, -12, 24, 24);
          ctx.restore();
        }
      } else {
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.range * 0.72, s.angle - 1.0, s.angle + 1.0);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 10. Projectiles
    for (const p of this.dungeon.projectiles) {
      ctx.save();
      ctx.translate(p.x, p.y);
      if (p.kind === 'mini_durian') {
        ctx.rotate(performance.now() * 0.015);
        const mdSprite = this.atlas.mini_durian;
        ctx.drawImage(mdSprite, -mdSprite.width / 2, -mdSprite.height / 2);
      } else {
        const a = Math.atan2(p.vy, p.vx);
        ctx.rotate(a);
        if (p.kind === 'arrow') {
          ctx.fillStyle = p.color;
          ctx.fillRect(-6, -1.5, 12, 3);
          ctx.fillStyle = '#F8FAFC';
          ctx.fillRect(4, -2.5, 3, 5);
        } else if (p.kind === 'slash_wave') {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(0, 0, 9, -1.1, 1.1);
          ctx.stroke();
        } else {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(-1.5, -1.5, 3, 3);
        }
      }
      ctx.restore();
    }

    // 10.5 Lightning Arcs (Lesti & Chain Lightning)
    for (const arc of this.dungeon.arcs) {
      if (arc.points.length < 2) continue;
      ctx.save();
      ctx.globalAlpha = Math.max(0, arc.life / arc.maxLife);
      ctx.strokeStyle = arc.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(arc.points[0].x, arc.points[0].y);
      for (let idx = 1; idx < arc.points.length; idx++) {
        const midX = (arc.points[idx - 1].x + arc.points[idx].x) / 2 + (Math.random() - 0.5) * 14;
        const midY = (arc.points[idx - 1].y + arc.points[idx].y) / 2 + (Math.random() - 0.5) * 14;
        ctx.lineTo(midX, midY);
        ctx.lineTo(arc.points[idx].x, arc.points[idx].y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // 11. Particles & Fireflies
    for (const pt of this.dungeon.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
    }
    ctx.globalAlpha = 1;

    const fireflyLimit = this.nightBlend > 0.25 ? this.fireflies.length : 26;
    for (let fi = 0; fi < fireflyLimit; fi++) {
      const ff = this.fireflies[fi];
      if (ff.x < this.camX - halfW || ff.x > this.camX + halfW) continue;
      if (ff.y < this.camY - halfH || ff.y > this.camY + halfH) continue;
      const pulse = 0.5 + 0.5 * Math.sin(ff.phase);
      if (this.nightBlend > 0.2) {
        const haloAlpha = (0.14 + 0.28 * pulse) * this.nightBlend;
        ctx.fillStyle = `rgba(163, 230, 53, ${haloAlpha.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(ff.x + 1, ff.y + 1, 5 + pulse * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      const glow = 0.25 + (this.nightBlend > 0.2 ? 0.72 : 0.45) * pulse;
      ctx.fillStyle = `rgba(190, 242, 100, ${glow.toFixed(2)})`;
      ctx.fillRect(ff.x, ff.y, this.nightBlend > 0.35 ? 2.5 : 2, this.nightBlend > 0.35 ? 2.5 : 2);
    }

    // 12. Floating Combat & Loot Text
    ctx.textAlign = 'center';
    for (const ft of this.dungeon.floatingTexts) {
      ctx.globalAlpha = Math.min(1, ft.life / (ft.maxLife * 0.6));
      ctx.font = `700 ${Math.round(10 * (ft.scale || 1))}px "JetBrains Mono", monospace`;
      ctx.fillStyle = '#090d0b';
      ctx.fillText(ft.text, ft.x + 1, ft.y + 1);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
    }
    ctx.globalAlpha = 1;

    ctx.restore();

    // Dynamic Night Darkness Veil with Torch Light Cutouts
    if (this.nightBlend > 0.02) {
      if (!this.nightCanvas) {
        this.nightCanvas = document.createElement('canvas');
      }
      if (this.nightCanvas.width !== viewW || this.nightCanvas.height !== viewH) {
        this.nightCanvas.width = viewW;
        this.nightCanvas.height = viewH;
      }
      const nCtx = this.nightCanvas.getContext('2d');
      if (nCtx) {
        nCtx.globalCompositeOperation = 'source-over';
        nCtx.clearRect(0, 0, viewW, viewH);
        nCtx.fillStyle = `rgba(4, 8, 22, ${(0.64 * this.nightBlend).toFixed(3)})`;
        nCtx.fillRect(0, 0, viewW, viewH);

        // Carve warm illumination circles around braziers and Knight's carried torch
        nCtx.globalCompositeOperation = 'destination-out';
        const worldToScreen = (wx: number, wy: number) => ({
          sx: viewW / 2 + (wx - this.camX) * zoom,
          sy: viewH / 2 + (wy - this.camY) * zoom,
        });

        const punchLight = (wx: number, wy: number, radiusPx: number) => {
          const { sx, sy } = worldToScreen(wx, wy);
          const g = nCtx.createRadialGradient(sx, sy, radiusPx * 0.18, sx, sy, radiusPx);
          g.addColorStop(0, 'rgba(0,0,0,1)');
          g.addColorStop(0.65, 'rgba(0,0,0,0.55)');
          g.addColorStop(1, 'rgba(0,0,0,0)');
          nCtx.fillStyle = g;
          nCtx.beginPath();
          nCtx.arc(sx, sy, radiusPx, 0, Math.PI * 2);
          nCtx.fill();
        };

        for (const [lx, ly] of torchCenters) {
          punchLight(lx, ly, 92 * zoom);
        }

        if (hasNightTorch) {
          const torchR = (122 + Math.sin(performance.now() * 0.015) * 5) * zoom;
          punchLight(knightTorchX, knightTorchY - 6, torchR);
        } else {
          punchLight(this.player.x, this.player.y, 64 * zoom);
        }

        ctx.drawImage(this.nightCanvas, 0, 0);
      }

      // Draw glowing night fireflies on top of darkness so they sparkle brightly
      ctx.save();
      ctx.translate(Math.round(viewW / 2 + shakeX), Math.round(viewH / 2 + shakeY));
      if (shakeRot !== 0) ctx.rotate(shakeRot);
      ctx.scale(zoom, zoom);
      ctx.translate(Math.round(-this.camX), Math.round(-this.camY));
      for (const ff of this.fireflies) {
        if (ff.x < this.camX - halfW || ff.x > this.camX + halfW) continue;
        if (ff.y < this.camY - halfH || ff.y > this.camY + halfH) continue;
        const pulse = 0.5 + 0.5 * Math.sin(ff.phase);
        ctx.fillStyle = `rgba(217, 249, 157, ${((0.45 + 0.5 * pulse) * this.nightBlend).toFixed(2)})`;
        ctx.fillRect(ff.x, ff.y, 2.2, 2.2);
      }
      ctx.restore();

      // Pixel-art Moon & Twinkling Stars in the night sky
      const tNow = performance.now() / 1000;
      ctx.save();
      ctx.globalAlpha = this.nightBlend;
      const starOffsets: Array<[number, number, number]> = [
        [0.32, 42, 0.2],
        [0.39, 76, 1.4],
        [0.46, 36, 2.7],
        [0.57, 52, 0.9],
        [0.64, 34, 3.1],
        [0.72, 82, 1.8],
      ];
      for (const [rx, sy, phase] of starOffsets) {
        const starAlpha = 0.35 + 0.6 * (0.5 + 0.5 * Math.sin(tNow * 2.4 + phase));
        ctx.fillStyle = `rgba(226, 232, 240, ${starAlpha.toFixed(2)})`;
        ctx.fillRect(Math.round(viewW * rx), sy, 2, 2);
      }

      const moonX = Math.max(290, Math.round(viewW * 0.67));
      const moonY = 58;
      const mGrad = ctx.createRadialGradient(moonX, moonY, 6, moonX, moonY, 44);
      mGrad.addColorStop(0, 'rgba(186, 230, 253, 0.34)');
      mGrad.addColorStop(1, 'rgba(186, 230, 253, 0)');
      ctx.fillStyle = mGrad;
      ctx.beginPath();
      ctx.arc(moonX, moonY, 44, 0, Math.PI * 2);
      ctx.fill();

      // Crisp pixel moon disc + craters
      ctx.fillStyle = '#E2E8F0';
      ctx.fillRect(moonX - 10, moonY - 12, 20, 24);
      ctx.fillRect(moonX - 12, moonY - 10, 24, 20);
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(moonX - 8, moonY - 10, 14, 18);
      ctx.fillStyle = '#94A3B8';
      ctx.fillRect(moonX - 5, moonY - 5, 4, 4);
      ctx.fillRect(moonX + 3, moonY + 2, 5, 5);
      ctx.fillRect(moonX - 2, moonY + 5, 3, 3);
      ctx.restore();
    }

    // Biome & Rain atmospheric effects
    if (this.player.rainTimer > 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(30, 58, 138, 0.14)';
      ctx.fillRect(0, 0, viewW, viewH);
      ctx.strokeStyle = 'rgba(125, 211, 252, 0.45)';
      ctx.lineWidth = 1;
      const tRain = performance.now() * 0.45;
      for (let i = 0; i < 48; i++) {
        const rx = ((i * 97 + tRain * 0.35) % (viewW + 40)) - 20;
        const ry = (i * 53 + tRain) % viewH;
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - 4, ry + 12);
        ctx.stroke();
      }
      ctx.restore();
    }
    if (this.dungeon.biome === 'rotten_forest') {
      const tFog = performance.now() * 0.00045;
      ctx.save();
      for (let i = 0; i < 4; i++) {
        const fx = viewW * (0.2 + i * 0.22) + Math.sin(tFog + i * 1.7) * 55;
        const fy = viewH * (0.35 + (i % 2) * 0.3) + Math.cos(tFog * 0.8 + i) * 35;
        const fg = ctx.createRadialGradient(fx, fy, 15, fx, fy, 220);
        fg.addColorStop(0, 'rgba(34, 197, 94, 0.14)');
        fg.addColorStop(1, 'rgba(34, 197, 94, 0)');
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.arc(fx, fy, 220, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    } else if (this.dungeon.biome === 'ice_crypt') {
      ctx.save();
      ctx.fillStyle = 'rgba(56, 189, 248, 0.06)';
      ctx.fillRect(0, 0, viewW, viewH);
      ctx.restore();
    }

    // Subtle dark-forest atmospheric vignette around screen perimeter
    const vig = ctx.createRadialGradient(
      viewW / 2,
      viewH / 2,
      Math.min(viewW, viewH) * 0.35,
      viewW / 2,
      viewH / 2,
      Math.max(viewW, viewH) * 0.78
    );
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(4,8,6,0.58)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, viewW, viewH);

    // Crimson edge flash when player takes damage
    if (this.damageFlashTimer > 0) {
      const flashAlpha = Math.min(0.45, this.damageFlashTimer * 1.5);
      const dmgVig = ctx.createRadialGradient(
        viewW / 2,
        viewH / 2,
        Math.min(viewW, viewH) * 0.3,
        viewW / 2,
        viewH / 2,
        Math.max(viewW, viewH) * 0.75
      );
      dmgVig.addColorStop(0, 'rgba(239,68,68,0)');
      dmgVig.addColorStop(1, `rgba(239,68,68,${flashAlpha.toFixed(2)})`);
      ctx.fillStyle = dmgVig;
      ctx.fillRect(0, 0, viewW, viewH);
    }
  }
}
