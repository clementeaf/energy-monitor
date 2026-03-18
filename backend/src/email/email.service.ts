import { Injectable, Logger } from '@nestjs/common';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const FROM = process.env.EMAIL_FROM || 'noreply@energymonitor.click';
const REGION = process.env.AWS_REGION || 'us-east-1';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly ses = new SESClient({ region: REGION });

  async sendInvitation(to: string, name: string, roleLabel: string, inviteUrl: string) {
    const subject = 'Invitación a Energy Monitor';
    const html = `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #fff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #1B1464; margin: 0;">Energy Monitor</h2>
          <p style="color: #6B7280; font-size: 14px; margin: 4px 0 0;">Parque Arauco</p>
        </div>
        <p style="color: #1F2937; font-size: 14px; line-height: 1.6;">
          Hola <strong>${name}</strong>,
        </p>
        <p style="color: #1F2937; font-size: 14px; line-height: 1.6;">
          Has sido invitado a la plataforma Energy Monitor con el rol de <strong>${roleLabel}</strong>.
        </p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${inviteUrl}" style="display: inline-block; background: #3D3BF3; color: #fff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 14px; font-weight: 600;">
            Aceptar invitación
          </a>
        </div>
        <p style="color: #6B7280; font-size: 12px; line-height: 1.5;">
          Este enlace expira en 7 días. Si no solicitaste esta invitación, puedes ignorar este correo.
        </p>
      </div>
    `;

    try {
      await this.ses.send(new SendEmailCommand({
        Source: FROM,
        Destination: { ToAddresses: [to] },
        Message: {
          Subject: { Data: subject, Charset: 'UTF-8' },
          Body: { Html: { Data: html, Charset: 'UTF-8' } },
        },
      }));
      this.logger.log(`Invitation email sent to ${to}`);
    } catch (err) {
      this.logger.error(`Failed to send invitation email to ${to}: ${(err as Error).message}`);
    }
  }
}
