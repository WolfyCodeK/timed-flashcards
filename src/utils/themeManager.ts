import { preferences } from '../store/preferencesStore';

export async function initializeTheme() {
    await preferences.waitForInitialization();
    const currentTheme = preferences.getCurrentTheme();
    preferences.applyTheme(currentTheme.id);
} 