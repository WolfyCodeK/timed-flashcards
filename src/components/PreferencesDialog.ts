import { preferences } from '../store/preferencesStore';
import type { Theme } from '../types/preferences';

export class PreferencesDialog {
    private dialog: HTMLDivElement;

    constructor() {
        this.dialog = document.createElement('div');
        this.dialog.className = 'dialog-overlay';
        this.createDialog();
    }

    private createDialog() {
        const currentTheme = preferences.getCurrentTheme();
        const allThemes = preferences.getAllThemes();

        this.dialog.innerHTML = `
            <div class="dialog preferences-dialog">
                <h2>Preferences</h2>
                <div class="form-group">
                    <label for="theme-select">Theme:</label>
                    <select id="theme-select" class="theme-select">
                        ${allThemes.map(theme => `
                            <option value="${theme.id}" ${theme.id === currentTheme.id ? 'selected' : ''}>
                                ${theme.name}
                            </option>
                        `).join('')}
                    </select>
                </div>
                <div class="button-group">
                    <button id="preferences-close" class="action-button">Close</button>
                </div>
            </div>
        `;

        const themeSelect = this.dialog.querySelector('#theme-select') as HTMLSelectElement;
        themeSelect?.addEventListener('change', async (e) => {
            const themeId = (e.target as HTMLSelectElement).value;
            await preferences.setTheme(themeId);
        });

        this.dialog.querySelector('#preferences-close')?.addEventListener('click', () => {
            this.close();
        });
    }

    show() {
        document.body.appendChild(this.dialog);
    }

    close() {
        this.dialog.remove();
    }
} 