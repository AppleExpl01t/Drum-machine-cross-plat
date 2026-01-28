import React, { useState } from 'react';

export function ExportDialog({ isOpen, onClose, onConfirm, initialName = "my-beat", title = "EXPORT PRODUCTION" }) {
    const [filename, setFilename] = useState(initialName);

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000, // Higher than FX panel
            backdropFilter: 'blur(5px)',
            padding: '20px' // Padding for mobile edge distance
        }} onClick={onClose}>
            <div className="modal-content" style={{
                background: '#1a1a1a',
                padding: '25px',
                borderRadius: '12px',
                border: '1px solid #333',
                width: '100%',
                maxWidth: '450px',
                maxHeight: '90vh', // Prevent going off-screen vertically
                overflowY: 'auto', // Allow scrolling if content is too large
                boxShadow: '0 20px 60px rgba(0,0,0,0.9)',
                position: 'relative'
            }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ color: 'var(--primary)', margin: 0, fontSize: '16px', letterSpacing: '1px' }}>{title}</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', fontSize: '20px', cursor: 'pointer' }}>×</button>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '8px', textTransform: 'uppercase', fontWeight: 'bold' }}>
                        File Name
                    </label>
                    <input
                        className="modal-input"
                        autoFocus
                        value={filename}
                        onChange={e => setFilename(e.target.value)}
                        placeholder="my-awesome-beat"
                        style={{
                            width: '100%',
                            background: '#000',
                            border: '1px solid #444',
                            color: '#fff',
                            padding: '12px',
                            borderRadius: '6px',
                            fontSize: '14px',
                            outline: 'none',
                            boxSizing: 'border-box'
                        }}
                    />
                </div>

                <p style={{ fontSize: '12px', color: '#aaa', marginBottom: '25px', lineHeight: '1.6' }}>
                    Select a name for your export. You will be prompted to choose a save location in the next step.
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'flex-end' }}>
                    <button
                        className="btn"
                        onClick={onClose}
                        style={{ padding: '12px 20px', flex: '1 1 100px' }}
                    >
                        CANCEL
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={() => onConfirm(filename)}
                        style={{ padding: '12px 20px', flex: '2 1 200px' }}
                    >
                        CHOOSE LOCATION & SAVE
                    </button>
                </div>
            </div>
        </div>
    );
}
