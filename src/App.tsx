/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronRight, Activity, ShieldCheck, Zap, ArrowLeft, BookOpen, History, ExternalLink
} from 'lucide-react';
import { Milestone, EVOLUTION_TIMELINE, SOURCES, Source } from './data';
import VotingWheel from './VotingWheel';

export default function App() {
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);

  return (
    <div className="min-h-screen bg-[#050505] text-[#d1d5db] font-sans selection:bg-accent/40 selection:text-white overflow-x-hidden">
      <div className="fixed inset-0 bg-dot-grid opacity-10 pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,#00FFC208_0%,transparent_50%)] pointer-events-none" />

      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#050505]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] tracking-[0.2em] text-accent font-mono mb-1 uppercase">LOC_BER_030 // EVOLUTION_DOCS</span>
            <h1 className="text-2xl font-light tracking-tighter text-white uppercase">DIGITAL LITERACY I <span className="font-bold">SS 2026</span></h1>
          </div>
          <nav className="hidden md:flex items-center gap-10 text-[11px] font-bold uppercase tracking-[0.2em] text-white/40">
            <a href="#evolution" className="text-white border-b-2 border-accent pb-1 transition-all">Die Evolution</a>
            <a href="#sources" className="hover:text-white transition-colors">Digitales Archiv</a>
            <a href="#manifesto" className="hover:text-white transition-colors">Das Manifest</a>
            <a href="#voting" className="hover:text-white transition-colors">Abstimmung</a>
            <div className="flex items-center gap-2 px-3 py-1.5 border border-white/10 rounded-full bg-white/5">
              <div className="w-1.5 h-1.5 bg-accent rounded-full"></div>
              <span className="text-[10px] font-mono text-white/60">ARCHIVE_V2.4</span>
            </div>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 relative">
        <AnimatePresence mode="wait">
          {!selectedMilestone ? (
            <motion.div key="evolution" id="evolution" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -20 }} className="space-y-24 pt-8">
              <div className="max-w-4xl">
                <div className="text-[10px] font-mono text-accent uppercase tracking-[0.4em] mb-4">Chronometrische Dokumentation // Lab Evolution</div>
                <h2 className="text-6xl md:text-[5.5rem] font-light tracking-tighter text-white uppercase mb-8 leading-[0.9]">
                  From Garages to <span className="font-bold italic">Global Nodes.</span>
                </h2>
                <p className="text-2xl text-white/60 font-light leading-relaxed max-w-3xl">
                  Eine detaillierte Untersuchung der soziotechnischen Entwicklung von Hacker- und Makerspaces — von der Garage bis zur vernetzten Industrie 4.0.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative">
                {EVOLUTION_TIMELINE.map((milestone, idx) => (
                  <motion.div
                    key={milestone.year}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => setSelectedMilestone(milestone)}
                    className="group relative p-8 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-accent/30 transition-all cursor-pointer h-full flex flex-col"
                  >
                    <div className="text-accent font-mono text-sm mb-4 tracking-widest flex items-center justify-between">
                      <span>{milestone.year}</span>
                      <History className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <h3 className="text-2xl font-bold text-white uppercase mb-4 tracking-tight group-hover:text-accent transition-colors">{milestone.title}</h3>
                    <p className="text-white/50 text-sm leading-relaxed mb-8 flex-grow">{milestone.description}</p>
                    <div className="pt-6 border-t border-white/5 space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {milestone.focus.split(', ').slice(0, 2).map(f => (
                          <span key={f} className="text-[9px] font-mono px-2 py-0.5 bg-accent/5 text-accent/60 border border-accent/10 rounded uppercase">{f}</span>
                        ))}
                      </div>
                      <div className="text-[10px] text-white/30 font-bold uppercase tracking-widest group-hover:text-white transition-colors flex items-center gap-2">
                        <span>Details Anfordern</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div id="manifesto" className="bg-white/[0.02] border border-white/10 rounded-3xl p-12 md:p-20 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                <div>
                  <div className="text-[10px] font-mono text-accent uppercase tracking-[0.4em] mb-6">Core Philosophy // Das Manifest</div>
                  <h3 className="text-4xl font-light text-white uppercase mb-8 leading-tight italic">
                    "If you can't open it, <br />you don't <span className="font-bold underline decoration-accent decoration-4 underline-offset-8">own it.</span>"
                  </h3>
                  <p className="text-lg text-white/40 leading-relaxed mb-10">Die Makerspace-Bewegung ist mehr als nur Hobbyismus. Es ist eine Demokratisierung der Produktionsmittel.</p>
                  <div className="flex flex-col gap-4">
                    <div className="flex gap-4 items-start">
                      <div className="w-8 h-8 rounded bg-accent/10 flex items-center justify-center flex-shrink-0"><Zap className="w-4 h-4 text-accent" /></div>
                      <p className="text-sm font-bold text-white uppercase tracking-widest pt-1">Radikaler Wissensaustausch</p>
                    </div>
                    <div className="flex gap-4 items-start">
                      <div className="w-8 h-8 rounded bg-accent/10 flex items-center justify-center flex-shrink-0"><ShieldCheck className="w-4 h-4 text-accent" /></div>
                      <p className="text-sm font-bold text-white uppercase tracking-widest pt-1">Nachhaltige Reparaturkultur</p>
                    </div>
                  </div>
                </div>
                <div className="relative group">
                  <div className="aspect-square bg-accent/5 border border-accent/20 rounded-2xl flex items-center justify-center p-12 overflow-hidden">
                    <div className="absolute inset-0 bg-dot-grid opacity-20" />
                    <div className="text-[200px] font-black text-accent/5 select-none absolute -bottom-10 -right-10 leading-none">MAKE</div>
                    <div className="relative z-10 text-center space-y-4">
                      <div className="w-20 h-20 border-2 border-accent mx-auto rounded-full flex items-center justify-center">
                        <Zap className="w-10 h-10 text-accent fill-current" />
                      </div>
                      <div className="text-[10px] font-mono text-accent tracking-[0.5em] uppercase pt-4 italic">System Active</div>
                    </div>
                  </div>
                </div>
              </div>

              <div id="sources" className="pt-20">
                <div className="flex items-center gap-6 mb-12">
                  <h4 className="text-2xl font-bold text-white uppercase tracking-tighter">Digitales Archiv // Quellen</h4>
                  <div className="h-px flex-1 bg-white/10" />
                  <BookOpen className="w-6 h-6 text-accent opacity-50" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {SOURCES.map(source => (
                    <div key={source.id} className="p-6 bg-[#0a0a0a] border border-white/5 rounded hover:border-accent/40 transition-all flex flex-col justify-between group">
                      <div>
                        <div className="text-[9px] font-mono text-white/20 uppercase mb-2">Ref_ID: #{String(source.id).padStart(3, '0')}</div>
                        <h5 className="text-md font-bold text-white mb-2 leading-tight group-hover:text-accent transition-colors">{source.title}</h5>
                        <p className="text-xs text-white/40 italic mb-4">{source.author} ({source.year})</p>
                      </div>
                      {source.url && (
                        <a href={source.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-accent/60 hover:text-accent transition-colors pt-4 border-t border-white/5">
                          <span>Dokumentation</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <VotingWheel />
            </motion.div>
          ) : (
            <motion.div key="milestone-detail" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.02 }} className="space-y-12">
              <button onClick={() => setSelectedMilestone(null)} className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-[0.2em] text-[#d1d5db]/40 hover:text-white transition-all group">
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Return_to_Timeline
              </button>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-20">
                <div className="lg:col-span-8">
                  <div className="text-[12px] font-mono text-accent uppercase tracking-[0.5em] mb-6">{selectedMilestone.year} ARCHIVE DATA</div>
                  <h2 className="text-6xl md:text-8xl font-light tracking-tighter text-white uppercase mb-12">{selectedMilestone.title}</h2>
                  <div className="prose prose-invert max-w-none">
                    <p className="text-3xl font-light text-white leading-snug mb-12 italic opacity-90 border-l-4 border-accent pl-8">{selectedMilestone.description}</p>
                    <div className="space-y-8 text-xl text-white/60 leading-relaxed font-light"><p>{selectedMilestone.details}</p></div>
                  </div>
                  <div className="mt-20 p-8 bg-accent/5 border border-accent/20 rounded-2xl flex flex-col md:flex-row gap-8 items-center">
                    <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center flex-shrink-0"><BookOpen className="w-8 h-8 text-accent" /></div>
                    <div>
                      <div className="text-[10px] font-mono text-accent uppercase tracking-widest mb-2 font-bold">Standard Citation Protocol</div>
                      <p className="text-md font-mono text-white/50 italic leading-relaxed">{selectedMilestone.citation}</p>
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-4 space-y-8">
                  <div className="p-8 bg-white/[0.02] border border-white/10 rounded-2xl">
                    <h5 className="text-[10px] font-mono text-white/30 uppercase tracking-[0.3em] mb-8">Technical Focus</h5>
                    <div className="flex flex-col gap-4">
                      {selectedMilestone.focus.split(', ').map((f, i) => (
                        <div key={i} className="flex items-center gap-4 group">
                          <div className="w-2 h-2 rounded-full bg-accent opacity-40 group-hover:opacity-100 transition-opacity" />
                          <span className="text-sm font-bold text-white uppercase tracking-widest group-hover:text-accent transition-colors">{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-8 bg-[#0a0a0a] border border-white/5 rounded-2xl">
                    <div className="flex items-center gap-4 mb-6">
                      <Activity className="w-5 h-5 text-accent animate-pulse" />
                      <span className="text-[10px] font-mono text-accent uppercase tracking-widest">Historical Status</span>
                    </div>
                    <p className="text-xs text-white/30 leading-relaxed font-mono">Daten wurden aus dezentralen Archiven validiert. Die Integrität der historischen Dokumentation ist gewährleistet.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="mt-40 border-t border-white/10 py-16 bg-[#050505]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-[10px] font-mono text-white/20 uppercase tracking-[0.3em]">Maker Chronicles // Last Updated: {new Date().getFullYear()} // System: VIRTUAL_V4</div>
          <div className="text-[10px] uppercase font-bold tracking-widest flex items-center gap-2">
            <span className="text-white/20">Archivars-Knoten:</span>
            <span className="text-white hover:text-accent transition-colors cursor-pointer">nexus@history.lab</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
