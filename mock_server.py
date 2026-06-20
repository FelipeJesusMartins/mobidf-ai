"""
Mock backend MobiDF AI — sem banco de dados.
Retorna dados demo realistas para rodar o frontend sem Docker/PostgreSQL.
"""
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import hashlib, uuid, random
from datetime import date, datetime

app = FastAPI(title="MobiDF AI (Mock)", version="1.0.0-demo")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ── dados em memória ──────────────────────────────────────────
_reservations: dict[str, dict] = {}
_resolved_overlaps: set[str] = set()

OVERLAPS = [
    {"id": "ov-001", "route_id_a": "0.110", "route_id_b": "0.109", "nome_a": "110 - Ceilândia/Rodoviária", "nome_b": "109 - Ceilândia/Asa Norte", "desc_a": "Ceilândia Norte → Plano Piloto", "desc_b": "Ceilândia Sul → Asa Norte", "overlap_pct": 78.4, "overlap_km": 14.2, "horarios_conflito": [{"dep_a": "06:30:00", "dep_b": "06:32:00", "delta_min": 2.0}], "economia_estimada_mensal": 3400.0, "status": "ativo"},
    {"id": "ov-002", "route_id_a": "0.210", "route_id_b": "0.215", "nome_a": "210 - Samambaia/Rodoviária", "nome_b": "215 - Samambaia/Asa Sul", "desc_a": "Samambaia → PP", "desc_b": "Samambaia Sul → PP", "overlap_pct": 61.2, "overlap_km": 9.7, "horarios_conflito": [{"dep_a": "07:00:00", "dep_b": "07:05:00", "delta_min": 5.0}], "economia_estimada_mensal": 2720.0, "status": "ativo"},
    {"id": "ov-003", "route_id_a": "0.401", "route_id_b": "0.402", "nome_a": "401 - Taguatinga/Centro", "nome_b": "402 - Taguatinga/Asa Norte", "desc_a": "Taguatinga → Plano Piloto", "desc_b": "Taguatinga Norte → PP", "overlap_pct": 55.0, "overlap_km": 8.1, "horarios_conflito": [], "economia_estimada_mensal": 1870.0, "status": "ativo"},
    {"id": "ov-004", "route_id_a": "0.301", "route_id_b": "0.305", "nome_a": "301 - Guará/Rodoviária", "nome_b": "305 - Guará/Asa Sul", "desc_a": "Guará → PP", "desc_b": "Guará II → PP", "overlap_pct": 42.3, "overlap_km": 5.9, "horarios_conflito": [], "economia_estimada_mensal": 1250.0, "status": "resolvido"},
]

VIRTUAL_TERMINALS = [
    {"id": "vt-001", "stop_id": "TERM_CEI", "stop_name": "Terminal Ceilândia", "feeder_nome": "902 - Setor P Norte", "trunk_nome": "110 - Ceilândia/Rodoviária", "feeder_arrival": "06:28:00", "trunk_departure": "06:30:00", "wait_min": 2.0, "sync_score": 93.3, "is_synchronized": True},
    {"id": "vt-002", "stop_id": "TERM_TAG", "stop_name": "Terminal Taguatinga", "feeder_nome": "550 - Vicente Pires", "trunk_nome": "401 - Taguatinga/Centro", "feeder_arrival": "07:12:00", "trunk_departure": "07:14:00", "wait_min": 2.0, "sync_score": 93.3, "is_synchronized": True},
    {"id": "vt-003", "stop_id": "TERM_SAM", "stop_name": "Terminal Samambaia", "feeder_nome": "863 - Recanto das Emas", "trunk_nome": "210 - Samambaia/Rodoviária", "feeder_arrival": "06:55:00", "trunk_departure": "06:57:00", "wait_min": 2.0, "sync_score": 93.3, "is_synchronized": True},
    {"id": "vt-004", "stop_id": "TERM_GUA", "stop_name": "Terminal Guará", "feeder_nome": "193 - Park Way", "trunk_nome": "301 - Guará/Rodoviária", "feeder_arrival": "07:45:00", "trunk_departure": "07:47:30", "wait_min": 2.5, "sync_score": 75.0, "is_synchronized": True},
    {"id": "vt-005", "stop_id": "RODO", "stop_name": "Rodoviária do Plano Piloto", "feeder_nome": "110 - Ceilândia/Rodoviária", "trunk_nome": "047 - L2 Sul/Norte", "feeder_arrival": "07:15:00", "trunk_departure": "07:18:00", "wait_min": 3.0, "sync_score": 70.0, "is_synchronized": True},
    {"id": "vt-006", "stop_id": "TERM_SOB", "stop_name": "Terminal Sobradinho", "feeder_nome": "705 - Itapoã", "trunk_nome": "620 - Sobradinho/Rodoviária", "feeder_arrival": "06:40:00", "trunk_departure": "06:44:00", "wait_min": 4.0, "sync_score": 46.7, "is_synchronized": False},
]

FLEET_SCORES = [
    {"route_id": "0.110", "nome": "110", "descricao": "Ceilândia Norte → Rodoviária", "total_score": 82.0, "lotacao_score": 38.0, "sustentabilidade_score": 24.0, "ociosidade_penalty": 0.0, "reservations_count": 76},
    {"route_id": "0.210", "nome": "210", "descricao": "Samambaia → Rodoviária", "total_score": 75.0, "lotacao_score": 35.0, "sustentabilidade_score": 25.0, "ociosidade_penalty": 0.0, "reservations_count": 58},
    {"route_id": "0.401", "nome": "401", "descricao": "Taguatinga → Plano Piloto", "total_score": 68.0, "lotacao_score": 28.0, "sustentabilidade_score": 25.0, "ociosidade_penalty": 0.0, "reservations_count": 44},
    {"route_id": "0.301", "nome": "301", "descricao": "Guará → Rodoviária", "total_score": 55.0, "lotacao_score": 22.0, "sustentabilidade_score": 30.0, "ociosidade_penalty": 7.0, "reservations_count": 31},
    {"route_id": "0.109", "nome": "109", "descricao": "Ceilândia Sul → Asa Norte", "total_score": 41.0, "lotacao_score": 14.0, "sustentabilidade_score": 12.0, "ociosidade_penalty": 15.0, "reservations_count": 12},
    {"route_id": "0.215", "nome": "215", "descricao": "Samambaia Sul → PP", "total_score": 32.0, "lotacao_score": 10.0, "sustentabilidade_score": 12.0, "ociosidade_penalty": 20.0, "reservations_count": 8},
    {"route_id": "0.863", "nome": "863", "descricao": "Recanto das Emas → PP", "total_score": 28.0, "lotacao_score": 8.0, "sustentabilidade_score": 10.0, "ociosidade_penalty": 30.0, "reservations_count": 4},
]

DIAMETRAL = [
    {"id": "dm-001", "origem": "Ceilândia", "destino": "SIA", "trips_daily": 2800, "peak_hour": 7, "has_direct_route": False, "time_saved_min": 35.0, "horas_salvas_dia": 1633.3, "diametral_suggested": True},
    {"id": "dm-002", "origem": "Samambaia", "destino": "SIA", "trips_daily": 1900, "peak_hour": 7, "has_direct_route": False, "time_saved_min": 30.0, "horas_salvas_dia": 950.0, "diametral_suggested": True},
    {"id": "dm-003", "origem": "Recanto das Emas", "destino": "Asa Norte", "trips_daily": 1200, "peak_hour": 7, "has_direct_route": False, "time_saved_min": 28.0, "horas_salvas_dia": 560.0, "diametral_suggested": True},
    {"id": "dm-004", "origem": "Taguatinga", "destino": "SIA", "trips_daily": 1100, "peak_hour": 8, "has_direct_route": False, "time_saved_min": 20.0, "horas_salvas_dia": 366.7, "diametral_suggested": True},
    {"id": "dm-005", "origem": "Planaltina", "destino": "Taguatinga", "trips_daily": 800, "peak_hour": 7, "has_direct_route": False, "time_saved_min": 45.0, "horas_salvas_dia": 600.0, "diametral_suggested": True},
]

REINV_HISTORY = [
    {"periodo": "Jan/26", "economia_bruta": 9350, "alocacao_wifi": 5610, "alocacao_ac": 2805, "alocacao_reserva": 935, "overlap_routes_corrigidas": 1},
    {"periodo": "Fev/26", "economia_bruta": 12070, "alocacao_wifi": 7242, "alocacao_ac": 3621, "alocacao_reserva": 1207, "overlap_routes_corrigidas": 1},
    {"periodo": "Mar/26", "economia_bruta": 17680, "alocacao_wifi": 10608, "alocacao_ac": 5304, "alocacao_reserva": 1768, "overlap_routes_corrigidas": 2},
    {"periodo": "Abr/26", "economia_bruta": 8500, "alocacao_wifi": 5100, "alocacao_ac": 2550, "alocacao_reserva": 850, "overlap_routes_corrigidas": 1},
    {"periodo": "Mai/26", "economia_bruta": 21250, "alocacao_wifi": 12750, "alocacao_ac": 6375, "alocacao_reserva": 2125, "overlap_routes_corrigidas": 2},
    {"periodo": "Jun/26", "economia_bruta": 8500, "alocacao_wifi": 5100, "alocacao_ac": 2550, "alocacao_reserva": 850, "overlap_routes_corrigidas": 1},
]

STOPS = [
    {"stop_id": "CEI-N-01", "stop_name": "Terminal Ceilândia Norte", "stop_lat": -15.8106, "stop_lon": -48.1134},
    {"stop_id": "CEI-S-01", "stop_name": "Terminal Ceilândia Sul", "stop_lat": -15.8271, "stop_lon": -48.1075},
    {"stop_id": "SIA-01", "stop_name": "SIA - Setor de Indústrias e Abastecimento", "stop_lat": -15.8404, "stop_lon": -47.9634},
    {"stop_id": "RODO-01", "stop_name": "Rodoviária do Plano Piloto", "stop_lat": -15.7942, "stop_lon": -47.8825},
    {"stop_id": "TAG-01", "stop_name": "Terminal Taguatinga", "stop_lat": -15.8339, "stop_lon": -48.0557},
    {"stop_id": "SAM-01", "stop_name": "Terminal Samambaia", "stop_lat": -15.8762, "stop_lon": -48.0862},
    {"stop_id": "GUA-01", "stop_name": "Terminal Guará", "stop_lat": -15.8193, "stop_lon": -47.9889},
    {"stop_id": "SOB-01", "stop_name": "Terminal Sobradinho", "stop_lat": -15.6507, "stop_lon": -47.7951},
    {"stop_id": "ASA-N-01", "stop_name": "Asa Norte - W3 Norte", "stop_lat": -15.7543, "stop_lon": -47.8924},
    {"stop_id": "ASA-S-01", "stop_name": "Asa Sul - W3 Sul", "stop_lat": -15.8224, "stop_lon": -47.9012},
]

TRIPS = [
    {"trip_id": "T-110-01", "route_id": "0.110", "linha": "110", "destino": "Rodoviária do Plano Piloto", "departure_time": None, "minutos_para_chegada": 3, "reservas_ativas": 22, "ocupacao_pct": 55, "nivel_ocupacao": "moderado"},
    {"trip_id": "T-110-02", "route_id": "0.110", "linha": "110", "destino": "Rodoviária do Plano Piloto", "departure_time": None, "minutos_para_chegada": 13, "reservas_ativas": 8, "ocupacao_pct": 20, "nivel_ocupacao": "vazio"},
    {"trip_id": "T-110-03", "route_id": "0.110", "linha": "110 - Expressa", "destino": "Rodoviária do Plano Piloto (Expressa)", "departure_time": None, "minutos_para_chegada": 25, "reservas_ativas": 38, "ocupacao_pct": 95, "nivel_ocupacao": "lotado"},
    {"trip_id": "T-DIA-01", "route_id": "DIAMETRAL", "linha": "CEI-SIA Diametral ★", "destino": "SIA - Setor de Indústrias (Direto)", "departure_time": None, "minutos_para_chegada": 8, "reservas_ativas": 35, "ocupacao_pct": 87, "nivel_ocupacao": "moderado"},
]


def _now_trips(stop_id: str) -> list[dict]:
    now = datetime.now()
    base_min = now.hour * 60 + now.minute
    result = []
    for i, t in enumerate(TRIPS):
        dep_min = base_min + t["minutos_para_chegada"]
        h, m = divmod(dep_min, 60)
        trip = dict(t)
        trip["departure_time"] = f"{h % 24:02d}:{m:02d}:00"
        trip["reservas_ativas"] = t["reservas_ativas"] + random.randint(-2, 2)
        result.append(trip)
    return result


# ── Gestor endpoints ──────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "MobiDF AI (demo)"}

@app.get("/api/v1/gestor/dashboard")
def dashboard():
    active_overlaps = [o for o in OVERLAPS if o["status"] == "ativo" and o["id"] not in _resolved_overlaps]
    resolved_count = len([o for o in OVERLAPS if o["status"] == "resolvido"]) + len(_resolved_overlaps)
    economia_potencial = sum(o["economia_estimada_mensal"] for o in active_overlaps)
    economia_total = sum(o["economia_estimada_mensal"] for o in OVERLAPS if o["id"] in _resolved_overlaps or o["status"] == "resolvido")
    return {
        "overlap": {"ativos": len(active_overlaps), "resolvidos": resolved_count, "economia_potencial": economia_potencial, "economia_total": economia_total},
        "fleet": {"total_rotas": len(FLEET_SCORES), "score_medio": 54.4, "rotas_eficientes": 3, "rotas_criticas": 2},
        "terminal_virtual": {"total_sincronizados": 5, "avg_espera_min": 2.5, "tempo_salvo_total_min": 27.5, "passageiros_beneficiados": 412, "tempo_salvo_por_pessoa_min": 1.5},
        "reinvestment": {"economia_mes": 8500, "wifi_mes": 5100, "ac_mes": 2550, "economia_ano": 77350, "rotas_cortadas_ano": 1},
        "diametral_count": len(DIAMETRAL),
        "top_diametral": DIAMETRAL[:3],
    }

@app.get("/api/v1/gestor/overlaps")
def overlaps(status: str = "ativo"):
    result = []
    for o in OVERLAPS:
        effective_status = "resolvido" if o["id"] in _resolved_overlaps else o["status"]
        if effective_status == status:
            result.append({**o, "status": effective_status})
    return result

@app.get("/api/v1/gestor/overlaps/summary")
def overlap_summary():
    active = [o for o in OVERLAPS if o["id"] not in _resolved_overlaps and o["status"] == "ativo"]
    return {
        "ativos": len(active),
        "resolvidos": len(_resolved_overlaps) + len([o for o in OVERLAPS if o["status"] == "resolvido"]),
        "economia_potencial": sum(o["economia_estimada_mensal"] for o in active),
        "economia_total": sum(o["economia_estimada_mensal"] for o in OVERLAPS if o["id"] in _resolved_overlaps),
    }

@app.patch("/api/v1/gestor/overlaps/{overlap_id}/resolve")
def resolve_overlap(overlap_id: str):
    _resolved_overlaps.add(overlap_id)
    target = next((o for o in OVERLAPS if o["id"] == overlap_id), None)
    if not target:
        from fastapi import HTTPException
        raise HTTPException(404, "Não encontrado")
    return {**target, "status": "resolvido"}

@app.get("/api/v1/gestor/terminal-virtual")
def terminal_virtual(stop_id: Optional[str] = None):
    return [t for t in VIRTUAL_TERMINALS if not stop_id or t["stop_id"] == stop_id]

@app.get("/api/v1/gestor/terminal-virtual/kpi")
def terminal_kpi():
    return {"total_sincronizados": 5, "avg_espera_min": 2.5, "tempo_salvo_total_min": 27.5, "passageiros_beneficiados": 412, "tempo_salvo_por_pessoa_min": 1.5}

@app.get("/api/v1/gestor/fleet-scores")
def fleet_scores(limit: int = 50):
    return FLEET_SCORES[:limit]

@app.get("/api/v1/gestor/fleet-scores/summary")
def fleet_summary():
    return {"total_rotas": len(FLEET_SCORES), "score_medio": 54.4, "rotas_eficientes": 3, "rotas_criticas": 2}

@app.get("/api/v1/gestor/diametral/suggestions")
def diametral_suggestions():
    return DIAMETRAL

@app.get("/api/v1/gestor/diametral/od-heatmap")
def od_heatmap():
    return [{"origem": d["origem"], "destino": d["destino"], "trips_daily": d["trips_daily"], "has_direct_route": False, "diametral_suggested": True} for d in DIAMETRAL]

@app.get("/api/v1/gestor/reinvestment/current")
def reinvestment_current():
    return {"economia_mes": 8500, "wifi_mes": 5100, "ac_mes": 2550, "economia_ano": 77350, "rotas_cortadas_ano": len(_resolved_overlaps) + 1}

@app.get("/api/v1/gestor/reinvestment/history")
def reinvestment_history(months: int = 6):
    return REINV_HISTORY[:months]

@app.post("/api/v1/gestor/etl/gtfs")
def trigger_etl():
    return {"status": "ok", "stats": {"routes": 42, "stops": 1834, "trips": 8921, "stop_times": 219430, "shapes": 42}}

@app.get("/api/v1/etl/status")
def etl_status():
    return [{"source": "gtfs_static", "status": "success", "records_out": 229427, "started_at": "2026-06-20T00:30:00", "finished_at": "2026-06-20T00:34:12"}]

# ── Cidadão endpoints ─────────────────────────────────────────

@app.get("/api/v1/cidadao/stops/search")
def search_stops(q: str = "", limit: int = 10):
    q_lower = q.lower()
    return [s for s in STOPS if q_lower in s["stop_name"].lower()][:limit]

@app.get("/api/v1/cidadao/stops/nearby")
def stops_nearby(lat: float = -15.7942, lon: float = -47.8825, radius_m: int = 500):
    import math
    def dist(s):
        dlat = (s["stop_lat"] - lat) * 111000
        dlon = (s["stop_lon"] - lon) * 111000 * math.cos(math.radians(lat))
        return math.sqrt(dlat**2 + dlon**2)
    result = [{"dist_m": round(dist(s), 0), **s} for s in STOPS]
    return sorted(result, key=lambda x: x["dist_m"])[:10]

@app.get("/api/v1/cidadao/trips/next")
def next_trips(origin_stop_id: str = "", dest_stop_id: Optional[str] = None, limit: int = 5):
    return _now_trips(origin_stop_id)[:limit]

@app.get("/api/v1/cidadao/occupancy/{trip_id}")
def occupancy(trip_id: str):
    trip = next((t for t in TRIPS if t["trip_id"] == trip_id), None)
    count = len([r for r in _reservations.values() if r["trip_id"] == trip_id])
    return {"reservas_confirmadas": count, "ocupacao_pct": min(100, count * 2 + (trip["ocupacao_pct"] if trip else 0))}

class ReservationIn(BaseModel):
    user_identifier: str
    trip_id: str
    origin_stop_id: str
    dest_stop_id: str
    travel_date: str
    departure_time: str

@app.post("/api/v1/cidadao/reservations", status_code=201)
def create_reservation(body: ReservationIn):
    from fastapi import HTTPException
    token = hashlib.sha256(body.user_identifier.encode()).hexdigest()[:32]
    key = f"{token}:{body.trip_id}:{body.travel_date}"
    if key in _reservations:
        raise HTTPException(409, "Reserva já existe para este horário")
    rid = str(uuid.uuid4())
    trip = next((t for t in TRIPS if t["trip_id"] == body.trip_id), None)
    linha = trip["linha"] if trip else ""
    destino = trip["destino"] if trip else ""
    origin_stop = next((s for s in STOPS if s["stop_id"] == body.origin_stop_id), None)
    dest_stop = next((s for s in STOPS if s["stop_id"] == body.dest_stop_id), None)
    _reservations[key] = {
        "id": rid, "trip_id": body.trip_id, "travel_date": body.travel_date,
        "departure_time": body.departure_time, "status": "confirmado",
        "linha": linha, "destino": destino,
        "origem_nome": origin_stop["stop_name"] if origin_stop else body.origin_stop_id,
        "destino_nome": dest_stop["stop_name"] if dest_stop else body.dest_stop_id,
        "_token": token, "_key": key,
    }
    return {"reservation_id": rid, "status": "confirmado"}

@app.get("/api/v1/cidadao/reservations")
def list_reservations(user_identifier: str = ""):
    token = hashlib.sha256(user_identifier.encode()).hexdigest()[:32]
    return [r for r in _reservations.values() if r["_token"] == token and r["status"] != "cancelado"]

class CancelBody(BaseModel):
    user_identifier: str

@app.delete("/api/v1/cidadao/reservations/{reservation_id}")
def cancel_reservation(reservation_id: str, body: CancelBody):
    from fastapi import HTTPException
    token = hashlib.sha256(body.user_identifier.encode()).hexdigest()[:32]
    for r in _reservations.values():
        if r["id"] == reservation_id and r["_token"] == token:
            r["status"] = "cancelado"
            return {"status": "cancelado"}
    raise HTTPException(404, "Reserva não encontrada")

@app.get("/api/v1/cidadao/demo/maria")
def demo_maria():
    return {
        "persona": "Maria",
        "origem": "Ceilândia Norte",
        "destino": "SIA (Setor de Indústrias e Abastecimento)",
        "cenario_atual": {"tempo_total_min": 120, "baldeacoes": 2, "descricao": "Ceilândia → Rodoviária do PP → SIA. Espera média 18min na Rodoviária."},
        "cenario_mobidf": {
            "rota_diametral": {"descricao": "Linha Diametral Ceilândia–SIA", "tempo_total_min": 85, "baldeacoes": 0, "tempo_salvo_min": 35},
            "terminal_virtual": {"descricao": "Alimentadora sincronizada com troncal", "parada_baldeacao": "Terminal Taguatinga", "espera_max_min": 3, "tempo_total_min": 95, "tempo_salvo_min": 25},
            "reserva_de_fluxo": {"assento_garantido": True, "categoria": "Expressa", "antecedencia_checkin": "30 minutos antes"},
        },
        "impacto_diario": {"tempo_recuperado_min": 35, "tempo_recuperado_horas_mes": 12.8, "ods_impactados": ["ODS 10", "ODS 11", "ODS 13"]},
    }
