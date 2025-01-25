import { appWindow, WebviewWindow, getAll } from '@tauri-apps/api/window';
import { getMatches } from '@tauri-apps/api/cli';
import { invoke } from '@tauri-apps/api/tauri';
import type { Deck, DeckRunnerSettings } from '../types/deck';

export class DeckRunner {
    private deck: Deck;
    private settings: DeckRunnerSettings;
    private currentIndex: number = 0;
    private timeoutId: number | null = null;
    private isPaused: boolean = false;
    private cardWindow: WebviewWindow | null = null;
    private mainWindow: WebviewWindow | null = null;

    constructor(deck: Deck, settings: DeckRunnerSettings) {
        this.deck = deck;
        this.settings = settings;
        if (settings.shuffle) {
            this.shuffleCards();
        }
    }

    private shuffleCards() {
        for (let i = this.deck.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck.cards[i], this.deck.cards[j]] = [this.deck.cards[j], this.deck.cards[i]];
        }
    }

    async start() {
        try {
            console.log('Starting deck runner with deck:', this.deck);
            console.log('Settings:', this.settings);
            
            // Store reference to main window before hiding it
            this.mainWindow = getAll().find(w => w.label === 'main') || null;
            
            // Hide all windows except system tray
            for (const window of getAll()) {
                if (window.label !== 'tray') {
                    await window.hide();
                }
            }

            // Show system tray
            await invoke('toggle_system_tray_on');
            console.log('System tray created');

            if (this.deck.cards.length === 0) {
                console.error('No cards in deck!');
                return;
            }

            // Show first card
            await this.showNextCard();
        } catch (error) {
            console.error('Error in start():', error);
            throw error;
        }
    }

    private async showNextCard() {
        try {
            console.log('Showing next card...');
            console.log('Current index:', this.currentIndex);
            console.log('Total cards:', this.deck.cards.length);

            // Close previous window if it exists
            if (this.cardWindow) {
                try {
                    await this.cardWindow.close();
                } catch (e) {
                    console.log('Previous window already closed');
                }
                this.cardWindow = null;
            }

            const card = this.deck.cards[this.currentIndex];
            if (!card) {
                console.error('No card found at index:', this.currentIndex);
                return;
            }

            // Create new window with a unique label
            const windowLabel = `card-${Date.now()}`;
            console.log('Creating window with label:', windowLabel);

            this.cardWindow = new WebviewWindow(windowLabel, {
                url: 'src/views/card-popup.html',
                title: this.deck.name,
                width: 400,
                height: 200,
                decorations: true,
                center: true,
                alwaysOnTop: true,
                focus: true,
                visible: false
            });

            // Update index for next card
            this.currentIndex = (this.currentIndex + 1) % this.deck.cards.length;

            // Listen for window close event
            this.cardWindow.listen('tauri://close-requested', () => {
                if (!this.isPaused) {
                    // Schedule next card after the specified interval
                    const intervalMs = this.settings.interval * (
                        this.settings.intervalUnit === 'seconds' ? 1000 :
                        this.settings.intervalUnit === 'minutes' ? 60000 : 
                        3600000
                    );
                    
                    if (this.timeoutId) {
                        clearTimeout(this.timeoutId);
                    }
                    
                    this.timeoutId = window.setTimeout(() => {
                        this.showNextCard().catch(err => {
                            console.error('Error showing next card:', err);
                        });
                    }, intervalMs);
                }
            });

            // Wait for window creation
            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Window creation timed out'));
                }, 5000);

                this.cardWindow?.once('tauri://created', () => {
                    clearTimeout(timeout);
                    console.log('Window created event received');
                    resolve();
                });
            });

            // Initialize window content
            await new Promise(resolve => setTimeout(resolve, 500));

            await this.cardWindow?.emit('card-content', {
                content: card.content,
                current: this.currentIndex,
                total: this.deck.cards.length
            });

            await this.cardWindow?.show();

        } catch (error) {
            console.error('Error in showNextCard():', error);
            // Don't rethrow - we want to continue even if one card fails
        }
    }

    pause() {
        this.isPaused = true;
        if (this.timeoutId !== null) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
    }

    resume() {
        this.isPaused = false;
        // Show next card immediately when resuming
        this.showNextCard().catch(err => {
            console.error('Error showing next card on resume:', err);
        });
    }

    async cleanup() {
        if (this.timeoutId !== null) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
        
        if (this.cardWindow) {
            try {
                await this.cardWindow.close();
            } catch (e) {
                console.log('Window already closed');
            }
            this.cardWindow = null;
        }
        
        this.mainWindow = null;
    }

    async stop() {
        console.log('DeckRunner.stop() called');
        try {
            await this.cleanup();

            // Show main window again
            const mainWindow = WebviewWindow.getByLabel('main');
            if (mainWindow) {
                console.log('Found main window by label');
                await mainWindow.show();
                await mainWindow.setFocus();
                console.log('Main window shown and focused');
            } else {
                console.error('Could not find main window by label');
            }

            console.log('Toggling system tray off');
            await invoke('toggle_system_tray_off');
            console.log('DeckRunner.stop() completed');
        } catch (error) {
            console.error('Error in stop():', error);
            throw error;
        }
    }
} 