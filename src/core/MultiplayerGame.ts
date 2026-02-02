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

    public onStateChange: ((state: any) => void) | null = null;
    public onGameStart: (() => void) | null = null;

    constructor(localGame: Game) {
        this.localGame = localGame;
        this.playerId = "player_" + Math.random().toString(36).substr(2, 9);
        console.log("My Player ID:", this.playerId);
    }

    // --- LOBBY ---

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
            playerOrder: [this.playerId], // Initialize order with Host
            players: {
                [this.playerId]: {
                    name: hostName,
                    score: 0,
                    isReady: true,
                    hasPlaced: false, 
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

        // 1. Add self to Players List
        const playerRef = ref(db, `games/${gameId}/players/${this.playerId}`);
        await set(playerRef, {
            name: playerName,
            score: 0,
            isReady: true,
            hasPlaced: false,
            board: this.serializeBoard()
        });

        // 2. Add self to Player Order (Safe Update)
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
                console.log("Master Builder is:", this.masterBuilderId); // Debug Log
            }

            // 3. Sync Resource (FORCE NULL if undefined)
            if (data.currentResource === undefined) {
                this.localGame.currentResource = null;
            } else {
                this.localGame.currentResource = data.currentResource;
            }

            // 4. Send to UI
            if (this.onStateChange) this.onStateChange(data);
        });
    }

    async setGlobalResource(resource: ResourceType) {
        console.log("Attempting to set resource:", resource);
        if (!this.gameId) return;
        
        // Debugging Logs
        console.log("My ID:", this.playerId);
        console.log("Master Builder ID:", this.masterBuilderId);

        if (this.playerId !== this.masterBuilderId) {
            console.warn("BLOCKED: Not your turn!");
            alert("It is not your turn to choose a resource!");
            return;
        }

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
        updates[`${playerPath}/hasPlaced`] = true; 

        await update(ref(db), updates);

        if (this.isHost) {
            this.checkTurnComplete();
        }
    }

    private async checkTurnComplete() {
        const gameRef = ref(db, `games/${this.gameId}`);
        const snap = await get(gameRef);
        const data = snap.val();

        if (!data || !data.players) return;

        const allPlayers = Object.values(data.players);
        // Check if everyone has hasPlaced = true
        const allDone = allPlayers.every((p: any) => p.hasPlaced === true);

        if (allDone && data.currentResource !== null) {
            console.log("Turn Complete! Rotating Master Builder.");
            
            const updates: any = {};
            updates[`games/${this.gameId}/currentResource`] = null;
            updates[`games/${this.gameId}/masterBuilderIndex`] = (data.masterBuilderIndex || 0) + 1;
            
            Object.keys(data.players).forEach(pid => {
                updates[`games/${this.gameId}/players/${pid}/hasPlaced`] = false;
            });

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