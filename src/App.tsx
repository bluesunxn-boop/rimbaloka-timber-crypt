/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { BlacksmithModal } from './components/BlacksmithModal';
import { ClassSelectScreen } from './components/ClassSelectScreen';
import { CollectionModal } from './components/CollectionModal';
import { ControlSettingsModal } from './components/ControlSettingsModal';
import { GachaShrineModal } from './components/GachaShrineModal';
import { GameHUD } from './components/GameHUD';
import { InventoryModal } from './components/InventoryModal';
import { RunEndModal } from './components/RunEndModal';
import { SkillTreeModal } from './components/SkillTreeModal';
import { TouchControls } from './components/TouchControls';
import { sfx } from './game/audio';
import { CHARACTER_MAP, isCharacterSynergyActive } from './game/data';
import { GameEngine } from './game/engine';
import {
  clearActiveRun,
  loadActiveRun,
  loadMetaProgress,
  saveActiveRun,
} from './game/storage';
import {
  ActiveRunSave,
  GameScreen,
  HeroClassId,
  HudSnapshot,
  MetaProgress,
} from './game/types';

export default function App() {
  const [screen, setScreen] = useState<GameScreen>('CLASS_SELECT');
  const [selectedClass, setSelectedClass] = useState<HeroClassId>('knight');
  const [savedRun, setSavedRun] = useState<ActiveRunSave | null>(() => loadActiveRun());
  const [meta, setMeta] = useState<MetaProgress>(() => loadMetaProgress());
  const [blacksmithOpen, setBlacksmithOpen] = useState(false);
  const [gachaOpen, setGachaOpen] = useState(false);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hud, setHud] = useState<HudSnapshot | null>(null);
  const [muted, setMuted] = useState(false);
  const [toast, setToast] = useState<{ text: string; color: string } | null>(null);
  const [, setUiTick] = useState(0);
  const [showTouchControls, setShowTouchControls] = useState(() => {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 820;
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const screenRef = useRef<GameScreen>(screen);
  screenRef.current = screen;

  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback((text: string, color = '#E6ECE7') => {
    setToast({ text, color });
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  const attachEngineCallbacks = useCallback(
    (eng: GameEngine) => {
      eng.onHudUpdate = (snapshot) => setHud(snapshot);
      eng.onToast = (msg, color) => showToast(msg, color);
      eng.onVictory = () => {
        setMeta(loadMetaProgress());
        setScreen('VICTORY');
      };
      eng.onGameOver = () => {
        clearActiveRun();
        setSavedRun(null);
        setMeta(loadMetaProgress());
        setScreen('GAME_OVER');
      };
      eng.emitHud();
    },
    [showToast]
  );

  const startNewRun = useCallback(
    (classId: HeroClassId) => {
      sfx.unlock();
      clearActiveRun();
      const latestMeta = loadMetaProgress();
      const charId = latestMeta.selectedCharacterId ?? 'bram';
      if (isCharacterSynergyActive(charId, classId)) {
        sfx.synergyEpic();
      }
      const eng = new GameEngine(classId, charId, null);
      engineRef.current = eng;
      attachEngineCallbacks(eng);
      setSavedRun(loadActiveRun());
      setMeta(latestMeta);
      setScreen('PLAYING');
    },
    [attachEngineCallbacks]
  );

  const resumeSavedRun = useCallback(() => {
    sfx.unlock();
    const active = loadActiveRun();
    if (!active) return;
    const eng = new GameEngine(
      active.player.classId,
      active.player.characterId ?? 'bram',
      active
    );
    engineRef.current = eng;
    attachEngineCallbacks(eng);
    setScreen('PLAYING');
  }, [attachEngineCallbacks]);

  const handleTouchMove = useCallback((jx: number, jy: number) => {
    const eng = engineRef.current;
    if (!eng) return;
    eng.input.joyX = jx;
    eng.input.joyY = jy;
  }, []);

  const handleTouchAttackChange = useCallback((active: boolean) => {
    const eng = engineRef.current;
    if (!eng) return;
    sfx.unlock();
    eng.input.pointerAimActive = false;
    eng.input.attack = active;
  }, []);

  const handleTouchDash = useCallback(() => {
    const eng = engineRef.current;
    if (!eng) return;
    sfx.unlock();
    eng.performQuickDash();
  }, []);

  const handleTouchSkill = useCallback(() => {
    const eng = engineRef.current;
    if (!eng) return;
    sfx.unlock();
    eng.performActiveSkill();
  }, []);

  const handleTouchSwap = useCallback(() => {
    engineRef.current?.switchWeapon();
  }, []);

  // Main 60fps animation loop
  useEffect(() => {
    if (screen === 'CLASS_SELECT') return;

    let rafId = 0;
    let lastTime = performance.now();

    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const frame = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      const eng = engineRef.current;
      const canvas = canvasRef.current;
      if (eng && canvas) {
        if (screenRef.current === 'PLAYING') {
          eng.update(dt);
        }
        const ctx = canvas.getContext('2d');
        if (ctx) {
          eng.render(ctx, canvas.width, canvas.height);
        }
      }
      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, [screen]);

  // Keyboard bindings (WASD, Arrows, Space, Shift, Q, H, I, K, Esc)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const eng = engineRef.current;
      const code = e.code;

      if (code === 'Escape' || code === 'KeyP') {
        if (screenRef.current === 'PLAYING') {
          setScreen('PAUSED');
        } else if (
          screenRef.current === 'PAUSED' ||
          screenRef.current === 'INVENTORY' ||
          screenRef.current === 'SKILL_TREE'
        ) {
          setScreen('PLAYING');
        }
        return;
      }

      if (!eng) return;

      if (code === 'KeyI' || code === 'Tab') {
        e.preventDefault();
        if (screenRef.current === 'PLAYING') setScreen('INVENTORY');
        else if (screenRef.current === 'INVENTORY') setScreen('PLAYING');
        return;
      }

      if (code === 'KeyK') {
        if (screenRef.current === 'PLAYING') setScreen('SKILL_TREE');
        else if (screenRef.current === 'SKILL_TREE') setScreen('PLAYING');
        return;
      }

      if (screenRef.current !== 'PLAYING') return;

      sfx.unlock();

      if (code === 'KeyW' || code === 'ArrowUp') eng.input.up = true;
      if (code === 'KeyS' || code === 'ArrowDown') eng.input.down = true;
      if (code === 'KeyA' || code === 'ArrowLeft') eng.input.left = true;
      if (code === 'KeyD' || code === 'ArrowRight') eng.input.right = true;

      if (code === 'Space') {
        e.preventDefault();
        eng.input.pointerAimActive = false;
        eng.input.attack = true;
      }
      if (code === 'ShiftLeft' || code === 'ShiftRight' || code === 'KeyF') {
        eng.input.skill = true;
      }
      if (code === 'KeyQ' && !e.repeat) {
        eng.switchWeapon();
      }
      if (code === 'KeyH' && !e.repeat) {
        eng.usePotion();
      }
      if ((code === 'KeyE' || code === 'KeyC') && !e.repeat) {
        eng.performQuickDash();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const eng = engineRef.current;
      if (!eng) return;
      const code = e.code;
      if (code === 'KeyW' || code === 'ArrowUp') eng.input.up = false;
      if (code === 'KeyS' || code === 'ArrowDown') eng.input.down = false;
      if (code === 'KeyA' || code === 'ArrowLeft') eng.input.left = false;
      if (code === 'KeyD' || code === 'ArrowRight') eng.input.right = false;
      if (code === 'Space') eng.input.attack = false;
      if (code === 'ShiftLeft' || code === 'ShiftRight' || code === 'KeyF') {
        eng.input.skill = false;
      }
    };

    const onBlur = () => {
      const eng = engineRef.current;
      if (!eng) return;
      eng.input.up = false;
      eng.input.down = false;
      eng.input.left = false;
      eng.input.right = false;
      eng.input.attack = false;
      eng.input.skill = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  if (screen === 'CLASS_SELECT') {
    return (
      <>
        <ClassSelectScreen
          selectedClass={selectedClass}
          onSelectClass={setSelectedClass}
          onStartNewRun={startNewRun}
          savedRun={savedRun}
          onResumeRun={resumeSavedRun}
          onOpenBlacksmith={() => {
            setMeta(loadMetaProgress());
            setBlacksmithOpen(true);
          }}
          onOpenGacha={() => {
            setMeta(loadMetaProgress());
            setGachaOpen(true);
          }}
          onOpenCollection={() => {
            setMeta(loadMetaProgress());
            setCollectionOpen(true);
          }}
          onOpenSettings={() => {
            setMeta(loadMetaProgress());
            setSettingsOpen(true);
          }}
          meta={meta}
        />
        {blacksmithOpen && (
          <BlacksmithModal
            meta={meta}
            onMetaChange={setMeta}
            onClose={() => setBlacksmithOpen(false)}
          />
        )}
        {gachaOpen && (
          <GachaShrineModal
            meta={meta}
            selectedClass={selectedClass}
            onMetaChange={setMeta}
            onClose={() => setGachaOpen(false)}
          />
        )}
        {collectionOpen && (
          <CollectionModal
            meta={meta}
            selectedClass={selectedClass}
            onMetaChange={setMeta}
            onOpenGacha={() => {
              setCollectionOpen(false);
              setGachaOpen(true);
            }}
            onClose={() => setCollectionOpen(false)}
          />
        )}
        {settingsOpen && (
          <ControlSettingsModal
            meta={meta}
            showTouchControls={showTouchControls}
            muted={muted}
            onMetaChange={setMeta}
            onToggleTouchControls={() => setShowTouchControls((v) => !v)}
            onToggleMute={() => {
              sfx.muted = !muted;
              setMuted(!muted);
            }}
            onClose={() => setSettingsOpen(false)}
          />
        )}
      </>
    );
  }

  const engine = engineRef.current;

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#070C09]">
      <canvas
        ref={canvasRef}
        onPointerDown={(e) => {
          if (screen !== 'PLAYING' || !engine) return;
          if (e.pointerType === 'touch') return;
          sfx.unlock();
          engine.setPointerScreenPos(
            e.clientX,
            e.clientY,
            window.innerWidth,
            window.innerHeight
          );
          engine.input.attack = true;
        }}
        onPointerMove={(e) => {
          if (screen !== 'PLAYING' || !engine) return;
          if (e.pointerType === 'touch') return;
          if (engine.input.attack) {
            engine.setPointerScreenPos(
              e.clientX,
              e.clientY,
              window.innerWidth,
              window.innerHeight
            );
          }
        }}
        onPointerUp={(e) => {
          if (!engine || e.pointerType === 'touch') return;
          engine.input.attack = false;
        }}
        className="block h-full w-full cursor-crosshair pixelated"
      />

      {hud && (
        <GameHUD
          hud={hud}
          muted={muted}
          showTouchControls={showTouchControls}
          toast={toast}
          onToggleMute={() => {
            sfx.muted = !muted;
            setMuted(!muted);
          }}
          onToggleTouchControls={() => setShowTouchControls((v) => !v)}
          onOpenInventory={() => setScreen('INVENTORY')}
          onOpenSkillTree={() => setScreen('SKILL_TREE')}
          onOpenSettings={() => {
            setMeta(loadMetaProgress());
            setSettingsOpen(true);
          }}
          onPause={() => setScreen('PAUSED')}
          onSwitchWeapon={() => engine?.switchWeapon()}
          onUsePotion={() => engine?.usePotion()}
        />
      )}

      {showTouchControls &&
        screen === 'PLAYING' &&
        !settingsOpen &&
        !blacksmithOpen &&
        !gachaOpen &&
        !collectionOpen &&
        hud && (
          <TouchControls
            controlMode={meta.controlMode}
            dpadSize={meta.dpadSize}
            skillCooldown={hud.skillCooldown}
            dodgeDashCooldown={hud.dodgeDashCooldown}
            isUltimateHero={Boolean(CHARACTER_MAP[hud.characterId]?.isUltimate)}
            onMove={handleTouchMove}
            onAttackChange={handleTouchAttackChange}
            onDash={handleTouchDash}
            onSkill={handleTouchSkill}
            onSwapWeapon={handleTouchSwap}
          />
        )}

      {screen === 'INVENTORY' && engine && (
        <InventoryModal
          player={engine.player}
          onClose={() => setScreen('PLAYING')}
          onEquip={(uid, slot) => {
            engine.equipFromBackpack(uid, slot);
            setUiTick((t) => t + 1);
          }}
          onSalvage={(uid) => {
            const gain = engine.salvageWeapon(uid);
            if (gain > 0) showToast(`Didaur ulang jadi +${gain} Kayu`, '#F59E0B');
            setUiTick((t) => t + 1);
          }}
          onCraft={(recipeId) => {
            const res = engine.craftItem(recipeId);
            setUiTick((t) => t + 1);
            return res;
          }}
          onBuyPotionWithGold={() => {
            const res = engine.buyPotionWithGold();
            setUiTick((t) => t + 1);
            return res;
          }}
        />
      )}

      {screen === 'SKILL_TREE' && engine && (
        <SkillTreeModal
          player={engine.player}
          onUnlock={(skillId) => {
            engine.unlockSkill(skillId);
            setUiTick((t) => t + 1);
          }}
          onClose={() => setScreen('PLAYING')}
        />
      )}

      {(screen === 'PAUSED' || screen === 'VICTORY' || screen === 'GAME_OVER') && hud && (
        <RunEndModal
          mode={screen}
          hud={hud}
          onResume={() => setScreen('PLAYING')}
          onNextFloor={() => {
            engine?.descendToNextFloor();
            setScreen('PLAYING');
          }}
          onRestartSameClass={() => startNewRun(hud.classId)}
          onOpenSettings={() => {
            setMeta(loadMetaProgress());
            setSettingsOpen(true);
          }}
          onBackToClassSelect={() => {
            if (engine && screen !== 'GAME_OVER') {
              saveActiveRun(engine.player, engine.dungeon.floor, engine.dayCycleTime);
            }
            setSavedRun(loadActiveRun());
            setMeta(loadMetaProgress());
            setScreen('CLASS_SELECT');
          }}
        />
      )}

      {settingsOpen && (
        <ControlSettingsModal
          meta={meta}
          showTouchControls={showTouchControls}
          muted={muted}
          onMetaChange={setMeta}
          onToggleTouchControls={() => setShowTouchControls((v) => !v)}
          onToggleMute={() => {
            sfx.muted = !muted;
            setMuted(!muted);
          }}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
