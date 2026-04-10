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
            style={{ cursor: 'pointer' }}
        >
            <div
                style={{
                    background: 'linear-gradient(180deg, #2a3540 0%, #1a252e 100%)',
                    borderRadius: '14px',
                    border: '2px solid #3a5060',
                    padding: '14px 16px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
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
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: 'linear-gradient(180deg, #607080 0%, #404850 100%)',
                            border: '2px solid #506070',
                            fontSize: '16px',
                        }}
                    >
                        {'\uD83E\uDD16'}
                    </div>
                    <span style={{
                        fontFamily: 'Fredoka, sans-serif',
                        fontSize: '14px',
                        color: '#8ab4d8',
                        fontWeight: 700,
                    }}>
                        {'\uCF5C\uB4DC\uC720'}
                    </span>
                </div>

                {/* Text area - fixed height */}
                <div style={{
                    flex: 1,
                    fontFamily: 'system-ui, sans-serif',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    overflow: 'hidden',
                    whiteSpace: 'pre-wrap',
                }}>
                    {action && displayedText.includes('\n(') ? (
                        <>
                            <span style={{ color: '#e8dcc8' }}>{displayedText.split('\n(')[0]}</span>
                            <span style={{ color: '#fbbf24', fontSize: '12px' }}>{'\n(' + displayedText.split('\n(').slice(1).join('\n(')}</span>
                        </>
                    ) : (
                        <span style={{ color: '#e8dcc8' }}>{displayedText}</span>
                    )}
                </div>

                {/* Tap indicator */}
                {animDone && !action && (
                    <div style={{
                        position: 'absolute',
                        bottom: '8px',
                        right: '14px',
                        fontSize: '11px',
                        color: '#8a7a60',
                        fontFamily: 'Fredoka, sans-serif',
                    }}>
                        {'\u25BC'}
                    </div>
                )}
            </div>
        </div>
    );
}
