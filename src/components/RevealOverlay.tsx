import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/useGameStore';

/**
 * Full-screen celebratory overlay that appears the moment `boxHarvested`
 * transitions to true. Shown for a fixed duration, then a single tap (or
 * the timer) dismisses it. After dismiss it never returns — the giftbox
 * modal continues to show the "선물이 준비되었습니다" card for subsequent
 * visits.
 *
 * Uses a single React state for "should we be rendering right now" so
 * refreshing the page AFTER boxHarvested is already true does NOT re-show
 * the celebration (we only fire on the transition).
 */
export function RevealOverlay() {
    const boxHarvested = useGameStore(s => s.boxHarvested);
    const prevRef = useRef(boxHarvested);
    const [show, setShow] = useState(false);
    const [phase, setPhase] = useState<'enter' | 'open' | 'exit'>('enter');

    useEffect(() => {
        // Only react on a false → true transition within a single session.
        if (!prevRef.current && boxHarvested) {
            setShow(true);
            setPhase('enter');
            // Next frame → animate in
            const r1 = requestAnimationFrame(() => setPhase('open'));
            return () => cancelAnimationFrame(r1);
        }
        prevRef.current = boxHarvested;
    }, [boxHarvested]);

    const dismiss = () => {
        setPhase('exit');
        setTimeout(() => setShow(false), 300);
    };

    if (!show) return null;

    const opacity = phase === 'enter' ? 0 : phase === 'exit' ? 0 : 1;
    const scale = phase === 'enter' ? 0.7 : phase === 'exit' ? 1.1 : 1;

    return (
        <div
            onClick={dismiss}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 20000,
                background: 'radial-gradient(circle at 50% 40%, rgba(255,244,214,0.96) 0%, rgba(255,180,120,0.92) 40%, rgba(90,52,24,0.95) 100%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'Fredoka, sans-serif',
                color: '#3a220e',
                textAlign: 'center',
                opacity,
                transition: 'opacity 300ms ease-out',
                cursor: 'pointer',
                padding: '24px',
                overflow: 'hidden',
            }}
        >
            {/* Confetti-ish sparkle layer */}
            <Confetti />

            <div style={{
                transform: `scale(${scale})`,
                transition: 'transform 420ms cubic-bezier(0.34, 1.3, 0.64, 1)',
                zIndex: 1,
            }}>
                <div style={{
                    fontSize: '72px',
                    lineHeight: 1,
                    marginBottom: '16px',
                    filter: 'drop-shadow(0 4px 10px rgba(255,255,255,0.6))',
                }}>
                    {'\uD83C\uDF81'}
                </div>
                <div style={{
                    fontSize: '22px',
                    fontWeight: 700,
                    marginBottom: '10px',
                    color: '#ffffff',
                    textShadow: '0 2px 8px rgba(90,52,24,0.8), 0 0 20px rgba(255,244,214,0.5)',
                }}>
                    생일 축하합니다
                </div>
                <div style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#ffffff',
                    opacity: 0.95,
                    textShadow: '0 2px 6px rgba(90,52,24,0.8)',
                    maxWidth: '320px',
                    lineHeight: 1.6,
                }}>
                    5일간의 작업이 모두 마무리되었습니다.
                    <br />
                    선물 완성을 축하합니다.
                </div>
                <div style={{
                    marginTop: '18px',
                    fontSize: '11px',
                    color: '#ffffff',
                    opacity: 0.75,
                }}>
                    (화면을 터치하여 닫기)
                </div>
            </div>
        </div>
    );
}

function Confetti() {
    // 24 drifting pastel dots. CSS animations, no JS tweening.
    const colors = ['#ffb6d9', '#fff4d6', '#ffd86b', '#b6f2d4', '#f5e6c8'];
    const pieces = Array.from({ length: 24 }).map((_, i) => ({
        left: `${(i * 97) % 100}%`,
        delay: `${(i % 10) * 120}ms`,
        duration: `${2400 + (i % 5) * 400}ms`,
        color: colors[i % colors.length],
        size: 6 + (i % 4) * 2,
    }));
    return (
        <>
            <style>{`
                @keyframes revealFall {
                    0%   { transform: translateY(-120%) rotate(0deg); opacity: 0; }
                    10%  { opacity: 1; }
                    100% { transform: translateY(120vh) rotate(540deg); opacity: 0.6; }
                }
            `}</style>
            {pieces.map((p, i) => (
                <span key={i} style={{
                    position: 'absolute',
                    top: 0,
                    left: p.left,
                    width: `${p.size}px`,
                    height: `${p.size}px`,
                    borderRadius: '50%',
                    background: p.color,
                    boxShadow: `0 0 8px ${p.color}`,
                    animation: `revealFall ${p.duration} ${p.delay} linear infinite`,
                    pointerEvents: 'none',
                }} />
            ))}
        </>
    );
}
