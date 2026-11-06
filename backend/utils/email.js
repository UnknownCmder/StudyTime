const nodemailer = require('nodemailer');

function getTransporter() {
    const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASSWORD } = process.env;
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) {
        throw new Error('SMTP 설정이 없습니다. backend/.env의 이메일 발송 설정을 확인해주세요.');
    }

    return nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT || 587),
        secure: SMTP_SECURE === 'true',
        auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
    });
}

async function sendVerificationCode(email, code) {
    const transporter = getTransporter();
    await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email,
        subject: 'StudyTime 이메일 인증 코드',
        text: `StudyTime 회원가입 인증 코드는 ${code}입니다. 이 코드는 10분 동안 유효합니다.`,
        html: `<p>StudyTime 회원가입 인증 코드입니다.</p><p style="font-size:24px;font-weight:bold;letter-spacing:4px">${code}</p><p>이 코드는 10분 동안 유효합니다.</p>`,
    });
}

module.exports = { sendVerificationCode };
