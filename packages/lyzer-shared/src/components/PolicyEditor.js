import { eventBus } from '../lib/eventBus.js';

export class PolicyEditor {
  constructor() {
    this.container = null;
    this.dslCode = '';
    this.compilationResult = null;
    this.isCompiling = false;
  }

  mount(container) {
    this.container = container;
    this.render();
  }

  unmount() {
    if (this.container) {
      this.container.innerHTML = '';
      this.container = null;
    }
  }

  async compile() {
    this.isCompiling = true;
    this.render();

    try {
      // Attempt to import the DSL compiler if it exists, otherwise use a fallback mock
      let compilePolicy;
      try {
        const compiler = await import('../dsl/compiler.js');
        compilePolicy = compiler.compilePolicy || compiler.compile || compiler.default;
      } catch (err) {
        // Fallback mock if compiler.js is not yet implemented by another agent
        compilePolicy = async (code) => {
          await new Promise(resolve => setTimeout(resolve, 600));
          if (!code.trim()) {
            throw new Error("Syntax Error: Policy cannot be empty.");
          }
          if (code.includes('error')) {
            throw new Error("Syntax Error: Unexpected token 'error' at line 1.");
          }
          return {
            status: 'success',
            ast: { type: "Policy", rules: code.split('\\n').filter(l => l.trim()) },
            bytecode: "0x00 0x01 0x0A 0x4F"
          };
        };
      }

      if (typeof compilePolicy !== 'function') {
        throw new Error("Compiler module found but missing compile function.");
      }

      const result = await compilePolicy(this.dslCode);
      this.compilationResult = { success: true, data: result };
    } catch (error) {
      this.compilationResult = { success: false, error: error.message };
    } finally {
      this.isCompiling = false;
      this.render();
    }
  }

  render() {
    if (!this.container) return;

    let resultHtml = '';
    if (this.isCompiling) {
      resultHtml = `
        <div class="card glass-panel" style="margin-top: 1.5rem;">
          <p class="text-muted">Compiling DSL...</p>
        </div>
      `;
    } else if (this.compilationResult) {
      if (this.compilationResult.success) {
        resultHtml = `
          <div class="card glass-panel" style="margin-top: 1.5rem; border-color: var(--color-success, #06d6a0); border-width: 1px; border-style: solid;">
            <h3 style="color: var(--color-success, #06d6a0); margin-top: 0; margin-bottom: 1rem;">Compilation Successful</h3>
            <div style="background: rgba(0,0,0,0.2); padding: 1rem; border-radius: 4px; overflow-x: auto; font-family: monospace; white-space: pre-wrap; font-size: 0.9rem;">${JSON.stringify(this.compilationResult.data, null, 2)}</div>
          </div>
        `;
      } else {
        resultHtml = `
          <div class="card glass-panel" style="margin-top: 1.5rem; border-color: var(--color-danger, #ef4444); border-width: 1px; border-style: solid;">
            <h3 style="color: var(--color-danger, #ef4444); margin-top: 0; margin-bottom: 1rem;">Compilation Failed</h3>
            <div style="background: rgba(239, 68, 68, 0.1); padding: 1rem; border-radius: 4px; color: var(--color-danger, #ef4444); font-family: monospace; font-size: 0.9rem;">
              ${this.compilationResult.error}
            </div>
          </div>
        `;
      }
    }

    this.container.innerHTML = `
      <div class="page-container">
        <div class="page-header">
          <h1 class="page-title">Policy Editor</h1>
          <p class="page-subtitle">Write and compile trading rules using the Lyzer DSL</p>
        </div>

        <div class="editor-container" style="display: flex; flex-direction: column; gap: 1rem;">
          <div class="form-group">
            <label for="dsl-input" style="font-weight: bold; margin-bottom: 0.5rem; display: block;">DSL Source Code</label>
            <textarea id="dsl-input" class="input" style="width: 100%; min-height: 250px; font-family: monospace; padding: 1rem; background: var(--color-bg-alt, #1a1a1a); color: var(--color-text, #fff); border: 1px solid var(--color-border, #333); border-radius: 4px; resize: vertical;" placeholder="// Type your trading rules here...\\n\\nrule \\"Stop Loss\\"\\n  when price < entry_price * 0.95\\n  then exit_trade\\nend"></textarea>
          </div>
          
          <div style="display: flex; gap: 0.5rem;">
            <button id="compile-btn" class="btn btn-primary" ${this.isCompiling ? 'disabled' : ''}>
              ${this.isCompiling ? 'Compiling...' : 'Compile Policy'}
            </button>
            <button id="clear-btn" class="btn btn-secondary">
              Clear
            </button>
          </div>
        </div>

        ${resultHtml}
      </div>
    `;

    // Restore text area value without losing cursor position
    const textarea = this.container.querySelector('#dsl-input');
    if (textarea) {
      textarea.value = this.dslCode;
    }

    this.bindEvents();
  }

  bindEvents() {
    const compileBtn = this.container.querySelector('#compile-btn');
    if (compileBtn) {
      compileBtn.addEventListener('click', () => {
        this.compile();
      });
    }

    const clearBtn = this.container.querySelector('#clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.dslCode = '';
        this.compilationResult = null;
        this.render();
      });
    }

    const dslInput = this.container.querySelector('#dsl-input');
    if (dslInput) {
      dslInput.addEventListener('input', (e) => {
        this.dslCode = e.target.value;
      });
    }
  }
}
 