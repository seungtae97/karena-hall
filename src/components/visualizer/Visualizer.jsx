import { useRef, useEffect } from 'react';
import useStore from '../../store/useStore';
import { calcCValues } from '../../logic/simulation';
import ProfileView from '../analysis/ProfileView';
import { SceneManager } from '../../engine/SceneManager';
import * as THREE from 'three';

export default function Visualizer() {
    const containerRef = useRef(null);
    const sceneManagerRef = useRef(null);
    const { floors, params, activeFloorId, selectedSeat, updateInterferences } = useStore();

    useEffect(() => {
        if (containerRef.current) {
            sceneManagerRef.current = new SceneManager(containerRef.current);
            updateInterferences();

            const handleResize = () => sceneManagerRef.current.resize();
            window.addEventListener('resize', handleResize);

            return () => {
                window.removeEventListener('resize', handleResize);
                if (sceneManagerRef.current) sceneManagerRef.current.dispose();
            };
        }
    }, [updateInterferences]);

    useEffect(() => {
        if (sceneManagerRef.current) {
            sceneManagerRef.current.updateFloors(floors, params, calcCValues);

            const onSelect = (instanceId, floorId) => {
                const floor = floors.find(f => f.id === floorId);
                const { rows } = calcCValues(floor, params);
                const seat = rows[instanceId];
                if (seat) {
                    useStore.getState().setSelectedSeat({ ...seat, floor: floorId, pos: new THREE.Vector3(0, seat.H, -seat.R) });
                }
            };

            sceneManagerRef.current.updateSeats(floors, params, calcCValues, onSelect);
        }
    }, [floors, params]);

    useEffect(() => {
        if (sceneManagerRef.current && selectedSeat) {
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
        } else if (sceneManagerRef.current) {
            sceneManagerRef.current.clearSightlines();
        }
    }, [selectedSeat, floors, params]);

    return (
        <div ref={containerRef} className="flex-1 w-full h-full relative group">
            <div className="absolute top-6 left-6 z-10 flex flex-col gap-2">
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
