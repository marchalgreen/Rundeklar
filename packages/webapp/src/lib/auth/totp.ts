import speakeasy from 'speakeasy'
import QRCode from 'qrcode'
import crypto from 'crypto'

/**
 * Generate a TOTP secret for two-factor authentication
 * @returns TOTP secret object
 */
export function generateTOTPSecret() {
  return speakeasy.generateSecret({
    name: 'Herlev Hjorten',
    length: 32
  })
}

/**
 * Generate QR code data URL for TOTP setup
 * @param secret - TOTP secret
 * @param email - User email for label
 * @returns QR code data URL
 */
export async function generateQRCode(secret: string, email: string): Promise<string> {
  const otpauthUrl = speakeasy.otpauthURL({
    secret,
    label: email,
    issuer: 'Herlev Hjorten'
  })

  return await QRCode.toDataURL(otpauthUrl)
}

/**
 * Verify a TOTP code
 * @param secret - TOTP secret
 * @param token - TOTP code to verify
 * @param window - Time window for verification (default: 1)
 * @returns True if code is valid
 */
export function verifyTOTP(secret: string, token: string, window: number = 1): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window
  }) || false
}

/**
 * Generate backup codes for 2FA
 * @param count - Number of codes to generate (default: 10)
 * @returns Array of backup codes
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = []
  
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase()
    codes.push(code)
  }
  
  return codes
}

/**
 * Hash backup codes for storage
 * @param codes - Array of backup codes
 * @returns Array of hashed codes
 */
export function hashBackupCodes(codes: string[]): string[] {
  return codes.map(code => 
    crypto.createHash('sha256').update(code).digest('hex')
  )
}

/**
 * Verify a backup code against hashed codes
 * @param code - Plain backup code
 * @param hashedCodes - Array of hashed backup codes
 * @returns Index of matching code, or -1 if not found
 */
export function verifyBackupCode(code: string, hashedCodes: string[]): number {
  const codeHash = crypto.createHash('sha256').update(code.toUpperCase()).digest('hex')
  return hashedCodes.findIndex(hash => hash === codeHash)
}

