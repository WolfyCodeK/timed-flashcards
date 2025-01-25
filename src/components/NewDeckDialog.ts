export class NewDeckDialog {
    private dialog: HTMLDivElement;
    private nameInput: HTMLInputElement;
    private onSubmit: (name: string) => void;

    constructor(onSubmit: (name: string) => void) {
        this.onSubmit = onSubmit;
        this.dialog = document.createElement('div');
        this.dialog.className = 'dialog-overlay';
        this.createDialog();
    }

    private createDialog() {
        this.dialog.innerHTML = `
            <div class="dialog">
                <h2>Create New Deck</h2>
                <div class="form-group">
                    <label for="deck-name">Deck Name:</label>
                    <input type="text" id="deck-name" placeholder="Enter deck name...">
                </div>
                <div class="button-group">
                    <button id="create-deck-submit">Create</button>
                    <button id="create-deck-cancel">Cancel</button>
                </div>
            </div>
        `;

        this.nameInput = this.dialog.querySelector('#deck-name') as HTMLInputElement;
        
        this.dialog.querySelector('#create-deck-submit')?.addEventListener('click', () => {
            const name = this.nameInput.value.trim();
            if (name) {
                this.onSubmit(name);
                this.close();
            }
        });

        this.dialog.querySelector('#create-deck-cancel')?.addEventListener('click', () => {
            this.close();
        });
    }

    show() {
        document.body.appendChild(this.dialog);
        this.nameInput.focus();
    }

    close() {
        this.dialog.remove();
    }
} 