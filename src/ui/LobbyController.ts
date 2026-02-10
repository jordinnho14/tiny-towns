import { MultiplayerGame } from "../core/MultiplayerGame";
import { initHostDropdowns, showToast, renderLobbyList } from "./UIHelpers";
import { BUILDING_CATEGORIES, DEFAULT_DECK_START } from "../core/Buildings";
import { AudioManager } from "../core/AudioManager";

export class LobbyController {
    private multiplayer: MultiplayerGame;
    private audio: AudioManager;
    
    // DOM Elements
    private landingUI = document.getElementById('landing-ui')!;
    private lobbyUI = document.getElementById('lobby-ui')!;
    private playerNameInput = document.getElementById('player-name-input') as HTMLInputElement;
    private createGameBtn = document.getElementById('create-game-ui-btn')!;
    private joinGameBtn = document.getElementById('join-game-btn')!;
    private gameIdInput = document.getElementById('game-id-input') as HTMLInputElement;
    private shareCodeDisplay = document.getElementById('share-code-display')!;
    private hostSettings = document.getElementById('host-settings')!;
    private guestWaitingMsg = document.getElementById('guest-waiting-msg')!;
    private startGameBtn = document.getElementById('start-game-btn')!;
    private copyLinkBtn = document.getElementById('copy-link-btn')!;
    private setupContainer = document.getElementById('setup-container')!;
    private lobbyPlayerList = document.getElementById('lobby-player-list')!;

    // State
    public activeGameId: string | null = null;

    constructor(multiplayer: MultiplayerGame, audio: AudioManager) {
        this.multiplayer = multiplayer;
        this.audio = audio;
        this.bindEvents();
        this.checkUrlForInvite();
    }

    // [THIS WAS MISSING]
    public update(data: any) {
        if (data.players) {
            renderLobbyList(data.players, this.lobbyPlayerList);
        }
    }

    private bindEvents() {
        // CREATE GAME
        this.createGameBtn.onclick = async () => {
            const name = this.playerNameInput.value || "Host";
            try {
                const defaultDeck = this.generateRandomDeck();
                const gameId = await this.multiplayer.createGame(name, defaultDeck.map(b => b.name));
                this.enterLobbyMode(gameId, true);
            } catch (err) {
                console.error("Firebase Error:", err);
                showToast("Error creating game.", "error", this.audio);
            }
        };

        // JOIN GAME
        this.joinGameBtn.onclick = async () => {
            const name = this.playerNameInput.value || "Guest";
            const gameId = this.gameIdInput.value.trim();
            if (!gameId) {
                showToast("Please enter a code!", "error", this.audio);
                return;
            }
            try {
                await this.multiplayer.joinGame(gameId, name);
                this.enterLobbyMode(gameId, false);
            } catch (e) {
                showToast("Could not join game: " + e, "error", this.audio);
            }
        };

        // START GAME
        this.startGameBtn.onclick = async () => {
            const finalDeck = this.buildDeckFromUI();
            await this.multiplayer.updateDeck(finalDeck.map(b => b.name));
            await this.multiplayer.startGame();
        };

        // COPY CODE
        this.shareCodeDisplay.onclick = () => {
            const code = this.shareCodeDisplay.innerText.replace('Code: ', '');
            navigator.clipboard.writeText(code);
            showToast("Code copied!", "success", this.audio);
        };

        // COPY LINK
        this.copyLinkBtn.onclick = () => {
            if (!this.activeGameId) return;
            const url = `${window.location.origin}${window.location.pathname}?gameId=${this.activeGameId}`;
            navigator.clipboard.writeText(url).then(() => {
                showToast("Invite Link copied!", "success", this.audio);
            });
        };
    }

    public enterLobbyMode(gameId: string, isHost: boolean) {
        this.activeGameId = gameId;
        this.landingUI.classList.add('hidden');
        this.lobbyUI.classList.remove('hidden');
        this.shareCodeDisplay.innerText = `Code: ${gameId}`;

        if (isHost) {
            this.hostSettings.classList.remove('hidden');
            this.guestWaitingMsg.classList.add('hidden');
            initHostDropdowns(this.setupContainer, BUILDING_CATEGORIES);
        } else {
            this.hostSettings.classList.add('hidden');
            this.guestWaitingMsg.classList.remove('hidden');
        }
    }

    private checkUrlForInvite() {
        const params = new URLSearchParams(window.location.search);
        const inviteCode = params.get('gameId');
        if (inviteCode) {
            this.gameIdInput.value = inviteCode;
            this.playerNameInput.focus();
            showToast(`Invite code ${inviteCode} detected! Enter your name to join.`, "success", this.audio);
            
            // Hide the 'Create Game' button container to reduce clutter for joiners
            if(this.createGameBtn.parentElement) {
                this.createGameBtn.parentElement.classList.add('hidden'); 
            }
        }
    }

    // --- DECK BUILDING LOGIC ---

    private buildDeckFromUI() {
        const deck: any[] = [DEFAULT_DECK_START];
        const selects = document.querySelectorAll('.setup-select') as NodeListOf<HTMLSelectElement>;
        
        if (selects.length === 0) return this.generateRandomDeck();

        selects.forEach(select => {
            const catId = select.dataset.category;
            if (!catId) return;
            const config = BUILDING_CATEGORIES.find(c => c.id === catId);
            if (!config) return;

            let selectedBuilding;
            if (select.value === 'RANDOM') {
                selectedBuilding = this.pickRandom(config.options);
            } else {
                selectedBuilding = config.options.find(b => b.name === select.value);
            }
            if (selectedBuilding) deck.push(selectedBuilding);
        });
        return deck;
    }

    private generateRandomDeck() {
        const deck = [DEFAULT_DECK_START];
        BUILDING_CATEGORIES.forEach(cat => {
            deck.push(this.pickRandom(cat.options));
        });
        return deck;
    }

    private pickRandom(list: any[]) {
        return list[Math.floor(Math.random() * list.length)];
    }
}