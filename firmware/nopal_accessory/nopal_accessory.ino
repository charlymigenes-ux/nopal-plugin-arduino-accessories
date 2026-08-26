
#include <Arduino.h>
#include "secrets.h"

#if defined(ESP32)
  #include <WiFi.h>
  #include <WiFiClient.h>
  #include <WebServer.h>
  #include <ESPmDNS.h>
  #include <esp_arduino_version.h>
  #include <esp_system.h>

  #include <NimBLEDevice.h>
  #include <NimBLEUtils.h>
#elif defined(ESP8266)
  #include <ESP8266WiFi.h>
  #include <WiFiClient.h>
  #include <ESP8266WebServer.h>
  #include <ESP8266mDNS.h>
#else
  #error "Este firmware solamente es compatible con ESP32 o ESP8266."
#endif

#include <ElegantOTA.h>

#include <Adafruit_NeoPixel.h>

struct BuzzerStep {
  bool on;
  uint16_t durationMs;
};

enum class BuzzerPattern : uint8_t {
  OFF,
  CONTINUOUS,
  BEEP,
  DOUBLE_BEEP,
  READY,
  WORKING,
  WAITING,
  ALARM,
  MAINTENANCE,
  DISCONNECTED
};

struct DhtReading {
  bool valid;
  float humidityPct;
  float temperatureC;
};

// ============================================================================
// PROTOTIPOS EXPLÍCITOS
// ============================================================================
//
// Arduino auto-genera prototipos para las funciones de nivel superior del
// .ino, pero ese mecanismo (basado en ctags) resultó frágil en este
// archivo: en compilaciones sucesivas dejó de encontrar funciones
// distintas cada vez (jsonEscape, handleBuzzerCommand, handleRelayCommand,
// wifiCredentialsConfigured...) sin que cambiara nada relevante en el
// código. En vez de perseguir el síntoma función por función, se declaran
// acá todas explícitamente, de una sola vez.
bool ws2812StripEnabled(uint8_t stripIndex);
uint8_t ws2812StripPin(uint8_t stripIndex);
bool bleScreenConfigured();
bool bleScreenIsConnected();
bool connectBleScreen();
void maintainBleScreen();
bool bleScreenWriteWindow(const uint8_t* data, size_t length, String& response);
int hexNibble(char digit);
bool hexToBytes(const String& hex, uint8_t* out, size_t maxLength, size_t& outLength);
bool dhtReadRaw(uint8_t data[5]);
void dhtForceRead();
void handleDhtCommand(String& response);
uint8_t clampColor(int value);
bool validRelayIndex(int index);
uint32_t maxU32(uint32_t first, uint32_t second);
void setStatusLed(bool on);
void serviceStatusLed();
String chipModelText();
void printChipIdentification();
String resetReasonText();
String chipSuffix();
bool wifiCredentialsConfigured();
String activeIpAddress();
String wifiModeText();
String jsonEscape(const String& input);
void setRelay(uint8_t index, bool on);
bool getRelay(uint8_t index);
void setupPwmLed();
void setPwmLedColor(uint8_t red, uint8_t green, uint8_t blue);
void setWs2812ColorAt(uint8_t stripIndex, uint8_t red, uint8_t green, uint8_t blue);
void setWs2812Color(uint8_t red, uint8_t green, uint8_t blue);
void setWs2812Color2(uint8_t red, uint8_t green, uint8_t blue);
void setWs2812Color3(uint8_t red, uint8_t green, uint8_t blue);
void playStartupAnimation();
void setBuzzerOutput(bool on);
void initializeBuzzerSafely();
String buzzerPatternName(BuzzerPattern pattern);
void stopBuzzer();
bool startBuzzerFromText(String patternText);
void serviceBuzzer();
void setWifiHostname();
void startRecoveryAccessPoint();
void startMdnsIfPossible();
void setupWifi();
void maintainWifiConnection();
String buildStatusJson();
bool checkApiAuth();
void setupWebServer();
void serviceNetwork();
void sendIdentification();
void sendNetworkIdentification();
bool handleRelayCommand(const String& command, String& response);
bool handleBuzzerCommand(const String& command, String& response);
void handleCommand(String line);

#define FW_VERSION "4.5.0-ff"
#define NOPAL_PROTOCOL 4

#ifndef NOPAL_RELAY_ACTIVE_LOW
  #define NOPAL_RELAY_ACTIVE_LOW 1
#endif

const bool RELAY_ACTIVE_LOW = NOPAL_RELAY_ACTIVE_LOW != 0;

const uint32_t WIFI_CONNECT_TIMEOUT_MS = 15000;
const uint32_t WIFI_RECONNECT_INTERVAL_MS = 15000;

const uint16_t HTTP_PORT = 80;

#if defined(ESP32)

#define RELAY_COUNT 4

const uint8_t RELAY_PINS[RELAY_COUNT] = {
  16,
  17,
  18,
  19
};

#define PWM_LED_ENABLE true

#define PWM_LED_PIN_R 25
#define PWM_LED_PIN_G 26
#define PWM_LED_PIN_B 27

#define WS2812_ENABLE true
#define WS2812_PIN 23
#define WS2812_COUNT 16

#define WS2812_2_ENABLE true
#define WS2812_2_PIN 21
#define WS2812_2_COUNT 1

#define WS2812_3_ENABLE false
#define WS2812_3_PIN 22
#define WS2812_3_COUNT 8

#define STATUS_LED_ENABLE true
#define STATUS_LED_PIN 2
#define STATUS_LED_ACTIVE_LOW false

#define BUZZER_ENABLE true
#define BUZZER_PIN 14

#define DHT_ENABLE true
#define DHT_PIN 32

#elif defined(ESP8266)

#define RELAY_COUNT 4

const uint8_t RELAY_PINS[RELAY_COUNT] = {
  5,
  4,
  14,
  12
};

#define PWM_LED_ENABLE false

#define PWM_LED_PIN_R 13
#define PWM_LED_PIN_G 15

#define PWM_LED_PIN_B 0

#define WS2812_ENABLE true
#define WS2812_PIN 2
#define WS2812_COUNT 8

#define WS2812_2_ENABLE false
#define WS2812_2_PIN 2
#define WS2812_2_COUNT 8

#define WS2812_3_ENABLE false
#define WS2812_3_PIN 2
#define WS2812_3_COUNT 8

#define STATUS_LED_ENABLE false

// Algunas placas ESP8266 de esta familia sí traen buzzer en D0/GPIO16 y
// otras no; a diferencia del resto de este bloque (fijo por tipo de
// placa), esto se decide por unidad física via secrets.h.
#ifndef NOPAL_BUZZER_HW_PRESENT
  #define NOPAL_BUZZER_HW_PRESENT false
#endif
#define BUZZER_ENABLE NOPAL_BUZZER_HW_PRESENT
#define BUZZER_PIN 16

#define DHT_ENABLE false
#define DHT_PIN 0

#endif

#ifndef NOPAL_RELAY1_NAME
  #define NOPAL_RELAY1_NAME "Relé 1"
#endif

#ifndef NOPAL_RELAY2_NAME
  #define NOPAL_RELAY2_NAME "Relé 2"
#endif

#ifndef NOPAL_RELAY3_NAME
  #define NOPAL_RELAY3_NAME "Relé 3"
#endif

#ifndef NOPAL_RELAY4_NAME
  #define NOPAL_RELAY4_NAME "Relé 4"
#endif

const char* const RELAY_NAMES[RELAY_COUNT] = {
  NOPAL_RELAY1_NAME,
  NOPAL_RELAY2_NAME,
  NOPAL_RELAY3_NAME,
  NOPAL_RELAY4_NAME
};

#ifndef NOPAL_BLE_SCREEN_MAC
  #define NOPAL_BLE_SCREEN_MAC ""
#endif

#ifndef NOPAL_BUZZER_ACTIVE_HIGH
  #define NOPAL_BUZZER_ACTIVE_HIGH 0
#endif

#ifndef NOPAL_BUZZER_PASSIVE
  #define NOPAL_BUZZER_PASSIVE 1
#endif

#ifndef NOPAL_BUZZER_TONE_HZ
  #define NOPAL_BUZZER_TONE_HZ 2700
#endif

#ifndef NOPAL_BUZZER_SCENE_SOUNDS
  #define NOPAL_BUZZER_SCENE_SOUNDS 1
#endif

const bool BUZZER_ACTIVE_HIGH = NOPAL_BUZZER_ACTIVE_HIGH != 0;
const bool BUZZER_PASSIVE = NOPAL_BUZZER_PASSIVE != 0;
const uint16_t BUZZER_TONE_HZ = NOPAL_BUZZER_TONE_HZ;

#if defined(ESP32)

  const uint8_t PWM_CHANNEL_BUZZER = 3;
#endif

#if WS2812_ENABLE

Adafruit_NeoPixel strip(WS2812_COUNT, WS2812_PIN, NEO_GRB + NEO_KHZ800);
Adafruit_NeoPixel strip2(WS2812_2_COUNT, WS2812_2_PIN, NEO_GRB + NEO_KHZ800);
Adafruit_NeoPixel strip3(WS2812_3_COUNT, WS2812_3_PIN, NEO_GRB + NEO_KHZ800);

bool ws2812StripEnabled(uint8_t stripIndex) {
  switch (stripIndex) {
    case 0: return true;
    case 1: return WS2812_2_ENABLE;
    case 2: return WS2812_3_ENABLE;
    default: return false;
  }
}

uint16_t ws2812StripCount(uint8_t stripIndex) {
  switch (stripIndex) {
    case 0: return WS2812_COUNT;
    case 1: return WS2812_2_COUNT;
    case 2: return WS2812_3_COUNT;
    default: return 0;
  }
}

uint8_t ws2812StripPin(uint8_t stripIndex) {
  switch (stripIndex) {
    case 0: return WS2812_PIN;
    case 1: return WS2812_2_PIN;
    case 2: return WS2812_3_PIN;
    default: return 0;
  }
}

Adafruit_NeoPixel* ws2812StripObject(uint8_t stripIndex) {
  switch (stripIndex) {
    case 0: return &strip;
    case 1: return &strip2;
    case 2: return &strip3;
    default: return nullptr;
  }
}

#endif

#if defined(ESP32)

static NimBLEUUID BLE_SCREEN_WRITE_UUID("0000fa02-0000-1000-8000-00805f9b34fb");
static NimBLEUUID BLE_SCREEN_NOTIFY_UUID("0000fa03-0000-1000-8000-00805f9b34fb");

const size_t BLE_SCREEN_CHUNK_SIZE = 180;

const uint32_t BLE_SCREEN_RECONNECT_INTERVAL_MS = 20000;
const uint32_t BLE_SCREEN_ACK_TIMEOUT_MS = 8000;

const size_t BLE_SCREEN_MAX_WINDOW_BYTES = 8192;

NimBLEClient* bleScreenClient = nullptr;
NimBLERemoteCharacteristic* bleScreenWriteChar = nullptr;
NimBLERemoteCharacteristic* bleScreenNotifyChar = nullptr;

volatile bool bleScreenAckReceived = false;
uint32_t bleScreenLastAttemptMs = 0;

bool bleScreenConfigured() {
  return strlen(NOPAL_BLE_SCREEN_MAC) > 0;
}

bool bleScreenIsConnected() {
  return bleScreenClient != nullptr && bleScreenClient->isConnected();
}

void bleScreenNotifyCallback(
  NimBLERemoteCharacteristic* characteristic,
  uint8_t* data,
  size_t length,
  bool isNotify
) {
  if (length != 5 || data[0] != 0x05) {
    return;
  }

  if (data[4] == 0 || data[4] == 1 || data[4] == 3) {
    bleScreenAckReceived = true;
  }
}

bool connectBleScreen() {
  if (!bleScreenConfigured()) {
    return false;
  }

  if (bleScreenClient == nullptr) {
    bleScreenClient = NimBLEDevice::createClient();

    bleScreenClient->setConnectTimeout(5000);
  }

  if (bleScreenClient->isConnected()) {
    return true;
  }

  bleScreenWriteChar = nullptr;
  bleScreenNotifyChar = nullptr;

  NimBLEAddress address(std::string(NOPAL_BLE_SCREEN_MAC), BLE_ADDR_PUBLIC);

  if (!bleScreenClient->connect(address)) {

    Serial.print("NOPAL:BLE_CONNECT_FAILED,code=");
    Serial.print(bleScreenClient->getLastError());
    Serial.print(",reason=");
    Serial.println(NimBLEUtils::returnCodeToString(bleScreenClient->getLastError()));
    return false;
  }

  const std::vector<NimBLERemoteService*>& services = bleScreenClient->getServices(true);

  for (NimBLERemoteService* service : services) {
    if (bleScreenWriteChar == nullptr) {
      NimBLERemoteCharacteristic* candidate = service->getCharacteristic(BLE_SCREEN_WRITE_UUID);

      if (candidate != nullptr) {
        bleScreenWriteChar = candidate;
      }
    }

    if (bleScreenNotifyChar == nullptr) {
      NimBLERemoteCharacteristic* candidate = service->getCharacteristic(BLE_SCREEN_NOTIFY_UUID);

      if (candidate != nullptr) {
        bleScreenNotifyChar = candidate;
      }
    }
  }

  if (bleScreenWriteChar == nullptr || bleScreenNotifyChar == nullptr) {

    Serial.println("NOPAL:BLE_CHARACTERISTICS_NOT_FOUND,dumping_gatt_table:");
    for (NimBLERemoteService* service : services) {
      Serial.print("  service ");
      Serial.println(service->toString().c_str());
      for (NimBLERemoteCharacteristic* characteristic : service->getCharacteristics(false)) {
        Serial.print("    char ");
        Serial.println(characteristic->toString().c_str());
      }
    }
    bleScreenClient->disconnect();
    return false;
  }

  if (bleScreenNotifyChar->canNotify()) {
    bleScreenNotifyChar->subscribe(true, bleScreenNotifyCallback);
  }

  return true;
}

void maintainBleScreen() {
  if (!bleScreenConfigured() || bleScreenIsConnected()) {
    return;
  }

  const uint32_t now = millis();

  if (now - bleScreenLastAttemptMs < BLE_SCREEN_RECONNECT_INTERVAL_MS) {
    return;
  }

  bleScreenLastAttemptMs = now;
  connectBleScreen();
}

bool bleScreenWriteWindow(const uint8_t* data, size_t length, String& response) {
  if (!bleScreenIsConnected() || bleScreenWriteChar == nullptr) {
    response = "ERR:BLE_NOT_CONNECTED";
    return false;
  }

  bleScreenAckReceived = false;

  size_t offset = 0;

  while (offset < length) {
    const size_t chunkLength = min(BLE_SCREEN_CHUNK_SIZE, length - offset);

    bleScreenWriteChar->writeValue(data + offset, chunkLength, true);

    offset += chunkLength;
  }

  const uint32_t startedAt = millis();

  while (!bleScreenAckReceived && (millis() - startedAt) < BLE_SCREEN_ACK_TIMEOUT_MS) {
    delay(10);
  }

  if (!bleScreenAckReceived) {
    response = "ERR:BLE_NO_ACK";
    return false;
  }

  response = "OK";
  return true;
}

int hexNibble(char digit) {
  if (digit >= '0' && digit <= '9') {
    return digit - '0';
  }

  if (digit >= 'a' && digit <= 'f') {
    return digit - 'a' + 10;
  }

  if (digit >= 'A' && digit <= 'F') {
    return digit - 'A' + 10;
  }

  return -1;
}

bool hexToBytes(const String& hex, uint8_t* out, size_t maxLength, size_t& outLength) {
  const size_t hexLength = hex.length();

  if (hexLength == 0 || hexLength % 2 != 0 || (hexLength / 2) > maxLength) {
    return false;
  }

  for (size_t i = 0; i < hexLength; i += 2) {
    const int highValue = hexNibble(hex.charAt(i));
    const int lowValue = hexNibble(hex.charAt(i + 1));

    if (highValue < 0 || lowValue < 0) {
      return false;
    }

    out[i / 2] = static_cast<uint8_t>((highValue << 4) | lowValue);
  }

  outLength = hexLength / 2;
  return true;
}

#endif

#if DHT_ENABLE

DhtReading dhtLastReading = {false, 0.0f, 0.0f};
uint32_t dhtLastReadAtMs = 0;

const uint32_t DHT_MIN_INTERVAL_MS = 2000;

const uint32_t DHT_BIT_THRESHOLD_US = 40;

int32_t dhtWaitForLevel(uint8_t level, uint32_t timeoutUs) {
  const uint32_t startedAt = micros();

  while (digitalRead(DHT_PIN) != level) {
    if (micros() - startedAt > timeoutUs) {
      return -1;
    }
  }

  return static_cast<int32_t>(micros() - startedAt);
}

bool dhtReadRaw(uint8_t data[5]) {
  for (uint8_t index = 0; index < 5; index++) {
    data[index] = 0;
  }

  pinMode(DHT_PIN, OUTPUT);
  digitalWrite(DHT_PIN, LOW);
  delay(18);
  digitalWrite(DHT_PIN, HIGH);
  delayMicroseconds(30);
  pinMode(DHT_PIN, INPUT_PULLUP);

  if (dhtWaitForLevel(LOW, 100) < 0) return false;
  if (dhtWaitForLevel(HIGH, 100) < 0) return false;
  if (dhtWaitForLevel(LOW, 100) < 0) return false;

  for (uint8_t bitIndex = 0; bitIndex < 40; bitIndex++) {
    if (dhtWaitForLevel(HIGH, 100) < 0) return false;

    const int32_t highDurationUs = dhtWaitForLevel(LOW, 100);
    if (highDurationUs < 0) return false;

    data[bitIndex / 8] <<= 1;

    if (static_cast<uint32_t>(highDurationUs) > DHT_BIT_THRESHOLD_US) {
      data[bitIndex / 8] |= 1;
    }
  }

  const uint8_t checksum = data[0] + data[1] + data[2] + data[3];
  return checksum == data[4];
}

void dhtForceRead() {
  uint8_t data[5];
  dhtLastReadAtMs = millis();

  if (!dhtReadRaw(data)) {
    dhtLastReading.valid = false;
    return;
  }

  dhtLastReading.valid = true;
  dhtLastReading.humidityPct = data[0] + (data[1] / 10.0f);
  dhtLastReading.temperatureC = data[2] + (data[3] / 10.0f);
}

DhtReading dhtRead() {
  if (millis() - dhtLastReadAtMs >= DHT_MIN_INTERVAL_MS) {
    dhtForceRead();
  }

  return dhtLastReading;
}

void handleDhtCommand(String& response) {
  const DhtReading reading = dhtRead();

  if (!reading.valid) {
    response = "DHT,valid=0";
    return;
  }

  response =
    String("DHT,valid=1,t_c=") + String(reading.temperatureC, 1) +
    ",h_pct=" + String(reading.humidityPct, 1);
}

#endif

const char INDEX_HTML[] PROGMEM = R"NOPALHTML(
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>NOPAL · Accesorio + Buzzer</title>
<style>
:root{
  color-scheme:dark;
  --bg:#0f1517;
  --panel:#161f22;
  --panel2:#1b262a;
  --line:#2a3a3d;
  --text:#eef7f2;
  --muted:#8fa39d;
  --green:#54e0a0;
  --amber:#ffb84d;
  --red:#ff6b6b;
  --cyan:#5ad0e8;
  --violet:#b98bff;
  --pink:#ff8ecb;
}
*{box-sizing:border-box}
html,body{height:100%}
body{
  margin:0;
  background:
    radial-gradient(circle at 12% -10%,rgba(84,224,160,.13),transparent 38%),
    radial-gradient(circle at 100% 0%,rgba(185,139,255,.09),transparent 35%),
    linear-gradient(180deg,#0f1517,#0a0f10);
  color:var(--text);
  font:14px/1.4 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
}
main{max-width:1180px;margin:auto;padding:14px 16px 8px}
header{display:flex;justify-content:space-between;align-items:center;gap:14px;margin-bottom:12px}
.brand{display:flex;align-items:center;gap:11px}
.logo{
  width:36px;height:36px;border-radius:11px;display:grid;place-items:center;
  background:linear-gradient(145deg,#276340,#173326);
  border:1px solid #4d8b63;font-size:19px
}
h1{font-size:16px;margin:0}.sub{color:var(--muted);font-size:11.5px}
a{color:var(--green);text-decoration:none}
a:hover{text-decoration:underline}
.button{
  border:1px solid #3a5155;background:#20302f;color:var(--text);
  padding:7px 12px;border-radius:9px;font-size:12.5px;font-weight:650
}
.button:hover{border-color:#6a8a8f}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(225px,1fr));gap:9px;align-items:start}
.card{
  min-width:0;
  background:linear-gradient(150deg,var(--panel),var(--panel2));
  border:1px solid var(--line);border-left:3px solid var(--accent,var(--green));
  border-radius:13px;padding:11px 13px;
  box-shadow:0 8px 20px rgba(0,0,0,.18)
}
.card.full{grid-column:1/-1}
#cardRelays{--accent:var(--green)}
#cardScenes{--accent:var(--pink)}
#cardWs{--accent:var(--violet)}
#cardPwm{--accent:var(--violet)}
#cardBuzzer{--accent:var(--amber)}
#cardEnv{--accent:var(--cyan)}
#cardCluster{--accent:#7fd9ff}
#cardState{--accent:var(--muted)}
h2{
  font-size:11.5px;text-transform:uppercase;letter-spacing:.06em;color:#c9dcd6;
  margin:0 0 9px;display:flex;align-items:center;gap:6px
}
h2 .ic{font-size:14px}
/* minmax(0,1fr) y no 1fr: una pista "1fr" equivale a minmax(auto,1fr) y
   por lo tanto NO puede achicarse por debajo del ancho mínimo de su
   contenido. Con nombres de relé largos ("Extractor", "Lampara 1") el
   nombre + la insignia + el botón no entraban y la ficha se desbordaba
   fuera de la tarjeta, dejando el botón "Cambiar" cortado a la mitad. */
.relays{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
.relay{
  display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;
  padding:8px 10px;border-radius:10px;background:#101a1c;border:1px solid #263639
}
/* El bloque del nombre sí se achica (min-width:0 vence al mínimo
   automático de un ítem flex); la insignia y el botón no, porque un
   "Cambiar" recortado no se puede ni leer ni tocar. Si no queda espacio,
   flex-wrap los baja a un segundo renglón en vez de desbordar. */
.relay>div:first-child{min-width:0;flex:1 1 auto}
.relay .row{flex:0 0 auto}
.relay b{font-size:13px;overflow-wrap:anywhere}.relay .sub{font-size:10px}
.badge{font-size:10.5px;padding:3px 8px;border-radius:999px;background:#22302f;color:var(--muted)}
.badge.on{background:rgba(84,224,160,.16);color:var(--green)}
button,.button{
  border:1px solid #3a5155;background:#202f31;color:var(--text);
  padding:7px 10px;border-radius:9px;cursor:pointer;font-weight:650;font-size:12.5px
}
button:hover{border-color:#6a8a8f}
button.green{background:#1d5636;border-color:#39875a}
button.red{background:#63272a;border-color:#a64444}
button.amber{background:#63481e;border-color:#9b7132}
.row{display:flex;flex-wrap:wrap;gap:7px;align-items:center}
.scenes{display:grid;grid-template-columns:repeat(auto-fit,minmax(66px,1fr));gap:6px}
input[type=color]{width:42px;height:32px;padding:2px;background:#101719;border:1px solid #3a5155;border-radius:8px}
input[type=number]{width:56px}
input[type=number],input[type=range]{
  background:#101719;color:var(--text);border:1px solid #3a5155;
  border-radius:8px;padding:6px
}
.statgrid{display:grid;grid-template-columns:repeat(2,1fr);gap:7px}
.stat{padding:8px 9px;border-radius:10px;background:#101a1c;border:1px solid #263639}
.stat b{display:block;font-size:15px}.stat span{font-size:10px;color:var(--muted);text-transform:uppercase}
.gauge{height:7px;border-radius:999px;background:#101a1c;border:1px solid #263639;overflow:hidden;margin-top:5px}
.gauge-fill{height:100%;border-radius:999px;background:var(--green);transition:width .5s ease,background .5s ease}
.envsplit{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.envsplit>div{min-width:0}
.envlabel{font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px}
.linklist{display:flex;flex-direction:column;gap:5px;margin-top:2px}
.linklist a{
  display:flex;align-items:center;gap:6px;font-size:12px;padding:6px 8px;
  border-radius:8px;background:#101a1c;border:1px solid #263639
}
.linklist a:hover{border-color:#4d8b63}
details summary{cursor:pointer;font-size:11.5px;color:var(--muted);list-style:none;user-select:none}
details summary::-webkit-details-marker{display:none}
details summary:before{content:'▸ ';color:var(--green)}
details[open] summary:before{content:'▾ '}
pre{
  white-space:pre-wrap;word-break:break-word;background:#0b1113;
  padding:9px;border-radius:9px;border:1px solid #223133;color:#a9d1bd;
  font-size:11px;margin:8px 0 0
}
footer{margin:10px 2px 2px;color:var(--muted);font-size:10px;text-align:center}
@media(max-width:640px){
  .scenes{grid-template-columns:repeat(2,1fr)}
  .envsplit{grid-template-columns:1fr}
}
</style>
</head>
<body>
<main>
<header>
  <div class="brand">
    <div class="logo">🌵</div>
    <div><h1>NOPAL</h1><div class="sub" id="identity">Cargando estado…</div></div>
  </div>
  <a class="button" href="/update">⇪ Firmware</a>
</header>

<section class="grid">
  <article class="card" id="cardRelays">
    <h2><span class="ic">⚡</span>Relés</h2>
    <div class="relays" id="relays"></div>
  </article>

  <article class="card" id="cardScenes">
    <h2><span class="ic">🎬</span>Escenas rápidas</h2>
    <div class="scenes">
      <button class="green" onclick="scene('READY')">Listo</button>
      <button onclick="scene('WORKING')">Trabajando</button>
      <button class="amber" onclick="scene('WAITING')">En espera</button>
      <button class="red" onclick="scene('ALARM')">Alarma</button>
      <button onclick="scene('MAINTENANCE')">Mantenim.</button>
      <button onclick="scene('DISCONNECTED')">Desconect.</button>
      <button onclick="scene('OFF')">Apagar</button>
    </div>
  </article>

  <article class="card" id="cardWs">
    <h2><span class="ic">🌈</span>NeoPixel</h2>
    <div class="row">
      <label id="wsStripLabel" style="display:none">Tira</label>
      <select id="wsStrip" style="display:none" onchange="onWsStripChange()"></select>
      <input id="wsColor" type="color" value="#41d17d">
      <button onclick="sendWsColor()">Color</button>
      <button class="red" onclick="sendWsOff()">Apagar</button>
    </div>
    <p class="sub" id="wsInfo">—</p>
    <details id="cardWsPixel">
      <summary>Pixel individual</summary>
      <div class="row" style="margin-top:8px">
        <label>LED</label>
        <input id="pixel" type="number" min="1" value="1">
        <label>Cant.</label>
        <input id="pixelCount" type="number" min="1" value="1">
        <input id="pixelColor" type="color" value="#ff8c32">
        <button onclick="sendPixel()">Aplicar</button>
      </div>
    </details>
  </article>

  <article class="card" id="cardPwm">
    <h2><span class="ic">🎨</span>RGB analógico</h2>
    <div class="row">
      <input id="pwmColor" type="color" value="#41d17d">
      <button onclick="sendPwmColor()">Color</button>
      <button class="red" onclick="sendPwmOff()">Apagar</button>
    </div>
  </article>

  <article class="card" id="cardBuzzer">
    <h2><span class="ic">🔔</span>Buzzer</h2>
    <div class="row">
      <button onclick="buzzer('BEEP')">Beep</button>
      <button onclick="buzzer('DOUBLE')">Doble</button>
      <button class="green" onclick="buzzer('READY')">Listo</button>
      <button class="amber" onclick="buzzer('WAITING')">Espera</button>
      <button class="red" onclick="buzzer('ALARM')">Alarma</button>
      <button onclick="buzzer('OFF')">Silenciar</button>
    </div>
    <p class="sub" id="buzzerInfo">—</p>
  </article>

  <article class="card" id="cardEnv" style="display:none">
    <h2><span class="ic">🌡️</span>Ambiente y energía</h2>
    <div class="envsplit">
      <div id="envDhtBlock" style="display:none">
        <div class="envlabel">Ambiente</div>
        <div class="statgrid">
          <div class="stat"><b id="dhtTemp">—</b><span>Temp.</span></div>
          <div class="stat"><b id="dhtHum">—</b><span>Humedad</span></div>
        </div>
      </div>
      <div id="envPowerBlock" style="display:none">
        <div class="envlabel">Batería</div>
        <div class="statgrid">
          <div class="stat"><b id="powerVoltage">—</b><span>Voltaje</span></div>
          <div class="stat"><b id="powerSoc">—</b><span>Carga</span></div>
        </div>
        <div class="gauge"><div class="gauge-fill" id="powerGauge" style="width:0%"></div></div>
      </div>
    </div>
  </article>

  <article class="card" id="cardCluster" style="display:none">
    <h2><span class="ic">🔗</span>Clúster NOPAL</h2>
    <div class="statgrid">
      <div class="stat"><b id="clusterRole">—</b><span>Rol</span></div>
      <div class="stat"><b id="clusterPeers">—</b><span>Nodos</span></div>
    </div>
    <div class="linklist" id="clusterLinks"></div>
  </article>

  <article class="card full" id="cardState">
    <h2><span class="ic">📟</span>Estado del dispositivo</h2>
    <div class="statgrid">
      <div class="stat"><b id="wifi">—</b><span>Wi-Fi</span></div>
      <div class="stat"><b id="ip">—</b><span>Dirección IP</span></div>
      <div class="stat"><b id="scene">—</b><span>Escena</span></div>
      <div class="stat"><b id="relaysOn">—</b><span>Relés activos</span></div>
    </div>
    <details>
      <summary>Detalles técnicos</summary>
      <pre id="details">Esperando datos…</pre>
    </details>
  </article>
</section>

<footer>NOPAL Firmware · Accesorio genérico ESP32 / ESP8266 con buzzer · Protocolo 4</footer>
</main>
<script>
const enc=o=>new URLSearchParams(o);
let lastScene='—';
let buzzerSceneSounds=false;
let lastStatus=null;

async function post(path,data){
  const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:enc(data)});
  const t=await r.text();
  if(!r.ok) throw new Error(t);
  setTimeout(refresh,150);
  return t;
}
function rgb(hex){return [parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16)]}

async function relay(n,on){try{await post('/api/relay',{n,on})}catch(e){alert(e.message)}}

function currentWsStrip(){
  const sel=document.getElementById('wsStrip');
  return sel&&sel.value?parseInt(sel.value,10):0;
}
async function sendWsColor(){
  const [r,g,b]=rgb(document.getElementById('wsColor').value);
  try{await post('/api/led',{mode:'ws2812',strip:currentWsStrip(),r,g,b})}catch(e){alert(e.message)}
}
async function sendWsOff(){
  try{await post('/api/led',{mode:'ws2812',strip:currentWsStrip(),r:0,g:0,b:0})}catch(e){alert(e.message)}
}
async function sendPixel(){
  const [r,g,b]=rgb(document.getElementById('pixelColor').value);
  const n=parseInt(document.getElementById('pixel').value,10)||1;
  const count=parseInt(document.getElementById('pixelCount').value,10)||1;
  try{await post('/api/led',{mode:'ws2812',strip:currentWsStrip(),start:n-1,count,r,g,b})}catch(e){alert(e.message)}
}
function onWsStripChange(){
  updateWsInfo(lastStatus);
}
async function sendPwmColor(){
  const [r,g,b]=rgb(document.getElementById('pwmColor').value);
  try{await post('/api/led',{mode:'pwm',r,g,b})}catch(e){alert(e.message)}
}
async function sendPwmOff(){
  try{await post('/api/led',{mode:'pwm',r:0,g:0,b:0})}catch(e){alert(e.message)}
}

async function buzzer(action){try{await post('/api/buzzer',{action})}catch(e){alert(e.message)}}

const SCENE_COLORS={
  READY:[25,220,95],WORKING:[20,175,255],WAITING:[255,145,20],
  ALARM:[255,0,0],MAINTENANCE:[175,45,255],DISCONNECTED:[105,120,125],OFF:[0,0,0]
};
async function scene(name){
  const c=SCENE_COLORS[name]||[0,0,0];
  try{
    await post('/api/led',{mode:'ws2812',r:c[0],g:c[1],b:c[2]});
    lastScene=name;
    document.getElementById('scene').textContent=name;
  }catch(e){alert(e.message)}
  if(buzzerSceneSounds){
    // Best-effort: si el buzzer falla no tapamos con otro alert() el
    // resultado del color, que ya se aplicó arriba.
    try{await post('/api/buzzer',{action:name})}catch(e){/* silencioso a propósito */}
  }
}

function renderRelays(relays){
  const list=relays||[];
  const box=document.getElementById('relays');
  box.innerHTML='';
  list.forEach(x=>{
    box.innerHTML+=`<div class="relay"><div><b>${x.name}</b><br><span class="sub">GPIO ${x.gpio}</span></div><div class="row"><span class="badge ${x.on?'on':''}">${x.on?'ON':'OFF'}</span><button onclick="relay(${x.n},${x.on?'false':'true'})">Cambiar</button></div></div>`;
  });
  document.getElementById('relaysOn').textContent=list.filter(x=>x.on).length+'/'+list.length;
}

function wsStripLabelFor(n){
  return n===0?'Tira 1 (principal)':n===1?'Tira 2':'Tira 3';
}

// El selector de tira solo aparece si de verdad hay más de una tira
// habilitada (WS2812_2_ENABLE/WS2812_3_ENABLE) -- con una sola tira (el
// caso más común) la UI queda igual que antes, sin selector de por medio.
function populateWsStripSelect(s){
  const sel=document.getElementById('wsStrip');
  const label=document.getElementById('wsStripLabel');
  const enabled=[0];
  if(s.io.ws2812_2) enabled.push(1);
  if(s.io.ws2812_3) enabled.push(2);

  if(enabled.length<2){
    sel.style.display='none';
    label.style.display='none';
    sel.innerHTML='';
    return;
  }

  const prevValue=sel.value;
  sel.style.display='';
  label.style.display='';
  sel.innerHTML=enabled.map(n=>`<option value="${n}">${wsStripLabelFor(n)}</option>`).join('');
  if(enabled.includes(parseInt(prevValue,10))) sel.value=prevValue;
}

function updateWsInfo(s){
  if(!s||!s.io) return;
  const n=currentWsStrip();
  const count=n===0?s.io.ws2812_count:(n===1?s.io.ws2812_2_count:s.io.ws2812_3_count);
  const pin=n===0?s.io.ws2812_pin:(n===1?s.io.ws2812_2_pin:s.io.ws2812_3_pin);
  document.getElementById('pixel').max=count||1;
  document.getElementById('wsInfo').textContent=
    (count||0)+' LED(s), GPIO '+(pin!==undefined?pin:'—');
}

async function refresh(){
  try{
    const r=await fetch('/api/status',{cache:'no-store'});
    const s=await r.json();

    document.getElementById('identity').textContent=
      (s.hostname||'—')+' · '+(s.chip||s.board||'—')+' · FW '+s.firmware;

    document.getElementById('wifi').textContent=
      s.wifi.connected?'Conectado':s.wifi.mode.toUpperCase();
    document.getElementById('ip').textContent=s.wifi.ip;
    document.getElementById('scene').textContent=lastScene;

    renderRelays(s.relays);

    const hasWs=!!(s.io&&s.io.ws2812);
    const hasPwm=!!(s.io&&s.io.pwm_led);
    const hasBuzzer=!!(s.io&&s.io.buzzer);
    const hasDht=!!(s.dht&&s.dht.enabled);
    document.getElementById('cardWs').style.display=hasWs?'':'none';
    document.getElementById('cardScenes').style.display=hasWs?'':'none';
    document.getElementById('cardPwm').style.display=hasPwm?'':'none';
    document.getElementById('cardBuzzer').style.display=hasBuzzer?'':'none';
    document.getElementById('envDhtBlock').style.display=hasDht?'':'none';
    updateEnvCardVisibility();

    lastStatus=s;
    if(hasWs){
      populateWsStripSelect(s);
      updateWsInfo(s);
    }

    buzzerSceneSounds=hasBuzzer&&!!(s.buzzer&&s.buzzer.scene_sounds);

    if(hasBuzzer){
      document.getElementById('buzzerInfo').textContent=
        'GPIO '+s.buzzer.gpio+' · patrón '+s.buzzer.pattern+' · '+(s.buzzer.on?'sonando':'apagado')+
        (buzzerSceneSounds?' · suena con las escenas':' · silencioso con las escenas');
    }

    if(hasDht){
      const dhtValid=!!s.dht.valid;
      document.getElementById('dhtTemp').textContent=dhtValid?s.dht.t_c.toFixed(1)+' °C':'—';
      document.getElementById('dhtHum').textContent=dhtValid?s.dht.h_pct.toFixed(1)+' %':'—';
    }

    document.getElementById('details').textContent=
      `SSID: ${s.wifi.ssid||'—'}\nRSSI: ${s.wifi.rssi} dBm\n`+
      `AP recuperación: ${s.wifi.recovery_ap?('activo ('+(s.wifi.recovery_ssid||'—')+')'):'inactivo'}\n`+
      `Hostname: ${s.hostname||'—'}\nChip: ${s.chip||'—'}\n`+
      `Firmware: ${s.firmware} (protocolo ${s.protocol})\n`+
      (hasWs?`NeoPixel: ${s.io.ws2812_count} LED(s), GPIO ${s.io.ws2812_pin}\n`:``)+
      (hasWs&&s.io.ws2812_2?`NeoPixel 2: ${s.io.ws2812_2_count} LED(s), GPIO ${s.io.ws2812_2_pin}\n`:``)+
      (hasWs&&s.io.ws2812_3?`NeoPixel 3: ${s.io.ws2812_3_count} LED(s), GPIO ${s.io.ws2812_3_pin}\n`:``)+
      (hasPwm&&s.io.pwm_pins?`PWM RGB: GPIO ${s.io.pwm_pins.join('/')}\n`:``)+
      (hasBuzzer?`Buzzer: GPIO ${s.buzzer.gpio}, patrón ${s.buzzer.pattern}, salida ${s.buzzer.on?'ON':'OFF'}\n`:``)+
      (hasDht?`DHT11: ${s.dht.valid?s.dht.t_c.toFixed(1)+'°C, '+s.dht.h_pct.toFixed(1)+'%HR':'sin lectura válida todavía'} (GPIO ${s.dht.pin})\n`:``)+
      `Heap libre: ${s.free_heap} bytes\nUptime: ${Math.floor(s.uptime_ms/1000)} s\n`+
      `Reset: ${s.reset_reason||'—'}`;
  }catch(e){
    document.getElementById('identity').textContent='Sin respuesta del dispositivo';
  }
}

function updateEnvCardVisibility(){
  const dhtOn=document.getElementById('envDhtBlock').style.display!=='none';
  const powerOn=document.getElementById('envPowerBlock').style.display!=='none';
  document.getElementById('cardEnv').style.display=(dhtOn||powerOn)?'':'none';
}

async function refreshPower(){
  const block=document.getElementById('envPowerBlock');
  try{
    const r=await fetch('/api/power',{cache:'no-store'});
    if(!r.ok){block.style.display='none';updateEnvCardVisibility();return}
    const p=await r.json();
    if(!p.valid){block.style.display='none';updateEnvCardVisibility();return}
    block.style.display='';
    updateEnvCardVisibility();
    document.getElementById('powerVoltage').textContent=p.voltage_v.toFixed(2)+' V';
    document.getElementById('powerSoc').textContent=p.soc_pct.toFixed(0)+' %';
    const pct=Math.max(0,Math.min(100,p.soc_pct));
    const gauge=document.getElementById('powerGauge');
    gauge.style.width=pct+'%';
    gauge.style.background=pct<20?'var(--red)':pct<50?'var(--amber)':'var(--green)';
  }catch(e){
    block.style.display='none';
    updateEnvCardVisibility();
  }
}

async function refreshCluster(){
  const card=document.getElementById('cardCluster');
  const links=document.getElementById('clusterLinks');
  try{
    const r=await fetch('/api/cluster',{cache:'no-store'});
    if(!r.ok){card.style.display='none';return}
    const c=await r.json();
    card.style.display='';
    if(c.role==='master'){
      const list=c.slaves||[];
      document.getElementById('clusterRole').textContent='Maestro';
      document.getElementById('clusterPeers').textContent=list.length;
      links.innerHTML=list.length>0
        ?list.map(x=>{
            const label=(x.caps&&x.caps.hostname)?x.caps.hostname:x.ip;
            return `<a href="http://${x.ip}/" target="_blank">🔌 ${label} (${x.ip})</a>`;
          }).join('')
        :'<span class="sub">Sin esclavos todavía</span>';
    }else if(c.role==='slave'){
      document.getElementById('clusterRole').textContent='Esclavo';
      document.getElementById('clusterPeers').textContent='1';
      links.innerHTML=`<a href="http://${c.master_ip}/" target="_blank">👑 Maestro (${c.master_ip})</a>`;
    }else{
      document.getElementById('clusterRole').textContent='Eligiendo…';
      document.getElementById('clusterPeers').textContent='—';
      links.innerHTML='<span class="sub">Buscando maestro en la red</span>';
    }
  }catch(e){
    card.style.display='none';
  }
}

refresh();setInterval(refresh,2500);
refreshPower();setInterval(refreshPower,4000);
refreshCluster();setInterval(refreshCluster,4000);
</script>
</body>
</html>
)NOPALHTML";

#if defined(ESP32)
  WebServer server(HTTP_PORT);
#elif defined(ESP8266)
  ESP8266WebServer server(HTTP_PORT);
#endif

#include "nopal_cluster.h"
#include "nopal_power.h"

bool webServerStarted = false;
bool mdnsStarted = false;
bool recoveryApActive = false;
bool wifiWasConnected = false;

uint32_t lastWifiReconnectAttemptMs = 0;

String recoveryApSsid;

String inputLine;

#if defined(ESP32) && ESP_ARDUINO_VERSION_MAJOR < 3

const uint8_t PWM_CHANNEL_R = 0;
const uint8_t PWM_CHANNEL_G = 1;
const uint8_t PWM_CHANNEL_B = 2;

#endif

const BuzzerStep BUZZER_PATTERN_CONTINUOUS[] = {
  {true, 1000}
};

const BuzzerStep BUZZER_PATTERN_BEEP[] = {
  {true, 120}, {false, 1}
};

const BuzzerStep BUZZER_PATTERN_DOUBLE[] = {
  {true, 100}, {false, 100}, {true, 100}, {false, 1}
};

const BuzzerStep BUZZER_PATTERN_READY[] = {
  {true, 80}, {false, 80}, {true, 180}, {false, 1}
};

const BuzzerStep BUZZER_PATTERN_WORKING[] = {
  {true, 60}, {false, 1}
};

const BuzzerStep BUZZER_PATTERN_WAITING[] = {
  {true, 100}, {false, 900}
};

const BuzzerStep BUZZER_PATTERN_ALARM[] = {
  {true, 220}, {false, 150}
};

const BuzzerStep BUZZER_PATTERN_MAINTENANCE[] = {
  {true, 80}, {false, 80}, {true, 80}, {false, 80}, {true, 80}, {false, 1}
};

const BuzzerStep BUZZER_PATTERN_DISCONNECTED[] = {
  {true, 450}, {false, 550}
};

BuzzerPattern buzzerPattern = BuzzerPattern::OFF;
const BuzzerStep* activeBuzzerSteps = nullptr;
uint8_t activeBuzzerStepCount = 0;
uint8_t activeBuzzerStepIndex = 0;
bool buzzerPatternRepeats = false;
bool buzzerOutputOn = false;
uint32_t buzzerNextStepAtMs = 0;

uint8_t clampColor(int value) {
  if (value < 0) {
    return 0;
  }

  if (value > 255) {
    return 255;
  }

  return static_cast<uint8_t>(value);
}

bool validRelayIndex(int index) {
  return index >= 0 && index < RELAY_COUNT;
}

uint32_t maxU32(uint32_t first, uint32_t second) {
  return first > second ? first : second;
}

#if STATUS_LED_ENABLE

void setStatusLed(bool on) {
  digitalWrite(
    STATUS_LED_PIN,
    (on != STATUS_LED_ACTIVE_LOW) ? HIGH : LOW
  );
}

void serviceStatusLed() {
  static uint32_t lastToggleMs = 0;
  static bool ledOn = true;

  const bool steady =
    WiFi.status() == WL_CONNECTED ||
    !wifiCredentialsConfigured();

  if (steady) {
    if (!ledOn) {
      ledOn = true;
      setStatusLed(true);
    }
    return;
  }

  const uint32_t now = millis();

  if (now - lastToggleMs >= 300) {
    lastToggleMs = now;
    ledOn = !ledOn;
    setStatusLed(ledOn);
  }
}

#endif

String chipModelText() {

#if defined(ESP32)

  return String(ESP.getChipModel());

#elif defined(ESP8266)

  return String("ESP8266-") + String(ESP.getChipId(), HEX);

#endif
}

void printChipIdentification() {
  Serial.print(chipModelText());
}

String resetReasonText() {

#if defined(ESP32)

  switch (esp_reset_reason()) {
    case ESP_RST_POWERON:   return "Encendido";
    case ESP_RST_EXT:       return "Pin de reset externo";
    case ESP_RST_SW:        return "Software (reinicio pedido por el firmware)";
    case ESP_RST_PANIC:     return "Pánico / excepción";
    case ESP_RST_INT_WDT:   return "Watchdog de interrupción";
    case ESP_RST_TASK_WDT:  return "Watchdog de tarea";
    case ESP_RST_WDT:       return "Watchdog";
    case ESP_RST_DEEPSLEEP: return "Salida de deep sleep";
    case ESP_RST_BROWNOUT:  return "Brownout (caída de voltaje)";
    case ESP_RST_SDIO:      return "SDIO";
    default:                return "Desconocido";
  }

#elif defined(ESP8266)

  return ESP.getResetReason();

#endif
}

String chipSuffix() {
  char suffix[9] = {0};

#if defined(ESP32)

  const uint32_t chipId =
    static_cast<uint32_t>(ESP.getEfuseMac() & 0xFFFFFFULL);

  snprintf(suffix, sizeof(suffix), "%06lX", static_cast<unsigned long>(chipId));

#elif defined(ESP8266)

  snprintf(
    suffix,
    sizeof(suffix),
    "%06lX",
    static_cast<unsigned long>(ESP.getChipId())
  );

#endif

  return String(suffix);
}

bool wifiCredentialsConfigured() {
  const String ssid = String(NOPAL_WIFI_SSID);

  return ssid.length() > 0 &&
         ssid != "TU_RED_WIFI";
}

String activeIpAddress() {
  if (WiFi.status() == WL_CONNECTED) {
    return WiFi.localIP().toString();
  }

  if (recoveryApActive) {
    return WiFi.softAPIP().toString();
  }

  return "0.0.0.0";
}

String wifiModeText() {
  if (WiFi.status() == WL_CONNECTED && recoveryApActive) {
    return "sta+ap";
  }

  if (WiFi.status() == WL_CONNECTED) {
    return "sta";
  }

  if (recoveryApActive) {
    return "ap";
  }

  return "offline";
}

String jsonEscape(const String& input) {
  String output;
  output.reserve(input.length() + 16);

  for (size_t index = 0; index < input.length(); index++) {
    const char character = input.charAt(index);

    switch (character) {
      case '\\':
        output += "\\\\";
        break;

      case '"':
        output += "\\\"";
        break;

      case '\n':
        output += "\\n";
        break;

      case '\r':
        output += "\\r";
        break;

      case '\t':
        output += "\\t";
        break;

      default:
        output += character;
        break;
    }
  }

  return output;
}

void setRelay(uint8_t index, bool on) {
  if (index >= RELAY_COUNT) {
    return;
  }

  const bool outputLevel = RELAY_ACTIVE_LOW ? !on : on;

  digitalWrite(
    RELAY_PINS[index],
    outputLevel ? HIGH : LOW
  );
}

bool getRelay(uint8_t index) {
  if (index >= RELAY_COUNT) {
    return false;
  }

  const bool pinIsHigh =
    digitalRead(RELAY_PINS[index]) == HIGH;

  return RELAY_ACTIVE_LOW
    ? !pinIsHigh
    : pinIsHigh;
}

void setupPwmLed() {

#if PWM_LED_ENABLE

  pinMode(PWM_LED_PIN_R, OUTPUT);
  pinMode(PWM_LED_PIN_G, OUTPUT);
  pinMode(PWM_LED_PIN_B, OUTPUT);

  #if defined(ESP32)

    #if ESP_ARDUINO_VERSION_MAJOR >= 3

      ledcAttach(PWM_LED_PIN_R, 5000, 8);
      ledcAttach(PWM_LED_PIN_G, 5000, 8);
      ledcAttach(PWM_LED_PIN_B, 5000, 8);

    #else

      ledcSetup(PWM_CHANNEL_R, 5000, 8);
      ledcSetup(PWM_CHANNEL_G, 5000, 8);
      ledcSetup(PWM_CHANNEL_B, 5000, 8);

      ledcAttachPin(PWM_LED_PIN_R, PWM_CHANNEL_R);
      ledcAttachPin(PWM_LED_PIN_G, PWM_CHANNEL_G);
      ledcAttachPin(PWM_LED_PIN_B, PWM_CHANNEL_B);

    #endif

  #elif defined(ESP8266)

    analogWriteRange(255);
    analogWriteFreq(5000);

  #endif

#endif
}

void setPwmLedColor(uint8_t red, uint8_t green, uint8_t blue) {

#if PWM_LED_ENABLE

  #if defined(ESP32)

    #if ESP_ARDUINO_VERSION_MAJOR >= 3

      ledcWrite(PWM_LED_PIN_R, red);
      ledcWrite(PWM_LED_PIN_G, green);
      ledcWrite(PWM_LED_PIN_B, blue);

    #else

      ledcWrite(PWM_CHANNEL_R, red);
      ledcWrite(PWM_CHANNEL_G, green);
      ledcWrite(PWM_CHANNEL_B, blue);

    #endif

  #elif defined(ESP8266)

    analogWrite(PWM_LED_PIN_R, red);
    analogWrite(PWM_LED_PIN_G, green);
    analogWrite(PWM_LED_PIN_B, blue);

  #endif

#endif
}

void setWs2812ColorAt(uint8_t stripIndex, uint8_t red, uint8_t green, uint8_t blue) {

#if WS2812_ENABLE

  if (!ws2812StripEnabled(stripIndex)) return;

  Adafruit_NeoPixel* target = ws2812StripObject(stripIndex);
  target->fill(target->Color(red, green, blue));
  target->show();

#endif
}

void setWs2812Color(uint8_t red, uint8_t green, uint8_t blue) {
  setWs2812ColorAt(0, red, green, blue);
}

void setWs2812Color2(uint8_t red, uint8_t green, uint8_t blue) {
  setWs2812ColorAt(1, red, green, blue);
}

void setWs2812Color3(uint8_t red, uint8_t green, uint8_t blue) {
  setWs2812ColorAt(2, red, green, blue);
}

bool setWs2812SegmentAt(
  uint8_t stripIndex,
  int start,
  int count,
  uint8_t red,
  uint8_t green,
  uint8_t blue,
  String& response
) {
#if WS2812_ENABLE
  if (!ws2812StripEnabled(stripIndex)) {
    response = "ERR:UNSUPPORTED";
    return true;
  }
  const uint16_t stripCount = ws2812StripCount(stripIndex);
  if (start < 0 || count < 1 || start + count > stripCount) {
    response = "ERR:INVALID_SEGMENT";
    return true;
  }
  Adafruit_NeoPixel* target = ws2812StripObject(stripIndex);
  const uint32_t color = target->Color(red, green, blue);
  for (int pixel = start; pixel < start + count; pixel++) {
    target->setPixelColor(pixel, color);
  }
  target->show();
  response = "OK";
#else
  response = "ERR:UNSUPPORTED";
#endif
  return true;
}

bool setWs2812Segment(
  int start,
  int count,
  uint8_t red,
  uint8_t green,
  uint8_t blue,
  String& response
) {
  return setWs2812SegmentAt(0, start, count, red, green, blue, response);
}

void playStartupAnimation() {

#if WS2812_ENABLE

  const uint16_t sweepBudgetMs = 500;
  const uint16_t stepDelayMs =
    (sweepBudgetMs / WS2812_COUNT) > 0
      ? (sweepBudgetMs / WS2812_COUNT)
      : 1;

  String discardResponse;

  setWs2812Color(0, 0, 0);

  for (uint16_t pixel = 0; pixel < WS2812_COUNT; pixel++) {
    setWs2812Segment(pixel, 1, 34, 197, 94, discardResponse);
    delay(stepDelayMs);
  }

  delay(150);

  setWs2812Color(0, 0, 0);

#endif
}

void setBuzzerOutput(bool on) {

#if BUZZER_ENABLE

  buzzerOutputOn = on;

  #if BUZZER_PASSIVE

    #if defined(ESP32)

      #if ESP_ARDUINO_VERSION_MAJOR >= 3
        ledcWrite(BUZZER_PIN, on ? 512 : 0);
      #else
        ledcWriteTone(PWM_CHANNEL_BUZZER, on ? BUZZER_TONE_HZ : 0);
      #endif

    #elif defined(ESP8266)

      if (on) {
        tone(BUZZER_PIN, BUZZER_TONE_HZ);
      } else {
        noTone(BUZZER_PIN);
      }

    #endif

  #else

    const uint8_t level =
      BUZZER_ACTIVE_HIGH
        ? (on ? HIGH : LOW)
        : (on ? LOW : HIGH);

    digitalWrite(BUZZER_PIN, level);

  #endif

#endif
}

void initializeBuzzerSafely() {

#if BUZZER_ENABLE

  #if BUZZER_PASSIVE

    #if defined(ESP32)

      #if ESP_ARDUINO_VERSION_MAJOR >= 3
        ledcAttach(BUZZER_PIN, BUZZER_TONE_HZ, 10);
      #else
        ledcSetup(PWM_CHANNEL_BUZZER, BUZZER_TONE_HZ, 10);
        ledcAttachPin(BUZZER_PIN, PWM_CHANNEL_BUZZER);
      #endif

    #elif defined(ESP8266)

    #endif

    setBuzzerOutput(false);

  #else

    const uint8_t offLevel = BUZZER_ACTIVE_HIGH ? LOW : HIGH;

    digitalWrite(BUZZER_PIN, offLevel);
    pinMode(BUZZER_PIN, OUTPUT);
    setBuzzerOutput(false);

  #endif

#endif
}

String buzzerPatternName(BuzzerPattern pattern) {
  switch (pattern) {
    case BuzzerPattern::OFF:          return "OFF";
    case BuzzerPattern::CONTINUOUS:   return "ON";
    case BuzzerPattern::BEEP:         return "BEEP";
    case BuzzerPattern::DOUBLE_BEEP:  return "DOUBLE";
    case BuzzerPattern::READY:        return "READY";
    case BuzzerPattern::WORKING:      return "WORKING";
    case BuzzerPattern::WAITING:      return "WAITING";
    case BuzzerPattern::ALARM:        return "ALARM";
    case BuzzerPattern::MAINTENANCE:  return "MAINTENANCE";
    case BuzzerPattern::DISCONNECTED: return "DISCONNECTED";
  }

  return "UNKNOWN";
}

void stopBuzzer() {
  buzzerPattern = BuzzerPattern::OFF;
  activeBuzzerSteps = nullptr;
  activeBuzzerStepCount = 0;
  activeBuzzerStepIndex = 0;
  buzzerPatternRepeats = false;
  buzzerNextStepAtMs = 0;
  setBuzzerOutput(false);
}

void startBuzzerPattern(
  BuzzerPattern pattern,
  const BuzzerStep* steps,
  uint8_t stepCount,
  bool repeats
) {
  if (pattern == BuzzerPattern::OFF || steps == nullptr || stepCount == 0) {
    stopBuzzer();
    return;
  }

  buzzerPattern = pattern;
  activeBuzzerSteps = steps;
  activeBuzzerStepCount = stepCount;
  activeBuzzerStepIndex = 0;
  buzzerPatternRepeats = repeats;

  setBuzzerOutput(activeBuzzerSteps[0].on);
  buzzerNextStepAtMs = millis() + maxU32(1UL, activeBuzzerSteps[0].durationMs);
}

bool startBuzzerFromText(String patternText) {
  patternText.trim();
  patternText.toUpperCase();

  if (patternText == "OFF" || patternText == "STOP") {
    stopBuzzer();
    return true;
  }

  if (patternText == "ON" || patternText == "CONTINUOUS") {
    startBuzzerPattern(
      BuzzerPattern::CONTINUOUS,
      BUZZER_PATTERN_CONTINUOUS,
      sizeof(BUZZER_PATTERN_CONTINUOUS) / sizeof(BUZZER_PATTERN_CONTINUOUS[0]),
      true
    );
    return true;
  }

  if (patternText == "BEEP") {
    startBuzzerPattern(
      BuzzerPattern::BEEP,
      BUZZER_PATTERN_BEEP,
      sizeof(BUZZER_PATTERN_BEEP) / sizeof(BUZZER_PATTERN_BEEP[0]),
      false
    );
    return true;
  }

  if (patternText == "DOUBLE" || patternText == "DOUBLE_BEEP") {
    startBuzzerPattern(
      BuzzerPattern::DOUBLE_BEEP,
      BUZZER_PATTERN_DOUBLE,
      sizeof(BUZZER_PATTERN_DOUBLE) / sizeof(BUZZER_PATTERN_DOUBLE[0]),
      false
    );
    return true;
  }

  if (patternText == "READY") {
    startBuzzerPattern(
      BuzzerPattern::READY,
      BUZZER_PATTERN_READY,
      sizeof(BUZZER_PATTERN_READY) / sizeof(BUZZER_PATTERN_READY[0]),
      false
    );
    return true;
  }

  if (patternText == "WORKING") {
    startBuzzerPattern(
      BuzzerPattern::WORKING,
      BUZZER_PATTERN_WORKING,
      sizeof(BUZZER_PATTERN_WORKING) / sizeof(BUZZER_PATTERN_WORKING[0]),
      false
    );
    return true;
  }

  if (patternText == "WAITING") {
    startBuzzerPattern(
      BuzzerPattern::WAITING,
      BUZZER_PATTERN_WAITING,
      sizeof(BUZZER_PATTERN_WAITING) / sizeof(BUZZER_PATTERN_WAITING[0]),
      false
    );
    return true;
  }

  if (patternText == "ALARM") {
    startBuzzerPattern(
      BuzzerPattern::ALARM,
      BUZZER_PATTERN_ALARM,
      sizeof(BUZZER_PATTERN_ALARM) / sizeof(BUZZER_PATTERN_ALARM[0]),
      true
    );
    return true;
  }

  if (patternText == "MAINTENANCE") {
    startBuzzerPattern(
      BuzzerPattern::MAINTENANCE,
      BUZZER_PATTERN_MAINTENANCE,
      sizeof(BUZZER_PATTERN_MAINTENANCE) / sizeof(BUZZER_PATTERN_MAINTENANCE[0]),
      false
    );
    return true;
  }

  if (patternText == "DISCONNECTED") {
    startBuzzerPattern(
      BuzzerPattern::DISCONNECTED,
      BUZZER_PATTERN_DISCONNECTED,
      sizeof(BUZZER_PATTERN_DISCONNECTED) / sizeof(BUZZER_PATTERN_DISCONNECTED[0]),
      true
    );
    return true;
  }

  return false;
}

void serviceBuzzer() {

#if BUZZER_ENABLE

  if (
    buzzerPattern == BuzzerPattern::OFF ||
    activeBuzzerSteps == nullptr ||
    activeBuzzerStepCount == 0
  ) {
    return;
  }

  if (static_cast<int32_t>(millis() - buzzerNextStepAtMs) < 0) {
    return;
  }

  activeBuzzerStepIndex++;

  if (activeBuzzerStepIndex >= activeBuzzerStepCount) {
    if (!buzzerPatternRepeats) {
      stopBuzzer();
      return;
    }

    activeBuzzerStepIndex = 0;
  }

  const BuzzerStep& step = activeBuzzerSteps[activeBuzzerStepIndex];
  setBuzzerOutput(step.on);
  buzzerNextStepAtMs = millis() + maxU32(1UL, step.durationMs);

#endif
}

void setWifiHostname() {

#if defined(ESP32)

  WiFi.setHostname(NOPAL_HOSTNAME);

#elif defined(ESP8266)

  WiFi.hostname(NOPAL_HOSTNAME);

#endif
}

void startRecoveryAccessPoint() {
  if (recoveryApActive) {
    return;
  }

  recoveryApSsid = String("NOPAL-") + chipSuffix();

  WiFi.mode(WIFI_AP_STA);

  const size_t passwordLength = strlen(NOPAL_AP_PASSWORD);

  bool started = false;

  if (passwordLength >= 8) {
    started = WiFi.softAP(
      recoveryApSsid.c_str(),
      NOPAL_AP_PASSWORD
    );
  } else {
    Serial.println("WARN:AP_PASSWORD_TOO_SHORT_STARTING_OPEN_AP");
    started = WiFi.softAP(recoveryApSsid.c_str());
  }

  recoveryApActive = started;

  if (started) {
    Serial.print("NOPAL:AP_READY,ssid=");
    Serial.print(recoveryApSsid);
    Serial.print(",ip=");
    Serial.println(WiFi.softAPIP());
  } else {
    Serial.println("ERR:AP_START_FAILED");
  }
}

void startMdnsIfPossible() {
  if (mdnsStarted || WiFi.status() != WL_CONNECTED) {
    return;
  }

  if (MDNS.begin(NOPAL_HOSTNAME)) {
    MDNS.addService("http", "tcp", HTTP_PORT);
    mdnsStarted = true;

    Serial.print("NOPAL:MDNS_READY,http://");
    Serial.print(NOPAL_HOSTNAME);
    Serial.println(".local/");
  } else {
    Serial.println("WARN:MDNS_START_FAILED");
  }
}

void setupWifi() {
  setWifiHostname();

  if (!wifiCredentialsConfigured()) {
    Serial.println("WARN:WIFI_CREDENTIALS_NOT_CONFIGURED");
    startRecoveryAccessPoint();
    return;
  }

  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);

  Serial.print("NOPAL:WIFI_CONNECTING,ssid=");
  Serial.println(NOPAL_WIFI_SSID);

  WiFi.begin(
    NOPAL_WIFI_SSID,
    NOPAL_WIFI_PASSWORD
  );

  const uint32_t startedAt = millis();

  while (
    WiFi.status() != WL_CONNECTED &&
    millis() - startedAt < WIFI_CONNECT_TIMEOUT_MS
  ) {
    delay(100);

#if defined(ESP8266)
    yield();
#endif
  }

  if (WiFi.status() == WL_CONNECTED) {
    wifiWasConnected = true;

    Serial.print("NOPAL:WIFI_READY,ssid=");
    Serial.print(WiFi.SSID());
    Serial.print(",ip=");
    Serial.print(WiFi.localIP());
    Serial.print(",rssi=");
    Serial.println(WiFi.RSSI());

    startMdnsIfPossible();
    return;
  }

  Serial.println("WARN:WIFI_CONNECTION_TIMEOUT");
  startRecoveryAccessPoint();
}

void maintainWifiConnection() {
  const bool connected = WiFi.status() == WL_CONNECTED;

  if (connected) {
    if (!wifiWasConnected) {
      wifiWasConnected = true;

      Serial.print("NOPAL:WIFI_RECONNECTED,ip=");
      Serial.println(WiFi.localIP());
    }

    startMdnsIfPossible();
    return;
  }

  if (wifiWasConnected) {
    wifiWasConnected = false;
    Serial.println("WARN:WIFI_DISCONNECTED");
  }

  if (!wifiCredentialsConfigured()) {
    if (!recoveryApActive) {
      startRecoveryAccessPoint();
    }

    return;
  }

  const uint32_t now = millis();

  if (
    now - lastWifiReconnectAttemptMs <
    WIFI_RECONNECT_INTERVAL_MS
  ) {
    return;
  }

  lastWifiReconnectAttemptMs = now;

  if (!recoveryApActive) {
    startRecoveryAccessPoint();
  }

  Serial.println("NOPAL:WIFI_RECONNECTING");

  WiFi.begin(
    NOPAL_WIFI_SSID,
    NOPAL_WIFI_PASSWORD
  );
}

String buildStatusJson() {
  String json;

  json.reserve(1792);

  json += "{";
  json += "\"role\":\"accessory\",";

  json += "\"board\":\"";

#if defined(ESP32)
  json += "esp32_generic_ff";
#elif defined(ESP8266)
  json += "esp8266_generic_ff";
#endif

  json += "\",";

  json += "\"chip\":\"";
  json += jsonEscape(chipModelText());
  json += "\",";

  json += "\"firmware\":\"";
  json += FW_VERSION;
  json += "\",";

  json += "\"protocol\":";
  json += String(NOPAL_PROTOCOL);
  json += ",";

  json += "\"hostname\":\"";
  json += jsonEscape(String(NOPAL_HOSTNAME));
  json += "\",";

  json += "\"uptime_ms\":";
  json += String(millis());
  json += ",";

  json += "\"free_heap\":";
  json += String(ESP.getFreeHeap());
  json += ",";

  json += "\"reset_reason\":\"";
  json += jsonEscape(resetReasonText());
  json += "\",";

  json += "\"wifi\":{";
  json += "\"connected\":";
  json += WiFi.status() == WL_CONNECTED ? "true" : "false";
  json += ",";

  json += "\"mode\":\"";
  json += wifiModeText();
  json += "\",";

  json += "\"ssid\":\"";
  json += WiFi.status() == WL_CONNECTED
    ? jsonEscape(WiFi.SSID())
    : "";
  json += "\",";

  json += "\"ip\":\"";
  json += activeIpAddress();
  json += "\",";

  json += "\"rssi\":";
  json += WiFi.status() == WL_CONNECTED
    ? String(WiFi.RSSI())
    : String(0);
  json += ",";

  json += "\"recovery_ap\":";
  json += recoveryApActive ? "true" : "false";
  json += ",";

  json += "\"recovery_ssid\":\"";
  json += recoveryApActive
    ? jsonEscape(recoveryApSsid)
    : "";
  json += "\"";
  json += "},";

  json += "\"relays\":[";

  for (uint8_t index = 0; index < RELAY_COUNT; index++) {
    if (index > 0) {
      json += ",";
    }

    json += "{\"n\":";
    json += String(index + 1);
    json += ",\"name\":\"";
    json += jsonEscape(String(RELAY_NAMES[index]));
    json += "\",\"gpio\":";
    json += String(RELAY_PINS[index]);
    json += ",\"on\":";
    json += getRelay(index) ? "true" : "false";
    json += "}";
  }

  json += "],";

  json += "\"buzzer\":{";
  json += "\"enabled\":";
  json += BUZZER_ENABLE ? "true" : "false";
  json += ",\"gpio\":";
  json += String(BUZZER_PIN);
  json += ",\"active_high\":";
  json += BUZZER_ACTIVE_HIGH ? "true" : "false";
  json += ",\"on\":";
  json += buzzerOutputOn ? "true" : "false";
  json += ",\"pattern\":\"";
  json += buzzerPatternName(buzzerPattern);
  json += "\",\"repeating\":";
  json += buzzerPatternRepeats ? "true" : "false";
  json += ",\"scene_sounds\":";
  json += (NOPAL_BUZZER_SCENE_SOUNDS != 0) ? "true" : "false";
  json += "},";

  json += "\"dht\":{";
  json += "\"enabled\":";
#if DHT_ENABLE
  json += "true,";
  json += "\"pin\":";
  json += String(DHT_PIN);
  json += ",\"min_interval_ms\":";
  json += String(DHT_MIN_INTERVAL_MS);
  {
    const DhtReading reading = dhtRead();
    json += ",\"valid\":";
    json += reading.valid ? "true" : "false";
    json += ",\"t_c\":";
    json += String(reading.temperatureC, 1);
    json += ",\"h_pct\":";
    json += String(reading.humidityPct, 1);
  }
#else
  json += "false";
#endif
  json += "},";

  json += "\"ble_screen\":{";
#if defined(ESP32)
  json += "\"configured\":";
  json += bleScreenConfigured() ? "true" : "false";
  json += ",\"connected\":";
  json += bleScreenIsConnected() ? "true" : "false";
#else
  json += "\"configured\":false,\"connected\":false";
#endif
  json += "},";

  json += "\"ota\":{";
  json += "\"enabled\":true,";
  json += "\"path\":\"/update\"";
  json += "},";

  json += "\"io\":{";
  json += "\"relays\":";
  json += String(RELAY_COUNT);
  json += ",";

  json += "\"relay_active_low\":";
  json += RELAY_ACTIVE_LOW ? "true" : "false";
  json += ",";
  json += "\"pwm_led\":";
  json += PWM_LED_ENABLE ? "true" : "false";

#if PWM_LED_ENABLE
  json += ",\"pwm_pins\":[";
  json += String(PWM_LED_PIN_R);
  json += ",";
  json += String(PWM_LED_PIN_G);
  json += ",";
  json += String(PWM_LED_PIN_B);
  json += "]";
#endif

  json += ",";
  json += "\"ws2812\":";
  json += WS2812_ENABLE ? "true" : "false";
  json += ",";
  json += "\"ws2812_count\":";
  json += String(WS2812_ENABLE ? WS2812_COUNT : 0);

#if WS2812_ENABLE
  json += ",\"ws2812_pin\":";
  json += String(WS2812_PIN);

  json += ",\"ws2812_2\":";
  json += ws2812StripEnabled(1) ? "true" : "false";
  json += ",\"ws2812_2_count\":";
  json += String(ws2812StripEnabled(1) ? ws2812StripCount(1) : 0);
  json += ",\"ws2812_2_pin\":";
  json += String(ws2812StripPin(1));

  json += ",\"ws2812_3\":";
  json += ws2812StripEnabled(2) ? "true" : "false";
  json += ",\"ws2812_3_count\":";
  json += String(ws2812StripEnabled(2) ? ws2812StripCount(2) : 0);
  json += ",\"ws2812_3_pin\":";
  json += String(ws2812StripPin(2));
#endif

  json += ",\"buzzer\":";
  json += BUZZER_ENABLE ? "true" : "false";

#if BUZZER_ENABLE
  json += ",\"buzzer_pin\":";
  json += String(BUZZER_PIN);
#endif

  json += "}";

  json += "}";

  return json;
}

bool parseAndSetColor(
  const String& command,
  uint8_t prefixLength,
  void (*setColor)(uint8_t, uint8_t, uint8_t),
  String& response
);
bool parseAndSetSegment(const String& command, uint8_t prefixLength, String& response, uint8_t stripIndex = 0);

bool checkApiAuth() {
  if (server.authenticate(NOPAL_OTA_USERNAME, NOPAL_OTA_PASSWORD)) {
    return true;
  }

  server.requestAuthentication();
  return false;
}

void setupWebServer() {

  server.on("/", HTTP_GET, []() {
    if (!checkApiAuth()) return;

    server.send_P(
      200,
      PSTR("text/html; charset=utf-8"),
      INDEX_HTML
    );
  });

  server.on("/api/status", HTTP_GET, []() {
    server.send(
      200,
      "application/json; charset=utf-8",
      buildStatusJson()
    );
  });

  server.on("/health", HTTP_GET, []() {
    server.send(200, "text/plain", "OK");
  });

  server.on("/api/relay", HTTP_GET, []() {
    if (!checkApiAuth()) return;

    const String command = String("R") + server.arg("n") + "?";

    String response = "ERR:INVALID_RELAY";
    handleRelayCommand(command, response);

    server.send(
      response.startsWith("ERR") ? 400 : 200,
      "text/plain",
      response
    );
  });

  server.on("/api/relay", HTTP_POST, []() {
    if (!checkApiAuth()) return;

    const bool on = server.arg("on") == "true" || server.arg("on") == "1";
    const String command = String("R") + server.arg("n") + ":" + (on ? "ON" : "OFF");

    String response = "ERR:INVALID_RELAY";
    handleRelayCommand(command, response);

    server.send(
      response.startsWith("ERR") ? 400 : 200,
      "text/plain",
      response
    );
  });

  server.on("/api/led", HTTP_POST, []() {
    if (!checkApiAuth()) return;

    const String mode = server.arg("mode");
    String response = "ERR:UNSUPPORTED";

#if PWM_LED_ENABLE
    if (mode == "pwm") {
      const String command =
        String("LED:") + server.arg("r") + "," + server.arg("g") + "," + server.arg("b");
      parseAndSetColor(command, 4, setPwmLedColor, response);
    }
#endif

#if WS2812_ENABLE
    if (mode == "ws2812") {

      const int stripArg = server.hasArg("strip") ? server.arg("strip").toInt() : 0;
      const uint8_t stripIndex = (stripArg == 1 || stripArg == 2) ? stripArg : 0;

      if (server.hasArg("start") || server.hasArg("count")) {
        const String command = String("WSSEG:") + server.arg("start") + "," + server.arg("count") + "," +
          server.arg("r") + "," + server.arg("g") + "," + server.arg("b");
        parseAndSetSegment(command, 6, response, stripIndex);
      } else {
        const String command =
          String("WS:") + server.arg("r") + "," + server.arg("g") + "," + server.arg("b");
        void (*setColor)(uint8_t, uint8_t, uint8_t) =
          stripIndex == 1 ? setWs2812Color2 : (stripIndex == 2 ? setWs2812Color3 : setWs2812Color);
        parseAndSetColor(command, 3, setColor, response);
      }
    }
#endif

    server.send(
      response.startsWith("ERR") ? 400 : 200,
      "text/plain",
      response
    );
  });

  server.on("/api/buzzer", HTTP_GET, []() {
    if (!checkApiAuth()) return;

    String response = "ERR:UNKNOWN_COMMAND";
    handleBuzzerCommand("BUZZER?", response);

    server.send(
      response.startsWith("ERR") ? 400 : 200,
      "text/plain",
      response
    );
  });

  server.on("/api/buzzer", HTTP_POST, []() {
    if (!checkApiAuth()) return;

    const String command = String("BUZZER:") + server.arg("action");
    String response = "ERR:INVALID_BUZZER_PATTERN";
    handleBuzzerCommand(command, response);

    server.send(
      response.startsWith("ERR") ? 400 : 200,
      "text/plain",
      response
    );
  });

  server.on("/api/ble/status", HTTP_GET, []() {
    String json = "{\"configured\":";

#if defined(ESP32)
    json += bleScreenConfigured() ? "true" : "false";
    json += ",\"connected\":";
    json += bleScreenIsConnected() ? "true" : "false";
#else
    json += "false,\"connected\":false";
#endif

    json += "}";

    server.send(200, "application/json; charset=utf-8", json);
  });

  server.on("/api/ble/window", HTTP_POST, []() {
    if (!checkApiAuth()) return;

#if defined(ESP32)
    if (!bleScreenConfigured()) {
      server.send(400, "text/plain", "ERR:BLE_NOT_CONFIGURED");
      return;
    }

    const String hexBody = server.arg("plain");
    uint8_t* buffer = new uint8_t[BLE_SCREEN_MAX_WINDOW_BYTES];
    size_t decodedLength = 0;
    String response;
    bool ok = false;

    if (!hexToBytes(hexBody, buffer, BLE_SCREEN_MAX_WINDOW_BYTES, decodedLength)) {
      response = "ERR:INVALID_HEX";
    } else {
      ok = bleScreenWriteWindow(buffer, decodedLength, response);
    }

    delete[] buffer;

    const int statusCode = ok ? 200 : (response == "ERR:INVALID_HEX" ? 400 : 502);
    server.send(statusCode, "text/plain", response);
#else
    server.send(501, "text/plain", "ERR:UNSUPPORTED_PLATFORM");
#endif
  });

  server.onNotFound([]() {
    server.send(
      404,
      "application/json; charset=utf-8",
      "{\"error\":\"not_found\"}"
    );
  });

  NopalCluster::registerHttpRoutes();
  NopalPower::registerHttpRoutes();

  ElegantOTA.begin(&server, NOPAL_OTA_USERNAME, NOPAL_OTA_PASSWORD);

  ElegantOTA.onEnd([](bool success) {
    if (success) {
      NopalCluster::prepareForReboot();
    }
  });

  server.begin();
  webServerStarted = true;

  Serial.print("NOPAL:HTTP_READY,port=");
  Serial.print(HTTP_PORT);
  Serial.print(",ota=/update,ip=");
  Serial.println(activeIpAddress());
}

void serviceNetwork() {
  maintainWifiConnection();

  NopalCluster::service();
  NopalPower::service();

#if defined(ESP32)
  maintainBleScreen();
#endif

#if STATUS_LED_ENABLE
  serviceStatusLed();
#endif

  if (webServerStarted) {
    server.handleClient();
    ElegantOTA.loop();
  }

#if defined(ESP8266)

  if (mdnsStarted) {
    MDNS.update();
  }

  yield();

#endif
}

void sendIdentification() {
  Serial.print("NOPAL,role=accessory,chip=");

  printChipIdentification();

  Serial.print(",fw=");
  Serial.print(FW_VERSION);

  Serial.print(",protocol=");
  Serial.print(NOPAL_PROTOCOL);

  Serial.print(",relays=");
  Serial.print(RELAY_COUNT);

  Serial.print(",pwm_led=");
  Serial.print(PWM_LED_ENABLE ? 1 : 0);

  Serial.print(",ws2812=");
  Serial.print(WS2812_ENABLE ? 1 : 0);

  Serial.print(",ws2812_count=");
  Serial.print(
    WS2812_ENABLE
      ? WS2812_COUNT
      : 0
  );

#if WS2812_ENABLE

  Serial.print(",ws2812_2=");
  Serial.print(ws2812StripEnabled(1) ? 1 : 0);
  Serial.print(",ws2812_2_count=");
  Serial.print(ws2812StripEnabled(1) ? ws2812StripCount(1) : 0);

  Serial.print(",ws2812_3=");
  Serial.print(ws2812StripEnabled(2) ? 1 : 0);
  Serial.print(",ws2812_3_count=");
  Serial.print(ws2812StripEnabled(2) ? ws2812StripCount(2) : 0);
#endif

  Serial.print(",buzzer=");
  Serial.print(BUZZER_ENABLE ? 1 : 0);

  Serial.print(",buzzer_pin=");
  Serial.print(BUZZER_PIN);

  Serial.print(",buzzer_pattern=");
  Serial.print(buzzerPatternName(buzzerPattern));

  Serial.print(",wifi=1");

  Serial.print(",wifi_connected=");
  Serial.print(WiFi.status() == WL_CONNECTED ? 1 : 0);

  Serial.print(",wifi_mode=");
  Serial.print(wifiModeText());

  Serial.print(",hostname=");
  Serial.print(NOPAL_HOSTNAME);

  Serial.print(",ip=");
  Serial.print(activeIpAddress());

  Serial.print(",ota=1");
  Serial.print(",ota_path=/update");

#if defined(ESP32)
  Serial.print(",ble_screen=");
  Serial.print(bleScreenConfigured() ? 1 : 0);
  Serial.print(",ble_screen_connected=");
  Serial.print(bleScreenIsConnected() ? 1 : 0);
#else
  Serial.print(",ble_screen=0,ble_screen_connected=0");
#endif

  Serial.print(",uptime_ms=");
  Serial.print(millis());

  Serial.print(",free_heap=");
  Serial.println(ESP.getFreeHeap());
}

void sendNetworkIdentification() {
  Serial.print("NET,connected=");
  Serial.print(WiFi.status() == WL_CONNECTED ? 1 : 0);

  Serial.print(",mode=");
  Serial.print(wifiModeText());

  Serial.print(",hostname=");
  Serial.print(NOPAL_HOSTNAME);

  Serial.print(",ssid=");

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print(WiFi.SSID());
  }

  Serial.print(",ip=");
  Serial.print(activeIpAddress());

  Serial.print(",rssi=");
  Serial.print(
    WiFi.status() == WL_CONNECTED
      ? WiFi.RSSI()
      : 0
  );

  Serial.print(",recovery_ap=");
  Serial.print(recoveryApActive ? 1 : 0);

  Serial.print(",recovery_ssid=");

  if (recoveryApActive) {
    Serial.print(recoveryApSsid);
  }

  Serial.print(",ota_url=http://");
  Serial.print(activeIpAddress());
  Serial.println("/update");
}

bool handleRelayCommand(const String& command, String& response) {

  if (
    command.length() < 2 ||
    command.charAt(0) != 'R'
  ) {
    return false;
  }

  if (command.endsWith("?")) {

    const String relayNumberText =
      command.substring(1, command.length() - 1);

    const int relayNumber =
      relayNumberText.toInt();

    const int relayIndex =
      relayNumber - 1;

    if (!validRelayIndex(relayIndex)) {
      response = "ERR:INVALID_RELAY";
      return true;
    }

    response =
      getRelay(relayIndex)
        ? "ON"
        : "OFF";

    return true;
  }

  const int colonPosition =
    command.indexOf(':');

  if (colonPosition <= 1) {
    return false;
  }

  const String relayNumberText =
    command.substring(1, colonPosition);

  const int relayNumber =
    relayNumberText.toInt();

  const int relayIndex =
    relayNumber - 1;

  if (!validRelayIndex(relayIndex)) {
    response = "ERR:INVALID_RELAY";
    return true;
  }

  String action =
    command.substring(colonPosition + 1);

  action.trim();
  action.toUpperCase();

  if (action == "ON") {
    setRelay(relayIndex, true);
    response = "OK";
    return true;
  }

  if (action == "OFF") {
    setRelay(relayIndex, false);
    response = "OK";
    return true;
  }

  response = "ERR:INVALID_ACTION";

  return true;
}

bool parseAndSetColor(
  const String& command,
  uint8_t prefixLength,
  void (*setColor)(uint8_t, uint8_t, uint8_t),
  String& response
) {
  int red;
  int green;
  int blue;

  const int parsedValues = sscanf(
    command.c_str() + prefixLength,
    "%d,%d,%d",
    &red,
    &green,
    &blue
  );

  if (parsedValues != 3) {
    response = "ERR:INVALID_RGB";
    return true;
  }

  setColor(
    clampColor(red),
    clampColor(green),
    clampColor(blue)
  );

  response = "OK";
  return true;
}

bool parseAndSetSegment(const String& command, uint8_t prefixLength, String& response, uint8_t stripIndex) {
  int start;
  int count;
  int red;
  int green;
  int blue;
  const int parsedValues = sscanf(
    command.c_str() + prefixLength,
    "%d,%d,%d,%d,%d",
    &start,
    &count,
    &red,
    &green,
    &blue
  );
  if (parsedValues != 5) {
    response = "ERR:INVALID_SEGMENT";
    return true;
  }
  return setWs2812SegmentAt(
    stripIndex,
    start,
    count,
    clampColor(red),
    clampColor(green),
    clampColor(blue),
    response
  );
}

bool handleBuzzerCommand(const String& command, String& response) {

  if (command == "BUZZER?") {
    response =
      String("BUZZER,gpio=") + BUZZER_PIN +
      ",type=active,on=" + (buzzerOutputOn ? "1" : "0") +
      ",pattern=" + buzzerPatternName(buzzerPattern) +
      ",repeating=" + (buzzerPatternRepeats ? "1" : "0");

    return true;
  }

  if (!command.startsWith("BUZZER:")) {
    return false;
  }

  const String action = command.substring(7);

  if (!startBuzzerFromText(action)) {
    response = "ERR:INVALID_BUZZER_PATTERN";
    return true;
  }

  response = String("OK:") + buzzerPatternName(buzzerPattern);
  return true;
}

void handleCommand(String line) {

  line.trim();

  if (!line.startsWith("NOPAL:")) {
    return;
  }

  String command =
    line.substring(6);

  command.trim();

  if (command == "ID?") {
    sendIdentification();
    return;
  }

  if (command == "NET?") {
    sendNetworkIdentification();
    return;
  }

  if (command == "BLE:STATUS?") {
#if defined(ESP32)
    Serial.print("BLE,configured=");
    Serial.print(bleScreenConfigured() ? 1 : 0);
    Serial.print(",connected=");
    Serial.println(bleScreenIsConnected() ? 1 : 0);
#else
    Serial.println("ERR:UNSUPPORTED_PLATFORM");
#endif
    return;
  }

#if DHT_ENABLE
  if (command == "DHT?") {
    String response;
    handleDhtCommand(response);
    Serial.println(response);
    return;
  }
#endif

  {
    String response;

    if (handleRelayCommand(command, response)) {
      Serial.println(response);
      return;
    }
  }

  {
    String response;

    if (handleBuzzerCommand(command, response)) {
      Serial.println(response);
      return;
    }
  }

#if PWM_LED_ENABLE

  if (command.startsWith("LED:")) {
    String response;
    parseAndSetColor(command, 4, setPwmLedColor, response);
    Serial.println(response);
    return;
  }

#endif

#if WS2812_ENABLE

  if (command.startsWith("WSSEG:")) {
    String response;
    parseAndSetSegment(command, 6, response, 0);
    Serial.println(response);
    return;
  }

  if (command.startsWith("WSSEG2:")) {
    String response;
    parseAndSetSegment(command, 7, response, 1);
    Serial.println(response);
    return;
  }

  if (command.startsWith("WSSEG3:")) {
    String response;
    parseAndSetSegment(command, 7, response, 2);
    Serial.println(response);
    return;
  }

  if (command.startsWith("WS:")) {
    String response;
    parseAndSetColor(command, 3, setWs2812Color, response);
    Serial.println(response);
    return;
  }

  if (command.startsWith("WS2:")) {
    String response;
    parseAndSetColor(command, 4, setWs2812Color2, response);
    Serial.println(response);
    return;
  }

  if (command.startsWith("WS3:")) {
    String response;
    parseAndSetColor(command, 4, setWs2812Color3, response);
    Serial.println(response);
    return;
  }

#endif

  Serial.println("ERR:UNKNOWN_COMMAND");
}

void setup() {
  Serial.begin(115200);

  inputLine.reserve(128);

  for (uint8_t index = 0; index < RELAY_COUNT; index++) {
    pinMode(RELAY_PINS[index], OUTPUT);
    setRelay(index, false);
  }

  initializeBuzzerSafely();

#if STATUS_LED_ENABLE

  pinMode(STATUS_LED_PIN, OUTPUT);
  setStatusLed(true);
#endif

  setupPwmLed();

  setPwmLedColor(0, 0, 0);

#if WS2812_ENABLE

  strip.begin();
  strip.clear();
  strip.show();

  if (ws2812StripEnabled(1)) {
    strip2.begin();
    strip2.clear();
    strip2.show();
  }
  if (ws2812StripEnabled(2)) {
    strip3.begin();
    strip3.clear();
    strip3.show();
  }

  playStartupAnimation();

#endif

  setupWifi();
  setupWebServer();
  NopalCluster::setup();
  NopalPower::setup();

#if defined(ESP32)

  if (bleScreenConfigured()) {
    NimBLEDevice::init("");
    NimBLEDevice::setMTU(247);

    bleScreenLastAttemptMs = millis();
    connectBleScreen();
  }
#endif

  delay(100);

  Serial.println("NOPAL:READY");
}

void loop() {

  serviceNetwork();

  serviceBuzzer();

  while (Serial.available() > 0) {

    const char receivedCharacter =
      static_cast<char>(Serial.read());

    if (receivedCharacter == '\n') {

      inputLine.trim();

      if (!inputLine.isEmpty()) {
        handleCommand(inputLine);
      }

      inputLine = "";

    } else if (receivedCharacter != '\r') {

      if (inputLine.length() < 127) {
        inputLine += receivedCharacter;
      } else {
        inputLine = "";
        Serial.println("ERR:LINE_TOO_LONG");
      }
    }
  }

#if defined(ESP8266)

  yield();

#endif
}