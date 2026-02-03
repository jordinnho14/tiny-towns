import { db } from "../firebase-config";
import { ref, set, onValue, push, get, update, onDisconnect } from "firebase/database";
import { Game } from "./Game";
import { type ResourceType } from "./Types";
import { BUILDING_REGISTRY } from "./Buildings";

export class MultiplayerGame {
    public gameId: string | null = null;
    public playerId: string;
    public isHost: boolean = false;
    public localGame: Game;
    public masterBuilderId: string | null = null;
    public myName: string = "Unknown";
    public currentRound: number = 1; 

    public onStateChange: ((state: any) => void) | null = null;
    public onGameStart: (() => void) | null = null;

    constructor(localGame: Game) {
        this.localGame = localGame;
        this.playerId = "player_" + Math.random().toString(36).substr(2, 9);
    }

    // --- LOBBY & SETUP ---

    async createGame(hostName: string, selectedDeckNames: string[]) {
        const gamesRef = ref(db, 'games');
        const newGameRef = push(gamesRef);
        this.gameId = newGameRef.key;
        this.isHost = true;
        this.myName = hostName;

        const initialState = {
            status: "LOBBY",
            hostId: this.playerId,
            deck: selectedDeckNames,
            currentResource: null,
            masterBuilderIndex: 0,
            roundNumber: 1, 
            playerOrder: [this.playerId],
            players: {
                [this.playerId]: {
                    name: hostName,
                    score: 0,
                    isReady: true,
                    placedRound: 0, 
                    board: this.serializeBoard()
                }
            }
        };

        await set(newGameRef, initialState);
        this.subscribeToGame();
        onDisconnect(newGameRef).remove();
        return this.gameId;
    }

    async joinGame(gameId: string, playerName: string) {
        const gameRef = ref(db, `games/${gameId}`);
        const snapshot = await get(gameRef);

        if (!snapshot.exists()) throw new Error("Game not found");
        
        this.gameId = gameId;
        this.isHost = false;
        this.myName = playerName;

        // Add self to Players List
        const playerRef = ref(db, `games/${gameId}/players/${this.playerId}`);
        await set(playerRef, {
            name: playerName,
            score: 0,
            isReady: true,
            placedRound: 0,
            board: this.serializeBoard()
        });

        // Add self to Player Order
        const orderRef = ref(db, `games/${gameId}/playerOrder`);
        const orderSnap = await get(orderRef);
        const currentOrder = orderSnap.val() || [];
        
        if (!currentOrder.includes(this.playerId)) {
            currentOrder.push(this.playerId);
            await set(orderRef, currentOrder);
        }

        onDisconnect(playerRef).remove();
        this.subscribeToGame();
    }

    async startGame() {
        if (!this.isHost || !this.gameId) return;
        await update(ref(db, `games/${this.gameId}`), { status: "PLAYING" });
    }

    async updateDeck(deckNames: string[]) {
        if (!this.isHost || !this.gameId) return;
        await update(ref(db, `games/${this.gameId}`), { deck: deckNames });
    }

    // --- GAMEPLAY LOGIC ---

    subscribeToGame() {
        if (!this.gameId) return;
        const gameRef = ref(db, `games/${this.gameId}`);
        
        onValue(gameRef, (snapshot) => {
            const data = snapshot.val();
            if (!data) return;

            // 1. Sync Deck
            if (data.status === "PLAYING" && this.localGame.gameRegistry.length === 0) {
                 this.syncDeck(data.deck);
                 if (this.onGameStart) this.onGameStart();
            }

            // 2. Identify Master Builder
            const rawOrder = data.playerOrder || [];
            const safeOrder = Array.isArray(rawOrder) ? rawOrder : Object.values(rawOrder);
            if (safeOrder.length > 0) {
                const idx = (data.masterBuilderIndex || 0) % safeOrder.length;
                this.masterBuilderId = safeOrder[idx] as string;
            }

            // 3. Sync Resource
            // We treat undefined or empty string as NULL
            if (data.currentResource === undefined || data.currentResource === "") {
                this.localGame.currentResource = null;
            } else {
                this.localGame.currentResource = data.currentResource;
            }

            // 4. Sync Round Number
            this.currentRound = data.roundNumber || 1;

            // 5. Update UI
            if (this.onStateChange) this.onStateChange(data);

            // 6. HOST ONLY: Check for Turn Completion
            // Wrapped in setTimeout to decouple logic from UI rendering
            if (this.isHost && data.status === "PLAYING") {
                setTimeout(() => this.checkTurnComplete(data), 10);
            }
        });
    }

    async setGlobalResource(resource: ResourceType) {
        if (!this.gameId || this.playerId !== this.masterBuilderId) return;

        const updates: any = {};
        updates[`games/${this.gameId}/currentResource`] = resource;
        await update(ref(db), updates);
    }

    async commitTurn() {
        if (!this.gameId) return;

        const updates: any = {};
        const playerPath = `games/${this.gameId}/players/${this.playerId}`;
        
        updates[`${playerPath}/board`] = this.serializeBoard();
        updates[`${playerPath}/score`] = this.localGame.getScore().total;
        updates[`${playerPath}/placedRound`] = this.currentRound;

        await update(ref(db), updates);
    }

    async saveBoardOnly() {
        if (!this.gameId) return;

        console.log("Saving board state (Turn not finished)...");

        const updates: any = {};
        const playerPath = `games/${this.gameId}/players/${this.playerId}`;
        
        updates[`${playerPath}/board`] = this.serializeBoard();
        updates[`${playerPath}/score`] = this.localGame.getScore().total;
        
        // NOTICE: We do NOT update 'placedRound' here.
        // This keeps our status as "Thinking" (or not done).

        await update(ref(db), updates);
    }

    private async checkTurnComplete(data: any) {
        if (!data || !data.players) return;

        const allPlayers = Object.values(data.players);
        const activeRound = data.roundNumber || 1;
        
        // Everyone must have placed in the CURRENT round
        const allDone = allPlayers.every((p: any) => p.placedRound === activeRound);

        // Only rotate if everyone is done AND we are currently in a Placement Phase (resource exists)
        if (allDone && data.currentResource) {
            console.log(`Round ${activeRound} Complete. Rotating.`);
            
            const updates: any = {};
            updates[`games/${this.gameId}/currentResource`] = null; 
            updates[`games/${this.gameId}/masterBuilderIndex`] = (data.masterBuilderIndex || 0) + 1;
            updates[`games/${this.gameId}/roundNumber`] = activeRound + 1;

            await update(ref(db), updates);
        }
    }

    private syncDeck(deckNames: string[]) {
        if(!deckNames) return;
        this.localGame.gameRegistry = BUILDING_REGISTRY.filter(b => deckNames.includes(b.name));
        this.localGame.scanForMatches(); 
    }

    private serializeBoard() {
        return this.localGame.board.getGrid();
    }
}