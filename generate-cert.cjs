// generate-cert.cjs
// Generates a self-signed SSL cert with IP SAN — no openssl needed.
// Uses node-forge (auto-installed if missing).
//
// Run: node generate-cert.cjs

const { execFileSync, execSync } = require("child_process");
const fs   = require("fs");
const path = require("path");

const IP = "192.168.0.159";

// Auto-install node-forge if not present, then re-spawn so require() finds it
try {
  require.resolve("node-forge");
} catch {
  console.log("Installing node-forge (one-time)...");
  execSync("npm install node-forge", { stdio: "inherit", cwd: __dirname });
  console.log("Done. Restarting script...\n");
  execFileSync(process.execPath, [__filename], { stdio: "inherit", cwd: __dirname });
  process.exit(0);
}

const forge = require("node-forge");

console.log("Generating 2048-bit RSA key pair...");
const keys = forge.pki.rsa.generateKeyPair(2048);
const cert = forge.pki.createCertificate();

cert.publicKey = keys.publicKey;
cert.serialNumber = "01";
cert.validity.notBefore = new Date();
cert.validity.notAfter  = new Date();
cert.validity.notAfter.setDate(cert.validity.notBefore.getDate() + 3650);

const attrs = [
  { name: "commonName",       value: IP },
  { name: "organizationName", value: "RDS Local" },
];
cert.setSubject(attrs);
cert.setIssuer(attrs);

// SAN with IP — required by Chrome since 2017
cert.setExtensions([{
  name: "subjectAltName",
  altNames: [
    { type: 7, ip: IP },
    { type: 7, ip: "127.0.0.1" },
  ],
}]);

cert.sign(keys.privateKey, forge.md.sha256.create());

const certsDir = path.join(__dirname, "certs");
if (!fs.existsSync(certsDir)) fs.mkdirSync(certsDir);

fs.writeFileSync(path.join(certsDir, "key.pem"),  forge.pki.privateKeyToPem(keys.privateKey));
fs.writeFileSync(path.join(certsDir, "cert.pem"), forge.pki.certificateToPem(cert));

console.log("\n✓ SSL certificate generated!");
console.log("  certs/key.pem  — private key");
console.log("  certs/cert.pem — certificate (IP SAN: " + IP + ")");
console.log("\nNext steps:");
console.log("  1. Restart the server: node server.js");
console.log("  2. Open https://" + IP + ":8443 in Chrome");
console.log("  3. Click Advanced → Proceed (accept once)");
console.log("  4. Chrome notifications now work!\n");
