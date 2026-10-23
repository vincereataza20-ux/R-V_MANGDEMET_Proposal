(() => {
  "use strict";

  const DATA_KEY = "mangDemetDataV1";
  const SESSION_KEY = "mangDemetSessionV1";
  const DEPOSIT_RATE = 0.30;
  const SLOT_CAPACITY = 4;
  const PICKUP_SLOTS = ["10:00 AM - 12:00 PM", "12:00 PM - 2:00 PM", "2:00 PM - 4:00 PM", "4:00 PM - 6:00 PM"];
  const PRODUCT_SEED = [
    { id: "lechon-manok", name: "Lechon Manok", description: "Whole chicken, marinated with our savory blend and roasted until golden and juicy.", price: 450, unit: "per piece", available: true, image: "chicken" },
    { id: "liempo", name: "Liempo", description: "Tender pork belly, seasoned and grilled for smoky edges and delicious flavor.", price: 350, unit: "per order", available: true, image: "liempo" }
  ];
  const STATUSES = ["Pending confirmation", "Confirmed", "Preparing", "Ready for pickup", "Completed", "Cancelled"];
  const ADMIN_USER = "admin";
  const ADMIN_PASSWORD = "DemetAdmin2026!";
  const path = window.location.pathname;
  const rootPrefix = /\/(customer|admin)\//i.test(path) ? "../" : "";

  function freshDb() {
    return { products: PRODUCT_SEED.map(product => ({ ...product })), customers: [], reservations: [], messages: [] };
  }

  function db() {
    const saved = localStorage.getItem(DATA_KEY);
    if (!saved) {
      const initial = freshDb();
      localStorage.setItem(DATA_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(saved);
    if (!parsed || !Array.isArray(parsed.products) || !Array.isArray(parsed.customers) || !Array.isArray(parsed.reservations)) {
      throw new Error("Saved project data is invalid. Clear this site's local storage to restore the demo data.");
    }
    return parsed;
  }

  function saveDb(data) {
    localStorage.setItem(DATA_KEY, JSON.stringify(data));
  }

  function currentSession() {
    const value = localStorage.getItem(SESSION_KEY);
    return value ? JSON.parse(value) : null;
  }

  function setSession(session) {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }

  function money(value) {
    return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 2 }).format(Number(value) || 0);
  }

  function dateText(value) {
    if (!value) return "";
    return new Intl.DateTimeFormat("en-PH", { year: "numeric", month: "short", day: "numeric" }).format(new Date(`${value}T12:00:00`));
  }

  function showToast(message, type = "") {
    document.querySelector(".toast")?.remove();
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.setAttribute("role", "status");
    toast.textContent = message;
    document.body.append(toast);
    window.setTimeout(() => toast.remove(), 3600);
  }

  function makeBrand() {
    return `<a class="brand" href="${rootPrefix}index.html" aria-label="Mang Demet home"><span class="brand-mark" aria-hidden="true">MD</span><span class="brand-copy"><strong>MANG DEMET</strong><small>LECHON &amp; LIEMPO</small></span></a>`;
  }

  function renderPublicChrome() {
    const session = currentSession();
    const header = document.getElementById("site-header");
    if (header) {
      const page = document.body.dataset.page;
      const link = (href, label, active) => `<a href="${href}"${active ? ' class="active"' : ""}>${label}</a>`;
      header.innerHTML = `<header class="site-header">${makeBrand()}<button class="mobile-menu" type="button" aria-label="Toggle navigation" aria-expanded="false">☰</button><nav class="main-nav" aria-label="Main navigation">${link(`${rootPrefix}index.html`, "Home", page === "home")}${link(`${rootPrefix}about.html`, "About Us", page === "about")}${link(`${rootPrefix}contact.html`, "Contact Us", page === "contact")}</nav><div class="nav-actions">${session?.role === "customer" ? `<a class="text-link" href="${rootPrefix}customer/dashboard.html">My dashboard</a>` : `<a class="text-link" href="${rootPrefix}login.html">Log in</a>`}<a class="button button-primary" href="${rootPrefix}customer/dashboard.html#shop" data-reserve-link>Reserve now</a></div></header>`;
      header.querySelector(".mobile-menu")?.addEventListener("click", event => {
        const nav = header.querySelector(".main-nav");
        const open = nav.classList.toggle("open");
        event.currentTarget.setAttribute("aria-expanded", String(open));
      });
    }
    const footer = document.getElementById("site-footer");
    if (footer) footer.innerHTML = `<footer class="site-footer"><div class="footer-main"><div class="footer-brand">${makeBrand()}<p>Authentic, freshly grilled favorites, made for sharing. Reserve ahead and bring home something delicious.</p></div><div class="footer-links"><div><strong>EXPLORE</strong><a href="${rootPrefix}index.html">Home</a><a href="${rootPrefix}about.html">About Us</a><a href="${rootPrefix}contact.html">Contact Us</a></div><div><strong>YOUR ACCOUNT</strong><a href="${rootPrefix}login.html">Customer login</a><a href="${rootPrefix}signup.html">Create account</a><a href="${rootPrefix}admin-login.html">Admin login</a></div></div></div><div class="footer-bottom"><span>© ${new Date().getFullYear()} Mang Demet Lechon &amp; Liempo</span><span>Freshly grilled, always shared.</span></div></footer>`;
  }

  function productCard(product, dashboard = false) {
    const imageClass = product.id === "liempo" ? "liempo" : "chicken";
    const unavailable = !product.available;
    if (dashboard) return `<article class="dash-product"><div class="product-image ${imageClass}">${unavailable ? '<span class="product-badge">CURRENTLY UNAVAILABLE</span>' : ""}</div><div class="dash-product-body"><h3>${esc(product.name)}</h3><p>${esc(product.description)}</p><div class="price">${money(product.price)} <small>${esc(product.unit)}</small></div><button class="button button-primary" type="button" data-reserve-product="${esc(product.id)}" ${unavailable ? "disabled" : ""}>${unavailable ? "Unavailable" : "Reserve now →"}</button></div></article>`;
    return `<article class="product-card"><div class="product-image ${imageClass}"><span class="product-badge">${unavailable ? "CURRENTLY UNAVAILABLE" : "A GRILL FAVORITE"}</span></div><div class="product-info"><h3>${esc(product.name)}</h3><p>${esc(product.description)}</p><div class="price">${money(product.price)} <small>${esc(product.unit)}</small></div><a class="button button-primary" href="${rootPrefix}customer/dashboard.html#shop" data-reserve-link>${unavailable ? "View menu" : "Reserve now"} <span aria-hidden="true">→</span></a></div></article>`;
  }

  function renderFeatured() {
    const target = document.getElementById("featured-products");
    if (target) target.innerHTML = db().products.map(product => productCard(product)).join("");
  }

  function validEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function showFormError(id, message) {
    const target = document.getElementById(id);
    if (target) {
      target.textContent = message;
      target.classList.remove("success");
    }
  }

  function showFormSuccess(id, message) {
    const target = document.getElementById(id);
    if (target) {
      target.textContent = message;
      target.classList.add("success");
    }
  }

  async function passwordHash(password, salt) {
    if (!window.crypto?.subtle) throw new Error("Secure password hashing is unavailable. Open this project using a modern browser or a local web server.");
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: encoder.encode(salt), iterations: 120000, hash: "SHA-256" }, key, 256);
    return Array.from(new Uint8Array(bits), byte => byte.toString(16).padStart(2, "0")).join("");
  }

  function setupSignup() {
    const form = document.getElementById("signup-form");
    if (!form) return;
    form.addEventListener("submit", async event => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      const errors = [];
      if (!data.name.trim() || !data.email.trim() || !data.username.trim() || !data.phone.trim() || !data.password || !data.confirm) errors.push("Please complete every field.");
      if (data.email && !validEmail(data.email.trim())) errors.push("Enter a valid email address.");
      if (data.username && data.username.trim().length < 3) errors.push("Username must be at least 3 characters.");
      if (data.password && data.password.length < 8) errors.push("Password must be at least 8 characters.");
      if (data.password !== data.confirm) errors.push("Password and confirmation do not match.");
      const database = db();
      if (database.customers.some(user => user.username.toLowerCase() === data.username.trim().toLowerCase())) errors.push("That username is already registered.");
      if (database.customers.some(user => user.email.toLowerCase() === data.email.trim().toLowerCase())) errors.push("That email address is already registered.");
      if (errors.length) {
        showFormError("signup-errors", errors.join(" "));
        return;
      }
      const button = form.querySelector('[type="submit"]');
      button.disabled = true;
      try {
        const salt = crypto.randomUUID();
        database.customers.push({ id: crypto.randomUUID(), name: data.name.trim(), email: data.email.trim().toLowerCase(), username: data.username.trim(), phone: data.phone.trim(), passwordSalt: salt, passwordHash: await passwordHash(data.password, salt), createdAt: new Date().toISOString() });
        saveDb(database);
        showFormSuccess("signup-errors", "Account created successfully. Redirecting to customer login…");
        form.reset();
        window.setTimeout(() => { window.location.href = "login.html?registered=1"; }, 1000);
      } catch (error) {
        showFormError("signup-errors", error.message || "We could not create your account. Please try again.");
        button.disabled = false;
      }
    });
  }

  function setupLogin() {
    const form = document.getElementById("login-form");
    if (!form) return;
    if (new URLSearchParams(location.search).has("registered")) showFormSuccess("login-errors", "Account created. Please log in.");
    form.addEventListener("submit", async event => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      if (!data.identity.trim() || !data.password) {
        showFormError("login-errors", "Enter your username or email and password.");
        return;
      }
      const user = db().customers.find(customer => customer.username.toLowerCase() === data.identity.trim().toLowerCase() || customer.email.toLowerCase() === data.identity.trim().toLowerCase());
      if (!user) {
        showFormError("login-errors", "Those login details don’t match an account. Check them or sign up.");
        return;
      }
      try {
        if (await passwordHash(data.password, user.passwordSalt) !== user.passwordHash) {
          showFormError("login-errors", "Those login details don’t match an account. Check them or sign up.");
          return;
        }
        setSession({ role: "customer", customerId: user.id });
        window.location.href = "customer/dashboard.html";
      } catch (error) {
        showFormError("login-errors", error.message || "Login could not be completed.");
      }
    });
  }

  function setupAdminLogin() {
    const form = document.getElementById("admin-login-form");
    if (!form) return;
    form.addEventListener("submit", event => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      if (data.username === ADMIN_USER && data.password === ADMIN_PASSWORD) {
        setSession({ role: "admin" });
        window.location.href = "admin/dashboard.html";
      } else showFormError("admin-login-errors", "Invalid admin username or password.");
    });
  }

  function setupContact() {
    const form = document.getElementById("contact-form");
    if (!form) return;
    form.addEventListener("submit", event => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      if (!data.name.trim() || !data.email.trim() || !data.subject.trim() || !data.message.trim()) {
        showFormError("contact-feedback", "Please fill in all fields.");
        return;
      }
      if (!validEmail(data.email.trim())) {
        showFormError("contact-feedback", "Enter a valid email address.");
        return;
      }
      const database = db();
      database.messages.push({ name: data.name.trim(), email: data.email.trim(), subject: data.subject.trim(), message: data.message.trim(), createdAt: new Date().toISOString() });
      saveDb(database);
      form.reset();
      showFormSuccess("contact-feedback", "Thanks for your message. It has been saved in this browser.");
    });
  }

  function sessionCustomer() {
    const session = currentSession();
    if (session?.role !== "customer") return null;
    return db().customers.find(user => user.id === session.customerId) || null;
  }

  function myReservations(customerId) {
    return db().reservations.filter(item => item.customerId === customerId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  function pill(text, extra = "") {
    let style = "";
    if (["Confirmed", "Ready for pickup", "Completed", "Verified"].includes(text)) style = "paid";
    else if (text === "Cancelled") style = "cancelled";
    else if (text === "Submitted for verification") style = "submitted";
    return `<span class="status-pill ${style} ${extra}">${esc(text)}</span>`;
  }

  function reservationItem(item) {
    return `<article class="reservation-item"><div><h3>${esc(item.number)} · ${esc(item.productName)} × ${item.quantity}</h3><p>${dateText(item.pickupDate)} · ${esc(item.pickupSlot)} · Payment ${item.paymentStatus === "Verified" ? "verified" : item.paymentStatus === "Submitted for verification" ? "submitted" : "pending"}</p></div><div class="item-right"><div class="amount">${money(item.total)}</div>${pill(item.status)}</div></article>`;
  }

  function customerNav(selected) {
    const links = [["home", "⌂", "Dashboard Home"], ["shop", "＋", "Shop / Reserve"], ["reservations", "▤", "My Reservations"], ["lookup", "⌕", "Reservation Lookup"], ["profile", "◉", "My Profile"]];
    return `<div class="dash-nav">${links.map(([id, icon, title]) => `<a href="#${id}" data-customer-view="${id}" class="${selected === id ? "selected" : ""}"><span class="nav-icon">${icon}</span>${title}</a>`).join("")}</div>`;
  }

  function customerShell(customer) {
    const session = currentSession();
    if (!customer || session?.role !== "customer") {
      window.location.replace("../login.html");
      return;
    }
    document.getElementById("customer-app").innerHTML = `<div class="dashboard-shell"><aside class="dash-sidebar">${makeBrand()}<div class="dash-label">CUSTOMER MENU</div><nav id="customer-nav" aria-label="Customer dashboard">${customerNav("home")}</nav><div class="sidebar-bottom"><button class="dash-nav-logout" type="button" data-logout>↪ &nbsp; Log out</button><a class="dash-nav" href="../index.html">← &nbsp; Back to website</a></div></aside><main class="dash-main"><header class="dash-topbar"><div><h1>Customer dashboard</h1><p>Your table, all in one place.</p></div><div class="dash-user"><span class="avatar">${esc(customer.name.charAt(0).toUpperCase())}</span><span><strong>${esc(customer.name)}</strong><small>Customer</small></span></div></header><div class="dash-content" id="customer-content"></div><footer class="dashboard-footer">Mang Demet Lechon &amp; Liempo · Freshly grilled, always shared.</footer></main></div><div class="modal-backdrop" id="reservation-modal" hidden></div>`;
    renderCustomerView("home");
  }

  function renderCustomerView(view) {
    const target = document.getElementById("customer-content");
    const customer = sessionCustomer();
    if (!target || !customer) return;
    document.getElementById("customer-nav").innerHTML = customerNav(view);
    const reservations = myReservations(customer.id);
    const active = reservations.filter(item => !["Cancelled", "Completed"].includes(item.status));
    if (view === "home") {
      const products = db().products.filter(product => product.available);
      target.innerHTML = `<section class="welcome-card"><div><span class="eyebrow">WELCOME BACK</span><h2>Good to see you, ${esc(customer.name.split(" ")[0])}.</h2><p>What delicious favorite are you planning today?</p></div><a class="button button-light" href="#shop" data-customer-view="shop">Reserve a favorite →</a></section><div class="stat-grid"><article class="stat-card"><span>Active reservations</span><strong>${active.length}</strong></article><article class="stat-card"><span>Completed orders</span><strong>${reservations.filter(item => item.status === "Completed").length}</strong></article><article class="stat-card"><span>Down payments verified</span><strong>${reservations.filter(item => item.paymentStatus === "Verified").length}</strong></article></div><div class="dashboard-columns"><section class="dash-panel"><div class="panel-heading"><h2>Shop our favorites</h2><a href="#shop" data-customer-view="shop">Full menu →</a></div><div class="dash-product-grid">${products.map(product => productCard(product, true)).join("") || '<p class="empty-state">Our grill favorites are temporarily unavailable.</p>'}</div></section><section class="dash-panel"><div class="panel-heading"><h2>Upcoming reservations</h2><a href="#reservations" data-customer-view="reservations">View all →</a></div><div class="reservation-list">${active.filter(item => item.pickupDate >= new Date().toISOString().slice(0, 10)).slice(0, 3).map(reservationItem).join("") || '<div class="empty-state">No upcoming reservations yet. <a href="#shop" data-customer-view="shop">Reserve your first order.</a></div>'}</div><div class="panel-heading" style="margin-top:25px"><h2>Recent history</h2></div><div class="reservation-list">${reservations.slice(0, 2).map(reservationItem).join("") || '<div class="empty-state">Your completed and past reservations will appear here.</div>'}</div></section></div>`;
    } else if (view === "shop") {
      target.innerHTML = `<section class="section-view"><span class="eyebrow">STRAIGHT FROM OUR GRILL</span><h2>Pick your favorites.</h2><p class="view-intro">Only our two grill classics. Select a pickup time and place your reservation.</p><div class="search-row"><input class="filter-control" type="search" id="product-search" placeholder="Search favorites…" aria-label="Search products"><select class="filter-control" id="availability-filter" aria-label="Filter product availability"><option value="all">All products</option><option value="available">Available now</option></select></div><div class="dash-product-grid" id="shop-products">${db().products.map(product => productCard(product, true)).join("")}</div></section>`;
    } else if (view === "reservations") {
      target.innerHTML = `<section class="section-view"><span class="eyebrow">YOUR ORDER HISTORY</span><h2>My reservations.</h2><p class="view-intro">See reservation details, down-payment status, and pickup updates.</p><div class="reservation-list">${reservations.map(item => `<article class="dash-panel"><div class="panel-heading"><h2>${esc(item.number)}</h2>${pill(item.status)}</div><div class="reservation-item"><div><h3>${esc(item.productName)} × ${item.quantity}</h3><p>Pickup ${dateText(item.pickupDate)} · ${esc(item.pickupSlot)}</p></div><div class="item-right"><div class="amount">${money(item.total)}</div><small>30% down payment: ${money(item.downPayment)}</small></div></div><div style="margin-top:10px;font-size:.78rem">Payment: ${pill(item.paymentStatus)} ${item.paymentStatus === "Pending" && item.status !== "Cancelled" ? `<button class="text-link" type="button" data-submit-payment="${esc(item.id)}">I’ve sent the down payment →</button>` : ""}</div>${item.status === "Pending confirmation" ? `<button class="button button-light" type="button" data-cancel-reservation="${esc(item.id)}" style="margin-top:13px">Cancel reservation</button>` : ""}</article>`).join("") || '<div class="dash-panel empty-state">You haven’t made any reservations yet. <a href="#shop" data-customer-view="shop">Browse our two favorites.</a></div>'}</div></section>`;
    } else if (view === "lookup") {
      target.innerHTML = `<section class="section-view"><span class="eyebrow">QUICK ORDER CHECK</span><h2>Reservation lookup.</h2><p class="view-intro">Enter your reservation number to check the current status and pickup details.</p><form class="dash-panel" id="lookup-form"><label>Reservation number<input class="filter-control" style="width:100%;margin-top:7px" name="number" placeholder="e.g. MD-20261023-ABC123" required></label><button class="button button-primary" type="submit">Look up reservation →</button></form><div class="lookup-result" id="lookup-result" aria-live="polite"></div></section>`;
    } else if (view === "profile") {
      target.innerHTML = `<section class="section-view"><span class="eyebrow">YOUR DETAILS</span><h2>My profile.</h2><p class="view-intro">Keep your contact details up to date for reservation updates.</p><form class="form-card profile-form" id="profile-form"><div class="form-errors" id="profile-feedback" aria-live="polite"></div><label>Full name<input name="name" value="${esc(customer.name)}" required></label><label>Email address<input name="email" type="email" value="${esc(customer.email)}" required></label><label>Username<input value="${esc(customer.username)}" disabled></label><label>Contact number<input name="phone" type="tel" value="${esc(customer.phone)}" required></label><button class="button button-primary" type="submit">Save changes</button></form></section>`;
    }
  }

  function dateOptions() {
    const list = [];
    const today = new Date();
    for (let offset = 1; offset <= 14; offset++) {
      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      list.push(`<option value="${value}">${dateText(value)}</option>`);
    }
    return list.join("");
  }

  function slotOptions(productId, date) {
    return PICKUP_SLOTS.map(slot => {
      const count = db().reservations.filter(item => item.pickupDate === date && item.pickupSlot === slot && item.status !== "Cancelled").length;
      return `<option value="${esc(slot)}" ${count >= SLOT_CAPACITY ? "disabled" : ""}>${esc(slot)} · ${Math.max(0, SLOT_CAPACITY - count)} spots left</option>`;
    }).join("");
  }

  function openReservation(productId) {
    const customer = sessionCustomer();
    const product = db().products.find(item => item.id === productId);
    if (!customer || !product || !product.available) {
      if (!customer) window.location.href = "../login.html";
      else showToast("This product is currently unavailable.");
      return;
    }
    const modal = document.getElementById("reservation-modal");
    const availableDates = [...dateOptions().matchAll(/value="([^"]+)"/g)].map(match => match[1]);
    const firstDate = availableDates[0];
    const lastDate = availableDates[availableDates.length - 1];
    modal.innerHTML = `<section class="modal" role="dialog" aria-modal="true" aria-labelledby="reservation-title"><button type="button" class="modal-close" data-close-modal aria-label="Close">×</button><span class="eyebrow">RESERVE A GRILL FAVORITE</span><h2 id="reservation-title">${esc(product.name)}</h2><p class="muted">Choose a quantity and pickup time. Your 30% down payment is calculated automatically.</p><form id="reservation-form" data-product-id="${esc(product.id)}"><label>Quantity<select name="quantity" id="reservation-quantity">${Array.from({ length: 20 }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join("")}</select></label><label>Pickup date<input name="pickupDate" id="pickup-date" type="date" min="${firstDate}" max="${lastDate}" required></label><p class="form-hint">Pickup slots have a shared capacity of ${SLOT_CAPACITY} reservations each. Dates are available up to 14 days ahead.</p><label>Pickup time<select name="pickupSlot" id="pickup-slot" required>${slotOptions(productId, firstDate)}</select></label><div class="order-summary"><span>${esc(product.name)} <span id="quantity-summary">× 1</span></span><strong id="total-summary">${money(product.price)}</strong></div><div class="calc-row"><span>Order total</span><strong id="total-line">${money(product.price)}</strong></div><div class="calc-row deposit"><span>Required 30% down payment</span><strong id="deposit-line">${money(product.price * DEPOSIT_RATE)}</strong></div><p class="form-errors" id="reservation-error" aria-live="polite"></p><button class="button button-primary button-wide" type="submit">Confirm reservation →</button></form></section>`;
    modal.hidden = false;
    const quantity = modal.querySelector("#reservation-quantity");
    const dateInput = modal.querySelector("#pickup-date");
    const slotInput = modal.querySelector("#pickup-slot");
    const refreshSlots = () => {
      const options = slotOptions(productId, dateInput.value);
      slotInput.innerHTML = options;
      if (!slotInput.querySelector("option:not([disabled])")) showFormError("reservation-error", "This date is fully booked. Please choose another date.");
      else showFormError("reservation-error", "");
    };
    const updateAmount = () => {
      const amount = product.price * Number(quantity.value);
      modal.querySelector("#quantity-summary").textContent = `× ${quantity.value}`;
      modal.querySelector("#total-summary").textContent = money(amount);
      modal.querySelector("#total-line").textContent = money(amount);
      modal.querySelector("#deposit-line").textContent = money(amount * DEPOSIT_RATE);
    };
    quantity.addEventListener("change", updateAmount);
    dateInput.addEventListener("change", refreshSlots);
    updateAmount();
    modal.querySelector("#reservation-form").addEventListener("submit", event => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(event.currentTarget));
      const count = db().reservations.filter(item => item.pickupDate === values.pickupDate && item.pickupSlot === values.pickupSlot && item.status !== "Cancelled").length;
      if (!values.pickupDate || !values.pickupSlot || count >= SLOT_CAPACITY) {
        showFormError("reservation-error", "That pickup slot is no longer available. Choose another date or time.");
        refreshSlots();
        return;
      }
      const quantityValue = Number(values.quantity);
      if (!Number.isInteger(quantityValue) || quantityValue < 1 || quantityValue > 20) {
        showFormError("reservation-error", "Choose a quantity between 1 and 20.");
        return;
      }
      const database = db();
      const number = makeReservationNumber(database);
      const total = product.price * quantityValue;
      database.reservations.push({ id: crypto.randomUUID(), number, customerId: customer.id, productId: product.id, productName: product.name, quantity: quantityValue, unitPrice: product.price, total, downPayment: Math.round(total * DEPOSIT_RATE * 100) / 100, paymentStatus: "Pending", status: "Pending confirmation", pickupDate: values.pickupDate, pickupSlot: values.pickupSlot, createdAt: new Date().toISOString() });
      saveDb(database);
      modal.hidden = true;
      showToast(`Reservation ${number} created.`, "success");
      renderCustomerView("reservations");
    });
  }

  function makeReservationNumber(database) {
    let number;
    do {
      const randomPart = crypto.getRandomValues(new Uint8Array(4));
      const code = Array.from(randomPart, byte => byte.toString(16).padStart(2, "0")).join("").slice(0, 6).toUpperCase();
      number = `MD-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${code}`;
    } while (database.reservations.some(item => item.number === number));
    return number;
  }

  function setupCustomerDashboard() {
    if (!document.getElementById("customer-app")) return;
    const customer = sessionCustomer();
    if (!customer) {
      window.location.replace("../login.html");
      return;
    }
    customerShell(customer);
    document.addEventListener("click", event => {
      const viewLink = event.target.closest("[data-customer-view]");
      if (viewLink) {
        event.preventDefault();
        renderCustomerView(viewLink.dataset.customerView);
        if (viewLink.getAttribute("href")?.startsWith("#")) history.replaceState(null, "", `#${viewLink.dataset.customerView}`);
        return;
      }
      const reserve = event.target.closest("[data-reserve-product]");
      if (reserve) openReservation(reserve.dataset.reserveProduct);
      if (event.target.closest("[data-close-modal]") || event.target.id === "reservation-modal") document.getElementById("reservation-modal").hidden = true;
      const submitPayment = event.target.closest("[data-submit-payment]");
      if (submitPayment) {
        const database = db();
        const reservation = database.reservations.find(item => item.id === submitPayment.dataset.submitPayment && item.customerId === customer.id);
        if (reservation?.paymentStatus === "Pending") {
          reservation.paymentStatus = "Submitted for verification";
          saveDb(database);
          renderCustomerView("reservations");
          showToast("Down payment marked as sent. It is awaiting admin verification.", "success");
        }
      }
      const cancel = event.target.closest("[data-cancel-reservation]");
      if (cancel) {
        const database = db();
        const reservation = database.reservations.find(item => item.id === cancel.dataset.cancelReservation && item.customerId === customer.id);
        if (reservation?.status === "Pending confirmation" && window.confirm(`Cancel reservation ${reservation.number}?`)) {
          reservation.status = "Cancelled";
          saveDb(database);
          renderCustomerView("reservations");
          showToast("Reservation cancelled.");
        }
      }
    });
    document.addEventListener("input", event => {
      if (event.target.id === "product-search") filterShop();
    });
    document.addEventListener("change", event => {
      if (event.target.id === "availability-filter") filterShop();
    });
    document.addEventListener("submit", event => {
      if (event.target.id === "lookup-form") {
        event.preventDefault();
        const number = new FormData(event.target).get("number").trim().toUpperCase();
        const result = db().reservations.find(item => item.customerId === customer.id && item.number.toUpperCase() === number);
        const box = document.getElementById("lookup-result");
        box.innerHTML = result ? `<div class="dash-panel"><div class="panel-heading"><h2>${esc(result.number)}</h2>${pill(result.status)}</div>${reservationItem(result)}<p>Down payment: ${money(result.downPayment)} · ${pill(result.paymentStatus)}</p></div>` : `<div class="dash-panel empty-state">No reservation with that number was found in your account.</div>`;
      }
      if (event.target.id === "profile-form") {
        event.preventDefault();
        const values = Object.fromEntries(new FormData(event.target));
        const database = db();
        const user = database.customers.find(item => item.id === customer.id);
        if (!values.name.trim() || !values.email.trim() || !values.phone.trim()) return showFormError("profile-feedback", "Please complete every profile field.");
        if (!validEmail(values.email.trim())) return showFormError("profile-feedback", "Enter a valid email address.");
        if (database.customers.some(item => item.id !== user.id && item.email.toLowerCase() === values.email.trim().toLowerCase())) return showFormError("profile-feedback", "That email address is already used by another account.");
        user.name = values.name.trim();
        user.email = values.email.trim().toLowerCase();
        user.phone = values.phone.trim();
        saveDb(database);
        showFormSuccess("profile-feedback", "Your profile has been updated.");
        const dashUser = document.querySelector(".dash-user");
        if (dashUser) dashUser.innerHTML = `<span class="avatar">${esc(user.name.charAt(0).toUpperCase())}</span><span><strong>${esc(user.name)}</strong><small>Customer</small></span>`;
      }
    });
    const startingView = ["home", "shop", "reservations", "lookup", "profile"].includes(location.hash.slice(1)) ? location.hash.slice(1) : "home";
    if (startingView !== "home") renderCustomerView(startingView);
  }

  function filterShop() {
    const search = (document.getElementById("product-search")?.value || "").trim().toLowerCase();
    const availableOnly = document.getElementById("availability-filter")?.value === "available";
    const products = db().products.filter(product => (!availableOnly || product.available) && (!search || `${product.name} ${product.description}`.toLowerCase().includes(search)));
    const target = document.getElementById("shop-products");
    if (target) target.innerHTML = products.map(product => productCard(product, true)).join("") || '<div class="empty-state">No favorites match your search.</div>';
  }

  function logout() {
    setSession(null);
    window.location.href = `${rootPrefix}index.html`;
  }

  function adminShell() {
    if (currentSession()?.role !== "admin") {
      window.location.replace("../admin-login.html");
      return;
    }
    document.getElementById("admin-app").innerHTML = `<div class="dashboard-shell admin-shell"><aside class="dash-sidebar">${makeBrand()}<div class="dash-label">ADMIN CONSOLE</div><nav class="dash-nav" aria-label="Admin menu"><a href="#overview" data-admin-tab="overview" class="selected"><span class="nav-icon">▦</span>Overview</a><a href="#reservations" data-admin-tab="reservations"><span class="nav-icon">▤</span>Reservations &amp; payments</a><a href="#products" data-admin-tab="products"><span class="nav-icon">♨</span>Products</a><a href="#customers" data-admin-tab="customers"><span class="nav-icon">◉</span>Customers</a><a href="#reports" data-admin-tab="reports"><span class="nav-icon">▤</span>Reports</a></nav><div class="sidebar-bottom"><button type="button" data-logout>↪ &nbsp; Log out</button><a href="../index.html">← &nbsp; Back to website</a></div></aside><main class="dash-main"><header class="dash-topbar"><div><h1>Admin dashboard</h1><p>Reservations, products, and business activity.</p></div><div class="dash-user"><span class="avatar">A</span><span><strong>Administrator</strong><small>Admin</small></span></div></header><div class="dash-content" id="admin-content"></div><footer class="dashboard-footer">Mang Demet Lechon &amp; Liempo · Admin management console</footer></main></div>`;
    renderAdminView("overview");
  }

  function adminSummary() {
    const database = db();
    const totalSales = database.reservations.filter(item => item.status !== "Cancelled").reduce((sum, item) => sum + item.total, 0);
    const today = new Date().toISOString().slice(0, 10);
    return `<div class="stat-grid"><article class="stat-card"><span>All reservations</span><strong>${database.reservations.length}</strong></article><article class="stat-card"><span>Pickup today</span><strong>${database.reservations.filter(item => item.pickupDate === today && item.status !== "Cancelled").length}</strong></article><article class="stat-card"><span>Payments to verify</span><strong>${database.reservations.filter(item => item.paymentStatus === "Submitted for verification").length}</strong></article></div><div class="report-grid"><article class="stat-card"><span>Recorded order value</span><strong>${money(totalSales)}</strong></article><article class="stat-card"><span>Pending confirmation</span><strong>${database.reservations.filter(item => item.status === "Pending confirmation").length}</strong></article><article class="stat-card"><span>Customers</span><strong>${database.customers.length}</strong></article><article class="stat-card"><span>Active products</span><strong>${database.products.filter(item => item.available).length} / 2</strong></article></div>`;
  }

  function adminReservationTable(reservations) {
    if (!reservations.length) return '<div class="empty-state">No reservations have been created yet.</div>';
    return `<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>RESERVATION</th><th>CUSTOMER</th><th>ITEM</th><th>PICKUP</th><th>TOTAL / DEPOSIT</th><th>PAYMENT</th><th>STATUS</th><th>ACTION</th></tr></thead><tbody>${reservations.map(item => {
      const customer = db().customers.find(user => user.id === item.customerId);
      return `<tr><td><strong>${esc(item.number)}</strong><br><small>${new Date(item.createdAt).toLocaleDateString()}</small></td><td>${esc(customer?.name || "Account removed")}<br><small>${esc(customer?.email || "")}</small></td><td>${esc(item.productName)} × ${item.quantity}</td><td>${dateText(item.pickupDate)}<br><small>${esc(item.pickupSlot)}</small></td><td>${money(item.total)}<br><small>Deposit ${money(item.downPayment)}</small></td><td>${pill(item.paymentStatus)}${item.paymentStatus === "Submitted for verification" ? `<br><button type="button" data-verify-payment="${esc(item.id)}" style="margin-top:5px">Verify payment</button>` : ""}</td><td><select data-status-id="${esc(item.id)}" aria-label="Update status for ${esc(item.number)}">${STATUSES.map(status => `<option ${item.status === status ? "selected" : ""}>${status}</option>`).join("")}</select></td><td><button class="small-action" type="button" data-view-reservation="${esc(item.id)}">Details</button></td></tr>`;
    }).join("")}</tbody></table></div>`;
  }

  function renderAdminView(view) {
    const target = document.getElementById("admin-content");
    if (!target) return;
    document.querySelectorAll("[data-admin-tab]").forEach(link => link.classList.toggle("selected", link.dataset.adminTab === view));
    const database = db();
    if (view === "overview") {
      const latest = [...database.reservations].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
      target.innerHTML = `<span class="eyebrow">AT A GLANCE</span><h2 style="font-size:2rem">Good day, admin.</h2><p class="view-intro">Here’s what’s happening at Mang Demet today.</p>${adminSummary()}<section class="dash-panel" style="margin-top:22px"><div class="panel-heading"><h2>Recent reservations</h2><a href="#reservations" data-admin-tab="reservations">Manage all →</a></div>${adminReservationTable(latest)}</section>`;
    } else if (view === "reservations") {
      const sorted = [...database.reservations].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      target.innerHTML = `<span class="eyebrow">ORDER MANAGEMENT</span><h2 style="font-size:2rem">Reservations &amp; payments.</h2><p class="view-intro">Verify down payments and keep customers updated with reservation status.</p><section class="dash-panel">${adminReservationTable(sorted)}</section>`;
    } else if (view === "products") {
      target.innerHTML = `<span class="eyebrow">MENU MANAGEMENT</span><h2 style="font-size:2rem">Your two grill favorites.</h2><p class="view-intro">Update prices, descriptions, and availability. Changes appear across customer pages.</p><div class="dashboard-columns">${database.products.map(product => `<form class="product-admin-card" data-product-form="${esc(product.id)}"><h3>${esc(product.name)}</h3><p class="muted" style="font-size:.72rem">Price is shown ${esc(product.unit)}.</p><div class="form-errors" id="product-feedback-${esc(product.id)}" aria-live="polite"></div><label style="display:block;font-size:.77rem;margin-top:13px">Price (PHP)<input name="price" type="number" min="1" step="0.01" value="${esc(product.price)}" required></label><label style="display:block;font-size:.77rem;margin-top:13px">Description<textarea name="description" rows="3" required>${esc(product.description)}</textarea></label><label style="display:flex;align-items:center;gap:9px;font-size:.78rem;margin:13px 0"><input name="available" type="checkbox" ${product.available ? "checked" : ""}> Available for reservations</label><button class="button button-primary" type="submit">Save product</button></form>`).join("")}</div>`;
    } else if (view === "customers") {
      target.innerHTML = `<span class="eyebrow">CUSTOMER ACCOUNTS</span><h2 style="font-size:2rem">Customers.</h2><p class="view-intro">Customer contact details and reservation counts. Passwords are never shown.</p><section class="dash-panel"><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>NAME</th><th>USERNAME</th><th>EMAIL</th><th>CONTACT</th><th>RESERVATIONS</th><th>JOINED</th></tr></thead><tbody>${database.customers.map(user => `<tr><td>${esc(user.name)}</td><td>${esc(user.username)}</td><td>${esc(user.email)}</td><td>${esc(user.phone)}</td><td>${database.reservations.filter(item => item.customerId === user.id).length}</td><td>${new Date(user.createdAt).toLocaleDateString()}</td></tr>`).join("") || '<tr><td colspan="6">No customer accounts yet.</td></tr>'}</tbody></table></div></section>`;
    } else if (view === "reports") {
      const all = database.reservations.filter(item => item.status !== "Cancelled");
      const verifiedAmount = database.reservations.filter(item => item.paymentStatus === "Verified").reduce((sum, item) => sum + item.downPayment, 0);
      const completedSales = database.reservations.filter(item => item.status === "Completed").reduce((sum, item) => sum + item.total, 0);
      const productCounts = database.products.map(product => ({ name: product.name, count: database.reservations.filter(item => item.productId === product.id && item.status !== "Cancelled").reduce((sum, item) => sum + item.quantity, 0), sales: database.reservations.filter(item => item.productId === product.id && item.status !== "Cancelled").reduce((sum, item) => sum + item.total, 0) }));
      target.innerHTML = `<span class="eyebrow">BUSINESS ACTIVITY</span><h2 style="font-size:2rem">Reservation reports.</h2><p class="view-intro">Figures are calculated from saved reservation records in this browser.</p><div class="report-grid"><article class="stat-card"><span>Non-cancelled orders</span><strong>${all.length}</strong></article><article class="stat-card"><span>Verified down payments</span><strong>${money(verifiedAmount)}</strong></article><article class="stat-card"><span>Completed sales</span><strong>${money(completedSales)}</strong></article><article class="stat-card"><span>Pending payment verification</span><strong>${database.reservations.filter(item => item.paymentStatus === "Submitted for verification").length}</strong></article></div><section class="dash-panel" style="margin-top:22px"><div class="panel-heading"><h2>By product</h2></div><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>PRODUCT</th><th>QUANTITY RESERVED</th><th>ORDER VALUE</th></tr></thead><tbody>${productCounts.map(item => `<tr><td>${esc(item.name)}</td><td>${item.count}</td><td>${money(item.sales)}</td></tr>`).join("")}</tbody></table></div></section>`;
    }
  }

  function setupAdminDashboard() {
    if (!document.getElementById("admin-app")) return;
    if (currentSession()?.role !== "admin") {
      window.location.replace("../admin-login.html");
      return;
    }
    adminShell();
    document.addEventListener("click", event => {
      const tab = event.target.closest("[data-admin-tab]");
      if (tab) {
        event.preventDefault();
        renderAdminView(tab.dataset.adminTab);
        history.replaceState(null, "", `#${tab.dataset.adminTab}`);
      }
      const verify = event.target.closest("[data-verify-payment]");
      if (verify) {
        const database = db();
        const reservation = database.reservations.find(item => item.id === verify.dataset.verifyPayment);
        if (reservation?.paymentStatus === "Submitted for verification") {
          reservation.paymentStatus = "Verified";
          saveDb(database);
          renderAdminView("reservations");
          showToast("Down payment verified.", "success");
        }
      }
      const details = event.target.closest("[data-view-reservation]");
      if (details) {
        const item = db().reservations.find(reservation => reservation.id === details.dataset.viewReservation);
        if (item) window.alert(`Reservation ${item.number}\n\n${item.productName} × ${item.quantity}\nPickup: ${dateText(item.pickupDate)}, ${item.pickupSlot}\nTotal: ${money(item.total)}\nRequired down payment: ${money(item.downPayment)}\nPayment: ${item.paymentStatus}\nStatus: ${item.status}`);
      }
    });
    document.addEventListener("change", event => {
      const select = event.target.closest("[data-status-id]");
      if (!select) return;
      const database = db();
      const reservation = database.reservations.find(item => item.id === select.dataset.statusId);
      if (reservation) {
        reservation.status = select.value;
        saveDb(database);
        showToast(`Reservation status updated to ${select.value}.`, "success");
        renderAdminView("reservations");
      }
    });
    document.addEventListener("submit", event => {
      const form = event.target.closest("[data-product-form]");
      if (!form) return;
      event.preventDefault();
      const values = Object.fromEntries(new FormData(form));
      const price = Number(values.price);
      const description = values.description.trim();
      if (!Number.isFinite(price) || price <= 0 || !description) {
        showFormError(`product-feedback-${form.dataset.productForm}`, "Enter a price above zero and a product description.");
        return;
      }
      const database = db();
      const product = database.products.find(item => item.id === form.dataset.productForm);
      if (!product) {
        showFormError(`product-feedback-${form.dataset.productForm}`, "Product could not be found.");
        return;
      }
      product.price = Math.round(price * 100) / 100;
      product.description = description;
      product.available = form.elements.available.checked;
      saveDb(database);
      showToast(`${product.name} updated.`, "success");
      renderAdminView("products");
    });
    const initial = ["overview", "reservations", "products", "customers", "reports"].includes(location.hash.slice(1)) ? location.hash.slice(1) : "overview";
    if (initial !== "overview") renderAdminView(initial);
  }

  document.addEventListener("click", event => {
    if (event.target.closest("[data-logout]")) logout();
    const link = event.target.closest("[data-reserve-link]");
    if (!link) return;
    const session = currentSession();
    if (session?.role !== "customer") {
      event.preventDefault();
      window.location.href = `${rootPrefix}login.html?next=reserve`;
    }
  });

  function init() {
    renderPublicChrome();
    if (document.getElementById("featured-products")) renderFeatured();
    setupSignup();
    setupLogin();
    setupAdminLogin();
    setupContact();
    setupCustomerDashboard();
    setupAdminDashboard();
  }

  try {
    init();
  } catch (error) {
    console.error(error);
    document.body.insertAdjacentHTML("afterbegin", `<div role="alert" style="background:#a73520;color:white;padding:12px;text-align:center">The demo could not load: ${esc(error.message)} Clear this site's local storage and reload to reset its data.</div>`);
  }
})();
