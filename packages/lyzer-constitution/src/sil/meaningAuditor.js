/**
 * Meaning Consistency Auditor
 * 
 * Verifies if the system uses identical terms with contradictory definitions.
 * In Phase 1, it utilizes AST/Metadata parameters.
 */

import { SemanticInterpreter } from './semanticInterpreter.js';

export class MeaningConsistencyAuditor {
    constructor() {
        this.interpreter = new SemanticInterpreter();
    }

    /**
     * Audits a module's metadata to verify semantic alignment.
     * @param {string} concept 
     * @param {string[]} implementationTokens 
     * @returns {object} { isConsistent: boolean, missingConstraints: string[] }
     */
    auditModule(concept, implementationTokens) {
        const compliance = this.interpreter.verifyModuleCompliance(concept, implementationTokens);
        return {
            isConsistent: compliance.isValid,
            missingConstraints: compliance.missing
        };
    }
}
