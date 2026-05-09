/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Milestone {
  year: string;
  title: string;
  description: string;
  focus: string;
  details: string;
  citation?: string;
}

export const EVOLUTION_TIMELINE: Milestone[] = [
  {
    year: '1975',
    title: 'The Homebrew Era',
    description: 'Gründung des Homebrew Computer Club im Silicon Valley.',
    focus: 'Consumer Hardware, Microprocessors, Open Source Ethic',
    details: 'Der HCC war der Katalysator für die Personal Computer Revolution. Hier trafen sich Hobbyisten wie Steve Wozniak, um Schaltpläne zu teilen und die Philosophie des "Selbermachens" auf die digitale Welt zu übertragen.',
    citation: 'Levy, S. (1984). Hackers: Heroes of the Computer Revolution.'
  },
  {
    year: '1981',
    title: 'Chaos Computer Club (CCC)',
    description: 'Gründung des CCC in Berlin durch Wau Holland und andere.',
    focus: 'Data Privacy, Networking, Social Responsibility',
    details: 'Der CCC legte den Grundstein für die europäische Hacker-Ethik: "Alle Information muss frei sein" und "Öffentliche Daten nützen, private Daten schützen". Damit wurde die soziale Dimension technischer Freiheit definiert.',
    citation: 'Holland, W. (1984). Die Hacker-Ethik.'
  },
  {
    year: '1995',
    title: 'c-base & The Space Concept',
    description: 'Eröffnung der c-base in Berlin als fixer physischer Ort.',
    focus: 'Stationary Hackerspaces, Community Building, Cyberculture',
    details: 'Die c-base gilt als einer der ersten modernen Hackerspaces, der den "Space" als semi-autonomen Zone für Hacker und Kulturschaffende etablierte. Dieses Modell inspirierte hunderte Gründungen weltweit.',
    citation: 'Pettis, B., et al. (2007). Hackerspaces: The New Community Centers.'
  },
  {
    year: '2001',
    title: 'MIT Center for Bits and Atoms',
    description: 'Neil Gershenfeld gründet das erste Fab Lab.',
    focus: 'Digital Fabrication, Personal Manufacturing, democratization',
    details: 'Unter dem Motto "How to Make (Almost) Anything" wurde der Zugriff auf industrielle Fertigungswerkzeuge (CNC, Laser) für Laien ermöglicht. Es entstand ein globales Netzwerk von standardisierten Werkstätten.',
    citation: 'Gershenfeld, N. (2005). FAB: The Coming Revolution on Your Desktop.'
  },
  {
    year: '2005',
    title: 'The RepRap Breakthrough',
    description: 'Adrian Bowyer startet das RepRap-Projekt (Replicating Rapid Prototyper).',
    focus: '3D Printing, Self-Replicating Machines, Open Design',
    details: 'Der Plan für einen 3D-Drucker, der sich selbst replizieren kann. RepRap ist der Urahn fast aller heutigen Consumer-FDM-Drucker wie Prusa oder Creality. Er revolutionierte die Prototyping-Kosten.',
    citation: 'Bowyer, A. (2006). RepRap - the replicating rapid prototyper.'
  },
  {
    year: '2010',
    title: 'The Maker Faire Explosion',
    description: 'Dale Dougherty und das Make: Magazine popularisieren den Begriff "Maker".',
    focus: 'Global Movement, Education, STEM/MINT',
    details: 'Das Maker-Movement verbindet traditionelles Handwerk mit Hochtechnologie. Es entstehen tausende private und kommerzielle "Maker Spaces" (z.B. TechShop), die Kreativität als wirtschaftlichen Faktor betonen.',
    citation: 'Anderson, C. (2012). Makers: The New Industrial Revolution.'
  },
  {
    year: '2024+',
    title: 'Augmented Craft & Bio-Hacking',
    description: 'Die Verschmelzung von KI-Design und organischen Materialien.',
    focus: 'AI-Generated Design, Sustainable Bio-Fab, Circular Economy',
    details: 'Makerspaces entwickeln sich zu dezentralen Forschungsinstituten für Kreislaufwirtschaft und adaptive Produktion. KI hilft, Materialverschwendung zu minimieren und komplexe, biologisch abbaubare Bauteile zu fertigen.',
    citation: 'Nexus Labs Annual Report (2024).'
  }
];

export interface Source {
  id: number;
  title: string;
  author: string;
  year: string;
  url?: string;
}

export const SOURCES: Source[] = [
  { id: 1, title: 'Hackers: Heroes of the Computer Revolution', author: 'Steven Levy', year: '1984' },
  { id: 2, title: 'The Maker Movement Manifesto', author: 'Mark Hatch', year: '2013', url: 'https://www.makermovementmanifesto.com' },
  { id: 3, title: 'Fab: The Coming Revolution on Your Desktop', author: 'Neil Gershenfeld', year: '2005' },
  { id: 4, title: 'Hacker-Ethik', author: 'Wau Holland / CCC', year: '1984', url: 'https://www.ccc.de/hackerethik' },
  { id: 5, title: 'Digital Fabrication and the Maker Movement', author: 'Jeremy Rifkin', year: '2014' }
];
