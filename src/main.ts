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

async function handleResourceClick(r: number, c: number) {
    if (hasActedThisTurn) {
        showToast("You have already placed a resource this turn! Wait for others.", "error");
        return;
    }


    if (!game.currentResource) {
        // Should be blocked by UI, but good safety check
        showToast("Waiting for Master Builder...", "info");
        return;
    }
    
    // 1. Update Local Board
    try {
        game.placeResource(r, c);
    } catch (e) {
        showToast((e as Error).message, "error");
        return;
    }
    
    // 2. Send Update to Server (Sets hasPlaced = true)
    await multiplayer.commitTurn();

    renderAll();
    // checkAndShowGameOver(); // Optional: move this inside renderAll or keep here
    checkAndShowGameOver();
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


// --- 5. HELPERS ---

function enterLobbyMode(gameId: string, isHost: boolean) {
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
        game.constructBuilding(activeConstruction, r, c);
        
        // 2. Save new board to database, BUT DO NOT END TURN
        // (Use saveBoardOnly instead of commitTurn)
        multiplayer.saveBoardOnly(); 

        resetConstructionState();
        renderAll();
        checkAndShowGameOver();
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
    renderer.render(game, activeConstruction, activePatternCoords, multiplayerStatusMessage);
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