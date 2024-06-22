import { createFlashcardList } from './components/flashcard_list';
import { Flashcard } from './components/flashcard';

const flashcards: Flashcard[] = [
    { id: 1, question: 'What is Tauri?', answer: 'A framework for building tiny, fast binaries for all major desktop platforms' },
    { id: 2, question: 'What is TypeScript?', answer: 'A typed superset of JavaScript that compiles to plain JavaScript' },
    // Add more flashcards here
];  

document.addEventListener('DOMContentLoaded', () => {
    const app = document.getElementById('app');
    if (app) {
        const flashcardList = createFlashcardList(flashcards);
        app.appendChild(flashcardList);
    }
});