import { IncomingMessage } from "http";
import { BaseWebSocketService } from "./sockets-manager";
import { WebSocket } from "ws";
import fs from 'fs';
import path from 'path';

export class LogStreamService extends BaseWebSocketService {
    private logs: any[] = [];
    private currentIndex = 0;

    // handleClientConnection(ws: WebSocket, req: IncomingMessage): void {
    //     if (req.url !== "/admin/log-stream") {
    //         ws.close();
    //         return;
    //     }

    //     ws.on("message", (message: Buffer) => {
    //         this.sendLogs(ws);
    //     });

    //     ws.on("close", () => {
    //         console.log("Log stream WebSocket connection closed");
    //     });
    // }

    protected onMessage(ws: WebSocket, message: Buffer, req: IncomingMessage): void {
        this.sendLogs(ws);
    }

    private async fetchLogs(existingLogs: any[] = []): Promise<any[]> {
        try {
            const formattedDate = new Date().toISOString().split("T")[0];
            const logFilePath = path.join(process.cwd(), `logs/log-${formattedDate}.log`);
            const logData = fs.readFileSync(logFilePath, "utf8");

            return logData
                .split("\n")
                .filter(line => line.trim() !== "")
                .map((line, index) => {
                    const [timestamp, ...messageParts] = line.split(/ (info|error|warn): /);
                    const type = line.includes("error:") ? "error" : line.includes("warn:") ? "warn" : "info";
                    return {
                        id: Date.now() + index,
                        timestamp: timestamp.replace(/[\[\]]/g, "").trim(),
                        message: messageParts.join(` ${type}: `).trim(),
                        type,
                    };
                })
                .reverse()
                .filter(entry =>
                    !existingLogs.some(existing =>
                        existing.timestamp === entry.timestamp && existing.message === entry.message
                    )
                );
        } catch (error) {
            console.error("Error reading log:", error);
            return [];
        }
    }

    private async sendLogs(ws: WebSocket): Promise<void> {
        if (ws.readyState !== ws.OPEN) return;

        if (this.currentIndex >= this.logs.length) {
            this.logs = await this.fetchLogs(this.logs);
            this.currentIndex = 0;
            if (this.logs.length === 0) {
                setTimeout(() => this.sendLogs(ws), 1000);
                return;
            }
        }

        const batch = this.logs.slice(this.currentIndex, this.currentIndex + 50);
        ws.send(JSON.stringify(batch));
        this.currentIndex += 50;
        setTimeout(() => this.sendLogs(ws), 500);
    }
}