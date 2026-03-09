import { MousePointer2, Layers, Search, SlidersHorizontal, ChevronRight } from 'lucide-react';
import useStore from '../../store/useStore';
import { cn } from '../../logic/utils';

export default function LayerSwitcher() {
    const { floors, activeFloorId, setActiveFloor } = useStore();

    return (
        <div className="flex flex-col gap-2 p-4 w-64 border-r border-[rgba(255,255,255,0.08)] bg-[rgba(15,23,42,0.4)]">
            <div className="flex items-center gap-2 px-1 mb-2">
                <Layers size={16} className="text-accent" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Floor Layers</span>
            </div>

            <div className="flex flex-col gap-1.5">
                {floors.map((fl) => (
                    <button
                        key={fl.id}
                        onClick={() => setActiveFloor(fl.id)}
                        className={cn(
                            "group relative flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 border",
                            activeFloorId === fl.id
                                ? "bg-accent/10 border-accent/30 text-white shadow-[0_0_15px_rgba(59,130,246,0.1)]"
                                : "bg-transparent border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200"
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <div
                                className="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]"
                                style={{ color: fl.colorHex || '#ccc', backgroundColor: fl.colorHex || '#ccc' }}
                            />
                            <span className="font-bold text-sm">{fl.id} 객석</span>
                        </div>
                        <ChevronRight
                            size={14}
                            className={cn("transition-transform duration-300", activeFloorId === fl.id ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0 group-hover:opacity-40")}
                        />

                        {activeFloorId === fl.id && (
                            <div className="absolute left-0 top-1/4 bottom-1/4 w-0.5 bg-accent rounded-full" />
                        )}
                    </button>
                ))}
            </div>

            <div className="mt-auto pt-4 border-t border-white/5">
                <div className="p-4 rounded-xl bg-gradient-to-br from-blue-600/10 to-transparent border border-blue-500/10">
                    <p className="text-[0.65rem] text-blue-400 font-bold uppercase tracking-wider mb-2">Pro Tip</p>
                    <p className="text-[0.7rem] text-slate-400 leading-relaxed">
                        각 층을 선택하여 세부 시야각 분석 및 설계를 수동으로 조정할 수 있습니다.
                    </p>
                </div>
            </div>
        </div>
    );
}
