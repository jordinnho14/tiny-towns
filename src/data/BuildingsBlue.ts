import { FixedScoreStrategy } from '../core/ScoringStrategies';
import { type Building, Resource } from '../core/Types';

export const COTTAGE: Building = {
    name: 'Cottage',
    type: 'BLUE',
    pattern: [
        [Resource.NONE, Resource.WHEAT],
        [Resource.BRICK, Resource.GLASS]
    ],
    scorer: new FixedScoreStrategy(3, true),
    feedCost: 1,
    description: "3 points if fed."
};

export const BLUE_BUILDINGS = [COTTAGE];