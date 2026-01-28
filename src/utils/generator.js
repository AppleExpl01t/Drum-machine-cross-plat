import { COMPLEXITY, TRACKS } from '../audio/constants';

// ================= UTILITIES =================

// All track IDs that the generator might access
const ALL_GENERATOR_TRACKS = ['kick', 'snare', 'clap', 'hatC', 'hatO', 'tomL', 'tomH', 'ride', 'crash', 'perc1', 'perc2', 'fx1', 'fx2'];

// Ensure all tracks exist in the pattern with proper array size
const ensureAllTracks = (pattern, steps) => {
    ALL_GENERATOR_TRACKS.forEach(tid => {
        if (!pattern[tid]) {
            pattern[tid] = new Array(steps).fill(null);
        } else if (pattern[tid].length < steps) {
            // Resize if needed
            const resized = new Array(steps).fill(null);
            for (let i = 0; i < pattern[tid].length; i++) {
                resized[i] = pattern[tid][i];
            }
            pattern[tid] = resized;
        }
    });
};

// Parse a string schema "x...x..." into step data
// x = Accent (0.9-1.0), o = Normal (0.7-0.8), . = Rest, - = Ghost (0.3-0.5)
const applySchema = (pattern, trackId, schema, steps, offset = 0, prob = 1, kitInfo = {}) => {
    if (!paperCheck(pattern, trackId)) return;

    // Repeat schema to fill steps
    const seq = schema.replace(/\s/g, ''); // clear spaces

    for (let i = 0; i < steps; i++) {
        const char = seq[(i - offset + seq.length * 10) % seq.length];
        if (Math.random() > prob && char !== '.') continue;

        let vel = 0;
        if (char === 'x') vel = 0.9 + Math.random() * 0.1;
        else if (char === 'o') vel = 0.7 + Math.random() * 0.1;
        else if (char === '-') vel = 0.3 + Math.random() * 0.2;

        if (vel > 0) {
            const stepData = { vel, pitch: 0, prob: 1 };
            // If K.O kit, assign random sample index
            if (kitInfo.isKO) {
                stepData.sampleIndex = Math.floor(Math.random() * 30); // 30 is max safety, engine wraps it
            }
            pattern[trackId][i] = stepData;
        }
    }
};

const paperCheck = (pattern, tid) => {
    if (!pattern[tid]) pattern[tid] = [];
    return true;
};

// Euclidean Rhythm Generator (Spread k hits over n steps)
const getEuclideanPattern = (k, n) => {
    let pattern = new Array(n).fill(0);
    if (k === 0) return pattern;
    if (k >= n) return new Array(n).fill(1);

    let slope = n / k;
    for (let i = 0; i < k; i++) {
        pattern[Math.floor(i * slope)] = 1;
    }
    return pattern;
};

// ================= ARCHETYPES =================

const ARCHETYPES = {
    house: [
        {
            kick: "x...x...x...x...",
            snare: "....o.......o...",
            clap: "....x.......x...",
            hatC: "-.o.-.o.-.o.-.o.",
            hatO: "..x...x...x...x.",
        },
        {
            kick: "x...x...x...x...",
            snare: "....x.......x...",
            hatC: "x.o.x.o.x.o.x.o.",
            hatO: "................",
        }
    ],
    hiphop: [
        {
            kick: "x.o.....x.x.....",
            snare: "....x.......x...",
            hatC: "x-x-x-x-x-x-x-x-",
        },
        {
            kick: "x...x.....x.x...",
            snare: "....x..-....x...",
            hatC: "x.x.x.x.x.x.x.x.",
        },
        {
            kick: "x.........x.....",
            snare: "....x.......x...",
            hatC: "x-x-x-x-x-x-x-x-",
        }
    ],
    dnb: [
        // Jungle style: Chopped breakbeats, fast hi-hats, syncopated snares
        {
            kick: "x.......x.......",
            snare: "....x.....x.x...",
            clap: "..........-.....",
            hatC: "x-x-x-x-x-x-x-x-",
            hatO: "..x...x...x...x.",
            perc1: "....-.....-.-..-",
        },
        // Modern DnB: Classic two-step pattern
        {
            kick: "x.........x.....",
            snare: "....x.......x...",
            hatC: "x.x.x.x.x.x.x.x.",
            hatO: "................",
            ride: "..-..--..--..-.-",
        },
        // Liquid: Flowing hats, softer feel
        {
            kick: "x.......x..-....",
            snare: "....x.......x...",
            hatC: "x-o-x-o-x-o-x-o-",
            hatO: "....x.......x...",
            ride: "-.-.-.-.-.-.-.o-",
        },
        // Techstep: Aggressive, sparse, heavy
        {
            kick: "x...........x...",
            snare: "....x.......x...",
            clap: "....x...........",
            hatC: "x.-.x.-.x.-.x.-.",
            crash: "x...............",
        },
        // Neurofunk: Syncopated, complex
        {
            kick: "x.....x...x.....",
            snare: "....x..-....x.-.",
            hatC: "x-x-x---x-x-x-x-",
            perc1: "..-...-...-...-.",
            perc2: "..x...x...x...x.",
        }
    ],
    rock: [
        {
            kick: "x.......o.-.....",
            snare: "....x.......x...",
            hatC: "x-x-x-x-x-x-x-x-",
            crash: "x...............",
        },
        {
            kick: "x...x..-..x.x...",
            snare: "....x..-....x...",
            hatC: "x.x.x.xx.x.x.xx.",
        }
    ],
    jazz: [
        {
            kick: "o.......o.......",
            snare: ".........-..-...",
            hatC: "................",
            ride: "x..-x.-.x..-x.-.",
        }
    ]
};

// ================= SCALES =================
const SCALES = {
    Major: [0, 2, 4, 5, 7, 9, 11],
    Minor: [0, 2, 3, 5, 7, 8, 10],
    Dorian: [0, 2, 3, 5, 7, 9, 10],
    Phrygian: [0, 1, 3, 5, 7, 8, 10],
    Lydian: [0, 2, 4, 6, 7, 9, 11],
    Mixolydian: [0, 2, 4, 5, 7, 9, 10],
};

export function generatePattern(genre, steps, lockedTracks, currentPattern, complexity = 'moderate', settings = {}) {
    // 1. Setup
    const newPattern = JSON.parse(JSON.stringify(currentPattern));
    const { scale = 'Minor', musicalKey = 'C', kit = 'house' } = settings;
    const intervalVals = SCALES[scale] || SCALES.Minor;
    const isKO = kit === 'K.O';
    const kitInfo = { isKO };

    // Ensure all tracks the generator uses exist in the pattern
    ensureAllTracks(newPattern, steps);

    // Resize / Clear Unlocked
    Object.keys(newPattern).forEach(tid => {
        if (!lockedTracks[tid]) {
            newPattern[tid] = new Array(steps).fill(null);
        } else {
            if (newPattern[tid].length !== steps) {
                const resized = new Array(steps).fill(null);
                for (let i = 0; i < Math.min(newPattern[tid].length, steps); i++) resized[i] = newPattern[tid][i];
                newPattern[tid] = resized;
            }
        }
    });

    // 2. Choose Archetype
    const list = ARCHETYPES[genre] || ARCHETYPES.house;
    const archetype = list[Math.floor(Math.random() * list.length)];

    // 3. Apply Archetype Layers
    Object.keys(archetype).forEach(tid => {
        if (!lockedTracks[tid]) {
            applySchema(newPattern, tid, archetype[tid], steps, 0, 1, kitInfo);
        }
    });

    // 4. Procedural Fills & Complexity Layers
    const compSimple = complexity === 'simple';
    const compHigh = complexity === 'high' || complexity === 'extreme';
    const compExtreme = complexity === 'extreme';

    // -- SIMPLE MODE: REDUCTIVE --
    if (compSimple) {
        // Strip out complex elements, enforce basic rhythmic structure
        // Keep Kick on beats, Snare on 5/13 (for house) or 9 (for hiphop)
        // Remove Ghost notes
        Object.keys(newPattern).forEach(tid => {
            if (lockedTracks[tid]) return;
            // Iterate pattern
            for (let i = 0; i < steps; i++) {
                if (newPattern[tid][i]) {
                    // Remove ghosts or low velocity
                    if (newPattern[tid][i].vel < 0.6) newPattern[tid][i] = null;
                }
            }
        });

        // Ensure specific simplicity
        if (!lockedTracks['kick']) {
            // Force 4-on-floor for House
            if (genre === 'house' || genre === 'dnb') {
                for (let i = 0; i < steps; i += 4) {
                    newPattern.kick[i] = { vel: 0.9, pitch: 0, prob: 1, sampleIndex: isKO ? 0 : 0 };
                }
                // Remove off-beats
                for (let i = 0; i < steps; i++) {
                    if (i % 4 !== 0) newPattern.kick[i] = null;
                }
            }
        }
        return newPattern; // Return early for simple
    }

    // -- Kick Variations (Moderate+) --
    if (!lockedTracks['kick'] && Math.random() > 0.5) {
        const idx = Math.floor(Math.random() * steps);
        if (idx % 4 !== 0) {
            newPattern.kick[idx] = {
                vel: 0.8,
                pitch: 0,
                prob: 1,
                sampleIndex: isKO ? Math.floor(Math.random() * 30) : 0
            };
        }
    }

    // -- HiHat Rolls (High+) --
    if ((genre === 'hiphop' || genre === 'dnb') && !lockedTracks['hatC'] && compHigh) {
        for (let i = 0; i < steps; i++) {
            if (!newPattern.hatC[i] && Math.random() < 0.2) {
                newPattern.hatC[i] = {
                    vel: 0.6,
                    pitch: 0,
                    prob: 0.8,
                    sampleIndex: isKO ? Math.floor(Math.random() * 30) : 0
                };
            }
        }
    }

    // -- Percussion (Euclidean) --
    if (!lockedTracks['perc1']) {
        const hits = compExtreme ? 7 : (compHigh ? 5 : 3);
        const pat = getEuclideanPattern(hits, 16);
        for (let i = 0; i < steps; i++) {
            if (pat[i % 16]) {
                const pos = (i + 1) % steps;
                // In Extreme mode, add more randomness to position or velocity
                if (!newPattern.perc1[pos]) newPattern.perc1[pos] = {
                    vel: compExtreme ? 0.5 + Math.random() * 0.4 : 0.7,
                    pitch: 0,
                    prob: 1,
                    sampleIndex: isKO ? Math.floor(Math.random() * 30) : 0
                };
            }
        }
    }

    if (!lockedTracks['perc2'] && (compHigh || compExtreme)) {
        // More active in high/extreme
        const density = compExtreme ? 0.4 : 0.2;
        for (let i = 0; i < steps; i++) {
            if (Math.random() < density && !newPattern.perc2[i]) {
                newPattern.perc2[i] = {
                    vel: 0.5,
                    pitch: compExtreme ? Math.floor(Math.random() * 12) : 12,
                    prob: 0.7,
                    sampleIndex: isKO ? Math.floor(Math.random() * 30) : 0
                };
            }
        }
    }

    // Bass and Chords generation removed - users can add these manually if desired

    return newPattern;
}

export function generateVariation(type, currentPattern, steps, lockedTracks) {
    const newPattern = JSON.parse(JSON.stringify(currentPattern));

    // Ensure all tracks exist before manipulation
    ensureAllTracks(newPattern, steps);

    const half = Math.floor(steps / 2);
    const quarter = Math.floor(steps / 4);

    // Helper: Copy range
    const copyRange = (srcStart, destStart, length) => {
        Object.keys(newPattern).forEach(tid => {
            if (lockedTracks[tid]) return;
            for (let i = 0; i < length; i++) {
                const srcStep = newPattern[tid][srcStart + i];
                newPattern[tid][destStart + i] = srcStep ? { ...srcStep } : null;
            }
        });
    };

    if (type === 'ab') {
        // A/B Split: Create two different patterns with different instrument focus
        // Part A (first half): Keep core groove (kick, snare, hats)
        // Part B (second half): Different instrumentation (more perc, claps, less kick)

        // Define instrument groups
        const coreInstruments = ['kick', 'snare', 'hatC', 'hatO'];
        const altInstruments = ['clap', 'tomL', 'tomH', 'ride', 'crash', 'perc1', 'perc2'];

        // First, clear part B for non-locked tracks
        Object.keys(newPattern).forEach(tid => {
            if (lockedTracks[tid]) return;
            for (let i = half; i < steps; i++) {
                newPattern[tid][i] = null;
            }
        });

        // For Part B, randomly select 2-4 instruments to feature
        const shuffledAlt = [...altInstruments].sort(() => Math.random() - 0.5);
        const bInstruments = shuffledAlt.slice(0, 2 + Math.floor(Math.random() * 3)); // 2-4 instruments

        // Add some core elements to B but with reduced density
        if (Math.random() > 0.3) bInstruments.push('kick'); // 70% chance to include kick
        if (Math.random() > 0.5) bInstruments.push('snare'); // 50% chance for snare

        // Generate Part B with the selected instruments
        Object.keys(newPattern).forEach(tid => {
            if (lockedTracks[tid]) return;

            if (bInstruments.includes(tid)) {
                // Copy from A section as starting point
                for (let i = 0; i < half && (half + i) < steps; i++) {
                    const srcStep = newPattern[tid][i];
                    if (srcStep) {
                        newPattern[tid][half + i] = { ...srcStep };
                        // Small velocity variation
                        newPattern[tid][half + i].vel = Math.max(0.3, Math.min(1, srcStep.vel + (Math.random() - 0.5) * 0.2));
                    }
                }

                // If this instrument had no notes in A, create a simple pattern
                const hasNotes = newPattern[tid].slice(half, steps).some(s => s !== null);
                if (!hasNotes) {
                    // Create simple pattern based on instrument type
                    for (let i = half; i < steps; i++) {
                        const beatPos = (i - half) % 4;
                        let shouldAdd = false;

                        if (tid === 'kick') shouldAdd = beatPos === 0;
                        else if (tid === 'snare' || tid === 'clap') shouldAdd = beatPos === 2;
                        else if (tid.includes('hat')) shouldAdd = Math.random() > 0.5;
                        else if (tid.includes('tom')) shouldAdd = Math.random() > 0.7 && beatPos % 2 === 0;
                        else shouldAdd = Math.random() > 0.75;

                        if (shouldAdd) {
                            newPattern[tid][i] = { vel: 0.6 + Math.random() * 0.3, pitch: 0, prob: 1, sampleIndex: 0 };
                        }
                    }
                }
            }
        });
    }

    if (type === 'fill') {
        // Fill: clear and regenerate last bar (last 1/4 of steps)
        const fillStart = steps - quarter;
        Object.keys(newPattern).forEach(tid => {
            if (lockedTracks[tid]) return;
            // Clear
            for (let i = fillStart; i < steps; i++) newPattern[tid][i] = null;

            // Generate Fill
            // Snare roll?
            if (tid === 'snare' || tid === 'tomL' || tid === 'tomH') {
                for (let i = fillStart; i < steps; i++) {
                    if (Math.random() > 0.3) {
                        newPattern[tid][i] = {
                            vel: 0.5 + ((i - fillStart) / quarter) * 0.5, // Rising velocity
                            pitch: 0,
                            prob: 1,
                            sampleIndex: 0
                        };
                    }
                }
            }
            // Crash at end?
            if (tid === 'crash' && Math.random() > 0.7) {
                newPattern[tid][steps - 1] = { vel: 1, pitch: 0, prob: 1, sampleIndex: 0 };
            }
        });
    }

    if (type === 'build') {
        // Build: Exponentially increase density and velocity in 2nd half
        Object.keys(newPattern).forEach(tid => {
            if (lockedTracks[tid]) return;

            // Clear specific melodic/chill elements in 2nd half to focus on rhythm
            if ((tid === 'chord' || tid === 'bass') && Math.random() > 0.5) {
                for (let i = half; i < steps; i++) newPattern[tid][i] = null;
            }

            for (let i = half; i < steps; i++) {
                const progress = (i - half) / half; // 0.0 -> 1.0

                // Snare/Clap rush
                if ((tid === 'snare' || tid === 'clap') && (i % 2 !== 0)) {
                    // Add off-beats increasingly
                    if (Math.random() < progress * 0.8) {
                        newPattern[tid][i] = { vel: 0.6 + (progress * 0.4), pitch: 0, prob: 1, sampleIndex: 0 };
                    }
                }

                // Kick 4-floor reinforcement
                if (tid === 'kick' && (i % 4 === 0)) {
                    newPattern[tid][i] = { vel: 1.0, pitch: 0, prob: 1, sampleIndex: 0 };
                }

                // Rising velocity for all existing
                if (newPattern[tid][i]) {
                    newPattern[tid][i].vel = Math.min(1.0, newPattern[tid][i].vel + (progress * 0.3));
                }
            }
        });
    }

    if (type === 'drop') {
        // Drop: Heavy Kick/Bass, sparse others
        Object.keys(newPattern).forEach(tid => {
            if (lockedTracks[tid]) return;

            // Clear most
            for (let i = 0; i < steps; i++) newPattern[tid][i] = null;

            // Heavy Kick
            if (tid === 'kick') {
                for (let i = 0; i < steps; i += 4) newPattern[tid][i] = { vel: 1, pitch: 0, prob: 1, sampleIndex: 0 };
            }
            // Heavy Bass off-beat or sustained
            if (tid === 'bass') {
                for (let i = 2; i < steps; i += 4) newPattern[tid][i] = { vel: 0.9, pitch: 0, prob: 1, sampleIndex: 0 };
            }
            // Simple Hat
            if (tid === 'hatC') {
                for (let i = 2; i < steps; i += 2) newPattern[tid][i] = { vel: 0.7, pitch: 0, prob: 1, sampleIndex: 0 };
            }
        });
    }

    return newPattern;
}
