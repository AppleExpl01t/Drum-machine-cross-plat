import { VariationMenu } from "./VariationMenu";
import { KITS } from "../audio/constants";
import React, { useState } from "react";
import ReactDOM from "react-dom";
import {
  Play,
  Square,
  RotateCcw,
  RotateCw,
  Settings,
  Music,
  Volume2,
  Save,
  Upload,
  Download,
  Mic,
  Layers,
  Activity,
  Lock,
  Unlock,
} from "lucide-react";

import { useTransportStore } from "../store/useTransportStore";
import { useSequencerStore } from "../store/useSequencerStore";

export function Controls({
  onStop, // View-specific action (reset step) passed from parent
  genre,
  onGenreChange,
  kit,
  onKitChange,
  complexity,
  onComplexityChange,
  onGenerate,
  onGenerateVariation,
  swing,
  onSwingChange,
  humanize,
  onHumanizeChange,
  musicalKey,
  onKeyChange,
  scale,
  onScaleChange,
  timeSignature,
  onTimeSignatureChange,
  onExport,
  onSave,
  onLoad,
  showFX,
  onToggleFX,
  autoScroll,
  onAutoScrollToggle,
}) {
  const { 
    playing, 
    togglePlay, 
    bpm, 
    setBpm, 
    bpmLocked, 
    toggleBpmLock 
  } = useTransportStore();

  const {
    steps, setSteps,
    undo, redo,
    historyIndex, history,
    pendingPattern
  } = useSequencerStore();

  // Aliases to match existing usage in JSX
  const onPlay = togglePlay;
  const onBpmChange = setBpm;
  const onBpmLockToggle = toggleBpmLock;
  
  const onUndo = undo;
  const onRedo = redo;
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;
  const pending = !!pendingPattern;
  const onStepsChange = setSteps;






  const availableKits = KITS[genre] || [];
  const KEYS = [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B",
  ];
  const SCALES = [
    "Major",
    "Minor",
    "Dorian",
    "Phrygian",
    "Lydian",
    "Mixolydian",
  ];

  const [editingBpm, setEditingBpm] = useState(false);
  const [bpmInput, setBpmInput] = useState(bpm.toString());
  const [exportOpen, setExportOpen] = useState(false);

  const handleBpmClick = () => {
    setBpmInput(bpm.toString());
    setEditingBpm(true);
  };

  const handleBpmInputChange = (e) => {
    setBpmInput(e.target.value);
  };

  const handleBpmInputBlur = () => {
    const val = parseInt(bpmInput);
    if (!isNaN(val) && val >= 30 && val <= 300) {
      onBpmChange(val);
    }
    setEditingBpm(false);
  };

  const handleBpmInputKeyDown = (e) => {
    if (e.key === "Enter") {
      handleBpmInputBlur();
    } else if (e.key === "Escape") {
      setEditingBpm(false);
    }
  };

  return (
    <div className="controls">
      {/* Transport */}
      <div className="control-group">
        <button
          className={`btn ${playing ? "btn-primary" : ""}`}
          onClick={onPlay}
          title={playing ? "Pause" : "Play"}
        >
          {playing ? (
            <Square size={16} fill="currentColor" />
          ) : (
            <Play size={16} fill="currentColor" />
          )}
          <span>{playing ? "PAUSE" : "PLAY"}</span>
        </button>
        <button className="btn" onClick={onStop} title="Stop">
          <Square size={16} />
        </button>
        <button
          className={`btn ${autoScroll ? "btn-primary" : ""}`}
          onClick={onAutoScrollToggle}
          title={autoScroll ? "Disable Auto-Scroll" : "Enable Auto-Scroll"}
        >
          <Activity size={16} />
        </button>
        <div
          style={{ width: 1, height: 20, background: "rgba(255,255,255,0.1)" }}
        ></div>
        <button
          className="btn"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo"
        >
          <RotateCcw size={14} />
        </button>
        <button
          className="btn"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo"
        >
          <RotateCw size={14} />
        </button>
      </div>

      {/* BPM & Time */}
      <div className="control-group">
        <div className="control-unit bpm-unit">
          <div className="unit-header">
            <span className="label">BPM</span>
            <span
              className="bpm-lock"
              onClick={onBpmLockToggle}
              title={bpmLocked ? "Unlock BPM" : "Lock BPM"}
              style={{
                cursor: "pointer",
                color: bpmLocked ? "var(--lock, #ff3d00)" : "#666",
              }}
            >
              {bpmLocked ? <Lock size={10} /> : <Unlock size={10} />}
            </span>
            {editingBpm ? (
              <input
                type="number"
                value={bpmInput}
                onChange={handleBpmInputChange}
                onBlur={handleBpmInputBlur}
                onKeyDown={handleBpmInputKeyDown}
                autoFocus
                className="bpm-input"
              />
            ) : (
              <span
                className="label bpm-display"
                onClick={handleBpmClick}
                title="Click to enter BPM manually"
              >
                {bpm}
              </span>
            )}
          </div>
          <input
            type="range"
            min="60"
            max="220"
            value={bpm}
            onChange={(e) => onBpmChange(parseInt(e.target.value))}
          />
        </div>
        <div className="control-unit">
          <span className="label">SIG</span>
          <select
            value={timeSignature}
            onChange={(e) => onTimeSignatureChange(e.target.value)}
            className="mini-select"
          >
            <option value="4/4">4/4</option>
            <option value="3/4">3/4</option>
            <option value="6/8">6/8</option>
          </select>
        </div>
      </div>

      {/* Key & Scale */}
      <div className="control-group">
        <div className="control-unit">
          <span className="label">KEY / SCALE</span>
          <div className="select-row">
            <select
              value={musicalKey}
              onChange={(e) => onKeyChange(e.target.value)}
              className="key-select"
            >
              {KEYS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
            <select
              value={scale}
              onChange={(e) => onScaleChange(e.target.value)}
              className="scale-select"
            >
              {SCALES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Steps & Humanize */}
      <div className="control-group">
        <div className="control-unit">
          <span className="label">STEPS</span>
          <select
            value={steps}
            onChange={(e) => onStepsChange(parseInt(e.target.value))}
          >
            <option value="16">16</option>
            <option value="32">32</option>
            <option value="64">64</option>
            <option value="128">128</option>
          </select>
        </div>
        <div className="control-unit range-unit">
          <span className="label">SWING</span>
          <input
            type="range"
            min="0"
            max="50"
            value={swing * 100}
            onChange={(e) => onSwingChange(parseInt(e.target.value) / 100)}
          />
        </div>
        <div className="control-unit range-unit">
          <span className="label">HUMAN</span>
          <input
            type="range"
            min="0"
            max="100"
            value={humanize * 100}
            onChange={(e) => onHumanizeChange(parseInt(e.target.value) / 100)}
          />
        </div>
      </div>

      {/* Genre, Kit, Generate */}
      {/* Genre, Kit, Generate */}
      <div className="control-group generator-group">
        <div className="generator-controls">
          <div className="control-column">
            <span className="label">GENRE</span>
            <select
              value={genre}
              onChange={(e) => onGenreChange(e.target.value)}
            >
              <option value="house">House</option>
              <option value="dnb">Drum & Bass</option>
              <option value="rock">Rock / Metal</option>
              <option value="jazz">Jazz / Fusion</option>
              <option value="hiphop">Hip Hop / Trap</option>
            </select>
          </div>
          <div className="control-column">
            <span className="label">KIT</span>
            <select
              value={kit}
              onChange={(e) => onKitChange(e.target.value)}
              className="kit-select"
            >
              {availableKits.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
          <div className="control-column complexity-select">
            <span className="label">Complexity</span>
            <select
              value={complexity}
              onChange={(e) => onComplexityChange(e.target.value)}
            >
              <option value="simple">Simple</option>
              <option value="moderate">Mid</option>
              <option value="high">High</option>
              <option value="extreme">Max</option>
            </select>
          </div>

          <div
            className="control-column master-fx-toggle"
            onClick={onToggleFX}
          >
            <span className="label">MASTER FX</span>
            <div className={`fx-icon ${showFX ? "active" : ""}`}>
              <Layers size={20} />
            </div>
          </div>
        </div>

        <div className="actions-column">
          <div className="generate-row">
            <button
              className="btn btn-gen"
              onClick={onGenerate}
              disabled={pending}
              style={{ opacity: pending ? 0.7 : 1 }}
            >
              <Music size={14} />
              {pending ? "..." : "GENERATE"}
            </button>
            <VariationMenu onGenerateVariation={onGenerateVariation} />
          </div>

          <div className="file-actions-row">
            <div className="dropdown" style={{ position: "relative" }}>
              <button
                className="btn"
                onClick={() => setExportOpen(!exportOpen)}
              >
                <Download size={14} />
                EXPORT
              </button>
              {exportOpen &&
                ReactDOM.createPortal(
                  <>
                    <div
                      className="portal-overlay"
                      onClick={() => setExportOpen(false)}
                    />
                    <div className="export-menu">
                      <div className="menu-header">
                        Export Options
                      </div>
                      <button
                        className="btn"
                        onClick={() => {
                          onExport("full", "mp3");
                          setExportOpen(false);
                        }}
                      >
                        Full Mix (MP3)
                      </button>
                      <button
                        className="btn"
                        onClick={() => {
                          onExport("stems", "mp3");
                          setExportOpen(false);
                        }}
                      >
                        Stems (MP3)
                      </button>
                      <button
                        className="btn"
                        onClick={() => {
                          onExport("full", "wav");
                          setExportOpen(false);
                        }}
                      >
                        Full Mix (WAV)
                      </button>
                      <button
                        className="btn"
                        onClick={() => {
                          onExport("stems", "wav");
                          setExportOpen(false);
                        }}
                      >
                        Stems (WAV)
                      </button>
                      <button
                        className="btn"
                        onClick={() => {
                          onExport("midi");
                          setExportOpen(false);
                        }}
                      >
                        MIDI File
                      </button>
                    </div>
                  </>,
                  document.body,
                )}
            </div>
            <button
              className="btn"
              onClick={onSave}
              title="Save to local storage"
            >
              <Save size={14} />
              SAVE
            </button>
            <button className="btn" onClick={onLoad} title="Load from Browser">
              <Upload size={14} />
              LOAD
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
