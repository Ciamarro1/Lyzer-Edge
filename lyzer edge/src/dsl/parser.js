// src/dsl/parser.js

class Tokenizer {
    constructor(input) {
        this.input = input;
        this.position = 0;
    }

    tokenize() {
        const tokens = [];
        while (this.position < this.input.length) {
            let char = this.input[this.position];

            if (/\s/.test(char)) {
                this.position++;
                continue;
            }

            if (/[a-zA-Z_]/.test(char)) {
                let identifier = '';
                while (this.position < this.input.length && /[a-zA-Z0-9_]/.test(this.input[this.position])) {
                    identifier += this.input[this.position];
                    this.position++;
                }
                tokens.push({ type: 'IDENTIFIER', value: identifier });
                continue;
            }

            if (/[0-9]/.test(char)) {
                let number = '';
                while (this.position < this.input.length && /[0-9\.]/.test(this.input[this.position])) {
                    number += this.input[this.position];
                    this.position++;
                }
                tokens.push({ type: 'NUMBER', value: parseFloat(number) });
                continue;
            }

            if (/[=<>!&|]/.test(char)) {
                let operator = '';
                while (this.position < this.input.length && /[=<>!&|]/.test(this.input[this.position])) {
                    operator += this.input[this.position];
                    this.position++;
                }
                tokens.push({ type: 'OPERATOR', value: operator });
                continue;
            }
            
            if (char === '(' || char === ')') {
                tokens.push({ type: 'PAREN', value: char });
                this.position++;
                continue;
            }
            
            if (char === '{' || char === '}') {
                tokens.push({ type: 'BRACE', value: char });
                this.position++;
                continue;
            }

            if (char === '"' || char === "'") {
                let quote = char;
                let str = '';
                this.position++;
                while (this.position < this.input.length && this.input[this.position] !== quote) {
                    str += this.input[this.position];
                    this.position++;
                }
                this.position++; // skip closing quote
                tokens.push({ type: 'STRING', value: str });
                continue;
            }

            throw new Error(`Unexpected character: ${char} at position ${this.position}`);
        }
        return tokens;
    }
}

class ASTBuilder {
    constructor(tokens) {
        this.tokens = tokens;
        this.position = 0;
    }

    peek() {
        return this.tokens[this.position];
    }

    consume() {
        return this.tokens[this.position++];
    }

    build() {
        const body = [];
        while (this.position < this.tokens.length) {
            body.push(this.parseStatement());
        }
        return { type: 'Program', body };
    }

    parseStatement() {
        const token = this.peek();
        if (token.type === 'IDENTIFIER' && token.value === 'rule') {
            return this.parseRule();
        }
        if (token.type === 'IDENTIFIER' && token.value === 'if') {
            return this.parseIfStatement();
        }
        return this.parseExpression();
    }

    parseRule() {
        this.consume(); // consume 'rule'
        const nameToken = this.consume();
        if (nameToken.type !== 'IDENTIFIER' && nameToken.type !== 'STRING') {
            throw new Error('Expected rule name');
        }
        
        const blockToken = this.consume();
        if (blockToken.type !== 'BRACE' || blockToken.value !== '{') {
            throw new Error('Expected { after rule name');
        }
        
        const body = [];
        while (this.peek() && (this.peek().type !== 'BRACE' || this.peek().value !== '}')) {
            body.push(this.parseStatement());
        }
        this.consume(); // consume '}'
        
        return {
            type: 'RuleDefinition',
            name: nameToken.value,
            body
        };
    }
    
    parseIfStatement() {
        this.consume(); // consume 'if'
        
        const condition = this.parseExpression();
        
        const blockToken = this.consume();
        if (blockToken.type !== 'BRACE' || blockToken.value !== '{') {
            throw new Error('Expected { after if condition');
        }
        
        const consequent = [];
        while (this.peek() && (this.peek().type !== 'BRACE' || this.peek().value !== '}')) {
            consequent.push(this.parseStatement());
        }
        this.consume(); // consume '}'
        
        return {
            type: 'IfStatement',
            condition,
            consequent
        };
    }

    parseExpression() {
        let left = this.parsePrimary();

        while (this.peek() && this.peek().type === 'OPERATOR') {
            const operator = this.consume().value;
            const right = this.parsePrimary();
            left = {
                type: 'BinaryExpression',
                operator,
                left,
                right
            };
        }

        return left;
    }

    parsePrimary() {
        const token = this.consume();
        if (!token) throw new Error('Unexpected end of input');
        
        if (token.type === 'IDENTIFIER') {
            return { type: 'Identifier', name: token.value };
        }
        if (token.type === 'NUMBER' || token.type === 'STRING') {
            return { type: 'Literal', value: token.value };
        }
        if (token.type === 'PAREN' && token.value === '(') {
            const expr = this.parseExpression();
            const close = this.consume();
            if (close.type !== 'PAREN' || close.value !== ')') {
                throw new Error('Expected )');
            }
            return expr;
        }
        throw new Error(`Unexpected token: ${JSON.stringify(token)}`);
    }
}

function parse(input) {
    const tokenizer = new Tokenizer(input);
    const tokens = tokenizer.tokenize();
    const builder = new ASTBuilder(tokens);
    return builder.build();
}

module.exports = {
    Tokenizer,
    ASTBuilder,
    parse
};
 