import { Gamepad2, Settings, SlidersHorizontal, Volume2, VolumeX, X } from 'lucide-react';
import { sfx } from '../game/audio';
import { updateControlSettings } from '../game/storage';
import { ControlMode, DpadSize, MetaProgress } from '../game/types';

interface ControlSettingsModalProps {
  meta: MetaProgress;
  showTouchControls: boolean;
  muted: boolean;
  onMetaChange: (next: MetaProgress) => void;
  onToggleTouchControls: () => void;
  onToggleMute: () => void;
  onClose: () => void;
}

const SIZE_OPTIONS: Array<{ id: DpadSize; label: string; pxLabel: string }> = [
  { id: 'small', label: 'Kecil', pxLabel: '104px (HP Kecil)' },
  { id: 'medium', label: 'Sedang', pxLabel: '124px (Standar)' },
  { id: 'large', label: 'Besar', pxLabel: '148px (HP Lebar)' },
];

export function ControlSettingsModal({
  meta,
  showTouchControls,
  muted,
  onMetaChange,
  onToggleTouchControls,
  onToggleMute,
  onClose,
}: ControlSettingsModalProps) {
  const sizeIndex = Math.max(
    0,
    SIZE_OPTIONS.findIndex((opt) => opt.id === meta.dpadSize)
  );

  const handleModeChange = (mode: ControlMode) => {
    sfx.unlock();
    const next = updateControlSettings(mode, meta.dpadSize);
    onMetaChange(next);
  };

  const handleSizeChange = (size: DpadSize) => {
    sfx.unlock();
    const next = updateControlSettings(meta.controlMode, size);
    onMetaChange(next);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded border border-[#2C4536] bg-[#0F1813] text-[#E6ECE7] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#22362B] px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <Settings className="h-5 w-5 text-amber-300" />
            <h2 className="font-pixel text-base text-amber-300 sm:text-lg">
              SETTING KONTROL
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded border border-[#2C4235] text-slate-300 hover:text-white cursor-pointer"
            aria-label="Tutup Setting"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          {/* Control Type Selector: ANALOG (Anti Licin) default vs D-PAD */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wide text-slate-300">
                Pilih Kontrol Layar
              </span>
              <span className="font-mono-num text-[11px] text-emerald-300">
                {meta.controlMode === 'analog'
                  ? 'ANALOG ANTI LICIN (Default)'
                  : 'D-PAD PANAH'}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => handleModeChange('analog')}
                className={`flex flex-col items-start rounded border p-3.5 text-left transition-colors cursor-pointer ${
                  meta.controlMode === 'analog'
                    ? 'border-amber-400 bg-[#1B261C] text-white'
                    : 'border-[#25382C] bg-[#0B120E] text-slate-300 hover:border-[#3A5945]'
                }`}
              >
                <span className="text-xs font-bold text-amber-300">
                  ANALOG (Anti Licin)
                </span>
                <span className="mt-1 text-[11px] text-slate-300">
                  Deadzone 15%, batas kayu keset ala stik PS5, lepas langsung berhenti (0ms).
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleModeChange('dpad')}
                className={`flex flex-col items-start rounded border p-3.5 text-left transition-colors cursor-pointer ${
                  meta.controlMode === 'dpad'
                    ? 'border-amber-400 bg-[#1B261C] text-white'
                    : 'border-[#25382C] bg-[#0B120E] text-slate-300 hover:border-[#3A5945]'
                }`}
              >
                <span className="text-xs font-bold text-slate-200">
                  D-PAD PANAH
                </span>
                <span className="mt-1 text-[11px] text-slate-400">
                  Tombol arah 4 panah + diagonal klasik kalau kangen gaya retro.
                </span>
              </button>
            </div>
          </div>

          {/* Analog / D-PAD Size Slider: Kecil / Sedang / Besar */}
          <div className="space-y-3 rounded border border-[#22352A] bg-[#0B120E] p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-slate-200">
                <SlidersHorizontal className="h-3.5 w-3.5 text-amber-300" />
                Ukuran Analog / Kontrol
              </span>
              <span className="font-mono-num font-bold text-amber-300">
                {SIZE_OPTIONS[sizeIndex].label} ({SIZE_OPTIONS[sizeIndex].pxLabel})
              </span>
            </div>

            <input
              type="range"
              min={0}
              max={2}
              step={1}
              value={sizeIndex}
              onChange={(e) => {
                const idx = Number(e.target.value);
                const chosen = SIZE_OPTIONS[idx] ?? SIZE_OPTIONS[1];
                handleSizeChange(chosen.id);
              }}
              aria-label="Ukuran Analog"
              className="w-full accent-amber-400 cursor-pointer"
            />

            <div className="grid grid-cols-3 gap-2">
              {SIZE_OPTIONS.map((opt) => {
                const active = meta.dpadSize === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSizeChange(opt.id)}
                    className={`rounded border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                      active
                        ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                        : 'border-[#24372B] bg-[#101914] text-slate-400 hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Touch Overlay & Audio Toggles */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                sfx.unlock();
                onToggleTouchControls();
              }}
              className={`flex items-center justify-between rounded border px-3.5 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                showTouchControls
                  ? 'border-emerald-400/60 bg-emerald-950/45 text-emerald-200'
                  : 'border-[#25382C] bg-[#0B120E] text-slate-300'
              }`}
            >
              <span className="flex items-center gap-2">
                <Gamepad2 className="h-4 w-4" />
                Kontrol Layar
              </span>
              <span className="font-mono-num">{showTouchControls ? 'AKTIF' : 'MATI'}</span>
            </button>

            <button
              type="button"
              onClick={onToggleMute}
              className={`flex items-center justify-between rounded border px-3.5 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                !muted
                  ? 'border-sky-400/50 bg-sky-950/35 text-sky-200'
                  : 'border-[#25382C] bg-[#0B120E] text-slate-300'
              }`}
            >
              <span className="flex items-center gap-2">
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                Suara Game
              </span>
              <span className="font-mono-num">{muted ? 'MUTE' : 'ON'}</span>
            </button>
          </div>
        </div>

        <div className="border-t border-[#22362B] px-5 py-3 text-right">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded bg-amber-500 px-5 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 whitespace-nowrap cursor-pointer"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
}
