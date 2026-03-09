import { Box, Download, Settings, Share2 } from 'lucide-react';

export default function Header() {
    return (
        <header className="h-16 px-6 flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] bg-[rgba(15,23,42,0.8)] backdrop-blur-xl z-50">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.5)]">
                    <Box className="text-white" size={24} />
                </div>
                <div>
                    <h1 className="text-lg font-bold tracking-tight text-white m-0">KARENA HALL</h1>
                    <p className="text-[0.65rem] text-accent font-bold tracking-[0.2em] uppercase m-0 -mt-1 opacity-80">Design Review Automation</p>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <button className="p-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)] transition-colors">
                    <Share2 size={19} />
                </button>
                <button className="p-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)] transition-colors">
                    <Settings size={19} />
                </button>
                <div className="w-[1px] h-4 bg-slate-800 mx-2" />
                <button className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-blue-600 text-white rounded-lg font-semibold text-sm transition-all shadow-lg shadow-blue-900/20 active:scale-95">
                    <Download size={16} />
                    <span>결과 리포트 다운로드</span>
                </button>
            </div>
        </header>
    );
}
