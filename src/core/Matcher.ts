// 1. Import GridCell
import { type ResourceType, type Building, type GridCell } from "./Types";

export class Matcher {
    // --- Pattern Helpers (These stay ResourceType because patterns are just resources) ---
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

    // --- Search Logic (Update these to accept GridCell[][]) ---
    
    // Change 'board' type to GridCell[][]
    static findMatches(board: GridCell[][], building: Building) {
        const symmetries = this.getSymmetries(building.pattern);
        const matches = [];

        for (const pattern of symmetries) {
            const height = pattern.length;
            const width = pattern[0].length;

            for (let r = 0; r <= 4 - height; r++) {
                for (let c = 0; c <= 4 - width; c++) {
                    if (this.isMatch(board, pattern, r, c)) {
                        matches.push({ row: r, col: c, pattern });
                    }
                }
            }
        }
        return matches;
    }

    // Change 'board' type to GridCell[][]
    private static isMatch(board: GridCell[][], pattern: ResourceType[][], startR: number, startC: number): boolean {
        return pattern.every((row, r) =>
            row.every((cell, c) => {
                if (cell === 'NONE') return true;
                
                // This comparison works fine: 
                // If board has 'COTTAGE' and pattern has 'WOOD', they won't match.
                return board[startR + r][startC + c] === cell;
            })
        );
    }
}