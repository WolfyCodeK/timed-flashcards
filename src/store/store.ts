export type Subscriber<T> = (value: T) => void;
export type Unsubscriber = () => void;

export class Store<T> {
    private value: T;
    private subscribers: Set<Subscriber<T>> = new Set();

    constructor(initialValue: T) {
        this.value = initialValue;
    }

    subscribe(subscriber: Subscriber<T>): Unsubscriber {
        this.subscribers.add(subscriber);
        subscriber(this.value);
        
        return () => {
            this.subscribers.delete(subscriber);
        };
    }

    update(updater: (value: T) => T): void {
        this.value = updater(this.value);
        this.notify();
    }

    set(newValue: T): void {
        this.value = newValue;
        this.notify();
    }

    get(): T {
        return this.value;
    }

    private notify(): void {
        for (const subscriber of this.subscribers) {
            subscriber(this.value);
        }
    }
}

export function writable<T>(initialValue: T) {
    return new Store<T>(initialValue);
} 