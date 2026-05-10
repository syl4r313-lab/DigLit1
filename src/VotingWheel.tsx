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
  angle: (i / 36) * 360 + (i * 7 % 11) - 5,
  dist: 110 + (i * 17 % 160),
  color: COLORS[i % COLORS.length],
  size: 7 + (i * 3 % 13),
  delay: (i * 7 % 12) / 100,
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

// ── Audio helpers ──────────────────────────────────────────────

function getCtx(ref: React.MutableRefObject<AudioContext | null>): AudioContext | null {
  try {
    if (!ref.current) ref.current = new AudioContext();
    if (ref.current.state === 'suspended') ref.current.resume();
    return ref.current;
  } catch { return null; }
}

// Warm wooden peg “tock” — low sine thud + high snap
function playTick(ctx: AudioContext) {
  try {
    const now = ctx.currentTime;
    // Body: low sine that quickly drops in pitch (the peg resonance)
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.exponentialRampToValueAtTime(58, now + 0.038);
    env.gain.setValueAtTime(0.21, now);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.042);
    osc.connect(env); env.connect(ctx.destination);
    osc.start(now); osc.stop(now + 0.048);

    // Attack transient: tiny filtered noise burst
    const bufLen = Math.ceil(ctx.sampleRate * 0.011);
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / bufLen);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1800;
    const g2 = ctx.createGain(); g2.gain.value = 0.14;
    src.connect(hp); hp.connect(g2); g2.connect(ctx.destination);
    src.start(now); src.stop(now + 0.014);
  } catch { /* ignore */ }
}

function scheduleNoiseHit(ctx: AudioContext, time: number, vol: number, dur: number) {
  const bufSize = Math.ceil(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let j = 0; j < bufSize; j++) data[j] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(); src.buffer = buf;
  const filt = ctx.createBiquadFilter(); filt.type = 'bandpass';
  filt.frequency.setValueAtTime(180, time); filt.Q.setValueAtTime(0.7, time);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
  src.connect(filt); filt.connect(gain); gain.connect(ctx.destination);
  src.start(time); src.stop(time + dur + 0.01);
}

function playDrumRoll(ctx: AudioContext, duration: number, onEnd: () => void) {
  const hits = 28;
  for (let i = 0; i < hits; i++) {
    const progress = i / hits;
    const t = ctx.currentTime + Math.pow(progress, 0.65) * duration;
    scheduleNoiseHit(ctx, t, 0.08 + progress * 0.35, Math.max(0.055 - progress * 0.025, 0.015));
  }
  scheduleNoiseHit(ctx, ctx.currentTime + duration, 0.5, 0.12);
  setTimeout(onEnd, (duration + 0.15) * 1000);
}

function playFanfare(ctx: AudioContext) {
  [523, 659, 784, 1047].forEach((freq, i) => {
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination); osc.type = 'sine'; osc.frequency.value = freq;
    const t = ctx.currentTime + i * 0.11;
    gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(0.14, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
    osc.start(t); osc.stop(t + 0.35);
  });
}

// ── Pixel Art ──────────────────────────────────────────────────

function PixelWheelArt({ px = 8 }: { px?: number }) {
  const GRID = 16;
  const cx = GRID / 2, cy = GRID / 2;
  const cells: { x: number; y: number; color: string }[] = [];
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const dx = x - cx + 0.5, dy = y - cy + 0.5;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 7) continue;
      if (dist <= 1.5) { cells.push({ x, y, color: '#ffffff' }); continue; }
      if (dist <= 2.2) { cells.push({ x, y, color: '#00FFC2' }); continue; }
      let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
      if (angle < 0) angle += 360;
      cells.push({ x, y, color: COLORS[Math.floor((angle / 360) * 8) % 8] });
    }
  }
  return (
    <svg width={GRID * px} height={GRID * px} viewBox={`0 0 ${GRID} ${GRID}`}
      style={{ imageRendering: 'pixelated' }}>
      {cells.map(({ x, y, color }) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={color} />
      ))}
    </svg>
  );
}

const STARS = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  x: ((i * 41 + 7) % 97) + 1,
  y: ((i * 67 + 11) % 89) + 3,
  size: [2, 2, 2, 4, 4, 4, 6][i % 7],
  color: COLORS[i % COLORS.length],
  delay: (i * 41 % 300) / 100,
  dur: 1.5 + (i * 23 % 200) / 100,
}));

// ── Pixel button shared style helpers ─────────────────────────────

const pixelBtn = (color: string, bg: string) => ({
  padding: '0.75rem 2rem',
  background: bg,
  border: `2px solid ${color}`,
  color,
  fontFamily: 'monospace',
  fontWeight: 900,
  fontSize: '0.72rem',
  letterSpacing: '0.32em',
  textTransform: 'uppercase' as const,
  borderRadius: 0,
  boxShadow: `4px 4px 0 ${color}22`,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '0.65rem',
});

// ── Onboarding Screen ──────────────────────────────────────────────

function OnboardingScreen({ onStart }: { onStart: (q: string) => void }) {
  const [q, setQ] = useState('');
  const start = () => { if (q.trim()) onStart(q.trim()); };

  return (
    <motion.div
      className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: '#0c0a18',
        backgroundImage: [
          'linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px)',
          'linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px)',
        ].join(','),
        backgroundSize: '8px 8px',
        zIndex: 40,
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.35 } }}
      transition={{ duration: 0.4 }}
    >
      {STARS.map(s => (
        <motion.div key={`ob-${s.id}`} className="absolute pointer-events-none"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size, backgroundColor: s.color, imageRendering: 'pixelated' }}
          animate={{ opacity: [0.1, 0.85, 0.1], scale: [1, 1.4, 1] }}
          transition={{ duration: s.dur, delay: s.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}

      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 75% 75% at 50% 50%, transparent 20%, #0c0a18 90%)' }} />

      <div className="relative z-10 flex flex-col items-center gap-6 px-6 w-full max-w-[340px]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
          style={{ filter: 'drop-shadow(0 0 18px rgba(0,255,194,0.35))' }}
        >
          <PixelWheelArt px={10} />
        </motion.div>

        <div className="text-center space-y-1">
          <p className="font-mono text-[9px] tracking-[0.55em] uppercase" style={{ color: 'rgba(0,255,194,0.55)' }}>
            C.Voigt ❆ B.Mertens
          </p>
          <h1 className="font-black uppercase font-mono leading-none text-white"
            style={{ fontSize: 'clamp(1.7rem, 7vw, 2.4rem)', letterSpacing: '0.1em' }}>
            LITERACY<br />SPIN
          </h1>
          <p className="font-mono font-bold tracking-[0.35em] text-lg" style={{ color: '#FFD93D' }}>
            SS 2026
          </p>
        </div>

        <div className="w-full" style={{
          background: 'linear-gradient(145deg,#1c1732 0%,#130f26 100%)',
          border: '2px solid rgba(255,255,255,0.1)',
          boxShadow: '4px 4px 0 rgba(0,255,194,0.1), 8px 8px 0 rgba(0,0,0,0.5)',
          padding: '1.5rem',
        }}>
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] mb-3"
            style={{ color: 'rgba(255,255,255,0.38)' }}>
            ▶ Worüber stimmt ihr heute ab?
          </p>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && start()}
            placeholder="Eure Frage eingeben…"
            maxLength={80}
            autoFocus
            className="w-full text-sm text-white font-mono focus:outline-none"
            style={{
              background: 'rgba(0,0,0,0.38)',
              border: '2px solid rgba(255,255,255,0.12)',
              padding: '0.7rem 1rem',
              borderRadius: 0,
              transition: 'border-color 0.18s',
              caretColor: '#00FFC2',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,255,194,0.5)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
          />
          <motion.button
            onClick={start}
            disabled={!q.trim()}
            whileHover={q.trim() ? { x: 1, y: 1, boxShadow: '3px 3px 0 rgba(0,255,194,0.16)' } : {}}
            whileTap={q.trim() ? { x: 4, y: 4, boxShadow: '0px 0px 0 rgba(0,255,194,0.16)' } : {}}
            className="w-full font-black font-mono uppercase disabled:opacity-25 disabled:cursor-not-allowed"
            style={{
              marginTop: '0.65rem',
              padding: '0.75rem 1rem',
              background: q.trim() ? 'rgba(0,255,194,0.09)' : 'transparent',
              border: '2px solid #00FFC2',
              color: '#00FFC2',
              letterSpacing: '0.38em',
              fontSize: '0.72rem',
              boxShadow: q.trim() ? '4px 4px 0 rgba(0,255,194,0.16)' : 'none',
              borderRadius: 0,
            }}
          >
            LOS GEHT'S →
          </motion.button>
        </div>

        <p className="font-mono text-[9px] tracking-[0.4em] uppercase text-center"
          style={{ color: 'rgba(255,255,255,0.13)' }}>
          ↵ Enter · Abstimmung starten
        </p>
      </div>
    </motion.div>
  );
}

// ── Main VotingWheel ───────────────────────────────────────────────

export default function VotingWheel() {
  const [screen, setScreen] = useState<'onboarding' | 'voting'>('onboarding');
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

  // Tick every 20° for a natural click rhythm at the new slower speed
  useMotionValueEvent(rotation, 'change', (value) => {
    const slot = Math.floor(Math.abs(value) / 20);
    if (slot !== prevRotSlot.current) {
      prevRotSlot.current = slot;
      const ctx = getCtx(audioCtxRef);
      if (ctx) playTick(ctx);
    }
  });

  const revealWinner = useCallback((w: Slice) => {
    setIsRevealing(true);
    const ctx = getCtx(audioCtxRef);
    if (ctx) {
      playDrumRoll(ctx, 2.2, () => {
        setIsRevealing(false); setWinner(w); setExplodeKey(k => k + 1); playFanfare(ctx);
      });
    } else {
      setTimeout(() => { setIsRevealing(false); setWinner(w); setExplodeKey(k => k + 1); }, 2200);
    }
  }, []);

  const determineWinner = useCallback((opts: Option[]) => {
    const curr = rotation.get();
    const norm = ((curr % 360) + 360) % 360;
    const pointerAt = (360 - norm) % 360;
    const s = buildSlices(opts);
    revealWinner(s.find(sl => pointerAt >= sl.start && pointerAt < sl.start + sl.sweep) ?? s[0]);
  }, [rotation, revealWinner]);

  const spinWheel = () => {
    if (isSpinning || isRevealing) return;
    void getCtx(audioCtxRef);
    setIsSpinning(true); setWinner(null);
    // 4–6 full rotations, 6 second duration — satisfying, not rushed
    const target = rotation.get() + 1440 + Math.random() * 720;
    animRef.current = animateValue(rotation, target, {
      duration: 6,
      ease: [0.05, 0.82, 0.22, 1], // fast start → long natural deceleration
      onComplete: () => { setIsSpinning(false); determineWinner(optionsRef.current); },
    });
  };

  const stopWheel = () => {
    if (!isSpinning) return;
    animRef.current?.stop(); setIsSpinning(false); determineWinner(optionsRef.current);
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
        {screen === 'onboarding' && (
          <OnboardingScreen onStart={(q) => { setQuestion(q); setScreen('voting'); }} />
        )}
      </AnimatePresence>

      {/* Drum roll overlay */}
      <AnimatePresence>
        {isRevealing && (
          <motion.div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm gap-6"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div className="text-[11px] font-mono text-accent uppercase tracking-[0.5em]"
              animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 0.6, repeat: Infinity }}>
              Trommelwirbel...
            </motion.div>
            <div className="flex gap-2">
              {[0,1,2,3,4].map(i => (
                <motion.div key={i} className="w-2 h-8 bg-accent"
                  animate={{ scaleY: [0.3, 1, 0.3] }}
                  transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.08 }} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Winner overlay */}
      <AnimatePresence>
        {winner && (
          <motion.div key={`overlay-${explodeKey}`}
            className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setWinner(null)} />
            {PARTICLES.map(p => (
              <motion.div key={`p-${p.id}-${explodeKey}`} className="absolute pointer-events-none"
                style={{ width: p.size, height: p.size, backgroundColor: p.color, left: '50%', top: '50%', marginLeft: -p.size / 2, marginTop: -p.size / 2 }}
                initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                animate={{ x: Math.cos(p.angle * Math.PI / 180) * p.dist, y: Math.sin(p.angle * Math.PI / 180) * p.dist, scale: [0, 1.8, 0.6, 0], opacity: [1, 1, 0.6, 0] }}
                transition={{ duration: 1.5, delay: p.delay, ease: 'easeOut' }} />
            ))}
            {[...Array(8)].map((_, i) => (
              <motion.div key={`ring-${i}-${explodeKey}`} className="absolute pointer-events-none border-2"
                style={{ width: 20, height: 20, borderColor: COLORS[i % COLORS.length], left: '50%', top: '50%', marginLeft: -10, marginTop: -10, borderRadius: '50%' }}
                initial={{ scale: 0, opacity: 0.8 }}
                animate={{ scale: 8 + i * 3, opacity: 0 }}
                transition={{ duration: 1.2, delay: i * 0.06, ease: 'easeOut' }} />
            ))}
            <motion.div
              className="relative z-10 text-center px-12 py-10 bg-[#0c0a18] max-w-md mx-4 w-full"
              style={{ borderWidth: 2, borderStyle: 'solid', borderColor: winner.color, boxShadow: `0 0 60px ${winner.color}40, 6px 6px 0 ${winner.color}18` }}
              initial={{ scale: 0.3, opacity: 0, y: 60 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 18, delay: 0.1 }}
              onClick={e => e.stopPropagation()}
            >
              <button onClick={() => setWinner(null)}
                className="absolute top-4 right-4 p-1.5 transition-colors"
                style={{ color: 'rgba(255,255,255,0.2)' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.2)'; }}
              >
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
              <motion.div className="font-black uppercase leading-none mb-4 font-mono"
                style={{ color: winner.color, fontSize: 'clamp(2.5rem, 10vw, 4rem)' }}
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: [0.4, 1.15, 1], opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.25 }}
              >
                {winner.label}
              </motion.div>
              {winner.votes > 0 && (
                <motion.div className="font-mono text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                  {winner.votes} Stimme{winner.votes !== 1 ? 'n' : ''}
                  {totalVotes > 0 && ` · ${Math.round((winner.votes / totalVotes) * 100)} %`}
                </motion.div>
              )}
              <motion.button
                onClick={() => setWinner(null)}
                className="mt-8 font-mono text-[11px] uppercase tracking-widest transition-all"
                style={{
                  padding: '0.5rem 1.5rem',
                  border: '2px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.3)',
                  borderRadius: 0,
                  background: 'transparent',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = 'rgba(255,255,255,0.3)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
              >
                Schließen
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Voting Screen ── */}
      {screen === 'voting' && (
        <>
          {/* Background stars — same as onboarding for visual continuity */}
          {STARS.map(s => (
            <motion.div key={`vs-${s.id}`} className="fixed pointer-events-none"
              style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size, backgroundColor: s.color, imageRendering: 'pixelated', zIndex: 1 }}
              animate={{ opacity: [0.06, 0.5, 0.06], scale: [1, 1.25, 1] }}
              transition={{ duration: s.dur, delay: s.delay, repeat: Infinity, ease: 'easeInOut' }}
            />
          ))}

          <section className="relative" style={{ zIndex: 10 }}>
            {/* Question banner */}
            <motion.div className="mb-10"
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <div className="flex items-center mb-2">
                <span className="text-[9px] font-mono uppercase tracking-[0.45em]"
                  style={{ color: 'rgba(255,255,255,0.3)' }}>Abstimmungsfrage</span>
                <button
                  onClick={() => setScreen('onboarding')}
                  className="ml-auto text-[9px] font-mono uppercase tracking-widest transition-colors"
                  style={{ color: 'rgba(255,255,255,0.18)' }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'rgba(0,255,194,0.7)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.18)'; }}
                >← ändern</button>
              </div>
              <div className="px-5 py-4 flex items-start gap-3" style={{
                background: 'rgba(0,255,194,0.04)',
                border: '2px solid rgba(0,255,194,0.2)',
                boxShadow: '3px 3px 0 rgba(0,255,194,0.07)',
              }}>
                <span className="font-mono text-lg leading-none mt-0.5 shrink-0" style={{ color: 'rgba(0,255,194,0.6)' }}>▶</span>
                <p className="text-white text-lg font-semibold leading-snug">{question}</p>
              </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-12 items-start">
              {/* Wheel column */}
              <div className="flex flex-col items-center gap-6">
                <div className="relative w-[400px] max-w-full" style={{
                  padding: '10px',
                  background: 'rgba(0,0,0,0.18)',
                  border: '2px solid rgba(255,255,255,0.06)',
                  boxShadow: '4px 4px 0 rgba(0,0,0,0.4)',
                }}>
                  <div className="absolute top-[10px] left-1/2 -translate-x-1/2 z-20 pointer-events-none"
                    style={{ filter: 'drop-shadow(0 0 8px #00FFC2)' }}>
                    <svg width="24" height="18" viewBox="0 0 24 18">
                      <polygon points="0,0 24,0 12,18" fill="#00FFC2" />
                    </svg>
                  </div>
                  <motion.div style={{ rotate: rotation, transformOrigin: 'center center' }}>
                    <svg viewBox="0 0 400 400" className="w-full drop-shadow-xl">
                      <circle cx={CX} cy={CY} r={R + 12} fill="none" stroke="#00FFC210" strokeWidth="20" />
                      <circle cx={CX} cy={CY} r={R + 2} fill="none" stroke="#00FFC230" strokeWidth="1.5" />
                      {slices.map(s => (
                        <path key={s.id} d={pieSlicePath(CX, CY, R, s.start, s.start + s.sweep)}
                          fill={s.color} fillOpacity={0.9} stroke="#0c0a18" strokeWidth="2" />
                      ))}
                      {slices.map(s => {
                        if (s.sweep < 22) return null;
                        const mid = angleToXY(CX, CY, R * 0.62, s.start + s.sweep / 2);
                        return <text key={`lbl-${s.id}`} x={mid.x} y={mid.y} textAnchor="middle" dominantBaseline="middle"
                          fill="#0c0a18" fontSize="11" fontWeight="700" fontFamily="monospace"
                          style={{ userSelect: 'none' }}>
                          {s.label.length > 9 ? s.label.slice(0, 9) + '…' : s.label}
                        </text>;
                      })}
                      {slices.map(s => {
                        if (s.sweep < 35 || s.votes === 0) return null;
                        const mid = angleToXY(CX, CY, R * 0.62, s.start + s.sweep / 2);
                        return <text key={`cnt-${s.id}`} x={mid.x} y={mid.y + 13} textAnchor="middle"
                          dominantBaseline="middle" fill="#0c0a1888" fontSize="9" fontWeight="600"
                          fontFamily="monospace" style={{ userSelect: 'none' }}>{s.votes}</text>;
                      })}
                      <circle cx={CX} cy={CY} r={24} fill="#0c0a18" stroke="#00FFC2" strokeWidth="1.5" />
                      <circle cx={CX} cy={CY} r={8} fill="#00FFC2" />
                    </svg>
                  </motion.div>
                </div>

                <AnimatePresence mode="wait">
                  {!isSpinning ? (
                    <motion.button key="spin" onClick={spinWheel} disabled={isRevealing}
                      style={{ ...pixelBtn('#00FFC2', 'rgba(0,255,194,0.07)'), opacity: isRevealing ? 0.3 : 1 }}
                      whileHover={!isRevealing ? { x: 1, y: 1, boxShadow: '3px 3px 0 rgba(0,255,194,0.22)' } : {}}
                      whileTap={!isRevealing ? { x: 4, y: 4, boxShadow: '0px 0px 0 rgba(0,255,194,0.22)' } : {}}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: isRevealing ? 0.3 : 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                    >
                      <Play className="w-4 h-4 fill-current" /> Rad drehen
                    </motion.button>
                  ) : (
                    <motion.button key="stop" onClick={stopWheel}
                      style={pixelBtn('#FF6B6B', 'rgba(255,107,107,0.07)')}
                      whileHover={{ x: 1, y: 1, boxShadow: '3px 3px 0 rgba(255,107,107,0.22)' }}
                      whileTap={{ x: 4, y: 4, boxShadow: '0px 0px 0 rgba(255,107,107,0.22)' }}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                    >
                      <Square className="w-4 h-4 fill-current" /> Stopp
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>

              {/* Options column */}
              <div className="space-y-3">
                <div className="font-mono text-[10px] uppercase tracking-[0.4em] mb-5"
                  style={{ color: 'rgba(255,255,255,0.55)' }}>
                  Optionen &amp; Stimmen // {options.length} / 8
                </div>

                <AnimatePresence mode="popLayout">
                  {options.map((opt, i) => (
                    <motion.div key={opt.id} layout
                      className="flex items-center gap-3 p-4"
                      style={{
                        background: 'rgba(255,255,255,0.025)',
                        borderWidth: 2, borderStyle: 'solid', borderColor: 'rgba(255,255,255,0.1)',
                        boxShadow: '2px 2px 0 rgba(0,0,0,0.3)',
                      }}
                      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                      whileHover={{ borderColor: 'rgba(255,255,255,0.22)', background: 'rgba(255,255,255,0.04)' }}
                    >
                      <div className="w-2.5 h-2.5 flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="flex-1 text-sm font-medium text-white truncate min-w-0">{opt.label}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="w-20 h-1 overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                          <motion.div className="h-full"
                            animate={{ width: totalVotes > 0 ? `${(opt.votes / totalVotes) * 100}%` : '0%' }}
                            transition={{ duration: 0.5 }}
                            style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        </div>
                        <span className="text-xs font-mono w-6 text-right" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          {opt.votes}
                        </span>
                      </div>
                      <button onClick={() => castVote(opt.id)}
                        className="px-3 py-1.5 text-[11px] font-black uppercase tracking-widest flex-shrink-0 transition-all"
                        style={{
                          border: '2px solid rgba(0,255,194,0.35)', background: 'rgba(0,255,194,0.05)',
                          color: '#00FFC2', boxShadow: '2px 2px 0 rgba(0,255,194,0.1)',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,255,194,0.12)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,255,194,0.05)'; }}
                      >+1</button>
                      {options.length > 2 && (
                        <button onClick={() => removeOption(opt.id)}
                          className="p-1 flex-shrink-0 transition-colors"
                          style={{ color: 'rgba(255,255,255,0.12)' }}
                          onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,107,107,0.7)'; }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.12)'; }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>

                {options.length < 8 && (
                  <div className="flex gap-2 pt-2">
                    <input type="text" value={newLabel} onChange={e => setNewLabel(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addOption()}
                      placeholder="Neue Option hinzufügen…" maxLength={25}
                      className="flex-1 min-w-0 text-sm text-white font-mono focus:outline-none"
                      style={{
                        background: 'rgba(0,0,0,0.35)', border: '2px solid rgba(255,255,255,0.12)',
                        padding: '0.6rem 1rem', borderRadius: 0, caretColor: '#00FFC2',
                        transition: 'border-color 0.18s',
                      }}
                      onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,255,194,0.45)'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
                    />
                    <button onClick={addOption} disabled={!newLabel.trim()}
                      className="p-2.5 flex-shrink-0 disabled:opacity-30 transition-all"
                      style={{
                        border: '2px solid rgba(0,255,194,0.3)', background: 'rgba(0,255,194,0.05)',
                        color: '#00FFC2', boxShadow: '2px 2px 0 rgba(0,0,0,0.3)',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,255,194,0.12)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,255,194,0.05)'; }}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <button onClick={resetVotes}
                    className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest transition-colors"
                    style={{ color: 'rgba(255,255,255,0.18)' }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.18)'; }}
                  >
                    <RotateCcw className="w-3 h-3" /> Stimmen zurücksetzen
                  </button>
                  <div className="text-[10px] font-mono uppercase tracking-widest"
                    style={{ color: 'rgba(255,255,255,0.18)' }}>
                    ∑ {totalVotes} Stimmen
                  </div>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </>
  );
}
