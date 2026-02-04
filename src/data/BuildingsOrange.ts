import { AdjacentFedStrategy, CornerBuildingCountStrategy, FedCottageCountStrategy, RestrictedNeighborStrategy } from '../core/ScoringStrategies';
import { type Building, Resource } from '../core/Types';

export const CHAPEL: Building = {
    name: 'Chapel',
    type: 'ORANGE',
    pattern: [
        [Resource.NONE, Resource.NONE, Resource.GLASS],
        [Resource.STONE, Resource.GLASS, Resource.STONE]
    ],
    description: 'Scores 1 point for each fed cottage.',
    scorer: new FedCottageCountStrategy()
};

export const ABBEY: Building = {
    name: 'Abbey',
    type: 'ORANGE',
    pattern: [
        [Resource.NONE, Resource.NONE, Resource.GLASS],
        [Resource.BRICK, Resource.STONE, Resource.STONE]
    ],
    description: '3 points if not adjacent to a black, green or yellow building.',
    scorer: new RestrictedNeighborStrategy(['BLACK', 'GREEN', 'YELLOW'], 3)
};

export const CLOISTER: Building = {
    name: 'Cloister',
    type: 'ORANGE',
    pattern: [
        [Resource.NONE, Resource.NONE, Resource.GLASS],
        [Resource.WOOD, Resource.BRICK, Resource.STONE]
    ],
    description: 'Scores 1 point for each cloister in a corner of your town.',
    scorer: new CornerBuildingCountStrategy('CLOISTER')
};

export const TEMPLE: Building = {
    name: 'Temple',
    type: 'ORANGE',
    pattern: [
        [Resource.NONE, Resource.NONE, Resource.GLASS],
        [Resource.BRICK, Resource.BRICK, Resource.STONE]
    ],
    description: '4 points if adjacent to 2 or more fed cottages.',
    scorer: new AdjacentFedStrategy(2, 4)
};

export const ORANGE_BUILDINGS = [CHAPEL, ABBEY, CLOISTER, TEMPLE];