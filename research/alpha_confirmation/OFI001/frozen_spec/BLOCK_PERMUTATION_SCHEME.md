# OFI-CONFIRMATION-SETUP-001 — Especificação Prévia do Esquema de Permutação em Blocos

**Documento**: `BLOCK_PERMUTATION_SCHEME`  
**Identificador Constitucional**: `OFI-CONFIRMATION-SETUP-001`  
**Status**: **CONGELADO ANTES DA ADMISSÃO DE DADOS CONFIRMATÓRIOS**  
**Timestamp UTC**: `2026-09-03T03:38:00.000Z`  

---

## 1. Justificativa Teórica A Priori do Tamanho do Bloco ($B = 10$)

O teste de permutação i.i.d. padrão falha ao avaliar séries temporais financeiras porque destrói a dependência serial e o agrupamento de volatilidade (*volatility clustering*), inflando artificialmente a taxa de rejeição da hipótese nula.

Para contornar essa fragilidade assintótica, adotamos o método de **Block Permutation** (Politis & Romano, 1994; Kunsch, 1989; Politis & White, 2004):

1. **Memória de Volatilidade e Fluxo em Criptoativos**:
   - A modelagem empírica de processos GARCH(1,1) e Hawkes em dados intradiários e horários de BTC/ETH indica uma meia-vida típica de agrupamento de volatilidade e regimes de liquidez entre **7 e 14 dias calendários**.
2. **Bloco Primário ($B = 10$)**:
   - Com avaliações diárias não-sobrepostas ($H=24\text{h}$ às 00:00 UTC), cada observação $i$ corresponde a 1 dia completo de mercado ($24\text{h}$).
   - Fixamos **$B = 10$ observações não-sobrepostas** (correspondente a **$240\text{ horas} = 10\text{ dias}$ contínuos**) como o tamanho do bloco primário.
   - Esse horizonte é suficiente para manter intactas as micro-estruturas semanais e os clusters locais de volatilidade dentro de cada bloco, destruindo unicamente a correlação entre os blocos de fluxo e os blocos de retornos futuros.
3. **Grade de Sensibilidade Pré-Registrada ($B \in \{5, 10, 20, 30\}$)**:
   - Para garantir que o veredito não dependa da escolha arbitrária de $B=10$, o teste executará compulsoriamente a análise de sensibilidade pré-registrada com blocos de **5 dias** (curto), **10 dias** (primário), **20 dias** (médio) e **30 dias** (regime mensal completo).

---

## 2. Mecanismo Exato de Permutação em Blocos

Dado o vetor de pares observados $(\mathbf{X}, \mathbf{Y}) = \{(X_i, Y_i)\}_{i=1}^N$, onde:
- $X_i = \text{CumOFI}_{t_i}(L=6h)$
- $Y_i = \ln(C_{t_i+24h} / C_{t_i})$

### A. Decomposição em Blocos
1. O número total de blocos é $K = \lceil N / B \rceil$.
2. Os primeiros $K-1$ blocos possuem tamanho exato $B$.
3. **Tratamento de Blocos Incompletos**:
   - Se $N \pmod B = 0$, todos os $K$ blocos possuem tamanho $B$.
   - Se $N \pmod B = r \ne 0$, o último bloco $K$ possui tamanho natural $r$.
   - **Regra de Não-Descarte:** Nenhuma observação é descartada ou truncada, e nenhuma observação artificial é gerada via padding sintético.

### B. Unidade da Permutação
- Mantém-se o vetor de retornos $\mathbf{Y}$ estritamente fixo e intacto em sua ordem cronológica original: $\mathbf{Y} = (Y_1, \dots, Y_N)$.
- Permutam-se os $K$ blocos de features:
  $$\tilde{\mathbf{X}} = (\mathbf{X}_{\pi(1)}, \mathbf{X}_{\pi(2)}, \dots, \mathbf{X}_{\pi(K)})$$
  onde $\pi$ é uma permutação aleatória de $\{1, \dots, K\}$ gerada pelo algoritmo de Fisher-Yates alimentado pelo PRNG determinístico Mulberry32 com semente congelada `424242`.
- O tamanho do bloco final incompleto $\mathbf{X}_K$ acompanha seu bloco original durante o embaralhamento.

### C. Cálculo da Distribuição Nula e $p$-valor
Para $M_{\text{perm}} = 1.000$ replicações:
1. Calcula-se $IC^{(m)} = \text{PearsonCorr}(\tilde{\mathbf{X}}^{(m)}, \mathbf{Y})$.
2. O $p$-valor empírico bilateral da permutação em blocos é calculado rigorosamente como:
   $$p_{\text{block}} = \frac{1 + \sum_{m=1}^{M_{\text{perm}}} \mathbb{I}\left( |IC^{(m)}| \ge |IC_{\text{obs}}| \right)}{M_{\text{perm}} + 1}$$
3. **Critério PASS**: $p_{\text{block}} < 0.05$ no bloco primário $B=10$, e não inversão de sinal ($IC^{(m)} \ge |IC_{\text{obs}}|$ ocorrendo em $< 10\%$ das permutações) em toda a grade de sensibilidade $B \in \{5, 20, 30\}$.
