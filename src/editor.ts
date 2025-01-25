import { WebviewWindow } from '@tauri-apps/api/window';
import { decks, updateDeck } from './store/deckStore';
import type { Deck, Card } from './types/deck';
import { v4 as uuidv4 } from 'uuid';
import { emit } from '@tauri-apps/api/event';
import { listen } from '@tauri-apps/api/event';

let currentDeck: Deck | null = null;
let currentSortOption: SortOption = 'date';
let hasUnsavedChanges = false;

type SortOption = 'alphabetical' | 'date' | 'length';

function sortCards(cards: Card[], sortBy: SortOption): Card[] {
    console.log('Sorting cards by:', sortBy);
    
    const sortedCards = [...cards];
    
    switch (sortBy) {
        case 'alphabetical':
            return sortedCards.sort((a, b) => {
                const contentA = (a.content || '').trim().toLowerCase();
                const contentB = (b.content || '').trim().toLowerCase();
                if (contentA === '') return 1;
                if (contentB === '') return -1;
                return contentA.localeCompare(contentB);
            });
        case 'date':
            return sortedCards.sort((a, b) => {
                const dateA = new Date(a.created).getTime();
                const dateB = new Date(b.created).getTime();
                // Log the comparison to verify sorting
                console.log(`Comparing dates: ${new Date(dateA).toISOString()} vs ${new Date(dateB).toISOString()}`);
                return dateB - dateA;  // Most recent first (this is correct)
            });
        case 'length':
            return sortedCards.sort((a, b) => {
                const lengthA = (a.content || '').trim().length;
                const lengthB = (b.content || '').trim().length;
                return lengthB - lengthA;
            });
        default:
            return sortedCards;
    }
}

function createCardElement(card: Card, index: number) {
    const cardElement = document.createElement('div');
    cardElement.className = 'card-item-editor';

    const textarea = document.createElement('textarea');
    textarea.className = 'card-content';
    textarea.value = card.content;
    textarea.placeholder = 'Enter card content...';
    textarea.addEventListener('input', () => {
        if (currentDeck && currentDeck.cards[index]) {
            currentDeck.cards[index].content = textarea.value;
            hasUnsavedChanges = true;
        }
    });

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'card-actions';

    const deleteButton = document.createElement('button');
    deleteButton.className = 'card-action-button delete';
    deleteButton.textContent = '×';
    deleteButton.addEventListener('click', async () => {
        const { confirm } = await import('@tauri-apps/api/dialog');
        
        const confirmed = await confirm('Are you sure you want to delete this card?', {
            title: 'Delete Card',
            type: 'warning'
        });

        if (confirmed && currentDeck) {
            currentDeck.cards.splice(index, 1);
            hasUnsavedChanges = true;
            renderCards();
        }
    });

    actionsDiv.appendChild(deleteButton);
    cardElement.appendChild(textarea);
    cardElement.appendChild(actionsDiv);

    return cardElement;
}

function createSortControls(): HTMLDivElement {
    const sortContainer = document.createElement('div');
    sortContainer.className = 'sort-controls';

    const label = document.createElement('span');
    label.textContent = 'Sort by: ';
    sortContainer.appendChild(label);

    const sortSelect = document.createElement('select');
    sortSelect.className = 'sort-select';
    
    const options = [
        { value: 'alphabetical', text: 'Alphabetical' },
        { value: 'date', text: 'Date Added' },
        { value: 'length', text: 'Length' }
    ];

    options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option.value;
        optionElement.textContent = option.text;
        if (option.value === currentSortOption) {
            optionElement.selected = true;
        }
        sortSelect.appendChild(optionElement);
    });

    sortSelect.addEventListener('change', async (event) => {
        if (currentDeck) {
            const sortOption = (event.target as HTMLSelectElement).value as SortOption;
            currentSortOption = sortOption;
            
            const sortedCards = sortCards([...currentDeck.cards], sortOption);
            currentDeck.cards = sortedCards;
            hasUnsavedChanges = true;  // Mark as unsaved when sort order changes
            
            renderCards();
        }
    });

    sortContainer.appendChild(sortSelect);
    return sortContainer;
}

function renderCards() {
    console.log('Rendering cards:', currentDeck?.cards);
    const cardList = document.getElementById('card-list');
    if (!cardList || !currentDeck) {
        console.error('cardList or currentDeck is null');
        return;
    }

    // Clear the existing content
    cardList.innerHTML = '';

    // Add sort controls at the top
    const sortControls = createSortControls();
    cardList.appendChild(sortControls);

    // Create a document fragment for better performance
    const fragment = document.createDocumentFragment();
    
    // Add cards to the fragment
    currentDeck.cards.forEach((card, index) => {
        const cardElement = createCardElement(card, index);
        fragment.appendChild(cardElement);
    });

    // Append all cards at once
    cardList.appendChild(fragment);
}

async function initializeEditor() {
    console.log('Initializing editor');
    
    // Wait for deck store to initialize
    await decks.waitForInitialization();
    
    // Get deck ID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const deckId = urlParams.get('id');
    
    if (!deckId) {
        console.error('No deck ID provided');
        return;
    }

    const allDecks = await decks.get();
    console.log('All decks:', allDecks);
    
    const foundDeck = allDecks.find(d => d.id === deckId);
    console.log('Found deck:', foundDeck);
    
    if (!foundDeck) {
        console.error('Deck not found');
        return;
    }

    currentDeck = JSON.parse(JSON.stringify(foundDeck));
    hasUnsavedChanges = false;  // Reset when loading a new deck
    console.log('Current deck loaded:', currentDeck);

    // Sort cards by date initially
    if (currentDeck.cards) {
        currentDeck.cards = sortCards(currentDeck.cards, 'date');
    }

    // Set deck name
    const deckNameElement = document.getElementById('deck-name');
    if (deckNameElement) {
        deckNameElement.textContent = currentDeck.name;
    }

    // Add card button
    const addCardButton = document.getElementById('add-card');
    if (!addCardButton) {
        console.error('Add card button not found');
        return;
    }

    console.log('Add card button found, attaching listener');
    addCardButton.addEventListener('click', () => {
        console.log('Add card button clicked');
        if (currentDeck) {
            const newCard: Card = {
                id: uuidv4(),
                content: '',
                created: new Date().toISOString()
            };
            console.log('Adding new card:', newCard);
            currentDeck.cards.unshift(newCard);
            hasUnsavedChanges = true;
            renderCards();
        } else {
            console.error('Cannot add card: currentDeck is null');
        }
    });

    // Save button
    const saveButton = document.getElementById('save-deck');
    if (!saveButton) {
        console.error('Save button not found');
        return;
    }

    saveButton.addEventListener('click', async () => {
        console.log('Save button clicked');
        if (currentDeck) {
            try {
                console.log('Current deck before save:', JSON.stringify(currentDeck, null, 2));
                
                const processedCards = currentDeck.cards.map(card => ({
                    id: card.id,
                    content: card.content,
                    created: card.created,
                    lastShown: card.lastShown ? new Date(card.lastShown).toISOString() : undefined
                }));

                const deckToSave: Deck = {
                    ...currentDeck,
                    cards: processedCards,
                    lastModified: new Date().toISOString()
                };

                console.log('Deck to save:', JSON.stringify(deckToSave, null, 2));
                
                // Wait for the update to complete
                await updateDeck(deckToSave);
                
                // Force an update event
                await emit('deck-updated', deckToSave);
                
                hasUnsavedChanges = false;
                console.log('Deck saved successfully');
                
                // Use appWindow for closing after save
                const { appWindow } = await import('@tauri-apps/api/window');
                await appWindow.close();
            } catch (error) {
                console.error('Error saving deck:', error);
                const { message } = await import('@tauri-apps/api/dialog');
                await message('Failed to save changes. Please try again.', {
                    title: 'Save Error',
                    type: 'error'
                });
            }
        } else {
            console.error('Cannot save: currentDeck is null');
        }
    });

    // Initial render
    console.log('Initial render');
    renderCards();
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM Content Loaded');
    
    // Listen for the close-requested event from Rust
    await listen<void>('close-requested', async () => {
        console.log('Close requested, hasUnsavedChanges:', hasUnsavedChanges);
        
        if (hasUnsavedChanges) {
            const { confirm } = await import('@tauri-apps/api/dialog');
            
            try {
                const confirmed = await confirm(
                    'You have unsaved changes. Are you sure you want to quit?',
                    {
                        title: 'Unsaved Changes',
                        type: 'warning',
                    }
                );
                
                if (confirmed) {
                    const { appWindow } = await import('@tauri-apps/api/window');
                    await appWindow.close();
                }
            } catch (error) {
                console.error('Error showing confirmation dialog:', error);
            }
        } else {
            const { appWindow } = await import('@tauri-apps/api/window');
            await appWindow.close();
        }
    });
    
    initializeEditor().catch(error => {
        console.error('Error initializing editor:', error);
    });
}); 