import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compressionThresholds = [0.55, 0.60, 0.65, 0.70];
const breakoutLookbacks = [10, 20, 30, 40];
const volumeMultipliers = [1.25, 1.50, 1.75, 2.00];

const hypotheses = [];
let idCounter = 1;

for (const c of compressionThresholds) {
  for (const b of breakoutLookbacks) {
    for (const v of volumeMultipliers) {
      const idStr = `VCB${String(idCounter).padStart(3, '0')}`;
      hypotheses.push({
        hypothesisId: idStr,
        compressionThreshold: c,
        breakoutLookback: b,
        volumeMultiplier: v,
        riskRewardRatio: '1:5',
        atrFormula: 'Wilder RMA ATR (12, 24, 72)',
        riskDefinition: 'max(1.5 * ATR24, 0.0080 * Close)',
        timeoutHours: 72,
        singlePositionPolicy: 'SINGLE_CONCURRENT_POSITION_PER_ASSET',
        feesRoundTrip: 0.0010,
        slippageBase: 0.0002
      });
      idCounter++;
    }
  }
}

// Generate JSON
const jsonPath = path.join(__dirname, 'VCB_64_HYPOTHESIS_MATRIX.json');
fs.writeFileSync(jsonPath, JSON.stringify(hypotheses, null, 2));

// Generate Markdown table
let md = `# AD002 — Matriz Fechada das 64 Hipóteses Pré-Registradas (VCB001 a VCB064)

**Identificador do Universo**: \`VCB_64_CLOSED_HYPOTHESIS_MATRIX\`  
**Programa**: \`ALPHA_DISCOVERY_002\` (\`AD002\`)  
**Tamanho do Universo ($M$)**: **64 hipóteses exatas** ($4 \\times 4 \\times 4$ ortogonal)  
**Status**: **CATALOGADO E CONGELADO ANTES DE QUALQUER EXECUÇÃO**  
**Timestamp UTC**: \`${new Date().toISOString()}\`  

---

## 1. Parâmetros Ortogonais da Grade

- **Filtro de Compressão de Volatilidade ($\\theta_{\\text{compress}}$)**: $\\{0.55, 0.60, 0.65, 0.70\\}$
- **Lookback de Rompimento de Preço ($K_{\\text{lookback}}$)**: $\\{10, 20, 30, 40\\}$ barras horárias
- **Multiplicador de Volume de Ignição ($v_{\\text{mult}}$)**: $\\{1.25, 1.50, 1.75, 2.00\\}$

---

## 2. Tabela Completa das 64 Hipóteses Pré-Registradas

| ID | Limiar de Compressão ($\\theta$) | Lookback Rompimento ($K$) | Multiplicador Volume ($v$) | Risco ($1R$) | Alvo ($5R$) | Timeout |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
`;

for (const h of hypotheses) {
  md += `| **${h.hypothesisId}** | $\\text{Ratio} \\le ${h.compressionThreshold.toFixed(2)}$ | ${h.breakoutLookback} barras | $\\ge ${h.volumeMultiplier.toFixed(2)} \\times \\text{Vol}_{24}$ | $\\max(1,5\\text{ATR}_{24}, 80\\text{bps})$ | $+5R$ | 72h |\n`;
}

md += `\n---

## 3. Cláusula Anti-Data-Snooping

Nenhuma hipótese poderá ser adicionada, removida ou alterada retrospectivamente após o início do processamento de dados do Batch 039.
O teste de múltiplos testes aplicará correção de Benjamini-Hochberg (FDR $\\le 5\\%$) estritamente sobre essas $M=64$ hipóteses pré-enumeradas.
`;

const mdPath = path.join(__dirname, 'VCB_64_HYPOTHESIS_MATRIX.md');
fs.writeFileSync(mdPath, md);

console.log(`✔ VCB 64-Hypothesis Matrix generated successfully: ${hypotheses.length} hypotheses.`);
