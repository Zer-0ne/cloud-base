"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var http_1 = require("http");
var http_proxy_1 = require("http-proxy");
var proxy = http_proxy_1.default.createProxyServer({});
var errorHandler = function (err, req, res) {
    console.error(err);
    res.status(500).send('Internal Server Error');
};
var server = http_1.default.createServer(function (req, res) {
    var _a;
    if ((_a = req.url) === null || _a === void 0 ? void 0 : _a.startsWith('/api')) {
        proxy.web(req, res, {
            target: 'http://localhost:5000',
        }, errorHandler);
    }
    else {
        proxy.web(req, res, {
            target: 'http://localhost:3000',
        }, errorHandler);
    }
});
server.listen(80, function () {
    console.log('Server is running on port 80');
});
