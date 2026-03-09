import { SlidersHorizontal, Eye, Ruler, Target, Users } from 'lucide-react';
import useStore from '../../store/useStore';

const ControlGroup = ({ label, icon: Icon, children }) => (
    <div className="flex flex-col gap-3 p-4 bg-white/5 border border-white/5 rounded-2xl">
        <div className="flex items-center gap-2 px-1">
            <Icon size={14} className="text-accent" />
            <span className="text-[0.7rem] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
        </div>
        <div className="flex flex-col gap-4">
            {children}
        </div>
    </div>
);

const RangeInput = ({ label, value, min, max, step, onChange, unit }) => (
    <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center px-1">
            <label className="text-xs font-medium text-slate-300">{label}</label>
            <div className="text-xs font-bold text-accent tabular-nums bg-accent/10 px-1.5 py-0.5 rounded">
                {value}{unit}
            </div>
        </div>
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-accent"
        />
    </div>
);

export default function ControlPanel() {
    const { params, setParams, activeFloorId, floors, setFloors } = useStore();
    const activeFloor = floors.find(f => f.id === activeFloorId);

    const updateFloor = (updates) => {
        const newFloors = floors.map(f => f.id === activeFloorId ? { ...f, ...updates } : f);
        setFloors(newFloors);
    };

    if (!activeFloor) return null;

    return (
        <div className="flex flex-col gap-4 p-4 w-72 border-l border-[rgba(255,255,255,0.08)] bg-[rgba(15,23,42,0.4)] overflow-y-auto">
            <div className="flex items-center gap-2 px-1 mb-1">
                <SlidersHorizontal size={16} className="text-accent" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Simulation Controls</span>
            </div>

            <ControlGroup label="Global Parameters" icon={Ruler}>
                <RangeInput
                    label="객석 눈높이 (Eye Height)"
                    value={params.eyeH}
                    min={1.0} max={1.4} step={0.01} unit="m"
                    onChange={(v) => setParams({ eyeH: v })}
                />
                <RangeInput
                    label="열 간격 (Row Pitch)"
                    value={params.rowPitch}
                    min={0.8} max={1.2} step={0.01} unit="m"
                    onChange={(v) => setParams({ rowPitch: v })}
                />
                <RangeInput
                    label="합격 기준 (Pass C-Value)"
                    value={params.cPass}
                    min={0.06} max={0.15} step={0.01} unit="m"
                    onChange={(v) => setParams({ cPass: v })}
                />
            </ControlGroup>

            <ControlGroup label={`${activeFloorId} Floor Config`} icon={Target}>
                <RangeInput
                    label="시작 거리 (R-Start)"
                    value={activeFloor.rStart}
                    min={10} max={100} step={1} unit="m"
                    onChange={(v) => updateFloor({ rStart: v })}
                />
                <RangeInput
                    label="바닥 높이 (Base Height)"
                    value={activeFloor.hBase}
                    min={-5} max={30} step={0.1} unit="m"
                    onChange={(v) => updateFloor({ hBase: v })}
                />

                {activeFloor.segments?.map((seg, idx) => (
                    <div key={idx} className="pt-2 border-t border-white/5 mt-1">
                        <p className="text-[0.6rem] text-slate-500 uppercase font-black tracking-tighter mb-3">Segment {idx + 1}</p>
                        <div className="flex flex-col gap-4">
                            <RangeInput
                                label="구역 너비 (Width)"
                                value={seg.width || (seg.rEnd - activeFloor.rStart)}
                                min={5} max={60} step={1} unit="m"
                                onChange={(v) => {
                                    const newSegs = [...activeFloor.segments];
                                    newSegs[idx] = { ...newSegs[idx], width: v };
                                    updateFloor({ segments: newSegs });
                                }}
                            />
                            <RangeInput
                                label="경사각 (Theta)"
                                value={seg.theta}
                                min={0} max={45} step={0.1} unit="°"
                                onChange={(v) => {
                                    const newSegs = [...activeFloor.segments];
                                    newSegs[idx] = { ...newSegs[idx], theta: v };
                                    updateFloor({ segments: newSegs });
                                }}
                            />
                        </div>
                    </div>
                ))}
            </ControlGroup>

            <div className="mt-auto p-4 bg-gradient-to-br from-success/10 to-transparent border border-success/10 rounded-2xl">
                <div className="flex items-center gap-2 mb-2">
                    <Users size={14} className="text-success" />
                    <span className="text-[0.6rem] font-black text-success uppercase tracking-widest">Efficiency</span>
                </div>
                <div className="flex justify-between items-baseline">
                    <span className="text-2xl font-black text-white">{activeFloor.capacity?.toLocaleString()}</span>
                    <span className="text-xs text-slate-400 font-bold">Total Seats</span>
                </div>
            </div>
        </div>
    );
}
