

// client side 
class FileUploader {
    private ws: WebSocket;
    private token: string;
    private readonly CHUNK_SIZE = 1024 * 1024; // 1MB chunks

    constructor(token: string) {
        this.token = token;
        this.ws = new WebSocket('ws://your-server-url/ws');
        this.setupWebSocket();
    }

    private setupWebSocket() {
        this.ws.onopen = () => {
            // Authenticate immediately after connection
            this.ws.send(JSON.stringify({
                type: 'auth',
                token: this.token
            }));
        };

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);

            switch (data.type) {
                case 'progress':
                    this.handleProgress(data);
                    break;
                case 'complete':
                    this.handleComplete(data);
                    break;
                case 'error':
                    this.handleError(data);
                    break;
            }
        };
    }

    private handleProgress(data: { filename: string; percentage: number }) {
        console.log(`Upload progress for ${data.filename}: ${data.percentage}%`);
        // Update UI with progress
    }

    private handleComplete(data: { filename: string; fileId: string }) {
        console.log(`Upload complete for ${data.filename}`);
        // Handle successful upload
    }

    private handleError(data: { message: string }) {
        console.error('Upload error:', data.message);
        // Handle error in UI
    }

    public async uploadFile(file: File) {
        const totalChunks = Math.ceil(file.size / this.CHUNK_SIZE);

        for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
            const start = chunkIndex * this.CHUNK_SIZE;
            const end = Math.min(start + this.CHUNK_SIZE, file.size);
            const chunk = file.slice(start, end);

            // Read chunk as base64
            const base64Chunk = await this.readChunkAsBase64(chunk);

            // Send chunk
            this.ws.send(JSON.stringify({
                type: 'upload',
                filename: file.name,
                contentType: file.type,
                content: base64Chunk,
                chunkIndex,
                totalChunks
            }));

            // Wait for the WebSocket to be ready for the next chunk
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    private readChunkAsBase64(chunk: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64Content = (reader.result as string).split(',')[1];
                resolve(base64Content);
            };
            reader.onerror = reject;
            reader.readAsDataURL(chunk);
        });
    }
}

// Usage example:
const uploader = new FileUploader('your-auth-token');

// Upload a file
document.getElementById('fileInput')?.addEventListener('change', (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
        uploader.uploadFile(file);
    }
});