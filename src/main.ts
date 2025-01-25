import { open } from "@tauri-apps/api/dialog";
import { writeTextFile, readTextFile, BaseDirectory } from "@tauri-apps/api/fs";
import { checkUpdate, installUpdate, onUpdaterEvent } from "@tauri-apps/api/updater";
import { relaunch } from "@tauri-apps/api/process";
import { confirm, message } from "@tauri-apps/api/dialog";
import './components/toolbar.css'
import { appWindow, WebviewWindow } from '@tauri-apps/api/window';
import { listen } from '@tauri-apps/api/event';
import { DeckRunner } from './services/deckRunner';
import { importDeckFromFile, saveDeckToFile, decks, createNewDeck, deleteDeck } from './store/deckStore';
import type { Deck, DeckRunnerSettings } from './types/deck';
import { NewDeckDialog } from './components/NewDeckDialog';

const SETTINGS_FILE = "settings.json";

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

let currentRunner: DeckRunner | null = null;

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

        const deckName = document.createElement('span');
        deckName.className = 'deck-name';
        deckName.textContent = deck.name;

        const itemCount = document.createElement('span');
        itemCount.className = 'deck-item-count';
        itemCount.textContent = `${deck.cards.length} items`;

        listItem.appendChild(checkbox);
        listItem.appendChild(deckName);
        listItem.appendChild(itemCount);

        listItem.addEventListener('contextmenu', (event) => {
            event.preventDefault();
            showContextMenu(event, deck.id);
        });

        deckList.appendChild(listItem);
    });

    // Add checkbox listeners after rendering
    addCheckboxListeners();
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

    selectAllCheckbox.addEventListener("change", () => {
        const checkboxes = document.querySelectorAll(".deck-checkbox") as NodeListOf<HTMLInputElement>;
        checkboxes.forEach((checkbox) => {
            checkbox.checked = selectAllCheckbox.checked;
            checkboxStates.set(checkbox.dataset.deckId!, checkbox.checked);
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

    // Run selected decks button
    document.getElementById('run-selected')?.addEventListener('click', async () => {
        const selectedDeckIds = Array.from(document.querySelectorAll('.deck-checkbox:checked'))
            .map(cb => (cb as HTMLInputElement).dataset.deckId)
            .filter((id): id is string => id !== undefined);

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

        // Open the runner dialog
        const runnerWindow = new WebviewWindow('deck-runner-dialog', {
            url: 'src/views/deck-runner-dialog.html',
            title: 'Run Decks',
            width: 400,
            height: 300,
            center: true,
            resizable: false
        });

        // Wait for the window to be ready AND for its JavaScript to initialize
        await runnerWindow.once('tauri://created', async () => {
            // Add a small delay to ensure the JavaScript has initialized
            setTimeout(async () => {
                console.log('Sending selected decks to runner:', selectedDecks);
                await runnerWindow.emit('selected-decks', { decks: selectedDecks });
            }, 500);
        });
    });

    // Listen for system tray commands
    listen('deck-runner-command', (event) => {
        if (!currentRunner) return;

        switch (event.payload) {
            case 'pause':
                currentRunner.pause();
                break;
            case 'resume':
                currentRunner.resume();
                break;
            case 'stop':
                currentRunner.stop();
                currentRunner = null;
                break;
        }
    });
});
