/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useAnimate, useMotionValueEvent } from 'motion/react';
import { Plus, Trash2, RotateCcw, Play, Square, X } from 'lucide-react';

const COLORS = ['#00FFC2','#FF6B6B','#FFD93D','#4D96FF','#C77DFF','#FF9F1C','#6BCB77','#F72585'];

interface Option { id: number; label: string; votes: number; }
interface Slice extends Option { start: number; sweep: number; color: string; }

function angleToXY(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function pieSlicePath(cx: number, cy: number, r: number, s: number, e: number): string {
  const span = e - s;
  if (span >= 359.99) return `M ${cx},${cy - r} A ${r},${r} 0 1 1 ${cx - 0.001},${cy - r} Z`;
  const p1 = angleToXY(cx, cy, r, s);
  const p2 = angleToXY(cx, cy, r, e);
  return `M ${cx},${cy} L ${p1.x},${p1.y} A ${r},${r} 0 ${span > 180 ? 1 : 0} 1 ${p2.x},${p2.y} Z`;
}

const CX = 200, CY = 200, R = 175;

const PARTICLES = Array.from({ length: 36 }, (_, i) => ({
  id: i,
  angle: (i / 36) * 360 + Math.random() * 10 - 5,
  dist: 110 + Math.random() * 160,
  color: COLORS[i % COLORS.length],
  size: 7 + Math.random() * 13,
  delay: Math.random() * 0.12,
}));

function buildSlices(opts: Option[]): Slice[] {
  const total = opts.reduce((s, o) => s + o.votes, 0);
  let angle = 0;
  return opts.map((opt, i) => {
    const frac = total > 0 ? opt.votes / total : 1 / opts.length;
    const sweep = frac * 360;
    const start = angle;
    angle += sweep;
    return { ...opt, start, sweep, color: COLORS[i % COLORS.length] };
  });
}

// ── Audio helpers ─────────────────────────────────────────────

function getCtx(ref: React.MutableRefObject<AudioContext | null>): AudioContext | null {
  try {
    if (!ref.current) ref.current = new AudioContext();
    if (ref.current.state === 'suspended') ref.current.resume();
    return ref.current;
  } catch { return null; }
}

function playClick(ctx: AudioContext, vol = 0.18) {
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(700, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(250, ctx.currentTime + 0.022);
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.022);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.025);
  } catch { /* ignore */ }
}

function scheduleNoiseHit(ctx: AudioContext, time: number, vol: number, dur: number) {
  const bufSize = Math.ceil(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let j = 0; j < bufSize; j++) data[j] = Math.random() * 2 - 1;

  const src = ctx.createBufferSource();
  src.buffer = buf;

  const filt = ctx.createBiquadFilter();
  filt.type = 'bandpass';
  filt.frequency.setValueAtTime(180, time);
  filt.Q.setValueAtTime(0.7, time);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

  src.connect(filt); filt.connect(gain); gain.connect(ctx.destination);
  src.start(time);
  src.stop(time + dur + 0.01);
}

function playDrumRoll(ctx: AudioContext, duration: number, onEnd: () => void) {
  const hits = 28;
  for (let i = 0; i < hits; i++) {
    const progress = i / hits;
    const t = ctx.currentTime + Math.pow(progress, 0.65) * duration;
    const vol = 0.08 + progress * 0.35;
    const dur = 0.055 - progress * 0.025;
    scheduleNoiseHit(ctx, t, vol, Math.max(dur, 0.015));
  }
  scheduleNoiseHit(ctx, ctx.currentTime + duration, 0.5, 0.12);
  setTimeout(onEnd, (duration + 0.15) * 1000);
}

function playFanfare(ctx: AudioContext) {
  const notes = [523, 659, 784, 1047];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = freq;
    const t = ctx.currentTime + i * 0.11;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.14, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
    osc.start(t); osc.stop(t + 0.35);
  });
}

// ─────────────────────────────────────────────────────────────

export default function VotingWheel() {
  const [options, setOptions] = useState<Option[]>([
    { id: 1, label: 'Option A', votes: 0 },
    { id: 2, label: 'Option B', votes: 0 },
    { id: 3, label: 'Option C', votes: 0 },
  ]);
  const [question, setQuestion] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [isSpinning, setIsSpinning] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);
  const [winner, setWinner] = useState<Slice | null>(null);
  const [explodeKey, setExplodeKey] = useState(0);

  const rotation = useMotionValue(0);
  const [, animateValue] = useAnimate();
  const animRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const nextId = useRef(4);
  const optionsRef = useRef(options);
  const prevRotSlot = useRef(0);
  useEffect(() => { optionsRef.current = options; }, [options]);

  const totalVotes = options.reduce((sum, o) => sum + o.votes, 0);
  const slices = buildSlices(options);

  useMotionValueEvent(rotation, 'change', (value) => {
    const INTERVAL = 14;
    const slot = Math.floor(Math.abs(value) / INTERVAL);
    if (slot !== prevRotSlot.current) {
      prevRotSlot.current = slot;
      const ctx = getCtx(audioCtxRef);
      if (ctx) playClick(ctx);
    }
  });

  const revealWinner = useCallback((w: Slice) => {
    setIsRevealing(true);
    const ctx = getCtx(audioCtxRef);
    if (ctx) {
      playDrumRoll(ctx, 2.2, () => {
        setIsRevealing(false);
        setWinner(w);
        setExplodeKey(k => k + 1);
        playFanfare(ctx);
      });
    } else {
      setTimeout(() => {
        setIsRevealing(false);
        setWinner(w);
        setExplodeKey(k => k + 1);
      }, 2200);
    }
  }, []);

  const determineWinner = useCallback((opts: Option[]) => {
    const curr = rotation.get();
    const norm = ((curr % 360) + 360) % 360;
    const pointerAt = (360 - norm) % 360;
    const s = buildSlices(opts);
    const w = s.find(sl => pointerAt >= sl.start && pointerAt < sl.start + sl.sweep) ?? s[0];
    revealWinner(w);
  }, [rotation, revealWinner]);

  const spinWheel = () => {
    if (isSpinning || isRevealing) return;
    const ctx = getCtx(audioCtxRef);
    void ctx;
    setIsSpinning(true);
    setWinner(null);
    const target = rotation.get() + 1800 + Math.random() * 1440;
    animRef.current = animateValue(rotation, target, {
      duration: 4,
      ease: [0.17, 0.67, 0.3, 1],
      onComplete: () => {
        setIsSpinning(false);
        determineWinner(optionsRef.current);
      },
    });
  };

  const stopWheel = () => {
    if (!isSpinning) return;
    animRef.current?.stop();
    setIsSpinning(false);
    determineWinner(optionsRef.current);
  };

  const addOption = () => {
    const label = newLabel.trim();
    if (!label || options.length >= 8) return;
    setOptions(prev => [...prev, { id: nextId.current++, label, votes: 0 }]);
    setNewLabel('');
  };
  const castVote     = (id: number) => setOptions(prev => prev.map(o => o.id === id ? { ...o, votes: o.votes + 1 } : o));
  const removeOption = (id: number) => { if (options.length > 2) setOptions(prev => prev.filter(o => o.id !== id)); };
  const resetVotes   = () => setOptions(prev => prev.map(o => ({ ...o, votes: 0 })));

  return (
    <>
      <AnimatePresence>
        {isRevealing && (
          <motion.div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm gap-6"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div
              className="text-[11px] font-mono text-accent uppercase tracking-[0.5em]"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 0.6, repeat: Infinity }}
            >
              Trommelwirbel...
            </motion.div>
            <div className="flex gap-2">
              {[0,1,2,3,4].map(i => (
                <motion.div
                  key={i}
                  className="w-2 h-8 rounded-full bg-accent"
                  animate={{ scaleY: [0.3, 1, 0.3] }}
                  transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.08 }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {winner && (
          <motion.div
            key={`overlay-${explodeKey}`}
            className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setWinner(null)} />
            {PARTICLES.map(p => (
              <motion.div
                key={`p-${p.id}-${explodeKey}`}
                className="absolute rounded-full pointer-events-none"
                style={{ width: p.size, height: p.size, backgroundColor: p.color, left: '50%', top: '50%', marginLeft: -p.size / 2, marginTop: -p.size / 2 }}
                initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                animate={{ x: Math.cos(p.angle * Math.PI / 180) * p.dist, y: Math.sin(p.angle * Math.PI / 180) * p.dist, scale: [0, 1.8, 0.6, 0], opacity: [1, 1, 0.6, 0] }}
                transition={{ duration: 1.5, delay: p.delay, ease: 'easeOut' }}
              />
            ))}
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={`ring-${i}-${explodeKey}`}
                className="absolute rounded-full pointer-events-none border-2"
                style={{ width: 20, height: 20, borderColor: COLORS[i % COLORS.length], left: '50%', top: '50%', marginLeft: -10, marginTop: -10 }}
                initial={{ scale: 0, opacity: 0.8 }}
                animate={{ scale: 8 + i * 3, opacity: 0 }}
                transition={{ duration: 1.2, delay: i * 0.06, ease: 'easeOut' }}
              />
            ))}
            <motion.div
              className="relative z-10 text-center px-12 py-10 rounded-3xl border-2 bg-[#050505] max-w-md mx-4 w-full"
              style={{ borderColor: winner.color, boxShadow: `0 0 80px ${winner.color}50` }}
              initial={{ scale: 0.3, opacity: 0, y: 60 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 18, delay: 0.1 }}
              onClick={e => e.stopPropagation()}
            >
              <button onClick={() => setWinner(null)} className="absolute top-4 right-4 p-1.5 text-white/20 hover:text-white/60 transition-colors">
                <X className="w-4 h-4" />
              </button>
              <motion.div className="text-[11px] font-mono uppercase tracking-[0.4em] mb-4" style={{ color: winner.color }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                ✶ Gewinner ✶
              </motion.div>
              {question && (
                <motion.div className="text-base text-white/75 font-medium mb-6 leading-relaxed"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
                  „{question}"
                </motion.div>
              )}
              <motion.div
                className="text-5xl md:text-6xl font-black uppercase leading-none mb-4"
                style={{ color: winner.color }}
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: [0.4, 1.2, 1], opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.25 }}
              >
                {winner.label}
              </motion.div>
              {winner.votes > 0 && (
                <motion.div className="text-white/30 font-mono text-sm"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                  {winner.votes} Stimme{winner.votes !== 1 ? 'n' : ''}
                  {totalVotes > 0 && ` · ${Math.round((winner.votes / totalVotes) * 100)} %`}
                </motion.div>
              )}
              <motion.button
                onClick={() => setWinner(null)}
                className="mt-8 px-6 py-2 border border-white/10 text-white/30 hover:text-white/70 hover:border-white/30 text-[11px] font-mono uppercase tracking-widest rounded-full transition-all"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
              >
                Schließen
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <section>
        <div className="mb-10">
          <label className="text-[10px] font-mono text-white/60 uppercase tracking-[0.3em] mb-3 block">Abstimmungsfrage</label>
          <input type="text" value={question} onChange={e => setQuestion(e.target.value)}
            placeholder="z. B. Welches Thema behandeln wir zuerst?" maxLength={80}
            className="w-full px-5 py-3.5 bg-white/[0.06] border border-white/25 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-accent/60 transition-all text-base font-light"
          />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-12 items-start">
          <div className="flex flex-col items-center gap-6">
            <div className="relative w-[400px] max-w-full">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 pointer-events-none" style={{ filter: 'drop-shadow(0 0 8px #00FFC2)' }}>
                <svg width="24" height="18" viewBox="0 0 24 18"><polygon points="0,0 24,0 12,18" fill="#00FFC2" /></svg>
              </div>
              <motion.div style={{ rotate: rotation, transformOrigin: 'center center' }}>
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
            <AnimatePresence mode="wait">
              {!isSpinning ? (
                <motion.button key="spin" onClick={spinWheel} disabled={isRevealing}
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center gap-3 px-8 py-3 border border-accent/40 bg-accent/5 hover:bg-accent/10 text-accent font-bold text-sm uppercase tracking-[0.2em] rounded-full transition-all disabled:opacity-30"
                >
                  <Play className="w-4 h-4 fill-current" /> Rad drehen
                </motion.button>
              ) : (
                <motion.button key="stop" onClick={stopWheel}
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center gap-3 px-8 py-3 border border-red-400/50 bg-red-400/5 hover:bg-red-400/10 text-red-400 font-bold text-sm uppercase tracking-[0.2em] rounded-full transition-all"
                >
                  <Square className="w-4 h-4 fill-current" /> Stopp
                </motion.button>
              )}
            </AnimatePresence>
          </div>
          <div className="space-y-3">
            <div className="text-[10px] font-mono text-white/60 uppercase tracking-[0.3em] mb-6">Optionen &amp; Stimmen // {options.length} / 8</div>
            <AnimatePresence mode="popLayout">
              {options.map((opt, i) => (
                <motion.div key={opt.id} layout
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="flex items-center gap-3 p-4 bg-white/[0.02] border border-white/10 rounded-xl hover:border-white/20 transition-all"
                >
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
                <input type="text" value={newLabel} onChange={e => setNewLabel(e.target.value)} onKeyDown={e => e.key === 'Enter' && addOption()}
                  placeholder="Neue Option hinzufügen..." maxLength={25}
                  className="flex-1 min-w-0 px-4 py-2.5 bg-white/[0.06] border border-white/25 rounded-xl text-sm text-white placeholder-white/40 focus:outline-none focus:border-accent/50 transition-all"
                />
                <button onClick={addOption} disabled={!newLabel.trim()} className="p-2.5 border border-accent/20 bg-accent/5 text-accent hover:bg-accent/10 rounded-xl transition-all disabled:opacity-30 flex-shrink-0">
                  <Plus className="w-4 h-4" />
                </button>
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
    </>
  );
}
