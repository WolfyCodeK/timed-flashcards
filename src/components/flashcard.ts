export interface Flashcard {
    id: number;
    question: string;
    answer: string;
}

export function createFlashcard(flashcard: Flashcard): HTMLElement {
    const card = document.createElement('div');
    card.className = 'flashcard';

    const front = document.createElement('div');
    front.className = 'flashcard-front';
    front.textContent = flashcard.question;

    const back = document.createElement('div');
    back.className = 'flashcard-back';
    back.textContent = flashcard.answer;

    card.appendChild(front);
    card.appendChild(back);

    card.addEventListener('click', () => {
        card.classList.toggle('flipped');
    });

    return card;
}