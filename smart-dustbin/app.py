import asyncio
import json
import os
import time
from collections import deque
from datetime import datetime
from pathlib import Path

import uvicorn
from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

# Built Next.js dashboard (cd dashboard && npm run build)
UI_DIR = Path(__file__).resolve().parent.parent / "dashboard" / "out"

def _load_dotenv():
    """Load KEY=VALUE lines from a sibling .env file (no dependency). Real
    environment variables still win. Create `.env` from `.env.example`."""
    envf = Path(__file__).resolve().parent / ".env"
    if not envf.exists():
        return
    for line in envf.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, val = line.split("=", 1)
        os.environ.setdefault(key.strip(), val.strip().strip('"').strip("'"))


_load_dotenv()

# Single API key for programmatic API access (the voice-call agent / external services).
# Set it in `.env` (API_KEY=...) or the environment to require it; leave blank/unset to
# allow open access (fine for local prototype testing). The browser dashboard does not use it.
API_KEY = os.environ.get("API_KEY")

app = FastAPI(title="Smart Dustbin API")

# External services call the API from their own servers (and some platforms'
# function-calling test consoles call from the browser), so allow cross-origin.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


def require_api_key(authorization: str | None = Header(default=None),
                    x_api_key: str | None = Header(default=None)):
    """No-op unless API_KEY is set; then require it as a Bearer token or x-api-key header."""
    if not API_KEY:
        return
    supplied = x_api_key or (authorization.split(" ", 1)[1] if authorization and " " in authorization else authorization)
    if supplied != API_KEY:
        raise HTTPException(status_code=401, detail="invalid or missing API key")
latest = {"distance": None, "fill": 0, "status": "WAITING",
          "updated": "No readings yet", "alert": False, "ts": None}
history = deque(maxlen=300)  # in-memory; resets when the server restarts
device = {"device_id": None, "ip": None, "rssi": None, "uptime_s": None, "fw": None,
          "sensor_ok": None, "sensor_failures": 0, "echo_idle": None, "last_seen": None}
FULL_THRESHOLD = 80
DEVICE_TIMEOUT_S = 25  # ESP32 heartbeats every 10 s
MIN_VALID_DISTANCE_CM = 2.0  # shorter "echoes" are trigger crosstalk, not waste
FULL_CONFIRMATIONS = 2  # consecutive full readings before alerting
READING_STALE_S = 60  # a reading older than this no longer drives status or alerts
full_streak = 0

# --- analytics + persistence state ---
SERVER_STARTED = time.time()
DATA_FILE = Path(__file__).resolve().parent / "dustbin_state.json"
events = deque(maxlen=300)  # {ts, kind, fill, detail} — FULL_ALERT / RESET / SENSOR_FAULT / SENSOR_RECOVERED
total_readings = 0


def record_event(kind, fill=None, detail=""):
    events.append({"ts": time.time(), "kind": kind, "fill": fill, "detail": detail})


def save_state():
    """Persist the time-series + counters so a restart doesn't lose history."""
    try:
        tmp = DATA_FILE.with_suffix(".tmp")
        payload = {"latest": latest, "device": device, "history": list(history),
                   "events": list(events), "full_streak": full_streak, "total_readings": total_readings}
        tmp.write_text(json.dumps(payload))
        tmp.replace(DATA_FILE)
    except Exception as e:  # persistence is best-effort; never break a request over it
        print(f"save_state failed: {e}", flush=True)


def load_state():
    global full_streak, total_readings
    if not DATA_FILE.exists():
        return
    try:
        d = json.loads(DATA_FILE.read_text())
        latest.update(d.get("latest", {}))
        device.update(d.get("device", {}))
        history.extend(d.get("history", []))
        events.extend(d.get("events", []))
        full_streak = d.get("full_streak", 0)
        total_readings = d.get("total_readings", 0)
        print(f"Restored {len(history)} readings, {len(events)} events from {DATA_FILE.name}", flush=True)
    except Exception as e:
        print(f"load_state failed: {e}", flush=True)


def today_count(kind):
    today = datetime.now().date()
    return sum(1 for e in events if e["kind"] == kind and datetime.fromtimestamp(e["ts"]).date() == today)


def fill_rate_per_min(window_s=600):
    """Average %/min from readings in the last `window_s` seconds (None if too few)."""
    now = time.time()
    pts = [p for p in history if now - p["ts"] <= window_s]
    if len(pts) < 2:
        return None
    span_min = (pts[-1]["ts"] - pts[0]["ts"]) / 60.0
    if span_min < 0.5:
        return None
    return round((pts[-1]["fill"] - pts[0]["fill"]) / span_min, 2)


class Reading(BaseModel):
    distance: float = Field(ge=0)
    fill: int = Field(ge=0, le=100)
    device_id: str | None = None
    rssi: int | None = None


class Heartbeat(BaseModel):
    device_id: str
    ip: str | None = None
    rssi: int | None = None
    uptime_s: int | None = None
    fw: str | None = None
    sensor_ok: bool
    sensor_failures: int = Field(default=0, ge=0)
    echo_idle: int | None = None  # ECHO pin level between pings (0 expected)


def status_for(fill):
    if fill >= FULL_THRESHOLD:
        return 'FULL - COLLECT NOW'
    if fill >= 50:
        return 'ALMOST FULL'
    return 'AVAILABLE'


def device_view():
    now = time.time()
    seen = device['last_seen']
    age = None if seen is None else round(now - seen, 1)
    return {**device, "last_seen_age": age,
            "online": age is not None and age <= DEVICE_TIMEOUT_S}


@app.get('/api/status')
def status():
    age = None if latest['ts'] is None else round(time.time() - latest['ts'], 1)
    view = {**latest, "age": age, "device": device_view()}
    if age is not None and age > READING_STALE_S:
        view.update(status='NO RECENT DATA', alert=False)
    return view


@app.post('/api/reset')
def reset():
    """Clear readings and any active alert (e.g. after the bin is collected)."""
    global full_streak
    collected_from = latest["fill"] if latest["ts"] is not None else None
    record_event("RESET", fill=collected_from, detail="readings cleared / bin collected")
    full_streak = 0
    history.clear()
    latest.update(distance=None, fill=0, status="WAITING",
                  updated="No readings yet", alert=False, ts=None)
    save_state()
    print('State reset', flush=True)
    return {"success": True}


@app.get('/api/device')
def get_device():
    return device_view()


@app.post('/api/heartbeat')
def heartbeat(hb: Heartbeat):
    was_ok = device['sensor_ok']
    device.update(hb.model_dump(), last_seen=time.time())
    if hb.sensor_ok is False and was_ok is not False:
        record_event("SENSOR_FAULT", detail=f"{hb.sensor_failures} failed reads, echo idle={hb.echo_idle}")
        print(f"!!! {hb.device_id}: sensor not responding "
              f"({hb.sensor_failures} failed reads, echo idle={hb.echo_idle})", flush=True)
    elif hb.sensor_ok and was_ok is False:
        record_event("SENSOR_RECOVERED", detail="sensor responding again")
        print(f"{hb.device_id}: sensor recovered", flush=True)
    return {"success": True}


@app.get('/api/history')
def get_history():
    return list(history)


@app.post('/api/update')
def update(reading: Reading):
    global full_streak, total_readings
    if reading.distance < MIN_VALID_DISTANCE_CM:
        print(f"Rejected reading: {reading.distance} cm is below the sensor's range", flush=True)
        return JSONResponse(status_code=422,
                            content={"error": f"distance below {MIN_VALID_DISTANCE_CM} cm"})
    was_full = latest['alert']
    now = time.time()
    full_streak = full_streak + 1 if reading.fill >= FULL_THRESHOLD else 0
    latest.update(distance=round(reading.distance, 1), fill=reading.fill,
                  status=status_for(reading.fill),
                  alert=full_streak >= FULL_CONFIRMATIONS,
                  updated=datetime.now().strftime('%H:%M:%S'), ts=now)
    history.append({"ts": now, "distance": latest['distance'], "fill": reading.fill})
    total_readings += 1
    device.update(last_seen=now, sensor_ok=True, sensor_failures=0)
    if reading.device_id:
        device['device_id'] = reading.device_id
    if reading.rssi is not None:
        device['rssi'] = reading.rssi
    print('Reading:', latest, flush=True)
    if latest['alert'] and not was_full:
        record_event("FULL_ALERT", fill=reading.fill, detail="reached full threshold")
        print(f"*** ALERT {latest['updated']}: dustbin FULL ({reading.fill}%) - collect now ***", flush=True)
    save_state()
    return {"success": True}


@app.get('/api/stats')
def get_stats():
    """Operational analytics for the dashboard KPI strip."""
    now = time.time()
    rate = fill_rate_per_min()
    fill = latest["fill"] if latest["ts"] is not None else None
    eta = None
    if rate and rate > 0 and fill is not None and fill < FULL_THRESHOLD:
        eta = round((FULL_THRESHOLD - fill) / rate, 1)
    resets = [e for e in events if e["kind"] == "RESET"]
    return {
        "total_readings": total_readings,
        "collections_today": today_count("RESET"),
        "fills_today": today_count("FULL_ALERT"),
        "fill_rate_per_min": rate,
        "eta_to_full_min": eta,
        "server_uptime_s": round(now - SERVER_STARTED),
        "device_uptime_s": device["uptime_s"],
        "last_collection_ts": resets[-1]["ts"] if resets else None,
        "event_count": len(events),
    }


@app.get('/api/events')
def get_events(limit: int = 50):
    """Recent lifecycle events, newest first."""
    return list(events)[-limit:][::-1]


# ---------------------------------------------------------------------------
# Voice-call agent API
# ---------------------------------------------------------------------------
# These endpoints return BOTH structured data and a ready-to-speak `speech`
# string. A voice agent platform (Vapi, Retell, Bland, Twilio, ElevenLabs, ...)
# registers them as tools/functions, then reads the `speech` field to the caller.
#
# The live backend tracks a single device, so `bin_id` is accepted and echoed
# back but not used to pick between bins yet. When you move to a fleet, key the
# `latest`/`history` stores by device and filter on `bin_id` here; the response
# shapes below (and /api/voice/full returning a list) already allow for it.

VOICE_READING_STALE_S = 60  # matches READING_STALE_S


def _speak_bin(label, s):
    """Build a natural sentence for the current state of one bin."""
    fill = s["fill"]
    dev = s["device"]
    if s["ts"] is None:
        return f"{label} hasn't sent any readings yet."
    if s["status"] == "NO RECENT DATA" or not dev["online"]:
        return (f"{label} hasn't reported recently. Its last reading was {fill}% full, "
                f"about {_say_ago(s['age'])}.")
    if dev["sensor_ok"] is False:
        return f"{label}'s ultrasonic sensor isn't responding right now, so I can't read its level."
    if s["alert"] or fill >= FULL_THRESHOLD:
        return f"{label} is {fill} percent full and needs to be collected now."
    if fill >= 50:
        return f"{label} is {fill} percent full. It's almost full but doesn't need collecting yet."
    return f"{label} is {fill} percent full and available."


def _say_ago(seconds):
    if seconds is None:
        return "a while ago"
    seconds = int(seconds)
    if seconds < 60:
        return f"{seconds} seconds ago"
    mins = seconds // 60
    return f"{mins} minute{'s' if mins != 1 else ''} ago"


def _bin_label(bin_id):
    name = bin_id or device.get("device_id")
    if not name:
        return "The dustbin"
    # "BIN-A1" -> "Bin A1" reads better over the phone than the raw id.
    return "Bin " + name.replace("BIN-", "").replace("-", " ") if name.upper().startswith("BIN") else name


def _bin_payload(bin_id=None):
    s = status()  # reuse the same view the dashboard gets (handles stale downgrade)
    dev = s["device"]
    # "Needs collection" matches the spoken answer: the debounced alert, or a fresh
    # reading that is already in the FULL band (status() only reports FULL when fresh).
    needs = bool(s["alert"] or (dev["online"] and s["status"] == "FULL - COLLECT NOW"))
    return {
        "bin_id": bin_id or dev["device_id"],
        "fill_percent": s["fill"],
        "status": s["status"],
        "needs_collection": needs,
        "distance_cm": s["distance"],
        "online": dev["online"],
        "sensor_ok": dev["sensor_ok"],
        "last_update": s["updated"],
        "seconds_since_update": s["age"],
        "speech": _speak_bin(_bin_label(bin_id), s),
    }


@app.get('/api/voice/status', dependencies=[Depends(require_api_key)])
def voice_status(bin_id: str | None = None):
    """Current fill level of a bin, with a spoken sentence for the agent to read."""
    return _bin_payload(bin_id)


@app.get('/api/voice/full', dependencies=[Depends(require_api_key)])
def voice_full():
    """Bins that need collecting right now (a list, so it already fits a fleet)."""
    s = status()
    full_bins = []
    if s["ts"] is not None and s["device"]["online"] and (s["alert"] or s["fill"] >= FULL_THRESHOLD):
        full_bins.append(_bin_payload())
    if not full_bins:
        speech = "No bins need collecting right now."
    elif len(full_bins) == 1:
        speech = f"One bin needs collecting: {full_bins[0]['bin_id'] or 'the dustbin'} at {full_bins[0]['fill_percent']} percent."
    else:
        names = ", ".join(b["bin_id"] for b in full_bins)
        speech = f"{len(full_bins)} bins need collecting: {names}."
    return {"count": len(full_bins), "bins": full_bins, "speech": speech}


@app.get('/api/voice/health', dependencies=[Depends(require_api_key)])
def voice_health():
    """Device / sensor health, phrased for the agent."""
    dev = device_view()
    online = dev["online"]
    sensor_ok = dev["sensor_ok"]
    if dev["last_seen"] is None:
        speech = "No device has reported in yet."
    elif not online:
        speech = f"The dustbin is offline. It was last seen {_say_ago(dev['last_seen_age'])}."
    elif sensor_ok is False:
        speech = (f"The dustbin is online but its ultrasonic sensor isn't responding, "
                  f"with {dev['sensor_failures']} failed reads in a row.")
    else:
        speech = "The dustbin is online and its sensor is working normally."
    return {
        "online": online,
        "sensor_ok": sensor_ok,
        "sensor_failures": dev["sensor_failures"],
        "rssi": dev["rssi"],
        "firmware": dev["fw"],
        "last_seen_seconds_ago": dev["last_seen_age"],
        "speech": speech,
    }


def _fill_trend():
    pts = list(history)
    if len(pts) < 2:
        return {"available": False, "percent_per_minute": None, "current_fill": pts[-1]["fill"] if pts else None,
                "readings": len(pts),
                "speech": "I don't have enough readings yet to tell how fast it's filling."}
    first, last = pts[0], pts[-1]
    dfill = last["fill"] - first["fill"]
    span_s = last["ts"] - first["ts"]
    span_min = span_s / 60.0
    # Only quote a per-minute rate over a window long enough to be meaningful (>= 1 min);
    # for a shorter window just state the change, so a burst of readings can't produce
    # an absurd extrapolated rate.
    rate = round(dfill / span_min, 1) if span_min >= 1 else None
    if dfill <= 0:
        speech = f"The level isn't rising right now; it's steady around {last['fill']} percent."
    elif rate is not None:
        mins = round(span_min)
        speech = (f"It rose from {first['fill']} to {last['fill']} percent over about "
                  f"{mins} minute{'s' if mins != 1 else ''}, roughly {rate} percent per minute.")
    else:
        speech = (f"It rose from {first['fill']} to {last['fill']} percent across the last "
                  f"{len(pts)} readings.")
    return {"available": True, "percent_per_minute": rate, "current_fill": last["fill"],
            "window_seconds": round(span_s), "readings": len(pts), "speech": speech}


class VoiceQuery(BaseModel):
    intent: str
    bin_id: str | None = None
    location: str | None = None


@app.post('/api/voice/query', dependencies=[Depends(require_api_key)])
def voice_query(q: VoiceQuery):
    """Single entry point: the agent posts a recognised intent (+ slots) and gets
    back `{intent, speech, data}`. Mirrors sample-data/voice_intents.json."""
    intent = q.intent.strip().lower()
    if intent in ("check_bin_fill", "bin_status_summary", "nearest_available_bin"):
        data = _bin_payload(q.bin_id)
        return {"intent": intent, "speech": data["speech"], "data": data}
    if intent == "list_full_bins":
        data = voice_full()
        return {"intent": intent, "speech": data["speech"], "data": data}
    if intent in ("check_device_health",):
        data = voice_health()
        return {"intent": intent, "speech": data["speech"], "data": data}
    if intent == "fill_trend":
        data = _fill_trend()
        return {"intent": intent, "speech": data["speech"], "data": data}
    if intent == "acknowledge_reset":
        reset()
        return {"intent": intent,
                "speech": f"Done. I've reset {_bin_label(q.bin_id).lower()} and cleared its alert. It now reads 0 percent.",
                "data": {"success": True}}
    if intent in ("collections_today", "stats"):
        st = get_stats()
        c, fills = st["collections_today"], st["fills_today"]
        speech = (f"The bin has been collected {c} time{'s' if c != 1 else ''} today "
                  f"and filled up {fills} time{'s' if fills != 1 else ''}.")
        return {"intent": intent, "speech": speech, "data": st}
    # Unknown intent: fall back to current status so the call still gets an answer.
    data = _bin_payload(q.bin_id)
    return {"intent": intent, "speech": data["speech"], "data": data,
            "note": "unrecognised intent; returned current bin status"}


def _sse(event, payload):
    """Format one Server-Sent Event frame."""
    return f"event: {event}\ndata: {json.dumps(payload)}\n\n"


@app.get('/api/voice/stream', dependencies=[Depends(require_api_key)])
async def voice_stream(request: Request, interval: float = 2.0, bin_id: str | None = None):
    """Continuous live feed for the voice-call agent (Server-Sent Events).

    Pushes a `status` event (the full voice payload, incl. `speech`) every
    `interval` seconds, a one-off `alert` event the moment the bin needs
    collection, and a `device` event when it goes offline or the sensor faults.
    Consume with an EventSource / any SSE client; it reconnects on its own.
    """
    interval = max(1.0, min(interval, 30.0))

    async def gen():
        prev_needs = None
        prev_online = None
        prev_sensor = None
        yield ": connected\n\n"  # open the stream immediately
        while True:
            if await request.is_disconnected():
                break
            payload = _bin_payload(bin_id)
            yield _sse("status", payload)
            # edge-triggered events so the agent can react, not just observe
            if payload["needs_collection"] and prev_needs is False:
                yield _sse("alert", payload)
            if prev_online is not None and payload["online"] != prev_online:
                yield _sse("device", payload)
            elif prev_sensor is not None and payload["sensor_ok"] != prev_sensor:
                yield _sse("device", payload)
            prev_needs, prev_online, prev_sensor = (
                payload["needs_collection"], payload["online"], payload["sensor_ok"])
            await asyncio.sleep(interval)

    return StreamingResponse(gen(), media_type="text/event-stream", headers={
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",  # disable proxy buffering so events flush live
    })


# Restore persisted history/events on startup (works for both `python app.py`
# and `uvicorn app:app`).
load_state()


if UI_DIR.is_dir():
    app.mount('/', StaticFiles(directory=UI_DIR, html=True), name='ui')
else:
    @app.get('/', response_class=HTMLResponse)
    def ui_missing():
        return ("<h1>Smart Dustbin API is running</h1><p>Dashboard not built yet: "
                "run <code>npm run build</code> in the <code>dashboard</code> folder, "
                "then restart this server. API docs: <a href='/docs'>/docs</a></p>")


if __name__ == '__main__':
    uvicorn.run(app, host='0.0.0.0', port=5000)
