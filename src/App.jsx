import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Store } from '@tauri-apps/plugin-store';
import { audioEngine } from './audio/AudioEngine';
import { TRACKS, KITS, GENRE_BPM } from './audio/constants';
import { generatePattern, generateVariation } from './utils/generator';
import { savePatternToDisk, loadPatternFromDisk } from './utils/storage';
import { Controls } from './components/Controls';
import { Grid } from './components/Grid';
import { PropertyPanel } from './components/PropertyPanel';
import { FXPanel } from './components/FXPanel';
import { ExportDialog } from './components/ExportDialog';
import { SettingsMenu } from './components/SettingsMenu';

// ... imports
import { useTransportStore } from './store/useTransportStore';
import { useSequencerStore } from './store/useSequencerStore';

function App() {
    console.log('App Rendering - Fix Applied');
    // Global Transport State
    const { 
        started, setStarted, 
        playing, setPlaying, 
        bpm, setBpm, 
        bpmLocked, setBpmLocked 
    } = useTransportStore();

    // Global Sequencer State
    const {
        pattern, setPattern,
        steps, setSteps,
        muted, soloed, locked,
        pendingPattern, setPendingPattern, applyPendingPattern,
        historyIndex, history,
        commitPattern, // Useful for Load/Generate
        toggleMute
    } = useSequencerStore();

    // UI State
    const [currentStep, setCurrentStep] = useState(0);

    // Audio State (Refactoring in progress...)
    const [genre, setGenre] = useState('house');
    const [kit, setKit] = useState('TR-909');
    const [complexity, setComplexity] = useState('moderate');
    const [swing, setSwing] = useState(0);
    const [humanize, setHumanize] = useState(0.1);
    const [musicalKey, setMusicalKey] = useState('C');
    const [scale, setScale] = useState('Minor'); // 'Major', 'Minor'
    const [timeSignature, setTimeSignature] = useState('4/4');

    // Pattern Data & History handled by useSequencerStore now.
    
    // UI Local State
    const [showFX, setShowFX] = useState(false);
    const [exportConfig, setExportConfig] = useState(null); // { mode, format, type: 'audio' | 'midi' | 'pattern' }
    const [autoScroll, setAutoScroll] = useState(true); // New: auto-scroll toggle
    const [uiScale, setUiScale] = useState(1.0); // UI scaling
    const [pinchZoomEnabled, setPinchZoomEnabled] = useState(false); // Pinch-to-zoom toggle
    const appContainerRef = useRef(null);

    // -- Persistence --
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const store = await Store.load('settings.json');
                const savedScale = await store.get('uiScale');
                if (savedScale) setUiScale(savedScale);
            } catch (e) {
                console.warn('Store load failed', e);
            }
        };
        loadSettings();
    }, []);

    useEffect(() => {
        const saveSettings = async () => {
            try {
                const store = await Store.load('settings.json');
                await store.set('uiScale', uiScale);
                await store.save();
            } catch (e) {
                console.warn('Store save failed', e);
            }
        };
        saveSettings();
    }, [uiScale]);

    // -- Pinch-to-Zoom Gesture Handler --
    const pinchDataRef = useRef({ initialDistance: 0, initialScale: 1.0 });

    useEffect(() => {
        if (!pinchZoomEnabled) return;

        const getDistance = (touches) => {
            const dx = touches[0].clientX - touches[1].clientX;
            const dy = touches[0].clientY - touches[1].clientY;
            return Math.sqrt(dx * dx + dy * dy);
        };

        const handleTouchStart = (e) => {
            if (e.touches.length === 2) {
                pinchDataRef.current.initialDistance = getDistance(e.touches);
                pinchDataRef.current.initialScale = uiScale;
            }
        };

        const handleTouchMove = (e) => {
            if (e.touches.length === 2 && pinchDataRef.current.initialDistance > 0) {
                e.preventDefault();
                const currentDistance = getDistance(e.touches);
                const scaleFactor = currentDistance / pinchDataRef.current.initialDistance;
                const newScale = Math.min(1.5, Math.max(0.5, pinchDataRef.current.initialScale * scaleFactor));
                // Round to 2 decimal places to prevent micro-updates
                const roundedScale = Math.round(newScale * 100) / 100;
                setUiScale(roundedScale);
            }
        };

        const handleTouchEnd = () => {
            pinchDataRef.current.initialDistance = 0;
        };

        document.addEventListener('touchstart', handleTouchStart, { passive: false });
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd);

        return () => {
            document.removeEventListener('touchstart', handleTouchStart);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
        };
    }, [pinchZoomEnabled, uiScale]);

    // -- Sync kit selection when genre changes --
    useEffect(() => {
        const availableKits = KITS[genre] || [];
        if (availableKits.length > 0 && !availableKits.includes(kit)) {
            setKit(availableKits[0]);
        }
    }, [genre, kit]);

    // -- Audio Engine Sync --
    useEffect(() => {
        audioEngine.bpm = bpm;
        audioEngine.steps = steps; // from store
        audioEngine.swing = swing;
        audioEngine.humanize = humanize;
        audioEngine.currentGenre = genre;
        audioEngine.currentKit = kit;
        audioEngine.pattern = pattern; // from store
        audioEngine.muted = muted; // from store
        audioEngine.soloed = soloed; // from store
    }, [bpm, steps, swing, humanize, genre, kit, pattern, muted, soloed]);

    // -- Load Samples for K.O Kit --
    useEffect(() => {
        if (kit === 'K.O') {
            audioEngine.loadKitSamples('K.O');
        }
    }, [kit]);

    // -- Audio Engine Callbacks --
    useEffect(() => {
        audioEngine.onStepChange = (step) => {
            setCurrentStep(step);
        };
        audioEngine.onCycleStart = () => {
            applyPendingPattern(); // from store
        };
    }, [applyPendingPattern]);

    // -- Handlers --

    const handleGenreChange = (newGenre) => {
        setGenre(newGenre);
        if (GENRE_BPM[newGenre]) {
            setBpm(GENRE_BPM[newGenre]);
        }
    };

    const handleSave = () => {
        setExportConfig({ type: 'pattern' });
    };

    const handleStart = () => {
        audioEngine.init();
        setStarted(true);
    };

    const togglePlay = () => {
        // Updated to use store
        if (playing) {
           setPlaying(false);
        } else {
           setPlaying(true);
        }
    };

    // Sync Playing State
    useEffect(() => {
        if (playing) {
            audioEngine.start();
        } else {
            audioEngine.stop();
        }
    }, [playing]);

    // Keyboard Mutes (using store mutations)
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ignore if input focused
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

            // Numbers 1-9, 0, -, =
            const keyMap = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='];
            const index = keyMap.indexOf(e.key);
            if (index >= 0 && index < TRACKS.length) {
                const trackId = TRACKS[index].id;
                toggleMute(trackId);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);


    const handleGenerate = () => {
        const newP = generatePattern(genre, steps, locked, pattern, complexity, { musicalKey, scale, kit });
        if (playing) {
            setPendingPattern(newP);
        } else {
            commitPattern(newP);
        }
    };

    const handleGenerateVariation = (type) => {
        const newP = generateVariation(type, pattern, steps, locked);
        if (playing) {
            setPendingPattern(newP);
        } else {
            commitPattern(newP);
        }
    };

    const handleLoad = async () => {
        const name = prompt("Enter the name of the beat to load (from Documents):");
        if (name) {
            try {
                const p = await loadPatternFromDisk(name);
                if (p) {
                    commitPattern(p);
                    alert("Loaded " + name);
                }
            } catch (e) {
                try {
                    const data = localStorage.getItem('freakgen_drum_' + name);
                    if (data) {
                        const p = JSON.parse(data);
                        commitPattern(p);
                        alert("Loaded from Legacy Browser Storage");
                    } else {
                        alert("Not found in Documents or Browser Storage");
                    }
                } catch (e2) {
                    alert("Error loading file: " + e.message);
                }
            }
        }
    };

    const handleExport = (mode, format) => {
        if (mode === 'midi') {
            setExportConfig({ type: 'midi' });
            return;
        }
        setExportConfig({ mode, format, type: 'audio' });
    };

    const handleConfirmExport = async (filename) => {
        const config = exportConfig;
        setExportConfig(null);

        if (config.type === 'pattern') {
            const result = await savePatternToDisk(filename, pattern);
            if (result.success) {
                alert(`Saved to: ${result.path}`);
            } else {
                alert(`Save Failed: ${result.error}`);
            }
            return;
        }

        if (config.type === 'midi') {
            await audioEngine.exportMIDI(filename);
            return;
        }

        await audioEngine.exportAudio(config.mode, config.format, filename);
    };

    if (!started) {
        return (
            <div className="overlay">
                <div style={{ textAlign: 'center' }}>
                    <h1 style={{ color: 'var(--primary)', marginBottom: 20 }}>FREAKGEN ARCHITECT v1.0.0</h1>
                    <button className="big-btn" onClick={handleStart}>INITIALIZE SYSTEM</button>
                </div>
            </div>
        );
    }

    return (
        <div
            className="app-container"
            ref={appContainerRef}
            style={{
                transform: `scale(${uiScale})`,
                transformOrigin: 'top left',
                width: `${100 / uiScale}%`,
                height: `${100 / uiScale}vh`
            }}
        >
            {/* Top Bar with Logo and Settings */}
            <div className="top-bar">
                <span className="logo">FREAKGEN ARCHITECT v1.0.0</span>
                <SettingsMenu
                    uiScale={uiScale}
                    onUiScaleChange={setUiScale}
                    pinchZoomEnabled={pinchZoomEnabled}
                    onPinchZoomToggle={() => setPinchZoomEnabled(p => !p)}
                />
            </div>

            <Controls
                onStop={() => { audioEngine.stop(); setPlaying(false); setCurrentStep(0); }}
                genre={genre}
                onGenreChange={handleGenreChange}
                kit={kit}
                onKitChange={setKit}
                complexity={complexity}
                onComplexityChange={setComplexity}
                swing={swing}
                onSwingChange={setSwing}
                humanize={humanize}
                onHumanizeChange={setHumanize}
                onGenerate={handleGenerate}
                onGenerateVariation={handleGenerateVariation}
                musicalKey={musicalKey}
                onKeyChange={setMusicalKey}
                scale={scale}
                onScaleChange={setScale}
                timeSignature={timeSignature}
                onTimeSignatureChange={setTimeSignature}
                onExport={handleExport}
                onSave={handleSave}
                onLoad={handleLoad}
                showFX={showFX}
                onToggleFX={() => setShowFX(!showFX)}
                autoScroll={autoScroll}
                onAutoScrollToggle={() => setAutoScroll(s => !s)}
            />
            {showFX && <FXPanel />}

            <Grid
                currentStep={currentStep}
                autoScroll={autoScroll}
            />

            <PropertyPanel
                currentKit={kit}
            />

            <ExportDialog
                isOpen={!!exportConfig}
                onClose={() => setExportConfig(null)}
                onConfirm={handleConfirmExport}
                title={
                    exportConfig?.type === 'pattern' ? 'SAVE BEAT' :
                        exportConfig?.type === 'midi' ? 'EXPORT MIDI' : 'EXPORT AUDIO'
                }
            />
        </div>
    );
}

export default App;
