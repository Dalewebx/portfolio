(function () {
  const { ROOM_TYPES, today, addDays, nightsBetween, naira, niceDate, freeRooms, priceOf, book, HOTEL } = PV;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // photos: shown if present in /images, otherwise a warm gradient
  function bg(el, src, hue) {
    el.style.background = `linear-gradient(135deg, ${hue} 0%, #16233A 120%)`;
    const img = new Image();
    img.onload = () => { el.style.background = `center/cover no-repeat url(${src})`; const p = el.querySelector(".ph"); if (p) p.remove(); };
    img.src = src;
  }
  bg($("heroImg"), "images/hero.jpg", "#243A5E");
  $("addr").textContent = HOTEL.address;
  $("times").textContent = `Check-in from ${HOTEL.checkIn} · Check-out by ${HOTEL.checkOut}`;
  $("waLink").href = `https://wa.me/${HOTEL.whatsapp}?text=${encodeURIComponent("Hello Palmview Suites, I have a question about booking.")}`;

  const state = { ci: today(), co: addDays(today(), 1), guests: 2, searched: false };
  $("ci").value = state.ci; $("co").value = state.co; $("ci").min = today(); $("co").min = addDays(today(), 1);
  $("ci").addEventListener("change", () => {
    $("co").min = addDays($("ci").value, 1);
    if ($("co").value <= $("ci").value) $("co").value = addDays($("ci").value, 1);
  });
  $("search").addEventListener("submit", (e) => {
    e.preventDefault();
    state.ci = $("ci").value; state.co = $("co").value; state.guests = +$("gs").value; state.searched = true;
    render(); $("rooms").scrollIntoView({ behavior: "smooth" });
  });

  const bedIcon = '<svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18V7M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5"/><circle cx="7" cy="11" r="2"/></svg>';

  function render() {
    const n = nightsBetween(state.ci, state.co);
    $("roomsLead").textContent = state.searched
      ? `${niceDate(state.ci)} to ${niceDate(state.co)} · ${n} night${n > 1 ? "s" : ""} · ${state.guests} guest${state.guests > 1 ? "s" : ""}`
      : "Prices are per night. Pick your dates above to see what's free.";
    $("roomGrid").innerHTML = ROOM_TYPES.map((t) => {
      const free = freeRooms(t.id, state.ci, state.co).length;
      const tooSmall = state.guests > t.sleeps;
      const p = priceOf(t.id);
      let avail = "";
      if (state.searched) avail = tooSmall ? `<span class="left none">Sleeps ${t.sleeps} only</span>`
        : free === 0 ? `<span class="left none">Fully booked for these dates</span>`
        : `<span class="left">${free <= 2 ? `Only ${free} left` : `${free} available`}</span>`;
      const can = state.searched && free > 0 && !tooSmall;
      return `<article class="room">
        <div class="room-img" data-img="${t.img}" data-hue="${t.hue}"><div class="ph">${bedIcon}</div></div>
        <div class="room-body">
          <h3>${t.name}</h3>
          <div class="meta">${t.bed} · ${t.size} · sleeps ${t.sleeps}</div>
          <p style="font-size:14.5px">${t.blurb}</p>
          <div class="perks">${t.perks.map((x) => `<span class="perk">${x}</span>`).join("")}</div>
          <div class="spacer"></div>
          <div style="display:flex;align-items:end;justify-content:space-between;gap:10px">
            <div class="price">${naira(p)} <small>/ night</small></div>${avail}
          </div>
          ${state.searched && can ? `<div class="meta">${naira(p * n)} for ${n} night${n > 1 ? "s" : ""}</div>` : ""}
          <button class="btn ${can ? "btn-clay" : "btn-ghost"}" data-type="${t.id}" ${state.searched && !can ? "disabled" : ""}>
            ${state.searched ? (can ? "Book this room" : "Not available") : "Check dates"}</button>
        </div></article>`;
    }).join("");
    document.querySelectorAll(".room-img").forEach((el) => bg(el, el.dataset.img, el.dataset.hue));
    document.querySelectorAll("#roomGrid button").forEach((b) => b.addEventListener("click", () => {
      if (!state.searched) { $("ci").focus(); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
      openBooking(b.dataset.type);
    }));
  }

  // ---------- booking sheet ----------
  const sheet = $("sheet"), bgEl = $("sheetBg"), body = $("sheetBody");
  function open() { sheet.classList.add("open"); bgEl.classList.add("open"); document.body.style.overflow = "hidden"; }
  function close() { sheet.classList.remove("open"); bgEl.classList.remove("open"); document.body.style.overflow = ""; }
  $("closeSheet").onclick = close; bgEl.onclick = close;
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });

  const draft = { name: "", phone: "", email: "", note: "", pay: "now" };
  const steps = (k) => `<div class="steps">${[1, 2, 3].map((i) => `<i class="${i <= k ? "on" : ""}"></i>`).join("")}</div>`;

  function summary(t) {
    const n = nightsBetween(state.ci, state.co), p = priceOf(t.id);
    return `<div class="summary">
      <div><span>${t.name}</span><span>${naira(p)} × ${n}</span></div>
      <div><span>${niceDate(state.ci)} to ${niceDate(state.co)}</span><span>${state.guests} guest${state.guests > 1 ? "s" : ""}</span></div>
      <div class="tot"><span>Total</span><span>${naira(p * n)}</span></div></div>`;
  }

  function openBooking(typeId) {
    const t = ROOM_TYPES.find((r) => r.id === typeId);
    stepDetails(t); open();
  }

  function stepDetails(t, err) {
    body.innerHTML = `<div class="grab"></div><h3 id="sheetTitle">Your details</h3>${steps(1)}${summary(t)}
      <form class="stack" id="fDetails">
        <div><label class="meta" for="fn">Full name</label><input class="field" id="fn" autocomplete="name" value="${esc(draft.name)}"></div>
        <div><label class="meta" for="fp">Phone (WhatsApp)</label><input class="field" id="fp" type="tel" inputmode="tel" autocomplete="tel" placeholder="0803 123 4567" value="${esc(draft.phone)}"></div>
        <div><label class="meta" for="fe">Email (optional)</label><input class="field" id="fe" type="email" autocomplete="email" value="${esc(draft.email)}"></div>
        <div><label class="meta" for="fr">Arrival time or requests (optional)</label><textarea class="field" id="fr">${esc(draft.note)}</textarea></div>
        ${err ? `<div class="err">${esc(err)}</div>` : ""}
        <button class="btn btn-clay">Continue to payment</button>
      </form>`;
    $("fDetails").onsubmit = (e) => {
      e.preventDefault();
      draft.name = $("fn").value.trim(); draft.phone = $("fp").value.trim(); draft.email = $("fe").value.trim(); draft.note = $("fr").value.trim();
      if (draft.name.length < 2) return stepDetails(t, "Please enter your full name.");
      if (draft.phone.replace(/\D/g, "").length < 10) return stepDetails(t, "Please enter a phone number we can reach you on.");
      stepPay(t);
    };
  }

  function stepPay(t) {
    body.innerHTML = `<div class="grab"></div><h3 id="sheetTitle">How would you like to pay?</h3>${steps(2)}${summary(t)}
      <div class="pay-choice">
        <label class="pay-opt ${draft.pay === "now" ? "sel" : ""}"><input type="radio" name="pay" value="now" ${draft.pay === "now" ? "checked" : ""}><span><b>Pay now with card or transfer</b><span class="meta">Secure payment by Paystack. Your room is guaranteed.</span></span></label>
        <label class="pay-opt ${draft.pay === "later" ? "sel" : ""}"><input type="radio" name="pay" value="later" ${draft.pay === "later" ? "checked" : ""}><span><b>Pay at the hotel</b><span class="meta">We hold the room until 6pm on your arrival day.</span></span></label>
      </div>
      <div style="display:flex;gap:10px;margin-top:14px"><button class="btn btn-ghost" id="back">Back</button><button class="btn btn-clay" style="flex:1" id="go">Continue</button></div>`;
    body.querySelectorAll('input[name=pay]').forEach((r) => r.onchange = () => { draft.pay = r.value; stepPay(t); });
    $("back").onclick = () => stepDetails(t);
    $("go").onclick = () => (draft.pay === "now" ? stepPaystack(t) : finish(t, false));
  }

  function stepPaystack(t) {
    const total = priceOf(t.id) * nightsBetween(state.ci, state.co);
    body.innerHTML = `<div class="grab"></div><h3 id="sheetTitle">Payment</h3>${steps(3)}
      <div class="pstack"><div class="logo-ps">paystack</div>
        <p class="meta" style="margin:6px 0 2px">Palmview Suites</p>
        <div class="price" style="margin-bottom:10px">${naira(total)}</div>
        <p class="meta" style="background:#FFF1D6;color:#7A4B00;border-radius:10px;padding:8px;margin-bottom:12px">Demo mode: no money is taken. On a real hotel site this is the secure Paystack checkout.</p>
        <button class="btn btn-navy" style="width:100%" id="paid">Simulate successful payment</button></div>
      <button class="btn btn-ghost" style="width:100%;margin-top:10px" id="back">Back</button>`;
    $("back").onclick = () => stepPay(t);
    $("paid").onclick = () => { $("paid").textContent = "Confirming..."; $("paid").disabled = true; setTimeout(() => finish(t, true), 900); };
  }

  function finish(t, paid) {
    let b;
    try { b = book({ type: t.id, checkIn: state.ci, checkOut: state.co, guests: state.guests, name: draft.name, phone: draft.phone, email: draft.email, note: draft.note, paid }); }
    catch (e) { body.innerHTML = `<div class="grab"></div><div class="err">${esc(e.message)}</div><button class="btn btn-ghost" style="width:100%;margin-top:12px" id="cl">Choose another room</button>`; $("cl").onclick = () => { close(); render(); }; return; }
    const msg = `Hello Palmview Suites, this is ${b.name}. Booking ${b.ref}: ${t.name}, ${niceDate(b.checkIn)} to ${niceDate(b.checkOut)}, ${paid ? "paid online" : "paying at the hotel"}.`;
    body.innerHTML = `<div class="done"><div class="tick">✓</div><h3 id="sheetTitle">You're booked, ${esc(b.name.split(" ")[0])}!</h3>
      <p class="meta">Keep this booking code. Show it at the front desk.</p>
      <div class="refbox">${b.ref}</div>
      ${summary(t)}
      <p class="meta" style="margin-bottom:12px">${paid ? "Payment received. Your room is guaranteed." : "Pay when you arrive. We hold your room until 6pm on arrival day."} Check-in from ${HOTEL.checkIn}.</p>
      <div class="stack">
        <a class="btn btn-wa" target="_blank" rel="noopener" href="https://wa.me/${HOTEL.whatsapp}?text=${encodeURIComponent(msg)}">Send my booking to the hotel on WhatsApp</a>
        <a class="btn btn-ghost" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(HOTEL.address)}">Get directions</a>
        <button class="btn btn-navy" id="done">Done</button>
      </div></div>`;
    $("done").onclick = () => { close(); render(); };
    draft.note = "";
  }

  render();
})();
