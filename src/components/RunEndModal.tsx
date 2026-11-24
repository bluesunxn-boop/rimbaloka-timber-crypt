import { ArrowDown, Home, Play, RotateCcw, Skull, Trophy } from 'lucide-react';
import { GameScreen, HudSnapshot } from '../game/types';

interface RunEndModalProps {
  mode: Extract<GameScreen, 'PAUSED' | 'VICTORY' | 'GAME_OVER'>;
  hud: HudSnapshot;
  onResume: () => void;
  onNextFloor: () => void;
  onRestartSameClass: () => void;
  onBackToClassSelect: () => void;
}

export function RunEndModal({
  mode,
  hud,
  onResume,
  onNextFloor,
  onRestartSameClass,
  onBackToClassSelect,
}: RunEndModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded border border-[#2C4536] bg-[#0F1813] p-6 text-[#E6ECE7] shadow-2xl">
        <div className="flex items-center gap-3">
          {mode === 'VICTORY' && <Trophy className="h-7 w-7 text-amber-400" />}
          {mode === 'GAME_OVER' && <Skull className="h-7 w-7 text-rose-400" />}
          <div>
            <h2 className="font-pixel text-xl text-white">
              {mode === 'PAUSED'
                ? 'GAME DIJEDA'
                : mode === 'VICTORY'
                ? 'BOSS DITAKLUKKAN!'
                : 'GUGUR DI RIMBA'}
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              {mode === 'PAUSED'
                ? 'Progress otomatis tersimpan di penyimpanan lokal.'
                : mode === 'VICTORY'
                ? `Raja Treant di Lantai ${hud.floor} tumbang! Lanjutkan ke lantai lebih dalam atau ambil loot dulu.`
                : `Petualangan terhenti di Lantai ${hud.floor}.`}
            </p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mt-5 grid grid-cols-2 gap-3 rounded border border-[#213429] bg-[#0B120E] p-4 text-xs font-mono-num">
          <div>
            <span className="text-slate-400">Level Hero</span>
            <p className="mt-0.5 text-base font-bold text-amber-300">LV. {hud.level}</p>
          </div>
          <div>
            <span className="text-slate-400">Skor Run</span>
            <p className="mt-0.5 text-base font-bold text-white">{hud.score}</p>
          </div>
          <div>
            <span className="text-slate-400">Musuh Tumbang</span>
            <p className="mt-0.5 text-base font-bold text-emerald-300">{hud.kills}</p>
          </div>
          <div>
            <span className="text-slate-400">Pohon Ditebang</span>
            <p className="mt-0.5 text-base font-bold text-sky-300">{hud.treesChopped}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-5 flex flex-col gap-2.5">
          {mode === 'PAUSED' && (
            <button
              type="button"
              onClick={onResume}
              className="inline-flex items-center justify-center gap-2 rounded bg-emerald-500 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-emerald-400 whitespace-nowrap cursor-pointer"
            >
              <Play className="h-4 w-4 fill-current" />
              Lanjutkan Bermain
            </button>
          )}

          {mode === 'VICTORY' && (
            <>
              <button
                type="button"
                onClick={onNextFloor}
                className="inline-flex items-center justify-center gap-2 rounded bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-amber-400 whitespace-nowrap cursor-pointer"
              >
                <ArrowDown className="h-4 w-4" />
                Turun ke Lantai {hud.floor + 1}
              </button>
              <button
                type="button"
                onClick={onResume}
                className="inline-flex items-center justify-center gap-2 rounded border border-emerald-500/50 bg-[#13241B] px-4 py-2.5 text-sm font-semibold text-emerald-300 hover:bg-[#193024] whitespace-nowrap cursor-pointer"
              >
                Ambil Loot & Jelajah Lantai Ini
              </button>
            </>
          )}

          {mode === 'GAME_OVER' && (
            <button
              type="button"
              onClick={onRestartSameClass}
              className="inline-flex items-center justify-center gap-2 rounded bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-amber-400 whitespace-nowrap cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              Main Lagi
            </button>
          )}

          <button
            type="button"
            onClick={onBackToClassSelect}
            className="inline-flex items-center justify-center gap-2 rounded border border-[#2C4536] bg-[#132018] px-4 py-2.5 text-sm font-medium text-slate-200 hover:border-slate-400 whitespace-nowrap cursor-pointer"
          >
            <Home className="h-4 w-4" />
            Pilih Class
          </button>
        </div>
      </div>
    </div>
  );
}
