import { PartDef } from '../types/game';

export const PARTS: PartDef[] = [
    { id: 1, name: '상자 바닥판', cost: [{ res: 'wood', amount: 500 }], craftTime: 10, workshop: 'woodshop', day: 1 },
    { id: 2, name: '상자 몸통', cost: [{ res: 'wood', amount: 500 }], craftTime: 10, workshop: 'woodshop', day: 1 },
    { id: 3, name: '상자 앞면판', cost: [{ res: 'wood', amount: 500 }], craftTime: 12, workshop: 'woodshop', day: 1 },
    { id: 4, name: '상자 뒷면판', cost: [{ res: 'wood', amount: 500 }], craftTime: 12, workshop: 'woodshop', day: 1 },
    { id: 5, name: '상자 뚜껑', cost: [{ res: 'wood', amount: 600 }], craftTime: 15, workshop: 'woodshop', day: 2 },
    { id: 6, name: '꽃 장식 A', cost: [{ res: 'flower', amount: 400 }], craftTime: 15, workshop: 'woodshop', day: 2 },
    { id: 7, name: '꽃 화환', cost: [{ res: 'wood', amount: 200 }, { res: 'flower', amount: 500 }], craftTime: 20, workshop: 'woodshop', day: 2 },
    { id: 8, name: '숫자 "2"', cost: [{ res: 'stone', amount: 400 }], craftTime: 20, workshop: 'woodshop', day: 2 },
    { id: 9, name: '숫자 "4"', cost: [{ res: 'stone', amount: 400 }], craftTime: 20, workshop: 'woodshop', day: 2 },
    { id: 10, name: '받침대', cost: [{ res: 'stone', amount: 500 }, { res: 'wood', amount: 200 }], craftTime: 25, workshop: 'woodshop', day: 3 },
    { id: 11, name: '금속 손잡이', cost: [{ res: 'metal', amount: 300 }], craftTime: 25, workshop: 'jewelshop', day: 3 },
    { id: 12, name: '금속 버클', cost: [{ res: 'metal', amount: 300 }], craftTime: 25, workshop: 'jewelshop', day: 3 },
    { id: 13, name: '금속 테두리', cost: [{ res: 'metal', amount: 400 }, { res: 'wood', amount: 200 }], craftTime: 30, workshop: 'jewelshop', day: 3 },
    { id: 14, name: '조각 장식판', cost: [{ res: 'stone', amount: 400 }, { res: 'metal', amount: 300 }], craftTime: 35, workshop: 'jewelshop', day: 3 },
    { id: 15, name: '크리스탈 별', cost: [{ res: 'gem', amount: 200 }], craftTime: 30, workshop: 'jewelshop', day: 4 },
    { id: 16, name: '보석 장식 A', cost: [{ res: 'gem', amount: 200 }, { res: 'metal', amount: 200 }], craftTime: 30, workshop: 'jewelshop', day: 4 },
    { id: 17, name: '금속 프레임', cost: [{ res: 'metal', amount: 400 }, { res: 'gem', amount: 100 }], craftTime: 35, workshop: 'jewelshop', day: 4 },
    { id: 18, name: '꽃 왕관', cost: [{ res: 'flower', amount: 400 }, { res: 'metal', amount: 300 }, { res: 'gem', amount: 200 }], craftTime: 40, workshop: 'jewelshop', day: 4 },
    { id: 19, name: '보석 리본 고리', cost: [{ res: 'metal', amount: 300 }, { res: 'gem', amount: 200 }], craftTime: 35, workshop: 'jewelshop', day: 4 },
    { id: 20, name: '크리스탈 왕관', cost: [{ res: 'metal', amount: 500 }, { res: 'gem', amount: 400 }], craftTime: 45, workshop: 'jewelshop', day: 5 },
    { id: 21, name: '메인 리본', cost: [{ res: 'flower', amount: 300 }, { res: 'metal', amount: 400 }, { res: 'gem', amount: 200 }], craftTime: 50, workshop: 'jewelshop', day: 5 },
    { id: 22, name: 'HAPPY 24 배너', cost: [{ res: 'wood', amount: 300 }, { res: 'metal', amount: 300 }, { res: 'gem', amount: 200 }], craftTime: 40, workshop: 'woodshop', day: 5 },
    { id: 23, name: '불꽃 장식', cost: [{ res: 'gem', amount: 500 }, { res: 'metal', amount: 200 }], craftTime: 45, workshop: 'jewelshop', day: 5 },
    { id: 24, name: '최종 뚜껑 매듭', cost: [{ res: 'flower', amount: 200 }, { res: 'metal', amount: 300 }, { res: 'gem', amount: 300 }], craftTime: 60, workshop: 'jewelshop', day: 5 },
];

export const PARTS_PER_DAY: Record<number, number[]> = {
    1: [1, 2, 3, 4],
    2: [5, 6, 7, 8, 9],
    3: [10, 11, 12, 13, 14],
    4: [15, 16, 17, 18, 19],
    5: [20, 21, 22, 23, 24],
};
