/*
 * NOPAL — LilyGo T-Call SIM800L IP5306 v1.4 / 20200811
 * Firmware dedicado para la placa real, no para un ESP32 genérico.
 *
 * PLACA Y PINES RESERVADOS:
 *   SIM800 UART RX ESP32 : GPIO26  (TX del SIM800)
 *   SIM800 UART TX ESP32 : GPIO27  (RX del SIM800)
 *   SIM800 PWRKEY        : GPIO4
 *   SIM800 RESET         : GPIO5
 *   SIM800 POWER ON      : GPIO23
 *   SIM800 DTR           : GPIO32
 *   SIM800 RI            : GPIO33
 *   IP5306 I2C SDA       : GPIO21
 *   IP5306 I2C SCL       : GPIO22
 *   LED azul integrado   : GPIO13, HIGH = encendido
 *
 * ACCESORIOS SIN CONFLICTOS:
 *   RGB PWM              : GPIO14 / GPIO18 / GPIO19
 *   WS2812               : GPIO25
 *   4 relés              : MCP23017 por I2C, dirección 0x20, GPA0..GPA3
 *
 * IMPORTANTE:
 *   - GPIO16/17 no se usan porque la configuración de esta placa declara PSRAM.
 *   - Los relés no se conectan directamente al MCP23017: usa módulo de relés
 *     con entrada lógica o una etapa con transistor/optoacoplador.
 *   - Las tiras RGB analógicas requieren MOSFETs; ningún GPIO alimenta una tira.
 *   - SIM800L necesita una alimentación estable y se recomienda batería LiPo.
 *
 * DEPENDENCIAS:
 *   - TinyGSM
 *   - ElegantOTA
 *   - Adafruit NeoPixel
 *
 * ARCHIVOS:
 *   - Este .ino
 *   - secrets.h (copia secrets.h.example y edítalo)
 *
 * COMANDOS USB, 115200 baudios, terminados en \n:
 *   NOPAL:ID?
 *   NOPAL:NET?
 *   NOPAL:GSM?
 *   NOPAL:BAT?
 *   NOPAL:MODEM:RESTART
 *   NOPAL:SMS:+521234567890|Mensaje de prueba
 *   NOPAL:R1:ON
 *   NOPAL:R1:OFF
 *   NOPAL:R1?
 *   NOPAL:LED:255,80,0
 *   NOPAL:WS:0,255,0
 *   NOPAL:HELP?
 *
 * LED AZUL INTEGRADO:
 *   - Encendido fijo: SIM800 registrado en la red GSM.
 *   - Parpadeo lento: buscando red / sin registro.
 *   - Parpadeo rápido: módem sin responder o reiniciándose.
 */

#include <Arduino.h>
#include <Wire.h>
#include <WiFi.h>
#include <WiFiClient.h>
#include <WebServer.h>
#include <ESPmDNS.h>
#include <esp_arduino_version.h>

#if __has_include("secrets.h")
  #include "secrets.h"
#else
  #error "Falta secrets.h. Copia secrets.h.example como secrets.h y configura tus datos."
#endif

#define TINY_GSM_MODEM_SIM800
#define TINY_GSM_RX_BUFFER 1024
#define TINY_GSM_DEBUG Serial
#include <TinyGsmClient.h>

#include <ElegantOTA.h>
#include <Adafruit_NeoPixel.h>

// ============================================================================
// IDENTIDAD Y FUNCIONES
// ============================================================================

#define FW_VERSION "2.0.0"
#define BOARD_ID "lilygo-t-call-sim800l-ip5306-v1.4"
#define DEVICE_ROLE "gsm-accessory"

#define ENABLE_GPRS true
#define ENABLE_MCP23017_RELAYS true
#define ENABLE_PWM_RGB true
#define ENABLE_WS2812 true

const uint16_t HTTP_PORT = 80;
const uint32_t WIFI_CONNECT_TIMEOUT_MS = 15000UL;
const uint32_t WIFI_RECONNECT_INTERVAL_MS = 15000UL;
const uint32_t MODEM_BOOT_DELAY_MS = 5500UL;
const uint32_t MODEM_INIT_RETRY_MS = 15000UL;
const uint32_t MODEM_POLL_INTERVAL_MS = 5000UL;
const uint32_t MODEM_OPERATOR_REFRESH_MS = 60000UL;
const uint32_t GPRS_RETRY_INTERVAL_MS = 60000UL;
const uint32_t BATTERY_REFRESH_MS = 30000UL;
const size_t SERIAL_LINE_MAX = 383;

// ============================================================================
// MAPA EXACTO DE LA T-CALL SIM800L IP5306 20200811
// ============================================================================

constexpr uint8_t MODEM_RX_PIN = 26;       // ESP32 RX <- SIM800 TX
constexpr uint8_t MODEM_TX_PIN = 27;       // ESP32 TX -> SIM800 RX
constexpr uint8_t MODEM_PWRKEY_PIN = 4;
constexpr uint8_t MODEM_RST_PIN = 5;
constexpr uint8_t MODEM_POWER_ON_PIN = 23;
constexpr uint8_t MODEM_DTR_PIN = 32;
constexpr uint8_t MODEM_RI_PIN = 33;

constexpr uint8_t I2C_SDA_PIN = 21;
constexpr uint8_t I2C_SCL_PIN = 22;

constexpr uint8_t STATUS_LED_PIN = 13;
constexpr bool STATUS_LED_ACTIVE_LOW = false;

#if ENABLE_PWM_RGB
constexpr uint8_t PWM_LED_PIN_R = 14;
constexpr uint8_t PWM_LED_PIN_G = 18;
constexpr uint8_t PWM_LED_PIN_B = 19;
constexpr bool PWM_RGB_COMMON_ANODE = false;
constexpr uint32_t PWM_FREQUENCY = 5000;
constexpr uint8_t PWM_RESOLUTION = 8;
#endif

#if ENABLE_WS2812
constexpr uint8_t WS2812_PIN = 25;
constexpr uint16_t WS2812_COUNT = 30;
Adafruit_NeoPixel strip(WS2812_COUNT, WS2812_PIN, NEO_GRB + NEO_KHZ800);
#endif

#if ENABLE_MCP23017_RELAYS
constexpr uint8_t MCP23017_ADDRESS = 0x20;
constexpr uint8_t RELAY_COUNT = 4;
constexpr bool RELAY_ACTIVE_LOW = true;

constexpr uint8_t MCP_IODIRA = 0x00;
constexpr uint8_t MCP_GPIOA = 0x12;
constexpr uint8_t MCP_OLATA = 0x14;
#endif

// Comprobaciones básicas para evitar volver a introducir conflictos críticos.
#if ENABLE_PWM_RGB
static_assert(PWM_LED_PIN_R != MODEM_RX_PIN && PWM_LED_PIN_R != MODEM_TX_PIN,
              "Conflicto de pin PWM rojo con UART del modem");
static_assert(PWM_LED_PIN_G != MODEM_RX_PIN && PWM_LED_PIN_G != MODEM_TX_PIN,
              "Conflicto de pin PWM verde con UART del modem");
static_assert(PWM_LED_PIN_B != MODEM_RX_PIN && PWM_LED_PIN_B != MODEM_TX_PIN,
              "Conflicto de pin PWM azul con UART del modem");
#endif
#if ENABLE_WS2812
static_assert(WS2812_PIN != MODEM_PWRKEY_PIN,
              "Conflicto de WS2812 con PWRKEY del modem");
#endif

// ============================================================================
// IP5306
// ============================================================================

constexpr uint8_t IP5306_ADDRESS = 0x75;
constexpr uint8_t IP5306_REG_SYS_CTL0 = 0x00;
constexpr uint8_t IP5306_REG_BAT_LEVEL = 0x78;

bool ip5306Online = false;
bool boostKeepOnEnabled = false;
int batteryPercent = -1;
uint32_t lastBatteryRefreshMs = 0;

bool i2cWriteByte(uint8_t address, uint8_t reg, uint8_t value) {
  Wire.beginTransmission(address);
  Wire.write(reg);
  Wire.write(value);
  return Wire.endTransmission() == 0;
}

bool i2cReadByte(uint8_t address, uint8_t reg, uint8_t& value) {
  Wire.beginTransmission(address);
  Wire.write(reg);

  if (Wire.endTransmission(false) != 0) {
    return false;
  }

  if (Wire.requestFrom(address, static_cast<uint8_t>(1)) != 1) {
    return false;
  }

  value = Wire.read();
  return true;
}

bool setupIp5306() {
  // Valor usado por el ejemplo oficial de LilyGo para mantener activo el boost.
  boostKeepOnEnabled = i2cWriteByte(IP5306_ADDRESS, IP5306_REG_SYS_CTL0, 0x37);
  ip5306Online = boostKeepOnEnabled;
  return boostKeepOnEnabled;
}

int readIp5306BatteryPercent() {
  uint8_t value = 0;

  if (!i2cReadByte(IP5306_ADDRESS, IP5306_REG_BAT_LEVEL, value)) {
    ip5306Online = false;
    return -1;
  }

  ip5306Online = true;

  switch (value & 0xF0) {
    case 0xE0: return 25;
    case 0xC0: return 50;
    case 0x80: return 75;
    case 0x00: return 100;
    default: return 0;
  }
}

void serviceBattery() {
  const uint32_t now = millis();

  if (lastBatteryRefreshMs == 0 || now - lastBatteryRefreshMs >= BATTERY_REFRESH_MS) {
    lastBatteryRefreshMs = now;
    batteryPercent = readIp5306BatteryPercent();
  }
}

// ============================================================================
// MÓDEM SIM800L
// ============================================================================

HardwareSerial SerialAT(1);
TinyGsm modem(SerialAT);

bool modemPowerEnabled = false;
bool modemInitialized = false;
bool modemResponsive = false;
bool gsmRegistered = false;
bool gprsConnected = false;
bool ringDetected = false;

SimStatus simStatus = SIM_ERROR;
int signalQuality = 99;
String modemInfo;
String modemImei;
String simCcid;
String operatorName;
String modemLastError = "booting";

uint32_t modemReadyAtMs = 0;
uint32_t lastModemInitAttemptMs = 0;
uint32_t lastModemPollMs = 0;
uint32_t lastOperatorRefreshMs = 0;
uint32_t lastGprsAttemptMs = 0;
uint32_t lastRingMs = 0;
uint8_t modemInitFailures = 0;

const char* simStatusText() {
  switch (simStatus) {
    case SIM_READY: return "ready";
    case SIM_LOCKED: return "locked";
    case SIM_ANTITHEFT_LOCKED: return "antitheft_locked";
    case SIM_ERROR:
    default: return "error";
  }
}

int signalDbm() {
  if (signalQuality < 0 || signalQuality > 31) {
    return 0;
  }
  return -113 + (2 * signalQuality);
}

uint8_t signalBars() {
  if (signalQuality == 99 || signalQuality < 2) return 0;
  if (signalQuality < 7) return 1;
  if (signalQuality < 12) return 2;
  if (signalQuality < 17) return 3;
  if (signalQuality < 22) return 4;
  return 5;
}

bool gprsCredentialsConfigured() {
#if ENABLE_GPRS
  return strlen(NOPAL_GPRS_APN) > 0 &&
         strcmp(NOPAL_GPRS_APN, "TU_APN") != 0;
#else
  return false;
#endif
}

void pulseModemPowerKey() {
  digitalWrite(MODEM_PWRKEY_PIN, HIGH);
  delay(100);
  digitalWrite(MODEM_PWRKEY_PIN, LOW);
  delay(1100);
  digitalWrite(MODEM_PWRKEY_PIN, HIGH);
}

void resetModemState() {
  modemInitialized = false;
  modemResponsive = false;
  gsmRegistered = false;
  gprsConnected = false;
  simStatus = SIM_ERROR;
  signalQuality = 99;
  modemInfo = "";
  modemImei = "";
  simCcid = "";
  operatorName = "";
  modemLastError = "restarting";
  lastModemInitAttemptMs = 0;
  lastModemPollMs = 0;
  lastOperatorRefreshMs = 0;
  lastGprsAttemptMs = 0;
  modemInitFailures = 0;
}

void powerOnModem() {
  resetModemState();

  digitalWrite(MODEM_RST_PIN, HIGH);
  digitalWrite(MODEM_DTR_PIN, LOW);  // Mantener despierto.
  digitalWrite(MODEM_POWER_ON_PIN, HIGH);
  modemPowerEnabled = true;

  pulseModemPowerKey();
  modemReadyAtMs = millis() + MODEM_BOOT_DELAY_MS;

  Serial.println("NOPAL:MODEM_POWERING_ON");
}

void hardwareRestartModem() {
  Serial.println("NOPAL:MODEM_RESTARTING");

  digitalWrite(MODEM_POWER_ON_PIN, LOW);
  modemPowerEnabled = false;
  delay(1200);

  powerOnModem();
}

void setupModemHardware() {
  pinMode(MODEM_RST_PIN, OUTPUT);
  pinMode(MODEM_PWRKEY_PIN, OUTPUT);
  pinMode(MODEM_POWER_ON_PIN, OUTPUT);
  pinMode(MODEM_DTR_PIN, OUTPUT);
  pinMode(MODEM_RI_PIN, INPUT);

  digitalWrite(MODEM_RST_PIN, HIGH);
  digitalWrite(MODEM_PWRKEY_PIN, HIGH);
  digitalWrite(MODEM_POWER_ON_PIN, LOW);
  digitalWrite(MODEM_DTR_PIN, LOW);

  SerialAT.begin(115200, SERIAL_8N1, MODEM_RX_PIN, MODEM_TX_PIN);
  powerOnModem();
}

void initializeModemIfNeeded() {
  if (!modemPowerEnabled || modemInitialized) {
    return;
  }

  const uint32_t now = millis();

  if (static_cast<int32_t>(now - modemReadyAtMs) < 0) {
    return;
  }

  if (lastModemInitAttemptMs != 0 &&
      now - lastModemInitAttemptMs < MODEM_INIT_RETRY_MS) {
    return;
  }

  lastModemInitAttemptMs = now;
  Serial.println("NOPAL:MODEM_INITIALIZING");

  modemResponsive = modem.init();

  if (!modemResponsive) {
    modemLastError = "no_at_response";
    modemInitFailures++;
    Serial.print("ERR:MODEM_NO_AT_RESPONSE,attempt=");
    Serial.println(modemInitFailures);

    if (modemInitFailures >= 3) {
      Serial.println("WARN:MODEM_AUTOMATIC_POWER_CYCLE");
      hardwareRestartModem();
    }
    return;
  }

  modemInitFailures = 0;
  modemInitialized = true;
  modemLastError = "";
  modemInfo = modem.getModemInfo();
  modemImei = modem.getIMEI();
  simCcid = modem.getSimCCID();
  simStatus = modem.getSimStatus(4000);

  if (simStatus == SIM_LOCKED && strlen(NOPAL_SIM_PIN) > 0) {
    if (modem.simUnlock(NOPAL_SIM_PIN)) {
      delay(500);
      simStatus = modem.getSimStatus(4000);
    }
  }

  Serial.print("NOPAL:MODEM_READY,info=");
  Serial.print(modemInfo);
  Serial.print(",imei=");
  Serial.println(modemImei);
}

void pollModem() {
  if (!modemInitialized) {
    return;
  }

  modemResponsive = modem.testAT(1500);

  if (!modemResponsive) {
    gsmRegistered = false;
    gprsConnected = false;
    modemLastError = "lost_at_response";
    modemInitialized = false;
    modemReadyAtMs = millis() + 2000;
    Serial.println("WARN:MODEM_LOST_AT_RESPONSE");
    return;
  }

  simStatus = modem.getSimStatus(2500);
  gsmRegistered = (simStatus == SIM_READY) && modem.isNetworkConnected();
  signalQuality = modem.getSignalQuality();

  if (!gsmRegistered) {
    gprsConnected = false;
    modemLastError = simStatus == SIM_READY ? "searching_network" : "sim_not_ready";
    return;
  }

  modemLastError = "";

  const uint32_t now = millis();

  if (operatorName.length() == 0 ||
      now - lastOperatorRefreshMs >= MODEM_OPERATOR_REFRESH_MS) {
    lastOperatorRefreshMs = now;
    operatorName = modem.getOperator();
  }

#if ENABLE_GPRS
  if (gprsCredentialsConfigured()) {
    gprsConnected = modem.isGprsConnected();

    if (!gprsConnected &&
        (lastGprsAttemptMs == 0 || now - lastGprsAttemptMs >= GPRS_RETRY_INTERVAL_MS)) {
      lastGprsAttemptMs = now;
      Serial.print("NOPAL:GPRS_CONNECTING,apn=");
      Serial.println(NOPAL_GPRS_APN);

      gprsConnected = modem.gprsConnect(
        NOPAL_GPRS_APN,
        NOPAL_GPRS_USER,
        NOPAL_GPRS_PASSWORD
      );

      Serial.println(gprsConnected ? "NOPAL:GPRS_READY" : "WARN:GPRS_CONNECT_FAILED");
    }
  } else {
    gprsConnected = false;
  }
#endif
}

void serviceRingIndicator() {
  const bool ringNow = digitalRead(MODEM_RI_PIN) == LOW;

  if (ringNow) {
    ringDetected = true;
    lastRingMs = millis();
  } else if (ringDetected && millis() - lastRingMs > 3000) {
    ringDetected = false;
  }
}

void serviceModem() {
  serviceRingIndicator();
  initializeModemIfNeeded();

  if (modemInitialized) {
    modem.maintain();
  }

  const uint32_t now = millis();

  if (modemInitialized &&
      (lastModemPollMs == 0 || now - lastModemPollMs >= MODEM_POLL_INTERVAL_MS)) {
    lastModemPollMs = now;
    pollModem();
  }
}

bool validPhoneNumber(const String& phone) {
  if (phone.length() < 5 || phone.length() > 24) {
    return false;
  }

  for (size_t i = 0; i < phone.length(); i++) {
    const char c = phone.charAt(i);
    if (!(isDigit(c) || (i == 0 && c == '+'))) {
      return false;
    }
  }

  return true;
}

bool sendSms(const String& phone, const String& message, String& error) {
  if (!modemInitialized || !modemResponsive) {
    error = "modem_not_ready";
    return false;
  }

  if (!gsmRegistered) {
    error = "gsm_not_registered";
    return false;
  }

  if (!validPhoneNumber(phone)) {
    error = "invalid_phone";
    return false;
  }

  if (message.length() == 0 || message.length() > 160) {
    error = "message_must_be_1_to_160_chars";
    return false;
  }

  const bool ok = modem.sendSMS(phone, message);
  error = ok ? "" : "send_failed";
  return ok;
}

// ============================================================================
// LED AZUL DE ESTADO
// ============================================================================

void setStatusLed(bool on) {
  digitalWrite(
    STATUS_LED_PIN,
    (on != STATUS_LED_ACTIVE_LOW) ? HIGH : LOW
  );
}

void serviceStatusLed() {
  static uint32_t lastToggleMs = 0;
  static bool ledOn = false;

  if (gsmRegistered) {
    if (!ledOn) {
      ledOn = true;
      setStatusLed(true);
    }
    return;
  }

  const uint32_t interval = modemResponsive ? 500UL : 140UL;
  const uint32_t now = millis();

  if (now - lastToggleMs >= interval) {
    lastToggleMs = now;
    ledOn = !ledOn;
    setStatusLed(ledOn);
  }
}

// ============================================================================
// MCP23017 — 4 RELÉS POR I2C
// ============================================================================

#if ENABLE_MCP23017_RELAYS
bool relayExpanderOnline = false;
uint8_t relayOutputShadow = RELAY_ACTIVE_LOW ? 0x0F : 0x00;

bool mcpWriteRegister(uint8_t reg, uint8_t value) {
  return i2cWriteByte(MCP23017_ADDRESS, reg, value);
}

void setupRelayExpander() {
  relayExpanderOnline = mcpWriteRegister(MCP_IODIRA, 0xF0);

  if (!relayExpanderOnline) {
    Serial.println("WARN:MCP23017_NOT_FOUND,relays=disabled");
    return;
  }

  relayOutputShadow = RELAY_ACTIVE_LOW ? 0x0F : 0x00;
  relayExpanderOnline = mcpWriteRegister(MCP_OLATA, relayOutputShadow);

  Serial.println(relayExpanderOnline
    ? "NOPAL:MCP23017_READY,address=0x20,relays=4"
    : "WARN:MCP23017_WRITE_FAILED");
}

uint8_t availableRelayCount() {
  return relayExpanderOnline ? RELAY_COUNT : 0;
}

bool validRelayIndex(int index) {
  return relayExpanderOnline && index >= 0 && index < RELAY_COUNT;
}

void setRelay(uint8_t index, bool on) {
  if (!validRelayIndex(index)) {
    return;
  }

  const uint8_t mask = static_cast<uint8_t>(1U << index);
  const bool logicalHigh = RELAY_ACTIVE_LOW ? !on : on;

  if (logicalHigh) {
    relayOutputShadow |= mask;
  } else {
    relayOutputShadow &= static_cast<uint8_t>(~mask);
  }

  if (!mcpWriteRegister(MCP_OLATA, relayOutputShadow)) {
    relayExpanderOnline = false;
    Serial.println("ERR:MCP23017_LOST");
  }
}

bool getRelay(uint8_t index) {
  if (!validRelayIndex(index)) {
    return false;
  }

  const bool pinHigh = (relayOutputShadow & (1U << index)) != 0;
  return RELAY_ACTIVE_LOW ? !pinHigh : pinHigh;
}
#else
void setupRelayExpander() {}
uint8_t availableRelayCount() { return 0; }
bool validRelayIndex(int) { return false; }
void setRelay(uint8_t, bool) {}
bool getRelay(uint8_t) { return false; }
#endif

// ============================================================================
// RGB PWM
// ============================================================================

#if ENABLE_PWM_RGB
#if ESP_ARDUINO_VERSION_MAJOR < 3
constexpr uint8_t PWM_CHANNEL_R = 0;
constexpr uint8_t PWM_CHANNEL_G = 1;
constexpr uint8_t PWM_CHANNEL_B = 2;
#endif

uint8_t pwmRed = 0;
uint8_t pwmGreen = 0;
uint8_t pwmBlue = 0;

uint8_t pwmDuty(uint8_t value) {
  return PWM_RGB_COMMON_ANODE ? static_cast<uint8_t>(255 - value) : value;
}

void setupPwmLed() {
#if ESP_ARDUINO_VERSION_MAJOR >= 3
  ledcAttach(PWM_LED_PIN_R, PWM_FREQUENCY, PWM_RESOLUTION);
  ledcAttach(PWM_LED_PIN_G, PWM_FREQUENCY, PWM_RESOLUTION);
  ledcAttach(PWM_LED_PIN_B, PWM_FREQUENCY, PWM_RESOLUTION);
#else
  ledcSetup(PWM_CHANNEL_R, PWM_FREQUENCY, PWM_RESOLUTION);
  ledcSetup(PWM_CHANNEL_G, PWM_FREQUENCY, PWM_RESOLUTION);
  ledcSetup(PWM_CHANNEL_B, PWM_FREQUENCY, PWM_RESOLUTION);

  ledcAttachPin(PWM_LED_PIN_R, PWM_CHANNEL_R);
  ledcAttachPin(PWM_LED_PIN_G, PWM_CHANNEL_G);
  ledcAttachPin(PWM_LED_PIN_B, PWM_CHANNEL_B);
#endif
}

void setPwmLedColor(uint8_t red, uint8_t green, uint8_t blue) {
  pwmRed = red;
  pwmGreen = green;
  pwmBlue = blue;

#if ESP_ARDUINO_VERSION_MAJOR >= 3
  ledcWrite(PWM_LED_PIN_R, pwmDuty(red));
  ledcWrite(PWM_LED_PIN_G, pwmDuty(green));
  ledcWrite(PWM_LED_PIN_B, pwmDuty(blue));
#else
  ledcWrite(PWM_CHANNEL_R, pwmDuty(red));
  ledcWrite(PWM_CHANNEL_G, pwmDuty(green));
  ledcWrite(PWM_CHANNEL_B, pwmDuty(blue));
#endif
}
#else
void setupPwmLed() {}
void setPwmLedColor(uint8_t, uint8_t, uint8_t) {}
#endif

// ============================================================================
// WS2812
// ============================================================================

#if ENABLE_WS2812
uint8_t wsRed = 0;
uint8_t wsGreen = 0;
uint8_t wsBlue = 0;

void setupWs2812() {
  strip.begin();
  strip.clear();
  strip.show();
}

void setWs2812Color(uint8_t red, uint8_t green, uint8_t blue) {
  wsRed = red;
  wsGreen = green;
  wsBlue = blue;
  strip.fill(strip.Color(red, green, blue));
  strip.show();
}
#else
void setupWs2812() {}
void setWs2812Color(uint8_t, uint8_t, uint8_t) {}
#endif

// ============================================================================
// WI-FI, AP DE RECUPERACIÓN Y mDNS
// ============================================================================

WebServer server(HTTP_PORT);

bool webServerStarted = false;
bool mdnsStarted = false;
bool recoveryApActive = false;
bool wifiWasConnected = false;
uint32_t lastWifiReconnectAttemptMs = 0;
String recoveryApSsid;

String chipSuffix() {
  char suffix[9] = {0};
  const uint32_t chipId = static_cast<uint32_t>(ESP.getEfuseMac() & 0xFFFFFFULL);
  snprintf(suffix, sizeof(suffix), "%06lX", static_cast<unsigned long>(chipId));
  return String(suffix);
}

bool wifiCredentialsConfigured() {
  const String ssid = String(NOPAL_WIFI_SSID);
  return ssid.length() > 0 && ssid != "TU_RED_WIFI";
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
  if (WiFi.status() == WL_CONNECTED && recoveryApActive) return "sta+ap";
  if (WiFi.status() == WL_CONNECTED) return "sta";
  if (recoveryApActive) return "ap";
  return "offline";
}

void startRecoveryAccessPoint() {
  if (recoveryApActive) {
    return;
  }

  recoveryApSsid = String("NOPAL-TCALL-") + chipSuffix();
  WiFi.mode(WIFI_AP_STA);

  bool started = false;

  if (strlen(NOPAL_AP_PASSWORD) >= 8) {
    started = WiFi.softAP(recoveryApSsid.c_str(), NOPAL_AP_PASSWORD);
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
  WiFi.setHostname(NOPAL_HOSTNAME);
  WiFi.setAutoReconnect(true);
  WiFi.persistent(false);

  if (!wifiCredentialsConfigured()) {
    Serial.println("WARN:WIFI_CREDENTIALS_NOT_CONFIGURED");
    startRecoveryAccessPoint();
    return;
  }

  WiFi.mode(WIFI_STA);
  WiFi.begin(NOPAL_WIFI_SSID, NOPAL_WIFI_PASSWORD);

  Serial.print("NOPAL:WIFI_CONNECTING,ssid=");
  Serial.println(NOPAL_WIFI_SSID);

  const uint32_t startedAt = millis();

  while (WiFi.status() != WL_CONNECTED &&
         millis() - startedAt < WIFI_CONNECT_TIMEOUT_MS) {
    serviceStatusLed();
    delay(25);
  }

  if (WiFi.status() == WL_CONNECTED) {
    wifiWasConnected = true;
    Serial.print("NOPAL:WIFI_READY,ip=");
    Serial.print(WiFi.localIP());
    Serial.print(",rssi=");
    Serial.println(WiFi.RSSI());
    startMdnsIfPossible();
  } else {
    Serial.println("WARN:WIFI_CONNECTION_TIMEOUT");
    startRecoveryAccessPoint();
  }
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

    if (mdnsStarted) {
      MDNS.end();
      mdnsStarted = false;
    }
  }

  if (!wifiCredentialsConfigured()) {
    startRecoveryAccessPoint();
    return;
  }

  const uint32_t now = millis();

  if (now - lastWifiReconnectAttemptMs < WIFI_RECONNECT_INTERVAL_MS) {
    return;
  }

  lastWifiReconnectAttemptMs = now;
  startRecoveryAccessPoint();
  Serial.println("NOPAL:WIFI_RECONNECTING");
  WiFi.begin(NOPAL_WIFI_SSID, NOPAL_WIFI_PASSWORD);
}

// ============================================================================
// JSON Y PANEL WEB
// ============================================================================

String jsonEscape(const String& input) {
  String output;
  output.reserve(input.length() + 16);

  for (size_t i = 0; i < input.length(); i++) {
    const char c = input.charAt(i);
    switch (c) {
      case '\\': output += "\\\\"; break;
      case '"': output += "\\\""; break;
      case '\n': output += "\\n"; break;
      case '\r': output += "\\r"; break;
      case '\t': output += "\\t"; break;
      default: output += c; break;
    }
  }

  return output;
}

String boolJson(bool value) {
  return value ? "true" : "false";
}

String buildStatusJson() {
  String json;
  json.reserve(1400);

  json += "{";

  json += "\"role\":\"";
  json += DEVICE_ROLE;
  json += "\",";

  json += "\"board\":\"";
  json += BOARD_ID;
  json += "\",";

  json += "\"firmware\":\"";
  json += FW_VERSION;
  json += "\",";

  json += "\"hostname\":\"";
  json += jsonEscape(String(NOPAL_HOSTNAME));
  json += "\",";

  json += "\"uptime_ms\":";
  json += String(millis());
  json += ",";

  json += "\"free_heap\":";
  json += String(ESP.getFreeHeap());
  json += ",";

  json += "\"wifi\":{";
  json += "\"connected\":";
  json += boolJson(WiFi.status() == WL_CONNECTED);
  json += ",";
  json += "\"mode\":\"";
  json += wifiModeText();
  json += "\",";
  json += "\"ssid\":\"";
  if (WiFi.status() == WL_CONNECTED) {
    json += jsonEscape(WiFi.SSID());
  }
  json += "\",";
  json += "\"ip\":\"";
  json += activeIpAddress();
  json += "\",";
  json += "\"rssi\":";
  json += String(WiFi.status() == WL_CONNECTED ? WiFi.RSSI() : 0);
  json += ",";
  json += "\"recovery_ap\":";
  json += boolJson(recoveryApActive);
  json += ",";
  json += "\"recovery_ssid\":\"";
  if (recoveryApActive) {
    json += jsonEscape(recoveryApSsid);
  }
  json += "\"";
  json += "},";

  json += "\"modem\":{";
  json += "\"power\":";
  json += boolJson(modemPowerEnabled);
  json += ",";
  json += "\"responsive\":";
  json += boolJson(modemResponsive);
  json += ",";
  json += "\"initialized\":";
  json += boolJson(modemInitialized);
  json += ",";
  json += "\"sim_status\":\"";
  json += simStatusText();
  json += "\",";
  json += "\"registered\":";
  json += boolJson(gsmRegistered);
  json += ",";
  json += "\"operator\":\"";
  json += jsonEscape(operatorName);
  json += "\",";
  json += "\"signal_csq\":";
  json += String(signalQuality);
  json += ",";
  json += "\"signal_dbm\":";
  json += String(signalDbm());
  json += ",";
  json += "\"signal_bars\":";
  json += String(signalBars());
  json += ",";
  json += "\"gprs_configured\":";
  json += boolJson(gprsCredentialsConfigured());
  json += ",";
  json += "\"gprs_connected\":";
  json += boolJson(gprsConnected);
  json += ",";
  json += "\"ring\":";
  json += boolJson(ringDetected);
  json += ",";
  json += "\"imei\":\"";
  json += jsonEscape(modemImei);
  json += "\",";
  json += "\"ccid\":\"";
  json += jsonEscape(simCcid);
  json += "\",";
  json += "\"info\":\"";
  json += jsonEscape(modemInfo);
  json += "\",";
  json += "\"last_error\":\"";
  json += jsonEscape(modemLastError);
  json += "\"";
  json += "},";

  json += "\"power\":{";
  json += "\"ip5306_online\":";
  json += boolJson(ip5306Online);
  json += ",";
  json += "\"boost_keep_on\":";
  json += boolJson(boostKeepOnEnabled);
  json += ",";
  json += "\"battery_percent\":";
  json += String(batteryPercent);
  json += "},";

  json += "\"io\":{";
  json += "\"relays\":";
  json += String(availableRelayCount());
  json += ",";
  json += "\"relay_expander_online\":";
  json += boolJson(availableRelayCount() > 0);
  json += ",";
  json += "\"pwm_led\":";
  json += boolJson(ENABLE_PWM_RGB);
  json += ",";
  json += "\"ws2812\":";
  json += boolJson(ENABLE_WS2812);
  json += ",";
  json += "\"ws2812_count\":";
#if ENABLE_WS2812
  json += String(WS2812_COUNT);
#else
  json += "0";
#endif
  json += "},";

  json += "\"ota\":{\"enabled\":true,\"path\":\"/update\"}";
  json += "}";

  return json;
}

const char PANEL_HTML[] PROGMEM = R"NOPALHTML(
<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>NOPAL T-Call</title>
<style>
:root{--bg:#07130f;--card:#10231b;--line:#244b39;--green:#73f0a7;--text:#e9fff2;--muted:#92b7a2;--warn:#ffc85c;--bad:#ff7272}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 90% 0,#173729 0,transparent 35%),var(--bg);color:var(--text);font:14px system-ui,Segoe UI,sans-serif}
main{max-width:1050px;margin:auto;padding:22px}.top{display:flex;justify-content:space-between;align-items:center;gap:15px;margin-bottom:18px}h1{margin:0;font-size:25px}.tag{color:var(--green);font-weight:700}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}.card{background:linear-gradient(145deg,#12271e,#0c1c16);border:1px solid var(--line);border-radius:16px;padding:15px;box-shadow:0 14px 35px #0005}.card h2{font-size:13px;text-transform:uppercase;letter-spacing:.12em;color:var(--muted);margin:0 0 12px}.value{font-size:22px;font-weight:800}.row{display:flex;justify-content:space-between;gap:10px;padding:5px 0;border-bottom:1px solid #ffffff0d}.row:last-child{border:0}.ok{color:var(--green)}.bad{color:var(--bad)}.warn{color:var(--warn)}button,a.btn,input,textarea{border-radius:10px;border:1px solid var(--line);background:#0b1913;color:var(--text);padding:10px}button,a.btn{cursor:pointer;background:#173d2b;text-decoration:none;font-weight:750}button:hover,a.btn:hover{border-color:var(--green)}input,textarea{width:100%;margin:5px 0 9px}textarea{min-height:76px;resize:vertical}.actions{display:flex;flex-wrap:wrap;gap:8px}.wide{grid-column:1/-1}.foot{color:var(--muted);margin-top:14px;font-size:12px}
</style></head><body><main>
<div class="top"><div><div class="tag">NOPAL</div><h1>T-Call SIM800L</h1></div><a class="btn" href="/update">Actualizar OTA</a></div>
<div class="grid">
<section class="card"><h2>GSM</h2><div id="gsm" class="value">Cargando…</div><div id="gsmRows"></div></section>
<section class="card"><h2>Wi-Fi</h2><div id="wifi" class="value">Cargando…</div><div id="wifiRows"></div></section>
<section class="card"><h2>Energía</h2><div id="battery" class="value">—</div><div id="powerRows"></div></section>
<section class="card"><h2>Sistema</h2><div id="systemRows"></div></section>
<section class="card wide"><h2>Acciones autenticadas</h2>
<div class="grid"><div><input id="user" placeholder="Usuario OTA"><input id="pass" type="password" placeholder="Contraseña OTA"></div>
<div><input id="phone" placeholder="Teléfono, ej. +521..."><textarea id="message" maxlength="160" placeholder="Mensaje SMS, máximo 160 caracteres"></textarea></div></div>
<div class="actions"><button onclick="sendSms()">Enviar SMS</button><button onclick="restartModem()">Reiniciar SIM800</button><button onclick="relay(1,true)">Relé 1 ON</button><button onclick="relay(1,false)">Relé 1 OFF</button></div>
<div id="result" class="foot"></div></section>
</div><div class="foot">LED azul fijo = GSM conectado · parpadeando = buscando o reiniciando.</div>
<script>
const $=id=>document.getElementById(id);const row=(a,b)=>`<div class="row"><span>${a}</span><b>${b}</b></div>`;
function auth(){return 'Basic '+btoa($('user').value+':'+$('pass').value)}
async function refresh(){try{const d=await fetch('/api/status',{cache:'no-store'}).then(r=>r.json());
$('gsm').textContent=d.modem.registered?'CONECTADO':'SIN RED';$('gsm').className='value '+(d.modem.registered?'ok':'warn');
$('gsmRows').innerHTML=row('SIM',d.modem.sim_status)+row('Operador',d.modem.operator||'—')+row('Señal',d.modem.signal_bars+'/5 · '+d.modem.signal_csq+' CSQ')+row('GPRS',d.modem.gprs_connected?'Sí':'No')+row('Error',d.modem.last_error||'Ninguno');
$('wifi').textContent=d.wifi.connected?'CONECTADO':d.wifi.mode.toUpperCase();$('wifi').className='value '+(d.wifi.connected?'ok':'warn');
$('wifiRows').innerHTML=row('SSID',d.wifi.ssid||d.wifi.recovery_ssid||'—')+row('IP',d.wifi.ip)+row('RSSI',d.wifi.rssi+' dBm');
$('battery').textContent=d.power.battery_percent<0?'NO LEÍDA':d.power.battery_percent+'%';$('powerRows').innerHTML=row('IP5306',d.power.ip5306_online?'OK':'Error')+row('Boost keep-on',d.power.boost_keep_on?'Activo':'No');
$('systemRows').innerHTML=row('Firmware',d.firmware)+row('Placa',d.board)+row('Uptime',Math.floor(d.uptime_ms/1000)+' s')+row('Heap',d.free_heap+' bytes')+row('Relés',d.io.relays);
}catch(e){$('gsm').textContent='SIN RESPUESTA';$('gsm').className='value bad'}}
async function post(url,data){const body=new URLSearchParams(data);const r=await fetch(url,{method:'POST',headers:{Authorization:auth(),'Content-Type':'application/x-www-form-urlencoded'},body});const t=await r.text();$('result').textContent=t;if(!r.ok)throw new Error(t);return t}
async function sendSms(){try{await post('/api/sms',{phone:$('phone').value,message:$('message').value})}catch(e){}}
async function restartModem(){try{await post('/api/modem/restart',{})}catch(e){}}
async function relay(n,on){try{await post('/api/relay',{n,on:on?'1':'0'})}catch(e){}}
setInterval(refresh,2500);refresh();
</script></main></body></html>
)NOPALHTML";

bool checkApiAuth() {
  if (server.authenticate(NOPAL_OTA_USERNAME, NOPAL_OTA_PASSWORD)) {
    return true;
  }
  server.requestAuthentication();
  return false;
}

uint8_t clampColor(int value) {
  if (value < 0) return 0;
  if (value > 255) return 255;
  return static_cast<uint8_t>(value);
}

bool parseAndSetColor(
  const String& command,
  uint8_t prefixLength,
  void (*setColor)(uint8_t, uint8_t, uint8_t),
  String& response
) {
  int red = 0;
  int green = 0;
  int blue = 0;

  if (sscanf(command.c_str() + prefixLength, "%d,%d,%d", &red, &green, &blue) != 3) {
    response = "ERR:INVALID_RGB";
    return false;
  }

  setColor(clampColor(red), clampColor(green), clampColor(blue));
  response = "OK";
  return true;
}

bool handleRelayCommand(const String& command, String& response) {
  if (command.length() < 2 || command.charAt(0) != 'R') {
    return false;
  }

  if (availableRelayCount() == 0) {
    response = "ERR:RELAY_EXPANDER_OFFLINE";
    return true;
  }

  if (command.endsWith("?")) {
    const int relayNumber = command.substring(1, command.length() - 1).toInt();
    const int relayIndex = relayNumber - 1;

    if (!validRelayIndex(relayIndex)) {
      response = "ERR:INVALID_RELAY";
      return true;
    }

    response = getRelay(relayIndex) ? "ON" : "OFF";
    return true;
  }

  const int colon = command.indexOf(':');
  if (colon <= 1) {
    return false;
  }

  const int relayIndex = command.substring(1, colon).toInt() - 1;
  if (!validRelayIndex(relayIndex)) {
    response = "ERR:INVALID_RELAY";
    return true;
  }

  String action = command.substring(colon + 1);
  action.trim();
  action.toUpperCase();

  if (action == "ON") {
    setRelay(relayIndex, true);
    response = "OK";
  } else if (action == "OFF") {
    setRelay(relayIndex, false);
    response = "OK";
  } else {
    response = "ERR:INVALID_ACTION";
  }

  return true;
}

void setupWebServer() {
  server.on("/", HTTP_GET, []() {
    server.send_P(200, "text/html; charset=utf-8", PANEL_HTML);
  });

  server.on("/api/status", HTTP_GET, []() {
    server.sendHeader("Cache-Control", "no-store");
    server.send(200, "application/json; charset=utf-8", buildStatusJson());
  });

  server.on("/health", HTTP_GET, []() {
    server.send(200, "text/plain; charset=utf-8", "OK");
  });

  server.on("/api/modem/restart", HTTP_POST, []() {
    if (!checkApiAuth()) return;
    hardwareRestartModem();
    server.send(202, "application/json", "{\"ok\":true,\"status\":\"restarting\"}");
  });

  server.on("/api/sms", HTTP_POST, []() {
    if (!checkApiAuth()) return;

    String error;
    const bool ok = sendSms(server.arg("phone"), server.arg("message"), error);

    if (ok) {
      server.send(200, "application/json", "{\"ok\":true}");
    } else {
      String body = String("{\"ok\":false,\"error\":\"") + jsonEscape(error) + "\"}";
      server.send(400, "application/json", body);
    }
  });

  server.on("/api/relay", HTTP_GET, []() {
    if (!checkApiAuth()) return;

    String response = "ERR:INVALID_RELAY";
    handleRelayCommand(String("R") + server.arg("n") + "?", response);
    server.send(response.startsWith("ERR") ? 400 : 200, "text/plain", response);
  });

  server.on("/api/relay", HTTP_POST, []() {
    if (!checkApiAuth()) return;

    const bool on = server.arg("on") == "true" || server.arg("on") == "1";
    String response = "ERR:INVALID_RELAY";
    handleRelayCommand(String("R") + server.arg("n") + ":" + (on ? "ON" : "OFF"), response);
    server.send(response.startsWith("ERR") ? 400 : 200, "text/plain", response);
  });

  server.on("/api/led", HTTP_POST, []() {
    if (!checkApiAuth()) return;

    const String mode = server.arg("mode");
    const String rgb = server.arg("r") + "," + server.arg("g") + "," + server.arg("b");
    String response = "ERR:UNSUPPORTED_MODE";

#if ENABLE_PWM_RGB
    if (mode == "pwm") {
      parseAndSetColor(String("LED:") + rgb, 4, setPwmLedColor, response);
    }
#endif
#if ENABLE_WS2812
    if (mode == "ws2812") {
      parseAndSetColor(String("WS:") + rgb, 3, setWs2812Color, response);
    }
#endif

    server.send(response.startsWith("ERR") ? 400 : 200, "text/plain", response);
  });

  server.onNotFound([]() {
    server.send(404, "application/json", "{\"error\":\"not_found\"}");
  });

  ElegantOTA.begin(&server, NOPAL_OTA_USERNAME, NOPAL_OTA_PASSWORD);
  server.begin();
  webServerStarted = true;

  Serial.print("NOPAL:HTTP_READY,ip=");
  Serial.print(activeIpAddress());
  Serial.println(",ota=/update");
}

void serviceNetwork() {
  maintainWifiConnection();

  if (webServerStarted) {
    server.handleClient();
    ElegantOTA.loop();
  }
}

// ============================================================================
// IDENTIFICACIÓN NOPAL Y COMANDOS SERIAL
// ============================================================================

void sendIdentification() {
  Serial.print("NOPAL,role=" DEVICE_ROLE);
  Serial.print(",board=" BOARD_ID);
  Serial.print(",chip=");
  Serial.print(ESP.getChipModel());
  Serial.print(",fw=" FW_VERSION);
  Serial.print(",relays=");
  Serial.print(availableRelayCount());
  Serial.print(",pwm_led=");
  Serial.print(ENABLE_PWM_RGB ? 1 : 0);
  Serial.print(",ws2812=");
  Serial.print(ENABLE_WS2812 ? 1 : 0);
  Serial.print(",ws2812_count=");
#if ENABLE_WS2812
  Serial.print(WS2812_COUNT);
#else
  Serial.print(0);
#endif
  Serial.print(",wifi=1,wifi_connected=");
  Serial.print(WiFi.status() == WL_CONNECTED ? 1 : 0);
  Serial.print(",wifi_mode=");
  Serial.print(wifiModeText());
  Serial.print(",hostname=");
  Serial.print(NOPAL_HOSTNAME);
  Serial.print(",ip=");
  Serial.print(activeIpAddress());
  Serial.print(",gsm=1,gsm_registered=");
  Serial.print(gsmRegistered ? 1 : 0);
  Serial.print(",signal_csq=");
  Serial.print(signalQuality);
  Serial.print(",battery_percent=");
  Serial.print(batteryPercent);
  Serial.print(",ota=1,ota_path=/update,uptime_ms=");
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
  if (WiFi.status() == WL_CONNECTED) Serial.print(WiFi.SSID());
  Serial.print(",ip=");
  Serial.print(activeIpAddress());
  Serial.print(",rssi=");
  Serial.print(WiFi.status() == WL_CONNECTED ? WiFi.RSSI() : 0);
  Serial.print(",recovery_ap=");
  Serial.print(recoveryApActive ? 1 : 0);
  Serial.print(",recovery_ssid=");
  if (recoveryApActive) Serial.print(recoveryApSsid);
  Serial.print(",ota_url=http://");
  Serial.print(activeIpAddress());
  Serial.println("/update");
}

void sendGsmIdentification() {
  Serial.print("GSM,power=");
  Serial.print(modemPowerEnabled ? 1 : 0);
  Serial.print(",responsive=");
  Serial.print(modemResponsive ? 1 : 0);
  Serial.print(",initialized=");
  Serial.print(modemInitialized ? 1 : 0);
  Serial.print(",sim=");
  Serial.print(simStatusText());
  Serial.print(",registered=");
  Serial.print(gsmRegistered ? 1 : 0);
  Serial.print(",operator=");
  Serial.print(operatorName);
  Serial.print(",signal_csq=");
  Serial.print(signalQuality);
  Serial.print(",signal_dbm=");
  Serial.print(signalDbm());
  Serial.print(",signal_bars=");
  Serial.print(signalBars());
  Serial.print(",gprs=");
  Serial.print(gprsConnected ? 1 : 0);
  Serial.print(",ring=");
  Serial.print(ringDetected ? 1 : 0);
  Serial.print(",imei=");
  Serial.print(modemImei);
  Serial.print(",ccid=");
  Serial.print(simCcid);
  Serial.print(",error=");
  Serial.println(modemLastError);
}

void sendBatteryIdentification() {
  Serial.print("BAT,ip5306=");
  Serial.print(ip5306Online ? 1 : 0);
  Serial.print(",boost_keep_on=");
  Serial.print(boostKeepOnEnabled ? 1 : 0);
  Serial.print(",percent=");
  Serial.println(batteryPercent);
}

void sendHelp() {
  Serial.println("COMMANDS:ID?,NET?,GSM?,BAT?,MODEM:RESTART,SMS:<phone>|<message>,R<n>:ON,R<n>:OFF,R<n>?,LED:r,g,b,WS:r,g,b");
}

void handleCommand(String line) {
  line.trim();

  if (!line.startsWith("NOPAL:")) {
    return;
  }

  String command = line.substring(6);
  command.trim();

  if (command == "ID?") {
    sendIdentification();
    return;
  }

  if (command == "NET?") {
    sendNetworkIdentification();
    return;
  }

  if (command == "GSM?" || command == "MODEM?") {
    sendGsmIdentification();
    return;
  }

  if (command == "BAT?") {
    sendBatteryIdentification();
    return;
  }

  if (command == "HELP?") {
    sendHelp();
    return;
  }

  if (command == "MODEM:RESTART") {
    hardwareRestartModem();
    Serial.println("OK");
    return;
  }

  if (command.startsWith("SMS:")) {
    const String payload = command.substring(4);
    const int separator = payload.indexOf('|');

    if (separator <= 0) {
      Serial.println("ERR:SMS_FORMAT_USE_PHONE_PIPE_MESSAGE");
      return;
    }

    const String phone = payload.substring(0, separator);
    const String message = payload.substring(separator + 1);
    String error;

    if (sendSms(phone, message, error)) {
      Serial.println("OK");
    } else {
      Serial.print("ERR:");
      Serial.println(error);
    }
    return;
  }

  {
    String response;
    if (handleRelayCommand(command, response)) {
      Serial.println(response);
      return;
    }
  }

#if ENABLE_PWM_RGB
  if (command.startsWith("LED:")) {
    String response;
    parseAndSetColor(command, 4, setPwmLedColor, response);
    Serial.println(response);
    return;
  }
#endif

#if ENABLE_WS2812
  if (command.startsWith("WS:")) {
    String response;
    parseAndSetColor(command, 3, setWs2812Color, response);
    Serial.println(response);
    return;
  }
#endif

  Serial.println("ERR:UNKNOWN_COMMAND");
}

// ============================================================================
// SETUP Y LOOP
// ============================================================================

String inputLine;

void setup() {
  Serial.begin(115200);
  delay(50);
  inputLine.reserve(SERIAL_LINE_MAX + 1);

  pinMode(STATUS_LED_PIN, OUTPUT);
  setStatusLed(false);

  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);

  if (setupIp5306()) {
    Serial.println("NOPAL:IP5306_READY,boost_keep_on=1");
  } else {
    Serial.println("WARN:IP5306_NOT_RESPONDING");
  }

  setupRelayExpander();
  setupPwmLed();
  setPwmLedColor(0, 0, 0);
  setupWs2812();
  setWs2812Color(0, 0, 0);

  setupModemHardware();
  setupWifi();
  setupWebServer();
  serviceBattery();

  Serial.println("NOPAL:READY");
  sendIdentification();
}

void loop() {
  serviceNetwork();
  serviceModem();
  serviceBattery();
  serviceStatusLed();

  while (Serial.available() > 0) {
    const char c = static_cast<char>(Serial.read());

    if (c == '\n') {
      inputLine.trim();
      if (inputLine.length() > 0) {
        handleCommand(inputLine);
      }
      inputLine = "";
    } else if (c != '\r') {
      if (inputLine.length() < SERIAL_LINE_MAX) {
        inputLine += c;
      } else {
        inputLine = "";
        Serial.println("ERR:LINE_TOO_LONG");
      }
    }
  }

  delay(2);
}
