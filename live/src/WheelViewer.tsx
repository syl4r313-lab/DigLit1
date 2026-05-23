import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useAnimate } from 'framer-motion';
import { ref, onValue, runTransaction } from 'firebase/database';
import { db } from './firebase';
import type { Option, SpinEvent, WinnerData } from './types';

const COLORS = ['#00FFC2','#FF6B6B','#FFD93D','#4D96FF','#C77DFF','#FF9F1C','#6BCB77','#F72585'];

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

// ── Warte-Screen (vor Sessionstart) ───────────────────────────

function WaitingScreen() {
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
      transition={{ duration: 0.5 }}
    >
      {STARS.map(s => (
        <motion.div key={`ws-${s.id}`} className="absolute pointer-events-none"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size, backgroundColor: s.color, imageRendering: 'pixelated' }}
          animate={{ opacity: [0.1, 0.7, 0.1], scale: [1, 1.4, 1] }}
          transition={{ duration: s.dur, delay: s.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 75% 75% at 50% 50%, transparent 20%, #0c0a18 90%)' }} />
      <div className="relative z-10 flex flex-col items-center gap-8 px-6 text-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
          style={{ filter: 'drop-shadow(0 0 18px rgba(0,255,194,0.35))' }}>
          <PixelWheelArt px={10} />
        </motion.div>
        <div className="space-y-2">
          <p className="font-mono text-[9px] tracking-[0.55em] uppercase" style={{ color: 'rgba(0,255,194,0.55)' }}>
            C.Voigt ❆ B.Mertens
          </p>
          <h1 className="font-black uppercase font-mono leading-none text-white"
            style={{ fontSize: 'clamp(1.7rem, 7vw, 2.4rem)', letterSpacing: '0.1em' }}>
            LITERACY<br />SPIN
          </h1>
          <p className="font-mono font-bold tracking-[0.35em] text-lg" style={{ color: '#FFD93D' }}>SS 2026</p>
        </div>
        <div style={{ background: 'linear-gradient(145deg,#1c1732 0%,#130f26 100%)', border: '2px solid rgba(255,255,255,0.08)', boxShadow: '4px 4px 0 rgba(0,0,0,0.4)', padding: '1.25rem 2rem' }}>
          <div className="flex items-center gap-3">
            <motion.div className="w-2 h-2" style={{ background: '#00FFC2' }}
              animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }} />
            <span className="font-mono text-[11px] uppercase tracking-[0.4em]" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Warte auf Admin…
            </span>
          </div>
        </div>
        <p className="font-mono text-[9px] tracking-[0.4em] uppercase" style={{ color: 'rgba(255,255,255,0.1)' }}>
          Die Abstimmung startet in Kürze
        </p>
      </div>
    </motion.div>
  );
}

// ── Intro-Screen (Frage anzeigen, bevor Viewer zur Abstimmung geht) ──

function ViewerIntroScreen({ question, onReady }: { question: string; onReady: () => void }) {
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
        <motion.div key={`vi-${s.id}`} className="absolute pointer-events-none"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size, backgroundColor: s.color, imageRendering: 'pixelated' }}
          animate={{ opacity: [0.1, 0.85, 0.1], scale: [1, 1.4, 1] }}
          transition={{ duration: s.dur, delay: s.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 75% 75% at 50% 50%, transparent 20%, #0c0a18 90%)' }} />

      <div className="relative z-10 flex flex-col items-center gap-6 px-6 w-full max-w-[380px]">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
          style={{ filter: 'drop-shadow(0 0 18px rgba(0,255,194,0.35))' }}>
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
          <p className="font-mono font-bold tracking-[0.35em] text-lg" style={{ color: '#FFD93D' }}>SS 2026</p>
        </div>

        <div className="w-full" style={{
          background: 'linear-gradient(145deg,#1c1732 0%,#130f26 100%)',
          border: '2px solid rgba(255,255,255,0.1)',
          boxShadow: '4px 4px 0 rgba(0,255,194,0.1), 8px 8px 0 rgba(0,0,0,0.5)',
          padding: '1.5rem',
        }}>
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] mb-3"
            style={{ color: 'rgba(255,255,255,0.38)' }}>
            ▶ Abstimmungsfrage
          </p>
          <p className="text-white text-lg font-semibold leading-snug mb-5"
            style={{ borderLeft: '3px solid rgba(0,255,194,0.5)', paddingLeft: '0.75rem' }}>
            {question}
          </p>
          <motion.button
            onClick={onReady}
            whileHover={{ x: 1, y: 1, boxShadow: '3px 3px 0 rgba(0,255,194,0.16)' }}
            whileTap={{ x: 4, y: 4, boxShadow: '0px 0px 0 rgba(0,255,194,0.16)' }}
            className="w-full font-black font-mono uppercase"
            style={{
              padding: '0.75rem 1rem',
              background: 'rgba(0,255,194,0.09)',
              border: '2px solid #00FFC2',
              color: '#00FFC2',
              letterSpacing: '0.38em',
              fontSize: '0.72rem',
              boxShadow: '4px 4px 0 rgba(0,255,194,0.16)',
              borderRadius: 0,
            }}
          >
            WEITER →
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main Viewer Component ──────────────────────────────────────

export default function WheelViewer() {
  const [screen, setScreen] = useState<'waiting' | 'voting'>('waiting');
  const [viewerReady, setViewerReady] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<Option[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<WinnerData | null>(null);
  const [explodeKey, setExplodeKey] = useState(0);
  const prevExplodeRef = useRef(false);
  const [votedFor, setVotedFor] = useState<number | null>(null);
  const [voteSessionId, setVoteSessionId] = useState('');

  const rotation = useMotionValue(0);
  const [, animate] = useAnimate();
  const prevSpinRef = useRef<SpinEvent | null>(null);
  const prevVoteSessionRef = useRef('');

  useEffect(() => {
    const sessionRef = ref(db, 'session');
    const unsub = onValue(sessionRef, (snap) => {
      const data = snap.val();
      if (!data) return;

      if (data.question) setQuestion(data.question);
      if (data.options && Array.isArray(data.options)) setOptions(data.options);

      const newScreen: 'waiting' | 'voting' = data.screen === 'voting' ? 'voting' : 'waiting';
      // When admin goes back to onboarding, reset viewer intro so they see it again next session
      if (newScreen === 'waiting') setViewerReady(false);
      setScreen(newScreen);

      // New voteSessionId = new session → reset viewer state
      const newVSId: string = typeof data.voteSessionId === 'string' ? data.voteSessionId : '';
      if (newVSId && newVSId !== prevVoteSessionRef.current) {
        prevVoteSessionRef.current = newVSId;
        setVoteSessionId(newVSId);
        setViewerReady(false);
        const stored = localStorage.getItem(`ls_voted_${newVSId}`);
        setVotedFor(stored ? Number(stored) : null);
      } else if (!newVSId && !prevVoteSessionRef.current) {
        // Legacy session without voteSessionId — check default key
        const stored = localStorage.getItem('ls_voted_default');
        if (stored) setVotedFor(Number(stored));
      }

      if (typeof data.currentAngle === 'number' && !data.spin?.active) {
        rotation.set(data.currentAngle);
      }

      const spin: SpinEvent | null = data.spin ?? null;
      const prevSpin = prevSpinRef.current;

      if (spin?.active && !prevSpin?.active) {
        const elapsed = Date.now() - spin.startedAt;
        const remainingMs = Math.max(400, spin.durationMs - elapsed);
        rotation.set(spin.startAngle);
        animate(rotation, spin.targetAngle, {
          duration: remainingMs / 1000,
          ease: [0.05, 0.82, 0.22, 1],
          onComplete: () => setIsSpinning(false),
        });
        setIsSpinning(true);
      } else if (!spin?.active && prevSpin?.active) {
        if (typeof data.currentAngle === 'number') rotation.set(data.currentAngle);
        setIsSpinning(false);
      }
      prevSpinRef.current = spin;

      if (data.showWinner && data.winner) {
        if (!prevExplodeRef.current) {
          setExplodeKey(k => k + 1);
          prevExplodeRef.current = true;
        }
        setWinner(data.winner);
      } else {
        setWinner(null);
        prevExplodeRef.current = false;
      }
    });
    return () => unsub();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const castVote = (id: number) => {
    if (votedFor !== null) return;
    // Works with or without voteSessionId (backward compat for sessions started before this feature)
    const key = `ls_voted_${voteSessionId || 'default'}`;
    localStorage.setItem(key, String(id));
    setVotedFor(id);
    runTransaction(ref(db, 'session/options'), (current) => {
      if (current == null) return; // abort — no data yet
      const opts: Option[] = Array.isArray(current) ? current : Object.values(current);
      return opts.map((o: Option) => o.id === id ? { ...o, votes: (o.votes || 0) + 1 } : o);
    }).catch(console.error);
  };

  const totalVotes = options.reduce((s, o) => s + o.votes, 0);
  const slices = buildSlices(options);

  return (
    <>
      {/* Waiting screen — before admin starts */}
      <AnimatePresence>
        {screen === 'waiting' && <WaitingScreen />}
      </AnimatePresence>

      {/* Viewer intro — shows question, requires "Weiter" click */}
      <AnimatePresence>
        {screen === 'voting' && !viewerReady && (
          <ViewerIntroScreen question={question} onReady={() => setViewerReady(true)} />
        )}
      </AnimatePresence>

      {/* Winner overlay */}
      <AnimatePresence>
        {winner && (
          <motion.div key={`overlay-${explodeKey}`}
            className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
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
              transition={{ type: 'spring', stiffness: 280, damping: 18, delay: 0.1 }}
            >
              <motion.div className="text-[11px] font-mono uppercase tracking-[0.4em] mb-4" style={{ color: winner.color }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                ✶ Gewinner ✶
              </motion.div>
              {question && (
                <motion.div className="text-base text-white/75 font-medium mb-6 leading-relaxed"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
                  „{question}“
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
              <motion.div className="mt-6 font-mono text-[9px] uppercase tracking-[0.35em]"
                style={{ color: 'rgba(255,255,255,0.15)' }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
                Admin schließt das Ergebnis
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Voting Screen (nur wenn Viewer "Weiter" geklickt hat) ── */}
      {screen === 'voting' && viewerReady && (
        <>
          {STARS.map(s => (
            <motion.div key={`vs-${s.id}`} className="fixed pointer-events-none"
              style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size, backgroundColor: s.color, imageRendering: 'pixelated', zIndex: 1 }}
              animate={{ opacity: [0.06, 0.5, 0.06], scale: [1, 1.25, 1] }}
              transition={{ duration: s.dur, delay: s.delay, repeat: Infinity, ease: 'easeInOut' }}
            />
          ))}

          <section className="relative" style={{ zIndex: 10 }}>
            <motion.div className="mb-10"
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <span className="text-[9px] font-mono uppercase tracking-[0.45em] mb-2 block"
                style={{ color: 'rgba(255,255,255,0.3)' }}>Abstimmungsfrage</span>
              <div style={{ background: 'rgba(0,255,194,0.04)', border: '2px solid rgba(0,255,194,0.2)', boxShadow: '3px 3px 0 rgba(0,255,194,0.07)', padding: '1rem 1.25rem' }}>
                <div className="flex items-start gap-3">
                  <span className="font-mono text-lg leading-none mt-0.5 shrink-0" style={{ color: 'rgba(0,255,194,0.6)' }}>▶</span>
                  <p className="text-white text-lg font-semibold leading-snug">{question}</p>
                </div>
              </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-12 items-start">
              {/* Wheel */}
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
                <AnimatePresence>
                  {isSpinning && (
                    <motion.div
                      className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.35em]"
                      style={{ color: '#00FFC2' }}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                    >
                      <motion.div className="w-2 h-2" style={{ background: '#00FFC2' }}
                        animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 0.5, repeat: Infinity }} />
                      Dreht sich…
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Options + Vote buttons */}
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-5">
                  <div className="font-mono text-[10px] uppercase tracking-[0.4em]"
                    style={{ color: votedFor !== null ? '#00FFC2' : 'rgba(255,255,255,0.55)' }}>
                    {votedFor !== null ? '✓ Stimme abgegeben' : 'Wähle eine Option'}
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.4em]"
                    style={{ color: 'rgba(255,255,255,0.3)' }}>
                    ∑ {totalVotes} Stimmen
                  </div>
                </div>

                <AnimatePresence mode="popLayout">
                  {options.map((opt, i) => {
                    const isVoted = votedFor === opt.id;
                    const isOther = votedFor !== null && !isVoted;
                    const color = COLORS[i % COLORS.length];
                    return (
                      <motion.div key={opt.id} layout
                        className="flex items-center gap-3 p-4"
                        style={{
                          background: isVoted ? `${color}12` : 'rgba(255,255,255,0.025)',
                          borderWidth: 2, borderStyle: 'solid',
                          borderColor: isVoted ? color : isOther ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.1)',
                          boxShadow: isVoted ? `3px 3px 0 ${color}22` : '2px 2px 0 rgba(0,0,0,0.3)',
                          opacity: isOther ? 0.5 : 1,
                        }}
                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: isOther ? 0.5 : 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                      >
                        <div className="w-2.5 h-2.5 flex-shrink-0" style={{ backgroundColor: color }} />
                        <span className="flex-1 text-sm font-medium text-white truncate min-w-0">{opt.label}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="w-20 h-1 overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                            <motion.div className="h-full"
                              animate={{ width: totalVotes > 0 ? `${(opt.votes / totalVotes) * 100}%` : '0%' }}
                              transition={{ duration: 0.5 }}
                              style={{ backgroundColor: color }} />
                          </div>
                          <span className="text-xs font-mono w-6 text-right" style={{ color: 'rgba(255,255,255,0.4)' }}>
                            {opt.votes}
                          </span>
                        </div>
                        <motion.button
                          onClick={() => castVote(opt.id)}
                          disabled={votedFor !== null}
                          className="px-3 py-1.5 text-[11px] font-black uppercase tracking-widest flex-shrink-0 disabled:cursor-not-allowed"
                          style={{
                            border: `2px solid ${isVoted ? color : isOther ? 'rgba(255,255,255,0.08)' : 'rgba(0,255,194,0.4)'}`,
                            background: isVoted ? `${color}22` : isOther ? 'transparent' : 'rgba(0,255,194,0.06)',
                            color: isVoted ? color : isOther ? 'rgba(255,255,255,0.15)' : '#00FFC2',
                            boxShadow: isVoted ? `2px 2px 0 ${color}33` : 'none',
                            minWidth: '5rem',
                          }}
                          whileTap={votedFor === null ? { x: 2, y: 2 } : {}}
                        >
                          {isVoted ? '✓ Meine' : isOther ? '—' : 'Wählen'}
                        </motion.button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {votedFor !== null && (
                  <motion.div
                    className="pt-3 font-mono text-[10px] uppercase tracking-[0.35em] text-center"
                    style={{ color: 'rgba(0,255,194,0.5)' }}
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  >
                    Danke für deine Stimme!
                  </motion.div>
                )}
              </div>
            </div>
          </section>
        </>
      )}
    </>
  );
}
