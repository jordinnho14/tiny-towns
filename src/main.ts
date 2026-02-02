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

// When the server says "Here is the new state", we update the screen
multiplayer.onStateChange = (data) => {
    try {
        if (data.status === 'LOBBY') {
            renderLobbyList(data.players);
        }
        
        if (data.status === 'PLAYING') {
            if (!elements.startModal.classList.contains('hidden')) {
                elements.startModal.classList.add('hidden');
                renderer.renderDeck(game.gameRegistry);
            }

            // --- CALCULATE STATUS MESSAGE ---
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
            const resourceSelected = !!data.currentResource;
            const myStatus = data.players ? data.players[multiplayer.playerId] : null;

            // 1. Nomination Phase (No resource selected yet)
            if (!resourceSelected) {
                if (isMyTurn) {
                    multiplayerStatusMessage = "YOU are the Master Builder! Choose a resource.";
                    togglePalette(true);
                } else {
                    multiplayerStatusMessage = `Waiting for ${masterName} to choose a resource...`;
                    togglePalette(false);
                }
            } 
            // 2. Placement Phase (Resource IS selected)
            else {
                if (myStatus && myStatus.hasPlaced) {
                    multiplayerStatusMessage = "Waiting for other players to finish placing...";
                    togglePalette(false);
                } else {
                    // We return "" (empty string) so the Renderer uses its default: "Place WOOD..."
                    multiplayerStatusMessage = ""; 
                    togglePalette(false); 
                }
            }

            // Sync and Render
            game.currentResource = data.currentResource;
            renderAll();
        }
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
        alert((e as Error).message);
    }
};

async function handleResourceClick(r: number, c: number) {
    if (!game.currentResource) {
        // Should be blocked by UI, but good safety check
        alert("Waiting for Master Builder...");
        return;
    }
    
    // 1. Update Local Board
    try {
        game.placeResource(r, c);
    } catch (e) {
        alert((e as Error).message);
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
    alert("Undo not yet supported in Multiplayer!");
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
        alert("Error creating game. Check console for details.");
    }
};

elements.joinGameBtn.onclick = async () => {
    const name = elements.playerNameInput.value || "Guest";
    const gameId = elements.gameIdInput.value.trim();
    if (!gameId) return alert("Please enter a code!");

    try {
        await multiplayer.joinGame(gameId, name);
        enterLobbyMode(gameId, false);
    } catch (e) {
        alert("Could not join game: " + e);
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
    alert("Code copied!");
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

// ... Reuse your existing helper functions ...
// (handleConstructionClick, resetConstructionState, etc.)
// COPY PASTE YOUR EXISTING HELPERS HERE OR KEEP THEM IF YOU EDITED THE FILE PARTIALLY
// For safety, I'll include the critical ones below:

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
            alert("Cannot build on Trading Post.");
            return;
        }
        game.constructBuilding(activeConstruction, r, c);
        
        // IMPORTANT: SYNC AFTER BUILDING
        multiplayer.commitTurn(); 

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
    if (game.checkGameOver() && !activeConstruction) {
        const result = game.getScore();
        elements.finalScore.textContent = result.total.toString();
        elements.scoreList.innerHTML = '';
        Object.entries(result.breakdown).forEach(([name, score]) => {
            if (score !== 0) addScoreListItem(name, score);
        });
        if (result.penaltyCount > 0) addScoreListItem('Empty Spaces', -result.penaltyCount, true);
        elements.gameOverModal.classList.remove('hidden');
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

// STARTUP
// We do NOT call game.start() here. We wait for the user to Create or Join.