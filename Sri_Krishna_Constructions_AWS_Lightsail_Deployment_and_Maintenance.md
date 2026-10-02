# Sri Krishna Constructions ERP
# AWS Lightsail Production Deployment & Maintenance Guide

**Repository:** https://github.com/vj-mazu/sri_krishna_constructions

**Deployment Target:** AWS Lightsail

**Recommended Architecture:** Ubuntu + Nginx + Node.js + PM2 + PostgreSQL + React/Vite

**Expected Users:** Approximately 5 users

**Document Purpose:** Complete production deployment, maintenance, backup, update, rollback, and troubleshooting guide.

---

# Table of Contents

1. [Project Overview](#1-project-overview)
2. [Quick Start](#2-quick-start)
3. [Recommended Production Architecture](#3-recommended-production-architecture)
4. [Why PostgreSQL Instead of SQLite](#4-why-postgresql-instead-of-sqlite)
5. [Do We Need Docker](#5-do-we-need-docker)
6. [Do We Need GitHub Actions](#6-do-we-need-github-actions)
7. [AWS Lightsail Server](#7-aws-lightsail-server)
8. [Attach a Static IP](#8-attach-a-static-ip)
9. [Lightsail Firewall](#9-lightsail-firewall)
10. [Connect Using SSH](#10-connect-using-ssh)
11. [Update Ubuntu](#11-update-ubuntu)
12. [Install Node.js](#12-install-nodejs)
13. [Install PM2](#13-install-pm2)
14. [Install and Configure PostgreSQL](#14-install-and-configure-postgresql)
15. [PostgreSQL Must Remain Private](#15-postgresql-must-remain-private)
16. [Clone the GitHub Repository](#16-clone-the-github-repository)
17. [Create Production Environment Variables](#17-create-production-environment-variables)
18. [Install Backend Dependencies](#18-install-backend-dependencies)
19. [Review the Seed Script](#19-review-the-seed-script)
20. [Build the Frontend](#20-build-the-frontend)
21. [Configure the Production API URL](#21-configure-the-production-api-url)
22. [Start Node.js With PM2](#22-start-nodejs-with-pm2)
23. [Configure PM2 Startup](#23-configure-pm2-startup)
24. [Configure Nginx](#24-configure-nginx)
25. [Enable the Nginx Site](#25-enable-the-nginx-site)
26. [Configure the Domain](#26-configure-the-domain)
27. [Enable HTTPS](#27-enable-https)
28. [Final Application Test](#28-final-application-test)
29. [Database Backup Strategy](#29-database-backup-strategy)
30. [Create the PostgreSQL Backup Script](#30-create-the-postgresql-backup-script)
31. [Configure PostgreSQL Backup Authentication](#31-configure-postgresql-backup-authentication)
32. [Schedule Daily Database Backups](#32-schedule-daily-database-backups)
33. [External Backup and Lightsail Snapshots](#33-external-backup-and-lightsail-snapshots)
34. [Database Restore](#34-database-restore)
35. [How Development and Deployment Work](#35-how-development-and-deployment-work)
36. [Making Code Changes Locally](#36-making-code-changes-locally)
37. [Push Changes to GitHub](#37-push-changes-to-github)
38. [SSH Into Lightsail](#38-ssh-into-lightsail)
39. [Deploy Frontend Changes](#39-deploy-frontend-changes)
40. [Deploy Backend Changes](#40-deploy-backend-changes)
41. [Deploy Frontend and Backend Together](#41-deploy-frontend-and-backend-together)
42. [Database Schema Changes](#42-database-schema-changes)
43. [Safe Production Deployment Sequence](#43-safe-production-deployment-sequence)
44. [Create a Deployment Script](#44-create-a-deployment-script)
45. [Create a Safer Deployment Script With Backup](#45-create-a-safer-deployment-script-with-backup)
46. [What to Do if Deployment Breaks](#46-what-to-do-if-deployment-breaks)
47. [Rollback Code](#47-rollback-code)
48. [Database Rollback](#48-database-rollback)
49. [Monitoring the Server](#49-monitoring-the-server)
50. [Application Logs](#50-application-logs)
51. [Nginx Logs](#51-nginx-logs)
52. [PostgreSQL Status](#52-postgresql-status)
53. [After a Server Reboot](#53-after-a-server-reboot)
54. [PDF Generation](#54-pdf-generation)
55. [Excel Export](#55-excel-export)
56. [Image and File Storage](#56-image-and-file-storage)
57. [Security Rules](#57-security-rules)
58. [Maintenance Schedule](#58-maintenance-schedule)
59. [Production Architecture Summary](#59-production-architecture-summary)
60. [Services We Are Not Using](#60-services-we-are-not-using)
61. [Services We Are Using](#61-services-we-are-using)
62. [Normal Future Development Workflow](#62-normal-future-development-workflow)
63. [Final Production Checklist](#63-final-production-checklist)
64. [Final Recommendation](#64-final-recommendation)

---

# 1. Project Overview

Sri Krishna Constructions is a business/ERP application containing functionality such as:

- Authentication
- Role-based access
- Employee/worker management
- Attendance
- Payroll
- Advances
- Purchase
- Stock
- Reports
- PDF generation
- Excel export
- Database-backed business operations

The repository contains separate frontend and backend applications:

```text
sri_krishna_constructions/
│
├── client/
│   └── React + TypeScript + Vite
│
├── server/
│   ├── Node.js
│   ├── Express
│   ├── Prisma
│   └── PostgreSQL
│
├── Dockerfile
├── README.md
└── AWS_DEPLOYMENT_GUIDE.md
```

The recommended deployment does not require Docker or GitHub Actions.

---

# 2. Quick Start

## 2.1 Production Stack

| Component | Technology |
|---|---|
| Cloud Server | AWS Lightsail |
| Operating System | Ubuntu |
| Frontend | React + TypeScript + Vite |
| Backend | Node.js + Express |
| Database | PostgreSQL |
| ORM | Prisma |
| Web Server | Nginx |
| Process Manager | PM2 |
| Source Control | GitHub |
| Deployment | SSH + Git |
| SSL | Let's Encrypt + Certbot |
| Database Backup | pg_dump + cron |
| PDF | Client-side jsPDF |
| Excel | Client-side Excel libraries |

## 2.2 Production Architecture

```text
                         USERS
                           │
                           ▼
                    DOMAIN + HTTPS
                           │
                           ▼
                  ┌────────────────┐
                  │     NGINX      │
                  │    :80/:443    │
                  └───────┬────────┘
                          │
             ┌────────────┴────────────┐
             │                         │
             ▼                         ▼
      React/Vite frontend          /api/*
       client/dist                    │
                                     ▼
                             Node.js + Express
                                  :5000
                                     │
                                     ▼
                                PostgreSQL
                                  :5432
                              localhost only
```

## 2.3 Development → Production Flow

```text
Developer Computer
       │
       │ edit code
       │ test
       ▼
   Git Commit
       │
       │ git push
       ▼
     GitHub
       │
       │ SSH
       ▼
 AWS Lightsail
       │
       ├── database backup
       ├── git pull
       ├── npm ci
       ├── frontend build
       ├── Prisma generate
       └── PM2 restart
       │
       ▼
     Nginx
       │
       ▼
     Users
```

## 2.4 Database Backup Flow

```text
                    PostgreSQL
                         │
                         ▼
                 Daily pg_dump
                         │
                         ▼
                  .sql.gz backup
                         │
             ┌───────────┴───────────┐
             │                       │
             ▼                       ▼
       Local backup            External backup
             │                       │
             └───────────┬───────────┘
                         ▼
                  Disaster Recovery
```

## 2.5 Normal Deployment Command Flow

After the initial setup:

```bash
ssh into Lightsail

cd /var/www/sri_krishna_constructions

/usr/local/bin/backup-skc-db.sh

git pull origin main

cd client
npm ci
VITE_API_URL=/api npm run build

cd ../server
npm ci
npx prisma generate

pm2 restart skc-erp

sudo nginx -t
sudo systemctl reload nginx
```

Then test the application.

---

# 3. Recommended Production Architecture

The recommended production architecture is:

```text
AWS Lightsail
│
├── Ubuntu
│
├── Nginx
│   ├── HTTPS
│   ├── React static files
│   └── /api → Node.js
│
├── Node.js
│   └── Express API
│
├── PM2
│   └── Keeps Node.js running
│
└── PostgreSQL
    └── Application database
```

The browser communicates with Nginx.

Nginx serves the React application and forwards `/api` requests to Node.js.

Node.js communicates with PostgreSQL locally.

PostgreSQL is not exposed to the public internet.

---

# 4. Why PostgreSQL Instead of SQLite

SQLite can technically support a small application with approximately five users.

However, this particular project is already designed around PostgreSQL.

The project uses:

- PostgreSQL
- Prisma
- `pg`
- PostgreSQL database URLs
- PostgreSQL-specific SQL
- PostgreSQL transaction/locking behavior
- PostgreSQL-specific queries

Therefore:

> Keep PostgreSQL rather than migrating the existing project to SQLite simply to reduce setup complexity.

SQLite would require reviewing and potentially changing:

- Prisma datasource configuration
- database schema behavior
- SQL queries
- transaction behavior
- concurrency behavior
- deployment configuration

PostgreSQL is already the intended database for this project.

The PostgreSQL server can run on the same Lightsail instance.

There is no requirement for a separate database server.

---

# 5. Do We Need Docker

## No.

The repository contains a Dockerfile, but Docker is not required for the recommended Lightsail deployment.

Use:

```text
GitHub
   │
   ▼
Lightsail
   │
   ├── Node.js
   ├── React
   ├── PostgreSQL
   ├── Nginx
   └── PM2
```

Instead of:

```text
GitHub
   │
   ▼
GitHub Actions
   │
   ▼
Docker Build
   │
   ▼
Container Registry
   │
   ▼
Production Server
```

For approximately five users, native deployment is simpler and easier to maintain.

Docker can be introduced later if the project grows or deployment requirements change.

---

# 6. Do We Need GitHub Actions

## No.

GitHub Actions is optional.

The application can be deployed completely through SSH.

The workflow is:

```text
Developer
   ↓
git push
   ↓
GitHub
   ↓
SSH
   ↓
Lightsail
   ↓
git pull
   ↓
Build
   ↓
PM2 restart
```

GitHub Actions can be introduced later if automated CI/CD becomes necessary.

---

# 7. AWS Lightsail Server

Create an AWS Lightsail instance.

Recommended starting configuration:

```text
Platform:
Linux/Unix

Blueprint:
OS Only

Operating System:
Ubuntu

Instance:
sri-krishna-production

Plan:
1 GB RAM plan
```

The current workload is approximately:

```text
5 users
Data-centric application
No image uploads
No video processing
PDF downloads
Excel exports
```

Therefore the 1 GB plan is a reasonable starting point.

If actual resource usage becomes high later, upgrade the Lightsail instance.

---

# 8. Attach a Static IP

After creating the instance:

```text
Lightsail
   ↓
Instance
   ↓
Networking
   ↓
Create Static IP
```

Attach the static IP to:

```text
sri-krishna-production
```

Use this static IP for DNS.

Do not rely on a temporary public IP for production.

---

# 9. Lightsail Firewall

Open only the ports required for public access.

Recommended:

| Port | Protocol | Purpose |
|---:|---|---|
| 22 | TCP | SSH |
| 80 | TCP | HTTP |
| 443 | TCP | HTTPS |

Do NOT publicly expose:

```text
5000 → Node.js
5432 → PostgreSQL
```

Correct architecture:

```text
Internet
   │
   ▼
Nginx :443
   │
   ▼
Node.js :5000
   │
   ▼
PostgreSQL :5432
```

Node.js and PostgreSQL remain internal.

---

# 10. Connect Using SSH

From Lightsail:

```text
Instance
   ↓
Connect using SSH
```

This opens an Ubuntu terminal.

All server installation commands are executed from this terminal.

---

# 11. Update Ubuntu

```bash
sudo apt update
sudo apt upgrade -y
```

Install required packages:

```bash
sudo apt install -y \
  git \
  nginx \
  postgresql \
  postgresql-contrib \
  curl \
  ca-certificates
```

---

# 12. Install Node.js

Install Node.js 20:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

Verify:

```bash
node -v
npm -v
```

---

# 13. Install PM2

Install PM2 globally:

```bash
sudo npm install -g pm2
```

Verify:

```bash
pm2 -v
```

PM2 is responsible for keeping the Node.js application running.

---

# 14. Install and Configure PostgreSQL

Check PostgreSQL:

```bash
sudo systemctl status postgresql
```

Open PostgreSQL:

```bash
sudo -u postgres psql
```

Create database:

```sql
CREATE DATABASE skc_db;
```

Create application user:

```sql
CREATE USER skc_user
WITH ENCRYPTED PASSWORD 'YOUR_STRONG_DATABASE_PASSWORD';
```

Give ownership:

```sql
ALTER DATABASE skc_db OWNER TO skc_user;
```

Exit:

```sql
\q
```

Use a strong random password.

Do not use predictable passwords.

---

# 15. PostgreSQL Must Remain Private

The application should connect to:

```text
127.0.0.1:5432
```

The database should not be accessible from the internet.

Do not add port `5432` to the Lightsail firewall.

The intended flow is:

```text
Node.js
   ↓
127.0.0.1:5432
   ↓
PostgreSQL
```

---

# 16. Clone the GitHub Repository

Create application directory:

```bash
sudo mkdir -p /var/www
sudo chown -R $USER:$USER /var/www
```

Clone:

```bash
cd /var/www

git clone https://github.com/vj-mazu/sri_krishna_constructions.git
```

Enter:

```bash
cd /var/www/sri_krishna_constructions
```

Check:

```bash
git status
```

Expected structure:

```text
sri_krishna_constructions/
│
├── client/
├── server/
├── Dockerfile
├── README.md
└── AWS_DEPLOYMENT_GUIDE.md
```

---

# 17. Create Production Environment Variables

Go to:

```bash
cd /var/www/sri_krishna_constructions
```

Create:

```bash
nano server/.env
```

Example:

```env
PORT=5000
NODE_ENV=production

DATABASE_URL=postgresql://skc_user:YOUR_DATABASE_PASSWORD@127.0.0.1:5432/skc_db

JWT_SECRET=YOUR_LONG_RANDOM_SECRET
```

Save the file.

Protect it:

```bash
chmod 600 server/.env
```

Never commit:

```text
server/.env
```

to GitHub.

---

# 18. Install Backend Dependencies

```bash
cd /var/www/sri_krishna_constructions/server
```

Install:

```bash
npm ci
```

Generate Prisma client:

```bash
npx prisma generate
```

Apply database schema:

```bash
npx prisma db push
```

Verify that the database connection works.

---

# 19. Review the Seed Script

The repository contains a seed script.

Before running:

```bash
npm run db:seed
```

inspect it:

```bash
sed -n '1,240p' src/seed.js
```

Make sure it does not create predictable production passwords.

If necessary, modify the seed process before running it.

Do not leave default credentials active in production.

---

# 20. Build the Frontend

Go to:

```bash
cd /var/www/sri_krishna_constructions/client
```

Install dependencies:

```bash
npm ci
```

Build:

```bash
VITE_API_URL=/api npm run build
```

The production build will be generated in:

```text
client/dist/
```

Nginx will serve this directory.

---

# 21. Configure the Production API URL

This step is important.

The production frontend must call:

```text
/api
```

not:

```text
http://localhost:5000
```

and not the old Render API URL.

Build:

```bash
VITE_API_URL=/api npm run build
```

The final request flow is:

```text
Browser
   │
   ▼
https://erp.example.com/api/...
   │
   ▼
Nginx
   │
   ▼
http://127.0.0.1:5000/api/...
   │
   ▼
Node.js
```

This keeps the API under the same HTTPS domain.

---

# 22. Start Node.js With PM2

Go to:

```bash
cd /var/www/sri_krishna_constructions/server
```

Start:

```bash
pm2 start src/server.js --name skc-erp
```

Check:

```bash
pm2 status
```

Check logs:

```bash
pm2 logs skc-erp
```

Check port:

```bash
ss -lntp | grep 5000
```

---

# 23. Configure PM2 Startup

Save the process:

```bash
pm2 save
```

Generate startup configuration:

```bash
pm2 startup systemd
```

PM2 will display a command.

Copy and execute that command.

Then:

```bash
pm2 save
```

After this, PM2 should automatically restore the application after a server reboot.

---

# 24. Configure Nginx

Create:

```bash
sudo nano /etc/nginx/sites-available/skc-erp
```

Use:

```nginx
server {
    listen 80;
    listen [::]:80;

    server_name erp.example.com;

    root /var/www/sri_krishna_constructions/client/dist;

    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;

        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Replace:

```text
erp.example.com
```

with the actual domain.

---

# 25. Enable the Nginx Site

Enable:

```bash
sudo ln -s \
  /etc/nginx/sites-available/skc-erp \
  /etc/nginx/sites-enabled/skc-erp
```

Remove the default site:

```bash
sudo rm -f /etc/nginx/sites-enabled/default
```

Test:

```bash
sudo nginx -t
```

If successful:

```text
syntax is ok
test is successful
```

Restart:

```bash
sudo systemctl restart nginx
```

---

# 26. Configure the Domain

At the domain provider create an A record:

```text
Type: A

Name: erp

Value: LIGHTSAIL_STATIC_IP
```

Example:

```text
erp.example.com
        ↓
AWS Lightsail Static IP
```

Wait for DNS propagation.

Test:

```text
http://erp.example.com
```

---

# 27. Enable HTTPS

Install Certbot:

```bash
sudo apt install -y certbot python3-certbot-nginx
```

Run:

```bash
sudo certbot --nginx -d erp.example.com
```

Follow the prompts.

Test renewal:

```bash
sudo certbot renew --dry-run
```

Production URL:

```text
https://erp.example.com
```

---

# 28. Final Application Test

Test the complete application:

```text
Login
Dashboard
Users/Workers
Attendance
Payroll
Advances
Purchase
Stock
Reports
PDF
Excel
Roles
Logout
```

Open browser Developer Tools → Network.

API requests should look like:

```text
https://erp.example.com/api/...
```

They should not point to:

```text
localhost
127.0.0.1
Render
```

---

# 29. Database Backup Strategy

Database backups are essential.

Recommended:

```text
PostgreSQL
    │
    ▼
pg_dump
    │
    ▼
Compressed .sql.gz
    │
    ├── Local backup
    │
    └── External backup
```

Also consider Lightsail snapshots.

The goal is to have more than one recovery mechanism.

---

# 30. Create the PostgreSQL Backup Script

Create directory:

```bash
sudo mkdir -p /var/backups/skc
sudo chown $USER:$USER /var/backups/skc
```

Create script:

```bash
sudo nano /usr/local/bin/backup-skc-db.sh
```

Use:

```bash
#!/bin/bash

BACKUP_DIR="/var/backups/skc"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")

DATABASE="skc_db"
DB_USER="skc_user"

mkdir -p "$BACKUP_DIR"

pg_dump \
  -U "$DB_USER" \
  -h 127.0.0.1 \
  "$DATABASE" \
  | gzip > "$BACKUP_DIR/skc_db_$TIMESTAMP.sql.gz"

find "$BACKUP_DIR" \
  -type f \
  -name "*.sql.gz" \
  -mtime +14 \
  -delete
```

Make executable:

```bash
sudo chmod +x /usr/local/bin/backup-skc-db.sh
```

The script:

1. Creates a PostgreSQL dump.
2. Compresses it.
3. Saves it with a timestamp.
4. Deletes backups older than 14 days.

---

# 31. Configure PostgreSQL Backup Authentication

If PostgreSQL requires a password for automated backups, use `.pgpass`.

Create:

```bash
nano ~/.pgpass
```

Add:

```text
127.0.0.1:5432:skc_db:skc_user:YOUR_DATABASE_PASSWORD
```

Protect:

```bash
chmod 600 ~/.pgpass
```

Test:

```bash
pg_dump \
  -U skc_user \
  -h 127.0.0.1 \
  skc_db > /tmp/skc_test.sql
```

Remove test:

```bash
rm /tmp/skc_test.sql
```

---

# 32. Schedule Daily Database Backups

Open cron:

```bash
crontab -e
```

Add:

```cron
0 2 * * * /usr/local/bin/backup-skc-db.sh
```

Meaning:

```text
Every day
02:00 AM
    ↓
Database backup
```

Check:

```bash
ls -lh /var/backups/skc
```

Expected:

```text
skc_db_2026-10-01_02-00-00.sql.gz
skc_db_2026-10-02_02-00-00.sql.gz
```

---

# 33. External Backup and Lightsail Snapshots

Do not keep the only backup on the same server.

Recommended:

```text
Live PostgreSQL
       │
       ├── Local daily backup
       │
       ├── External backup
       │
       └── Lightsail snapshot
```

An external backup could be stored separately, such as an S3 bucket or another independent backup location.

This protects against:

- Server failure
- Disk failure
- Accidental deletion
- Database corruption
- Application mistakes
- Incorrect deployments

---

# 34. Database Restore

Stop the application:

```bash
pm2 stop skc-erp
```

Suppose the backup is:

```text
skc_db_2026-10-01_02-00-00.sql.gz
```

Extract:

```bash
gunzip skc_db_2026-10-01_02-00-00.sql.gz
```

Restore:

```bash
psql \
  -U skc_user \
  -h 127.0.0.1 \
  -d skc_db \
  < skc_db_2026-10-01_02-00-00.sql
```

Start application:

```bash
pm2 start skc-erp
```

Always test the restore process before an actual emergency.

---

# 35. How Development and Deployment Work

The recommended workflow is:

```text
LOCAL COMPUTER
      │
      ├── Edit code
      ├── Test
      ├── Commit
      └── Push
            │
            ▼
          GitHub
            │
            ▼
       SSH to Lightsail
            │
            ├── Backup
            ├── Pull
            ├── Build
            ├── Prisma
            └── Restart
```

Do not normally edit production source code directly on the server.

Make changes locally, test them, then deploy.

---

# 36. Making Code Changes Locally

Work on your development computer.

Example frontend:

```text
client/src/
```

Example backend:

```text
server/src/
```

Make your changes.

Run the application locally.

Test:

```text
Login
Dashboard
CRUD
Attendance
Payroll
PDF
Excel
Roles
```

Only push code after testing.

---

# 37. Push Changes to GitHub

Check changes:

```bash
git status
```

Stage:

```bash
git add .
```

Commit:

```bash
git commit -m "Update payroll calculation"
```

Push:

```bash
git push origin main
```

The code is now available in GitHub.

---

# 38. SSH Into Lightsail

Open:

```text
AWS Lightsail
   ↓
sri-krishna-production
   ↓
Connect using SSH
```

Then:

```bash
cd /var/www/sri_krishna_constructions
```

Check:

```bash
git status
```

Pull:

```bash
git pull origin main
```

---

# 39. Deploy Frontend Changes

If only frontend code changed:

```bash
cd /var/www/sri_krishna_constructions/client
```

Install:

```bash
npm ci
```

Build:

```bash
VITE_API_URL=/api npm run build
```

Reload Nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

The frontend is now updated.

---

# 40. Deploy Backend Changes

If backend code changed:

```bash
cd /var/www/sri_krishna_constructions/server
```

Install:

```bash
npm ci
```

Generate Prisma:

```bash
npx prisma generate
```

Restart:

```bash
pm2 restart skc-erp
```

Check:

```bash
pm2 status
```

Logs:

```bash
pm2 logs skc-erp
```

---

# 41. Deploy Frontend and Backend Together

Complete deployment:

```bash
cd /var/www/sri_krishna_constructions

git pull origin main

cd client
npm ci
VITE_API_URL=/api npm run build

cd ../server
npm ci
npx prisma generate

pm2 restart skc-erp

sudo nginx -t
sudo systemctl reload nginx
```

Then test the application.

---

# 42. Database Schema Changes

Before database changes:

```bash
/usr/local/bin/backup-skc-db.sh
```

Then:

```bash
cd /var/www/sri_krishna_constructions/server
```

Apply schema:

```bash
npx prisma db push
```

Then:

```bash
pm2 restart skc-erp
```

For a mature production system, Prisma migrations should eventually be used instead of relying indefinitely on `db push`.

Database changes should always be tested locally first.

---

# 43. Safe Production Deployment Sequence

For an important release:

```text
1. Make changes locally
       ↓
2. Test locally
       ↓
3. Commit
       ↓
4. Push to GitHub
       ↓
5. SSH into Lightsail
       ↓
6. Backup database
       ↓
7. git pull
       ↓
8. Install dependencies
       ↓
9. Apply schema changes if required
       ↓
10. Build frontend
       ↓
11. Restart backend
       ↓
12. Reload Nginx
       ↓
13. Test application
```

Do not skip the backup when making database/schema changes.

---

# 44. Create a Deployment Script

Create:

```bash
nano /var/www/deploy-skc.sh
```

Use:

```bash
#!/bin/bash

set -e

APP="/var/www/sri_krishna_constructions"

echo "Starting deployment..."

cd "$APP"

echo "Pulling latest code..."
git pull origin main

echo "Installing frontend dependencies..."
cd "$APP/client"
npm ci

echo "Building frontend..."
VITE_API_URL=/api npm run build

echo "Installing backend dependencies..."
cd "$APP/server"
npm ci

echo "Generating Prisma client..."
npx prisma generate

echo "Restarting backend..."
pm2 restart skc-erp

echo "Checking Nginx..."
sudo nginx -t

echo "Reloading Nginx..."
sudo systemctl reload nginx

echo "Deployment completed."
```

Make executable:

```bash
chmod +x /var/www/deploy-skc.sh
```

Then:

```bash
/var/www/deploy-skc.sh
```

---

# 45. Create a Safer Deployment Script With Backup

Create:

```bash
nano /var/www/deploy-skc-safe.sh
```

Use:

```bash
#!/bin/bash

set -e

APP="/var/www/sri_krishna_constructions"

echo "======================================"
echo "Sri Krishna Constructions Deployment"
echo "======================================"

echo ""
echo "1. Creating database backup..."
/usr/local/bin/backup-skc-db.sh

echo ""
echo "2. Pulling latest code..."
cd "$APP"
git pull origin main

echo ""
echo "3. Building frontend..."
cd "$APP/client"
npm ci
VITE_API_URL=/api npm run build

echo ""
echo "4. Updating backend..."
cd "$APP/server"
npm ci
npx prisma generate

echo ""
echo "5. Restarting Node.js..."
pm2 restart skc-erp

echo ""
echo "6. Testing Nginx..."
sudo nginx -t

echo ""
echo "7. Reloading Nginx..."
sudo systemctl reload nginx

echo ""
echo "======================================"
echo "Deployment completed successfully."
echo "======================================"
```

Make executable:

```bash
chmod +x /var/www/deploy-skc-safe.sh
```

Future deployment:

```bash
/var/www/deploy-skc-safe.sh
```

---

# 46. What to Do if Deployment Breaks

First check PM2:

```bash
pm2 status
```

Then:

```bash
pm2 logs skc-erp
```

Check Nginx:

```bash
sudo nginx -t
```

Check:

```bash
sudo systemctl status nginx
```

Check PostgreSQL:

```bash
sudo systemctl status postgresql
```

Check Node.js:

```bash
ss -lntp | grep 5000
```

Check RAM:

```bash
free -h
```

Check disk:

```bash
df -h
```

---

# 47. Rollback Code

Check recent commits:

```bash
git log --oneline -10
```

Example:

```text
abc1234 Update payroll
def5678 Previous working version
```

If `def5678` was the last working version:

```bash
git checkout def5678
```

Rebuild frontend:

```bash
cd client

npm ci

VITE_API_URL=/api npm run build
```

Update backend:

```bash
cd ../server

npm ci

npx prisma generate
```

Restart:

```bash
pm2 restart skc-erp
```

After the issue is fixed locally, return to the main branch:

```bash
git checkout main
```

Do not use production as the primary development environment.

---

# 48. Database Rollback

Database rollback is different from code rollback.

Code can often be changed:

```text
v3 → v2
```

Database changes may involve:

```text
schema
data
records
relationships
constraints
```

Therefore:

> Always create a database backup before production database changes.

For major database migrations:

```text
Backup
   ↓
Migration
   ↓
Test
   ↓
Production
```

If a data restoration is required, restore from the appropriate backup.

---

# 49. Monitoring the Server

Check memory:

```bash
free -h
```

Check CPU/processes:

```bash
top
```

Check disk:

```bash
df -h
```

Check PM2:

```bash
pm2 status
```

Detailed PM2 monitoring:

```bash
pm2 monit
```

---

# 50. Application Logs

View live Node.js logs:

```bash
pm2 logs skc-erp
```

Last 100 lines:

```bash
pm2 logs skc-erp --lines 100
```

Application logs are especially important after:

- Deployment
- Server restart
- Database changes
- Authentication changes
- Payroll changes

---

# 51. Nginx Logs

Access log:

```bash
sudo tail -f /var/log/nginx/access.log
```

Error log:

```bash
sudo tail -f /var/log/nginx/error.log
```

If users receive:

```text
502 Bad Gateway
```

check:

```bash
pm2 status
```

and:

```bash
pm2 logs skc-erp
```

A 502 usually means Nginx cannot communicate with Node.js.

---

# 52. PostgreSQL Status

Check:

```bash
sudo systemctl status postgresql
```

If PostgreSQL is stopped:

```bash
sudo systemctl start postgresql
```

Enable at boot:

```bash
sudo systemctl enable postgresql
```

---

# 53. After a Server Reboot

Check PM2:

```bash
pm2 status
```

Check Nginx:

```bash
sudo systemctl status nginx
```

Check PostgreSQL:

```bash
sudo systemctl status postgresql
```

Check Node.js:

```bash
ss -lntp | grep 5000
```

Open:

```text
https://erp.example.com
```

If PM2 startup was correctly configured, the Node.js application should automatically return after reboot.

---

# 54. PDF Generation

The application uses client-side PDF generation.

The general flow is:

```text
Browser
   │
   ▼
Request data from API
   │
   ▼
Receive data
   │
   ▼
Generate PDF in browser
   │
   ▼
Download PDF
```

The server does not need to permanently store every generated PDF.

This reduces disk/storage requirements.

---

# 55. Excel Export

Excel generation/export is also handled by frontend libraries.

The architecture is:

```text
Browser
   │
   ├── Request data
   │
   ├── Generate Excel
   │
   └── Download
```

The backend primarily handles:

```text
Authentication
Database
Business logic
API
```

---

# 56. Image and File Storage

Current expected workload:

```text
Images:            No
Videos:            No
Large uploads:     No
PDF storage:       Not required
Excel storage:     Not required
```

Therefore the Lightsail server does not need a dedicated file-storage architecture for the current application.

If the project later introduces:

- Employee photos
- Documents
- Large PDFs
- Images
- Video
- User uploads

then consider object storage such as S3 instead of storing everything on the Lightsail server.

---

# 57. Security Rules

Never expose:

```text
PostgreSQL :5432
Node.js :5000
.env
JWT_SECRET
Database password
```

Never commit:

```text
server/.env
```

to GitHub.

Never put production secrets inside frontend code.

Use HTTPS.

Use strong database credentials.

Use a long random JWT secret.

Keep Ubuntu and dependencies updated.

Do not use predictable default passwords.

---

# 58. Maintenance Schedule

## Daily

Check:

```bash
pm2 status
```

Check backup:

```bash
ls -lh /var/backups/skc
```

Check application if required.

## Weekly

Check:

```bash
pm2 logs skc-erp --lines 100
```

Check:

```bash
df -h
```

Review database backups.

Review application functionality.

## Monthly

Perform:

```text
Ubuntu updates
Dependency review
Backup verification
Restore test when appropriate
Lightsail snapshot
Security review
Disk usage review
RAM/CPU review
```

---

# 59. Production Architecture Summary

Final architecture:

```text
                         USERS
                           │
                           ▼
                    HTTPS DOMAIN
                           │
                           ▼
                  ┌────────────────┐
                  │     NGINX      │
                  │    :80/:443    │
                  └───────┬────────┘
                          │
             ┌────────────┴────────────┐
             │                         │
             ▼                         ▼
      React/Vite frontend          /api/*
       client/dist                    │
                                     ▼
                             Node.js + Express
                                  :5000
                                     │
                                     ▼
                                PostgreSQL
                                  :5432
                              localhost only
```

Backup:

```text
PostgreSQL
    │
    ▼
Daily pg_dump
    │
    ▼
Compressed backup
    │
    ├── Local
    │
    └── External
```

---

# 60. Services We Are Not Using

For the current project:

```text
❌ RDS
❌ App Runner
❌ ECS
❌ Fargate
❌ Kubernetes
❌ Docker Registry
❌ GitHub Actions
❌ Separate PostgreSQL server
❌ Redis
❌ Load Balancer
❌ S3 for normal PDF generation
```

These services may become useful later if the application's requirements change.

---

# 61. Services We Are Using

```text
AWS Lightsail
Ubuntu
Nginx
Node.js
Express
PM2
PostgreSQL
Prisma
React
Vite
GitHub
SSH
HTTPS
Certbot
cron
pg_dump
```

---

# 62. Normal Future Development Workflow

## Step 1 — Developer Computer

Make changes.

Test locally.

Then:

```bash
git status
```

Stage:

```bash
git add .
```

Commit:

```bash
git commit -m "Describe the change"
```

Push:

```bash
git push origin main
```

## Step 2 — Lightsail SSH

Connect:

```text
AWS Lightsail
    ↓
Connect using SSH
```

Then:

```bash
cd /var/www/sri_krishna_constructions
```

Backup:

```bash
/usr/local/bin/backup-skc-db.sh
```

Pull:

```bash
git pull origin main
```

## Step 3 — Build Frontend

```bash
cd client
npm ci
VITE_API_URL=/api npm run build
```

## Step 4 — Update Backend

```bash
cd ../server
npm ci
npx prisma generate
```

## Step 5 — Restart Backend

```bash
pm2 restart skc-erp
```

## Step 6 — Reload Nginx

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Step 7 — Test

Test:

```text
Login
Dashboard
Attendance
Payroll
Advances
Purchase
Stock
Reports
PDF
Excel
Roles
Logout
```

---

# 63. Final Production Checklist

## AWS

```text
☐ AWS account activated
☐ Lightsail instance created
☐ Static IP attached
☐ Correct region selected
☐ Instance running
```

## Server

```text
☐ Ubuntu updated
☐ Node.js installed
☐ npm installed
☐ PM2 installed
☐ Nginx installed
☐ PostgreSQL installed
```

## Database

```text
☐ Production database created
☐ Production database user created
☐ Strong database password configured
☐ DATABASE_URL configured
☐ Prisma generated
☐ Database schema deployed
☐ Seed script reviewed
```

## Application

```text
☐ Repository cloned
☐ Backend dependencies installed
☐ Frontend dependencies installed
☐ Frontend production build created
☐ VITE_API_URL=/api configured
☐ Node.js running under PM2
☐ PM2 startup configured
```

## Nginx

```text
☐ Nginx configuration created
☐ React static files served
☐ /api proxy configured
☐ Nginx configuration tested
☐ Nginx running
```

## Domain and HTTPS

```text
☐ Static IP configured
☐ DNS A record configured
☐ Domain resolves correctly
☐ HTTPS configured
☐ Certbot renewal tested
```

## Firewall

```text
☐ Port 22 available
☐ Port 80 available
☐ Port 443 available
☐ Port 5000 NOT publicly exposed
☐ Port 5432 NOT publicly exposed
```

## Application Testing

```text
☐ Login tested
☐ Owner role tested
☐ Manager role tested
☐ Supervisor role tested
☐ Staff role tested
☐ Attendance tested
☐ Payroll tested
☐ Advances tested
☐ Purchase tested
☐ Stock tested
☐ Reports tested
☐ PDF tested
☐ Excel export tested
☐ Logout tested
```

## Backup

```text
☐ Backup directory created
☐ Backup script created
☐ Backup tested
☐ Cron configured
☐ Backup retention configured
☐ External backup configured
☐ Lightsail snapshot strategy configured
☐ Restore procedure tested
```

## Deployment

```text
☐ GitHub workflow tested
☐ git pull tested
☐ Frontend build tested
☐ Backend restart tested
☐ Database update procedure tested
☐ Rollback procedure understood
```

---

# 64. Final Recommendation

For the current Sri Krishna Constructions application and approximately five users, use a simple single-server architecture:

```text
┌─────────────────────────────────────────┐
│             AWS LIGHTSAIL               │
│                                         │
│  Ubuntu                                 │
│    │                                    │
│    ├── Nginx                            │
│    │     ├── HTTPS                      │
│    │     ├── React/Vite                 │
│    │     └── /api → Node.js             │
│    │                                    │
│    ├── Node.js + Express                │
│    │     └── PM2                        │
│    │                                    │
│    └── PostgreSQL                       │
│          └── Prisma                     │
│                                         │
└─────────────────────────────────────────┘
```

Use:

```text
GitHub
   ↓
Source control
```

Use:

```text
SSH
   ↓
Manual deployment
```

Use:

```text
PM2
   ↓
Node.js process management
```

Use:

```text
Nginx
   ↓
HTTPS + frontend + API reverse proxy
```

Use:

```text
PostgreSQL
   ↓
Application database
```

Use:

```text
pg_dump + cron
   ↓
Automated database backups
```

Use:

```text
Lightsail snapshots
   ↓
Server-level recovery
```

The normal production workflow is:

```text
DEVELOP LOCALLY
       ↓
TEST
       ↓
git commit
       ↓
git push
       ↓
GITHUB
       ↓
SSH INTO LIGHTSAIL
       ↓
DATABASE BACKUP
       ↓
git pull
       ↓
npm ci
       ↓
BUILD FRONTEND
       ↓
PRISMA GENERATE
       ↓
PM2 RESTART
       ↓
NGINX RELOAD
       ↓
TEST PRODUCTION
```

## Key Principles

1. **Keep PostgreSQL** because the existing project is already designed around it.
2. **Do not expose PostgreSQL to the internet.**
3. **Do not expose Node.js port 5000 publicly.**
4. **Use Nginx as the public entry point.**
5. **Use HTTPS in production.**
6. **Use PM2 for Node.js process management.**
7. **Back up PostgreSQL automatically.**
8. **Keep an independent backup outside the live server.**
9. **Develop locally rather than editing production code directly.**
10. **Use GitHub as the source of truth.**
11. **Use SSH + git pull for deployment initially.**
12. **GitHub Actions is optional.**
13. **Docker is optional.**
14. **Do not add AWS services unless the application actually needs them.**
15. **Always back up the database before production schema/data changes.**
16. **Test every production deployment after restarting the application.**

---

# End of Document
