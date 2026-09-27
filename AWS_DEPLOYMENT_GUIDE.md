# ☁️ AWS Cloud Deployment & Infrastructure Guide
## Sri Krishna Constructions ERP & Payroll System

This guide outlines the production deployment architectures, database setup, and step-by-step instructions for deploying the **Sri Krishna Constructions ERP** to **Amazon Web Services (AWS)** with high availability, automated SSL, and zero cold starts.

---

## 🏛️ Recommended AWS Architecture Options

```
                    ┌───────────────────────────────┐
                    │      Client Browser / PWA     │
                    └───────────────┬───────────────┘
                                    │ HTTPS (Port 443)
                                    ▼
                    ┌───────────────────────────────┐
                    │  Amazon Route 53 (DNS / SSL)  │
                    └───────────────┬───────────────┘
                                    │
            ┌───────────────────────┴───────────────────────┐
            │                                               │
            ▼                                               ▼
┌───────────────────────┐                       ┌───────────────────────┐
│   Option A (Managed)  │                       │   Option B (EC2 VM)   │
│    AWS App Runner     │                       │  Ubuntu 22.04 + PM2   │
│   (Auto-Scaling Docker│                       │  + NGINX Reverse Proxy│
│     Container)        │                       │  + Let's Encrypt SSL  │
└───────────┬───────────┘                       └───────────┬───────────┘
            │                                               │
            └───────────────────────┬───────────────────────┘
                                    │ Private Subnet / VPC
                                    ▼
                    ┌───────────────────────────────┐
                    │   Amazon RDS PostgreSQL       │
                    │   (db.t4g.micro / db.t4g.small)│
                    │   - Automated Daily Backups   │
                    │   - ACID Row-Level Locking    │
                    │   - Multi-AZ High Availability│
                    └───────────────────────────────┘
```

---

## 🚀 Option 1: AWS App Runner + Amazon RDS (Recommended)

**AWS App Runner** is a fully managed container service that connects directly to your GitHub repository and Dockerfile. It eliminates server maintenance, provides zero cold starts, and automatically scales CPU/RAM.

### Step 1: Provision Amazon RDS PostgreSQL
1. Open the **AWS Management Console** and navigate to **Amazon RDS** $\rightarrow$ **Create database**.
2. Select:
   - **Database engine**: PostgreSQL (Version 16.x or 15.x).
   - **Template**: *Free Tier* (or *Production* for multi-AZ redundancy).
   - **DB instance identifier**: `skc-erp-production-db`.
   - **Master username**: `postgres`.
   - **Master password**: Generate a strong password (e.g. `SkcSecurePass2026!`).
   - **DB instance class**: `db.t4g.micro` (Free tier) or `db.t4g.small` (Production).
   - **Storage**: 20 GiB gp3 (enable storage autoscaling up to 100 GiB).
   - **Connectivity**: Enable **Public access** (or set up a VPC Connector if using private VPC).
   - **Initial database name**: `skc_db`.
3. Save the RDS **Endpoint** (e.g. `skc-erp-production-db.c123456789.ap-south-1.rds.amazonaws.com`).

### Step 2: Deploy Backend & Frontend via AWS App Runner
1. Navigate to **AWS App Runner** $\rightarrow$ **Create service**.
2. **Source**: Select **Source code repository** $\rightarrow$ Connect your GitHub account $\rightarrow$ Select repository `sri_krishna_constructions` and branch `main`.
3. **Deployment trigger**: Select **Automatic** (deploys on every `git push`).
4. **Build settings**:
   - Select **Use a Dockerfile** (uses the production multi-stage `Dockerfile` in the repository root).
   - **Port**: `5000`.
5. **Environment Variables**:
   ```env
   PORT=5000
   NODE_ENV=production
   DATABASE_URL=postgresql://postgres:SkcSecurePass2026!@skc-erp-production-db.c123456789.ap-south-1.rds.amazonaws.com:5432/skc_db?sslmode=no-verify
   JWT_SECRET=your_long_random_64_character_jwt_secret_key_here
   ```
6. **Auto-scaling**: 1 minimum instance (ensures 0s latency, no cold starts) up to 5 instances under heavy load.
7. Click **Create & Deploy**.

### Step 3: Configure Custom Domain & SSL (Route 53)
1. In App Runner, go to **Custom domains** $\rightarrow$ **Link domain** (e.g. `erp.srikrishnaconstructions.com`).
2. Add the generated CNAME records into **Amazon Route 53** (or your DNS registrar). AWS automatically provisions and renews free SSL/TLS certificates.

---

## 🖥️ Option 2: AWS EC2 (Single Ubuntu Virtual Machine + PM2 + NGINX)

Cost-effective solution for running on a single dedicated instance (`t4g.small` / `t3.small` at ~$12–$15/month).

### Step 1: Launch EC2 Instance
1. Launch an EC2 Instance:
   - **AMI**: Ubuntu Server 24.04 LTS (HVM)
   - **Instance Type**: `t4g.small` (ARM Graviton) or `t3.small` (x86_64)
   - **Storage**: 30 GiB gp3
   - **Security Group**: Allow Ports `22` (SSH), `80` (HTTP), `443` (HTTPS).

### Step 2: Server Provisioning Commands (SSH)
Connect via SSH and execute the following commands:

```bash
# 1. Update system packages
sudo apt update && sudo apt upgrade -y

# 2. Install Node.js 20 LTS & Build Tools
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git nginx certbot python3-certbot-nginx postgresql postgresql-contrib

# 3. Install PM2 process manager globally
sudo npm install -g pm2

# 4. Configure local PostgreSQL
sudo -u postgres psql -c "CREATE DATABASE skc_db;"
sudo -u postgres psql -c "CREATE USER skc_user WITH ENCRYPTED PASSWORD 'SkcSecurePass2026!';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE skc_db TO skc_user;"
sudo -u postgres psql -c "ALTER DATABASE skc_db OWNER TO skc_user;"
```

### Step 3: Clone Repository & Build Application
```bash
# Clone the repository
cd /var/www
sudo git clone https://github.com/vj-mazu/sri_krishna_constructions.git
sudo chown -R $USER:$USER /var/www/sri_krishna_constructions
cd sri_krishna_constructions

# Create server .env
cat << 'EOF' > server/.env
PORT=5000
DATABASE_URL=postgresql://skc_user:SkcSecurePass2026!@localhost:5432/skc_db
JWT_SECRET=super_secret_jwt_key_sri_krishna_constructions_2026
NODE_ENV=production
EOF

# Install dependencies and build client
cd client && npm ci && npm run build
cd ../server && npm ci && npx prisma generate
```

### Step 4: Configure PM2 Daemon Auto-Start
```bash
# Start backend using PM2
cd /var/www/sri_krishna_constructions/server
pm2 start src/server.js --name "skc-erp" -i max

# Save PM2 process list and configure systemd service
pm2 save
pm2 startup systemd
# (Run the sudo env command generated by PM2 startup)
```

### Step 5: Configure NGINX Reverse Proxy & Free SSL
Create `/etc/nginx/sites-available/skc-erp`:
```nginx
server {
    listen 80;
    server_name erp.srikrishnaconstructions.com;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site and provision SSL certificate:
```bash
sudo ln -s /etc/nginx/sites-available/skc-erp /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# Install free auto-renewing SSL certificate
sudo certbot --nginx -d erp.srikrishnaconstructions.com --non-interactive --agree-tos -m admin@srikrishnaconstructions.com
```

---

## 💾 Database Backup & Disaster Recovery (AWS S3)

To ensure zero data loss, schedule daily automated PostgreSQL dumps uploaded directly to an Amazon S3 bucket.

### Setup Daily S3 Backup Cron Job:
Create backup script `/usr/local/bin/backup-skc-db.sh`:
```bash
#!/bin/bash
BACKUP_DIR="/tmp/skc-backups"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
FILENAME="skc_db_backup_${TIMESTAMP}.sql.gz"
S3_BUCKET="s3://sri-krishna-constructions-backups"

mkdir -p $BACKUP_DIR
pg_dump -U skc_user -h localhost skc_db | gzip > $BACKUP_DIR/$FILENAME
aws s3 cp $BACKUP_DIR/$FILENAME $S3_BUCKET/$FILENAME
rm -f $BACKUP_DIR/$FILENAME
```

Make executable and add to crontab:
```bash
chmod +x /usr/local/bin/backup-skc-db.sh
# Run every night at 2:00 AM IST
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-skc-db.sh") | crontab -
```

---

## 💰 AWS Cost Estimation Breakdown

| Architecture | Component | AWS Service | Estimated Monthly Cost |
| :--- | :--- | :--- | :--- |
| **Option 1 (Serverless / Managed)** | Web App (1–2 instances) | AWS App Runner | \$10.00 – \$15.00 |
| | PostgreSQL Database | Amazon RDS (`db.t4g.micro`) | \$12.00 – \$18.00 |
| | DNS & Routing | Amazon Route 53 | \$0.50 |
| | **Total Option 1** | | **~\$25 – \$35 / month** |
| **Option 2 (Single EC2 VM)** | App + Database on Single VM | EC2 (`t4g.small` ARM, 2GB RAM) | \$12.50 |
| | EBS Storage | 30 GB gp3 SSD | \$2.40 |
| | S3 Daily Backups | Amazon S3 | \$0.50 |
| | **Total Option 2** | | **~\$15.00 / month** |

---

## 🔒 Security Best Practices for AWS Production

1. **Security Groups**: Restrict PostgreSQL port `5432` so it is only reachable by the App Runner VPC connector or EC2 instance.
2. **Environment Variables**: Store sensitive keys (`JWT_SECRET`, `DATABASE_URL`) in **AWS Systems Manager Parameter Store** or **AWS Secrets Manager**.
3. **Database Encryption**: Enable storage encryption (AES-256) at rest for Amazon RDS and Amazon EBS volumes.
4. **AWS CloudWatch Alerts**: Set up billing alerts ($25 threshold) and CPU utilization alarms (>85%).
