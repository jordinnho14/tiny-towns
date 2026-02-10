import type { ResourceType } from './Types';

export interface EffectStrategy {
    type: string;
    description: string;
    // Helper to check if this building allows a swap
    canSwap?(storedResource: ResourceType, incomingResource: ResourceType): boolean;
}

export class FactoryStrategy implements EffectStrategy {
    readonly type = 'FACTORY';
    readonly description = "Stores a resource. Allows swapping that resource when chosen by others.";

    // Logic: If the incoming resource matches what we have stored, we can swap.
    canSwap(storedResource: ResourceType, incomingResource: ResourceType): boolean {
        return storedResource === incomingResource;
    }
}

export class BankStrategy implements EffectStrategy {
    readonly type = 'BANK';
    readonly description = "Stores a resource. You cannot choose this resource as Master Builder.";
    // No specific methods needed, the type check is enough
}

export class WarehouseStrategy implements EffectStrategy {
    readonly type = 'WAREHOUSE';
    readonly description = "Stores up to 3 resources. You can Swap the current resource with one in storage. -1 point for each resource left at the end.";
    readonly capacity = 3;
}

export class StatueBondmakerStrategy implements EffectStrategy {
    readonly type = 'STATUE_BONDMAKER';
    readonly description = "When another player names a resource, you may place it on a square with a Cottage.";
}

export class GroveUniversityStrategy implements EffectStrategy {
    readonly type = 'GROVE_UNIVERSITY';
    readonly description = "Immediately place a building on an empty square in your town.";
}

export class FortIronweedStrategy implements EffectStrategy {
    readonly type = 'FORT_IRONWEED';
    readonly description = "Unless you are the last player in the game, you can no longer take turns as the Master Builder.";
}

export class ArchitectsGuildStrategy implements EffectStrategy {
    readonly type = 'ARCHITECTS_GUILD';
    readonly description = "Replace up to 2 buildings in your town with any other building types.";
}

export class OpaleyeWatchStrategy implements EffectStrategy {
    readonly type = 'OPALEYE_WATCH';
    readonly description = "Place 3 unique buildings on this card. When neighbors build them, you get them.";
}