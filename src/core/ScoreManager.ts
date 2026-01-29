import { BuildingType, type GridCell } from './Types';
import { BUILDING_REGISTRY } from './Buildings';

export interface ScoreResult {
    total: number;
    breakdown: { [key: string]: number };
    penaltyCount: number;
}

export class ScoreManager {
    static calculateScore(grid: GridCell[][], metadata: Map<string, any>, registry: any[]): ScoreResult {
        const rows = 4;
        const cols = 4;
        const breakdown: Record<string, number> = {};
        const validBuildingNames = registry.map(b => b.name);
        
        const counts: Record<string, number> = {};
        let totalFood = 0;
        let hungryBuildings: { r: number, c: number, cost: number, id: string, priority: number }[] = [];
        let emptySpaceCount = 0;

        // --- PASS 1: Scan Board & Food ---
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cell = grid[r][c];
                
                if (!this.isBuilding(cell)) {
                    // Resources and 'NONE' count as empty spaces for penalty purposes
                    emptySpaceCount++;
                    continue;
                }

                counts[cell] = (counts[cell] || 0) + 1;
                const def = BUILDING_REGISTRY.find(b => b.name.toUpperCase() === cell);
                if (!def) continue;

                if (def.feeds) totalFood += def.feeds;
                if (def.feedCost) {
                    const priority = def.name === 'Barrett' ? 10 : 1;
                    hungryBuildings.push({ r, c, cost: def.feedCost, id: `${r},${c}`, priority });
                }
            }
        }

        // --- PASS 1.5: Global Monument Checks ---
        // Check if Cathedral exists on the board
        const hasCathedral = (counts['CATHEDRAL'] || 0) > 0;

        // --- PASS 2: Feed Buildings ---
        hungryBuildings.sort((a, b) => b.priority - a.priority);
        const fedMap = new Set<string>();
        let fedCottageCount = 0; // For Chapels

        for (const b of hungryBuildings) {
            if (totalFood >= b.cost) {
                totalFood -= b.cost;
                fedMap.add(b.id);
                
                const cell = grid[b.r][b.c];
                if (cell === BuildingType.COTTAGE) fedCottageCount += 1;
                else if (cell === BuildingType.BARRETT_CASTLE) fedCottageCount += 2;
            }
        }

        // --- PASS 3: Calculate Scores ---
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cell = grid[r][c];
                if (!this.isBuilding(cell)) continue;

                const def = BUILDING_REGISTRY.find(b => b.name.toUpperCase() === cell);
                if (!def) continue;

                // A. Use Strategy if available
                if (def.scorer) {
                    const ctx = {
                        grid, 
                        row: r, 
                        col: c, 
                        counts,
                        fedState: fedMap.has(`${r},${c}`),
                        metadata: metadata,
                        validBuildingNames: validBuildingNames,
                        allFedPositions: fedMap
                    };
                    const pts = def.scorer.score(ctx);
                    breakdown[cell] = (breakdown[cell] || 0) + pts;
                }
                
                // B. Special Hardcoded Cases
                else if (cell === BuildingType.CHAPEL) {
                    breakdown[cell] = (breakdown[cell] || 0) + fedCottageCount;
                }
            }
        }

        // --- PASS 4: Global Sets ---
        // Tavern
        if (counts[BuildingType.TAVERN]) {
            const scores = [0, 2, 5, 9, 14, 20];
            const tCount = Math.min(counts[BuildingType.TAVERN], 5);
            breakdown[BuildingType.TAVERN] = scores[tCount];
        }

        // --- FINAL CALCULATION ---
        let positiveTotal = 0;
        Object.values(breakdown).forEach(p => positiveTotal += p);
        
        // Calculate Final Penalty
        // Standard Rule: -1 per empty space.
        // Cathedral Rule: 0 per empty space.
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