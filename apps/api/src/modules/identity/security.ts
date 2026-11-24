import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { Algorithm, hash, verify } from '@node-rs/argon2';

export async function hashPassword(password: string): Promise<string> {
  return hash(password, {
    algorithm: Algorithm.Argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });
}

export async function verifyPassword(encoded: string, password: string): Promise<boolean> {
  try {
    return await verify(encoded, password);
  } catch {
    return false;
  }
}

export function digestToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function encryptionKey(material: string): Buffer {
  return /^[a-f\d]{64}$/i.test(material)
    ? Buffer.from(material, 'hex')
    : createHash('sha256').update(material).digest();
}

export function encryptField(plaintext: string, keyMaterial: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(keyMaterial), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return `v1:${iv.toString('base64url')}:${cipher.getAuthTag().toString('base64url')}:${ciphertext.toString('base64url')}`;
}

export function decryptField(encoded: string, keyMaterial: string): string {
  const [version, ivPart, tagPart, payload] = encoded.split(':');
  if (version !== 'v1' || !ivPart || !tagPart || !payload)
    throw new Error('Unsupported encrypted field format.');
  const decipher = createDecipheriv(
    'aes-256-gcm',
    encryptionKey(keyMaterial),
    Buffer.from(ivPart, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(payload, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

export function randomToken(): string {
  return randomBytes(32).toString('base64url');
}
