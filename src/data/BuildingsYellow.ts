import { CategoryAdjacencyStrategy, CenterCountStrategy, LineCountStrategy, UniqueLineStrategy } from '../core/ScoringStrategies';
import { type Building, Resource } from '../core/Types';

export const THEATER: Building = {
    name: 'Theater',
    type: 'YELLOW',
    pattern: [
        [Resource.NONE, Resource.STONE, Resource.NONE],
        [Resource.WOOD, Resource.GLASS, Resource.WOOD]
    ],
    scorer: new UniqueLineStrategy(),
    description: '1 point for each unique building type in the same row and column.'
};

export const BAKERY: Building = {
    name: 'Bakery',
    type: 'YELLOW',
    description: "3 points if adjacent to a Food (Red) building.",
    pattern: [
        [Resource.NONE, Resource.WHEAT, Resource.NONE],
        [Resource.BRICK, Resource.GLASS, Resource.BRICK]
    ],
    scorer: new CategoryAdjacencyStrategy(['RED'], 3)
};

export const MARKET: Building = {
    name: 'Market',
    type: 'YELLOW',
    description: "1 point for each other Market in the same row or column.",
    pattern: [
        [Resource.NONE, Resource.WOOD, Resource.NONE],
        [Resource.STONE, Resource.GLASS, Resource.STONE]
    ],
    scorer: new LineCountStrategy()
};

export const TAILOR: Building = {
    name: 'Tailor',
    type: 'YELLOW',
    description: "1 point. +1 point for each other Tailor in the 4 center squares.",
    pattern: [
        [Resource.NONE, Resource.WHEAT, Resource.NONE],
        [Resource.STONE, Resource.GLASS, Resource.STONE]
    ],
    scorer: new CenterCountStrategy()
};

export const YELLOW_BUILDINGS = [THEATER, BAKERY, MARKET, TAILOR];