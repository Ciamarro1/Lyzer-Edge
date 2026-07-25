const MgoRewardHackingDetector = require('./mgoRewardHackingDetector');

const attack7StateData = [
  { timestamp: 1, metrics: { adaptiveAdvantage: 1.0, capitalGrowth: 1000 } },
  { timestamp: 2, metrics: { adaptiveAdvantage: 1.2, capitalGrowth: 1010 } },
  { timestamp: 3, metrics: { adaptiveAdvantage: 1.5, capitalGrowth: 1012 } },
  { timestamp: 4, metrics: { adaptiveAdvantage: 1.8, capitalGrowth: 1010 } },
  { timestamp: 5, metrics: { adaptiveAdvantage: 2.2, capitalGrowth: 1005 } }, // AA grew 120%, Capital grew 0.5%
];

const result = MgoRewardHackingDetector.analyze(attack7StateData);

console.log(JSON.stringify(result, null, 2));
