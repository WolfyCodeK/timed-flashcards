import { open } from "@tauri-apps/api/dialog";
import { writeTextFile, readTextFile, BaseDirectory } from "@tauri-apps/api/fs";
import { checkUpdate, installUpdate, onUpdaterEvent } from "@tauri-apps/api/updater";
import { relaunch } from "@tauri-apps/api/process";
import { confirm, message } from "@tauri-apps/api/dialog";
import './components/toolbar.css'
import { appWindow } from '@tauri-apps/api/window';
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

document.addEventListener('DOMContentLoaded', () => {
  // Add event listeners for the menu items
  const menuItems = document.querySelectorAll('.menu-items span');
  menuItems.forEach(item => {
    item.addEventListener('click', () => {
      console.log(`Clicked ${item.textContent}`);
      // Add your menu item functionality here
    });
  });

  const tabItems = document.querySelectorAll('.tab-items span');
  tabItems.forEach(item => {
    item.addEventListener('click', () => {
      console.log(`Clicked ${item.textContent}`);
      // Add your tab item functionality here
    });
  });

  // Get references to all required elements
  const deckList = document.getElementById("deck-list") as HTMLUListElement;
  const searchInput = document.getElementById("search") as HTMLInputElement;
  const selectAllCheckbox = document.getElementById("select-all-checkbox") as HTMLInputElement;
  const navigateHomeButton = document.getElementById("navigate-home");
  const updateButton = document.getElementById("update-button");
  const contextMenu = document.getElementById("context-menu");
  const createDeckButton = document.getElementById("create-deck");
  const importDeckButton = document.getElementById("import-deck");

  // Check if all required elements exist
  if (!deckList || !searchInput || !selectAllCheckbox || !contextMenu || 
      !createDeckButton || !importDeckButton || !navigateHomeButton || !updateButton) {
      console.error("Required elements not found in the DOM");
      return;
  }

  const checkboxStates = new Map<string, boolean>();

  function updateSelectAllCheckbox() {
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

  function renderDecks(deckList: HTMLUListElement, currentDecks: Deck[]) {
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

    updateSelectAllCheckbox();
  }

  function filterDecks() {
    const searchTerm = searchInput.value.toLowerCase();
    const filteredDecks = decks.get().filter(deck => 
        deck.name.toLowerCase().includes(searchTerm)
    );
    renderDecks(deckList, filteredDecks);
  }

  function showContextMenu(event: MouseEvent, deckId: string) {
    const deck = decks.get().find(d => d.id === deckId);
    if (!deck) return;

    contextMenu.style.display = "block";
    contextMenu.style.left = `${event.pageX}px`;
    contextMenu.style.top = `${event.pageY}px`;

    const editOption = document.createElement("div");
    editOption.className = "context-menu-item";
    editOption.textContent = "Edit";
    editOption.addEventListener("click", () => {
        console.log(`Edit ${deck.name}`);
        contextMenu.style.display = "none";
    });

    const deleteOption = document.createElement("div");
    deleteOption.className = "context-menu-item";
    deleteOption.textContent = "Delete";
    deleteOption.addEventListener("click", () => {
        deleteDeck(deckId);
        renderDecks(deckList, decks.get());
        contextMenu.style.display = "none";
    });

    contextMenu.innerHTML = "";
    contextMenu.appendChild(editOption);
    contextMenu.appendChild(deleteOption);
  }

  document.addEventListener("click", () => {
    contextMenu.style.display = "none";
  });

  // Prevent the default context menu from appearing
  // document.addEventListener("contextmenu", (event) => {
  //   event.preventDefault();
  // });

  searchInput.addEventListener("input", filterDecks);

  selectAllCheckbox.addEventListener("change", () => {
    const checkboxes = document.querySelectorAll(".deck-checkbox") as NodeListOf<HTMLInputElement>;
    checkboxes.forEach((checkbox) => {
      checkbox.checked = selectAllCheckbox.checked;
      checkboxStates.set(checkbox.dataset.deckId!, checkbox.checked);
    });
  });

  navigateHomeButton.addEventListener("click", () => {
    window.location.href = "deck.html";
  });

  updateButton.addEventListener("click", () => {
    checkForUpdates();
  });

  // Initialize deck list
  renderDecks(deckList, decks.get());

  // Add subscription to deck changes
  decks.subscribe(updatedDecks => {
    console.log('Decks updated:', updatedDecks);
    renderDecks(deckList, updatedDecks);
  });

  // Create new deck button
  createDeckButton.addEventListener('click', () => {
    console.log('Create deck button clicked');
    const dialog = new NewDeckDialog(async (name) => {
        console.log('Creating new deck with name:', name);
        const deck = await createNewDeck(name);
        console.log('Created deck:', deck);
        renderDecks(deckList, [...decks.get()]);
    });
    dialog.show();
  });

  // Import deck button
  importDeckButton.addEventListener('click', async () => {
    console.log('Import deck button clicked');
    const deck = await importDeckFromFile();
    console.log('Imported deck:', deck);
    if (deck) {
        renderDecks(deckList, [...decks.get()]);
    }
  });

  // Run selected decks button
  document.getElementById('run-selected')?.addEventListener('click', async () => {
    const selectedDeckIds = Array.from(document.querySelectorAll('.deck-checkbox:checked'))
      .map(cb => (cb as HTMLInputElement).dataset.deckId)
      .filter((id): id is string => id !== undefined);

    if (selectedDeckIds.length === 0) return;

    // For now, just run the first selected deck
    const deck = decks.get().find(d => d.id === selectedDeckIds[0]);
    if (!deck) return;

    const settings: DeckRunnerSettings = {
      interval: 10,
      intervalUnit: 'minutes',
      shuffle: false
    };

    currentRunner = new DeckRunner(deck, settings);
    await currentRunner.start();
    await appWindow.hide();
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
