export interface Card {
    id: string;
    content: string;
    created: Date;
    lastShown?: Date;
}

export interface Deck {
    id: string;
    name: string;
    cards: Card[];
    created: Date;
    lastModified: Date;
    filePath?: string;  // Path to associated text file if imported
}

export interface DeckRunnerSettings {
    interval: number;
    intervalUnit: 'minutes' | 'hours';
    shuffle: boolean;
} 