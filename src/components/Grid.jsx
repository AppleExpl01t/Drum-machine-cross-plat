import React, { useRef, useEffect } from 'react';
import { TRACKS, TRACK_COLORS } from '../audio/constants';
import { useSequencerStore } from '../store/useSequencerStore';

export function Grid({
    currentStep,
    autoScroll
}) {
    const { 
        steps, pattern, 
        muted, toggleMute,
        soloed, toggleSolo,
        locked, toggleLock,
        selectedStepId, setSelectedStepId,
        toggleStep,
        setVelocity
    } = useSequencerStore();

    // Mapping old prop names to store actions for compatibility
    const onMute = toggleMute;
    const onSolo = toggleSolo;
    const onLock = toggleLock;
    
    // onStepClick logic from App.jsx was:
    // 1. If existing, select or delete (if already selected)
    // 2. If new, create and select
    // The store's toggleStep now handles Creation/Deletion logic.
    // However, the store's toggleStep currently handles: 
    // - If exists & selected -> Delete
    // - If exists & !selected -> Select
    // - If !exists -> Create & Select
    // The original App.jsx logic was slightly different about "Select vs Delete".
    // App.jsx: "Clicked on the already selected step -> Delete it"
    // My store implementation does exactly that. Good.
    const onStepClick = toggleStep;

    const scrollRef = useRef(null);
    const dragRef = useRef(null);


    // Auto-scroll logic
    useEffect(() => {
        if (!autoScroll) return;

        if (currentStep >= 0 && scrollRef.current) {
            const stepWidth = 32; // Updated width
            const x = currentStep * stepWidth;
            const container = scrollRef.current;
            const width = container.clientWidth;

            if (x > container.scrollLeft + width - 100) {
                container.scrollTo({ left: x - 50, behavior: 'smooth' });
            } else if (x < container.scrollLeft) {
                container.scrollTo({ left: x - 50, behavior: 'smooth' });
            }
        }
    }, [currentStep, autoScroll]);

    // Drag Logic
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!dragRef.current) return;
            const { trackId, stepIndex, startY, startVel } = dragRef.current;
            const delta = startY - e.clientY; // Up is positive
            const change = delta * 0.01;
            const newVel = Math.min(1, Math.max(0.1, startVel + change)); // Min 0.1

            setVelocity(trackId, stepIndex, newVel);
        };

        const handleMouseUp = (e) => {
            if (!dragRef.current) return;
            const { startY, trackId, stepIndex } = dragRef.current;
            const delta = Math.abs(startY - e.clientY);

            // If moved less than 5px, treat as click
            if (delta < 5) {
                onStepClick(trackId, stepIndex);
            }
            dragRef.current = null;
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [setVelocity, onStepClick]);

    const handleStepMouseDown = (e, trackId, stepIndex, isActive) => {
        if (isActive) {
            e.stopPropagation();
            // Start Drag
            dragRef.current = {
                trackId,
                stepIndex,
                startY: e.clientY,
                startVel: pattern[trackId][stepIndex].vel
            };
        }
    };

    // Generate Ruler
    const rulerMarks = [];
    for (let i = 0; i < steps; i++) {
        if (i % 4 === 0) {
            const measure = Math.floor(i / 16) + 1;
            const beat = (i % 16) / 4 + 1;
            rulerMarks.push(
                <div key={i} className="ruler-mark" style={{ left: i * 32, width: 128 }}>
                    {i % 16 === 0 ? measure : `${measure}.${beat}`}
                </div>
            );
        }
    }

    // Styles
    const GRID_WIDTH = steps * 32;

    return (
        <div className="workspace">
            {/* Sidebar */}
            <div className="sidebar">
                <div className="sidebar-header"></div>
                {TRACKS.map(t => (
                    <div key={t.id} className="track-header">
                        <div className="track-header-inner">
                            <div className="track-controls">
                                <div className={`icon-btn mute ${muted[t.id] ? 'active' : ''}`} onClick={() => onMute(t.id)} title="Mute">M</div>
                                <div className={`icon-btn solo ${soloed === t.id ? 'active' : ''}`} onClick={() => onSolo(t.id)} title="Solo">S</div>
                            </div>
                            <div className="track-name">{t.label}</div>
                            <div className={`icon-btn lock ${locked[t.id] ? 'active' : ''}`} onClick={() => onLock(t.id)} title="Lock Pattern">
                                {locked[t.id] ? '🔒' : '🔓'}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Scroll Area */}
            <div className="grid-area" ref={scrollRef}>
                <div className="ruler" style={{ minWidth: GRID_WIDTH }}>
                    {rulerMarks}
                </div>

                <div className="grid-rows" style={{ minWidth: GRID_WIDTH }}>
                    {/* Playhead Overlay */}
                    <div className="playhead-cursor" style={{ left: currentStep * 32, display: currentStep >= 0 ? 'block' : 'none' }}></div>

                    {TRACKS.map(t => (
                        <div key={t.id} className="grid-row">
                            {/* Background Grid */}
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', pointerEvents: 'none' }}>
                                {Array.from({ length: steps }).map((_, i) => (
                                    <div key={i} style={{
                                        flex: 1,
                                        borderRight: i % 4 === 3 ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.03)',
                                        background: i % 4 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent'
                                    }} />
                                ))}
                            </div>

                            {/* Steps */}
                            {Array.from({ length: steps }).map((_, i) => {
                                const stepData = pattern[t.id][i];
                                const isActive = !!stepData;
                                const isSelected = selectedStepId && selectedStepId.track === t.id && selectedStepId.step === i;
                                const vel = isActive ? stepData.vel : 0;
                                const color = TRACK_COLORS[t.id] || '#00bcd4';

                                return (
                                    <div
                                        key={i}
                                        className="step-container"
                                        style={{ left: i * 32, width: 32 }}
                                    >
                                        <div
                                            className={`step-btn ${isActive ? 'active' : ''} ${isSelected ? 'selected' : ''}`}
                                            style={{
                                                cursor: isActive ? 'ns-resize' : 'pointer',
                                                backgroundColor: isActive ? '#1a1a20' : '#1a1a20',
                                                color: isActive ? color : 'transparent',
                                                // If active, use opacity to show velocity
                                                opacity: isActive ? 0.3 + (vel * 0.7) : 1
                                            }}
                                            onMouseDown={(e) => handleStepMouseDown(e, t.id, i, isActive)}
                                            onClick={(e) => {
                                                if (!isActive) {
                                                    e.stopPropagation();
                                                    onStepClick(t.id, i);
                                                }
                                            }}
                                        />
                                        {/* Inner LED glow for better visualization */}
                                        {isActive && (
                                            <div style={{
                                                position: 'absolute',
                                                inset: '4px',
                                                background: color,
                                                borderRadius: '2px',
                                                opacity: vel,
                                                pointerEvents: 'none',
                                                boxShadow: `0 0 ${vel * 15}px ${color}`
                                            }} />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
