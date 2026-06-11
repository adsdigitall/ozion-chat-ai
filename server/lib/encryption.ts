import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production-32!';

export function encrypt(text: string): string {
  return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
}

export function decrypt(cipherText: string): string {
  const bytes = CryptoJS.AES.decrypt(cipherText, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

export function hashSha256(text: string): string {
  return CryptoJS.SHA256(text).toString();
}

export function hashPhone(phone: string): string {
  const cleaned = phone.replace(/[^0-9]/g, '');
  return CryptoJS.SHA256(cleaned).toString();
}

export function hashEmail(email: string): string {
  const normalized = email.toLowerCase().trim();
  return CryptoJS.SHA256(normalized).toString();
}
