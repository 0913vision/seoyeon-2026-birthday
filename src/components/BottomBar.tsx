function ActionButton({
    icon,
    label,
    badge,
    badgeColor,
    bgColor,
    onClick,
}: {
    icon: string;
    label: string;
    badge?: string;
    badgeColor?: string;
    bgColor?: string;
    onClick?: () => void;
}) {
    return (
        <div className="relative">
            <button
                onClick={onClick}
                className="flex flex-col items-center justify-center gap-1.5 rounded-2xl transition-all active:scale-95"
                style={{
                    background: bgColor || 'linear-gradient(180deg, rgba(20,20,40,0.7) 0%, rgba(10,10,25,0.85) 100%)',
                    borderTop: '3px solid rgba(255,255,255,0.35)',
                    borderLeft: '3px solid rgba(255,255,255,0.2)',
                    borderRight: '3px solid rgba(0,0,0,0.15)',
                    borderBottom: '4px solid rgba(0,0,0,0.35)',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.5), inset 0 2px 0 rgba(255,255,255,0.2)',
                    width: '82px',
                    height: '82px',
                }}
            >
                <span className="text-4xl leading-none">{icon}</span>
                <span className="text-white"
                      style={{
                          fontFamily: "Fredoka, sans-serif",
                          fontWeight: 700,
                          fontSize: '13px',
                          letterSpacing: '0.04em',
                      }}>
                    {label}
                </span>
            </button>
            {badge && (
                <span
                    className="absolute -top-2 -right-2 text-xs font-black text-white rounded-full"
                    style={{
                        background: badgeColor || '#ef4444',
                        boxShadow: `0 2px 6px ${badgeColor || '#ef4444'}80`,
                        border: '2px solid rgba(255,255,255,0.9)',
                        minWidth: '26px',
                        textAlign: 'center',
                        padding: '2px 8px',
                    }}
                >
                    {badge}
                </span>
            )}
        </div>
    );
}

export function BottomBar({ onGoToBox, onBuild, buildOpen }: { onGoToBox: () => void; onBuild: () => void; buildOpen: boolean }) {
    return (
        <div
            className="pointer-events-auto pb-2 px-4"
            style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
        >
            <div className="flex justify-between">
                <ActionButton icon={'\uD83C\uDFD7\uFE0F'} label="BUILD" badge="NEW" badgeColor="#ef4444" bgColor="linear-gradient(180deg, #22c55e 0%, #16a34a 100%)" onClick={onBuild} />
                <ActionButton icon={'\uD83C\uDF81'} label="BOX" bgColor="linear-gradient(180deg, #f59e0b 0%, #d97706 100%)" onClick={onGoToBox} />
            </div>
        </div>
    );
}
