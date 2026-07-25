const CELParallelSimulator = require('./celParallelSimulator');

// Historic/synthetic data
const syntheticData = [
  { id: 'txn_001', amount: 500, type: 'standard', userTier: 'basic' },
  { id: 'txn_002', amount: 1500, type: 'standard', userTier: 'premium' },
  { id: 'txn_003', amount: 200, type: 'refund', userTier: 'basic' },
  { id: 'txn_004', amount: 5000, type: 'standard', userTier: 'vip' }
];

// Baseline logic
const baselineLogic = async (data) => {
    let fee = data.amount * 0.05;
    if (data.userTier === 'premium') fee = data.amount * 0.02;
    if (data.type === 'refund') fee = 0;
    
    return {
        id: data.id,
        processedAmount: data.amount - fee,
        feeApplied: fee,
        approved: data.amount <= 2000
    };
};

// Mutated logic (e.g., testing new VIP tier rules and higher approval limits)
const mutatedLogic = async (data) => {
    let fee = data.amount * 0.05;
    if (data.userTier === 'premium') fee = data.amount * 0.02;
    if (data.userTier === 'vip') fee = 0; // New rule: VIP pays no fees
    if (data.type === 'refund') fee = 0;
    
    return {
        id: data.id,
        processedAmount: data.amount - fee,
        feeApplied: fee,
        approved: data.amount <= 10000 // New rule: approval limit increased
    };
};

async function run() {
    const simulator = new CELParallelSimulator(baselineLogic, mutatedLogic);
    const results = await simulator.simulate(syntheticData);
    console.log(JSON.stringify(results.divergentStates, null, 2));
}

run();
