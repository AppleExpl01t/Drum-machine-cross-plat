export const NOTES = {
    C1: 32.70, Eb1: 38.89, F1: 43.65, G1: 49.00, Bb1: 58.27,
    C2: 65.41, Eb2: 77.78, F2: 87.31, G2: 98.00, Bb2: 116.54,
    C3: 130.81, Eb3: 155.56, G3: 196.00
};

export const TRACKS = [
    { id: 'kick', label: 'KICK', class: 'color-kick', type: 'drum' },
    { id: 'snare', label: 'SNARE', class: 'color-snare', type: 'drum' },
    { id: 'clap', label: 'CLAP', class: 'color-perc', type: 'perc' },
    { id: 'hatC', label: 'HAT (CL)', class: 'color-hat', type: 'hat' },
    { id: 'hatO', label: 'HAT (OP)', class: 'color-hat', type: 'hat' },
    { id: 'tomL', label: 'TOM LO', class: 'color-perc', type: 'perc' },
    { id: 'tomH', label: 'TOM HI', class: 'color-perc', type: 'perc' },
    { id: 'ride', label: 'RIDE', class: 'color-hat', type: 'hat' },
    { id: 'crash', label: 'CRASH', class: 'color-perc', type: 'cymb' },
    { id: 'perc1', label: 'PERC 1', class: 'color-perc', type: 'perc' },
    { id: 'perc2', label: 'PERC 2', class: 'color-perc', type: 'perc' },
    { id: 'fx1', label: 'FX 1', class: 'color-perc', type: 'fx' },
    { id: 'fx2', label: 'FX 2', class: 'color-perc', type: 'fx' }
];

// Direct color mapping for each track (matches CSS class colors)
export const TRACK_COLORS = {
    kick: '#ff5252',
    snare: '#ffab40',
    clap: '#00bcd4',
    hatC: '#fab1a0',
    hatO: '#fab1a0',
    tomL: '#00bcd4',
    tomH: '#00bcd4',
    ride: '#fab1a0',
    crash: '#00bcd4',
    perc1: '#00bcd4',
    perc2: '#00bcd4',
    fx1: '#9c27b0',
    fx2: '#673ab7'
};

export const KITS = {
    house: ['TR-909', 'TR-808', 'TR-707', 'LinnDrum', 'Modern House', 'K.O'],
    dnb: ['Jungle', 'Modern DnB', 'Liquid', 'Techstep', 'K.O'],
    rock: ['Studio A', 'Garage', 'Heavy Metal', 'Indie LoFi', 'K.O'],
    jazz: ['Vintage Gretsch', 'Brush Kit', 'Fusion', 'BeBop', 'K.O'],
    hiphop: ['TR-808 Clean', 'MPC 60', 'Trap Zilla', 'LoFi Chill', 'K.O']
};

// Genre-specific default BPMs
export const GENRE_BPM = {
    house: 124,
    dnb: 174,
    rock: 120,
    jazz: 140,
    hiphop: 90
};

// Complexity settings
export const COMPLEXITY = {
    simple: { density: 0.1, syncopation: 0.0 },
    moderate: { density: 0.3, syncopation: 0.2 },
    high: { density: 0.6, syncopation: 0.5 },
    extreme: { density: 0.9, syncopation: 0.8 }
};
