export interface Card {
    id: string;
    content: string;
    created: string; // ISO string
    lastShown?: Date;
}

export interface Deck {
    id: string;
    name: string;
    cards: Card[];
    created: string; // ISO string
    lastModified: string; // ISO string
    filePath?: string;  // Path to associated text file if imported
}

export interface DeckRunnerSettings {
    interval: number;
    intervalUnit: 'seconds' | 'minutes' | 'hours';
    shuffle: boolean;
} 