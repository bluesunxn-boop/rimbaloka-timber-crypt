import { useEffect, useRef, useState } from 'react';
import { Check, Flame, Gem, Sparkles, Volume2, X, Zap } from 'lucide-react';
import { sfx } from '../game/audio';
import {
  CHARACTERS,
  CHARACTER_RARITY_META,
  HERO_CLASSES,
  isCharacterSynergyActive,
  WEAPONS,
} from '../game/data';
import { SpriteAtlas } from '../game/sprites';
import { fuseDraksa, GachaPullEntry, rollGacha } from '../game/storage';
import { CharacterRarity, HeroClassId, MetaProgress } from '../game/types';
import { PixelSpritePreview } from './PixelSpritePreview';

interface GachaShrineModalProps {
  meta: MetaProgress;
  selectedClass: HeroClassId;
  onMetaChange: (next: MetaProgress) => void;
  onClose: () => void;
}

const RARITY_RANK: Record<CharacterRarity, number> = {
  common: 1,
  gold: 2,
  mythic: 3,
  s1: 4,
};

export function GachaShrineModal({
  meta,
  selectedClass,
  onMetaChange,
  onClose,
}: GachaShrineModalProps) {
  const [rolling, setRolling] = useState(false);
  const [results, setResults] = useState<GachaPullEntry[]>([]);
  const [revealKey, setRevealKey] = useState(0);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const rollTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (rollTimerRef.current) window.clearTimeout(rollTimerRef.current);
    };
  }, []);

  const hasRimba = meta.unlockedCharacters.includes('rimba');
  const hasLoka = meta.unlockedCharacters.includes('loka');
  const hasDraksa = meta.unlockedCharacters.includes('draksa');
  const canFuseDraksa = hasRimba && hasLoka && !hasDraksa;

  const hasS1Pull = results.some((r) => r.character.rarity === 's1');

  const handleRoll = (count: 1 | 5) => {
    if (rolling) return;
    sfx.unlock();
    const cost = count === 5 ? 450 : 100;
    if (meta.gems < cost) {
      sfx.playerHurt();
      setFeedback({
        ok: false,
        text: `Gem tidak cukup! Butuh ${cost} Gem (Lantai 10, 20, 30... memberi +100 Gem).`,
      });
      return;
    }

    sfx.gachaRoll();
    setRolling(true);
    setFeedback(null);

    if (rollTimerRef.current) window.clearTimeout(rollTimerRef.current);
    rollTimerRef.current = window.setTimeout(() => {
      const outcome = rollGacha(count);
      setRolling(false);
      onMetaChange(outcome.meta);
      setFeedback({ ok: outcome.ok, text: outcome.message });

      if (outcome.ok && outcome.results.length > 0) {
        setResults(outcome.results);
        setRevealKey((k) => k + 1);
        const top = [...outcome.results].sort(
          (a, b) => RARITY_RANK[b.character.rarity] - RARITY_RANK[a.character.rarity]
        )[0];
        sfx.gachaReveal(
          top.character.rarity,
          top.character.gachaSfxStyle,
          top.character.gachaVoicePitch
        );
      } else {
        sfx.playerHurt();
      }
    }, 360);
  };

  const handleFuseDraksa = () => {
    sfx.unlock();
    const res = fuseDraksa();
    onMetaChange(res.meta);
    setFeedback({ ok: res.ok, text: res.message });
    if (res.ok) {
      const draksa = CHARACTERS.find((c) => c.id === 'draksa');
      if (draksa) {
        setResults([
          {
            character: draksa,
            isNew: true,
            dupeGemRefund: 0,
            dupeGoldRefund: 0,
          },
        ]);
        setRevealKey((k) => k + 1);
        sfx.gachaReveal('s1', draksa.gachaSfxStyle, draksa.gachaVoicePitch);
        sfx.synergyEpic();
      }
    } else {
      sfx.playerHurt();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/82 p-3 backdrop-blur-sm sm:p-5">
      <div
        key={hasS1Pull ? `s1-${revealKey}` : 'shrine'}
        className={`relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded border bg-[#0E1512] text-[#E6ECE7] shadow-2xl ${
          hasS1Pull
            ? 'animate-forge-shake animate-s1-blazing border-red-500'
            : 'border-[#2D4537]'
        }`}
      >
        {/* S1 Blazing Red Atmospheric Overlay */}
        {hasS1Pull && (
          <div
            className="pointer-events-none absolute inset-0 z-0"
            style={{
              background:
                'radial-gradient(circle at 50% 22%, rgba(255, 59, 48, 0.24) 0%, rgba(127, 29, 29, 0.08) 45%, rgba(0, 0, 0, 0) 75%)',
            }}
          />
        )}

        {/* Header */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-[#22352A] bg-[#0B110E] px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded border border-sky-400/50 bg-sky-950/50 text-sky-300">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-pixel text-base text-amber-300 sm:text-lg">
                GACHA SHRINE V1.0
              </h2>
              <p className="text-xs text-slate-400">
                Panggil 20 Pahlawan Rimbaloka! Gem didapat setiap menaklukkan Lantai 10, 20, 30...
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded border border-sky-500/40 bg-sky-950/40 px-3 py-1.5 text-xs font-mono-num">
              <PixelSpritePreview spriteKey="gem" size={16} />
              <span className="text-slate-300">Gem:</span>
              <strong className="text-sky-300">{meta.gems}</strong>
            </div>
            <div className="flex items-center gap-2 rounded border border-amber-500/35 bg-amber-950/30 px-3 py-1.5 text-xs font-mono-num">
              <PixelSpritePreview spriteKey="gold_coin" size={16} />
              <strong className="text-amber-300">{meta.gold}</strong>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded border border-[#2C4235] text-slate-300 hover:text-white cursor-pointer"
              aria-label="Tutup Gacha Shrine"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Rate Banner + Summon Actions */}
        <div className="relative z-10 flex flex-col justify-between gap-3 border-b border-[#1E3126] bg-[#0A100D] px-5 py-3 lg:flex-row lg:items-center">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-mono-num">
            {(
              [
                { rarity: 'common', count: 7 },
                { rarity: 'gold', count: 6 },
                { rarity: 'mythic', count: 4 },
                { rarity: 's1', count: 3 },
              ] as const
            ).map((row) => {
              const rm = CHARACTER_RARITY_META[row.rarity];
              return (
                <span key={row.rarity} className="flex items-center gap-1.5">
                  <strong style={{ color: rm.color }}>{rm.label}</strong>
                  <span className="text-slate-400">
                    {rm.rateLabel} ({row.count})
                  </span>
                </span>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={rolling || meta.gems < 100}
              onClick={() => handleRoll(1)}
              className={`inline-flex items-center gap-2 rounded px-4 py-2 text-xs font-bold transition-colors whitespace-nowrap ${
                rolling || meta.gems < 100
                  ? 'border border-[#25362C] bg-[#131D17] text-slate-500 cursor-not-allowed'
                  : 'bg-sky-400 text-slate-950 hover:bg-sky-300 cursor-pointer'
              }`}
            >
              <Gem className="h-3.5 w-3.5" />
              {rolling ? 'Memanggil...' : '1x Summon (100 Gem)'}
            </button>

            <button
              type="button"
              disabled={rolling || meta.gems < 450}
              onClick={() => handleRoll(5)}
              className={`inline-flex items-center gap-2 rounded px-4 py-2 text-xs font-bold transition-colors whitespace-nowrap ${
                rolling || meta.gems < 450
                  ? 'border border-[#25362C] bg-[#131D17] text-slate-500 cursor-not-allowed'
                  : 'bg-amber-400 text-slate-950 hover:bg-amber-300 cursor-pointer'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {rolling ? 'Memanggil...' : '5x Summon (450 Gem · Hemat 10%)'}
            </button>
          </div>
        </div>

        {feedback && (
          <div
            className={`relative z-10 border-b border-[#22352A] px-5 py-2 text-xs font-semibold ${
              feedback.ok
                ? hasS1Pull
                  ? 'bg-red-950/75 text-red-200'
                  : 'bg-emerald-950/60 text-emerald-300'
                : 'bg-rose-950/60 text-rose-300'
            }`}
          >
            {feedback.text}
          </div>
        )}

        {/* Scrollable Content: Reveal Stage + Secret Fusion + Full 20 Roster */}
        <div className="relative z-10 flex-1 space-y-5 overflow-y-auto p-5">
          {/* Reveal Stage */}
          {results.length > 0 && (
            <section key={revealKey} className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="font-pixel text-xs text-amber-300">
                  {hasS1Pull
                    ? 'DEWA S1 LIMITED BANGKIT!'
                    : 'HASIL PANGGILAN SHRINE'}
                </h3>
                <span className="text-[11px] text-slate-400">
                  Klik kartu untuk mendengar suara khas pahlawan
                </span>
              </div>

              <div
                className={`grid gap-3 ${
                  results.length === 1
                    ? 'grid-cols-1 sm:max-w-md'
                    : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-5'
                }`}
              >
                {results.map((entry, idx) => {
                  const ch = entry.character;
                  const rm = CHARACTER_RARITY_META[ch.rarity];
                  const isS1 = ch.rarity === 's1';
                  const synergyMatch = isCharacterSynergyActive(ch.id, selectedClass);
                  return (
                    <button
                      key={`${revealKey}-${idx}`}
                      type="button"
                      onClick={() => {
                        sfx.unlock();
                        sfx.gachaReveal(ch.rarity, ch.gachaSfxStyle, ch.gachaVoicePitch);
                      }}
                      style={{ animationDelay: `${idx * 70}ms` }}
                      className={`animate-gacha-pop flex flex-col justify-between rounded border p-3.5 text-left transition-transform hover:-translate-y-0.5 cursor-pointer ${
                        rm.border
                      } ${rm.bg} ${rm.glow ?? ''} ${isS1 ? 'animate-s1-blazing' : ''}`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 text-[10px] font-mono-num">
                          <span className="font-bold" style={{ color: rm.color }}>
                            [{rm.label}]
                          </span>
                          {entry.isNew ? (
                            <span className="font-bold text-emerald-300">BARU!</span>
                          ) : (
                            <span className="text-sky-300">
                              +{entry.dupeGemRefund} Gem · +{entry.dupeGoldRefund}G
                            </span>
                          )}
                        </div>

                        <div className="mt-2.5 flex items-center gap-3">
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded border border-white/10 bg-[#080D0A]">
                            <PixelSpritePreview
                              spriteKey={
                                ch.spriteKey as Exclude<keyof SpriteAtlas, 'biomes'>
                              }
                              size={46}
                            />
                          </div>
                          <div className="min-w-0">
                            <p
                              className="font-pixel truncate text-sm font-bold"
                              style={{ color: isS1 ? '#FF6B63' : '#FFFFFF' }}
                            >
                              {ch.name}
                            </p>
                            <p className="truncate text-[11px] text-slate-300">{ch.title}</p>
                            <div className="mt-1 flex items-center gap-1.5 text-[10px]">
                              <Volume2 className="h-3 w-3 text-slate-400" />
                              {synergyMatch && (
                                <span className="flex items-center gap-0.5 font-bold text-amber-300">
                                  <Flame className="h-3 w-3 text-orange-400" />
                                  Synergy
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <p className="mt-2.5 text-[11px] leading-snug text-slate-200">
                          <strong className="text-amber-300">Pasif:</strong> {ch.passiveDesc}
                        </p>
                        <p className="mt-1 text-[11px] leading-snug text-slate-300">
                          <strong className="text-sky-300">Signature:</strong>{' '}
                          {WEAPONS[ch.signatureWeaponId]?.name}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Secret Fusion Banner: [S1] DRAKSA */}
          <section className="flex flex-col justify-between gap-4 rounded border border-red-500/60 bg-gradient-to-r from-red-950/55 via-[#180E10] to-amber-950/35 p-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3.5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded border border-red-500/70 bg-[#0A0809]">
                <PixelSpritePreview spriteKey="char_draksa" size={46} />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-mono-num font-bold text-red-400">
                    [SECRET FUSION S1]
                  </span>
                  <span className="font-pixel text-sm text-white">[S1] DRAKSA</span>
                  <span className="text-slate-300">· Anak Durian & Kayu</span>
                </div>
                <p className="text-xs text-slate-300">
                  Gabungkan <strong className="text-red-300">[S1] RIMBA</strong> +{' '}
                  <strong className="text-red-300">[S1] LOKA</strong> untuk membangkitkan
                  Durian Godslayer & Ultimate Kiamat Timber.
                </p>
                <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono-num">
                  <span className={hasRimba ? 'text-emerald-300' : 'text-slate-400'}>
                    {hasRimba ? '✓ [S1] RIMBA' : '✗ [S1] RIMBA'}
                  </span>
                  <span className={hasLoka ? 'text-emerald-300' : 'text-slate-400'}>
                    {hasLoka ? '✓ [S1] LOKA' : '✗ [S1] LOKA'}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={!canFuseDraksa}
              onClick={handleFuseDraksa}
              className={`inline-flex shrink-0 items-center justify-center gap-2 rounded px-4 py-2.5 text-xs font-bold transition-colors whitespace-nowrap ${
                hasDraksa
                  ? 'border border-emerald-400/60 bg-emerald-950/60 text-emerald-300 cursor-default'
                  : canFuseDraksa
                  ? 'bg-red-500 text-white hover:bg-red-400 cursor-pointer'
                  : 'border border-[#382326] bg-[#160F10] text-slate-500 cursor-not-allowed'
              }`}
            >
              {hasDraksa ? (
                <>
                  <Check className="h-4 w-4" /> Sudah Terbuka
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" /> Fusion Secret
                </>
              )}
            </button>
          </section>

          {/* Complete 20 Character Roster & Drop List */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold tracking-wide text-slate-300">
                Daftar 20 Karakter Rimbaloka ({meta.unlockedCharacters.length}/20 Dimiliki)
              </h3>
              <span className="text-[11px] text-slate-400 font-mono-num">
                Synergy aktif dicek terhadap class:{' '}
                <strong className="text-amber-300">{HERO_CLASSES[selectedClass].name}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {CHARACTERS.map((ch, idx) => {
                const rm = CHARACTER_RARITY_META[ch.rarity];
                const unlocked = meta.unlockedCharacters.includes(ch.id);
                const sigWep = WEAPONS[ch.signatureWeaponId];
                const synergyClassName =
                  ch.synergyClass === 'any'
                    ? 'SEMUA CLASS'
                    : HERO_CLASSES[ch.synergyClass].name;

                return (
                  <div
                    key={ch.id}
                    className={`flex flex-col justify-between rounded border p-3 text-xs ${
                      unlocked ? `${rm.border} ${rm.bg}` : 'border-[#202F26] bg-[#0B120E] opacity-85'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-mono-num">
                        <span className="font-bold" style={{ color: rm.color }}>
                          #{String(idx + 1).padStart(2, '0')} {rm.label}
                        </span>
                        <span className={unlocked ? 'text-emerald-300' : 'text-slate-500'}>
                          {unlocked ? 'DIMILIKI' : ch.id === 'draksa' ? 'FUSION' : rm.rateLabel}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center gap-2.5">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded border border-[#283B30] bg-[#080D0A]">
                          <PixelSpritePreview
                            spriteKey={ch.spriteKey as Exclude<keyof SpriteAtlas, 'biomes'>}
                            size={36}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="font-pixel truncate text-xs text-white">{ch.name}</p>
                          <p className="truncate text-[11px] text-slate-400">{ch.title}</p>
                        </div>
                      </div>

                      <p className="mt-2 text-[11px] leading-snug text-slate-300">
                        {ch.passiveDesc}
                      </p>
                    </div>

                    <div className="mt-2 border-t border-white/10 pt-1.5 text-[10px] font-mono-num">
                      <p className="truncate text-sky-300">Sig: {sigWep?.name}</p>
                      <p className="truncate text-amber-300">
                        Synergy ({synergyClassName}): {ch.synergyName}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
