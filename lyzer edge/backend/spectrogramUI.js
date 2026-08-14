export class SpectrogramUI {
    constructor() {
        this.history = [];
        this.maxBars = 30;
        this.lastEvent = null;
        this.lastRenderTime = 0;
    }

    render(lhds, epistemicAuthority, kernelReason) {
        // Normalize LHDS to 0.0 - 1.0 safely
        const value = Math.max(0, Math.min(1, lhds));
        
        this.history.push({ value, authority: epistemicAuthority });
        if (this.history.length > this.maxBars) {
            this.history.shift();
        }

        const isTTY = Boolean(process.stdout && process.stdout.isTTY);
        const now = Date.now();
        const eventToLog = this.lastEvent;
        this.lastEvent = null; // Clear consumed event to prevent infinite loop printing

        // In non-interactive/Docker logs, avoid spamming console.clear() every 100ms
        if (!isTTY) {
            if (eventToLog) {
                console.log(`[SYSTEM EVENT] : ${eventToLog}`);
            }
            if (epistemicAuthority === 'VETO' && now - this.lastRenderTime > 5000) {
                this.lastRenderTime = now;
                console.warn(`⚠️ [DRCVS VETO] Epistemic: VETO | LHDS: ${(lhds * 100).toFixed(2)}% | Reason: ${kernelReason || 'NONE'}`);
            }
            return;
        }

        // ASCII blocks for interactive TTY
        const blocks = [' ', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
        
        let visualStr = "";
        
        for (const item of this.history) {
            const v = item.value;
            // Map 0-1 to 0-7
            // Because normal LHDS is around 0.01 - 0.1, we should scale it so 0.8 is max height
            const scaled = Math.min(v / 0.8, 1.0);
            const index = Math.floor(scaled * 7);
            
            let color = '\x1b[32m'; // Green (OBSERVED)
            if (item.authority === 'INFERRED') color = '\x1b[33m'; // Yellow
            if (item.authority === 'VETO') color = '\x1b[31m'; // Red
            
            visualStr += `${color}${blocks[index]}\x1b[0m`;
        }

        // Build header
        const alertFlash = epistemicAuthority === 'VETO' ? '\x1b[41m\x1b[37m[ VETO_REALITY_DIVERGENCE ]\x1b[0m' : '';
        const authorityColor = epistemicAuthority === 'OBSERVED' ? '\x1b[32m' : (epistemicAuthority === 'INFERRED' ? '\x1b[33m' : '\x1b[31m');
        
        console.clear();
        console.log(`=============================================================================`);
        console.log(`|| LYZER LABS : DUAL REALITY MONITOR (DRCVS)                               ||`);
        console.log(`=============================================================================`);
        console.log(`Epistemic Authority : ${authorityColor}${epistemicAuthority}\x1b[0m ${alertFlash}`);
        console.log(`Current LHDS        : ${(lhds * 100).toFixed(2)}% divergence from historical topology`);
        if (kernelReason) {
            console.log(`Kernel Status       : ${kernelReason}`);
        }
        console.log(`\n--- LHDS Spectrogram (Real-time Structural Stress) ---`);
        console.log(`|${visualStr.padEnd(this.maxBars * 10, ' ')}| [MAX: 80% VETO]`);
        console.log(`------------------------------------------------------`);
        
        if (eventToLog) {
            console.log(`\n[SYSTEM EVENT] : ${eventToLog}`);
        }
    }

    logEvent(msg) {
        this.lastEvent = msg;
    }
}
