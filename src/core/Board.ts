import { Resource, type ResourceType, type GridCell } from './Types';

export class Board {
    // Note: We use GridCell[][] so the grid can hold Resources OR Buildings
    private grid: GridCell[][];
    public readonly size = 4;
    public metadata: Map<string, any> = new Map();

    constructor() {
        // Initialize 4x4 grid with NONE
        this.grid = Array(this.size).fill(null)
            .map(() => Array(this.size).fill(Resource.NONE));
    }

    // Place a resource (if the spot is empty)
    public place(row: number, col: number, resource: ResourceType): void {
        if (!this.isValid(row, col)) {
            throw new Error(`Invalid coordinate: ${row}, ${col}`);
        }
        if (this.grid[row][col] !== Resource.NONE) {
            throw new Error("Spot already occupied");
        }
        this.grid[row][col] = resource;
    }

    // NEW: Remove resources and place the building
    public constructBuilding(
        patternCoords: {row: number, col: number}[], 
        targetRow: number, 
        targetCol: number, 
        buildingName: string
    ): void {
        // 1. Verify the target is part of the pattern
        const validTarget = patternCoords.some(p => p.row === targetRow && p.col === targetCol);
        if (!validTarget && this.grid[targetRow][targetCol] !== 'NONE') {
             throw new Error("Building must be placed on one of the pattern squares.");
        }

        // 2. Clear all resources used in the pattern
        this.clear(patternCoords);

        // 3. Place the building
        this.grid[targetRow][targetCol] = buildingName as GridCell;
    }

    // Helper to clear specific cells
    public clear(coords: {row: number, col: number}[]): void {
        coords.forEach(({row, col}) => {
            if (this.isValid(row, col)) {
                this.grid[row][col] = Resource.NONE;
                this.metadata.delete(`${row},${col}`);
            }
        });
    }

    // Get a snapshot of the board
    public getGrid(): GridCell[][] {
        return this.grid.map(row => [...row]);
    }

    private isValid(r: number, c: number): boolean {
        return r >= 0 && r < this.size && c >= 0 && c < this.size;
    }

    remove(r: number, c: number): void {
        if (this.isValid(r, c)) {
            this.grid[r][c] = 'NONE';
            this.metadata.delete(`${r},${c}`);
        }
    }

    setMetadata(r: number, c: number, data: any) {
        this.metadata.set(`${r},${c}`, data);
    }
    
    getMetadata(r: number, c: number) {
        return this.metadata.get(`${r},${c}`);
    }
}