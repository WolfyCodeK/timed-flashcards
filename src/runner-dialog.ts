import { appWindow } from '@tauri-apps/api/window';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/tauri';
import type { Deck } from './types/deck';
import { DeckRunner } from './services/deckRunner';
import { setCurrentRunner } from './main';  // Import the setter

console.log('runner-dialog.ts loaded');

let selectedDecks: Deck[] = [];

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded in runner-dialog');
    
    // Listen for deck data
    listen('selected-decks', (event: any) => {
        console.log('Received selected-decks event:', event.payload);
        if (!event.payload.decks) {
            console.error('No decks in payload:', event.payload);
            return;
        }
        selectedDecks = event.payload.decks;
        console.log('Updated selectedDecks:', selectedDecks);

        // Update the selected decks list in the UI
        const selectedDecksList = document.getElementById('selected-decks-list');
        if (selectedDecksList) {
            selectedDecksList.innerHTML = selectedDecks
                .map(deck => `<div class="selected-deck-item">${deck.name}</div>`)
                .join('');
        }
    });

    const startButton = document.getElementById('start-deck');
    console.log('Start button element:', startButton);

    // Start button
    startButton?.addEventListener('click', async () => {
        console.log('Start button clicked');
        if (selectedDecks.length === 0) {
            console.log('No decks selected');
            return;
        }

        console.log('Selected decks:', selectedDecks);

        const interval = parseInt((document.getElementById('interval') as HTMLInputElement).value);
        const intervalUnit = (document.getElementById('interval-unit') as HTMLSelectElement).value as 'minutes' | 'hours';
        const shuffle = (document.getElementById('shuffle') as HTMLInputElement).checked;

        console.log('Settings:', { interval, intervalUnit, shuffle });

        const settings = {
            interval,
            intervalUnit,
            shuffle
        };

        try {
            console.log('Invoking start_decks command...');
            await invoke('start_decks', { 
                deckIds: selectedDecks.map(deck => deck.id)
            });
            console.log('start_decks command completed');

            // Create runner and set it as current
            const runner = new DeckRunner(selectedDecks[0], settings);
            console.log('Created new runner:', runner);
            setCurrentRunner(runner);  // Set the current runner
            console.log('Current runner set, starting...');
            await runner.start();
            console.log('Runner started successfully');

            await appWindow.hide();
        } catch (error) {
            console.error('Error starting decks:', error);
        }
    });

    // Cancel button
    document.getElementById('cancel')?.addEventListener('click', () => {
        appWindow.close();
    });
}); 