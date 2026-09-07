export type MaterialType = 'carbon_steel' | 'stainless_304' | 'aluminum_6061' | 'custom';

export interface MaterialProperties {
  name: string;
  density: number; // kg/m³
  thermalConductivity: number; // W/m·K
  specificHeat: number; // J/kg·K
  meltingPoint: number; // °C
  isSteel: boolean;
}

export type WeldingProcess = 'GTAW' | 'GMAW' | 'SMAW';

export type GrooveType = 'square' | 'single_v' | 'double_v';

export type TrajectoryType = 'straight' | 'zigzag' | 'sinusoidal' | 'circular';

export interface WorkpieceConfig {
  length: number; // mm (e.g. 150)
  width: number; // mm (e.g. 80)
  thickness: number; // mm (e.g. 6.0)
  initialTemp: number; // °C (e.g. 25)
  ambientTemp: number; // °C (e.g. 25)
  convectionCoeff: number; // W/m²·K (e.g. 15.0)
  grooveType: GrooveType;
  grooveAngle: number; // degrees (e.g. 60)
  rootGap: number; // mm (e.g. 1.5)
  rootFace: number; // mm (e.g. 1.5)
}

export interface WeldingConfig {
  process: WeldingProcess;
  current: number; // A (e.g. 180.00)
  voltage: number; // V (e.g. 24.00)
  efficiency: number; // 0 to 1 (e.g. 0.80)
  travelSpeed: number; // mm/s (e.g. 5.00)
  trajectory: TrajectoryType;
  weaveAmplitude: number; // mm (e.g. 3.0)
  weaveFrequency: number; // Hz (e.g. 0.5)
}

export interface GoldakConfig {
  a: number; // semi-width (mm)
  b: number; // semi-depth (mm)
  cf: number; // front length (mm)
  cr: number; // rear length (mm)
  ff: number; // front heat fraction
  fr: number; // rear heat fraction (ff + fr = 2)
}

export interface ProbeConfig {
  x: number; // mm
  y: number; // mm
  z: number; // mm
}

export interface ProbeHistoryPoint {
  time: number;
  temp: number;
}

export interface ThermalGridData {
  nx: number;
  ny: number;
  nz: number;
  dx: number;
  dy: number;
  dz: number;
  T: Float32Array;
  getTempAt: (x_mm: number, y_mm: number, z_mm: number) => number;
}

export interface SimulationResults {
  currentTime: number;
  totalTime: number;
  torchPos: { x: number; y: number; z: number };
  peakTemp: number;
  maxMeltDepth: number;
  maxMeltWidth: number;
  currentProbeTemp: number;
  peakProbeTemp: number;
  probeHistory: ProbeHistoryPoint[];
  t85: number | null;
  arcPower: number; // W
  effectivePower: number; // W
  heatInputJmm: number; // J/mm
  heatInputKJmm: number; // kJ/mm
  penetrationRatio: number; // %
  thermalStatus: 'NO_MELTING' | 'PARTIAL_DEPTH' | 'FULL_THICKNESS';
  grid: ThermalGridData;
}
