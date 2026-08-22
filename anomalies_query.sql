-- 1. Identificar Buracos Temporais (Time-Gaps) maiores que 5 minutos na causal_memory.db
-- Indica restarts, crashes ou downtime sistêmico
WITH OrderedLogs AS (
    SELECT timestamp,
           lag(timestamp) OVER (ORDER BY timestamp) AS prev_timestamp
    FROM court_ledger
)
SELECT 
    prev_timestamp,
    timestamp,
    (timestamp - prev_timestamp) AS gap_ms,
    (timestamp - prev_timestamp) / 60000.0 AS gap_mins
FROM OrderedLogs
WHERE gap_ms > 300000 -- Maior que 5 minutos
ORDER BY gap_ms DESC;

-- 2. Anomalias de Latência (Não encontradas nos payloads da base analisada,
-- porém esta query busca menções de métricas de lentidão)
SELECT * 
FROM court_ledger
WHERE state_json LIKE '%latency%' 
   OR state_json LIKE '%slippage%'
ORDER BY timestamp DESC;

-- 3. Exceções não tratadas (Busca por crashes, erros no ledger)
SELECT timestamp, reason, request_json 
FROM court_ledger
WHERE reason LIKE '%error%' 
   OR reason LIKE '%exception%' 
   OR reason LIKE '%crash%'
   OR request_json LIKE '%error%';

-- 4. Eventos de "Ontological Collapse" e "Lethal Stability Illusion"
SELECT timestamp, verdict, reason, request_json
FROM court_ledger
WHERE request_json LIKE '%VETO_ONTOLOGICAL_COLLAPSE%'
   OR reason = 'VETO_LETHAL_STABILITY_ILLUSION'
ORDER BY timestamp DESC;

-- 5. Estatística de Motivos de Veto/Anomalias
SELECT reason, COUNT(*) as qty
FROM court_ledger
GROUP BY reason
ORDER BY qty DESC;
