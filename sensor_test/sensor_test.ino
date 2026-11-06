/*
 * Smart Dustbin - ULTRASONIC SENSOR DIAGNOSTIC v2 (no Wi-Fi)
 * ------------------------------------------------------------
 * Auto-probes BOTH possible pin orderings every cycle so we don't
 * have to guess whether TRIG/ECHO are swapped:
 *     Config A: TRIG=GPIO5  ECHO=GPIO18   (what the main firmware uses)
 *     Config B: TRIG=GPIO18 ECHO=GPIO5    (the swapped case)
 *
 * READING THE OUTPUT:
 *   "A: xxx us -> yy.y cm"  under A  -> wiring is CORRECT as-is (CONNECTED!)
 *   "B: xxx us -> yy.y cm"  under B  -> TRIG & ECHO are SWAPPED; fix main
 *                                       firmware pins or swap the 2 jumpers.
 *   both "NO ECHO" on every line     -> sensor isn't firing at all:
 *                                       check 5V on VCC (not 3V3), and GND,
 *                                       or the sensor is dead / wrong type.
 *
 * idleA / idleB = the ECHO pin level at rest for each config (expect 0).
 */

#define PIN_X 5
#define PIN_Y 18

const unsigned long ECHO_TIMEOUT_US = 30000;  // ~5 m
const float MIN_VALID_CM = 2.0;

unsigned long pingNum = 0;
unsigned long okA = 0, okB = 0, fail = 0;

// Fire one ping on (trig,echo); return echo pulse width in us (0 = none).
unsigned long probe(int trig, int echo) {
  pinMode(trig, OUTPUT);
  pinMode(echo, INPUT);
  digitalWrite(trig, LOW);
  delayMicroseconds(4);
  digitalWrite(trig, HIGH);
  delayMicroseconds(20);          // AJ-SR04M wants >=20us; fine for HC-SR04
  digitalWrite(trig, LOW);
  return pulseIn(echo, HIGH, ECHO_TIMEOUT_US);
}

void setup() {
  Serial.begin(115200);
  delay(300);
  pinMode(PIN_X, INPUT);
  pinMode(PIN_Y, INPUT);
  delay(20);
  Serial.println("\n=== Ultrasonic Sensor Diagnostic v2 (dual-probe) ===");
  Serial.printf("Config A: TRIG=GPIO%d ECHO=GPIO%d   Config B: TRIG=GPIO%d ECHO=GPIO%d\n",
                PIN_X, PIN_Y, PIN_Y, PIN_X);
  Serial.println("Expect one config to show cm readings; both NO ECHO = power/GND/sensor fault.");
  Serial.println("----------------------------------------------------");
}

void printResult(const char* tag, unsigned long us) {
  if (us == 0) { Serial.printf("%s: NO ECHO        ", tag); return; }
  float cm = us * 0.0343f / 2.0f;
  Serial.printf("%s: %5lu us %6.1f cm%s", tag, us, cm, cm < MIN_VALID_CM ? "*" : " ");
}

void loop() {
  pingNum++;

  int idleA = digitalRead(PIN_Y);              // ECHO for config A
  unsigned long a = probe(PIN_X, PIN_Y);
  if (a) okA++;
  delay(60);                                   // let echoes die out

  int idleB = digitalRead(PIN_X);              // ECHO for config B
  unsigned long b = probe(PIN_Y, PIN_X);
  if (b) okB++;

  if (!a && !b) fail++;

  Serial.printf("#%-3lu  idleA=%d ", pingNum, idleA);
  printResult("A", a);
  Serial.printf("  | idleB=%d ", idleB);
  printResult("B", b);
  Serial.printf("   [okA=%lu okB=%lu bothFail=%lu]\n", okA, okB, fail);

  delay(300);
}
