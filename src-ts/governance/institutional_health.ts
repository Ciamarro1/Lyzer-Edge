export interface MetaKnowledgeMetrics {
    hypothesisSurvivalRate: number; // % of hypotheses that survive validation
    validationKillRate: number; // % of hypotheses killed by validation
    capitalVetoRate: number; // % of decisions vetoed by capital layer
    featureDriftRate: number; // Rate at which features decay and require re-parameterization
    knowledgeRetirementRate: number; // Rate at which epistemic layer retires knowledge
}

export class InstitutionalHealth {
    /**
     * Componente mais importante da Governance Layer.
     * Mede: "A organização está ficando mais inteligente ou apenas mais complexa?"
     */
    
    private metrics: MetaKnowledgeMetrics;

    constructor() {
        this.metrics = {
            hypothesisSurvivalRate: 0.0,
            validationKillRate: 1.0, // Initial state: First Blood killed 100%
            capitalVetoRate: 0.0,
            featureDriftRate: 0.0,
            knowledgeRetirementRate: 0.0
        };
    }

    public updateMetrics(newMetrics: Partial<MetaKnowledgeMetrics>): void {
        this.metrics = {
            ...this.metrics,
            ...newMetrics
        };
    }

    public getHealthSnapshot(): Readonly<MetaKnowledgeMetrics> {
        return Object.freeze({ ...this.metrics });
    }

    public evaluateDriftRisk(): string {
        if (this.metrics.knowledgeRetirementRate > 0.5) {
            return "CRITICAL: The system is retiring knowledge faster than it discovers it. High Epistemic Drift.";
        }
        
        if (this.metrics.validationKillRate < 0.1) {
            return "WARNING: Validation is approving 90%+ of hypotheses. Suspected Metric Worship or Validation Degradation.";
        }

        if (this.metrics.capitalVetoRate > 0.8) {
            return "WARNING: Capital Layer is vetoing 80%+ of Cortex intentions. Intelligence is decoupled from Survival parameters.";
        }

        return "HEALTHY: The organism is learning and surviving effectively.";
    }
}
