import { NOTES, TRACKS } from './constants';
import MidiWriter from 'midi-writer-js';
import { save, open } from '@tauri-apps/plugin-dialog';
import { writeFile, mkdir } from '@tauri-apps/plugin-fs';
import lamejs from 'lamejs';


class AudioEngine {
    constructor() {
        this.ctx = null;
        this.isPlaying = false;
        this.currentStep = 0;
        this.nextNoteTime = 0.0;
        this.timerID = null;

        this.pattern = {};
        this.muted = {};
        this.soloed = null;
        this.bpm = 124;
        this.swing = 0;
        this.humanize = 0.1;
        this.steps = 32;
        this.currentKit = 'house';
        this.currentGenre = 'house';

        this.noiseBuffers = {};
        this.kitBuffers = {};
        this.kitManifests = {};

        this.trackBuses = {};
        this.masterBus = null;

        this.fx = {
            reverb: null, reverbGain: null,
            delay: null, delayFeedback: null, delayGain: null,
            panner: null, pannerLFO: null, pannerLFOGain: null,
            stutter: null,
            limiter: null
        };

        this.fxSettings = {
            reverb: { active: false, wet: 0.3 },
            delay: { active: false, wet: 0.3, feedback: 0.4 },
            panner: { active: false, rate: 0.5, depth: 0.8 },
            stutter: { active: false },
            masterVol: 0.8
        };

        this.onStepChange = null;
    }

    init() {
        if (this.ctx) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();

        this.masterBus = this.ctx.createGain();
        this.masterBus.gain.value = this.fxSettings.masterVol;

        this.fx.limiter = this.ctx.createDynamicsCompressor();
        this.fx.limiter.threshold.setValueAtTime(-1.0, this.ctx.currentTime);
        this.fx.limiter.ratio.setValueAtTime(20, this.ctx.currentTime);

        this.initFX();

        TRACKS.forEach(track => {
            const trackGain = this.ctx.createGain();
            const trackPanner = this.ctx.createStereoPanner();
            trackPanner.connect(trackGain);
            trackGain.connect(this.masterBus);
            this.trackBuses[track.id] = { gain: trackGain, panner: trackPanner };
        });

        this.masterBus.connect(this.fx.stutter);
        this.fx.stutter.connect(this.fx.panner);
        this.fx.panner.connect(this.fx.limiter);
        this.fx.limiter.connect(this.ctx.destination);

        this.masterBus.connect(this.fx.reverb);
        this.fx.reverbGain.connect(this.fx.limiter);
        this.masterBus.connect(this.fx.delay);
        this.fx.delayGain.connect(this.fx.limiter);
    }

    initFX() {
        const ctx = this.ctx;
        this.fx.reverb = ctx.createConvolver();
        this.fx.reverbGain = ctx.createGain();
        this.fx.reverbGain.gain.value = 0;
        this.fx.reverb.connect(this.fx.reverbGain);
        this.generateImpulseResponse();

        this.fx.delay = ctx.createDelay(2.0);
        this.fx.delayFeedback = ctx.createGain();
        this.fx.delayGain = ctx.createGain();
        this.fx.delayGain.gain.value = 0;
        this.fx.delay.connect(this.fx.delayFeedback);
        this.fx.delayFeedback.connect(this.fx.delay);
        this.fx.delay.connect(this.fx.delayGain);
        this.updateDelayParams();

        this.fx.stutter = ctx.createGain();
        this.fx.stutter.gain.value = 1.0;

        this.fx.panner = ctx.createStereoPanner();
        this.fx.pannerLFO = ctx.createOscillator();
        this.fx.pannerLFOGain = ctx.createGain();
        this.fx.pannerLFO.type = 'sine';
        this.fx.pannerLFO.connect(this.fx.pannerLFOGain);
        this.fx.pannerLFOGain.connect(this.fx.panner.pan);
        this.fx.pannerLFO.start();
        this.updatePannerParams();
    }

    updateDelayParams() {
        if (!this.fx.delay) return;
        const beatSecs = 60 / this.bpm;
        this.fx.delay.delayTime.setTargetAtTime(beatSecs * 0.75, this.ctx.currentTime, 0.1);
        this.fx.delayFeedback.gain.setTargetAtTime(this.fxSettings.delay.feedback, this.ctx.currentTime, 0.1);
    }

    updatePannerParams() {
        if (!this.fx.pannerLFO) return;
        const hz = (this.bpm / 60) * this.fxSettings.panner.rate;
        this.fx.pannerLFO.frequency.setTargetAtTime(hz, this.ctx.currentTime, 0.1);
        const depth = this.fxSettings.panner.active ? this.fxSettings.panner.depth : 0;
        this.fx.pannerLFOGain.gain.setTargetAtTime(depth, this.ctx.currentTime, 0.1);
    }

    generateImpulseResponse() {
        if (!this.ctx) return;
        const sampleRate = this.ctx.sampleRate;
        const length = sampleRate * 2.0;
        const impulse = this.ctx.createBuffer(2, length, sampleRate);
        for (let i = 0; i < 2; i++) {
            const channel = impulse.getChannelData(i);
            for (let j = 0; j < length; j++) {
                channel[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / length, 2.5);
            }
        }
        this.fx.reverb.buffer = impulse;
    }

    setFX(type, settings) {
        this.init();
        if (type !== 'master') {
            Object.assign(this.fxSettings[type], settings);
        }
        switch (type) {
            case 'reverb':
                const revVol = this.fxSettings.reverb.active ? this.fxSettings.reverb.wet : 0;
                this.fx.reverbGain.gain.setTargetAtTime(revVol, this.ctx.currentTime, 0.05);
                break;
            case 'delay':
                const delVol = this.fxSettings.delay.active ? this.fxSettings.delay.wet : 0;
                this.fx.delayGain.gain.setTargetAtTime(delVol, this.ctx.currentTime, 0.05);
                this.updateDelayParams();
                break;
            case 'panner':
                this.updatePannerParams();
                break;
            case 'master':
                if (settings.vol !== undefined && this.masterBus) {
                    this.fxSettings.masterVol = settings.vol;
                    this.masterBus.gain.setTargetAtTime(settings.vol, this.ctx.currentTime, 0.05);
                }
                break;
        }
    }

    async loadSample(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) return null;
            const arrayBuffer = await response.arrayBuffer();
            return await this.ctx.decodeAudioData(arrayBuffer);
        } catch (e) { return null; }
    }

    async loadKitSamples(kitName) {
        if (this.kitBuffers[kitName]) return;
        this.init();
        let manifest = { kick: 30, snare: 30, clap: 30, hatC: 30, hatO: 30, tomL: 30, tomH: 30, ride: 30, crash: 30, perc1: 30, perc2: 30, fx1: 30, fx2: 30 };
        if (kitName === 'K.O') {
            try {
                const mResp = await fetch(`./samples/KO/manifest.json`);
                if (mResp.ok) {
                    manifest = await mResp.json();
                    this.kitManifests[kitName] = manifest;
                }
            } catch (e) { }
            const tracks = Object.keys(manifest);
            const kitData = {};
            await Promise.all(tracks.map(async (trackId) => {
                const count = manifest[trackId] || 0;
                const buffers = [];
                const effectiveCount = Math.min(count, 40);
                const loadTasks = [];
                for (let i = 0; i < effectiveCount; i++) loadTasks.push(this.loadSample(`./samples/KO/${trackId}_${i}.wav`));
                const loaded = await Promise.all(loadTasks);
                loaded.forEach(buf => { if (buf) buffers.push(buf); });
                if (buffers.length > 0) kitData[trackId] = buffers;
            }));
            this.kitBuffers[kitName] = kitData;
        }
    }

    getNoise(type = 'white') {
        if (this.noiseBuffers[type]) return this.noiseBuffers[type];
        const size = this.ctx.sampleRate * 2;
        const buffer = this.ctx.createBuffer(1, size, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < size; i++) data[i] = type === 'white' ? Math.random() * 2 - 1 : (Math.random() + Math.random()) - 1;
        this.noiseBuffers[type] = buffer;
        return buffer;
    }

    playSound(trackId, time, stepData, customCtx = null) {
        const ctx = customCtx || this.ctx;
        if (!ctx) return;
        if (Math.random() > stepData.prob) return;
        const isLofi = this.currentGenre === 'lofi';
        const vel = stepData.vel * (1 - (Math.random() * this.humanize * 0.3));
        const routingTarget = customCtx ? customCtx.destination : this.trackBuses[trackId]?.gain;
        if (!routingTarget) return;

        if (this.kitBuffers[this.currentKit] && this.kitBuffers[this.currentKit][trackId]) {
            const buffers = this.kitBuffers[this.currentKit][trackId];
            if (buffers.length > 0) {
                const sampleIndex = stepData.sampleIndex !== undefined ? stepData.sampleIndex : 0;
                const buffer = buffers[sampleIndex % buffers.length];
                if (buffer) {
                    const source = ctx.createBufferSource();
                    source.buffer = buffer;
                    const sourceGain = ctx.createGain();
                    sourceGain.gain.setValueAtTime(vel, time);
                    if (trackId === 'bass' || trackId === 'chord' || trackId.startsWith('tom') || stepData.pitch !== 0) {
                        source.playbackRate.setValueAtTime(Math.pow(2, stepData.pitch / 12), time);
                    }
                    source.connect(sourceGain); sourceGain.connect(routingTarget);
                    source.start(time); return;
                }
            }
        }

        const osc = ctx.createOscillator(); const gain = ctx.createGain();


        // --- KICK SYNTHESIS ---
        if (trackId === 'kick') {
            osc.connect(gain); gain.connect(routingTarget);

            if (this.currentKit.includes('808')) {
                // 808: Deep sub kick - starts low, quick pitch drop, long decay
                osc.frequency.setValueAtTime(55, time); // Start at sub frequency
                osc.frequency.exponentialRampToValueAtTime(28, time + 0.15); // Quick drop to deep sub
                gain.gain.setValueAtTime(vel * 1.2, time); // Boost for presence
                gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4); // Tighter decay
            } else if (this.currentKit.includes('909')) {
                // 909: Punchy kick with click - mid-low start, quick decay
                osc.frequency.setValueAtTime(100, time); // Start at punchy frequency
                osc.frequency.exponentialRampToValueAtTime(35, time + 0.08); // Very quick pitch drop
                gain.gain.setValueAtTime(vel * 1.1, time);
                gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25); // Tight decay
                // Add characteristic 909 click
                const click = ctx.createOscillator(); click.type = 'triangle';
                const cGain = ctx.createGain();
                click.connect(cGain); cGain.connect(routingTarget);
                click.frequency.setValueAtTime(400, time); // Higher click
                cGain.gain.setValueAtTime(vel * 0.4, time);
                cGain.gain.exponentialRampToValueAtTime(0.001, time + 0.015);
                click.start(time); click.stop(time + 0.015);
            } else if (this.currentKit.includes('707')) {
                // 707: Dry, short, boxy
                osc.frequency.setValueAtTime(130, time);
                osc.frequency.linearRampToValueAtTime(60, time + 0.1);
                gain.gain.setValueAtTime(vel, time);
                gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
            } else if (this.currentKit.includes('Linn')) {
                // LinnDrum: Warm, round analog kick with longer sustain
                osc.frequency.setValueAtTime(70, time);
                osc.frequency.exponentialRampToValueAtTime(40, time + 0.12);
                gain.gain.setValueAtTime(vel * 1.0, time);
                gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);
            } else if (this.currentKit.includes('Modern House')) {
                // Modern House: Tight, clean, punchy kick with fast attack/decay
                osc.frequency.setValueAtTime(90, time);
                osc.frequency.exponentialRampToValueAtTime(38, time + 0.05);
                gain.gain.setValueAtTime(vel * 1.15, time);
                gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
                // Subtle top-end click for definition
                const click = ctx.createOscillator(); click.type = 'sine';
                const cGain = ctx.createGain();
                click.connect(cGain); cGain.connect(routingTarget);
                click.frequency.setValueAtTime(2500, time);
                cGain.gain.setValueAtTime(vel * 0.15, time);
                cGain.gain.exponentialRampToValueAtTime(0.001, time + 0.008);
                click.start(time); click.stop(time + 0.01);
            } else {
                // Default: balanced kick
                osc.frequency.setValueAtTime(80, time); osc.frequency.exponentialRampToValueAtTime(30, time + 0.2);
                gain.gain.setValueAtTime(vel, time); gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
            }
            osc.start(time); osc.stop(time + 0.5);

            // --- SNARE SYNTHESIS ---
        } else if (trackId === 'snare') {
            const noise = ctx.createBufferSource(); noise.buffer = this.getNoise();
            const nFilter = ctx.createBiquadFilter();
            const nGain = ctx.createGain();

            noise.connect(nFilter); nFilter.connect(nGain); nGain.connect(routingTarget);

            if (this.currentKit.includes('808')) {
                // 808: Snappy, high tone
                nFilter.type = 'highpass'; nFilter.frequency.value = 2000;
                nGain.gain.setValueAtTime(vel * 0.8, time);
                nGain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

                // Tonal
                const body = ctx.createOscillator(); body.type = 'triangle';
                const bGain = ctx.createGain();
                body.connect(bGain); bGain.connect(routingTarget);
                body.frequency.setValueAtTime(250, time);
                body.frequency.exponentialRampToValueAtTime(150, time + 0.1); // pitch drop
                bGain.gain.setValueAtTime(vel * 0.6, time);
                bGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
                body.start(time); body.stop(time + 0.15);
            } else if (this.currentKit.includes('909')) {
                // 909: Lower body, crisper noise
                nFilter.type = 'lowpass'; nFilter.frequency.value = 8000; // allow more body in noise
                const nFilter2 = ctx.createBiquadFilter(); nFilter2.type = 'highpass'; nFilter2.frequency.value = 1000;
                noise.disconnect(); noise.connect(nFilter); nFilter.connect(nFilter2); nFilter2.connect(nGain);

                nGain.gain.setValueAtTime(vel, time);
                nGain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);

                const body = ctx.createOscillator(); body.type = 'sine';
                const bGain = ctx.createGain();
                body.connect(bGain); bGain.connect(routingTarget);
                body.frequency.setValueAtTime(200, time);
                body.frequency.linearRampToValueAtTime(160, time + 0.1);
                bGain.gain.setValueAtTime(vel * 0.7, time);
                bGain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
                body.start(time); body.stop(time + 0.2);
            } else if (this.currentKit.includes('707')) {
                // 707: Very dry, tight
                nFilter.type = 'highpass'; nFilter.frequency.value = 3000;
                nGain.gain.setValueAtTime(vel * 0.7, time);
                nGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

                const body = ctx.createOscillator(); body.type = 'square'; // boxy
                const bGain = ctx.createGain();
                const bFilter = ctx.createBiquadFilter(); bFilter.type = 'lowpass'; bFilter.frequency.value = 600;
                body.connect(bFilter); bFilter.connect(bGain); bGain.connect(routingTarget);

                body.frequency.setValueAtTime(200, time);
                bGain.gain.setValueAtTime(vel * 0.4, time);
                bGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
                body.start(time); body.stop(time + 0.1);
            } else if (this.currentKit.includes('Linn')) {
                // LinnDrum: Warm, fat snare with longer decay
                nFilter.type = 'bandpass'; nFilter.frequency.value = 2000; nFilter.Q.value = 0.5;
                nGain.gain.setValueAtTime(vel * 0.85, time);
                nGain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);

                const body = ctx.createOscillator(); body.type = 'triangle';
                const bGain = ctx.createGain();
                body.connect(bGain); bGain.connect(routingTarget);
                body.frequency.setValueAtTime(220, time);
                body.frequency.exponentialRampToValueAtTime(140, time + 0.08);
                bGain.gain.setValueAtTime(vel * 0.55, time);
                bGain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
                body.start(time); body.stop(time + 0.2);
            } else if (this.currentKit.includes('Modern House')) {
                // Modern House: Tight, crisp snare with clear attack
                nFilter.type = 'highpass'; nFilter.frequency.value = 2500;
                nGain.gain.setValueAtTime(vel * 0.9, time);
                nGain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

                const body = ctx.createOscillator(); body.type = 'sine';
                const bGain = ctx.createGain();
                body.connect(bGain); bGain.connect(routingTarget);
                body.frequency.setValueAtTime(240, time);
                body.frequency.exponentialRampToValueAtTime(180, time + 0.04);
                bGain.gain.setValueAtTime(vel * 0.5, time);
                bGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
                body.start(time); body.stop(time + 0.1);
            } else {
                // Default logic
                nFilter.type = isLofi ? 'lowpass' : 'highpass';
                nFilter.frequency.value = isLofi ? 3000 : 1000;
                nGain.gain.setValueAtTime(vel, time); nGain.gain.exponentialRampToValueAtTime(0.001, time + (isLofi ? 0.1 : 0.2));
                const body = ctx.createOscillator(); body.type = 'triangle'; const bGain = ctx.createGain();
                body.connect(bGain); bGain.connect(routingTarget); body.frequency.setValueAtTime(180, time);
                bGain.gain.setValueAtTime(vel * 0.5, time); bGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
                body.start(time); body.stop(time + 0.1);
            }
            noise.start(time); noise.stop(time + 0.4);

            // --- HATS / CYMBALS ---
        } else if (trackId.includes('hat') || trackId === 'crash' || trackId === 'ride') {
            const noise = ctx.createBufferSource();
            // 808 Hats are actually 6 square waves, but noise is decent approx if filtered right.
            // 909 Hats are sample based usually, but we can synthesize closer.

            if (this.currentKit.includes('808')) {
                // Metallic, cluster of oscillators is ideal but expensive. Filtered noise is okay.
                noise.buffer = this.getNoise('white');
                const bpf = ctx.createBiquadFilter(); bpf.type = 'bandpass'; bpf.frequency.value = 6000; bpf.Q.value = 2;
                const hpf = ctx.createBiquadFilter(); hpf.type = 'highpass'; hpf.frequency.value = 7000;
                noise.connect(bpf); bpf.connect(hpf); hpf.connect(gain);
            } else {
                noise.buffer = this.getNoise('white');
                const nFilter = ctx.createBiquadFilter(); nFilter.type = 'highpass';
                nFilter.frequency.value = this.currentKit.includes('909') ? 8000 : 4000;
                noise.connect(nFilter); nFilter.connect(gain);
            }

            gain.connect(routingTarget);

            let dura = 0.05, vol = vel * 0.8;
            if (trackId === 'hatO') dura = 0.3;
            else if (trackId === 'crash') { dura = 1.2; vol = vel * 0.6; }
            else if (trackId === 'ride') { dura = 0.6; vol = vel * 0.5; }

            // Adjust decay for kits
            if (this.currentKit.includes('909') && trackId === 'hatC') dura = 0.08; // slightly longer, crisper
            if (this.currentKit.includes('707') && trackId === 'hatC') dura = 0.03; // super tight

            gain.gain.setValueAtTime(vol, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + dura);
            noise.start(time); noise.stop(time + dura + 0.2);
        } else if (trackId === 'perc1' || trackId === 'perc2' || trackId === 'clap') {
            const noise = ctx.createBufferSource(); noise.buffer = this.getNoise();
            const nFilter = ctx.createBiquadFilter(); nFilter.type = 'bandpass';
            nFilter.frequency.value = trackId === 'perc1' ? 2000 : (trackId === 'perc2' ? 3500 : 1500);
            noise.connect(nFilter); nFilter.connect(gain); gain.connect(routingTarget);
            gain.gain.setValueAtTime(vel * 0.5, time); gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
            noise.start(time); noise.stop(time + 0.2);
        } else if (trackId === 'tomL' || trackId === 'tomH') {
            osc.connect(gain); gain.connect(routingTarget);
            osc.frequency.setValueAtTime(trackId === 'tomL' ? 80 : 140, time); osc.frequency.exponentialRampToValueAtTime(40, time + 0.2);
            gain.gain.setValueAtTime(vel, time); gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
            osc.start(time); osc.stop(time + 0.2);
        } else if (trackId === 'chord') {
            [130.81, 164.81, 196.00].forEach(f => {
                const cOsc = ctx.createOscillator(); const cGain = ctx.createGain();
                cOsc.frequency.setValueAtTime(f * Math.pow(2, stepData.pitch / 12), time);
                cOsc.connect(cGain); cGain.connect(routingTarget);
                cGain.gain.setValueAtTime(vel * 0.2, time); cGain.gain.linearRampToValueAtTime(0, time + 0.5);
                cOsc.start(time); cOsc.stop(time + 0.6);
            });
        } else if (trackId === 'bass') {
            const f = ctx.createBiquadFilter(); osc.connect(f); f.connect(gain); gain.connect(routingTarget);
            osc.frequency.setValueAtTime(55 * Math.pow(2, stepData.pitch / 12), time);
            f.type = 'lowpass'; f.frequency.setValueAtTime(200, time);
            gain.gain.setValueAtTime(vel, time); gain.gain.linearRampToValueAtTime(0, time + 0.3);
            osc.start(time); osc.stop(time + 0.3);
        }
    }

    scheduler() {
        if (!this.ctx) return;
        while (this.nextNoteTime < this.ctx.currentTime + 0.1) {
            if (this.onStepChange) this.onStepChange(this.currentStep);
            let playTime = this.nextNoteTime;
            if (this.currentStep % 2 !== 0 && this.swing > 0) playTime += (this.swing * ((60.0 / this.bpm) / 4));
            if (this.humanize > 0) playTime += (Math.random() - 0.5) * (this.humanize * 0.02);
            if (this.fxSettings.stutter.active) {
                const sd = (60 / this.bpm) / 8;
                this.fx.stutter.gain.setValueAtTime(1, playTime); this.fx.stutter.gain.setValueAtTime(0, playTime + sd);
            } else this.fx.stutter.gain.setValueAtTime(1, playTime);
            for (const tid in this.pattern) {
                const sd = this.pattern[tid][this.currentStep];
                if (sd && !this.muted[tid] && (!this.soloed || this.soloed === tid)) this.playSound(tid, playTime, sd);
            }
            this.nextNoteTime += (60.0 / this.bpm) / 4;
            this.currentStep = (this.currentStep + 1) % this.steps;
            if (this.currentStep === 0 && this.onCycleStart) this.onCycleStart();
        }
        if (this.isPlaying) this.timerID = setTimeout(() => this.scheduler(), 25);
    }

    start() { this.init(); this.ctx.resume(); this.isPlaying = true; this.currentStep = 0; this.nextNoteTime = this.ctx.currentTime + 0.1; this.scheduler(); }
    stop() { this.isPlaying = false; clearTimeout(this.timerID); if (this.onStepChange) this.onStepChange(null); }

    async exportMIDI(filename = "drum-pattern") {
        const trackMidi = new MidiWriter.Track(); trackMidi.setTempo(this.bpm);
        const midiMap = { kick: 'C1', snare: 'D1', clap: 'Eb1', hatC: 'F#1', hatO: 'Bb1', tomL: 'A1', tomH: 'B1', ride: 'Eb2', crash: 'C2', perc1: 'G1', perc2: 'Ab1', fx1: 'C2', fx2: 'C3' };
        for (let i = 0; i < this.steps; i++) {
            for (const tid in this.pattern) {
                const step = this.pattern[tid][i];
                if (step) trackMidi.addEvent(new MidiWriter.NoteEvent({ pitch: [midiMap[tid]], duration: '16', startTick: i * 128, velocity: Math.floor(step.vel * 127) }));
            }
        }
        const write = new MidiWriter.Writer(trackMidi);
        const blob = new Blob([write.buildFile()], { type: "audio/midi" });
        await this.saveWithDialog(blob, `${filename}.mid`);
    }

    async exportAudio(mode = 'full', format = 'mp3', filename = "my-beat") {
        this.init(); const duration = (60 / this.bpm) * (this.steps / 4);
        if (mode === 'full') {
            const buffer = await this.renderOffline(duration, null, true);
            let blob, ext = 'wav';
            if (format === 'mp3') {
                blob = await this.encodeMp3(buffer, 320);
                ext = 'mp3';
                if (!blob) {
                    alert('MP3 encoding unavailable, exporting as WAV instead.');
                    blob = this.createWavBlob(buffer);
                    ext = 'wav';
                }
            } else {
                blob = this.createWavBlob(buffer);
            }
            if (blob) await this.saveWithDialog(blob, `${filename}.${ext}`);
        } else {
            const selectedDir = await open({ directory: true, multiple: false });
            if (!selectedDir) return;

            for (const track of TRACKS) {
                if (this.muted[track.id]) continue;
                if (this.soloed && this.soloed !== track.id) continue;

                const buffer = await this.renderOffline(duration, track.id, false);
                let blob, ext = 'wav';
                if (format === 'mp3') {
                    blob = await this.encodeMp3(buffer, 320);
                    ext = 'mp3';
                    if (!blob) {
                        blob = this.createWavBlob(buffer);
                        ext = 'wav';
                    }
                } else {
                    blob = this.createWavBlob(buffer);
                }

                if (blob) {
                    const fullPath = `${selectedDir}/${filename}-${track.id}.${ext}`;
                    await writeFile(fullPath, new Uint8Array(await blob.arrayBuffer()));
                }
            }
            alert('Stems exported successfully!');
        }
    }

    async renderOffline(duration, singleTrackId = null, respectMuteSolo = false) {
        // Force 48kHz for professional video/audio standard compatibility (as requested)
        const sr = 48000;
        const offlineCtx = new OfflineAudioContext(2, Math.max(sr * duration, 1), sr);

        // Create effects chain for offline context to preserve stereo effects
        const offlineMasterBus = offlineCtx.createGain();
        offlineMasterBus.gain.value = this.fxSettings.masterVol;

        // Create limiter for offline context
        const offlineLimiter = offlineCtx.createDynamicsCompressor();
        offlineLimiter.threshold.setValueAtTime(-1.0, 0);
        offlineLimiter.ratio.setValueAtTime(20, 0);

        // Create stereo panner with LFO for offline context
        const offlinePanner = offlineCtx.createStereoPanner();
        const offlinePannerLFO = offlineCtx.createOscillator();
        const offlinePannerLFOGain = offlineCtx.createGain();
        offlinePannerLFO.type = 'sine';
        const panHz = (this.bpm / 60) * this.fxSettings.panner.rate;
        offlinePannerLFO.frequency.value = panHz;
        const panDepth = this.fxSettings.panner.active ? this.fxSettings.panner.depth : 0;
        offlinePannerLFOGain.gain.value = panDepth;
        offlinePannerLFO.connect(offlinePannerLFOGain);
        offlinePannerLFOGain.connect(offlinePanner.pan);
        offlinePannerLFO.start();

        // Create reverb for offline context
        const offlineReverb = offlineCtx.createConvolver();
        const offlineReverbGain = offlineCtx.createGain();
        offlineReverbGain.gain.value = this.fxSettings.reverb.active ? this.fxSettings.reverb.wet : 0;
        // Generate impulse response for offline context
        const impulseLength = sr * 2.0;
        const impulse = offlineCtx.createBuffer(2, impulseLength, sr);
        for (let ch = 0; ch < 2; ch++) {
            const channel = impulse.getChannelData(ch);
            for (let j = 0; j < impulseLength; j++) {
                channel[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / impulseLength, 2.5);
            }
        }
        offlineReverb.buffer = impulse;
        offlineReverb.connect(offlineReverbGain);

        // Create delay for offline context
        const offlineDelay = offlineCtx.createDelay(2.0);
        const offlineDelayFeedback = offlineCtx.createGain();
        const offlineDelayGain = offlineCtx.createGain();
        const beatSecs = 60 / this.bpm;
        offlineDelay.delayTime.value = beatSecs * 0.75;
        offlineDelayFeedback.gain.value = this.fxSettings.delay.feedback;
        offlineDelayGain.gain.value = this.fxSettings.delay.active ? this.fxSettings.delay.wet : 0;
        offlineDelay.connect(offlineDelayFeedback);
        offlineDelayFeedback.connect(offlineDelay);
        offlineDelay.connect(offlineDelayGain);

        // Connect effects chain: masterBus -> panner -> limiter -> destination
        offlineMasterBus.connect(offlinePanner);
        offlinePanner.connect(offlineLimiter);
        offlineLimiter.connect(offlineCtx.destination);

        // Connect send effects: masterBus -> reverb/delay -> limiter
        offlineMasterBus.connect(offlineReverb);
        offlineReverbGain.connect(offlineLimiter);
        offlineMasterBus.connect(offlineDelay);
        offlineDelayGain.connect(offlineLimiter);

        // Play sounds through the offline effects chain
        for (let i = 0; i < this.steps; i++) {
            const time = (i * (60 / this.bpm)) / 4;
            for (const tid in this.pattern) {
                if (singleTrackId && tid !== singleTrackId) continue;

                // Apply mute/solo if rendering full mix with respect flag
                if (respectMuteSolo) {
                    if (this.muted[tid]) continue;
                    if (this.soloed && this.soloed !== tid) continue;
                }
                const step = this.pattern[tid][i];
                if (step) {
                    // Play sound to offline master bus instead of destination
                    this.playSoundOffline(tid, time, step, offlineCtx, offlineMasterBus);
                }
            }
        }
        return await offlineCtx.startRendering();
    }

    // Separate method to play sounds for offline rendering with proper routing
    playSoundOffline(trackId, time, stepData, ctx, masterBus) {
        if (Math.random() > stepData.prob) return;
        const vel = stepData.vel * (1 - (Math.random() * this.humanize * 0.3));
        const routingTarget = masterBus;
        if (!routingTarget) return;

        if (this.kitBuffers[this.currentKit] && this.kitBuffers[this.currentKit][trackId]) {
            const buffers = this.kitBuffers[this.currentKit][trackId];
            if (buffers.length > 0) {
                const sampleIndex = stepData.sampleIndex !== undefined ? stepData.sampleIndex : 0;
                const buffer = buffers[sampleIndex % buffers.length];
                if (buffer) {
                    const source = ctx.createBufferSource();
                    source.buffer = buffer;
                    const sourceGain = ctx.createGain();
                    sourceGain.gain.setValueAtTime(vel, time);
                    if (trackId === 'bass' || trackId === 'chord' || trackId.startsWith('tom') || stepData.pitch !== 0) {
                        source.playbackRate.setValueAtTime(Math.pow(2, stepData.pitch / 12), time);
                    }
                    source.connect(sourceGain);
                    sourceGain.connect(routingTarget);
                    source.start(time);
                    return;
                }
            }
        }

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // --- KICK SYNTHESIS ---
        if (trackId === 'kick') {
            osc.connect(gain);
            gain.connect(routingTarget);

            if (this.currentKit.includes('808')) {
                osc.frequency.setValueAtTime(55, time);
                osc.frequency.exponentialRampToValueAtTime(28, time + 0.15);
                gain.gain.setValueAtTime(vel * 1.2, time);
                gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);
            } else if (this.currentKit.includes('909')) {
                osc.frequency.setValueAtTime(100, time);
                osc.frequency.exponentialRampToValueAtTime(35, time + 0.08);
                gain.gain.setValueAtTime(vel * 1.1, time);
                gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);
                const click = ctx.createOscillator();
                click.type = 'triangle';
                const cGain = ctx.createGain();
                click.connect(cGain);
                cGain.connect(routingTarget);
                click.frequency.setValueAtTime(400, time);
                cGain.gain.setValueAtTime(vel * 0.4, time);
                cGain.gain.exponentialRampToValueAtTime(0.001, time + 0.015);
                click.start(time);
                click.stop(time + 0.015);
            } else if (this.currentKit.includes('707')) {
                osc.frequency.setValueAtTime(130, time);
                osc.frequency.linearRampToValueAtTime(60, time + 0.1);
                gain.gain.setValueAtTime(vel, time);
                gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
            } else if (this.currentKit.includes('Linn')) {
                osc.frequency.setValueAtTime(70, time);
                osc.frequency.exponentialRampToValueAtTime(40, time + 0.12);
                gain.gain.setValueAtTime(vel * 1.0, time);
                gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);
            } else if (this.currentKit.includes('Modern House')) {
                osc.frequency.setValueAtTime(90, time);
                osc.frequency.exponentialRampToValueAtTime(38, time + 0.05);
                gain.gain.setValueAtTime(vel * 1.15, time);
                gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
                const click = ctx.createOscillator();
                click.type = 'sine';
                const cGain = ctx.createGain();
                click.connect(cGain);
                cGain.connect(routingTarget);
                click.frequency.setValueAtTime(2500, time);
                cGain.gain.setValueAtTime(vel * 0.15, time);
                cGain.gain.exponentialRampToValueAtTime(0.001, time + 0.008);
                click.start(time);
                click.stop(time + 0.01);
            } else {
                osc.frequency.setValueAtTime(80, time);
                osc.frequency.exponentialRampToValueAtTime(30, time + 0.2);
                gain.gain.setValueAtTime(vel, time);
                gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
            }
            osc.start(time);
            osc.stop(time + 0.5);

            // --- SNARE SYNTHESIS ---
        } else if (trackId === 'snare') {
            const noise = ctx.createBufferSource();
            noise.buffer = this.getNoise();
            const nFilter = ctx.createBiquadFilter();
            const nGain = ctx.createGain();

            noise.connect(nFilter);
            nFilter.connect(nGain);
            nGain.connect(routingTarget);

            if (this.currentKit.includes('808')) {
                nFilter.type = 'highpass';
                nFilter.frequency.value = 2000;
                nGain.gain.setValueAtTime(vel * 0.8, time);
                nGain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
                const body = ctx.createOscillator();
                body.type = 'triangle';
                const bGain = ctx.createGain();
                body.connect(bGain);
                bGain.connect(routingTarget);
                body.frequency.setValueAtTime(250, time);
                body.frequency.exponentialRampToValueAtTime(150, time + 0.1);
                bGain.gain.setValueAtTime(vel * 0.6, time);
                bGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
                body.start(time);
                body.stop(time + 0.15);
            } else if (this.currentKit.includes('909')) {
                nFilter.type = 'lowpass';
                nFilter.frequency.value = 8000;
                const nFilter2 = ctx.createBiquadFilter();
                nFilter2.type = 'highpass';
                nFilter2.frequency.value = 1000;
                noise.disconnect();
                noise.connect(nFilter);
                nFilter.connect(nFilter2);
                nFilter2.connect(nGain);
                nGain.gain.setValueAtTime(vel, time);
                nGain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);
                const body = ctx.createOscillator();
                body.type = 'sine';
                const bGain = ctx.createGain();
                body.connect(bGain);
                bGain.connect(routingTarget);
                body.frequency.setValueAtTime(200, time);
                body.frequency.linearRampToValueAtTime(160, time + 0.1);
                bGain.gain.setValueAtTime(vel * 0.7, time);
                bGain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
                body.start(time);
                body.stop(time + 0.2);
            } else {
                nFilter.type = 'highpass';
                nFilter.frequency.value = 1000;
                nGain.gain.setValueAtTime(vel, time);
                nGain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
                const body = ctx.createOscillator();
                body.type = 'triangle';
                const bGain = ctx.createGain();
                body.connect(bGain);
                bGain.connect(routingTarget);
                body.frequency.setValueAtTime(180, time);
                bGain.gain.setValueAtTime(vel * 0.5, time);
                bGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
                body.start(time);
                body.stop(time + 0.1);
            }
            noise.start(time);
            noise.stop(time + 0.4);

            // --- HATS / CYMBALS ---
        } else if (trackId.includes('hat') || trackId === 'crash' || trackId === 'ride') {
            const noise = ctx.createBufferSource();
            noise.buffer = this.getNoise('white');
            const nFilter = ctx.createBiquadFilter();
            nFilter.type = 'highpass';
            nFilter.frequency.value = this.currentKit.includes('909') ? 8000 : 4000;
            noise.connect(nFilter);
            nFilter.connect(gain);
            gain.connect(routingTarget);

            let dura = 0.05, vol = vel * 0.8;
            if (trackId === 'hatO') dura = 0.3;
            else if (trackId === 'crash') { dura = 1.2; vol = vel * 0.6; }
            else if (trackId === 'ride') { dura = 0.6; vol = vel * 0.5; }

            gain.gain.setValueAtTime(vol, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + dura);
            noise.start(time);
            noise.stop(time + dura + 0.2);
        } else if (trackId === 'perc1' || trackId === 'perc2' || trackId === 'clap') {
            const noise = ctx.createBufferSource();
            noise.buffer = this.getNoise();
            const nFilter = ctx.createBiquadFilter();
            nFilter.type = 'bandpass';
            nFilter.frequency.value = trackId === 'perc1' ? 2000 : (trackId === 'perc2' ? 3500 : 1500);
            noise.connect(nFilter);
            nFilter.connect(gain);
            gain.connect(routingTarget);
            gain.gain.setValueAtTime(vel * 0.5, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
            noise.start(time);
            noise.stop(time + 0.2);
        } else if (trackId === 'tomL' || trackId === 'tomH') {
            osc.connect(gain);
            gain.connect(routingTarget);
            osc.frequency.setValueAtTime(trackId === 'tomL' ? 80 : 140, time);
            osc.frequency.exponentialRampToValueAtTime(40, time + 0.2);
            gain.gain.setValueAtTime(vel, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
            osc.start(time);
            osc.stop(time + 0.2);
        } else if (trackId === 'chord') {
            [130.81, 164.81, 196.00].forEach(f => {
                const cOsc = ctx.createOscillator();
                const cGain = ctx.createGain();
                cOsc.frequency.setValueAtTime(f * Math.pow(2, stepData.pitch / 12), time);
                cOsc.connect(cGain);
                cGain.connect(routingTarget);
                cGain.gain.setValueAtTime(vel * 0.2, time);
                cGain.gain.linearRampToValueAtTime(0, time + 0.5);
                cOsc.start(time);
                cOsc.stop(time + 0.6);
            });
        } else if (trackId === 'bass') {
            const f = ctx.createBiquadFilter();
            osc.connect(f);
            f.connect(gain);
            gain.connect(routingTarget);
            osc.frequency.setValueAtTime(55 * Math.pow(2, stepData.pitch / 12), time);
            f.type = 'lowpass';
            f.frequency.setValueAtTime(200, time);
            gain.gain.setValueAtTime(vel, time);
            gain.gain.linearRampToValueAtTime(0, time + 0.3);
            osc.start(time);
            osc.stop(time + 0.3);
        }
    }

    async encodeMp3(audioBuffer, bitrate = 320) {
        try {
            if (!lamejs || !lamejs.Mp3Encoder) {
                 console.error("lamejs is missing");
                 throw new Error('lamejs library not available');
            }

            const channels = audioBuffer.numberOfChannels;
            const sampleRate = audioBuffer.sampleRate;

            // Force 320kbps for best quality as requested
            const mp3encoder = new lamejs.Mp3Encoder(channels, sampleRate, 320);
            const mp3Data = [];

            const left = audioBuffer.getChannelData(0);
            const right = channels > 1 ? audioBuffer.getChannelData(1) : left;

            const sampleBlockSize = 1152;
            const leftInt16 = new Int16Array(left.length);
            const rightInt16 = new Int16Array(right.length);

            // Convert float (-1.0 to 1.0) to Int16 (-32768 to 32767)
            for (let i = 0; i < left.length; i++) {
                leftInt16[i] = left[i] < 0 ? left[i] * 0x8000 : left[i] * 0x7FFF;
                rightInt16[i] = right[i] < 0 ? right[i] * 0x8000 : right[i] * 0x7FFF;
            }

            for (let i = 0; i < leftInt16.length; i += sampleBlockSize) {
                const leftChunk = leftInt16.subarray(i, i + sampleBlockSize);
                const rightChunk = rightInt16.subarray(i, i + sampleBlockSize);
                const mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
                if (mp3buf.length > 0) mp3Data.push(mp3buf);
            }

            const mp3buf = mp3encoder.flush();
            if (mp3buf.length > 0) mp3Data.push(mp3buf);

            return new Blob(mp3Data, { type: 'audio/mp3' });
        } catch (error) {
            console.error('MP3 encoding failed:', error);
            alert(`MP3 Encoding Error: ${error.message}`);
            // Return null to signal caller to use WAV instead
            return null;
        }
    }

    createWavBlob(audioBuffer) {
        const numOfChan = audioBuffer.numberOfChannels;
        const sampleRate = audioBuffer.sampleRate;
        const bitsPerSample = 32;
        const bytesPerSample = bitsPerSample / 8;
        const dataLength = audioBuffer.length * numOfChan * bytesPerSample;
        const headerLength = 44;
        const totalLength = headerLength + dataLength;

        const buffer = new ArrayBuffer(totalLength);
        const view = new DataView(buffer);

        const writeString = (offset, str) => {
            for (let i = 0; i < str.length; i++) {
                view.setUint8(offset + i, str.charCodeAt(i));
            }
        };

        let pos = 0;

        writeString(pos, 'RIFF'); pos += 4;
        view.setUint32(pos, totalLength - 8, true); pos += 4;
        writeString(pos, 'WAVE'); pos += 4;

        writeString(pos, 'fmt '); pos += 4;
        view.setUint32(pos, 16, true); pos += 4;
        view.setUint16(pos, 3, true); pos += 2;
        view.setUint16(pos, numOfChan, true); pos += 2;
        view.setUint32(pos, sampleRate, true); pos += 4;
        view.setUint32(pos, sampleRate * numOfChan * bytesPerSample, true); pos += 4;
        view.setUint16(pos, numOfChan * bytesPerSample, true); pos += 2;
        view.setUint16(pos, bitsPerSample, true); pos += 2;

        writeString(pos, 'data'); pos += 4;
        view.setUint32(pos, dataLength, true); pos += 4;

        const channelData = [];
        for (let ch = 0; ch < numOfChan; ch++) {
            channelData.push(audioBuffer.getChannelData(ch));
        }

        for (let sample = 0; sample < audioBuffer.length; sample++) {
            for (let ch = 0; ch < numOfChan; ch++) {
                const value = Math.max(-1, Math.min(1, channelData[ch][sample]));
                view.setFloat32(pos, value, true);
                pos += 4;
            }
        }

        return new Blob([buffer], { type: 'audio/wav' });
    }

    async saveWithDialog(blob, defaultName) {
        try {
            const arrayBuffer = await blob.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);

            const filePath = await save({
                defaultPath: defaultName,
                filters: [{
                    name: 'File',
                    extensions: [defaultName.split('.').pop()]
                }]
            });

            if (filePath) {
                await writeFile(filePath, uint8Array);
                alert(`Saved to ${filePath}`);
            }
        } catch (e) {
            console.error('Error saving file:', e);
            alert('Error saving file: ' + e.message);
        }
    }
}
export const audioEngine = new AudioEngine();
