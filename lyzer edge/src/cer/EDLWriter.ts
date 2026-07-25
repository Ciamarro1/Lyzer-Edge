import * as fs from 'fs';
import * as crypto from 'crypto';
import { EvidenceRecord } from './types';

export class EDLWriter {
  private queueFilePath: string = 'transient_queue.jsonl';
  private currentSegment: number = 1;
  private MAX_SEGMENT_RECORDS = 10000;
  private currentRecordCount = 0;

  /**
   * Atômico: Escreve no log transitório e libera o Kernel imediatamente.
   */
  public async ingest(record: EvidenceRecord): Promise<void> {
    const payload = JSON.stringify(record) + '\n';
    
    // Append atômico via Node.js fs
    await fs.promises.appendFile(this.getSegmentFileName(), payload);
    this.currentRecordCount++;

    if (this.currentRecordCount >= this.MAX_SEGMENT_RECORDS) {
      await this.rotateSegment();
    }
  }

  private getSegmentFileName(): string {
    return `transient_queue_segment_${this.currentSegment.toString().padStart(3, '0')}.jsonl`;
  }

  private async rotateSegment(): Promise<void> {
    // 1. Calculate Checksum for the current segment
    const segmentFile = this.getSegmentFileName();
    const fileBuffer = await fs.promises.readFile(segmentFile);
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    
    // 2. Append Checksum Footer
    await fs.promises.appendFile(segmentFile, `\n#CHECKSUM:${hash}\n`);
    
    // 3. Increment segment
    this.currentSegment++;
    this.currentRecordCount = 0;
    
    // Alert IPC Worker that a full segment is ready for bulk insert
    this.notifyWorker(segmentFile);
  }

  private notifyWorker(segmentFile: string) {
    // IPC communication logic (MessagePort to worker_thread)
    // worker.postMessage({ type: 'QUEUE_APPEND', file: segmentFile });
  }
}
