export class ReplayEngine {
  constructor(trades) {
    // Sort trades chronologically to simulate a session
    this.trades = trades
      .filter(t => t.status === 'closed')
      .sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime());
    this.currentIndex = -1;
  }

  next() {
    if (this.currentIndex < this.trades.length - 1) {
      this.currentIndex++;
      return this.trades[this.currentIndex];
    }
    return null;
  }

  prev() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      return this.trades[this.currentIndex];
    } else if (this.currentIndex === 0) {
      this.currentIndex = -1;
      return null;
    }
    return null;
  }

  current() {
    if (this.currentIndex >= 0 && this.currentIndex < this.trades.length) {
      return this.trades[this.currentIndex];
    }
    return null;
  }

  reset() {
    this.currentIndex = -1;
  }

  getReplayedTrades() {
    if (this.currentIndex < 0) return [];
    return this.trades.slice(0, this.currentIndex + 1);
  }

  getProgress() {
    if (this.trades.length === 0) return 0;
    return ((this.currentIndex + 1) / this.trades.length) * 100;
  }

  isFinished() {
    return this.currentIndex >= this.trades.length - 1;
  }
}
 