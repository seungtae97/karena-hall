import useStore from '../../store/useStore';
import { calcCValues } from '../../logic/simulation';
import * as THREE from 'three';

export default function ProfileView() {
    const floors = useStore(state => state.floors);
    const params = useStore(state => state.params);
    const activeFloorId = useStore(state => state.activeFloorId);
    const selectedSeat = useStore(state => state.selectedSeat);

    const activeFloor = floors.find(f => f.id === activeFloorId);
    if (!activeFloor) return null;

    const { rows } = calcCValues(activeFloor, params);
    const cPass = params.cPass || 0.12;

    // SVG Scaling
    let maxRVal = 50;
    try {
        const rVals = floors.map(f => {
            const stats = calcCValues(f, params);
            return stats.rows.length ? stats.rows[stats.rows.length - 1].R : 50;
        });
        maxRVal = Math.max(...rVals, 50);
    } catch (e) { }

    let maxHVal = 10;
    try {
        maxHVal = Math.max(...floors.map(f => f.hBase || 0), 10) + 10;
    } catch (e) { }

    const scale = 5;
    const padding = 40;
    const width = (maxRVal + 10) * scale + padding * 2;
    const height = (maxHVal + 5) * scale + padding * 2;

    if (isNaN(width) || isNaN(height)) return null;

    const onSeatClick = (r) => {
        const matType = r.C >= cPass ? 0 : r.C >= 0.06 ? 1 : 2;
        // 반원형 중앙 좌석 위치 전달 (Z축 음수 방향)
        const angle = Math.PI + 0.5 * Math.PI; // 중앙
        const sx = r.R * Math.cos(angle);
        const sz = r.R * Math.sin(angle);

        useStore.getState().setSelectedSeat({
            ...r,
            floor: activeFloorId,
            D: r.H + (params.eyeH || 1.1),
            matType,
            pos: new THREE.Vector3(sx, r.H, sz),
        });
    };

    return (
        <div className="absolute bottom-6 left-6 right-72 h-48 rounded-2xl p-4 overflow-hidden select-none transition-all hover:h-64 z-20"
            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)' }}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-[0.6rem] font-black text-slate-400 uppercase tracking-widest">Section Profile: {activeFloorId}</span>
                </div>
            </div>

            <div className="w-full h-full overflow-x-auto overflow-y-hidden">
                <svg width={width} height={height} className="overflow-visible">
                    {/* Grid */}
                    {Array.from({ length: 20 }).map((_, i) => (
                        <line key={`v-${i}`} x1={i * 10 * scale + padding} y1={0} x2={i * 10 * scale + padding} y2={height} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                    ))}

                    {/* Stage */}
                    <rect x={padding} y={height - padding - 1 * scale} width={30 * scale} height={1 * scale} fill="rgba(59,130,246,0.2)" />
                    <text x={padding + 5} y={height - padding - 1 * scale - 3} fill="#60a5fa" fontSize="9">Target (1.5m)</text>

                    {/* All Floors (Muted) */}
                    {floors.map(fl => {
                        if (fl.id === activeFloorId) return null;
                        const stats = calcCValues(fl, params);
                        if (!stats.rows.length) return null;
                        return (
                            <polyline key={fl.id}
                                points={stats.rows.map(r => `${r.R * scale + padding},${height - padding - r.H * scale}`).join(' ')}
                                fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
                        );
                    })}

                    {/* Active Floor Line */}
                    <polyline
                        points={rows.map(r => `${r.R * scale + padding},${height - padding - r.H * scale}`).join(' ')}
                        fill="none" stroke={activeFloor.colorHex} strokeWidth="3" />

                    {/* Eye Level Dots + Sightline for selected */}
                    {rows.map((r, idx) => {
                        const rx = r.R * scale + padding;
                        const ey = height - padding - (r.H + (params.eyeH || 1.1)) * scale;
                        const hy = height - padding - r.H * scale;
                        const isSelected = selectedSeat?.i === r.i && selectedSeat?.floor === activeFloorId;
                        const dotColor = r.C >= cPass ? '#3b82f6' : r.C >= 0.06 ? '#f59e0b' : '#ef4444';

                        return (
                            <g key={idx} className="cursor-pointer" onClick={() => onSeatClick(r)}>
                                {/* Seat height dot */}
                                <circle cx={rx} cy={hy} r="1" fill={activeFloor.colorHex} opacity="0.4" />
                                {/* Eye level dot */}
                                <circle cx={rx} cy={ey} r={isSelected ? 3 : 1.5} fill={isSelected ? '#fff' : dotColor} />
                                {/* Sightline for selected seat */}
                                {isSelected && (
                                    <>
                                        <line x1={1.5 * scale + padding} y1={height - padding - 1 * scale}
                                            x2={rx} y2={ey}
                                            stroke={r.C >= cPass ? 'rgba(59,130,246,0.6)' : 'rgba(239,68,68,0.6)'}
                                            strokeWidth="1" strokeDasharray="4 4" />
                                        <text x={rx + 5} y={ey - 5} fill="#fff" fontSize="9" fontWeight="700">
                                            {r.rowNumber}열 C={r.C.toFixed(3)}
                                        </text>
                                    </>
                                )}
                            </g>
                        );
                    })}
                </svg>
            </div>
        </div>
    );
}
