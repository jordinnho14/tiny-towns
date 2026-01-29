import { BUILDING_REGISTRY } from './core/Buildings';
import { Game } from './core/Game';
import { Renderer } from './ui/Renderer';

// 1. Initialize System
const game = new Game();
const renderer = new Renderer();

// 2. Local UI State (Things that don't belong in the core Game logic)
let activeConstruction: any | null = null;
let activePatternCoords: { row: number, col: number }[] = [];

// 3. Setup Start Screen & Events
const startModal = document.getElementById('start-screen-modal')!;
const startBtn = document.getElementById('start-game-btn')!;
const restartBtn = document.getElementById('restart-btn')!;
const undoBtn = document.getElementById('undo-btn')!;
const monumentGridEl = document.getElementById('monument-pattern-grid')!;
const monumentSelectEl = document.getElementById('monument-selector') as HTMLSelectElement;
const monumentDescEl = document.getElementById('monument-desc')!;

// 4. Wire up Renderer Callbacks
renderer.onResourceSelect = (res) => {
    if (!activeConstruction) {
        game.currentResource = res as any; // Cast if needed
        renderAll();
    }
};

renderer.onBuildClick = (match) => {
    activeConstruction = match;
    activePatternCoords = getPatternCoords(match);
    renderAll();
};

renderer.onCellClick = (r, c) => {
    // A. Construction Mode
    if (activeConstruction) {
        const isPatternSpot = activePatternCoords.some(p => p.row === r && p.col === c);
        const isObeliskSpot = game.hasObeliskAbility() && game.board.getGrid()[r][c] === 'NONE';
        if (isPatternSpot || isObeliskSpot) {
            try {
                // Perform build on board
                game.constructBuilding(activeConstruction, r, c);
                
                // Clear UI state
                activeConstruction = null;
                activePatternCoords = [];
                
                renderAll();
                checkGameOver();
            } catch (e) { alert((e as Error).message); }
        }
        return;
    }

    // B. Resource Placement
    if (!game.currentResource) {
        alert("Select a resource first!");
        return;
    }

    try {
        game.placeResource(r, c);
        renderAll();
        checkGameOver();
    } catch (e) { alert((e as Error).message); }
};

renderer.onCancelClick = () => {
    activeConstruction = null;
    activePatternCoords = [];
    renderAll();
};

// 5. Button Listeners
undoBtn.onclick = () => {
    game.undo();
    renderAll();
};

startBtn.onclick = () => {
    const REGULAR_BUILDINGS = BUILDING_REGISTRY.filter(b => !b.isMonument);
    game.gameRegistry = [...REGULAR_BUILDINGS, game.activeMonument];
    game.start();
    startModal.classList.add('hidden');
    renderAll();
};

restartBtn.onclick = () => {
    document.getElementById('game-over-modal')!.classList.add('hidden');
    initLobby();
};

// 6. Helpers
function renderAll() {
    renderer.render(game, activeConstruction, activePatternCoords);
}

function initLobby() {
    // 1. Get all Monuments
    const MONUMENTS = BUILDING_REGISTRY.filter(b => b.isMonument);
    
    // 2. Populate the Dropdown
    monumentSelectEl.innerHTML = '';
    MONUMENTS.forEach((m, index) => {
        const option = document.createElement('option');
        option.value = index.toString(); // Use index to look it up later
        option.textContent = m.name;
        monumentSelectEl.appendChild(option);
    });

    // 3. Handle Selection Change
    monumentSelectEl.onchange = () => {
        const selectedIndex = parseInt(monumentSelectEl.value);
        const selectedMonument = MONUMENTS[selectedIndex];
        
        // Update Game State PREVIEW (we lock it in when clicking Start)
        game.activeMonument = selectedMonument; 
        
        // Update UI
        updateMonumentPreview(selectedMonument);
    };

    // 4. Initialize with the first one (or random if you prefer)
    // Let's default to the first one for consistency, or random:
    const initialIndex = Math.floor(Math.random() * MONUMENTS.length);
    monumentSelectEl.value = initialIndex.toString();
    
    // Trigger the update manually once
    monumentSelectEl.onchange(null as any);

    startModal.classList.remove('hidden');
}

function updateMonumentPreview(monument: any) {
    // Update Class for color styling (e.g. .BARRETT, .OBELISK)
    monumentSelectEl.className = `monument-select ${monument.name.toUpperCase()}`;

    // Update Description
    if (monument.name === 'Archive') monumentDescEl.textContent = "1pt for every unique building type.";
    else if (monument.name === 'Barrett Castle') monumentDescEl.textContent = "Feeds 2 cottages. Worth 5pts.";
    else if (monument.name === 'Mandras') monumentDescEl.textContent = "2pts per unique adjacent neighbor.";
    else if (monument.name === 'Caterina') monumentDescEl.textContent = "Empty spaces are worth +1 instead of -1.";
    else if (monument.name === 'Obelisk of the Crescent') monumentDescEl.textContent = "ABILITY: Can place buildings anywhere.";
    else monumentDescEl.textContent = "A unique monument.";

    // Update Grid
    renderMonumentPattern(monument);
}

function renderMonumentPattern(building: any) {
    monumentGridEl.innerHTML = '';
    const pattern = building.pattern; 
    const width = pattern[0].length;
    monumentGridEl.style.gridTemplateColumns = `repeat(${width}, 30px)`;

    pattern.forEach((row: any[]) => {
        row.forEach((cell: string) => {
            const div = document.createElement('div');
            div.className = `mini-cell ${cell}`;
            monumentGridEl.appendChild(div);
        });
    });
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

function checkGameOver() {
    // 1. Verify Game End Condition
    if (game.checkGameOver() && !activeConstruction) {
        
        // 2. Calculate Final Scores
        const result = game.getScore();
        
        // 3. Get DOM Elements
        const modal = document.getElementById('game-over-modal');
        const finalScoreEl = document.getElementById('final-score');
        const listEl = document.getElementById('score-breakdown-list');

        if (modal && finalScoreEl && listEl) {
            // A. Set Big Score
            finalScoreEl.textContent = result.total.toString();

            // B. Build the Breakdown List
            listEl.innerHTML = ''; // Clear previous entries

            // Add standard buildings
            for (const [name, score] of Object.entries(result.breakdown)) {
                if (score === 0) continue; // Optional: Hide things worth 0

                const li = document.createElement('li');
                // Simple inline flex for alignment
                li.style.display = 'flex';
                li.style.justifyContent = 'space-between';
                li.style.marginBottom = '5px';
                
                // Format: "Cottage ...... 12"
                li.innerHTML = `
                    <span style="text-transform: capitalize;">${name.toLowerCase()}</span>
                    <strong>${score}</strong>
                `;
                listEl.appendChild(li);
            }

            // Add Penalties (Red text)
            if (result.penaltyCount > 0) {
                const li = document.createElement('li');
                li.style.display = 'flex';
                li.style.justifyContent = 'space-between';
                li.style.color = '#ef5350'; // Red
                li.style.marginTop = '10px';
                li.style.borderTop = '1px solid #eee';
                li.style.paddingTop = '5px';

                li.innerHTML = `
                    <span>Empty Spaces</span>
                    <strong>-${result.penaltyCount}</strong>
                `;
                listEl.appendChild(li);
            }

            // C. Show the Modal
            modal.classList.remove('hidden');
        }
    }
}

// Start
initLobby();