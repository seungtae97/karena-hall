import { create } from 'zustand';
import { DEFAULTS } from '../constants';
import { checkInterferences } from '../logic/simulation';

const useStore = create((set, get) => ({
    params: {
        eyeH: DEFAULTS.eyeH,
        rowPitch: DEFAULTS.rowPitch,
        cPass: DEFAULTS.cPass,
        stageH: DEFAULTS.stageH,
        stageR: DEFAULTS.stageR,
    },
    floors: DEFAULTS.floors,
    activeFloorId: '3F',
    selectedSeat: null,
    interferenceCount: 0,
    viewMode: 'iso', // iso, free, profile
    profileMode: 'floor', // floor, all

    // Actions
    setParams: (newParams) => {
        set((state) => ({ params: { ...state.params, ...newParams } }));
        get().updateInterferences();
    },

    setFloors: (newFloors) => {
        set({ floors: newFloors });
        get().updateInterferences();
    },

    setActiveFloor: (id) => set({ activeFloorId: id }),

    setSelectedSeat: (seat) => set({ selectedSeat: seat }),

    setViewMode: (mode) => set({ viewMode: mode }),

    setProfileMode: (mode) => set({ profileMode: mode }),

    updateInterferences: () => {
        const { floors, params } = get();
        const count = checkInterferences(floors, params);
        set({ interferenceCount: count });
    }
}));

export default useStore;
