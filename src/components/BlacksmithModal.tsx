import { useEffect, useRef, useState } from 'react';
import { Check, Flame, Hammer, Lock, Sparkles, X } from 'lucide-react';
import { sfx } from '../game/audio';
import { BLUEPRINTS, RARITY_META, WEAPONS } from '../game/data';
import { craftBlacksmithBlueprint, setEquippedBlacksmithWeapon } from '../game/storage';
import { BlueprintDef, MetaProgress } from '../game/types';
import { PixelSpritePreview } from './PixelSpritePreview';

interface BlacksmithModalProps {
  meta: MetaProgress;
  onMetaChange: (next: MetaProgress) => void;
  onClose: () => void;
}

const FLAME_PARTICLES = [
  { left: '14%', delay: '0ms', color: '#F97316', size: 14 },
  { left: '26%', delay: '50ms', color: '#FDE047', size: 10 },
  { left: '38%', delay: '20ms', color: '#EF4444', size: 16 },
  { left: '50%', delay: '0ms', color: '#FACC15', size: 18 },
  { left: '62%', delay: '40ms', color: '#F97316', size: 14 },
  { left: '74%', delay: '70ms', color: '#FF3B30', size: 15 },
  { left: '86%', delay: '15ms', color: '#FDE047', size: 11 },
];

export function BlacksmithModal({
  meta,
  onMetaChange,
  onClose,
}: BlacksmithModalProps) {
  const [filter, setFilter] = useState<'all' | 'owned' | 'legendary' | 'epic'>('all');
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [forgeBurstKey, setForgeBurstKey] = useState(0);
  const [isForging, setIsForging] = useState(false);
  const burstTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (burstTimerRef.current) window.clearTimeout(burstTimerRef.current);
    };
  }, []);

  const handleForge = (bp: BlueprintDef) => {
    sfx.unlock();
    const res = craftBlacksmithBlueprint(bp);
    onMetaChange(res.meta);
    setFeedback({ ok: res.ok, text: res.message });

    if (res.ok) {
      sfx.craft();
      sfx.levelUp();
      setForgeBurstKey((k) => k + 1);
      setIsForging(true);
      if (burstTimerRef.current) window.clearTimeout(burstTimerRef.current);
      burstTimerRef.current = window.setTimeout(() => {
        setIsForging(false);
      }, 850);
    } else {
      sfx.playerHurt();
    }
  };

  const handleToggleEquip = (weaponId: string) => {
    const nextId = meta.equippedBlacksmithWeaponId === weaponId ? null : weaponId;
    const next = setEquippedBlacksmithWeapon(nextId);
    onMetaChange(next);
    sfx.pickup(Boolean(nextId));
  };

  const filtered = BLUEPRINTS.filter((bp) => {
    if (filter === 'owned') return meta.blueprints.includes(bp.id);
    if (filter === 'legendary') return bp.rarity === 'legendary';
    if (filter === 'epic') return bp.rarity === 'epic';
    return true;
  });

  const getWeaponPreviewKey = (weaponId: string) => {
    if (weaponId === 'godslayer') return 'godslayer' as const;
    if (weaponId === 'sandal_swallow_v2') return 'sandal_swallow_v2' as const;
    if (weaponId === 'sandal_swallow') return 'sandal_swallow' as const;
    return 'blueprint' as const;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-5">
      <div
        key={forgeBurstKey}
        className={`relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded border border-[#3C2D1E] bg-[#111512] text-[#E6ECE7] shadow-2xl ${
          isForging ? 'animate-forge-shake border-amber-400/90' : ''
        }`}
      >
        {/* Forge Fire Burst Overlay on Craft Success */}
        {isForging && (
          <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
            <div
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(circle at 50% 65%, rgba(249, 115, 22, 0.34) 0%, rgba(239, 68, 68, 0.16) 45%, rgba(0, 0, 0, 0) 75%)',
              }}
            />
            {FLAME_PARTICLES.map((p, idx) => (
              <div
                key={idx}
                className="animate-forge-flame absolute bottom-12 rounded-sm"
                style={{
                  left: p.left,
                  width: p.size,
                  height: p.size * 1.6,
                  backgroundColor: p.color,
                  animationDelay: p.delay,
                  boxShadow: `0 0 14px ${p.color}`,
                }}
              />
            ))}
          </div>
        )}

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2B231A] bg-[#16130E] px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded border border-amber-500/45 bg-amber-950/50 text-amber-400">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-pixel text-base text-amber-300 sm:text-lg">
                BLACKSMITH LOBBY
              </h2>
              <p className="text-xs text-slate-400">
                Tempa Blueprint Epic & Legendary dari Boss untuk dibawa ke Dungeon.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded border border-[#353E38] text-slate-300 hover:text-white cursor-pointer"
            aria-label="Tutup Blacksmith"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Stash Resource Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#222B24] bg-[#0C100D] px-5 py-2.5 text-xs font-mono-num">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <PixelSpritePreview spriteKey="gold_coin" size={18} />
              <span className="text-slate-400">Gold:</span>
              <strong className="text-amber-300">{meta.gold}</strong>
            </div>
            <div className="flex items-center gap-2">
              <PixelSpritePreview spriteKey="timber_shard" size={18} />
              <span className="text-slate-400">Timber Shard:</span>
              <strong className="text-sky-300">{meta.timberShards}</strong>
            </div>
            <div className="flex items-center gap-2">
              <PixelSpritePreview spriteKey="boss_soul" size={18} />
              <span className="text-slate-400">Boss Soul:</span>
              <strong className="text-purple-300">{meta.bossSouls}</strong>
            </div>
            <div className="flex items-center gap-2">
              <PixelSpritePreview spriteKey="blueprint" size={18} />
              <span className="text-slate-400">Blueprint:</span>
              <strong className="text-emerald-300">
                {meta.blueprints.length}/{BLUEPRINTS.length}
              </strong>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 rounded bg-[#080B09] p-1">
            {(
              [
                { id: 'all', label: 'Semua' },
                { id: 'owned', label: 'Dimiliki' },
                { id: 'legendary', label: 'Legendary' },
                { id: 'epic', label: 'Epic' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setFilter(t.id)}
                className={`rounded px-2.5 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  filter === t.id
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {feedback && (
          <div
            className={`flex items-center gap-2 border-b border-[#253028] px-5 py-2 text-xs font-semibold ${
              feedback.ok
                ? 'bg-amber-950/60 text-amber-200'
                : 'bg-rose-950/60 text-rose-300'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Blueprint Grid */}
        <div className="flex-1 overflow-y-auto p-5">
          {filtered.length === 0 ? (
            <div className="rounded border border-[#243229] bg-[#0B100D] p-8 text-center text-xs text-slate-400">
              Belum ada Blueprint di kategori ini. Kalahkan Boss Raja Treant atau Durian Raksak untuk menjatuhkan Blueprint!
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
              {filtered.map((bp) => {
                const weapon = WEAPONS[bp.weaponId];
                if (!weapon) return null;
                const rarityMeta = RARITY_META[bp.rarity];
                const hasBlueprint = meta.blueprints.includes(bp.id);
                const isCrafted = meta.craftedWeapons.includes(bp.weaponId);
                const isEquipped = meta.equippedBlacksmithWeaponId === bp.weaponId;
                const canAfford =
                  hasBlueprint &&
                  meta.gold >= bp.goldCost &&
                  meta.timberShards >= bp.shardCost &&
                  meta.bossSouls >= bp.soulCost;

                return (
                  <div
                    key={bp.id}
                    className={`flex flex-col justify-between rounded border p-4 transition-colors ${
                      isCrafted
                        ? `${rarityMeta.border} ${rarityMeta.bg} ${rarityMeta.glow || ''}`
                        : hasBlueprint
                        ? 'border-amber-500/45 bg-[#151812]'
                        : 'border-[#232D26] bg-[#0C110E] opacity-85'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded border border-[#2C3A31] bg-[#080C09]">
                            <PixelSpritePreview
                              spriteKey={getWeaponPreviewKey(bp.weaponId)}
                              size={34}
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className="text-[11px] font-mono-num font-bold"
                                style={{ color: rarityMeta.color }}
                              >
                                [{rarityMeta.label}]
                              </span>
                              {isCrafted ? (
                                <span className="text-[11px] font-mono-num font-semibold text-emerald-300">
                                  · DITEMPA
                                </span>
                              ) : hasBlueprint ? (
                                <span className="text-[11px] font-mono-num font-semibold text-amber-300">
                                  · SIAP TEMPA
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-[11px] font-mono-num text-slate-500">
                                  <Lock className="h-3 w-3" /> TERKUNCI
                                </span>
                              )}
                            </div>
                            <h3
                              className="mt-0.5 text-sm font-bold"
                              style={{ color: rarityMeta.color }}
                            >
                              {weapon.name}
                            </h3>
                            <p className="text-[11px] font-mono-num text-slate-400">
                              {bp.name}
                            </p>
                          </div>
                        </div>
                      </div>

                      <p className="mt-2.5 text-xs text-slate-300">{weapon.description}</p>

                      <div className="mt-2 text-[11px] font-mono-num text-slate-200">
                        DMG {weapon.damage} · Tebang {weapon.chopMultiplier}x · Crit +
                        {Math.round(weapon.critBonus * 100)}%
                        {(weapon.knockbackMult ?? 1) > 1
                          ? ` · KB ${Math.round((weapon.knockbackMult ?? 1) * 100)}%`
                          : ''}
                      </div>

                      {!isCrafted && (
                        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-[#222D25] pt-2.5 text-[11px] font-mono-num">
                          <span className={hasBlueprint ? 'text-emerald-300' : 'text-rose-400'}>
                            Blueprint {hasBlueprint ? 'OK' : '0/1'}
                          </span>
                          <span className={meta.gold >= bp.goldCost ? 'text-amber-300' : 'text-rose-400'}>
                            Gold {meta.gold}/{bp.goldCost}
                          </span>
                          <span
                            className={
                              meta.timberShards >= bp.shardCost ? 'text-sky-300' : 'text-rose-400'
                            }
                          >
                            Shard {meta.timberShards}/{bp.shardCost}
                          </span>
                          <span
                            className={
                              meta.bossSouls >= bp.soulCost ? 'text-purple-300' : 'text-rose-400'
                            }
                          >
                            Soul {meta.bossSouls}/{bp.soulCost}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-3.5">
                      {isCrafted ? (
                        <button
                          type="button"
                          onClick={() => handleToggleEquip(bp.weaponId)}
                          className={`inline-flex w-full items-center justify-center gap-2 rounded px-3 py-2 text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                            isEquipped
                              ? 'border border-emerald-400 bg-emerald-600 text-white hover:bg-emerald-500'
                              : 'border border-amber-400/50 bg-[#1B170F] text-amber-200 hover:bg-amber-950/60'
                          }`}
                        >
                          <Check className="h-3.5 w-3.5" />
                          {isEquipped ? 'Terpasang di Slot 2 Run' : 'Pakai di Run Berikutnya'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={!canAfford}
                          onClick={() => handleForge(bp)}
                          className={`inline-flex w-full items-center justify-center gap-2 rounded px-3 py-2 text-xs font-bold transition-colors whitespace-nowrap ${
                            canAfford
                              ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 cursor-pointer'
                              : 'bg-[#18201A] text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          <Hammer className="h-3.5 w-3.5" />
                          {!hasBlueprint
                            ? 'Cari Blueprint dari Boss'
                            : canAfford
                            ? 'Tempa di Landasan Api'
                            : 'Bahan Belum Cukup'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
