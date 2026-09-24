(function () {
  const { ROOM_TYPES, load, save, reset, today, addDays, nightsBetween, naira, niceDate, priceOf, active } = PV;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const typeName = (id) => ROOM_TYPES.find((r) => r.id === id).name;
  const ALL_ROOMS = ROOM_TYPES.flatMap((t) => t.rooms.map((r) => ({ room: r, type: t.id })));
  const STATUS = { confirmed: "Confirmed", checked_in: "Checked in", checked_out: "Checked out", cancelled: "Cancelled" };
  let tab = "today";

  // PIN (demo only)
  function unlocked() { try { return sessionStorage.getItem("pv-admin") === "1"; } catch (e) { return window.__pvAdmin === true; } }
  function setUnlocked(v) { try { v ? sessionStorage.setItem("pv-admin", "1") : sessionStorage.removeItem("pv-admin"); } catch (e) { window.__pvAdmin = v; } }
  function gate() {
    const ok = unlocked();
    $("pinView").style.display = ok ? "none" : "block"; $("app").style.display = ok ? "block" : "none"; $("lock").style.display = ok ? "inline-flex" : "none";
    if (ok) draw(); else setTimeout(() => $("pin").focus(), 50);
  }
  $("pinForm").onsubmit = (e) => { e.preventDefault(); if ($("pin").value === "1234") { setUnlocked(true); gate(); } else { $("pinErr").innerHTML = '<div class="err">Wrong PIN. The demo PIN is 1234.</div>'; $("pin").value = ""; } };
  $("lock").onclick = () => { setUnlocked(false); gate(); };
  $("tabs").onclick = (e) => { const b = e.target.closest(".tab"); if (!b) return; tab = b.dataset.t; document.querySelectorAll(".tab").forEach((x) => x.classList.toggle("on", x === b)); draw(); };

  function setStatus(ref, status) { const b = load().bookings.find((x) => x.ref === ref); if (b) { b.status = status; save(); draw(); } }
  window.pvSet = setStatus;

  function row(b, actions) {
    return `<div class="row"><div class="who"><b>${esc(b.name)}</b><span>${typeName(b.type)} · Room ${b.room} · ${niceDate(b.checkIn)} to ${niceDate(b.checkOut)} · ${b.paid ? "Paid" : "Pay at hotel"} · ${esc(b.ref)}</span></div>
      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;justify-content:flex-end"><span class="pill p-${b.status}">${STATUS[b.status]}</span>${actions || ""}</div></div>`;
  }
  const btn = (ref, st, label, cls = "btn-navy") => `<button class="btn ${cls} mini" onclick="pvSet('${ref}','${st}')">${label}</button>`;

  function drawToday() {
    const s = load(), t = today();
    const arrivals = s.bookings.filter((b) => b.checkIn === t && b.status === "confirmed");
    const departures = s.bookings.filter((b) => b.checkOut === t && b.status === "checked_in");
    const inHouse = s.bookings.filter((b) => b.status === "checked_in");
    const occupied = new Set(s.bookings.filter((b) => active(b) && b.checkIn <= t && t < b.checkOut).map((b) => b.room)).size;
    const tonight = s.bookings.filter((b) => b.status !== "cancelled" && b.checkIn <= t && t < b.checkOut);
    const revenue = tonight.reduce((sum, b) => sum + priceOf(b.type), 0);
    return `<div class="kpis">
      <div class="kpi"><small>Occupancy tonight</small><b>${Math.round((occupied / ALL_ROOMS.length) * 100)}%</b><div class="meta">${occupied} of ${ALL_ROOMS.length} rooms</div></div>
      <div class="kpi"><small>Arriving today</small><b>${arrivals.length}</b></div>
      <div class="kpi"><small>Leaving today</small><b>${departures.length}</b></div>
      <div class="kpi"><small>Tonight's room revenue</small><b style="font-size:22px">${naira(revenue)}</b></div></div>
      <div class="card"><h3>Arriving today</h3>${arrivals.map((b) => row(b, btn(b.ref, "checked_in", "Check in"))).join("") || '<p class="note">No arrivals left today.</p>'}</div>
      <div class="card"><h3>Leaving today</h3>${departures.map((b) => row(b, btn(b.ref, "checked_out", "Check out"))).join("") || '<p class="note">No departures due today.</p>'}</div>
      <div class="card"><h3>In house now (${inHouse.length})</h3>${inHouse.map((b) => row(b, btn(b.ref, "checked_out", "Check out", "btn-ghost"))).join("") || '<p class="note">Nobody checked in.</p>'}</div>`;
  }

  function drawCalendar() {
    const s = load(), t = today(), days = Array.from({ length: 14 }, (_, i) => addDays(t, i));
    const cell = (room, d) => {
      const b = s.bookings.find((x) => x.room === room && x.status !== "cancelled" && x.checkIn <= d && d < x.checkOut);
      if (b) return `<td class="${b.status === "checked_in" ? "in" : "bk"}" data-ref="${b.ref}" title="${esc(b.name)} (${b.ref})">${d === b.checkIn ? "●" : ""}</td>`;
      const blocked = s.blocks.some((x) => x.room === room && x.date === d);
      return `<td class="${blocked ? "bl" : ""}" data-room="${room}" data-date="${d}" title="${blocked ? "Blocked: tap to open" : "Free: tap to block"}"></td>`;
    };
    return `<div class="card"><h3>Next 14 days · tap a free day to block it (repairs, VIP hold), tap again to open it</h3>
      <div class="cal"><table><thead><tr><th></th>${days.map((d) => `<th class="${d === t ? "today" : ""}">${niceDate(d, { weekday: "narrow" })}<br>${+d.slice(8)}</th>`).join("")}</tr></thead>
      <tbody>${ALL_ROOMS.map(({ room }) => `<tr><td class="room">${room}</td>${days.map((d) => cell(room, d)).join("")}</tr>`).join("")}</tbody></table></div>
      <div id="calInfo" class="note" style="padding-top:0">Tap a coloured day to see who is booked.</div>
      <div class="legend"><span><i style="background:#1F8A5B"></i>In house</span><span><i style="background:#C8643B"></i>Booked</span><span><i style="background:#9CA3AF"></i>Blocked</span><span><i style="background:#F3F4F6;border:1px solid #DDD"></i>Free</span></div></div>`;
  }

  function drawBookings() {
    const s = load();
    const list = [...s.bookings].sort((a, b) => (a.checkIn < b.checkIn ? -1 : 1));
    const upcoming = list.filter((b) => b.status === "confirmed" || b.status === "checked_in");
    const past = list.filter((b) => b.status === "checked_out" || b.status === "cancelled");
    const act = (b) => b.status === "confirmed" ? btn(b.ref, "checked_in", "Check in") + btn(b.ref, "cancelled", "Cancel", "btn-ghost")
      : b.status === "checked_in" ? btn(b.ref, "checked_out", "Check out") : "";
    const total = s.bookings.filter((b) => b.status !== "cancelled").reduce((sum, b) => sum + b.total, 0);
    const web = s.bookings.filter((b) => b.source === "Website" && b.status !== "cancelled").length;
    return `<div class="kpis"><div class="kpi"><small>Active bookings</small><b>${upcoming.length}</b></div><div class="kpi"><small>Booked value</small><b style="font-size:22px">${naira(total)}</b></div>
      <div class="kpi"><small>From the website</small><b>${web}</b></div><div class="kpi"><small>Paid online</small><b>${s.bookings.filter((b) => b.paid && b.status !== "cancelled").length}</b></div></div>
      <div class="card"><h3>Upcoming and in house</h3>${upcoming.map((b) => row(b, act(b))).join("") || '<p class="note">None.</p>'}</div>
      <div class="card"><h3>Past and cancelled</h3>${past.map((b) => row(b)).join("") || '<p class="note">None yet.</p>'}</div>`;
  }

  function drawPrices() {
    return `<div class="card"><h3>Nightly prices · changes show on the website immediately</h3>
      ${ROOM_TYPES.map((t) => `<div class="price-row"><div style="flex:1"><b>${t.name}</b><div class="meta">${t.rooms.length} rooms: ${t.rooms.join(", ")}</div></div>
        <span>₦</span><input class="field" inputmode="numeric" data-type="${t.id}" value="${priceOf(t.id)}"></div>`).join("")}
      <div style="padding:14px;display:flex;gap:10px;flex-wrap:wrap"><button class="btn btn-clay" id="savePrices">Save prices</button><span id="saved" class="meta" style="align-self:center"></span></div></div>
      <div class="card"><h3>Demo data</h3><p class="note">Put the sample bookings back the way they started (useful before showing the demo to someone).</p>
      <div style="padding:0 14px 14px"><button class="btn btn-ghost" id="reset">Reset demo data</button></div></div>`;
  }

  function draw() {
    const v = $("view");
    v.innerHTML = tab === "today" ? drawToday() : tab === "calendar" ? drawCalendar() : tab === "bookings" ? drawBookings() : drawPrices();
    if (tab === "calendar") v.querySelectorAll("td[data-ref]").forEach((td) => td.onclick = () => {
      const b = load().bookings.find((x) => x.ref === td.dataset.ref);
      if (b) $("calInfo").innerHTML = `<b>${esc(b.name)}</b> · Room ${b.room} · ${niceDate(b.checkIn)} to ${niceDate(b.checkOut)} · ${STATUS[b.status]} · ${b.paid ? "Paid" : "Pay at hotel"} · ${b.ref}`;
    });
    if (tab === "calendar") v.querySelectorAll("td[data-room]").forEach((td) => td.onclick = () => {
      const s = load(), i = s.blocks.findIndex((x) => x.room === td.dataset.room && x.date === td.dataset.date);
      if (i >= 0) s.blocks.splice(i, 1); else s.blocks.push({ room: td.dataset.room, date: td.dataset.date });
      save(); draw();
    });
    if (tab === "prices") {
      $("savePrices").onclick = () => {
        const s = load();
        v.querySelectorAll("input[data-type]").forEach((i) => { const n = +i.value.replace(/\D/g, ""); if (n > 0) s.prices[i.dataset.type] = n; });
        save(); $("saved").textContent = "Saved. Open the website to see the new prices.";
      };
      $("reset").onclick = () => { reset(); $("saved") && ($("saved").textContent = ""); tab = "today"; document.querySelectorAll(".tab").forEach((x) => x.classList.toggle("on", x.dataset.t === "today")); draw(); };
    }
  }
  gate();
})();
