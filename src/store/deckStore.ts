import { Store } from './store';
import type { Deck, Card } from '../types/deck';
import { readTextFile, writeTextFile, BaseDirectory, createDir, exists } from '@tauri-apps/api/fs';
import { open, save } from '@tauri-apps/api/dialog';
import { v4 as uuidv4 } from 'uuid';

const DECKS_FILE = 'decks.json';

class DeckStore extends Store<Deck[]> {
    private initialized: Promise<void>;
    private isInitialized: boolean = false;

    constructor() {
        super([], 'decks');
        this.initialized = this.loadDecks();
    }

    async waitForInitialization() {
        if (!this.isInitialized) {
            await this.initialized;
        }
        return this.isInitialized;
    }

    private async loadDecks() {
        try {
            // Check if directory exists, if not create it
            const dirExists = await exists('', { dir: BaseDirectory.AppData });
            if (!dirExists) {
                await createDir('', { dir: BaseDirectory.AppData, recursive: true });
            }

            const data = await readTextFile(DECKS_FILE, { dir: BaseDirectory.AppData });
            console.log('Loaded decks data:', data);
            const parsedDecks = JSON.parse(data);
            super.set(parsedDecks);
            this.isInitialized = true;
        } catch (error) {
            console.log('No existing decks found, starting with empty array');
            super.set([]);
            await this.saveDecks();
            this.isInitialized = true;
        }
    }

    private async saveDecks() {
        if (!this.isInitialized) {
            await this.waitForInitialization();
        }

        try {
            // Ensure directory exists before saving
            const dirExists = await exists('', { dir: BaseDirectory.AppData });
            if (!dirExists) {
                await createDir('', { dir: BaseDirectory.AppData, recursive: true });
            }

            const currentDecks = super.get();
            console.log('Saving decks to file:', JSON.stringify(currentDecks, null, 2));
            await writeTextFile(DECKS_FILE, JSON.stringify(currentDecks), { dir: BaseDirectory.AppData });
        } catch (error) {
            console.error('Error saving decks:', error);
        }
    }

    async get(): Promise<Deck[]> {
        await this.waitForInitialization();
        const decks = super.get();
        console.log('Getting decks:', JSON.stringify(decks, null, 2));
        return decks;
    }

    async set(decks: Deck[]) {
        await this.waitForInitialization();
        console.log('Setting decks:', JSON.stringify(decks, null, 2));
        super.set(decks);
        await this.saveDecks();
    }
}

export const decks = new DeckStore();

export async function createNewDeck(name: string): Promise<Deck> {
    const deck: Deck = {
        id: uuidv4(),
        name,
        cards: [],
        created: new Date().toISOString(),
        lastModified: new Date().toISOString()
    };

    const currentDecks = await decks.get();
    currentDecks.push(deck);
    await decks.set(currentDecks);
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
                created: new Date().toISOString()
            })),
            created: new Date().toISOString(),
            lastModified: new Date().toISOString(),
            filePath
        };

        const currentDecks = await decks.get();
        currentDecks.push(deck);
        await decks.set(currentDecks);
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
        const updatedDeck = { ...deck, filePath, lastModified: new Date().toISOString() };
        await updateDeck(updatedDeck);
        
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
    
    const currentDecks = await decks.get();
    const updatedDecks = currentDecks.map(d => 
        d.id === deck.id 
            ? { ...d, lastModified: new Date().toISOString() }
            : d
    );
    await decks.set(updatedDecks);
}

export async function updateDeck(updatedDeck: Deck): Promise<void> {
    await decks.waitForInitialization();
    console.log('Updating deck:', JSON.stringify(updatedDeck, null, 2));
    
    const currentDecks = await decks.get();
    console.log('Current decks before update:', JSON.stringify(currentDecks, null, 2));
    
    const index = currentDecks.findIndex(deck => deck.id === updatedDeck.id);
    if (index !== -1) {
        // Create a new deck object with all the updated data
        const processedDeck: Deck = {
            ...updatedDeck,
            cards: updatedDeck.cards.map(card => ({
                id: card.id,
                content: card.content,
                created: card.created,
                lastShown: card.lastShown
            })),
            lastModified: new Date().toISOString()
        };
        
        // Create a new array with the updated deck
        const newDecks = [...currentDecks];
        newDecks[index] = processedDeck;
        
        console.log('Updated decks array:', JSON.stringify(newDecks, null, 2));
        await decks.set(newDecks);
    } else {
        console.error('Deck not found for update:', updatedDeck.id);
    }
}

export async function deleteDeck(deckId: string): Promise<void> {
    const currentDecks = await decks.get();
    const updatedDecks = currentDecks.filter(deck => deck.id !== deckId);
    await decks.set(updatedDecks);
} 