import { useRef, useEffect, useState } from 'react';
import { SceneManager } from '../../engine/SceneManager';
import useStore from '../../store/useStore';
import { calcCValues } from '../../logic/simulation';
import ProfileView from '../analysis/ProfileView';
import SeatInfoPanel from '../analysis/SeatInfoPanel';
import * as THREE from 'three';

export default function Visualizer() {
    const containerRef = useRef(null);
    const smRef = useRef(null);
    const [seatInfo, setSeatInfo] = useState(null);
    const [povMode, setPovMode] = useState(false);

    const floors = useStore(s => s.floors);
    const params = useStore(s => s.params);
    const selectedSeat = useStore(s => s.selectedSeat);
    const updateInterferences = useStore(s => s.updateInterferences);

    // Init SceneManager once
    useEffect(() => {
        if (!containerRef.current) return;
        const sm = new SceneManager(containerRef.current);
        smRef.current = sm;

        // 좌석 클릭 콜백
        sm.onSeatSelect = (info) => {
            setSeatInfo(info);
            useStore.getState().setSelectedSeat(info);
        };

        sm.onStagePOV = () => {
            setPovMode(true);
        };

        updateInterferences();

        const handleResize = () => sm.resize();
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            sm.dispose();
            smRef.current = null;
        };
    }, [updateInterferences]);

    // Rebuild on data change
    useEffect(() => {
        if (smRef.current && floors && params) {
            smRef.current.rebuildAll(floors, params, calcCValues);
        }
    }, [floors, params]);

    // Draw sightline on seat selection
    useEffect(() => {
        if (smRef.current && selectedSeat && floors && params) {
            smRef.current.drawSightline(selectedSeat, floors, params);
        } else if (smRef.current) {
            smRef.current.clearSightlines();
        }
    }, [selectedSeat, floors, params]);

    // POV enter handler
    const handleEnterPOV = () => {
        if (smRef.current && selectedSeat) {
            smRef.current.enterPOV(selectedSeat, params);
            setPovMode(true);
        }
    };

    // View mode switch
    const viewMode = useStore(s => s.viewMode);
    useEffect(() => {
        if (!smRef.current) return;
        if (viewMode === 'iso') smRef.current.setViewIso();
        else if (viewMode === 'free') smRef.current.setViewFree();
    }, [viewMode]);

    return (
        <div ref={containerRef} className="flex-1 w-full h-full relative group overflow-hidden">
            {/* Status Badge */}
            <div className="absolute top-4 left-4 z-10 pointer-events-none">
                <div className="px-3 py-1.5 bg-blue-600/20 border border-blue-600/30 rounded-full backdrop-blur-md">
                    <span className="text-[0.6rem] font-black text-blue-400 uppercase tracking-widest italic">
                        {povMode ? '1인칭 POV 모드 (휠로 복귀)' : 'Simulation Engine Active'}
                    </span>
                </div>
            </div>

            {/* POV Enter Button */}
            {selectedSeat && !povMode && (
                <div className="absolute top-4 right-4 z-10">
                    <button
                        onClick={handleEnterPOV}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg
                                   transition-all shadow-lg shadow-blue-600/30 hover:shadow-blue-500/40 active:scale-95"
                    >
                        👁 1인칭 시점 진입
                    </button>
                </div>
            )}

            {/* Seat Info Panel */}
            {seatInfo && <SeatInfoPanel seat={seatInfo} />}

            {/* Profile View */}
            <ProfileView />
        </div>
    );
}
