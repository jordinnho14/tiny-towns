import { FixedScoreStrategy, GlobalUniqueStrategy, LargestGroupStrategy, MausoleumStrategy, MissingTypeStrategy, SavedScoreStrategy, UniqueNeighborStrategy } from '../core/ScoringStrategies';
import { type Building, BuildingType, Resource } from '../core/Types';

export const ARCHIVE: Building = {
    name: 'Archive',
    type: 'PURPLE',
    pattern: [
        [Resource.WHEAT, Resource.WHEAT],
        [Resource.BRICK, Resource.GLASS]
    ],
    scorer: new GlobalUniqueStrategy(),
    isMonument: true
};

export const BARRETT_CASTLE: Building = {
    name: 'Barrett Castle',
    type: 'PURPLE',
    pattern: [
        [Resource.WHEAT, Resource.NONE, Resource.NONE, Resource.STONE],
        [Resource.WOOD, Resource.GLASS, Resource.GLASS, Resource.BRICK]
    ],
    scorer: new FixedScoreStrategy(5, true),
    feedCost: 1,
    countsAs: [BuildingType.COTTAGE],
    isMonument: true
};

export const OBELISK: Building = {
    name: 'Obelisk of the Crescent',
    type: 'PURPLE',
    pattern: [
        [Resource.WHEAT, Resource.NONE, Resource.NONE],
        [Resource.BRICK, Resource.GLASS, Resource.BRICK],
    ],
    isMonument: true
};

export const MANDRAS: Building = {
    name: 'Mandras',
    type: 'PURPLE',
    pattern: [
        [Resource.WHEAT, Resource.GLASS],
        [Resource.BRICK, Resource.WOOD],
    ],
    scorer: new UniqueNeighborStrategy(2),
    isMonument: true    
};

export const SHRINE: Building = {
    name: 'Shrine of the Elder Tree',
    type: 'PURPLE',
    pattern: [
        [Resource.BRICK, Resource.WHEAT, Resource.STONE],
        [Resource.WOOD, Resource.GLASS, Resource.WOOD],       
    ],
    isMonument: true,
    scorer: new SavedScoreStrategy()
};

export const BATHS: Building = {
    name: 'Baths',
    type: 'PURPLE',
    pattern: [
        [Resource.NONE, Resource.WHEAT, Resource.NONE],
        [Resource.STONE, Resource.GLASS, Resource.WOOD],
        [Resource.BRICK, Resource.NONE, Resource.BRICK],
    ],
    isMonument: true,
    scorer: new MissingTypeStrategy()
};

export const FORUM: Building = {
    name: 'Forum',
    type: 'PURPLE',
    pattern: [
        [Resource.NONE, Resource.NONE, Resource.WHEAT, Resource.NONE],
        [Resource.BRICK, Resource.BRICK, Resource.STONE, Resource.WOOD]
    ],
    isMonument: true,
    scorer: new LargestGroupStrategy()
};

export const MAUSOLEUM: Building = {
    name: 'Mausoleum',
    type: 'PURPLE',
    pattern: [
        [Resource.WOOD, Resource.WOOD],
        [Resource.BRICK, Resource.STONE]
    ],
    isMonument: true,
    scorer: new MausoleumStrategy()
};

export const CATHEDRAL: Building = {
    name: 'Cathedral',
    type: 'PURPLE',
    pattern: [
        [Resource.NONE, Resource.WHEAT],
        [Resource.STONE, Resource.GLASS]
    ],
    isMonument: true,
    scorer: new FixedScoreStrategy(2, false)
};

export const MONUMENTS_LIST = [ARCHIVE, BARRETT_CASTLE, OBELISK, MANDRAS, SHRINE, BATHS, FORUM, MAUSOLEUM, CATHEDRAL];