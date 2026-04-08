import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

type SendAdminInviteParams = {
  email: string;
  setupUrl: string;
  expiresAt: Date;
  invitedByEmail?: string;
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  private readonly enabled =
    (process.env.MAIL_ENABLED || 'false').toLowerCase() === 'true';

  private readonly from =
    process.env.MAIL_FROM || 'no-reply@ecommerce-platform.local';

  private readonly transporter = this.createTransporter();

  private createTransporter() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!this.enabled || !host || !user || !pass) {
      return null;
    }

    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });
  }

  isConfigured() {
    return Boolean(this.transporter);
  }

  async sendAdminInvite(params: SendAdminInviteParams) {
    if (!this.transporter) {
      this.logger.warn(
        `Admin invite email skipped for ${params.email}: SMTP not configured`,
      );
      return false;
    }

    const invitedByText = params.invitedByEmail
      ? `Ce compte a ete prepare par ${params.invitedByEmail}.`
      : 'Ce compte a ete prepare par votre super admin.';

    await this.transporter.sendMail({
      from: this.from,
      to: params.email,
      subject: 'Activation de votre compte admin',
      text: [
        'Bonjour,',
        '',
        invitedByText,
        'Utilisez le lien ci-dessous pour definir votre mot de passe :',
        params.setupUrl,
        '',
        `Ce lien expire le ${params.expiresAt.toLocaleString('fr-FR')}.`,
        '',
        "Si vous n'attendiez pas ce message, vous pouvez l'ignorer.",
      ].join('\n'),
      html: `
        <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
          <h2 style="color: #1E3A8A;">Activation de votre compte admin</h2>
          <p>Bonjour,</p>
          <p>${invitedByText}</p>
          <p>Utilisez ce lien pour definir votre mot de passe personnel :</p>
          <p>
            <a
              href="${params.setupUrl}"
              style="display: inline-block; background: #1E40AF; color: white; padding: 12px 18px; border-radius: 8px; text-decoration: none; font-weight: 700;"
            >
              Activer mon compte
            </a>
          </p>
          <p style="word-break: break-all; color: #4B5563;">${params.setupUrl}</p>
          <p>Ce lien expire le <strong>${params.expiresAt.toLocaleString('fr-FR')}</strong>.</p>
          <p>Si vous n'attendiez pas ce message, vous pouvez l'ignorer.</p>
        </div>
      `,
    });

    return true;
  }
}
