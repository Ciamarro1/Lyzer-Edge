import http from 'http';

export function sendInterpretationToHub(record) {
    const data = JSON.stringify(record);

    const options = {
        hostname: '127.0.0.1',
        port: 8080,
        path: '/',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data),
        },
    };

    const req = http.request(options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => { responseData += chunk; });
        res.on('end', () => {
            console.log(`[IPC] Hub acknowledged V1 Interpretation: ${responseData}`);
        });
    });

    req.on('error', (e) => {
        console.error(`[IPC ERROR] Failed to reach Rust Hub: ${e.message}`);
    });

    req.write(data);
    req.end();
}
