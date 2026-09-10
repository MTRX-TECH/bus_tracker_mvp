# 🏆 RIT Bus Tracker — Production Enterprise SaaS Platform
**Developed by RIT** | Founder & CEO: ****  
*In proud tribute to **Ramco Institute of Technology** and personal mentor **Professor Mrs. C. Krishnakala***

---

## 🌟 Executive Overview
**RIT Bus Tracker** is a state-of-the-art, production-ready SaaS transit telematics platform engineered specifically for educational institutions and collegiate fleets. Built upon a **100% Zero-Cost Cloud & Hardware Bypass Architecture**, RIT Bus Tracker eliminates the need for physical GPS vehicle hardware, monthly cellular SIM subscriptions, and proprietary mapping API licenses.

Instead, the system harnesses the **bus driver's native smartphone GPS sensor** via a progressive web app (PWA), real-time **Socket.IO over WebSockets**, **MongoDB Atlas Cloud Engine**, and **OpenStreetMap** vector geolocating to deliver high-frequency, centimeter-accurate transit tracking to students, parents, and transport administrators.

---

## 📚 Complete Application Workflow & Operations Manual
For an exhaustive technical deep dive into the platform's architectural workflow, cryptographic QR handshake protocol, zero-cost cloud setup, and user manual across all four hierarchical organizational roles, please see our newly compiled guide:
👉 **[📖 READ THE COMPLETE APPLICATION PROCESS MANUAL (app_process.md)](file:///c:/Users/maran/OneDrive/Desktop/bus%20tracker/app_process.md)** 👈

---

## 💎 Key Architectural Features & Aesthetics
* **🎨 Premium Luxury Design**: Styled entirely in custom Vanilla CSS and Tailwind with rich **Black, Gold, and Silver** glassmorphism (`glass-panel`), smooth ambient radial blurs, and responsive viewport protection.
* **🛡️ Data Governance & Compliance (Task 7 & 8)**: Built-in automated Data Retention Engine with TTL pruning (default 60 days), mandatory Driver PWA GPS privacy disclosure modal, tamper-proof permanent governance audit logs, and customizable institutional branding themes per college (custom logo URL, brand color accent, header title).
* **🔒 Clean Production Seeding**: Deployed without hardcoded demo fixtures or insecure test strings. Upon initial cloud connection to **MongoDB Atlas**, the server dynamically initializes only the verified executive **Super Admin** profile.
* **📱 Driver PWA QR Cryptographic Handshake**: Institutional transport admins generate SHA-256 HMAC protected QR windshield placards. Drivers simply scan the code with their mobile device camera to instantly begin live GPS broadcasting.
* **🚨 Real-Time Emergency SOS Blast**: Drivers can trigger instantaneous organizational distress notifications and geographic coordinates across all administrative command centers.
* **🌍 Haversine Mathematical ETA & Radar**: Students and parents observe live bus vectors and precision arrival predictions without incurring a single dollar in third-party maps licensing.

---

## 🔑 Initial Super Admin Login Credentials (Cloud Seeded)
Upon initial connection to your live MongoDB Atlas cloud cluster, the database initializes the executive governance profile:
* **Login Email**: `admin@mtrxtech.com`
* **Security Password**: `MtrxTech@2026!`
* **Role Privileges**: Complete global control over campus organization accounts, subscription limit allocation, telemetry analytics, and institutional deletion capability.

---

## ⚡ Quick Start Instructions (Local & Cloud Development)

### 1. Prerequireties
* **Node.js**: v18.x or higher
* **Database**: MongoDB Atlas Enterprise Cloud connection string configured in `backend/.env` (`MONGODB_URI`).

### 2. Installation & Compilation
From the main root directory (`c:/Users/maran/OneDrive/Desktop/bus tracker/`):
```bash
# Install all monorepo workspaces and dependencies
npm install

# Compile TypeScript types for shared packages
npm --workspace=shared run build
```

### 3. Boot Live Production & Development Servers
```bash
# Terminal 1: Launch Backend REST & Socket.IO Gateway (Port 5000)
npm run dev --workspace=backend

# Terminal 2: Launch Frontend Vite PWA Application (Port 5173)
npm run dev --workspace=frontend
```

### 4. Access Your Portal
Open your web browser or mobile PWA installer and navigate to:
👉 **`http://localhost:5173`** 

Sign in with your Super Admin credentials and start managing collegiate transit fleets worldwide!

---
## 👨‍💻 Engineering & Development Credits
* **Developer**: **Manoj Kumar** (B.E Mech 2025-2029 batch)

*© 2026 RIT. All Rights Reserved. Built for high-performance zero-cost enterprise scaling.*
