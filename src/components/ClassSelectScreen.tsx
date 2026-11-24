import {
  Flame,
  Play,
  RotateCcw,
  Settings,
  Shield,
  Sparkles,
  Sword,
  Trees,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import { sfx } from '../game/audio';
import {
  BLUEPRINTS,
  CHARACTER_MAP,
  CHARACTER_RARITY_META,
  HERO_CLASSES,
  isCharacterSynergyActive,
  WEAPONS,
} from '../game/data';
import { SpriteAtlas } from '../game/sprites';
import { ActiveRunSave, HeroClassId, MetaProgress } from '../game/types';
import { PixelSpritePreview } from './PixelSpritePreview';

interface ClassSelectScreenProps {
  selectedClass: HeroClassId;
  onSelectClass: (id: HeroClassId) => void;
  onStartNewRun: (id: HeroClassId) => void;
  savedRun: ActiveRunSave | null;
  onResumeRun: () => void;
  onOpenBlacksmith: () => void;
  onOpenGacha: () => void;
  onOpenCollection: () => void;
  onOpenSettings: () => void;
  meta: MetaProgress;
}

const CLASS_ORDER: HeroClassId[] = ['knight', 'archer', 'mage'];

export function ClassSelectScreen({
  selectedClass,
  onSelectClass,
  onStartNewRun,
  savedRun,
  onResumeRun,
  onOpenBlacksmith,
  onOpenGacha,
  onOpenCollection,
  onOpenSettings,
  meta,
}: ClassSelectScreenProps) {
  const activeDef = HERO_CLASSES[selectedClass];
  const activeHero = CHARACTER_MAP[meta.selectedCharacterId] ?? CHARACTER_MAP.bram;
  const heroRarity = CHARACTER_RARITY_META[activeHero.rarity];
  const sigWeapon = WEAPONS[activeHero.signatureWeaponId];
  const synergyActive = isCharacterSynergyActive(activeHero.id, selectedClass);
  const maxPotions = activeHero.id === 'ujang' ? 3 : 2;
  const synergyTargetName =
    activeHero.synergyClass === 'any'
      ? 'Semua Class'
      : HERO_CLASSES[activeHero.synergyClass].name;

  const equippedForged =
    meta.equippedBlacksmithWeaponId && WEAPONS[meta.equippedBlacksmithWeaponId]
      ? WEAPONS[meta.equippedBlacksmithWeaponId]
      : null;

  const handlePickClass = (id: HeroClassId) => {
    onSelectClass(id);
    if (isCharacterSynergyActive(activeHero.id, id)) {
      sfx.unlock();
      sfx.synergyEpic();
    }
  };

  const savedChar = savedRun
    ? CHARACTER_MAP[savedRun.player.characterId ?? 'bram'] ?? CHARACTER_MAP.bram
    : null;

  return (
    <div className="relative flex h-full w-full flex-col overflow-y-auto bg-[#090F0C] text-[#E6ECE7]">
      {/* Subtle dark canopy radial backdrop */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 15%, rgba(22, 78, 50, 0.25) 0%, rgba(9, 15, 12, 0.94) 65%)',
        }}
      />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-between gap-4 px-4 py-5 sm:px-8 sm:py-6">
        {/* Header */}
        <header className="flex flex-col gap-3 border-b border-[#22352A] pb-3.5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium tracking-wide text-emerald-400">
              Dark Forest Pixel Roguelite · Update V1.0 (20 Hero & Synergy)
            </p>
            <h1 className="font-pixel mt-1 text-2xl tracking-tight text-amber-300 sm:text-4xl">
              RIMBALOKA: TIMBER CRYPT
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 font-mono-num">
            <span className="flex items-center gap-1.5">
              <Trophy className="h-3.5 w-3.5 text-amber-400" />
              Lantai Tertinggi: {meta.bestFloor}
            </span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span>Boss Tumbang: {meta.bossesSlain}</span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span className="flex items-center gap-1.5">
              <Trees className="h-3.5 w-3.5 text-emerald-400" />
              Total Kayu: {meta.totalWoodHarvested}
            </span>
          </div>
        </header>

        {/* Lobby Stash & Hub Actions (Gacha, Collection, Blacksmith) */}
        <section className="flex flex-col justify-between gap-3 rounded border border-[#2C3B2B] bg-[#111713] px-4 py-3 lg:flex-row lg:items-center">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-mono-num">
            <div className="flex items-center gap-1.5">
              <PixelSpritePreview spriteKey="gem" size={16} />
              <span className="text-slate-400">Gem:</span>
              <strong className="text-sky-300">{meta.gems}</strong>
            </div>
            <div className="flex items-center gap-1.5">
              <PixelSpritePreview spriteKey="gold_coin" size={16} />
              <span className="text-slate-400">Gold:</span>
              <strong className="text-amber-300">{meta.gold}</strong>
            </div>
            <div className="flex items-center gap-1.5">
              <PixelSpritePreview spriteKey="timber_shard" size={16} />
              <span className="text-slate-400">Shard:</span>
              <strong className="text-sky-300">{meta.timberShards}</strong>
            </div>
            <div className="flex items-center gap-1.5">
              <PixelSpritePreview spriteKey="boss_soul" size={16} />
              <span className="text-slate-400">Soul:</span>
              <strong className="text-purple-300">{meta.bossSouls}</strong>
            </div>
            <div className="flex items-center gap-1.5">
              <PixelSpritePreview spriteKey="blueprint" size={16} />
              <span className="text-slate-400">BP:</span>
              <strong className="text-emerald-300">
                {meta.blueprints.length}/{BLUEPRINTS.length}
              </strong>
            </div>
            {equippedForged && (
              <span className="text-xs font-semibold" style={{ color: equippedForged.color }}>
                · Slot 2: {equippedForged.name}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onOpenGacha}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded border border-sky-400/60 bg-sky-950/50 px-3.5 py-2 text-xs font-bold text-sky-200 transition-colors hover:bg-sky-900/60 whitespace-nowrap cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 text-sky-300" />
              Gacha Shrine
            </button>

            <button
              type="button"
              onClick={onOpenCollection}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded border border-emerald-500/60 bg-emerald-950/50 px-3.5 py-2 text-xs font-bold text-emerald-200 transition-colors hover:bg-emerald-900/60 whitespace-nowrap cursor-pointer"
            >
              <Users className="h-3.5 w-3.5 text-emerald-300" />
              Koleksi ({meta.unlockedCharacters.length}/20)
            </button>

            <button
              type="button"
              onClick={onOpenBlacksmith}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded border border-amber-500/60 bg-amber-950/50 px-3.5 py-2 text-xs font-bold text-amber-200 transition-colors hover:bg-amber-900/60 whitespace-nowrap cursor-pointer"
            >
              <Flame className="h-3.5 w-3.5 text-orange-400" />
              Blacksmith
            </button>

            <button
              type="button"
              onClick={onOpenSettings}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded border border-[#324B3C] bg-[#142019] px-3.5 py-2 text-xs font-bold text-slate-200 transition-colors hover:border-amber-400/60 hover:text-amber-200 whitespace-nowrap cursor-pointer"
            >
              <Settings className="h-3.5 w-3.5 text-slate-300" />
              Setting
            </button>
          </div>
        </section>

        {/* Resume Saved Run Banner if exists */}
        {savedRun && savedChar && (
          <div className="flex flex-col justify-between gap-4 rounded border border-emerald-500/40 bg-[#122219] p-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded border border-emerald-500/30 bg-[#0B140F]">
                <PixelSpritePreview
                  spriteKey={savedChar.spriteKey as Exclude<keyof SpriteAtlas, 'biomes'>}
                  size={40}
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-300">
                  Progress Tersimpan Ditemukan
                </p>
                <p className="mt-0.5 text-xs text-slate-300 font-mono-num">
                  {savedChar.name} ({HERO_CLASSES[savedRun.player.classId].name}) · Level{' '}
                  {savedRun.player.level} · Lantai {savedRun.floor} · HP{' '}
                  {Math.ceil(savedRun.player.hp)}/{savedRun.player.maxHp}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onResumeRun}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400 whitespace-nowrap cursor-pointer"
            >
              <Play className="h-4 w-4 fill-current" />
              Lanjutkan Run
            </button>
          </div>
        )}

        {/* Active Selected Hero Card + Synergy Banner */}
        <section
          className={`flex flex-col justify-between gap-4 rounded border p-4 md:flex-row md:items-center ${
            heroRarity.border
          } ${heroRarity.bg} ${heroRarity.glow ?? ''} ${
            activeHero.rarity === 's1' ? 'animate-s1-blazing' : ''
          }`}
        >
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded border border-white/15 bg-[#080D0A]">
              <PixelSpritePreview
                spriteKey={activeHero.spriteKey as Exclude<keyof SpriteAtlas, 'biomes'>}
                size={54}
              />
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="text-[11px] font-mono-num font-bold"
                  style={{ color: heroRarity.color }}
                >
                  [{heroRarity.label}]
                </span>
                <h2 className="font-pixel text-base text-white sm:text-lg">
                  {activeHero.name}
                </h2>
                <span className="text-xs text-slate-300">— {activeHero.title}</span>
              </div>

              <p className="text-xs text-slate-200">
                <strong className="text-emerald-300">Pasif ({activeHero.passiveName}):</strong>{' '}
                {activeHero.passiveDesc}
              </p>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                {sigWeapon && (
                  <span className="text-sky-300">
                    <strong>Signature:</strong> {sigWeapon.name} ({sigWeapon.damage} DMG)
                  </span>
                )}
                {synergyActive ? (
                  <span
                    key={`${activeHero.id}-${selectedClass}`}
                    className="animate-synergy-flash inline-flex items-center gap-1.5 font-bold text-amber-300"
                    style={{ textShadow: '0 0 12px rgba(250, 204, 21, 0.45)' }}
                  >
                    <Flame className="h-4 w-4 fill-orange-400 text-amber-300" />
                    SYNERGY AKTIF: {activeHero.synergyName} — {activeHero.synergyDesc}
                  </span>
                ) : (
                  <span className="text-slate-400">
                    Synergy ({synergyTargetName}): {activeHero.synergyName}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenCollection}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded border border-white/20 bg-black/35 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-black/55 whitespace-nowrap cursor-pointer"
          >
            <Users className="h-3.5 w-3.5 text-emerald-300" />
            Ganti Pahlawan
          </button>
        </section>

        {/* Class Cards Grid */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {CLASS_ORDER.map((id) => {
            const cls = HERO_CLASSES[id];
            const isSelected = selectedClass === id;
            const startWep = WEAPONS[cls.startingWeaponId];
            const classMatchesSynergy = isCharacterSynergyActive(activeHero.id, id);

            return (
              <button
                key={id}
                type="button"
                onClick={() => handlePickClass(id)}
                className={`group flex flex-col justify-between rounded border p-5 text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'border-amber-400/80 bg-[#17261E] shadow-lg shadow-black/40'
                    : 'border-[#24382C] bg-[#101A14] hover:border-[#395745] hover:bg-[#142119]'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-medium text-slate-400">{cls.title}</p>
                        {classMatchesSynergy && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-300">
                            <Flame className="h-3 w-3 fill-orange-400 text-amber-300" />
                            SYNERGY
                          </span>
                        )}
                      </div>
                      <h2 className="font-pixel mt-1 text-xl text-white">{cls.name}</h2>
                    </div>
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded border border-[#2B4134] bg-[#0B120E]">
                      <PixelSpritePreview spriteKey={id} size={52} />
                    </div>
                  </div>

                  <p className="mt-3 text-xs leading-relaxed text-slate-300">
                    {cls.description}
                  </p>

                  {/* Stat Bars */}
                  <div className="mt-4 space-y-2 border-t border-[#22352A] pt-3 text-xs font-mono-num">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">HP / Armor</span>
                      <span className="text-emerald-300">
                        {cls.maxHp} HP · {cls.defense} DEF
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Mana / Regen</span>
                      <span className="text-sky-300">
                        {cls.maxMana} MP · +{cls.manaRegen}/d
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Kecepatan / Crit</span>
                      <span className="text-amber-300">
                        {cls.speed} SPD · {Math.round(cls.critChance * 100)}% CRIT
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 border-t border-[#22352A] pt-3 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <Sword className="h-3.5 w-3.5" />
                      Senjata Signature
                    </span>
                    <span className="font-medium text-white">
                      {sigWeapon ? sigWeapon.name : startWep.name}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <Zap className="h-3.5 w-3.5" />
                      Skill Aktif
                    </span>
                    <span className="font-medium" style={{ color: cls.accentColor }}>
                      {cls.activeSkillName}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </section>

        {/* Selected Class Detail & Start CTA */}
        <footer className="flex flex-col justify-between gap-4 rounded border border-[#24382C] bg-[#101A14] p-5 sm:flex-row sm:items-center">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
              <span className="font-semibold text-amber-300">
                {activeHero.name} ({activeDef.name})
              </span>
              <span aria-hidden="true">·</span>
              <span>Skill: {activeDef.activeSkillDesc}</span>
            </div>
            <p className="text-xs text-slate-400">
              Aturan Rimba: Potion max {maxPotions} · Gugur = Gold hilang 50% · Lantai 10, 20, 30... hadiah +100 Gem!
            </p>
          </div>

          <button
            type="button"
            onClick={() => onStartNewRun(selectedClass)}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded bg-amber-500 px-6 py-3 text-sm font-bold text-slate-950 transition-colors hover:bg-amber-400 whitespace-nowrap cursor-pointer"
          >
            {savedRun ? (
              <RotateCcw className="h-4 w-4" />
            ) : (
              <Shield className="h-4 w-4" />
            )}
            {savedRun
              ? `Mulai Baru (${activeHero.name})`
              : `Masuk Dungeon (${activeHero.name})`}
          </button>
        </footer>
      </div>
    </div>
  );
}
