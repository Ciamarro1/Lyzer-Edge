const fs = require('fs');
const path = require('path');

const rootDir = 'E:\\projcts\\lyzer';

const dupFiles = [
  // Constitution
  { path: 'cer/EDLWriter.ts', pkg: '@lyzer/constitution/cer/EDLWriter.ts', relPkg: 'packages/lyzer-constitution/src/cer/EDLWriter.ts' },
  { path: 'cer/FMCObservabilityLayer.ts', pkg: '@lyzer/constitution/cer/FMCObservabilityLayer.ts', relPkg: 'packages/lyzer-constitution/src/cer/FMCObservabilityLayer.ts' },
  { path: 'cer/RollupEngine.ts', pkg: '@lyzer/constitution/cer/RollupEngine.ts', relPkg: 'packages/lyzer-constitution/src/cer/RollupEngine.ts' },
  { path: 'cer/SchemaCompatibilityGate.ts', pkg: '@lyzer/constitution/cer/SchemaCompatibilityGate.ts', relPkg: 'packages/lyzer-constitution/src/cer/SchemaCompatibilityGate.ts' },
  { path: 'cer/SQLiteSchema.ts', pkg: '@lyzer/constitution/cer/SQLiteSchema.ts', relPkg: 'packages/lyzer-constitution/src/cer/SQLiteSchema.ts' },
  { path: 'cer/types.ts', pkg: '@lyzer/constitution/cer/types.ts', relPkg: 'packages/lyzer-constitution/src/cer/types.ts' },
  { path: 'sil/evolutionRegistry.js', pkg: '@lyzer/constitution/sil/evolutionRegistry.js', relPkg: 'packages/lyzer-constitution/src/sil/evolutionRegistry.js' },
  { path: 'sil/goalMutation.js', pkg: '@lyzer/constitution/sil/goalMutation.js', relPkg: 'packages/lyzer-constitution/src/sil/goalMutation.js' },
  { path: 'sil/meaningAuditor.js', pkg: '@lyzer/constitution/sil/meaningAuditor.js', relPkg: 'packages/lyzer-constitution/src/sil/meaningAuditor.js' },
  { path: 'sil/ontologyDrift.js', pkg: '@lyzer/constitution/sil/ontologyDrift.js', relPkg: 'packages/lyzer-constitution/src/sil/ontologyDrift.js' },
  { path: 'sil/semanticInterpreter.js', pkg: '@lyzer/constitution/sil/semanticInterpreter.js', relPkg: 'packages/lyzer-constitution/src/sil/semanticInterpreter.js' },
];

// Add shared files
const sharedFiles = [
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

sharedFiles.forEach(f => {
  dupFiles.push({ path: f, pkg: `@lyzer/shared/${f}`, relPkg: `packages/lyzer-shared/src/${f}` });
});

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

const files = getFiles(rootDir);
console.log(`Scanning ${files.length} total files for edge/src imports...`);

const badImports = [];

files.forEach(filePath => {
  const relFile = path.relative(rootDir, filePath).replace(/\\/g, '/');
  // Skip files inside lyzer edge/src that are themselves going to be deleted
  const isTargetForDeletion = dupFiles.some(d => relFile === `lyzer edge/src/${d.path}`);
  if (isTargetForDeletion) return;

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    if (line.includes('lyzer edge/src/') || line.includes('/src/cer/') || line.includes('/src/sil/') ||
        (line.includes('./src/') && !line.includes('packages/')) ||
        (line.includes('../src/') && !line.includes('packages/')) ||
        line.includes('@/cer/') || line.includes('@/sil/') ||
        (relFile.startsWith('lyzer edge/src/') && (line.includes('./') || line.includes('../')))) {
      
      dupFiles.forEach(d => {
        const noExt = d.path.replace(/\.(js|ts|css)$/, '');
        if (line.includes(d.path) || line.includes(noExt)) {
          badImports.push({
            file: relFile,
            lineNum: idx + 1,
            lineText: line.trim(),
            dupPath: d.path,
            isConstitution: d.pkg.includes('constitution')
          });
        }
      });
    }
  });
});

console.log(`Found ${badImports.length} lines with imports targeting duplicate edge/src files:`);
badImports.forEach(b => console.log(`${b.file}:${b.lineNum} -> ${b.lineText}`));
fs.writeFileSync('E:\\projcts\\lyzer\\.agents\\worker_m4\\bad_imports.json', JSON.stringify(badImports, null, 2));
