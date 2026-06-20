"use client";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api, type Stop, type NextTrip as Trip, type Reservation } from "@/lib/api";

const ease: [number,number,number,number] = [0.16, 1, 0.3, 1];
type Tab = "linhas" | "reservas" | "maria";

const OCC_COLORS: Record<string, string> = {
  vazio:    "linear-gradient(90deg,#10b981,#34d399)",
  moderado: "linear-gradient(90deg,#f59e0b,#fbbf24)",
  lotado:   "linear-gradient(90deg,#f43f5e,#fb7185)",
};
const OCC_LABEL: Record<string, string> = {
  vazio:    "Disponível",
  moderado: "Cheio",
  lotado:   "Lotado",
};
const OCC_PCT: Record<string, number> = {
  vazio: 35, moderado: 75, lotado: 97,
};

/* ── Occupancy pill ── */
function OccPill({ level }: { level: string }) {
  return (
    <div style={{
      display:"inline-flex", alignItems:"center", gap:5,
      padding:"3px 10px", borderRadius:99, fontSize:11, fontWeight:700,
      background: level === "vazio"    ? "rgba(16,185,129,0.15)"
                : level === "moderado" ? "rgba(245,158,11,0.15)"
                : "rgba(244,63,94,0.15)",
      color: level === "vazio" ? "#34d399" : level === "moderado" ? "#fbbf24" : "#fb7185",
    }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background: level === "vazio" ? "#10b981" : level === "moderado" ? "#f59e0b" : "#f43f5e", display:"block" }} />
      {OCC_LABEL[level] ?? level}
    </div>
  );
}

/* ── BusCard ── */
function BusCard({ trip, onReserve, reserving }: { trip: Trip; onReserve: () => void; reserving: boolean }) {
  const pct = OCC_PCT[trip.nivel_ocupacao] ?? 50;
  const grad = OCC_COLORS[trip.nivel_ocupacao] ?? OCC_COLORS.vazio;
  const eta = Number(trip.minutos_para_chegada ?? 0);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.96 }}
      transition={{ duration: 0.35, ease }}
      className="citizen-card">

      {/* Header row */}
      <div style={{ display:"flex", alignItems:"flex-start", gap:12, marginBottom:12 }}>
        <div style={{ width:48, height:48, borderRadius:16, background:"linear-gradient(135deg,#7c3aed,#6366f1)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>
          🚌
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            <span style={{ fontSize:16, fontWeight:900, color:"#0f172a" }}>{trip.linha}</span>
            <OccPill level={trip.nivel_ocupacao} />
          </div>
          <div style={{ fontSize:12, color:"#64748b", marginTop:2 }}>{trip.destino}</div>
        </div>
        <div style={{ textAlign:"right", flexShrink:0 }}>
          <div style={{ fontSize:24, fontWeight:900, color: eta <= 2 ? "#f43f5e" : eta <= 5 ? "#f59e0b" : "#7c3aed", lineHeight:1 }}>
            {eta}
          </div>
          <div style={{ fontSize:10, color:"#94a3b8", fontWeight:600 }}>MIN</div>
        </div>
      </div>

      {/* Occupancy bar */}
      <div className="occ-track" style={{ marginBottom:12 }}>
        <div className="occ-bar" style={{ width:`${pct}%`, background: grad }} />
      </div>

      {/* Stop info + reserve */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
        <div style={{ fontSize:11, color:"#94a3b8" }}>
          📍 {trip.destino} · {trip.departure_time}
        </div>
        <button onClick={onReserve} disabled={reserving || trip.nivel_ocupacao === "lotado"} className="citizen-btn" style={{ width:"auto", padding:"8px 16px", fontSize:12, flexShrink:0 }}>
          {reserving ? "..." : trip.nivel_ocupacao === "lotado" ? "Lotado" : "Reservar"}
        </button>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════ */
export default function CidadaoPage() {
  const [tab, setTab] = useState<Tab>("linhas");
  const [query, setQuery] = useState("");
  const [stops, setStops] = useState<Stop[]>([]);
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [reserving, setReserving] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mariaData, setMariaData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const userToken = "usuario_demo_01";

  const searchStops = useCallback(async (q: string) => {
    if (!q.trim()) { setStops([]); return; }
    setLoading(true);
    try { setStops(await api.cidadao.searchStops(q)); setError(null); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro"); }
    finally { setLoading(false); }
  }, []);

  const loadTrips = useCallback(async (s: Stop) => {
    setSelectedStop(s);
    setLoading(true);
    try { setTrips(await api.cidadao.nextTrips(s.stop_id)); }
    catch { setTrips([]); }
    finally { setLoading(false); }
  }, []);

  const loadReservations = useCallback(async () => {
    try { setReservations(await api.cidadao.listReservations(userToken)); } catch { setReservations([]); }
  }, [userToken]);

  const loadMaria = useCallback(async () => {
    try { setMariaData(await api.cidadao.demoMaria() as unknown as Record<string, unknown>); } catch { setMariaData(null); }
  }, []);

  useEffect(() => { if (tab === "reservas") loadReservations(); }, [tab, loadReservations]);
  useEffect(() => { if (tab === "maria") loadMaria(); }, [tab, loadMaria]);

  useEffect(() => {
    const timer = setTimeout(() => searchStops(query), 350);
    return () => clearTimeout(timer);
  }, [query, searchStops]);

  async function reserve(trip: Trip) {
    setReserving(trip.trip_id);
    try {
      const today = new Date().toISOString().slice(0, 10);
      await api.cidadao.createReservation({ trip_id: trip.trip_id, origin_stop_id: selectedStop!.stop_id, dest_stop_id: selectedStop!.stop_id, user_identifier: userToken, travel_date: today, departure_time: trip.departure_time });
      await loadReservations();
    } catch { /**/ } finally { setReserving(null); }
  }

  const TABS: Array<{ id: Tab; icon: string; label: string }> = [
    { id: "linhas",   icon: "🚌", label: "Linhas" },
    { id: "reservas", icon: "🎫", label: "Reservas" },
    { id: "maria",    icon: "🌟", label: "Maria" },
  ];

  return (
    <div className="citizen-root" style={{ paddingBottom: 80 }}>

      {/* Ambient glow */}
      <div style={{ position:"fixed", top:"-20%", left:"50%", transform:"translateX(-50%)", width:600, height:400, borderRadius:"50%", background:"radial-gradient(ellipse,rgba(99,102,241,0.25),transparent 70%)", pointerEvents:"none", zIndex:0 }} />

      {/* ── Header ── */}
      <motion.header
        initial={{ opacity:0, y:-16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5, ease }}
        style={{ padding:"20px 20px 0", position:"relative", zIndex:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
          <div style={{ width:38, height:38, borderRadius:12, background:"linear-gradient(135deg,#7c3aed,#6366f1)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, color:"#fff", fontWeight:900, boxShadow:"0 0 20px rgba(99,102,241,0.5)", flexShrink:0 }}>M</div>
          <div>
            <div style={{ fontSize:16, fontWeight:800, color:"#fff" }}>MobiDF</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)" }}>Transporte inteligente · DF</div>
          </div>
          <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:6, padding:"5px 10px", borderRadius:99, background:"rgba(16,185,129,0.15)", border:"1px solid rgba(16,185,129,0.25)" }}>
            <span className="live" />
            <span style={{ fontSize:11, color:"#34d399", fontWeight:600 }}>Ao vivo</span>
          </div>
        </div>

        {/* Search */}
        {tab === "linhas" && (
          <div style={{ position:"relative", marginBottom:4 }}>
            <span style={{ position:"absolute", left:16, top:"50%", transform:"translateY(-50%)", fontSize:18, pointerEvents:"none" }}>🔍</span>
            <input
              className="citizen-input"
              placeholder="Buscar ponto ou linha..."
              value={query}
              onChange={e => { setQuery(e.target.value); setSelectedStop(null); }}
            />
          </div>
        )}
      </motion.header>

      {/* ── Content ── */}
      <main style={{ padding:"16px 20px", position:"relative", zIndex:5 }}>

        {error && (
          <div style={{ marginBottom:12, padding:"12px 16px", borderRadius:16, background:"rgba(244,63,94,0.15)", border:"1px solid rgba(244,63,94,0.25)", color:"#fb7185", fontSize:13 }}>
            {error} — verifique se o mock server está rodando.
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div key={tab}
            initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }}
            transition={{ duration:0.25, ease }}>

            {/* ══ LINHAS ══ */}
            {tab === "linhas" && (
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>

                {/* Stop list */}
                {!selectedStop && stops.length > 0 && (
                  <div style={{ background:"rgba(255,255,255,0.08)", borderRadius:20, border:"1px solid rgba(255,255,255,0.12)", backdropFilter:"blur(12px)", overflow:"hidden" }}>
                    {stops.map((s, i) => (
                      <button key={s.stop_id} onClick={() => loadTrips(s)} style={{ display:"block", width:"100%", padding:"14px 18px", textAlign:"left", background:"none", border:"none", cursor:"pointer", borderBottom: i < stops.length-1 ? "1px solid rgba(255,255,255,0.06)" : "none", transition:"background 0.1s" }}>
                        <div style={{ fontSize:14, fontWeight:700, color:"#fff" }}>{s.stop_name}</div>
                        <div style={{ fontSize:11, color:"rgba(255,255,255,0.45)", marginTop:2 }}>📍 DF</div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Idle state */}
                {!selectedStop && stops.length === 0 && !loading && (
                  <div style={{ textAlign:"center", paddingTop:40 }}>
                    <div style={{ fontSize:48, marginBottom:12 }}>🚌</div>
                    <div style={{ fontSize:16, fontWeight:700, color:"rgba(255,255,255,0.7)", marginBottom:6 }}>Onde você está?</div>
                    <div style={{ fontSize:13, color:"rgba(255,255,255,0.35)" }}>Busque um ponto de ônibus acima</div>
                  </div>
                )}

                {/* Loading */}
                {loading && !selectedStop && (
                  <div style={{ textAlign:"center", paddingTop:32, color:"rgba(255,255,255,0.4)", fontSize:13 }}>Buscando...</div>
                )}

                {/* Trips */}
                {selectedStop && (
                  <>
                    <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 16px", borderRadius:16, background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.1)" }}>
                      <span style={{ fontSize:18 }}>📍</span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:700, color:"#fff", marginBottom:1 }}>{selectedStop.stop_name}</div>
                        <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)" }}>DF</div>
                      </div>
                      <button onClick={() => { setSelectedStop(null); setTrips([]); }} style={{ background:"rgba(255,255,255,0.1)", border:"none", color:"rgba(255,255,255,0.6)", borderRadius:8, padding:"4px 10px", fontSize:12, cursor:"pointer" }}>
                        ×
                      </button>
                    </div>

                    {loading && <div style={{ textAlign:"center", padding:"32px 0", color:"rgba(255,255,255,0.4)", fontSize:13 }}>Carregando horários...</div>}

                    <AnimatePresence>
                      {trips.map(t => (
                        <BusCard key={t.trip_id} trip={t} onReserve={() => reserve(t)} reserving={reserving === t.trip_id} />
                      ))}
                    </AnimatePresence>

                    {!loading && trips.length === 0 && (
                      <div style={{ textAlign:"center", padding:"32px 0", color:"rgba(255,255,255,0.4)", fontSize:13 }}>Nenhum horário disponível.</div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ══ RESERVAS ══ */}
            {tab === "reservas" && (
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                <div style={{ fontSize:18, fontWeight:800, color:"#fff", marginBottom:4 }}>Minhas reservas</div>
                {reservations.length === 0 ? (
                  <div style={{ textAlign:"center", paddingTop:40 }}>
                    <div style={{ fontSize:48, marginBottom:12 }}>🎫</div>
                    <div style={{ fontSize:14, fontWeight:700, color:"rgba(255,255,255,0.5)" }}>Nenhuma reserva ativa</div>
                    <div style={{ fontSize:12, color:"rgba(255,255,255,0.3)", marginTop:6 }}>Reserve um ônibus na aba Linhas</div>
                  </div>
                ) : reservations.map((r, i) => (
                  <motion.div key={r.id}
                    initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay: i*0.06 }}
                    className="citizen-card">
                    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                      <div style={{ width:44, height:44, borderRadius:14, background:"rgba(99,102,241,0.12)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>🎫</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:14, fontWeight:800, color:"#0f172a" }}>{r.linha}</div>
                        <div style={{ fontSize:11, color:"#64748b", marginTop:2 }}>{r.origem_nome}</div>
                        <div style={{ fontSize:11, color:"#94a3b8", marginTop:1 }}>
                          {r.travel_date ?? "—"} · {r.departure_time ?? ""}
                        </div>
                      </div>
                      <div style={{ padding:"4px 10px", borderRadius:99, background:"rgba(16,185,129,0.12)", color:"#10b981", fontSize:11, fontWeight:700, flexShrink:0 }}>
                        {r.status ?? "ativa"}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* ══ MARIA ══ */}
            {tab === "maria" && (
              <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                {/* Hero */}
                <div style={{ background:"linear-gradient(135deg,rgba(99,102,241,0.2),rgba(124,58,237,0.2))", border:"1px solid rgba(139,92,246,0.3)", borderRadius:24, padding:24, backdropFilter:"blur(12px)" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
                    <div style={{ width:52, height:52, borderRadius:20, background:"linear-gradient(135deg,#7c3aed,#6366f1)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24 }}>🌟</div>
                    <div>
                      <div style={{ fontSize:18, fontWeight:900, color:"#fff" }}>Cenário Maria</div>
                      <div style={{ fontSize:12, color:"rgba(255,255,255,0.5)" }}>Ceilândia → SIA · Impacto real</div>
                    </div>
                  </div>
                  <p style={{ fontSize:13, color:"rgba(255,255,255,0.65)", lineHeight:1.7 }}>
                    Maria, 34 anos, gasta <strong style={{ color:"#fff" }}>4h/dia</strong> em ônibus com 2 baldeações. A rota diametral reduziria para <strong style={{ color:"#34d399" }}>3h25</strong>, devolvendo <strong style={{ color:"#a78bfa" }}>+12,8h/mês</strong> de vida.
                  </p>
                </div>

                {[
                  { icon:"⏱", label:"Tempo atual / dia", value:"~4h", sub:"2 baldeações na Rodoviária", color:"#fb7185" },
                  { icon:"🚀", label:"Com rota diametral", value:"3h25", sub:"Sem parar no Plano Piloto", color:"#34d399" },
                  { icon:"📅", label:"Horas devolvidas / mês", value:"+12,8h", sub:"Tempo com a família", color:"#a78bfa" },
                  { icon:"💵", label:"Economia de passagem", value:"R$ 90/mês", sub:"Uma baldeação eliminada", color:"#fbbf24" },
                ].map((s, i) => (
                  <motion.div key={s.label}
                    initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay: i*0.07 }}
                    className="citizen-card">
                    <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                      <div style={{ width:44, height:44, borderRadius:14, background:`${s.color}18`, border:`1px solid ${s.color}30`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>
                        {s.icon}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:11, color:"#64748b", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:2 }}>{s.label}</div>
                        <div style={{ fontSize:24, fontWeight:900, color: s.color, lineHeight:1 }}>{s.value}</div>
                        <div style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>{s.sub}</div>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {mariaData && (
                  <div style={{ padding:"14px 16px", borderRadius:16, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.08)" }}>
                    <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>Dados do backend</div>
                    <pre style={{ fontSize:11, color:"rgba(255,255,255,0.5)", overflowX:"auto", margin:0 }}>{JSON.stringify(mariaData, null, 2)}</pre>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── Bottom nav ── */}
      <nav className="bottom-nav" style={{ position:"fixed", bottom:0, left:0, right:0, display:"flex", padding:"6px 12px 6px", zIndex:20 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3, padding:"8px 4px", borderRadius:14, border:"none", cursor:"pointer", transition:"all 0.15s",
              background: tab === t.id ? "rgba(139,92,246,0.15)" : "transparent",
              color: tab === t.id ? "#c4b5fd" : "rgba(255,255,255,0.35)" }}>
            <span style={{ fontSize:20 }}>{t.icon}</span>
            <span style={{ fontSize:10, fontWeight:700, letterSpacing:"0.04em" }}>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
