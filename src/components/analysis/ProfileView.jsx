import useStore from '../../store/useStore';
import { calcCValues } from '../../logic/simulation';
import { cn } from '../../logic/utils';
import * as THREE from 'three';

export default function ProfileView() {
    const floors = useStore(state => state.floors);
    const params = useStore(state => state.params);
    const activeFloorId = useStore(state => state.activeFloorId);
    const selectedSeat = useStore(state => state.selectedSeat);

    const activeFloor = floors.find(f => f.id === activeFloorId);
    if (!activeFloor) return null;

    const { rows } = calcCValues(activeFloor, params);

    // SVG Scaling with safety guards
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

    return (
        <div className="absolute bottom-6 left-6 right-72 h-48 glass-card rounded-2xl p-4 overflow-hidden group select-none transition-all hover:h-64 z-20">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-[0.6rem] font-black text-slate-400 uppercase tracking-widest text-shadow-sm">Section Profile: {activeFloorId}</span>
                </div>
            </div>

            <div className="w-full h-full overflow-x-auto overflow-y-hidden custom-scrollbar">
                <svg width={width} height={height} className="overflow-visible">
                    {/* Grid */}
                    {Array.from({ length: 20 }).map((_, i) => (
                        <line key={`v-${i}`} x1={i * 10 * scale + padding} y1={0} x2={i * 10 * scale + padding} y2={height} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                    ))}

                    {/* Stage */}
                    <rect x={padding} y={height - padding - 1 * scale} width={30 * scale} height={1 * scale} fill="rgba(59,130,246,0.2)" />

                    {/* All Floors (Muted) */}
                    {floors.map(fl => {
                        if (fl.id === activeFloorId) return null;
                        const stats = calcCValues(fl, params);
                        if (!stats.rows.length) return null;
                        return (
                            <polyline
                                key={fl.id}
                                points={stats.rows.map(r => `${r.R * scale + padding},${height - padding - r.H * scale}`).join(' ')}
                                fill="none"
                                stroke="rgba(255,255,255,0.05)"
                                strokeWidth="2"
                            />
                        );
                    })}

                    {/* Active Floor */}
                    <polyline
                        points={rows.map(r => `${r.R * scale + padding},${height - padding - r.H * scale}`).join(' ')}
                        fill="none"
                        stroke={activeFloor.colorHex}
                        strokeWidth="3"
                    />

                    {/* Seats */}
                    {rows.map((r, idx) => (
                        <circle
                            key={idx}
                            cx={r.R * scale + padding}
                            cy={height - padding - r.H * scale}
                            r={selectedSeat?.i === r.i && selectedSeat?.floor === activeFloorId ? "3" : "1.5"}
                            fill={selectedSeat?.i === r.i && selectedSeat?.floor === activeFloorId ? "#fff" : "rgba(255,255,255,0.4)"}
                            className="cursor-pointer transition-all hover:r-4 hover:fill-white"
                            onClick={() => useStore.getState().setSelectedSeat({
                                ...r,
                                floor: activeFloorId,
                                pos: new THREE.Vector3(0, r.H, -r.R)
                            })}
                        />
                    ))}
                </svg>
            </div>
        </div>
    );
}
