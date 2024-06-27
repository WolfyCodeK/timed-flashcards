// Declare __TAURI__ as an external variable
export {};

declare global {
    interface Window {
        __TAURI__: {
            shell: {
                open: (url: string) => Promise<void>;
            };
        };
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const decks: { name: string; itemCount: number }[] = [
        { name: 'Math Deck', itemCount: 5 },
        { name: 'Science Deck', itemCount: 10 },
        { name: 'History Deck', itemCount: 8 },
        { name: 'Geography Deck', itemCount: 12 },
        { name: 'Language Deck', itemCount: 6 },
        { name: 'Test1 Deck', itemCount: 15 },
        { name: 'Test2 Deck', itemCount: 3 },
        { name: 'Test3 Deck', itemCount: 3 },
        { name: 'Test4 Deck', itemCount: 3 }
    ];

    const deckList = document.getElementById('deck-list') as HTMLUListElement;
    const searchInput = document.getElementById('search') as HTMLInputElement;
    const selectAllCheckbox = document.getElementById('select-all-checkbox') as HTMLInputElement;
    const navigateHomeButton = document.getElementById('navigate-home') as HTMLButtonElement;
    const updateButton = document.getElementById('update-button') as HTMLButtonElement;

    function renderDecks(filteredDecks: { name: string; itemCount: number }[]) {
        deckList.innerHTML = '';
        filteredDecks.forEach(deck => {
            const listItem = document.createElement('li');
            listItem.className = 'deck-list-item';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'deck-checkbox';

            const deckName = document.createElement('span');
            deckName.className = 'deck-name';
            deckName.textContent = deck.name;

            const itemCount = document.createElement('span');
            itemCount.className = 'deck-item-count';
            itemCount.textContent = `${deck.itemCount} Items`;

            listItem.appendChild(checkbox);
            listItem.appendChild(deckName);
            listItem.appendChild(itemCount);
            deckList.appendChild(listItem);
        });
    }

    renderDecks(decks);

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase();
        const filteredDecks = decks.filter(deck => deck.name.toLowerCase().includes(query));
        renderDecks(filteredDecks);
    });

    selectAllCheckbox.addEventListener('change', () => {
        const checkboxes = document.querySelectorAll('.deck-checkbox') as NodeListOf<HTMLInputElement>;
        checkboxes.forEach(checkbox => {
            checkbox.checked = selectAllCheckbox.checked;
        });
    });

    // Handle navigation to index.html
    navigateHomeButton.addEventListener('click', () => {
        window.location.href = 'index.html';
    });

    // Handle update button click
    updateButton.addEventListener('click', async () => {
        const releasesResponse = await fetch('https://api.github.com/repos/WolfyCodeK/timed-flashcards/releases');
        const releases = await releasesResponse.json();

        // Find the latest normal release
        const latestRelease = releases.find((release: any) => !release.prerelease);

        // Find the latest pre-release if no normal release is found
        const latestPreRelease = releases.find((release: any) => release.prerelease);

        const releaseToUse = latestRelease || latestPreRelease;

        if (releaseToUse) {
            const asset = releaseToUse.assets.find((a: any) => a.name.includes('setup'));
            if (asset) {
                const downloadUrl = asset.browser_download_url;
                if (confirm(`A new ${releaseToUse.prerelease ? 'pre-release' : 'release'} version is available: ${releaseToUse.tag_name}. Do you want to update?`)) {
                    // Download and update logic using __TAURI__.shell.open
                    await window.__TAURI__.shell.open(downloadUrl);
                }
            } else {
                alert('No suitable update asset found.');
            }
        } else {
            alert('No releases found.');
        }
    });
});
