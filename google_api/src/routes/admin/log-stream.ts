// adminLogStream.ts
import { Server as WebSocketServer } from 'ws';
import fs from 'fs';
import path from 'path';
import { Server } from 'http';

export function setupAdminLogStream(server: Server) {
    const wss = new WebSocketServer({ server });

    wss.on('connection', (ws, req) => {
        // Sirf "/admin/log-stream" wale requests ko handle karo
        if (req.url !== '/admin/log-stream') {
            ws.close();
            return;
        }
        console.log('New admin log stream WebSocket connection established');

        let currentIndex = 0;
        let logs: any[] = [];

        // Log file se data fetch karne ka function
        const fetchLogs = async (existingLogs: any[] = []) => {
            try {
                const formattedDate = new Date().toISOString().split('T')[0];
                const logFilePath = path.join(process.cwd(), `logs/log-${formattedDate}.log`);
                const logData = fs.readFileSync(logFilePath, 'utf8');
                const logEntries = logData
                    .split('\n')
                    .filter(line => line.trim() !== '')
                    .map((line, index) => {
                        const [timestamp, ...messageParts] = line.split(/ (info|error|warn): /);
                        const type = line.includes('error:') ? 'error'
                            : line.includes('warn:') ? 'warn'
                                : 'info';
                        return {
                            id: Date.now() + index, // Unique ID generation
                            timestamp: timestamp.replace(/[\[\]]/g, '').trim(),
                            message: messageParts.join(` ${type}: `).trim(),
                            type,
                        };
                    })
                    .reverse() // Latest logs sabse pehle
                    .filter(entry =>
                        !existingLogs.some(existingLog =>
                            existingLog.timestamp === entry.timestamp &&
                            existingLog.message === entry.message
                        )
                    );
                return logEntries;
            } catch (error) {
                console.error('Error tracking log:', error);
                return [];
            }
        };

        // Logs ko batch mein client tak bhejne ka function
        const sendLogs = async () => {
            if (ws.readyState !== ws.OPEN) return;

            if (currentIndex >= logs.length) {
                // Agar sab logs bhej diye hain to naye logs fetch karo
                // logs = await fetchLogs(logs);
                currentIndex = 0;
                if (logs.length === 0) {
                    return setTimeout(sendLogs, 1000); // 1 second ke baad dobara check karo
                }
            }

            // Batch of 50 logs bhejo
            const batch = logs.slice(currentIndex, currentIndex + 50);
            ws.send(JSON.stringify(batch));
            currentIndex += 50;

            // 500ms ka delay batch ke beech mein
            setTimeout(sendLogs, 500);
        };

        sendLogs();

        ws.on('close', () => {
            console.log('Admin log stream WebSocket connection closed');
        });
    });
}
