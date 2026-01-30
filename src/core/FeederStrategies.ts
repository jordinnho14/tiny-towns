import { type GridCell, type FeederStrategy, BuildingType } from './Types';

// 1. Global Feeder (The Farm)
// It feeds 'amount' cottages anywhere on the board.
export class GlobalFeederStrategy implements FeederStrategy {
    private amount: number;
    constructor(amount: number) { this.amount = amount; }

    getFedPositions(_r: number, _c: number, _grid: GridCell[][]): {r: number, c: number}[] {
        // We return a special coordinate {-1, -1} to signal "Global Food"
        // The ScoreManager will detect this and add it to a global pool.
        return Array(this.amount).fill({ r: -1, c: -1 }); 
    }
}

// 2. Adjacent Feeder (The Granary)
// Feeds cottages in the 8 surrounding squares.
export class AdjacentFeederStrategy implements FeederStrategy {
    getFedPositions(row: number, col: number, _grid: GridCell[][]): {r: number, c: number}[] {
        const fed: {r: number, c: number}[] = [];
        const deltas = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];
        
        deltas.forEach(([dr, dc]) => {
            const nr = row + dr;
            const nc = col + dc;
            // Check bounds
            if (nr >= 0 && nr < 4 && nc >= 0 && nc < 4) {
                // We mark the position as fed. 
                // ScoreManager later validates if there is actually a cottage there.
                fed.push({r: nr, c: nc});
            }
        });
        return fed;
    }
}

export class ContiguousFeederStrategy implements FeederStrategy {
    getFedPositions(_r: number, _c: number, grid: GridCell[][]): {r: number, c: number}[] {
        const rows = 4;
        const cols = 4;
        const visited = new Set<string>();
        const groups: {r: number, c: number}[][] = [];

        // Helper to check if a cell is a "Cottage" (Cottage or Barrett Castle)
        const isCottage = (r: number, c: number) => {
            const cell = grid[r][c];
            return cell === BuildingType.COTTAGE || cell === BuildingType.BARRETT_CASTLE;
        };

        // 1. Find all groups
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const key = `${r},${c}`;
                
                if (visited.has(key) || !isCottage(r, c)) continue;

                // Start a new group
                const currentGroup: {r: number, c: number}[] = [];
                const queue = [{r, c}];
                visited.add(key);

                while (queue.length > 0) {
                    const curr = queue.pop()!;
                    currentGroup.push(curr);

                    const deltas = [[-1, 0], [1, 0], [0, -1], [0, 1]];
                    for (const [dr, dc] of deltas) {
                        const nr = curr.r + dr;
                        const nc = curr.c + dc;
                        const nKey = `${nr},${nc}`;

                        if (
                            nr >= 0 && nr < rows && nc >= 0 && nc < cols &&
                            !visited.has(nKey) &&
                            isCottage(nr, nc)
                        ) {
                            visited.add(nKey);
                            queue.push({r: nr, c: nc});
                        }
                    }
                }
                groups.push(currentGroup);
            }
        }

        // 2. Return the largest group
        if (groups.length === 0) return [];
        
        // Sort by size (descending) and pick the first
        groups.sort((a, b) => b.length - a.length);
        
        return groups[0];
    }
}

export class RowColFeederStrategy implements FeederStrategy {
    getFedPositions(row: number, col: number, _grid: GridCell[][]): {r: number, c: number}[] {
        const fed: {r: number, c: number}[] = [];
        
        // Feed entire Row
        for (let c = 0; c < 4; c++) {
            // Optional: Don't feed itself (though Orchard isn't a Cottage so it doesn't matter)
            if (c !== col) fed.push({r: row, c});
        }

        // Feed entire Column
        for (let r = 0; r < 4; r++) {
            if (r !== row) fed.push({r, c: col});
        }

        return fed;
    }
}