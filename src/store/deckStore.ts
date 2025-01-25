import { writable } from './store';
import type { Deck, Card } from '../types/deck';
import { readTextFile, writeTextFile } from '@tauri-apps/api/fs';
import { open, save } from '@tauri-apps/api/dialog';
import { v4 as uuidv4 } from 'uuid';

export const decks = writable<Deck[]>([]);

export async function createNewDeck(name: string): Promise<Deck> {
    const deck: Deck = {
        id: uuidv4(),
        name,
        cards: [],
        created: new Date(),
        lastModified: new Date()
    };

    decks.update(d => [...d, deck]);
    return deck;
}

export async function importDeckFromFile(): Promise<Deck | null> {
    try {
        const selected = await open({
            multiple: false,
            filters: [{
                name: 'Text',
                extensions: ['txt']
            }]
        });

        if (!selected || Array.isArray(selected)) return null;

        const filePath = selected;
        const content = await readTextFile(filePath);
        const lines = content.split('\n').filter(line => line.trim());
        
        const deck: Deck = {
            id: uuidv4(),
            name: filePath.split(/[/\\]/).pop()?.replace('.txt', '') || 'New Deck',
            cards: lines.map(line => ({
                id: uuidv4(),
                content: line.trim(),
                created: new Date()
            })),
            created: new Date(),
            lastModified: new Date(),
            filePath
        };

        decks.update(d => [...d, deck]);
        return deck;
    } catch (error) {
        console.error('Error importing deck:', error);
        return null;
    }
}

export async function exportDeckToFile(deck: Deck): Promise<boolean> {
    try {
        const filePath = await save({
            filters: [{
                name: 'Text',
                extensions: ['txt']
            }]
        });

        if (!filePath) return false;

        const content = deck.cards.map(card => card.content).join('\n');
        await writeTextFile(filePath, content);
        
        // Update deck with new file path
        const updatedDeck = { ...deck, filePath, lastModified: new Date() };
        updateDeck(updatedDeck);
        
        return true;
    } catch (error) {
        console.error('Error exporting deck:', error);
        return false;
    }
}

export async function saveDeckToFile(deck: Deck): Promise<void> {
    if (!deck.filePath) throw new Error('No file path associated with deck');
    
    const content = deck.cards.map(card => card.content).join('\n');
    await writeTextFile(deck.filePath, content);
    
    decks.update(d => d.map(d => 
        d.id === deck.id 
            ? { ...d, lastModified: new Date() }
            : d
    ));
}

export function updateDeck(updatedDeck: Deck): void {
    decks.update(d => d.map(deck => 
        deck.id === updatedDeck.id ? updatedDeck : deck
    ));
}

export function deleteDeck(deckId: string): void {
    decks.update(d => d.filter(deck => deck.id !== deckId));
} 