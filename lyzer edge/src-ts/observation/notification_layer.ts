import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

dotenv.config();

interface FIELRecord {
  timestamp: string;
  actor: string;
  operation_attempted: string;
  observations_scope: string[];
  cao_violation_type: string | null;
  solicited: boolean;
  event_type: string;
}

export class NotificationLayer {
  private transporter: nodemailer.Transporter | null = null;
  private isConfigured: boolean = false;

  constructor() {
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user,
          pass,
        },
      });
      this.isConfigured = true;
    } else {
      console.warn('[NOTIFICATION LAYER] SMTP credentials not found in .env. Notifications disabled.');
    }
  }

  public async sendCSBAlert(workspaceRoot: string): Promise<void> {
    if (!this.isConfigured || !this.transporter) {
      return;
    }

    try {
      const logPath = join(workspaceRoot, 'data', 'fiel_transition.log');
      const logContent = readFileSync(logPath, 'utf-8');
      
      // We extract the last FIEL record (assuming the file has the JSON blocks)
      // For the email, we just send the raw text of the log to prevent any analysis or interpretation.
      
      const mailOptions = {
        from: process.env.SMTP_USER,
        to: process.env.NOTIFICATION_EMAIL || process.env.SMTP_USER,
        subject: '[LYZER LABS] CSB Alcançado - FIEL Guilhotina Acionada',
        text: `O FIEL registrou um evento EMPIRICAL.\n\nDetalhes Brutos do Log:\n\n${logContent}\n\n---\nLyzer Labs - Notification Layer`,
      };

      console.log('\n[NOTIFICATION LAYER] Dispatching SMTP alert to operator...');
      await this.transporter.sendMail(mailOptions);
      console.log('[NOTIFICATION LAYER] Alert dispatched successfully.');
    } catch (error) {
      console.error('[NOTIFICATION LAYER] Failed to send alert:', error);
    }
  }
}
