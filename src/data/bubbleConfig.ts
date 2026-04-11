// Harvest bubble visual configuration.
// Values are in CSS pixels (multiplied by DPR at render time).

export interface BubbleGlobalConfig {
    tailH: number;      // tail triangle height
    tailW: number;      // tail triangle base width
    padX: number;       // inner horizontal padding
    padY: number;       // inner vertical padding
    fontSize: number;   // text size
    iconSize: number;   // resource icon size
    iconGap: number;    // gap between icon and text
    borderWidth: number;
    cornerRadius: number; // 0 = auto (pill shape, radius = height/2)
}

export const BUBBLE_CONFIG: BubbleGlobalConfig = {
    tailH: 10,
    tailW: 12,
    padX: 12,
    padY: 7,
    fontSize: 13,
    iconSize: 18,
    iconGap: 5,
    borderWidth: 2.5,
    cornerRadius: 0,
};

// Per-building position offset from the tile top center (CSS pixels, before DPR).
// Default offX = 0 means the bubble is centered horizontally above the building.
export const BUBBLE_OFFSETS: Record<string, { offX: number; offY: number }> = {
    wood_farm:   { offX: 0, offY: -20 },
    flower_farm: { offX: 0, offY: -20 },
    quarry:      { offX: 0, offY: -20 },
    mine:        { offX: 0, offY: -20 },
    gem_cave:    { offX: 0, offY: -20 },
};
