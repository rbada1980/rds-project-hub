const fs = require("fs");
const path = require("path");
const b64File = path.join(__dirname, "whitecap2-excel-b64.txt");
if (!fs.existsSync(b64File)) { console.log("ERROR: whitecap2-excel-b64.txt not found"); process.exit(1); }
const b64 = fs.readFileSync(b64File, "utf8").trim();
const buf = Buffer.from(b64, "base64");
const out = path.join(__dirname, "whitecap2-new.xlsx");
fs.writeFileSync(out, buf);
console.log("Written: " + out + " (" + buf.length + " bytes)");
