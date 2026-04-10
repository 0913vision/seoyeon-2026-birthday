import { useGameStore, calcDayFromDate } from './store/useGameStore';
import { BUILDINGS, BUILDABLE } from './data/buildings';
import { PARTS, PARTS_PER_DAY } from './data/parts';
import { RESOURCE_DEFS } from './data/resources';
import { DIALOGUES } from './data/dialogues';
import './index.css';

const DAY_LABELS = ['', '토 4/11', '일 4/12', '월 4/13', '화 4/14', '수 4/15'];

function DayTest() {
    const currentDay = useGameStore(s => s.currentDay);
    const setDay = useGameStore(s => s.setDay);
    const buildings = useGameStore(s => s.buildings);
    const resources = useGameStore(s => s.resources);
    const partsCompleted = useGameStore(s => s.partsCompleted);
    const partsAttached = useGameStore(s => s.partsAttached);
    const autoDay = calcDayFromDate();

    const todayParts = PARTS_PER_DAY[currentDay] ?? [];
    const todayBuildings = BUILDABLE.filter(b => b.unlockDay <= currentDay);
    const todayDialogues = DIALOGUES.filter(d => d.id.startsWith(`day${currentDay}`));

    return (
        <div style={{ background: '#1a1a2e', minHeight: '100dvh', color: '#e0e0e0', fontFamily: 'Fredoka, system-ui, sans-serif' }}>
            {/* Header */}
            <div style={{ background: '#16213e', padding: '16px', borderBottom: '2px solid #0f3460' }}>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#e8a020' }}>Day 테스트</div>
                <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                    자동 계산: Day {autoDay} ({DAY_LABELS[autoDay]}) | 현재 적용: Day {currentDay}
                </div>
            </div>

            {/* Day Selector */}
            <div style={{ padding: '16px', display: 'flex', gap: '8px' }}>
                {[1, 2, 3, 4, 5].map(d => (
                    <button
                        key={d}
                        onClick={() => setDay(d)}
                        style={{
                            flex: 1,
                            padding: '12px 0',
                            border: currentDay === d ? '3px solid #e8a020' : '2px solid #333',
                            borderRadius: '12px',
                            background: currentDay === d
                                ? 'linear-gradient(180deg, #e8a020 0%, #c07818 100%)'
                                : '#222',
                            color: currentDay === d ? '#fff' : '#888',
                            fontSize: '16px',
                            fontWeight: 700,
                            cursor: 'pointer',
                        }}
                    >
                        <div>Day {d}</div>
                        <div style={{ fontSize: '10px', fontWeight: 600, opacity: 0.8, marginTop: '2px' }}>
                            {DAY_LABELS[d]}
                        </div>
                    </button>
                ))}
            </div>

            {/* Day Info Panels */}
            <div style={{ padding: '0 16px 16px' }}>

                {/* Buildings unlocked */}
                <Section title={`해금 건물 (Day ${currentDay}까지)`}>
                    {todayBuildings.length === 0 ? (
                        <div style={{ color: '#666', fontSize: '13px' }}>해금된 건물 없음</div>
                    ) : todayBuildings.map(b => {
                        const bs = buildings[b.id];
                        const built = bs?.built ?? false;
                        const staggerLabel = b.staggered ? ' (시차)' : '';
                        return (
                            <Row key={b.id}>
                                <img src={`assets/generated/buildings/${b.id}.png`} alt={b.name}
                                     style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700, fontSize: '14px' }}>
                                        {b.name}{staggerLabel}
                                        <span style={{ fontSize: '11px', color: '#888', marginLeft: '6px' }}>
                                            Day {b.unlockDay}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#aaa' }}>
                                        {b.cost.map(c => `${c.res} ${c.amount}`).join(', ')}
                                    </div>
                                </div>
                                <Tag color={built ? '#22c55e' : '#666'}>{built ? '건설됨' : '미건설'}</Tag>
                            </Row>
                        );
                    })}
                </Section>

                {/* Today's parts */}
                <Section title={`오늘의 파츠 (Day ${currentDay})`}>
                    {todayParts.map(pid => {
                        const part = PARTS.find(p => p.id === pid)!;
                        const completed = partsCompleted.includes(pid);
                        const attached = partsAttached.includes(pid);
                        return (
                            <Row key={pid}>
                                <img src={`assets/generated/parts/part_${String(pid).padStart(2, '0')}_${part.name.replace(/\s/g, '_')}.png`}
                                     alt={part.name}
                                     style={{ width: '32px', height: '32px', objectFit: 'contain' }}
                                     onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700, fontSize: '13px' }}>
                                        #{pid} {part.name}
                                        <span style={{ fontSize: '11px', color: '#888', marginLeft: '6px' }}>
                                            {part.workshop} / {part.craftTime}분
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#aaa' }}>
                                        {part.cost.map(c => `${c.res} ${c.amount}`).join(', ')}
                                    </div>
                                </div>
                                <Tag color={attached ? '#3b82f6' : completed ? '#22c55e' : '#666'}>
                                    {attached ? '부착' : completed ? '완성' : '미완'}
                                </Tag>
                            </Row>
                        );
                    })}
                </Section>

                {/* Dialogues */}
                <Section title={`대사 (Day ${currentDay})`}>
                    {todayDialogues.length === 0 ? (
                        <div style={{ color: '#666', fontSize: '13px' }}>해당 Day 대사 없음</div>
                    ) : todayDialogues.map(d => (
                        <div key={d.id} style={{ marginBottom: '10px', padding: '8px', background: '#1a2a3a', borderRadius: '8px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#7abade', marginBottom: '4px' }}>
                                {d.id} <span style={{ color: '#666' }}>({d.trigger})</span>
                            </div>
                            {d.lines.map((line, i) => (
                                <div key={i} style={{ fontSize: '12px', color: '#ccc', padding: '2px 0' }}>
                                    {line.text}
                                    {line.action && <span style={{ color: '#fbbf24', fontSize: '11px' }}> ({line.action})</span>}
                                </div>
                            ))}
                        </div>
                    ))}
                </Section>

                {/* Resources */}
                <Section title="자원 현황">
                    {RESOURCE_DEFS.map(r => {
                        const res = resources[r.id];
                        return (
                            <Row key={r.id}>
                                <img src={r.img} alt={r.id} style={{ width: '24px', height: '24px' }} />
                                <span style={{ width: '40px', fontSize: '13px', fontWeight: 700 }}>{r.name}</span>
                                <span style={{ flex: 1, textAlign: 'right', fontFamily: 'monospace', fontSize: '14px', color: '#4ade80' }}>
                                    {res.amount.toLocaleString()}
                                </span>
                                <Tag color={res.unlocked ? '#22c55e' : '#666'}>
                                    {res.unlocked ? '해금' : '잠김'}
                                </Tag>
                            </Row>
                        );
                    })}
                </Section>

                {/* Summary */}
                <Section title="전체 진행도">
                    <Row>
                        <span style={{ fontSize: '13px' }}>파츠 완성</span>
                        <span style={{ flex: 1, textAlign: 'right', fontFamily: 'monospace', color: '#4ade80' }}>
                            {partsCompleted.length}/24
                        </span>
                    </Row>
                    <Row>
                        <span style={{ fontSize: '13px' }}>파츠 부착</span>
                        <span style={{ flex: 1, textAlign: 'right', fontFamily: 'monospace', color: '#3b82f6' }}>
                            {partsAttached.length}/24
                        </span>
                    </Row>
                </Section>
            </div>
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div style={{ marginBottom: '16px' }}>
            <div style={{
                fontSize: '14px', fontWeight: 700, color: '#e8a020',
                padding: '8px 0', borderBottom: '1px solid #333', marginBottom: '8px',
            }}>
                {title}
            </div>
            {children}
        </div>
    );
}

function Row({ children }: { children: React.ReactNode }) {
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '6px 8px', background: '#222', borderRadius: '8px', marginBottom: '4px',
        }}>
            {children}
        </div>
    );
}

function Tag({ color, children }: { color: string; children: React.ReactNode }) {
    return (
        <span style={{
            fontSize: '11px', fontWeight: 700, color: '#fff',
            background: color, padding: '2px 8px', borderRadius: '6px',
        }}>
            {children}
        </span>
    );
}

export default DayTest;
