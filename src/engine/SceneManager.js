import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import gsap from 'gsap';

export class SceneManager {
    constructor(container) {
        if (!container) throw new Error('Container is required');
        this.container = container;
        this.width = container.clientWidth || 100;
        this.height = container.clientHeight || 100;

        // --- Scene ---
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x060d1a);

        // --- Camera ---
        this.camera = new THREE.PerspectiveCamera(42, this.width / this.height, 0.1, 800);
        this.sph = { theta: 0.6, phi: 0.9, r: 210 };
        this.tgt = new THREE.Vector3(0, 12, 0);
        this.isLensPOV = false;
        this.povAngles = { theta: 0, phi: Math.PI / 2 };
        this._camUpdate();

        // --- Renderer ---
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(this.width, this.height);
        this.renderer.toneMapping = THREE.ReinhardToneMapping;
        container.appendChild(this.renderer.domElement);

        // --- CSS2D Renderer ---
        this.labelRenderer = new CSS2DRenderer();
        this.labelRenderer.setSize(this.width, this.height);
        this.labelRenderer.domElement.style.position = 'absolute';
        this.labelRenderer.domElement.style.top = '0px';
        this.labelRenderer.domElement.style.pointerEvents = 'none';
        container.appendChild(this.labelRenderer.domElement);

        // --- Post Processing ---
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));
        const bloom = new UnrealBloomPass(new THREE.Vector2(this.width, this.height), 1.5, 0.4, 0.85);
        bloom.threshold = 0.5;
        bloom.strength = 0.3;
        bloom.radius = 0.2;
        this.composer.addPass(bloom);

        // --- Lighting ---
        this.scene.add(new THREE.AmbientLight(0x0d2040, 2));
        const dir = new THREE.DirectionalLight(0x5080c0, 0.7);
        dir.position.set(60, 120, 60);
        this.scene.add(dir);
        this.scene.add(new THREE.PointLight(0x4488ff, 4, 150));
        this.scene.add(new THREE.GridHelper(220, 44, 0x0d1f38, 0x0a1628));

        // --- Groups ---
        this.floorMeshes = [];
        this.seatInstances = [];
        this.dummyInstances = [];
        this.sightlineGroup = new THREE.Group();
        this.labelGroup = new THREE.Group();
        this.scene.add(this.sightlineGroup, this.labelGroup);

        // --- Shared Geometries ---
        this._initGeometries();
        this._initStage();

        // --- Raycaster ---
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.drag = false;
        this.moved = false;
        this.startPos = { x: 0, y: 0 };
        this.lm = { x: 0, y: 0 };

        // Bind events
        this._onClick = this._onClick.bind(this);
        this._onMouseDown = this._onMouseDown.bind(this);
        this._onMouseUp = this._onMouseUp.bind(this);
        this._onMouseMove = this._onMouseMove.bind(this);
        this._onWheel = this._onWheel.bind(this);
        this.animate = this.animate.bind(this);

        this.renderer.domElement.addEventListener('click', this._onClick);
        this.renderer.domElement.addEventListener('mousedown', this._onMouseDown);
        window.addEventListener('mouseup', this._onMouseUp);
        window.addEventListener('mousemove', this._onMouseMove);
        this.renderer.domElement.addEventListener('wheel', this._onWheel, { passive: false });

        // Callbacks
        this.onSeatSelect = null; // (seatInfo) => void
        this.onStagePOV = null;

        this.animate();
    }

    // ═══════════════════════════════════════
    // Shared Geometries (원본 복구)
    // ═══════════════════════════════════════
    _initGeometries() {
        // L자형 의자 (ExtrudeGeometry)
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.lineTo(0.45, 0);
        shape.lineTo(0.45, 0.15);
        shape.lineTo(0.1, 0.15);
        shape.lineTo(0.1, 0.55);
        shape.lineTo(0, 0.55);
        this.seatGeo = new THREE.ExtrudeGeometry(shape, {
            depth: 0.55, bevelEnabled: true, bevelSegments: 1,
            steps: 1, bevelSize: 0.02, bevelThickness: 0.02
        });
        this.seatGeo.rotateY(Math.PI / 2);
        this.seatGeo.translate(0, -0.15, -0.27);

        // 인물 모형
        this.headGeo = new THREE.SphereGeometry(0.11, 12, 12);
        this.bodyGeo = new THREE.CylinderGeometry(0.14, 0.12, 0.45, 12);
        this.bodyGeo.translate(0, 0.225, 0);
        this.dummyMat = new THREE.MeshPhongMaterial({ color: 0x94a3b8 });
    }

    _initStage() {
        // 반원형 무대
        const geo = new THREE.CylinderGeometry(1, 1, 1, 64, 1, false, 0, Math.PI);
        geo.translate(0, 0.5, 0);
        geo.rotateY(Math.PI / 2);
        const mat = new THREE.MeshPhongMaterial({ color: 0x1d4ed8, emissive: 0x172554, emissiveIntensity: 0.6 });
        this.stageMesh = new THREE.Mesh(geo, mat);
        this.scene.add(this.stageMesh);
    }

    // ═══════════════════════════════════════
    // Camera Control (원본 복구)
    // ═══════════════════════════════════════
    _camUpdate() {
        if (this.isLensPOV) return;
        const { theta, phi, r } = this.sph;
        this.camera.position.set(
            this.tgt.x + r * Math.sin(phi) * Math.cos(theta),
            this.tgt.y + r * Math.cos(phi),
            this.tgt.z + r * Math.sin(phi) * Math.sin(theta)
        );
        this.camera.lookAt(this.tgt);
    }

    setViewIso() {
        this.isLensPOV = false;
        this.sph = { theta: 0.6, phi: 0.9, r: 210 };
        this._camUpdate();
    }

    setViewFree() {
        this.isLensPOV = false;
        // 현재 위치 유지, 자유 드래그 활성화
    }

    enterPOV(seatInfo, params) {
        if (!seatInfo || !seatInfo.pos) return;
        this.isLensPOV = true;

        const dirVec = new THREE.Vector3(seatInfo.pos.x, 0, seatInfo.pos.z).normalize();
        const targetLook = dirVec.multiplyScalar(1.5);
        targetLook.y = params.stageH || 1.0;

        const eyeY = seatInfo.H + 0.70;

        gsap.to(this.camera.position, {
            x: seatInfo.pos.x, y: eyeY, z: seatInfo.pos.z,
            duration: 1.2, ease: 'power2.out',
            onUpdate: () => this.camera.lookAt(targetLook),
            onComplete: () => {
                const dir2 = targetLook.clone().sub(this.camera.position).normalize();
                this.povAngles.theta = Math.atan2(dir2.z, dir2.x);
                this.povAngles.phi = Math.acos(dir2.y);
            }
        });

        gsap.to(this.tgt, {
            x: targetLook.x, y: targetLook.y, z: targetLook.z,
            duration: 1.2, ease: 'power2.out'
        });
    }

    // ═══════════════════════════════════════
    // Mouse Events (원본 복구)
    // ═══════════════════════════════════════
    _onMouseDown(e) {
        this.drag = true;
        this.startPos = { x: e.clientX, y: e.clientY };
        this.lm = { x: e.clientX, y: e.clientY };
        this.moved = false;
    }

    _onMouseUp(e) {
        this.drag = false;
        const dist = Math.hypot(e.clientX - this.startPos.x, e.clientY - this.startPos.y);
        this.moved = dist > 7;
    }

    _onMouseMove(e) {
        if (!this.drag) return;
        if (Math.hypot(e.clientX - this.startPos.x, e.clientY - this.startPos.y) > 7) this.moved = true;

        if (this.isLensPOV) {
            this.povAngles.theta -= (e.clientX - this.lm.x) * 0.003;
            this.povAngles.phi -= (e.clientY - this.lm.y) * 0.003;
            this.povAngles.phi = Math.max(0.01, Math.min(Math.PI - 0.01, this.povAngles.phi));

            const lookX = this.camera.position.x + Math.sin(this.povAngles.phi) * Math.cos(this.povAngles.theta);
            const lookY = this.camera.position.y + Math.cos(this.povAngles.phi);
            const lookZ = this.camera.position.z + Math.sin(this.povAngles.phi) * Math.sin(this.povAngles.theta);
            this.camera.lookAt(lookX, lookY, lookZ);
        } else {
            this.sph.theta -= (e.clientX - this.lm.x) * 0.006;
            this.sph.phi = Math.max(0.1, Math.min(1.5, this.sph.phi + (e.clientY - this.lm.y) * 0.006));
            this._camUpdate();
        }
        this.lm = { x: e.clientX, y: e.clientY };
    }

    _onWheel(e) {
        e.preventDefault();
        if (this.isLensPOV) {
            this.isLensPOV = false;
            this.sph.r = this.camera.position.distanceTo(new THREE.Vector3(0, 1, 0));
            this.tgt.set(0, 1, 0);
        }
        this.sph.r = Math.max(10, Math.min(350, this.sph.r + e.deltaY * 0.12));
        this._camUpdate();
    }

    _onClick(e) {
        if (this.moved) return;
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.camera);

        const sMeshes = this.seatInstances.map(si => si.mesh);
        const dMeshes = this.dummyInstances.map(si => si.mesh);
        const targets = [...sMeshes, ...dMeshes, this.stageMesh];
        const intersects = this.raycaster.intersectObjects(targets);

        if (intersects.length > 0) {
            const hit = intersects[0];
            if (hit.object === this.stageMesh) {
                // 무대 클릭 → 연설자 POV
                this.isLensPOV = true;
                this.clearSightlines();
                const stageCenter = new THREE.Vector3(0, 2.6, 0);
                const audienceCenter = new THREE.Vector3(0, 2.6, -100);
                gsap.to(this.camera.position, {
                    x: 0, y: 2.6, z: 0,
                    duration: 1.2, ease: 'power2.out',
                    onUpdate: () => this.camera.lookAt(audienceCenter),
                    onComplete: () => {
                        this.povAngles.theta = -Math.PI / 2;
                        this.povAngles.phi = Math.PI / 2;
                    }
                });
                this.tgt.copy(audienceCenter);
                if (this.onStagePOV) this.onStagePOV();
            } else {
                // 좌석 또는 인물 클릭
                let targetGroup = this.seatInstances.find(si => si.mesh === hit.object);
                if (!targetGroup) {
                    const dIndex = this.dummyInstances.findIndex(si => si.mesh === hit.object);
                    if (dIndex !== -1) {
                        const fIdx = Math.floor(dIndex / 2);
                        targetGroup = this.seatInstances[fIdx];
                    }
                }
                if (targetGroup && targetGroup.data[hit.instanceId]) {
                    const seatInfo = targetGroup.data[hit.instanceId];
                    // 선택 좌석 하이라이트
                    targetGroup.mesh.setColorAt(hit.instanceId, new THREE.Color(0xffffff));
                    if (targetGroup.mesh.instanceColor) targetGroup.mesh.instanceColor.needsUpdate = true;

                    if (this.onSeatSelect) this.onSeatSelect(seatInfo);
                }
            }
        } else {
            this.clearSightlines();
        }
    }

    // ═══════════════════════════════════════
    // Rebuild All Floors (원본 완전 복구)
    // ═══════════════════════════════════════
    rebuildAll(floors, params, calcCValues) {
        // 무대 스케일
        const sh = Math.max(0.1, params.stageH || 1.0);
        const sr = params.stageR || 30;
        this.stageMesh.scale.set(sr, sh, sr);
        this.stageMesh.position.y = 0;

        // 기존 메쉬 정리
        this.floorMeshes.forEach(m => {
            this.scene.remove(m);
            if (m.geometry) m.geometry.dispose();
            if (m.material) {
                if (Array.isArray(m.material)) m.material.forEach(mt => mt.dispose());
                else m.material.dispose();
            }
        });
        this.seatInstances.forEach(si => { this.scene.remove(si.mesh); if (si.mesh.material) si.mesh.material.dispose(); });
        this.dummyInstances.forEach(si => { this.scene.remove(si.mesh); });
        this.floorMeshes = [];
        this.seatInstances = [];
        this.dummyInstances = [];
        while (this.labelGroup.children.length) this.labelGroup.remove(this.labelGroup.children[0]);

        const cPass = params.cPass || 0.12;
        const getMat = (C) => C >= cPass ? 0 : C >= 0.06 ? 1 : 2;

        floors.forEach(fl => {
            if (fl.type === '스탠딩') return; // Skip standing floors

            const stats = calcCValues(fl, params);
            const rows = stats.rows;
            if (!rows || rows.length === 0) return;

            // --- 데크(바닥) 메쉬 ---
            const innerR = fl.rStart;
            const lastRow = rows[rows.length - 1];
            const outerR = (lastRow.R || innerR + 1) + (lastRow.d || 0.95);
            if (!isNaN(innerR) && !isNaN(outerR)) {
                const flGeo = new THREE.RingGeometry(innerR, outerR, 64, 1, Math.PI, Math.PI);
                flGeo.rotateX(-Math.PI / 2);
                flGeo.rotateZ(-Math.PI / 2);
                const flMat = new THREE.MeshPhongMaterial({
                    color: fl.colorHex || '#ffffff', side: THREE.DoubleSide,
                    transparent: true, opacity: 0.35
                });
                const flMesh = new THREE.Mesh(flGeo, flMat);
                flMesh.position.y = fl.hBase || 0;
                this.scene.add(flMesh);
                this.floorMeshes.push(flMesh);
            }

            // --- 좌석 수 계산 ---
            let totalSeats = 0;
            const rCnts = [];
            rows.forEach(r => {
                const w = Math.PI * r.R;
                const c = Math.max(1, Math.floor(w / 0.6));
                rCnts.push(c);
                totalSeats += c;
            });

            // --- InstancedMesh: 의자 + 인물 ---
            const instMesh = new THREE.InstancedMesh(
                this.seatGeo,
                new THREE.MeshPhongMaterial({ color: 0xffffff }),
                totalSeats
            );
            instMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

            const headMesh = new THREE.InstancedMesh(this.headGeo, this.dummyMat, totalSeats);
            const bodyMesh = new THREE.InstancedMesh(this.bodyGeo, this.dummyMat, totalSeats);

            let idx = 0;
            const dummy = new THREE.Object3D();
            const headDummy = new THREE.Object3D();
            const bodyDummy = new THREE.Object3D();
            const color = new THREE.Color();
            const seatDataArr = [];

            rows.forEach((row, ri) => {
                const cnt = rCnts[ri];
                const matType = getMat(row.C);
                const hex = matType === 0 ? 0x2563eb : (matType === 1 ? 0xf59e0b : 0xef4444);
                color.setHex(hex);

                let addedLabel = false;

                for (let s = 0; s < cnt; s++) {
                    const angle = Math.PI + (s + 0.5) * (Math.PI / cnt);
                    const sx = row.R * Math.cos(angle);
                    const sz = row.R * Math.sin(angle);
                    const sy = row.H;

                    // 의자
                    dummy.position.set(sx, sy, sz);
                    dummy.rotation.y = -angle + Math.PI / 2;
                    dummy.updateMatrix();
                    instMesh.setMatrixAt(idx, dummy.matrix);
                    instMesh.setColorAt(idx, color);

                    // 인물 몸통
                    const offsetR = row.R + 0.12;
                    const bx = offsetR * Math.cos(angle);
                    const bz = offsetR * Math.sin(angle);
                    bodyDummy.position.set(bx, sy + 0.15, bz);
                    bodyDummy.rotation.y = -angle + Math.PI / 2;
                    bodyDummy.updateMatrix();
                    bodyMesh.setMatrixAt(idx, bodyDummy.matrix);

                    // 인물 머리
                    headDummy.position.set(bx, sy + 0.60, bz);
                    headDummy.rotation.y = -angle + Math.PI / 2;
                    headDummy.updateMatrix();
                    headMesh.setMatrixAt(idx, headDummy.matrix);

                    // 층 라벨 (첫 행 중앙)
                    if (ri === 0 && s === Math.floor(cnt / 2) && !addedLabel) {
                        const lDiv = document.createElement('div');
                        lDiv.textContent = fl.id;
                        lDiv.style.cssText = 'color:#fff;font-size:14px;font-weight:700;text-shadow:0 2px 4px rgba(0,0,0,0.8);pointer-events:none;';
                        const clab = new CSS2DObject(lDiv);
                        clab.position.set(sx, sy + 3, sz);
                        this.labelGroup.add(clab);
                        addedLabel = true;
                    }

                    seatDataArr.push({
                        idx, R: row.R, H: sy, D: row.H + (params.eyeH || 1.1),
                        C: row.C, E: row.E, rowNumber: row.rowNumber,
                        pos: new THREE.Vector3(sx, sy, sz),
                        floor: fl.id, matType
                    });
                    idx++;
                }
            });

            instMesh.instanceMatrix.needsUpdate = true;
            if (instMesh.instanceColor) instMesh.instanceColor.needsUpdate = true;
            headMesh.instanceMatrix.needsUpdate = true;
            bodyMesh.instanceMatrix.needsUpdate = true;

            this.scene.add(instMesh, headMesh, bodyMesh);
            this.seatInstances.push({ mesh: instMesh, data: seatDataArr });
            this.dummyInstances.push({ mesh: headMesh }, { mesh: bodyMesh });
        });
    }

    // ═══════════════════════════════════════
    // Sightline & Interference (원본 완전 복구)
    // ═══════════════════════════════════════
    clearSightlines() {
        while (this.sightlineGroup.children.length) {
            const c = this.sightlineGroup.children[0];
            if (c.geometry) c.geometry.dispose();
            if (c.material) c.material.dispose();
            this.sightlineGroup.remove(c);
        }
    }

    drawSightline(seatInfo, floors, params) {
        this.clearSightlines();
        if (!seatInfo || !seatInfo.pos) return;

        const T_R = 1.5;
        const stageH = params.stageH || 1.0;

        // 좌석 눈높이에서 무대 1.5m 타겟으로 시야선
        const p1 = new THREE.Vector3(seatInfo.pos.x, seatInfo.D, seatInfo.pos.z);
        const dirVec = new THREE.Vector3(seatInfo.pos.x, 0, seatInfo.pos.z).normalize();
        const p2 = dirVec.multiplyScalar(T_R);
        p2.y = stageH;

        // Bloom 색상
        const isPass = seatInfo.matType === 0;
        const cR = isPass ? 0 : 5;
        const cG = isPass ? 5 : (seatInfo.matType === 1 ? 4 : 0);
        const cB = isPass ? 10 : 0;
        const lineMat = new THREE.LineBasicMaterial({ color: new THREE.Color(cR, cG, cB), linewidth: 2 });
        const lineGeo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
        this.sightlineGroup.add(new THREE.Line(lineGeo, lineMat));

        // 선택 마커
        const selMarker = new THREE.Mesh(
            new THREE.SphereGeometry(0.1, 16, 16),
            new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 })
        );
        selMarker.position.copy(seatInfo.pos);
        selMarker.position.y += 0.3;
        this.sightlineGroup.add(selMarker);

        // 시야 간섭 검사 + 마커
        let blocked = false;
        let blockStr = '';
        for (let f = 0; f < floors.length; f++) {
            const ufl = floors[f];
            if (ufl.type === '스탠딩' || ufl.id === seatInfo.floor) continue;
            if (ufl.hBase <= seatInfo.H) continue;
            if (seatInfo.R < ufl.rStart) continue;

            const hAtEdge = stageH + (seatInfo.D - stageH) * ((ufl.rStart - T_R) / (seatInfo.R - T_R));
            if (hAtEdge > ufl.hBase + 0.1) {
                blocked = true;
                blockStr = ufl.id;
                // 간섭 마커 (빨간 구)
                const ratio = (ufl.rStart - T_R) / (seatInfo.R - T_R);
                const cVec = new THREE.Vector3().lerpVectors(p2, p1, ratio);
                const marker = new THREE.Mesh(
                    new THREE.SphereGeometry(0.15, 16, 16),
                    new THREE.MeshBasicMaterial({ color: 0xff3300 })
                );
                marker.position.copy(cVec);
                this.sightlineGroup.add(marker);
            }
        }

        // CSS2D 시야 판정 라벨
        const midP = new THREE.Vector3().lerpVectors(p1, p2, 0.4);
        const labelDiv = document.createElement('div');
        labelDiv.style.cssText = `
            padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 600;
            backdrop-filter: blur(8px); pointer-events: none; white-space: nowrap;
        `;
        if (blocked) {
            labelDiv.style.background = 'rgba(239,68,68,0.15)';
            labelDiv.style.border = '1px solid rgba(239,68,68,0.4)';
            labelDiv.style.color = '#fca5a5';
            labelDiv.textContent = `⚠ 간섭 발생: ${blockStr} 데크 충돌`;
        } else if (!isPass) {
            labelDiv.style.background = 'rgba(245,158,11,0.15)';
            labelDiv.style.border = '1px solid rgba(245,158,11,0.4)';
            labelDiv.style.color = '#fcd34d';
            labelDiv.textContent = `⚠ 시야각 품질 저하 (C=${seatInfo.C.toFixed(2)}m)`;
        } else {
            labelDiv.style.background = 'rgba(34,197,94,0.15)';
            labelDiv.style.border = '1px solid rgba(34,197,94,0.4)';
            labelDiv.style.color = '#86efac';
            labelDiv.textContent = `✓ 통과 (시야 확보)`;
        }
        const seatLabel = new CSS2DObject(labelDiv);
        seatLabel.position.copy(midP);
        this.sightlineGroup.add(seatLabel);

        return { blocked, blockStr };
    }

    // ═══════════════════════════════════════
    // Animation Loop
    // ═══════════════════════════════════════
    animate() {
        if (!this.renderer) return;
        this.frameId = requestAnimationFrame(this.animate);
        if (this.composer) this.composer.render();
        else this.renderer.render(this.scene, this.camera);
        if (this.labelRenderer) this.labelRenderer.render(this.scene, this.camera);
    }

    resize() {
        if (!this.container || !this.renderer) return;
        this.width = this.container.clientWidth || 100;
        this.height = this.container.clientHeight || 100;
        this.camera.aspect = this.width / this.height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.width, this.height);
        if (this.composer) this.composer.setSize(this.width, this.height);
        if (this.labelRenderer) this.labelRenderer.setSize(this.width, this.height);
    }

    dispose() {
        if (this.frameId) cancelAnimationFrame(this.frameId);
        this.renderer?.domElement?.removeEventListener('click', this._onClick);
        this.renderer?.domElement?.removeEventListener('mousedown', this._onMouseDown);
        window.removeEventListener('mouseup', this._onMouseUp);
        window.removeEventListener('mousemove', this._onMouseMove);
        this.renderer?.domElement?.removeEventListener('wheel', this._onWheel);

        this.floorMeshes.forEach(m => { this.scene.remove(m); m.geometry?.dispose(); });
        this.seatInstances.forEach(si => { this.scene.remove(si.mesh); si.mesh.material?.dispose(); });
        this.dummyInstances.forEach(si => { this.scene.remove(si.mesh); });

        if (this.renderer) {
            this.renderer.dispose();
            if (this.renderer.domElement?.parentNode) this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
            this.renderer = null;
        }
        if (this.composer) { this.composer.dispose(); this.composer = null; }
        if (this.labelRenderer?.domElement?.parentNode) {
            this.labelRenderer.domElement.parentNode.removeChild(this.labelRenderer.domElement);
            this.labelRenderer = null;
        }
        this.container = null;
    }
}
