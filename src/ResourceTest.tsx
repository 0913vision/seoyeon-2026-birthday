import { ResourceBar, RESOURCE_DEFS, useResources } from './components/ResourceBar';
import './index.css';

function ResourceTest() {
    const { resources, resDelta, addResource } = useResources();

    return (
        <div style={{ background: '#2d5a3f', height: '100dvh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui' }}>
            {/* Resource bar - shared component */}
            <div style={{ padding: '8px 12px' }}>
                <ResourceBar resources={resources} resDelta={resDelta} />
            </div>

            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4a7a5a', fontSize: '13px' }}>
                아래 버튼으로 자원을 추가/제거하세요
            </div>

            {/* Controls */}
            <div style={{ background: '#111', padding: '16px', overflowY: 'auto' }}>
                {RESOURCE_DEFS.map(r => {
                    const res = resources[r.id];
                    return (
                        <div key={r.id} style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            marginBottom: '10px', padding: '8px',
                            background: '#1a1a1a', borderRadius: '10px',
                        }}>
                            <img src={r.img} alt={r.id} style={{ width: '28px', height: '28px' }} />
                            <span style={{ width: '50px', fontSize: '13px', fontWeight: 'bold', color: '#fff' }}>
                                {r.id}
                            </span>
                            <span style={{ width: '70px', textAlign: 'right', fontFamily: 'monospace', fontSize: '15px', color: '#4ade80' }}>
                                {res.amount.toLocaleString()}
                            </span>
                            <div style={{ display: 'flex', gap: '4px', flex: 1, justifyContent: 'flex-end' }}>
                                {[-500, -100, 100, 500].map(d => (
                                    <button key={d} onClick={() => addResource(r.id, d)} style={{
                                        padding: '6px 10px', border: 'none', borderRadius: '6px',
                                        fontSize: '12px', fontWeight: 'bold', cursor: 'pointer',
                                        background: d > 0 ? '#22c55e' : '#ef4444', color: '#fff',
                                    }}>
                                        {d > 0 ? '+' : ''}{d}
                                    </button>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default ResourceTest;
