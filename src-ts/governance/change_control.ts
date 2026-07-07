import { ConstitutionalLimits } from "./constitutional_registry";

export type GovernanceRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ESCALATED';

export interface GovernanceChangeRequest {
    requestId: string;
    timestamp: number;
    component: string; // e.g. "risk_engine", "epistemic_layer"
    parameter: keyof ConstitutionalLimits; // The dogma being challenged
    oldValue: number | boolean;
    newValue: number | boolean;
    reason: string; // The epistemic justification
    evidenceHash?: string; // Reference to the empirical data justifying the change
    status: GovernanceRequestStatus;
    resolutionTimestamp?: number;
}

export class ChangeControl {
    /**
     * Creates a formal petition to change the Constitution.
     * Nenhuma mutação direta é permitida. Tudo deve passar por aqui.
     */
    public static draftPetition(
        component: string,
        parameter: keyof ConstitutionalLimits,
        oldValue: number | boolean,
        newValue: number | boolean,
        reason: string,
        evidenceHash?: string
    ): GovernanceChangeRequest {
        return {
            requestId: `GCR-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            timestamp: Date.now(),
            component,
            parameter,
            oldValue,
            newValue,
            reason,
            evidenceHash,
            status: 'PENDING'
        };
    }
}
