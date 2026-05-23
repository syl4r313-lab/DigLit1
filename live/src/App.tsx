import VotingWheel from './VotingWheel';
import WheelViewer from './WheelViewer';

const isAdmin = new URLSearchParams(window.location.search).get('mode') === 'admin';

const BG_STYLE = {
  background: '#0c0a18',
  backgroundImage: [
    'linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px)',
    'linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px)',
  ].join(','),
  backgroundSize: '8px 8px',
};

export default function App() {
  return (
    <div className="min-h-screen text-[#d1d5db] font-sans overflow-x-hidden" style={BG_STYLE}>
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(circle at 50% 0%, rgba(0,255,194,0.05) 0%, transparent 55%)' }}
      />

      <header
        className="sticky top-0 z-30 backdrop-blur-xl"
        style={{ borderBottom: '2px solid rgba(255,255,255,0.07)', background: 'rgba(12,10,24,0.92)' }}
      >
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] tracking-[0.55em] font-mono uppercase" style={{ color: 'rgba(0,255,194,0.5)' }}>
              C.Voigt ❆ B.Mertens
            </span>
            <h1 className="text-xl font-black tracking-[0.08em] text-white uppercase font-mono leading-none">
              Literacy Spin <span style={{ color: '#FFD93D' }}>SS 2026</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <div
                className="px-3 py-1.5 font-mono text-[9px] uppercase tracking-widest"
                style={{ border: '2px solid rgba(255,211,61,0.4)', background: 'rgba(255,211,61,0.06)', color: '#FFD93D' }}
              >
                Admin
              </div>
            )}
            <div
              className="flex items-center gap-2 px-3 py-1.5"
              style={{ border: '2px solid rgba(0,255,194,0.18)', background: 'rgba(0,255,194,0.04)' }}
            >
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#00FFC2' }} />
              <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Live
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16 relative">
        {isAdmin ? <VotingWheel /> : <WheelViewer />}
      </main>

      <footer className="py-8 mt-20" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-5xl mx-auto px-6 text-center">
          <span className="text-[10px] font-mono uppercase tracking-[0.3em]" style={{ color: 'rgba(255,255,255,0.12)' }}>
            Literacy Spin SS 2026 ❆ C.Voigt ❆ B.Mertens
          </span>
        </div>
      </footer>
    </div>
  );
}
