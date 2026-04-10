import { useMemo } from 'react';
import { useGameStore, calcDayFromDate } from './store/useGameStore';
import { BUILDINGS, BUILDABLE } from './data/buildings';
import { PARTS, PARTS_PER_DAY } from './data/parts';
import { RESOURCE_DEFS, PRODUCTION } from './data/resources';
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
        <div style={{ background: '#1a1a2e', height: '100dvh', color: '#e0e0e0', fontFamily: 'Fredoka, system-ui, sans-serif', overflowY: 'auto' }}>
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

                {/* Resource Simulation */}
                <ResourceSimulation currentDay={currentDay} />
            </div>
        </div>
    );
}

// --- Resource Simulation (Model B++: manual harvest + interval-based accumulation) ---

const RES_IDS = ['wood', 'flower', 'stone', 'metal', 'gem'] as const;
const RES_NAMES: Record<string, string> = { wood: '나무', flower: '꽃', stone: '돌', metal: '금속', gem: '보석' };
const UNLOCK_DAY: Record<string, number> = { wood: 1, flower: 2, stone: 2, metal: 3, gem: 4 };
const STARTER: Record<string, number> = { wood: 2500 };

// Accumulation rate by interval (hours) and cycle time
// cycle 60min: 3h→150%, 4h→175%, 6h+→200%
// cycle 90min: 3h→125%, 4h→142%, 6h→175%, 10h+→200%
function accumRate(cycleMin: number, intervalHours: number): number {
    if (cycleMin <= 60) {
        if (intervalHours >= 6) return 2.0;
        if (intervalHours >= 4) return 1.75;
        if (intervalHours >= 3) return 1.5;
        return 1.0;
    }
    // cycle 90min
    if (intervalHours >= 10) return 2.0;
    if (intervalHours >= 6) return 1.75;
    if (intervalHours >= 4) return 1.42;
    if (intervalHours >= 3) return 1.25;
    return 1.0;
}

// Access schedule: times (24h) per day
const SCHEDULE: Record<number, number[]> = {
    1: [12, 15, 18, 22],       // 토: buf→3h→3h→4h
    2: [8, 12, 15, 18, 22],    // 일: 10h→4h→3h→3h→4h
    3: [8, 12, 18, 22],        // 월: 10h→4h→6h→4h
    4: [8, 12, 18, 22],        // 화: 10h→4h→6h→4h
    5: [8, 12, 15, 18],        // 수: 10h→4h→3h→3h
};

type DayRow = {
    carryover: number;
    buffer: number;
    production: number;
    totalSupply: number;
    demand: number;
    remaining: number;
    surplusRate: number;
    detail: string;
};

function calcHarvest(rid: string, day: number): { buffer: number; prod: number; total: number; detail: string } {
    const p = PRODUCTION[rid as keyof typeof PRODUCTION];
    const unlock = UNLOCK_DAY[rid];

    if (day < unlock) return { buffer: 0, prod: 0, total: 0, detail: '-' };

    const pc = p.perCycle;
    const cycle = p.cycle;
    const times = SCHEDULE[day];

    if (day === unlock) {
        // Unlock day: build → instant 200% buffer
        const buf = pc * 2;

        // stone Day 2: staggered (afternoon ~15:00), only 18/22 after unlock
        if (rid === 'stone' && day === 2) {
            const afterTimes = [18, 22];
            const intervals = afterTimes.map((t, i) => i === 0 ? (t - 15) : (t - afterTimes[i - 1]));
            let prod = 0;
            const parts: string[] = [];
            for (const intv of intervals) {
                const rate = accumRate(cycle, intv);
                const amt = Math.round(pc * rate);
                prod += amt;
                parts.push(`${Math.round(rate * 100)}%`);
            }
            return { buffer: buf, prod, total: buf + prod, detail: `200%buf+${parts.join('+')} (=${(buf + prod).toLocaleString()})` };
        }

        // Normal unlock: first visit = 200% buffer, subsequent = interval-based
        if (times.length <= 1) {
            return { buffer: buf, prod: 0, total: buf, detail: `200%buf (=${buf.toLocaleString()})` };
        }
        const afterTimes = times.slice(1);
        const intervals = afterTimes.map((t, i) => i === 0 ? (t - times[0]) : (t - afterTimes[i - 1]));
        let prod = 0;
        const parts: string[] = [];
        for (const intv of intervals) {
            const rate = accumRate(cycle, intv);
            const amt = Math.round(pc * rate);
            prod += amt;
            parts.push(`${Math.round(rate * 100)}%`);
        }
        return { buffer: buf, prod, total: buf + prod, detail: `200%buf+${parts.join('+')} (=${(buf + prod).toLocaleString()})` };
    }

    // After unlock day: first visit has overnight accumulation
    const prevDay = SCHEDULE[day - 1];
    const lastPrevTime = prevDay[prevDay.length - 1];
    const overnightHours = times[0] + (24 - lastPrevTime);
    const overnightRate = accumRate(cycle, overnightHours);
    const overnightAmt = Math.round(pc * overnightRate);

    let total = overnightAmt;
    const parts: string[] = [`${Math.round(overnightRate * 100)}%`];

    for (let i = 1; i < times.length; i++) {
        const intv = times[i] - times[i - 1];
        const rate = accumRate(cycle, intv);
        const amt = Math.round(pc * rate);
        total += amt;
        parts.push(`${Math.round(rate * 100)}%`);
    }

    return { buffer: overnightAmt, prod: total - overnightAmt, total, detail: `${parts.join('+')} (=${total.toLocaleString()})` };
}

function simulateDays(): Record<number, Record<string, DayRow>> {
    // Compute demand per day
    const demandByDay: Record<number, Record<string, number>> = {};
    for (let d = 1; d <= 5; d++) {
        const dem: Record<string, number> = {};
        for (const rid of RES_IDS) dem[rid] = 0;

        for (const b of BUILDINGS) {
            if (b.unlockDay === d) {
                for (const c of b.cost) dem[c.res] = (dem[c.res] || 0) + c.amount;
            }
        }
        for (const pid of (PARTS_PER_DAY[d] ?? [])) {
            const part = PARTS.find(p => p.id === pid);
            if (part) for (const c of part.cost) dem[c.res] = (dem[c.res] || 0) + c.amount;
        }
        demandByDay[d] = dem;
    }

    // Simulate
    const result: Record<number, Record<string, DayRow>> = {};
    const carry: Record<string, number> = {};
    for (const rid of RES_IDS) carry[rid] = 0;

    for (let d = 1; d <= 5; d++) {
        result[d] = {};
        for (const rid of RES_IDS) {
            const carryover = carry[rid];
            const starter = d === 1 ? (STARTER[rid] ?? 0) : 0;
            const h = calcHarvest(rid, d);

            const totalSupply = carryover + starter + h.buffer + h.prod;
            const demand = demandByDay[d][rid] || 0;
            const remaining = totalSupply - demand;
            const surplusRate = demand > 0 ? ((remaining / demand) * 100) : (totalSupply > 0 ? 999 : 0);

            result[d][rid] = {
                carryover: carryover + starter,
                buffer: h.buffer,
                production: h.prod,
                totalSupply,
                demand,
                remaining,
                surplusRate,
                detail: h.detail,
            };
            carry[rid] = remaining;
        }
    }
    return result;
}

function surplusColor(rate: number, demand: number): string {
    if (demand === 0) return '#666';
    if (rate >= 30) return '#22c55e';
    if (rate >= 20) return '#eab308';
    return '#ef4444';
}

function ResourceSimulation({ currentDay }: { currentDay: number }) {
    const sim = useMemo(() => simulateDays(), []);

    return (
        <Section title="자원 시뮬레이션 B++ (수동 수확 + 200% 누적)">
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'collapse', fontSize: '11px', fontFamily: 'monospace' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid #444' }}>
                            <th style={thStyle}>Day</th>
                            <th style={thStyle}>자원</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>이월</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>버퍼</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>생산</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>총공급</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>수요</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>잔여</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>잉여율</th>
                            <th style={thStyle}>상세</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[1, 2, 3, 4, 5].map(d => {
                            const dimmed = d > currentDay;
                            const rows = RES_IDS.filter(rid => {
                                const row = sim[d][rid];
                                return row.totalSupply > 0 || row.demand > 0;
                            });
                            if (rows.length === 0) return null;
                            return rows.map((rid, i) => {
                                const r = sim[d][rid];
                                const opacity = dimmed ? 0.35 : 1;
                                const isFirst = i === 0;
                                return (
                                    <tr key={`${d}-${rid}`} style={{
                                        opacity,
                                        borderTop: isFirst ? '1px solid #444' : undefined,
                                        background: d === currentDay ? 'rgba(232,160,32,0.08)' : undefined,
                                    }}>
                                        {isFirst && (
                                            <td rowSpan={rows.length} style={{
                                                ...tdStyle,
                                                fontWeight: 700,
                                                fontSize: '13px',
                                                color: d === currentDay ? '#e8a020' : '#888',
                                                verticalAlign: 'middle',
                                                textAlign: 'center',
                                                borderRight: '1px solid #333',
                                            }}>
                                                {d}
                                            </td>
                                        )}
                                        <td style={{ ...tdStyle, color: '#ccc', fontWeight: 600, fontFamily: 'system-ui, sans-serif' }}>
                                            {RES_NAMES[rid]}
                                        </td>
                                        <td style={numStyle}>{r.carryover.toLocaleString()}</td>
                                        <td style={{ ...numStyle, color: r.buffer > 0 ? '#60a5fa' : '#555' }}>
                                            {r.buffer > 0 ? r.buffer.toLocaleString() : '-'}
                                        </td>
                                        <td style={numStyle}>{r.production.toLocaleString()}</td>
                                        <td style={{ ...numStyle, fontWeight: 700, color: '#4ade80' }}>
                                            {r.totalSupply.toLocaleString()}
                                        </td>
                                        <td style={{ ...numStyle, color: r.demand > 0 ? '#f87171' : '#555' }}>
                                            {r.demand > 0 ? r.demand.toLocaleString() : '-'}
                                        </td>
                                        <td style={{
                                            ...numStyle, fontWeight: 700,
                                            color: r.remaining < 0 ? '#ef4444' : '#4ade80',
                                        }}>
                                            {r.remaining.toLocaleString()}
                                        </td>
                                        <td style={{
                                            ...numStyle, fontWeight: 700,
                                            color: surplusColor(r.surplusRate, r.demand),
                                        }}>
                                            {r.demand > 0 ? `${Math.round(r.surplusRate)}%` : '-'}
                                        </td>
                                        <td style={{ ...tdStyle, color: '#888', fontSize: '10px', fontFamily: 'system-ui, sans-serif' }}>
                                            {r.detail}
                                        </td>
                                    </tr>
                                );
                            });
                        })}
                    </tbody>
                </table>
            </div>
        </Section>
    );
}

const thStyle: React.CSSProperties = {
    padding: '6px 8px',
    color: '#aaa',
    fontWeight: 700,
    textAlign: 'left',
    whiteSpace: 'nowrap',
    fontSize: '10px',
    textTransform: 'uppercase',
};

const tdStyle: React.CSSProperties = {
    padding: '4px 8px',
    whiteSpace: 'nowrap',
};

const numStyle: React.CSSProperties = {
    ...tdStyle,
    textAlign: 'right',
    color: '#ccc',
};

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
