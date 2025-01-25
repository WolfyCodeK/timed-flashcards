import { appWindow, WebviewWindow } from '@tauri-apps/api/window';
import { getMatches } from '@tauri-apps/api/cli';
import { invoke } from '@tauri-apps/api/tauri';
import type { Deck, DeckRunnerSettings } from '../types/deck';

export class DeckRunner {
    private deck: Deck;
    private settings: DeckRunnerSettings;
    private currentIndex: number = 0;
    private intervalId: number | null = null;
    private isPaused: boolean = false;
    private cardWindow: WebviewWindow | null = null;

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
            
            // Hide the settings window
            await appWindow.hide();
            console.log('Settings window hidden');

            // Show system tray
            await invoke('toggle_system_tray_on');
            console.log('System tray created');

            // Start showing cards
            if (this.deck.cards.length === 0) {
                console.error('No cards in deck!');
                return;
            }

            await this.showNextCard();
            console.log('First card shown');
            
            // Convert interval to milliseconds
            const intervalMs = this.settings.interval * (
                this.settings.intervalUnit === 'seconds' ? 1000 :
                this.settings.intervalUnit === 'minutes' ? 60000 : 
                3600000
            );
            console.log('Setting interval:', intervalMs, 'ms');
            
            this.intervalId = window.setInterval(() => {
                if (!this.isPaused) {
                    this.showNextCard().catch(err => {
                        console.error('Error showing next card:', err);
                    });
                }
            }, intervalMs);
            console.log('Interval timer set');
        } catch (error) {
            console.error('Error in start():', error);
            throw error;  // Re-throw to see the full error stack
        }
    }

    private async showNextCard() {
        try {
            console.log('Showing next card...');
            console.log('Current index:', this.currentIndex);
            console.log('Total cards:', this.deck.cards.length);

            if (this.cardWindow) {
                console.log('Closing previous window');
                await this.cardWindow.close();
                console.log('Closed previous card window');
            }

            const card = this.deck.cards[this.currentIndex];
            if (!card) {
                console.error('No card found at index:', this.currentIndex);
                return;
            }

            console.log('Current card:', card);
            console.log('Card content:', card.content);
            
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

            console.log('Window created, waiting for ready event');

            // Wait for window creation
            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Window creation timed out'));
                }, 5000);  // 5 second timeout

                this.cardWindow?.once('tauri://created', () => {
                    clearTimeout(timeout);
                    console.log('Window created event received');
                    resolve();
                });
            });

            // Give the window a moment to initialize its JavaScript
            console.log('Waiting for window initialization');
            await new Promise(resolve => setTimeout(resolve, 500));  // Increased to 500ms

            console.log('Sending content to window:', card.content);
            await this.cardWindow?.emit('card-content', {
                content: card.content,
                current: this.currentIndex + 1,
                total: this.deck.cards.length
            });
            console.log('Content sent to window');

            // Show the window after content is set
            console.log('Showing window');
            await this.cardWindow?.show();
            console.log('Window shown');

            // Update index for next card
            this.currentIndex = (this.currentIndex + 1) % this.deck.cards.length;
            console.log('Updated card index to:', this.currentIndex);
        } catch (error) {
            console.error('Error in showNextCard():', error);
            throw error;  // Re-throw to see the full error stack
        }
    }

    pause() {
        this.isPaused = true;
    }

    resume() {
        this.isPaused = false;
    }

    async stop() {
        if (this.intervalId !== null) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        
        if (this.cardWindow) {
            await this.cardWindow.close();
            this.cardWindow = null;
        }

        // Remove system tray
        await invoke('toggle_system_tray_off');
    }
} 