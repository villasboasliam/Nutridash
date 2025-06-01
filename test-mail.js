// test-mail.js
require('dotenv').config({ path: '.env.local' }); // carrega exatamente o .env.local

const nodemailer = require('nodemailer');

async function main() {
  console.log("👉 Configuração SMTP:", {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    user: process.env.SMTP_USER,
  });

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  const info = await transporter.sendMail({
    from: `"Teste NutriDash" <${process.env.EMAIL_FROM}>`,
    to: "seu_email@dominio.com",
    subject: "📧 Teste SMTP",
    text: "Se você recebeu este e-mail, seu SMTP está OK!",
  });

  console.log("E-mail enviado:", info.messageId);
}

main().catch(err => {
  console.error("Erro no teste SMTP:", err);
  process.exit(1);
});
