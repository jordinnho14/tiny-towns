import { BankStrategy, FactoryStrategy } from './EffectStrategies';
import { AdjacentFeederStrategy, ContiguousFeederStrategy, GlobalFeederStrategy, RowColFeederStrategy } from './FeederStrategies';
import { AdjacencyRequirementStrategy, AdjacencyStrategy, AdjacentFedStrategy, AlmshouseStrategy, CategoryAdjacencyStrategy, CenterCountStrategy, CornerBuildingCountStrategy, FedCottageCountStrategy, FixedScoreStrategy, GlobalUniqueStrategy, IsolatedStrategy, LargestGroupStrategy, LineCountStrategy, MausoleumStrategy, MissingTypeStrategy, RestrictedNeighborStrategy, SavedScoreStrategy, UniqueLineStrategy, UniqueNeighborStrategy } from './ScoringStrategies';
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

export const ORCHARD: Building = {
    name: 'Orchard',
    type: 'RED',
    description: "Feeds Cottages in the same row and column.",
    pattern: [
        [Resource.STONE, Resource.WHEAT],
        [Resource.WHEAT, Resource.WOOD]
    ],
    feeder: new RowColFeederStrategy()
};

export const RED_BUILDINGS = [FARM, GRANARY, GREENHOUSE, ORCHARD];

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


// --- GREEN (Taverns) ---
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
    scorer: new FixedScoreStrategy(2)
    //TODO: IMPLEMENT SCORING WHEN MULTIPLAYER IS ADDED
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


// --- BLACK (Factory/Goods) ---
export const FACTORY: Building = {
    name: 'Factory',
    type: 'BLACK',
    pattern: [
        [Resource.WOOD, Resource.NONE, Resource.NONE, Resource.NONE],
        [Resource.BRICK, Resource.STONE, Resource.STONE, Resource.BRICK]
    ],
    description: 'Place 1 resource on the factory, whenever another player chooses that resource, play a different one instead.',
    effect: new FactoryStrategy()
};

export const TRADING_POST: Building = {
    name: 'Trading Post',
    type: 'BLACK',
    description: "1 point. Counts as a WILD (any) resource for future buildings.",
    pattern: [
        [Resource.STONE, Resource.STONE, Resource.NONE],
        [Resource.WOOD, Resource.WOOD, Resource.BRICK]
    ],
    scorer: new FixedScoreStrategy(1)
};

export const BANK: Building = {
    name: 'Bank',
    type: 'BLACK',
    description: "4 points. Place a resource on this building - you can no longer select this resource as master builder.",
    pattern: [
        [Resource.STONE, Resource.STONE, Resource.NONE],
        [Resource.WOOD, Resource.WOOD, Resource.BRICK]
    ],
    scorer: new FixedScoreStrategy(4),
    effect: new BankStrategy()
};

export const WAREHOUSE: Building = {
    name: 'Warehouse',
    type: 'BLACK',
    description: "-1 for each resource on this building. YADA YADA YADA",
    pattern: [
        [Resource.STONE, Resource.STONE, Resource.NONE],
        [Resource.WOOD, Resource.WOOD, Resource.BRICK]
    ],
    scorer: new FixedScoreStrategy(1)
    // TODO: IMPLEMENT WAREHOUSE MECHANICS
};

export const BLACK_BUILDINGS = [FACTORY, TRADING_POST, BANK, WAREHOUSE];


// --- ORANGE (Religious) ---
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