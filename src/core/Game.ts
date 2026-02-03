import { Board } from './Board';
import { Matcher } from './Matcher';
import { ScoreManager } from './ScoreManager';
import { type ResourceType } from './Types';
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

        // Fallback Logic
        if (this.gameRegistry.length === 0) {
            const monuments = BUILDING_REGISTRY.filter(b => b.isMonument);
            const regular = BUILDING_REGISTRY.filter(b => !b.isMonument);
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

    constructBuilding(match: any, targetR: number, targetC: number): { type: 'SUCCESS' | 'TRIGGER_EFFECT', effectType?: string} {
        // 1. Identify coordinates involved in the match
        const coords: { row: number, col: number }[] = [];
        let shrinePoints = 0;
        let isShrine = false;
        
        match.pattern.forEach((row: any[], r: number) => {
            row.forEach((cell: string, c: number) => {
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

        // 3. Clear Resources (SMART CLEARING for Trading Post)
        coords.forEach(pos => {
            const item = this.board.getGrid()[pos.row][pos.col];
            // Normalize checking for Trading Post
            const isTradingPost = item && (item as string).toUpperCase().replace('_', ' ') === 'TRADING POST';

            // If it's a Trading Post, DO NOT clear it (it stays).
            // If it's a normal resource, clear it.
            if (!isTradingPost) {
                this.board.remove(pos.row, pos.col);
            }
        });

        // 4. Place the Building
        this.board.placeBuilding(targetR, targetC, match.buildingName);

        if (isShrine) {
            this.board.setMetadata(targetR, targetC, { savedScore: shrinePoints });
        }
 
        // 5. Clear Undo & Rescan
        this.lastMove = null;
        this.scanForMatches();

        const realDef = BUILDING_REGISTRY.find(b => b.name.toUpperCase() === match.buildingName.toUpperCase());
        
        if (realDef && realDef.effect) {
            // Tell the UI: "Hey, I just built a Factory, please ask the user for a resource!"
            return { 
                type: 'TRIGGER_EFFECT', 
                effectType: realDef.effect.type 
            };
        }
        return { type: 'SUCCESS' };
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

    public findEffectBuildings(effectType: string): { r: number, c: number, storedRes: ResourceType }[] {
        const grid = this.board.getGrid();
        const results: { r: number, c: number, storedRes: ResourceType }[] = [];

        grid.forEach((row, r) => {
            row.forEach((cell, c) => {
                // Skip resources and empty cells
                if (['WOOD', 'WHEAT', 'BRICK', 'GLASS', 'STONE', 'NONE'].includes(cell)) return;

                // Find the building definition
                const buildingDef = this.gameRegistry.find(b => b.name.toUpperCase() === cell.toUpperCase());
                
                // Check if it has the matching effect
                if (buildingDef && buildingDef.effect && buildingDef.effect.type === effectType) {
                    // Get the stored resource from metadata
                    const meta = this.board.getMetadata(r, c);
                    if (meta && meta.storedResource) {
                        results.push({ r, c, storedRes: meta.storedResource });
                    }
                }
            });
        });
        return results;
    }

    /**
     * Stores a resource in a specific building (Factory, Bank, etc).
     * This updates the metadata for that cell.
     */
    public setBuildingStorage(r: number, c: number, resource: ResourceType) {
        this.board.setMetadata(r, c, { storedResource: resource });
    }

    /**
     * Checks if the player has a valid Factory swap available for the incoming resource.
     * Returns the coordinates of the Factory if a swap is possible, or null.
     */
    public canFactorySwap(incomingResource: ResourceType): { r: number, c: number } | null {
        // Find all my factories
        const factories = this.findEffectBuildings('FACTORY');
        
        // See if any of them contain the EXACT resource being offered
        const validFactory = factories.find(f => f.storedRes === incomingResource);
        
        return validFactory ? { r: validFactory.r, c: validFactory.c } : null;
    }
}

