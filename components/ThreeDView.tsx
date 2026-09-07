'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  GoldakConfig,
  MaterialProperties,
  SimulationResults,
  ThermalGridData,
  WeldingConfig,
  WorkpieceConfig,
} from '@/lib/types';
import { getTemperatureColor, getTorchTrajectoryPosition } from '@/lib/thermalEngine';

interface ThreeDViewProps {
  workpiece: WorkpieceConfig;
  material: MaterialProperties;
  welding: WeldingConfig;
  goldak: GoldakConfig;
  grid: ThermalGridData;
  results: SimulationResults;
}

export const ThreeDView: React.FC<ThreeDViewProps> = ({
  workpiece,
  material,
  welding,
  goldak,
  grid,
  results,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  // Scene object groups
  const workpieceGroupRef = useRef<THREE.Group | null>(null);
  const thermalMeshRef = useRef<THREE.Mesh | null>(null);
  const trajectoryLineRef = useRef<THREE.Line | null>(null);
  const torchGroupRef = useRef<THREE.Group | null>(null);
  const goldakGroupRef = useRef<THREE.Group | null>(null);

  // Toggles
  const [showWorkpiece, setShowWorkpiece] = useState(true);
  const [showThermalField, setShowThermalField] = useState(true);
  const [showMeltZone, setShowMeltZone] = useState(true);
  const [showTrajectory, setShowTrajectory] = useState(true);
  const [showGoldakSource, setShowGoldakSource] = useState(true);

  // Builder functions defined before effects
  const buildWorkpieceMeshes = useCallback(() => {
    if (!workpieceGroupRef.current || !sceneRef.current) return;
    const group = workpieceGroupRef.current;
    while (group.children.length > 0) {
      const obj = group.children[0];
      group.remove(obj);
      if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
    }

    const { length, width, thickness, grooveType, rootGap } = workpiece;
    const halfWidth = width / 2;
    const halfGap = rootGap / 2;
    const plateWidth = Math.max(2, halfWidth - halfGap);

    const plateMaterial = new THREE.MeshStandardMaterial({
      color: 0x94a3b8, // slate-400 steel
      metalness: 0.35,
      roughness: 0.65,
    });
    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x334155, linewidth: 1.5 });

    // Left Plate Box
    const leftGeo = new THREE.BoxGeometry(length, plateWidth, thickness);
    const leftPlate = new THREE.Mesh(leftGeo, plateMaterial);
    leftPlate.position.set(length / 2, -(halfGap + plateWidth / 2), -thickness / 2);
    group.add(leftPlate);
    const leftEdges = new THREE.LineSegments(new THREE.EdgesGeometry(leftGeo), edgeMaterial);
    leftPlate.add(leftEdges);

    // Right Plate Box
    const rightGeo = new THREE.BoxGeometry(length, plateWidth, thickness);
    const rightPlate = new THREE.Mesh(rightGeo, plateMaterial);
    rightPlate.position.set(length / 2, halfGap + plateWidth / 2, -thickness / 2);
    group.add(rightPlate);
    const rightEdges = new THREE.LineSegments(new THREE.EdgesGeometry(rightGeo), edgeMaterial);
    rightPlate.add(rightEdges);

    // Groove Plane Visualizer
    if (grooveType !== 'square' && rootGap < 5) {
      const grooveGeo = new THREE.PlaneGeometry(length, Math.max(1, rootGap + 2));
      const grooveMat = new THREE.MeshBasicMaterial({ color: 0x475569, side: THREE.DoubleSide });
      const grooveMesh = new THREE.Mesh(grooveGeo, grooveMat);
      grooveMesh.position.set(length / 2, 0, -thickness * 0.4);
      group.add(grooveMesh);
    }
  }, [workpiece]);

  const buildTrajectoryLine = useCallback(() => {
    if (!sceneRef.current) return;
    if (trajectoryLineRef.current) {
      sceneRef.current.remove(trajectoryLineRef.current);
      trajectoryLineRef.current.geometry.dispose();
    }

    const points: THREE.Vector3[] = [];
    const totalTime = Math.max(1, (workpiece.length - 20) / Math.max(0.1, welding.travelSpeed));
    const steps = 180;
    for (let s = 0; s <= steps; s++) {
      const t = (s / steps) * totalTime;
      const pos = getTorchTrajectoryPosition(t, welding, workpiece);
      points.push(new THREE.Vector3(pos.x, pos.y, 0.2));
    }

    const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
    const lineMat = new THREE.LineDashedMaterial({
      color: 0x2563eb,
      dashSize: 3,
      gapSize: 1.5,
    });
    const line = new THREE.Line(lineGeo, lineMat);
    line.computeLineDistances();
    sceneRef.current.add(line);
    trajectoryLineRef.current = line;
  }, [welding, workpiece]);

  const buildThermalFieldMesh = useCallback(() => {
    if (!sceneRef.current) return;
    if (thermalMeshRef.current) {
      sceneRef.current.remove(thermalMeshRef.current);
      thermalMeshRef.current.geometry.dispose();
    }

    const { nx, ny } = grid;
    const geometry = new THREE.PlaneGeometry(workpiece.length, workpiece.width, nx - 1, ny - 1);
    geometry.translate(workpiece.length / 2, 0, 0.15);

    const count = geometry.attributes.position.count;
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i += 3) {
      colors[i] = 0.4;
      colors[i + 1] = 0.45;
      colors[i + 2] = 0.55;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    sceneRef.current.add(mesh);
    thermalMeshRef.current = mesh;
  }, [grid, workpiece.length, workpiece.width]);

  const buildTorchModel = useCallback(() => {
    if (!torchGroupRef.current) return;
    const group = torchGroupRef.current;
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    const nozzleMat = new THREE.MeshStandardMaterial({
      color: 0xb45309,
      metalness: 0.8,
      roughness: 0.3,
    });
    const nozzleGeo = new THREE.CylinderGeometry(2, 3.5, 20, 16);
    nozzleGeo.rotateX(Math.PI / 2);
    const nozzle = new THREE.Mesh(nozzleGeo, nozzleMat);
    nozzle.position.set(0, 0, 13);
    group.add(nozzle);

    const electrodeGeo = new THREE.CylinderGeometry(0.8, 0.8, 8, 12);
    electrodeGeo.rotateX(Math.PI / 2);
    const electrodeMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9 });
    const electrode = new THREE.Mesh(electrodeGeo, electrodeMat);
    electrode.position.set(0, 0, 4);
    group.add(electrode);

    const arcGeo = new THREE.SphereGeometry(1.8, 16, 16);
    const arcMat = new THREE.MeshBasicMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.85,
    });
    const arcSphere = new THREE.Mesh(arcGeo, arcMat);
    arcSphere.position.set(0, 0, 0.8);
    group.add(arcSphere);

    const arcLight = new THREE.PointLight(0x93c5fd, 2, 40);
    arcLight.position.set(0, 0, 2);
    group.add(arcLight);
  }, []);

  const buildGoldakSource = useCallback(() => {
    if (!goldakGroupRef.current) return;
    const group = goldakGroupRef.current;
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    const { a, b, cf, cr } = goldak;

    const frontGeo = new THREE.SphereGeometry(1, 16, 12, 0, Math.PI);
    frontGeo.scale(cf, a, b);
    frontGeo.rotateZ(Math.PI / 2);
    const frontMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      wireframe: true,
      transparent: true,
      opacity: 0.45,
    });
    const frontMesh = new THREE.Mesh(frontGeo, frontMat);
    frontMesh.position.set(0, 0, -b / 2);
    group.add(frontMesh);

    const rearGeo = new THREE.SphereGeometry(1, 16, 12, Math.PI, Math.PI);
    rearGeo.scale(cr, a, b);
    rearGeo.rotateZ(Math.PI / 2);
    const rearMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.45,
    });
    const rearMesh = new THREE.Mesh(rearGeo, rearMat);
    rearMesh.position.set(0, 0, -b / 2);
    group.add(rearMesh);
  }, [goldak]);

  // Initialize Scene once on mount
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc);
    sceneRef.current = scene;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
    camera.position.set(workpiece.length * 0.5, workpiece.width * 1.5, workpiece.length * 0.9);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(workpiece.length / 2, 0, 0);
    controls.update();
    controlsRef.current = controls;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
    dirLight.position.set(100, 200, 100);
    scene.add(dirLight);

    const wpGroup = new THREE.Group();
    scene.add(wpGroup);
    workpieceGroupRef.current = wpGroup;

    const torchGrp = new THREE.Group();
    scene.add(torchGrp);
    torchGroupRef.current = torchGrp;

    const goldakGrp = new THREE.Group();
    scene.add(goldakGrp);
    goldakGroupRef.current = goldakGrp;

    buildWorkpieceMeshes();
    buildTrajectoryLine();
    buildThermalFieldMesh();
    buildTorchModel();
    buildGoldakSource();

    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (controlsRef.current) {
        controlsRef.current.update();
      }
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0 && cameraRef.current && rendererRef.current) {
          cameraRef.current.aspect = w / h;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [
    buildWorkpieceMeshes,
    buildTrajectoryLine,
    buildThermalFieldMesh,
    buildTorchModel,
    buildGoldakSource,
    workpiece.length,
    workpiece.width,
  ]);

  // React to parameter changes
  useEffect(() => {
    buildWorkpieceMeshes();
    buildTrajectoryLine();
    buildThermalFieldMesh();
    buildGoldakSource();
  }, [
    buildWorkpieceMeshes,
    buildTrajectoryLine,
    buildThermalFieldMesh,
    buildGoldakSource,
  ]);

  // Update dynamic simulation elements every frame
  useEffect(() => {
    if (torchGroupRef.current) {
      const pos = results.torchPos;
      torchGroupRef.current.position.set(pos.x, pos.y, 0);
    }

    if (goldakGroupRef.current) {
      const pos = results.torchPos;
      goldakGroupRef.current.position.set(pos.x, pos.y, 0);
    }

    if (thermalMeshRef.current && showThermalField) {
      const geo = thermalMeshRef.current.geometry;
      const colorAttr = geo.getAttribute('color') as THREE.BufferAttribute;
      if (colorAttr) {
        const colors = colorAttr.array as Float32Array;
        const { nx, ny } = grid;
        const Tmelt = material.meltingPoint;
        const T0 = workpiece.initialTemp;

        for (let i = 0; i < nx; i++) {
          for (let j = 0; j < ny; j++) {
            const vertIdx = (j * nx + i) * 3;
            const gridIdx = (i * ny + j) * grid.nz + 0;
            const temp = grid.T[gridIdx] || T0;
            const col = getTemperatureColor(temp, Tmelt, T0);

            colors[vertIdx] = col.r / 255;
            colors[vertIdx + 1] = col.g / 255;
            colors[vertIdx + 2] = col.b / 255;
          }
        }
        colorAttr.needsUpdate = true;
      }
    }

    if (workpieceGroupRef.current) workpieceGroupRef.current.visible = showWorkpiece;
    if (thermalMeshRef.current) thermalMeshRef.current.visible = showThermalField;
    if (trajectoryLineRef.current) trajectoryLineRef.current.visible = showTrajectory;
    if (goldakGroupRef.current) goldakGroupRef.current.visible = showGoldakSource;
  }, [
    results.currentTime,
    results.torchPos,
    grid,
    material.meltingPoint,
    workpiece.initialTemp,
    showWorkpiece,
    showThermalField,
    showMeltZone,
    showTrajectory,
    showGoldakSource,
  ]);

  const handleResetCamera = () => {
    if (!cameraRef.current || !controlsRef.current) return;
    cameraRef.current.position.set(workpiece.length * 0.5, workpiece.width * 1.5, workpiece.length * 0.9);
    controlsRef.current.target.set(workpiece.length / 2, 0, 0);
    controlsRef.current.update();
  };

  return (
    <div className="relative w-full h-full min-h-[460px] flex flex-col bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-xl">
      <div ref={containerRef} className="w-full h-full flex-1 cursor-grab active:cursor-grabbing" />

      {/* Top Controls Overlay */}
      <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/80 shadow-md pointer-events-auto">
          <button
            onClick={handleResetCamera}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors cursor-pointer"
            title="Reset 3D camera to default isometric angle without restarting simulation"
          >
            <iconify-icon icon="solar:home-2-linear" width="14" height="14"></iconify-icon>
            Reset View
          </button>
          <span className="text-xs text-slate-400 pl-1">
            Drag to Rotate | Wheel to Zoom
          </span>
        </div>

        <div className="flex items-center gap-3 bg-slate-900/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-700/80 shadow-md text-xs text-slate-300 pointer-events-auto">
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors">
            <input
              type="checkbox"
              checked={showWorkpiece}
              onChange={(e) => setShowWorkpiece(e.target.checked)}
              className="accent-indigo-500 rounded cursor-pointer"
            />
            Workpiece
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors">
            <input
              type="checkbox"
              checked={showThermalField}
              onChange={(e) => setShowThermalField(e.target.checked)}
              className="accent-indigo-500 rounded cursor-pointer"
            />
            Thermal Field
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors">
            <input
              type="checkbox"
              checked={showMeltZone}
              onChange={(e) => setShowMeltZone(e.target.checked)}
              className="accent-indigo-500 rounded cursor-pointer"
            />
            Melt Zone
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors">
            <input
              type="checkbox"
              checked={showTrajectory}
              onChange={(e) => setShowTrajectory(e.target.checked)}
              className="accent-indigo-500 rounded cursor-pointer"
            />
            Trajectory
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors">
            <input
              type="checkbox"
              checked={showGoldakSource}
              onChange={(e) => setShowGoldakSource(e.target.checked)}
              className="accent-indigo-500 rounded cursor-pointer"
            />
            Goldak Source
          </label>
        </div>
      </div>

      <div className="absolute bottom-3 left-3 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/80 text-xs text-slate-300 font-mono flex items-center gap-3 shadow-md">
        <span className="flex items-center gap-1 text-red-400">● +X (Travel: {workpiece.length} mm)</span>
        <span className="flex items-center gap-1 text-emerald-400">● ±Y (Width: {workpiece.width} mm)</span>
        <span className="flex items-center gap-1 text-indigo-400">● -Z (Depth: {workpiece.thickness} mm)</span>
      </div>
    </div>
  );
};
