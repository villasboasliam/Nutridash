import nodemailer from "nodemailer";

export async function sendPasswordResetEmailCustom(email: string, token: string) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });

  const resetUrl = `${process.env.NEXTAUTH_URL}/redefinir-senha?token=${token}`;

  await transporter.sendMail({
    from: `"NutriDash" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: "Redefina sua senha",
    html: `<p>Clique no link abaixo para redefinir sua senha. O link expira em 15 minutos:</p>
           <a href="${resetUrl}">${resetUrl}</a>`,
  });
}
