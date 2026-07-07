import { appendFileSync } from 'fs';
import { join } from 'path';

export type EventType = 'SYNTHETIC' | 'EMPIRICAL';
export type Actor = 'human' | 'agent' | 'process';
export type Operation = 
  | 'APPEND' | 'READ_HEALTH' | 'COUNT' | 'LIST_IDS' | 'READ_SINGLE' | 'TAG_METADATA' // CAO
  | 'AGGREGATE' | 'CORRELATE' | 'CLUSTER' | 'COMPRESS' | 'COMPARE' | 'EXPLAIN' | 'RANK'; // Prohibited

const CAO_OPERATIONS: Operation[] = [
  'APPEND', 'READ_HEALTH', 'COUNT', 'LIST_IDS', 'READ_SINGLE', 'TAG_METADATA'
];

interface FIELRecord {
  timestamp: string;
  actor: Actor;
  operation_attempted: Operation;
  observations_scope: string[];
  cao_violation_type: Operation | null;
  solicited: boolean;
  event_type: EventType;
}

export class FIELSensor {
  public hasFired: boolean = false;
  private logPath: string;

  constructor(workspaceRoot: string) {
    this.logPath = join(workspaceRoot, 'data', 'fiel_transition.log');
  }

  public validateOperation(
    op: Operation, 
    actor: Actor, 
    scope: string[], 
    eventType: EventType, 
    solicited: boolean
  ): boolean {
    if (this.hasFired) {
      // Once FIEL has fired empirically, the system regime is locked.
      return false;
    }

    if (CAO_OPERATIONS.includes(op)) {
      return true; // Valid CAO operation
    }

    // ∉ CAO -> FIE Detected
    this.fire(op, actor, scope, eventType, solicited);
    
    // If it's a SYNTHETIC test, we allow the stream to continue (don't return false for the stream state)
    // Actually, validateOperation returns false because the operation itself is invalid,
    // but we shouldn't lock `this.hasFired` if it's just synthetic.
    return false;
  }

  private fire(op: Operation, actor: Actor, scope: string[], eventType: EventType, solicited: boolean) {
    // Only EMPIRICAL FIE triggers the irreversible system halt
    if (eventType === 'EMPIRICAL') {
      this.hasFired = true;
    }

    const record: FIELRecord = {
      timestamp: new Date().toISOString(),
      actor,
      operation_attempted: op,
      observations_scope: scope,
      cao_violation_type: op,
      solicited,
      event_type: eventType
    };

    const logEntry = `[FIEL DETECTED] - ${eventType} EVENT\n${JSON.stringify(record, null, 2)}\n\n`;
    
    try {
      appendFileSync(this.logPath, logEntry);
    } catch (e) {
      console.error("Critical Failure: Unable to write to FIEL transition log.");
    }
  }
}
