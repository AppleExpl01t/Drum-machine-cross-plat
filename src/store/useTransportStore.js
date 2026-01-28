import { create } from 'zustand';

export const useTransportStore = create((set) => ({
  // State
  started: false,
  playing: false,
  bpm: 124,
  bpmLocked: false,
  
  // Actions
  setStarted: (started) => set({ started }),
  setPlaying: (playing) => set({ playing }),
  togglePlay: () => set((state) => ({ playing: !state.playing })),
  setBpm: (bpm) => set({ bpm }),
  setBpmLocked: (locked) => set({ bpmLocked: locked }),
  toggleBpmLock: () => set((state) => ({ bpmLocked: !state.bpmLocked })),
}));
