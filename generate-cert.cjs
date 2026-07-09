// generate-cert.cjs
// Generates a self-signed SSL cert WITHOUT needing openssl installed.
// Uses the 'selfsigned' npm package (auto-installed if missing).
//
// Run: node generate-cert.cjs

const { execSync } = require("child_process");
const fs   = require("fs");
const path = require("path");

// Auto-install selfsigned if not present
try {
  require.resolve("selfsigned");
} catch {
  console.log("Installing selfsigned package (one-time)...");
  execSync("npm install --no-save selfsigned", { stdio: "inherit", cwd: __dirname });
}

const selfsigned = require("selfsigned");

const attrs = [{ name: "commonName", value: "192.168.0.159" }];
const pems  = selfsigned.generate(attrs, {
  days: 3650,
  algorithm: "sha256",
  extensions: [{
    name: "subjectAltName",
    altNames: [
      { type: 7, ip: "192.168.0.159" },
      { type: 7, ip: "127.0.0.1" },
    ],
  }],
});

const certsDir = path.join(__dirname, "certs");
if (!fs.existsSync(certsDir)) fs.mkdirSync(certsDir);

fs.writeFileSync(path.join(certsDir, "key.pem"),  pems.private);
fs.writeFileSync(path.join(certsDir, "cert.pem"), pems.cert);

console.log("\n✓ SSL certificate generated!");
console.log("  certs/key.pem  — private key");
console.log("  certs/cert.pem — self-signed certificate");
console.log("\nNext steps:");
console.log("  1. node server.js          ← restart server");
console.log("  2. Open https://192.168.0.159:8443 in Chrome");
console.log("  3. Click Advanced → Proceed (accept once)");
console.log("  4. Chrome notifications now work on the LAN server!\n");
