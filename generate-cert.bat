@echo off
echo Generating self-signed SSL certificate for HTTPS (Chrome notifications)...
if not exist certs mkdir certs
openssl req -x509 -newkey rsa:2048 ^
  -keyout certs\key.pem ^
  -out certs\cert.pem ^
  -days 3650 -nodes ^
  -subj "/CN=192.168.0.159" ^
  -addext "subjectAltName=IP:192.168.0.159,IP:127.0.0.1"
echo.
echo Done! Restart the server: node server.js
echo Then open https://192.168.0.159:8443 in Chrome,
echo accept the security warning once, and notifications will work.
pause
