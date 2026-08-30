import fs from 'fs';
import path from 'path';

export class ResearchGovernor {
    constructor(ledgerPath) {
        this.ledgerPath = ledgerPath;
        this.ledger = this._loadLedger();
    }

    _loadLedger() {
        if (fs.existsSync(this.ledgerPath)) {
            const data = JSON.parse(fs.readFileSync(this.ledgerPath, 'utf8'));
            if (!data.experiments) {
                data.experiments = [];
            }
            return data;
        }
        return { totalHypothesesExplored: 0, families: [], experiments: [] };
    }

    _saveLedger() {
        fs.writeFileSync(this.ledgerPath, JSON.stringify(this.ledger, null, 2));
    }

    /**
     * @param {Object} proposal
     * @returns {Object} validation result
     */
    preRegister(proposal) {
        // Enforce rules: cannot re-test without explicitly stating it
        const existing = this.ledger.experiments.find(e => 
            e.hypothesis_id === proposal.hypothesis_id && 
            e.dataset === proposal.dataset &&
            e.status === 'REJECTED'
        );

        if (existing && !proposal.is_reopened) {
            return {
                approved: false,
                reason: `Hypothesis ${proposal.hypothesis_id} was previously rejected on this dataset. You must declare REOPENED_HYPOTHESIS with justification.`
            };
        }

        const experimentRecord = {
            experiment_id: `EXP_${Date.now()}`,
            hypothesis_id: proposal.hypothesis_id,
            family: proposal.family,
            features_tested: proposal.features_tested,
            date: new Date().toISOString(),
            dataset: proposal.dataset,
            status: "PRE_REGISTERED",
            oos_usage: proposal.oos_usage || false,
            p_value: null,
            correction: "Bonferroni",
            degrees_of_freedom_consumed: proposal.features_tested.length * proposal.horizons.length
        };

        this.ledger.experiments.push(experimentRecord);
        this.totalDegreesOfFreedom = this.ledger.experiments.reduce((acc, curr) => acc + (curr.degrees_of_freedom_consumed || 0), 0);
        
        this._saveLedger();
        
        return {
            approved: true,
            experiment: experimentRecord,
            global_dof: this.totalDegreesOfFreedom
        };
    }

    recordResult(experimentId, result) {
        const idx = this.ledger.experiments.findIndex(e => e.experiment_id === experimentId);
        if (idx !== -1) {
            this.ledger.experiments[idx].p_value = result.p_value;
            this.ledger.experiments[idx].information_coefficient = result.ic;
            // Apply Bonferroni conceptually
            const alpha = 0.05 / this.totalDegreesOfFreedom;
            
            if (result.p_value < alpha && result.ic > 0.02) {
                this.ledger.experiments[idx].status = "CONFIRMATION_PENDING";
            } else {
                this.ledger.experiments[idx].status = "REJECTED";
            }
            this._saveLedger();
            return this.ledger.experiments[idx];
        }
        return null;
    }
}
