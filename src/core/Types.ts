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

export const BuildingType = {
    COTTAGE: 'COTTAGE',
    WELL: 'WELL',
    FACTORY: 'FACTORY',
    FARM: 'FARM',
    TAVERN: 'TAVERN',
    THEATER: 'THEATER',
    CHAPEL: 'CHAPEL',
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

    scorer?: ScoringStrategy; 
    feeds?: number; 
    feedCost?: number;
    countsAs?: BuildingName[];
}