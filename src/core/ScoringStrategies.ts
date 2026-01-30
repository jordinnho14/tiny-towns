import { type Building, type BuildingCategory, type GridCell } from './Types';

// 1. The Data a building needs to calculate its score
export interface ScoringContext {
    grid: GridCell[][];
    row: number;
    col: number;
    fedState: boolean; // Is this building fed?
    counts: Record<string, number>; // How many of each type exist
    validBuildingNames: string[];
    allFedPositions: Set<string>; // Positions of all fed buildings
    metadata: Map<string, any>; // Additional metadata if needed
    registry: Building[];
}

// 2. The Interface
export interface ScoringStrategy {
    score(ctx: ScoringContext): number;
}

// --- STRATEGIES ---

// A. Fixed Score (e.g. 3 points if fed)
export class FixedScoreStrategy implements ScoringStrategy {
    private points: number;
    private requiresFood: boolean;

    constructor(points: number, requiresFood: boolean = false) {
        this.points = points;
        this.requiresFood = requiresFood;
    }

    score(ctx: ScoringContext): number {
        if (this.requiresFood && !ctx.fedState) return 0;
        return this.points;
    }
}

// B. Adjacency Score (e.g. Well: 1pt per adjacent Cottage)
export class AdjacencyStrategy implements ScoringStrategy {
    private targetTypes: string[];
    private pointsPerNeighbor: number;

    constructor(targetTypes: string[], pointsPerNeighbor: number) {
        this.targetTypes = targetTypes;
        this.pointsPerNeighbor = pointsPerNeighbor;
    }

    score(ctx: ScoringContext): number {
        let score = 0;
        const deltas = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        
        for (const [dr, dc] of deltas) {
            const nr = ctx.row + dr;
            const nc = ctx.col + dc;
            if (nr >= 0 && nr < 4 && nc >= 0 && nc < 4) {
                const neighbor = ctx.grid[nr][nc];
                if (this.targetTypes.includes(neighbor)) {
                    score += this.pointsPerNeighbor;
                }
            }
        }
        return score;
    }
}

// C. Unique Neighbor Score (e.g. Theater, Mandras)
export class UniqueLineStrategy implements ScoringStrategy {
    score(ctx: ScoringContext): number {
        const uniqueTypes = new Set<string>();
        // Scan Row
        for (let c = 0; c < 4; c++) {
            if (c !== ctx.col) this.addIfBuilding(uniqueTypes, ctx.grid[ctx.row][c]);
        }
        // Scan Col
        for (let r = 0; r < 4; r++) {
            if (r !== ctx.row) this.addIfBuilding(uniqueTypes, ctx.grid[r][ctx.col]);
        }
        return uniqueTypes.size;
    }

    private addIfBuilding(set: Set<string>, cell: GridCell) {
        // Simple check: string length > 1 usually means building, not "NONE"
        const resources = ['NONE', 'WOOD', 'WHEAT', 'BRICK', 'GLASS', 'STONE'];
        if (!resources.includes(cell)) {
            set.add(cell);
        }
    }
}

// D. Mandras Score (Unique Neighbors)
export class MandrasStrategy implements ScoringStrategy {
    score(ctx: ScoringContext): number {
        const uniqueNeighbors = new Set<string>();
        const deltas = [[-1, 0], [1, 0], [0, -1], [0, 1]];

        for (const [dr, dc] of deltas) {
            const nr = ctx.row + dr;
            const nc = ctx.col + dc;
            if (nr >= 0 && nr < 4 && nc >= 0 && nc < 4) {
                const neighbor = ctx.grid[nr][nc];
                const resources = ['NONE', 'WOOD', 'WHEAT', 'BRICK', 'GLASS', 'STONE'];
                if (!resources.includes(neighbor)) {
                    uniqueNeighbors.add(neighbor);
                }
            }
        }
        return uniqueNeighbors.size * 2;
    }
}

// E. Global Unique (e.g. Archive)
export class GlobalUniqueStrategy implements ScoringStrategy {
    score(ctx: ScoringContext): number {
        let score = 0;
        Object.values(ctx.counts).forEach(count => {
            if (count === 1) score += 1;
        });
        return score;
    }
}

export class UniqueNeighborStrategy implements ScoringStrategy {
    private multiplier: number; // 1. Define property here

    constructor(multiplier: number) {
        this.multiplier = multiplier; // 2. Assign it here
    }

    score(ctx: ScoringContext): number {
        const uniqueNeighbors = new Set<string>();
        const deltas = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        const resources = ['NONE', 'WOOD', 'WHEAT', 'BRICK', 'GLASS', 'STONE'];

        for (const [dr, dc] of deltas) {
            const nr = ctx.row + dr;
            const nc = ctx.col + dc;

            // Bounds check
            if (nr >= 0 && nr < 4 && nc >= 0 && nc < 4) {
                const neighbor = ctx.grid[nr][nc];
                
                // Only count actual buildings
                if (!resources.includes(neighbor)) {
                    uniqueNeighbors.add(neighbor);
                }
            }
        }

        return uniqueNeighbors.size * this.multiplier;
    }
}

export class SavedScoreStrategy implements ScoringStrategy {
    score(ctx: ScoringContext): number {
        const key = `${ctx.row},${ctx.col}`;
        const data = ctx.metadata.get(key);
        
        // Return the saved score, or 0 if something went wrong
        return data ? (data.savedScore || 0) : 0;
    }
}

export class MissingTypeStrategy implements ScoringStrategy {
    score(ctx: ScoringContext): number {
        let missingCount = 0;

        for (const name of ctx.validBuildingNames) {
            // The grid usually stores names in UPPERCASE (due to Matcher logic), 
            // so we normalize to check existence.
            const key = name.toUpperCase();
            
            // If the count is undefined or 0, it's missing
            if (!ctx.counts[key]) {
                missingCount++;
            }
        }

        // 2 points per missing type
        return missingCount * 2;
    }
}

export class LargestGroupStrategy implements ScoringStrategy {
    score(ctx: ScoringContext): number {
        let maxGroupSize = 0;
        const visited = new Set<string>();
        const resources = ['NONE', 'WOOD', 'WHEAT', 'BRICK', 'GLASS', 'STONE'];
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

        // 1. Iterate over every cell
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                const key = `${r},${c}`;
                const type = ctx.grid[r][c];

                // Skip if already counted or if it's not a building
                if (visited.has(key) || resources.includes(type)) continue;

                // 2. Start Flood Fill (BFS) for this building type
                let currentGroupSize = 0;
                const queue = [{r, c}];
                visited.add(key);

                while (queue.length > 0) {
                    const curr = queue.pop()!;
                    currentGroupSize++;

                    // Check neighbors
                    for (const [dr, dc] of directions) {
                        const nr = curr.r + dr;
                        const nc = curr.c + dc;
                        const nKey = `${nr},${nc}`;

                        // Check bounds, visited status, and TYPE MATCH
                        if (
                            nr >= 0 && nr < 4 && nc >= 0 && nc < 4 &&
                            !visited.has(nKey) &&
                            ctx.grid[nr][nc] === type // Must be same building type
                        ) {
                            visited.add(nKey);
                            queue.push({r: nr, c: nc});
                        }
                    }
                }

                // 3. Update Max
                if (currentGroupSize > maxGroupSize) {
                    maxGroupSize = currentGroupSize;
                }
            }
        }

        // Rule: 1 point base + size of largest group
        // If the board is empty of buildings (unlikely if Forum exists), size is 0.
        return 1 + maxGroupSize;
    }
}

export class MausoleumStrategy implements ScoringStrategy {
    score(ctx: ScoringContext): number {
        let unfedCottages = 0;

        // Iterate through the entire grid
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                const cell = ctx.grid[r][c];
                const key = `${r},${c}`;

                // Check if it is a Cottage
                if (cell === 'COTTAGE') { // Ensure this matches your BuildingType.COTTAGE constant
                    // Check if it is NOT in the fed list
                    if (!ctx.allFedPositions.has(key)) {
                        unfedCottages++;
                    }
                }
            }
        }

        // Award 3 points for every unfed cottage to bring them up to par
        return unfedCottages * 3;
    }
}

export class AdjacencyRequirementStrategy implements ScoringStrategy {
    private targetTypes: string[];
    private scoreAmount: number;

    constructor(targetTypes: string[], scoreAmount: number) {
        this.targetTypes = targetTypes;
        this.scoreAmount = scoreAmount;
    }

    score(ctx: ScoringContext): number {
        const deltas = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        
        for (const [dr, dc] of deltas) {
            const nr = ctx.row + dr;
            const nc = ctx.col + dc;
            if (nr >= 0 && nr < 4 && nc >= 0 && nc < 4) {
                const neighbor = ctx.grid[nr][nc];
                if (this.targetTypes.includes(neighbor)) {
                    // Found one match, return the score immediately
                    return this.scoreAmount;
                }
            }
        }
        return 0;
    }
}

// For Millstone: Scores if adjacent to a specific Category (e.g. Red or Yellow)
export class CategoryAdjacencyStrategy implements ScoringStrategy {
    private targetCategories: BuildingCategory[];
    private scoreAmount: number;

    constructor(targetCategories: BuildingCategory[], scoreAmount: number) {
        this.targetCategories = targetCategories;
        this.scoreAmount = scoreAmount;
    }

    score(ctx: ScoringContext): number {
        const deltas = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        
        for (const [dr, dc] of deltas) {
            const nr = ctx.row + dr;
            const nc = ctx.col + dc;
            if (nr >= 0 && nr < 4 && nc >= 0 && nc < 4) {
                const neighborName = ctx.grid[nr][nc];
                
                // Look up the neighbor definition
                const def = ctx.registry.find(b => b.name.toUpperCase() === neighborName.toUpperCase());
                
                if (def && this.targetCategories.includes(def.type)) {
                    return this.scoreAmount;
                }
            }
        }
        return 0;
    }
}
