import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

export interface SesSendPlainTextResult {
  ok: boolean;
  messageId?: string;
  skippedReason?: 'not_configured' | 'no_recipients';
  errorMessage?: string;
}

/**
 * Outbound email via Amazon SES (SendEmail API). Uses default AWS credential chain
 * (e.g. Lambda execution role). Requires verified identities while account is in sandbox.
 */
@Injectable()
export class SesEmailService {
  private readonly client: SESClient | null;

  constructor(private readonly config: ConfigService) {
    const region = this.resolveRegion();
    this.client = this.getFromAddress() ? new SESClient({ region }) : null;
  }

  /**
   * @returns Verified From address, or null if SES outbound is disabled
   */
  getFromAddress(): string | null {
    const v = this.config.get<string>('SES_FROM_EMAIL');
    const trimmed = v?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : null;
  }

  /**
   * @returns AWS region for SES (defaults to SES_REGION, then AWS_REGION, then us-east-1)
   */
  resolveRegion(): string {
    return (
      this.config.get<string>('SES_REGION')?.trim() ||
      this.config.get<string>('AWS_REGION')?.trim() ||
      'us-east-1'
    );
  }

  /**
   * Sends a UTF-8 plain-text email when From is configured and `to` is non-empty.
   * @param params - Recipients, subject, and body
   */
  async sendPlainText(params: {
    to: string[];
    subject: string;
    body: string;
  }): Promise<SesSendPlainTextResult> {
    const from = this.getFromAddress();
    if (!from) {
      return { ok: false, skippedReason: 'not_configured' };
    }

    const to = params.to.map((e) => e.trim()).filter((e) => e.length > 0);
    if (to.length === 0) {
      return { ok: false, skippedReason: 'no_recipients' };
    }

    if (!this.client) {
      return { ok: false, skippedReason: 'not_configured' };
    }

    try {
      const out = await this.client.send(
        new SendEmailCommand({
          Source: from,
          Destination: { ToAddresses: to },
          Message: {
            Subject: { Data: params.subject, Charset: 'UTF-8' },
            Body: { Text: { Data: params.body, Charset: 'UTF-8' } },
          },
        }),
      );
      return { ok: true, messageId: out.MessageId };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, errorMessage: msg };
    }
  }
}
