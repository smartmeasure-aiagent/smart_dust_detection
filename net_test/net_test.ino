/*
 * Smart Dustbin - NETWORK / SERVER-REACHABILITY DIAGNOSTIC
 * ------------------------------------------------------------
 * Finds out WHY the main firmware prints "Heartbeat -> -1".
 * No ultrasonic sensor involved. Separates the failure into layers:
 *
 *   1. Wi-Fi join        -> IP / gateway / subnet
 *   2. Raw TCP connect    to 192.168.1.59:5000  (WiFiClient)
 *        FAIL here  = network path blocked:
 *                     router AP/client isolation, wrong subnet,
 *                     server not running, or host firewall.
 *   3. Gateway TCP connect to <gateway>:80       (sanity: can it reach
 *        anything on the LAN at all?)
 *   4. HTTP POST /api/heartbeat  (only if TCP connected)
 *        prints the real HTTP status + HTTPClient error string.
 *
 * Read the SERVER_IP / SERVER_PORT below if your PC's IP changed.
 */
#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid        = "Excitel_SVR_4TH Floor_2.4g";
const char* password    = "9888534443";
const char* SERVER_IP   = "192.168.1.59";   // <-- must match the PC running app.py
const uint16_t SERVER_PORT = 5000;

void joinWiFi() {
  WiFi.persistent(false);
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  WiFi.begin(ssid, password);
  Serial.printf("Joining \"%s\" ", ssid);
  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries++ < 40) { delay(500); Serial.print("."); }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n  IP=%s  GW=%s  MASK=%s  RSSI=%d dBm\n",
                  WiFi.localIP().toString().c_str(),
                  WiFi.gatewayIP().toString().c_str(),
                  WiFi.subnetMask().toString().c_str(),
                  WiFi.RSSI());
  } else {
    Serial.println("\n  Wi-Fi FAILED to join.");
  }
}

// Try a raw TCP connection; return true/false and print timing.
bool tcpTest(const char* host, uint16_t port, const char* label) {
  WiFiClient c;
  c.setTimeout(4000);
  unsigned long t0 = millis();
  bool ok = c.connect(host, port, 4000);
  unsigned long dt = millis() - t0;
  Serial.printf("  [%s] TCP %s:%u -> %s (%lu ms)\n",
                label, host, port, ok ? "CONNECTED" : "FAILED", dt);
  if (ok) c.stop();
  return ok;
}

void httpTest() {
  HTTPClient http;
  String url = String("http://") + SERVER_IP + ":" + SERVER_PORT + "/api/heartbeat";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.setConnectTimeout(4000);
  http.setTimeout(5000);
  String body = "{\"device_id\":\"net-test\",\"sensor_ok\":true,\"sensor_failures\":0}";
  int code = http.POST(body);
  if (code > 0) Serial.printf("  [HTTP] POST %s -> %d  resp=%s\n", url.c_str(), code, http.getString().c_str());
  else          Serial.printf("  [HTTP] POST %s -> %d  (%s)\n", url.c_str(), code, http.errorToString(code).c_str());
  http.end();
}

void setup() {
  Serial.begin(115200);
  delay(400);
  Serial.println("\n=== Network / Server Reachability Diagnostic ===");
  Serial.printf("Target server: %s:%u\n", SERVER_IP, SERVER_PORT);
  joinWiFi();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) { Serial.println("Wi-Fi dropped, rejoining..."); joinWiFi(); delay(1000); return; }
  Serial.println("---- test cycle ----");
  bool serverTcp = tcpTest(SERVER_IP, SERVER_PORT, "server");
  tcpTest(WiFi.gatewayIP().toString().c_str(), 80, "gateway");   // can it reach the router at all?
  if (serverTcp) httpTest();
  else Serial.println("  -> server TCP unreachable: router client-isolation or host firewall is the likely cause.");
  delay(4000);
}
