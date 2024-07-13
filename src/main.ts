import {
  checkUpdate,
  installUpdate,
  onUpdaterEvent,
} from "@tauri-apps/api/updater";
import { relaunch } from "@tauri-apps/api/process";
import { confirm, message } from "@tauri-apps/api/dialog";

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

document.addEventListener("DOMContentLoaded", () => {
  const decks: { name: string; itemCount: number }[] = [
    { name: "Math Deck", itemCount: 5 },
    { name: "English Deck", itemCount: 10 },
    { name: "Science Deck", itemCount: 8 },
    { name: "History Deck", itemCount: 6 },
    { name: "Geography Deck", itemCount: 7 },
    { name: "Art Deck", itemCount: 4 },
  ];

  const deckList = document.getElementById("deck-list") as HTMLUListElement;
  const searchInput = document.getElementById("search") as HTMLInputElement;
  const selectAllCheckbox = document.getElementById(
    "select-all-checkbox"
  ) as HTMLInputElement;
  const navigateHomeButton = document.getElementById(
    "navigate-home"
  ) as HTMLButtonElement;
  const updateButton = document.getElementById(
    "update-button"
  ) as HTMLButtonElement;
  const contextMenu = document.getElementById("context-menu") as HTMLDivElement;

  const checkboxStates = new Map<string, boolean>();

  function updateSelectAllCheckbox() {
    const checkboxes = document.querySelectorAll(
      ".deck-checkbox"
    ) as NodeListOf<HTMLInputElement>;
    const allChecked = Array.from(checkboxes).every((checkbox) => checkbox.checked);
    selectAllCheckbox.checked = allChecked;
  }

  function addCheckboxListeners() {
    const checkboxes = document.querySelectorAll(
      ".deck-checkbox"
    ) as NodeListOf<HTMLInputElement>;
    checkboxes.forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        checkboxStates.set(checkbox.dataset.deckName!, checkbox.checked);
        updateSelectAllCheckbox();
      });
    });

    const listItems = document.querySelectorAll(
      ".deck-list-item"
    ) as NodeListOf<HTMLLIElement>;
    listItems.forEach((listItem) => {
      listItem.addEventListener("click", (event) => {
        const checkbox = listItem.querySelector(".deck-checkbox") as HTMLInputElement;
        if (event.target !== checkbox) {
          checkbox.checked = !checkbox.checked;
          checkboxStates.set(checkbox.dataset.deckName!, checkbox.checked);
          updateSelectAllCheckbox();
        }
      });
    });
  }

  function renderDecks(filteredDecks: { name: string; itemCount: number }[]) {
    deckList.innerHTML = "";

    filteredDecks.forEach((deck) => {
      const listItem = document.createElement("li");
      listItem.className = "deck-list-item";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "deck-checkbox";
      checkbox.dataset.deckName = deck.name;
      checkbox.checked = checkboxStates.get(deck.name) || false;

      const deckName = document.createElement("span");
      deckName.className = "deck-name";
      deckName.textContent = deck.name;

      const itemCount = document.createElement("span");
      itemCount.className = "deck-item-count";
      itemCount.textContent = `${deck.itemCount} items`;

      listItem.appendChild(checkbox);
      listItem.appendChild(deckName);
      listItem.appendChild(itemCount);

      deckList.appendChild(listItem);

      listItem.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        showContextMenu(event, deck.name);
      });
    });

    addCheckboxListeners();
  }

  function filterDecks() {
    const searchText = searchInput.value.toLowerCase();
    const filteredDecks = decks.filter((deck) =>
      deck.name.toLowerCase().includes(searchText)
    );
    renderDecks(filteredDecks);
  }

  function showContextMenu(event: MouseEvent, deckName: string) {
    contextMenu.style.display = "block";
    contextMenu.style.left = `${event.pageX}px`;
    contextMenu.style.top = `${event.pageY}px`;

    const editOption = document.createElement("div");
    editOption.className = "context-menu-item";
    editOption.textContent = "Edit";
    editOption.addEventListener("click", () => {
      console.log(`Edit ${deckName}`);
      contextMenu.style.display = "none";
    });

    const deleteOption = document.createElement("div");
    deleteOption.className = "context-menu-item";
    deleteOption.textContent = "Delete";
    deleteOption.addEventListener("click", () => {
      console.log(`Delete ${deckName}`);
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
  document.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  });

  searchInput.addEventListener("input", filterDecks);

  selectAllCheckbox.addEventListener("change", () => {
    const checkboxes = document.querySelectorAll(
      ".deck-checkbox"
    ) as NodeListOf<HTMLInputElement>;
    checkboxes.forEach((checkbox) => {
      checkbox.checked = selectAllCheckbox.checked;
      checkboxStates.set(checkbox.dataset.deckName!, checkbox.checked);
    });
  });

  navigateHomeButton.addEventListener("click", () => {
    window.location.href = "index.html";
  });

  updateButton.addEventListener("click", () => {
    checkForUpdates();
  });

  renderDecks(decks);
});
