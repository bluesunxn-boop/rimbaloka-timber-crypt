import { useState } from 'react';
import { Check, Flame, Lock, Sparkles, Sword, Users, X } from 'lucide-react';
import { sfx } from '../game/audio';
import {
  CHARACTERS,
  CHARACTER_RARITY_META,
  HERO_CLASSES,
  isCharacterSynergyActive,
  WEAPONS,
} from '../game/data';
import { SpriteAtlas } from '../game/sprites';
import { setSelectedCharacter } from '../game/storage';
import { CharacterDef, CharacterRarity, HeroClassId, MetaProgress } from '../game/types';
import { PixelSpritePreview } from './PixelSpritePreview';

interface CollectionModalProps {
  meta: MetaProgress;
  selectedClass: HeroClassId;
  onMetaChange: (next: MetaProgress) => void;
  onOpenGacha: () => void;
  onClose: () => void;
}

type CollectionFilter = 'all' | 'unlocked' | CharacterRarity;

export function CollectionModal({
  meta,
  selectedClass,
  onMetaChange,
  onOpenGacha,
  onClose,
}: CollectionModalProps) {
  const [filter, setFilter] = useState<CollectionFilter>('all');

  const handleSelectCharacter = (ch: CharacterDef) => {
    if (!meta.unlockedCharacters.includes(ch.id)) return;
    sfx.unlock();
    const next = setSelectedCharacter(ch.id);
    onMetaChange(next);
    if (isCharacterSynergyActive(ch.id, selectedClass)) {
      sfx.synergyEpic();
    } else {
      sfx.gachaReveal(ch.rarity, ch.gachaSfxStyle, ch.gachaVoicePitch);
    }
  };

  const filtered = CHARACTERS.filter((ch) => {
    if (filter === 'unlocked') return meta.unlockedCharacters.includes(ch.id);
    if (filter !== 'all') return ch.rarity === filter;
    return true;
  });

  const activeChar =
    CHARACTERS.find((c) => c.id === meta.selectedCharacterId) ?? CHARACTERS[0];
  const activeSynergy = isCharacterSynergyActive(activeChar.id, selectedClass);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/82 p-3 backdrop-blur-sm sm:p-5">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded border border-[#2B4435] bg-[#0E1612] text-[#E6ECE7] shadow-2xl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#22352A] bg-[#0B110E] px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded border border-emerald-500/45 bg-emerald-950/50 text-emerald-300">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-pixel text-base text-amber-300 sm:text-lg">
                KOLEKSI PAHLAWAN (20 SLOT)
              </h2>
              <p className="text-xs text-slate-400">
                Terbuka{' '}
                <strong className="font-mono-num text-emerald-300">
                  {meta.unlockedCharacters.length}/20
                </strong>{' '}
                · Ikon api menyala menandakan Synergy aktif dengan class{' '}
                <strong className="text-amber-300">{HERO_CLASSES[selectedClass].name}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenGacha}
              className="inline-flex items-center gap-1.5 rounded border border-sky-400/60 bg-sky-950/50 px-3 py-1.5 text-xs font-bold text-sky-200 hover:bg-sky-900/60 whitespace-nowrap cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Gacha Shrine ({meta.gems} Gem)
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded border border-[#2C4235] text-slate-300 hover:text-white cursor-pointer"
              aria-label="Tutup Koleksi"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Active Hero Synergy Summary + Filter Bar */}
        <div className="flex flex-col justify-between gap-3 border-b border-[#1E3126] bg-[#0A100D] px-5 py-2.5 md:flex-row md:items-center">
          <div className="flex items-center gap-2.5 text-xs">
            <span className="text-slate-400">Aktif:</span>
            <strong className="font-pixel text-white">{activeChar.name}</strong>
            <span className="text-slate-500">·</span>
            {activeSynergy ? (
              <span className="flex items-center gap-1 font-bold text-amber-300">
                <Flame className="h-3.5 w-3.5 text-orange-400" />
                SYNERGY AKTIF: {activeChar.synergyName}
              </span>
            ) : (
              <span className="text-slate-400">
                Synergy butuh{' '}
                <strong className="text-slate-200">
                  {activeChar.synergyClass === 'any'
                    ? 'Semua Class'
                    : HERO_CLASSES[activeChar.synergyClass].name}
                </strong>
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1 rounded bg-[#070B09] p-1">
            {(
              [
                { id: 'all', label: 'Semua (20)' },
                { id: 'unlocked', label: `Dimiliki (${meta.unlockedCharacters.length})` },
                { id: 'common', label: 'Common' },
                { id: 'gold', label: 'Gold' },
                { id: 'mythic', label: 'Mythic' },
                { id: 's1', label: 'S1' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setFilter(t.id)}
                className={`rounded px-2.5 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  filter === t.id
                    ? 'bg-emerald-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* 20-Slot Grid */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {filtered.map((ch) => {
              const slotNum = CHARACTERS.findIndex((c) => c.id === ch.id) + 1;
              const unlocked = meta.unlockedCharacters.includes(ch.id);
              const isSelected = meta.selectedCharacterId === ch.id;
              const synergyActive = isCharacterSynergyActive(ch.id, selectedClass);
              const rm = CHARACTER_RARITY_META[ch.rarity];
              const sigWep = WEAPONS[ch.signatureWeaponId];
              const synergyClassLabel =
                ch.synergyClass === 'any'
                  ? 'Semua Class'
                  : HERO_CLASSES[ch.synergyClass].name;

              return (
                <div
                  key={ch.id}
                  onClick={() => unlocked && handleSelectCharacter(ch)}
                  role={unlocked ? 'button' : undefined}
                  tabIndex={unlocked ? 0 : undefined}
                  onKeyDown={(e) => {
                    if (unlocked && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      handleSelectCharacter(ch);
                    }
                  }}
                  className={`flex flex-col justify-between rounded border p-3.5 transition-all ${
                    isSelected
                      ? 'border-amber-400 bg-[#18251C] shadow-[0_0_18px_rgba(250,204,21,0.2)] cursor-pointer'
                      : unlocked
                      ? `${rm.border} ${rm.bg} ${rm.glow ?? ''} hover:brightness-110 cursor-pointer`
                      : 'border-[#1E2B23] bg-[#090F0C] opacity-70'
                  }`}
                >
                  <div>
                    {/* Top Meta Row + Synergy Flame Indicator */}
                    <div className="flex items-center justify-between gap-2 text-[10px] font-mono-num">
                      <span className="font-bold" style={{ color: rm.color }}>
                        #{String(slotNum).padStart(2, '0')} · {rm.label}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-0.5 font-bold ${
                            synergyActive ? 'text-amber-300' : 'text-slate-500'
                          }`}
                          title={
                            synergyActive
                              ? `Synergy Aktif dengan ${HERO_CLASSES[selectedClass].name}`
                              : `Synergy aktif saat memakai ${synergyClassLabel}`
                          }
                        >
                          <Flame
                            className={`h-3.5 w-3.5 ${
                              synergyActive
                                ? 'fill-orange-400 text-amber-300'
                                : 'text-slate-600'
                            }`}
                          />
                          {synergyActive ? 'AKTIF' : synergyClassLabel}
                        </span>
                      </div>
                    </div>

                    {/* Sprite + Name */}
                    <div className="mt-2.5 flex items-center gap-3">
                      <div
                        className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded border bg-[#070B09] ${
                          ch.rarity === 's1' && unlocked
                            ? 'border-red-500/80'
                            : 'border-[#293D31]'
                        }`}
                      >
                        <div className={!unlocked ? 'opacity-25 grayscale' : ''}>
                          <PixelSpritePreview
                            spriteKey={ch.spriteKey as Exclude<keyof SpriteAtlas, 'biomes'>}
                            size={44}
                          />
                        </div>
                        {!unlocked && (
                          <Lock className="absolute h-4 w-4 text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-pixel truncate text-xs text-white">{ch.name}</h3>
                        <p className="truncate text-[11px] text-slate-400">{ch.title}</p>
                        {sigWep && (
                          <p className="mt-1 flex items-center gap-1 truncate text-[10px] text-sky-300">
                            <Sword className="h-3 w-3 shrink-0" />
                            <span className="truncate">{sigWep.name}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Passive & Synergy details */}
                    <div className="mt-2.5 space-y-1.5 border-t border-white/10 pt-2 text-[11px] leading-snug">
                      <p className="text-slate-200">
                        <strong className="text-emerald-300">Pasif:</strong> {ch.passiveDesc}
                      </p>
                      <p className={synergyActive ? 'text-amber-200' : 'text-slate-400'}>
                        <strong className={synergyActive ? 'text-amber-300' : 'text-slate-300'}>
                          Synergy ({synergyClassLabel}):
                        </strong>{' '}
                        {ch.synergyName} — {ch.synergyDesc}
                      </p>
                    </div>
                  </div>

                  {/* Action Footer */}
                  <div className="mt-3">
                    {isSelected ? (
                      <div className="inline-flex w-full items-center justify-center gap-1.5 rounded bg-amber-400 px-3 py-1.5 text-[11px] font-bold text-slate-950 whitespace-nowrap">
                        <Check className="h-3.5 w-3.5" />
                        Dipilih
                      </div>
                    ) : unlocked ? (
                      <div className="inline-flex w-full items-center justify-center gap-1.5 rounded border border-[#34503F] bg-[#121E17] px-3 py-1.5 text-[11px] font-semibold text-slate-200 whitespace-nowrap">
                        Pilih Pahlawan
                      </div>
                    ) : (
                      <div className="inline-flex w-full items-center justify-center gap-1.5 rounded border border-[#222D26] bg-[#0B110E] px-3 py-1.5 text-[11px] text-slate-500 whitespace-nowrap">
                        <Lock className="h-3 w-3" />
                        {ch.id === 'draksa' ? 'Fusion Rimba + Loka' : 'Gacha Shrine'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
