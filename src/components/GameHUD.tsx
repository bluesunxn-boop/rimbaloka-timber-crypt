import {
  Backpack,
  Flame,
  FlaskConical,
  Gamepad2,
  GitBranch,
  Moon,
  Pause,
  Repeat,
  Settings,
  Sun,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { BIOME_META, getWeaponRarityStyle, HERO_CLASSES } from '../game/data';
import { HudSnapshot } from '../game/types';

interface GameHUDProps {
  hud: HudSnapshot;
  muted: boolean;
  showTouchControls: boolean;
  toast: { text: string; color: string } | null;
  onToggleMute: () => void;
  onToggleTouchControls: () => void;
  onOpenInventory: () => void;
  onOpenSkillTree: () => void;
  onOpenSettings: () => void;
  onPause: () => void;
  onSwitchWeapon: () => void;
  onUsePotion: () => void;
}

export function GameHUD({
  hud,
  muted,
  showTouchControls,
  toast,
  onToggleMute,
  onToggleTouchControls,
  onOpenInventory,
  onOpenSkillTree,
  onOpenSettings,
  onPause,
  onSwitchWeapon,
  onUsePotion,
}: GameHUDProps) {
  const hpPct = Math.max(0, Math.min(100, (hud.hp / hud.maxHp) * 100));
  const manaPct = Math.max(0, Math.min(100, (hud.mana / hud.maxMana) * 100));
  const expPct = Math.max(0, Math.min(100, (hud.exp / hud.expToNext) * 100));
  const cls = HERO_CLASSES[hud.classId];
  const wepRarity = getWeaponRarityStyle(hud.activeWeapon);

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-2.5 sm:p-4">
      {/* Top Row: Player Bars | Boss Bar | Minimap & Quick Actions */}
      <div className="flex items-start justify-between gap-3">
        {/* Top-Left: Vitals & Resources */}
        <div className="pointer-events-auto flex flex-col gap-2 rounded border border-[#263C2F] bg-[#0D1611]/90 p-2.5 backdrop-blur-sm sm:min-w-[280px]">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-1.5 font-pixel text-amber-300">
              <span>
                {hud.characterName} · {cls.name} · LV.{hud.level}
              </span>
              {hud.synergyActive && (
                <span title={`SYNERGY AKTIF: ${hud.synergyName}`}>
                  <Flame className="h-3.5 w-3.5 fill-orange-400 text-amber-300" />
                </span>
              )}
            </span>
            <div className="flex items-center gap-1.5 font-mono-num">
              {hud.chosenPath && (
                <span
                  className={`font-bold ${
                    hud.chosenPath === 'surga' ? 'text-sky-300' : 'text-red-400'
                  }`}
                >
                  {hud.chosenPath === 'surga' ? 'SURGA' : 'NERAKA'}
                </span>
              )}
              {hud.heavenShieldReady && (
                <span className="text-[10px] font-bold text-yellow-300" title="Perisai Cahaya Siap">
                  [PERISAI]
                </span>
              )}
              {hud.stunTimer > 0 && (
                <span className="text-[10px] font-bold text-amber-400">
                  [STUN {hud.stunTimer.toFixed(1)}s]
                </span>
              )}
              <span
                className="font-semibold"
                style={{ color: BIOME_META[hud.biome].accent }}
              >
                L{hud.floor} · {hud.biomeName}
              </span>
            </div>
          </div>

          {/* Active Hero Buffs Strip (when active) */}
          {(hud.stealthTimer > 0 ||
            hud.rainActive ||
            hud.forestAliveTimer > 0 ||
            hud.dashCharges > 1 ||
            (hud.characterId === 'draksa' && !hud.ultimateUsed)) && (
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono-num">
              {hud.stealthTimer > 0 && (
                <span className="font-bold text-emerald-300">
                  [STEALTH {hud.stealthTimer.toFixed(1)}s]
                </span>
              )}
              {hud.rainActive && (
                <span className="font-bold text-sky-300">[HUJAN -50% API]</span>
              )}
              {hud.forestAliveTimer > 0 && (
                <span className="font-bold text-red-400">
                  [HUTAN HIDUP {hud.forestAliveTimer.toFixed(1)}s]
                </span>
              )}
              {hud.dashCharges > 1 && (
                <span className="font-bold text-emerald-300">
                  [DASH x{hud.dashCharges}]
                </span>
              )}
              {hud.characterId === 'draksa' && !hud.ultimateUsed && (
                <span className="font-bold text-red-300">[KIAMAT TIMBER SIAP]</span>
              )}
            </div>
          )}

          {/* HP Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-mono-num">
              <span className="text-rose-300">HP</span>
              <span className="text-white">
                {hud.hp}/{hud.maxHp}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-sm bg-[#1A2820]">
              <div
                className="h-full bg-rose-500 transition-[width] duration-100"
                style={{ width: `${hpPct}%` }}
              />
            </div>
          </div>

          {/* Mana & EXP compact bars */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="flex justify-between text-[10px] font-mono-num text-sky-300">
                <span>MP</span>
                <span>
                  {hud.mana}/{hud.maxMana}
                </span>
              </div>
              <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-sm bg-[#1A2820]">
                <div
                  className="h-full bg-sky-400 transition-[width] duration-100"
                  style={{ width: `${manaPct}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[10px] font-mono-num text-amber-300">
                <span>EXP</span>
                <span>{Math.round(expPct)}%</span>
              </div>
              <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-sm bg-[#1A2820]">
                <div
                  className="h-full bg-amber-400 transition-[width] duration-100"
                  style={{ width: `${expPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Materials & Weapon Row */}
          <div className="flex flex-wrap items-center gap-2 border-t border-[#1E3126] pt-1.5 text-[11px] font-mono-num text-slate-200">
            <span title="Kayu Biasa (Common)">Kayu: {hud.materials.wood}</span>
            <span className="text-slate-600">·</span>
            <span className="text-green-400" title="Kayu Besi (Rare)">
              Besi: {hud.materials.ironwood}
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-sky-300" title="Timber Shard (Bahan Blacksmith)">
              Shard: {hud.materials.timberShards}
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-purple-300" title="Boss Soul (Bahan Blacksmith)">
              Soul: {hud.materials.bossSouls}
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-amber-300 font-bold" title="Gold">
              Gold: {hud.materials.gold}
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-sky-300 font-bold" title="Gem Gacha">
              Gem: {hud.materials.gems}
            </span>
          </div>

          {/* Active Weapon + Potion Quick Bar */}
          <div className="flex items-center gap-1.5 pt-0.5">
            <button
              type="button"
              onClick={onSwitchWeapon}
              className="flex flex-1 items-center justify-between gap-2 rounded border border-[#2D4638] bg-[#132018] px-2 py-1 text-left text-xs hover:border-amber-400/50 cursor-pointer"
              title="Ganti Senjata [Q]"
            >
              <span className="truncate font-semibold" style={{ color: wepRarity.color }}>
                [{wepRarity.label}] {hud.activeWeapon.name}
              </span>
              {hud.secondaryWeapon && (
                <Repeat className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              )}
            </button>

            <button
              type="button"
              onClick={onUsePotion}
              className="flex shrink-0 items-center gap-1 rounded border border-emerald-500/40 bg-[#132219] px-2 py-1 text-xs font-mono-num text-emerald-300 hover:bg-[#193022] cursor-pointer whitespace-nowrap"
              title={`Minum Ramuan [H] (Maksimal ${hud.maxPotions})`}
            >
              <FlaskConical className="h-3.5 w-3.5" />
              <span>
                {hud.materials.potions}/{hud.maxPotions}
              </span>
            </button>
          </div>
        </div>

        {/* Top-Center: Boss Bar & Toast */}
        <div className="hidden flex-1 flex-col items-center gap-2 md:flex">
          {hud.boss && (
            <div className="w-full max-w-md rounded border border-rose-500/60 bg-[#180E10]/90 px-4 py-2 backdrop-blur-sm">
              <div className="flex items-center justify-between text-xs">
                <span className="font-pixel text-rose-300">
                  {hud.boss.name}
                  {hud.boss.phase === 2 ? ' · FASE 2' : ''}
                </span>
                <span className="font-mono-num text-rose-200">
                  {hud.boss.hp}/{hud.boss.maxHp}
                </span>
              </div>
              <div className="mt-1.5 h-3 w-full overflow-hidden rounded-sm bg-[#2A1317]">
                <div
                  className="h-full bg-rose-500 transition-[width] duration-100"
                  style={{
                    width: `${Math.max(0, (hud.boss.hp / hud.boss.maxHp) * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}

          {toast && (
            <div
              className="rounded border border-[#2D4638] bg-[#0D1611]/95 px-3.5 py-1.5 text-xs font-semibold shadow-lg"
              style={{ color: toast.color }}
            >
              {toast.text}
            </div>
          )}
        </div>

        {/* Top-Right: Day/Night Indicator, Menu Buttons & Minimap */}
        <div className="pointer-events-auto flex flex-col items-end gap-2">
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            {/* Day/Night Cycle Indicator */}
            <div
              className={`inline-flex h-9 items-center gap-2 rounded border px-2.5 text-xs font-mono-num backdrop-blur-sm ${
                hud.timeOfDay === 'night'
                  ? 'border-indigo-400/60 bg-[#0D1326]/90 text-indigo-200'
                  : 'border-amber-400/50 bg-[#17160D]/90 text-amber-200'
              }`}
              title={
                hud.timeOfDay === 'night'
                  ? 'Malam: Musuh HP+100% & DMG+50%, Gold x2 & Timber Shard+'
                  : 'Siang: Kondisi dungeon normal'
              }
            >
              {hud.timeOfDay === 'night' ? (
                <Moon className="h-4 w-4 text-sky-300" />
              ) : (
                <Sun className="h-4 w-4 text-amber-400" />
              )}
              <span className="font-bold">
                {hud.timeOfDay === 'night' ? 'MALAM' : 'SIANG'}
              </span>
              <span className="text-[11px] opacity-80">
                {Math.floor(hud.cycleRemaining / 60)}:
                {String(hud.cycleRemaining % 60).padStart(2, '0')}
              </span>
            </div>

            <button
              type="button"
              onClick={onOpenInventory}
              className="inline-flex h-9 items-center gap-1.5 rounded border border-[#2B4134] bg-[#0D1611]/90 px-2.5 text-xs font-medium text-slate-200 hover:border-amber-400/60 hover:text-amber-300 whitespace-nowrap cursor-pointer"
            >
              <Backpack className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Tas & Craft</span>
              <span className="text-[10px] text-slate-400 font-mono-num">[I]</span>
            </button>

            <button
              type="button"
              onClick={onOpenSkillTree}
              className={`inline-flex h-9 items-center gap-1.5 rounded border px-2.5 text-xs font-medium whitespace-nowrap cursor-pointer ${
                hud.skillPoints > 0
                  ? 'border-amber-400 bg-amber-500/20 text-amber-200 hover:bg-amber-500/30'
                  : 'border-[#2B4134] bg-[#0D1611]/90 text-slate-200 hover:border-emerald-400/60'
              }`}
            >
              <GitBranch className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Skill</span>
              <span className="font-mono-num text-[11px]">
                {hud.skillPoints > 0 ? `+${hud.skillPoints}` : '[K]'}
              </span>
            </button>

            <button
              type="button"
              onClick={onToggleTouchControls}
              className={`inline-flex h-9 w-9 items-center justify-center rounded border text-xs cursor-pointer ${
                showTouchControls
                  ? 'border-emerald-400/60 bg-emerald-950/60 text-emerald-300'
                  : 'border-[#2B4134] bg-[#0D1611]/90 text-slate-300 hover:text-white'
              }`}
              title="Tampilkan / Sembunyikan Kontrol Sentuh"
            >
              <Gamepad2 className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={onToggleMute}
              className="inline-flex h-9 w-9 items-center justify-center rounded border border-[#2B4134] bg-[#0D1611]/90 text-slate-300 hover:text-white cursor-pointer"
              title={muted ? 'Nyalakan Suara' : 'Matikan Suara'}
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={onOpenSettings}
              className="inline-flex h-9 w-9 items-center justify-center rounded border border-[#2B4134] bg-[#0D1611]/90 text-slate-300 hover:border-amber-400/60 hover:text-amber-300 cursor-pointer"
              title="Setting Kontrol (D-PAD / Analog)"
            >
              <Settings className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={onPause}
              className="inline-flex h-9 w-9 items-center justify-center rounded border border-[#2B4134] bg-[#0D1611]/90 text-slate-300 hover:text-white cursor-pointer"
              title="Jeda [Esc]"
            >
              <Pause className="h-4 w-4" />
            </button>
          </div>

          {hud.timeOfDay === 'night' && (
            <div className="rounded border border-indigo-400/40 bg-[#0B1022]/85 px-2.5 py-1 text-[10px] font-mono-num text-indigo-200">
              Musuh HP+100% · DMG+50% · Gold x2 · Shard+
            </div>
          )}

          {/* Minimap */}
          <div className="rounded border border-[#263C2F] bg-[#0B120E]/85 p-1.5 backdrop-blur-sm">
            <svg
              width={116}
              height={88}
              viewBox={`0 0 ${hud.mapWidth} ${hud.mapHeight}`}
              className="block"
            >
              {hud.minimapRooms.map((r, idx) => {
                if (!r.discovered) return null;
                let fill = '#1E3527';
                if (r.kind === 'boss') fill = '#7F1D1D';
                else if (r.kind === 'shrine') fill = '#14532D';
                else if (r.kind === 'timber') fill = '#3F2E1A';
                else if (r.cleared) fill = '#2A4A37';

                return (
                  <rect
                    key={idx}
                    x={r.x}
                    y={r.y}
                    width={r.w}
                    height={r.h}
                    fill={fill}
                    stroke={r.kind === 'boss' ? '#EF4444' : '#4ADE80'}
                    strokeOpacity={0.35}
                    strokeWidth={0.7}
                  />
                );
              })}
              <circle
                cx={hud.playerTileX}
                cy={hud.playerTileY}
                r={1.8}
                fill="#FDE047"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Mobile Boss Bar & Interact Hint */}
      <div className="flex flex-col items-center gap-2">
        {hud.boss && (
          <div className="w-full max-w-sm rounded border border-rose-500/60 bg-[#180E10]/90 px-3 py-1.5 md:hidden">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-pixel text-rose-300">{hud.boss.name}</span>
              <span className="font-mono-num text-rose-200">
                {hud.boss.hp}/{hud.boss.maxHp}
              </span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-sm bg-[#2A1317]">
              <div
                className="h-full bg-rose-500"
                style={{ width: `${Math.max(0, (hud.boss.hp / hud.boss.maxHp) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {toast && (
          <div
            className="rounded border border-[#2D4638] bg-[#0D1611]/95 px-3 py-1 text-xs font-semibold md:hidden"
            style={{ color: toast.color }}
          >
            {toast.text}
          </div>
        )}

        {hud.nearInteractHint && (
          <div className="rounded border border-amber-500/40 bg-[#0D1611]/90 px-3 py-1 text-xs text-amber-200">
            {hud.nearInteractHint}
          </div>
        )}
      </div>
    </div>
  );
}
