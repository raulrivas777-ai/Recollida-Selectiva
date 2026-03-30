import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Recycle,
  Trash2,
  Leaf,
  GlassWater,
  Shirt,
  Trees,
  Sofa,
  Info,
  Bell,
  Search,
  Smartphone,
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const YEAR = 2026;

const MONTHS = [
  "Gener", "Febrer", "Març", "Abril", "Maig", "Juny",
  "Juliol", "Agost", "Setembre", "Octubre", "Novembre", "Desembre"
];

const WEEKDAYS = ["Dl", "Dt", "Dc", "Dj", "Dv", "Ds", "Dg"];
const WEEKDAY_LONG = ["Dilluns", "Dimarts", "Dimecres", "Dijous", "Divendres", "Dissabte", "Diumenge"];

function pad(n) {
  return String(n).padStart(2, "0");
}

function formatDate(date) {
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function formatISODate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function sameDate(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function startOfMonth(year, month) {
  return new Date(year, month, 1);
}

function endOfMonth(year, month) {
  return new Date(year, month + 1, 0);
}

function getMondayBasedDay(date) {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

function getISOWeek(date) {
  const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil((((tmp - yearStart) / 86400000) + 1) / 7);
}

function getWeekParity(date) {
  return getISOWeek(date) % 2 === 0 ? "parell" : "imparell";
}

function getPickupTypes(date) {
  const dow = getMondayBasedDay(date);
  const parity = getWeekParity(date);
  const items = [];

  if (dow === 3) {
    if (parity === "parell") items.push("Vidre");
    items.push("Envasos", "Orgànica", "Tèxtil sanitari");
  }

  if (dow === 5) {
    items.push("Paper i cartró", "Orgànica", "Tèxtil sanitari");
  }

  if (dow === 7) {
    items.push(parity === "imparell" ? "Envasos" : "Resta", "Orgànica", "Tèxtil sanitari");
  }

  return items;
}

function getSpecialServices(date) {
  const dow = getMondayBasedDay(date);
  const items = [];
  if (dow === 1) items.push("Poda amb sol·licitud prèvia");
  if (dow === 3) items.push("Trastos i mobles vells amb sol·licitud prèvia");
  return items;
}

function buildMonthGrid(year, month) {
  const first = startOfMonth(year, month);
  const last = endOfMonth(year, month);
  const startOffset = getMondayBasedDay(first) - 1;
  const daysInMonth = last.getDate();
  const cells = [];

  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}

function buildYearSchedule(year) {
  const dates = [];
  for (let month = 0; month < 12; month++) {
    const lastDay = endOfMonth(year, month).getDate();
    for (let day = 1; day <= lastDay; day++) {
      const date = new Date(year, month, day);
      const pickups = getPickupTypes(date);
      const special = getSpecialServices(date);
      if (pickups.length || special.length) {
        dates.push({
          date,
          iso: formatISODate(date),
          dateLabel: formatDate(date),
          weekday: WEEKDAY_LONG[getMondayBasedDay(date) - 1],
          month: date.getMonth(),
          monthName: MONTHS[date.getMonth()],
          week: getISOWeek(date),
          parity: getWeekParity(date),
          pickups,
          special,
          allTypes: [...pickups, ...special],
        });
      }
    }
  }
  return dates;
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function buildICS(events) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Calendari Recollida 2026//CA",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  events.forEach((event, idx) => {
    const y = event.date.getFullYear();
    const m = pad(event.date.getMonth() + 1);
    const d = pad(event.date.getDate());
    const next = new Date(event.date);
    next.setDate(next.getDate() + 1);
    const ny = next.getFullYear();
    const nm = pad(next.getMonth() + 1);
    const nd = pad(next.getDate());
    const summary = `Recollida: ${event.pickups.join(", ")}`;
    const description = `Abans de les 22 h a la porta de casa. Vidre abans de les 10 h. ${event.special.length ? `Serveis especials: ${event.special.join(", ")}.` : ""}`;

    lines.push(
      "BEGIN:VEVENT",
      `UID:recollida-${idx}-${event.iso}@lagoba2026.local`,
      `DTSTAMP:${YEAR}0101T000000Z`,
      `DTSTART;VALUE=DATE:${y}${m}${d}`,
      `DTEND;VALUE=DATE:${ny}${nm}${nd}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description.replace(/,/g, "\\,")}`,
      "END:VEVENT"
    );
  });

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function iconForType(type) {
  if (type === "Orgànica") return <Leaf size={14} />;
  if (type === "Vidre") return <GlassWater size={14} />;
  if (type === "Tèxtil sanitari") return <Shirt size={14} />;
  if (type.includes("Poda")) return <Trees size={14} />;
  if (type.includes("Trastos")) return <Sofa size={14} />;
  if (type === "Resta") return <Trash2 size={14} />;
  return <Recycle size={14} />;
}

function tagClass(type) {
  if (type === "Orgànica") return "bg-[#fff3c8] text-[#6c4300] border-[#edcc59]";
  if (type === "Envasos") return "bg-[#ffe4f1] text-[#8f285e] border-[#e7a7c8]";
  if (type === "Paper i cartró") return "bg-[#dbeafe] text-[#1e3a8a] border-[#93c5fd]";
  if (type === "Vidre") return "bg-[#d6f4dd] text-[#0d6c33] border-[#7ecb92]";
  if (type === "Resta") return "bg-[#e8eaee] text-[#111827] border-[#cbd5e1]";
  if (type === "Tèxtil sanitari") return "bg-[#ece9ef] text-[#2b2130] border-[#d1c7d6]";
  if (type.includes("Poda")) return "bg-[#dff3c5] text-[#275f1f] border-[#a3c567]";
  return "bg-[#f3e8ff] text-[#581c87] border-[#d8b4fe]";
}

function cardStyle() {
  return {
    background: "rgba(255,255,255,0.92)",
    border: "1px solid #e6dfe4",
    borderRadius: 24,
    boxShadow: "0 10px 28px rgba(40, 24, 36, 0.08)",
    backdropFilter: "blur(4px)",
  };
}

function buttonStyle(primary = false) {
  return {
    borderRadius: 16,
    padding: "10px 14px",
    border: primary ? "1px solid #0b7a3a" : "1px solid #d7d1d6",
    background: primary ? "#0b7a3a" : "white",
    color: primary ? "white" : "#171717",
    cursor: "pointer",
    fontWeight: 600,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  };
}

function badgeStyle() {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 600,
    border: "1px solid",
  };
}

export default function App() {
  const realToday = new Date();
  const fakeToday = new Date(YEAR, realToday.getMonth(), realToday.getDate());
  const [month, setMonth] = useState(realToday.getFullYear() === YEAR ? realToday.getMonth() : 0);
  const [view, setView] = useState("mes");
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("tot");
  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("recollida_notifications");
    if (saved === "true") setNotificationEnabled(true);
  }, []);

  useEffect(() => {
    const handler = event => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const schedule = useMemo(() => buildYearSchedule(YEAR), []);
  const monthCells = useMemo(() => buildMonthGrid(YEAR, month), [month]);

  const filteredSchedule = useMemo(() => {
    const q = search.trim().toLowerCase();
    return schedule.filter(item => {
      const matchesMonth = view === "mes" ? item.month === month : true;
      const matchesType = selectedType === "tot" ? true : item.allTypes.includes(selectedType);
      const haystack = [
        item.dateLabel,
        item.iso,
        item.weekday,
        item.monthName,
        item.parity,
        ...item.allTypes,
      ].join(" ").toLowerCase();
      const matchesSearch = q ? haystack.includes(q) : true;
      return matchesMonth && matchesType && matchesSearch;
    });
  }, [schedule, search, selectedType, month, view]);

  const highlightedDates = useMemo(() => new Set(filteredSchedule.map(item => item.iso)), [filteredSchedule]);

  async function requestNotifications() {
    if (!("Notification" in window)) {
      alert("Aquest navegador no admet notificacions.");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      setNotificationEnabled(true);
      localStorage.setItem("recollida_notifications", "true");
      new Notification("Recordatoris activats", {
        body: "Ja tens activats els avisos del calendari de recollida.",
      });
    }
  }

  async function handleInstall() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    setInstallPrompt(null);
  }

  function exportICS() {
    const pickupsOnly = schedule.filter(item => item.pickups.length > 0);
    downloadFile("calendari-recollida-2026.ics", buildICS(pickupsOnly), "text/calendar;charset=utf-8");
  }

  function exportCSV() {
    const header = ["Data", "Dia", "Setmana", "Paritat", "Recollida", "Serveis especials"];
    const rows = schedule.map(item => [
      item.dateLabel,
      item.weekday,
      item.week,
      item.parity,
      item.pickups.join(" | "),
      item.special.join(" | "),
    ]);
    const csv = [header, ...rows]
      .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    downloadFile("calendari-recollida-2026.csv", csv, "text/csv;charset=utf-8");
  }

  const rootStyle = {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #f7f4f7 0%, #ffffff 35%, #ffe7f2 100%)",
    color: "#0f172a",
    fontFamily: "Inter, system-ui, sans-serif",
  };

  return (
    <div style={rootStyle}>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }
        .container { max-width: 1280px; margin: 0 auto; padding: 16px; }
        .grid-main { display: grid; grid-template-columns: 2fr 1fr; gap: 24px; }
        .grid-7 { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; }
        .grid-top { display: grid; grid-template-columns: 1fr; gap: 12px; }
        .row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
        .between { display: flex; justify-content: space-between; gap: 12px; align-items: center; flex-wrap: wrap; }
        .muted { color: #5b5660; }
        .small { font-size: 12px; }
        .tiny { font-size: 11px; }
        .input, .select {
          width: 100%;
          border: 1px solid #d9d4d7;
          border-radius: 16px;
          padding: 12px 14px;
          background: white;
          font: inherit;
        }
        .cell-head {
          background: #f3f1f4;
          border-radius: 16px;
          text-align: center;
          padding: 12px 8px;
          font-size: 14px;
          font-weight: 700;
          color: #334155;
        }
        .day-cell {
          min-height: 136px;
          border-radius: 18px;
          border: 1px solid #e5e1e4;
          background: white;
          padding: 8px;
          box-shadow: 0 4px 12px rgba(15,23,42,0.04);
        }
        .day-cell.dim {
          opacity: 0.45;
          background: #faf8fa;
        }
        .day-cell.today {
          border-color: #0b7a3a;
          background: #eef8f1;
        }
        .tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: 1px solid;
          border-radius: 999px;
          padding: 6px 10px;
          font-size: 12px;
          font-weight: 600;
        }
        .tag-block {
          display: block;
          border-radius: 12px;
          padding: 6px 8px;
          font-size: 11px;
          font-weight: 600;
          border: 1px solid;
          margin-top: 4px;
        }
        @media (max-width: 1024px) {
          .grid-main { grid-template-columns: 1fr; }
        }
        @media (max-width: 700px) {
          .grid-7 { gap: 6px; }
          .day-cell { min-height: 116px; }
          .container { padding: 12px; }
        }
      `}</style>

      <div className="container">
        <div style={{ ...cardStyle(), padding: 24, marginBottom: 24 }}>
          <div className="between">
            <div style={{ maxWidth: 760 }}>
              <div className="row muted small" style={{ marginBottom: 8 }}>
                <img src="/icon.svg" alt="Logo" style={{ width: 40, height: 40, borderRadius: "50%" }} />
                <strong>Calendari 2026</strong>
              </div>
              <h1 style={{ margin: 0, fontSize: 38, lineHeight: 1.1 }}>Recollida domèstica · La Goba, Puigventós i Terrafortuna</h1>
              <p className="muted" style={{ marginBottom: 0 }}>
                Versió pro amb icona inspirada en el teu logo, preparada per publicar-se com a PWA a Vercel o Netlify.
              </p>
            </div>
          </div>

          <div className="grid-top" style={{ marginTop: 20 }}>
            <div className="row">
              <select className="select" style={{ maxWidth: 220 }} value={String(month)} onChange={event => setMonth(Number(event.target.value))}>
                {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>

              <div className="row" style={{ background: "#f7f4f7", padding: 4, borderRadius: 16, border: "1px solid #e4dce0" }}>
                <button style={buttonStyle(view === "mes")} onClick={() => setView("mes")}>Vista mes</button>
                <button style={buttonStyle(view === "llista")} onClick={() => setView("llista")}>Vista llista</button>
              </div>
            </div>

            <div className="row">
              <div style={{ position: "relative", flex: 1, minWidth: 240 }}>
                <Search size={16} style={{ position: "absolute", left: 12, top: 14, color: "#9a8f98" }} />
                <input
                  className="input"
                  style={{ paddingLeft: 36 }}
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder="Cerca per data, dia o residu"
                />
              </div>

              <select className="select" style={{ maxWidth: 230 }} value={selectedType} onChange={event => setSelectedType(event.target.value)}>
                <option value="tot">Tot</option>
                <option value="Orgànica">Orgànica</option>
                <option value="Envasos">Envasos</option>
                <option value="Paper i cartró">Paper i cartró</option>
                <option value="Vidre">Vidre</option>
                <option value="Resta">Resta</option>
                <option value="Tèxtil sanitari">Tèxtil sanitari</option>
                <option value="Poda amb sol·licitud prèvia">Poda</option>
                <option value="Trastos i mobles vells amb sol·licitud prèvia">Trastos i mobles vells</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid-main">
          <div style={{ ...cardStyle(), padding: 24 }}>
            <div className="between" style={{ marginBottom: 18 }}>
              <h2 style={{ margin: 0, fontSize: 28 }}>{MONTHS[month]} {YEAR}</h2>
              <div className="row">
                <button style={buttonStyle()} onClick={() => setMonth(month === 0 ? 11 : month - 1)}><ChevronLeft size={16} />Anterior</button>
                <button style={buttonStyle(true)} onClick={() => setMonth(realToday.getFullYear() === YEAR ? realToday.getMonth() : 0)}>Mes actual</button>
                <button style={buttonStyle()} onClick={() => setMonth(month === 11 ? 0 : month + 1)}>Següent<ChevronRight size={16} /></button>
              </div>
            </div>

            {view === "mes" ? (
              <>
                <div className="grid-7" style={{ marginBottom: 8 }}>
                  {WEEKDAYS.map(day => <div className="cell-head" key={day}>{day}</div>)}
                </div>
                <div className="grid-7">
                  {monthCells.map((date, idx) => {
                    if (!date) return <div key={idx} className="day-cell" style={{ background: "#faf8fa", borderStyle: "dashed" }} />;

                    const pickups = getPickupTypes(date);
                    const special = getSpecialServices(date);
                    const all = [...pickups, ...special];
                    const isToday = sameDate(date, fakeToday);
                    const isVisible = highlightedDates.has(formatISODate(date)) || (!search && selectedType === "tot");

                    return (
                      <div key={idx} className={`day-cell ${isToday ? "today" : ""} ${isVisible ? "" : "dim"}`}>
                        <div className="between" style={{ alignItems: "flex-start", marginBottom: 6 }}>
                          <strong>{date.getDate()}</strong>
                          <span className="tiny muted">S {getISOWeek(date)}</span>
                        </div>
                        {all.length === 0 ? (
                          <div className="tiny muted">Sense recollida</div>
                        ) : all.slice(0, 4).map(type => (
                          <div key={type} className={`tag-block ${tagClass(type)}`}>{type}</div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {filteredSchedule.length === 0 && (
                  <div style={{ border: "1px dashed #d7cbd4", borderRadius: 18, padding: 24, textAlign: "center", color: "#7a6d78" }}>
                    No hi ha resultats per al filtre aplicat.
                  </div>
                )}
                {filteredSchedule.map(item => (
                  <div key={item.iso} style={{ border: "1px solid #e5e1e4", borderRadius: 18, padding: 16 }}>
                    <div className="between">
                      <div>
                        <div style={{ fontWeight: 700 }}>{item.weekday}, {item.dateLabel}</div>
                        <div className="small muted">{item.monthName} · Setmana {item.week} · {item.parity}</div>
                      </div>
                      <div className="row">
                        {item.pickups.map(type => (
                          <span key={type} className={`tag ${tagClass(type)}`} style={badgeStyle()}>{iconForType(type)} {type}</span>
                        ))}
                        {item.special.map(type => (
                          <span key={type} className={`tag ${tagClass(type)}`} style={badgeStyle()}>{iconForType(type)} {type}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "grid", gap: 24 }}>
            <div style={{ ...cardStyle(), padding: 24 }}>
              <h3 style={{ marginTop: 0 }}>Recordatoris i mòbil</h3>
              <div className="row" style={{ justifyContent: "space-between", border: "1px solid #e5e1e4", borderRadius: 18, padding: 14, marginBottom: 14 }}>
                <div>
                  <div style={{ fontWeight: 600 }}>Avisos locals</div>
                  <div className="small muted">Permet notificacions del navegador.</div>
                </div>
                <button style={buttonStyle(notificationEnabled)} onClick={requestNotifications}>{notificationEnabled ? "Actius" : "Activar"}</button>
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                <button style={buttonStyle(true)} onClick={exportICS}><Bell size={16} />Exporta recordatoris .ics</button>
                <button style={buttonStyle()} onClick={exportCSV}><Download size={16} />Exporta calendari .csv</button>
                <button style={{ ...buttonStyle(), opacity: installPrompt ? 1 : 0.6 }} onClick={handleInstall} disabled={!installPrompt}><Smartphone size={16} />Instal·la al mòbil</button>
                {!installPrompt && <div className="tiny muted">La instal·lació apareixerà quan s’obri en un entorn compatible amb PWA.</div>}
              </div>
            </div>

            <div style={{ ...cardStyle(), padding: 24 }}>
              <h3 style={{ marginTop: 0 }}>Llegenda</h3>
              <div style={{ display: "grid", gap: 10 }}>
                {["Orgànica", "Envasos", "Paper i cartró", "Vidre", "Resta", "Tèxtil sanitari"].map(type => (
                  <div key={type} style={{ display: "flex", alignItems: "center", gap: 10, border: "1px solid #e5e1e4", borderRadius: 16, padding: 12 }}>
                    <span className={`tag ${tagClass(type)}`} style={badgeStyle()}>{iconForType(type)}</span>
                    <strong>{type}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ ...cardStyle(), padding: 24 }}>
              <h3 style={{ marginTop: 0 }}>Regles del calendari</h3>
              <div className="small muted" style={{ display: "grid", gap: 10 }}>
                <div>Dimecres: Envasos, Orgànica i Tèxtil sanitari. A més, Vidre a les setmanes parelles.</div>
                <div>Divendres: Paper i cartró, Orgànica i Tèxtil sanitari.</div>
                <div>Diumenge: Orgànica i Tèxtil sanitari. A més, Envasos a les setmanes imparelles i Resta a les setmanes parelles.</div>
                <div>Dilluns: Poda amb sol·licitud prèvia.</div>
                <div>Dimecres: Trastos i mobles vells amb sol·licitud prèvia.</div>
              </div>
            </div>

            <div style={{ ...cardStyle(), padding: 24 }}>
              <div className="row" style={{ marginBottom: 8 }}>
                <Info size={18} />
                <h3 style={{ margin: 0 }}>Notes</h3>
              </div>
              <div className="small muted" style={{ display: "grid", gap: 10 }}>
                <div>Cal lliurar els residus amb el cubell corresponent a la porta de casa abans de les 22 h.</div>
                <div>El vidre, cal treure'l abans de les 10 h del matí.</div>
                <div>Altres serveis amb sol·licitud prèvia: 937 653 151 i 615 392 146.</div>
                <div>Si vols una coincidència visual exacta amb el teu logo original, només cal substituir el fitxer public/icon.svg.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
