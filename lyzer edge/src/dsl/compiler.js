// src/dsl/compiler.js

class RuleCompressionLayer {
    constructor() {
        this.ruleSignatures = new Map();
    }

    // Prevents rule bloat by merging duplicate or highly similar rules
    compress(ast) {
        if (ast.type !== 'Program') {
            return ast;
        }

        const optimizedBody = [];
        
        for (const node of ast.body) {
            if (node.type === 'RuleDefinition') {
                const signature = this.generateSignature(node.body);
                
                if (this.ruleSignatures.has(signature)) {
                    // Rule bloat detected: merge or ignore duplicate rule
                    const existingRule = this.ruleSignatures.get(signature);
                    console.warn(`Rule bloat prevented: Rule '${node.name}' is a duplicate of '${existingRule.name}'. Skipping.`);
                    continue; // Skip this duplicate rule
                } else {
                    this.ruleSignatures.set(signature, node);
                    optimizedBody.push(node);
                }
            } else {
                optimizedBody.push(node);
            }
        }

        return {
            type: 'Program',
            body: optimizedBody
        };
    }

    generateSignature(body) {
        // Simple signature generation based on AST structure serialization
        return JSON.stringify(body, (key, value) => {
            // Serialize nodes to create a unique signature based on rule logic
            return value;
        });
    }
}

class Compiler {
    constructor() {
        this.compressionLayer = new RuleCompressionLayer();
    }

    compile(ast) {
        // Step 1: Compress the AST to prevent rule bloat
        const compressedAST = this.compressionLayer.compress(ast);
        
        // Step 2: Generate executable code or intermediate representation
        return this.generateCode(compressedAST);
    }

    generateCode(node) {
        if (node.type === 'Program') {
            const rules = node.body.map(n => this.generateCode(n)).join('\n\n');
            return `function evaluate(context) {\n${rules}\n}`;
        }
        
        if (node.type === 'RuleDefinition') {
            const bodyCode = node.body.map(n => this.generateCode(n)).join('\n');
            return `  // Rule: ${node.name}\n  (function() {\n    ${bodyCode}\n  })();`;
        }
        
        if (node.type === 'IfStatement') {
            const cond = this.generateCode(node.condition);
            const cons = node.consequent.map(n => this.generateCode(n)).join('\n    ');
            return `if (${cond}) {\n      ${cons}\n    }`;
        }
        
        if (node.type === 'BinaryExpression') {
            return `(${this.generateCode(node.left)} ${node.operator} ${this.generateCode(node.right)})`;
        }
        
        if (node.type === 'Identifier') {
            return `context['${node.name}']`;
        }
        
        if (node.type === 'Literal') {
            return typeof node.value === 'string' ? `"${node.value}"` : node.value;
        }

        return '';
    }
}

function compile(ast) {
    const compiler = new Compiler();
    return compiler.compile(ast);
}

module.exports = {
    RuleCompressionLayer,
    Compiler,
    compile
};
 