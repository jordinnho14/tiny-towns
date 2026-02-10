import {
    COTTAGE,
    RED_BUILDINGS,
    GRAY_BUILDINGS,
    YELLOW_BUILDINGS,
    GREEN_BUILDINGS,
    BLACK_BUILDINGS,
    ORANGE_BUILDINGS,
    BUILDING_REGISTRY,
    MONUMENTS_LIST
} from './core/Buildings';
import { Game } from './core/Game';
import { Renderer } from './ui/Renderer';
import { MultiplayerGame } from './core/MultiplayerGame';

// NEW IMPORTS
import { 
    showToast, 
    togglePalette, 
    showResourcePicker, 
    renderLobbyList, 
    renderLeaderboard, 
    renderOpponents, 
    initHostDropdowns, 
    showMonumentSelection,
    showBuildingPicker,
    showMultiBuildingPicker,
    showOpaleyeBonusModal,
    showConfirmationModal
} from './ui/UIHelpers';

// --- 1. INITIALIZATION ---
const game = new Game();
const renderer = new Renderer();
const multiplayer = new MultiplayerGame(game);

// UI State
let activeConstruction: any | null = null;
let activePatternCoords: { row: number, col: number }[] = [];
let multiplayerStatusMessage = '';
let hasActedThisTurn = false;
let hasDeclaredGameOver = false;
let activeGameId = "";
let pendingFreeBuildName: string | null = null;
let guildReplacementsLeft = 0;
let activeOpaleyeSource: { r: number, c: number } | null = null;

// DOM Elements
const elements = {
    startModal: document.getElementById('start-screen-modal')!,
    landingUI: document.getElementById('landing-ui')!,
    lobbyUI: document.getElementById('lobby-ui')!,
    playerNameInput: document.getElementById('player-name-input') as HTMLInputElement,
    createGameBtn: document.getElementById('create-game-ui-btn')!,
    joinGameBtn: document.getElementById('join-game-btn')!,
    gameIdInput: document.getElementById('game-id-input') as HTMLInputElement,
    shareCodeDisplay: document.getElementById('share-code-display')!,
    lobbyPlayerList: document.getElementById('lobby-player-list')!,
    hostSettings: document.getElementById('host-settings')!,
    guestWaitingMsg: document.getElementById('guest-waiting-msg')!,
    startGameBtn: document.getElementById('start-game-btn')!,
    multiplayerResultsModal: document.getElementById('multiplayer-results-modal')!,
    leaderboardList: document.getElementById('leaderboard-list')!,
    mpRestartBtn: document.getElementById('mp-restart-btn')!,
    opponentsSidebar: document.getElementById('opponents-sidebar')!,
    opponentsList: document.getElementById('opponents-list')!,
    copyLinkBtn: document.getElementById('copy-link-btn')!,
    gameOverModal: document.getElementById('game-over-modal')!,
    finalScore: document.getElementById('final-score')!,
    scoreList: document.getElementById('score-breakdown-list')!,
    restartBtn: document.getElementById('restart-btn')!,
    undoBtn: document.getElementById('undo-btn')!,
    finishGuildBtn: document.getElementById('finish-guild-btn')!,
    finishTownBtn: document.getElementById('finish-town-btn')!
};

// --- CONFIGURATION ---
const BUILDING_CATEGORIES = [
    { id: 'RED', label: 'Farm (Red)', options: RED_BUILDINGS },
    { id: 'GRAY', label: 'Well (Gray)', options: GRAY_BUILDINGS },
    { id: 'YELLOW', label: 'Theater (Yellow)', options: YELLOW_BUILDINGS },
    { id: 'GREEN', label: 'Tavern (Green)', options: GREEN_BUILDINGS },
    { id: 'ORANGE', label: 'Chapel (Orange)', options: ORANGE_BUILDINGS },
    { id: 'BLACK', label: 'Factory (Black)', options: BLACK_BUILDINGS },
];

// --- 2. MULTIPLAYER CALLBACKS ---

multiplayer.onStateChange = (data) => {
    try {
        // 1. LOBBY UI
        if (data.status === 'LOBBY') {
            renderLobbyList(data.players, elements.lobbyPlayerList);
        }

        // 2. GAME UI
        if (data.status === 'PLAYING') {
            // Hide modal if game just started
            if (!elements.startModal.classList.contains('hidden')) {
                elements.startModal.classList.add('hidden');
                // We don't renderAll here anymore, we wait for monument check below
            }

            // ============================================================
            // NEW: MONUMENT SELECTION LOGIC
            // ============================================================
            const myData = data.players ? data.players[multiplayer.playerId] : null;

            // A. Check if I need to choose a monument (Options exist, but not chosen)
            if (myData && myData.monumentOptions && !myData.monumentChosen) {
                const modal = document.getElementById('resource-picker-modal');
                
                // Only trigger if modal is currently hidden (prevents loop re-opening)
                if (modal && modal.classList.contains('hidden')) {
                    // Convert string names back to Building Objects
                    const options = myData.monumentOptions.map((name: string) => 
                        MONUMENTS_LIST.find(b => b.name === name)
                    ).filter((b: any) => !!b);

                    if (options.length > 0) {
                        showMonumentSelection(options, (chosen) => {
                            // Tell server what we picked
                            multiplayer.selectMonument(chosen.name);
                        });
                    }
                }
                // IMPORTANT: Stop here. Do not render the game board while choosing.
                return; 
            }

            // B. Check if I have chosen, but my local game doesn't know about it yet
            if (myData && myData.activeMonument && !game.activeMonument) {
                // Find my specific monument
                const myMonument = MONUMENTS_LIST.find(b => b.name === myData.activeMonument);
                
                // Reconstruct the shared deck from server data
                const sharedDeckNames = data.deck || [];
                const sharedDeck = sharedDeckNames.map((name: string) => 
                    BUILDING_REGISTRY.find(b => b.name === name)
                ).filter((b: any) => !!b);

                // Inject into Game Engine
                if (myMonument) {
                    game.setMonument(myMonument, sharedDeck);
                    renderer.renderDeck(game.gameRegistry); // Update Sidebar
                }
            }
            // ============================================================

            // C. Identify Master Builder
            let masterName = "Unknown";
            const rawOrder = data.playerOrder || [];
            const safeOrder = Array.isArray(rawOrder) ? rawOrder : Object.values(rawOrder);


            if (data.players) {
                renderOpponents(
                    data.players, 
                    data.roundNumber || 1, 
                    multiplayer.playerId, 
                    elements.opponentsSidebar, 
                    elements.opponentsList,
                    calculateMasterId(data),
                    safeOrder
                );
            }

            if (safeOrder.length > 0 && data.players) {
                const idx = (data.masterBuilderIndex || 0) % safeOrder.length;
                const masterId = safeOrder[idx] as string;
                if (data.players[masterId]) {
                    masterName = data.players[masterId].name;
                }
            }

            const isMyTurn = multiplayer.masterBuilderId === multiplayer.playerId;
            const resourceActive = (data.currentResource !== undefined && data.currentResource !== null);

            // D. Check Lock Status
            const currentRound = data.roundNumber || 1;
            const myStatus = data.players ? data.players[multiplayer.playerId] : null;
            if (myStatus) {
                hasActedThisTurn = (Number(myStatus.placedRound) === Number(currentRound));
            }

            // E. Update Status Message
            if (!resourceActive) {
                if (isMyTurn) {
                    multiplayerStatusMessage = "YOU are the Master Builder! Choose a resource.";
                    togglePalette(true);
                } else {
                    multiplayerStatusMessage = `Waiting for ${masterName} to choose a resource...`;
                    togglePalette(false);
                }
            } else {
                if (hasActedThisTurn) {
                    multiplayerStatusMessage = "Waiting for other players to finish placing...";
                    togglePalette(false);
                } else {
                    multiplayerStatusMessage = ""; 
                    togglePalette(false);
                }
            }
        }

        if (data.status === 'FINISHED') {
            elements.gameOverModal.classList.add('hidden');
            renderLeaderboard(data.players, elements.leaderboardList);
            elements.multiplayerResultsModal.classList.remove('hidden');
        }

        // Final Render
        game.currentResource = data.currentResource || null;
        renderAll();
    } catch (err) {
        console.error("Error in onStateChange:", err);
    }
};

multiplayer.onGameStart = () => {
    elements.startModal.classList.add('hidden');
    renderAll();
    renderer.renderDeck(game.gameRegistry);
};


// --- 3. EVENT HANDLERS ---

renderer.onResourceSelect = (res) => {
    if (activeConstruction) return;

    if (!game.currentResource) {
        multiplayer.setGlobalResource(res as any);
    } else {
        console.log("Blocked: Resource already active:", game.currentResource);
    }
};

renderer.onCellClick = (r, c) => {
    const grid = game.board.getGrid();
    const cell = grid[r][c];

    // 1. UNIFIED FREE BUILD LOGIC (Grove University & Opaleye)
    if (pendingFreeBuildName) {
        if (cell !== 'NONE') {
            showToast("You must choose an EMPTY square!", "error");
            return;
        }

        try {
            console.log(`[Main] Executing Free Build: ${pendingFreeBuildName}`);
            
            // A. Place the building
            game.placeFreeBuilding(r, c, pendingFreeBuildName);

            // B. Remove from Watch Card (ONLY if this came from Opaleye)
            if (activeOpaleyeSource) {
                console.log(`[Main] Removing from Opaleye at ${activeOpaleyeSource.r},${activeOpaleyeSource.c}`);
                game.removeOpaleyeItem(
                    activeOpaleyeSource.r, 
                    activeOpaleyeSource.c, 
                    pendingFreeBuildName
                );
                
                // Clear the source so we don't try to remove again
                activeOpaleyeSource = null; 
            }

            // C. Clear pending state
            pendingFreeBuildName = null;

            // D. Save & Render
            // This saves the new metadata (item removed) to the server
            multiplayer.saveBoardOnly(); 
            renderAll();
            checkAndShowGameOver();
            showToast("Building constructed!", "success");

        } catch (e) {
            console.error("Error placing building:", e);
            showToast("Error placing building.", "error");
        }
        return; // STOP here. Do not process other clicks.
    }

    // 2. ARCHITECT'S GUILD LOGIC (Replacement Mode)
    if (guildReplacementsLeft > 0) {
        // Validation: Must be a building (not empty, not a resource)
        const isBuilding = cell !== 'NONE' && !['WOOD','WHEAT','BRICK','GLASS','STONE'].includes(cell);
        
        if (!isBuilding) {
            showToast("You must select an existing building to replace!", "error");
            return;
        }

        // Open Picker to choose the NEW building
        showBuildingPicker(game.gameRegistry, (newBuilding) => {
            try {
                // Perform Replacement
                game.replaceBuilding(r, c, newBuilding.name);
                guildReplacementsLeft--;

                if (guildReplacementsLeft > 0) {
                     showToast(`Replaced! Select one more building or click 'Done'.`, "success");
                } else {
                     showToast("Replacements complete.", "success");
                     finishGuildAction();
                }

                // Render update
                multiplayer.saveBoardOnly();
                renderAll();
            } catch(e) {
                showToast("Error replacing building.", "error");
            }
        });
        return; // Stop processing
    }

    // 4. WAREHOUSE LOGIC
    if (cell && cell.toUpperCase() === 'WAREHOUSE') {
        handleWarehouseClick(r, c);
        return; 
    }

    // 5. STANDARD CONSTRUCTION / RESOURCE LOGIC
    try {
        if (activeConstruction) {
            handleConstructionClick(r, c);
        } else {
            handleResourceClick(r, c);
        }
    } catch (e) {
        showToast((e as Error).message, "error");
    }
};

renderer.onSwapClick = handleSwapClick;

async function handleResourceClick(r: number, c: number) {
    if (hasActedThisTurn) {
        showToast("You have already placed a resource this turn!", "error");
        return;
    }

    if (!game.currentResource) {
        showToast("Waiting for Master Builder...", "info");
        return;
    }

    // --- BONDMAKER LOGIC ---
    const isMasterBuilder = multiplayer.masterBuilderId === multiplayer.playerId;
    const grid = game.board.getGrid();
    const cell = grid[r][c];

    // Check if player is trying to use the Bondmaker ability
    if (cell.toUpperCase() === 'COTTAGE' && game.hasStatueOfBondmaker()) {
        
        // 1. PRIORITY CHECK: Is it already full?
        // (We check this first so you get the "Full" error instead of the "Permission" error)
        const meta = game.board.getMetadata(r, c);
        if (meta && meta.storedResource) {
             showToast("This Cottage is already holding a resource!", "error");
             return;
        }

        // 2. SECONDARY CHECK: Am I allowed to do this?
        // (Bondmaker only works if I am NOT the Master Builder)
        if (isMasterBuilder) {
            showToast("The Bondmaker only works when OTHER players name a resource!", "error");
            return; 
        }
    }
    // --- END BONDMAKER LOGIC ---

    try {
        game.placeResource(r, c);
        await multiplayer.commitTurn();
        renderAll();
        checkAndShowGameOver();
    } catch (e) {
        showToast((e as Error).message, "error");
    }
}

renderer.onBuildClick = (match) => {
    activeConstruction = match;
    activePatternCoords = getPatternCoords(match);
    renderAll();
};

renderer.onCancelClick = () => {
    resetConstructionState();
    renderAll();
};

elements.undoBtn.onclick = () => {
    showToast("Undo not yet supported in Multiplayer!", "info");
};

elements.mpRestartBtn.onclick = () => {
    location.reload();
};


// --- 4. LOBBY & START BUTTONS ---
elements.createGameBtn.onclick = async () => {
    const name = elements.playerNameInput.value || "Host";
    try {
        const defaultDeck = generateRandomDeck();
        const gameId = await multiplayer.createGame(name, defaultDeck.map(b => b.name));
        enterLobbyMode(gameId, true);
    } catch (err) {
        console.error("Firebase Error:", err);
        showToast("Error creating game.", "error");
    }
};

elements.joinGameBtn.onclick = async () => {
    const name = elements.playerNameInput.value || "Guest";
    const gameId = elements.gameIdInput.value.trim();
    if (!gameId) {
        showToast("Please enter a code!", "error");
        return;
    }
    try {
        await multiplayer.joinGame(gameId, name);
        enterLobbyMode(gameId, false);
    } catch (e) {
        showToast("Could not join game: " + e, "error");
    }
};

elements.startGameBtn.onclick = async () => {
    const finalDeck = buildDeckFromUI();
    await multiplayer.updateDeck(finalDeck.map(b => b.name));
    await multiplayer.startGame();
};

elements.shareCodeDisplay.onclick = () => {
    const code = elements.shareCodeDisplay.innerText.replace('Code: ', '');
    navigator.clipboard.writeText(code);
    showToast("Code copied!", "success");
};

elements.restartBtn.onclick = () => {
    location.reload();
};

elements.copyLinkBtn.onclick = () => {
    if (!activeGameId) return;
    const url = `${window.location.origin}${window.location.pathname}?gameId=${activeGameId}`;
    navigator.clipboard.writeText(url).then(() => {
        showToast("Invite Link copied!", "success");
    });
};


// --- 5. HELPERS ---

function enterLobbyMode(gameId: string, isHost: boolean) {
    activeGameId = gameId;
    elements.landingUI.classList.add('hidden');
    elements.lobbyUI.classList.remove('hidden');
    elements.shareCodeDisplay.innerText = `Code: ${gameId}`;

    if (isHost) {
        elements.hostSettings.classList.remove('hidden');
        elements.guestWaitingMsg.classList.add('hidden');
        // Pass the categories and the container element
        initHostDropdowns(document.getElementById('setup-container')!, BUILDING_CATEGORIES);
    } else {
        elements.hostSettings.classList.add('hidden');
        elements.guestWaitingMsg.classList.remove('hidden');
    }
}

function buildDeckFromUI() {
    const deck: any[] = [COTTAGE];
    const selects = document.querySelectorAll('.setup-select') as NodeListOf<HTMLSelectElement>;
    if (selects.length === 0) return generateRandomDeck();

    selects.forEach(select => {
        const catId = select.dataset.category;
        if (!catId) return;
        const config = BUILDING_CATEGORIES.find(c => c.id === catId);
        if (!config) return;

        let selectedBuilding;
        if (select.value === 'RANDOM') {
            selectedBuilding = pickRandom(config.options);
        } else {
            selectedBuilding = config.options.find(b => b.name === select.value);
        }
        if (selectedBuilding) deck.push(selectedBuilding);
    });
    return deck;
}

function generateRandomDeck() {
    const deck = [COTTAGE];
    BUILDING_CATEGORIES.forEach(cat => {
        deck.push(pickRandom(cat.options));
    });
    return deck;
}

// src/main.ts

function handleConstructionClick(r: number, c: number) {
    const grid = game.board.getGrid();
    const cellContent = grid[r][c];
    const isPatternSpot = activePatternCoords.some(p => p.row === r && p.col === c);
    const buildName = activeConstruction ? activeConstruction.buildingName.toUpperCase() : '';
    const isObelisk = game.hasObeliskAbility();
    const isShed = buildName === 'SHED';
    const isGlobalTarget = (isObelisk || isShed) && cellContent === 'NONE';

    if (isPatternSpot || isGlobalTarget) {
        if (cellContent && (cellContent as string).toUpperCase().replace('_', ' ') === 'TRADING POST') {
            showToast("Cannot build on Trading Post.", "error");
            return;
        }

        // 1. Update local game state (Place the building)
        const result = game.constructBuilding(activeConstruction, r, c);

        // 2. Save new board to database
        multiplayer.saveBoardOnly();

        // --- CRITICAL FIX START ---
        // We MUST clear the "hologram" state immediately after placement.
        // Otherwise, the renderer thinks we are still trying to place the Grove University.
        resetConstructionState(); 
        // --- CRITICAL FIX END ---

        if (result.type === 'TRIGGER_EFFECT') {

            if (result.effectType === 'FACTORY') {
                showResourcePicker(
                    "Setup Factory",
                    "Choose a resource to store on your Factory:",
                    (chosenRes) => {
                        game.setBuildingStorage(r, c, chosenRes);
                        multiplayer.saveBoardOnly();
                        renderAll();
                    }
                );
            }
            else if (result.effectType === 'BANK') {
                const existingBanned = game.getForbiddenResources();
                showResourcePicker(
                    "Setup Bank",
                    "Choose a resource to store on your Bank.\nYou will NOT be able to pick this resource as Master Builder!",
                    (chosenRes) => {
                        game.setBuildingStorage(r, c, chosenRes);
                        multiplayer.saveBoardOnly();
                        renderAll();
                    },
                    existingBanned
                );
            }
            else if (result.effectType === 'ARCHITECTS_GUILD') {
                // 1. Set State
                guildReplacementsLeft = 2;
                
                // 2. Show UI Feedback
                showToast("Architect's Guild: Select a building to replace (2 remaining).", "info");
                
                // 3. Show a "Done" button (Reusing the cancel button temporarily or adding a custom one)
                // Let's create a temporary button in the UI overlay if possible, 
                // or just hijack the status message area.
                multiplayerStatusMessage = "Select a building to replace (or click Resource to skip)";
                
                // Save the board immediately (Guild is built)
                multiplayer.saveBoardOnly(); 
                renderAll();
                return;
            }
            else if (result.effectType === 'GROVE_UNIVERSITY') {
                showBuildingPicker(game.gameRegistry, (chosenBuilding) => {
                    // 1. Set the specific "Pending Free Build" state
                    pendingFreeBuildName = chosenBuilding.name;
                    
                    showToast(`Select an empty square to build the ${chosenBuilding.name}.`, "success");
                    
                    // 2. Re-render (The renderer will see pendingFreeBuildName and update the message)
                    renderAll();
                });
                // IMPORTANT: Return here so we DO NOT check for Game Over yet.
                // The turn is not over until the free building is placed.
                return; 
            }
            else if (result.effectType === 'OPALEYE_WATCH') {
                // Open the 3-building picker
                showMultiBuildingPicker(game.gameRegistry, 3, (selectedNames) => {
                    game.initializeOpaleye(r, c, selectedNames);
                    multiplayer.saveBoardOnly(); 
                    renderAll();
                    showToast("Opaleye's Watch prepared!", "success");
                });
                
                // Don't render yet, wait for picker
                return; 
            }
        }

        renderAll();
        checkAndShowGameOver();
    }
}

function handleSwapClick() {
    showResourcePicker(
        "Factory Swap",
        "Select the resource you want to use this turn:",
        async (newRes) => {
            const oldRes = game.currentResource;
            game.currentResource = newRes;
            showToast(`Factory activated! Swapped ${oldRes} for ${newRes}.`, "success");
            renderAll();
        }
    );
}

// NOTE: This function is complex and specific to game state, so keeping it in main.ts is fine.
function handleWarehouseClick(r: number, c: number) {
    if (hasActedThisTurn) return;
    if (!game.currentResource) return; 

    const contents = game.getWarehouseContents(r, c);
    const canStore = contents.length < 3;
    const currentRes = game.currentResource;

    // We reuse the modal structure, but build custom buttons
    const modal = document.getElementById('resource-picker-modal')!;
    const container = document.getElementById('picker-options')!;
    const title = document.getElementById('picker-title')!;
    const msg = document.getElementById('picker-message')!;

    title.textContent = "Warehouse Manager";
    msg.textContent = `Current Resource: ${currentRes}`;
    container.innerHTML = '';

    // OPTION 1: STORE
    if (canStore) {
        const btn = document.createElement('button');
        btn.className = `primary-btn`;
        btn.style.width = "100%";
        btn.style.marginBottom = "20px";
        btn.innerHTML = `📥 <strong>Store ${currentRes}</strong> <br><span style="font-size:0.8em; font-weight:normal">(Ends Turn)</span>`;
        btn.onclick = () => {
            game.storeInWarehouse(r, c, currentRes);
            commitWarehouseAction(true);
            modal.classList.add('hidden');
        };
        container.appendChild(btn);
    } else {
        const p = document.createElement('p');
        p.textContent = "Warehouse Full (Max 3)";
        p.style.color = "#d32f2f";
        p.style.fontWeight = "bold";
        p.style.textAlign = "center";
        container.appendChild(p);
    }

    // OPTION 2: SWAP
    if (contents.length > 0) {
        const divider = document.createElement('div');
        divider.style.borderTop = "1px solid #ddd";
        divider.style.margin = "15px 0";
        container.appendChild(divider);

        const label = document.createElement('p');
        label.innerHTML = `Swap <strong>${currentRes}</strong> for:`;
        label.style.textAlign = "center";
        container.appendChild(label);

        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.gap = '15px';
        row.style.justifyContent = 'center';

        contents.forEach((storedRes, idx) => {
            const wrapper = document.createElement('div');
            wrapper.style.display = 'flex';
            wrapper.style.flexDirection = 'column';
            wrapper.style.alignItems = 'center';
            
            const btn = document.createElement('div');
            btn.className = `res-btn ${storedRes}`;
            btn.textContent = storedRes[0];
            btn.style.cursor = "pointer";
            
            btn.onclick = () => {
                const poppedRes = game.swapInWarehouse(r, c, idx, currentRes);
                if (poppedRes) {
                    game.currentResource = poppedRes;
                    showToast(`Swapped! Place ${poppedRes} on the board.`, "success");
                    commitWarehouseAction(false); 
                    modal.classList.add('hidden');
                }
            };
            
            wrapper.appendChild(btn);
            row.appendChild(wrapper);
        });
        container.appendChild(row);
    }
    modal.classList.remove('hidden');
}

async function commitWarehouseAction(endTurn: boolean) {
    try {
        if (endTurn) {
            await multiplayer.commitTurn(); 
        } else {
            await multiplayer.saveBoardOnly(); 
        }
        renderAll();
        checkAndShowGameOver(); 
    } catch (e) {
        showToast("Error saving warehouse: " + e, "error");
    }
}

function resetConstructionState() {
    activeConstruction = null;
    activePatternCoords = [];
}

function getPatternCoords(match: any) {
    const coords: { row: number, col: number }[] = [];
    match.pattern.forEach((row: any[], r: number) => {
        row.forEach((cell: string, c: number) => {
            if (cell !== 'NONE') coords.push({ row: match.row + r, col: match.col + c });
        });
    });
    return coords;
}

function pickRandom(list: any[]) {
    return list[Math.floor(Math.random() * list.length)];
}

function renderAll() {
    // Factory Logic
    let showSwap = false;
    if (game.currentResource && !hasActedThisTurn) {
        const isMyTurn = multiplayer.masterBuilderId === multiplayer.playerId;
        const canSwap = game.canFactorySwap(game.currentResource);
        if (!isMyTurn && canSwap) showSwap = true;
    }
    renderer.toggleFactoryAction(showSwap, game.currentResource || '');

    // Bank Logic
    let forbiddenResources: any[] = [];
    const isMyTurn = multiplayer.masterBuilderId === multiplayer.playerId;
    if (isMyTurn && !game.currentResource) {
        forbiddenResources = game.getForbiddenResources();
    }

    if (guildReplacementsLeft > 0) {
        elements.finishGuildBtn.classList.remove('hidden');
        elements.finishGuildBtn.textContent = `Done Replacing (${guildReplacementsLeft} left)`;
        togglePalette(false); // Lock resources
        
        // Override message
        multiplayerStatusMessage = `Architect's Guild: Select a building to replace.`;
    } else {
        if (!elements.finishGuildBtn.classList.contains('hidden')) {
            elements.finishGuildBtn.classList.add('hidden');
        }
    }

    let msg = multiplayerStatusMessage;
    if (pendingFreeBuildName) {
        msg = `🌟 BONUS: Click an empty square for your ${pendingFreeBuildName}!`;
        togglePalette(false); // Disable resources
    }

    const myRank = multiplayer.myFinishRank || undefined;
    const score = game.getScore(myRank);
    
    const positive = score.total + score.penaltyCount;
    const rankText = myRank ? ` (Rank: ${myRank})` : "";
    
    // Update the Score Header
    document.getElementById('score-display')!.innerHTML = 
        `Score: ${positive} <span style="font-size:12px; color:#999">(-${score.penaltyCount} empty)</span>${rankText}`;

    // Toggle Button Visibility
    // If I have already finished (declared game over), hide the button
    if (hasDeclaredGameOver) {
        elements.finishTownBtn.classList.add('hidden');
    } else {
        elements.finishTownBtn.classList.remove('hidden');
    }

    renderer.render(
        game,
        activeConstruction,
        activePatternCoords,
        msg,
        forbiddenResources
    );
}

function checkAndShowGameOver() {
    if (!hasDeclaredGameOver && game.checkGameOver() && !activeConstruction) {
        const result = game.getScore();
        elements.finalScore.textContent = result.total.toString();
        elements.scoreList.innerHTML = '';
        Object.entries(result.breakdown).forEach(([name, score]) => {
            if (score !== 0) addScoreListItem(name, score);
        });
        if (result.penaltyCount > 0) addScoreListItem('Empty Spaces', -result.penaltyCount, true);

        elements.gameOverModal.classList.remove('hidden');
        multiplayer.declareGameOver();
        hasDeclaredGameOver = true;
        togglePalette(false);
    }
}

function addScoreListItem(label: string, score: number, isPenalty: boolean = false) {
    const li = document.createElement('li');
    li.className = 'score-item';
    if (isPenalty) {
        li.classList.add('penalty-text');
        li.style.color = '#ef5350';
    }
    li.style.display = 'flex';
    li.style.justifyContent = 'space-between';
    li.innerHTML = `<span>${label.toLowerCase()}</span><strong>${score}</strong>`;
    elements.scoreList.appendChild(li);
}

function calculateMasterId(data: any): string | null {
    const rawOrder = data.playerOrder || [];
    const safeOrder = Array.isArray(rawOrder) ? rawOrder : Object.values(rawOrder);
    if (safeOrder.length > 0) {
        const idx = (data.masterBuilderIndex || 0) % safeOrder.length;
        return safeOrder[idx] as string;
    }
    return null;
}

elements.finishGuildBtn.onclick = () => {
    finishGuildAction();
};

elements.finishTownBtn.onclick = () => {
    showConfirmationModal(
        "Finish Town?", 
        "Are you sure you want to finish your town? You won't be able to place any more buildings.", 
        () => {
            // This code only runs if they click "Yes, Finish"
            multiplayer.declareGameOver().then(() => {
                hasDeclaredGameOver = true;
                renderAll();
                showToast("Town Finished!", "success");
                
                // Show Game Over Modal immediately
                const result = game.getScore(multiplayer.myFinishRank || undefined);
                
                elements.finalScore.textContent = result.total.toString();
                elements.scoreList.innerHTML = '';
                
                Object.entries(result.breakdown).forEach(([name, score]) => {
                    if (score !== 0) addScoreListItem(name, score);
                });
                
                if (result.penaltyCount > 0) {
                    addScoreListItem('Empty Spaces', -result.penaltyCount, true);
                }

                document.getElementById('game-over-modal')!.classList.remove('hidden');
            });
        }
    );
};

multiplayer.onOpaleyeBonus = (buildingName, sourceCoords) => {
    console.log(`[Main] Opaleye Bonus Received: ${buildingName}`, sourceCoords);
    
    // Trigger the Modal
    showOpaleyeBonusModal(buildingName, () => {
        // This runs when they click "Select Square to Build"
        pendingFreeBuildName = buildingName;
        activeOpaleyeSource = sourceCoords;
        
        renderAll(); // Updates the top bar message
        showToast(`Select an empty square for your ${buildingName}.`, "info");
    });
};

function finishGuildAction() {
    guildReplacementsLeft = 0;
    elements.finishGuildBtn.classList.add('hidden');
    
    // Commit the turn finally
    multiplayer.commitTurn(); 
    renderAll();
    checkAndShowGameOver();
}

// --- AUTO-JOIN VIA URL ---
(function checkUrlForInvite() {
    const params = new URLSearchParams(window.location.search);
    const inviteCode = params.get('gameId');
    if (inviteCode) {
        elements.gameIdInput.value = inviteCode;
        elements.playerNameInput.focus();
        showToast(`Invite code ${inviteCode} detected! Enter your name to join.`, "success");
        elements.createGameBtn.parentElement?.classList.add('hidden'); 
    }
})();


// --- DEBUGGING TOOLS ---
// Expose this function to the browser console
(window as any).setMonument = (partialName: string) => {
    // 1. Find the monument from the master list
    const target = MONUMENTS_LIST.find(b => 
        b.name.toUpperCase().includes(partialName.toUpperCase())
    );

    if (!target) {
        console.error(`Could not find monument matching "${partialName}". Available:`, MONUMENTS_LIST.map(b => b.name));
        return;
    }

    console.log(`Force-switching monument to: ${target.name}`);

    // 2. Identify the "Shared Deck" (everything that isn't a monument)
    const sharedDeck = game.gameRegistry.filter(b => !b.isMonument);

    // 3. Update the Game Engine
    game.setMonument(target, sharedDeck);

    // 4. Update the UI
    renderer.renderDeck(game.gameRegistry);
    renderAll();

    // 5. Update Server (so other players see your new sidebar card)
    if (multiplayer.gameId) {
        multiplayer.selectMonument(target.name);
    }

    showToast(`Debug: Switched to ${target.name}`, "success");
};

console.log("🛠️ DEBUG MODE: Type setMonument('Statue') in console to switch monuments.");