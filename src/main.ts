import {
    COTTAGE,
    RED_BUILDINGS,
    GRAY_BUILDINGS,
    YELLOW_BUILDINGS,
    GREEN_BUILDINGS,
    BLACK_BUILDINGS,
    ORANGE_BUILDINGS,
    BUILDING_REGISTRY
} from './core/Buildings';
import { Game } from './core/Game';
import { Renderer } from './ui/Renderer';
import { MultiplayerGame } from './core/MultiplayerGame';
import type { ResourceType } from './core/Types';

// --- 1. INITIALIZATION ---
const game = new Game();
const renderer = new Renderer();
const multiplayer = new MultiplayerGame(game); // <--- NEW MANAGER

// UI State
let activeConstruction: any | null = null;
let activePatternCoords: { row: number, col: number }[] = [];
let multiplayerStatusMessage = '';
let hasActedThisTurn = false;
let hasDeclaredGameOver = false;
let activeGameId = "";

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

    // Existing helpers
    monumentGrid: document.getElementById('monument-pattern-grid')!,
    monumentDesc: document.getElementById('monument-desc')!,
    gameOverModal: document.getElementById('game-over-modal')!,
    finalScore: document.getElementById('final-score')!,
    scoreList: document.getElementById('score-breakdown-list')!,
    restartBtn: document.getElementById('restart-btn')!,
    undoBtn: document.getElementById('undo-btn')!,
};

// --- CONFIGURATION FOR SETUP MENU ---
const BUILDING_CATEGORIES = [
    { id: 'RED', label: 'Farm (Red)', options: RED_BUILDINGS },
    { id: 'GRAY', label: 'Well (Gray)', options: GRAY_BUILDINGS },
    { id: 'YELLOW', label: 'Theater (Yellow)', options: YELLOW_BUILDINGS },
    { id: 'GREEN', label: 'Tavern (Green)', options: GREEN_BUILDINGS },
    { id: 'ORANGE', label: 'Chapel (Orange)', options: ORANGE_BUILDINGS },
    { id: 'BLACK', label: 'Factory (Black)', options: BLACK_BUILDINGS },
    { id: 'PURPLE', label: 'Monument', options: BUILDING_REGISTRY.filter(b => b.isMonument) }
];


// --- 2. MULTIPLAYER CALLBACKS ---

multiplayer.onStateChange = (data) => {
    try {
        // 1. LOBBY UI
        if (data.status === 'LOBBY') {
            renderLobbyList(data.players);
        }

        // 2. GAME UI
        if (data.status === 'PLAYING') {
            // Hide modal if game just started
            if (!elements.startModal.classList.contains('hidden')) {
                elements.startModal.classList.add('hidden');
                renderAll();
                renderer.renderDeck(game.gameRegistry);
            }
            if (data.players) {
                // Pass the players AND the current round number (for status dots)
                renderOpponents(data.players, data.roundNumber || 1);
            }

            // --- A. Identify Master Builder ---
            let masterName = "Unknown";
            const rawOrder = data.playerOrder || [];
            const safeOrder = Array.isArray(rawOrder) ? rawOrder : Object.values(rawOrder);

            if (safeOrder.length > 0 && data.players) {
                const idx = (data.masterBuilderIndex || 0) % safeOrder.length;
                const masterId = safeOrder[idx] as string;
                if (data.players[masterId]) {
                    masterName = data.players[masterId].name;
                }
            }

            const isMyTurn = multiplayer.masterBuilderId === multiplayer.playerId;
            const resourceActive = (data.currentResource !== undefined && data.currentResource !== null);

            // --- B. Check Lock Status (Have I acted this round?) ---
            const currentRound = data.roundNumber || 1;
            const myStatus = data.players ? data.players[multiplayer.playerId] : null;
            if (myStatus) {
                // Strict number comparison to be safe
                hasActedThisTurn = (Number(myStatus.placedRound) === Number(currentRound));
            }

            // --- C. Update Status Message ---
            if (!resourceActive) {
                // NOMINATION PHASE
                if (isMyTurn) {
                    multiplayerStatusMessage = "YOU are the Master Builder! Choose a resource.";
                    togglePalette(true);
                } else {
                    multiplayerStatusMessage = `Waiting for ${masterName} to choose a resource...`;
                    togglePalette(false);
                }
            } else {
                // PLACEMENT PHASE
                if (hasActedThisTurn) {
                    multiplayerStatusMessage = "Waiting for other players to finish placing...";
                    togglePalette(false);
                } else {
                    multiplayerStatusMessage = ""; // Renderer defaults to "Place [RESOURCE]..."
                    togglePalette(false);
                }
            }
        }

        if (data.status === 'FINISHED') {
            elements.gameOverModal.classList.add('hidden');

            // Show the Global Leaderboard
            renderLeaderboard(data.players);
            elements.multiplayerResultsModal.classList.remove('hidden');
        }

        // --- D. Render ---
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


// --- 3. EVENT HANDLERS (UPDATED) ---

// A. Resource Selection (Only if it's your turn / you are host... simplified for now)
renderer.onResourceSelect = (res) => {
    // Debugging: See what the game THINKS the current resource is
    console.log("Clicked resource:", res);
    console.log("Current game state resource:", game.currentResource);

    if (activeConstruction) return;

    // FIX: Check if "falsy" (null, undefined, or empty string)
    if (!game.currentResource) {
        console.log("Sending request to set resource...");
        multiplayer.setGlobalResource(res as any);
    } else {
        // If resource is already active, clicking it does nothing
        console.log("Blocked: Resource already active:", game.currentResource);
    }
};

// B. Clicking the Board
renderer.onCellClick = (r, c) => {
    const grid = game.board.getGrid();
    const cell = grid[r][c];

    // NEW: Check if clicked cell is a Warehouse
    if (cell && cell.toUpperCase() === 'WAREHOUSE') {
        handleWarehouseClick(r, c);
        return; // Stop here
    }
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
    // Undo is tricky in multiplayer. 
    // For now, let's disable it or make it local-only BEFORE commit.
    // If you already committed, you can't undo.
    showToast("Undo not yet supported in Multiplayer!", "info");
};

elements.mpRestartBtn.onclick = () => {
    // For now, reloading is the safest way to reset state
    location.reload();
};


// --- 4. LOBBY & START BUTTONS ---
elements.createGameBtn.onclick = async () => {
    const name = elements.playerNameInput.value || "Host";

    // 1. Create the game with a default deck first
    // (We will update the deck when the Host clicks 'Start Game')
    try {
        const defaultDeck = generateRandomDeck();
        const gameId = await multiplayer.createGame(name, defaultDeck.map(b => b.name));

        // 2. Move to Lobby UI
        enterLobbyMode(gameId, true);
    } catch (err) {
        console.error("Firebase Error:", err);
        showToast("Error creating game. Check console for details.", "error");
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
    // 1. Now that the Host is in the lobby and has configured the dropdowns,
    // we build the FINAL deck to send to everyone.
    const finalDeck = buildDeckFromUI();

    // 2. Update the Cloud data with this specific deck
    await multiplayer.updateDeck(finalDeck.map(b => b.name));

    // 3. Start the game
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
        initHostDropdowns(); // Initialize the dropdowns for the host
    } else {
        elements.hostSettings.classList.add('hidden');
        elements.guestWaitingMsg.classList.remove('hidden');
    }
}

function renderLobbyList(players: any) {
    elements.lobbyPlayerList.innerHTML = '<strong>Players:</strong><br>';
    Object.values(players).forEach((p: any) => {
        const div = document.createElement('div');
        div.textContent = `• ${p.name}`;
        elements.lobbyPlayerList.appendChild(div);
    });
}

function buildDeckFromUI() {
    const deck: any[] = [COTTAGE]; // Always Cottage

    // If the dropdowns aren't generated yet, return default
    const selects = document.querySelectorAll('.setup-select') as NodeListOf<HTMLSelectElement>;
    if (selects.length === 0) {
        // Return a random valid deck if UI isn't ready
        return generateRandomDeck();
    }

    selects.forEach(select => {
        const catId = select.dataset.category;
        if (!catId) return; // Skip the player name input

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

        // 1. Update local game state
        const result = game.constructBuilding(activeConstruction, r, c);

        // 2. Save new board to database, BUT DO NOT END TURN
        // (Use saveBoardOnly instead of commitTurn)
        multiplayer.saveBoardOnly();

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
        }

        resetConstructionState();
        renderAll();
        checkAndShowGameOver();
    }
}

function handleSwapClick() {
    // NEW: Pass specific text
    showResourcePicker(
        "Factory Swap",
        "Select the resource you want to use this turn:",
        async (newRes) => {
            const oldRes = game.currentResource;

            // 1. Update Game State
            game.currentResource = newRes;

            // 2. Feedback
            showToast(`Factory activated! Swapped ${oldRes} for ${newRes}.`, "success");

            // 3. Re-render
            renderAll();
        }
    );
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
    // --- FACTORY BUTTON LOGIC ---
    let showSwap = false;

    if (game.currentResource && !hasActedThisTurn) {
        const isMyTurn = multiplayer.masterBuilderId === multiplayer.playerId;
        const canSwap = game.canFactorySwap(game.currentResource);

        if (!isMyTurn && canSwap) {
            showSwap = true;
        }
    }
    renderer.toggleFactoryAction(showSwap, game.currentResource || '');

    // --- BANK LOGIC ---
    let forbiddenResources: any[] = [];
    const isMyTurn = multiplayer.masterBuilderId === multiplayer.playerId;
    
    // Only calculate forbidden resources if it is MY turn to pick
    // (If it's someone else's turn, my Bank doesn't stop me from receiving resources)
    if (isMyTurn && !game.currentResource) {
        forbiddenResources = game.getForbiddenResources();
    }

    // --- RENDER MAIN BOARD ---
    renderer.render(
        game,
        activeConstruction,
        activePatternCoords,
        multiplayerStatusMessage,
        forbiddenResources
    );
}

function checkAndShowGameOver() {
    // Only check if we haven't already finished
    if (!hasDeclaredGameOver && game.checkGameOver() && !activeConstruction) {

        // 1. Show the screen locally
        const result = game.getScore();
        elements.finalScore.textContent = result.total.toString();
        elements.scoreList.innerHTML = '';
        Object.entries(result.breakdown).forEach(([name, score]) => {
            if (score !== 0) addScoreListItem(name, score);
        });
        if (result.penaltyCount > 0) addScoreListItem('Empty Spaces', -result.penaltyCount, true);

        elements.gameOverModal.classList.remove('hidden');

        // 2. Tell the server "I am out"
        multiplayer.declareGameOver();
        hasDeclaredGameOver = true;

        // Disable interactions
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

// Reuse the Dropdown Initialization for the Host
function initHostDropdowns() {
    const container = document.getElementById('setup-container')!;
    container.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'setup-grid';

    BUILDING_CATEGORIES.forEach(cat => {
        const group = document.createElement('div');
        group.className = 'setup-group';
        const label = document.createElement('label');
        label.className = 'setup-label';
        label.textContent = cat.label;
        group.appendChild(label);

        const select = document.createElement('select');
        select.className = `setup-select ${cat.id}`;
        select.dataset.category = cat.id;
        const randOpt = document.createElement('option');
        randOpt.value = 'RANDOM';
        randOpt.textContent = `Random`;
        select.appendChild(randOpt);

        cat.options.forEach(b => {
            const opt = document.createElement('option');
            opt.value = b.name;
            opt.textContent = b.name;
            select.appendChild(opt);
        });

        group.appendChild(select);
        grid.appendChild(group);
    });
    container.appendChild(grid);
}

function togglePalette(enabled: boolean) {
    const palette = document.getElementById('resource-palette');
    if (!palette) return;

    if (enabled) {
        palette.style.opacity = "1";
        palette.style.pointerEvents = "auto";
    } else {
        palette.style.opacity = "0.5";
        palette.style.pointerEvents = "none";
    }
}

function renderLeaderboard(players: any) {
    elements.leaderboardList.innerHTML = '';

    // Convert to array and Sort by Score (Descending)
    const sorted = Object.values(players).sort((a: any, b: any) => b.score - a.score);

    sorted.forEach((p: any, index) => {
        const li = document.createElement('li');
        li.className = 'leaderboard-row';

        // Highlight 1st place
        if (index === 0) li.classList.add('winner');

        // Calculate Rank (1, 2, 3...)
        const rank = index + 1;

        li.innerHTML = `
            <div style="display:flex; align-items:center;">
                <div class="rank-badge">${rank}</div>
                <div class="player-info">
                    <span class="player-name">${p.name}</span>
                    <span class="player-details">
                        ${p.isGameOver ? "Finished" : "Playing"} 
                    </span>
                </div>
            </div>
            <div class="final-total">${p.score}</div>
        `;

        elements.leaderboardList.appendChild(li);
    });
}

function showToast(message: string, type: 'info' | 'error' | 'success' = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const div = document.createElement('div');
    div.className = `toast ${type}`;
    div.textContent = message;

    container.appendChild(div);

    // Remove from DOM after animation finishes (4s total)
    setTimeout(() => {
        div.remove();
    }, 4000);
}

function renderOpponents(players: any, currentRound: number) {
    // 1. Reveal Sidebar
    elements.opponentsSidebar.classList.remove('hidden');
    elements.opponentsList.innerHTML = '';

    // 2. Loop through all players
    Object.keys(players).forEach(key => {
        // Skip myself
        if (key === multiplayer.playerId) return;

        const p = players[key];

        // Determine Status (Green dot if they are done with this round)
        const isDone = (p.placedRound === currentRound) || p.isGameOver;
        const statusClass = isDone ? "done" : "thinking";

        // Create Card HTML
        const card = document.createElement('div');
        card.className = 'opponent-card';

        // Header
        const header = document.createElement('div');
        header.className = 'opponent-name';
        header.innerHTML = `
            ${p.name}
            <span class="status-dot ${statusClass}" title="${isDone ? 'Waiting' : 'Thinking'}"></span>
        `;
        card.appendChild(header);

        // Grid Container
        const gridDiv = document.createElement('div');
        gridDiv.className = 'mini-board';

        // 3. Render 4x4 Grid
        // Firebase stores board as: [['NONE','WOOD',...],['NONE',...]]
        if (p.board && Array.isArray(p.board)) {
            p.board.forEach((row: string[]) => {
                row.forEach((cell: string) => {
                    const div = document.createElement('div');
                    div.className = 'mini-cell';

                    if (cell !== 'NONE') {
                        // Check if it is a Resource
                        if (['WOOD', 'WHEAT', 'BRICK', 'GLASS', 'STONE'].includes(cell)) {
                            div.classList.add(cell);
                        } else {
                            // IT IS A BUILDING

                            // 1. Add the specific name (e.g., "COTTAGE", "FARM")
                            // This allows the CSS to find the right icon/color
                            div.classList.add(cell);

                            // 2. Add tooltip for hovering
                            div.title = cell;

                            // 3. Handle Monument Styling (Optional but good)
                            // If it's not a standard resource or standard building, assume it's a monument
                            const standard = [
                                'COTTAGE', 'FARM', 'GRANARY', 'GREENHOUSE', 'ORCHARD',
                                'WELL', 'FOUNTAIN', 'MILLSTONE', 'SHED',
                                'CHAPEL', 'ABBEY', 'CLOISTER', 'TEMPLE',
                                'TAVERN', 'ALMSHOUSE', 'INN', 'FEAST-HALL',
                                'THEATER', 'BAKERY', 'TAILOR', 'MARKET',
                                'FACTORY', 'BANK', 'WAREHOUSE', 'TRADING-POST'
                            ];

                            if (!standard.includes(cell)) {
                                div.classList.add('MONUMENT');
                            }
                        }
                    }
                    gridDiv.appendChild(div);
                });
            });
        }

        card.appendChild(gridDiv);
        elements.opponentsList.appendChild(card);
    });
}


function showResourcePicker(
    title: string,
    message: string,
    callback: (res: ResourceType) => void,
    excludedResources: string[] = []
) {
    const modal = document.getElementById('resource-picker-modal')!;
    const titleEl = document.getElementById('picker-title')!;
    const msgEl = document.getElementById('picker-message')!;
    const container = document.getElementById('picker-options')!;

    // Set dynamic text
    titleEl.textContent = title;
    msgEl.textContent = message;

    container.innerHTML = '';
    const resources: ResourceType[] = ['WOOD', 'WHEAT', 'BRICK', 'GLASS', 'STONE'];

    resources.forEach(res => {
        if (excludedResources.includes(res)) return;
        const btn = document.createElement('div');
        btn.className = `res-btn ${res}`;
        btn.onclick = () => {
            modal.classList.add('hidden');
            callback(res);
        };
        container.appendChild(btn);
    });

    modal.classList.remove('hidden');
}

// --- 6. AUTO-JOIN VIA URL ---
(function checkUrlForInvite() {
    const params = new URLSearchParams(window.location.search);
    const inviteCode = params.get('gameId');

    if (inviteCode) {
        console.log("Invite code detected:", inviteCode);

        // 1. Pre-fill the Join Input
        elements.gameIdInput.value = inviteCode;

        // 2. Visually expand the "Join Game" section (if you had a toggle)
        // Since your UI seems to show both inputs on the landing page, 
        // we just focus the Name input so they can type immediately.
        elements.playerNameInput.focus();

        // 3. Optional: Add a visual cue
        showToast(`Invite code ${inviteCode} detected! Enter your name to join.`, "success");

        // If you wanted to get fancy, you could hide the "Create Game" button here
        // so it looks like a dedicated join screen.
        elements.createGameBtn.parentElement?.classList.add('hidden'); // Hides the create/host container if they are separate
    }
})();

function handleWarehouseClick(r: number, c: number) {
    if (hasActedThisTurn) return;
    if (!game.currentResource) return; // Can't interact if Master Builder hasn't spoken

    const contents = game.getWarehouseContents(r, c);
    const canStore = contents.length < 3;
    const currentRes = game.currentResource;

    // Reuse the picker modal structure
    const modal = document.getElementById('resource-picker-modal')!;
    const container = document.getElementById('picker-options')!;
    const title = document.getElementById('picker-title')!;
    const msg = document.getElementById('picker-message')!;

    title.textContent = "Warehouse Manager";
    msg.textContent = `Current Resource: ${currentRes}`;
    container.innerHTML = '';

    // --- OPTION 1: STORE (Only if space exists) ---
    if (canStore) {
        const btn = document.createElement('button');
        btn.className = `primary-btn`;
        btn.style.width = "100%";
        btn.style.marginBottom = "20px";
        btn.innerHTML = `📥 <strong>Store ${currentRes}</strong> <br><span style="font-size:0.8em; font-weight:normal">(Ends Turn)</span>`;
        btn.onclick = () => {
            game.storeInWarehouse(r, c, currentRes);
            commitWarehouseAction(true); // TRUE = End Turn
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

    // --- OPTION 2: SWAP (Only if items exist) ---
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
                // 1. Perform Swap
                const poppedRes = game.swapInWarehouse(r, c, idx, currentRes);
                
                if (poppedRes) {
                    // 2. Update local Hand
                    game.currentResource = poppedRes;
                    
                    showToast(`Swapped! Place ${poppedRes} on the board.`, "success");
                    
                    // 3. Save Warehouse State (Turn continues)
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
            await multiplayer.commitTurn(); // Done.
        } else {
            await multiplayer.saveBoardOnly(); // Just save the warehouse contents
        }
        renderAll();
        checkAndShowGameOver(); 
    } catch (e) {
        showToast("Error saving warehouse: " + e, "error");
    }
}