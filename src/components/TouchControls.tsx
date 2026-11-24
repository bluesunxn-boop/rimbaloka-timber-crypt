import { useRef, useState } from 'react';
import { Repeat, Sword, Zap } from 'lucide-react';

interface TouchControlsProps {
  onMove: (jx: number, jy: number) => void;
  onAttackChange: (active: boolean) => void;
  onSkill: () => void;
  onSwapWeapon: () => void;
  skillCooldown: number;
}

export function TouchControls({
  onMove,
  onAttackChange,
  onSkill,
  onSwapWeapon,
  skillCooldown,
}: TouchControlsProps) {
  const baseRef = useRef<HTMLDivElement | null>(null);
  const activePointerId = useRef<number | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const maxRadius = 42;

  const updateStick = (clientX: number, clientY: number) => {
    const el = baseRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxRadius) {
      dx = (dx / dist) * maxRadius;
      dy = (dy / dist) * maxRadius;
    }
    setKnob({ x: dx, y: dy });
    onMove(dx / maxRadius, dy / maxRadius);
  };

  const resetStick = () => {
    activePointerId.current = null;
    setKnob({ x: 0, y: 0 });
    onMove(0, 0);
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex items-end justify-between p-4 sm:p-6">
      {/* Left Virtual Joystick */}
      <div
        ref={baseRef}
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          activePointerId.current = e.pointerId;
          e.currentTarget.setPointerCapture(e.pointerId);
          updateStick(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (activePointerId.current !== e.pointerId) return;
          updateStick(e.clientX, e.clientY);
        }}
        onPointerUp={(e) => {
          if (activePointerId.current === e.pointerId) resetStick();
        }}
        onPointerCancel={() => resetStick()}
        className="pointer-events-auto relative flex h-28 w-28 items-center justify-center rounded-full border-2 border-emerald-400/35 bg-[#0D1712]/70 backdrop-blur-sm touch-none"
      >
        <div
          className="h-12 w-12 rounded-full border border-emerald-300/70 bg-emerald-500/40 shadow-lg"
          style={{
            transform: `translate(${knob.x}px, ${knob.y}px)`,
          }}
        />
      </div>

      {/* Right Action Buttons */}
      <div className="pointer-events-auto flex items-end gap-3">
        <div className="flex flex-col items-center gap-2.5">
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSwapWeapon();
            }}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-[#345240] bg-[#0F1B14]/85 text-slate-200 active:scale-95 touch-none cursor-pointer"
            aria-label="Ganti Senjata"
          >
            <Repeat className="h-5 w-5" />
          </button>

          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSkill();
            }}
            className={`relative flex h-14 w-14 items-center justify-center rounded-full border-2 text-xs font-bold active:scale-95 touch-none cursor-pointer ${
              skillCooldown > 0
                ? 'border-slate-600 bg-[#121A16]/80 text-slate-400'
                : 'border-sky-400/80 bg-sky-600/40 text-sky-200'
            }`}
            aria-label="Gunakan Skill"
          >
            {skillCooldown > 0 ? (
              <span className="font-mono-num">{skillCooldown.toFixed(1)}</span>
            ) : (
              <Zap className="h-6 w-6" />
            )}
          </button>
        </div>

        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onAttackChange(true);
          }}
          onPointerUp={(e) => {
            e.preventDefault();
            onAttackChange(false);
          }}
          onPointerCancel={() => onAttackChange(false)}
          onPointerLeave={() => onAttackChange(false)}
          className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-full border-2 border-amber-400/80 bg-amber-500/35 text-amber-100 shadow-xl active:scale-95 touch-none cursor-pointer"
          aria-label="Serang"
        >
          <Sword className="h-7 w-7" />
          <span className="text-[10px] font-bold">SERANG</span>
        </button>
      </div>
    </div>
  );
}
