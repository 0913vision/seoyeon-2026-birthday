import { useState, useEffect, useRef } from 'react';

export function DialogBox({ text, action, onTap, isLast }: { text: string; action?: string; onTap: () => void; isLast: boolean }) {
    const [displayedText, setDisplayedText] = useState('');
    const [animDone, setAnimDone] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const charRef = useRef(0);

    // Full text includes action
    const fullText = action ? text + '\n(' + action + ')' : text;
    const fullRef = useRef(fullText);

    useEffect(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        fullRef.current = action ? text + '\n(' + action + ')' : text;
        charRef.current = 0;
        setDisplayedText('');
        setAnimDone(false);

        function tick() {
            charRef.current++;
            const current = fullRef.current;
            if (charRef.current <= current.length) {
                setDisplayedText(current.substring(0, charRef.current));
                timerRef.current = setTimeout(tick, 40);
            } else {
                setAnimDone(true);
            }
        }
        timerRef.current = setTimeout(tick, 40);

        return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }, [text, action]);

    const handleTap = () => {
        if (!animDone) {
            if (timerRef.current) clearTimeout(timerRef.current);
            setDisplayedText(fullRef.current);
            setAnimDone(true);
        } else {
            onTap();
        }
    };

    return (
        <div
            className="pointer-events-auto mx-3 mb-2"
            onClick={handleTap}
            style={{ cursor: 'pointer', position: 'relative', zIndex: 150 }}
        >
            <div
                style={{
                    background: 'linear-gradient(180deg, #5a8aaa 0%, #4a7a9a 100%)',
                    borderRadius: '16px',
                    border: '3px solid #7abade',
                    borderBottom: '4px solid #3a6a8a',
                    padding: '14px 16px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.25), inset 0 1px 0 rgba(180,220,255,0.25)',
                    height: '145px',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                }}
            >
                {/* Top row: icon + name */}
                <div className="flex items-center gap-2" style={{ marginBottom: '8px' }}>
                    <div
                        className="shrink-0 flex items-center justify-center"
                        style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '50%',
                            background: 'linear-gradient(180deg, #8ab8d0 0%, #6a98b0 100%)',
                            border: '2px solid #a0d8f0',
                            boxShadow: '0 0 8px rgba(120,200,255,0.35)',
                            fontSize: '17px',
                        }}
                    >
                        🤖
                    </div>
                    <span style={{
                        fontFamily: 'Fredoka, sans-serif',
                        fontSize: '15px',
                        color: '#c0ecff',
                        fontWeight: 700,
                        textShadow: '0 0 6px rgba(120,200,255,0.4)',
                    }}>
                        콜드유
                    </span>
                </div>

                {/* Text area - fixed height */}
                <div style={{
                    flex: 1,
                    fontFamily: 'Fredoka, sans-serif',
                    fontSize: '14px',
                    fontWeight: 600,
                    lineHeight: '1.7',
                    overflow: 'hidden',
                    whiteSpace: 'pre-wrap',
                }}>
                    {action && displayedText.includes('\n(') ? (
                        <>
                            <span style={{ color: '#f0f6ff' }}>{displayedText.split('\n(')[0]}</span>
                            <span style={{ color: '#fbbf24', fontSize: '12px' }}>{'\n(' + displayedText.split('\n(').slice(1).join('\n(')}</span>
                        </>
                    ) : (
                        <span style={{ color: '#f0f6ff' }}>{displayedText}</span>
                    )}
                </div>

                {/* Tap indicator */}
                {animDone && !action && (
                    <div style={{
                        position: 'absolute',
                        bottom: '8px',
                        right: '14px',
                        fontSize: '12px',
                        color: '#90c0d8',
                        fontFamily: 'Fredoka, sans-serif',
                    }}>
                        ▼
                    </div>
                )}
            </div>
        </div>
    );
}
