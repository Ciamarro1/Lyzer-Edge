/**
 * @fileoverview CognitiveCommandBus — Phase 14 (ADR-031)
 *
 * Command Bus implementing the CQRS pattern (separating Intent Commands from Fact Events).
 * Handles command dispatching, validation, and handler execution.
 */
export class CognitiveCommandBus {
  constructor() {
    this.handlers = new Map();
    this.commandLog = [];
  }

  /**
   * Registers a command handler for a command name.
   *
   * @param {string} commandName - Command key (e.g., 'PromoteStrategyCommand', 'ExecuteOrderCommand')
   * @param {Function} handlerFn - Handler function (command) => result
   */
  registerHandler(commandName, handlerFn) {
    if (!commandName || typeof handlerFn !== 'function') {
      throw new Error('commandName and handlerFn function are required');
    }
    this.handlers.set(commandName, handlerFn);
  }

  /**
   * Dispatches a command to its registered handler.
   *
   * @param {string} commandName
   * @param {Object} payload
   * @returns {Object} Execution Result
   */
  async dispatch(commandName, payload = {}) {
    const handler = this.handlers.get(commandName);
    if (!handler) {
      throw new Error(`No handler registered for command '${commandName}'`);
    }

    const commandEnvelope = {
      command_id: `cmd_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      command: commandName,
      payload,
      dispatched_at: Date.now()
    };

    this.commandLog.push(commandEnvelope);

    const result = await handler(payload);

    return {
      command_id: commandEnvelope.command_id,
      command: commandName,
      status: 'HANDLED',
      result,
      handled_at: Date.now()
    };
  }

  getCommandLog() {
    return [...this.commandLog];
  }
}
