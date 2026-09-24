/* Palmview Suites demo: sample data and the booking rules.
   Everything is stored on this device only (demo mode), so it never breaks during a pitch. */
(function () {
  const KEY = "palmview-demo-v1";
  const ROOM_TYPES = [
    { id: "classic", name: "Classic Room", price: 35000, sleeps: 2, size: "22 m²", bed: "Queen bed",
      blurb: "A calm, well-kept room for business trips and short stays.",
      perks: ["Air conditioning", "Fast Wi-Fi", "DSTV", "24-hour power", "Work desk"],
      rooms: ["101", "102", "103", "104", "105", "106"], img: "images/classic.jpg", hue: "#C8643B" },
    { id: "deluxe", name: "Deluxe Room", price: 50000, sleeps: 2, size: "30 m²", bed: "King bed",
      blurb: "More space, a king bed and breakfast for two every morning.",
      perks: ["Breakfast for two", "Air conditioning", "Fast Wi-Fi", "DSTV", "24-hour power", "Mini fridge"],
      rooms: ["201", "202", "203", "204"], img: "images/deluxe.jpg", hue: "#2F6F73" },
    { id: "suite", name: "Executive Suite", price: 85000, sleeps: 3, size: "48 m²", bed: "King bed + lounge",
      blurb: "A separate lounge, a bigger bathroom and the quietest floor.",
      perks: ["Breakfast included", "Separate lounge", "Bathtub", "Fast Wi-Fi", "DSTV", "24-hour power"],
      rooms: ["301", "302"], img: "images/suite.jpg", hue: "#8A6720" },
  ];

  const pad = (n) => String(n).padStart(2, "0");
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const addDays = (s, n) => { const d = new Date(s + "T12:00:00"); d.setDate(d.getDate() + n); return iso(d); };
  const today = () => iso(new Date());
  const nightsBetween = (a, b) => Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 86400000);
  const naira = (n) => "₦" + Math.round(n).toLocaleString("en-NG");
  const niceDate = (s, opts) => new Date(s + "T12:00:00").toLocaleDateString("en-GB", opts || { weekday: "short", day: "numeric", month: "short" });
  const ref = () => "PV-" + Math.random().toString(36).slice(2, 7).toUpperCase();

  function seed() {
    const t = today();
    const names = ["Mr. Efe Okoro", "Mrs. Ngozi Eze", "Engr. Tunde Bello", "Dr. Ruth Omagbemi", "Chinedu Obi", "Mrs. Aisha Bello",
      "Kelvin Ighalo", "Barr. Tega Ovie", "Ms. Joy Akpan", "Mr. Samuel Ade", "Fatima Musa", "Oghene Brown"];
    const plan = [ // [room, startOffset, nights, status]
      ["101", -2, 3, "checked_in"], ["102", 0, 2, "confirmed"], ["104", 1, 4, "confirmed"], ["105", -1, 1, "checked_in"],
      ["201", 0, 3, "confirmed"], ["202", -3, 5, "checked_in"], ["203", 3, 2, "confirmed"], ["301", 2, 3, "confirmed"],
      ["103", 5, 2, "confirmed"], ["204", 6, 3, "confirmed"], ["302", -1, 2, "checked_in"], ["106", 8, 2, "confirmed"],
    ];
    const bookings = plan.map(([room, off, n, status], i) => {
      const type = ROOM_TYPES.find((r) => r.rooms.includes(room));
      const checkIn = addDays(t, off);
      return { ref: ref(), name: names[i], phone: "080" + (31000000 + i * 734521), email: "", type: type.id, room,
        checkIn, checkOut: addDays(checkIn, n), guests: 2, total: type.price * n,
        paid: i % 3 !== 0, status, source: i % 4 === 0 ? "Walk-in" : "Website", created: new Date().toISOString() };
    });
    return { prices: Object.fromEntries(ROOM_TYPES.map((r) => [r.id, r.price])), bookings, blocks: [{ room: "106", date: addDays(t, 2) }] };
  }

  let mem = null;
  function load() {
    if (mem) return mem;
    try { const raw = localStorage.getItem(KEY); if (raw) mem = JSON.parse(raw); } catch (e) { /* private mode */ }
    if (!mem) { mem = seed(); save(); }
    return mem;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { /* keep in memory */ } }
  function reset() { mem = seed(); save(); return mem; }

  const active = (b) => b.status !== "cancelled" && b.status !== "checked_out";
  const overlaps = (b, a, z) => b.checkIn < z && a < b.checkOut;

  function roomFree(room, checkIn, checkOut, ignoreRef) {
    const s = load();
    if (s.bookings.some((b) => b.room === room && b.ref !== ignoreRef && b.status !== "cancelled" && overlaps(b, checkIn, checkOut))) return false;
    for (let d = checkIn; d < checkOut; d = addDays(d, 1)) if (s.blocks.some((x) => x.room === room && x.date === d)) return false;
    return true;
  }
  function freeRooms(typeId, checkIn, checkOut) {
    return ROOM_TYPES.find((r) => r.id === typeId).rooms.filter((r) => roomFree(r, checkIn, checkOut));
  }
  function priceOf(typeId) { return load().prices[typeId] ?? ROOM_TYPES.find((r) => r.id === typeId).price; }

  function book({ type, checkIn, checkOut, guests, name, phone, email, note, paid }) {
    const room = freeRooms(type, checkIn, checkOut)[0];
    if (!room) throw new Error("Sorry, that room type was just taken for those dates.");
    const b = { ref: ref(), name, phone, email, note, type, room, checkIn, checkOut, guests,
      total: priceOf(type) * nightsBetween(checkIn, checkOut), paid: !!paid, status: "confirmed", source: "Website", created: new Date().toISOString() };
    load().bookings.push(b); save(); return b;
  }

  window.PV = { ROOM_TYPES, load, save, reset, iso, addDays, today, nightsBetween, naira, niceDate, roomFree, freeRooms, priceOf, book, active,
    HOTEL: { name: "Palmview Suites", area: "Effurun, Delta State", address: "12 Palm Avenue, off PTI Road, Effurun", whatsapp: "2349056209920",
      phone: "+234 905 620 9920", checkIn: "2:00 pm", checkOut: "12:00 noon" } };
})();
