import { DialogLine } from '../types/game';

export interface DialogueScene {
    id: string;
    trigger: string;
    lines: DialogLine[];
}

export const DIALOGUES: DialogueScene[] = [
    // Day 1
    { id: 'day1_intro', trigger: 'app_start', lines: [
        { text: '안녕하세요.' },
        { text: '저는 김유찬님의 비서 로봇 콜드유입니다.' },
        { text: '김유찬님의 지시를 받고 왔습니다.' },
        { text: '5일 후 특별한 날을 위해, 선물 하나를 준비해야 합니다.' },
        { text: '수령인 정보는 제게 전달되지 않았습니다.' },
        { text: '선물 제작을 도와드리겠습니다. 협조 부탁드립니다.' },
    ]},
    { id: 'day1_intro_after', trigger: 'day1_confirm', lines: [
        { text: '감사합니다.' },
        { text: '선물의 정체는 제작 과정에서 확인하실 수 있습니다.' },
        { text: '그럼 작업을 시작하겠습니다.' },
    ]},
    { id: 'day1_map_guide', trigger: 'day1_intro_done', lines: [
        { text: '이곳이 작업장입니다.' },
        { text: '화면을 드래그하시면 주변을 둘러보실 수 있습니다.' },
        { text: '중앙에 보이는 것이 선물상자입니다.' },
    ]},
    { id: 'day1_box_intro', trigger: 'day1_swipe', lines: [
        { text: '이 상자에 파츠를 부착하여 선물을 완성합니다.' },
        { text: '총 24개의 파츠가 필요합니다. 기간은 5일입니다.' },
    ]},
    { id: 'day1_harvest_guide', trigger: 'day1_box_seen', lines: [
        { text: '이것은 나무밭입니다. 자원을 생산하는 시설입니다.' },
        { text: '터치하시면 자원을 수확할 수 있습니다.', action: '나무밭을 터치하세요' },
    ]},
    { id: 'day1_harvest_done', trigger: 'day1_harvest', lines: [
        { text: '자원 수확이 완료되었습니다.' },
        { text: '상단 인벤토리에서 보유 자원량을 확인하실 수 있습니다.' },
    ]},
    { id: 'day1_waiting', trigger: 'day1_harvest_done', lines: [
        { text: '자원은 일정 주기마다 자동으로 생산됩니다.' },
        { text: '나무의 경우 1시간 30분마다 생산됩니다.' },
        { text: '접속하지 않아도 생산은 계속 진행됩니다.' },
    ]},
    { id: 'day1_build_guide', trigger: 'day1_waiting_done', lines: [
        { text: '파츠 제작을 위해 공방이 필요합니다.' },
        { text: '하단의 건설 버튼을 터치해 주세요.', action: 'BUILD 버튼을 터치하세요' },
    ]},
    { id: 'day1_woodshop', trigger: 'day1_build_menu', lines: [
        { text: '목공방은 파츠를 제작하는 시설입니다.' },
        { text: '건설 위치를 지정해 주세요.', action: '빈 타일을 터치하여 건설' },
    ]},
    { id: 'day1_woodshop_done', trigger: 'day1_woodshop_built', lines: [
        { text: '건설이 완료되었습니다.' },
    ]},
    { id: 'day1_craft_guide', trigger: 'day1_woodshop_done', lines: [
        { text: '목공방을 터치하시면 제작 메뉴가 열립니다.' },
        { text: '첫 번째 파츠는 상자 바닥판입니다.' },
        { text: '제작 시간은 10분 소요됩니다.', action: '목공방을 터치하여 제작 시작' },
    ]},
    { id: 'day1_tutorial_end', trigger: 'day1_craft_started', lines: [
        { text: '기본 안내가 완료되었습니다.' },
        { text: '자원이 생산되면 수확 후 파츠 제작을 계속해 주세요.' },
        { text: '오늘 만들어야 할 파츠는 4개입니다.' },
    ]},
    { id: 'day1_first_part', trigger: 'part_1_attached', lines: [
        { text: '첫 번째 파츠가 부착되었습니다.' },
        { text: '진행도: 1/24. 나머지는 23개입니다.' },
    ]},
    { id: 'day1_complete', trigger: 'day1_parts_done', lines: [
        { text: '오늘 작업이 완료되었습니다.' },
        { text: '수고하셨습니다. 내일 다시 진행하겠습니다.' },
    ]},

    // Day 2
    { id: 'day2_start', trigger: 'day2_enter', lines: [
        { text: '좋은 아침입니다. 오늘은 꽃밭을 만들어 보겠습니다.' },
        { text: '건설 메뉴에서 꽃밭을 확인해 주세요.', action: 'BUILD 버튼을 터치하세요' },
        { text: '오늘 만들어야 할 파츠는 5개입니다.' },
    ]},
    { id: 'day2_quarry', trigger: 'day2_stagger', lines: [
        { text: '채석장을 만들 수 있게 되었습니다.' },
        { text: '건설 메뉴를 확인해 주세요.', action: 'BUILD 버튼을 터치하세요' },
    ]},

    // Day 3
    { id: 'day3_start', trigger: 'day3_enter', lines: [
        { text: '좋은 아침입니다. 오늘은 광산을 만들어 보겠습니다.' },
        { text: '건설 메뉴에서 광산을 확인해 주세요.', action: 'BUILD 버튼을 터치하세요' },
        { text: '오늘 만들어야 할 파츠는 5개입니다.' },
    ]},
    { id: 'day3_jewelshop', trigger: 'day3_stagger', lines: [
        { text: '세공소를 만들 수 있게 되었습니다.' },
        { text: '두 번째 공방이 추가됩니다.' },
        { text: '건설 메뉴를 확인해 주세요.', action: 'BUILD 버튼을 터치하세요' },
    ]},

    // Day 4
    { id: 'day4_start', trigger: 'day4_enter', lines: [
        { text: '좋은 아침입니다. 오늘은 수정동굴을 만들어 보겠습니다.' },
        { text: '건설 메뉴에서 수정동굴을 확인해 주세요.', action: 'BUILD 버튼을 터치하세요' },
        { text: '오늘 만들어야 할 파츠는 5개입니다.' },
    ]},

    // Day 5
    { id: 'day5_start', trigger: 'day5_enter', lines: [
        { text: '좋은 아침입니다. 오늘이 마지막 날입니다.' },
        { text: '남은 파츠 5개를 완성하면 포장이 시작됩니다.' },
        { text: '오늘 안에 모든 작업을 완료해 주세요.' },
    ]},
    { id: 'day5_packaging', trigger: 'all_parts_done', lines: [
        { text: '모든 파츠가 완성되었습니다.' },
        { text: '포장을 시작합니다. 약 1시간 30분 정도 소요됩니다.' },
        { text: '완료되면 다시 안내드리겠습니다.' },
    ]},
    { id: 'day5_waiting', trigger: 'packaging_check', lines: [
        { text: '포장이 진행 중입니다.' },
        { text: '남은 시간을 상자 상단에서 확인하실 수 있습니다.' },
    ]},
    { id: 'day5_complete', trigger: 'packaging_done', lines: [
        { text: '선물 준비가 완료되었습니다.' },
        { text: '5일간의 작업이 모두 마무리되었습니다.' },
        { text: '상자를 열어 주세요.' },
    ]},
    { id: 'day5_open', trigger: 'box_open_prompt', lines: [
        { text: '열기 버튼을 터치해 주세요.', action: '상자의 열기 버튼을 터치하세요' },
    ]},
    { id: 'day5_certificate', trigger: 'box_opened', lines: [
        { text: '선물 준비가 완료되었습니다.' },
        { text: '이 증명서를 김유찬님께 제시해 주세요.' },
    ]},
];
