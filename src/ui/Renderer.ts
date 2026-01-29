import { Game } from '../core/Game'; // We read from Game, but don't modify it
import { Resource } from '../core/Types';

export class Renderer {
    private boardEl = document.getElementById('board')!;
    private buildMenuEl = document.getElementById('build-menu')!;
    private msgLabel = document.getElementById('message')!;
    private paletteEl = document.getElementById('resource-palette')!;
    private scoreEl = document.getElementById('score-display')!;
    private undoBtn = document.getElementById('undo-btn') as HTMLButtonElement;

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

    private renderHeader(game: Game) {
        const score = game.getScore();
        const positive = score.total + score.penaltyCount;
        this.scoreEl.innerHTML = `Score: ${positive} <span style="font-size:12px; color:#999">(-${score.penaltyCount} empty)</span>`;
    }

    private renderBoard(game: Game, activeConstruction: any | null, highlightCoords: any[]) {
        const hasObelisk = game.hasObeliskAbility();
        this.boardEl.innerHTML = '';
        const grid = game.board.getGrid();

        grid.forEach((row, r) => {
            row.forEach((cell, c) => {
                const div = document.createElement('div');
                div.textContent = cell !== 'NONE' ? cell : `${r},${c}`;
                
                let className = `cell ${cell === 'NONE' ? 'empty' : cell}`;
                
                // Highlight Logic
                if (activeConstruction) {
                // Normal Rule: Must be part of the pattern
                const isPatternPart = highlightCoords.some(p => p.row === r && p.col === c);
                
                // Obelisk Rule: OR if we have the Obelisk, ANY empty square is valid
                const isObeliskTarget = hasObelisk && cell === 'NONE';

                if (isPatternPart || isObeliskTarget) {
                    className += ' match-highlight';
                }
            }

                div.className = className;
                div.onclick = () => this.onCellClick(r, c);

                // Ghost Logic
                if (cell === 'NONE' && game.currentResource && !activeConstruction) {
                     div.onmouseenter = () => {
                        div.classList.add('ghost', game.currentResource!);
                        div.textContent = '';
                     };
                     div.onmouseleave = () => {
                        div.classList.remove('ghost', 'WOOD', 'WHEAT', 'BRICK', 'GLASS', 'STONE');
                        div.textContent = `${r},${c}`;
                     };
                }

                this.boardEl.appendChild(div);
            });
        });

        // Message Logic
        if (activeConstruction) {
            this.msgLabel.textContent = `Select a highlighted square to build your ${activeConstruction.buildingName}!`;
            this.msgLabel.style.color = "red";
        } else if (game.availableMatches.length > 0) {
            this.msgLabel.textContent = "Matches available!";
            this.msgLabel.style.color = "black";
        } else if (!game.currentResource) {
            this.msgLabel.textContent = "Select a Resource...";
            this.msgLabel.style.color = "blue";
        } else {
            this.msgLabel.textContent = `Place ${game.currentResource}...`;
            this.msgLabel.style.color = "black";
        }
    }

    private renderSidebar(game: Game, activeConstruction: any | null) {
        this.buildMenuEl.innerHTML = '';
        
        // 1. Render Matches (if any)
        if (game.availableMatches.length === 0) {
            const p = document.createElement('p');
            p.textContent = 'No patterns found.';
            this.buildMenuEl.appendChild(p);
        } else {
            game.availableMatches.forEach(match => {
                const btn = document.createElement('button');
                btn.textContent = `Build ${match.buildingName} at ${match.row},${match.col}`;
                btn.className = `build-btn ${match.buildingName}`;
                btn.onclick = () => this.onBuildClick(match);
                this.buildMenuEl.appendChild(btn);
            });
        }

        // 2. Render Cancel Button (The fix!)
        if (activeConstruction) {
            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = "Cancel Construction";
            cancelBtn.className = "secondary-btn"; // Re-use your nice styling
            cancelBtn.style.marginTop = "10px";
            cancelBtn.style.width = "100%";
            cancelBtn.onclick = () => this.onCancelClick();
            this.buildMenuEl.appendChild(cancelBtn);
        }
    }

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
}