#!/usr/bin/env python3
"""
Smart Dustbin device simulator — generates realistic dummy data for testing the
whole application (dashboard + voice API) without the ESP32 hardware.

It behaves like the firmware: posts distance/fill readings to /api/update and a
heartbeat to /api/heartbeat, runs a natural fill-up -> FULL -> collect cycle, and
occasionally injects a sensor fault so you can see the fault states and alerts.

Usage:
    python simulator.py                      # defaults: localhost:5000, ~3s cadence
    python simulator.py --interval 1 --speed 5
    python simulator.py --server http://192.168.1.50:5000
    python simulator.py --fault-chance 0     # never inject a sensor fault
    python simulator.py --cycles 2           # run two fill/collect cycles then stop

Stdlib only — no pip install needed. Ctrl+C to stop.
"""
import argparse
import json
import random
import time
import urllib.error
import urllib.request


def post(url, payload, timeout=4):
    data = json.dumps(payload).encode()
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.status


def main():
    ap = argparse.ArgumentParser(description="Smart Dustbin device simulator")
    ap.add_argument("--server", default="http://localhost:5000", help="backend base URL")
    ap.add_argument("--interval", type=float, default=3.0, help="seconds between readings")
    ap.add_argument("--speed", type=float, default=0, help="avg %% fill added per reading (0 = random 2–6)")
    ap.add_argument("--bin-height", type=float, default=60.0, help="empty sensor-to-floor distance in cm")
    ap.add_argument("--device-id", default="BIN-SIM-01")
    ap.add_argument("--fw", default="1.4.2")
    ap.add_argument("--fault-chance", type=float, default=0.04, help="per-reading chance of a sensor fault (0–1)")
    ap.add_argument("--cycles", type=int, default=0, help="stop after N fill/collect cycles (0 = forever)")
    args = ap.parse_args()

    update_url = args.server.rstrip("/") + "/api/update"
    heartbeat_url = args.server.rstrip("/") + "/api/heartbeat"
    reset_url = args.server.rstrip("/") + "/api/reset"

    fill = 0.0
    rssi = -58
    uptime = 0
    boot = time.time()
    last_heartbeat = 0.0
    full_hold = 0            # readings held at FULL before "collection"
    fault_left = 0           # readings remaining in a simulated sensor fault
    cycles_done = 0

    print(f"Simulator -> {args.server}  (device {args.device_id})  Ctrl+C to stop")
    try:
        while True:
            now = time.time()
            uptime = int(now - boot)
            rssi = max(-85, min(-50, rssi + random.randint(-2, 2)))

            # occasionally start a sensor fault
            if fault_left == 0 and random.random() < args.fault_chance:
                fault_left = random.randint(2, 5)
                print("  ! injecting sensor fault")

            if fault_left > 0:
                # sensor not responding: heartbeat reports the fault, no reading sent
                fault_left -= 1
                post(heartbeat_url, {
                    "device_id": args.device_id, "ip": "192.168.1.77", "rssi": rssi,
                    "uptime_s": uptime, "fw": args.fw, "sensor_ok": False,
                    "sensor_failures": random.randint(3, 9), "echo_idle": 1,
                })
                print(f"  fault ({fault_left} left)  rssi={rssi}")
                time.sleep(args.interval)
                continue

            # normal fill progression with a little noise
            step = args.speed if args.speed > 0 else random.uniform(2, 6)
            fill = min(100.0, fill + step)
            fill_int = int(round(fill))
            distance = max(2.1, args.bin_height * (1 - fill / 100.0) + random.uniform(-0.6, 0.6))

            # heartbeat every ~10 s
            if now - last_heartbeat >= 10:
                post(heartbeat_url, {
                    "device_id": args.device_id, "ip": "192.168.1.77", "rssi": rssi,
                    "uptime_s": uptime, "fw": args.fw, "sensor_ok": True,
                    "sensor_failures": 0, "echo_idle": 0,
                })
                last_heartbeat = now

            try:
                post(update_url, {"distance": round(distance, 1), "fill": fill_int,
                                  "device_id": args.device_id, "rssi": rssi})
            except urllib.error.HTTPError as e:
                print(f"  update rejected ({e.code})")
            print(f"  fill={fill_int:3d}%  dist={distance:4.1f}cm  rssi={rssi}")

            # once full, hold briefly then "collect" (reset) and start over
            if fill_int >= 100:
                full_hold += 1
                if full_hold >= 3:
                    time.sleep(args.interval)
                    post(reset_url, {})
                    print("  >> collected — bin emptied, starting a new cycle")
                    fill = 0.0
                    full_hold = 0
                    cycles_done += 1
                    if args.cycles and cycles_done >= args.cycles:
                        print(f"Done: {cycles_done} cycle(s).")
                        return

            time.sleep(args.interval)
    except KeyboardInterrupt:
        print("\nStopped.")
    except urllib.error.URLError as e:
        print(f"\nCannot reach {args.server} — is the backend running? ({e})")


if __name__ == "__main__":
    main()
