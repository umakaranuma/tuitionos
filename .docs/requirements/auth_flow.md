# TuitionOS Account & Authentication Flow Architecture

Since TuitionOS is operating as a **Multi-tenant SaaS on a Single Domain** (e.g., `app.tuitionos.com` or `tuitionos.com/login` for all institutes), institutes are identified by their unique credentials rather than custom subdomains. 

Below is the complete, analyzed lifecycle for how accounts are created, distributed, and managed.

---

## Phase 1: Super Admin (Fynux) Account Creation

The Super Admin portal is strictly for Fynux internal staff to manage subscriptions and institutes. Because this is the master key to the system, admin accounts are **never** created via a public sign-up page.

### How it works:
1. **Database Seeding:** The primary Fynux Admin account is created directly in the database during initial deployment using a seeding script or backend environment variables.
2. **Accessing the Portal:** Admins log into the secure Admin Portal (e.g., `admin.tuitionos.com`).
3. **Sub-Admins:** If Fynux needs to add more sales or support staff, the primary Super Admin logs into the Admin Portal and creates those internal user accounts manually.

---

## Phase 2: Creating an Institute Account

Because TuitionOS is a B2B platform, institutes cannot "self-register" and start using the app automatically. They must be provisioned by Fynux after a successful demo and payment.

### The Provisioning Flow:
1. **Request Received:** Fynux receives the "Demo Request" email (via Web3Forms).
2. **Deal Closed:** Fynux staff negotiates and finalizes the package with the institute.
3. **Admin Creates Institute:** 
   - Fynux Admin logs into the Admin Portal.
   - Navigates to **Create Institute** (Vendor).
   - Enters the institute's details (Name, Contact Person, Subscription Package, and **Primary Email**).
4. **Credential Generation:** 
   - The backend automatically generates a secure, randomized temporary password for the institute.
   - The backend inserts the institute into the database with a unique `tenant_id`.
5. **Welcome Email:** 
   - An automated email is dispatched to the institute's Primary Email address.
   - **Content:** "Welcome to TuitionOS. Access your portal at `app.tuitionos.com/login` using your Email: `[Institute Email]` and Temporary Password: `[Generated Password]`."

---

## Phase 3: Institute Login & Multi-Tenancy Routing

Since all institutes use the exact same login page, the system relies on backend logic to load the correct institute data.

1. **Login Action:** The institute visits the shared login page and enters their email and password.
2. **Authentication:** The backend verifies the credentials.
3. **Tenant Context Assignment:** 
   - Upon successful login, the backend generates an Authentication Token (JWT or Session).
   - This token silently contains the institute's unique `tenant_id`.
   - Every API request the institute makes going forward uses this `tenant_id` to ensure they only see their own students, teachers, and financial data. 
4. **First-time Login Rule (Recommended):** The system detects that the institute is using a temporary password and immediately forces them to set a new, private password before accessing the dashboard.

---

## Phase 4: Password Reset Flow (Forgot Password)

If an institute owner forgets their password, the flow must be entirely self-serve to reduce Fynux's support burden.

1. **Trigger:** The institute clicks **"Forgot Password"** on the single-domain login page.
2. **Verification:** They enter their registered email address.
3. **Token Generation:** The backend verifies the email exists, generates a secure, short-lived reset token (valid for 15-30 minutes), and saves it to the database.
4. **Email Delivery:** The system emails a secure link: `app.tuitionos.com/reset-password?token=xyz123`.
5. **Reset Action:** The user clicks the link, enters a new password, and the backend securely hashes and saves the new password, instantly expiring the token to prevent reuse.

---

## Summary of the Data Structure

To make this single-domain system work securely, your database relies on strict relational linking:

* **`Admins` Table:** Stores Fynux staff. Completely isolated from the main app.
* **`Institutes` Table (Tenants):** Stores Institute Name, Email, Password Hash, and Subscription Status.
* **`Students` / `Teachers` / `Batches` Tables:** Every single record in these tables MUST have an `institute_id` column. When data is queried, the backend automatically appends `WHERE institute_id = [Logged in Institute's ID]`. This guarantees zero data leakage between different institutes.
