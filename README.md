# Social Media Weekly Tracker

Automated tool to track Instagram and Facebook follower counts every Saturday at 10 AM.

## Features
- Scrapes follower counts using Puppeteer.
- Tracks history and calculates weekly increase/decrease.
- Sends reports via Email (Nodemailer).
- Sends notifications via WhatsApp (UltraMsg).

## Setup
1. Update `config.json` with:
   - Client URLs.
   - Email credentials (use App Passwords for Gmail).
   - WhatsApp API credentials.
2. Run `npm install` to install dependencies.

## Usage
- **To schedule the tracker**: `node tracker.js` (Keep the terminal open or use a process manager like PM2).
- **To run immediately for testing**: `node tracker.js --run`

## Scheduling on Windows
Instead of keeping a terminal open, you can use Windows Task Scheduler:
1. Open Task Scheduler.
2. Create Basic Task -> "Weekly" -> "Saturday" -> "10:00 AM".
3. Action: "Start a program".
4. Program/script: `node`.
5. Add arguments: `c:\project\social media\tracker.js --run`.
6. Start in: `c:\project\social media`.
