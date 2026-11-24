import { ActiveRunSave, MetaProgress, PlayerState } from './types';

const RUN_SAVE_KEY = 'rimbaloka_active_run_v1';
const META_SAVE_KEY = 'rimbaloka_meta_progress_v1';

const DEFAULT_META: MetaProgress = {
  totalRuns: 0,
  bestFloor: 1,
  bossesSlain: 0,
  totalWoodHarvested: 0,
  bestScore: 0,
};

export function loadActiveRun(): ActiveRunSave | null {
  try {
    const raw = localStorage.getItem(RUN_SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveRunSave;
    if (!parsed?.player?.classId || !parsed.player.equippedWeapons) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveActiveRun(player: PlayerState, floor: number): void {
  try {
    const save: ActiveRunSave = {
      savedAt: Date.now(),
      floor,
      player: {
        classId: player.classId,
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
    return { ...DEFAULT_META, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_META };
  }
}

export function updateMetaProgress(patch: Partial<MetaProgress>): MetaProgress {
  const current = loadMetaProgress();
  const next: MetaProgress = {
    totalRuns: patch.totalRuns ?? current.totalRuns,
    bestFloor: Math.max(current.bestFloor, patch.bestFloor ?? 1),
    bossesSlain: patch.bossesSlain ?? current.bossesSlain,
    totalWoodHarvested: patch.totalWoodHarvested ?? current.totalWoodHarvested,
    bestScore: Math.max(current.bestScore, patch.bestScore ?? 0),
  };
  try {
    localStorage.setItem(META_SAVE_KEY, JSON.stringify(next));
  } catch {
    // Ignore
  }
  return next;
}
