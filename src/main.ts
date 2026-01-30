import { 
    COTTAGE, // Blue is usually fixed (or you can pick from BLUE_BUILDINGS)
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

// --- 1. INITIALIZATION ---
const game = new Game();
const renderer = new Renderer();

// UI State
let activeConstruction: any | null = null;
let activePatternCoords: { row: number, col: number }[] = [];

// DOM Elements
const elements = {
    startModal: document.getElementById('start-screen-modal')!,
    startBtn: document.getElementById('start-game-btn')!,
    restartBtn: document.getElementById('restart-btn')!,
    undoBtn: document.getElementById('undo-btn')!,
    monumentGrid: document.getElementById('monument-pattern-grid')!,
    monumentSelect: document.getElementById('monument-selector') as HTMLSelectElement,
    monumentDesc: document.getElementById('monument-desc')!,
    gameOverModal: document.getElementById('game-over-modal')!,
    finalScore: document.getElementById('final-score')!,
    scoreList: document.getElementById('score-breakdown-list')!
};

// --- 2. EVENT HANDLERS ---

renderer.onResourceSelect = (res) => {
    if (!activeConstruction) {
        game.currentResource = res as any;
        renderAll();
    }
};

renderer.onBuildClick = (match) => {
    activeConstruction = match;
    activePatternCoords = getPatternCoords(match);
    renderAll();
};

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

renderer.onCancelClick = () => {
    resetConstructionState();
    renderAll();
};

elements.undoBtn.onclick = () => {
    game.undo();
    renderAll();
};

// --- UPDATED START LOGIC ---
elements.startBtn.onclick = () => {
    // 1. Create the Deck
    const deck = [];

    // Always add the Cottage (Blue)
    deck.push(COTTAGE);

    // Pick 1 Random Building for each other color
    // (Helper function defined at bottom)
    deck.push(pickRandom(RED_BUILDINGS));     // Farm OR Granary
    deck.push(pickRandom(GRAY_BUILDINGS));    // Well (or others later)
    deck.push(pickRandom(YELLOW_BUILDINGS));  // Theater (or others later)
    deck.push(pickRandom(GREEN_BUILDINGS));   // Tavern
    deck.push(pickRandom(BLACK_BUILDINGS));   // Factory
    deck.push(pickRandom(ORANGE_BUILDINGS));  // Chapel

    // Add the selected Monument
    if (game.activeMonument) {
        deck.push(game.activeMonument);
    } else {
        // Fallback if something went wrong
        console.warn("No monument selected, picking random.");
        const monuments = BUILDING_REGISTRY.filter(b => b.isMonument);
        deck.push(monuments[0]);
    }

    // 2. Assign to Game
    game.gameRegistry = deck;
    
    // 3. Start
    game.start();
    elements.startModal.classList.add('hidden');
    renderAll();
    
    // 4. Update Sidebar with specific cards
    renderer.renderDeck(game.gameRegistry);
};

elements.restartBtn.onclick = () => {
    elements.gameOverModal.classList.add('hidden');
    initLobby();
};


// --- 3. GAME LOGIC HELPERS ---

function handleConstructionClick(r: number, c: number) {
    const isPatternSpot = activePatternCoords.some(p => p.row === r && p.col === c);
    const isObeliskSpot = game.hasObeliskAbility() && game.board.getGrid()[r][c] === 'NONE';

    if (isPatternSpot || isObeliskSpot) {
        game.constructBuilding(activeConstruction, r, c);
        resetConstructionState();
        renderAll();
        checkAndShowGameOver();
    }
}

function handleResourceClick(r: number, c: number) {
    if (!game.currentResource) {
        alert("Select a resource first!");
        return;
    }
    game.placeResource(r, c);
    renderAll();
    checkAndShowGameOver();
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
    if (!list || list.length === 0) throw new Error("Empty building list!");
    return list[Math.floor(Math.random() * list.length)];
}


// --- 4. UI HELPERS ---

function renderAll() {
    renderer.render(game, activeConstruction, activePatternCoords);
}

function initLobby() {
    const MONUMENTS = BUILDING_REGISTRY.filter(b => b.isMonument);
    
    elements.monumentSelect.innerHTML = '';
    MONUMENTS.forEach((m, index) => {
        const option = document.createElement('option');
        option.value = index.toString();
        option.textContent = m.name;
        elements.monumentSelect.appendChild(option);
    });

    elements.monumentSelect.onchange = () => {
        const selected = MONUMENTS[parseInt(elements.monumentSelect.value)];
        game.activeMonument = selected;
        updateMonumentPreview(selected);
    };

    // Pick random initial monument
    const initialIndex = Math.floor(Math.random() * MONUMENTS.length);
    elements.monumentSelect.value = initialIndex.toString();
    elements.monumentSelect.onchange(null as any); 

    elements.startModal.classList.remove('hidden');
}

function updateMonumentPreview(monument: any) {
    elements.monumentSelect.className = `monument-select ${monument.name.toUpperCase()}`; // Color coding
    
    const descriptions: Record<string, string> = {
        'Archive': "1pt for every unique building type.",
        'Barrett Castle': "Feeds 2 cottages. Worth 5pts.",
        'Mandras': "2pts per unique adjacent neighbor.",
        'Obelisk of the Crescent': "ABILITY: Can place buildings anywhere.",
        'Shrine of the Elder Tree': "Score depends on when you build it (1-8pts).",
        'Baths': "2pts for every building type NOT in your town.",
        'Forum': "1pt + size of largest group of identical buildings.",
        'Mausoleum': "Unfed cottages score 3pts.",
        'Cathedral': "2pts. Empty spaces are worth 0."
    };
    
    elements.monumentDesc.textContent = descriptions[monument.name] || "A unique monument.";
    renderMonumentPattern(monument);
}

function renderMonumentPattern(building: any) {
    elements.monumentGrid.innerHTML = '';
    const pattern = building.pattern; 
    elements.monumentGrid.style.gridTemplateColumns = `repeat(${pattern[0].length}, 30px)`;

    pattern.forEach((row: any[]) => {
        row.forEach((cell: string) => {
            const div = document.createElement('div');
            div.className = `mini-cell ${cell}`;
            elements.monumentGrid.appendChild(div);
        });
    });
}

function checkAndShowGameOver() {
    if (game.checkGameOver() && !activeConstruction) {
        const result = game.getScore();
        
        elements.finalScore.textContent = result.total.toString();
        elements.scoreList.innerHTML = '';

        for (const [name, score] of Object.entries(result.breakdown)) {
            if (score === 0) continue;
            addScoreListItem(name, score);
        }

        if (result.penaltyCount > 0) {
            addScoreListItem('Empty Spaces', -result.penaltyCount, true);
        }

        elements.gameOverModal.classList.remove('hidden');
    }
}

function addScoreListItem(label: string, score: number, isPenalty: boolean = false) {
    const li = document.createElement('li');
    li.className = 'score-item';
    if (isPenalty) li.classList.add('penalty-text');
    
    li.style.display = 'flex';
    li.style.justifyContent = 'space-between';
    li.style.marginBottom = '5px';
    if (isPenalty) {
        li.style.color = '#ef5350';
        li.style.marginTop = '10px';
        li.style.borderTop = '1px solid #eee';
        li.style.paddingTop = '5px';
    }

    li.innerHTML = `
        <span style="text-transform: capitalize;">${label.toLowerCase()}</span>
        <strong>${score}</strong>
    `;
    elements.scoreList.appendChild(li);
}

// --- 5. START ---
// PROD MODE: Logic moved inside startBtn.onclick, 
// so we just init the lobby here.
initLobby();