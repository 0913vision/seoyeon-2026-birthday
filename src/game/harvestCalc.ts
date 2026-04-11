// Harvest calculation (Model B++: manual harvest + 200% accumulation)
//
// - 0 → 100% fills over `cycle` minutes (normal speed)
// - 100% → 200% fills over `cycle * 4` minutes (quarter speed)
// - Cap at 200%
// - On harvest, player gets `floor(perCycle * percent)` and lastHarvestAt resets

export interface HarvestInfo {
    amount: number;       // harvestable units now
    percent: number;      // 0.0 - 2.0
    msUntil100: number;   // 0 if already past
    msUntil200: number;   // 0 if already past
}

export function computeHarvest(
    lastHarvestAt: number,
    now: number,
    cycleMin: number,
    perCycle: number,
): HarvestInfo {
    const cycleMs = cycleMin * 60_000;
    const elapsed = Math.max(0, now - lastHarvestAt);

    let percent: number;
    if (elapsed < cycleMs) {
        percent = elapsed / cycleMs;
    } else {
        percent = 1 + Math.min(1, (elapsed - cycleMs) / (cycleMs * 4));
    }

    const amount = Math.floor(perCycle * percent);
    const msUntil100 = Math.max(0, cycleMs - elapsed);
    const msUntil200 = Math.max(0, cycleMs * 5 - elapsed);

    return { amount, percent, msUntil100, msUntil200 };
}

// Format remaining ms as "1h 23m" or "12:34" (mm:ss)
export function formatRemaining(ms: number): string {
    if (ms <= 0) return '0:00';
    const totalSec = Math.ceil(ms / 1000);
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}
