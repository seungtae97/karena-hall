import { T_H, T_R } from '../constants';

export function calcCValues(fl, params) {
    if (fl.type === '스탠딩' || !fl.segments || fl.segments.length === 0) return { rows: [], numRows: 0 };
    let rows = [];
    let currentR = fl.rStart;
    let currentH = fl.hBase;

    let rowIdx = 0;
    let prevEyeY = null;
    let prevR = null;

    const { eyeH, rowPitch: globalRowPitch } = params;

    for (let sIdx = 0; sIdx < fl.segments.length; sIdx++) {
        const seg = fl.segments[sIdx];

        // Width 기반 rEnd 동기화
        const rEnd = seg.width !== undefined ? currentR + seg.width : seg.rEnd;
        const width = rEnd - currentR;

        // 층별 rowPitch 가 있으면 우선 적용, 없으면 전역 P.rowPitch 사용
        let d = fl.rowPitch !== undefined ? fl.rowPitch : globalRowPitch;
        let R_rise = Math.tan((seg.theta || 0) * Math.PI / 180) * d;

        const maxRows = d > 0 ? Math.floor(width / d) : 0;

        for (let i = 0; i < maxRows; i++) {
            const R = currentR + i * d;
            const H = currentH + i * R_rise;
            const E = H + eyeH;

            let C = 0;
            if (prevEyeY !== null && prevR !== null) {
                const SightY_at_prev = T_H + ((E - T_H) / (R - T_R)) * (prevR - T_R);
                C = SightY_at_prev - prevEyeY;
            } else {
                C = 1.0;
            }

            rows.push({
                i: rowIdx,
                R, H, C,
                segIdx: sIdx,
                d, R_rise, E,
                rowNumber: rowIdx + 1
            });
            rowIdx++;

            prevEyeY = E;
            prevR = R;
        }

        if (maxRows > 0) {
            currentR = currentR + maxRows * d;
            currentH = currentH + maxRows * R_rise;
        }
    }

    return { rows, numRows: rowIdx };
}

export function calcStats(fl, params) {
    const { rows, numRows } = calcCValues(fl, params);
    if (rows.length === 0) return { rows, passRows: 0, failRows: 0, passRate: 0, avgC: 0, numRows: 0 };
    const passRows = rows.filter(r => r.C >= params.cPass).length;
    const failRows = rows.length - passRows;
    const passRate = Math.round(passRows / rows.length * 100);
    const avgC = rows.reduce((s, r) => s + r.C, 0) / rows.length;
    return { rows, passRows, failRows, passRate, avgC, numRows };
}

export function checkInterferences(floors, params) {
    let interfSeats = 0;
    const { cPass } = params;

    for (let i = 1; i < floors.length - 1; i++) {
        const flLower = floors[i];
        const stats = calcCValues(flLower, params);
        if (stats.rows.length === 0) continue;

        for (let j = i + 1; j < floors.length; j++) {
            const flUpper = floors[j];
            if (flUpper.hBase <= flLower.hBase) continue;

            for (let row of stats.rows) {
                if (row.R > flUpper.rStart) {
                    const sightH = T_H + ((row.E - T_H) / (row.R - T_R)) * (flUpper.rStart - T_R);
                    if (sightH > flUpper.hBase + 0.1) {
                        const w = Math.PI * row.R;
                        const c = Math.max(1, Math.floor(w / 0.6));
                        interfSeats += c;
                        break;
                    }
                }
            }
        }
    }
    return interfSeats;
}
