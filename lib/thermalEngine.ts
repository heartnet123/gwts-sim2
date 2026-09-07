import {
  GoldakConfig,
  MaterialProperties,
  ProbeConfig,
  ProbeHistoryPoint,
  SimulationResults,
  TrajectoryType,
  WeldingConfig,
  WorkpieceConfig,
} from './types';

export class ThermalGrid3D {
  nx: number = 75;
  ny: number = 41;
  nz: number = 11;
  dx: number = 0; // mm
  dy: number = 0; // mm
  dz: number = 0; // mm
  T: Float32Array;
  T_next: Float32Array;
  workpiece: WorkpieceConfig;
  material: MaterialProperties;

  constructor(workpiece: WorkpieceConfig, material: MaterialProperties) {
    this.workpiece = workpiece;
    this.material = material;
    this.dx = workpiece.length / (this.nx - 1);
    this.dy = workpiece.width / (this.ny - 1);
    this.dz = workpiece.thickness / (this.nz - 1);

    const size = this.nx * this.ny * this.nz;
    this.T = new Float32Array(size);
    this.T_next = new Float32Array(size);
    this.resetToAmbient();
  }

  resetToAmbient() {
    const t0 = this.workpiece.initialTemp;
    for (let i = 0; i < this.T.length; i++) {
      this.T[i] = t0;
      this.T_next[i] = t0;
    }
  }

  getIndex(i: number, j: number, k: number): number {
    return (i * this.ny + j) * this.nz + k;
  }

  getTempAt(x: number, y: number, z: number): number {
    // x in [0, length], y in [-width/2, width/2], z in [0, thickness]
    const clampedX = Math.max(0, Math.min(this.workpiece.length, x));
    const clampedY = Math.max(-this.workpiece.width / 2, Math.min(this.workpiece.width / 2, y));
    const clampedZ = Math.max(0, Math.min(this.workpiece.thickness, z));

    const fi = clampedX / this.dx;
    const fj = (clampedY + this.workpiece.width / 2) / this.dy;
    const fk = clampedZ / this.dz;

    const i0 = Math.floor(fi);
    const j0 = Math.floor(fj);
    const k0 = Math.floor(fk);

    const i1 = Math.min(this.nx - 1, i0 + 1);
    const j1 = Math.min(this.ny - 1, j0 + 1);
    const k1 = Math.min(this.nz - 1, k0 + 1);

    const wx = fi - i0;
    const wy = fj - j0;
    const wz = fk - k0;

    const c000 = this.T[this.getIndex(i0, j0, k0)];
    const c100 = this.T[this.getIndex(i1, j0, k0)];
    const c010 = this.T[this.getIndex(i0, j1, k0)];
    const c110 = this.T[this.getIndex(i1, j1, k0)];
    const c001 = this.T[this.getIndex(i0, j0, k1)];
    const c101 = this.T[this.getIndex(i1, j0, k1)];
    const c011 = this.T[this.getIndex(i0, j1, k1)];
    const c111 = this.T[this.getIndex(i1, j1, k1)];

    const c00 = c000 * (1 - wx) + c100 * wx;
    const c10 = c010 * (1 - wx) + c110 * wx;
    const c01 = c001 * (1 - wx) + c101 * wx;
    const c11 = c011 * (1 - wx) + c111 * wx;

    const c0 = c00 * (1 - wy) + c10 * wy;
    const c1 = c01 * (1 - wy) + c11 * wy;

    return c0 * (1 - wz) + c1 * wz;
  }
}

export function getTorchTrajectoryPosition(
  t: number,
  welding: WeldingConfig,
  workpiece: WorkpieceConfig
): { x: number; y: number; z: number } {
  const startX = 10; // offset mm
  const v = Math.max(0.1, welding.travelSpeed);
  const A = welding.weaveAmplitude;
  const f = welding.weaveFrequency;

  let x = startX + v * t;
  let y = 0;

  switch (welding.trajectory) {
    case 'straight':
      y = 0;
      break;
    case 'sinusoidal':
      y = A * Math.sin(2 * Math.PI * f * t);
      break;
    case 'zigzag': {
      // Periodic triangular wave with amplitude A
      const period = f > 0 ? 1 / f : 2;
      const phase = (t % period) / period;
      if (phase < 0.25) {
        y = A * (4 * phase);
      } else if (phase < 0.75) {
        y = A * (2 - 4 * phase);
      } else {
        y = A * (4 * phase - 4);
      }
      break;
    }
    case 'circular': {
      // Circular / trochoidal oscillation
      x = startX + v * t + A * Math.cos(2 * Math.PI * f * t);
      y = A * Math.sin(2 * Math.PI * f * t);
      break;
    }
  }

  return { x, y, z: 0 };
}

export class ThermalSimulation {
  workpiece: WorkpieceConfig;
  material: MaterialProperties;
  welding: WeldingConfig;
  goldak: GoldakConfig;
  probe: ProbeConfig;
  grid: ThermalGrid3D;

  currentTime: number = 0;
  totalTime: number = 0;
  isRunning: boolean = false;
  isPaused: boolean = false;
  peakTemp: number = 25;
  peakProbeTemp: number = 25;
  probeHistory: ProbeHistoryPoint[] = [];

  constructor(
    workpiece: WorkpieceConfig,
    material: MaterialProperties,
    welding: WeldingConfig,
    goldak: GoldakConfig,
    probe: ProbeConfig
  ) {
    this.workpiece = workpiece;
    this.material = material;
    this.welding = welding;
    this.goldak = goldak;
    this.probe = probe;
    this.grid = new ThermalGrid3D(workpiece, material);
    this.peakTemp = workpiece.initialTemp;
    this.peakProbeTemp = workpiece.initialTemp;
    this.totalTime = Math.max(1, (workpiece.length - 20) / Math.max(0.1, welding.travelSpeed) + 3);
  }

  reset() {
    this.currentTime = 0;
    this.isRunning = false;
    this.isPaused = false;
    this.grid.resetToAmbient();
    this.peakTemp = this.workpiece.initialTemp;
    this.peakProbeTemp = this.workpiece.initialTemp;
    this.probeHistory = [{ time: 0, temp: this.workpiece.initialTemp }];
  }

  step(dtFrame: number) {
    if (this.isPaused || !this.isRunning) return;

    const rho = this.material.density; // kg/m³
    const cp = this.material.specificHeat; // J/kg·K
    const kTh = this.material.thermalConductivity; // W/m·K
    const alpha = kTh / (rho * cp); // m²/s

    // Convert grid spacings to meters
    const dx_m = this.grid.dx * 1e-3;
    const dy_m = this.grid.dy * 1e-3;
    const dz_m = this.grid.dz * 1e-3;

    // Stability limit for explicit 3D heat conduction:
    // dt <= 1 / (2 * alpha * (1/dx^2 + 1/dy^2 + 1/dz^2))
    const denom = 2 * alpha * (1 / (dx_m * dx_m) + 1 / (dy_m * dy_m) + 1 / (dz_m * dz_m));
    const dtCrit = denom > 0 ? 0.40 / denom : 0.01;
    const dtStep = Math.min(0.012, Math.max(0.001, dtCrit));
    const numSubSteps = Math.min(40, Math.max(1, Math.ceil(dtFrame / dtStep)));
    const dtActual = dtFrame / numSubSteps;

    // Heat power Q = eta * V * I
    const effectivePower = this.welding.efficiency * this.welding.voltage * this.welding.current;

    // Goldak semi-axes in meters
    const a_m = Math.max(0.5, this.goldak.a) * 1e-3;
    const b_m = Math.max(0.5, this.goldak.b) * 1e-3;
    const cf_m = Math.max(0.5, this.goldak.cf) * 1e-3;
    const cr_m = Math.max(0.5, this.goldak.cr) * 1e-3;

    // Fractions
    let ff = this.goldak.ff;
    let fr = this.goldak.fr;
    if (Math.abs(ff + fr - 2.0) > 0.001) {
      const sum = ff + fr > 0 ? ff + fr : 2;
      ff = (ff / sum) * 2;
      fr = (fr / sum) * 2;
    }

    const factorFront = (6 * Math.sqrt(3) * ff * effectivePower) / (a_m * b_m * cf_m * Math.PI * Math.sqrt(Math.PI));
    const factorRear = (6 * Math.sqrt(3) * fr * effectivePower) / (a_m * b_m * cr_m * Math.PI * Math.sqrt(Math.PI));

    const T_amb = this.workpiece.ambientTemp;
    const h = this.workpiece.convectionCoeff; // W/m²·K
    const convLossRate = h / (rho * cp * dz_m);

    const nx = this.grid.nx;
    const ny = this.grid.ny;
    const nz = this.grid.nz;
    const dx2 = dx_m * dx_m;
    const dy2 = dy_m * dy_m;
    const dz2 = dz_m * dz_m;

    for (let step = 0; step < numSubSteps; step++) {
      const t = this.currentTime + step * dtActual;
      const torchPos = getTorchTrajectoryPosition(t, this.welding, this.workpiece);
      const isTorchActive = torchPos.x <= this.workpiece.length - 2;

      // Swap buffers
      const T = this.grid.T;
      const T_next = this.grid.T_next;

      // Torch bounding box in grid coordinates
      const xTorch_mm = torchPos.x;
      const yTorch_mm = torchPos.y;

      for (let i = 0; i < nx; i++) {
        const x_mm = i * this.grid.dx;
        const xi_m = (x_mm - xTorch_mm) * 1e-3;

        // Skip distant nodes along X if too far from torch for efficiency
        const isNearTorchX = Math.abs(x_mm - xTorch_mm) < Math.max(30, this.goldak.cr * 3.5);

        for (let j = 0; j < ny; j++) {
          const y_mm = -this.workpiece.width / 2 + j * this.grid.dy;
          const eta_m = (y_mm - yTorch_mm) * 1e-3;

          for (let k = 0; k < nz; k++) {
            const idx = (i * ny + j) * nz + k;
            const T_val = T[idx];

            // 3D Conduction Laplacian with boundary insulation (Neumann dtdn=0)
            const Tx_prev = i > 0 ? T[((i - 1) * ny + j) * nz + k] : T_val;
            const Tx_next = i < nx - 1 ? T[((i + 1) * ny + j) * nz + k] : T_val;

            const Ty_prev = j > 0 ? T[(i * ny + (j - 1)) * nz + k] : T_val;
            const Ty_next = j < ny - 1 ? T[(i * ny + (j + 1)) * nz + k] : T_val;

            const Tz_prev = k > 0 ? T[(i * ny + j) * nz + (k - 1)] : T_val;
            const Tz_next = k < nz - 1 ? T[(i * ny + j) * nz + (k + 1)] : T_val;

            const d2Tdx2 = (Tx_prev - 2 * T_val + Tx_next) / dx2;
            const d2Tdy2 = (Ty_prev - 2 * T_val + Ty_next) / dy2;
            const d2Tdz2 = (Tz_prev - 2 * T_val + Tz_next) / dz2;

            let laplacian = alpha * (d2Tdx2 + d2Tdy2 + d2Tdz2);

            // Goldak Volumetric Heat Source q
            let q_vol = 0;
            if (isTorchActive && isNearTorchX) {
              const z_mm = k * this.grid.dz;
              const zeta_m = z_mm * 1e-3;

              const argY = (3 * eta_m * eta_m) / (a_m * a_m);
              const argZ = (3 * zeta_m * zeta_m) / (b_m * b_m);

              if (argY < 12 && argZ < 12) {
                if (xi_m >= 0) {
                  const argX = (3 * xi_m * xi_m) / (cf_m * cf_m);
                  if (argX < 12) {
                    q_vol = factorFront * Math.exp(-(argX + argY + argZ));
                  }
                } else {
                  const argX = (3 * xi_m * xi_m) / (cr_m * cr_m);
                  if (argX < 12) {
                    q_vol = factorRear * Math.exp(-(argX + argY + argZ));
                  }
                }
              }
            }

            // Surface convection
            let conv = 0;
            if (k === 0 || k === nz - 1) {
              conv = convLossRate * (T_val - T_amb);
            }

            const dTdt = laplacian + q_vol / (rho * cp) - conv;
            let nextT = T_val + dTdt * dtActual;

            // Protection against NaN / Inf
            if (!Number.isFinite(nextT) || isNaN(nextT)) {
              nextT = T_amb;
            } else if (nextT < T_amb) {
              nextT = T_amb;
            } else if (nextT > 3800) {
              nextT = 3800;
            }

            T_next[idx] = nextT;
          }
        }
      }

      // Copy back T_next to T
      this.grid.T.set(this.grid.T_next);
    }

    this.currentTime += dtFrame;

    // Check peak temperature
    let maxT = this.workpiece.initialTemp;
    for (let idx = 0; idx < this.grid.T.length; idx++) {
      if (this.grid.T[idx] > maxT) {
        maxT = this.grid.T[idx];
      }
    }
    if (maxT > this.peakTemp) {
      this.peakTemp = maxT;
    }

    // Sample probe temperature
    const curProbeTemp = this.grid.getTempAt(this.probe.x, this.probe.y, this.probe.z);
    if (curProbeTemp > this.peakProbeTemp) {
      this.peakProbeTemp = curProbeTemp;
    }

    // Append probe history at regular intervals
    const lastPoint = this.probeHistory[this.probeHistory.length - 1];
    if (!lastPoint || this.currentTime - lastPoint.time >= 0.1) {
      this.probeHistory.push({
        time: parseFloat(this.currentTime.toFixed(2)),
        temp: parseFloat(curProbeTemp.toFixed(1)),
      });
      if (this.probeHistory.length > 500) {
        this.probeHistory.splice(0, 50);
      }
    }

    // Stop if torch exceeds plate length + cooling buffer
    if (this.currentTime >= this.totalTime) {
      this.isPaused = true;
    }
  }

  calculateResults(): SimulationResults {
    const torchPos = getTorchTrajectoryPosition(this.currentTime, this.welding, this.workpiece);
    const arcPower = this.welding.voltage * this.welding.current;
    const effectivePower = this.welding.efficiency * arcPower;
    const v = Math.max(0.1, this.welding.travelSpeed);
    const heatInputJmm = effectivePower / v;
    const heatInputKJmm = heatInputJmm / 1000;

    // Calculate predicted melt depth and molten width
    const Tmelt = this.material.meltingPoint;
    let maxMeltDepth = 0;
    let maxMoltenWidth = 0;
    let touchesBottom = false;

    const nx = this.grid.nx;
    const ny = this.grid.ny;
    const nz = this.grid.nz;
    const dz = this.grid.dz;
    const dy = this.grid.dy;

    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < ny; j++) {
        for (let k = 0; k < nz; k++) {
          const idx = (i * ny + j) * nz + k;
          const temp = this.grid.T[idx];
          if (temp >= Tmelt) {
            const depth = k * dz;
            if (depth > maxMeltDepth) {
              maxMeltDepth = depth;
            }
            if (k === nz - 1) {
              touchesBottom = true;
            }
            const y_mm = Math.abs(-this.workpiece.width / 2 + j * dy);
            const width = y_mm * 2;
            if (width > maxMoltenWidth) {
              maxMoltenWidth = width;
            }
          }
        }
      }
    }

    const thickness = this.workpiece.thickness;
    const penetrationRatio = Math.min(100, (maxMeltDepth / thickness) * 100);

    let thermalStatus: 'NO_MELTING' | 'PARTIAL_DEPTH' | 'FULL_THICKNESS' = 'NO_MELTING';
    if (this.peakTemp >= Tmelt) {
      if (maxMeltDepth >= thickness * 0.98 || touchesBottom) {
        thermalStatus = 'FULL_THICKNESS';
      } else {
        thermalStatus = 'PARTIAL_DEPTH';
      }
    }

    // Calculate t8/5 cooling time for steel
    const t85 = this.calculateT85();

    const currentProbeTemp = this.grid.getTempAt(this.probe.x, this.probe.y, this.probe.z);

    return {
      currentTime: this.currentTime,
      totalTime: this.totalTime,
      torchPos,
      peakTemp: this.peakTemp,
      maxMeltDepth,
      maxMeltWidth: maxMoltenWidth,
      currentProbeTemp,
      peakProbeTemp: this.peakProbeTemp,
      probeHistory: [...this.probeHistory],
      t85,
      arcPower,
      effectivePower,
      heatInputJmm,
      heatInputKJmm,
      penetrationRatio,
      thermalStatus,
      grid: this.grid,
    };
  }

  calculateT85(): number | null {
    if (!this.material.isSteel) return null;
    if (this.peakProbeTemp < 800) return null;

    // Find the peak index
    let peakIndex = 0;
    let maxTemp = 0;
    for (let i = 0; i < this.probeHistory.length; i++) {
      if (this.probeHistory[i].temp > maxTemp) {
        maxTemp = this.probeHistory[i].temp;
        peakIndex = i;
      }
    }

    if (maxTemp < 800) return null;

    // After peak, find when it cools through 800°C
    let t800: number | null = null;
    let t500: number | null = null;

    for (let i = peakIndex; i < this.probeHistory.length - 1; i++) {
      const p1 = this.probeHistory[i];
      const p2 = this.probeHistory[i + 1];

      // Cooling through 800
      if (t800 === null && p1.temp >= 800 && p2.temp <= 800) {
        const frac = (800 - p1.temp) / (p2.temp - p1.temp || 1e-4);
        t800 = p1.time + frac * (p2.time - p1.time);
      }

      // Cooling through 500 (must be after 800)
      if (t800 !== null && t500 === null && p1.temp >= 500 && p2.temp <= 500) {
        const frac = (500 - p1.temp) / (p2.temp - p1.temp || 1e-4);
        t500 = p1.time + frac * (p2.time - p1.time);
        break;
      }
    }

    if (t800 !== null && t500 !== null && t500 > t800) {
      return parseFloat((t500 - t800).toFixed(2));
    }

    return null;
  }
}

// Colormap utility for temperature field:
// Cold (ambient) -> Gray (#64748b)
// Warm (300°C) -> Yellow (#eab308)
// Hot (750°C) -> Orange (#f97316)
// Very Hot (1200°C) -> Red (#ef4444)
// Molten (T >= Tmelt) -> Bright White/Yellow (#ffffff)
export function getTemperatureColor(temp: number, Tmelt: number, T0: number = 25): { r: number; g: number; b: number; hex: string } {
  const norm = Math.max(0, Math.min(1.2, (temp - T0) / Math.max(1, Tmelt - T0)));

  let r = 100, g = 116, b = 139; // Cold gray #64748b

  if (norm < 0.25) {
    // Gray to Slate-Yellow
    const f = norm / 0.25;
    r = Math.round(100 + f * (200 - 100));
    g = Math.round(116 + f * (190 - 116));
    b = Math.round(139 + f * (60 - 139));
  } else if (norm < 0.55) {
    // Yellow to Orange
    const f = (norm - 0.25) / 0.3;
    r = Math.round(234 + f * (249 - 234));
    g = Math.round(179 + f * (115 - 179));
    b = Math.round(8 + f * (22 - 8));
  } else if (norm < 0.95) {
    // Orange to Intense Red
    const f = (norm - 0.55) / 0.4;
    r = Math.round(249 + f * (239 - 249));
    g = Math.round(115 - f * (115 - 40));
    b = Math.round(22 - f * (22 - 40));
  } else if (norm < 1.05) {
    // Red to Molten White-Yellow
    const f = (norm - 0.95) / 0.1;
    r = 255;
    g = Math.round(50 + f * 205);
    b = Math.round(50 + f * 205);
  } else {
    // Super-molten (White)
    r = 255;
    g = 255;
    b = 255;
  }

  const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
  return {
    r,
    g,
    b,
    hex: `#${toHex(r)}${toHex(g)}${toHex(b)}`,
  };
}
