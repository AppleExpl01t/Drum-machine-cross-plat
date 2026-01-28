import React, { useState, useEffect } from 'react';
import { audioEngine } from '../audio/AudioEngine';
import { Knob } from './Knob';

export function FXPanel() {
    const [settings, setSettings] = useState(audioEngine.fxSettings);

    // Fraction labels for auto-pan rate
    const rateToFraction = (rate) => {
        if (rate <= 0.25) return '1/1';
        if (rate <= 0.5) return '1/2';
        if (rate <= 1) return '1/4';
        if (rate <= 2) return '1/8';
        return '1/16';
    };

    const fractionToRate = (fraction) => {
        const rates = { '1/1': 0.25, '1/2': 0.5, '1/4': 1, '1/8': 2, '1/16': 4 };
        return rates[fraction] || 1;
    };

    const updateFX = (type, update) => {
        if (type === 'master') {
            const newSettings = { ...settings, masterVol: update.vol };
            setSettings(newSettings);
            audioEngine.setFX(type, update);
            return;
        }
        const newSettings = { ...settings };
        newSettings[type] = { ...newSettings[type], ...update };
        setSettings(newSettings);
        audioEngine.setFX(type, update);
    };

    return (
        <div className="fx-panel-glass" style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px',
            padding: '20px',
            marginTop: '15px',
            position: 'relative',
            zIndex: 100
        }}>
            <div style={{ width: '100%', fontSize: '11px', fontWeight: 'bold', letterSpacing: '2px', color: '#666', marginBottom: '10px' }}>
                MASTER EFFECTS
            </div>

            {/* --- REVERB --- */}
            <div className="fx-card" style={cardStyle}>
                <div style={labelStyle}>REVERB</div>
                <div style={rowStyle}>
                    <input
                        type="checkbox"
                        checked={settings.reverb.active}
                        onChange={e => updateFX('reverb', { active: e.target.checked })}
                        className="fx-checkbox"
                    />
                    <Knob
                        label="WET"
                        value={settings.reverb.wet}
                        onChange={v => updateFX('reverb', { wet: v })}
                        color="#ff5252"
                        defaultValue={0.3}
                    />
                </div>
            </div>

            {/* --- DELAY --- */}
            <div className="fx-card" style={cardStyle}>
                <div style={labelStyle}>DELAY (SYNC)</div>
                <div style={rowStyle}>
                    <input
                        type="checkbox"
                        checked={settings.delay.active}
                        onChange={e => updateFX('delay', { active: e.target.checked })}
                        className="fx-checkbox"
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <Knob
                            label="FEEDBACK"
                            value={settings.delay.feedback}
                            onChange={v => updateFX('delay', { feedback: v })}
                            color="#ffab40"
                            defaultValue={0.5}
                        />
                        <Knob
                            label="MIX"
                            value={settings.delay.wet}
                            onChange={v => updateFX('delay', { wet: v })}
                            color="#ffab40"
                            defaultValue={0.3}
                        />
                    </div>
                </div>
            </div>

            {/* --- AUTO-PANNER --- */}
            <div className="fx-card" style={cardStyle}>
                <div style={labelStyle}>AUTO-PAN</div>
                <div style={rowStyle}>
                    <input
                        type="checkbox"
                        checked={settings.panner.active}
                        onChange={e => updateFX('panner', { active: e.target.checked })}
                        className="fx-checkbox"
                    />
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {/* Rate as fraction buttons */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '9px', color: '#888', fontWeight: 'bold' }}>RATE</span>
                            <select
                                value={rateToFraction(settings.panner.rate)}
                                onChange={e => updateFX('panner', { rate: fractionToRate(e.target.value) })}
                                style={{
                                    width: '50px',
                                    fontSize: '10px'
                                }}
                            >
                                <option value="1/1">1/1</option>
                                <option value="1/2">1/2</option>
                                <option value="1/4">1/4</option>
                                <option value="1/8">1/8</option>
                                <option value="1/16">1/16</option>
                            </select>
                        </div>
                        <Knob
                            label="DEPTH"
                            value={settings.panner.depth}
                            onChange={v => updateFX('panner', { depth: v })}
                            color="#00bcd4"
                            defaultValue={0.5}
                        />
                    </div>
                </div>
            </div>

            {/* --- STUTTER --- */}
            <div className="fx-card" style={cardStyle}>
                <div style={labelStyle}>STUTTER</div>
                <div style={rowStyle}>
                    <button
                        className={`btn ${settings.stutter.active ? 'active' : ''}`}
                        onMouseDown={() => updateFX('stutter', { active: true })}
                        onMouseUp={() => updateFX('stutter', { active: false })}
                        onMouseLeave={() => updateFX('stutter', { active: false })}
                        onTouchStart={(e) => { e.preventDefault(); updateFX('stutter', { active: true }); }}
                        onTouchEnd={(e) => { e.preventDefault(); updateFX('stutter', { active: false }); }}
                        style={{
                            padding: '10px 15px',
                            fontSize: '10px',
                            borderRadius: '6px',
                            background: settings.stutter.active ? '#ff3d00' : 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: settings.stutter.active ? '#fff' : '#aaa',
                            transition: '0.1s'
                        }}
                    >
                        HOLD GATE
                    </button>
                </div>
            </div>

            {/* --- MASTER VOL --- */}
            <div className="fx-card" style={{ ...cardStyle, marginLeft: 'auto', borderRight: 'none' }}>
                <div style={labelStyle}>MASTER GAIN</div>
                <Knob
                    label="LEVEL"
                    max={1.5}
                    value={settings.masterVol}
                    onChange={v => updateFX('master', { vol: v })}
                    color="#fbc02d"
                    defaultValue={1.0}
                />
            </div>
        </div>
    );
}

const cardStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    padding: '0 15px',
    borderRight: '1px solid rgba(255,255,255,0.05)'
};

const labelStyle = {
    fontSize: '9px',
    fontWeight: 'bold',
    color: '#aaa',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
};

const rowStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '15px'
};
