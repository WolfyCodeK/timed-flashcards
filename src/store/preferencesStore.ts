import { Store } from './store';
import type { Preferences, Theme } from '../types/preferences';
import { DEFAULT_THEMES } from '../types/preferences';
import { readTextFile, writeTextFile, BaseDirectory, exists, createDir } from '@tauri-apps/api/fs';
import { WebviewWindow, getAll } from '@tauri-apps/api/window';

const PREFERENCES_FILE = 'preferences.json';

const DEFAULT_PREFERENCES: Preferences = {
    theme: 'dark',
    customThemes: []
};

class PreferencesStore extends Store<Preferences> {
    private initialized: Promise<void>;

    constructor() {
        super(DEFAULT_PREFERENCES, 'preferences');
        this.initialized = this.loadPreferences();
    }

    async waitForInitialization() {
        await this.initialized;
    }

    private async loadPreferences() {
        try {
            const dirExists = await exists('', { dir: BaseDirectory.AppData });
            if (!dirExists) {
                await createDir('', { dir: BaseDirectory.AppData });
            }

            const data = await readTextFile(PREFERENCES_FILE, { dir: BaseDirectory.AppData });
            const parsedPreferences = JSON.parse(data);
            super.set(parsedPreferences);
        } catch (error) {
            console.log('No existing preferences found, using defaults');
            await this.savePreferences();
        }
    }

    private async savePreferences() {
        try {
            const currentPreferences = super.get();
            await writeTextFile(
                PREFERENCES_FILE,
                JSON.stringify(currentPreferences),
                { dir: BaseDirectory.AppData }
            );
        } catch (error) {
            console.error('Error saving preferences:', error);
        }
    }

    async setTheme(themeId: string) {
        const currentPreferences = super.get();
        currentPreferences.theme = themeId;
        await this.set(currentPreferences);
        
        // Apply theme to current window
        this.applyTheme(themeId);
        
        // Apply theme to all other windows
        const windows = getAll();
        for (const window of windows) {
            try {
                await window.emit('theme-changed', { themeId });
            } catch (error) {
                console.error('Error updating theme in window:', window.label, error);
            }
        }
    }

    getAllThemes(): Theme[] {
        const currentPreferences = super.get();
        return [...DEFAULT_THEMES, ...currentPreferences.customThemes];
    }

    getCurrentTheme(): Theme {
        const currentPreferences = super.get();
        return this.getAllThemes().find(theme => theme.id === currentPreferences.theme) 
            || DEFAULT_THEMES[0];
    }

    applyTheme(themeId: string) {
        const theme = this.getAllThemes().find(t => t.id === themeId);
        if (!theme) return;

        const root = document.documentElement;
        Object.entries(theme.colors).forEach(([key, value]) => {
            root.style.setProperty(`--${key}`, value);
        });
    }

    async set(preferences: Preferences) {
        await super.set(preferences);
        await this.savePreferences();
        this.applyTheme(preferences.theme);
    }
}

export const preferences = new PreferencesStore(); 