import { open } from "@tauri-apps/api/dialog";
import { writeTextFile, readTextFile, BaseDirectory } from "@tauri-apps/api/fs";
import { checkUpdate, installUpdate, onUpdaterEvent } from "@tauri-apps/api/updater";
import { relaunch } from "@tauri-apps/api/process";
import { confirm, message } from "@tauri-apps/api/dialog";
import './components/toolbar.css'
import { WebviewWindow } from '@tauri-apps/api/window';
import { listen } from '@tauri-apps/api/event';
import { DeckRunner } from './services/deckRunner';
import { importDeckFromFile, decks, createNewDeck, deleteDeck } from './store/deckStore';
import type { Deck } from './types/deck';
import { NewDeckDialog } from './components/NewDeckDialog';

const SETTINGS_FILE = "settings.json";

// Add this at the top level to track the current runner
let currentRunner: DeckRunner | null = null;

// Add this with other top-level variables
let currentRunnerWindow: WebviewWindow | null = null;

// Add this with other top-level variables
let selectedDeckIds: string[] = [];

// Move the event listener outside DOMContentLoaded
listen('deck-runner-command', async (event) => {
    console.log('Received deck-runner command:', event.payload);
    console.log('Current runner state:', currentRunner ? 'exists' : 'null');
    
    if (!currentRunner) {
        console.log('No active runner');
        return;
    }

    switch (event.payload) {
        case 'pause':
            console.log('Pausing runner');
            currentRunner.pause();
            break;
        case 'resume':
            console.log('Resuming runner');
            currentRunner.resume();
            break;
        case 'stop':
            console.log('Stopping runner');
            try {
                await currentRunner?.stop();
                console.log('Runner stopped successfully');
                // Close the runner window
                if (currentRunnerWindow) {
                    await currentRunnerWindow.close();
                    currentRunnerWindow = null;
                }
            } catch (error) {
                console.error('Error stopping runner:', error);
            }
            currentRunner = null;
            console.log('Current runner cleared');
            break;
    }
});

// Function to handle directory browsing
async function browseFile() {
  try {
    const selected = await open({
      multiple: false,
      directory: true, // Allow selecting directories
      filters: [{ name: 'All Files', extensions: ['*'] }]
    });

    if (selected) {
      const filePathInput = document.getElementById('file-path') as HTMLInputElement;
      filePathInput.value = selected as string;
      await saveSettings(); // Save settings automatically after selecting a directory
    }
  } catch (error) {
    console.error('Error browsing file:', error);
  }
}

// Function to save settings
async function saveSettings() {
  const filePathInput = document.getElementById('file-path') as HTMLInputElement;
  const filePath = filePathInput.value;

  try {
    // Save the file path to a configuration file in the application data directory
    await writeTextFile(SETTINGS_FILE, JSON.stringify({ filePath }), { dir: BaseDirectory.AppData });
  } catch (error) {
    console.error('Error saving settings:', error);
  }
}

// Function to load settings
async function loadSettings() {
  try {
    const settings = JSON.parse(await readTextFile(SETTINGS_FILE, { dir: BaseDirectory.AppData }));
    const filePathInput = document.getElementById('file-path') as HTMLInputElement;
    filePathInput.value = settings.filePath || '';
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

// Function to check for updates
async function checkForUpdates() {
  const unlisten = await onUpdaterEvent(({ error, status }) => {
    if (error) {
      console.error("Updater event error:", error);
    } else {
      console.log("Updater event status:", status);
    }
  });

  try {
    const { shouldUpdate, manifest } = await checkUpdate();
    if (shouldUpdate) {
      const userConfirmed = await confirm(
        `A new update ${manifest?.version} is available. Do you want to install it?`,
        { type: "info", title: "Update Available" }
      );
      if (userConfirmed) {
        await installUpdate();
        await relaunch();
      }
    } else {
      await message("No updates available", {
        type: "info",
        title: "Update Check",
      });
    }
  } catch (error) {
    console.error("Error checking for updates:", error);
    await message("Error checking for updates", {
      type: "error",
      title: "Update Error",
    });
  } finally {
    unlisten();
  }
}

// Move these functions outside the DOMContentLoaded event listener
function updateSelectAllCheckbox() {
    const selectAllCheckbox = document.getElementById("select-all-checkbox") as HTMLInputElement;
    if (!selectAllCheckbox) return;
    
    const checkboxes = document.querySelectorAll(".deck-checkbox") as NodeListOf<HTMLInputElement>;
    const allChecked = Array.from(checkboxes).every((checkbox) => checkbox.checked);
    selectAllCheckbox.checked = allChecked;
}

function addCheckboxListeners() {
    const checkboxes = document.querySelectorAll(".deck-checkbox") as NodeListOf<HTMLInputElement>;
    checkboxes.forEach((checkbox) => {
        checkbox.addEventListener("change", () => {
            checkboxStates.set(checkbox.dataset.deckId!, checkbox.checked);
            updateSelectAllCheckbox();
        });
    });

    const listItems = document.querySelectorAll(".deck-list-item") as NodeListOf<HTMLLIElement>;
    listItems.forEach((listItem) => {
        listItem.addEventListener("click", (event) => {
            const checkbox = listItem.querySelector(".deck-checkbox") as HTMLInputElement;
            if (event.target !== checkbox) {
                checkbox.checked = !checkbox.checked;
                checkboxStates.set(checkbox.dataset.deckId!, checkbox.checked);
                updateSelectAllCheckbox();
            }
        });
    });
}

// Also move checkboxStates outside
const checkboxStates = new Map<string, boolean>();

// Move showContextMenu outside the DOMContentLoaded event listener
async function showContextMenu(event: MouseEvent, deckId: string) {
    const contextMenu = document.getElementById("context-menu");
    if (!contextMenu) return;

    const currentDecks = await decks.get();
    const deck = currentDecks.find(d => d.id === deckId);
    if (!deck) return;

    contextMenu.style.display = "block";
    contextMenu.style.left = `${event.pageX}px`;
    contextMenu.style.top = `${event.pageY}px`;

    const editOption = document.createElement("div");
    editOption.className = "context-menu-item";
    editOption.textContent = "Edit";
    editOption.addEventListener("click", () => {
        const editorWindow = new WebviewWindow('deck-editor', {
            url: `src/views/deck-editor.html?id=${deckId}`,
            title: 'Edit Deck',
            width: 800,
            height: 600,
            center: true,
        });
        contextMenu.style.display = "none";
    });

    const deleteOption = document.createElement("div");
    deleteOption.className = "context-menu-item";
    deleteOption.textContent = "Delete";
    deleteOption.addEventListener("click", async () => {
        // Show confirmation dialog with deck name
        const confirmed = await confirm(
            `Are you sure you want to delete the deck "${deck.name}"?\nThis action cannot be undone.`, 
            {
                title: 'Delete Deck',
                type: 'warning'
            }
        );

        if (confirmed) {
            await deleteDeck(deckId);
            const updatedDecks = await decks.get();
            await renderDecks(deckList, updatedDecks);
        }
        contextMenu.style.display = "none";
    });

    contextMenu.innerHTML = "";
    contextMenu.appendChild(editOption);
    contextMenu.appendChild(deleteOption);
}

async function renderDecks(deckList: HTMLUListElement, currentDecks: Deck[]) {
    deckList.innerHTML = '';

    currentDecks.forEach(deck => {
        const listItem = document.createElement('li');
        listItem.className = 'deck-list-item';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'deck-checkbox';
        checkbox.dataset.deckId = deck.id;
        checkbox.checked = selectedDeckIds.includes(deck.id);

        const deckName = document.createElement('span');
        deckName.className = 'deck-name';
        deckName.textContent = deck.name;

        const itemCount = document.createElement('span');
        itemCount.className = 'deck-item-count';
        itemCount.textContent = `${deck.cards.length} items`;

        listItem.appendChild(checkbox);
        listItem.appendChild(deckName);
        listItem.appendChild(itemCount);

        // Add click handler to the entire list item
        listItem.addEventListener('click', async (event) => {
            // If clicking the checkbox, don't open editor
            if (event.target === checkbox) {
                return;
            }

            console.log('Opening editor for deck:', deck);
            const editorWindow = new WebviewWindow('deck-editor', {
                url: `src/views/deck-editor.html?id=${deck.id}`,
                title: 'Edit Deck',
                width: 800,
                height: 600,
                center: true,
            });
        });

        deckList.appendChild(listItem);
    });

    updateSelectAllCheckbox();
}

// Add this function to update checkboxes based on selectedDeckIds
function updateDeckCheckboxes() {
    const checkboxes = document.querySelectorAll('.deck-checkbox') as NodeListOf<HTMLInputElement>;
    checkboxes.forEach(checkbox => {
        const deckId = checkbox.dataset.deckId;
        if (deckId) {
            checkbox.checked = selectedDeckIds.includes(deckId);
        }
    });
    updateSelectAllCheckbox();
}

document.addEventListener('DOMContentLoaded', async () => {
    // Get references to all required elements
    const deckList = document.getElementById("deck-list") as HTMLUListElement;
    const searchInput = document.getElementById("search") as HTMLInputElement;
    const selectAllCheckbox = document.getElementById("select-all-checkbox") as HTMLInputElement;
    const updateButton = document.getElementById("update-button");
    const contextMenu = document.getElementById("context-menu");
    const createDeckButton = document.getElementById("create-deck");
    const importDeckButton = document.getElementById("import-deck");

    // Check if all required elements exist
    if (!deckList || !searchInput || !selectAllCheckbox || !contextMenu || 
        !createDeckButton || !importDeckButton || !updateButton) {
        console.error("Required elements not found in the DOM");
        return;
    }

    // Wait for deck store to initialize
    await decks.waitForInitialization();

    // Initialize deck list
    const initialDecks = await decks.get();
    await renderDecks(deckList, initialDecks);

    // Add subscription to deck changes
    decks.subscribe(async (updatedDecks) => {
        console.log('Decks updated:', updatedDecks);
        await renderDecks(deckList, updatedDecks);
    });

    // Listen for deck updates from other windows
    await listen('deck-updated', async () => {
        console.log('Received deck update event');
        const latestDecks = await decks.get();
        await renderDecks(deckList, latestDecks);
    });

    // Search functionality
    searchInput.addEventListener("input", async () => {
        const searchTerm = searchInput.value.toLowerCase();
        const allDecks = await decks.get();
        const filteredDecks = allDecks.filter(deck => 
            deck.name.toLowerCase().includes(searchTerm)
        );
        await renderDecks(deckList, filteredDecks);
    });

    // Move the click handler for closing context menu here
    document.addEventListener("click", () => {
        const contextMenu = document.getElementById("context-menu");
        if (contextMenu) {
            contextMenu.style.display = "none";
        }
    });

    // Add click handler for deck checkboxes
    document.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        if (target.classList.contains('deck-checkbox')) {
            const checkbox = target as HTMLInputElement;
            const deckId = checkbox.dataset.deckId;
            if (deckId) {
                if (checkbox.checked) {
                    selectedDeckIds.push(deckId);
                } else {
                    selectedDeckIds = selectedDeckIds.filter(id => id !== deckId);
                }
                updateSelectAllCheckbox();
            }
        }
    });

    // Modify select all handler
    document.getElementById('select-all-checkbox')?.addEventListener('change', (event) => {
        const checkbox = event.target as HTMLInputElement;
        const deckCheckboxes = document.querySelectorAll('.deck-checkbox') as NodeListOf<HTMLInputElement>;
        
        deckCheckboxes.forEach(deckCheckbox => {
            deckCheckbox.checked = checkbox.checked;
            const deckId = deckCheckbox.dataset.deckId;
            if (deckId) {
                if (checkbox.checked && !selectedDeckIds.includes(deckId)) {
                    selectedDeckIds.push(deckId);
                } else if (!checkbox.checked) {
                    selectedDeckIds = selectedDeckIds.filter(id => id !== deckId);
                }
            }
        });
    });

    updateButton.addEventListener("click", () => {
        checkForUpdates();
    });

    // Create new deck button
    createDeckButton.addEventListener('click', () => {
        console.log('Create deck button clicked');
        const dialog = new NewDeckDialog(async (name) => {
            console.log('Creating new deck with name:', name);
            const deck = await createNewDeck(name);
            console.log('Created deck:', deck);
            const updatedDecks = await decks.get();
            await renderDecks(deckList, updatedDecks);
        });
        dialog.show();
    });

    // Import deck button
    importDeckButton.addEventListener('click', async () => {
        console.log('Import deck button clicked');
        const deck = await importDeckFromFile();
        console.log('Imported deck:', deck);
        if (deck) {
            const updatedDecks = await decks.get();
            await renderDecks(deckList, updatedDecks);
        }
    });

    // Modify the run-selected click handler
    document.getElementById('run-selected')?.addEventListener('click', async () => {
        if (selectedDeckIds.length === 0) {
            await message('Please select at least one deck to run', {
                title: 'No Decks Selected',
                type: 'warning'
            });
            return;
        }

        // Get all selected decks
        const allDecks = await decks.get();
        const selectedDecks = allDecks.filter(d => selectedDeckIds.includes(d.id));
        console.log('Selected decks to run:', selectedDecks);

        // Close existing runner window if it exists
        if (currentRunnerWindow) {
            try {
                await currentRunnerWindow.close();
            } catch (e) {
                console.log('Error closing existing runner window:', e);
            }
            currentRunnerWindow = null;
        }

        // Open the runner dialog
        currentRunnerWindow = new WebviewWindow('deck-runner-dialog', {
            url: 'src/views/deck-runner-dialog.html',
            title: 'Run Decks',
            width: 400,
            height: 400,
            center: true,
            resizable: false
        });

        // Wait for the window to be ready AND for its JavaScript to initialize
        await currentRunnerWindow.once('tauri://created', async () => {
            setTimeout(async () => {
                console.log('Sending selected decks to runner:', selectedDecks);
                await currentRunnerWindow?.emit('selected-decks', { decks: selectedDecks });
            }, 500);
        });
    });

    // Add this to update checkboxes whenever the deck list is refreshed
    decks.subscribe(() => {
        updateDeckCheckboxes();
    });
});

// Export this so runner-dialog.ts can set it
export function setCurrentRunner(runner: DeckRunner | null) {
    console.log('Setting current runner:', runner ? 'new runner' : 'null');
    currentRunner = runner;
}
