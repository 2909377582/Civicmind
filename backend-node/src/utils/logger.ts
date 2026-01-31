import fs from 'fs';
import path from 'path';

export function debugLog(message: string, data?: any) {
    const logPath = path.resolve(__dirname, '../../debug_log.txt');
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n${data ? JSON.stringify(data, null, 2) + '\n' : ''}\n`;
    try {
        fs.appendFileSync(logPath, logEntry);
        // Also log to console for immediate visibility if run in terminal
        console.log(`[DEBUG] ${message}`);
    } catch (err) {
        console.error('Failed to write to debug log:', err);
    }
}
