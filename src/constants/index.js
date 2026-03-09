export const DEFAULTS = {
    rowPitch: 0.95,
    eyeH: 1.10,
    stageH: 1.00,
    cPass: 0.12,
    stageR: 30, // 무대 반경 R=30m 고정
    floors: [
        { id: '1F', type: '지정석', rStart: 30, hBase: 0, capacity: 10216, colorHex: '#94a3b8', rowPitch: 0.95, segments: [{ rEnd: 75, width: 45, theta: 6 }] },
        { id: '2F', type: '지정석', rStart: 40, hBase: 5.0, capacity: 13166, colorHex: '#fca5a5', rowPitch: 0.95, segments: [{ rEnd: 85, width: 45, theta: 6.34 }] },
        {
            id: '3F', type: '지정석', rStart: 45, hBase: 7.7, capacity: 12229, colorHex: '#fcd34d', rowPitch: 0.95, segments: [
                { rEnd: 55, width: 10, theta: 18 }, { rEnd: 70, width: 15, theta: 19 }, { rEnd: 85, width: 15, theta: 20.5 }
            ]
        },
        { id: '4F', type: '지정석', rStart: 50, hBase: 10.4, capacity: 11234, colorHex: '#6ee7b7', rowPitch: 0.95, segments: [{ rEnd: 85, width: 35, theta: 18.63 }] },
        { id: '5F', type: '지정석', rStart: 50, hBase: 15.8, capacity: 11234, colorHex: '#93c5fd', rowPitch: 0.95, segments: [{ rEnd: 85, width: 35, theta: 24.29 }] },
        { id: '6F', type: '지정석', rStart: 50, hBase: 19.9, capacity: 12026, colorHex: '#c4b5fd', rowPitch: 0.95, segments: [{ rEnd: 85, width: 35, theta: 33.08 }] },
    ]
};

export const T_H = 1.0; // 타겟 높이
export const T_R = 1.5; // 무대 끝 이격 거리
