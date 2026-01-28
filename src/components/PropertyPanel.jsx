import React from 'react';
import { audioEngine } from '../audio/AudioEngine';
import { useSequencerStore } from '../store/useSequencerStore';

export function PropertyPanel({ currentKit }) {
    const { 
        selectedStepId, 
        pattern, 
        modifyStep, 
        deleteSelectedStep 
    } = useSequencerStore();

    if (!selectedStepId) {
        return (
            <div className="prop-panel">
                <div style={{ opacity: 0.5, fontStyle: 'italic' }}>Select a step to edit properties</div>
            </div>
        );
    }

    const { track, step } = selectedStepId;
    const data = pattern[track][step];
    
    // Guard against data missing (if recently deleted but selectedStepId not cleared yet, though store handles it)
    if (!data) return null;

    const onChange = modifyStep;
    const onDelete = deleteSelectedStep;


    // Get max variations for this track from manifest
    let maxVariations = 29; // default safety
    if (currentKit === 'K.O' && audioEngine.kitManifests['K.O']) {
        const manifest = audioEngine.kitManifests['K.O'];
        if (manifest[track]) {
            maxVariations = manifest[track] - 1;
        }
    }

    return (
        <div className="prop-panel">
            <div style={{ fontWeight: 'bold', color: '#888', marginRight: 20 }}>STEP PROPERTIES</div>

            <div className="prop-group">
                <div className="prop-control">
                    <span className="label">VELOCITY {(data.vel).toFixed(2)}</span>
                    <input type="range" min="0" max="1" step="0.05"
                        value={data.vel}
                        onChange={e => onChange('vel', parseFloat(e.target.value))} />
                </div>
            </div>

            <div className="prop-group">
                <div className="prop-control">
                    <span className="label">PITCH {data.pitch}</span>
                    <input type="range" min="-12" max="12" step="1"
                        value={data.pitch}
                        onChange={e => onChange('pitch', parseFloat(e.target.value))} />
                </div>
            </div>

            {currentKit === 'K.O' && (
                <div className="prop-group">
                    <div className="prop-control">
                        <span className="label">SAMPLE {data.sampleIndex || 0}</span>
                        <input type="range" min="0" max={maxVariations} step="1"
                            value={data.sampleIndex || 0}
                            onChange={e => onChange('sampleIndex', parseInt(e.target.value))} />
                    </div>
                </div>
            )}

            <div className="prop-group">
                <div className="prop-control">
                    <span className="label">PROBABILITY {Math.round(data.prob * 100)}%</span>
                    <input type="range" min="0" max="1" step="0.1"
                        value={data.prob}
                        onChange={e => onChange('prob', parseFloat(e.target.value))} />
                </div>
            </div>

            <button className="btn btn-delete"
                onClick={onDelete}>
                DELETE STEP
            </button>
        </div>
    );
}
