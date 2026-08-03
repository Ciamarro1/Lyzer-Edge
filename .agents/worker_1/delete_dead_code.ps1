$targets = @(
    "lyzer edge/backend/providers/v1_fast",
    "lyzer edge/backend/providers/v2_deep",
    "lyzer edge/backend/sports",
    "lyzer edge/backend/db.js",
    "lyzer edge/backend/migrateLegacy.js",
    "src-ts",
    "src/laboratory",
    "lyzer edge/src/components/AlertsView.js",
    "lyzer edge/src/components/Dashboard.js",
    "lyzer edge/src/components/DecisionAnalytics.js",
    "lyzer edge/src/components/LiveTradingView.js",
    "lyzer edge/src/components/ObservabilityView.js",
    "lyzer edge/src/components/PatternRecognitionView.js",
    "lyzer edge/src/components/PolicyEditor.js",
    "lyzer edge/src/components/Recommendations.js",
    "lyzer edge/src/components/ReportsView.js",
    "lyzer edge/src/components/RiskAnalysisView.js",
    "lyzer edge/src/components/ZSpaceDashboard.js",
    "lyzer edge/src/components/CommandCenterView.js",
    "lyzer edge/src/cer",
    "lyzer edge/src/microstructure/contracts.ts",
    "lyzer edge/src/types/governanceContracts.ts",
    "lyzer edge/src/config/score_profiles.json",
    "lyzer edge/src/dsl",
    "lyzer edge/src/eca/quarantine",
    "lyzer edge/src/lib",
    "lyzer edge/src/mic/adapters",
    "lyzer edge/src/mic/latency",
    "lyzer edge/src/sil",
    "lyzer edge/src/vm",
    "lyzer edge/src/workers",
    "generate_passports.js",
    "reproduce.js",
    "run_autonomous_research_lab.js",
    "run_decision_quality_audit.js",
    "run_final_independent_review.js",
    "run_final_truth_audit.js",
    "run_institutional_committee_synthesis.js",
    "run_real_replay_validation.js",
    "run_runtime_fidelity_audit.js",
    "run_runtime_parity_experiment.js",
    "run_simplification_audit.js",
    "run_simplification_execution.js",
    "lyzer edge/optimize_backtest.js",
    "lyzer edge/run_binance_backtest.js",
    "lyzer edge/run_live_testnet.js",
    "lyzer edge/test_command_center_shell.js",
    "lyzer edge/test_command_center_v2.js",
    "lyzer edge/test_design_system_kernel.js",
    "lyzer edge/test_robustness.js",
    "packages/lyzer-shared/src/app.js",
    "packages/lyzer-shared/src/components/StrategyLab.js",
    "packages/lyzer-shared/src/vm/strategyVM.js",
    "src-rust/lyzer-binance-adapter/src/dsl.rs",
    "src-rust/lyzer-ocr/src/bin/mcff_run.rs",
    "src-rust/lyzer-ocr/src/bin/shadow_run.rs",
    "src-rust/lyzer-shadow-oms/src/edi.rs"
)

foreach ($t in $targets) {
    $fullPath = Join-Path "e:\projcts\lyzer" $t
    if (Test-Path $fullPath) {
        Remove-Item -Recurse -Force $fullPath
        Write-Host "[DELETED] $t"
    } else {
        Write-Host "[NOT FOUND] $t"
    }
}
