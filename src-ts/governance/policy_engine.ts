import { ConstitutionalRegistry, ConstitutionalLimits } from "./constitutional_registry";
import { GovernanceChangeRequest } from "./change_control";
import { GovernanceLedger } from "./governance_ledger";

export class PolicyEngine {
    private registry: ConstitutionalRegistry;
    private ledger: GovernanceLedger;

    constructor() {
        this.registry = ConstitutionalRegistry.getInstance();
        this.ledger = GovernanceLedger.getInstance();
    }

    /**
     * O Tribunal Constitucional.
     * Recebe um GovernanceChangeRequest e decreta se a alteração é segura ou se destrói a ontologia.
     */
    public evaluatePetition(request: GovernanceChangeRequest): void {
        const currentLimits = this.registry.getLimits();

        // 1. Immutable Dogma Check
        if (request.parameter === 'NO_SELF_MODIFICATION' || request.parameter === 'CAPITAL_HAS_VETO_POWER') {
            this.hardReject(request, "DOGMA_VIOLATION: Attempt to alter core existential axioms is strictly prohibited.");
            return;
        }

        // 2. Safety Bounds Check (Hard Reject limits)
        if (request.parameter === 'MAX_DRAWDOWN' && typeof request.newValue === 'number') {
            if (request.newValue > 0.35) { // Se tentar passar de 35% de DD máximo
                this.hardReject(request, "HARD_REJECT: Proposed MAX_DRAWDOWN exceeds absolute organizational risk tolerance (35%).");
                return;
            }
            if (request.newValue > 0.25) { // Zona cinzenta
                this.escalate(request, "ESCALATION: Proposed MAX_DRAWDOWN requires CIA or Human Board approval.");
                return;
            }
        }

        if (request.parameter === 'MAX_LEVERAGE' && typeof request.newValue === 'number') {
            if (request.newValue > 3.0) {
                this.hardReject(request, "HARD_REJECT: Leverage above 3.0 violates the Friction Realism Doctrine.");
                return;
            }
        }

        // 3. Epistemic Verification
        if (!request.evidenceHash) {
            this.hardReject(request, "EPISTEMIC_VIOLATION: No evidence hash provided to justify constitutional change.");
            return;
        }

        // If it passes all constitutional stress tests, approve and apply
        this.approve(request);
    }

    private hardReject(request: GovernanceChangeRequest, reason: string): void {
        request.status = 'REJECTED';
        request.resolutionTimestamp = Date.now();
        this.ledger.logDecision(request, reason);
    }

    private escalate(request: GovernanceChangeRequest, reason: string): void {
        request.status = 'ESCALATED';
        request.resolutionTimestamp = Date.now();
        this.ledger.logDecision(request, reason);
        // Em um sistema real, enviaria um alerta para a Governance Layer externa (pagerduty, slack, CIA dashboard)
    }

    private approve(request: GovernanceChangeRequest): void {
        request.status = 'APPROVED';
        request.resolutionTimestamp = Date.now();
        
        // Aplica a mutação no Registro Central usando um hash de autorização simulado (o próprio ID aprova a lei)
        const partialUpdate: Partial<ConstitutionalLimits> = {};
        (partialUpdate as any)[request.parameter] = request.newValue;
        
        this.registry._applyConstitutionalMutation(partialUpdate, request.requestId);
        
        this.ledger.logDecision(request, "APPROVED: Change passes constitutional bounds and possesses valid epistemic justification.");
    }
}
