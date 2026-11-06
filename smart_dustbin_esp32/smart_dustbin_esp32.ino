#include <WiFi.h>
#include <HTTPClient.h>
#include <math.h>
#include <esp_task_wdt.h>

const char* ssid = "Excitel_SVR_4TH Floor_2.4g";
const char* password = "9888534443";
const char* serverBase = "http://192.168.1.59:5000";  // PC running smart-dustbin/app.py
const char* DEVICE_ID = "bin-01";
const char* FW_VERSION = "1.2.1";

#define TRIG_PIN 5
#define ECHO_PIN 18
const float EMPTY_DISTANCE_CM = 40.0;  // calibrate: sensor to empty-bin bottom
const float FULL_DISTANCE_CM = 5.0;    // calibrate: sensor to waste at "full"
const int SAMPLES = 5;                 // median filter window
const float MIN_VALID_CM = 2.0;        // shorter echoes are TRIG crosstalk, not a reflection
const unsigned long READ_INTERVAL_MS = 3000;
const unsigned long HEARTBEAT_INTERVAL_MS = 10000;
const uint32_t LOOP_WATCHDOG_MS = 30000;          // reboot if loop() stalls this long
const unsigned long SERVER_LOST_RESTART_MS = 90000;  // reboot if the server is unreachable this long

unsigned long lastRead = 0, lastHeartbeat = 0;
bool sensorOk = false;
int sensorFailures = 0;
unsigned long lastServerOk = 0;

float measureDistance() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(20);  // AJ-SR04M needs a longer trigger than the HC-SR04's 10 us
  digitalWrite(TRIG_PIN, LOW);
  unsigned long duration = pulseIn(ECHO_PIN, HIGH, 30000);
  if (duration == 0) return -1;
  float cm = duration * 0.0343f / 2.0f;
  return cm < MIN_VALID_CM ? -1 : cm;
}

// Median of several pings; returns -1 if fewer than half the pings echoed.
float measureDistanceMedian() {
  float vals[SAMPLES];
  int n = 0;
  for (int i = 0; i < SAMPLES; i++) {
    float d = measureDistance();
    if (d > 0) vals[n++] = d;
    delay(60);  // let echoes die out between pings
  }
  if (n < (SAMPLES + 1) / 2) return -1;
  for (int i = 1; i < n; i++) {
    float key = vals[i];
    int j = i - 1;
    while (j >= 0 && vals[j] > key) { vals[j + 1] = vals[j]; j--; }
    vals[j + 1] = key;
  }
  return vals[n / 2];
}

int postJson(const char* path, const String& body) {
  HTTPClient http;
  http.begin(String(serverBase) + path);
  http.addHeader("Content-Type", "application/json");
  http.setConnectTimeout(4000);
  http.setTimeout(5000);
  int code = http.POST(body);
  http.end();
  if (code > 0) lastServerOk = millis();
  return code;
}

// Device health, sent even when the sensor fails so the dashboard can tell
// "ESP32 offline" apart from "sensor not responding".
void sendHeartbeat() {
  String body = String("{\"device_id\":\"") + DEVICE_ID +
                "\",\"ip\":\"" + WiFi.localIP().toString() +
                "\",\"rssi\":" + WiFi.RSSI() +
                ",\"uptime_s\":" + (millis() / 1000) +
                ",\"fw\":\"" + FW_VERSION +
                "\",\"sensor_ok\":" + (sensorOk ? "true" : "false") +
                ",\"sensor_failures\":" + sensorFailures +
                ",\"echo_idle\":" + digitalRead(ECHO_PIN) + "}";
  Serial.printf("Heartbeat -> %d\n", postJson("/api/heartbeat", body));
}

void sendReading(float distance) {
  int fill = constrain((int)roundf(
    100.0f * (EMPTY_DISTANCE_CM - distance) /
    (EMPTY_DISTANCE_CM - FULL_DISTANCE_CM)), 0, 100);
  String body = "{\"distance\":" + String(distance, 1) +
                ",\"fill\":" + String(fill) +
                ",\"device_id\":\"" + DEVICE_ID +
                "\",\"rssi\":" + WiFi.RSSI() + "}";
  int code = postJson("/api/update", body);
  Serial.printf("Distance: %.1f cm | Fill: %d%% | Server response: %d\n", distance, fill, code);
}

// Human-readable text for the common Wi-Fi disconnect reason codes.
const char* wifiReason(uint8_t r) {
  switch (r) {
    case 2:   return "AUTH_EXPIRE";
    case 4:   return "ASSOC_EXPIRE";
    case 15:  return "4WAY_HANDSHAKE_TIMEOUT (usually wrong password)";
    case 201: return "NO_AP_FOUND (SSID not seen - name/band/range)";
    case 202: return "AUTH_FAIL (wrong password or security mode)";
    case 203: return "ASSOC_FAIL";
    case 204: return "HANDSHAKE_TIMEOUT";
    case 205: return "CONNECTION_FAIL";
    default:  return "see esp_wifi_types.h";
  }
}

// Prints association / IP / disconnect-reason as they happen, so a failed
// join tells us WHY (wrong password vs SSID not found vs weak signal).
void onWiFiEvent(WiFiEvent_t event, WiFiEventInfo_t info) {
  switch (event) {
    case ARDUINO_EVENT_WIFI_STA_CONNECTED:
      Serial.println("Wi-Fi: associated with AP");
      break;
    case ARDUINO_EVENT_WIFI_STA_GOT_IP:
      Serial.printf("Wi-Fi: got IP %s  RSSI %d dBm\n",
                    WiFi.localIP().toString().c_str(), WiFi.RSSI());
      break;
    case ARDUINO_EVENT_WIFI_STA_DISCONNECTED:
      Serial.printf("Wi-Fi: disconnected, reason=%d (%s)\n",
                    info.wifi_sta_disconnected.reason,
                    wifiReason(info.wifi_sta_disconnected.reason));
      break;
    default: break;
  }
}

// Lists nearby networks and flags whether the target SSID is visible,
// with its signal and encryption type.
void scanNetworks() {
  Serial.println("Scanning for Wi-Fi networks...");
  int n = WiFi.scanNetworks();
  if (n <= 0) { Serial.println("  none found (radio/antenna/power issue?)"); return; }
  bool seen = false;
  for (int i = 0; i < n; i++) {
    bool isTarget = WiFi.SSID(i) == String(ssid);
    seen |= isTarget;
    Serial.printf("  %2d: %-28s RSSI %4d  ch %2d  enc %d %s\n",
                  i, WiFi.SSID(i).c_str(), WiFi.RSSI(i), WiFi.channel(i),
                  (int)WiFi.encryptionType(i), isTarget ? "<== TARGET" : "");
  }
  Serial.println(seen ? "Target SSID IS visible."
                      : "!!! Target SSID NOT found - check exact name, 2.4 GHz band, and range.");
  Serial.println("  (enc: 0 open  2 WPA  3 WPA2  4 WPA/WPA2  6 WPA3  7 WPA2/WPA3)");
  WiFi.scanDelete();
}

// Robust STA connect: clean state, power-save off (prevents weak-link
// dropouts), scan, then join with the reason printed on failure.
bool connectWiFi() {
  WiFi.persistent(false);
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  WiFi.setAutoReconnect(true);
  WiFi.disconnect(true, true);
  delay(200);
  scanNetworks();
  Serial.printf("Connecting to \"%s\" ...\n", ssid);
  WiFi.begin(ssid, password);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts++ < 40) {
    esp_task_wdt_reset();
    delay(500);
    Serial.print(".");
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\nWi-Fi connected. IP %s  RSSI %d dBm\n",
                  WiFi.localIP().toString().c_str(), WiFi.RSSI());
    return true;
  }
  Serial.println("\nWi-Fi failed (see reason code above)");
  return false;
}

void setup() {
  Serial.begin(115200);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  digitalWrite(TRIG_PIN, LOW);
  esp_task_wdt_config_t wdt = {.timeout_ms = LOOP_WATCHDOG_MS, .idle_core_mask = 0, .trigger_panic = true};
  if (esp_task_wdt_reconfigure(&wdt) != ESP_OK) esp_task_wdt_init(&wdt);
  esp_task_wdt_add(NULL);  // watch the loop task
  Serial.printf("\nSmart Dustbin %s fw %s | ECHO idle level: %d (expect 0)\n",
                DEVICE_ID, FW_VERSION, digitalRead(ECHO_PIN));
  WiFi.onEvent(onWiFiEvent);
  connectWiFi();
}

void loop() {
  esp_task_wdt_reset();
  // Self-recovery: if nothing has reached the server for too long, start fresh.
  if (millis() - lastServerOk > SERVER_LOST_RESTART_MS) {
    Serial.println("Server unreachable for 90 s - restarting");
    delay(100);
    ESP.restart();
  }
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Wi-Fi disconnected. Reconnecting...");
    WiFi.reconnect();
    delay(5000);
    return;
  }
  unsigned long now = millis();
  if (now - lastRead >= READ_INTERVAL_MS) {
    lastRead = now;
    float distance = measureDistanceMedian();
    bool wasOk = sensorOk;
    if (distance < 0) {
      sensorOk = false;
      sensorFailures++;
      Serial.printf("Sensor timeout (%d in a row)\n", sensorFailures);
    } else {
      sensorOk = true;
      sensorFailures = 0;
      sendReading(distance);
    }
    if (sensorOk != wasOk) lastHeartbeat = 0;  // report health changes immediately
  }
  if (lastHeartbeat == 0 || now - lastHeartbeat >= HEARTBEAT_INTERVAL_MS) {
    lastHeartbeat = now ? now : 1;
    sendHeartbeat();
  }
  delay(50);
}
