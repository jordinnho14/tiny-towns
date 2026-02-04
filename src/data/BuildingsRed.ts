import { AdjacentFeederStrategy, ContiguousFeederStrategy, GlobalFeederStrategy, RowColFeederStrategy } from '../core/FeederStrategies';
import { type Building, Resource } from '../core/Types';

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