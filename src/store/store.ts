import { emit, listen } from '@tauri-apps/api/event';

export type Subscriber<T> = (value: T) => void;
export type Unsubscriber = () => void;

export class Store<T> {
    protected data: T;
    private subscribers: ((data: T) => void)[] = [];
    private storeId: string;

    constructor(initial: T, storeId: string) {
        this.data = initial;
        this.storeId = storeId;
        this.initializeEventListener();
    }

    private async initializeEventListener() {
        // Listen for updates from other windows
        await listen(`store-update:${this.storeId}`, (event: any) => {
            this.data = event.payload;
            this.notifySubscribers();
        });
    }

    get(): T {
        return this.data;
    }

    async set(value: T) {
        this.data = value;
        // Emit event to sync across windows
        await emit(`store-update:${this.storeId}`, value);
        this.notifySubscribers();
    }

    subscribe(callback: (data: T) => void): () => void {
        this.subscribers.push(callback);
        callback(this.data);
        return () => {
            this.subscribers = this.subscribers.filter(cb => cb !== callback);
        };
    }

    update(updater: (value: T) => T): void {
        this.data = updater(this.data);
        this.notify();
    }

    private notifySubscribers(): void {
        this.subscribers.forEach(callback => callback(this.data));
    }

    private notify(): void {
        for (const subscriber of this.subscribers) {
            subscriber(this.data);
        }
    }
}

export function writable<T>(initialValue: T) {
    return new Store<T>(initialValue, "default");
} 