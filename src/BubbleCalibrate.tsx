import { useEffect, useRef, useState } from 'react';
import { HARVESTABLE_BUILDINGS } from './data/buildings';
import { BUBBLE_CONFIG, BUBBLE_OFFSETS, BubbleGlobalConfig } from './data/bubbleConfig';
import { PRODUCTION } from './data/resources';
import './index.css';

const BUILDING_NAMES: Record<string, string> = {
    wood_farm: '나무밭',
    flower_farm: '꽃밭',
    quarry: '채석장',
    mine: '광산',
    gem_cave: '수정 채굴장',
};

const BUILDING_SPRITE: Record<string, string> = {
    wood_farm: 'assets/generated/buildings/wood_farm.png',
    flower_farm: 'assets/generated/buildings/flower_farm.png',
    quarry: 'assets/generated/buildings/quarry.png',
    mine: 'assets/generated/buildings/mine.png',
    gem_cave: 'assets/generated/buildings/gem_cave.png',
};

const RES_IMG: Record<string, string> = {
    wood: 'assets/generated/resources/wood.png',
    flower: 'assets/generated/resources/flower.png',
    stone: 'assets/generated/resources/stone.png',
    metal: 'assets/generated/resources/metal.png',
    gem: 'assets/generated/resources/gem.png',
};

function BubbleCalibrate() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageCache = useRef<Record<string, HTMLImageElement>>({});

    const [buildingId, setBuildingId] = useState('wood_farm');
    const [ready, setReady] = useState(false);
    const [globals, setGlobals] = useState<BubbleGlobalConfig>({ ...BUBBLE_CONFIG });
    const [offsets, setOffsets] = useState<Record<string, { offX: number; offY: number }>>({ ...BUBBLE_OFFSETS });

    // Load images once
    useEffect(() => {
        const all = [...Object.values(BUILDING_SPRITE), ...Object.values(RES_IMG)];
        let remaining = all.length;
        all.forEach(src => {
            if (imageCache.current[src]) { remaining--; return; }
            const img = new Image();
            img.onload = () => {
                imageCache.current[src] = img;
                remaining--;
                if (remaining === 0) draw();
            };
            img.src = src;
        });
    }, []);

    // Redraw on any change
    useEffect(() => { draw(); }, [buildingId, ready, globals, offsets]);

    function draw() {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const W = canvas.width;
        const H = canvas.height;
        ctx.clearRect(0, 0, W, H);

        // Green checker background
        ctx.fillStyle = '#6aad5a';
        ctx.fillRect(0, 0, W, H);

        // Draw building sprite (centered in lower half)
        const bSrc = BUILDING_SPRITE[buildingId];
        const bImg = imageCache.current[bSrc];
        const cx = W / 2;
        const groundY = H * 0.75;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(cx, groundY + 8, 100, 18, 0, 0, Math.PI * 2);
        ctx.fill();

        let topY = groundY - 50;
        if (bImg) {
            const sW = 220;
            const sH = sW * (bImg.height / bImg.width);
            const sy = groundY - sH * 0.78; // roughly originY 0.78
            ctx.drawImage(bImg, cx - sW / 2, sy, sW, sH);
            topY = sy;
        }

        // Draw bubble
        const off = offsets[buildingId] ?? { offX: 30, offY: -36 };
        const bx = cx + off.offX;
        const by = topY + off.offY;

        const resId = HARVESTABLE_BUILDINGS[buildingId];
        const prod = PRODUCTION[resId as keyof typeof PRODUCTION];
        const displayAmount = prod?.perCycle ?? 200;

        // Compute text metrics
        ctx.font = `700 ${globals.fontSize}px Fredoka, sans-serif`;
        const textStr = ready ? `+${displayAmount * 2}` : '30:00';
        const textW = ctx.measureText(textStr).width;
        const iconW = globals.iconSize;
        const gap = globals.iconGap;
        const contentW = iconW + gap + textW;

        const bgW = contentW + globals.padX * 2;
        const bgH = Math.max(globals.iconSize, globals.fontSize) + globals.padY * 2;
        const r = globals.cornerRadius > 0 ? globals.cornerRadius : bgH / 2;
        const tailW = globals.tailW;
        const tailH = globals.tailH;

        // Unified bubble path (rect + tail)
        const drawBubblePath = (offX: number, offY: number) => {
            const l = bx - bgW / 2 + offX;
            const rt = bx + bgW / 2 + offX;
            const tp = by - bgH / 2 + offY;
            const bt = by + bgH / 2 + offY;
            ctx.beginPath();
            ctx.moveTo(l + r, tp);
            ctx.lineTo(rt - r, tp);
            ctx.arcTo(rt, tp, rt, tp + r, r);
            ctx.lineTo(rt, bt - r);
            ctx.arcTo(rt, bt, rt - r, bt, r);
            ctx.lineTo(bx + tailW / 2 + offX, bt);
            ctx.lineTo(bx + offX, bt + tailH);
            ctx.lineTo(bx - tailW / 2 + offX, bt);
            ctx.lineTo(l + r, bt);
            ctx.arcTo(l, bt, l, bt - r, r);
            ctx.lineTo(l, tp + r);
            ctx.arcTo(l, tp, l + r, tp, r);
            ctx.closePath();
        };

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        drawBubblePath(1, 3);
        ctx.fill();

        // Body
        ctx.fillStyle = ready ? '#fbbf24' : '#2a2018';
        drawBubblePath(0, 0);
        ctx.fill();

        // Border
        ctx.lineWidth = globals.borderWidth;
        ctx.strokeStyle = ready ? '#ffffff' : '#c0a880';
        drawBubblePath(0, 0);
        ctx.stroke();

        // Icon
        const iconImg = imageCache.current[RES_IMG[resId]];
        const contentLeft = bx - contentW / 2;
        if (iconImg) {
            ctx.drawImage(iconImg, contentLeft, by - iconW / 2, iconW, iconW);
        }

        // Text
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.textBaseline = 'middle';
        const textX = contentLeft + iconW + gap;
        ctx.strokeText(textStr, textX, by);
        ctx.fillText(textStr, textX, by);

        // Guide: sprite top marker
        ctx.fillStyle = 'rgba(255,0,0,0.7)';
        ctx.beginPath();
        ctx.arc(cx, topY, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = '10px system-ui';
        ctx.fillText('sprite top', cx + 8, topY - 6);
    }

    function setGlobal<K extends keyof BubbleGlobalConfig>(key: K, value: number) {
        setGlobals(g => ({ ...g, [key]: value }));
    }

    function setOffset(key: 'offX' | 'offY', value: number) {
        setOffsets(o => ({ ...o, [buildingId]: { ...(o[buildingId] ?? { offX: 0, offY: 0 }), [key]: value } }));
    }

    function copyOutput() {
        const txt = buildOutput();
        navigator.clipboard.writeText(txt).then(() => alert('복사됨'));
    }

    function buildOutput(): string {
        const g = globals;
        const offOut = Object.entries(offsets)
            .map(([id, v]) => `    ${id}: { offX: ${v.offX}, offY: ${v.offY} },`)
            .join('\n');
        return `// src/data/bubbleConfig.ts
export const BUBBLE_CONFIG: BubbleGlobalConfig = {
    tailH: ${g.tailH},
    tailW: ${g.tailW},
    padX: ${g.padX},
    padY: ${g.padY},
    fontSize: ${g.fontSize},
    iconSize: ${g.iconSize},
    iconGap: ${g.iconGap},
    borderWidth: ${g.borderWidth},
    cornerRadius: ${g.cornerRadius},
};

export const BUBBLE_OFFSETS: Record<string, { offX: number; offY: number }> = {
${offOut}
};`;
    }

    const curOff = offsets[buildingId] ?? { offX: 0, offY: 0 };

    return (
        <div style={{
            height: '100dvh', overflowY: 'auto',
            background: '#1a1a2e', color: '#e0e0e0',
            fontFamily: 'Fredoka, system-ui, sans-serif',
            padding: '12px',
        }}>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#e8a020', marginBottom: '10px' }}>
                말풍선 캘리브레이션
            </div>

            <canvas ref={canvasRef} width={600} height={380}
                    style={{ width: '100%', maxWidth: '600px', border: '2px solid #333', borderRadius: '8px', background: '#6aad5a' }} />

            <div style={{ marginTop: '12px' }}>
                <label style={labelRowStyle}>
                    <span style={{ minWidth: '80px' }}>건물:</span>
                    <select value={buildingId} onChange={e => setBuildingId(e.target.value)}
                            style={selectStyle}>
                        {Object.keys(HARVESTABLE_BUILDINGS).map(id => (
                            <option key={id} value={id}>{BUILDING_NAMES[id]}</option>
                        ))}
                    </select>
                </label>
                <label style={labelRowStyle}>
                    <span style={{ minWidth: '80px' }}>상태:</span>
                    <button onClick={() => setReady(!ready)} style={{
                        ...btnStyle,
                        background: ready ? '#fbbf24' : '#666',
                    }}>
                        {ready ? '준비 완료 (노란)' : '대기 (회색)'}
                    </button>
                </label>
            </div>

            <Section title={`${BUILDING_NAMES[buildingId]} 위치 오프셋`}>
                <Slider label="offX" value={curOff.offX} min={-80} max={80} step={1} onChange={v => setOffset('offX', v)} />
                <Slider label="offY" value={curOff.offY} min={-120} max={0} step={1} onChange={v => setOffset('offY', v)} />
            </Section>

            <Section title="말풍선 크기 (전역)">
                <Slider label="tailH" value={globals.tailH} min={0} max={40} step={1} onChange={v => setGlobal('tailH', v)} />
                <Slider label="tailW" value={globals.tailW} min={4} max={30} step={1} onChange={v => setGlobal('tailW', v)} />
                <Slider label="padX" value={globals.padX} min={0} max={30} step={1} onChange={v => setGlobal('padX', v)} />
                <Slider label="padY" value={globals.padY} min={0} max={20} step={1} onChange={v => setGlobal('padY', v)} />
                <Slider label="fontSize" value={globals.fontSize} min={8} max={24} step={1} onChange={v => setGlobal('fontSize', v)} />
                <Slider label="iconSize" value={globals.iconSize} min={10} max={32} step={1} onChange={v => setGlobal('iconSize', v)} />
                <Slider label="iconGap" value={globals.iconGap} min={0} max={20} step={1} onChange={v => setGlobal('iconGap', v)} />
                <Slider label="borderWidth" value={globals.borderWidth} min={0} max={6} step={0.5} onChange={v => setGlobal('borderWidth', v)} />
                <Slider label="cornerRadius (0=auto)" value={globals.cornerRadius} min={0} max={40} step={1} onChange={v => setGlobal('cornerRadius', v)} />
            </Section>

            <div style={{ marginTop: '14px' }}>
                <button onClick={copyOutput} style={{
                    ...btnStyle, background: '#3b82f6', padding: '10px 18px',
                }}>전체 값 복사</button>
            </div>

            <pre style={{
                marginTop: '12px', padding: '10px', background: '#111',
                borderRadius: '8px', color: '#4ade80', fontSize: '11px',
                whiteSpace: 'pre-wrap', wordBreak: 'break-all',
            }}>{buildOutput()}</pre>
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div style={{ marginTop: '14px' }}>
            <div style={{
                fontSize: '13px', fontWeight: 700, color: '#e8a020',
                padding: '6px 0', borderBottom: '1px solid #333', marginBottom: '6px',
            }}>
                {title}
            </div>
            {children}
        </div>
    );
}

function Slider({ label, value, min, max, step, onChange }: {
    label: string; value: number; min: number; max: number; step: number;
    onChange: (v: number) => void;
}) {
    return (
        <div style={labelRowStyle}>
            <span style={{ minWidth: '120px', fontSize: '12px', color: '#aaa' }}>{label}:</span>
            <button onClick={() => onChange(Math.round((value - step) * 100) / 100)} style={pmBtn}>−</button>
            <input type="range" min={min} max={max} step={step} value={value}
                   onChange={e => onChange(parseFloat(e.target.value))}
                   style={{ flex: 1 }} />
            <button onClick={() => onChange(Math.round((value + step) * 100) / 100)} style={pmBtn}>+</button>
            <input type="number" value={value} step={step}
                   onChange={e => onChange(parseFloat(e.target.value))}
                   style={{
                       width: '55px', background: '#222', color: '#4ade80',
                       border: '1px solid #555', borderRadius: '4px',
                       padding: '4px', fontSize: '12px', fontFamily: 'monospace', textAlign: 'center',
                   }} />
        </div>
    );
}

const labelRowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '6px',
    margin: '6px 0',
};

const selectStyle: React.CSSProperties = {
    padding: '6px 10px', fontSize: '13px', background: '#222', color: '#fff',
    border: '1px solid #555', borderRadius: '6px',
};

const btnStyle: React.CSSProperties = {
    padding: '6px 14px', border: 'none', borderRadius: '6px',
    color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '13px',
};

const pmBtn: React.CSSProperties = {
    width: '28px', height: '28px', background: '#444', color: '#fff',
    border: 'none', borderRadius: '6px', fontSize: '16px', fontWeight: 700,
    cursor: 'pointer',
};

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

export default BubbleCalibrate;
