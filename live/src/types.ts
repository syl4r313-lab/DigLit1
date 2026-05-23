export interface Option {
  id: number;
  label: string;
  votes: number;
}

export interface SpinEvent {
  active: boolean;
  startAngle: number;
  targetAngle: number;
  durationMs: number;
  startedAt: number;
}

export interface WinnerData {
  id: number;
  label: string;
  color: string;
  votes: number;
}

export interface SessionData {
  question: string;
  screen: 'onboarding' | 'voting';
  options: Option[];
  currentAngle: number;
  spin: SpinEvent | null;
  winner: WinnerData | null;
  showWinner: boolean;
}
