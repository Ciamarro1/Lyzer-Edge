import { SportsDataIngestor } from './sportsDataIngestor.js';
import { SportsExecution } from './sportsExecution.js';
import { TruthKernel } from '../kernel.js';

const truthKernel = new TruthKernel({ trgThreshold: 0.8 });

export class SportsEngine {
    constructor() {
        this.ingestor = new SportsDataIngestor();
        this.execution = new SportsExecution();
    }

    startLiveMode() {
        // Initialize and start listening to data
        if (typeof this.ingestor.startWebSocket === 'function') {
            this.ingestor.startWebSocket((data) => {
                try {
                    const parsedData = JSON.parse(data);
                    const event = Array.isArray(parsedData) ? parsedData[0] : parsedData;
                    
                    if (!event || !Array.isArray(event.bookmakers)) return;

                    const pinnacle = event.bookmakers.find(b => b.key === 'pinnacle');
                    const bet365 = event.bookmakers.find(b => b.key === 'bet365');

                    if (!pinnacle || !bet365) return;

                    const getH2hPrice = (bookmaker) => {
                        const h2hMarket = bookmaker.markets?.find(m => m.key === 'h2h');
                        return h2hMarket?.outcomes?.[0]?.price;
                    };

                    const pinnaclePrice = getH2hPrice(pinnacle);
                    const bet365Price = getH2hPrice(bet365);

                    if (!pinnaclePrice || !bet365Price) return;

                    const providers = { 
                        sharp: { signal: 'LONG', confidence: 1 / pinnaclePrice }, 
                        soft: { signal: 'FLAT', confidence: 1 / bet365Price } 
                    };

                    const kernelResult = truthKernel.evaluate(providers, { 
                        liquidityDivergence: 1.0, 
                        scaleDivergence: 0, 
                        lhds: 0, 
                        invariants: {} 
                    });

                    if (kernelResult && kernelResult.eef) {
                        this.execution.placeBet(data);
                    }
                } catch (error) {
                    console.error('Error processing live data tick:', error);
                }
            });
        }
    }
}
