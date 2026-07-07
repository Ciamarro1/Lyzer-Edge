/**
 * THE CONSTITUTION
 * 
 * Constitutional Registry (Tribunal 1)
 * 
 * The Single Source of Truth for limits and dogmatic rules of the ecosystem.
 * No component can define its own existential limits. Everything originates here.
 */

export interface ConstitutionalLimits {
    // Risk & Survival Dogmas
    MAX_DRAWDOWN: number; // e.g. 0.20 (20%)
    CAPITAL_HAS_VETO_POWER: boolean; // Capital Layer has final say over Intelligence Layer
    MAX_POSITION_SIZE: number;
    MAX_CLUSTER_EXPOSURE: number;
    MAX_LEVERAGE: number;
    MAX_DAILY_LOSS: number;

    // Epistemic Dogmas
    MAX_HYPOTHESIS_AGE_DAYS: number;
    NEGATIVE_KNOWLEDGE_CANNOT_BE_DELETED: boolean;

    // Governance Dogmas
    NO_SELF_MODIFICATION: boolean; // Subsystems cannot alter their own logic without Governance
    ALL_GOVERNANCE_CHANGES_REQUIRE_DELAY: boolean; // Changes cannot be instant (prevents flash-corruption)
}

export class ConstitutionalRegistry {
    private static instance: ConstitutionalRegistry;
    private currentLimits: ConstitutionalLimits;

    private constructor() {
        // Initial Genesis Constitution
        this.currentLimits = {
            MAX_DRAWDOWN: 0.20,
            CAPITAL_HAS_VETO_POWER: true,
            MAX_POSITION_SIZE: 0.03,
            MAX_CLUSTER_EXPOSURE: 0.10,
            MAX_LEVERAGE: 1.5,
            MAX_DAILY_LOSS: 0.02,
            
            MAX_HYPOTHESIS_AGE_DAYS: 180,
            NEGATIVE_KNOWLEDGE_CANNOT_BE_DELETED: true,
            
            NO_SELF_MODIFICATION: true,
            ALL_GOVERNANCE_CHANGES_REQUIRE_DELAY: true
        };
    }

    public static getInstance(): ConstitutionalRegistry {
        if (!ConstitutionalRegistry.instance) {
            ConstitutionalRegistry.instance = new ConstitutionalRegistry();
        }
        return ConstitutionalRegistry.instance;
    }

    /**
     * Reads the current constitutional limits. 
     * Read-only. Capital Layer and Validation query this.
     */
    public getLimits(): Readonly<ConstitutionalLimits> {
        return Object.freeze({ ...this.currentLimits });
    }

    /**
     * DANGEROUS: Only the Policy Engine can call this after a formal GovernanceChangeRequest is approved.
     */
    public _applyConstitutionalMutation(newLimits: Partial<ConstitutionalLimits>, authorizationHash: string): void {
        if (!authorizationHash || authorizationHash === "") {
            throw new Error("CONSTITUTIONAL VIOLATION: Mutation attempted without Governance Authorization Hash.");
        }
        
        this.currentLimits = {
            ...this.currentLimits,
            ...newLimits
        };
    }
}
