export * from '../data/BuildingsBlue';
export * from '../data/BuildingsRed';
export * from '../data/BuildingsGray';
export * from '../data/BuildingsGreen';
export * from '../data/BuildingsYellow';
export * from '../data/BuildingsBlack';
export * from '../data/BuildingsOrange';
export * from '../data/BuildingsPurple';

import { BLUE_BUILDINGS, COTTAGE } from '../data/BuildingsBlue';
import { RED_BUILDINGS } from '../data/BuildingsRed';
import { GRAY_BUILDINGS } from '../data/BuildingsGray';
import { GREEN_BUILDINGS } from '../data/BuildingsGreen';
import { YELLOW_BUILDINGS } from '../data/BuildingsYellow';
import { BLACK_BUILDINGS } from '../data/BuildingsBlack';
import { ORANGE_BUILDINGS } from '../data/BuildingsOrange';
import { MONUMENTS_LIST } from '../data/BuildingsPurple';

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

export const BUILDING_CATEGORIES = [
    { id: 'RED', label: 'Farm (Red)', options: RED_BUILDINGS },
    { id: 'GRAY', label: 'Well (Gray)', options: GRAY_BUILDINGS },
    { id: 'YELLOW', label: 'Theater (Yellow)', options: YELLOW_BUILDINGS },
    { id: 'GREEN', label: 'Tavern (Green)', options: GREEN_BUILDINGS },
    { id: 'ORANGE', label: 'Chapel (Orange)', options: ORANGE_BUILDINGS },
    { id: 'BLACK', label: 'Factory (Black)', options: BLACK_BUILDINGS },
];

export const DEFAULT_DECK_START = COTTAGE;