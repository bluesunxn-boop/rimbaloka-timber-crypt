import { CHARACTERS, CHARACTER_MAP } from './data';
import {
  ActiveRunSave,
  BlueprintDef,
  CharacterDef,
  CharacterId,
  CharacterRarity,
  ControlMode,
  DpadSize,
  MetaProgress,
  PlayerState,
} from './types';

const RUN_SAVE_KEY = 'rimbaloka_active_run_v1';
const META_SAVE_KEY = 'rimbaloka_meta_progress_v1';

const DEFAULT_META: MetaProgress = {
  totalRuns: 0,
  bestFloor: 1,
  bossesSlain: 0,
  totalWoodHarvested: 0,
  bestScore: 0,
  gold: 0,
  gems: 300,
  timberShards: 0,
  bossSouls: 0,
  blueprints: [],
  craftedWeapons: [],
  equippedBlacksmithWeaponId: null,
  unlockedCharacters: ['bram'],
  selectedCharacterId: 'bram',
  controlMode: 'analog',
  dpadSize: 'medium',
  controlSchemaVersion: 2,
};

export function loadActiveRun(): ActiveRunSave | null {
  try {
    const raw = localStorage.getItem(RUN_SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveRunSave;
    if (!parsed?.player?.classId || !parsed.player.equippedWeapons) return null;
    const sp = parsed.player;
    if (!sp.characterId || !CHARACTER_MAP[sp.characterId]) {
      sp.characterId = 'bram';
    }
    if (typeof sp.synergyActive !== 'boolean') sp.synergyActive = false;
    if (typeof sp.materials.gold !== 'number') sp.materials.gold = 0;
    if (typeof sp.materials.timberShards !== 'number') sp.materials.timberShards = 0;
    if (typeof sp.materials.bossSouls !== 'number') sp.materials.bossSouls = 0;
    if (typeof sp.materials.gems !== 'number') sp.materials.gems = 0;
    const maxPot = sp.characterId === 'ujang' ? 3 : 2;
    sp.materials.potions = Math.min(maxPot, sp.materials.potions ?? 1);
    sp.stealthTimer = sp.stealthTimer ?? 0;
    sp.stealthCooldown = sp.stealthCooldown ?? 0;
    sp.umbrellaReady = sp.umbrellaReady ?? false;
    sp.umbrellaCooldown = sp.umbrellaCooldown ?? 0;
    sp.rainTimer = sp.rainTimer ?? 0;
    sp.rainCooldown = sp.rainCooldown ?? 0;
    sp.forestAliveTimer = sp.forestAliveTimer ?? 0;
    sp.reincarnatedUsed = sp.reincarnatedUsed ?? false;
    sp.ultimateUsed = sp.ultimateUsed ?? false;
    sp.dashCharges = sp.dashCharges ?? 1;
    sp.dashRechargeTimer = sp.dashRechargeTimer ?? 0;
    sp.killCounter = sp.killCounter ?? 0;
    return parsed;
  } catch {
    return null;
  }
}

export function saveActiveRun(player: PlayerState, floor: number, dayCycleTime = 0): void {
  try {
    const save: ActiveRunSave = {
      savedAt: Date.now(),
      floor,
      dayCycleTime,
      player: {
        classId: player.classId,
        characterId: player.characterId,
        synergyActive: player.synergyActive,
        x: player.x,
        y: player.y,
        facingX: player.facingX,
        facingY: player.facingY,
        hp: player.hp,
        maxHp: player.maxHp,
        mana: player.mana,
        maxMana: player.maxMana,
        level: player.level,
        exp: player.exp,
        expToNext: player.expToNext,
        skillPoints: player.skillPoints,
        unlockedSkills: player.unlockedSkills,
        chosenPath: player.chosenPath,
        heavenShieldReady: player.heavenShieldReady,
        heavenShieldCooldown: player.heavenShieldCooldown,
        equippedWeapons: player.equippedWeapons,
        activeWeaponSlot: player.activeWeaponSlot,
        backpack: player.backpack,
        materials: player.materials,
        skillTimer: player.skillTimer,
        skillCooldownMax: player.skillCooldownMax,
        stealthTimer: player.stealthTimer,
        stealthCooldown: player.stealthCooldown,
        umbrellaReady: player.umbrellaReady,
        umbrellaCooldown: player.umbrellaCooldown,
        rainTimer: player.rainTimer,
        rainCooldown: player.rainCooldown,
        forestAliveTimer: player.forestAliveTimer,
        reincarnatedUsed: player.reincarnatedUsed,
        ultimateUsed: player.ultimateUsed,
        dashCharges: player.dashCharges,
        dashRechargeTimer: player.dashRechargeTimer,
        killCounter: player.killCounter,
        kills: player.kills,
        treesChopped: player.treesChopped,
        score: player.score,
      },
    };
    localStorage.setItem(RUN_SAVE_KEY, JSON.stringify(save));
  } catch {
    // Ignore storage quota errors
  }
}

export function clearActiveRun(): void {
  try {
    localStorage.removeItem(RUN_SAVE_KEY);
  } catch {
    // Ignore
  }
}

export function loadMetaProgress(): MetaProgress {
  try {
    const raw = localStorage.getItem(META_SAVE_KEY);
    if (!raw) return { ...DEFAULT_META };
    const parsed = JSON.parse(raw) as Partial<MetaProgress>;
    const unlocked = Array.isArray(parsed.unlockedCharacters)
      ? (parsed.unlockedCharacters.filter((id) => Boolean(CHARACTER_MAP[id])) as CharacterId[])
      : ['bram' as CharacterId];
    if (!unlocked.includes('bram')) unlocked.unshift('bram');
    const selected =
      parsed.selectedCharacterId &&
      CHARACTER_MAP[parsed.selectedCharacterId] &&
      unlocked.includes(parsed.selectedCharacterId)
        ? parsed.selectedCharacterId
        : unlocked[0];
    return {
      ...DEFAULT_META,
      ...parsed,
      gems: typeof parsed.gems === 'number' ? parsed.gems : DEFAULT_META.gems,
      blueprints: Array.isArray(parsed.blueprints) ? parsed.blueprints : [],
      craftedWeapons: Array.isArray(parsed.craftedWeapons) ? parsed.craftedWeapons : [],
      equippedBlacksmithWeaponId: parsed.equippedBlacksmithWeaponId ?? null,
      unlockedCharacters: unlocked,
      selectedCharacterId: selected,
      controlMode:
        (parsed.controlSchemaVersion ?? 1) >= 2 && parsed.controlMode === 'dpad'
          ? 'dpad'
          : 'analog',
      dpadSize:
        parsed.dpadSize === 'small' || parsed.dpadSize === 'large'
          ? parsed.dpadSize
          : 'medium',
      controlSchemaVersion: 2,
    };
  } catch {
    return { ...DEFAULT_META };
  }
}

function writeMetaProgress(next: MetaProgress): MetaProgress {
  try {
    localStorage.setItem(META_SAVE_KEY, JSON.stringify(next));
  } catch {
    // Ignore
  }
  return next;
}

export function updateMetaProgress(patch: Partial<MetaProgress>): MetaProgress {
  const current = loadMetaProgress();
  const next: MetaProgress = {
    ...current,
    totalRuns: patch.totalRuns ?? current.totalRuns,
    bestFloor: Math.max(current.bestFloor, patch.bestFloor ?? 1),
    bossesSlain: patch.bossesSlain ?? current.bossesSlain,
    totalWoodHarvested: patch.totalWoodHarvested ?? current.totalWoodHarvested,
    bestScore: Math.max(current.bestScore, patch.bestScore ?? 0),
    gold: patch.gold ?? current.gold,
    gems: patch.gems ?? current.gems,
    timberShards: patch.timberShards ?? current.timberShards,
    bossSouls: patch.bossSouls ?? current.bossSouls,
    blueprints: patch.blueprints ?? current.blueprints,
    craftedWeapons: patch.craftedWeapons ?? current.craftedWeapons,
    equippedBlacksmithWeaponId:
      patch.equippedBlacksmithWeaponId !== undefined
        ? patch.equippedBlacksmithWeaponId
        : current.equippedBlacksmithWeaponId,
    unlockedCharacters: patch.unlockedCharacters ?? current.unlockedCharacters,
    selectedCharacterId: patch.selectedCharacterId ?? current.selectedCharacterId,
    controlMode: patch.controlMode ?? current.controlMode,
    dpadSize: patch.dpadSize ?? current.dpadSize,
    controlSchemaVersion: 2,
  };
  return writeMetaProgress(next);
}

export function updateControlSettings(
  controlMode: ControlMode,
  dpadSize: DpadSize
): MetaProgress {
  return updateMetaProgress({ controlMode, dpadSize, controlSchemaVersion: 2 });
}

export function addMetaLoot(loot: {
  gold?: number;
  gems?: number;
  timberShards?: number;
  bossSouls?: number;
  blueprintId?: string;
}): MetaProgress {
  const current = loadMetaProgress();
  const blueprints = [...current.blueprints];
  if (loot.blueprintId && !blueprints.includes(loot.blueprintId)) {
    blueprints.push(loot.blueprintId);
  }
  return writeMetaProgress({
    ...current,
    gold: current.gold + (loot.gold ?? 0),
    gems: current.gems + (loot.gems ?? 0),
    timberShards: current.timberShards + (loot.timberShards ?? 0),
    bossSouls: current.bossSouls + (loot.bossSouls ?? 0),
    blueprints,
  });
}

export function loseHalfGoldOnDeath(): { lost: number; remaining: number } {
  const current = loadMetaProgress();
  const lost = Math.floor(current.gold * 0.5);
  const remaining = Math.max(0, current.gold - lost);
  writeMetaProgress({
    ...current,
    gold: remaining,
  });
  return { lost, remaining };
}

export function craftBlacksmithBlueprint(bp: BlueprintDef): {
  ok: boolean;
  message: string;
  meta: MetaProgress;
} {
  const current = loadMetaProgress();
  if (!current.blueprints.includes(bp.id)) {
    return {
      ok: false,
      message: 'Blueprint belum ditemukan! Kalahkan Boss dungeon.',
      meta: current,
    };
  }
  if (current.craftedWeapons.includes(bp.weaponId)) {
    return { ok: false, message: 'Senjata ini sudah pernah ditempa!', meta: current };
  }
  if (current.gold < bp.goldCost) {
    return { ok: false, message: `Butuh ${bp.goldCost} Gold!`, meta: current };
  }
  if (current.timberShards < bp.shardCost) {
    return { ok: false, message: `Butuh ${bp.shardCost}x Timber Shard!`, meta: current };
  }
  if (current.bossSouls < bp.soulCost) {
    return { ok: false, message: `Butuh ${bp.soulCost}x Boss Soul!`, meta: current };
  }

  const next = writeMetaProgress({
    ...current,
    gold: current.gold - bp.goldCost,
    timberShards: current.timberShards - bp.shardCost,
    bossSouls: current.bossSouls - bp.soulCost,
    craftedWeapons: [...current.craftedWeapons, bp.weaponId],
    equippedBlacksmithWeaponId: bp.weaponId,
  });
  return {
    ok: true,
    message: `${bp.name.replace('[Blueprint: ', '').replace(']', '')} berhasil ditempa!`,
    meta: next,
  };
}

export function setEquippedBlacksmithWeapon(weaponId: string | null): MetaProgress {
  const current = loadMetaProgress();
  return writeMetaProgress({
    ...current,
    equippedBlacksmithWeaponId: weaponId,
  });
}

export function setSelectedCharacter(characterId: CharacterId): MetaProgress {
  const current = loadMetaProgress();
  if (!current.unlockedCharacters.includes(characterId)) return current;
  return writeMetaProgress({
    ...current,
    selectedCharacterId: characterId,
  });
}

export function addGems(amount: number): MetaProgress {
  const current = loadMetaProgress();
  return writeMetaProgress({
    ...current,
    gems: Math.max(0, current.gems + amount),
  });
}

export interface GachaPullEntry {
  character: CharacterDef;
  isNew: boolean;
  dupeGemRefund: number;
  dupeGoldRefund: number;
}

export function rollGacha(count: 1 | 5): {
  ok: boolean;
  message: string;
  results: GachaPullEntry[];
  meta: MetaProgress;
} {
  const current = loadMetaProgress();
  const cost = count === 5 ? 450 : 100;
  if (current.gems < cost) {
    return {
      ok: false,
      message: `Gem tidak cukup! Butuh ${cost} Gem (Lantai 10, 20, 30... memberi +100 Gem).`,
      results: [],
      meta: current,
    };
  }

  const unlocked = new Set<CharacterId>(current.unlockedCharacters);
  let gems = current.gems - cost;
  let gold = current.gold;
  const results: GachaPullEntry[] = [];

  for (let i = 0; i < count; i++) {
    const r = Math.random();
    let tier: CharacterRarity = 'common';
    if (r < 0.05) tier = 's1';
    else if (r < 0.15) tier = 'mythic';
    else if (r < 0.4) tier = 'gold';
    else tier = 'common';

    const pool = CHARACTERS.filter((c) => c.rarity === tier);
    const chosen = pool[Math.floor(Math.random() * pool.length)] ?? CHARACTERS[0];

    const isNew = !unlocked.has(chosen.id);
    if (isNew) {
      unlocked.add(chosen.id);
      results.push({
        character: chosen,
        isNew: true,
        dupeGemRefund: 0,
        dupeGoldRefund: 0,
      });
    } else {
      const gemRef = tier === 's1' ? 80 : tier === 'mythic' ? 50 : tier === 'gold' ? 35 : 25;
      const goldRef = tier === 's1' ? 200 : tier === 'mythic' ? 120 : 60;
      gems += gemRef;
      gold += goldRef;
      results.push({
        character: chosen,
        isNew: false,
        dupeGemRefund: gemRef,
        dupeGoldRefund: goldRef,
      });
    }
  }

  const newest = results.find((e) => e.isNew)?.character.id ?? current.selectedCharacterId;
  const next = writeMetaProgress({
    ...current,
    gems,
    gold,
    unlockedCharacters: Array.from(unlocked),
    selectedCharacterId: newest,
  });

  return {
    ok: true,
    message: count === 5 ? '5x Gacha Shrine Selesai!' : `Mendapatkan ${results[0].character.name}!`,
    results,
    meta: next,
  };
}

export function fuseDraksa(): {
  ok: boolean;
  message: string;
  meta: MetaProgress;
} {
  const current = loadMetaProgress();
  if (current.unlockedCharacters.includes('draksa')) {
    return { ok: false, message: '[S1] DRAKSA sudah terbuka di koleksimu!', meta: current };
  }
  if (
    !current.unlockedCharacters.includes('rimba') ||
    !current.unlockedCharacters.includes('loka')
  ) {
    return {
      ok: false,
      message: 'Butuh [S1] RIMBA & [S1] LOKA untuk melakukan Fusion Secret!',
      meta: current,
    };
  }
  const next = writeMetaProgress({
    ...current,
    unlockedCharacters: [...current.unlockedCharacters, 'draksa'],
    selectedCharacterId: 'draksa',
  });
  return {
    ok: true,
    message: 'FUSION BERHASIL! [S1] DRAKSA - Anak Durian & Kayu bangkit!',
    meta: next,
  };
}
