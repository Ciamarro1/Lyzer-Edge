import { GovernanceChangeRequest } from "./change_control";

export interface LedgerEntry {
    sequenceId: number;
    timestamp: number;
    request: GovernanceChangeRequest;
    resolution: string; // Detail on why it was approved or rejected
}

export class GovernanceLedger {
    private static instance: GovernanceLedger;
    private entries: LedgerEntry[] = [];
    private sequenceCounter: number = 0;

    private constructor() {}

    public static getInstance(): GovernanceLedger {
        if (!GovernanceLedger.instance) {
            GovernanceLedger.instance = new GovernanceLedger();
        }
        return GovernanceLedger.instance;
    }

    /**
     * Memória institucional permanente.
     * Toda mudança constitucional deve ser rastreável.
     */
    public logDecision(request: GovernanceChangeRequest, resolution: string): void {
        this.sequenceCounter++;
        const entry: LedgerEntry = {
            sequenceId: this.sequenceCounter,
            timestamp: Date.now(),
            request: { ...request },
            resolution
        };
        this.entries.push(entry);
        
        // In a real environment, this appends to an immutable data store (e.g., blockchain, WORM drive, cryptographically signed log)
        console.log(`[GOVERNANCE LEDGER] Entry ${entry.sequenceId} | Component: ${request.component} | Parameter: ${request.parameter} | Status: ${request.status}`);
    }

    public getAuditTrail(): ReadonlyArray<LedgerEntry> {
        return Object.freeze([...this.entries]);
    }
}
