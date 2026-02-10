import { ArchitectsGuildStrategy, FortIronweedStrategy, GroveUniversityStrategy, OpaleyeWatchStrategy, StatueBondmakerStrategy } from '../core/EffectStrategies';
import { FixedScoreStrategy, GlobalUniqueStrategy, LargestGroupStrategy, MausoleumStrategy, MissingTypeStrategy, SavedScoreStrategy, StarloomScoreStrategy, UniqueNeighborStrategy } from '../core/ScoringStrategies';
import { type Building, BuildingType, Resource } from '../core/Types';

export const ARCHIVE: Building = {
    name: 'Archive of the Second Age',
    type: 'PURPLE',
    pattern: [
        [Resource.WHEAT, Resource.WHEAT],
        [Resource.BRICK, Resource.GLASS]
    ],
    scorer: new GlobalUniqueStrategy(),
    isMonument: true,
    description: 'Scores 1 point for each unique building type on the board.'
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
    isMonument: true,
    description: 'Scores 5 points if fed. Counts as 2 cottages.'
};

export const OBELISK: Building = {
    name: 'Obelisk of the Crescent',
    type: 'PURPLE',
    pattern: [
        [Resource.WHEAT, Resource.NONE, Resource.NONE],
        [Resource.BRICK, Resource.GLASS, Resource.BRICK],
    ],
    isMonument: true,
    description: 'You may place all future buildings on any empty square in your town.'
};

export const MANDRAS: Building = {
    name: 'Mandras Palace',
    type: 'PURPLE',
    pattern: [
        [Resource.WHEAT, Resource.GLASS],
        [Resource.BRICK, Resource.WOOD],
    ],
    scorer: new UniqueNeighborStrategy(2),
    isMonument: true,
    description: 'Scores 2 points for each unique adjacent building type.'
};

export const SHRINE: Building = {
    name: 'Shrine of the Elder Tree',
    type: 'PURPLE',
    pattern: [
        [Resource.BRICK, Resource.WHEAT, Resource.STONE],
        [Resource.WOOD, Resource.GLASS, Resource.WOOD],       
    ],
    isMonument: true,
    scorer: new SavedScoreStrategy(),
    description: 'Gain points based on the number of buildings in your town when constructed.'
};

export const BATHS: Building = {
    name: 'The Sky Baths',
    type: 'PURPLE',
    pattern: [
        [Resource.NONE, Resource.WHEAT, Resource.NONE],
        [Resource.STONE, Resource.GLASS, Resource.WOOD],
        [Resource.BRICK, Resource.NONE, Resource.BRICK],
    ],
    isMonument: true,
    scorer: new MissingTypeStrategy(),
    description: 'Scores 2 points for each building type your town is missing.'
};

export const FORUM: Building = {
    name: 'Silva Forum',
    type: 'PURPLE',
    pattern: [
        [Resource.NONE, Resource.NONE, Resource.WHEAT, Resource.NONE],
        [Resource.BRICK, Resource.BRICK, Resource.STONE, Resource.WOOD]
    ],
    isMonument: true,
    scorer: new LargestGroupStrategy(),
    description: 'Gain 1 point, plus 1 for each building in the largest contiguous group of buildings of the same type in your town.'
};

export const MAUSOLEUM: Building = {
    name: 'Grand Mausoleum of the Rodina',
    type: 'PURPLE',
    pattern: [
        [Resource.WOOD, Resource.WOOD],
        [Resource.BRICK, Resource.STONE]
    ],
    isMonument: true,
    scorer: new MausoleumStrategy(),
    description: 'Your unfed cottages are worth 3 points each.'
};

export const CATHEDRAL: Building = {
    name: 'Cathedral of Caterina',
    type: 'PURPLE',
    pattern: [
        [Resource.NONE, Resource.WHEAT],
        [Resource.STONE, Resource.GLASS]
    ],
    isMonument: true,
    scorer: new FixedScoreStrategy(2, false),
    description: '2 points. Empty squares in your town are worth 0 points (instead of -1).'
};

export const STATUE: Building = {
    name: 'Statue of the Bondmaker',
    type: 'PURPLE',
    pattern: [
        [Resource.WOOD, Resource.STONE, Resource.STONE, Resource.GLASS],
        [Resource.WHEAT, Resource.NONE, Resource.NONE, Resource.NONE]
    ],
    isMonument: true,
    description: 'When another player names a resource, you may choose to place it on a square with a cottage. Each of your cottages can hold 1 resource.',
    effect: new StatueBondmakerStrategy()
};

export const GUILD: Building = {
    name: 'Architect\'s Guild',
    type: 'PURPLE',
    pattern: [
        [Resource.NONE, Resource.NONE, Resource.GLASS],
        [Resource.NONE, Resource.WHEAT, Resource.STONE],
        [Resource.WOOD, Resource.BRICK, Resource.NONE]
    ],
    isMonument: true,
    scorer: new FixedScoreStrategy(1, false),
    description: '1 point. When constructed, replace up to 2 buildings in your town with any other building types.',
    effect: new ArchitectsGuildStrategy()
};

export const UNIVERSITY: Building = {
    name: 'Grove University',
    type: 'PURPLE',
    pattern: [
        [Resource.NONE, Resource.BRICK, Resource.NONE],
        [Resource.STONE, Resource.GLASS, Resource.STONE]
    ],
    isMonument: true,
    scorer: new FixedScoreStrategy(3, false),
    description: '3 points. Immediately place a building on an empty square in your town.',
    effect: new GroveUniversityStrategy()
};

export const WATCH: Building = {
    name: 'Opaleye\'s Watch',
    type: 'PURPLE',
    pattern: [
        [Resource.WOOD, Resource.NONE, Resource.NONE, Resource.NONE],
        [Resource.BRICK, Resource.GLASS, Resource.WHEAT, Resource.WHEAT],
        [Resource.STONE, Resource.NONE, Resource.NONE, Resource.NONE ]
    ],
    isMonument: true,
    description: 'Immediately place 3 unique buildings on this card. Whenever a player on the left or right of you constructs 1 of those buildings, take the building from here and place it on an empty square in your town.',
    effect: new OpaleyeWatchStrategy()
};

export const FORT: Building = {
    name: 'Fort Ironweed',
    type: 'PURPLE',
    pattern: [
        [Resource.WHEAT, Resource.NONE, Resource.BRICK],
        [Resource.STONE, Resource.WOOD, Resource.STONE],
    ],
    isMonument: true,
    scorer: new FixedScoreStrategy(7, false),
    description: '7 points. Unless you are the last player in the game you can no longer take turns as the master builder.',
    effect: new FortIronweedStrategy()
};


export const STARLOOM: Building = {
    name: 'The Starloom',
    type: 'PURPLE',
    pattern: [
        [Resource.GLASS, Resource.GLASS],
        [Resource.WOOD, Resource.WHEAT]
    ],
    isMonument: true,
    description: 'Gain points based on how early you complete your town.',
    scorer: new StarloomScoreStrategy()
};




export const MONUMENTS_LIST = [ARCHIVE, FORT, BARRETT_CASTLE, OBELISK, STATUE, GUILD, UNIVERSITY, WATCH, MANDRAS, SHRINE, BATHS, FORUM, MAUSOLEUM, CATHEDRAL, STARLOOM];