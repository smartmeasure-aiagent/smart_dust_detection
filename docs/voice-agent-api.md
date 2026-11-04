# Voice-Call Agent API

Endpoints the smart-dustbin backend exposes **for the voice-call agent service**. They live in
`smart-dustbin/app.py` and run on the same FastAPI server as the dashboard (default
`http://<server-ip>:5000`). Interactive API docs: `http://<server-ip>:5000/docs`.

Each endpoint returns **both** machine-readable fields **and** a ready-to-speak `speech` string.
Register them as tools/functions in your voice platform (Vapi, Retell, Bland, Twilio, ElevenLabs,
…); when the tool returns, have the agent read `speech` to the caller.

> The live backend tracks **one** ESP32 device, so `bin_id` is accepted and echoed but not yet used
> to choose between bins. `/api/voice/full` already returns a **list** so it fits a fleet unchanged —
> see [Extending to a fleet](#extending-to-a-fleet).

## Authentication

A single **API key** guards the programmatic API (`/api/voice/*`). The browser dashboard and its
data endpoints (`/api/status`, `/api/history`, `/api/stats`, …) stay open and do **not** need it.

Open by default (fine for local prototyping). To require the key, set it in the environment before
starting the server:

```bash
# Windows PowerShell
$env:API_KEY = "your-secret"; python app.py
# bash
API_KEY=your-secret python app.py
```

Then every `/api/voice/*` request must send it as either header:

```
Authorization: Bearer your-secret
x-api-key: your-secret
```

CORS is open (`*`) so the agent service — and browser-based function-test consoles — can call in.

## Endpoints

### `GET /api/voice/stream` — live feed (Server-Sent Events)
Continuous push stream for the voice agent, so it doesn't have to poll. `Content-Type:
text/event-stream`. Query params: `interval` (seconds between pushes, default 2, clamped 1–30)
and optional `bin_id`.

Event frames:
- `status` — every `interval` seconds, the full `/api/voice/status` payload (incl. `speech`).
- `alert` — fired **once** the moment the bin crosses into "needs collection".
- `device` — fired when the bin goes offline/online or the sensor faults/recovers.

```
: connected

event: status
data: {"bin_id":"BIN-A1","fill_percent":45,...,"speech":"Bin A1 is 45 percent full and available."}

event: alert
data: {"bin_id":"BIN-A1","fill_percent":88,"needs_collection":true,...,"speech":"Bin A1 is 88 percent full and needs to be collected now."}
```

Consume it with any SSE client (it auto-reconnects):

```bash
curl -N -H "x-api-key: your-secret" "http://<server-ip>:5000/api/voice/stream?interval=2"
```
```js
// browser / Node (EventSource)
const es = new EventSource("/api/voice/stream?interval=2");
es.addEventListener("status", (e) => speak(JSON.parse(e.data).speech));
es.addEventListener("alert",  (e) => startCall(JSON.parse(e.data)));
```
```python
# Python (httpx) — stream and act on each event
import httpx, json
with httpx.stream("GET", "http://localhost:5000/api/voice/stream",
                  headers={"x-api-key": "your-secret"}) as r:
    for line in r.iter_lines():
        if line.startswith("data:"):
            evt = json.loads(line[5:]); print(evt["speech"])
```

> EventSource can't set headers, so for browser use either leave `API_KEY` unset or put the key in a
> query string behind your own proxy. Server-to-server clients (the usual voice-agent case) send the
> `x-api-key` / `Authorization` header normally.

### `GET /api/voice/status`
Current fill level of the bin — a one-shot snapshot (use the stream above for a continuous feed).
Optional query param `bin_id`.

```json
{
  "bin_id": "BIN-A1",
  "fill_percent": 85,
  "status": "FULL - COLLECT NOW",
  "needs_collection": true,
  "distance_cm": 9.0,
  "online": true,
  "sensor_ok": true,
  "last_update": "16:55:52",
  "seconds_since_update": 0.6,
  "speech": "Bin A1 is 85 percent full and needs to be collected now."
}
```

`needs_collection` matches the spoken answer: true when the debounced alert is active **or** the
fresh reading is already in the FULL band. If the reading is stale, `status` becomes
`"NO RECENT DATA"` and `speech` says so.

### `GET /api/voice/full`
Bins that need collecting right now.

```json
{ "count": 1, "bins": [ { …same shape as /status… } ],
  "speech": "One bin needs collecting: BIN-A1 at 85 percent." }
```

Returns `count: 0` and "No bins need collecting right now." when clear.

### `GET /api/voice/health`
Device / sensor health.

```json
{ "online": true, "sensor_ok": true, "sensor_failures": 0, "rssi": -58,
  "firmware": "1.4.2", "last_seen_seconds_ago": 0.9,
  "speech": "The dustbin is online and its sensor is working normally." }
```

### `POST /api/voice/query`  ← recommended single tool
One entry point for all questions. The agent posts the recognised **intent** (+ slots); you get back
`{ intent, speech, data }`. Intents mirror `sample-data/voice_intents.json`.

```jsonc
// request
{ "intent": "check_bin_fill", "bin_id": "BIN-A1" }   // bin_id / location optional
// response
{ "intent": "check_bin_fill",
  "speech": "Bin A1 is 85 percent full and needs to be collected now.",
  "data": { …status payload… } }
```

| intent | returns |
|--------|---------|
| `check_bin_fill`, `bin_status_summary`, `nearest_available_bin` | current status |
| `list_full_bins` | bins needing collection |
| `check_device_health` | device/sensor health |
| `fill_trend` | fill rate (`percent_per_minute`, falls back to a count-based sentence over short windows) |
| `acknowledge_reset` | clears readings + alert (calls `/api/reset`) |

An unrecognised intent falls back to current status so the call always gets an answer.

## Wiring it into a voice platform

Register **one tool** pointing at `POST /api/voice/query` (simplest), or one tool per GET endpoint.
Example OpenAI-style function schema for the single tool:

```json
{
  "name": "get_dustbin_info",
  "description": "Get live smart-dustbin fill level, which bins are full, device health, or fill trend; or acknowledge a collection.",
  "parameters": {
    "type": "object",
    "properties": {
      "intent": { "type": "string",
        "enum": ["check_bin_fill","list_full_bins","check_device_health","fill_trend","acknowledge_reset","bin_status_summary"] },
      "bin_id": { "type": "string", "description": "e.g. BIN-A1 (optional)" }
    },
    "required": ["intent"]
  }
}
```

Map the tool call to `POST http://<server-ip>:5000/api/voice/query` with the arguments as the JSON
body (+ the auth header if you set a key), then speak the returned `speech`.

For **outbound** calls ("call me when the bin is full"), have your trigger poll `GET /api/voice/full`
(or watch the dashboard alert) and start a call when `count > 0`, using its `speech` as the opener.

## Extending to a fleet

Today `latest`/`history` hold one device. To serve several bins:
1. Make `latest` and `history` dicts keyed by `device_id`.
2. Have `/api/update` and `/api/heartbeat` write under the posted `device_id`.
3. In the voice handlers, filter by `bin_id` (and map spoken locations → ids via
   `sample-data/voice_intents.json → entities.location`).

The response shapes here don't change — `/api/voice/full` already returns a list, and `/status`
already carries `bin_id`.
