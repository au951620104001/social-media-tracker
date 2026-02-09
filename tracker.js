const fs = require('fs');
const path = require('path');
const { getFollowerCounts } = require('./scraper');
const { sendEmail, sendWhatsApp } = require('./notifier');
const cron = require('node-cron');
const ExcelJS = require('exceljs');

const CONFIG_PATH = path.join(__dirname, 'config.json');
const DB_PATH = path.join(__dirname, 'database.json');

async function runTracker() {
  console.log('Starting tracker at:', new Date().toLocaleString());

  if (!fs.existsSync(CONFIG_PATH)) {
    console.error('Config file not found!');
    return;
  }

  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  let db = { history: [], lastRun: null };

  if (fs.existsSync(DB_PATH)) {
    db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  }

  const reportData = [];
  const currentDate = new Date().toISOString().split('T')[0];

  for (const client of config.clients) {
    console.log(`\n--- Processing client: ${client.name} ---`);

    const stats = {
      name: client.name,
      date: currentDate,
      instagram: 0,
      facebook: 0,
      linkedin: 0,
      igDiff: 0,
      fbDiff: 0,
      liDiff: 0
    };

    if (client.instagram) {
      stats.instagram = await getFollowerCounts(client.instagram, 'instagram');
    }
    if (client.facebook) {
      stats.facebook = await getFollowerCounts(client.facebook, 'facebook');
    }
    if (client.linkedin) {
      stats.linkedin = await getFollowerCounts(client.linkedin, 'linkedin');
    }

    // Calculate diff from last entry in history for this client
    const lastEntry = db.history.filter(h => h.name === client.name).sort((a, b) => new Date(b.date) - new Date(a.date))[0];

    if (lastEntry) {
      stats.igDiff = stats.instagram - (lastEntry.instagram || 0);
      stats.fbDiff = stats.facebook - (lastEntry.facebook || 0);
      stats.liDiff = stats.linkedin - (lastEntry.linkedin || 0);
    }

    reportData.push(stats);
    db.history.push(stats);
  }

  db.lastRun = new Date().toISOString();
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));

  // Generate Report
  const emailHtml = generateEmailHtml(reportData);
  const waMessage = generateWAMessage(reportData);
  const excelPath = await generateExcel(reportData);

  // Send Notifications
  // Note: Only send if credentials are not placeholders
  if (config.email.pass !== 'REPLACE_WITH_YOUR_GMAIL_APP_PASSWORD') {
    const attachments = [
      {
        filename: `SocialMediaReport_${currentDate}.xlsx`,
        path: excelPath
      }
    ];
    await sendEmail(config.email, emailHtml, attachments);
    // Cleanup excel file after sending
    if (fs.existsSync(excelPath)) fs.unlinkSync(excelPath);
  } else {
    console.log('Email skip: Placeholder password detected.');
  }

  if (process.env.WHATSAPP_TOKEN || (config.whatsapp.token !== 'REPLACE_WITH_YOUR_TOKEN' && config.whatsapp.token !== '')) {
    await sendWhatsApp(config.whatsapp, waMessage);
  } else {
    console.log('WhatsApp skip: No token detected.');
  }

  console.log('\n--- Tracker run completed ---');
  console.log('Final data:', JSON.stringify(reportData, null, 2));
}

function generateEmailHtml(data) {
  let rows = '';
  data.forEach(client => {
    const diffIcon = (diff) => diff >= 0 ? `<span style="color:green">↑ ${diff}</span>` : `<span style="color:red">↓ ${Math.abs(diff)}</span>`;

    rows += `
      <tr>
        <td style="padding:10px; border:1px solid #ddd">${client.name}</td>
        <td style="padding:10px; border:1px solid #ddd; text-align:center">${client.instagram}<br>${diffIcon(client.igDiff)}</td>
        <td style="padding:10px; border:1px solid #ddd; text-align:center">${client.facebook}<br>${diffIcon(client.fbDiff)}</td>
        <td style="padding:10px; border:1px solid #ddd; text-align:center">${client.linkedin || 'N/A'}<br>${client.linkedin ? diffIcon(client.liDiff) : ''}</td>
      </tr>
    `;
  });

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
      <h2 style="color:#2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">Weekly Social Media Performance Report</h2>
      <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
      <table style="width:100%; border-collapse:collapse; margin-top: 20px;">
        <thead>
          <tr style="background:#34495e; color: white;">
            <th style="padding:12px; border:1px solid #ddd">Client</th>
            <th style="padding:12px; border:1px solid #ddd">Instagram</th>
            <th style="padding:12px; border:1px solid #ddd">Facebook</th>
            <th style="padding:12px; border:1px solid #ddd">LinkedIn</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      <p style="color:#7f8c8d; font-size: 12px; margin-top: 20px;">Automated Report generated on ${new Date().toLocaleString()}</p>
    </div>
  `;
}

function generateWAMessage(data) {
  let msg = `📊 *Weekly Social Media Report*\n📅 ${new Date().toLocaleDateString()}\n\n`;
  data.forEach(client => {
    const icon = (diff) => diff >= 0 ? '📈' : '📉';
    msg += `*${client.name}*\n`;
    msg += `IG: ${client.instagram} (${icon(client.igDiff)} ${client.igDiff})\n`;
    msg += `FB: ${client.facebook} (${icon(client.fbDiff)} ${client.fbDiff})\n`;
    if (client.linkedin) msg += `LI: ${client.linkedin} (${icon(client.liDiff)} ${client.liDiff})\n`;
    msg += `\n`;
  });
  msg += `Visit your dashboard for more details!`;
  return msg;
}

async function generateExcel(data) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Social Media Report');

  worksheet.columns = [
    { header: 'Client Name', key: 'name', width: 25 },
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Instagram Followers', key: 'instagram', width: 20 },
    { header: 'IG Weekly Diff', key: 'igDiff', width: 15 },
    { header: 'Facebook Followers', key: 'facebook', width: 20 },
    { header: 'FB Weekly Diff', key: 'fbDiff', width: 15 },
    { header: 'LinkedIn Followers', key: 'linkedin', width: 20 },
    { header: 'LI Weekly Diff', key: 'liDiff', width: 15 }
  ];

  data.forEach(item => {
    worksheet.addRow(item);
  });

  // Basic styling
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };

  const fileName = `report_${Date.now()}.xlsx`;
  const filePath = path.join(__dirname, fileName);
  await workbook.xlsx.writeFile(filePath);
  return filePath;
}

// Check for command line argument to run immediately
if (process.argv.includes('--run')) {
  runTracker();
} else {
  // Read config to check schedule
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    cron.schedule(config.schedule || '0 10 * * 6', () => {
      runTracker();
    });
    console.log(`Tracker scheduled for Saturdays at 10:00 AM (${config.schedule || '0 10 * * 6'})`);
  } catch (e) {
    console.error('Failed to schedule tracker:', e.message);
  }
}
