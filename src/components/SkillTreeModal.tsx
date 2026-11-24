import { Check, Flame, Lock, Shield, Sparkles, Sun, X } from 'lucide-react';
import { HERO_CLASSES } from '../game/data';
import { PlayerState, SkillNodeDef } from '../game/types';

interface SkillTreeModalProps {
  player: PlayerState;
  onUnlock: (skillId: string) => void;
  onClose: () => void;
}

export function SkillTreeModal({ player, onUnlock, onClose }: SkillTreeModalProps) {
  const cls = HERO_CLASSES[player.classId];
  const baseSkills = cls.skills.filter((s) => s.branch === 'base');
  const surgaSkills = cls.skills
    .filter((s) => s.branch === 'surga')
    .sort((a, b) => a.tier - b.tier);
  const nerakaSkills = cls.skills
    .filter((s) => s.branch === 'neraka')
    .sort((a, b) => a.tier - b.tier);

  const renderNode = (node: SkillNodeDef) => {
    const unlocked = player.unlockedSkills.includes(node.id);
    const levelMet = player.level >= node.minLevel;
    const reqMet = !node.requires || player.unlockedSkills.includes(node.requires);
    const pathConflict =
      node.branch !== 'base' &&
      player.chosenPath !== null &&
      player.chosenPath !== node.branch;
    const canUnlock =
      !unlocked &&
      !pathConflict &&
      levelMet &&
      reqMet &&
      player.skillPoints >= node.cost;

    const isSurga = node.branch === 'surga';
    const isNeraka = node.branch === 'neraka';

    let cardStyle = 'border-[#22352A] bg-[#0B120E]';
    if (unlocked) {
      if (isSurga) cardStyle = 'border-sky-400/80 bg-[#0D2129]';
      else if (isNeraka) cardStyle = 'border-red-500/80 bg-[#270E11]';
      else cardStyle = 'border-emerald-400/75 bg-[#13291D]';
    } else if (pathConflict) {
      cardStyle = 'border-[#1E2421] bg-[#090D0B] opacity-55';
    } else if (canUnlock) {
      if (isSurga) cardStyle = 'border-yellow-400/75 bg-[#112026]';
      else if (isNeraka) cardStyle = 'border-orange-400/75 bg-[#24110E]';
      else cardStyle = 'border-amber-400/75 bg-[#1B2216]';
    } else if (isSurga) {
      cardStyle = 'border-sky-900/60 bg-[#0B151A]';
    } else if (isNeraka) {
      cardStyle = 'border-red-900/60 bg-[#170C0E]';
    }

    let buttonLabel = 'Pelajari Skill';
    if (unlocked) buttonLabel = 'Sudah Dipelajari';
    else if (pathConflict) buttonLabel = 'Terkunci (Jalur Lain Dipilih)';
    else if (!levelMet) buttonLabel = `Butuh Level ${node.minLevel}`;
    else if (!reqMet) buttonLabel = 'Butuh Skill Sebelumnya';
    else if (player.skillPoints < node.cost) buttonLabel = 'Skill Point Kurang';

    let buttonStyle = 'bg-[#15211A] text-slate-500 cursor-not-allowed';
    if (unlocked) {
      if (isSurga) buttonStyle = 'bg-sky-950/70 text-sky-300 cursor-default';
      else if (isNeraka) buttonStyle = 'bg-red-950/70 text-red-300 cursor-default';
      else buttonStyle = 'bg-emerald-950/60 text-emerald-300 cursor-default';
    } else if (canUnlock) {
      if (isSurga) {
        buttonStyle =
          'bg-sky-400 text-slate-950 hover:bg-sky-300 cursor-pointer';
      } else if (isNeraka) {
        buttonStyle =
          'bg-red-500 text-white hover:bg-red-400 cursor-pointer';
      } else {
        buttonStyle =
          'bg-amber-500 text-slate-950 hover:bg-amber-400 cursor-pointer';
      }
    }

    return (
      <div
        key={node.id}
        className={`flex flex-col justify-between rounded border p-3.5 transition-colors ${cardStyle}`}
      >
        <div>
          <div className="flex items-center justify-between gap-2">
            <span
              className={`text-[11px] font-mono-num font-semibold ${
                isSurga
                  ? 'text-sky-300'
                  : isNeraka
                  ? 'text-orange-400'
                  : 'text-slate-400'
              }`}
            >
              Tier {node.tier} ·{' '}
              {isSurga
                ? `Surga Lv.${node.minLevel}+`
                : isNeraka
                ? `Neraka Lv.${node.minLevel}+`
                : 'Dasar'}
            </span>
            {unlocked ? (
              <span
                className={`inline-flex items-center gap-1 text-xs font-semibold ${
                  isSurga
                    ? 'text-sky-300'
                    : isNeraka
                    ? 'text-red-300'
                    : 'text-emerald-300'
                }`}
              >
                <Check className="h-3.5 w-3.5" />
                Aktif
              </span>
            ) : pathConflict || !levelMet || !reqMet ? (
              <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                <Lock className="h-3.5 w-3.5" />
                Terkunci
              </span>
            ) : (
              <span className="text-xs font-mono-num text-amber-300">
                {node.cost} Point
              </span>
            )}
          </div>

          <h4 className="mt-1.5 text-sm font-bold text-white">{node.name}</h4>
          <p className="mt-1 text-xs leading-relaxed text-slate-300">{node.summary}</p>
        </div>

        <button
          type="button"
          disabled={!canUnlock}
          onClick={() => onUnlock(node.id)}
          className={`mt-3 rounded px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${buttonStyle}`}
        >
          {buttonLabel}
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded border border-[#2B4435] bg-[#0F1813] text-[#E6ECE7] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#22362B] px-5 py-3.5">
          <div>
            <h2 className="font-pixel text-base text-emerald-300 sm:text-lg">
              SKILL TREE: {cls.name.toUpperCase()}
            </h2>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono-num">
              <span>
                Level {player.level} · Skill Point:{' '}
                <strong className="text-amber-300">{player.skillPoints}</strong>
              </span>
              {player.chosenPath && (
                <span
                  className={`font-bold ${
                    player.chosenPath === 'surga' ? 'text-sky-300' : 'text-red-400'
                  }`}
                >
                  · Jalur Aktif:{' '}
                  {player.chosenPath === 'surga' ? 'JALUR SURGA' : 'JALUR NERAKA'}
                </span>
              )}
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

        <div className="flex items-center gap-3 border-b border-[#1E3126] bg-[#0B120E] px-5 py-3 text-xs">
          <Sparkles className="h-4 w-4 shrink-0 text-amber-400" />
          <div>
            <span className="font-semibold text-white">Skill Aktif [Shift]: </span>
            <span className="text-amber-300">{cls.activeSkillName}</span>
            <span className="text-slate-400"> — {cls.activeSkillDesc}</span>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                Tier 1 · Skill Dasar (Level 1+)
              </h3>
              <span className="text-[11px] text-slate-400">
                Bisa dipelajari kedua cabang dasar
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {baseSkills.map((node) => renderNode(node))}
            </div>
          </div>

          <div className="rounded border border-[#263C2F] bg-[#0B120E] px-4 py-2.5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-amber-300">
                Pilihan Cabang Level 5: Jalur Surga vs Jalur Neraka
              </span>
              <span className="text-[11px] text-slate-400">
                {player.chosenPath
                  ? `Kamu memilih ${
                      player.chosenPath === 'surga' ? 'Jalur Surga' : 'Jalur Neraka'
                    } (cabang lain terkunci)`
                  : player.level >= 5
                  ? 'Level 5 tercapai! Pilih satu jalur eksklusif.'
                  : `Terbuka di Level 5 (Sekarang Lv.${player.level})`}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Jalur Surga */}
            <div className="space-y-3 rounded border border-sky-500/45 bg-[#081318] p-3.5">
              <div className="flex items-center justify-between border-b border-sky-500/30 pb-2">
                <div className="flex items-center gap-2">
                  <Sun className="h-4 w-4 text-yellow-300" />
                  <span className="font-pixel text-xs text-sky-300">JALUR SURGA</span>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-yellow-200">
                  <Shield className="h-3 w-3" />
                  Heal · Shield · Cahaya
                </span>
              </div>
              <div className="space-y-3">
                {surgaSkills.map((node) => renderNode(node))}
              </div>
            </div>

            {/* Jalur Neraka */}
            <div className="space-y-3 rounded border border-red-500/45 bg-[#160A0C] p-3.5">
              <div className="flex items-center justify-between border-b border-red-500/30 pb-2">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-orange-400" />
                  <span className="font-pixel text-xs text-red-400">JALUR NERAKA</span>
                </div>
                <span className="text-[11px] font-medium text-orange-300">
                  Racun · Api · Damage Gila
                </span>
              </div>
              <div className="space-y-3">
                {nerakaSkills.map((node) => renderNode(node))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
