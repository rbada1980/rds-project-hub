// GET /api/push/vapid-public-key — returns VAPID public key for browser subscription
export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.json({ key: "BMTLOA2w7j72nZQd64u_WR2dNKpDcdDiAP92vs_BJY7l2v23qQaw9Xbwimu4Y62U2rjJ9A0rSNM1SYS_6wBDHq4" });
}
