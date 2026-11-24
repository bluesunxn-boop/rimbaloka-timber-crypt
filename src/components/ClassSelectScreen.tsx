import { Play, RotateCcw, Shield, Sword, Trees, Trophy, Zap } from 'lucide-react';
import { HERO_CLASSES, WEAPONS } from '../game/data';
import { ActiveRunSave, HeroClassId, MetaProgress } from '../game/types';
import { PixelSpritePreview } from './PixelSpritePreview';

interface ClassSelectScreenProps {
  selectedClass: HeroClassId;
  onSelectClass: (id: HeroClassId) => void;
  onStartNewRun: (id: HeroClassId) => void;
  savedRun: ActiveRunSave | null;
  onResumeRun: () => void;
  meta: MetaProgress;
}

const CLASS_ORDER: HeroClassId[] = ['knight', 'archer', 'mage'];

export function ClassSelectScreen({
  selectedClass,
  onSelectClass,
  onStartNewRun,
  savedRun,
  onResumeRun,
  meta,
}: ClassSelectScreenProps) {
  const activeDef = HERO_CLASSES[selectedClass];

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

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-between gap-6 px-4 py-6 sm:px-8 sm:py-8">
        {/* Header */}
        <header className="flex flex-col gap-3 border-b border-[#22352A] pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium tracking-wide text-emerald-400">
              Dark Forest Pixel Roguelite
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

        {/* Resume Saved Run Banner if exists */}
        {savedRun && (
          <div className="flex flex-col justify-between gap-4 rounded border border-emerald-500/40 bg-[#122219] p-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded border border-emerald-500/30 bg-[#0B140F]">
                <PixelSpritePreview spriteKey={savedRun.player.classId} size={40} />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-300">
                  Progress Tersimpan Ditemukan
                </p>
                <p className="mt-0.5 text-xs text-slate-300 font-mono-num">
                  {HERO_CLASSES[savedRun.player.classId].name} · Level {savedRun.player.level} ·
                  Lantai {savedRun.floor} · HP {Math.ceil(savedRun.player.hp)}/
                  {savedRun.player.maxHp} · Kayu {savedRun.player.materials.wood}
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

        {/* Class Cards Grid */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {CLASS_ORDER.map((id) => {
            const cls = HERO_CLASSES[id];
            const isSelected = selectedClass === id;
            const startWep = WEAPONS[cls.startingWeaponId];

            return (
              <button
                key={id}
                type="button"
                onClick={() => onSelectClass(id)}
                className={`group flex flex-col justify-between rounded border p-5 text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'border-amber-400/80 bg-[#17261E] shadow-lg shadow-black/40'
                    : 'border-[#24382C] bg-[#101A14] hover:border-[#395745] hover:bg-[#142119]'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium text-slate-400">{cls.title}</p>
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
                      Senjata Awal
                    </span>
                    <span className="font-medium text-white">{startWep.name}</span>
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
              <span className="font-semibold text-amber-300">{activeDef.name}</span>
              <span aria-hidden="true">·</span>
              <span>Skill: {activeDef.activeSkillDesc}</span>
            </div>
            <p className="text-xs text-slate-400">
              Kontrol: WASD / Joystick untuk gerak · Spasi / Tombol Serang untuk tebang pohon & serang · Shift untuk Skill · I Tas/Craft · K Skill Tree
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
            {savedRun ? `Mulai Baru (${activeDef.name})` : `Masuk Dungeon (${activeDef.name})`}
          </button>
        </footer>
      </div>
    </div>
  );
}
