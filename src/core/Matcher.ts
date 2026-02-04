import { type ResourceType, type Building, type GridCell } from "./Types";

export class Matcher {
    // --- Pattern Helpers ---
    static rotate(matrix: ResourceType[][]): ResourceType[][] {
        return matrix[0].map((_, i) => matrix.map(row => row[i]).reverse());
    }

    static flip(matrix: ResourceType[][]): ResourceType[][] {
        return matrix.map(row => [...row].reverse());
    }

    static getSymmetries(pattern: ResourceType[][]): ResourceType[][][] {
        const symmetries = new Set<string>();
        let current = pattern;
        for (let i = 0; i < 4; i++) {
            symmetries.add(JSON.stringify(current));
            symmetries.add(JSON.stringify(this.flip(current)));
            current = this.rotate(current);
        }
        return Array.from(symmetries).map(s => JSON.parse(s));
    }

    // --- Search Logic ---
    // Updated signature: accept metadata
    static findMatches(board: GridCell[][], building: Building, metadata?: any) {
        const symmetries = this.getSymmetries(building.pattern);
        const matches = [];

        for (const pattern of symmetries) {
            const height = pattern.length;
            const width = pattern[0].length;

            for (let r = 0; r <= 4 - height; r++) {
                for (let c = 0; c <= 4 - width; c++) {
                    // Pass metadata down
                    if (this.isMatch(board, pattern, r, c, metadata)) {
                        matches.push({ row: r, col: c, pattern });
                    }
                }
            }
        }
        return matches;
    }

    private static isMatch(
        board: GridCell[][], 
        pattern: ResourceType[][], 
        startR: number, 
        startC: number,
        metadata?: any
    ): boolean {
        return pattern.every((row, r) =>
            row.every((requiredResource, c) => {
                const rPos = startR + r;
                const cPos = startC + c;
                const boardCell = board[rPos][cPos];

                // 1. Skip empty pattern slots (Always a match)
                if (requiredResource === 'NONE') return true;

                // 2. Exact Match (Resource on board matches pattern)
                if (boardCell === requiredResource) return true;

                // 3. Trading Post (Wildcard)
                if (boardCell && (boardCell as string).toUpperCase().replace('_', ' ') === 'TRADING POST') {
                    return true;
                }

                // 4. Stored Resource (Statue of the Bondmaker Logic)
                // If the pattern needs [WOOD], and the board has a Cottage holding [WOOD], that counts.
                if (metadata) {
                    // Handle Map or Object structure
                    const key = `${rPos},${cPos}`;
                    const meta = (metadata instanceof Map) ? metadata.get(key) : metadata[key];
                    
                    if (meta && meta.storedResource === requiredResource) {
                        return true;
                    }
                }

                return false;
            })
        );
    }
}