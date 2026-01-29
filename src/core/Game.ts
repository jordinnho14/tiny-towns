import { Board } from './Board';
import { Matcher } from './Matcher';
import { ScoreManager } from './ScoreManager';
import { type ResourceType } from './Types';

export class Game {
    public board: Board;
    public currentResource: ResourceType | null = null;
    public availableMatches: any[] = [];
    public activeMonument: any = null;
    public gameRegistry: any[] = [];
    
    // Undo History
    public lastMove: { r: number, c: number } | null = null;

    constructor() {
        this.board = new Board();
    }

    start() {
        this.board = new Board();
        this.currentResource = null;
        this.lastMove = null;
        this.availableMatches = [];
    }

    placeResource(r: number, c: number) {
        if (!this.currentResource) throw new Error("No resource selected");
        
        this.board.place(r, c, this.currentResource);
        this.lastMove = { r, c };
        this.currentResource = null; // Rhythm fix
        
        this.scanForMatches();
    }

    constructBuilding(match: any, targetR: number, targetC: number) {
        // 1. Calculate the exact coordinates the pattern occupies
        // (This logic used to be in main.ts, now it lives here)
        const coords: { row: number, col: number }[] = [];
        let shrinePoints = 0;
        let isShrine = false;
        
        match.pattern.forEach((row: any[], r: number) => {
            row.forEach((cell: string, c: number) => {
                if (cell !== 'NONE') {
                    coords.push({ row: match.row + r, col: match.col + c });
                }
            });
        });
        console.log('building name: ' + match.buildingName);
        if (match.buildingName === 'SHRINE OF THE ELDER TREE') {
            isShrine = true;
            console.log('made it to shrine scoring');
             const buildingCount = this.countBuildingsOnBoard();
             // Add 1 because we are about to place the Shrine itself
             const total = buildingCount + 1;
             
             if (total < 6) shrinePoints = total; // 1->1, 2->2... 5->5
             else shrinePoints = 8;               // 6+ -> 8
            
        }

        // 2. Tell the board to execute the swap
        this.board.constructBuilding(coords, targetR, targetC, match.buildingName);

        if (isShrine) {
            this.board.setMetadata(targetR, targetC, { savedScore: shrinePoints });
        }
 
        // 3. IMPORTANT: Clear Undo History
        // Once you build a building, you cannot "undo" the resource that triggered it.
        this.lastMove = null;

        // 4. Re-scan the board for new opportunities
        this.scanForMatches();
    }

    undo() {
        if (this.lastMove) {
            this.board.remove(this.lastMove.r, this.lastMove.c);
            this.lastMove = null;
            this.scanForMatches();
        }
    }

    canUndo(): boolean {
        return this.lastMove !== null;
    }

    scanForMatches() {
        this.availableMatches = [];
        const grid = this.board.getGrid();
        
        // Monument check
        const hasMonument = grid.some(row => row.some(cell => {
             const def = this.gameRegistry.find(b => b.name.toUpperCase() === cell);
             return def?.isMonument;
        }));

        for (const building of this.gameRegistry) {
            if (hasMonument && building.isMonument) continue;

            const matches = Matcher.findMatches(grid, building);
            matches.forEach(m => {
                this.availableMatches.push({ ...m, buildingName: building.name.toUpperCase() });
            });
        }
    }

    checkGameOver(): boolean {
        const grid = this.board.getGrid();
        const hasEmpty = grid.some(row => row.some(c => c === 'NONE'));
        const canBuild = this.availableMatches.length > 0;
        return !hasEmpty && !canBuild;
    }

    getScore() {
        return ScoreManager.calculateScore(this.board.getGrid(), this.board.metadata, this.gameRegistry);
    }

    private countBuildingsOnBoard(): number {
        const grid = this.board.getGrid();
        let count = 0;
        const resources = ['WOOD','WHEAT','BRICK','GLASS','STONE','NONE'];
        
        grid.forEach(row => {
            row.forEach(cell => {
                // If it's not empty and not a resource, it's a building
                if (!resources.includes(cell)) {
                    count++;
                }
            });
        });
        return count;
    }

    public hasObeliskAbility(): boolean {
        // Scan the grid for the specific building ID
        const grid = this.board.getGrid();
        return grid.some(row => row.some(cell => cell.toUpperCase().includes("OBELISK")));
    }
}