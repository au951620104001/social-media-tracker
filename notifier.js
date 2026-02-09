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
    if (config.provider === 'ultramsg') {
        const instanceId = process.env.WHATSAPP_INSTANCE_ID || config.instanceId;
        const token = process.env.WHATSAPP_TOKEN || config.token;

        try {
            // 1. Send text message
            const chatUrl = `https://api.ultramsg.com/${instanceId}/messages/chat`;
            await axios.post(chatUrl, {
                token: token,
                to: config.recipient,
                body: message
            });
            console.log('WhatsApp message sent successfully');

            // 2. Send Excel file
            if (filePath && fs.existsSync(filePath)) {
                console.log(`Sending document to WhatsApp: ${filePath}`);
                const fileUrl = `https://api.ultramsg.com/${instanceId}/messages/document`;
                const FormData = require('form-data');
                const form = new FormData();
                form.append('token', token);
                form.append('to', config.recipient);
                form.append('filename', `SocialMediaReport_${new Date().toISOString().split('T')[0]}.xlsx`);
                form.append('document', fs.createReadStream(filePath));

                const response = await axios.post(fileUrl, form, {
                    headers: form.getHeaders(),
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity
                });
                console.log('WhatsApp document sent successfully');
            }
        } catch (error) {
            console.error('Error sending WhatsApp:', error.response ? JSON.stringify(error.response.data) : error.message);
        }
    } else {
        console.log('WhatsApp provider not configured.');
    }
}

module.exports = { sendEmail, sendWhatsApp };
