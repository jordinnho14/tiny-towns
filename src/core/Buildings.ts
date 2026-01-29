import { AdjacencyStrategy, FixedScoreStrategy, GlobalUniqueStrategy, LargestGroupStrategy, MausoleumStrategy, MissingTypeStrategy, SavedScoreStrategy, UniqueLineStrategy, UniqueNeighborStrategy } from './ScoringStrategies';
import { type Building, BuildingType, Resource } from './Types';

export const COTTAGE: Building = {
    name: 'Cottage',
    pattern: [
        [Resource.NONE, Resource.WHEAT],
        [Resource.BRICK, Resource.GLASS]
    ],

    scorer: new FixedScoreStrategy(3, true),
    feedCost: 1
};

export const WELL: Building = {
    name: 'Well',
    pattern: [
        [Resource.WOOD, Resource.STONE]
    ],
    scorer: new AdjacencyStrategy([BuildingType.COTTAGE, BuildingType.BARRETT_CASTLE], 1)
};

export const FARM: Building = {
    name: 'Farm',
    pattern: [
        [Resource.WHEAT, Resource.WHEAT],
        [Resource.WOOD, Resource.WOOD]
    ],
    feeds: 4
};

export const TAVERN: Building = {
    name: 'Tavern',
    pattern: [
        [Resource.BRICK, Resource.BRICK, Resource.GLASS]
    ],
};

export const THEATER: Building = {
    name: 'Theater',
    pattern: [
        [Resource.NONE, Resource.STONE, Resource.NONE],
        [Resource.WOOD, Resource.GLASS, Resource.WOOD]
    ],
    scorer: new UniqueLineStrategy()
};

export const FACTORY: Building = {
    name: 'Factory',
    pattern: [
        [Resource.WOOD, Resource.NONE, Resource.NONE, Resource.NONE],
        [Resource.BRICK, Resource.STONE, Resource.STONE, Resource.BRICK]
    ],
};

export const CHAPEL: Building = {
    name: 'Chapel',
    pattern: [
        [Resource.NONE, Resource.NONE, Resource.GLASS],
        [Resource.STONE, Resource.GLASS, Resource.STONE]
    ],
};

//-------------------- MONUMENTS --------------------

export const ARCHIVE: Building = {
    name: 'Archive',
    pattern: [
        [Resource.WHEAT, Resource.WHEAT],
        [Resource.BRICK, Resource.GLASS]
    ],
    scorer: new GlobalUniqueStrategy(),
    isMonument: true
};

export const BARRETT_CASTLE: Building = {
    name: 'Barrett Castle',
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
    pattern: [
        [Resource.WHEAT, Resource.NONE, Resource.NONE],
        [Resource.BRICK, Resource.GLASS, Resource.BRICK],
    ],
    isMonument: true
};

export const MANDRAS: Building = {
    name: 'Mandras',
    pattern: [
        [Resource.WHEAT, Resource.GLASS],
        [Resource.BRICK, Resource.WOOD],
    ],
    scorer: new UniqueNeighborStrategy(2),
    isMonument: true    
};

export const SHRINE: Building = {
    name: 'Shrine of the Elder Tree',
    pattern: [
        [Resource.BRICK, Resource.WHEAT, Resource.STONE],
        [Resource.WOOD, Resource.GLASS, Resource.WOOD],       
    ],
    isMonument: true,
    scorer: new SavedScoreStrategy()
};

export const BATHS: Building = {
    name: 'Baths',
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
    pattern: [
        [Resource.NONE, Resource.NONE, Resource.WHEAT, Resource.NONE],
        [Resource.BRICK, Resource.BRICK, Resource.STONE, Resource.WOOD]
    ],
    isMonument: true,
    scorer: new LargestGroupStrategy()
};

export const MAUSOLEUM: Building = {
    name: 'Mausoleum',
    pattern: [
        [Resource.WOOD, Resource.WOOD],
        [Resource.BRICK, Resource.STONE]
    ],
    isMonument: true,
    scorer: new MausoleumStrategy()
};

export const CATHEDRAL: Building = {
    name: 'Cathedral',
    pattern: [
        [Resource.NONE, Resource.WHEAT],
        [Resource.STONE, Resource.GLASS]
    ],
    isMonument: true,
    scorer: new FixedScoreStrategy(2, false)
};

//TODO: Still to implement:
// statue of the bondmaker
// architect's guild
// grove university
// opaleyes watch
// fort ironweed
// the starloom


// Create a registry we can loop over
export const BUILDING_REGISTRY = [COTTAGE, WELL, FARM, TAVERN, THEATER, FACTORY, CHAPEL, ARCHIVE, BARRETT_CASTLE, OBELISK, MANDRAS, SHRINE, BATHS, FORUM, MAUSOLEUM, CATHEDRAL];