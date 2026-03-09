import { Layers, Activity, ShieldCheck, AlertCircle } from 'lucide-react';
import useStore from '../../store/useStore';
import { calcStats } from '../../logic/simulation';
import { cn } from '../../logic/utils';

const StatCard = ({ label, value, unit, icon: Icon, colorClass }) => (
    <div className="flex items-center gap-3 px-4 py-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-xl backdrop-blur-md transition-all hover:bg-[rgba(255,255,255,0.05)]">
        <div className={cn("p-2 rounded-lg bg-[rgba(255,255,255,0.05)]", colorClass)}>
            <Icon size={18} />
        </div>
        <div className="flex flex-col">
            <span className="text-[0.65rem] text-slate-400 uppercase tracking-wider font-semibold">{label}</span>
            <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold text-white tracking-tight">{value}</span>
                {unit && <span className="text-xs text-slate-500 font-medium">{unit}</span>}
            </div>
        </div>
    </div>
);

export default function StatPanel() {
    const { floors, params, interferenceCount } = useStore();

    const totalCapacity = floors.reduce((sum, f) => sum + (f.capacity || 0), 0);

    // Calculate total pass rows across all floors
    let totalPass = 0;
    floors.forEach(fl => {
        const stats = calcStats(fl, params);
        totalPass += stats.passRows;
    });

    const passRate = totalCapacity > 0 ? Math.round((totalCapacity - interferenceCount) / totalCapacity * 100) : 0;

    return (
        <div className="flex gap-4 p-4 items-center">
            <StatCard
                label="총 좌석 수"
                value={totalCapacity.toLocaleString()}
                unit="석"
                icon={Layers}
                colorClass="text-slate-300"
            />
            <StatCard
                label="합격 좌석"
                value={(totalCapacity - interferenceCount).toLocaleString()}
                unit="석"
                icon={ShieldCheck}
                colorClass="text-success"
            />
            <StatCard
                label="간섭 발생"
                value={interferenceCount.toLocaleString()}
                unit="석"
                icon={AlertCircle}
                colorClass="text-danger"
            />
            <StatCard
                label="최종 합격률"
                value={passRate}
                unit="%"
                icon={Activity}
                colorClass="text-accent"
            />
        </div>
    );
}
