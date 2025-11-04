import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY!);

export async function sendLoginLink(email: string, url: string) {
  await resend.emails.send({
    from: 'Clairity <noreply@clairity.app>',
    to: email,
    subject: 'Login link to Clairity',
    html: `<p>Click <a href="${url}">here</a> to log in.</p>`,
  });
}
