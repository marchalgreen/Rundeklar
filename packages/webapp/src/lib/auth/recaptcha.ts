/**
 * reCAPTCHA v3 integration for bot detection
 * Uses Google reCAPTCHA v3 which runs in the background
 */

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || ''

// Helper to safely get server-side environment variables
// Only access process.env when running in Node.js (server-side)
function getServerEnv(key: string, defaultValue: string = ''): string {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] || defaultValue
  }
  return defaultValue
}

/**
 * Load reCAPTCHA script if not already loaded
 */
export function loadRecaptchaScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if script already loaded
    if (document.querySelector('script[src*="recaptcha"]')) {
      resolve()
      return
    }

    // Check if site key is configured
    if (!RECAPTCHA_SITE_KEY) {
      // Fail open: if reCAPTCHA not configured, allow requests
      console.warn('reCAPTCHA site key not configured, skipping bot detection')
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => {
      console.warn('Failed to load reCAPTCHA script, allowing request')
      resolve() // Fail open
    }
    document.head.appendChild(script)
  })
}

/**
 * Execute reCAPTCHA v3 and get token
 * @param action - Action name (e.g., 'login', 'register')
 * @returns reCAPTCHA token or null if not configured
 */
export async function executeRecaptcha(action: string): Promise<string | null> {
  if (!RECAPTCHA_SITE_KEY) {
    return null // Fail open if not configured
  }

  try {
    await loadRecaptchaScript()

    // Wait for grecaptcha to be available
    let attempts = 0
    while (typeof (window as any).grecaptcha === 'undefined' && attempts < 50) {
      await new Promise((resolve) => setTimeout(resolve, 100))
      attempts++
    }

    if (typeof (window as any).grecaptcha === 'undefined') {
      console.warn('reCAPTCHA not loaded, allowing request')
      return null // Fail open
    }

    const token = await (window as any).grecaptcha.execute(RECAPTCHA_SITE_KEY, {
      action
    })

    return token
  } catch (error) {
    console.warn('reCAPTCHA execution failed, allowing request', error)
    return null // Fail open
  }
}

/**
 * Verify reCAPTCHA token on server side
 * @param token - reCAPTCHA token from client
 * @param action - Expected action name
 * @returns Score (0.0 to 1.0) or null if verification failed
 */
export async function verifyRecaptchaToken(
  token: string,
  action: string
): Promise<{ success: boolean; score: number; error?: string }> {
  // Get secret key only when running server-side
  const RECAPTCHA_SECRET_KEY = getServerEnv('RECAPTCHA_SECRET_KEY', '')
  
  if (!RECAPTCHA_SECRET_KEY) {
    // Fail open if not configured
    return { success: true, score: 1.0 }
  }

  if (!token) {
    return { success: false, score: 0.0, error: 'No token provided' }
  }

  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        secret: RECAPTCHA_SECRET_KEY,
        response: token
      })
    })

    const data = await response.json()

    if (!data.success) {
      return {
        success: false,
        score: 0.0,
        error: data['error-codes']?.join(', ') || 'Verification failed'
      }
    }

    // Verify action matches
    if (data.action !== action) {
      return {
        success: false,
        score: 0.0,
        error: 'Action mismatch'
      }
    }

    // Score threshold: 0.5 (adjust based on your needs)
    // Lower scores indicate bot-like behavior
    const score = data.score || 0.0
    const threshold = parseFloat(getServerEnv('RECAPTCHA_SCORE_THRESHOLD', '0.5'))

    return {
      success: score >= threshold,
      score
    }
  } catch (error) {
    console.error('reCAPTCHA verification error', error)
    // Fail open: if verification fails, allow request (availability over perfect security)
    return { success: true, score: 1.0 }
  }
}



