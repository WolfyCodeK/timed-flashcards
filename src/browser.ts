import { WebviewWindow } from '@tauri-apps/api/window';
import { decks } from './store/deckStore';
import type { Deck, DeckRunnerSettings } from './types/deck';
import { DeckRunner } from './services/deckRunner';

let currentDeck: Deck | null = null;

document.addEventListener('DOMContentLoaded', () => {
    // Get deck ID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const deckId = urlParams.get('id');
    
    if (!deckId) {
        console.error('No deck ID provided');
        return;
    }

    currentDeck = decks.get().find(d => d.id === deckId) || null;
    if (!currentDeck) {
        console.error('Deck not found');
        return;
    }

    // Set deck name
    const deckNameElement = document.getElementById('deck-name');
    if (deckNameElement) {
        deckNameElement.textContent = currentDeck.name;
    }

    // Render cards
    const cardList = document.getElementById('card-list');
    if (cardList) {
        currentDeck.cards.forEach((card, index) => {
            const cardElement = document.createElement('div');
            cardElement.className = 'card-item';
            cardElement.textContent = card.content;
            cardList.appendChild(cardElement);
        });
    }

    // Run deck button
    document.getElementById('run-deck')?.addEventListener('click', async () => {
        const runnerWindow = new WebviewWindow('deck-runner', {
            url: 'src/views/deck-runner-dialog.html',
            title: 'Run Deck',
            width: 400,
            height: 300,
            center: true,
            resizable: false
        });

        await runnerWindow.once('tauri://created', async () => {
            // Send deck data to runner window
            await runnerWindow.emit('deck-data', { deck: currentDeck });
        });
    });

    // Edit deck button
    document.getElementById('edit-deck')?.addEventListener('click', async () => {
        if (!currentDeck) return;

        const editorWindow = new WebviewWindow('deck-editor', {
            url: `src/views/deck-editor.html?id=${currentDeck.id}`,
            title: 'Edit Deck',
            width: 800,
            height: 600,
            center: true,
        });
    });
}); 