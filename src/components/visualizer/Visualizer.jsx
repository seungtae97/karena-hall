import { useRef, useEffect, useState } from 'react';
import { SceneManager } from '../../engine/SceneManager';
import useStore from '../../store/useStore';
import { calcCValues } from '../../logic/simulation';
import ProfileView from '../analysis/ProfileView';
import * as THREE from 'three';

export default function Visualizer() {
    const containerRef = useRef(null);
    const sceneManagerRef = useRef(null);
    const [initError, setInitError] = useState(null);

    // Optimized selectors to prevent unnecessary rerenders
    const floors = useStore(state => state.floors);
    const params = useStore(state => state.params);
    const selectedSeat = useStore(state => state.selectedSeat);
    const updateInterferences = useStore(state => state.updateInterferences);

    // Initial Setup
    useEffect(() => {
        if (!containerRef.current) return;

        console.log('[DEBUG] Visualizer Init Start');
        let sm = null;
        try {
            sm = new SceneManager(containerRef.current);
            sceneManagerRef.current = sm;
            updateInterferences();
        } catch (err) {
            console.error('[DEBUG] SceneManager Init Failed:', err);
            setInitError(err.message);
        }

        const handleResize = () => {
            try {
                sceneManagerRef.current?.resize();
            } catch (err) {
                console.warn('Resize error:', err);
            }
        };
        window.addEventListener('resize', handleResize);

        return () => {
            console.log('[DEBUG] Visualizer Dispose');
            window.removeEventListener('resize', handleResize);
            if (sceneManagerRef.current) {
                sceneManagerRef.current.dispose();
                sceneManagerRef.current = null;
            }
        };
    }, [updateInterferences]); // updateInterferences is stable in Zustand

    // Update Floors & Seats
    useEffect(() => {
        if (sceneManagerRef.current && floors && params) {
            console.log('[DEBUG] Updating 3D Layers');
            try {
                sceneManagerRef.current.updateFloors(floors, params, calcCValues);

                const onSelect = (instanceId, floorId) => {
                    const floor = floors.find(f => f.id === floorId);
                    if (!floor) return;
                    const { rows } = calcCValues(floor, params);
                    const seat = rows[instanceId];
                    if (seat) {
                        useStore.getState().setSelectedSeat({
                            ...seat,
                            floor: floorId,
                            pos: new THREE.Vector3(0, seat.H, -seat.R)
                        });
                    }
                };

                sceneManagerRef.current.updateSeats(floors, params, calcCValues, onSelect);
            } catch (err) {
                console.error('[DEBUG] Update Floors/Seats Failed:', err);
            }
        }
    }, [floors, params]);

    // Update Sightline
    useEffect(() => {
        if (sceneManagerRef.current) {
            try {
                if (selectedSeat && floors && params) {
                    let blocked = false;
                    let blockStr = '';

                    for (let f = 0; f < floors.length; f++) {
                        const ufl = floors[f];
                        if (ufl.type === '스탠딩' || ufl.id === selectedSeat.floor) continue;
                        if (ufl.hBase <= selectedSeat.H) continue;
                        if (selectedSeat.R < ufl.rStart) continue;

                        const T_R = 1.5;
                        const T_H = 1.0;
                        const hAtEdge = T_H + (selectedSeat.D - T_H) * ((ufl.rStart - T_R) / (selectedSeat.R - T_R));
                        if (hAtEdge > ufl.hBase + 0.1) {
                            blocked = true;
                            blockStr = ufl.id;
                            break;
                        }
                    }
                    sceneManagerRef.current.drawSightline(selectedSeat, blocked, blockStr);
                } else if (!selectedSeat) {
                    sceneManagerRef.current.clearSightlines();
                }
            } catch (err) {
                console.error('[DEBUG] Update Sightline Failed:', err);
            }
        }
    }, [selectedSeat, floors, params]);

    if (initError) {
        return (
            <div className="flex-1 flex items-center justify-center bg-slate-900 text-slate-400 p-8 text-center">
                <div>
                    <h3 className="text-xl font-bold text-slate-200 mb-2">Engine Error</h3>
                    <p className="text-sm">{initError}</p>
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="flex-1 w-full h-full relative group bg-black/20 overflow-hidden">
            <div className="absolute top-6 left-6 z-10 flex flex-col gap-2 pointer-events-none">
                <div className="px-3 py-1.5 bg-blue-600/20 border border-blue-600/30 rounded-full backdrop-blur-md">
                    <span className="text-[0.65rem] font-black text-blue-400 uppercase tracking-widest italic">Simulation Engine Active</span>
                </div>
            </div>

            <div className="absolute inset-0 pointer-events-none opacity-20"
                style={{ backgroundImage: 'radial-gradient(rgb(59, 130, 246) 0.5px, transparent 0.5px)', backgroundSize: '32px 32px' }} />

            <ProfileView />
        </div>
    );
}
