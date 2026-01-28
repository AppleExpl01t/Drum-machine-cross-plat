import { writeTextFile, readTextFile, readDir, mkdir, BaseDirectory } from '@tauri-apps/plugin-fs';

const FOLDER = 'GeminiBeats';

// Helper to ensure folder exists
const ensureFolder = async () => {
    try {
        await readDir(FOLDER, { baseDir: BaseDirectory.Document });
    } catch (e) {
        // Directory likely doesn't exist, try creating it
        try {
            await mkdir(FOLDER, { baseDir: BaseDirectory.Document, recursive: true });
        } catch (mkDirError) {
            console.error('Error creating directory', mkDirError);
        }
    }
};

export const savePatternToDisk = async (filename, data) => {
    try {
        await ensureFolder();
        // Ensure filename has extension
        const finalName = filename.endsWith('.json') ? filename : `${filename}.json`;

        await writeTextFile(`${FOLDER}/${finalName}`, JSON.stringify(data), { baseDir: BaseDirectory.Document });
        return { success: true, path: `${FOLDER}/${finalName}` };
    } catch (e) {
        console.error('Save failed', e);
        return { success: false, error: e.message };
    }
};

export const loadPatternFromDisk = async (filename) => {
    try {
        const finalName = filename.endsWith('.json') ? filename : `${filename}.json`;
        const result = await readTextFile(`${FOLDER}/${finalName}`, { baseDir: BaseDirectory.Document });
        return JSON.parse(result);
    } catch (e) {
        console.error('Load failed', e);
        throw e;
    }
};

export const listPatternsOnDisk = async () => {
    try {
        await ensureFolder();
        const result = await readDir(FOLDER, { baseDir: BaseDirectory.Document });
        return result.filter(f => f.name.endsWith('.json')).map(f => f.name.replace('.json', ''));
    } catch (e) {
        console.error('List failed', e);
        return [];
    }
};
