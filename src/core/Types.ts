import type { ScoringStrategy } from "./ScoringStrategies";

export const Resource = {
    WOOD: 'WOOD',
    WHEAT: 'WHEAT',
    BRICK: 'BRICK',
    GLASS: 'GLASS',
    STONE: 'STONE',
    NONE: 'NONE'
} as const;

export type ResourceType = typeof Resource[keyof typeof Resource];
export interface FeederStrategy {
    getFedPositions(bRow: number, bCol: number, grid: GridCell[][]): {r: number, c: number}[];
}
export type BuildingCategory = 'BLUE' | 'RED' | 'GRAY' | 'ORANGE' | 'GREEN' | 'YELLOW' | 'BLACK' | 'PURPLE';

export const BuildingType = {
    COTTAGE: 'COTTAGE',
    // --- GREY BUILDINGS ---
    WELL: 'WELL',
    SHED: 'SHED',
    MILLSTONE: 'MILLSTONE',
    FOUNTAIN: 'FOUNTAIN',
    // --- BLACK BUILDINGS ---
    FACTORY: 'FACTORY',
    TRADING_POST: 'TRADING_POST',
    // --- RED BUILDINGS ---
    FARM: 'FARM',
    GRANARY: 'GRANARY',
    ORCHARD: 'ORCHARD',
    GREENHOUSE: 'GREENHOUSE',
    // --- GREEN BUILDINGS ---
    TAVERN: 'TAVERN',
    INN: 'INN',
    ALMSHOUSE: 'ALMSHOUSE',
    FEAST_HALL: 'FEAST_HALL',
    // --- YELLOW BUILDINGS ---
    MARKET: 'MARKET',
    TAILOR: 'TAILOR',
    BAKERY: 'BAKERY',
    THEATER: 'THEATER',
    // --- ORANGE BUILDINGS ---
    CHAPEL: 'CHAPEL',
    ABBEY: 'ABBEY',
    CLOISTER: 'CLOISTER',
    TEMPLE: 'TEMPLE',
    // Monuments
    ARCHIVE: 'ARCHIVE',
    BARRETT_CASTLE: 'BARRETT_CASTLE',
    OBELISK: 'OBELISK',
    MANDRAS: 'MANDRAS',
    SHRINE: 'SHRINE',
    BATHS: 'BATHS',
    FORUM: 'FORUM',
    MAUSOLEUM: 'MAUSOLEUM',
    CATHEDRAL: 'CATHEDRAL'
} as const;

export type BuildingName = typeof BuildingType[keyof typeof BuildingType];
export type GridCell = ResourceType | BuildingName;

export interface Building {
    name: string;
    pattern: ResourceType[][];
    isMonument?: boolean;
    type: BuildingCategory
    feeder?: FeederStrategy;
    scorer?: ScoringStrategy; 
    feedCost?: number;
    countsAs?: BuildingName[];
    description?: string;
}