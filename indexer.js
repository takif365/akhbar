import fs from 'fs';
import crypto from 'crypto';
import path from 'path';

async function runIndexer() {
    try {
        const keyData = JSON.parse(process.env.GCP_SERVICE_ACCOUNT);
        const urlPath = path.join(process.cwd(), 'latest_url.txt');
        
        if (!fs.existsSync(urlPath)) {
            process.exit(0);
        }
        
        const targetUrl = fs.readFileSync(urlPath, 'utf8').trim();
        let isPublished = false;
        let attempts = 0;

        while (attempts < 30) {
            attempts++;
            try {
                const bustUrl = `${targetUrl}?nocache=${Date.now()}`;
                const checkRes = await fetch(bustUrl, { method: 'HEAD' });
                if (checkRes.status === 200) {
                    isPublished = true;
                    break;
                }
            } catch (e) {}
            await new Promise(r => setTimeout(r, 20000));
        }

        if (!isPublished) {
            process.exit(0);
        }

        const headerObj = { alg: 'RS256', typ: 'JWT' };
        const header = Buffer.from(JSON.stringify(headerObj)).toString('base64url');
        
        const iat = Math.floor(Date.now() / 1000);
        const exp = iat + 3600;
        const payloadObj = {
            iss: keyData.client_email,
            scope: 'https://www.googleapis.com/auth/indexing',
            aud: 'https://oauth2.googleapis.com/token',
            exp: exp,
            iat: iat
        };
        const payload = Buffer.from(JSON.stringify(payloadObj)).toString('base64url');
        
        const signer = crypto.createSign('RSA-SHA256');
        signer.update(`${header}.${payload}`);
        const signature = signer.sign(keyData.private_key, 'base64url');
        
        const jwt = `${header}.${payload}.${signature}`;

        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`
        });
        
        const tokenData = await tokenRes.json();
        if (!tokenData.access_token) {
            process.exit(1);
        }

        await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tokenData.access_token}`
            },
            body: JSON.stringify({
                url: targetUrl,
                type: 'URL_UPDATED'
            })
        });

    } catch (err) {
        process.exit(1);
    }
}

runIndexer();
