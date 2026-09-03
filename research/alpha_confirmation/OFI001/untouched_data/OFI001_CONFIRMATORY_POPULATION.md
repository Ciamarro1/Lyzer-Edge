# OFI001 — População Confirmatória & Protocolo de Admissão de Dados

**Identificador**: `OFI001_CONFIRMATORY_POPULATION`  
**Cutoff Temporal Constitucional ($T_0$)**: `1788220800000` (**2026-09-01 00:00:00 UTC**)  
**Status**: **CONGELADO ANTES DA AQUISIÇÃO**  
**Timestamp UTC**: `2026-09-03T03:42:00.000Z`  

---

## 1. Definição da População Temporal Intacta

A população de teste é definida estritamente pelo intervalo contínuo $[T_0, T_1]$:
- **$T_0$ (Início Estrito)**: `2026-09-01 00:00:00 UTC` (`1788220800000` ms).
- **$T_1$ (Término)**: Timestamp do término da coleta formalmente auditada, respeitando $N \ge N^*$ ou $N \ge 365$ observações diárias.
- **Proibição Inviolável**: Nenhuma observação com timestamp $< T_0$ poderá ser admitida ou lida pelo runner confirmatório.

---

## 2. Ativos e Campos Mandatórios

### A. Ativos Admitidos
1. **`BTCUSDT`**: Ativo Primário Central.
2. **`ETHUSDT`**: Ativo de Replicação Direta.
3. **`SOLUSDT`**: Ativo de Replicação Secundária / Exploratória (opcional).

### B. Schema de Dados Requerido
Cada barra horária deve conter rigorosamente:
```json
{
  "timestamp": 1788220800000,
  "open": 64500.0,
  "high": 64850.0,
  "low": 64300.0,
  "close": 64720.0,
  "volume": 1250.45,
  "close_time": 1788224399999,
  "quote_volume": 80929110.0,
  "trades": 45200,
  "taker_buy_volume": 680.20,
  "taker_buy_quote_volume": 44022544.0
}
```

---

## 3. Protocolo de Auditoria de Admissão Pré-Firewall

Antes de qualquer dataset ser aceito no cofre `untouched_data/`, ele deve passar obrigatoriamente pelas seguintes 9 etapas de verificação forense:

1. **Timestamp Monotonicity**: Verificação de que $t_{k+1} > t_k$ para todo $k$.
2. **Filtro de Cutoff $T_0$**: Rejeição imediata se qualquer registro possuir $t < T_0$.
3. **Detecção de Gaps**: Tolerância zero para gaps não documentados na cadência horária ($t_{k+1} - t_k = 3.600.000\text{ ms}$).
4. **Detecção de Duplicatas**: Tolerância zero para timestamps duplicados.
5. **Completude de Valores**: Tolerância zero para valores `null`, `undefined` ou `NaN` em preços e volumes.
6. **Consistência de Volume Taker**: Garantia de que $0 \le V^{\text{taker\_buy}} \le V^{\text{total}}$.
7. **Timezone**: Validação de que os timestamps estão referenciados estritamente em Unix Epoch Milliseconds em UTC.
8. **Hashing Criptográfico**: Cálculo do hash SHA-256 de cada arquivo de dados antes da admissão.
9. **Registro no Manifesto**: Inclusão dos hashes calculados no `OFI_CONFIRMATION_SETUP_MANIFEST.json`.

---

## 4. Auditoria de Fechamento do Firewall

Após a admissão e o congelamento dos dados:
- O diretório `untouched_data/` é lacrado como somente-leitura.
- Nenhuma alteração nos scripts de execução será permitida.
- O executor executará um único passe determinístico fail-closed.
