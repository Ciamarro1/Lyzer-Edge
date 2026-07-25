// src/dsl/validator.js

/**
 * Contextual State Vector (CSV) for Fuzzy Logic
 * Represents a probabilistic or fuzzy state of context variables.
 */
class ContextualStateVector {
    constructor(initialState = {}) {
        // State format: { variableName: { value: Any, confidence: Number (0-1) } }
        this.state = new Map();
        for (const [key, val] of Object.entries(initialState)) {
            this.setFuzzyState(key, val.value, val.confidence !== undefined ? val.confidence : 1.0);
        }
    }

    setFuzzyState(key, value, confidence) {
        this.state.set(key, {
            value,
            confidence: Math.max(0, Math.min(1, confidence)) // Clamp between 0 and 1
        });
    }

    getFuzzyState(key) {
        return this.state.get(key) || { value: undefined, confidence: 0 };
    }

    // Evaluates a condition fuzzily. Returns a confidence level of the truthiness.
    evaluateFuzzyCondition(leftKey, operator, rightValue) {
        const state = this.getFuzzyState(leftKey);
        
        let match = false;
        switch (operator) {
            case '==':
            case '===':
                match = state.value === rightValue;
                break;
            case '!=':
            case '!==':
                match = state.value !== rightValue;
                break;
            case '>':
                match = state.value > rightValue;
                break;
            case '<':
                match = state.value < rightValue;
                break;
            case '>=':
                match = state.value >= rightValue;
                break;
            case '<=':
                match = state.value <= rightValue;
                break;
            default:
                match = false;
        }

        // Return a fuzziness score: match boolean multiplied by state confidence
        return match ? state.confidence : 0;
    }
    
    merge(otherCSV) {
        for (const [key, state] of otherCSV.state.entries()) {
            const current = this.getFuzzyState(key);
            // If overlapping keys, combine confidences (probabilistic sum A + B - A*B)
            if (current.value === state.value) {
                const combinedConfidence = current.confidence + state.confidence - (current.confidence * state.confidence);
                this.setFuzzyState(key, state.value, combinedConfidence);
            } else if (state.confidence > current.confidence) {
                // If conflicting values, take the one with higher confidence
                this.setFuzzyState(key, state.value, state.confidence);
            }
        }
    }
}

class Validator {
    constructor() {
        this.errors = [];
    }

    validateAST(ast) {
        this.errors = [];
        if (!ast || ast.type !== 'Program') {
            this.errors.push("Invalid AST: Root must be a Program");
            return false;
        }

        this.walk(ast);
        return this.errors.length === 0;
    }

    walk(node) {
        if (!node) return;

        switch (node.type) {
            case 'Program':
                node.body.forEach(n => this.walk(n));
                break;
            case 'RuleDefinition':
                if (!node.name) {
                    this.errors.push("RuleDefinition must have a name");
                }
                node.body.forEach(n => this.walk(n));
                break;
            case 'IfStatement':
                if (!node.condition) {
                    this.errors.push("IfStatement must have a condition");
                }
                this.walk(node.condition);
                node.consequent.forEach(n => this.walk(n));
                break;
            case 'BinaryExpression':
                if (!['==', '===', '!=', '!==', '>', '<', '>=', '<=', '&&', '||'].includes(node.operator)) {
                    this.errors.push(`Unsupported operator: ${node.operator}`);
                }
                this.walk(node.left);
                this.walk(node.right);
                break;
            case 'Identifier':
            case 'Literal':
                break;
            default:
                this.errors.push(`Unknown AST node type: ${node.type}`);
        }
    }

    getErrors() {
        return this.errors;
    }
}

module.exports = {
    ContextualStateVector,
    Validator
};
 