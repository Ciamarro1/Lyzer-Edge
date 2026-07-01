import { appendFileSync } from 'fs';
import { join } from 'path';
import { FIELSensor, Operation } from './fiel_sensor.js';

export class PipelineStreamer {
  private isRunning: boolean = false;
  private fielSensor: FIELSensor;
  private emlLogPath: string;
  private observationCount: number = 30; // Starts at 30 from previous batches

  constructor(fielSensor: FIELSensor, workspaceRoot: string) {
    this.fielSensor = fielSensor;
    this.emlLogPath = join(workspaceRoot, 'data', 'eml_stream.log');
  }

  public start() {
    this.isRunning = true;
    this.loop();
  }

  public stop() {
    this.isRunning = false;
  }

  public getThroughput(): number {
    return this.observationCount;
  }

  private loop() {
    if (!this.isRunning) return;

    if (this.fielSensor.hasFired) {
      this.isRunning = false;
      return; // Stream halts completely upon FIEL firing
    }

    // REE applies random logic to ensure diverse ingestion
    const classes = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    const randomClass = classes[Math.floor(Math.random() * classes.length)];

    const obsId = `OBS-${(this.observationCount + 1).toString().padStart(4, '0')}`;
    
    // Attempt CAO operation
    const isValid = this.fielSensor.validateOperation('APPEND', 'process', [obsId], 'EMPIRICAL', false);
    
    if (isValid) {
      this.observationCount++;
      const payload = `${new Date().toISOString()} | ${obsId} | Class ${randomClass}\n`;
      try {
        appendFileSync(this.emlLogPath, payload);
      } catch (e) {
        // Silently fail to console, operator shouldn't see verbose errors in CRS isolation
      }
    }

    // Continue stream - random interval between 50ms and 200ms
    setTimeout(() => this.loop(), Math.random() * 150 + 50);
  }
}
