# Security Specification - SDA Tanzania CMS & Tracker

## 1. Data Invariants
- Every church-related entity (Member, Service, Minister, Announcement, Livestream, Offering, Expense, Account, AuditLog) must have a valid `churchId`.
- Access to church-related entities is restricted to Super Admins, Church Admins of that church, and (for financial entities) Treasurers of that church.
- Audit logs are read-only for eligible roles and cannot be modified or deleted.
- User profiles can only be modified by the user themselves or a Super Admin.
- Global configuration is public for reading but only Super Admins can write to it.

## 2. The "Dirty Dozen" Payloads

### P1: Unauthorized Offering Creation (Identity Spoofing)
A user tries to create an offering for another church.
```json
{
  "churchId": "other_church_id",
  "memberId": "member_123",
  "amount": 100,
  "date": "2024-04-18"
}
```
**Expected Result:** PERMISSION_DENIED

### P2: State Shortcut (Status Update as Online User)
An online user tries to update a member's status.
```json
{
  "status": "Inactive"
}
```
**Expected Result:** PERMISSION_DENIED

### P3: Resource Poisoning (Large Data Injection)
Setting a church name to a 1MB string.
```json
{
  "name": "A".repeat(1024 * 1024)
}
```
**Expected Result:** PERMISSION_DENIED

### P4: Audit Log Modification
Attempting to update an audit log entry.
```json
{
  "details": "Tampered logs"
}
```
**Expected Result:** PERMISSION_DENIED

### P5: Account Balance Manipulation
A regular user trying to update an account balance directly.
```json
{
  "balance": 999999
}
```
**Expected Result:** PERMISSION_DENIED

### P6: User Role Escalation
A user trying to set their own role to 'admin'.
```json
{
  "role": "admin"
}
```
**Expected Result:** PERMISSION_DENIED

### P7: Orphaned Offering (Invalid Church Reference)
Creating an offering for a non-existent church.
**Expected Result:** PERMISSION_DENIED (via exists check)

### P8: PII Leak (Reading another user's profile)
An online user trying to read another user's profile details.
**Expected Result:** PERMISSION_DENIED

### P9: Shadow Update (Adding unauthorized fields)
Adding a hidden field to a church document.
```json
{
  "isVerified": true
}
```
**Expected Result:** PERMISSION_DENIED (via hasOnly check)

### P10: Query Scrapping (Broad Audit Log Query)
A treasurer trying to fetch ALL audit logs without filtering by churchId.
**Expected Result:** PERMISSION_DENIED

### P11: Timestamp Spoofing
Setting a backdated `createdAt` timestamp.
```json
{
  "createdAt": "2020-01-01T00:00:00Z"
}
```
**Expected Result:** PERMISSION_DENIED (via request.time check)

### P12: Invalid ID Poisoning
Creating a document with an extremely long or invalid ID.
**Expected Result:** PERMISSION_DENIED (via isValidId check)
