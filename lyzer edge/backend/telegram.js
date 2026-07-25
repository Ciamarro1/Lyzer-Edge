/**
 * Telegram Notification Service
 * Sends real-time trade signals, system alerts, and reports to a Telegram chat.
 * No external dependencies — uses native Node.js global fetch.
 */

export async function sendTelegramAlert(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const apiBase = process.env.TELEGRAM_API_URL || 'https://api.telegram.org';

  if (!token || !chatId) {
    throw new Error(`Configurações ausentes nos Secrets: BOT_TOKEN=${token ? 'Configurado' : 'Ausente'}, CHAT_ID=${chatId ? 'Configurado' : 'Ausente'}.`);
  }

  // Sanitize the URL to remove trailing slash if present
  const sanitizedBase = apiBase.replace(/\/$/, '');
  const url = `${sanitizedBase}/bot${token}/sendMessage`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });
    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(`Telegram API Error: ${res.status} - ${errorBody}`);
    }
  } catch (e) {
    throw new Error(`Erro ao conectar ao proxy/Telegram [API_BASE=${apiBase}]: ${e.message}`);
  }
}

export function formatTradeAlert(symbol, trade) {
  const isLong = trade.direction === 'LONG';
  const emoji = trade.governanceDecision === 'ALLOW' 
    ? (isLong ? '🟢' : '🔴') 
    : '⚠️';
  const action = isLong ? 'COMPRA (LONG)' : 'VENDA (SHORT)';
  const status = trade.governanceDecision === 'ALLOW' 
    ? '<b>EXECUTADA</b>' 
    : `<b>BLOQUEADA (ECA Veto)</b>\nMotivo: <i>${trade.reasonCodes?.[0] || 'Unknown Veto'}</i>`;

  return `
${emoji} <b>[LYZER EDGE] ALERTA DE OPERAÇÃO</b>
Par: <b>${symbol}</b>
Ação: <b>${action}</b>
Status: ${status}
Preço de Entrada: <b>$${trade.entryPrice.toLocaleString()}</b>
PNL Estimado: <b>${(trade.pnl * 100).toFixed(2)}%</b>
Modo: <b>${process.env.ARL_MODE || 'TESTNET'}</b>
`;
}

export function formatSystemAlert(title, message) {
  return `
ℹ️ <b>[LYZER SYSTEM] ALERTA DE EVENTO</b>
Título: <b>${title}</b>
Mensagem: <i>${message}</i>
`;
}

/**
 * Sends Telegram alert with exponential backoff retries.
 */
export async function sendTelegramAlertWithRetry(text, maxRetries = 3, initialDelayMs = 1000) {
  let delay = initialDelayMs;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await sendTelegramAlert(text);
      return;
    } catch (e) {
      if (attempt === maxRetries) {
        console.error(`[TELEGRAM RETRY EXHAUSTED] ${e.message}`);
        return;
      }
      console.warn(`[TELEGRAM RETRY] Attempt ${attempt}/${maxRetries} failed: ${e.message}. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
}
