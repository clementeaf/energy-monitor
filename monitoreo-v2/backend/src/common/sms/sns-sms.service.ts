import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

@Injectable()
export class SnsSmsService {
  private readonly logger = new Logger(SnsSmsService.name);
  private readonly client: SNSClient | null;

  constructor(private readonly config: ConfigService) {
    const region = config.get<string>('SNS_REGION') ?? config.get<string>('AWS_REGION') ?? 'us-east-1';
    this.client = new SNSClient({ region });
  }

  async sendSms(phoneNumber: string, message: string): Promise<{ ok: boolean; messageId?: string; error?: string }> {
    if (!this.client) {
      this.logger.log(`[SMS] (no client) → ${phoneNumber}: ${message}`);
      return { ok: false, error: 'SNS client not initialized' };
    }

    // Normalize Chilean numbers: 9XXXXXXXX → +569XXXXXXXX
    const normalized = this.normalizePhone(phoneNumber);
    if (!normalized) {
      this.logger.warn(`[SMS] Invalid phone number: ${phoneNumber}`);
      return { ok: false, error: 'Invalid phone number' };
    }

    try {
      const result = await this.client.send(
        new PublishCommand({
          PhoneNumber: normalized,
          Message: message,
          MessageAttributes: {
            'AWS.SNS.SMS.SenderID': {
              DataType: 'String',
              StringValue: 'GlobePower',
            },
            'AWS.SNS.SMS.SMSType': {
              DataType: 'String',
              StringValue: 'Transactional',
            },
          },
        }),
      );
      this.logger.log(`[SMS] sent MessageId=${result.MessageId} to=${normalized}`);
      return { ok: true, messageId: result.MessageId };
    } catch (err) {
      const msg = (err as Error).message;
      this.logger.error(`[SMS] failed to=${normalized}: ${msg}`);
      return { ok: false, error: msg };
    }
  }

  private normalizePhone(phone: string): string | null {
    const digits = phone.replace(/\D/g, '');
    // +56 9 XXXX XXXX (Chilean mobile)
    if (digits.length === 9 && digits.startsWith('9')) return `+56${digits}`;
    if (digits.length === 11 && digits.startsWith('569')) return `+${digits}`;
    if (digits.length === 12 && digits.startsWith('569')) return `+${digits}`;
    // Already has country code
    if (phone.startsWith('+') && digits.length >= 10) return `+${digits}`;
    return null;
  }
}
