import { Game } from '../core/Game';
import { Resource } from '../core/Types';

export class Renderer {
    private boardEl = document.getElementById('board')!;
    private buildMenuEl = document.getElementById('build-menu')!;
    private msgLabel = document.getElementById('message')!;
    private paletteEl = document.getElementById('resource-palette')!;
    private scoreEl = document.getElementById('score-display')!;
    private undoBtn = document.getElementById('undo-btn') as HTMLButtonElement;
    private deckDisplayEl = document.getElementById('deck-display'); // For the sidebar cards

    // Callbacks for interaction
    public onCellClick: (r: number, c: number) => void = () => {};
    public onResourceSelect: (res: string) => void = () => {};
    public onBuildClick: (match: any) => void = () => {};
    public onCancelClick: () => void = () => {};

    constructor() {}

    render(game: Game, activeConstruction: any | null, highlightCoords: any[]) {
        this.renderHeader(game);
        this.renderBoard(game, activeConstruction, highlightCoords);
        this.renderSidebar(game, activeConstruction);
        this.renderControls(game, activeConstruction);
    }

    // --- 1. HEADER ---
    private renderHeader(game: Game) {
        const score = game.getScore();
        const positive = score.total + score.penaltyCount;
        this.scoreEl.innerHTML = `Score: ${positive} <span style="font-size:12px; color:#999">(-${score.penaltyCount} empty)</span>`;
    }

    // --- 2. BOARD (The Smart Version) ---
    private renderBoard(game: Game, activeConstruction: any | null, highlightCoords: any[]) {
        const hasObelisk = game.hasObeliskAbility();
        const grid = game.board.getGrid();

        // PHASE A: INITIALIZATION (Run only once)
        if (this.boardEl.children.length === 0) {
            grid.forEach((row, r) => {
                row.forEach((_, c) => {
                    const div = document.createElement('div');
                    div.dataset.r = r.toString();
                    div.dataset.c = c.toString();
                    div.onclick = () => this.onCellClick(r, c);
                    this.boardEl.appendChild(div);
                });
            });
        }

        // PHASE B: UPDATE (Run every render)
        const domCells = Array.from(this.boardEl.children) as HTMLElement[];
        
        // Define what counts as a resource (vs a building)
        const RESOURCES = ['WOOD', 'WHEAT', 'BRICK', 'GLASS', 'STONE'];

        domCells.forEach(div => {
            const r = parseInt(div.dataset.r!);
            const c = parseInt(div.dataset.c!);
            const cell = grid[r][c];

            // 1. Determine Class Name
            const safeName = cell.replace(/ /g, '-').replace(/'/g, '').toUpperCase();
            let className = `cell ${cell === 'NONE' ? 'empty' : safeName}`;
            
            if (activeConstruction) {
                const isPatternPart = highlightCoords.some(p => p.row === r && p.col === c);
                const isObeliskTarget = hasObelisk && cell === 'NONE';
                if (isPatternPart || isObeliskTarget) {
                    className += ' match-highlight';
                }
            }

            // 2. IMPORTANT: Only update DOM if something changed! 
            if (div.className !== className) {
                div.className = className;
                
                // <--- CHANGED THIS SECTION ------------------------
                if (cell === 'NONE') {
                    // Empty square: show coordinates
                    div.textContent = `${r},${c}`;
                    div.style.color = '';
                } 
                else if (RESOURCES.includes(cell)) {
                    // Resource: Show the name (or just first letter like cell.charAt(0))
                    div.textContent = cell; 
                    div.style.color = '';
                } 
                else {
                    // Building: REMOVE text so the background image shows!
                    div.textContent = ''; 
                    div.style.color = '';
                }
                // --------------------------------------------------
            }

            // 3. Ghost Logic
            if (cell === 'NONE' && game.currentResource && !activeConstruction) {
                 div.onmouseenter = () => {
                    div.classList.add('ghost', game.currentResource!);
                    div.textContent = ''; // clear coords when ghosting
                 };
                 div.onmouseleave = () => {
                    div.classList.remove('ghost', 'WOOD', 'WHEAT', 'BRICK', 'GLASS', 'STONE');
                    div.textContent = `${r},${c}`; // put coords back
                 };
            } else {
                div.onmouseenter = null;
                div.onmouseleave = null;
            }
        });

        // Message Logic (Kept the same)
        if (activeConstruction) {
            this.msgLabel.textContent = `Select a highlighted square to build your ${activeConstruction.buildingName}!`;
            this.msgLabel.style.color = "#d32f2f"; 
        } else if (game.availableMatches.length > 0) {
            this.msgLabel.textContent = "Matches available!";
            this.msgLabel.style.color = "#333";
        } else if (!game.currentResource) {
            this.msgLabel.textContent = "Select a Resource...";
            this.msgLabel.style.color = "#1976d2";
        } else {
            this.msgLabel.textContent = `Place ${game.currentResource}...`;
            this.msgLabel.style.color = "#333";
        }
    }

    // --- 3. SIDEBAR (Build Menu) ---
    private renderSidebar(game: Game, activeConstruction: any | null) {
        this.buildMenuEl.innerHTML = '';
        
        // Render Matches
        if (game.availableMatches.length === 0) {
            const p = document.createElement('p');
            p.textContent = 'No patterns found.';
            p.style.color = '#777';
            p.style.fontStyle = 'italic';
            this.buildMenuEl.appendChild(p);
        } else {
            game.availableMatches.forEach(match => {
                const btn = document.createElement('button');
                btn.textContent = `Build ${match.buildingName}`;
                // Add coords for clarity:
                const coordSpan = document.createElement('span');
                coordSpan.textContent = ` (${match.row},${match.col})`;
                coordSpan.style.fontSize = '0.8em';
                btn.appendChild(coordSpan);

                const safeClass = match.buildingName.replace(/ /g, '-').replace(/'/g, '').toUpperCase();
                btn.className = `build-btn ${safeClass}`;
                btn.onclick = () => this.onBuildClick(match);
                this.buildMenuEl.appendChild(btn);
            });
        }

        // Render Cancel Button
        if (activeConstruction) {
            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = "Cancel Construction";
            cancelBtn.className = "secondary-btn";
            cancelBtn.style.marginTop = "10px";
            cancelBtn.style.width = "100%";
            cancelBtn.onclick = () => this.onCancelClick();
            this.buildMenuEl.appendChild(cancelBtn);
        }
    }

    // --- 4. CONTROLS (Palette) ---
    private renderControls(game: Game, activeConstruction: any | null) {
        this.paletteEl.innerHTML = '';
        const list = [Resource.WOOD, Resource.WHEAT, Resource.BRICK, Resource.GLASS, Resource.STONE];

        list.forEach(res => {
            const btn = document.createElement('div');
            let className = `res-btn ${res}`;
            if (game.currentResource === res && !activeConstruction) className += ' selected';
            
            btn.className = className;
            btn.textContent = res.charAt(0);
            btn.onclick = () => this.onResourceSelect(res);
            this.paletteEl.appendChild(btn);
        });

        // Undo Button State
        if (game.canUndo() && !activeConstruction) {
            this.undoBtn.removeAttribute('disabled');
        } else {
            this.undoBtn.setAttribute('disabled', 'true');
        }
    }

    // --- 5. DECK DISPLAY (New Feature) ---
    public renderDeck(registry: any[]) {
        if (!this.deckDisplayEl) return;
        this.deckDisplayEl.innerHTML = '';

        registry.forEach(building => {
            // Card Container
            const card = document.createElement('div');
            card.className = 'building-card';

            // Header
            const header = document.createElement('header');
            header.className = 'card-header';
            
            const title = document.createElement('span');
            title.textContent = building.name;
            
            const icon = document.createElement('div');
            const safeClass = building.name.replace(/ /g, '-').replace(/'/g, '').toUpperCase();
            icon.className = `card-icon ${safeClass}`;
            
            header.appendChild(title);
            header.appendChild(icon);
            card.appendChild(header);

            // Body
            const body = document.createElement('div');
            body.className = 'card-body';

            // Pattern Grid
            const grid = document.createElement('div');
            grid.className = 'mini-pattern';
            
            const rows = building.pattern.length;
            const cols = building.pattern[0].length;
            grid.style.gridTemplateColumns = `repeat(${cols}, 15px)`;
            
            // Render pattern cells
            building.pattern.forEach((r: any[]) => {
                r.forEach((cell: string) => {
                    const cellDiv = document.createElement('div');
                    // 'NONE' cells in pattern are usually invisible or light grey
                    const cellClass = cell === 'NONE' ? 'pattern-empty' : cell;
                    cellDiv.className = `pattern-cell ${cellClass}`;
                    grid.appendChild(cellDiv);
                });
            });

            // Description Text
            const text = document.createElement('div');
            text.className = 'card-text';
            text.textContent = this.getDescription(building.name);

            body.appendChild(grid);
            body.appendChild(text);
            card.appendChild(body);

            this.deckDisplayEl!.appendChild(card);
        });
    }

    private getDescription(name: string): string {
        const desc: Record<string, string> = {
            'Cottage': "3 pts if fed.",
            'Farm': "Feeds 4 Cottages.",
            'Well': "1 pt per adjacent Cottage.",
            'Theater': "1 pt per unique building in row/col.",
            'Chapel': "1 pt per fed Cottage.",
            'Tavern': "Score: 2, 5, 9, 14, 20 pts.",
            'Archive of the Second Age': "1pt per unique building type.",
            'Barrett Castle': "Feeds 2. Worth 5 pts.",
            'Mandras': "2pts per unique neighbor.",
            'Shrine of the Elder Tree': "Score rises as town fills (1-8pts).",
            'Cathedral': "2pts. No empty penalty.",
            'Baths': "2pts per missing building type.",
            'Forum': "Score based on largest group.",
            'Grand Mausoleum': "Unfed Cottages score 3pts.",
            'Obelisk of the Crescent': "Place buildings anywhere."
        };
        return desc[name] || "Unique scoring rules.";
    }
}