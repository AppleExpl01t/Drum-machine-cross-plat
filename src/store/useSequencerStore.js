import { create } from 'zustand';
import { TRACKS } from '../audio/constants';

// Helper to create empty pattern
const createEmptyPattern = (steps = 64) => {
    const p = {};
    TRACKS.forEach(t => {
        p[t.id] = new Array(steps).fill(null);
    });
    return p;
};

const MAX_HISTORY = 20;

export const useSequencerStore = create((set, get) => ({
    // State
    pattern: createEmptyPattern(32),
    steps: 32,
    muted: {},
    soloed: null,
    locked: {},
    selectedStepId: null, // { track, step }
    pendingPattern: null,

    // History State
    history: [createEmptyPattern(32)],
    historyIndex: 0,
    
    // Actions - Track Controls
    toggleMute: (trackId) => set(state => ({ 
        muted: { ...state.muted, [trackId]: !state.muted[trackId] } 
    })),
    
    toggleSolo: (trackId) => set(state => ({ 
        soloed: state.soloed === trackId ? null : trackId 
    })),
    
    toggleLock: (trackId) => set(state => ({ 
        locked: { ...state.locked, [trackId]: !state.locked[trackId] } 
    })),

    setPendingPattern: (p) => set({ pendingPattern: p }),
    
    applyPendingPattern: () => set(state => {
        if (!state.pendingPattern) return {};
        // Commit the pending pattern
        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(state.pendingPattern);
        if (newHistory.length > MAX_HISTORY) newHistory.shift();
        
        return {
            history: newHistory,
            historyIndex: newHistory.length - 1,
            pattern: state.pendingPattern,
            pendingPattern: null
        };
    }),


    setSteps: (steps) => set(state => {
        // Resize pattern when steps change
        const prevPattern = state.pattern;
        const newPattern = {};
        TRACKS.forEach(t => {
            const oldTrack = prevPattern[t.id] || [];
            const newTrack = new Array(steps).fill(null);
            for (let i = 0; i < Math.min(oldTrack.length, steps); i++) {
                newTrack[i] = oldTrack[i];
            }
            newPattern[t.id] = newTrack;
        });
        
        // Clear selection if out of bounds
        const newSelected = (state.selectedStepId && state.selectedStepId.step >= steps) 
            ? null 
            : state.selectedStepId;

        return { pattern: newPattern, steps, selectedStepId: newSelected };
    }),

    // Actions - Pattern Editing
    setSelectedStepId: (id) => set({ selectedStepId: id }),
    
    setPattern: (newPattern) => {
        // Just set pattern (no history commit)
        set({ pattern: newPattern });
    },

    commitPattern: (newPattern) => set(state => {
        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(newPattern);
        if (newHistory.length > MAX_HISTORY) newHistory.shift();
        
        return {
            history: newHistory,
            historyIndex: newHistory.length - 1,
            pattern: newPattern
        };
    }),

    // Actions - History
    undo: () => set(state => {
        if (state.historyIndex > 0) {
            const newIndex = state.historyIndex - 1;
            return {
                historyIndex: newIndex,
                pattern: state.history[newIndex]
            };
        }
        return {};
    }),

    redo: () => set(state => {
        if (state.historyIndex < state.history.length - 1) {
            const newIndex = state.historyIndex + 1;
            return {
                historyIndex: newIndex,
                pattern: state.history[newIndex]
            };
        }
        return {};
    }),
    
    // Actions - Cell Editing
    toggleStep: (trackId, stepIndex) => {
        const state = get();
        const existing = state.pattern[trackId][stepIndex];
        const newPattern = { ...state.pattern };
        // Deep copy track
        newPattern[trackId] = [...newPattern[trackId]];

        if (existing) {
             // If currently selected, delete it
            if (state.selectedStepId && state.selectedStepId.track === trackId && state.selectedStepId.step === stepIndex) {
                 newPattern[trackId][stepIndex] = null;
                 state.commitPattern(newPattern); // Commit delete
                 set({ selectedStepId: null });
            } else {
                // Just select it
                set({ selectedStepId: { track: trackId, step: stepIndex } });
            }
        } else {
             // Create new note
            newPattern[trackId][stepIndex] = { vel: 0.8, pitch: 0, prob: 1, sampleIndex: 0 };
            state.commitPattern(newPattern); // Commit add
            set({ selectedStepId: { track: trackId, step: stepIndex } });
            return true; // Return true to indicate a note was created (for audio preview)
        }
        return false;
    },

    modifyStep: (key, val) => {
        const state = get();
        if (!state.selectedStepId) return;
        
        const { track, step } = state.selectedStepId;
        const newPattern = { ...state.pattern };
        newPattern[track] = [...newPattern[track]]; // Copy track
        
        if (newPattern[track][step]) {
            newPattern[track][step] = { ...newPattern[track][step], [key]: val };
            set({ pattern: newPattern });
        }
    },

    setVelocity: (trackId, stepIndex, vel) => {
        const state = get();
        const newPattern = { ...state.pattern };
        // Deep copy track if needed (Zustand updates are shallow merge, but pattern is deep object)
        newPattern[trackId] = [...newPattern[trackId]];
        
        if (newPattern[trackId][stepIndex]) {
            newPattern[trackId][stepIndex] = { ...newPattern[trackId][stepIndex], vel };
            set({ pattern: newPattern });
        }
    },
    
    deleteSelectedStep: () => {
        const state = get();
        if (!state.selectedStepId) return;
        const { track, step } = state.selectedStepId;
        
        const newPattern = { ...state.pattern };
        newPattern[track] = [...newPattern[track]];
        newPattern[track][step] = null;
        
        state.commitPattern(newPattern);
        set({ selectedStepId: null });
    }
}));
