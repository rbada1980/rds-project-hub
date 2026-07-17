const https = require('https');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

function request(method, url, body) {
  return new Promise((resolve) => {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    const req = https.request(url, opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', e => resolve({ status: 'NETWORK_ERROR', body: e.message }));
    if (body) req.write(body);
    req.end();
  });
}

async function main() {
  const base = 'https://192.168.0.159:8443';

  // Test GET
  const get = await request('GET', base + '/api/settings');
  console.log('=== GET /api/settings ===');
  console.log('Status:', get.status);
  console.log('Body (first 500):', get.body.slice(0, 500));
  console.log('');

  // Test POST upsert
  const post = await request('POST', base + '/api/settings/upsert',
    JSON.stringify({ key: 'test_billing_save', value: '"ok"' }));
  console.log('=== POST /api/settings/upsert ===');
  console.log('Status:', post.status);
  console.log('Body:', post.body);
}
main().catch(console.error);
