import { BuildingType, type GridCell, type Building } from './Types';

export interface ScoreResult {
    total: number;
    breakdown: { [key: string]: number };
    penaltyCount: number;
}

export class ScoreManager {
    // We expect 'registry' to be passed in from Game.ts (the active deck for this game)
    static calculateScore(grid: GridCell[][], metadata: any, registry: Building[], finishRank?: number): ScoreResult {
        const rows = 4;
        const cols = 4;
        const breakdown: Record<string, number> = {};
        
        // Helper: Find definition in the ACTIVE registry
        const getDef = (name: string) => registry.find(b => b.name.toUpperCase() === name.toUpperCase());

        const counts: Record<string, number> = {};
        let emptySpaceCount = 0;

        // --- PASS 1: Scan Board & Generate Food ---
        let globalFoodPool = 0;
        const positionalFoodMap = new Set<string>(); // Set of "r,c" coordinates that HAVE food access

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cell = grid[r][c];
                
                if (!this.isBuilding(cell)) {
                    emptySpaceCount++;
                    continue;
                }

                // Count for later strategies
                counts[cell] = (counts[cell] || 0) + 1;

                // Check for Feeders (Farm, Granary, etc.)
                const def = getDef(cell);
                
                if (def && def.feeder) {
                    const fedCoords = def.feeder.getFedPositions(r, c, grid);
                    
                    // Check for special Global Flag ({-1, -1})
                    if (fedCoords.length > 0 && fedCoords[0].r === -1) {
                         // It's a Farm (or similar global feeder)
                         globalFoodPool += fedCoords.length;
                    } else {
                        // It's a Granary (positional)
                        fedCoords.forEach(p => positionalFoodMap.add(`${p.r},${p.c}`));
                    }
                }
            }
        }

        // --- PASS 2: Feed Buildings ---
        const finalFedState = new Set<string>(); // "r,c" of buildings that successfully ate
        let fedCottageCount = 0;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cell = grid[r][c];
                if (!this.isBuilding(cell)) continue;

                const def = getDef(cell);
                
                // If a building has a feedCost, it needs to eat
                if (def && def.feedCost) { 
                    const key = `${r},${c}`;
                    let isFed = false;

                    // 1. Try Positional Food (Granary) - It's specific to this spot
                    if (positionalFoodMap.has(key)) {
                        isFed = true;
                    } 
                    // 2. Try Global Food (Farm) - Takes from the pool
                    else if (globalFoodPool >= def.feedCost) {
                        globalFoodPool -= def.feedCost;
                        isFed = true;
                    }

                    if (isFed) {
                        finalFedState.add(key);
                        
                        // Track stats for Chapel
                        if (cell === BuildingType.COTTAGE) fedCottageCount++;
                        if (cell === BuildingType.BARRETT_CASTLE) fedCottageCount += 2; 
                    }
                }
            }
        }

        // --- PASS 3: Calculate Scores ---
        const validBuildingNames = registry.map(b => b.name);

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cell = grid[r][c];
                if (!this.isBuilding(cell)) continue;

                const def = getDef(cell);
                if (!def) continue;

                // A. Use Strategy (Standard Scoring)
                if (def.scorer) {
                    const ctx = {
                        grid, 
                        row: r, 
                        col: c, 
                        counts,
                        fedState: finalFedState.has(`${r},${c}`), 
                        metadata: metadata,
                        validBuildingNames: validBuildingNames,
                        allFedPositions: finalFedState,
                        registry: registry,
                        fedCottageCount: fedCottageCount,
                        finishRank: finishRank
                    };
                    const pts = def.scorer.score(ctx);
                    breakdown[cell] = (breakdown[cell] || 0) + pts;
                }

                // B. SPECIAL: Warehouse Penalty
                if (cell.toUpperCase() === 'WAREHOUSE') {
                    // Check metadata safely (handles Map or Object)
                    const key = `${r},${c}`;
                    const meta = (metadata instanceof Map) ? metadata.get(key) : metadata[key];

                    if (meta && meta.storedResources && Array.isArray(meta.storedResources)) {
                        const penalty = meta.storedResources.length;
                        // Deduct from the score breakdown for Warehouse
                        breakdown[cell] = (breakdown[cell] || 0) - penalty;
                    }
                }
            }
        }

        // --- PASS 4: Global Sets (Tavern) ---
        // Taverns score based on the total count, not position
        if (counts[BuildingType.TAVERN]) {
            const scores = [0, 2, 5, 9, 14, 20];
            const tCount = Math.min(counts[BuildingType.TAVERN], 5);
            breakdown[BuildingType.TAVERN] = scores[tCount];
        }

        // --- FINAL CALCULATION ---
        let positiveTotal = 0;
        Object.values(breakdown).forEach(p => positiveTotal += p);
        
        // Calculate Final Penalty (Empty Spaces)
        const hasCathedral = (counts['CATHEDRAL'] || 0) > 0;
        const activePenalty = hasCathedral ? 0 : emptySpaceCount;

        return {
            total: positiveTotal - activePenalty,
            breakdown,
            penaltyCount: activePenalty
        };
    }

    private static isBuilding(cell: string): boolean {
        const resources = ['NONE', 'WOOD', 'WHEAT', 'BRICK', 'GLASS', 'STONE'];
        return !resources.includes(cell);
    }
}