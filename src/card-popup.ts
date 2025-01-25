import { listen } from '@tauri-apps/api/event';

console.log('card-popup.ts loaded');

async function setupCardPopup() {
    console.log('Setting up card popup...');
    
    const contentElement = document.getElementById('card-content');
    const progressElement = document.getElementById('card-progress');
    
    console.log('Elements:', { contentElement, progressElement });

    if (!contentElement || !progressElement) {
        console.error('Required elements not found!');
        return;
    }

    // Set initial content
    contentElement.textContent = 'Loading...';
    progressElement.textContent = '...';

    try {
        await listen('card-content', (event: any) => {
            console.log('Received card-content event:', event);
            const { content, current, total } = event.payload;
            console.log('Card data:', { content, current, total });
            
            contentElement.textContent = content;
            progressElement.textContent = `${current}/${total}`;
            
            console.log('Updated DOM elements');
        });
        console.log('Event listener set up successfully');
    } catch (error) {
        console.error('Error setting up event listener:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');
    setupCardPopup().catch(err => {
        console.error('Error in setupCardPopup:', err);
    });
}); 