import type { ResourceType } from './Types';

export interface EffectStrategy {
    type: 'FACTORY' | 'BANK' | 'WAREHOUSE' | 'TRADING_POST';
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