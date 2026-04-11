// NEW-badge predicates. A surface shows a NEW badge when it has content
// unlocked on a day strictly newer than the last day the user opened it.
//
// Source of truth is `state.seenNewDay`, a per-surface "last seen day".
// The badge disappears as soon as the user opens the surface, because the
// corresponding action bumps seenNewDay up to currentDay.

import { BUILDABLE } from '../data/buildings';
import { PARTS } from '../data/parts';

export function hasBuildMenuNew(currentDay: number, seenDay: number): boolean {
    return BUILDABLE.some(b => b.unlockDay > seenDay && b.unlockDay <= currentDay);
}

export function hasWorkshopNew(
    workshopId: 'woodshop' | 'jewelshop',
    currentDay: number,
    seenDay: number,
): boolean {
    return PARTS.some(p =>
        p.workshop === workshopId &&
        p.day > seenDay &&
        p.day <= currentDay
    );
}
