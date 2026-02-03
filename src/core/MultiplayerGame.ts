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
                    isGameOver: false, 
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
            isGameOver: false,
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

        await update(ref(db), updates);
    }

    async declareGameOver() {
        if (!this.gameId) return;
        
        const updates: any = {};
        const playerPath = `games/${this.gameId}/players/${this.playerId}`;
        
        updates[`${playerPath}/isGameOver`] = true;
        
        // Also ensure they are marked as "done" for the current round 
        // so they don't block the game if they quit mid-turn.
        updates[`${playerPath}/placedRound`] = this.currentRound; 

        await update(ref(db), updates);
        
        // Host check in case this was the last player
        if (this.isHost) {
            // We use a short timeout to let the update process
            setTimeout(() => {
                // We need to fetch data here or pass it if we had it, 
                // but for simplicity, the existing listener will trigger 'checkTurnComplete'
                // We just need to ensure checkTurnComplete handles "GameOver" players correctly.
            }, 10);
        }
    }

    private async checkTurnComplete(data: any) {
        if (!data || !data.players) return;

        const allPlayers = Object.values(data.players);
        const activeRound = data.roundNumber || 1;
        const playerOrder = data.playerOrder || []; // We need the order to calculate skips
        
        // 1. Check Global Game Over (Everyone is out)
        const allGameOver = allPlayers.every((p: any) => p.isGameOver === true);
        if (allGameOver) {
            if (data.status !== "FINISHED") {
                console.log("GAME OVER FOR EVERYONE");
                await update(ref(db, `games/${this.gameId}`), { status: "FINISHED" });
            }
            return;
        }

        // 2. Determine if we need to rotate
        const isPlacementPhase = (data.currentResource !== undefined && data.currentResource !== null);
        
        // Condition A: Normal Round End (Everyone placed resource or is out)
        const allDone = allPlayers.every((p: any) => 
            p.placedRound === activeRound || p.isGameOver === true
        );

        // Condition B: Zombie Master Builder (Current Master is out, so we skip them immediately)
        const currentMasterIdx = (data.masterBuilderIndex || 0) % playerOrder.length;
        const currentMasterId = playerOrder[currentMasterIdx];
        const masterIsDead = data.players[currentMasterId] && data.players[currentMasterId].isGameOver;

        let shouldRotate = false;

        if (isPlacementPhase && allDone) {
            console.log(`Round ${activeRound} Complete. Rotating.`);
            shouldRotate = true;
        } 
        else if (!isPlacementPhase && masterIsDead) {
            console.log("Current Master Builder is finished. Skipping their turn.");
            shouldRotate = true;
        }

        // 3. Perform Rotation (Finding next ALIVE player)
        if (shouldRotate) {
            let nextIndex = (data.masterBuilderIndex || 0);
            let foundNext = false;

            // Look ahead to find the next active player
            // We loop i from 1 to N to check the next person, then the one after, etc.
            for (let i = 1; i <= playerOrder.length; i++) {
                const checkIdx = (nextIndex + i) % playerOrder.length;
                const pid = playerOrder[checkIdx];
                const player = data.players[pid];

                if (player && !player.isGameOver) {
                    nextIndex = nextIndex + i; // Set the new index
                    foundNext = true;
                    break;
                }
            }

            // If we didn't find anyone (e.g., everyone else is dead), 
            // we just increment by 1 (which will trigger Global Game Over on next check)
            if (!foundNext) nextIndex++;

            const updates: any = {};
            updates[`games/${this.gameId}/currentResource`] = null; 
            updates[`games/${this.gameId}/masterBuilderIndex`] = nextIndex;
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