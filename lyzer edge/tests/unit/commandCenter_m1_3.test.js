import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RingBuffer } from '../../src/components/commandCenter/sdk/RingBuffer.js';
import { StreamBuffer, Priority } from '../../src/components/commandCenter/sdk/StreamBuffer.js';
import { RenderScheduler } from '../../src/components/commandCenter/sdk/RenderScheduler.js';
import { ManualClock } from '../../src/components/commandCenter/sdk/Clock.js';

describe('Milestone M1.3: RingBuffer', () => {
  it('should push and shift items in O(1)', () => {
    const rb = new RingBuffer(3);
    expect(rb.isEmpty).toBe(true);
    
    rb.push('A');
    rb.push('B');
    expect(rb.size).toBe(2);
    
    expect(rb.shift()).toBe('A');
    expect(rb.size).toBe(1);
    expect(rb.peek()).toBe('B');
  });

  it('should overwrite oldest items when full (Tail Drop)', () => {
    const rb = new RingBuffer(3);
    rb.push('A');
    rb.push('B');
    rb.push('C');
    expect(rb.isFull).toBe(true);
    
    const wasFull = rb.push('D');
    expect(wasFull).toBe(true);
    expect(rb.size).toBe(3);
    
    // A was dropped, B is now oldest
    expect(rb.shift()).toBe('B');
    expect(rb.shift()).toBe('C');
    expect(rb.shift()).toBe('D');
    expect(rb.isEmpty).toBe(true);
  });
});

describe('Milestone M1.3: StreamBuffer', () => {
  let sb;
  
  beforeEach(() => {
    sb = new StreamBuffer({ maxCapacity: 5 });
  });

  it('should coalesce events from the same source and topic', () => {
    sb.enqueue({ source: 'w1', topic: 'price', payload: 100, priority: Priority.NORMAL });
    sb.enqueue({ source: 'w1', topic: 'price', payload: 101, priority: Priority.NORMAL });
    
    expect(sb.totalSize).toBe(1);
    expect(sb.metrics.coalesced).toBe(1);
    
    const ev = sb.dequeue();
    expect(ev.payload).toBe(101);
  });

  it('should prioritize HIGH over NORMAL and LOW', () => {
    sb.enqueue({ source: 'w1', topic: 't1', payload: 'low', priority: Priority.LOW });
    sb.enqueue({ source: 'w2', topic: 't2', payload: 'normal', priority: Priority.NORMAL });
    sb.enqueue({ source: 'w3', topic: 't3', payload: 'high', priority: Priority.HIGH });
    
    const e1 = sb.dequeue();
    expect(e1.priority).toBe(Priority.HIGH);
    expect(e1.payload).toBe('high');
    
    const e2 = sb.dequeue();
    expect(e2.priority).toBe(Priority.NORMAL);
    expect(e2.payload).toBe('normal');
  });

  it('should drop LOW and NORMAL events under backpressure, but keep HIGH', () => {
    sb.enqueue({ source: 'w1', topic: '1', payload: 'l', priority: Priority.LOW });
    sb.enqueue({ source: 'w2', topic: '2', payload: 'n1', priority: Priority.NORMAL });
    sb.enqueue({ source: 'w3', topic: '3', payload: 'n2', priority: Priority.NORMAL });
    sb.enqueue({ source: 'w4', topic: '4', payload: 'h1', priority: Priority.HIGH });
    sb.enqueue({ source: 'w5', topic: '5', payload: 'h2', priority: Priority.HIGH });
    
    expect(sb.totalSize).toBe(5); // Capacity reached
    
    // Enqueue a new HIGH event, should drop the LOW event
    sb.enqueue({ source: 'w6', topic: '6', payload: 'h3', priority: Priority.HIGH });
    expect(sb.metrics.droppedLow).toBe(1);
    expect(sb.totalSize).toBe(5);
    
    // Enqueue another HIGH, should drop a NORMAL event
    sb.enqueue({ source: 'w7', topic: '7', payload: 'h4', priority: Priority.HIGH });
    expect(sb.metrics.droppedNormal).toBe(1);
    
    // If we push enough HIGH events, it degrades
    sb.enqueue({ source: 'w8', topic: '8', payload: 'h5', priority: Priority.HIGH });
    sb.enqueue({ source: 'w9', topic: '9', payload: 'h6', priority: Priority.HIGH });
    sb.enqueue({ source: 'w10', topic: '10', payload: 'h7', priority: Priority.HIGH });
    
    expect(sb.isDegraded).toBe(true);
    expect(sb.metrics.degradedActivations).toBe(1);
  });
});

describe('Milestone M1.3: RenderScheduler & Clock', () => {
  it('should process events up to frame budget', () => {
    const clock = new ManualClock();
    const sb = new StreamBuffer({ maxCapacity: 100 });
    const scheduler = new RenderScheduler({
      streamBuffer: sb,
      clock,
      frameBudgetMs: 16.6
    });

    const processor = vi.fn((ev) => {
      // Simulate taking 10ms per event
      clock.advance(10);
    });
    
    scheduler.registerProcessor(processor);
    
    sb.enqueue({ source: 'w1', topic: '1', priority: Priority.HIGH, payload: 'a' });
    sb.enqueue({ source: 'w2', topic: '2', priority: Priority.HIGH, payload: 'b' });
    sb.enqueue({ source: 'w3', topic: '3', priority: Priority.HIGH, payload: 'c' });
    
    scheduler.start();
    clock.tick(); // Triggers frame
    
    // First event took 10ms (under 16.6)
    // Second event took 10ms (total 20ms, exceeds 16.6)
    // Loop breaks! Third event is left in buffer.
    
    expect(processor).toHaveBeenCalledTimes(2);
    expect(sb.totalSize).toBe(1); // 1 left!
    
    scheduler.stop();
  });
});
