import { DialogLine } from '../types/game';

/**
 * Minimal view into the game state that the dialog rule engine needs. We
 * pass only the fields we read so the `when` predicate is pure and cheap,
 * and so the engine doesn't re-fire on unrelated state churn (drag ghost
 * position, etc.).
 */
export interface DialogContext {
    currentDay: number;
    tutorialStep: number;
    shownDialogs: string[];
    showBuildMenu: boolean;
    buildings: Record<string, { built: boolean; constructionStartedAt?: number | null }>;
    partsCompleted: number[];
    partsAttached: number[];
    woodshopCrafting: { partId: number | null; startedAt: number | null };
    jewelshopCrafting: { partId: number | null; startedAt: number | null };
    resources: Record<string, { amount: number; unlocked: boolean }>;
    packagingStartedAt: number | null;
    boxHarvested: boolean;
    // UI slice: which building modal is open (if any)
    activeModal: { category: string; id: string } | null;
    // UI slice: which building is being placed (build mode active)
    buildMode: { buildingId: string } | null;
}

export interface DialogueScene {
    id: string;
    /**
     * True when this scene should auto-open. The engine checks scenes in
     * declaration order and opens the first one that (a) is not in
     * shownDialogs, (b) returns true here, (c) no other scene is open.
     */
    when: (ctx: DialogContext) => boolean;
    /**
     * Optional: while the scene is open, if this predicate becomes true
     * the dialog is automatically closed (and marked as shown). Useful for
     * "do the action and the hint dissolves" flows — player taps BUILD,
     * the hint vanishes, the build menu opens.
     */
    until?: (ctx: DialogContext) => boolean;
    /**
     * Optional building id to pan the camera to when the scene opens.
     * Either a building key (e.g. 'wood_farm', 'box', 'woodshop') or null.
     */
    camera?: string;
    /**
     * Optional action lock. While the scene is open, every in-world
     * interaction except the lock's target is disabled. See TutorialLock
     * in useGameStore for the allowed values.
     */
    lock?: 'dialog_only' | 'wood_farm' | 'build_button' | 'build_woodshop' | 'woodshop';
    lines: DialogLine[];
}

// Helpers
const any = (ctx: DialogContext, fn: (p: DialogContext) => boolean) => fn(ctx);
const hasShown = (ctx: DialogContext, id: string) => ctx.shownDialogs.includes(id);
const built = (ctx: DialogContext, id: string) => ctx.buildings[id]?.built === true;
const isBuilding = (ctx: DialogContext, id: string) => !!ctx.buildings[id]?.constructionStartedAt;

export const DIALOGUES: DialogueScene[] = [
    // ==============
    // DAY 1 TUTORIAL
    // ==============
    {
        id: 'day1_intro',
        when: (ctx) => ctx.currentDay === 1,
        camera: 'box',
        lock: 'dialog_only',
        lines: [
            { text: '안녕하세요.' },
            { text: '저는 김유찬님의 비서 로봇 콜드유입니다.' },
            { text: '김유찬님의 지시를 받고 왔습니다.' },
            { text: '5일 후 특별한 날을 위해, 선물 하나를 준비해야 합니다.' },
            { text: '누구에게 드리는 것인지는 말씀해 주지 않으셨습니다. 다만 기한은 정해져 있으니, 완성을 도와주시겠습니까?' },
        ],
    },
    {
        id: 'day1_map_guide',
        when: (ctx) => ctx.currentDay === 1 && hasShown(ctx, 'day1_intro'),
        camera: 'box',
        lock: 'dialog_only',
        lines: [
            { text: '이곳이 작업장입니다.' },
            { text: '화면을 드래그하시면 주변을 둘러보실 수 있습니다.' },
            { text: '중앙에 보이는 것이 선물상자입니다.' },
            { text: '이 상자에 파츠 24개를 부착하여 선물을 완성합니다.' },
            { text: '5일 안에 모든 파츠를 만들어야 합니다.' },
        ],
    },
    {
        id: 'day1_harvest_guide',
        when: (ctx) => ctx.currentDay === 1 && hasShown(ctx, 'day1_map_guide'),
        // Action-blocking: tapping the dialog advances lines but cannot
        // close it. The ONLY way to dismiss it is to open the harvest modal.
        until: (ctx) => ctx.activeModal?.category === 'harvest' && ctx.activeModal.id === 'wood_farm',
        camera: 'wood_farm',
        lock: 'wood_farm',
        lines: [
            { text: '위쪽에 나무밭이 있습니다.' },
            { text: '나무밭을 터치해서 자원 창을 열어 주세요.' },
            { text: '창이 열리면 아래쪽 버튼을 꾹 눌러 수확하시면 됩니다.', action: '나무밭을 터치하세요' },
        ],
    },
    {
        id: 'day1_after_first_harvest',
        // Fires only after the player harvested AND closed the modal so the
        // dialog never competes with the harvest modal for screen space.
        when: (ctx) => ctx.currentDay === 1
            // Starter wood is now 4000, so treat "any harvest has happened"
            // as resources having exceeded the starter amount.
            && (ctx.resources.wood?.amount ?? 0) > 4000
            && ctx.activeModal == null
            && hasShown(ctx, 'day1_harvest_guide'),
        // Action-blocking: closes only when the player opens the BUILD menu.
        until: (ctx) => ctx.showBuildMenu,
        lock: 'build_button',
        lines: [
            { text: '자원 수확이 완료되었습니다.' },
            { text: '수확한 자원은 화면 상단에서 확인하실 수 있습니다.' },
            { text: '자원은 시간이 지나면 자동으로 다시 쌓입니다.' },
            { text: '이제 공방을 지어야 합니다.' },
            { text: '하단의 BUILD 버튼을 눌러 주세요.', action: 'BUILD 버튼을 누르세요' },
        ],
    },
    {
        id: 'day1_build_menu_opened',
        when: (ctx) => ctx.currentDay === 1 && ctx.showBuildMenu && hasShown(ctx, 'day1_after_first_harvest'),
        // Closes the instant the player picks the woodshop card (enters
        // build mode for woodshop specifically).
        until: (ctx) => ctx.buildMode?.buildingId === 'woodshop'
            || !!ctx.buildings.woodshop?.constructionStartedAt
            || !!ctx.buildings.woodshop?.built,
        lock: 'build_woodshop',
        lines: [
            { text: '이곳에서 건물을 지을 수 있습니다.' },
            { text: '목록에서 목공방 카드를 눌러 주세요.', action: '목공방 카드를 누르세요' },
        ],
    },
    {
        id: 'day1_place_woodshop',
        // Fires once build mode targets the woodshop. Tells the player
        // where to tap. Closes when construction starts.
        when: (ctx) => ctx.currentDay === 1
            && ctx.buildMode?.buildingId === 'woodshop'
            && hasShown(ctx, 'day1_build_menu_opened'),
        until: (ctx) => !!ctx.buildings.woodshop?.constructionStartedAt || !!ctx.buildings.woodshop?.built,
        lock: 'build_woodshop',
        lines: [
            { text: '원하시는 빈 타일을 터치하여 목공방을 세워 주세요.', action: '빈 타일을 터치하세요' },
        ],
    },
    {
        id: 'day1_woodshop_done',
        when: (ctx) => ctx.currentDay === 1 && built(ctx, 'woodshop') && hasShown(ctx, 'day1_build_menu_opened'),
        // Action-blocking: closes only when the player opens the woodshop modal.
        until: (ctx) => ctx.activeModal?.category === 'workshop' && ctx.activeModal.id === 'woodshop',
        camera: 'woodshop',
        lock: 'woodshop',
        lines: [
            { text: '목공방이 완성되었습니다.' },
            { text: '목공방을 터치해서 제작 메뉴를 열어 주세요.' },
            { text: '목록에서 원하는 파츠를 눌러 제작을 시작할 수 있습니다.', action: '목공방을 터치하세요' },
        ],
    },
    {
        id: 'day1_craft_started',
        // After the woodshop modal opens, the tutorial lock is released and
        // the player can pick any part. This scene fires once the first
        // craft begins to confirm the flow.
        when: (ctx) => ctx.currentDay === 1 && ctx.woodshopCrafting.partId != null && hasShown(ctx, 'day1_woodshop_done'),
        lines: [
            { text: '제작이 시작되었습니다.' },
            { text: '파츠 제작에는 시간이 걸립니다.' },
            { text: '완성되면 공방 위에 완료 표시가 뜹니다.' },
            { text: '수거한 후 선물상자를 터치하여 파츠를 부착해 주세요.' },
        ],
    },
    {
        id: 'day1_first_part_attached',
        when: (ctx) => ctx.currentDay === 1 && ctx.partsAttached.length >= 1 && hasShown(ctx, 'day1_craft_started'),
        camera: 'box',
        lines: [
            { text: '첫 번째 파츠가 부착되었습니다.' },
            { text: '진행도 1/24. 잘 하셨습니다.' },
            { text: '오늘은 총 4개의 파츠를 완성해 주세요.' },
            { text: '기본 안내는 여기까지입니다. 이후는 직접 진행해 주세요.' },
        ],
    },
    {
        id: 'day1_complete',
        when: (ctx) => ctx.currentDay === 1 && ctx.partsAttached.length >= 4 && hasShown(ctx, 'day1_first_part_attached'),
        camera: 'box',
        lines: [
            { text: '오늘의 목표 4개 파츠가 모두 부착되었습니다.' },
            { text: '수고하셨습니다.' },
            { text: '내일은 새로운 재료와 파츠가 추가됩니다.' },
        ],
    },

    // ==============
    // DAY 2
    // ==============
    {
        id: 'day2_start',
        when: (ctx) => ctx.currentDay === 2,
        lines: [
            { text: '좋은 아침입니다.' },
            { text: '오늘은 꽃밭을 지을 수 있습니다.' },
            { text: 'BUILD 버튼에서 꽃밭을 확인해 주세요.' },
            { text: '오늘 만들어야 할 파츠는 5개입니다.' },
        ],
    },
    {
        id: 'day2_quarry_unlocked',
        // Stagger unlock — can be wired to a time-of-day trigger later
        when: (ctx) => ctx.currentDay === 2 && hasShown(ctx, 'day2_start') && ctx.partsAttached.length >= 6,
        lines: [
            { text: '채석장도 지을 수 있게 되었습니다.' },
            { text: '돌이 필요한 파츠를 만들려면 먼저 채석장을 지어 주세요.' },
        ],
    },
    {
        id: 'day2_complete',
        when: (ctx) => ctx.currentDay === 2 && ctx.partsAttached.length >= 9 && hasShown(ctx, 'day2_start'),
        lines: [
            { text: '오늘의 목표 5개 파츠가 모두 부착되었습니다.' },
            { text: '내일 다시 뵙겠습니다.' },
        ],
    },

    // ==============
    // DAY 3
    // ==============
    {
        id: 'day3_start',
        when: (ctx) => ctx.currentDay === 3,
        lines: [
            { text: '좋은 아침입니다.' },
            { text: '오늘은 광산을 지을 수 있습니다. 금속을 얻을 수 있는 시설입니다.' },
            { text: '오늘 만들어야 할 파츠는 5개입니다.' },
        ],
    },
    {
        id: 'day3_jewelshop_unlocked',
        when: (ctx) => ctx.currentDay === 3 && hasShown(ctx, 'day3_start') && ctx.partsAttached.length >= 11,
        lines: [
            { text: '세공소도 지을 수 있게 되었습니다.' },
            { text: '두 번째 공방입니다. 금속 파츠는 이곳에서 만듭니다.' },
        ],
    },
    {
        id: 'day3_complete',
        when: (ctx) => ctx.currentDay === 3 && ctx.partsAttached.length >= 14 && hasShown(ctx, 'day3_start'),
        lines: [
            { text: '오늘의 목표가 달성되었습니다.' },
            { text: '절반이 넘었습니다. 잘 하고 계십니다.' },
        ],
    },

    // ==============
    // DAY 4
    // ==============
    {
        id: 'day4_start',
        when: (ctx) => ctx.currentDay === 4,
        lines: [
            { text: '좋은 아침입니다.' },
            { text: '오늘은 수정동굴을 지을 수 있습니다.' },
            { text: '보석 파츠를 만들기 위해 꼭 필요합니다.' },
            { text: '오늘 만들어야 할 파츠는 5개입니다.' },
        ],
    },
    {
        id: 'day4_complete',
        when: (ctx) => ctx.currentDay === 4 && ctx.partsAttached.length >= 19 && hasShown(ctx, 'day4_start'),
        lines: [
            { text: '오늘의 목표가 달성되었습니다.' },
            { text: '내일이 마지막 날입니다.' },
        ],
    },

    // ==============
    // DAY 5 — FINAL
    // ==============
    {
        id: 'day5_start',
        when: (ctx) => ctx.currentDay === 5,
        lines: [
            { text: '좋은 아침입니다. 오늘이 마지막 날입니다.' },
            { text: '남은 파츠 5개를 완성하고 부착하면 포장이 시작됩니다.' },
            { text: '오늘 안에 모든 작업을 완료해 주세요.' },
        ],
    },
    {
        id: 'day5_packaging_started',
        when: (ctx) => ctx.packagingStartedAt != null && !hasShown(ctx, 'day5_packaging_started'),
        lines: [
            { text: '모든 파츠가 부착되었습니다.' },
            { text: '지금부터 포장을 시작합니다.' },
            { text: '약 1시간 30분 정도 소요됩니다.' },
            { text: '완료되면 다시 안내드리겠습니다.' },
        ],
    },
    {
        id: 'day5_packaging_done',
        when: (ctx) => ctx.packagingStartedAt != null
            && Date.now() - ctx.packagingStartedAt >= 90 * 60_000
            && !ctx.boxHarvested
            && hasShown(ctx, 'day5_packaging_started'),
        lines: [
            { text: '포장이 완료되었습니다.' },
            { text: '선물 준비가 모두 끝났습니다.' },
            { text: '상자를 터치하여 열기를 눌러 주세요.', action: '상자를 터치하세요' },
        ],
    },
    {
        id: 'day5_certificate',
        when: (ctx) => ctx.boxHarvested,
        lines: [
            { text: '선물 준비가 완료되었습니다.' },
            { text: '5일간의 작업이 모두 마무리되었습니다.' },
            { text: '이 증명서를 김유찬님께 제시해 주세요.' },
        ],
    },
];

// Helper used by tests / the dialog controller
export function findNextDialog(ctx: DialogContext): DialogueScene | null {
    for (const scene of DIALOGUES) {
        if (ctx.shownDialogs.includes(scene.id)) continue;
        if (scene.when(ctx)) return scene;
    }
    return null;
}

// Suppress unused warning
void any;
void isBuilding;
