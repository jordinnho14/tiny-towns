import { Board } from './Board';
import { Matcher } from './Matcher';
import { ScoreManager } from './ScoreManager';
import { type ResourceType } from './Types';
// 1. Add this import so we can access the data for fallback logic
import { BUILDING_REGISTRY } from './Buildings';

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

        // --- NEW: FALLBACK LOGIC ---
        // If main.ts didn't set the registry (e.g. during testing), 
        // we pick a random monument so the game still works.
        if (this.gameRegistry.length === 0) {
            const monuments = BUILDING_REGISTRY.filter(b => b.isMonument);
            const regular = BUILDING_REGISTRY.filter(b => !b.isMonument);
            
            // Randomly pick one
            this.activeMonument = monuments[Math.floor(Math.random() * monuments.length)];
            this.gameRegistry = [...regular, this.activeMonument];
        }
    }

    placeResource(r: number, c: number) {
        if (!this.currentResource) throw new Error("No resource selected");
        
        this.board.place(r, c, this.currentResource);
        this.lastMove = { r, c };
        this.currentResource = null; 
        
        this.scanForMatches();
    }

    constructBuilding(match: any, targetR: number, targetC: number) {
        // 1. Calculate the exact coordinates the pattern occupies
        const coords: { row: number, col: number }[] = [];
        let shrinePoints = 0;
        let isShrine = false;
        
        match.pattern.forEach((row: any[], r: number) => {
            row.forEach((cell: string, c: number) => {
                // Ignore 'NONE' squares in pattern logic
                if (cell && cell !== 'NONE') {
                    coords.push({ row: match.row + r, col: match.col + c });
                }
            });
        });

        // 2. Shrine Logic
        if (match.buildingName.toUpperCase() === 'SHRINE OF THE ELDER TREE') {
             isShrine = true;
             const buildingCount = this.countBuildingsOnBoard();
             // Add 1 because we are about to place the Shrine itself
             const total = buildingCount + 1;
             
             if (total < 6) shrinePoints = total; 
             else shrinePoints = 8;
        }

        // 3. Tell the board to execute the swap
        this.board.constructBuilding(coords, targetR, targetC, match.buildingName);

        if (isShrine) {
            this.board.setMetadata(targetR, targetC, { savedScore: shrinePoints });
        }
 
        // 4. Clear Undo & Rescan
        this.lastMove = null;
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
             const def = this.gameRegistry.find(b => b.name.toUpperCase() === cell.toUpperCase());
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
        const grid = this.board.getGrid();
        return grid.some(row => row.some(cell => cell.toUpperCase().includes("OBELISK")));
    }
}