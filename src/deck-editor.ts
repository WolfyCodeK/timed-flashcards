import { listen } from '@tauri-apps/api/event';

console.log('Deck editor script loading...');

document.addEventListener('DOMContentLoaded', () => {
    console.log('Deck editor DOM loaded, setting up event listeners...');
    
    listen('edit-deck', (event: any) => {
        console.log('Received edit-deck event:', event);
        if (!event.payload.deck) {
            console.error('No deck in payload:', event.payload);
            return;
        }
        const deck = event.payload.deck;
        console.log('Processing deck:', deck);
        
        // Populate the deck name
        const deckNameInput = document.getElementById('deck-name') as HTMLInputElement;
        deckNameInput.value = deck.name;

        // Populate the flashcard list
        const flashcardList = document.getElementById('flashcard-list');
        if (flashcardList) {
            flashcardList.innerHTML = ''; // Clear existing flashcards
            if (deck.flashcards && Array.isArray(deck.flashcards)) {
                deck.flashcards.forEach((flashcard: any) => {
                    const flashcardItem = document.createElement('div');
                    flashcardItem.className = 'flashcard-item';
                    flashcardItem.textContent = `${flashcard.question} - ${flashcard.answer}`;
                    flashcardList.appendChild(flashcardItem);
                });
            } else {
                console.error('No flashcards found in deck:', deck);
            }
        }
    });
}); 