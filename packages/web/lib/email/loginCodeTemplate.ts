// src/lib/email/loginCodeTemplate.ts
/**
 * Login code email.
 * Table layout + inline styles for maximum client compatibility.
 * Modern clients get SVG. Outlook gets PNG via MSO conditionals.
 * All attributes use single quotes to avoid naive src="/ href=" prefixers.
 */

export function renderLoginEmail(opts: {
  code: string;
  brand?: { name?: string; logoUrl?: string; logoPngUrl?: string };
  supportUrl?: string;
  minutesValid?: number;
}) {
  const { code, brand = {}, supportUrl, minutesValid = 5 } = opts;

  const assetOrigin = (
    process.env.EMAIL_ASSET_ORIGIN || 'https://clairity-zeta.vercel.app'
  ).replace(/\/$/, '');

  // Public assets by default, can be overridden
  const logoSvg = brand.logoUrl ?? `${assetOrigin}/branding/Clairity_purple_text.svg`;
  const logoPng = brand.logoPngUrl ?? `${assetOrigin}/branding/Clairity_purple_text.png`;

  const supportHref =
    supportUrl && /^https?:\/\//i.test(supportUrl) ? supportUrl : `${assetOrigin}/support`;

  const brandName = brand.name ?? 'Clairity';
  const safeCode = String(code).padStart(6, '0').slice(0, 6);
  const boxes = safeCode.split('');
  const subject = `${brandName}: Din login-kode`;

  const html = `
  <!doctype html>
  <html lang='da'>
    <head>
      <meta charset='utf-8'>
      <meta name='color-scheme' content='light only'>
      <meta name='viewport' content='width=device-width, initial-scale=1'>
      <title>${subject}</title>
    </head>
    <body style='margin:0;padding:0;background:#f4f6fb;'>
      <table role='presentation' cellspacing='0' cellpadding='0' border='0' align='center' width='100%' style='background:#f4f6fb;padding:32px 12px;'>
        <tr>
          <td align='center'>
            <table role='presentation' cellspacing='0' cellpadding='0' border='0' width='600' style='max-width:600px;background:#ffffff;border-radius:16px;box-shadow:0 24px 60px rgba(0,0,0,.10);overflow:hidden;'>
              <tr>
                <td style='padding:28px 24px 0 24px;background:
                  radial-gradient(120% 120% at 50% -20%, rgba(99,102,241,.12), rgba(255,255,255,0) 60%),
                  linear-gradient(180deg, #ffffff, #fbfbfe);'>
                  <table width='100%' role='presentation' cellspacing='0' cellpadding='0' border='0'>
                    <tr>
                      <td align='center' style='padding-bottom:16px;'>
                        <!--[if mso]>
                          <img src='${logoPng}' width='160' height='40' alt='${brandName}' style='display:block;border:0;outline:none;text-decoration:none;' />
                        <![endif]-->
                        <!--[if !mso]><!-- -->
                          <img src='${logoSvg}' width='160' height='40' alt='${brandName}' style='display:block;height:40px;width:auto;opacity:.95;border:0;outline:none;text-decoration:none;' />
                        <!--<![endif]-->
                      </td>
                    </tr>
                    <tr>
                      <td align='center' style='font:600 20px/1.3 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0b1324;padding:0 12px;'>
                        Din ${brandName} login-kode
                      </td>
                    </tr>
                    <tr>
                      <td align='center' style='font:400 14px/1.6 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#5b6476;padding:8px 24px 18px;'>
                        Indtast koden nedenfor. Koden udløber om ${minutesValid} minutter.
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Code boxes -->
              <tr>
                <td align='center' style='padding:6px 24px 20px 24px;background:
                  radial-gradient(140% 120% at 50% 0%, rgba(59,130,246,.08), rgba(255,255,255,0) 60%),
                  linear-gradient(180deg, #ffffff, #fbfbfe);'>
                  <table role='presentation' cellspacing='8' cellpadding='0' border='0' style='margin:0 auto;'>
                    <tr>
                      ${boxes
                        .map(
                          (ch) => `
                        <td align='center' style='width:48px;height:56px;border-radius:12px;border:1px solid #e6e8f0;background:#ffffff;box-shadow:inset 0 1px 0 rgba(255,255,255,.7), 0 6px 16px rgba(31,41,55,.08);'>
                          <div style='font:700 22px/56px ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;color:#0b1324;'>${ch}</div>
                        </td>`
                        )
                        .join('')}
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Help -->
              <tr>
                <td align='center' style='padding:8px 24px 28px;'>
                  <p style='margin:0;font:400 13px/1.6 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#5b6476;'>
                    Hvis ikke du bad om denne kode, kan du ignorere denne e-mail.
                    <br />
                    Har du brug for hjælp? <a href='${supportHref}' style='color:#2563eb;text-decoration:none;'>Support</a>
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td align='center' style='padding:16px 24px 28px;border-top:1px solid #eef0f6;background:#fafbff;'>
                  <p style='margin:0;font:400 12px/1.6 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#828a9a;'>
                    © ${new Date().getFullYear()} ${brandName}
                  </p>
                </td>
              </tr>
            </table>

            <div style='height:24px;'></div>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `.trim();

  const text = `${brandName} – din login-kode: ${safeCode}
Indtast koden i appen. Koden udløber om ${minutesValid} minutter.
Har du brug for hjælp? ${supportHref}`;

  return { subject, html, text };
}
