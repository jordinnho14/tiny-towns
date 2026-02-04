import { AdjacencyRequirementStrategy, AdjacencyStrategy, CategoryAdjacencyStrategy, FixedScoreStrategy } from '../core/ScoringStrategies';
import { type Building, BuildingType, Resource } from '../core/Types';

export const WELL: Building = {
    name: 'Well',
    type: 'GRAY',
    pattern: [
        [Resource.WOOD, Resource.STONE]
    ],
    description: '1 point for each adjacent cottage.',
    scorer: new AdjacencyStrategy([BuildingType.COTTAGE, BuildingType.BARRETT_CASTLE], 1)
};

export const FOUNTAIN: Building = {
    name: 'Fountain',
    type: 'GRAY',
    description: "2 points if adjacent to a Cottage.",
    pattern: [[Resource.WOOD, Resource.STONE]],
    scorer: new AdjacencyRequirementStrategy([BuildingType.COTTAGE, BuildingType.BARRETT_CASTLE], 2)
};

export const MILLSTONE: Building = {
    name: 'Millstone',
    type: 'GRAY',
    description: "2 points if adjacent to a Red or Yellow building.",
    pattern: [[Resource.WOOD, Resource.STONE]],
    scorer: new CategoryAdjacencyStrategy(['RED', 'YELLOW'], 2)
};

export const SHED: Building = {
    name: 'Shed',
    type: 'GRAY',
    description: "Worth 1 point. (Standard placement rules apply).",
    pattern: [[Resource.WOOD, Resource.STONE]],
    scorer: new FixedScoreStrategy(1)
};

export const GRAY_BUILDINGS = [WELL, FOUNTAIN, MILLSTONE, SHED];