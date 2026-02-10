import { AlmshouseStrategy, FeastHallStrategy, IsolatedStrategy } from '../core/ScoringStrategies';
import { type Building, Resource } from '../core/Types';

export const ALMSHOUSE: Building = {
    name: 'Almshouse',
    type: 'GREEN',
    pattern: [
        [Resource.STONE, Resource.STONE, Resource.GLASS]
    ],
    description: 'Score increasing points for each Almshouse you have built.',
    scorer: new AlmshouseStrategy()
};

export const INN: Building = {
    name: 'Inn',
    type: 'GREEN',
    pattern: [
        [Resource.WHEAT, Resource.STONE, Resource.GLASS]
    ],
    description: 'Get 3 points if not in a row or column with another Inn.',
    scorer: new IsolatedStrategy()
};

export const FEAST_HALL: Building = {
    name: 'Feast Hall',
    type: 'GREEN',
    pattern: [
        [Resource.WOOD, Resource.WOOD, Resource.GLASS]
    ],
    description: 'Get 2 points, and an extra 1 if you have more Feast Halls than the player on your right.',
    scorer: new FeastHallStrategy()
};

export const TAVERN: Building = {
    name: 'Tavern',
    type: 'GREEN',
    pattern: [
        [Resource.BRICK, Resource.BRICK, Resource.GLASS]
    ],
    description: 'Score increasing points for each Tavern you have built.',
};

export const GREEN_BUILDINGS = [TAVERN, INN, ALMSHOUSE, FEAST_HALL];