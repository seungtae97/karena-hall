import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import gsap from 'gsap';

export class SceneManager {
    constructor(container) {
        if (!container) throw new Error('Container is required for SceneManager');
        this.container = container;
        this.width = container.clientWidth || 100;
        this.height = container.clientHeight || 100;

        console.log('[DEBUG] SceneManager constructor: w=', this.width, 'h=', this.height);

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0f172a);

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 0.1, 1000);
        this.camera.position.set(100, 80, 100);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(this.renderer.domElement);

        this.labelRenderer = new CSS2DRenderer();
        this.labelRenderer.setSize(this.width, this.height);
        this.labelRenderer.domElement.style.position = 'absolute';
        this.labelRenderer.domElement.style.top = '0px';
        this.labelRenderer.domElement.style.pointerEvents = 'none';
        container.appendChild(this.labelRenderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI / 2 - 0.1;

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);

        const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
        sunLight.position.set(50, 100, 50);
        this.scene.add(sunLight);

        // Groups
        this.floorGroup = new THREE.Group();
        this.seatGroup = new THREE.Group();
        this.sightlineGroup = new THREE.Group();
        this.scene.add(this.floorGroup, this.seatGroup, this.sightlineGroup);

        // Core items
        this.initStage();
        this.initPostProcessing();

        this.animate = this.animate.bind(this);
        this.requestUpdate = this.requestUpdate.bind(this);
        this.onPointerDown = this.onPointerDown.bind(this);

        container.addEventListener('pointerdown', this.onPointerDown);

        this.renderRequested = false;
        this.animate();
    }

    onPointerDown(event) {
        if (!this.container) return;
        const rect = this.container.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / this.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / this.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.seatGroup.children);

        if (intersects.length > 0) {
            const { instanceId, object } = intersects[0];
            if (object.userData.onSelect) {
                object.userData.onSelect(instanceId, object.userData.floorId);
            }
        }
    }

    initStage() {
        const stageGeo = new THREE.CylinderGeometry(30, 30, 2, 64);
        const stageMat = new THREE.MeshStandardMaterial({
            color: 0x1e293b,
            roughness: 0.1,
            metalness: 0.8
        });
        const stage = new THREE.Mesh(stageGeo, stageMat);
        stage.position.y = 1;
        this.scene.add(stage);

        // Stage Edge Line
        const edgeGeo = new THREE.RingGeometry(29.9, 30.1, 64);
        const edgeMat = new THREE.MeshBasicMaterial({ color: 0x3b82f6, side: THREE.DoubleSide });
        const edge = new THREE.Mesh(edgeGeo, edgeMat);
        edge.rotation.x = Math.PI / 2;
        edge.position.y = 2.01;
        this.scene.add(edge);
    }

    initPostProcessing() {
        try {
            this.composer = new EffectComposer(this.renderer);
            this.composer.addPass(new RenderPass(this.scene, this.camera));

            const bloomPass = new UnrealBloomPass(
                new THREE.Vector2(this.width || 100, this.height || 100),
                0.4, 0.1, 0.85
            );
            this.composer.addPass(bloomPass);
        } catch (err) {
            console.warn('PostProcessing initialization failed:', err);
        }
    }

    animate() {
        if (!this.renderer) return;
        this.frameId = requestAnimationFrame(this.animate);
        if (this.controls) this.controls.update();
        this.renderRequested = false;

        if (this.composer) {
            this.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }

        if (this.labelRenderer) {
            this.labelRenderer.render(this.scene, this.camera);
        }
    }

    requestUpdate() {
        if (!this.renderRequested) {
            this.renderRequested = true;
        }
    }

    updateFloors(floors, params, calcCValues) {
        if (!this.floorGroup) return;

        // Clear previous meshes
        while (this.floorGroup.children.length) {
            const child = this.floorGroup.children[0];
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                else child.material.dispose();
            }
            this.floorGroup.remove(child);
        }

        floors.forEach((fl) => {
            const { rows } = calcCValues(fl, params);
            if (!rows || rows.length === 0) return;

            const innerR = fl.rStart;
            const lastRow = rows[rows.length - 1];
            const outerR = (lastRow.R || innerR + 1) + (lastRow.d || 0.95);

            if (isNaN(innerR) || isNaN(outerR)) return;

            const floorGeo = new THREE.RingGeometry(innerR, outerR, 64, 1, 0, Math.PI);
            const floorMat = new THREE.MeshStandardMaterial({
                color: fl.colorHex || '#ffffff',
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.25
            });
            const floorMesh = new THREE.Mesh(floorGeo, floorMat);
            floorMesh.rotation.x = -Math.PI / 2;
            floorMesh.position.y = fl.hBase || 0;
            this.floorGroup.add(floorMesh);

            const edgeGeo = new THREE.RingGeometry(innerR - 0.05, innerR + 0.05, 64, 1, 0, Math.PI);
            const edgeMat = new THREE.MeshBasicMaterial({ color: fl.colorHex || '#ffffff', side: THREE.DoubleSide });
            const edgeLine = new THREE.Mesh(edgeGeo, edgeMat);
            edgeLine.rotation.x = -Math.PI / 2;
            edgeLine.position.y = (fl.hBase || 0) + 0.01;
            this.floorGroup.add(edgeLine);
        });
    }

    clearSightlines() {
        if (!this.sightlineGroup) return;
        while (this.sightlineGroup.children.length) {
            const child = this.sightlineGroup.children[0];
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                else child.material.dispose();
            }
            this.sightlineGroup.remove(child);
        }
    }

    drawSightline(seatInfo, blocked, blockStr) {
        if (!seatInfo || !seatInfo.pos) return;
        this.clearSightlines();

        const start = new THREE.Vector3(0, 1.0, 0);
        const end = seatInfo.pos.clone();
        end.y = seatInfo.D || seatInfo.E || seatInfo.H + 1.1;

        const points = [start, end];
        const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
        const lineMat = new THREE.LineBasicMaterial({
            color: blocked ? 0xef4444 : 0x22c55e,
            linewidth: 2,
            transparent: true,
            opacity: 0.8
        });
        const line = new THREE.Line(lineGeo, lineMat);
        this.sightlineGroup.add(line);

        const markerGeo = new THREE.SphereGeometry(0.12, 16, 16);
        const markerMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const marker = new THREE.Mesh(markerGeo, markerMat);
        marker.position.copy(seatInfo.pos);
        marker.position.y += 0.3;
        this.sightlineGroup.add(marker);

        this.requestUpdate();
    }

    updateSeats(floors, params, calcCValues, onSelect) {
        if (!this.seatGroup) return;
        while (this.seatGroup.children.length) {
            const child = this.seatGroup.children[0];
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                else child.material.dispose();
            }
            this.seatGroup.remove(child);
        }

        const seatGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);

        floors.forEach((fl) => {
            const { rows } = calcCValues(fl, params);
            if (!rows || rows.length === 0) return;

            const count = rows.length;
            const instMesh = new THREE.InstancedMesh(seatGeo, new THREE.MeshStandardMaterial({ color: fl.colorHex || '#ffffff' }), count);
            instMesh.userData = { floorId: fl.id, onSelect };

            const matrix = new THREE.Matrix4();
            rows.forEach((r, idx) => {
                matrix.setPosition(0, r.H || 0, -(r.R || 0));
                instMesh.setMatrixAt(idx, matrix);
            });
            instMesh.instanceMatrix.needsUpdate = true;
            instMesh.computeBoundingSphere();

            this.seatGroup.add(instMesh);
        });
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
        console.log('[DEBUG] SceneManager Disposal...');
        if (this.frameId) cancelAnimationFrame(this.frameId);

        if (this.container) {
            this.container.removeEventListener('pointerdown', this.onPointerDown);
        }

        if (this.renderer) {
            this.renderer.dispose();
            if (this.renderer.domElement && this.renderer.domElement.parentNode) {
                this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
            }
            this.renderer = null;
        }

        if (this.composer) {
            this.composer.dispose();
            this.composer = null;
        }

        if (this.labelRenderer) {
            if (this.labelRenderer.domElement && this.labelRenderer.domElement.parentNode) {
                this.labelRenderer.domElement.parentNode.removeChild(this.labelRenderer.domElement);
            }
            this.labelRenderer = null;
        }

        const disposeGroup = (group) => {
            if (!group) return;
            group.traverse((obj) => {
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) {
                    if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
                    else obj.material.dispose();
                }
            });
        };
        disposeGroup(this.floorGroup);
        disposeGroup(this.seatGroup);
        disposeGroup(this.sightlineGroup);

        this.container = null;
    }
}
