import { useState } from 'react';
import { Hammer, Recycle, Shield, X } from 'lucide-react';
import { CRAFTING_RECIPES, RARITY_META, WEAPONS } from '../game/data';
import { PlayerState } from '../game/types';

interface InventoryModalProps {
  player: PlayerState;
  onClose: () => void;
  onEquip: (uid: string, slot: 0 | 1) => void;
  onSalvage: (uid: string) => void;
  onCraft: (recipeId: string) => { ok: boolean; message: string };
}

export function InventoryModal({
  player,
  onClose,
  onEquip,
  onSalvage,
  onCraft,
}: InventoryModalProps) {
  const [tab, setTab] = useState<'bag' | 'craft'>('bag');
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const slot0 = WEAPONS[player.equippedWeapons[0].defId];
  const slot1 = player.equippedWeapons[1]
    ? WEAPONS[player.equippedWeapons[1].defId]
    : null;

  const handleCraft = (id: string) => {
    const res = onCraft(id);
    setFeedback({ ok: res.ok, text: res.message });
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="flex max-h-[88vh] w-full max-w-3xl flex-col rounded border border-[#2B4435] bg-[#0F1813] text-[#E6ECE7] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#22362B] px-5 py-3.5">
          <div className="flex items-center gap-4">
            <h2 className="font-pixel text-base text-amber-300 sm:text-lg">
              TAS & BENGKEL KAYU
            </h2>
            <div className="flex items-center gap-1 rounded bg-[#0A100D] p-1">
              <button
                type="button"
                onClick={() => setTab('bag')}
                className={`rounded px-3 py-1 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  tab === 'bag'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Tas ({player.backpack.length})
              </button>
              <button
                type="button"
                onClick={() => setTab('craft')}
                className={`rounded px-3 py-1 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  tab === 'craft'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Crafting Senjata
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded border border-[#2C4235] text-slate-300 hover:text-white cursor-pointer"
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Material Strip */}
        <div className="flex flex-wrap items-center gap-4 border-b border-[#1E3126] bg-[#0B120E] px-5 py-2.5 text-xs font-mono-num">
          <span className="text-slate-300">
            Kayu Biasa: <strong className="text-white">{player.materials.wood}</strong>
          </span>
          <span className="text-slate-600">·</span>
          <span className="text-green-400">
            Kayu Besi [RARE]: <strong>{player.materials.ironwood}</strong>
          </span>
          <span className="text-slate-600">·</span>
          <span className="text-yellow-400">
            Kayu Purba [MYTHIC]: <strong>{player.materials.elderwood}</strong>
          </span>
          <span className="text-slate-600">·</span>
          <span className="text-emerald-300">
            Ramuan: <strong>{player.materials.potions}</strong>
          </span>
        </div>

        {/* 6-Tier Color Legend */}
        <div className="flex flex-wrap items-center gap-3 border-b border-[#1A2B21] bg-[#090F0B] px-5 py-2 text-[11px] font-mono-num">
          <span className="text-slate-500">Tier:</span>
          {(['common', 'rare', 'epic', 'langka', 'mythic', 'legendary'] as const).map((tier) => (
            <span key={tier} className="font-bold" style={{ color: RARITY_META[tier].color }}>
              {RARITY_META[tier].label}
            </span>
          ))}
        </div>

        {feedback && (
          <div
            className={`border-b border-[#22362B] px-5 py-2 text-xs font-medium ${
              feedback.ok ? 'bg-emerald-950/50 text-emerald-300' : 'bg-rose-950/50 text-rose-300'
            }`}
          >
            {feedback.text}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'bag' ? (
            <div className="space-y-5">
              {/* Equipped Slots */}
              <div>
                <h3 className="text-xs font-semibold tracking-wide text-slate-400">
                  Senjata Terpasang
                </h3>
                <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {[slot0, slot1].map((wep, idx) => {
                    const wepMeta = wep ? RARITY_META[wep.rarity] : null;
                    return (
                      <div
                        key={idx}
                        className={`rounded border p-3.5 ${
                          wepMeta
                            ? `${wepMeta.border} ${wepMeta.bg} ${wepMeta.glow || ''}`
                            : 'border-dashed border-[#2A3F32] bg-[#0B120E]'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono-num text-slate-400">
                            Slot {idx + 1} {player.activeWeaponSlot === idx ? '(Aktif)' : ''}
                          </span>
                          {wepMeta && (
                            <span
                              className="font-mono-num font-bold"
                              style={{ color: wepMeta.color }}
                            >
                              [{wepMeta.label}]
                            </span>
                          )}
                        </div>
                        {wep && wepMeta ? (
                          <>
                            <p
                              className="mt-1 text-sm font-bold"
                              style={{ color: wepMeta.color }}
                            >
                              {wep.name}
                            </p>
                            <p className="mt-1 text-xs text-slate-200 font-mono-num">
                              DMG {wep.damage} · Tebang {wep.chopMultiplier}x · Crit +
                              {Math.round(wep.critBonus * 100)}%
                            </p>
                            <p className="mt-1.5 text-xs text-slate-300">{wep.description}</p>
                          </>
                        ) : (
                          <p className="mt-2 text-xs text-slate-500">
                            Kosong — Loot musuh atau craft senjata baru untuk mengisi slot ini.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Backpack Items */}
              <div>
                <h3 className="text-xs font-semibold tracking-wide text-slate-400">
                  Senjata di Tas
                </h3>
                {player.backpack.length === 0 ? (
                  <div className="mt-2 rounded border border-[#22352A] bg-[#0B120E] p-4 text-center text-xs text-slate-400">
                    Tas senjata masih kosong. Kalahkan Slime, Goblin, atau craft senjata dari kayu!
                  </div>
                ) : (
                  <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {player.backpack.map((inst) => {
                      const w = WEAPONS[inst.defId];
                      if (!w) return null;
                      const meta = RARITY_META[w.rarity];
                      const salvageWood = meta.salvageWood;
                      return (
                        <div
                          key={inst.uid}
                          className={`flex flex-col justify-between rounded border p-3.5 ${meta.border} ${meta.bg} ${meta.glow || ''}`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="font-bold" style={{ color: meta.color }}>
                                {w.name}
                              </span>
                              <span
                                className="font-mono-num font-bold"
                                style={{ color: meta.color }}
                              >
                                [{meta.label}]
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-slate-200 font-mono-num">
                              DMG {w.damage} · Tebang {w.chopMultiplier}x · Mana {w.manaCost}
                            </p>
                            <p className="mt-1 text-xs text-slate-300">{w.description}</p>
                          </div>

                          <div className="mt-3 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => onEquip(inst.uid, 0)}
                              className="flex flex-1 items-center justify-center gap-1 rounded bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 whitespace-nowrap cursor-pointer"
                            >
                              <Shield className="h-3 w-3" />
                              Pakai Slot 1
                            </button>
                            <button
                              type="button"
                              onClick={() => onEquip(inst.uid, 1)}
                              className="flex flex-1 items-center justify-center gap-1 rounded border border-[#345140] bg-[#14231A] px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:border-amber-400 whitespace-nowrap cursor-pointer"
                            >
                              Pakai Slot 2
                            </button>
                            <button
                              type="button"
                              onClick={() => onSalvage(inst.uid)}
                              className="flex items-center justify-center gap-1 rounded border border-amber-500/40 bg-[#1B160D] px-2.5 py-1.5 text-xs font-mono-num text-amber-300 hover:bg-amber-950/50 whitespace-nowrap cursor-pointer"
                              title={`Ubah jadi +${salvageWood} Kayu`}
                            >
                              <Recycle className="h-3.5 w-3.5" />
                              +{salvageWood}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {CRAFTING_RECIPES.map((recipe) => {
                const meta = RARITY_META[recipe.rarity];
                const canAfford =
                  player.materials.wood >= recipe.cost.wood &&
                  player.materials.ironwood >= recipe.cost.ironwood &&
                  player.materials.elderwood >= recipe.cost.elderwood;

                return (
                  <div
                    key={recipe.id}
                    className={`flex flex-col justify-between rounded border p-3.5 ${meta.border} ${meta.bg} ${meta.glow || ''}`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-sm font-bold" style={{ color: meta.color }}>
                          {recipe.name}
                        </span>
                        <span
                          className="font-mono-num font-bold"
                          style={{ color: meta.color }}
                        >
                          [{meta.label}]
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs text-slate-300">{recipe.description}</p>
                      <div className="mt-2.5 flex flex-wrap gap-2 text-xs font-mono-num">
                        {recipe.cost.wood > 0 && (
                          <span
                            className={
                              player.materials.wood >= recipe.cost.wood
                                ? 'text-slate-200'
                                : 'text-rose-400'
                            }
                          >
                            Kayu: {recipe.cost.wood}
                          </span>
                        )}
                        {recipe.cost.ironwood > 0 && (
                          <span
                            className={
                              player.materials.ironwood >= recipe.cost.ironwood
                                ? 'text-sky-300'
                                : 'text-rose-400'
                            }
                          >
                            · Besi: {recipe.cost.ironwood}
                          </span>
                        )}
                        {recipe.cost.elderwood > 0 && (
                          <span
                            className={
                              player.materials.elderwood >= recipe.cost.elderwood
                                ? 'text-amber-300'
                                : 'text-rose-400'
                            }
                          >
                            · Purba: {recipe.cost.elderwood}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!canAfford}
                      onClick={() => handleCraft(recipe.id)}
                      className={`mt-3 inline-flex items-center justify-center gap-2 rounded px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                        canAfford
                          ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 cursor-pointer'
                          : 'bg-[#19261E] text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <Hammer className="h-3.5 w-3.5" />
                      {canAfford ? 'Tempa / Buat' : 'Bahan Belum Cukup'}
                    </button>
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
