# Voice Agent Integration Guide

**Who this is for:** an engineer connecting a voice-call agent service (Vapi, Retell, Bland,
Twilio, ElevenLabs, or a custom one) to the Smart Dustbin backend.

**TL;DR:** This backend is only a **data source**. Your voice service is a **separate system** that
makes the calls and talks to people; it fetches bin data from the HTTP endpoints here and speaks it.
You do not build any calling logic in this project — you just keep the server running and point your
voice service at its URLs.

---

## 1. How the two systems fit together

```
┌──────────────────────────┐      HTTPS request       ┌───────────────────────────┐
│  Voice agent service      │ ───────────────────────▶ │  Smart Dustbin backend     │
│  (separate / 3rd-party)   │   GET /api/voice/status   │  (this project, app.py)    │
│  • places & takes calls   │ ◀─────────────────────── │  • has live bin data       │
│  • speaks to the user     │       JSON response       │  • ESP32 reports into it   │
└──────────────────────────┘                           └───────────────────────────┘
          you configure this                                   you run this
```

- **Your backend** knows the fill level, status and device health. It exposes them over HTTP.
- **The voice service** calls those endpoints and reads the answer to the caller.
- Every voice endpoint returns a ready-to-speak **`speech`** string *and* the raw fields, so the voice
  service can either read `speech` verbatim or phrase the numbers itself.

---

## 2. Prerequisites

1. **Run the backend** and make sure the voice service can reach it over the network:
   ```bash
   cd smart-dustbin
   pip install -r requirements.txt
   python app.py            # serves on http://0.0.0.0:5000
   ```
2. **Base URL** the voice service will call:
   - Local test: `http://localhost:5000`
   - LAN: `http://<your-PC-IP>:5000`
   - Production: put it behind a public HTTPS URL (see §8).
3. **Set the API token** (optional but recommended for anything non-local). In `smart-dustbin/.env`:
   ```
   API_KEY=your-secret-token
   ```
   Leave it blank to keep the voice API open for local testing.

---

## 3. Authentication

Only the `/api/voice/*` endpoints are protected, and only when `API_KEY` is set. The voice service
must send the token on every voice request, as **either** header:

```
x-api-key: your-secret-token
Authorization: Bearer your-secret-token
```

- Wrong/missing key → `401`.
- The dashboard and device endpoints do **not** use this key.

---

## 4. The one endpoint you actually need

If you want the simplest possible integration, use just this:

**`GET /api/voice/status`** — returns everything about the bin.

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

Field meanings:

| field | meaning |
|---|---|
| `fill_percent` | 0–100 |
| `status` | `AVAILABLE` / `ALMOST FULL` / `FULL - COLLECT NOW` / `NO RECENT DATA` |
| `needs_collection` | `true` when the bin should be emptied now |
| `online` / `sensor_ok` | device reachable / ultrasonic sensor working |
| `seconds_since_update` | freshness of the reading |
| `speech` | a full sentence ready to read to the caller |

---

## 5. Full endpoint reference

All under the base URL. Voice endpoints need the API key header (§3).

| Method & path | Body | Returns |
|---|---|---|
| `GET /api/voice/status?bin_id=` | – | status payload above |
| `GET /api/voice/full` | – | `{count, bins:[…], speech}` — bins needing collection |
| `GET /api/voice/health` | – | `{online, sensor_ok, rssi, firmware, …, speech}` |
| `POST /api/voice/query` | `{"intent":"…","bin_id":"…"}` | `{intent, speech, data}` |
| `GET /api/voice/stream?interval=2` | – | **SSE** live feed (see §6) |

`POST /api/voice/query` intents: `check_bin_fill`, `list_full_bins`, `check_device_health`,
`fill_trend`, `collections_today`, `acknowledge_reset`.

Full field-by-field reference with more examples: [voice-agent-api.md](voice-agent-api.md).
Interactive, try-it-in-browser docs: **`http://<server-ip>:5000/docs`**.

---

## 6. Pick an integration pattern

### A. Inbound Q&A — "caller asks, agent answers"
Register **one tool** in your voice platform that calls `POST /api/voice/query` (or just
`GET /api/voice/status`). When the tool returns, have the agent speak `speech`.

### B. Outbound alert — "call me when the bin is full"
Your voice service (or a small trigger script) watches for the full condition, then starts a call:
- **Poll** `GET /api/voice/full` every 30–60 s; when `count > 0`, start a call using its `speech`.
- **Or stream** `GET /api/voice/stream` and start a call when an `alert` event arrives.

### C. Live feed — continuous data (recommended for always-on agents)
Open `GET /api/voice/stream?interval=2` once and react to events:
```
event: status  → every 2 s, full payload
event: alert   → once, the moment the bin needs collection
event: device  → when it goes offline / sensor faults
```
```python
import httpx, json
with httpx.stream("GET", "http://localhost:5000/api/voice/stream",
                  headers={"x-api-key": "your-secret-token"}) as r:
    for line in r.iter_lines():
        if line.startswith("data:"):
            evt = json.loads(line[5:])
            # feed evt["speech"] / evt["needs_collection"] into your agent
```

---

## 7. Wiring it into a voice platform (tool / function)

Most platforms let you register an HTTP "tool"/"function" the model can call. Example OpenAI-style
schema for a single tool that covers everything:

```json
{
  "name": "get_dustbin_info",
  "description": "Get live smart-dustbin fill level, which bins are full, device health, or fill trend; or acknowledge a collection.",
  "parameters": {
    "type": "object",
    "properties": {
      "intent": {
        "type": "string",
        "enum": ["check_bin_fill","list_full_bins","check_device_health","fill_trend","collections_today","acknowledge_reset"]
      },
      "bin_id": { "type": "string", "description": "e.g. BIN-A1 (optional)" }
    },
    "required": ["intent"]
  }
}
```

Map that tool to: `POST {BASE_URL}/api/voice/query` with the arguments as the JSON body and the
`x-api-key` header. Then instruct the agent: *"After calling the tool, read the `speech` field to the
caller."*

> Platform-specific field names differ (Vapi "server tool", Retell "custom function", Bland "webhook
> tool"), but all three take: a URL, an HTTP method, headers, and a JSON body — exactly the four
> things above.

---

## 8. Testing the integration

```bash
# health of the API itself
curl http://localhost:5000/api/voice/status -H "x-api-key: your-secret-token"

# simulate a full bin, then confirm the agent-facing answer flips
curl -X POST http://localhost:5000/api/update -H "Content-Type: application/json" \
     -d '{"distance":5,"fill":88,"device_id":"BIN-A1"}'
curl "http://localhost:5000/api/voice/full" -H "x-api-key: your-secret-token"
```

No hardware? Generate realistic data with the simulator while you wire up the voice side:
```bash
python simulator.py          # fills, alerts, collects, repeats
```

---

## 9. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `401` from `/api/voice/*` | Missing/wrong `x-api-key`. Confirm the token matches `.env`. |
| `status: "NO RECENT DATA"` | No reading in >60 s. Check the ESP32 / run `simulator.py`. |
| `online: false` | Device hasn't sent a heartbeat in >25 s. |
| Voice platform can't reach the URL | It's calling from the cloud but your server is on `localhost`. Expose it (ngrok / a public host) — see §8/§10. |
| CORS error in a browser test console | CORS is open (`*`); if blocked, you're likely hitting the wrong URL/port. |

---

## 10. Going to production

- **Expose the server over HTTPS** (reverse proxy / tunnel) so the cloud voice service can reach it.
  For a quick demo: `ngrok http 5000` gives you a public `https://…` base URL.
- **Always set `API_KEY`** once it's reachable from the internet.
- **Multiple bins:** the backend currently tracks one device; `bin_id` is accepted everywhere and
  `/api/voice/full` already returns a list, so the API shape won't change when you add a fleet. See
  the "Extending to a fleet" note in [voice-agent-api.md](voice-agent-api.md).

---

*You own the left box only at configuration time — there is nothing to build on the backend beyond
keeping it running and reachable.*
