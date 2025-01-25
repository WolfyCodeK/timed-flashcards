import { WebviewWindow } from '@tauri-apps/api/window';
import type { DeckRunnerSettings, Deck, Card } from '../types/deck';

export class DeckRunner {
    private deck: Deck;
    private settings: DeckRunnerSettings;
    private currentIndex: number = 0;
    private cards: Card[];
    private intervalId?: number;
    private popupWindow?: WebviewWindow;
    private isPaused: boolean = false;

    constructor(deck: Deck, settings: DeckRunnerSettings) {
        this.deck = deck;
        this.settings = settings;
        this.cards = settings.shuffle ? this.shuffleCards([...deck.cards]) : [...deck.cards];
    }

    private shuffleCards(cards: Card[]): Card[] {
        for (let i = cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cards[i], cards[j]] = [cards[j], cards[i]];
        }
        return cards;
    }

    async start(): Promise<void> {
        const intervalMs = this.settings.intervalUnit === 'minutes'
            ? this.settings.interval * 60 * 1000
            : this.settings.interval * 60 * 60 * 1000;

        await this.showCard();
        
        this.intervalId = window.setInterval(() => {
            if (!this.isPaused) {
                this.showNextCard();
            }
        }, intervalMs);
    }

    private async showCard(): Promise<void> {
        // Close existing window if it exists
        if (this.popupWindow) {
            await this.popupWindow.close();
        }

        this.popupWindow = new WebviewWindow('card-popup', {
            url: 'src/views/card-popup.html',
            title: 'Flashcard',
            width: 400,
            height: 300,
            center: true,
            alwaysOnTop: true,
            decorations: false, // Makes it borderless
            skipTaskbar: true, // Hides from taskbar
        });

        // Wait for the window to be ready
        await this.popupWindow.once('tauri://created', async () => {
            // Send card content to popup
            await this.popupWindow?.emit('card-content', {
                content: this.cards[this.currentIndex].content
            });
        });
    }

    async showNextCard(): Promise<void> {
        this.currentIndex = (this.currentIndex + 1) % this.cards.length;
        await this.showCard();
    }

    pause(): void {
        this.isPaused = true;
    }

    resume(): void {
        this.isPaused = false;
    }

    stop(): void {
        if (this.intervalId) {
            window.clearInterval(this.intervalId);
        }
        if (this.popupWindow) {
            this.popupWindow.close();
        }
    }
} 