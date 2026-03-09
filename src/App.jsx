import Header from './components/layout/Header';
import LayerSwitcher from './components/layout/LayerSwitcher';
import ControlPanel from './components/layout/ControlPanel';
import Visualizer from './components/visualizer/Visualizer';
import StatPanel from './components/analysis/StatPanel';

function App() {
  return (
    <div className="flex flex-col h-screen w-screen bg-[#0f172a] text-slate-200 overflow-hidden font-sans selection:bg-accent/30">
      <Header />

      <div className="flex-1 flex overflow-hidden">
        <LayerSwitcher />

        <main className="flex-1 flex flex-col relative overflow-hidden bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.03)_0%,transparent_70%)]">
          <StatPanel />
          <Visualizer />
        </main>

        <ControlPanel />
      </div>

      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-600/5 blur-[120px] rounded-full translate-y-1/2 -translate-x-1/2" />
      </div>
    </div>
  );
}

export default App;
