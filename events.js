// ==== CONFIG ====
const SUPABASE_URL = "https://jywhymtctdnvwwvxtcpw.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_8-VfhsJiclZMwjjkZ-k18A_gLYKbaGR";
const BUSINESS_ID = "erins-elite-dance";
const BUSINESS_NAME = "Erin's Elite School of Dance";
const TICKET_PRICE = 10.00;
const EVENT_NAME = "Christmas Show";

const EMAILJS_SERVICE_ID = "service_zzjha2e";
const EMAILJS_TEMPLATE_ID = "template_khedkjr";
const EMAILJS_PUBLIC_KEY = "fs6q7ZsiYGhRUtas5";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
if (window.emailjs) emailjs.init(EMAILJS_PUBLIC_KEY);

let qty = 1;

function formatPrice(amount) {
  return `£${amount.toFixed(2)}`;
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
  checkoutBtn.disabled = !nameInput.value.trim() || !emailInput.value.trim() || !phoneInput.value.trim();
}

async function confirmPurchase() {
  const nameInput = document.getElementById("customer-name");
  const emailInput = document.getElementById("customer-email");
  const phoneInput = document.getElementById("customer-phone");

  if (!nameInput.value.trim() || !emailInput.value.trim() || !phoneInput.value.trim()) return;

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
  qty = 1;
  updateQtyDisplay();
  nameInput.value = "";
  emailInput.value = "";
  phoneInput.value = "";
  updateCheckoutAvailability();
}

document.getElementById("qty-minus").addEventListener("click", () => {
  if (qty > 1) { qty--; updateQtyDisplay(); }
});
document.getElementById("qty-plus").addEventListener("click", () => {
  qty++; updateQtyDisplay();
});
["customer-name", "customer-email", "customer-phone"].forEach(id => {
  document.getElementById(id).addEventListener("input", updateCheckoutAvailability);
});
document.getElementById("checkout-btn").addEventListener("click", confirmPurchase);
document.getElementById("close-overlay").addEventListener("click", () => {
  document.getElementById("confirmation-overlay").classList.add("hidden");
});

updateQtyDisplay();
