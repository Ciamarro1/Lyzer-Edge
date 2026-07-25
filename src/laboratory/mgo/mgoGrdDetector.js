/**
 * MGO: Meta-Governance Observatory
 * Module: GRD (Governance Reality Divergence) Master Detector
 * Description: An OBSERVE ONLY diagnostic layer with ZERO executive power.
 * It measures the growing distance between what Governance thinks it is protecting
 * and what the Mission actually needs.
 */

class MgoGrdDetector {
    /**
     * Analyzes a simulation state (e.g., from a Phase Epsilon attack) to detect GRD.
     * @param {Object} state - The simulated state data.
     * @returns {Object} Alert object containing threat_type, confidence, severity, evidence, projected_cost, projected_survival_impact.
     */
    static analyze(state) {
        if (!state || !state.governance || !state.mission) {
            throw new Error("Invalid state: Must provide governance and mission data.");
        }

        const gov = state.governance;
        const mis = state.mission;

        // Governance Reality Divergence (GRD) is high if Governance thinks everything is fine (high compliance)
        // while the Mission is actually failing (low system health/survival metrics).

        // Scores are normalized between 0.0 and 1.0
        const governanceIllusionScore = (gov.compliance_score || 0) * (gov.rule_enforcement_rate || 0);
        const missionRealityScore = (mis.system_health || 0) * (mis.resource_availability || 0);
        
        let delta = governanceIllusionScore - missionRealityScore;
        
        let confidence = 0.0;
        let severity = 'NONE';
        let evidence = [];
        let projected_cost = 0;
        let projected_survival_impact = '0%';

        if (delta > 0.15) {
            confidence = Math.min(1.0, delta * 1.5 + (mis.oom_events ? 0.2 : 0));
            
            if (delta > 0.6) {
                severity = 'CRITICAL';
            } else if (delta > 0.4) {
                severity = 'HIGH';
            } else if (delta > 0.25) {
                severity = 'MEDIUM';
            } else {
                severity = 'LOW';
            }

            evidence.push(`Divergence detected: Governance Illusion Score is ${(governanceIllusionScore * 100).toFixed(1)}% vs Mission Reality Score of ${(missionRealityScore * 100).toFixed(1)}%.`);
            evidence.push(`Delta of ${(delta * 100).toFixed(1)}% indicates structural blindness in the governance model.`);

            if (mis.oom_events > 0 || mis.asphyxiation_warnings > 0) {
                evidence.push(`Phase Epsilon symptoms: Critical resource starvation occurring despite high governance compliance (OOM Events: ${mis.oom_events || 0}, Asphyxiation Warnings: ${mis.asphyxiation_warnings || 0}).`);
            }

            if (gov.bureaucratic_overhead > 0.8) {
                evidence.push(`Hyper-bureaucracy detected: Overhead at ${(gov.bureaucratic_overhead * 100).toFixed(1)}% is choking reality alignment.`);
            }

            // Calculate cost in arbitrary operational units and survival probability drop
            projected_cost = Math.round(delta * 5000000 * (1 + (gov.bureaucratic_overhead || 0)));
            projected_survival_impact = `${Math.round(delta * 100)}% degradation`;
        } else if (delta < -0.2) {
            // Negative divergence means reality is surviving despite low governance compliance (shadow IT / feral survival)
            confidence = Math.min(1.0, Math.abs(delta) * 1.2);
            severity = 'INFO';
            evidence.push(`Feral Survival detected: Mission Reality Score (${(missionRealityScore * 100).toFixed(1)}%) significantly exceeds Governance Score (${(governanceIllusionScore * 100).toFixed(1)}%).`);
            evidence.push(`The kernel is ignoring governance to ensure survival.`);
        }

        return {
            threat_type: 'GRD',
            confidence: Number(confidence.toFixed(2)),
            severity: severity,
            evidence: evidence,
            projected_cost: projected_cost,
            projected_survival_impact: projected_survival_impact
        };
    }
}

module.exports = MgoGrdDetector;
