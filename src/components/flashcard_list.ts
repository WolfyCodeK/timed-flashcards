import { Flashcard, createFlashcard } from './flashcard';

export function createFlashcardList(flashcards: Flashcard[]): HTMLElement {
    const list = document.createElement('div');
    list.className = 'flashcard-list';

    flashcards.forEach(flashcard => {
        const card = createFlashcard(flashcard);
        list.appendChild(card);
    });

    return list;
}