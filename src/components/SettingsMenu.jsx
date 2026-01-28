import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Settings, Maximize, Minus, Plus, RotateCcw } from 'lucide-react';

export function SettingsMenu({
    uiScale,
    onUiScaleChange,
    pinchZoomEnabled,
    onPinchZoomToggle
}) {
    const [isOpen, setIsOpen] = useState(false);
    const buttonRef = useRef(null);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

    const toggle = () => {
        if (!isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setMenuPosition({
                top: rect.bottom + 8,
                left: Math.max(8, rect.left - 200 + rect.width)
            });
        }
        setIsOpen(!isOpen);
    };

    // Calculate percentage for display
    const scalePercentage = Math.round(uiScale * 100);

    const menuContent = isOpen && ReactDOM.createPortal(
        <>
            {/* Backdrop */}
            <div
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 9998,
                    background: 'rgba(0,0,0,0.3)'
                }}
                onClick={() => setIsOpen(false)}
            />
            {/* Menu Panel - Centered on Screen for simplicity/reliability */}
            <div className="glass-panel"
                style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 9999,
                    borderRadius: '8px',
                    width: '300px',
                    maxWidth: '90vw',
                    overflow: 'hidden'
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '12px 16px',
                    background: 'rgba(255,255,255,0.05)',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <Settings size={16} />
                    <span style={{
                        color: '#fff',
                        fontWeight: 'bold',
                        fontSize: '14px',
                        textTransform: 'uppercase',
                        letterSpacing: '1px'
                    }}>Settings</span>
                </div>

                {/* Pinch-to-Zoom Toggle */}
                <div style={{
                    padding: '16px',
                    borderBottom: '1px solid rgba(255,255,255,0.05)'
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '4px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Maximize size={16} color="#ccc" />
                            <span style={{ color: '#ccc', fontSize: '13px', fontWeight: '600' }}>
                                Pinch to Zoom
                            </span>
                        </div>
                        <button
                            onClick={onPinchZoomToggle}
                            style={{
                                width: '40px',
                                height: '20px',
                                borderRadius: '10px',
                                border: 'none',
                                cursor: 'pointer',
                                background: pinchZoomEnabled
                                    ? 'var(--primary)'
                                    : 'rgba(255,255,255,0.1)',
                                position: 'relative',
                                transition: 'background 0.2s',
                                padding: 0
                            }}
                        >
                            <div style={{
                                position: 'absolute',
                                top: '2px',
                                left: pinchZoomEnabled ? '22px' : '2px',
                                width: '16px',
                                height: '16px',
                                borderRadius: '50%',
                                background: '#fff',
                                transition: 'left 0.2s',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                            }} />
                        </button>
                    </div>
                    <span style={{ color: '#888', fontSize: '11px', display: 'block', marginTop: '4px' }}>
                        Enable 2-finger pinch gestures to resize workspace.
                    </span>
                </div>

                {/* UI Size Slider */}
                <div style={{ padding: '16px' }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '10px'
                    }}>
                        <span style={{ color: '#ccc', fontSize: '13px', fontWeight: '600' }}>
                            UI Scale
                        </span>
                        <span style={{
                            color: 'var(--primary)',
                            fontSize: '14px',
                            fontWeight: 'bold'
                        }}>
                            {scalePercentage}%
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Minus size={14} style={{ cursor: 'pointer' }} onClick={() => onUiScaleChange(Math.max(0.5, uiScale - 0.1))} />
                        <input
                            type="range"
                            min="50"
                            max="150"
                            value={scalePercentage}
                            onChange={(e) => onUiScaleChange(parseInt(e.target.value) / 100)}
                            style={{
                                width: '100%',
                                height: '4px',
                                cursor: 'pointer',
                            }}
                        />
                        <Plus size={14} style={{ cursor: 'pointer' }} onClick={() => onUiScaleChange(Math.min(1.5, uiScale + 0.1))} />
                    </div>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginTop: '8px'
                    }}>
                        <span style={{ color: '#555', fontSize: '10px' }}>50%</span>
                        <span style={{ color: '#555', fontSize: '10px' }}>100%</span>
                        <span style={{ color: '#555', fontSize: '10px' }}>150%</span>
                    </div>
                </div>

                {/* Reset Button */}
                <div style={{ padding: '0 16px 16px' }}>
                    <button
                        className="btn"
                        onClick={() => onUiScaleChange(1.0)}
                        style={{ width: '100%' }}
                    >
                        <RotateCcw size={14} />
                        RESET TO 100%
                    </button>
                </div>
            </div>
        </>,
        document.body
    );

    return (
        <>
            <button
                ref={buttonRef}
                onClick={toggle}
                className={`btn btn-icon ${isOpen ? 'active' : ''}`}
                style={{
                    background: isOpen ? 'rgba(255,255,255,0.1)' : 'transparent',
                    border: 'none'
                }}
                title="Settings"
            >
                <Settings size={20} color={isOpen ? 'var(--primary)' : '#888'} />
            </button>
            {menuContent}
        </>
    );
}
