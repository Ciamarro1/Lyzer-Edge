# 🏛️ ALPHA OPERATIONS CONSTITUTION
**Status:** ATIVA E IRREVOGÁVEL (Nível Institucional L8)

Esta Constituição governa as operações do **Lyzer Institutional Shadow Platform**. Nenhuma modificação no código ou nos parâmetros pode subverter estas leis. O sistema prioriza sobrevivência matemática absoluta sobre maximização de lucro teórico.

## I. LEIS DE ESTADO OPERACIONAL (IRS Driven)
O estado do sistema é ditado passivamente pelo `InstitutionalRealityScore` (IRS).

- **QUANDO OPERAR (READY):**
  - O sistema só é autorizado a conectar ordens reais ao Exchange Gateway se o `IRS > 90` E o `CapitalGovernor` não estiver em modo Freeze/Recovery.
- **QUANDO REDUZIR (SHADOW ONLY / DEFENSIVE):**
  - Se `IRS` cair para entre 75 e 90, o envio de ordens é desativado. O sistema converte-se instantaneamente para **Shadow Trading**, documentando ordens hipotéticas.
  - Se houver detecção de *Loss Velocity* excessiva, o `CapitalGovernor` reduz o *Position Sizing* independentemente da confiança do sinal.
- **QUANDO PARAR (HALT):**
  - Se `IRS < 75` E/OU Drawdown Diário atingir o *Risk Budget* máximo (-3%).
  - Paralisação mecânica de 24 horas (Hard Cooldown). Religue requer aprovação manual via CTO/Quant Engineer.

## II. LEIS DE GOVERNANÇA E PARAMETRIZAÇÃO
- **Autoridade de Alteração:** Nenhuma engine pode alterar parâmetros operacionais autonomamente no ambiente de produção. Otimizadores genéticos ou de hiperparâmetros operam estritamente no laboratório.
- **Vetos:** O *LiquiditySurvivalEngine* tem autoridade total para vetar trades gerados pelo TruthKernel. Se não há spread razoável, não há operação.

## III. O PIPELINE DE EVOLUÇÃO INSTITUCIONAL
Toda nova feature, sinal quantitativo ou correção arquitetural DEVE percorrer a trilha mecânica sem saltos:

1. **IDEA:** Concepção arquitetural (Phase 0).
2. **BACKTEST:** Validação histórica determinística (SMC/IMCE).
3. **OUT OF SAMPLE:** Validação em dados nunca vistos pelo modelo (OOS Causal).
4. **SHADOW:** Operação Live forward-testing sem capital (Mínimo de 10.000 eventos).
5. **CERTIFICATION:** Red Team attack (Monte Carlo Execution War / Destructive Testing).
6. **PRODUCTION:** Aprovação unânime do Architecture Review Board e merge para o core.
