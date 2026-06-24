# VoiceTurk VPS Deployment

Huong dan nay dung cho cau truc hien tai cua repo:

- Frontend Vite nam trong `frontend/`, nhung lenh `npm install` va `npm run build` chay tu thu muc goc `VoiceTurk`.
- Backend Express/Prisma nam trong `backend/`.
- Frontend build ra `frontend/dist`.
- Backend chay o port `4000`.

## 1. Code tren GitHub

Repo hien tai:

```bash
git@github.com:Kunsosad/VoiceTurk.git
```

Neu can cap nhat code tu may local:

```bash
git status
git add .
git commit -m "ready to deploy"
git push
```

## 2. Tro domain ve VPS

Trong DNS domain, tao 3 ban ghi A:

```text
@    -> IP_VPS_CUA_BAN
www  -> IP_VPS_CUA_BAN
api  -> IP_VPS_CUA_BAN
```

Cho DNS cap nhat khoang 5-30 phut.

## 3. Dang nhap VPS

```bash
ssh root@IP_VPS_CUA_BAN
```

## 4. Cai phan mem tren VPS

```bash
apt update
apt upgrade -y
apt install -y git curl nginx ufw
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
npm install -g pm2
node -v
npm -v
```

## 5. Clone code

```bash
cd /var/www
git clone git@github.com:Kunsosad/VoiceTurk.git
cd VoiceTurk
ls
```

Neu VPS chua cau hinh SSH key GitHub, dung HTTPS:

```bash
git clone https://github.com/Kunsosad/VoiceTurk.git
```

## 6. Cau hinh backend

```bash
cd /var/www/VoiceTurk/backend
nano .env
```

Noi dung mau, thay domain va secret:

```env
PORT=4000
DATABASE_URL="file:./prod.db"
CORS_ORIGIN=https://domain-cua-ban.com
AUTH_DEMO_MODE=true
JWT_SECRET=thay-bang-chuoi-random-it-nhat-32-ky-tu
JWT_EXPIRES_IN=1h
AGORA_MOCK_MODE=true
AGORA_APP_ID=
AGORA_APP_CERTIFICATE=
AGORA_TOKEN_TTL_SECONDS=3600
AGORA_AGENT_NAME=VoiceTurk AI Customer
AGORA_CONTRIBUTOR_UID=1002
SOLANA_MOCK_MODE=true
SOLANA_NETWORK=solana-devnet
AUDIO_UPLOAD_MAX_BYTES=10485760
```

## 7. Build va chay backend

```bash
cd /var/www/VoiceTurk/backend
npm install
npm run prisma:generate
npx prisma migrate deploy
npm run build
pm2 start dist/index.js --name voiceturk-backend
pm2 save
pm2 startup
```

Sau `pm2 startup`, neu terminal in ra mot lenh `sudo env ...`, copy va chay lai lenh do.

Kiem tra backend:

```bash
pm2 status
curl http://localhost:4000/api/health
```

## 8. Cau hinh va build frontend

Luu y: khong chay `npm install` trong `frontend/` vi thu muc do khong co `package.json`.

```bash
cd /var/www/VoiceTurk
nano frontend/.env
```

Noi dung:

```env
VITE_USE_REAL_API=true
VITE_API_BASE_URL=https://api.domain-cua-ban.com
VITE_GOOGLE_CLIENT_ID=google-oauth-web-client-id.apps.googleusercontent.com
```

De nut "Continue with Google" hoat dong, tao OAuth Web Client trong Google Cloud va them authorized JavaScript origin:

```text
https://domain-cua-ban.com
```

Voi domain demo hien tai:

```env
VITE_GOOGLE_CLIENT_ID=604757618847-tlp0kngnbum40nh699g3ro4jacvb5v76.apps.googleusercontent.com
```

Build frontend:

```bash
cd /var/www/VoiceTurk
npm install
npm run build
ls frontend/dist
```

Neu thay `index.html` la dung.

## 9. Cau hinh Nginx

```bash
nano /etc/nginx/sites-available/voiceturk
```

Thay `domain-cua-ban.com` bang domain that:

```nginx
server {
    listen 80;
    server_name domain-cua-ban.com www.domain-cua-ban.com;

    root /var/www/VoiceTurk/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}

server {
    listen 80;
    server_name api.domain-cua-ban.com;

    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Kich hoat Nginx:

```bash
ln -s /etc/nginx/sites-available/voiceturk /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

## 10. Mo firewall

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
ufw status
```

## 11. Test HTTP

Mo trinh duyet:

```text
http://domain-cua-ban.com
http://api.domain-cua-ban.com/api/health
```

Neu API health tra `ok`, backend da di qua Nginx thanh cong.

## 12. Bat HTTPS

```bash
apt install -y snapd
snap install core
snap refresh core
apt remove -y certbot
snap install --classic certbot
ln -sf /snap/bin/certbot /usr/bin/certbot
certbot --nginx -d domain-cua-ban.com -d www.domain-cua-ban.com -d api.domain-cua-ban.com
```

Khi Certbot hoi redirect HTTP sang HTTPS, chon redirect.

## 13. Test cuoi

```text
https://api.domain-cua-ban.com/api/health
https://domain-cua-ban.com
```

Sau do test login, campaign, recording va upload audio.

Neu API loi:

```bash
pm2 logs voiceturk-backend
```

## 14. Cap nhat sau nay

Moi lan sua code va push len GitHub, vao VPS:

```bash
cd /var/www/VoiceTurk
git pull
```

Cap nhat backend:

```bash
cd /var/www/VoiceTurk/backend
npm install
npm run prisma:generate
npx prisma migrate deploy
npm run build
pm2 restart voiceturk-backend
```

Cap nhat frontend:

```bash
cd /var/www/VoiceTurk
npm install
npm run build
systemctl reload nginx
```

Neu vua them hoac sua `VITE_GOOGLE_CLIENT_ID`, phai build lai frontend tu thu muc goc `VoiceTurk` nhu tren. Khong build trong `frontend/` vi thu muc do khong co `package.json`.

## 15. Kiem tra Google login sau deploy

Mo tab an danh:

```text
https://domain-cua-ban.com
```

Bam `Continue with Google`.

Neu loi, mo DevTools va kiem tra:

```text
POST https://api.domain-cua-ban.com/api/auth/google-login
```

Cac loi thuong gap:

```text
404 /api/auth/google-login
```

Backend tren VPS chua pull code moi hoac PM2 chua restart.

```text
VITE_GOOGLE_CLIENT_ID is missing
```

Chua tao `frontend/.env` tren VPS hoac chua build lai frontend sau khi them bien.

```text
origin_not_allowed
```

Google Cloud OAuth Client chua them dung Authorized JavaScript origin, vi du `https://domain-cua-ban.com`.
