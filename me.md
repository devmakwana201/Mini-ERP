# Auth Flow — Dual Login + Sign Up + Forgot Password

## Overview

The image shows a complete authentication flow with **3 screens**:

| Screen | Path | Who uses it |
|---|---|---|
| Login (System Administrator) | `/sign-in?role=admin` | Admin who manages access rights |
| Login (System User) | `/sign-in` (default) | Regular software user |
| Sign Up | `/sign-up` | New user self-registration |
| Forgot Password | `/forgot-password` | (already partially exists in backend) |

The two login pages are **identical in fields** — they only differ by a toggle link at the bottom (`Login as System Administrator` ↔️ `Login as User`) and the role being submitted.

---

## User Review Required

> [!IMPORTANT]
> **Role handling:** The image says "Login as System Administrator = someone who manages access rights". Does your `usermaster` table have a `roleid` or `role` column that distinguishes admin vs user? I'll check during research. If not, I need to add a role field to the login check.

> [!IMPORTANT]
> **Sign Up creates a record in `usermaster`?** The image says "Create a user database into the system on signup". Does this mean the signup creates a full user account in `usermaster`, or a pending/invite record? I'll assume it creates a real row with `isapproved = 0` (pending admin approval) unless you tell me otherwise.

> [!WARNING]
> **The current login uses `email` as the login ID.** The wireframe uses "Login Id" (username-style). The Sign Up form also says "Enter Login Id" — not email. I'll switch the login field to accept **either username OR email** to be compatible with the existing backend.

---

## Open Questions

> [!IMPORTANT]
> **Q1:** Should Sign Up auto-approve the user (immediately usable) or require admin approval first?

> [!IMPORTANT]
> **Q2:** The "Login as System Administrator" link — does it show a different `roleid`-gated page, or is it literally the same login form with a visual indicator that the admin is logging in?

---

## Proposed Changes

---

### 1. Backend — New Signup Endpoint

#### [MODIFY] `src/controllers/auth.controller.js`
Add `userSignup` handler:
- Validates Login ID is 6–12 chars, unique
- Validates Email is unique in `usermaster`
- Validates password: `≥ 8 chars`, has lowercase, uppercase, and special char
- Validates Re-Enter Password matches
- Hashes password and inserts into `usermaster`
- Returns success — user can then login

#### [MODIFY] `src/routes/auth.routes.js`
```
POST /api/v1/auth/signup  →  userSignup
```

#### [MODIFY] `src/middlewares/validation.js`
Add `signupUser` Joi schema:
```js
signupUser: Joi.object({
  username:        Joi.string().alphanum().min(6).max(12).required(),
  email:           Joi.string().email().required(),
  password:        Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])/).required(),
  confirmPassword: Joi.valid(Joi.ref('password')).required(),
})
```

#### [MODIFY] `src/models/masters/user-mgmt/user.model.js`
Add `signup` method:
- Check `username` uniqueness
- Check `email` uniqueness
- Hash password, insert user row

---

### 2. Frontend — Auth Pages Overhaul

#### [MODIFY] `src/app/pages/Auth/index.jsx`
Replace the current single login page with a tabbed/switchable **dual-mode login**:
- Two modes: `user` (default) and `admin`
- Query param `?mode=admin` shows the admin login variant
- A link at the bottom toggles between modes
- Same fields: Login ID + Password + Sign In button + Forgot Password? + Sign Up links
- Error message: `"Invalid Login Id or Password"`
- On Sign Up click → navigate to `/sign-up`
- On Forgot Password click → navigate to `/forgot-password`

#### [NEW] `src/app/pages/Auth/SignUp.jsx`
New Sign Up page with:
- **Enter Login Id** — 6–12 characters, unique, alphanumeric
- **Enter Email Id** — valid email, unique
- **Enter Password** — min 8 chars, 1 lowercase, 1 uppercase, 1 special char
- **Re-Enter Password** — must match Password
- **SIGN UP** button
- Link back to `/sign-in`
- Calls `POST /api/v1/auth/signup`
- On success: shows toast + redirects to `/sign-in`

#### [NEW] `src/app/pages/Auth/ForgotPassword.jsx`
Forgot Password page:
- **Email field** — enter registered email
- **Send Reset Link** button
- Calls existing `POST /api/v1/auth/forgot-password`
- Shows success message
- Link back to `/sign-in`

#### [NEW] `src/services/auth/auth.service.jsx`
A service file for auth API calls (signup, forgot-password):
```js
AuthService = {
  signup(payload)         → POST /auth/signup
  forgotPassword(email)   → POST /auth/forgot-password
}
```

---

### 3. Frontend — Router + Navigation

#### [MODIFY] `src/app/router/ghost.jsx` (or public routes)
Add public routes for:
- `/sign-up` → SignUp page
- `/forgot-password` → ForgotPassword page

The current `/sign-in` ghost route already points to the Auth page.

---

## Validations (from image)

### Login Page:
- ✅ Check Login Credentials
- ✅ Match credentials → allow login
- ✅ If credentials don't match → error: **"Invalid Login Id or Password"**
- ✅ When clicked Sign Up → navigate to Sign Up page
- ✅ When clicked Forgot Password → navigate to Forgot Password page

### Sign Up Page:
- ✅ Login ID: unique, 6–12 characters
- ✅ Email: must not be duplicate in database
- ✅ Password: must contain lowercase + uppercase + special char, length > 8
- ✅ Re-Enter Password: must match Password

---

## Verification Plan

### Manual Verification
1. Go to `/sign-in` — confirm User login mode shows with "Login as System Administrator" link
2. Click "Login as System Administrator" — confirm URL becomes `?mode=admin` and bottom link changes to "Login as User"
3. Enter wrong credentials → confirm "Invalid Login Id or Password" error toast
4. Click "Sign Up" → goes to `/sign-up`
5. Fill Sign Up form:
   - Short username (< 6) → validation error
   - Duplicate username → API error
   - Weak password → validation error
   - Mismatched passwords → validation error
   - Valid data → success toast, redirect to `/sign-in`
6. Click "Forgot Password" → goes to `/forgot-password`
7. Enter email → email sent response