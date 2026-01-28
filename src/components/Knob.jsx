import React, { useState, useRef, useEffect } from 'react';

export function Knob({
    value,
    onChange,
    min = 0,
    max = 1,
    step = 0.01,
    label = "",
    size = 45,
    color = "#00bcd4",
    defaultValue = null  // Explicit default for double-tap reset
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [inputValue, setInputValue] = useState(value);

    // Refs for drag logic
    const startX = useRef(0);
    const startY = useRef(0);
    const startVal = useRef(0);
    const isDragging = useRef(false);
    const tapTime = useRef(0);

    // Update input when external value changes
    useEffect(() => {
        setInputValue(value);
    }, [value]);

    const handlePointerDown = (e) => {
        if (e.button !== 0 && e.pointerType === 'mouse') return;

        const now = Date.now();

        // Double-tap detection: if tapped within 300ms, reset to default
        if (now - tapTime.current < 300 && !isDragging.current) {
            // Reset to explicit default if provided, otherwise use min
            const resetVal = defaultValue !== null ? defaultValue : min;
            onChange(resetVal);
            tapTime.current = 0; // Reset to prevent triple-tap
            return;
        }

        // Capture start state
        startX.current = e.clientX;
        startY.current = e.clientY;
        startVal.current = value;
        isDragging.current = false;
        tapTime.current = now;

        const target = e.currentTarget;
        target.setPointerCapture(e.pointerId);

        const handlePointerMove = (moveEvent) => {
            const dx = moveEvent.clientX - startX.current;
            const dy = startY.current - moveEvent.clientY; // Up is positive

            // Threshold to detect drag vs click
            if (!isDragging.current && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
                isDragging.current = true;
            }

            if (isDragging.current) {
                // Use larger of dx or dy for control, or combined
                // Standard DAW behavior: Vertical drag usually controls value, 
                // but we can support both for "Slide". 
                // Let's use (dy + dx) so up/right increases.
                const deltaPx = dy + dx;

                // Sensitivity: 200px = full range
                const range = max - min;
                const change = (deltaPx / 200) * range;

                let newVal = startVal.current + change;
                newVal = Math.max(min, Math.min(max, newVal));

                // Snap to step if needed (optional, but good for clean values)
                // newVal = Math.round(newVal / step) * step;

                onChange(Number(newVal.toFixed(3)));
            }
        };

        const handlePointerUp = (upEvent) => {
            const dt = Date.now() - tapTime.current;

            // If it was a short tap without much movement, treat as Click -> Edit
            if (!isDragging.current && dt < 250) {
                setIsEditing(true);
            }

            target.releasePointerCapture(upEvent.pointerId);
            target.removeEventListener('pointermove', handlePointerMove);
            target.removeEventListener('pointerup', handlePointerUp);
            target.removeEventListener('pointercancel', handlePointerUp);
        };

        target.addEventListener('pointermove', handlePointerMove);
        target.addEventListener('pointerup', handlePointerUp);
        target.addEventListener('pointercancel', handlePointerUp);
    };

    const handleInputBlur = () => {
        const num = parseFloat(inputValue);
        if (!isNaN(num)) {
            onChange(Math.max(min, Math.min(max, num)));
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleInputBlur();
    };

    // Rotation map: min -> -135deg, max -> 135deg
    // Clamp value for visual just in case
    const safeVal = Math.max(min, Math.min(max, value));
    const pct = (safeVal - min) / (max - min);
    const rotation = pct * 270 - 135;

    return (
        <div className="knob-container" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            width: size + 20,
            touchAction: 'none', // Critical for preventing scroll
            userSelect: 'none'
        }}>
            {/* Value Display / Input */}
            <div
                className="knob-value"
                onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                style={{
                    fontSize: '10px',
                    color: color,
                    fontWeight: 'bold',
                    cursor: 'text',
                    height: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isEditing ? 'rgba(255,255,255,0.1)' : 'transparent',
                    borderRadius: '2px',
                    padding: '0 4px',
                    minWidth: '30px'
                }}
            >
                {isEditing ? (
                    <input
                        autoFocus
                        value={inputValue}
                        onChange={e => setInputValue(e.target.value)}
                        onBlur={handleInputBlur}
                        onKeyDown={handleKeyDown}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'inherit',
                            fontSize: 'inherit',
                            fontWeight: 'inherit',
                            width: '100%',
                            textAlign: 'center',
                            outline: 'none',
                            padding: 0,
                            margin: 0
                        }}
                    />
                ) : (
                    value.toFixed(2)
                )}
            </div>

            {/* Knob Graphic */}
            <div
                onPointerDown={handlePointerDown}
                style={{
                    width: size,
                    height: size,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle at 30% 30%, #444, #111)',
                    border: '2px solid #333',
                    position: 'relative',
                    cursor: 'ns-resize',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5), 0 2px 10px rgba(0,0,0,0.5)',
                }}
            >
                {/* Visual marker */}
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: '3px',
                    height: size / 2 - 2,
                    background: color,
                    borderRadius: '2px',
                    transformOrigin: '50% 100%',
                    transform: `translate(-50%, -100%) rotate(${rotation}deg)`,
                    boxShadow: `0 0 8px ${color}`,
                    pointerEvents: 'none'
                }} />
            </div>

            {label && (
                <div style={{
                    fontSize: '9px',
                    color: '#888',
                    textTransform: 'uppercase',
                    fontWeight: 'bold',
                    letterSpacing: '0.5px'
                }}>
                    {label}
                </div>
            )}
        </div>
    );
}
