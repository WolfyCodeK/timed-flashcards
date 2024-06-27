document.addEventListener('DOMContentLoaded', () => {
    const saveButton = document.getElementById('save-button') as HTMLButtonElement;
    const navigateDeckButton = document.getElementById('navigate-deck') as HTMLButtonElement;

    // Handle save button click
    saveButton.addEventListener('click', () => {
        const question = (document.getElementById('question') as HTMLInputElement).value;
        const answer = (document.getElementById('answer') as HTMLInputElement).value;
        const category = (document.getElementById('category') as HTMLSelectElement).value;
        const difficulty = (document.getElementById('difficulty') as HTMLSelectElement).value;
        const hint = (document.getElementById('hint') as HTMLInputElement).value;

        // Implement saving flashcard logic here
        console.log('Flashcard saved', { question, answer, category, difficulty, hint });
    });

    // Handle navigation to deck.html
    navigateDeckButton.addEventListener('click', () => {
        window.location.href = 'index.html';
    });
});