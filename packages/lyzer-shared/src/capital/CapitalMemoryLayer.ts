import { eventBus } from '../lib/eventBus.js';
import { CapitalTrajectoryEvent } from '../types/governanceContracts.js';

export interface AllocationRecord {
  strategyId: string;
  amount: number;
  allocatedAt: number; // timestamp ms
  efficiency: number; // PnL generated / capital allocated
}

export interface TrajectoryPoint {
  timestamp: number;
  capitalAgeAvg: number; // average age of capital in ms
  capitalVelocity: number; // turnover speed (0 to 1)
  capitalConcentration: number; // HHI (0 to 1)
  capitalRetention: number; // 1 - velocity
  allocations: Record<string, number>;
}

export class CapitalMemoryLayer {
  private activeAllocations: Map<string, AllocationRecord> = new Map();
  private trajectoryHistory: TrajectoryPoint[] = [];
  private lastAllocationState: Record<string, number> = {};
  private totalMigrationCosts: number = 0;

  constructor() {
    this.setupListeners();
  }

  private setupListeners(): void {
    // Monitor allocation events on the event bus to passively update capital statistics
    eventBus.on('allocation:change', (data: any) => this.handleAllocationUpdate(data));
    eventBus.on('allocation:changed', (data: any) => this.handleAllocationUpdate(data));
    eventBus.on('thermodynamics:ratio', (data: any) => {
      if (data.allowed) {
        this.totalMigrationCosts += data.migrationCost || 0;
      }
    });
  }

  /**
   * Passive update of allocations. CML does not modify the execution flow.
   * @param data Allocation state data: { allocations: { [strategyId: string]: number }, efficiencies?: { [strategyId: string]: number } }
   */
  public handleAllocationUpdate(data: {
    allocations: Record<string, number>;
    efficiencies?: Record<string, number>;
  }): void {
    const timestamp = Date.now();
    const currentAllocations = data.allocations;
    const efficiencies = data.efficiencies ?? {};

    // 1. Update active allocation records (tracking Age and Efficiency)
    for (const [stratId, amount] of Object.entries(currentAllocations)) {
      if (amount > 0) {
        const existing = this.activeAllocations.get(stratId);
        if (existing && existing.amount > 0) {
          // Keep the original allocation time to track Age correctly, update amount
          this.activeAllocations.set(stratId, {
            strategyId: stratId,
            amount,
            allocatedAt: existing.allocatedAt,
            efficiency: efficiencies[stratId] ?? existing.efficiency
          });
        } else {
          // New allocation
          this.activeAllocations.set(stratId, {
            strategyId: stratId,
            amount,
            allocatedAt: timestamp,
            efficiency: efficiencies[stratId] ?? 0
          });
        }
      } else {
        this.activeAllocations.delete(stratId);
      }
    }

    // Remove strategies not in currentAllocations
    for (const stratId of this.activeAllocations.keys()) {
      if (!(stratId in currentAllocations)) {
        this.activeAllocations.delete(stratId);
      }
    }

    // 2. Compute Trajectory Metrics
    const trajectoryPoint = this.calculateMetrics(timestamp, currentAllocations);
    this.trajectoryHistory.push(trajectoryPoint);

    if (this.trajectoryHistory.length > 200) {
      this.trajectoryHistory.shift();
    }

    // Save current state as last state for next velocity check
    this.lastAllocationState = { ...currentAllocations };

    // Emit event-driven observational snapshot
    eventBus.emit('observational:trajectory_update', trajectoryPoint as CapitalTrajectoryEvent);
  }

  /**
   * Calculates metrics for the current trajectory point.
   */
  private calculateMetrics(timestamp: number, currentAllocations: Record<string, number>): TrajectoryPoint {
    const amounts = Object.values(currentAllocations);
    const totalCapital = amounts.reduce((sum, a) => sum + a, 0);

    // A. Capital Concentration: Herfindahl-Hirschman Index (HHI)
    let HHI = 0;
    if (totalCapital > 0) {
      HHI = amounts.reduce((sum, amount) => {
        const share = amount / totalCapital;
        return sum + share * share;
      }, 0);
    }
    HHI = Math.round(HHI * 10000) / 10000;

    // B. Capital Age (Average age of active capital allocations)
    let totalWeightedAge = 0;
    let allocatedTotal = 0;
    for (const record of this.activeAllocations.values()) {
      const age = timestamp - record.allocatedAt;
      totalWeightedAge += age * record.amount;
      allocatedTotal += record.amount;
    }
    const capitalAgeAvg = allocatedTotal > 0 ? Math.round(totalWeightedAge / allocatedTotal) : 0;

    // C. Capital Velocity (turnover rate compared to last state)
    let capitalVelocity = 0;
    const allStrategies = new Set([
      ...Object.keys(currentAllocations),
      ...Object.keys(this.lastAllocationState)
    ]);

    let sumAbsDiff = 0;
    let sumLastTotal = 0;
    for (const stratId of allStrategies) {
      const current = currentAllocations[stratId] ?? 0;
      const last = this.lastAllocationState[stratId] ?? 0;
      sumAbsDiff += Math.abs(current - last);
      sumLastTotal += last;
    }

    if (sumLastTotal > 0) {
      // Normalize velocity between 0 and 1
      capitalVelocity = sumAbsDiff / (2 * sumLastTotal);
    }
    capitalVelocity = Math.round(capitalVelocity * 10000) / 10000;

    // D. Capital Retention (fraction of capital retained)
    const capitalRetention = Math.round((1 - capitalVelocity) * 10000) / 10000;

    return {
      timestamp,
      capitalAgeAvg,
      capitalVelocity,
      capitalConcentration: HHI,
      capitalRetention,
      allocations: { ...currentAllocations }
    };
  }

  public getTrajectoryHistory(): TrajectoryPoint[] {
    return this.trajectoryHistory;
  }

  public getTotalMigrationCosts(): number {
    return this.totalMigrationCosts;
  }

  public getActiveAllocations(): AllocationRecord[] {
    return Array.from(this.activeAllocations.values());
  }
}
