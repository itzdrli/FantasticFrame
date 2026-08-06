# FantasticFrame Privacy Policy

**Effective date**: 2026-08-06

## 1. Overview

FantasticFrame is an online tool for adding borders and EXIF information to photos. This policy explains how we handle your photos and related information when you use the service.

**Core principle**: Your photos are processed in your browser by default. When you use batch export, which requires server-side rendering, photos reside only in server memory and are cleared immediately after processing. **We do not store, sell, or use your photos for any other purpose.**

## 2. Data Controller

- Operator: itzdrli
- Contact: [Email](mailto:me@itzdrli.cc) [me@itzdrli.cc]
- Server location: Germany, European Union

## 3. What Data We Process and How

### 3.1 Photo Files

- **After upload**: photos are kept as Data URLs in your browser's memory, used only for preview and editing. They are not uploaded.
- **Single export**: rendered in your browser via WASM; photos never leave your device.
- **Batch export**: photos (along with border and EXIF settings) are sent to our server for rendering. The server keeps the data in memory only: after rendering, results are packaged into a ZIP and returned to you. Tasks expire automatically after 10 minutes, and memory is released immediately after download. **Photos are never written to disk, never stored in a database, and no copies are retained.**

### 3.2 EXIF Metadata

EXIF data (camera make/model, shooting parameters, capture time, GPS, etc.) is read locally in your browser; during batch export it is sent with the request for rendering and handled exactly like your photos.

### 3.3 Information We Do Not Collect

- No accounts: we do not collect names, email addresses, phone numbers, or any identity information;
- No cookies, no ads, no third-party tracking or analytics scripts.

### 3.4 Server Logs

The server only records request paths, timestamps, and status codes for troubleshooting and security monitoring. Logs do **not** contain photo content, EXIF data, or request bodies.

## 4. Purposes and Legal Basis

- **Purpose**: to provide the photo border/EXIF framing and batch export service — the service you requested.
- **Legal basis**: Article 6(1)(b) GDPR (performance of a contract or steps taken at the data subject's request) — photos are processed solely on your instructions; server logs are processed under Article 6(1)(f) (legitimate interest: security and stability of the service).

## 5. Data Transfers and Third Parties

- **Content Delivery Network (CDN)**: only static assets (JavaScript, CSS, fonts, etc.) are distributed through CDN edge nodes for faster loading. All API requests (including photo uploads) bypass the CDN cache; photos never enter the CDN cache.
- Apart from the above, we do not share your data with any third party and do not transfer it outside the European Union.
- All data transfers are encrypted with TLS/HTTPS.

## 6. Data Retention

- Photos in browser memory: disappear when you close or refresh the page;
- Batch rendering tasks in server memory: retained for at most 10 minutes, released immediately after download;
- We retain no copies of your photos.

## 7. Your Rights (GDPR)

You have the right to request access to, rectification, erasure, restriction of processing, data portability, and to object to the processing of your personal data. Because this service does not store any of your personal data, erasure requests are automatically satisfied — we have no copies to keep. To exercise your rights or if you have any questions, contact us via Section 2. You also have the right to lodge a complaint with your local or the server-location data protection supervisory authority.

## 8. Children's Privacy

This service is not directed at children under the age of 16 (or the lower applicable age in your jurisdiction), and we do not knowingly collect personal data from children.

## 9. Changes to This Policy

If we make material changes to this policy, we will publish an updated version at [legal.itzdrli.cc](https://legal.itzdrli.cc/) and update the "Effective date" at the top of this page.

## 10. Contact Us

- Email: me@itzdrli.cc
- Last updated: 2026-08-06 (August 6th of 2026)