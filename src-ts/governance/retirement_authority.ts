import { GovernanceLedger } from "./governance_ledger";

export type EntityStatus = 'ACTIVE' | 'MONITOR' | 'DEPRECATED' | 'RETIRED';

export interface GovernanceEntity {
    id: string;
    type: 'FEATURE' | 'HYPOTHESIS' | 'REGIME' | 'METRIC' | 'RULE';
    status: EntityStatus;
    lastStateChange: number;
    epistemicConfidence: number; // 0.0 to 1.0. If it drops below threshold, Epistemology recommends retirement.
}

export class RetirementAuthority {
    private ledger: GovernanceLedger;
    private entityRegistry: Map<string, GovernanceEntity> = new Map();

    constructor() {
        this.ledger = GovernanceLedger.getInstance();
    }

    public registerEntity(entity: GovernanceEntity): void {
        this.entityRegistry.set(entity.id, entity);
    }

    public getEntityStatus(id: string): EntityStatus | undefined {
        return this.entityRegistry.get(id)?.status;
    }

    /**
     * Epistemology Layer cannot kill directly. It "recommends".
     * Governance decides.
     */
    public processEpistemicRecommendation(entityId: string, recommendation: 'DEPRECATE' | 'RETIRE', evidenceHash: string): void {
        const entity = this.entityRegistry.get(entityId);
        if (!entity) return;

        // The Guillotine Logic
        if (recommendation === 'RETIRE' && entity.status === 'DEPRECATED') {
            this.executeCondemnation(entity, evidenceHash);
        } else if (recommendation === 'DEPRECATE' && (entity.status === 'ACTIVE' || entity.status === 'MONITOR')) {
            this.deprecate(entity, evidenceHash);
        } else if (recommendation === 'RETIRE' && entity.status === 'ACTIVE') {
            // Cannot straight retire an active feature unless there is a catastrophic failure (e.g. integer overflow, hard crash)
            // It must pass through DEPRECATED first to allow Capital Layer to unroll positions safely.
            console.warn(`[RETIREMENT_AUTHORITY] Attempt to straight-retire active entity ${entityId}. Forcing DEPRECATION first.`);
            this.deprecate(entity, evidenceHash);
        }
    }

    private deprecate(entity: GovernanceEntity, evidenceHash: string): void {
        entity.status = 'DEPRECATED';
        entity.lastStateChange = Date.now();
        // Log to ledger implicitly as a governance action
        console.log(`[RETIREMENT_AUTHORITY] Entity ${entity.id} (${entity.type}) marked as DEPRECATED. Evidence: ${evidenceHash}`);
    }

    private executeCondemnation(entity: GovernanceEntity, evidenceHash: string): void {
        entity.status = 'RETIRED';
        entity.lastStateChange = Date.now();
        
        // Emite o decreto supremo. A Discovery Layer não pode mais gerar isso.
        console.log(`[RETIREMENT_AUTHORITY] 💀 SUPREME DECREE: Entity ${entity.id} (${entity.type}) is permanently RETIRED. Evidence: ${evidenceHash}`);
    }
}
