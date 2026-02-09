const nodemailer = require('nodemailer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

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

async function sendWhatsApp(config, message, filePath = null) {
    // Example using UltraMsg API
    if (config.provider === 'ultramsg') {
        const instanceId = process.env.WHATSAPP_INSTANCE_ID || config.instanceId;
        const token = process.env.WHATSAPP_TOKEN || config.token;

        try {
            // First send the text message
            const chatUrl = `https://api.ultramsg.com/${instanceId}/messages/chat`;
            await axios.post(chatUrl, {
                token: token,
                to: config.recipient,
                body: message
            });
            console.log('WhatsApp message sent successfully');

            // Then send the file if provided
            if (filePath && fs.existsSync(filePath)) {
                const fileUrl = `https://api.ultramsg.com/${instanceId}/messages/document`;
                // For UltraMsg, we typically send a URL or Base64. 
                // Since this runs in GitHub Actions, we'll use their 'document' endpoint with a public URL 
                // or if using local file, we might need to upload it.
                // UltraMsg also supports sending local files via multipart/form-data
                const FormData = require('form-data');
                const form = new FormData();
                form.append('token', token);
                form.append('to', config.recipient);
                form.append('filename', path.basename(filePath));
                form.append('document', fs.createReadStream(filePath));

                await axios.post(fileUrl, form, {
                    headers: form.getHeaders()
                });
                console.log('WhatsApp document sent successfully');
            }
        } catch (error) {
            console.error('Error sending WhatsApp:', error.response ? error.response.data : error.message);
        }
    } else {
        console.log('WhatsApp provider not configured. Message:', message);
    }
}

module.exports = { sendEmail, sendWhatsApp };
