// ==== CONFIG ====
const SUPABASE_URL = "https://jywhymtctdnvwwvxtcpw.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_8-VfhsJiclZMwjjkZ-k18A_gLYKbaGR";
const BUSINESS_ID = "erins-elite-dance";
const BUSINESS_NAME = "Erin's Elite School of Dance";
const TICKET_PRICE = 10.00;
const EVENT_NAME = "Christmas Show";
const TICKET_CAP = 200;

const EMAILJS_SERVICE_ID = "service_zzjha2e";
const EMAILJS_TEMPLATE_ID = "template_khedkjr";
const EMAILJS_PUBLIC_KEY = "fs6q7ZsiYGhRUtas5";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
if (window.emailjs) emailjs.init(EMAILJS_PUBLIC_KEY);

let qty = 1;
let remaining = TICKET_CAP;

function formatPrice(amount) {
  return `£${amount.toFixed(2)}`;
}

async function loadRemaining() {
  const { data, error } = await supabaseClient
    .from("public_event_tickets")
    .select("quantity")
    .eq("business_id", BUSINESS_ID)
    .eq("item_name", EVENT_NAME);

  const sold = error ? 0 : (data || []).reduce((sum, row) => sum + row.quantity, 0);
  remaining = Math.max(0, TICKET_CAP - sold);

  const remainingEl = document.getElementById("tickets-remaining");
  const checkoutBtn = document.getElementById("checkout-btn");

  if (remaining === 0) {
    remainingEl.textContent = "Sold out.";
    checkoutBtn.disabled = true;
    document.getElementById("qty-plus").disabled = true;
    document.getElementById("qty-minus").disabled = true;
  } else {
    remainingEl.textContent = `${remaining} of ${TICKET_CAP} tickets remaining.`;
    if (qty > remaining) qty = remaining;
    updateQtyDisplay();
    updateCheckoutAvailability();
  }
}

function updateQtyDisplay() {
  document.getElementById("qty-value").textContent = qty;
  document.getElementById("line-total").textContent = formatPrice(TICKET_PRICE * qty);
}

function updateCheckoutAvailability() {
  const nameInput = document.getElementById("customer-name");
  const emailInput = document.getElementById("customer-email");
  const phoneInput = document.getElementById("customer-phone");
  const checkoutBtn = document.getElementById("checkout-btn");
  checkoutBtn.disabled = remaining === 0
    || !nameInput.value.trim() || !emailInput.value.trim() || !phoneInput.value.trim();
}

async function confirmPurchase() {
  const nameInput = document.getElementById("customer-name");
  const emailInput = document.getElementById("customer-email");
  const phoneInput = document.getElementById("customer-phone");
  const message = document.getElementById("ticket-message");

  if (!nameInput.value.trim() || !emailInput.value.trim() || !phoneInput.value.trim()) return;

  // Re-check right before charging, in case tickets sold out in the
  // time since the page loaded.
  await loadRemaining();
  if (qty > remaining) {
    message.textContent = `Sorry, only ${remaining} ticket${remaining === 1 ? "" : "s"} left — please adjust your quantity.`;
    return;
  }

  const total = TICKET_PRICE * qty;

  const { error } = await supabaseClient.from("class_signups").insert({
    business_id: BUSINESS_ID,
    item_type: "event",
    item_name: EVENT_NAME,
    day_time: null,
    studio: null,
    price: TICKET_PRICE,
    quantity: qty,
    customer_name: nameInput.value.trim(),
    child_name: null,
    customer_email: emailInput.value.trim(),
    customer_phone: phoneInput.value.trim(),
  });

  if (error) {
    alert("Something went wrong saving your order — please try again.");
    console.error(error);
    return;
  }

  if (window.emailjs) {
    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      to_email: emailInput.value.trim(),
      to_name: nameInput.value.trim(),
      business_name: BUSINESS_NAME,
      email_subject: `Tickets confirmed — ${BUSINESS_NAME}`,
      email_body: `Your ticket order with ${BUSINESS_NAME} is confirmed.\n\n${qty} x ${EVENT_NAME} ticket${qty > 1 ? "s" : ""}\nTotal: ${formatPrice(total)}`,
    }).catch(err => console.error("Confirmation email failed to send:", err));
  }

  document.getElementById("confirmation-overlay").classList.remove("hidden");
  message.textContent = "";
  qty = 1;
  nameInput.value = "";
  emailInput.value = "";
  phoneInput.value = "";
  await loadRemaining();
}

document.getElementById("qty-minus").addEventListener("click", () => {
  if (qty > 1) { qty--; updateQtyDisplay(); }
});
document.getElementById("qty-plus").addEventListener("click", () => {
  if (qty < remaining) { qty++; updateQtyDisplay(); }
});
["customer-name", "customer-email", "customer-phone"].forEach(id => {
  document.getElementById(id).addEventListener("input", updateCheckoutAvailability);
});
document.getElementById("checkout-btn").addEventListener("click", confirmPurchase);
document.getElementById("close-overlay").addEventListener("click", () => {
  document.getElementById("confirmation-overlay").classList.add("hidden");
});

updateQtyDisplay();
loadRemaining();
