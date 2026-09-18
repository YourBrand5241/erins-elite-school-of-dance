// ==== CONFIG ====
const SUPABASE_URL = "https://jywhymtctdnvwwvxtcpw.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_8-VfhsJiclZMwjjkZ-k18A_gLYKbaGR";
const BUSINESS_ID = "erins-elite-dance";
const BUSINESS_NAME = "Erin's Elite School of Dance";

const EMAILJS_SERVICE_ID = "service_zzjha2e";
const EMAILJS_TEMPLATE_ID = "template_khedkjr";
const EMAILJS_PUBLIC_KEY = "fs6q7ZsiYGhRUtas5";

// ---- Class & event catalog ----
// Two entries are missing a detail from what was provided — clearly
// flagged with "TBC" rather than guessed. Fill these in once confirmed.
const ITEMS = [
  // Registration
  { id: 0, section: "registration", type: "registration", name: "Annual Registration Fee", desc: "One-time yearly fee — required once per student, alongside class fees", dayTime: null, studio: null, price: 10.00 },

  // Baby & Minis
  { id: 1, section: "baby-minis", type: "class", name: "Baby Class", desc: "Ages 3-5", dayTime: "Thursday 4:00-5:00pm", studio: "Studio 1", price: 8.00 },
  { id: 2, section: "baby-minis", type: "class", name: "Minis", desc: "Ages 5yrs 6m - 7yrs 6m", dayTime: "Tuesday 4:00-5:00pm", studio: "Studio 1", price: 8.00 },
  { id: 3, section: "baby-minis", type: "class", name: "Minis", desc: "Ages 5yrs 6m - 7yrs 6m", dayTime: "Thursday 5:00-6:00pm", studio: "Studio 1", price: 8.00 },

  // Juniors
  { id: 4, section: "juniors", type: "class", name: "Juniors", desc: "Ages 8-12", dayTime: "Tuesday 5:00-6:00pm", studio: "Studio 1", price: 8.00 },
  { id: 5, section: "juniors", type: "class", name: "Juniors", desc: "Ages 8-12", dayTime: "Thursday 5:00-6:00pm", studio: "Studio 2", price: 8.00 },

  // Advanced
  { id: 6, section: "advanced", type: "class", name: "Advanced", desc: "Ages 10-16", dayTime: "Tuesday 7:00-7:30pm", studio: "Studio 1", price: 12.00 },
  { id: 7, section: "advanced", type: "class", name: "Advanced", desc: "Ages 10-16", dayTime: "Wednesday 6:00-7:30pm", studio: "Studio 2", price: 12.00 },

  // Team Classes
  { id: 8, section: "team", type: "class", name: "U8 Team Class", desc: "Under 8s", dayTime: "Monday 4:00-5:00pm", studio: "Studio 1", price: 8.00 },
  { id: 9, section: "team", type: "class", name: "U12 Team Class", desc: "Under 12s", dayTime: "Monday 5:00-6:00pm", studio: "Studio 1", price: 8.00 },
  { id: 10, section: "team", type: "class", name: "U14 Team Class", desc: "Under 14s", dayTime: "Monday 5:00-6:00pm", studio: "Studio 2", price: 8.00 },

  // Acro
  { id: 11, section: "acro", type: "class", name: "Novice Acro", desc: "Ages 6-16", dayTime: "Thursday 6:00-7:00pm", studio: "Studio 2", price: 8.00 },
  { id: 12, section: "acro", type: "class", name: "Inter/Advanced Acro", desc: "Ages 8-16", dayTime: "Thursday 4:30-6:00pm", studio: "Studio 2", price: 12.00 },

  // Stretch & Conditioning
  { id: 13, section: "conditioning", type: "class", name: "Stretch & Body Conditioning", desc: "", dayTime: "Monday 6:00-7:30pm", studio: "Studio 2", price: 12.00 },
];

const SECTIONS = [
  { key: "registration", elementId: "list-registration" },
  { key: "baby-minis", elementId: "list-baby-minis" },
  { key: "juniors", elementId: "list-juniors" },
  { key: "advanced", elementId: "list-advanced" },
  { key: "team", elementId: "list-team" },
  { key: "acro", elementId: "list-acro" },
  { key: "conditioning", elementId: "list-conditioning" },
];

const CLASS_CAPACITY = 20; // per class session — change here if it needs to differ later

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
if (window.emailjs) emailjs.init(EMAILJS_PUBLIC_KEY);

let basket = []; // { id, name, dayTime, studio, price, type, qty, prorationLabel? }
let enrollmentCounts = {}; // "name|dayTime" -> number currently enrolled

function formatPrice(amount) {
  return `£${amount.toFixed(2)}`;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function extractDayName(dayTimeStr) {
  if (!dayTimeStr) return null;
  return dayTimeStr.split(" ")[0];
}

function countOccurrencesOfDay(dayIndex, year, month, fromDay) {
  const lastDay = new Date(year, month + 1, 0).getDate();
  let count = 0;
  for (let d = fromDay; d <= lastDay; d++) {
    if (new Date(year, month, d).getDay() === dayIndex) count++;
  }
  return count;
}

// Works out how many sessions to charge for right now: whatever's left
// this month, or — if none remain — every session in next month instead.
function getProration(dayTimeStr) {
  const dayName = extractDayName(dayTimeStr);
  if (!dayName) return null;
  const dayIndex = DAY_NAMES.indexOf(dayName);
  const today = new Date();

  let count = countOccurrencesOfDay(dayIndex, today.getFullYear(), today.getMonth(), today.getDate());
  let monthLabel = today.toLocaleString("en-GB", { month: "long" });
  let rolledOver = false;

  if (count === 0) {
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    count = countOccurrencesOfDay(dayIndex, nextMonth.getFullYear(), nextMonth.getMonth(), 1);
    monthLabel = nextMonth.toLocaleString("en-GB", { month: "long" });
    rolledOver = true;
  }

  return { count, monthLabel, rolledOver, dayName };
}

async function loadEnrollmentCounts() {
  const { data } = await supabaseClient
    .from("public_class_enrollment_counts")
    .select("item_name, day_time")
    .eq("business_id", BUSINESS_ID);

  enrollmentCounts = {};
  (data || []).forEach(row => {
    const key = `${row.item_name}|${row.day_time}`;
    enrollmentCounts[key] = (enrollmentCounts[key] || 0) + 1;
  });
}

function renderCatalog() {
  SECTIONS.forEach(section => {
    const list = document.getElementById(section.elementId);
    list.innerHTML = "";
    ITEMS.filter(i => i.section === section.key).forEach(item => {
      const card = document.createElement("div");
      card.className = "product-card";

      const isTBC = item.price === null || (item.dayTime === null && item.type === "class");
      const priceDisplay = item.price === null ? "Price TBC" : `${formatPrice(item.price)}/session`;
      const dayTimeDisplay = item.dayTime || (item.type === "class" ? "Day/time TBC" : "");

      let prorationHtml = "";
      let spotsHtml = "";
      let isFull = false;

      if (item.type === "class" && item.price !== null && item.dayTime) {
        const p = getProration(item.dayTime);
        const total = item.price * p.count;
        prorationHtml = `<div class="product-desc">${p.count} session${p.count !== 1 ? "s" : ""} ${p.rolledOver ? "in" : "left in"} ${p.monthLabel}${p.rolledOver ? " (this month's have passed)" : ""} — <strong>Total: ${formatPrice(total)}</strong></div>`;

        const key = `${item.name}|${item.dayTime}`;
        const enrolled = enrollmentCounts[key] || 0;
        const spotsLeft = CLASS_CAPACITY - enrolled;
        isFull = spotsLeft <= 0;
        spotsHtml = `<div class="product-desc">${isFull ? "Full" : `${spotsLeft} of ${CLASS_CAPACITY} spots left`}</div>`;
      }

      card.innerHTML = `
        <div class="product-name">${item.name}</div>
        ${item.desc ? `<div class="product-desc">${item.desc}</div>` : ""}
        ${dayTimeDisplay ? `<div class="product-desc">${dayTimeDisplay}${item.studio ? ` — ${item.studio}` : ""}</div>` : ""}
        ${isTBC ? `<div class="product-tbc">Details to be confirmed</div>` : ""}
        ${prorationHtml}
        ${spotsHtml}
        <div class="product-footer">
          <span class="product-price">${priceDisplay}</span>
          <button class="add-btn" data-id="${item.id}" ${item.price === null || isFull ? "disabled" : ""}>${isFull ? "Full" : "Add"}</button>
        </div>
      `;
      list.appendChild(card);
    });
  });

  document.querySelectorAll(".add-btn:not([disabled])").forEach(btn => {
    btn.addEventListener("click", () => addToBasket(Number(btn.dataset.id)));
  });
}

function addToBasket(itemId) {
  const item = ITEMS.find(i => i.id === itemId);
  const existing = basket.find(b => b.id === itemId);

  if (item.type === "class") {
    if (existing) {
      alert("This class is already in your sign-up.");
      return;
    }
    const key = `${item.name}|${item.dayTime}`;
    const enrolled = enrollmentCounts[key] || 0;
    if (CLASS_CAPACITY - enrolled <= 0) {
      alert("Sorry, this class is full.");
      return;
    }
    const p = getProration(item.dayTime);
    basket.push({
      id: item.id, name: item.name, dayTime: item.dayTime, studio: item.studio,
      price: item.price, type: item.type, qty: p.count,
      prorationLabel: `${p.count} session${p.count !== 1 ? "s" : ""} in ${p.monthLabel}`,
    });
  } else if (existing) {
    existing.qty += 1;
  } else {
    basket.push({ id: item.id, name: item.name, dayTime: item.dayTime, studio: item.studio, price: item.price, type: item.type, qty: 1 });
  }
  renderBasket();
}

function removeFromBasket(itemId) {
  basket = basket.filter(b => b.id !== itemId);
  renderBasket();
}

function renderBasket() {
  const container = document.getElementById("basket-items");
  const totalEl = document.getElementById("basket-total");

  if (basket.length === 0) {
    container.innerHTML = `<p class="empty-basket">Nothing added yet</p>`;
    totalEl.textContent = formatPrice(0);
    updateCheckoutAvailability();
    return;
  }

  container.innerHTML = "";
  let total = 0;
  basket.forEach(item => {
    const lineTotal = item.price * item.qty;
    total += lineTotal;
    const row = document.createElement("div");
    row.className = "basket-row";
    row.innerHTML = `
      <span>${item.prorationLabel ? `${item.name} — ${item.prorationLabel}` : `${item.qty} × ${item.name}`}${item.dayTime ? ` (${item.dayTime})` : ""}</span>
      <span>${formatPrice(lineTotal)} <button data-id="${item.id}">remove</button></span>
    `;
    container.appendChild(row);
  });

  container.querySelectorAll("button[data-id]").forEach(btn => {
    btn.addEventListener("click", () => removeFromBasket(Number(btn.dataset.id)));
  });

  totalEl.textContent = formatPrice(total);
  updateCheckoutAvailability();
}

function updateCheckoutAvailability() {
  const nameInput = document.getElementById("customer-name");
  const emailInput = document.getElementById("customer-email");
  const phoneInput = document.getElementById("customer-phone");
  const checkoutBtn = document.getElementById("checkout-btn");
  checkoutBtn.disabled = basket.length === 0
    || !nameInput.value.trim() || !emailInput.value.trim() || !phoneInput.value.trim();
}

async function confirmSignUp() {
  const nameInput = document.getElementById("customer-name");
  const childInput = document.getElementById("child-name");
  const emailInput = document.getElementById("customer-email");
  const phoneInput = document.getElementById("customer-phone");

  if (basket.length === 0 || !nameInput.value.trim() || !emailInput.value.trim() || !phoneInput.value.trim()) return;

  // Re-check capacity right before charging, in case a class filled up
  // since the page loaded.
  await loadEnrollmentCounts();
  for (const item of basket) {
    if (item.type !== "class") continue;
    const key = `${item.name}|${item.dayTime}`;
    const enrolled = enrollmentCounts[key] || 0;
    if (CLASS_CAPACITY - enrolled <= 0) {
      alert(`Sorry, ${item.name} (${item.dayTime}) has just become full. Please remove it and try another class.`);
      renderCatalog();
      return;
    }
  }

  const total = basket.reduce((sum, i) => sum + i.price * i.qty, 0);

  // One row per basket item, so the owner portal shows each class/ticket/fee
  // as its own line.
  const rows = basket.map(item => ({
    business_id: BUSINESS_ID,
    item_type: item.type,
    item_name: item.name,
    day_time: item.dayTime,
    studio: item.studio,
    price: item.price,
    quantity: item.qty,
    customer_name: nameInput.value.trim(),
    child_name: childInput.value.trim() || null,
    customer_email: emailInput.value.trim(),
    customer_phone: phoneInput.value.trim(),
  }));

  const { error } = await supabaseClient.from("class_signups").insert(rows);

  if (error) {
    alert("Something went wrong saving your sign-up — please try again.");
    console.error(error);
    return;
  }

  if (window.emailjs) {
    const summary = basket.map(i => `${i.qty} x ${i.name}${i.dayTime ? ` (${i.dayTime})` : ""}`).join(", ");
    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      to_email: emailInput.value.trim(),
      to_name: nameInput.value.trim(),
      business_name: BUSINESS_NAME,
      email_subject: `Sign-up confirmed — ${BUSINESS_NAME}`,
      email_body: `You're signed up with ${BUSINESS_NAME}.\n\n${summary}\nTotal: ${formatPrice(total)}`,
    }).catch(err => console.error("Confirmation email failed to send:", err));
  }

  document.getElementById("confirmation-overlay").classList.remove("hidden");
  basket = [];
  renderBasket();
  nameInput.value = "";
  childInput.value = "";
  emailInput.value = "";
  phoneInput.value = "";
  await loadEnrollmentCounts();
  renderCatalog();
}

function setupCheckout() {
  const overlay = document.getElementById("confirmation-overlay");
  document.getElementById("checkout-btn").addEventListener("click", confirmSignUp);
  document.getElementById("close-overlay").addEventListener("click", () => overlay.classList.add("hidden"));
}

["customer-name", "customer-email", "customer-phone"].forEach(id => {
  document.getElementById(id).addEventListener("input", updateCheckoutAvailability);
});

(async function init() {
  await loadEnrollmentCounts();
  renderCatalog();
  renderBasket();
  setupCheckout();
})();
