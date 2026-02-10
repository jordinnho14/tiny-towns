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
    private factoryBar = document.getElementById('factory-action-bar')!;
    private swapBtn = document.getElementById('factory-swap-btn')!;
    private swapResLabel = document.getElementById('swap-res-name')!;

    // Callbacks for interaction
    public onCellClick: (r: number, c: number) => void = () => {};
    public onResourceSelect: (res: string) => void = () => {};
    public onBuildClick: (match: any) => void = () => {};
    public onCancelClick: () => void = () => {};
    public onSwapClick: () => void = () => {};

    constructor() {
        this.swapBtn.onclick = () => this.onSwapClick();
    }

render(
    game: Game,
    activeConstruction: any | null, 
    highlightCoords: any[], 
    customMessage?: string,
    forbiddenResources: string[] = []
) {
        this.renderHeader(game);
        this.renderBoard(game, activeConstruction, highlightCoords, customMessage); // Pass it down
        this.renderSidebar(game, activeConstruction);
        this.renderControls(game, activeConstruction, forbiddenResources);
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
            div.style.backgroundColor = ''; // Reset color
            div.innerHTML = ''; // Clear content (Text AND Badges)

            // 2. Apply Classes & Styles based on Content
            if (cell === 'NONE') {
                div.classList.add('empty');
            } 
            else if (RESOURCES.includes(cell)) {
                div.classList.add(cell); // WOOD, WHEAT, etc.
                div.textContent = cell;  // Show text for resources
            } 
            else {
                // IT IS A BUILDING
                
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

            // 3. Stored Resource Logic (Factory/Bank - Single Item)
            const meta = game.board.getMetadata(r, c);
            if (meta && meta.storedResource) {
                const badge = document.createElement('div');
                badge.className = `stored-resource-icon ${meta.storedResource}`;
                badge.title = `Stored: ${meta.storedResource}`;
                div.appendChild(badge);
            }

            // 4. Warehouse Logic (Multiple Items)
            if (meta && meta.storedResources && Array.isArray(meta.storedResources)) {
                const container = document.createElement('div');
                container.className = 'warehouse-storage';
                
                meta.storedResources.forEach((res: any) => {
                    const badge = document.createElement('div');
                    badge.className = `mini-resource ${res}`;
                    container.appendChild(badge);
                });
                div.appendChild(container);
            }

            // --- NEW: Opaleye's Watch Visuals ---
            if (meta && meta.opaleyeBuildings && Array.isArray(meta.opaleyeBuildings)) {
                const container = document.createElement('div');
                // Reuse the warehouse flex container for layout
                container.className = 'warehouse-storage'; 
                
                meta.opaleyeBuildings.forEach((bName: string) => {
                    const badge = document.createElement('div');
                    const safeClass = bName.replace(/ /g, '-').replace(/'/g, '').toUpperCase();
                    
                    // Use 'mini-cell' to get the correct background colors/icons
                    badge.className = `mini-cell ${safeClass} on-board-mini`;
                    badge.title = bName;
                    
                    container.appendChild(badge);
                });
                div.appendChild(container);
            }

            // 5. Interactive Pulse Logic (NEW: Make Warehouse Glow)
            // If it's my turn (I have a resource) and not building, light up the Warehouse
            if (game.currentResource && !activeConstruction) {
                if (cell.toUpperCase() === 'WAREHOUSE') {
                    div.classList.add('interactive-building');
                    div.title = "Click to Store or Swap";
                }
            }
            
            // 6. Highlight Logic (Construction)
            if (activeConstruction) {
                const isPatternPart = highlightCoords.some(p => p.row === r && p.col === c);
                const hasObelisk = game.hasObeliskAbility();
                const isShed = activeConstruction.buildingName.toUpperCase() === 'SHED';
                const isGlobalTarget = (hasObelisk || isShed) && cell === 'NONE';
                const isTradingPost = cell && cell.toUpperCase().replace('_', ' ') === 'TRADING POST';

                if ((isPatternPart && !isTradingPost) || isGlobalTarget) {
                    div.classList.add('match-highlight');
                }
            }

            // 7. Ghost Logic (Previewing placement)
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
        //  MESSAGE LOGIC
        // ============================================
        if (activeConstruction) {
            this.msgLabel.textContent = `Select a highlighted square to build your ${activeConstruction.buildingName}!`;
            this.msgLabel.style.color = "#d32f2f"; 
        } 
        else if (customMessage) {
            this.msgLabel.textContent = customMessage;
            if (customMessage.includes("Waiting")) {
                this.msgLabel.style.color = "#d32f2f"; 
            } else if (customMessage.includes("YOU")) {
                this.msgLabel.style.color = "#2e7d32"; 
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
    private renderControls(game: Game, activeConstruction: any | null, forbidden: string[]) {
        this.paletteEl.innerHTML = '';
        const list = [Resource.WOOD, Resource.WHEAT, Resource.BRICK, Resource.GLASS, Resource.STONE];

        list.forEach(res => {
            const btn = document.createElement('div');
            let className = `res-btn ${res}`;
            if (game.currentResource === res && !activeConstruction) className += ' selected';
            if (forbidden.includes(res)) {
                className += ' disabled'; 
                btn.title = "Blocked by bank"
            }
            btn.className = className;
            btn.textContent = res.charAt(0);
            if (!forbidden.includes(res)) {
                btn.onclick = () => this.onResourceSelect(res);
            }
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

    public toggleFactoryAction(show: boolean, resourceName: string = '') {
        if (show) {
            this.factoryBar.classList.remove('hidden');
            this.swapResLabel.textContent = resourceName;
        } else {
            this.factoryBar.classList.add('hidden');
        }
    }
}