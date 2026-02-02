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
    monumentDesc: document.getElementById('monument-desc')!,
    gameOverModal: document.getElementById('game-over-modal')!,
    finalScore: document.getElementById('final-score')!,
    scoreList: document.getElementById('score-breakdown-list')!
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

// --- 3. START GAME LOGIC (UPDATED) ---

elements.startBtn.onclick = () => {
    const deck: any[] = [];

    // 1. Always Cottage
    deck.push(COTTAGE);

    // 2. Read selections from the DOM
    const selects = document.querySelectorAll('.setup-select') as NodeListOf<HTMLSelectElement>;
    
    selects.forEach(select => {
        const catId = select.dataset.category;
        const config = BUILDING_CATEGORIES.find(c => c.id === catId);
        if (!config) return;

        let selectedBuilding;

        if (select.value === 'RANDOM') {
            selectedBuilding = pickRandom(config.options);
        } else {
            selectedBuilding = config.options.find(b => b.name === select.value);
        }

        if (selectedBuilding) {
            deck.push(selectedBuilding);
            // If it is the monument, inform the game
            if (config.id === 'PURPLE') {
                game.activeMonument = selectedBuilding;
            }
        }
    });

    game.gameRegistry = deck;
    
    game.start();
    elements.startModal.classList.add('hidden');
    renderAll();
    renderer.renderDeck(game.gameRegistry);
};

elements.restartBtn.onclick = () => {
    elements.gameOverModal.classList.add('hidden');
    initLobby();
};


// --- 4. INIT LOBBY (UPDATED) ---

function initLobby() {
    const container = document.getElementById('setup-container')!;
    if (!container) return; // Safety check
    
    container.innerHTML = ''; 

    const grid = document.createElement('div');
    grid.className = 'setup-grid';

    BUILDING_CATEGORIES.forEach(cat => {
        // Container
        const group = document.createElement('div');
        group.className = 'setup-group';

        // Label
        const label = document.createElement('label');
        label.className = 'setup-label';
        label.textContent = cat.label;
        group.appendChild(label);

        // Select
        const select = document.createElement('select');
        select.className = `setup-select ${cat.id}`;
        select.dataset.category = cat.id;

        // "Random" Option
        const randOpt = document.createElement('option');
        randOpt.value = 'RANDOM';
        randOpt.textContent = `Random ${cat.label.split(' ')[0]}`;
        select.appendChild(randOpt);

        // Specific Options
        cat.options.forEach(b => {
            const opt = document.createElement('option');
            opt.value = b.name;
            opt.textContent = b.name;
            select.appendChild(opt);
        });

        // Special logic for Monument Preview
        if (cat.id === 'PURPLE') {
            select.onchange = () => {
                const val = select.value;
                if (val === 'RANDOM') {
                    elements.monumentDesc.textContent = "A random monument will be chosen.";
                    elements.monumentGrid.innerHTML = '';
                } else {
                    const mon = cat.options.find(b => b.name === val);
                    if (mon) updateMonumentPreview(mon);
                }
            };
        }

        group.appendChild(select);
        grid.appendChild(group);
    });

    container.appendChild(grid);
    
    // Reset Texts
    elements.monumentDesc.textContent = "Customize your town or leave as Random.";
    elements.monumentGrid.innerHTML = '';

    elements.startModal.classList.remove('hidden');
}


// --- 5. GAME LOGIC HELPERS ---

function handleConstructionClick(r: number, c: number) {
    const grid = game.board.getGrid();
    const cellContent = grid[r][c];
    
    // 1. Define Valid Targets
    const isPatternSpot = activePatternCoords.some(p => p.row === r && p.col === c);
    
    // Normalize name
    const buildName = activeConstruction ? activeConstruction.buildingName.toUpperCase() : '';
    
    // Ability Checks
    const isObelisk = game.hasObeliskAbility();
    const isShed = buildName === 'SHED';
    
    // Valid if it's a global ability AND the target is empty
    const isGlobalTarget = (isObelisk || isShed) && cellContent === 'NONE';

    // 2. The Interaction Logic
    if (isPatternSpot || isGlobalTarget) {
        
        // --- TRADING POST PROTECTION ---
        if (cellContent && (cellContent as string).toUpperCase().replace('_', ' ') === 'TRADING POST') {
            alert("You cannot build directly on top of a Trading Post. Please select one of the consumable resource squares or an empty square.");
            return;
        }

        // 3. Build it
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


// --- 6. UI HELPERS ---

function renderAll() {
    renderer.render(game, activeConstruction, activePatternCoords);
}

function updateMonumentPreview(monument: any) {
    // Note: We don't change the select class anymore as it has its own fixed border style
    
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
    
    elements.monumentDesc.textContent = monument.description || descriptions[monument.name] || "A unique monument.";
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

// --- 7. START ---
initLobby();