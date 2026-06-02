import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private from: string;
  private readonly logger = new Logger(MailService.name);

  constructor(private config: ConfigService) {
    const host = config.get<string>('SMTP_HOST', 'smtp.mailgun.org');
    const port = config.get<number>('SMTP_PORT', 587);
    const user = config.get<string>('SMTP_USER', '');
    const pass = config.get<string>('SMTP_PASS', '');
    this.from = config.get<string>('SMTP_FROM', user);

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  async sendWelcome(email: string, name: string, password: string): Promise<void> {
    const loginUrl = 'https://crm-rainland.vercel.app/login';
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#1e293b">
        <div style="background:#2563EB;padding:24px 32px;border-radius:8px 8px 0 0">
          <h1 style="color:#fff;margin:0;font-size:22px">Welcome to Rainland CRM</h1>
        </div>
        <div style="border:1px solid #e2e8f0;border-top:none;padding:32px;border-radius:0 0 8px 8px">
          <p style="margin:0 0 16px">Hi <strong>${name}</strong>,</p>
          <p style="margin:0 0 24px;color:#64748b">Your CRM account has been created. Use the details below to log in.</p>

          <table style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:16px 24px;width:100%;border-spacing:0">
            <tr><td style="padding:6px 0;color:#64748b;font-size:13px;width:90px">Email</td><td style="padding:6px 0;font-weight:600">${email}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b;font-size:13px">Password</td><td style="padding:6px 0;font-weight:600;font-family:monospace;letter-spacing:1px">${password}</td></tr>
          </table>

          <div style="margin:28px 0 8px;text-align:center">
            <a href="${loginUrl}"
               style="background:#2563EB;color:#fff;text-decoration:none;padding:12px 32px;border-radius:6px;font-weight:600;display:inline-block;font-size:15px">
              Log In to CRM →
            </a>
          </div>

          <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;text-align:center">
            Please change your password after your first login.<br/>
            <a href="${loginUrl}" style="color:#2563EB">${loginUrl}</a>
          </p>
        </div>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: `"Rainland CRM" <${this.from}>`,
        to: email,
        subject: 'Welcome to Rainland CRM — Your Login Details',
        html,
        text: `Hi ${name},\n\nYour Rainland CRM account has been created.\n\nLogin: ${loginUrl}\nEmail: ${email}\nPassword: ${password}\n\nPlease change your password after first login.`,
      });
      this.logger.log(`Welcome email sent to ${email}`);
    } catch (err) {
      this.logger.error(`Failed to send welcome email to ${email}: ${err.message}`);
    }
  }
}
