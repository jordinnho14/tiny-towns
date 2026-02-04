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

    setMonument(monument: any, sharedDeck: any[]) {
        this.activeMonument = monument;
        // The registry is the shared deck + my unique monument
        this.gameRegistry = [...sharedDeck, this.activeMonument];
        
        // Re-scan immediately to ensure the Matcher knows about the monument
        this.scanForMatches();
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
        
        const grid = this.board.getGrid();
        const cell = grid[r][c];

        // 1. Standard Case: Empty Square
        if (cell === 'NONE') {
            this.board.place(r, c, this.currentResource);
        }
        // 2. Bondmaker Case: Occupied by Cottage
        else if (cell === 'COTTAGE' && this.hasStatueOfBondmaker()) {
            // Check if it already holds a resource
            const meta = this.board.getMetadata(r, c);
            if (meta && meta.storedResource) {
                throw new Error("This Cottage is already holding a resource!");
            }

            // Place it in metadata (NOT on the grid itself, or we lose the Cottage)
            this.board.setMetadata(r, c, { ...meta, storedResource: this.currentResource });
        } 
        else {
            throw new Error("Cannot place resource here.");
        }

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
            const meta = this.board.getMetadata(pos.row, pos.col);
            const hasStoredResource = meta && meta.storedResource;

            if (hasStoredResource) {
                // We used the resource ON the cottage.
                // Action: Just clear the resource, keep the Cottage.
                this.board.setMetadata(pos.row, pos.col, { ...meta, storedResource: null });
            }
            else if (!isTradingPost) {
                // Standard case: Remove the item from grid
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

            const matches = Matcher.findMatches(grid, building, this.board.metadata);
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

    public findEffectBuildings(effectType: string, requireStorage: boolean = true): { r: number, c: number, storedRes: ResourceType | null }[] {
        const grid = this.board.getGrid();
        const results: { r: number, c: number, storedRes: ResourceType | null }[] = [];

        grid.forEach((row, r) => {
            row.forEach((cell, c) => {
                // Skip resources and empty cells
                if (['WOOD', 'WHEAT', 'BRICK', 'GLASS', 'STONE', 'NONE'].includes(cell)) return;

                // Find the building definition
                const buildingDef = this.gameRegistry.find(b => b.name.toUpperCase() === cell.toUpperCase());
                
                // Check if it has the matching effect
                if (buildingDef && buildingDef.effect && buildingDef.effect.type === effectType) {
                    
                    const meta = this.board.getMetadata(r, c);
                    const storedRes = meta ? meta.storedResource : null;

                    // FIX: strict check depending on the flag
                    if (requireStorage) {
                        if (storedRes) {
                            results.push({ r, c, storedRes });
                        }
                    } else {
                        // Return it even if empty (for passive buildings like Statue)
                        results.push({ r, c, storedRes });
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

    public getForbiddenResources(): ResourceType[] {
        // Find all banks and return the resources stored on them
        const banks = this.findEffectBuildings('BANK');
        return banks
            .map(b => b.storedRes)
            .filter((res): res is ResourceType => res !== null);
    }

    // --- WAREHOUSE LOGIC ---

    /**
     * Stores a resource (only if space exists).
     */
    public storeInWarehouse(r: number, c: number, res: ResourceType): boolean {
        const meta = this.board.getMetadata(r, c) || {};
        const stored = (meta.storedResources || []) as ResourceType[];
        
        if (stored.length >= 3) return false;

        stored.push(res);
        this.board.setMetadata(r, c, { ...meta, storedResources: stored });
        return true;
    }

    /**
     * Swaps the incoming resource with one already in the warehouse.
     * Returns the resource that was popped OUT.
     */
    public swapInWarehouse(r: number, c: number, indexToTake: number, incomingRes: ResourceType): ResourceType | null {
        const meta = this.board.getMetadata(r, c);
        if (!meta || !meta.storedResources) return null;

        const stored = [...(meta.storedResources as ResourceType[])]; // Copy array
        
        if (indexToTake < 0 || indexToTake >= stored.length) return null;

        // 1. Get the item we are removing
        const itemTaken = stored[indexToTake];

        // 2. Put the new item in its place
        stored[indexToTake] = incomingRes;

        // 3. Save back
        this.board.setMetadata(r, c, { ...meta, storedResources: stored });
        
        return itemTaken;
    }

    // Helper to get contents
    public getWarehouseContents(r: number, c: number): ResourceType[] {
        const meta = this.board.getMetadata(r, c);
        return (meta?.storedResources as ResourceType[]) || [];
    }

    // In Game class
    public hasStatueOfBondmaker(): boolean {
        const buildings = this.findEffectBuildings('STATUE_BONDMAKER', false);
        console.log(`Checking for Bondmaker. Found: ${buildings.length}`, buildings);
        return buildings.length > 0;
    }
}

