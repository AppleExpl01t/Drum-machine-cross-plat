import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom';

export function VariationMenu({ onGenerateVariation }) {
    const [isOpen, setIsOpen] = useState(false);
    const buttonRef = useRef(null);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

    const toggle = () => {
        if (!isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setMenuPosition({
                top: rect.bottom + 8,
                left: Math.max(8, rect.left - 100) // Offset to center-ish
            });
        }
        setIsOpen(!isOpen);
    };

    const handleSelect = (type) => {
        onGenerateVariation(type);
        setIsOpen(false);
    };

    const menuContent = isOpen && ReactDOM.createPortal(
        <>
            {/* Backdrop to close menu */}
            <div
                style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
                onClick={() => setIsOpen(false)}
            />
            {/* Dropdown menu */}
            <div className="variation-dropdown" style={{
                position: 'fixed',
                top: menuPosition.top,
                left: menuPosition.left,
                zIndex: 9999,
                background: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: '6px',
                width: '180px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.8)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}>
                <div style={{ padding: '8px 12px', fontSize: '10px', color: '#666', fontWeight: 'bold', textTransform: 'uppercase', background: '#111' }}>
                    Structural Gen
                </div>
                <MenuButton label="A / B Split" onClick={() => handleSelect('ab')} desc="Call & Response" />
                <MenuButton label="Build Up" onClick={() => handleSelect('build')} desc="Rising Intensity" />
                <MenuButton label="The Drop" onClick={() => handleSelect('drop')} desc="Heavy Impact" />
                <MenuButton label="Fill" onClick={() => handleSelect('fill')} desc="End-of-bar variation" />
            </div>
        </>,
        document.body
    );

    return (
        <div className="variation-menu-container" style={{ position: 'relative', display: 'inline-block' }}>
            <button
                ref={buttonRef}
                className="btn btn-gen"
                onClick={toggle}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '6px 10px',
                    background: 'linear-gradient(135deg, #6200ea, #d50000)'
                }}
            >
                <span style={{ fontSize: '14px' }}>☰</span> VARIATION
            </button>
            {menuContent}
        </div>
    );
}

function MenuButton({ label, onClick, desc }) {
    return (
        <button
            onClick={onClick}
            style={{
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid #222',
                padding: '12px 15px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                transition: 'background 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#2a2a2a'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
            <span style={{ color: '#fff', fontSize: '12px', fontWeight: '600' }}>{label}</span>
            <span style={{ color: '#888', fontSize: '10px' }}>{desc}</span>
        </button>
    );
}
