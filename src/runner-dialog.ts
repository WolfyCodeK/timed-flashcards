import { appWindow, WebviewWindow } from '@tauri-apps/api/window';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/tauri';
import type { Deck } from './types/deck';
import { DeckRunner } from './services/deckRunner';

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

            // Then create runners for each deck
            for (const deck of selectedDecks) {
                console.log('Creating runner for deck:', deck.name);
                const runner = new DeckRunner(deck, settings);
                await runner.start();
            }

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