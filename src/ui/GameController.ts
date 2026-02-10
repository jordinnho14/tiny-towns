import { Game } from "../core/Game";
import { Renderer } from "./Renderer";
import { MultiplayerGame } from "../core/MultiplayerGame";
import { AudioManager } from "../core/AudioManager";
import { BUILDING_REGISTRY, MONUMENTS_LIST } from "../core/Buildings";
import {
    showToast, togglePalette, showResourcePicker, showMonumentSelection,
    renderOpponents, renderLeaderboard, showBuildingPicker,
    showMultiBuildingPicker, showConfirmationModal, showOpaleyeBonusModal
} from "./UIHelpers";

export class GameController {
    private game: Game;
    private renderer: Renderer;
    private multiplayer: MultiplayerGame;
    private audio: AudioManager;

    // State
    private activeConstruction: any | null = null;
    private activePatternCoords: { row: number, col: number }[] = [];
    private multiplayerStatusMessage = '';
    private hasActedThisTurn = false;
    private hasDeclaredGameOver = false;
    private pendingFreeBuildName: string | null = null;
    private guildReplacementsLeft = 0;
    private activeOpaleyeSource: { r: number, c: number } | null = null;
    private pendingState: { type: 'PLACE' | 'SELECT_RESOURCE'; data?: any; } | null = null;

    // Elements
    private elements = {
        startModal: document.getElementById('start-screen-modal')!,
        opponentsSidebar: document.getElementById('opponents-sidebar')!,
        opponentsList: document.getElementById('opponents-list')!,
        scoreDisplay: document.getElementById('score-display')!,
        undoBtn: document.getElementById('undo-btn') as HTMLButtonElement,
        confirmBtn: document.getElementById('confirm-btn') as HTMLButtonElement,
        finishTownBtn: document.getElementById('finish-town-btn') as HTMLButtonElement,
        finishGuildBtn: document.getElementById('finish-guild-btn') as HTMLButtonElement,
        gameOverModal: document.getElementById('game-over-modal')!,
        finalScore: document.getElementById('final-score')!,
        scoreList: document.getElementById('score-breakdown-list')!,
        restartBtn: document.getElementById('restart-btn')!,
        multiplayerResultsModal: document.getElementById('multiplayer-results-modal')!,
        leaderboardList: document.getElementById('leaderboard-list')!,
        mpRestartBtn: document.getElementById('mp-restart-btn')!,
        muteBtn: document.getElementById('mute-btn') as HTMLButtonElement,
        sidebarToggle: document.getElementById('sidebar-toggle-btn')!,
        sidebar: document.getElementById('sidebar')!,
        opponentsToggle: document.getElementById('opponents-toggle-btn')!,
    };

    constructor(game: Game, renderer: Renderer, multiplayer: MultiplayerGame, audio: AudioManager) {
        this.game = game;
        this.renderer = renderer;
        this.multiplayer = multiplayer;
        this.audio = audio;

        this.bindEvents();
    }

    public handleGameUpdate(data: any) {
        // Hide start screen if needed
        if (!this.elements.startModal.classList.contains('hidden')) {
            this.elements.startModal.classList.add('hidden');
        }

        // 1. Handle Monuments
        this.checkMonumentSelection(data);
        this.syncActiveMonument(data);

        // 2. Handle Master Builder & Opponents
        this.updateOpponentUI(data);
        this.updateTurnStatus(data);

        // 3. Game Over
        if (data.status === 'FINISHED') {
            this.handleGlobalGameOver(data);
        }

        // 4. Local State Sync
        this.game.currentResource = data.currentResource || null;
        this.renderAll();
    }

    private bindEvents() {
        // Renderer Callbacks
        this.renderer.onResourceSelect = (res) => this.onResourceSelect(res);
        this.renderer.onCellClick = (r, c) => this.onCellClick(r, c);
        this.renderer.onBuildClick = (match) => this.onBuildClick(match);
        this.renderer.onCancelClick = () => this.onCancelClick();
        this.renderer.onSwapClick = () => this.handleSwapClick();

        // Button Clicks
        this.elements.confirmBtn.onclick = () => this.onConfirm();
        this.elements.undoBtn.onclick = () => this.onUndo();
        this.elements.finishGuildBtn.onclick = () => this.finishGuildAction();
        this.elements.finishTownBtn.onclick = () => this.onFinishTown();

        // System Buttons
        this.elements.restartBtn.onclick = () => location.reload();
        this.elements.mpRestartBtn.onclick = () => location.reload();
        this.elements.muteBtn.onclick = () => {
            const isMuted = this.audio.toggleMute();
            this.elements.muteBtn.textContent = isMuted ? '🔇' : '🔊';
        };

        // Multiplayer Hooks
        this.multiplayer.onOpaleyeBonus = (bName, coords) => this.onOpaleyeBonus(bName, coords);

        if (this.elements.sidebarToggle) {
            this.elements.sidebarToggle.onclick = (e) => {
                e.stopPropagation(); // Prevent triggering document click
                this.elements.sidebar.classList.toggle('sidebar-open');
                this.elements.opponentsSidebar.classList.remove('opponents-open'); // Ensure opponents sidebar is closed
            };

            this.elements.opponentsToggle.onclick = (e) => {
                e.stopPropagation();
                this.elements.opponentsSidebar.classList.toggle('opponents-open');
                this.elements.sidebar.classList.remove('sidebar-open'); // Close other drawer
            };

            // Global click to close both
            document.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;

                // Close if clicking main board area while drawers are open
                if (this.elements.sidebar.classList.contains('sidebar-open') && !this.elements.sidebar.contains(target)) {
                    this.elements.sidebar.classList.remove('sidebar-open');
                }
                if (this.elements.opponentsSidebar.classList.contains('opponents-open') && !this.elements.opponentsSidebar.contains(target)) {
                    this.elements.opponentsSidebar.classList.remove('opponents-open');
                }
            });


        }

        // [ADDED] Close sidebar when clicking outside (on the main area)
        document.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const isSidebar = this.elements.sidebar.contains(target);
            const isButton = this.elements.sidebarToggle.contains(target);
            const isOpen = this.elements.sidebar.classList.contains('sidebar-open');

            if (isOpen && !isSidebar && !isButton) {
                this.elements.sidebar.classList.remove('sidebar-open');
                this.elements.sidebarToggle.textContent = '🏰';
            }
        });
    }

    // --- GAME LOGIC ---

    private onResourceSelect(res: string) {
        if (this.activeConstruction) return;

        if (!this.game.currentResource || (this.pendingState && this.pendingState.type === 'SELECT_RESOURCE')) {
            this.pendingState = { type: 'SELECT_RESOURCE', data: res };
            this.game.currentResource = res as any;
            this.renderAll();
        } else {
            console.log("Blocked: Resource already active");
        }
    }

    private onCellClick(r: number, c: number) {
        const grid = this.game.board.getGrid();
        const cell = grid[r][c];

        if (this.pendingFreeBuildName) {
            this.handleFreeBuild(r, c, cell);
            return;
        }

        if (this.guildReplacementsLeft > 0) {
            this.handleGuildReplacement(r, c, cell);
            return;
        }

        if (cell && (cell as string).toUpperCase() === 'WAREHOUSE') {
            this.handleWarehouseClick(r, c);
            return;
        }

        try {
            if (this.activeConstruction) {
                this.handleConstructionClick(r, c);
            } else {
                this.handleResourceClick(r, c);
            }
        } catch (e) {
            this.audio.play('error');
            showToast((e as Error).message, "error", this.audio);
        }
    }

    private handleResourceClick(r: number, c: number) {
        if (this.hasActedThisTurn) {
            showToast("You have already placed a resource this turn!", "error", this.audio);
            return;
        }
        if (this.pendingState?.type === 'SELECT_RESOURCE') {
            showToast("Please confirm your resource selection first!", "error", this.audio);
            return;
        }
        if (!this.game.currentResource) {
            showToast("Waiting for Master Builder...", "info");
            return;
        }

        // Bondmaker Check
        const isMaster = this.multiplayer.masterBuilderId === this.multiplayer.playerId;
        const cell = this.game.board.getGrid()[r][c];
        if ((cell as string).toUpperCase() === 'COTTAGE' && this.game.hasStatueOfBondmaker()) {
            const meta = this.game.board.getMetadata(r, c);
            if (meta && meta.storedResource) {
                showToast("Cottage is full!", "error", this.audio);
                return;
            }
            if (isMaster) {
                showToast("Bondmaker only works on others' turns!", "error", this.audio);
                return;
            }
        }

        this.game.placeResource(r, c);
        this.audio.play('click');
        this.multiplayer.commitTurn();
        this.renderAll();
        this.checkAndShowGameOver();
    }

    private handleConstructionClick(r: number, c: number) {
        const grid = this.game.board.getGrid();
        const cellContent = grid[r][c];
        const isPatternSpot = this.activePatternCoords.some(p => p.row === r && p.col === c);
        const buildName = this.activeConstruction ? this.activeConstruction.buildingName.toUpperCase() : '';
        const isObelisk = this.game.hasObeliskAbility();
        const isShed = buildName === 'SHED';
        const isGlobalTarget = (isObelisk || isShed) && cellContent === 'NONE';

        if (isPatternSpot || isGlobalTarget) {
            if (cellContent && (cellContent as string).toUpperCase().replace('_', ' ') === 'TRADING POST') {
                showToast("Cannot build on Trading Post.", "error", this.audio);
                return;
            }

            const result = this.game.constructBuilding(this.activeConstruction, r, c);
            this.multiplayer.saveBoardOnly();
            this.resetConstructionState();

            if (result.type === 'TRIGGER_EFFECT') {
                this.handleBuildingEffect(result.effectType!, r, c);
            }

            this.audio.play('build');
            this.renderAll();
            this.checkAndShowGameOver();
        }
    }

    private handleBuildingEffect(type: string, r: number, c: number) {
        if (type === 'FACTORY') {
            showResourcePicker("Setup Factory", "Choose a resource to store:", (res) => {
                this.game.setBuildingStorage(r, c, res);
                this.multiplayer.saveBoardOnly();
                this.renderAll();
            });
        }
        else if (type === 'BANK') {
            const banned = this.game.getForbiddenResources();
            showResourcePicker("Setup Bank", "Choose a resource to ban:", (res) => {
                this.game.setBuildingStorage(r, c, res);
                this.multiplayer.saveBoardOnly();
                this.renderAll();
            }, banned);
        }
        else if (type === 'ARCHITECTS_GUILD') {
            this.guildReplacementsLeft = 2;
            showToast("Select a building to replace (2 remaining).", "info");
            this.multiplayerStatusMessage = "Select a building to replace.";
            this.multiplayer.saveBoardOnly();
            this.renderAll();
        }
        else if (type === 'GROVE_UNIVERSITY') {
            showBuildingPicker(this.game.gameRegistry, (b) => {
                this.pendingFreeBuildName = b.name;
                showToast(`Select an empty square for ${b.name}.`, "success");
                this.renderAll();
            });
        }
        else if (type === 'OPALEYE_WATCH') {
            showMultiBuildingPicker(this.game.gameRegistry, 3, (names) => {
                this.game.initializeOpaleye(r, c, names);
                this.multiplayer.saveBoardOnly();
                this.renderAll();
                showToast("Opaleye's Watch prepared!", "success");
            });
        }
    }

    private handleFreeBuild(r: number, c: number, cell: any) {
        if (cell !== 'NONE') {
            showToast("Must be empty!", "error", this.audio);
            return;
        }
        try {
            this.game.placeFreeBuilding(r, c, this.pendingFreeBuildName!);
            if (this.activeOpaleyeSource) {
                this.game.removeOpaleyeItem(this.activeOpaleyeSource.r, this.activeOpaleyeSource.c, this.pendingFreeBuildName!);
                this.activeOpaleyeSource = null;
            }
            this.pendingFreeBuildName = null;
            this.multiplayer.saveBoardOnly();
            this.audio.play('build');
            this.renderAll();
            this.checkAndShowGameOver();
            showToast("Building constructed!", "success");
        } catch (e) {
            this.audio.play('error');
            showToast("Error placing building.", "error", this.audio);
        }
    }

    private handleGuildReplacement(r: number, c: number, cell: any) {
        const isBuilding = cell !== 'NONE' && !['WOOD', 'WHEAT', 'BRICK', 'GLASS', 'STONE'].includes(cell);
        if (!isBuilding) {
            showToast("Select a building!", "error", this.audio);
            return;
        }
        showBuildingPicker(this.game.gameRegistry, (newBuilding) => {
            this.game.replaceBuilding(r, c, newBuilding.name);
            this.guildReplacementsLeft--;
            if (this.guildReplacementsLeft <= 0) {
                this.finishGuildAction();
            } else {
                showToast(`Replaced! ${this.guildReplacementsLeft} left.`, "success");
            }
            this.multiplayer.saveBoardOnly();
            this.audio.play('build');
            this.renderAll();
        });
    }

    private handleWarehouseClick(r: number, c: number) {
        if (this.hasActedThisTurn || !this.game.currentResource) return;

        const contents = this.game.getWarehouseContents(r, c);
        const canStore = contents.length < 3;
        const currentRes = this.game.currentResource;
        const modal = document.getElementById('resource-picker-modal')!;
        const container = document.getElementById('picker-options')!;

        document.getElementById('picker-title')!.textContent = "Warehouse Manager";
        document.getElementById('picker-message')!.textContent = `Current: ${currentRes}`;
        container.innerHTML = '';

        // Store Option
        if (canStore) {
            const btn = document.createElement('button');
            btn.className = `primary-btn`;
            btn.style.marginBottom = "20px";
            btn.innerHTML = `📥 <strong>Store ${currentRes}</strong>`;
            btn.onclick = () => {
                this.game.storeInWarehouse(r, c, currentRes);
                this.commitWarehouseAction(true);
                modal.classList.add('hidden');
            };
            container.appendChild(btn);
        }

        // Swap Option
        if (contents.length > 0) {
            // ... (Swap UI generation similar to before)
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.gap = '15px';
            row.style.justifyContent = 'center';
            contents.forEach((res, idx) => {
                const btn = document.createElement('div');
                btn.className = `res-btn ${res}`;
                btn.onclick = () => {
                    const popped = this.game.swapInWarehouse(r, c, idx, currentRes);
                    if (popped) {
                        this.game.currentResource = popped;
                        showToast(`Swapped for ${popped}`, "success");
                        this.commitWarehouseAction(false);
                        modal.classList.add('hidden');
                    }
                };
                row.appendChild(btn);
            });
            container.appendChild(row);
        }
        modal.classList.remove('hidden');
    }

    private async commitWarehouseAction(endTurn: boolean) {
        if (endTurn) await this.multiplayer.commitTurn();
        else await this.multiplayer.saveBoardOnly();
        this.renderAll();
        this.checkAndShowGameOver();
    }

    private async onConfirm() {
        if (!this.pendingState) return;
        try {
            if (this.pendingState.type === 'SELECT_RESOURCE') {
                const res = this.pendingState.data;
                await this.multiplayer.setGlobalResource(res);
                this.audio.play('place');
                showToast(`Confirmed!`, "success");
            }
            this.pendingState = null;
            this.renderAll();
        } catch (e) {
            this.audio.play('error');
            showToast("Error: " + e, "error", this.audio);
        }
    }

    private onUndo() {
        showToast("Undo not available.", "info");
    }

    private onBuildClick(match: any) {
        this.activeConstruction = match;
        this.activePatternCoords = this.getPatternCoords(match);
        this.renderAll();
    }

    private onCancelClick() {
        this.resetConstructionState();
        this.renderAll();
    }

    private handleSwapClick() {
        showResourcePicker("Factory Swap", "Select resource:", async (newRes) => {
            this.game.currentResource = newRes;
            showToast(`Swapped for ${newRes}.`, "success");
            this.renderAll();
        });
    }

    private onFinishTown() {
        showConfirmationModal("Finish Town?", "Are you sure?", () => {
            this.multiplayer.declareGameOver().then(() => {
                this.hasDeclaredGameOver = true;
                this.audio.play('fanfare');
                this.renderAll();
                this.checkAndShowGameOver(true);
            });
        });
    }

    private finishGuildAction() {
        this.guildReplacementsLeft = 0;
        this.elements.finishGuildBtn.classList.add('hidden');
        this.multiplayer.commitTurn();
        this.renderAll();
        this.checkAndShowGameOver();
    }

    private onOpaleyeBonus(buildingName: string, sourceCoords: { r: number, c: number }) {
        showOpaleyeBonusModal(buildingName, () => {
            this.pendingFreeBuildName = buildingName;
            this.activeOpaleyeSource = sourceCoords;
            this.renderAll();
            showToast(`Place your ${buildingName}.`, "info");
        });
    }

    // --- RENDER & HELPERS ---

    public renderAll() {
        // Factory Logic
        let showSwap = false;
        if (this.game.currentResource && !this.hasActedThisTurn) {
            const isMyTurn = this.multiplayer.masterBuilderId === this.multiplayer.playerId;
            const canSwap = this.game.canFactorySwap(this.game.currentResource);
            if (!isMyTurn && canSwap) showSwap = true;
        }
        this.renderer.toggleFactoryAction(showSwap, this.game.currentResource || '');

        // Bank Logic
        let forbidden: any[] = [];
        const isMyTurn = this.multiplayer.masterBuilderId === this.multiplayer.playerId;
        if (isMyTurn && !this.game.currentResource) {
            forbidden = this.game.getForbiddenResources();
        }

        // Guild Button
        if (this.guildReplacementsLeft > 0) {
            this.elements.finishGuildBtn.classList.remove('hidden');
            this.elements.finishGuildBtn.textContent = `Done (${this.guildReplacementsLeft})`;
            togglePalette(false);
            this.multiplayerStatusMessage = `Select a building to replace.`;
        } else {
            this.elements.finishGuildBtn.classList.add('hidden');
        }

        // Pending State
        let msg = this.multiplayerStatusMessage;
        if (this.pendingState && this.pendingState.type === 'SELECT_RESOURCE') {
            this.elements.confirmBtn.classList.remove('hidden');
            this.elements.undoBtn.classList.add('hidden');
            togglePalette(true);
            msg = `Selected ${this.pendingState.data}. Confirm or change.`;
        } else {
            this.elements.confirmBtn.classList.add('hidden');
            this.elements.undoBtn.classList.add('hidden');
        }

        if (this.pendingFreeBuildName) {
            msg = `BONUS: Place your ${this.pendingFreeBuildName}!`;
            togglePalette(false);
        }

        // --- NEW: MATCH DETECTION FOR MOBILE ---
        const totalMatches = this.game.availableMatches.length;

        const badge = document.getElementById('match-badge');
        const toggleBtn = this.elements.sidebarToggle;

        if (totalMatches > 0) {
            if (badge) {
                badge.innerText = totalMatches.toString();
                badge.style.display = 'flex';
            }
            // Add a class to make the 🏰 button pulse green
            if (toggleBtn) toggleBtn.classList.add('can-build');
        } else {
            if (badge) badge.style.display = 'none';
            if (toggleBtn) toggleBtn.classList.remove('can-build');
        }

        // Score
        const rank = this.multiplayer.myFinishRank || undefined;
        const score = this.game.getScore(rank);
        const positive = score.total + score.penaltyCount;
        const rankText = rank ? ` (Rank: ${rank})` : "";
        this.elements.scoreDisplay.innerHTML = `Score: ${positive} <span style="font-size:12px; color:#999">(-${score.penaltyCount} empty)</span>${rankText}`;

        // Finish Button
        if (this.hasDeclaredGameOver) {
            this.elements.finishTownBtn.classList.add('hidden');
        } else {
            this.elements.finishTownBtn.classList.remove('hidden');
        }

        this.renderer.render(
            this.game,
            this.activeConstruction,
            this.activePatternCoords,
            msg,
            forbidden
        );
    }

    private checkAndShowGameOver(force: boolean = false) {
        if (!this.hasDeclaredGameOver && this.game.checkGameOver() && !this.activeConstruction) {
            this.multiplayer.declareGameOver();
            this.hasDeclaredGameOver = true;
            this.audio.play('fanfare');
            force = true;
        }

        if (this.hasDeclaredGameOver && force) {
            const result = this.game.getScore(this.multiplayer.myFinishRank || undefined);
            this.elements.finalScore.textContent = result.total.toString();
            this.elements.scoreList.innerHTML = '';
            Object.entries(result.breakdown).forEach(([name, score]) => {
                if (score !== 0) this.addScoreListItem(name, score);
            });
            if (result.penaltyCount > 0) this.addScoreListItem('Empty Spaces', -result.penaltyCount, true);
            this.elements.gameOverModal.classList.remove('hidden');
            togglePalette(false);
        }
    }

    private checkMonumentSelection(data: any) {
        const myData = data.players ? data.players[this.multiplayer.playerId] : null;
        if (myData && myData.monumentOptions && !myData.monumentChosen) {
            const modal = document.getElementById('resource-picker-modal');
            if (modal && modal.classList.contains('hidden')) {
                const options = myData.monumentOptions.map((name: string) =>
                    MONUMENTS_LIST.find(b => b.name === name)
                ).filter((b: any) => !!b);

                if (options.length > 0) {
                    showMonumentSelection(options, (chosen) => {
                        this.multiplayer.selectMonument(chosen.name);
                    });
                }
            }
        }
    }

    private syncActiveMonument(data: any) {
        const myData = data.players ? data.players[this.multiplayer.playerId] : null;
        if (myData && myData.activeMonument && !this.game.activeMonument) {
            const myMonument = MONUMENTS_LIST.find(b => b.name === myData.activeMonument);
            const sharedDeckNames = data.deck || [];
            const sharedDeck = sharedDeckNames.map((name: string) =>
                BUILDING_REGISTRY.find(b => b.name === name)
            ).filter((b: any) => !!b);

            if (myMonument) {
                this.game.setMonument(myMonument, sharedDeck);
                this.renderer.renderDeck(this.game.gameRegistry);
            }
        }
    }

    private updateOpponentUI(data: any) {
        const rawOrder = data.playerOrder || [];
        const safeOrder = Array.isArray(rawOrder) ? rawOrder : Object.values(rawOrder);
        let masterId = null;

        if (safeOrder.length > 0) {
            const idx = (data.masterBuilderIndex || 0) % safeOrder.length;
            masterId = safeOrder[idx] as string;
        }

        if (data.players) {
            renderOpponents(
                data.players,
                data.roundNumber || 1,
                this.multiplayer.playerId,
                this.elements.opponentsSidebar,
                this.elements.opponentsList,
                masterId,
                safeOrder
            );
        }
    }

    private updateTurnStatus(data: any) {
        const isMyTurn = this.multiplayer.masterBuilderId === this.multiplayer.playerId;
        const resourceActive = (data.currentResource !== undefined && data.currentResource !== null);
        const currentRound = data.roundNumber || 1;
        const myStatus = data.players ? data.players[this.multiplayer.playerId] : null;

        if (myStatus) {
            this.hasActedThisTurn = (Number(myStatus.placedRound) === Number(currentRound));
        }

        if (!resourceActive) {
            if (isMyTurn) {
                this.multiplayerStatusMessage = "YOU are the Master Builder! Choose a resource.";
                togglePalette(true);
            } else {
                this.multiplayerStatusMessage = `Waiting for Master Builder...`;
                togglePalette(false);
            }
        } else {
            if (this.hasActedThisTurn) {
                this.multiplayerStatusMessage = "Waiting for other players...";
                togglePalette(false);
            } else {
                this.multiplayerStatusMessage = "";
                togglePalette(false);
            }
        }
    }

    private handleGlobalGameOver(data: any) {
        this.elements.gameOverModal.classList.add('hidden');
        renderLeaderboard(data.players, this.elements.leaderboardList);
        this.elements.multiplayerResultsModal.classList.remove('hidden');
    }

    private getPatternCoords(match: any) {
        const coords: { row: number, col: number }[] = [];
        match.pattern.forEach((row: any[], r: number) => {
            row.forEach((cell: string, c: number) => {
                if (cell !== 'NONE') coords.push({ row: match.row + r, col: match.col + c });
            });
        });
        return coords;
    }

    private addScoreListItem(label: string, score: number, isPenalty: boolean = false) {
        const li = document.createElement('li');
        li.className = 'score-item';
        if (isPenalty) {
            li.classList.add('penalty-text');
            li.style.color = '#ef5350';
        }
        li.style.display = 'flex';
        li.style.justifyContent = 'space-between';
        li.innerHTML = `<span>${label.toLowerCase()}</span><strong>${score}</strong>`;
        this.elements.scoreList.appendChild(li);
    }

    private resetConstructionState() {
        this.activeConstruction = null;
        this.activePatternCoords = [];
    }

    // Debug method exposed to window
    public debugSetMonument(name: string) {
        const target = MONUMENTS_LIST.find(b => b.name.toUpperCase().includes(name.toUpperCase()));
        if (target) {
            const sharedDeck = this.game.gameRegistry.filter(b => !b.isMonument);
            this.game.setMonument(target, sharedDeck);
            this.renderer.renderDeck(this.game.gameRegistry);
            this.renderAll();
            if (this.multiplayer.gameId) this.multiplayer.selectMonument(target.name);
            showToast(`Debug: Switched to ${target.name}`, "success", this.audio);
        } else {
            console.error("Monument not found");
        }
    }
}