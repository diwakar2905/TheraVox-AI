# HIPAA & GDPR Data Safeguards & Security Compliance - TheraVox AI

## 1. Technical Safeguards

- **Encryption at Rest**: PostgreSQL and SQLite databases are encrypted using AES-256 standards.
- **Encryption in Transit**: All API traffic strictly enforced over TLS 1.3 / HTTPS.
- **Access Control & RBAC**: Role-Based Access Control (`user`, `therapist`, `admin`) prevents unauthorized access to client health entries.
- **Audit Logging**: `AuditLogDB` logs all access attempts, data exports, and therapist data views.

## 2. Business Associate Agreements & Consent
- **Explicit Consent**: Patient data is never shared with therapists unless explicit client consent (`consent_shared = True`) is toggled in user settings.
- **Right to Erasure (GDPR Art. 17)**: Users can initiate total account purging and download full data exports at any time.
