import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Flame,
  Repeat,
  Sword,
  Wind,
  Zap,
} from 'lucide-react';
import { sfx } from '../game/audio';
import { ControlMode, DpadSize } from '../game/types';

interface TouchControlsProps {
  controlMode: ControlMode;
  dpadSize: DpadSize;
  skillCooldown: number;
  dodgeDashCooldown: number;
  isUltimateHero?: boolean;
  onMove: (jx: number, jy: number) => void;
  onAttackChange: (active: boolean) => void;
  onDash: () => void;
  onSkill: () => void;
  onSwapWeapon: () => void;
}

interface DirFlags {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

const EMPTY_DIRS: DirFlags = { up: false, down: false, left: false, right: false };

const SIZE_SPECS: Record<
  DpadSize,
  {
    analogPx: number;
    knobPx: number;
    maxRadius: number;
    dpadPx: number;
    attackPx: number;
    dashPx: number;
    ultPx: number;
    swapPx: number;
  }
> = {
  small: {
    analogPx: 104,
    knobPx: 40,
    maxRadius: 34,
    dpadPx: 138,
    attackPx: 72,
    dashPx: 48,
    ultPx: 54,
    swapPx: 44,
  },
  medium: {
    analogPx: 124,
    knobPx: 46,
    maxRadius: 42,
    dpadPx: 168,
    attackPx: 82,
    dashPx: 52,
    ultPx: 58,
    swapPx: 46,
  },
  large: {
    analogPx: 148,
    knobPx: 54,
    maxRadius: 52,
    dpadPx: 196,
    attackPx: 94,
    dashPx: 58,
    ultPx: 66,
    swapPx: 52,
  },
};

const DEADZONE_RATIO = 0.15;

export function TouchControls({
  controlMode,
  dpadSize,
  skillCooldown,
  dodgeDashCooldown,
  isUltimateHero = false,
  onMove,
  onAttackChange,
  onDash,
  onSkill,
  onSwapWeapon,
}: TouchControlsProps) {
  const dims = SIZE_SPECS[dpadSize];

  // Keep latest callbacks in refs so HUD re-renders NEVER trigger input reset cleanup!
  const onMoveRef = useRef(onMove);
  const onAttackChangeRef = useRef(onAttackChange);
  onMoveRef.current = onMove;
  onAttackChangeRef.current = onAttackChange;

  // === Primary PS5-style Anti-Slip Timber Analog State ===
  const analogBaseRef = useRef<HTMLDivElement | null>(null);
  const analogTouchIdRef = useRef<number | null>(null);
  const analogMouseActiveRef = useRef(false);
  const maxRadiusRef = useRef(dims.maxRadius);
  maxRadiusRef.current = dims.maxRadius;

  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [analogEngaged, setAnalogEngaged] = useState(false);
  const [pastDeadzone, setPastDeadzone] = useState(false);
  const [debugVec, setDebugVec] = useState({ x: 0, y: 0 });

  // === Optional D-PAD State ===
  const dpadRef = useRef<HTMLDivElement | null>(null);
  const dpadTouchesRef = useRef<Map<number, DirFlags>>(new Map());
  const dpadMouseActiveRef = useRef(false);
  const prevDirsRef = useRef<DirFlags>(EMPTY_DIRS);
  const [activeDirs, setActiveDirs] = useState<DirFlags>(EMPTY_DIRS);

  // === Right Action Visual Feedback States (zero vibration) ===
  const attackTouchIdsRef = useRef<Set<number>>(new Set());
  const attackMouseRef = useRef(false);
  const [attackHeld, setAttackHeld] = useState(false);
  const [dashPressed, setDashPressed] = useState(false);
  const [skillPressed, setSkillPressed] = useState(false);
  const [swapPressed, setSwapPressed] = useState(false);

  const emitMove = useCallback((jx: number, jy: number) => {
    setDebugVec({ x: jx, y: jy });
    onMoveRef.current(jx, jy);
  }, []);

  const updateAnalogFromCoords = useCallback(
    (clientX: number, clientY: number) => {
      const el = analogBaseRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = clientX - cx;
      const dy = clientY - cy;
      const dist = Math.hypot(dx, dy);
      const maxR = maxRadiusRef.current;

      const clampedDist = Math.min(dist, maxR);
      const angle = dist > 0.001 ? Math.atan2(dy, dx) : 0;
      const kx = Math.cos(angle) * clampedDist;
      const ky = Math.sin(angle) * clampedDist;
      setKnob({ x: kx, y: ky });

      const norm = clampedDist / maxR;
      if (norm <= DEADZONE_RATIO) {
        setPastDeadzone(false);
        emitMove(0, 0);
        return;
      }

      // 20% push -> ~0.20 slow walk; >=90% rim ("mentok") -> 1.00 full sprint
      const mag =
        norm >= 0.9
          ? 1.0
          : Math.min(1, 0.14 + ((norm - DEADZONE_RATIO) / (0.9 - DEADZONE_RATIO)) * 0.86);

      setPastDeadzone(true);
      emitMove(Math.cos(angle) * mag, Math.sin(angle) * mag);
    },
    [emitMove]
  );

  const resetAnalogStick = useCallback(() => {
    analogTouchIdRef.current = null;
    analogMouseActiveRef.current = false;
    setAnalogEngaged(false);
    setPastDeadzone(false);
    setKnob({ x: 0, y: 0 });
    emitMove(0, 0);
  }, [emitMove]);

  const syncCombinedDirs = useCallback(() => {
    let up = false;
    let down = false;
    let left = false;
    let right = false;

    for (const d of dpadTouchesRef.current.values()) {
      if (d.up) up = true;
      if (d.down) down = true;
      if (d.left) left = true;
      if (d.right) right = true;
    }

    if (up && down) {
      up = false;
      down = false;
    }
    if (left && right) {
      left = false;
      right = false;
    }

    const prev = prevDirsRef.current;
    if (
      prev.up !== up ||
      prev.down !== down ||
      prev.left !== left ||
      prev.right !== right
    ) {
      const nextDirs = { up, down, left, right };
      prevDirsRef.current = nextDirs;
      setActiveDirs(nextDirs);

      let jx = (right ? 1 : 0) - (left ? 1 : 0);
      let jy = (down ? 1 : 0) - (up ? 1 : 0);
      const len = Math.hypot(jx, jy);
      if (len > 1) {
        jx /= len;
        jy /= len;
      }
      emitMove(jx, jy);
    }
  }, [emitMove]);

  const resolveDpadPoint = useCallback((clientX: number, clientY: number): DirFlags => {
    const el = dpadRef.current;
    if (!el) return EMPTY_DIRS;
    const rect = el.getBoundingClientRect();
    const halfW = rect.width / 2;
    const halfH = rect.height / 2;
    const nx = (clientX - (rect.left + halfW)) / halfW;
    const ny = (clientY - (rect.top + halfH)) / halfH;

    const threshold = 0.25;
    let left = nx < -threshold;
    let right = nx > threshold;
    let up = ny < -threshold;
    let down = ny > threshold;

    if (!left && !right && !up && !down && Math.hypot(nx, ny) > 0.08) {
      if (Math.abs(nx) >= Math.abs(ny)) {
        if (nx < 0) left = true;
        else right = true;
      } else {
        if (ny < 0) up = true;
        else down = true;
      }
    }

    return { up, down, left, right };
  }, []);

  // Window mouse listeners so desktop mouse drag on analog/dpad/attack never drops when leaving bounds
  useEffect(() => {
    const onWinMouseMove = (e: MouseEvent) => {
      if (analogMouseActiveRef.current) {
        updateAnalogFromCoords(e.clientX, e.clientY);
      }
      if (dpadMouseActiveRef.current) {
        dpadTouchesRef.current.set(-1, resolveDpadPoint(e.clientX, e.clientY));
        syncCombinedDirs();
      }
    };

    const onWinMouseUp = () => {
      if (analogMouseActiveRef.current) {
        resetAnalogStick();
      }
      if (dpadMouseActiveRef.current) {
        dpadMouseActiveRef.current = false;
        dpadTouchesRef.current.delete(-1);
        syncCombinedDirs();
      }
      if (attackMouseRef.current) {
        attackMouseRef.current = false;
        if (attackTouchIdsRef.current.size === 0) {
          setAttackHeld(false);
          onAttackChangeRef.current(false);
        }
      }
    };

    window.addEventListener('mousemove', onWinMouseMove);
    window.addEventListener('mouseup', onWinMouseUp);
    return () => {
      window.removeEventListener('mousemove', onWinMouseMove);
      window.removeEventListener('mouseup', onWinMouseUp);
    };
  }, [resetAnalogStick, resolveDpadPoint, syncCombinedDirs, updateAnalogFromCoords]);

  // Only reset when controlMode changes or TouchControls unmounts (NEVER on HUD updates!)
  useEffect(() => {
    const dpadMap = dpadTouchesRef.current;
    const atkSet = attackTouchIdsRef.current;
    return () => {
      dpadMap.clear();
      atkSet.clear();
      analogTouchIdRef.current = null;
      analogMouseActiveRef.current = false;
      dpadMouseActiveRef.current = false;
      attackMouseRef.current = false;
      prevDirsRef.current = EMPTY_DIRS;
      onMoveRef.current(0, 0);
      onAttackChangeRef.current(false);
    };
  }, [controlMode]);

  const armInset = Math.round(dims.dpadPx * 0.325);
  const deadzonePx = Math.round(dims.analogPx * DEADZONE_RATIO * 2);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex items-end justify-between p-3.5 sm:p-6">
      {/* LEFT CONTROL: PS5-Style Anti-Slip Timber Analog (Default) + Temporary Debug Readout */}
      {controlMode === 'analog' ? (
        <div className="pointer-events-none flex flex-col items-start gap-1.5">
          {/* Temporary Debug Coordinates Above Analog */}
          <div className="rounded bg-black/65 px-2 py-0.5 text-[11px] font-mono-num text-amber-300">
            X: {debugVec.x.toFixed(2)} Y: {debugVec.y.toFixed(2)}
          </div>

          <div
            ref={analogBaseRef}
            onTouchStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
              sfx.unlock();
              const touch = e.changedTouches[0];
              if (!touch) return;
              analogTouchIdRef.current = touch.identifier;
              setAnalogEngaged(true);
              updateAnalogFromCoords(touch.clientX, touch.clientY);
            }}
            onTouchMove={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const activeId = analogTouchIdRef.current;
              let touch: React.Touch | undefined;
              for (let i = 0; i < e.changedTouches.length; i++) {
                if (activeId === null || e.changedTouches[i].identifier === activeId) {
                  touch = e.changedTouches[i];
                  break;
                }
              }
              if (!touch) {
                for (let i = 0; i < e.touches.length; i++) {
                  if (activeId === null || e.touches[i].identifier === activeId) {
                    touch = e.touches[i];
                    break;
                  }
                }
              }
              if (touch) {
                analogTouchIdRef.current = touch.identifier;
                updateAnalogFromCoords(touch.clientX, touch.clientY);
              }
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const activeId = analogTouchIdRef.current;
              for (let i = 0; i < e.changedTouches.length; i++) {
                if (activeId === null || e.changedTouches[i].identifier === activeId) {
                  resetAnalogStick();
                  return;
                }
              }
            }}
            onTouchCancel={(e) => {
              e.preventDefault();
              resetAnalogStick();
            }}
            onMouseDown={(e) => {
              if (e.button !== 0) return;
              e.preventDefault();
              e.stopPropagation();
              sfx.unlock();
              analogMouseActiveRef.current = true;
              setAnalogEngaged(true);
              updateAnalogFromCoords(e.clientX, e.clientY);
            }}
            style={{ width: dims.analogPx, height: dims.analogPx }}
            className={`pointer-events-auto relative flex items-center justify-center rounded-full border-[3px] shadow-xl select-none touch-none transition-opacity ${
              analogEngaged
                ? 'border-[#A8763E] bg-[#140F0A]/75 opacity-85'
                : 'border-[#734F2B] bg-[#100D09]/70 opacity-60'
            }`}
            aria-label="Analog Anti Licin"
          >
            {/* Inner Wooden Bark Rim Guide */}
            <div className="pointer-events-none absolute inset-1.5 rounded-full border border-[#543A21]/75" />

            {/* Subtle 8-Direction Precision Rim Notches */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
              <span
                key={deg}
                className="pointer-events-none absolute h-1.5 w-0.5 rounded-full bg-[#B48246]/55"
                style={{
                  transform: `rotate(${deg}deg) translateY(-${Math.round(dims.analogPx / 2) - 5}px)`,
                }}
              />
            ))}

            {/* 15% Deadzone Center Indicator Ring */}
            <div
              style={{ width: deadzonePx, height: deadzonePx }}
              className={`pointer-events-none absolute rounded-full border transition-colors ${
                pastDeadzone
                  ? 'border-amber-400/35 bg-amber-500/10'
                  : 'border-[#7A5B3A]/60 bg-[#1B140E]/70'
              }`}
            />

            {/* Tactile Ironwood Thumbstick Knob (clamped inside wooden rim, 0ms instant stop) */}
            <div
              style={{
                width: dims.knobPx,
                height: dims.knobPx,
                transform: `translate3d(${knob.x}px, ${knob.y}px, 0)`,
              }}
              className={`pointer-events-none relative flex items-center justify-center rounded-full border-2 shadow-lg ${
                pastDeadzone
                  ? 'border-amber-300 bg-gradient-to-b from-[#694927] to-[#332211] shadow-[0_0_12px_rgba(251,191,36,0.35)]'
                  : 'border-[#966C3E] bg-gradient-to-b from-[#49331C] to-[#23180D]'
              }`}
            >
              <div className="h-3/5 w-3/5 rounded-full border border-white/15 bg-black/25" />
            </div>
          </div>
        </div>
      ) : (
        /* Optional D-PAD (Only shown if user explicitly selects D-PAD in Settings) */
        <div
          ref={dpadRef}
          onTouchStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
            sfx.unlock();
            for (let i = 0; i < e.changedTouches.length; i++) {
              const t = e.changedTouches[i];
              dpadTouchesRef.current.set(t.identifier, resolveDpadPoint(t.clientX, t.clientY));
            }
            syncCombinedDirs();
          }}
          onTouchMove={(e) => {
            e.preventDefault();
            e.stopPropagation();
            for (let i = 0; i < e.changedTouches.length; i++) {
              const t = e.changedTouches[i];
              dpadTouchesRef.current.set(t.identifier, resolveDpadPoint(t.clientX, t.clientY));
            }
            syncCombinedDirs();
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            e.stopPropagation();
            for (let i = 0; i < e.changedTouches.length; i++) {
              dpadTouchesRef.current.delete(e.changedTouches[i].identifier);
            }
            syncCombinedDirs();
          }}
          onTouchCancel={(e) => {
            e.preventDefault();
            for (let i = 0; i < e.changedTouches.length; i++) {
              dpadTouchesRef.current.delete(e.changedTouches[i].identifier);
            }
            syncCombinedDirs();
          }}
          onMouseDown={(e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            e.stopPropagation();
            sfx.unlock();
            dpadMouseActiveRef.current = true;
            dpadTouchesRef.current.set(-1, resolveDpadPoint(e.clientX, e.clientY));
            syncCombinedDirs();
          }}
          style={{ width: dims.dpadPx, height: dims.dpadPx }}
          className="pointer-events-auto relative select-none touch-none opacity-60 transition-opacity active:opacity-85"
          aria-label="D-PAD 8 Arah"
        >
          <div
            style={{ left: armInset, right: armInset, top: 4, bottom: '63%' }}
            className={`pointer-events-none absolute flex items-center justify-center rounded-t-md border-2 ${
              activeDirs.up
                ? 'border-amber-300 bg-[#3B2A18] text-amber-200'
                : 'border-[#5E4831] bg-[#221B15]/95 text-[#E5D5B5]'
            }`}
          >
            <ArrowUp className="h-6 w-6 stroke-[2.6]" />
          </div>
          <div
            style={{ left: armInset, right: armInset, bottom: 4, top: '63%' }}
            className={`pointer-events-none absolute flex items-center justify-center rounded-b-md border-2 ${
              activeDirs.down
                ? 'border-amber-300 bg-[#3B2A18] text-amber-200'
                : 'border-[#5E4831] bg-[#221B15]/95 text-[#E5D5B5]'
            }`}
          >
            <ArrowDown className="h-6 w-6 stroke-[2.6]" />
          </div>
          <div
            style={{ top: armInset, bottom: armInset, left: 4, right: '63%' }}
            className={`pointer-events-none absolute flex items-center justify-center rounded-l-md border-2 ${
              activeDirs.left
                ? 'border-amber-300 bg-[#3B2A18] text-amber-200'
                : 'border-[#5E4831] bg-[#221B15]/95 text-[#E5D5B5]'
            }`}
          >
            <ArrowLeft className="h-6 w-6 stroke-[2.6]" />
          </div>
          <div
            style={{ top: armInset, bottom: armInset, right: 4, left: '63%' }}
            className={`pointer-events-none absolute flex items-center justify-center rounded-r-md border-2 ${
              activeDirs.right
                ? 'border-amber-300 bg-[#3B2A18] text-amber-200'
                : 'border-[#5E4831] bg-[#221B15]/95 text-[#E5D5B5]'
            }`}
          >
            <ArrowRight className="h-6 w-6 stroke-[2.6]" />
          </div>
          <div
            style={{ left: armInset, right: armInset, top: armInset, bottom: armInset }}
            className="pointer-events-none absolute flex items-center justify-center rounded-sm border border-[#4B3A29] bg-[#1A1511]"
          />
        </div>
      )}

      {/* RIGHT ACTION CLUSTER: Attack, Dash, Skill Ultimate, Ganti Senjata (60% opacity, ZERO vibrate, visual scale feedback) */}
      <div className="pointer-events-auto flex items-end gap-3 select-none opacity-60 transition-opacity hover:opacity-80 active:opacity-90">
        {/* Quick Weapon Swap beside Attack */}
        <button
          type="button"
          onTouchStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
            sfx.unlock();
            setSwapPressed(true);
            onSwapWeapon();
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            setSwapPressed(false);
          }}
          onTouchCancel={() => setSwapPressed(false)}
          onMouseDown={(e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            e.stopPropagation();
            sfx.unlock();
            setSwapPressed(true);
            onSwapWeapon();
          }}
          onMouseUp={() => setSwapPressed(false)}
          onMouseLeave={() => setSwapPressed(false)}
          style={{ width: dims.swapPx, height: dims.swapPx }}
          className={`flex items-center justify-center rounded-full border-2 border-[#4A6252] bg-[#142018]/90 text-slate-200 shadow-lg transition-transform duration-75 touch-none cursor-pointer ${
            swapPressed ? 'scale-110 border-amber-300 text-amber-200' : 'scale-100'
          }`}
          aria-label="Ganti Senjata"
        >
          <Repeat className="h-4 w-4" />
        </button>

        {/* Vertical Stack: SKILL ULTIMATE -> DASH -> ATTACK */}
        <div className="flex flex-col items-center gap-2.5">
          {/* Top: SKILL / ULTIMATE */}
          <button
            type="button"
            onTouchStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
              sfx.unlock();
              setSkillPressed(true);
              onSkill();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              setSkillPressed(false);
            }}
            onTouchCancel={() => setSkillPressed(false)}
            onMouseDown={(e) => {
              if (e.button !== 0) return;
              e.preventDefault();
              e.stopPropagation();
              sfx.unlock();
              setSkillPressed(true);
              onSkill();
            }}
            onMouseUp={() => setSkillPressed(false)}
            onMouseLeave={() => setSkillPressed(false)}
            style={{ width: dims.ultPx, height: dims.ultPx }}
            className={`relative flex flex-col items-center justify-center rounded-full border-2 text-[10px] font-bold shadow-lg transition-transform duration-75 touch-none cursor-pointer ${
              skillPressed ? 'scale-110' : 'scale-100'
            } ${
              skillCooldown > 0
                ? 'border-slate-600/80 bg-[#141C17]/85 text-slate-400'
                : isUltimateHero
                ? 'border-red-400/90 bg-red-900/75 text-red-100'
                : 'border-sky-400/85 bg-sky-900/70 text-sky-100'
            }`}
            aria-label="Skill Ultimate"
          >
            {skillCooldown > 0 ? (
              <span className="font-mono-num text-xs">{skillCooldown.toFixed(1)}</span>
            ) : (
              <>
                {isUltimateHero ? (
                  <Flame className="h-5 w-5 text-amber-300" />
                ) : (
                  <Zap className="h-5 w-5" />
                )}
                <span className="text-[9px] tracking-tight">ULT</span>
              </>
            )}
          </button>

          {/* Middle: Small DASH */}
          <button
            type="button"
            onTouchStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
              sfx.unlock();
              setDashPressed(true);
              onDash();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              setDashPressed(false);
            }}
            onTouchCancel={() => setDashPressed(false)}
            onMouseDown={(e) => {
              if (e.button !== 0) return;
              e.preventDefault();
              e.stopPropagation();
              sfx.unlock();
              setDashPressed(true);
              onDash();
            }}
            onMouseUp={() => setDashPressed(false)}
            onMouseLeave={() => setDashPressed(false)}
            style={{ width: dims.dashPx, height: dims.dashPx }}
            className={`relative flex flex-col items-center justify-center rounded-full border-2 text-[9px] font-bold shadow-lg transition-transform duration-75 touch-none cursor-pointer ${
              dashPressed ? 'scale-110' : 'scale-100'
            } ${
              dodgeDashCooldown > 0
                ? 'border-slate-600/80 bg-[#141C17]/85 text-slate-400'
                : 'border-emerald-400/85 bg-emerald-900/70 text-emerald-100'
            }`}
            aria-label="Dash"
          >
            {dodgeDashCooldown > 0 ? (
              <span className="font-mono-num text-[11px]">{dodgeDashCooldown.toFixed(1)}</span>
            ) : (
              <>
                <Wind className="h-4 w-4" />
                <span className="text-[9px]">DASH</span>
              </>
            )}
          </button>

          {/* Bottom: Large Holdable ATTACK (enlarges on press for visual feedback, zero vibrate) */}
          <button
            type="button"
            onTouchStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
              sfx.unlock();
              for (let i = 0; i < e.changedTouches.length; i++) {
                attackTouchIdsRef.current.add(e.changedTouches[i].identifier);
              }
              setAttackHeld(true);
              onAttackChangeRef.current(true);
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              for (let i = 0; i < e.changedTouches.length; i++) {
                attackTouchIdsRef.current.delete(e.changedTouches[i].identifier);
              }
              if (attackTouchIdsRef.current.size === 0 && !attackMouseRef.current) {
                setAttackHeld(false);
                onAttackChangeRef.current(false);
              }
            }}
            onTouchCancel={(e) => {
              e.preventDefault();
              for (let i = 0; i < e.changedTouches.length; i++) {
                attackTouchIdsRef.current.delete(e.changedTouches[i].identifier);
              }
              if (attackTouchIdsRef.current.size === 0 && !attackMouseRef.current) {
                setAttackHeld(false);
                onAttackChangeRef.current(false);
              }
            }}
            onMouseDown={(e) => {
              if (e.button !== 0) return;
              e.preventDefault();
              e.stopPropagation();
              sfx.unlock();
              attackMouseRef.current = true;
              setAttackHeld(true);
              onAttackChangeRef.current(true);
            }}
            style={{ width: dims.attackPx, height: dims.attackPx }}
            className={`flex flex-col items-center justify-center gap-1 rounded-full border-2 shadow-xl transition-transform duration-75 touch-none cursor-pointer ${
              attackHeld
                ? 'scale-110 border-amber-300 bg-amber-600/85 text-white shadow-[0_0_20px_rgba(251,191,36,0.5)]'
                : 'scale-100 border-amber-400/85 bg-[#2A1D11]/90 text-amber-100'
            }`}
            aria-label="Serang"
          >
            <Sword className="h-7 w-7" />
            <span className="text-[10px] font-bold tracking-wide">SERANG</span>
          </button>
        </div>
      </div>
    </div>
  );
}
