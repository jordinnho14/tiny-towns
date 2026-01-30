import { AdjacentFeederStrategy, ContiguousFeederStrategy, GlobalFeederStrategy } from './FeederStrategies';
import { AdjacencyStrategy, FixedScoreStrategy, GlobalUniqueStrategy, LargestGroupStrategy, MausoleumStrategy, MissingTypeStrategy, SavedScoreStrategy, UniqueLineStrategy, UniqueNeighborStrategy } from './ScoringStrategies';
import { type Building, BuildingType, Resource } from './Types';

// --- BLUE (Cottages) ---
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


// --- RED (Farm/Food) ---
export const FARM: Building = {
    name: 'Farm',
    type: 'RED',
    pattern: [
        [Resource.WHEAT, Resource.WHEAT],
        [Resource.WOOD, Resource.WOOD]
    ],
    feeder: new GlobalFeederStrategy(4),
    description: "Feeds 4 cottages anywhere on the board."
};

export const GRANARY: Building = {
    name: 'Granary',
    type: 'RED',
    pattern: [
        [Resource.WHEAT, Resource.WHEAT],
        [Resource.WOOD, Resource.BRICK]
    ],
    feeder: new AdjacentFeederStrategy(),
    description: 'Feeds all buildings in the 8 squares surrounding it.'
};

export const GREENHOUSE: Building = {
    name: 'Greenhouse',
    type: 'RED',
    pattern: [
        [Resource.WHEAT, Resource.GLASS],
        [Resource.WOOD, Resource.WOOD]
    ],
    feeder: new ContiguousFeederStrategy(),
    description: "Feeds one contiguous group of Cottages.",
};

export const RED_BUILDINGS = [FARM, GRANARY, GREENHOUSE];


// --- GRAY (Wells/Industry) ---
export const WELL: Building = {
    name: 'Well',
    type: 'GRAY',
    pattern: [
        [Resource.WOOD, Resource.STONE]
    ],
    description: '1 point for each adjacent cottage.',
    scorer: new AdjacencyStrategy([BuildingType.COTTAGE, BuildingType.BARRETT_CASTLE], 1)
};
export const GRAY_BUILDINGS = [WELL];


// --- GREEN (Taverns) ---
export const TAVERN: Building = {
    name: 'Tavern',
    type: 'GREEN',
    pattern: [
        [Resource.BRICK, Resource.BRICK, Resource.GLASS]
    ],
    description: 'Score increasing points for each Tavern you have built.',
};
export const GREEN_BUILDINGS = [TAVERN];


// --- YELLOW (Theaters/Commercial) ---
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
export const YELLOW_BUILDINGS = [THEATER];


// --- BLACK (Factory/Goods) ---
export const FACTORY: Building = {
    name: 'Factory',
    type: 'BLACK',
    pattern: [
        [Resource.WOOD, Resource.NONE, Resource.NONE, Resource.NONE],
        [Resource.BRICK, Resource.STONE, Resource.STONE, Resource.BRICK]
    ],
    description: 'Place 1 resource on the factory, whenever another player chooses that resource, play a different one instead.'
};
//TODO: IMPLEMENT FACTORY MECHANICS
export const BLACK_BUILDINGS = [FACTORY];


// --- ORANGE (Chapels) ---
export const CHAPEL: Building = {
    name: 'Chapel',
    type: 'ORANGE',
    pattern: [
        [Resource.NONE, Resource.NONE, Resource.GLASS],
        [Resource.STONE, Resource.GLASS, Resource.STONE]
    ],
    description: 'Scores 1 point for each fed cottage.',
};
export const ORANGE_BUILDINGS = [CHAPEL];


// --- PURPLE (Monuments) ---
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

// Combined list (for compatibility and easy access)
export const BUILDING_REGISTRY = [
    ...BLUE_BUILDINGS,
    ...RED_BUILDINGS,
    ...GRAY_BUILDINGS,
    ...GREEN_BUILDINGS,
    ...YELLOW_BUILDINGS,
    ...BLACK_BUILDINGS,
    ...ORANGE_BUILDINGS,
    ...MONUMENTS_LIST
];