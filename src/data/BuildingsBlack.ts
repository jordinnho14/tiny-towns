import { BankStrategy, FactoryStrategy, WarehouseStrategy } from '../core/EffectStrategies';
import { FixedScoreStrategy } from '../core/ScoringStrategies';
import { type Building, Resource } from '../core/Types';

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
        [Resource.STONE, Resource.WOOD, Resource.NONE],
        [Resource.STONE, Resource.WOOD, Resource.BRICK]
    ],
    scorer: new FixedScoreStrategy(1)
};

export const BANK: Building = {
    name: 'Bank',
    type: 'BLACK',
    description: "4 points. Place a resource on this building - you can no longer select this resource as master builder.",
    pattern: [
        [Resource.WHEAT, Resource.WHEAT, Resource.NONE],
        [Resource.WOOD, Resource.GLASS, Resource.BRICK]
    ],
    scorer: new FixedScoreStrategy(4),
    effect: new BankStrategy()
};

export const WAREHOUSE: Building = {
    name: 'Warehouse',
    type: 'BLACK',
    description: "-1 for each resource on this building. When another player chooses a resource, you may place that resource on the warehouse, or swap it with a resource already stored here. It can store 3 resources.",
    pattern: [
        [Resource.WHEAT, Resource.WOOD, Resource.WHEAT],
        [Resource.BRICK, Resource.NONE, Resource.BRICK]
    ],
    effect: new WarehouseStrategy()
};

export const BLACK_BUILDINGS = [FACTORY, TRADING_POST, BANK, WAREHOUSE];