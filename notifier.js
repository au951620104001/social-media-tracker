const nodemailer = require('nodemailer');
const axios = require('axios');

async function sendEmail(config, reportHtml, attachments = []) {
    const transporter = nodemailer.createTransport({
        service: config.service,
        auth: {
            user: config.user,
            pass: process.env.GMAIL_PASS || config.pass
        }
    });

    const mailOptions = {
        from: config.user,
        to: config.recipient,
        subject: `Weekly Social Media Report - ${new Date().toLocaleDateString()}`,
        html: reportHtml,
        attachments: attachments
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully');
    } catch (error) {
        console.error('Error sending email:', error.message);
    }
}

async function sendWhatsApp(config, message) {
    // Example using UltraMsg API
    if (config.provider === 'ultramsg') {
        const instanceId = process.env.WHATSAPP_INSTANCE_ID || config.instanceId;
        const url = `https://api.ultramsg.com/${instanceId}/messages/chat`;
        const data = {
            token: process.env.WHATSAPP_TOKEN || config.token,
            to: config.recipient,
            body: message
        };

        try {
            await axios.post(url, data);
            console.log('WhatsApp message sent successfully');
        } catch (error) {
            console.error('Error sending WhatsApp:', error.message);
        }
    } else {
        console.log('WhatsApp provider not configured. Message:', message);
    }
}

module.exports = { sendEmail, sendWhatsApp };
