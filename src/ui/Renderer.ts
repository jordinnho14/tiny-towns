import { Game } from '../core/Game';
import { Resource } from '../core/Types';

export class Renderer {
    private boardEl = document.getElementById('board')!;
    private buildMenuEl = document.getElementById('build-menu')!;
    private msgLabel = document.getElementById('message')!;
    private paletteEl = document.getElementById('resource-palette')!;
    private scoreEl = document.getElementById('score-display')!;
    private undoBtn = document.getElementById('undo-btn') as HTMLButtonElement;
    private deckDisplayEl = document.getElementById('deck-display');

    // Callbacks for interaction
    public onCellClick: (r: number, c: number) => void = () => {};
    public onResourceSelect: (res: string) => void = () => {};
    public onBuildClick: (match: any) => void = () => {};
    public onCancelClick: () => void = () => {};

    constructor() {}

render(game: Game, activeConstruction: any | null, highlightCoords: any[], customMessage?: string) {
        this.renderHeader(game);
        this.renderBoard(game, activeConstruction, highlightCoords, customMessage); // Pass it down
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
  private renderBoard(game: Game, activeConstruction: any | null, highlightCoords: any[], customMessage?: string) {
        const grid = game.board.getGrid();
        
        // Define resources locally
        const RESOURCES = ['WOOD', 'WHEAT', 'BRICK', 'GLASS', 'STONE'];

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

        domCells.forEach(div => {
            const r = parseInt(div.dataset.r!);
            const c = parseInt(div.dataset.c!);
            const cell = grid[r][c];

            // 1. Reset State
            div.className = 'cell';
            div.style.backgroundColor = ''; // Reset color to allow CSS to work

            // 2. Apply Classes & Styles based on Content
            if (cell === 'NONE') {
                div.classList.add('empty');
                div.textContent = '';
            } 
            else if (RESOURCES.includes(cell)) {
                div.classList.add(cell); // WOOD, WHEAT, etc.
                div.textContent = cell;  // Show text for resources
            } 
            else {
                // IT IS A BUILDING
                div.textContent = ''; // Clear text so icon shows
                
                // Find definition to check for Monument status & Color
                const def = game.gameRegistry.find(b => b.name.toUpperCase() === cell.toUpperCase());
                
                if (def) {
                    div.classList.add('constructed');
                    
                    if (def.isMonument) {
                        div.classList.add('MONUMENT');
                    } else {
                        // Regular building
                        const safeName = cell.replace(/ /g, '-').replace(/'/g, '').toUpperCase();
                        div.classList.add(safeName);
                    }
                    
                    if (def.color) div.style.backgroundColor = def.color;
                }
            }
            
            // 3. Highlight Logic (UPDATED FOR TRADING POST)
            if (activeConstruction) {
                const isPatternPart = highlightCoords.some(p => p.row === r && p.col === c);
                
                // Ability Checks
                const hasObelisk = game.hasObeliskAbility();
                const isShed = activeConstruction.buildingName.toUpperCase() === 'SHED';
                
                // It is a valid "Build Anywhere" target if it's empty AND we have the ability
                const isGlobalTarget = (hasObelisk || isShed) && cell === 'NONE';

                // Check for Trading Post (to prevent highlighting it)
                const isTradingPost = cell && cell.toUpperCase().replace('_', ' ') === 'TRADING POST';

                // LOGIC: Highlight if it's a pattern part (that isn't a TP) OR a valid global target
                if ((isPatternPart && !isTradingPost) || isGlobalTarget) {
                    div.classList.add('match-highlight');
                }
            }

            // 4. Ghost Logic (Previewing placement)
            if (cell === 'NONE' && game.currentResource && !activeConstruction) {
                 div.onmouseenter = () => {
                    div.classList.add('ghost', game.currentResource!);
                 };
                 div.onmouseleave = () => {
                    div.classList.remove('ghost', 'WOOD', 'WHEAT', 'BRICK', 'GLASS', 'STONE');
                 };
            } else {
                div.onmouseenter = null;
                div.onmouseleave = null;
            }
        });

        // ============================================
        //  NEW MESSAGE LOGIC (This is the changed part)
        // ============================================
        if (activeConstruction) {
            this.msgLabel.textContent = `Select a highlighted square to build your ${activeConstruction.buildingName}!`;
            this.msgLabel.style.color = "#d32f2f"; 
        } 
        // 1. Check Custom Message (from MultiplayerGame) first!
        else if (customMessage) {
            this.msgLabel.textContent = customMessage;
            if (customMessage.includes("Waiting")) {
                this.msgLabel.style.color = "#d32f2f"; // Red for waiting
            } else if (customMessage.includes("YOU")) {
                this.msgLabel.style.color = "#2e7d32"; // Green for your turn
            } else {
                this.msgLabel.style.color = "#333";
            }
        }
        else if (game.availableMatches.length > 0) {
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
        
        // 1. Render Matches
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

                const safeClass = match.buildingName.replace(/ /g, '-').replace(/'/g, '').toUpperCase();
                btn.className = `build-btn ${safeClass}`;
                
                // Click to Build
                btn.onclick = () => this.onBuildClick(match);

                // Calculate grid points
                const highlightPoints: {row: number, col: number}[] = [];

                if (match.pattern && Array.isArray(match.pattern)) {
                    match.pattern.forEach((patternRow: any[], rIndex: number) => {
                        patternRow.forEach((val: any, cIndex: number) => {
                            if (val && val !== 'NONE') {
                                highlightPoints.push({
                                    row: match.row + rIndex,
                                    col: match.col + cIndex
                                });
                            }
                        });
                    });
                } else {
                    highlightPoints.push({ row: match.row, col: match.col });
                }

                // Hover Listeners
                btn.onmouseenter = () => this.togglePreview(highlightPoints, true);
                btn.onmouseleave = () => this.togglePreview(highlightPoints, false);

                this.buildMenuEl.appendChild(btn);
            });
        }

        // 2. Render Cancel Button
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

    private togglePreview(coords: {row: number, col: number}[], active: boolean) {
        coords.forEach(point => {
            const selector = `div[data-r="${point.row}"][data-c="${point.col}"]`;
            const cell = this.boardEl.querySelector(selector);
            if (cell) {
                if (active) {
                    cell.classList.add('preview-target');
                } else {
                    cell.classList.remove('preview-target');
                }
            }
        });
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

    // --- 5. DECK DISPLAY ---
    public renderDeck(registry: any[]) {
        if (!this.deckDisplayEl) return;
        this.deckDisplayEl.innerHTML = '';

        registry.forEach(building => {
            const card = document.createElement('div');
            if (building.isMonument) {
                card.className = `building-card MONUMENT`;
            } else {
                card.className = `building-card ${building.name.toUpperCase()}`;
            }

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

            const body = document.createElement('div');
            body.className = 'card-body';

            const grid = document.createElement('div');
            grid.className = 'mini-pattern';
            
            const cols = building.pattern[0].length;
            grid.style.gridTemplateColumns = `repeat(${cols}, 15px)`;
            
            building.pattern.forEach((r: any[]) => {
                r.forEach((cell: string) => {
                    const cellDiv = document.createElement('div');
                    const cellClass = cell === 'NONE' ? 'pattern-empty' : cell;
                    cellDiv.className = `pattern-cell ${cellClass}`;
                    grid.appendChild(cellDiv);
                });
            });

            const text = document.createElement('div');
            text.className = 'card-text';
            text.textContent = building.description || "Unique scoring rules.";

            body.appendChild(grid);
            body.appendChild(text);
            card.appendChild(body);

            this.deckDisplayEl!.appendChild(card);
        });
    }
}