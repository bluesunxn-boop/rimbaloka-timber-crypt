import { sfx } from './audio';
import { CRAFTING_RECIPES, HERO_CLASSES, RARITY_META, WEAPONS } from './data';
import { generateDungeon, nextId, spawnEnemyInRoom, TILE_SIZE } from './dungeon';
import { getSpriteAtlas, SpriteAtlas } from './sprites';
import { loadMetaProgress, saveActiveRun, updateMetaProgress } from './storage';
import {
  ActiveRunSave,
  ChoppableTree,
  DungeonState,
  EnemyEntity,
  GroundDrop,
  HeroClassId,
  HudSnapshot,
  Particle,
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

  public onHudUpdate?: (hud: HudSnapshot) => void;
  public onVictory?: () => void;
  public onGameOver?: () => void;
  public onToast?: (msg: string, color?: string) => void;

  constructor(classId: HeroClassId, resumeSave?: ActiveRunSave | null) {
    this.atlas = getSpriteAtlas();
    if (resumeSave) {
      this.dungeon = generateDungeon(resumeSave.floor);
      const startRoom = this.dungeon.rooms[0];
      const sp = resumeSave.player;
      this.player = {
        ...sp,
        chosenPath: sp.chosenPath ?? null,
        heavenShieldReady: sp.heavenShieldReady ?? false,
        heavenShieldCooldown: sp.heavenShieldCooldown ?? 0,
        x: (startRoom.x + startRoom.w / 2) * TILE_SIZE,
        y: (startRoom.y + startRoom.h / 2) * TILE_SIZE,
        vx: 0,
        vy: 0,
        attackTimer: 0,
        invulnTimer: 0,
        shieldTimer: 0,
        hasteTimer: 0,
        animTime: 0,
      };
    } else {
      this.dungeon = generateDungeon(1);
      const cls = HERO_CLASSES[classId];
      const startRoom = this.dungeon.rooms[0];
      this.player = {
        classId,
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
          { uid: nextId('wpn'), defId: cls.startingWeaponId },
          null,
        ],
        activeWeaponSlot: 0,
        backpack: [],
        materials: {
          wood: 4,
          ironwood: 0,
          elderwood: 0,
          potions: 1,
        },
        attackTimer: 0,
        skillTimer: 0,
        skillCooldownMax: cls.activeSkillCooldown,
        invulnTimer: 0,
        shieldTimer: 0,
        hasteTimer: 0,
        animTime: 0,
        kills: 0,
        treesChopped: 0,
        score: 0,
      };
      const meta = loadMetaProgress();
      updateMetaProgress({ totalRuns: meta.totalRuns + 1 });
    }

    this.camX = this.player.x;
    this.camY = this.player.y;
    this.initFireflies();
    saveActiveRun(this.player, this.dungeon.floor);
  }

  public setPointerScreenPos(sx: number, sy: number, viewW: number, viewH: number) {
    const zoom = viewW < 640 ? 1.35 : 1.55;
    this.input.pointerWorldX = this.camX + (sx - viewW / 2) / zoom;
    this.input.pointerWorldY = this.camY + (sy - viewH / 2) / zoom;
    this.input.pointerAimActive = true;
  }

  private initFireflies() {
    this.fireflies = [];
    for (let i = 0; i < 42; i++) {
      this.fireflies.push({
        x: Math.random() * this.dungeon.width * TILE_SIZE,
        y: Math.random() * this.dungeon.height * TILE_SIZE,
        vx: (Math.random() - 0.5) * 18,
        vy: (Math.random() - 0.5) * 18,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  public descendToNextFloor() {
    const nextFloor = this.dungeon.floor + 1;
    this.dungeon = generateDungeon(nextFloor);
    const startRoom = this.dungeon.rooms[0];
    this.player.x = (startRoom.x + startRoom.w / 2) * TILE_SIZE;
    this.player.y = (startRoom.y + startRoom.h / 2) * TILE_SIZE;
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + Math.round(this.player.maxHp * 0.35));
    this.player.mana = this.player.maxMana;
    this.camX = this.player.x;
    this.camY = this.player.y;
    this.initFireflies();
    updateMetaProgress({ bestFloor: nextFloor });
    saveActiveRun(this.player, this.dungeon.floor);
    this.addFloatingText(this.player.x, this.player.y - 24, `Lantai ${nextFloor}`, '#34D399', 1.2);
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
    this.addFloatingText(this.player.x, this.player.y - 20, w.name, RARITY_META[w.rarity].color);
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

    m.wood -= recipe.cost.wood;
    m.ironwood -= recipe.cost.ironwood;
    m.elderwood -= recipe.cost.elderwood;

    if (recipe.resultType === 'potion') {
      m.potions += 1;
      sfx.craft();
      saveActiveRun(this.player, this.dungeon.floor);
      this.emitHud();
      return { ok: true, message: `${recipe.name} berhasil diracik!` };
    }

    if (recipe.weaponId) {
      const wInst: WeaponInstance = { uid: nextId('wpn'), defId: recipe.weaponId };
      if (!this.player.equippedWeapons[1]) {
        this.player.equippedWeapons[1] = wInst;
        this.player.activeWeaponSlot = 1;
      } else {
        this.player.backpack.push(wInst);
      }
      sfx.craft();
      saveActiveRun(this.player, this.dungeon.floor);
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
    saveActiveRun(this.player, this.dungeon.floor);
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
    saveActiveRun(this.player, this.dungeon.floor);
    this.emitHud();
    return woodGain;
  }

  public update(dt: number) {
    const clampedDt = Math.min(dt, 0.05);
    const stats = this.getComputedStats();

    // Update timers
    this.player.attackTimer = Math.max(0, this.player.attackTimer - clampedDt);
    this.player.skillTimer = Math.max(0, this.player.skillTimer - clampedDt);
    this.player.invulnTimer = Math.max(0, this.player.invulnTimer - clampedDt);
    this.player.shieldTimer = Math.max(0, this.player.shieldTimer - clampedDt);
    this.player.hasteTimer = Math.max(0, this.player.hasteTimer - clampedDt);
    this.shakeTimer = Math.max(0, this.shakeTimer - clampedDt);
    if (this.shakeTimer === 0) {
      this.shakeMagnitude = 0;
      this.shakeDuration = 0;
    }
    this.damageFlashTimer = Math.max(0, this.damageFlashTimer - clampedDt);

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

    // Movement input (keyboard + virtual joystick)
    let mx = (this.input.right ? 1 : 0) - (this.input.left ? 1 : 0) + this.input.joyX;
    let my = (this.input.down ? 1 : 0) - (this.input.up ? 1 : 0) + this.input.joyY;
    const len = Math.hypot(mx, my);
    if (len > 1) {
      mx /= len;
      my /= len;
    }

    if (len > 0.08) {
      this.player.facingX = mx / Math.max(len, 0.001);
      this.player.facingY = my / Math.max(len, 0.001);
      this.player.animTime += clampedDt * 10;
    }

    this.moveEntityWithCollision(
      this.player,
      mx * stats.speed * clampedDt,
      my * stats.speed * clampedDt,
      11
    );

    // Discover rooms
    const ptx = Math.floor(this.player.x / TILE_SIZE);
    const pty = Math.floor(this.player.y / TILE_SIZE);
    for (const r of this.dungeon.rooms) {
      if (ptx >= r.x && ptx < r.x + r.w && pty >= r.y && pty < r.y + r.h) {
        if (!r.discovered) {
          r.discovered = true;
          if (r.kind === 'boss') {
            sfx.bossRoar();
            this.triggerShake(0.35, 6);
            const isMega = this.dungeon.floor % 5 === 0;
            this.onToast?.(
              isMega
                ? `BOSS AGUNG LANTAI ${this.dungeon.floor}: HP x3 · Wajib Drop Mythic & Legendary!`
                : 'BOSS MUNCUL: Raja Treant Terkutuk!',
              '#EF4444'
            );
          } else {
            const mb = this.dungeon.enemies.find((e) => e.roomId === r.id && e.isMiniBoss);
            if (mb) {
              sfx.bossRoar();
              this.triggerShake(0.24, 4.5);
              this.onToast?.(`MINI-BOSS: ${mb.name} (Minimal Drop Epic!)`, '#C084FC');
            }
          }
        }
      }
    }

    // Attack & Skill triggers
    if (this.input.attack && this.player.attackTimer <= 0) {
      this.performAttack();
    }
    if (this.input.skill && this.player.skillTimer <= 0) {
      this.performActiveSkill();
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
      saveActiveRun(this.player, this.dungeon.floor);
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

    const finalDmg = Math.max(4, Math.round(weapon.damage * dmgMult));

    if (weapon.kind === 'melee') {
      sfx.slash();
      if (weapon.damage >= 28 || isCrit) {
        this.triggerShake(0.11, weapon.damage >= 40 ? 4.5 : 2.8);
      }
      this.dungeon.slashes.push({
        x: this.player.x,
        y: this.player.y,
        angle,
        range: weapon.range,
        color: weapon.color,
        timer: 0.14,
        maxTimer: 0.14,
      });

      // Hit enemies in frontal arc
      for (const e of [...this.dungeon.enemies]) {
        const dx = e.x - this.player.x;
        const dy = e.y - this.player.y;
        const dist = Math.hypot(dx, dy);
        if (dist <= weapon.range + e.radius) {
          const angDiff = Math.abs(Math.atan2(Math.sin(Math.atan2(dy, dx) - angle), Math.cos(Math.atan2(dy, dx) - angle)));
          if (angDiff <= 1.15 || dist < 26) {
            this.damageEnemy(e, finalDmg, isCrit, Math.cos(angle) * 140, Math.sin(angle) * 140);
          }
        }
      }

      // Chop trees in frontal arc
      for (const t of [...this.dungeon.trees]) {
        const dx = t.x - this.player.x;
        const dy = t.y - this.player.y;
        const dist = Math.hypot(dx, dy);
        if (dist <= weapon.range + 16) {
          const angDiff = Math.abs(Math.atan2(Math.sin(Math.atan2(dy, dx) - angle), Math.cos(Math.atan2(dy, dx) - angle)));
          if (angDiff <= 1.2 || dist < 28) {
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

      const spread = weapon.spreadAngle || (count > 1 ? 0.16 : 0);
      const speed = weapon.projectileSpeed || 420;
      const pierce = weapon.kind === 'bow' && this.hasSkill('a_neraka_2') ? 1 : 0;
      const aoe = weapon.kind === 'staff' && this.hasSkill('m_neraka_1') ? 48 : 0;
      const chain =
        weapon.kind === 'staff' && (this.hasSkill('m_surga_2') || this.hasSkill('m_neraka_2'))
          ? 1
          : 0;

      for (let i = 0; i < count; i++) {
        const offset = count === 1 ? 0 : (i - (count - 1) / 2) * spread;
        const a = angle + offset;
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
          color: weapon.color,
          kind: weapon.kind === 'bow' ? 'arrow' : 'orb',
          pierceLeft: pierce,
          hitIds: [],
          aoeRadius: aoe,
          chainCount: chain,
          chopMultiplier: weapon.chopMultiplier * stats.chopBonus,
        });
      }
    }
  }

  public performActiveSkill() {
    const cls = HERO_CLASSES[this.player.classId];
    if (this.player.skillTimer > 0) return;
    if (this.player.mana < cls.activeSkillManaCost) {
      this.addFloatingText(this.player.x, this.player.y - 22, 'Mana Kurang!', '#38BDF8');
      return;
    }

    this.player.mana -= cls.activeSkillManaCost;
    this.player.skillTimer = cls.activeSkillCooldown;
    this.player.skillCooldownMax = cls.activeSkillCooldown;
    const angle = this.getAimAngle();

    if (this.player.classId === 'knight') {
      // Dash Cleave
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
      // Fan Volley + agile hop
      sfx.bow();
      this.triggerShake(0.14, 3.5);
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
      // Mage: Arcane Frost Nova
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

      // Drop Wood & possible rare Ironwood / Berry
      const woodAmount = tree.variant === 'elder' ? 4 : tree.variant === 'pine' ? 2 : 2;
      this.spawnDrop(tree.x, tree.y, 'wood', woodAmount, 'common');
      if (tree.variant === 'elder' || Math.random() < 0.25) {
        this.spawnDrop(tree.x + 8, tree.y + 4, 'ironwood', 1, 'rare');
      }
      if (tree.variant === 'crate' && Math.random() < 0.45) {
        this.spawnDrop(tree.x - 6, tree.y + 5, Math.random() < 0.5 ? 'hp_berry' : 'mana_shard', 1, 'common');
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
    e.hp -= dmg;
    e.hitFlash = 0.12;
    e.alerted = true;

    if (e.kind !== 'boss_treant' && !e.isMiniBoss) {
      this.moveEntityWithCollision(e, kbX * 0.08, kbY * 0.08, e.radius);
    }

    if (!fromDot) {
      if (isCrit) {
        sfx.critHit();
        this.triggerShake(0.14, dmg >= 40 ? 5.5 : 4);
        this.addFloatingText(e.x, e.y - 18, `CRIT ${dmg}!`, '#FDE047', 1.15);
        if (this.hasSkill('a_surga_1')) {
          this.player.hp = Math.min(this.player.maxHp, this.player.hp + 3);
        }
      } else {
        sfx.hitEnemy();
        if (dmg >= 28 || e.kind === 'boss_treant' || e.isMiniBoss) {
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
      e.kind.includes('slime') ? '#84CC16' : '#EF4444',
      isCrit ? 9 : 5
    );

    if (e.hp <= 0) {
      if (e.kind !== 'boss_treant') {
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
    this.player.score +=
      e.kind === 'boss_treant'
        ? this.dungeon.floor % 5 === 0
          ? 1000
          : 500
        : e.isMiniBoss
        ? 180
        : 40;
    this.gainExp(e.expReward);

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
      e.kind === 'boss_treant' ? '#F59E0B' : e.isMiniBoss ? '#C084FC' : '#84CC16',
      e.kind === 'boss_treant' ? 40 : e.isMiniBoss ? 26 : 14
    );

    const mythicPool = [
      'solar_timber_claymore',
      'golden_gale_bow',
      'aurelia_forest_scepter',
    ];
    const legendaryPool = [
      'crimson_worldbreaker',
      'hellthorn_greatbow',
      'inferno_elder_staff',
    ];
    const langkaPool = [
      'elderwood_greatsword',
      'tempest_longbow',
      'treant_eclipse_staff',
    ];
    const epicPool = [
      'frostbark_blade',
      'mist_crossbow',
      'azure_root_staff',
    ];

    if (e.kind === 'boss_treant') {
      sfx.victory();
      this.triggerShake(0.45, 8);
      this.dungeon.bossDefeated = true;
      this.dungeon.portalOpen = true;
      this.spawnDrop(e.x - 18, e.y + 10, 'wood', 8, 'common');
      this.spawnDrop(e.x + 18, e.y + 10, 'ironwood', 3, 'rare');
      this.spawnDrop(e.x, e.y + 22, 'elderwood', 2, 'mythic');
      this.spawnDrop(e.x, e.y - 12, 'potion', 1, 'epic');

      const isMegaFloor = this.dungeon.floor % 5 === 0;
      if (isMegaFloor) {
        // Boss lantai 5 & 10 wajib drop BOTH Mythic & Legendary!
        const mythicChosen = mythicPool[Math.floor(Math.random() * mythicPool.length)];
        const legendaryChosen = legendaryPool[Math.floor(Math.random() * legendaryPool.length)];
        this.spawnDrop(e.x - 28, e.y - 8, 'weapon', 1, 'mythic', mythicChosen);
        this.spawnDrop(e.x + 28, e.y - 8, 'weapon', 1, 'legendary', legendaryChosen);
        this.onToast?.(
          'Raja Treant Agung Tumbang! Wajib Drop MYTHIC & LEGENDARY!',
          '#FF3B30'
        );
      } else {
        const dropLegendary = Math.random() < 0.35;
        if (dropLegendary) {
          const chosen = legendaryPool[Math.floor(Math.random() * legendaryPool.length)];
          this.spawnDrop(e.x - 24, e.y - 8, 'weapon', 1, 'legendary', chosen);
        } else {
          const chosen = mythicPool[Math.floor(Math.random() * mythicPool.length)];
          this.spawnDrop(e.x - 24, e.y - 8, 'weapon', 1, 'mythic', chosen);
        }
        this.onToast?.(
          dropLegendary
            ? 'Raja Treant Tumbang! Senjata LEGENDARY jatuh!'
            : 'Raja Treant Tumbang! Senjata MYTHIC jatuh!',
          dropLegendary ? '#FF3B30' : '#FACC15'
        );
      }

      const meta = loadMetaProgress();
      updateMetaProgress({
        bossesSlain: meta.bossesSlain + 1,
        bestFloor: this.dungeon.floor,
        bestScore: this.player.score,
      });
      saveActiveRun(this.player, this.dungeon.floor);
      setTimeout(() => {
        this.onVictory?.();
      }, 900);
    } else if (e.isMiniBoss) {
      // Mini-boss lantai 3, 6, 9 minimal drop Epic (60% Epic, 25% Langka, 15% Mythic)
      sfx.pickup(true);
      this.spawnDrop(e.x - 10, e.y + 8, 'wood', 4, 'common');
      this.spawnDrop(e.x + 12, e.y + 8, 'ironwood', 2, 'rare');
      this.spawnDrop(e.x, e.y + 14, 'potion', 1, 'epic');

      const mbRoll = Math.random();
      if (mbRoll < 0.15) {
        const chosen = mythicPool[Math.floor(Math.random() * mythicPool.length)];
        this.spawnDrop(e.x, e.y - 12, 'weapon', 1, 'mythic', chosen);
        this.onToast?.('Mini-Boss Tumbang! Senjata MYTHIC jatuh!', '#FACC15');
      } else if (mbRoll < 0.4) {
        const chosen = langkaPool[Math.floor(Math.random() * langkaPool.length)];
        this.spawnDrop(e.x, e.y - 12, 'weapon', 1, 'langka', chosen);
        this.onToast?.('Mini-Boss Tumbang! Senjata LANGKA jatuh!', '#C084FC');
      } else {
        const chosen = epicPool[Math.floor(Math.random() * epicPool.length)];
        this.spawnDrop(e.x, e.y - 12, 'weapon', 1, 'epic', chosen);
        this.onToast?.('Mini-Boss Tumbang! Senjata EPIC jatuh!', '#38BDF8');
      }
    } else {
      // Standard enemy drops: Common & Rare
      this.spawnDrop(e.x, e.y, 'wood', 1 + (Math.random() < 0.4 ? 1 : 0), 'common');

      const roll = Math.random();
      if (roll < 0.16) {
        this.spawnDrop(e.x + 10, e.y, 'ironwood', 1, 'rare');
      }

      if (Math.random() < 0.28) {
        this.spawnDrop(
          e.x - 10,
          e.y + 4,
          Math.random() < 0.5 ? 'hp_berry' : 'mana_shard',
          1,
          'common'
        );
      }

      // Normal enemies drop Common & Rare weapons
      const wRoll = Math.random();
      if (wRoll < 0.08) {
        const rarePool = ['ironwood_axe', 'thorn_twinbow', 'spore_staff', 'sap_claymore'];
        this.spawnDrop(
          e.x,
          e.y - 10,
          'weapon',
          1,
          'rare',
          rarePool[Math.floor(Math.random() * rarePool.length)]
        );
      } else if (wRoll < 0.2) {
        const commonPool = ['lumber_axe', 'rusty_blade', 'hunters_shortbow', 'root_wand'];
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
    weaponDefId?: string
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

      e.animTime += dt * (e.freezeTimer > 0 ? 1.5 : 6);
      if (e.freezeTimer > 0) {
        e.freezeTimer = Math.max(0, e.freezeTimer - dt);
        continue;
      }

      const dx = this.player.x - e.x;
      const dy = this.player.y - e.y;
      const dist = Math.hypot(dx, dy);

      if (
        dist < (e.kind === 'boss_treant' ? 320 : e.isMiniBoss ? 280 : 230) &&
        this.hasLineOfSight(e.x, e.y, this.player.x, this.player.y)
      ) {
        if (!e.alerted) {
          e.alerted = true;
          this.addFloatingText(e.x, e.y - 20, '!', '#F59E0B', 1.1);
        }
      }

      if (!e.alerted) {
        // Patrol inside room
        e.patrolWait -= dt;
        if (e.patrolWait <= 0) {
          const pd = Math.hypot(e.patrolTargetX - e.x, e.patrolTargetY - e.y);
          if (pd < 10) {
            const a = Math.random() * Math.PI * 2;
            const r = 36 + Math.random() * 54;
            e.patrolTargetX = e.patrolOriginX + Math.cos(a) * r;
            e.patrolTargetY = e.patrolOriginY + Math.sin(a) * r;
            e.patrolWait = 0.7 + Math.random() * 1.1;
          } else {
            const pAng = Math.atan2(e.patrolTargetY - e.y, e.patrolTargetX - e.x);
            e.facingX = Math.cos(pAng) >= 0 ? 1 : -1;
            this.moveEntityWithCollision(
              e,
              Math.cos(pAng) * e.speed * 0.45 * dt,
              Math.sin(pAng) * e.speed * 0.45 * dt,
              e.radius
            );
          }
        }
        continue;
      }

      e.facingX = dx >= 0 ? 1 : -1;
      e.attackCooldown = Math.max(0, e.attackCooldown - dt);

      if (e.kind === 'boss_treant') {
        this.updateBossBehavior(e, dt, dx, dy, dist);
        continue;
      }

      // Windup telegraph
      if (e.windupTimer > 0) {
        e.windupTimer -= dt;
        if (e.windupTimer <= 0) {
          if (e.windupKind === 'lunge') {
            const a = Math.atan2(dy, dx);
            this.moveEntityWithCollision(e, Math.cos(a) * 44, Math.sin(a) * 44, e.radius);
            if (Math.hypot(this.player.x - e.x, this.player.y - e.y) < e.radius + 16) {
              this.damagePlayer(e.damage, playerDefense);
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
                vx: Math.cos(a) * (e.isMiniBoss ? 225 : e.kind === 'thorn_slime' ? 190 : 230),
                vy: Math.sin(a) * (e.isMiniBoss ? 225 : e.kind === 'thorn_slime' ? 190 : 230),
                radius: e.isMiniBoss ? 6 : 5,
                damage: e.damage,
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
          e.attackCooldown = e.isMiniBoss ? 1.35 : e.kind === 'goblin_slinger' ? 1.7 : 1.2;
        }
        continue;
      }

      // Chase or Kite
      const a = Math.atan2(dy, dx);
      if (e.kind === 'goblin_slinger' || e.kind === 'thorn_slime') {
        if (dist > 165) {
          this.moveEntityWithCollision(e, Math.cos(a) * e.speed * dt, Math.sin(a) * e.speed * dt, e.radius);
        } else if (dist < 85) {
          this.moveEntityWithCollision(e, -Math.cos(a) * e.speed * 0.7 * dt, -Math.sin(a) * e.speed * 0.7 * dt, e.radius);
        }
        if (e.attackCooldown <= 0 && dist < 270) {
          e.windupKind = 'shoot';
          e.windupTimer = 0.38;
        }
      } else {
        // Melee Slime & Goblin Scout
        if (dist > 22) {
          this.moveEntityWithCollision(e, Math.cos(a) * e.speed * dt, Math.sin(a) * e.speed * dt, e.radius);
        }
        if (e.attackCooldown <= 0 && dist < 44) {
          e.windupKind = 'lunge';
          e.windupTimer = 0.28;
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

  private damagePlayer(rawDmg: number, defense: number) {
    if (this.player.invulnTimer > 0 || this.player.shieldTimer > 0) return;
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
      updateMetaProgress({ bestScore: this.player.score, bestFloor: this.dungeon.floor });
      this.emitHud();
      this.onGameOver?.();
    }
  }

  private updateProjectiles(dt: number) {
    const stats = this.getComputedStats();
    for (let i = this.dungeon.projectiles.length - 1; i >= 0; i--) {
      const p = this.dungeon.projectiles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.life <= 0 || this.isWallAtWorld(p.x, p.y)) {
        this.spawnParticles(p.x, p.y, p.color, 4);
        this.dungeon.projectiles.splice(i, 1);
        continue;
      }

      if (p.fromPlayer) {
        let destroyed = false;

        // Check trees
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

        // Check enemies
        for (const e of [...this.dungeon.enemies]) {
          if (p.hitIds.includes(e.id)) continue;
          if (Math.hypot(e.x - p.x, e.y - p.y) <= p.radius + e.radius) {
            p.hitIds.push(e.id);
            this.damageEnemy(e, p.damage, p.isCrit, p.vx * 0.25, p.vy * 0.25);

            // AoE splash
            if (p.aoeRadius && p.aoeRadius > 0) {
              this.triggerShake(0.14, 3.8);
              this.spawnParticles(p.x, p.y, '#F59E0B', 10);
              for (const other of [...this.dungeon.enemies]) {
                if (other.id !== e.id && Math.hypot(other.x - p.x, other.y - p.y) <= p.aoeRadius) {
                  this.damageEnemy(other, Math.round(p.damage * 0.5), false, 0, 0);
                }
              }
            }

            // Chain lightning
            if (p.chainCount && p.chainCount > 0) {
              const target = this.dungeon.enemies.find(
                (other) => other.id !== e.id && Math.hypot(other.x - e.x, other.y - e.y) < 120
              );
              if (target) {
                this.spawnParticles(target.x, target.y, '#38BDF8', 8);
                this.damageEnemy(target, Math.round(p.damage * 0.55), false, 0, 0);
              }
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
        // Enemy projectile vs player or trees (trees provide cover!)
        let blockedByTree = false;
        for (const t of this.dungeon.trees) {
          if (Math.hypot(t.x - p.x, t.y - p.y) <= p.radius + 12) {
            this.spawnParticles(p.x, p.y, p.color, 4);
            blockedByTree = true;
            break;
          }
        }
        if (blockedByTree) {
          this.dungeon.projectiles.splice(i, 1);
          continue;
        }
        if (Math.hypot(this.player.x - p.x, this.player.y - p.y) <= p.radius + 11) {
          this.damagePlayer(p.damage, stats.defense);
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
      this.player.materials.potions += 1;
      this.addFloatingText(this.player.x, this.player.y - 22, '+1 Ramuan', '#34D399');
      sfx.pickup(true);
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
        this.addFloatingText(this.player.x, this.player.y - 26, `[${tag}] ${def.name}`, color, 1.1);
        this.onToast?.(`Loot [${tag}]: ${def.name}`, color);
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
    if (dx !== 0 && !this.collidesAt(ent.x + dx, ent.y, radius)) {
      ent.x += dx;
    }
    if (dy !== 0 && !this.collidesAt(ent.x, ent.y + dy, radius)) {
      ent.y += dy;
    }
  }

  public emitHud() {
    if (!this.onHudUpdate) return;
    const bossEntity = this.dungeon.enemies.find((e) => e.kind === 'boss_treant');
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
      classId: this.player.classId,
      activeWeapon,
      secondaryWeapon,
      activeWeaponSlot: this.player.activeWeaponSlot,
      materials: { ...this.player.materials },
      skillCooldown: this.player.skillTimer,
      skillCooldownMax: this.player.skillCooldownMax,
      floor: this.dungeon.floor,
      kills: this.player.kills,
      treesChopped: this.player.treesChopped,
      score: this.player.score,
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
    });
  }

  public render(ctx: CanvasRenderingContext2D, viewW: number, viewH: number) {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#070c09';
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

    // 1. Draw Floor & Bark Wall Tiles
    for (let ty = minTy; ty <= maxTy; ty++) {
      for (let tx = minTx; tx <= maxTx; tx++) {
        const t = this.dungeon.tiles[ty][tx];
        if (t === 0) continue;
        const wx = tx * TILE_SIZE;
        const wy = ty * TILE_SIZE;
        if (t === 2) {
          ctx.drawImage(this.atlas.wallTile, wx, wy);
        } else if (t === 3) {
          ctx.drawImage(this.atlas.torchTile, wx, wy);
          torchCenters.push([wx + 16, wy + 16]);
        } else {
          const tileImg = (tx + ty) % 2 === 0 ? this.atlas.floorTileA : this.atlas.floorTileB;
          ctx.drawImage(tileImg, wx, wy);
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
      const rarityColor = RARITY_META[d.rarity].color;

      // Rarity glow aura underneath
      if (d.rarity !== 'common' || d.kind === 'weapon') {
        const glowMap: Record<Rarity, string> = {
          common: 'rgba(148, 163, 184, 0.18)',
          rare: 'rgba(74, 222, 128, 0.26)',
          epic: 'rgba(56, 189, 248, 0.28)',
          langka: 'rgba(192, 132, 252, 0.30)',
          mythic: 'rgba(250, 204, 21, 0.34)',
          legendary: 'rgba(255, 59, 48, 0.44)',
        };
        const glowRadius = d.rarity === 'legendary' ? 14 : d.rarity === 'mythic' ? 13 : 11;
        ctx.fillStyle = glowMap[d.rarity];
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
      } else if (d.kind === 'weapon') {
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
      if (e.x < this.camX - halfW - 40 || e.x > this.camX + halfW + 40) continue;
      if (e.y < this.camY - halfH - 40 || e.y > this.camY + halfH + 40) continue;

      const bounce = e.kind.includes('slime') ? Math.abs(Math.sin(e.animTime)) * 4 : Math.sin(e.animTime) * 1.5;

      // Ground shadow
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.ellipse(e.x, e.y + (e.kind === 'boss_treant' ? 30 : e.isMiniBoss ? 18 : 12), e.radius * 0.85, 5, 0, 0, Math.PI * 2);
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
      ctx.translate(e.x, e.y - bounce);
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
        ctx.arc(e.x, e.y - bounce, e.radius * 0.9, 0, Math.PI * 2);
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
        ctx.arc(e.x, e.y, e.radius + 5, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Health bar on non-boss damaged enemies
      if (e.kind !== 'boss_treant' && e.hp < e.maxHp) {
        const bw = e.isMiniBoss ? 38 : 26;
        const barY = e.isMiniBoss ? e.y - e.radius - 19 : e.y - 22;
        ctx.fillStyle = '#090d0b';
        ctx.fillRect(e.x - bw / 2, barY, bw, 4);
        ctx.fillStyle = e.isMiniBoss ? '#C084FC' : '#EF4444';
        ctx.fillRect(e.x - bw / 2, barY, bw * Math.max(0, e.hp / e.maxHp), 4);
      }
    }

    // 8. Player
    const bob = Math.sin(this.player.animTime) * 1.5;
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
      const pSprite = this.atlas[this.player.classId];
      ctx.save();
      ctx.translate(this.player.x, this.player.y - bob);
      if (this.player.facingX < 0) ctx.scale(-1, 1);
      ctx.drawImage(pSprite, -pSprite.width / 2, -pSprite.height / 2);
      ctx.restore();
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
    if (activeW.kind === 'melee') {
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

    // 9. Slash Arcs
    for (const s of this.dungeon.slashes) {
      const alpha = s.timer / s.maxTimer;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.range * 0.72, s.angle - 1.0, s.angle + 1.0);
      ctx.stroke();
      ctx.restore();
    }

    // 10. Projectiles
    for (const p of this.dungeon.projectiles) {
      ctx.save();
      ctx.translate(p.x, p.y);
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
      ctx.restore();
    }

    // 11. Particles & Fireflies
    for (const pt of this.dungeon.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
    }
    ctx.globalAlpha = 1;

    for (const ff of this.fireflies) {
      if (ff.x < this.camX - halfW || ff.x > this.camX + halfW) continue;
      if (ff.y < this.camY - halfH || ff.y > this.camY + halfH) continue;
      const glow = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(ff.phase));
      ctx.fillStyle = `rgba(163, 230, 53, ${glow.toFixed(2)})`;
      ctx.fillRect(ff.x, ff.y, 2, 2);
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
