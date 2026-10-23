# Mang Demet Lechon & Liempo Reservation System

A responsive, multi-page Web Development project for **Mang Demet Lechon & Liempo**. It includes a public website, customer account and reservation area, and a separate admin area. The menu is intentionally limited to two products: Lechon Manok and Liempo.

## Run locally

The project uses plain HTML, CSS, and JavaScript; it has no package installation or build step. For the best browser compatibility, serve the project folder over HTTP:

1. Install Python 3 if it is not already available.
2. Open a terminal in the project folder.
3. Run `python -m http.server 8000`.
4. Visit `http://localhost:8000`.

You can also use the Live Server extension in VS Code. Modern browser APIs are used for password hashing and unique reservation identifiers.

## Demo accounts

- **Admin username:** `admin`
- **Admin password:** `DemetAdmin2026!`
- **Customer:** Create an account at `signup.html` and use those credentials at `login.html`.

Admin access is only offered through the separate Admin Login page. There is no public admin registration.

## Pages and project structure

```text
.
├── index.html                 Public home page
├── about.html                 Business story, mission, vision, and menu
├── contact.html               Validated contact form and business placeholders
├── signup.html                Customer registration
├── login.html                 Customer login
├── admin-login.html           Separate admin login
├── customer/
│   └── dashboard.html         Customer shop, reservations, lookup, and profile
├── admin/
│   └── dashboard.html         Admin overview, reservation, product, and report tools
└── assets/
    ├── app.js                 Shared UI, browser-storage data, and application logic
    └── style.css              Responsive site and dashboard styles
```

## Features

- Customer registration validates required fields, email format, username/email uniqueness, and matching passwords. Passwords are stored as salted PBKDF2 hashes and are never displayed.
- Customer login accepts a username or email. Customer and admin areas have separate role checks and navigation.
- The product list is limited to Lechon Manok and Liempo. Admins can change either product's description, price, and availability.
- Customers reserve quantities of 1–20, select a pickup date and time, and see an automatically calculated 30% down payment and order total before confirmation.
- Pickup dates are offered up to 14 days ahead. Each two-hour pickup slot has a shared capacity of four active reservations. Cancelled reservations no longer use capacity.
- Reservations receive unique `MD-YYYYMMDD-XXXXXX` numbers. Customers can see order history, submit a down-payment status for verification, cancel pending reservations, and look up their own reservation number.
- Admins can verify submitted down payments, update reservation statuses, view customer contact details (never passwords), manage products, and see reports calculated from saved orders.
- The contact form validates and saves messages in the current browser. Business phone, address, and hours remain placeholders because no real details were supplied.

## Testing checklist

1. Open `signup.html`; try missing fields, an invalid email, mismatched passwords, and duplicate username/email. Complete a valid registration and log in.
2. Log out, then try an invalid customer login and a valid username-or-email login.
3. Use the separate Admin Login page. Check that invalid credentials fail and that admin pages redirect when no admin session exists.
4. In the customer dashboard, search the two products, reserve a quantity, and verify the total and 30% down payment. Create more than one reservation and confirm the reservation numbers differ.
5. Try filling a pickup slot to capacity; the full slot is disabled and cannot accept another order. Cancel a pending order and verify its slot can be selected again.
6. Submit a down payment for verification, then sign in as admin and verify it. Change a reservation status and confirm it appears in the customer's history.
7. Search for a reservation number from the owning customer account, update the customer profile, and edit a product price/description/availability as admin.
8. Check the admin reports, contact form validation/success message, public Contact navigation, and responsive layouts at narrow and wide viewport sizes.

The app stores demo data in the browser's `localStorage`. To reset all demo accounts, products, messages, reservations, and sessions, clear the site's local storage in browser developer tools and reload.

## Deployment and security

This is a **front-end-only educational demo**, not a production reservation or payment service. Browser storage is local to one browser and is not shared with other customers or administrators. The admin credentials and authorization logic are present in client-side JavaScript and are therefore inspectable; client-side role checks are not secure access control. Payment submission is a status marker only—no payment is processed. Do not use real customer data, real passwords, or accept real payments with this demo.

GitHub Pages can host the static pages: publish the repository root from the desired branch in **Settings → Pages**. The customer and admin experience will work separately in each visitor's browser, but data will not sync or persist across devices. For a real deployment, replace browser storage and the demo admin check with a secured backend, database, server-side authentication/authorization, and a payment provider before collecting customer information or money.

Food photography is loaded from Unsplash URLs and therefore requires an internet connection.
