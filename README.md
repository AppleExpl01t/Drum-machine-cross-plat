# Gemini Studio - Drum Machine

Welcome to the Gemini Studio Drum Machine project! This guide is designed to help new developers—even beginners—get started with contributing to this application, specifically when working alongside an AI Agentic IDE.

## 🚀 Project Overview

This is a **Hybrid Mobile & Desktop Application** built with modern web technologies and wrapped for native performance.

- **Frontend**: [React](https://react.dev/) (UI Framework), [Vite](https://vitejs.dev/) (Build Tool)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand) (Simple, scalable state)
- **Backend/Native**: [Tauri](https://tauri.app/) (Rust-based framework for desktop/mobile apps)
- **Mobile**: Android (via Tauri's mobile integration)

The app is a drum machine sequencer that allows users to create patterns, manage samples, and playback audio in real-time.

---

## 🛠️ Prerequisites

Before you start, ensure you have the following installed:

1.  **Node.js**: The runtime for the web frontend. [Download LTS Version](https://nodejs.org/)
2.  **Rust**: Required for Tauri. [Install Rust](https://www.rust-lang.org/tools/install)
3.  **Android Studio** (For Mobile Dev): Required to build and run on Android. [Download](https://developer.android.com/studio)
    - Ensure you set your `JAVA_HOME` environment variable to the Android Studio JRE (typically `C:\Program Files\Android\Android Studio\jbr`).

---

## ⚡ Getting Started

### 1. Installation

Open your terminal in the project root and run:

```sh
npm install
```

This installs all the JavaScript dependencies defined in `package.json`.

### 2. Running in Development Mode

To start the app on your desktop for development:

```sh
npm run tauri dev
```

This command:

- Starts the Vite dev server (frontend).
- Compiles the Rust backend.
- Opens the application window.

### 3. Running on Android

Connect your Android device (with USB Debugging enabled) or start an Emulator, then run:

```sh
npm run tauri android dev
```

---

## 📂 Project Structure

Here's a breakdown of the key directories you'll work with:

### `src/` (The Frontend)

This is where 90% of your work will happen.

- **`components/`**: React components (e.g., `Grid.jsx`, `Controls.jsx`). UI elements live here.
- **`store/`**: Global state management.
  - `useSequencerStore.js`: Holds the state of the drum patterns, active steps, tempo, etc.
- **`audio/`**: Audio processing logic (e.g., `AudioEngine.js`).
- **`utils/`**: Helper functions (e.g., `storage.js` for saving/loading data).
- **`App.jsx`**: The main entry point component.

### `src-tauri/` (The Native Layer)

- **`src/lib.rs`**: The main Rust entry point. Generally, you won't touch this unless you are adding low-level system features.
- **`gen/android/`**: Auto-generated Android project files. **Do not modify these manually** unless you are configuring build settings (like signing) in `build.gradle.kts`.
- **`tauri.conf.json`**: Configuration for the app window, permissions, and bundle settings.

---

## 🤖 Working with the AI Agent

This project is optimized for development with an AI Agent. Here are some tips for asking for help:

### Context is King

When asking the AI to make changes, try to mention which "part" of the app you are working on.

- _Bad_: "Fix the bug."
- _Good_: "Fix the bug where the sequencer doesn't save steps in `useSequencerStore.js`."

### Common Requests

- **Refactoring**: "Refactor `Grid.jsx` to use the `useSequencerStore` instead of props."
- **Styling**: "Make the play button in `Controls.jsx` larger and green when active."
- **Debugging**: "I'm getting an error in the console about `AudioContext`. can you check `AudioEngine.js`?"

### Files to Ignore

You generally **do not** need to ask the AI to read:

- `node_modules/`: These are libraries.
- `src-tauri/target/`: Build artifacts.
- `dist/`: Compiled web output.

---

## 📦 Building for Release

### Android Release

To build a signed APK for Android:

1.  **Generate Keystore** (First time only):
    The project includes a helper to generate a release keystore.
    ```sh
    cd src-tauri/gen/android
    ./gradlew :app:generateReleaseKeystore
    ```
2.  **Build**:
    ```sh
    npm run tauri android build
    ```
    _Note: The output APK will be in `src-tauri/gen/android/app/build/outputs/apk/universal/release/`._

### Desktop Release

To build an installer for Windows/Mac/Linux:

```sh
npm run tauri build
```

---

## ❓ Troubleshooting

**"App not installed" on Android?**

- This usually means the APK is not signed properly. Ensure you have run the keystore generation step and that `build.gradle.kts` is configured to use `release.keystore`.

**"JAVA_HOME is not set"?**

- You need to point this variable to your Java installation. If you installed Android Studio, use:
  `$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'` (PowerShell)

**"Program not found" when running Tauri?**

- Ensure Rust is installed and `cargo` is in your system PATH.

---

_Documentation generated with ❤️ by your AI Pair Programmer._
