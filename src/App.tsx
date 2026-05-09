/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import VotingWheel from './VotingWheel';

export default function App() {
  return (
    <div className="min-h-screen bg-[#050505] text-[#d1d5db] font-sans overflow-x-hidden">
      <div className="fixed inset-0 bg-dot-grid opacity-10 pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,#00FFC208_0%,transparent_60%)] pointer-events-none" />

      <header className="border-b border-white/10 bg-[#050505]/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] tracking-[0.25em] text-accent font-mono uppercase">
              C.Voigt // B.Mertens
            </span>
            <h1 className="text-xl font-bold tracking-[0.1em] text-white uppercase">
              Literacy Spin <span className="text-accent">SS 2026</span>
            </h1>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 border border-white/10 rounded-full bg-white/5">
            <div className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
            <span className="text-[10px] font-mono text-white/50 uppercase tracking-widest">Live</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16 relative">
        <VotingWheel />
      </main>

      <footer className="border-t border-white/5 py-8 mt-20">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <span className="text-[10px] font-mono text-white/15 uppercase tracking-[0.3em]">
            Literacy Spin SS 2026 // C.Voigt // B.Mertens
          </span>
        </div>
      </footer>
    </div>
  );
}
