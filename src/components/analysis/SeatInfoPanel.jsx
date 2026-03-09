export default function SeatInfoPanel({ seat }) {
    if (!seat) return null;

    const isPass = seat.matType === 0;
    const isMarg = seat.matType === 1;
    const borderColor = isPass ? 'border-green-500/40' : isMarg ? 'border-amber-500/40' : 'border-red-500/40';
    const bgColor = isPass ? 'bg-green-500/10' : isMarg ? 'bg-amber-500/10' : 'bg-red-500/10';

    return (
        <div className={`absolute bottom-52 left-4 z-20 ${bgColor} border ${borderColor} rounded-xl p-3 backdrop-blur-xl max-w-xs`}>
            <div className="text-[0.65rem] text-slate-400 mb-1">선택된 좌석 시야 스펙</div>
            <div className="text-sm font-bold text-white">
                [{seat.floor}] {seat.rowNumber}열 &nbsp;|&nbsp;
                무대거리 {seat.R.toFixed(1)}m &nbsp;|&nbsp;
                C-Value <span className={seat.C < 0.12 ? 'text-amber-400' : 'text-green-400'}>
                    {seat.C.toFixed(3)}m
                </span>
            </div>
            <div className={`text-xs mt-1 ${isPass ? 'text-green-400' : isMarg ? 'text-amber-400' : 'text-red-400'}`}>
                {isPass ? '✅ 시야 간섭 없음' : isMarg ? '⚠️ 시야각 품질 경고' : '❌ 시야각 품질 불합격'}
                &nbsp;(눈높이: {seat.D.toFixed(1)}m)
            </div>
        </div>
    );
}
