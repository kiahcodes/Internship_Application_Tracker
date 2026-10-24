import "dotenv/config";

/**
 * Sends an email through SMTP_URL (e.g. smtps://user:pass@smtp.gmail.com) when it is set.
 * Without it the message is printed to the server console, which is what you want in development:
 * copy the reset link from there.
 */
export async function sendMail({ to, subject, text }) {
  if (!process.env.SMTP_URL) {
    console.log(`\n[mail] To: ${to}\n[mail] Subject: ${subject}\n${text}\n`);
    return;
  }
  const { default: nodemailer } = await import("nodemailer");
  const transport = nodemailer.createTransport(process.env.SMTP_URL);
  await transport.sendMail({ from: process.env.MAIL_FROM || "Internship Tracker <no-reply@localhost>", to, subject, text });
}
