"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { api, type Stop, type NextTrip, type Reservation, type DemoMaria } from "@/lib/api";

const USER_KEY = "mobidf_uid";
function getUserId() {
  if (typeof window === "undefined") return "guest";
  let id = localStorage.getItem(USER_KEY);
  if (!id) { id = `u_${Math.random().toString(36).slice(2)}`; localStorage.setItem(USER_KEY, id); }
  return id;
}

function OccBar({ pct, nivel }: { pct: number; nivel: string }) {
  const cfg = nivel === "vazio"
    ? { color: "#10b981", bg: "#10b98115", label: "Vazio", icon: "😊" }
    : nivel === "moderado"
    ? { color: "#f59e0b", bg: "#f59e0b15", label: "Moderado", icon: "😐" }
    : { color: "#f43f5e", bg: "#f43f5e15", label: "Lotado", icon: "😰" };
  return (
    <div className="flex items-center gap-3">
      <span className="text-lg">{cfg.icon}</span>
      <div className="flex-1">
        <div className="flex justify-between text-xs mb-1">
          <span className="font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
          <span style={{ color: "#94a3b8" }}>{Math.min(100, pct)}%</span>
        </div>
        <div className="occ-track">
          <div className="occ-fill" style={{ width: `${Math.min(100, pct)}%`, background: cfg.color }} />
        </div>
      </div>
    </div>
  );
}

function BusCard({ trip, onReserve, reserving }: {
  trip: NextTrip;
  onReserve: (t: NextTrip) => void;
  reserving: string | null;
}) {
  const mins = Math.round(trip.minutos_para_chegada);
  const isLotado = trip.nivel_ocupacao === "lotado";
  const isExpressa = trip.linha.includes("Diametral") || trip.linha.includes("Expressa");

  return (
    <div className="bus-card">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-base font-black" style={{ color: "#0f172a" }}>{trip.linha}</span>
            {isExpressa && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                style={{ background: "rgba(99,102,241,0.12)", color: "#6366f1" }}>★ Diametral</span>
            )}
          </div>
          <p className="text-sm truncate" style={{ color: "#64748b" }}>{trip.destino}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-3xl font-black leading-none" style={{ color: mins <= 5 ? "#f43f5e" : "#0f172a" }}>
            {mins}
          </div>
          <div className="text-xs" style={{ color: "#94a3b8" }}>min</div>
          <div className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>
            {trip.departure_time?.slice(0, 5)}
          </div>
        </div>
      </div>

      <OccBar pct={trip.ocupacao_pct} nivel={trip.nivel_ocupacao} />

      <button
        onClick={() => onReserve(trip)}
        disabled={reserving === trip.trip_id || isLotado}
        className="w-full mt-3 py-3 rounded-xl text-sm font-bold transition-all duration-150"
        style={
          isLotado
            ? { background: "#f1f5f9", color: "#94a3b8", cursor: "not-allowed" }
            : reserving === trip.trip_id
            ? { background: "#e0e7ff", color: "#6366f1" }
            : { background: "#6366f1", color: "#fff", boxShadow: "0 4px 14px rgba(99,102,241,0.35)" }
        }
      >
        {reserving === trip.trip_id ? "Reservando..." : isLotado ? "Lotado — próximo horário" : "Reservar lugar · Categoria Expressa"}
      </button>
    </div>
  );
}

type Tab = "linhas" | "reservas" | "maria";

export default function CidadaoPage() {
  const [tab, setTab] = useState<Tab>("linhas");
  const [query, setQuery] = useState("");
  const [stops, setStops] = useState<Stop[]>([]);
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
  const [trips, setTrips] = useState<NextTrip[]>([]);
  const [reservas, setReservas] = useState<Reservation[]>([]);
  const [demo, setDemo] = useState<DemoMaria | null>(null);
  const [reserving, setReserving] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [tripsLoading, setTripsLoading] = useState(false);

  const userId = typeof window !== "undefined" ? getUserId() : "guest";

  useEffect(() => {
    if (query.length < 2) { setStops([]); return; }
    const t = setTimeout(() => api.cidadao.searchStops(query).then(setStops).catch(() => {}), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!selectedStop) return;
    setTripsLoading(true);
    api.cidadao.nextTrips(selectedStop.stop_id).then(setTrips).catch(() => setTrips([])).finally(() => setTripsLoading(false));
    const iv = setInterval(() => api.cidadao.nextTrips(selectedStop!.stop_id).then(setTrips).catch(() => {}), 20000);
    return () => clearInterval(iv);
  }, [selectedStop]);

  const loadReservas = useCallback(async () => {
    api.cidadao.listReservations(userId).then(setReservas).catch(() => {});
  }, [userId]);

  useEffect(() => { if (tab === "reservas") loadReservas(); }, [tab, loadReservas]);
  useEffect(() => { if (tab === "maria") api.cidadao.demoMaria().then(setDemo).catch(() => {}); }, [tab]);

  async function handleReserve(trip: NextTrip) {
    if (!selectedStop) return;
    setReserving(trip.trip_id);
    setMsg(null);
    try {
      await api.cidadao.createReservation({
        user_identifier: userId,
        trip_id: trip.trip_id,
        origin_stop_id: selectedStop.stop_id,
        dest_stop_id: selectedStop.stop_id,
        travel_date: new Date().toISOString().split("T")[0],
        departure_time: trip.departure_time ?? "00:00:00",
      });
      setMsg({ ok: true, text: "✓ Lugar reservado! Categoria Expressa garantida." });
      api.cidadao.nextTrips(selectedStop.stop_id).then(setTrips).catch(() => {});
    } catch (e: unknown) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Erro ao reservar" });
    } finally {
      setReserving(null);
    }
  }

  async function handleCancel(id: string) {
    setCancelling(id);
    try { await api.cidadao.cancelReservation(id, userId); loadReservas(); }
    catch { alert("Erro ao cancelar"); }
    finally { setCancelling(null); }
  }

  return (
    <div className="app-light flex flex-col max-w-md mx-auto relative">

      {/* Header */}
      <header className="sticky top-0 z-20 px-5 pt-safe pt-5 pb-4"
        style={{ background: "rgba(240,244,255,0.85)", backdropFilter: "blur(16px)", borderBottom: "1px solid #e2e8f0" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-xs"
              style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)" }}>M</div>
            <div>
              <div className="font-black text-sm" style={{ color: "#0f172a" }}>MobiDF AI</div>
              <div className="text-xs" style={{ color: "#94a3b8" }}>Distrito Federal</div>
            </div>
          </div>
          <Link href="/" className="text-xs px-3 py-1.5 rounded-lg" style={{ background: "#e0e7ff", color: "#6366f1", fontWeight: 600 }}>
            Gestor →
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 pb-28 pt-4">

        {/* ── Tab: Linhas ── */}
        {tab === "linhas" && (
          <div className="space-y-4 animate-fade-in">
            {/* Search */}
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-lg pointer-events-none">🔍</div>
              <input
                type="text"
                placeholder="Buscar parada..."
                value={query}
                onChange={e => { setQuery(e.target.value); setSelectedStop(null); setTrips([]); }}
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm outline-none transition-all"
                style={{ background: "#fff", border: "1.5px solid #e2e8f0", color: "#0f172a", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
              />
            </div>

            {/* Stop suggestions */}
            {stops.length > 0 && !selectedStop && (
              <div className="rounded-2xl overflow-hidden" style={{ background: "#fff", border: "1.5px solid #e2e8f0", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
                {stops.map((s, i) => (
                  <button key={s.stop_id}
                    onClick={() => { setSelectedStop(s); setQuery(s.stop_name); setStops([]); }}
                    className="w-full text-left px-4 py-3.5 text-sm transition-colors"
                    style={{ borderBottom: i < stops.length - 1 ? "1px solid #f1f5f9" : "none", color: "#0f172a" }}>
                    <div className="flex items-center gap-3">
                      <span className="text-lg">📍</span>
                      <div>
                        <div className="font-semibold">{s.stop_name}</div>
                        {s.dist_m && <div className="text-xs" style={{ color: "#94a3b8" }}>{Math.round(s.dist_m)}m de distância</div>}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Feedback */}
            {msg && (
              <div className="rounded-2xl px-4 py-3 text-sm font-medium animate-slide-up"
                style={{
                  background: msg.ok ? "#f0fdf4" : "#fff1f2",
                  border: `1.5px solid ${msg.ok ? "#bbf7d0" : "#fecdd3"}`,
                  color: msg.ok ? "#166534" : "#9f1239",
                }}>
                {msg.text}
              </div>
            )}

            {/* Trips */}
            {selectedStop && (
              <div className="animate-slide-up">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-base font-bold" style={{ color: "#0f172a" }}>{selectedStop.stop_name}</span>
                  <div className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ background: "#f0fdf4", color: "#16a34a" }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                    Ao vivo
                  </div>
                </div>

                {tripsLoading && (
                  <div className="text-center py-8" style={{ color: "#94a3b8" }}>
                    <div className="w-7 h-7 rounded-full border-2 border-t-indigo-500 border-indigo-200 animate-spin mx-auto mb-2" />
                    Buscando horários...
                  </div>
                )}

                {!tripsLoading && trips.length === 0 && (
                  <div className="text-center py-8 rounded-2xl" style={{ background: "#fff", border: "1.5px solid #e2e8f0" }}>
                    <div className="text-3xl mb-2">🚌</div>
                    <p className="text-sm" style={{ color: "#64748b" }}>Nenhuma viagem encontrada.<br />Execute o ETL GTFS no painel gestor.</p>
                  </div>
                )}

                <div className="space-y-3">
                  {trips.map(t => (
                    <BusCard key={t.trip_id} trip={t} onReserve={handleReserve} reserving={reserving} />
                  ))}
                </div>
              </div>
            )}

            {!selectedStop && !query && (
              <div className="text-center py-10">
                <div className="text-5xl mb-3">🚌</div>
                <p className="font-semibold text-sm" style={{ color: "#0f172a" }}>Onde você está?</p>
                <p className="text-sm mt-1" style={{ color: "#94a3b8" }}>Busque sua parada para ver os próximos ônibus</p>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Reservas ── */}
        {tab === "reservas" && (
          <div className="space-y-3 animate-fade-in">
            <h2 className="font-black text-lg" style={{ color: "#0f172a" }}>Minhas Reservas</h2>
            {reservas.length === 0 ? (
              <div className="text-center py-12 rounded-2xl" style={{ background: "#fff", border: "1.5px solid #e2e8f0" }}>
                <div className="text-4xl mb-3">🎫</div>
                <p className="font-semibold text-sm" style={{ color: "#0f172a" }}>Nenhuma reserva ativa</p>
                <p className="text-sm mt-1" style={{ color: "#94a3b8" }}>Busque uma parada e garanta seu lugar</p>
                <button onClick={() => setTab("linhas")} className="mt-4 text-sm font-semibold" style={{ color: "#6366f1" }}>
                  Buscar ônibus →
                </button>
              </div>
            ) : reservas.map(r => (
              <div key={r.id} className="bus-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-black text-sm" style={{ color: "#0f172a" }}>{r.linha}</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={r.status === "confirmado" ? { background: "#f0fdf4", color: "#16a34a" } : { background: "#fef9c3", color: "#854d0e" }}>
                        {r.status === "confirmado" ? "✓ Confirmado" : r.status}
                      </span>
                    </div>
                    <p className="text-sm" style={{ color: "#64748b" }}>{r.origem_nome} → {r.destino_nome}</p>
                    <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>
                      {r.travel_date} · {r.departure_time?.slice(0, 5)}
                    </p>
                  </div>
                  {r.status === "confirmado" && (
                    <button onClick={() => handleCancel(r.id)} disabled={cancelling === r.id}
                      className="text-xs font-semibold flex-shrink-0" style={{ color: "#f43f5e" }}>
                      {cancelling === r.id ? "..." : "Cancelar"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Tab: Maria ── */}
        {tab === "maria" && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="font-black text-lg" style={{ color: "#0f172a" }}>Cenário Maria</h2>
            <p className="text-sm" style={{ color: "#64748b" }}>
              Como o MobiDF AI transforma o dia a dia de quem mora na periferia do DF.
            </p>

            {!demo && <div className="text-center py-8" style={{ color: "#94a3b8" }}>Carregando...</div>}
            {demo && (
              <>
                {/* Persona */}
                <div className="rounded-2xl p-5 text-white" style={{ background: "linear-gradient(135deg, #312e81, #4f46e5)" }}>
                  <div className="text-xs font-semibold opacity-70 mb-2 uppercase tracking-wider">Persona</div>
                  <div className="text-2xl font-black">{demo.persona}</div>
                  <div className="text-sm opacity-80 mt-1">{demo.origem} → {demo.destino}</div>
                </div>

                {/* Antes */}
                <div className="bus-card" style={{ borderColor: "#fecdd3", background: "#fff1f2" }}>
                  <div className="text-xs font-semibold mb-2" style={{ color: "#f43f5e" }}>ANTES · SEM MOBIDF</div>
                  <div className="text-3xl font-black" style={{ color: "#0f172a" }}>
                    {demo.cenario_atual.tempo_total_min} min
                  </div>
                  <p className="text-sm mt-1" style={{ color: "#64748b" }}>{demo.cenario_atual.descricao}</p>
                  <div className="mt-2 text-xs" style={{ color: "#94a3b8" }}>
                    {demo.cenario_atual.baldeacoes} baldeações obrigatórias
                  </div>
                </div>

                {/* Rota Diametral */}
                <div className="bus-card" style={{ borderColor: "#bbf7d0", background: "#f0fdf4" }}>
                  <div className="text-xs font-semibold mb-2" style={{ color: "#10b981" }}>ROTA DIAMETRAL</div>
                  <div className="flex items-end gap-3">
                    <div className="text-3xl font-black" style={{ color: "#0f172a" }}>
                      {demo.cenario_mobidf.rota_diametral.tempo_total_min} min
                    </div>
                    <div className="text-lg font-black pb-1" style={{ color: "#10b981" }}>
                      −{demo.cenario_mobidf.rota_diametral.tempo_salvo_min} min
                    </div>
                  </div>
                  <p className="text-sm mt-1" style={{ color: "#64748b" }}>Ceilândia → SIA direto · Zero baldeação</p>
                </div>

                {/* Terminal Virtual */}
                <div className="bus-card" style={{ borderColor: "#c7d2fe", background: "#eef2ff" }}>
                  <div className="text-xs font-semibold mb-2" style={{ color: "#6366f1" }}>TERMINAL VIRTUAL</div>
                  <div className="text-3xl font-black" style={{ color: "#0f172a" }}>
                    {demo.cenario_mobidf.terminal_virtual.tempo_total_min} min
                  </div>
                  <p className="text-sm mt-1" style={{ color: "#64748b" }}>
                    Máx. {demo.cenario_mobidf.terminal_virtual.espera_max_min} min de espera na baldeação
                  </p>
                </div>

                {/* Reserva */}
                <div className="bus-card flex items-center gap-4" style={{ borderColor: "#fde68a", background: "#fffbeb" }}>
                  <span className="text-3xl">🎫</span>
                  <div>
                    <div className="font-bold text-sm" style={{ color: "#0f172a" }}>Assento Garantido · Expressa</div>
                    <div className="text-xs mt-0.5" style={{ color: "#92400e" }}>Check-in 30 min antes · sem filas</div>
                  </div>
                </div>

                {/* Impacto */}
                <div className="rounded-2xl p-5 text-white" style={{ background: "linear-gradient(135deg, #064e3b, #10b981)" }}>
                  <div className="text-xs font-semibold opacity-70 mb-3 uppercase tracking-wider">Impacto na vida de {demo.persona}</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-3xl font-black">+{demo.impacto_diario.tempo_recuperado_min} min</div>
                      <div className="text-xs opacity-70 mt-0.5">por dia</div>
                    </div>
                    <div>
                      <div className="text-3xl font-black">+{demo.impacto_diario.tempo_recuperado_horas_mes}h</div>
                      <div className="text-xs opacity-70 mt-0.5">por mês</div>
                    </div>
                  </div>
                  <div className="mt-3 text-xs opacity-60">
                    {demo.impacto_diario.ods_impactados.join(" · ")}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto pb-safe"
        style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(20px)", borderTop: "1px solid #e2e8f0" }}>
        <div className="flex items-center justify-around px-4 py-2">
          {([
            { id: "linhas" as Tab,   icon: "🚌", label: "Linhas" },
            { id: "reservas" as Tab, icon: "🎫", label: "Reservas" },
            { id: "maria" as Tab,    icon: "👩", label: "Cenário" },
          ] as const).map(item => (
            <button key={item.id} onClick={() => setTab(item.id)}
              className="flex flex-col items-center gap-0.5 py-1.5 px-5 rounded-xl transition-all duration-150"
              style={tab === item.id
                ? { background: "rgba(99,102,241,0.1)", color: "#6366f1" }
                : { color: "#94a3b8" }}>
              <span className="text-xl">{item.icon}</span>
              <span className="text-xs font-semibold">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
