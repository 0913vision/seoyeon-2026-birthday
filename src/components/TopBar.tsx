import { ResourceBar } from './ResourceBar';
import { useGameStore } from '../store/useGameStore';

export function TopBar() {
    const currentDay = useGameStore(s => s.currentDay);
    const partsAttached = useGameStore(s => s.partsAttached);
    const totalParts = 24;
    const progress = partsAttached.length;

    return (
        <div
            className="pointer-events-auto px-3"
            style={{ paddingTop: 'max(8px, env(safe-area-inset-top))' }}
        >
            {/* Row 1: Resource slots (shared component) */}
            <div className="mt-1">
                <ResourceBar />
            </div>

            {/* Row 2: Day badge + Progress bar */}
            <div className="flex items-center gap-2 mt-1.5">
                {/* Day badge */}
                <div className="shrink-0 flex items-center gap-1"
                     style={{
                         background: 'linear-gradient(180deg, #e8a020 0%, #c07818 100%)',
                         borderRadius: '8px',
                         padding: '5px 12px',
                         border: '2px solid #a06010',
                     }}>
                    <span className="text-sm leading-none">{'\u2600\uFE0F'}</span>
                    <span className="leading-none text-white"
                          style={{ fontFamily: "Fredoka, sans-serif", fontSize: '15px' }}>
                        DAY {currentDay}
                    </span>
                </div>

                {/* Progress bar */}
                <div className="flex-1 flex items-center gap-2 min-w-0">
                    <div className="flex-1 h-4 rounded-full overflow-hidden min-w-0"
                         style={{
                             background: '#1a1208',
                             border: '2px solid #3a2a15',
                         }}>
                        <div className="h-full rounded-full"
                             style={{
                                 width: `${(progress / totalParts) * 100}%`,
                                 background: 'linear-gradient(180deg, #fbbf24 0%, #e8a020 50%, #c07818 100%)',
                             }} />
                    </div>
                    <span className="shrink-0 text-amber-100 pr-1"
                          style={{ fontFamily: "Fredoka, sans-serif", fontSize: '15px' }}>
                        {progress}/{totalParts}
                    </span>
                </div>
            </div>
        </div>
    );
}
