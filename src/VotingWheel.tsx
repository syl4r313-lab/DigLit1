/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, RotateCcw, Play } from 'lucide-react';

const COLORS = ['#00FFC2','#FF6B6B','#FFD93D','#4D96FF','#C77DFF','#FF9F1C','#6BCB77','#F72585'];

interface Option { id: number; label: string; votes: number; }

function angleToXY(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function pieSlicePath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const span = endDeg - startDeg;
  if (span >= 359.99) return `M ${cx},${cy - r} A ${r},${r} 0 1 1 ${cx - 0.001},${cy - r} Z`;
  const s = angleToXY(cx, cy, r, startDeg);
  const e = angleToXY(cx, cy, r, endDeg);
  return `M ${cx},${cy} L ${s.x},${s.y} A ${r},${r} 0 ${span > 180 ? 1 : 0} 1 ${e.x},${e.y} Z`;
}

const CX = 200, CY = 200, R = 175;

export default function VotingWheel() {
  const [options, setOptions] = useState<Option[]>([
    { id: 1, label: 'Option A', votes: 0 },
    { id: 2, label: 'Option B', votes: 0 },
    { id: 3, label: 'Option C', votes: 0 },
  ]);
  const [newLabel, setNewLabel] = useState('');
  const [spinDeg, setSpinDeg] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const nextId = useRef(4);
  const totalVotes = options.reduce((sum, o) => sum + o.votes, 0);

  const slices = (() => {
    let angle = 0;
    return options.map((opt, i) => {
      const frac = totalVotes > 0 ? opt.votes / totalVotes : 1 / options.length;
      const sweep = frac * 360;
      const start = angle;
      angle += sweep;
      return { ...opt, start, sweep, color: COLORS[i % COLORS.length] };
    });
  })();

  const addOption = () => {
    const label = newLabel.trim();
    if (!label || options.length >= 8) return;
    setOptions(prev => [...prev, { id: nextId.current++, label, votes: 0 }]);
    setNewLabel('');
  };
  const castVote = (id: number) => setOptions(prev => prev.map(o => o.id === id ? { ...o, votes: o.votes + 1 } : o));
  const removeOption = (id: number) => { if (options.length > 2) setOptions(prev => prev.filter(o => o.id !== id)); };
  const resetVotes = () => setOptions(prev => prev.map(o => ({ ...o, votes: 0 })));
  const spinWheel = () => { if (!isSpinning) { setIsSpinning(true); setSpinDeg(prev => prev + 1800 + Math.random() * 1440); } };

  return (
    <section id="voting" className="pt-20">
      <div className="flex items-center gap-6 mb-3">
        <div className="text-[10px] font-mono text-accent uppercase tracking-[0.4em]">Live Input // Abstimmung</div>
      </div>
      <div className="flex items-center gap-6 mb-12">
        <h4 className="text-2xl font-bold text-white uppercase tracking-tighter">Voting Wheel</h4>
        <div className="h-px flex-1 bg-white/10" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-12 items-start">
        <div className="flex flex-col items-center gap-6">
          <div className="relative w-[400px] max-w-full">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 pointer-events-none" style={{ filter: 'drop-shadow(0 0 6px #00FFC2)' }}>
              <svg width="24" height="18" viewBox="0 0 24 18"><polygon points="0,0 24,0 12,18" fill="#00FFC2" /></svg>
            </div>
            <motion.div animate={{ rotate: spinDeg }} transition={{ duration: 4, ease: [0.17, 0.67, 0.3, 1] }} onAnimationComplete={() => setIsSpinning(false)} style={{ transformOrigin: 'center center' }}>
              <svg viewBox="0 0 400 400" className="w-full drop-shadow-xl">
                <circle cx={CX} cy={CY} r={R + 12} fill="none" stroke="#00FFC210" strokeWidth="20" />
                <circle cx={CX} cy={CY} r={R + 2} fill="none" stroke="#00FFC230" strokeWidth="1.5" />
                {slices.map(s => <path key={s.id} d={pieSlicePath(CX, CY, R, s.start, s.start + s.sweep)} fill={s.color} fillOpacity={0.9} stroke="#050505" strokeWidth="2" />)}
                {slices.map(s => {
                  if (s.sweep < 22) return null;
                  const mid = angleToXY(CX, CY, R * 0.62, s.start + s.sweep / 2);
                  return <text key={`lbl-${s.id}`} x={mid.x} y={mid.y} textAnchor="middle" dominantBaseline="middle" fill="#050505" fontSize="11" fontWeight="700" fontFamily="Inter, sans-serif" style={{ userSelect: 'none' }}>{s.label.length > 9 ? s.label.slice(0, 9) + '…' : s.label}</text>;
                })}
                {slices.map(s => {
                  if (s.sweep < 35 || s.votes === 0) return null;
                  const mid = angleToXY(CX, CY, R * 0.62, s.start + s.sweep / 2);
                  return <text key={`cnt-${s.id}`} x={mid.x} y={mid.y + 13} textAnchor="middle" dominantBaseline="middle" fill="#05050588" fontSize="9" fontWeight="600" fontFamily="JetBrains Mono, monospace" style={{ userSelect: 'none' }}>{s.votes}</text>;
                })}
                <circle cx={CX} cy={CY} r={24} fill="#050505" stroke="#00FFC2" strokeWidth="1.5" />
                <circle cx={CX} cy={CY} r={8} fill="#00FFC2" />
              </svg>
            </motion.div>
          </div>
          <button onClick={spinWheel} disabled={isSpinning} className="flex items-center gap-3 px-8 py-3 border border-accent/40 bg-accent/5 hover:bg-accent/10 text-accent font-bold text-sm uppercase tracking-[0.2em] rounded-full transition-all disabled:opacity-40 disabled:cursor-not-allowed">
            <Play className="w-4 h-4 fill-current" />
            {isSpinning ? 'Dreht sich...' : 'Rad drehen'}
          </button>
        </div>
        <div className="space-y-3">
          <div className="text-[10px] font-mono text-white/30 uppercase tracking-[0.3em] mb-6">Optionen &amp; Stimmen // {options.length} / 8</div>
          <AnimatePresence mode="popLayout">
            {options.map((opt, i) => (
              <motion.div key={opt.id} layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex items-center gap-3 p-4 bg-white/[0.02] border border-white/10 rounded-xl hover:border-white/20 transition-all">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="flex-1 text-sm font-medium text-white truncate min-w-0">{opt.label}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-20 h-1 bg-white/5 rounded-full overflow-hidden">
                    <motion.div className="h-full rounded-full" animate={{ width: totalVotes > 0 ? `${(opt.votes / totalVotes) * 100}%` : '0%' }} transition={{ duration: 0.5 }} style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  </div>
                  <span className="text-xs font-mono text-white/40 w-6 text-right">{opt.votes}</span>
                </div>
                <button onClick={() => castVote(opt.id)} className="px-3 py-1.5 text-[11px] font-black uppercase tracking-widest border border-accent/30 bg-accent/5 text-accent hover:bg-accent/15 rounded-lg transition-all flex-shrink-0">+1</button>
                {options.length > 2 && <button onClick={() => removeOption(opt.id)} className="p-1 text-white/15 hover:text-red-400/70 transition-colors flex-shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>}
              </motion.div>
            ))}
          </AnimatePresence>
          {options.length < 8 && (
            <div className="flex gap-2 pt-2">
              <input type="text" value={newLabel} onChange={e => setNewLabel(e.target.value)} onKeyDown={e => e.key === 'Enter' && addOption()} placeholder="Neue Option hinzufügen..." maxLength={25} className="flex-1 min-w-0 px-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent/30 transition-all" />
              <button onClick={addOption} disabled={!newLabel.trim()} className="p-2.5 border border-accent/20 bg-accent/5 text-accent hover:bg-accent/10 rounded-xl transition-all disabled:opacity-30 flex-shrink-0"><Plus className="w-4 h-4" /></button>
            </div>
          )}
          <div className="flex items-center justify-between pt-4 border-t border-white/5">
            <button onClick={resetVotes} className="flex items-center gap-2 text-[10px] font-mono text-white/20 hover:text-white/50 transition-colors uppercase tracking-widest">
              <RotateCcw className="w-3 h-3" /> Stimmen zurücksetzen
            </button>
            <div className="text-[10px] font-mono text-white/20 uppercase tracking-widest">∑ {totalVotes} Stimmen</div>
          </div>
        </div>
      </div>
    </section>
  );
}
