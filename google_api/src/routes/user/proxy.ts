import { Router, Request, Response } from "express";
import https, { RequestOptions } from "https";

const storageProxyRouter: Router = Router();

storageProxyRouter.use('/storage/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    // Build the target path for the Googleusercontent URL.
    const targetPath: string = `/drive-storage/${id}`;

    // Clone and modify the request headers.
    const headers = { ...req.headers } as { [key: string]: string };
    delete headers.host;
    headers['Host'] = 'lh3.googleusercontent.com';
    headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

    const options: RequestOptions = {
        hostname: 'lh3.googleusercontent.com',
        port: 443,
        path: targetPath,
        method: req.method,
        headers: headers,
    };

    // Create an HTTPS request to the target URL.
    const proxyReq = https.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
    });

    proxyReq.on('error', (err: Error) => {
        console.error('Proxy request error:', err);
        res.status(500).send('An error occurred while proxying the request.');
    });

    // Forward the client request body (if any) to the target.
    req.pipe(proxyReq, { end: true });
});

export default storageProxyRouter;