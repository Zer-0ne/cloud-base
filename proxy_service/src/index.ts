import http from 'http';
import httpProxy from 'http-proxy'

const proxy = httpProxy.createProxyServer({})

const errorHandler = (err: any, req: any, res: any) => {
    console.error(err)
    res.status(500).send('Internal Server Error')
}

const server = http.createServer((req, res) => {
    if (req.url?.startsWith('/api')) {
        proxy.web(req, res, {
            target: 'http://localhost:5000',
        }, errorHandler)
    } else {
        proxy.web(req, res, {
            target: 'http://localhost:3000',
        }, errorHandler)
    }
})

server.listen(80, () => {
    console.log('Server is running on port 80')
})