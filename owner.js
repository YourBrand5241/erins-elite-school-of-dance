// ==== CONFIG ====
const SUPABASE_URL = "https://jywhymtctdnvwwvxtcpw.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_8-VfhsJiclZMwjjkZ-k18A_gLYKbaGR";
const BUSINESS_ID = "erins-elite-dance";
const BUSINESS_NAME = "Erin's Elite School of Dance";

const EMAILJS_SERVICE_ID = "service_zzjha2e";
const EMAILJS_TEMPLATE_ID = "template_khedkjr";
const EMAILJS_PUBLIC_KEY = "fs6q7ZsiYGhRUtas5";

// The list of class names an owner can cancel a session for — kept in
// sync with script.js's catalog. Registration fees and event tickets
// aren't "sessions" so they're left out of this list.
const CLASS_NAMES = [
  "Baby Class", "Minis", "Juniors", "Advanced",
  "U8 Team Class", "U12 Team Class", "U14 Team Class",
  "Novice Acro", "Inter/Advanced Acro", "Stretch & Body Conditioning",
];

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
if (window.emailjs) emailjs.init(EMAILJS_PUBLIC_KEY);

function formatPrice(amount) {
  return `£${Number(amount).toFixed(2)}`;
}

function populateClassDropdown() {
  const select = document.getElementById("block-item");
  select.innerHTML = "";
  CLASS_NAMES.forEach(name => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);
  });
}

async function checkSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) await enterDashboard(session);
}

async function enterDashboard(session) {
  const { data: ownerRows, error } = await supabaseClient
    .from("business_owners")
    .select("business_id")
    .eq("business_id", BUSINESS_ID)
    .eq("owner_user_id", session.user.id);

  if (error || !ownerRows || ownerRows.length === 0) {
    document.getElementById("login-message").textContent = "This account isn't linked to Erin's Elite School of Dance.";
    await supabaseClient.auth.signOut();
    return;
  }

  document.getElementById("login-section").classList.add("hidden");
  document.getElementById("dashboard-section").classList.remove("hidden");
  document.getElementById("signed-in-as").textContent = `Signed in as ${session.user.email}`;

  populateClassDropdown();
  loadMembers();
  loadBlockedSessions();
}

async function handleLogin() {
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  const message = document.getElementById("login-message");

  if (!email || !password) {
    message.textContent = "Enter both email and password.";
    return;
  }

  message.textContent = "Signing in…";
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (error) {
    message.textContent = "Sign in failed — check your email and password.";
    return;
  }

  message.textContent = "";
  await enterDashboard(data.session);
}

async function handleSignOut() {
  await supabaseClient.auth.signOut();
  document.getElementById("dashboard-section").classList.add("hidden");
  document.getElementById("login-section").classList.remove("hidden");
  document.getElementById("login-email").value = "";
  document.getElementById("login-password").value = "";
}

async function loadMembers() {
  const listEl = document.getElementById("members-list");
  listEl.innerHTML = "<p class=\"empty-basket\">Loading…</p>";

  const { data, error } = await supabaseClient
    .from("class_signups")
    .select("*")
    .eq("business_id", BUSINESS_ID)
    .order("created_at", { ascending: false });

  if (error || !data || data.length === 0) {
    listEl.innerHTML = "<p class=\"empty-basket\">No sign-ups yet.</p>";
    return;
  }

  // Group every row by dancer — a parent may have signed up in several
  // separate visits, so this pulls it all together into one line per child
  // (or per adult, for adult classes with no child name).
  const groups = {};
  data.forEach(row => {
    const dancerName = row.child_name || row.customer_name;
    const key = `${row.customer_email}|${dancerName}`;
    if (!groups[key]) {
      groups[key] = {
        dancerName,
        parentName: row.customer_name,
        parentEmail: row.customer_email,
        parentPhone: row.customer_phone,
        classes: new Set(),
        registrationPaid: false,
      };
    }
    if (row.item_type === "class") groups[key].classes.add(row.item_name);
    if (row.item_type === "registration") groups[key].registrationPaid = true;
  });

  const rows = Object.values(groups);

  let table = `
    <table class="timetable-table">
      <thead>
        <tr>
          <th>Dancer Name</th>
          <th>Parent Contact</th>
          <th>Classes Enrolled In</th>
          <th>Registration Fee Paid</th>
        </tr>
      </thead>
      <tbody>
  `;
  rows.forEach(r => {
    table += `
      <tr>
        <td>${r.dancerName}</td>
        <td>${r.parentName}<br>${r.parentEmail}<br>${r.parentPhone}</td>
        <td>${r.classes.size ? [...r.classes].join(", ") : "—"}</td>
        <td>${r.registrationPaid ? "Yes" : "No"}</td>
      </tr>
    `;
  });
  table += "</tbody></table>";

  listEl.innerHTML = table;
}

async function removeSignup(id) {
  if (!confirm("Remove this sign-up? This can't be undone.")) return;
  const { error } = await supabaseClient.from("class_signups").delete().eq("id", id);
  if (error) {
    alert("Couldn't remove — please try again.");
    return;
  }
  loadMembers();
}

async function handleBlockSession() {
  const itemSelect = document.getElementById("block-item");
  const dateInput = document.getElementById("block-date");
  const reasonInput = document.getElementById("block-reason");
  const message = document.getElementById("block-message");

  if (!dateInput.value) {
    message.textContent = "Choose a date first.";
    return;
  }

  const { error } = await supabaseClient.from("cancelled_sessions").insert({
    business_id: BUSINESS_ID,
    item_name: itemSelect.value,
    session_date: dateInput.value,
    reason: reasonInput.value.trim() || null,
  });

  if (error) {
    message.textContent = "Something went wrong — please try again.";
    console.error(error);
    return;
  }

  message.textContent = "Cancelled — notifying affected students…";
  const notifiedCount = await notifyAffectedMembers(itemSelect.value, dateInput.value, reasonInput.value.trim());
  message.textContent = notifiedCount > 0
    ? `Cancelled — ${notifiedCount} ${notifiedCount > 1 ? "families" : "family"} notified by email.`
    : "Cancelled. No sign-ups found for that class to notify.";

  dateInput.value = "";
  reasonInput.value = "";
  loadBlockedSessions();
}

async function notifyAffectedMembers(itemName, sessionDate, reason) {
  if (!window.emailjs) {
    console.warn("EmailJS not available — skipping notifications.");
    return 0;
  }

  const { data, error } = await supabaseClient
    .from("class_signups")
    .select("customer_name, customer_email, child_name")
    .eq("business_id", BUSINESS_ID)
    .eq("item_name", itemName);

  if (error || !data) return 0;

  let sentCount = 0;
  for (const member of data) {
    if (!member.customer_email) continue;
    try {
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
        to_email: member.customer_email,
        to_name: member.customer_name || "there",
        business_name: BUSINESS_NAME,
        email_subject: `Class Cancelled — ${BUSINESS_NAME}`,
        email_body: `Unfortunately the ${itemName} class on ${sessionDate} has been cancelled.\n\nReason: ${reason || "Unforeseen circumstances"}\n\nSorry for the short notice — see you at the next session!`,
      });
      sentCount++;
    } catch (err) {
      console.error("Failed to notify", member.customer_email, err);
    }
  }
  return sentCount;
}

async function loadBlockedSessions() {
  const listEl = document.getElementById("blocked-list");
  listEl.innerHTML = "<p class=\"empty-basket\">Loading…</p>";

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const { data, error } = await supabaseClient
    .from("cancelled_sessions")
    .select("*")
    .eq("business_id", BUSINESS_ID)
    .gte("session_date", todayStr)
    .order("session_date", { ascending: true });

  if (error || !data || data.length === 0) {
    listEl.innerHTML = "<p class=\"empty-basket\">Nothing currently cancelled.</p>";
    return;
  }

  listEl.innerHTML = "";
  data.forEach(row => {
    const el = document.createElement("div");
    el.className = "appointment-row";
    el.innerHTML = `
      <div>
        <strong>${row.session_date} — ${row.item_name}</strong><br>
        ${row.reason || "No reason given"}
      </div>
      <button class="secondary-btn unblock-btn" data-id="${row.id}">Un-cancel</button>
    `;
    listEl.appendChild(el);
  });

  listEl.querySelectorAll(".unblock-btn").forEach(btn => {
    btn.addEventListener("click", () => unblockSession(btn.dataset.id));
  });
}

async function unblockSession(id) {
  const { error } = await supabaseClient.from("cancelled_sessions").delete().eq("id", id);
  if (error) {
    alert("Couldn't remove — please try again.");
    return;
  }
  loadBlockedSessions();
}

document.getElementById("login-btn").addEventListener("click", handleLogin);
document.getElementById("sign-out-btn").addEventListener("click", handleSignOut);
document.getElementById("block-btn").addEventListener("click", handleBlockSession);

checkSession();
