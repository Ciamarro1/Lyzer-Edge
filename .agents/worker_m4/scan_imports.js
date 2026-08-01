const fs = require('fs');
const path = require('path');

function getFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist' && file !== '.agents') {
        results = results.concat(getFiles(fullPath));
      }
    } else if (/\.(js|ts|jsx|tsx)$/.test(file)) {
      results.push(fullPath);
    }
  });
  return results;
}

const rootDir = 'E:\\projcts\\lyzer';
const allFiles = getFiles(rootDir);

const importRegex = /(?:import|require)\s*(?:\(\s*['"]([^'"]+)['"]|.*?\s+from\s+['"]([^'"]+)['"])/g;

const matches = [];

allFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const target = match[1] || match[2];
    if (target) {
      matches.push({ file: path.relative(rootDir, file), target });
    }
  }
});

const dupFiles = [
  // Constitution (11)
  'cer/EDLWriter.ts', 'cer/FMCObservabilityLayer.ts', 'cer/RollupEngine.ts',
  'cer/SchemaCompatibilityGate.ts', 'cer/SQLiteSchema.ts', 'cer/types.ts',
  'sil/evolutionRegistry.js', 'sil/goalMutation.js', 'sil/meaningAuditor.js',
  'sil/ontologyDrift.js', 'sil/semanticInterpreter.js',
  
  // Shared (53)
  'components/BehaviorView.js', 'components/DecisionStream.js', 'components/EdgeExplorerView.js',
  'components/EdgeScoreRing.js', 'components/EvolutionView.js', 'components/ExecutionTerminal.js',
  'components/MonteCarloView.js', 'components/ReplayView.js', 'components/Settings.js',
  'components/StrategyLab.js', 'components/SystemHealthView.js', 'components/TradeDetail.js',
  'components/TradeForm.js', 'components/TradeLog.js',
  'db/activeConfig.js', 'db/historicalData.js',
  'dsl/compiler.js', 'dsl/parser.js', 'dsl/validator.js',
  'engine/evFeatureCausalEngine.js', 'engine/evMTFEngine.js', 'engine/evProfiler.js',
  'engine/evSignalRedesign.js', 'engine/evidenceToConfidence.js',
  'laboratory/adversarialTesting.js', 'laboratory/experimentRunner.js', 'laboratory/governanceCost.js',
  'laboratory/governanceRemoval.js', 'laboratory/mutationSurvival.js', 'laboratory/regimeAdaptation.js',
  'laboratory/semanticCorruption.js', 'laboratory/stressTest.js',
  'lib/eventBus.js', 'lib/workerClient.js',
  'mic/events.js', 'mic/gateway.js', 'mic/zombieEngine.js',
  'mic/adapters/abstractAdapter.js', 'mic/adapters/replayAdapter.js', 'mic/scenarios.js',
  'microstructure/contracts.ts', 'microstructure/evidenceHistory.js', 'microstructure/mdd.js',
  'microstructure/mee.js', 'microstructure/microstructure.js',
  'providers/v3_momentum_rsi.js', 'styles/components.css', 'styles/layout.css',
  'types/governanceContracts.ts', 'types/tradeLogSchema.js',
  'vm/strategyVM.js', 'workers/worker.js', 'router.js'
];

const constitutionFiles = new Set([
  'cer/EDLWriter.ts', 'cer/FMCObservabilityLayer.ts', 'cer/RollupEngine.ts',
  'cer/SchemaCompatibilityGate.ts', 'cer/SQLiteSchema.ts', 'cer/types.ts',
  'sil/evolutionRegistry.js', 'sil/goalMutation.js', 'sil/meaningAuditor.js',
  'sil/ontologyDrift.js', 'sil/semanticInterpreter.js',
]);

function getDupCategory(targetPath) {
  // Normalize targetPath
  const clean = targetPath.replace(/\\/g, '/').replace(/^\.\.?\//, '').replace(/^src\//, '').replace(/^@\//, '');
  for (const f of dupFiles) {
    const fNoExt = f.replace(/\.(js|ts|css)$/, '');
    if (clean === f || clean === fNoExt || clean.endsWith('/' + f) || clean.endsWith('/' + fNoExt)) {
      return constitutionFiles.has(f) ? 'constitution' : 'shared';
    }
  }
  return null;
}

const dupMatches = [];
matches.forEach(m => {
  const cat = getDupCategory(m.target);
  if (cat || m.target.startsWith('@/')) {
    dupMatches.push({ file: m.file, target: m.target, cat });
  }
});

fs.writeFileSync('E:\\projcts\\lyzer\\.agents\\worker_m4\\all_imports.json', JSON.stringify(dupMatches, null, 2));
console.log(`Saved ${dupMatches.length} matching import statements to all_imports.json`);
