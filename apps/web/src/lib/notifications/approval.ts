import { randomBytes } from 'crypto';
import nodemailer from 'nodemailer';
import twilio from 'twilio';

const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';
const SMS_ENABLED = String(process.env.SMS_ENABLED || '').toLowerCase() === 'true';
const DEFAULT_COUNTRY_CODE = (process.env.DEFAULT_COUNTRY_CODE || '216').replace(/\s+/g, '');

function isPlaceholder(value?: string) {
  if (!value) return true;
  const normalized = value.trim().toLowerCase();
  return normalized.startsWith('your-') || normalized.includes('placeholder') || normalized.includes('example.com');
}

export function normalizePhone(phone?: string) {
  if (!phone) return '';
  const trimmed = phone.trim();
  if (trimmed.startsWith('+')) return trimmed;
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith(DEFAULT_COUNTRY_CODE)) return `+${digits}`;
  return `+${DEFAULT_COUNTRY_CODE}${digits.replace(/^0+/, '')}`;
}

function buildApprovalEmailHtml(params: {
  firstName: string;
  lastName: string;
  loginEmail: string;
  temporaryPassword: string;
}) {
  const fullName = `${params.firstName} ${params.lastName}`.trim();

  return `
  <div style="margin:0;padding:0;background:#f5f7fb;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
    <div style="max-width:680px;margin:0 auto;padding:32px 16px;">
      <div style="background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,.08);border:1px solid #e5e7eb;">
        <div style="background:linear-gradient(135deg,#0f766e,#14b8a6);padding:28px 32px;color:#fff;">
          <div style="font-size:14px;letter-spacing:.08em;text-transform:uppercase;opacity:.9;">TunAgri</div>
          <h1 style="margin:10px 0 0;font-size:28px;line-height:1.2;">Votre compte a été approuvé</h1>
        </div>

        <div style="padding:32px;">
          <p style="font-size:16px;line-height:1.7;margin:0 0 16px;">Bonjour <strong>${fullName}</strong>,</p>
          <p style="font-size:15px;line-height:1.7;margin:0 0 20px;">
            Votre inscription a été validée avec succès. Vous pouvez désormais vous connecter à votre compte professionnel.
          </p>

          <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:14px;padding:20px 22px;margin:24px 0;">
            <p style="margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:#64748b;">Vos identifiants</p>
            <p style="margin:8px 0;font-size:15px;"><strong>Email :</strong> ${params.loginEmail}</p>
            <p style="margin:8px 0;font-size:15px;"><strong>Mot de passe temporaire :</strong> ${params.temporaryPassword}</p>
          </div>

          <div style="text-align:center;margin:28px 0 12px;">
            <a href="${APP_URL}/login" style="display:inline-block;background:#0f766e;color:#fff;text-decoration:none;padding:14px 24px;border-radius:9999px;font-weight:700;">Se connecter maintenant</a>
          </div>

          <p style="font-size:13px;line-height:1.7;color:#64748b;margin:20px 0 0;">
            Merci de modifier ce mot de passe dès votre première connexion pour sécuriser votre compte.
          </p>
        </div>
      </div>
    </div>
  </div>`;
}

export async function sendApprovalEmail(params: {
  to: string;
  firstName: string;
  lastName: string;
  loginEmail: string;
  temporaryPassword: string;
}) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (isPlaceholder(host) || isPlaceholder(user) || isPlaceholder(pass)) {
    console.warn('[mailer] SMTP env not configured, skipping email send');
    return;
  }

  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });

  await transport.sendMail({
    from: `TunAgri <${user}>`,
    to: params.to,
    subject: 'Votre compte a été approuvé',
    html: buildApprovalEmailHtml(params),
    text: `Bonjour ${params.firstName} ${params.lastName}, votre compte a été approuvé. Email: ${params.loginEmail}. Mot de passe temporaire: ${params.temporaryPassword}. Connectez-vous via ${APP_URL}/login.`,
  });
}

export async function sendApprovalSms(params: { to?: string; firstName: string; temporaryPassword: string; loginEmail: string }) {
  if (!SMS_ENABLED || !params.to) return;

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (isPlaceholder(accountSid) || isPlaceholder(authToken) || isPlaceholder(fromNumber)) {
    console.warn('[sms] Twilio env not configured, skipping SMS send');
    return;
  }

  const client = twilio(accountSid, authToken);
  const phone = normalizePhone(params.to);
  if (!phone) return;

  const message = `TunAgri: Bonjour ${params.firstName}, votre compte est approuve. Email: ${params.loginEmail}. Mot de passe temporaire: ${params.temporaryPassword}. Changez-le apres connexion.`;

  await client.messages.create({
    from: fromNumber,
    to: phone,
    body: message,
  });
}

export function generateTemporaryPassword(length = 12) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#%';
  const bytes = randomBytes(length);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
}

export function mapProfessionalToRole(professional: 'AGRICULTEUR' | 'FOURNISSEUR' | 'SPECIALIST' | 'CENTRE_DE_FORMATION') {
  if (professional === 'FOURNISSEUR') return 'SUPPLIER';
  if (professional === 'SPECIALIST') return 'AGRI_ENGINEER';
  if (professional === 'CENTRE_DE_FORMATION') return 'TRAINING_CENTER';
  return 'BUYER';
}
