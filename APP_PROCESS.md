# 🚀 RIT Bus Tracker — ENTERPRISE SYSTEM ARCHITECTURE & APP PROCESS WORKFLOWS
**Developed by RIT**  
**  
*Special Thanks: RAMCO INSTITUTE OF TECHNOLOGY*

---

## 1. Executive Overview & Multi-Tenancy Hierarchy
RIT Bus Tracker is a next-generation, multi-tenant educational transit telemetry and safety platform. Engineered for zero-cost deployment resilience across global cloud infrastructures, it delivers sub-second GPS live location streaming, automated schedule adherence analytics, and tamper-proof compliance logging.

### Role Hierarchy & Security Boundaries
```
[ SUPER ADMIN ] (RIT Platform Owner)
       │
       ├──► [ COLLEGE ADMIN ] (Institution Level — e.g., RAMCO INSTITUTE OF TECHNOLOGY)
       │          │
       │          ├──► [ DRIVER PWA ] (Authenticated Mobile GPS Telemetry Streamers)
       │          │
       │          └──► [ STUDENT & PARENT PORTAL ] (Public / Zero-Login Live Monitoring)
       │
       └──► [ COLLEGE ADMIN ] (Institution #2, #3, etc.)
```

1. **Super Admin (RIT):** Global governance, cross-tenant analytics, educational institution onboarding/offboarding, and enterprise system telemetry audits.
2. **College Admin:** Organization-scoped fleet management, driver shift schedule matrices, geofenced route creation, fuel/maintenance cost tracking, and data retention policies.
3. **Driver (Mobile PWA):** Smartphone-powered GPS telemetry streaming, wake lock battery optimization, instant Emergency SOS broadcasting, and trip logbook submissions.
4. **Student & Parent (Public Monitoring):** Zero-friction public campus portal, live Leaflet OSM tracking, precision arrival time prediction (ETA), delay notification feed, and one-tap driver emergency dialing.

---

## 2. Real-Time Telemetry & Socket.IO Streaming Engine
The core location transmission engine relies on an asynchronous event-driven Socket.IO architecture backed by MongoDB GeoJSON indexing.

```
+---------------+        Socket.IO Event        +--------------------+
|               |  (DRIVER_LOCATION_UPDATE)      |                    |
|  Driver PWA   | -----------------------------> |  Express API &     |
|  (Mobile GPS) |                                |  Socket.IO Gateway |
|               | <============================> |                    |
+---------------+       Heartbeat & Ping        +---------+----------+
        ▲                                                 │
        │ Wake Lock / Offline Buffer                      │ Mongo 2dsphere Geo-Update
        │ (Resumes sync automatically)                    ▼
+---------------+                               +--------------------+
| Offline GPS   |                               |  MongoDB Atlas     |
| Memory Queue  |                               |  (GPSLog & Bus)    |
+---------------+                               +---------+----------+
                                                          │
                                                          │ Broadcast (LIVE_BUS_LOCATION)
                                                          ▼
                                                +--------------------+
                                                | Student & Parent   |
                                                | Live Map Portal    |
                                                +--------------------+
```

### Telemetry Processing Lifecycle
1. **Acquisition:** Driver mobile PWA invokes high-accuracy HTML5 Geo-Location API every 3–5 seconds.
2. **Resilience & Buffering:** If cellular data drops out, telemetry coordinates are buffered in localized IndexedDB memory and transmitted sequentially via bulk insert once connectivity re-establishes.
3. **Spatial Computation:** The Express engine calculates dynamic vectors (heading, speed variances) and invokes `ETAService` to detect geofence stop entry/exit and estimate arrival windows.
4. **Room Isolation & Broadcast:** Telemetry frames are dispatched securely solely to verified organizational rooms (`org_${orgId}`) and bus channels (`bus_${busId}`), preventing data leaks between distinct educational institutions.

---

## 3. Cryptographic QR Code Vehicle Onboarding Architecture
To guarantee driver flexibility while eliminating spoofing vulnerabilities, RIT implements a decoupled **Signed QR Code Authorization Model**.

- **Payload Minimalism:** The QR code mounted on the bus windshield encodes **ONLY** a cryptographically signed JSON Web Token / secret string containing the permanent `busId` and vehicle serial alias. It **never** hardcodes driver identities, college administrative metadata, or transit routes.
- **Dynamic Duty Linking:** Upon starting an assigned shift, a Driver scans the windshield QR code via their smartphone camera. The backend verifies the cryptographic seal and binds the Driver's session to the vehicle and assigned daily route for the duration of the trip.

---

## 4. Automated Fleet Analytics & Driver Performance Scorecards
The platform automatically synthesizes Raw Telemetry, Geofence Logs, and Odometer Data into executive KPIs:

- **Fleet Utilization Metrics:** Calculates exact fuel burn efficiency, schedule adherence percentages (On-Time vs Delayed trips), aggregated distance covered, and idle engine runtime.
- **Driver Performance Scorecard:** Computes a composite 100-point safety compliance score by assessing over-speeding infractions, braking anomalies, punctuality metrics, and historical SOS alarm frequency.

---

## 5. Compliance, Data Governance & Automated Retention Engine
In compliance with enterprise data privacy mandates and cloud storage cost minimization:

1. **Mandatory Consent Architecture:** Drivers must acknowledge and approve enterprise vehicle telemetry and location monitoring disclosures prior to streaming GPS data.
2. **Automated TTL Retention Purge:** High-frequency GPS track coordinates are indexed with an automated expiration TTL (Time-To-Live) window (default 60 days). Historical trip records beyond this threshold are compressed into analytical archive summaries and expunged from primary hot tables.
3. **Immutable Audit Trail:** All administrative operations (staff shift changes, CSV batch imports, retention modifications, and organization expungements) are inscribed into an unalterable governance audit trail.

---

## 6. Zero-Cost Cloud Deployment Specification
RIT Bus Tracker is structured for high availability on free-tier cloud ecosystem tiers without infrastructure expenditures:

- **Database:** MongoDB Atlas M0 Cloud Cluster (with indexed TTL & geospatial queries).
- **Backend API Gateway:** Containerized Docker build deployable to Render / Fly.io / Koyeb with automated self-wakeup ping endpoints (`/api/health`).
- **Frontend PWA & Portal:** Vite build bundle optimized for Vercel, Netlify, or Cloudflare Pages CDN hosting.

---

*RIT Platform Engine — Built with precision by CEO .*
