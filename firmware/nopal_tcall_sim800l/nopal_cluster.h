#pragma once

// ============================================================================
// NOPAL CLUSTER — Fase 1: descubrimiento y elección de líder
// ============================================================================
//
// Módulo independiente y desactivable (NOPAL_CLUSTER_ENABLE=0 por defecto).
// Implementa la máquina de estados BOOT -> DISCOVERY -> MASTER/SLAVE descrita
// en el documento de diseño "NOPAL Cluster" (2026-08-24).
//
// Resumen del protocolo (ver el documento para el detalle completo):
//   - Descubrimiento: broadcast UDP en el puerto NOPAL_CLUSTER_UDP_PORT.
//     Mensajes de texto "TIPO|cluster_id|mac|peso[|extra]".
//   - Elección: gana el mayor "peso" (ESP32 dual-core > ESP8266 un núcleo);
//     empate se resuelve con la MAC más baja (comparación de texto).
//   - Alta de esclavo y heartbeat: HTTP normal contra el maestro, reusando
//     el WebServer que el firmware ya levanta (server.on(...) más abajo).
//   - Split-brain: el maestro anuncia su presencia por broadcast cada pocos
//     segundos (MASTER_ANNOUNCE); si dos maestros se escuchan entre sí, el
//     de menor peso/MAC cede y pasa a esclavo del otro.
//
// Integración en el .ino principal (fuera de este archivo):
//   1. #include "nopal_cluster.h"  -- DESPUÉS de declarar el objeto `server`
//      (WebServer/ESP8266WebServer) y de incluir secrets.h.
//   2. En setup(), tras setupWifi(): NopalCluster::setup();
//   3. En setupWebServer(), una línea: NopalCluster::registerHttpRoutes();
//   4. En loop(), dentro de serviceNetwork() o junto a ella: NopalCluster::service();
//
// Nada de esto se activa solo: si NOPAL_CLUSTER_ENABLE no está en 1 en
// secrets.h, todas las funciones de este archivo quedan vacías (no-op) y
// no consumen RAM ni tiempo de CPU.

#ifndef NOPAL_CLUSTER_ENABLE
  #define NOPAL_CLUSTER_ENABLE 0
#endif

#if NOPAL_CLUSTER_ENABLE

#ifndef NOPAL_CLUSTER_ID
  #define NOPAL_CLUSTER_ID "nopal-default"
#endif

// Aviso a NOPAL cuando una placa entra o sale del clúster. Sin
// NOPAL_SERVER_HOST no se manda nada: el clúster funciona igual, solo que
// NOPAL no se entera hasta que alguien mire. Ver el docstring de
// services/cluster_events.py del plugin arduino-accessories.
#ifndef NOPAL_SERVER_HOST
  #define NOPAL_SERVER_HOST ""
#endif
#ifndef NOPAL_SERVER_PORT
  #define NOPAL_SERVER_PORT 8420
#endif
#ifndef NOPAL_CLUSTER_WEBHOOK_TOKEN
  #define NOPAL_CLUSTER_WEBHOOK_TOKEN ""
#endif

#include <WiFiUdp.h>

#if defined(ESP32)
  #include <HTTPClient.h>
#elif defined(ESP8266)
  #include <ESP8266HTTPClient.h>
#endif

// Prototipos explícitos de funciones definidas más abajo en el .ino
// principal. Arduino auto-genera prototipos para funciones de nivel
// superior del .ino, pero solo confiablemente para el código que queda
// ANTES de un #include a mitad de archivo como este -- no siempre se
// puede confiar en que las detecte para lo que se usa desde acá adentro
// (visto en la práctica: dejó de encontrar jsonEscape/handleBuzzerCommand
// al crecer el archivo). Declararlas a mano evita depender de eso.
String jsonEscape(const String& input);
String chipModelText();
void setWs2812Color(uint8_t red, uint8_t green, uint8_t blue);
bool handleBuzzerCommand(const String& command, String& response);

// Algunas placas (p.ej. la am036/T-Call SIM800L) no tienen buzzer ni
// DHT, y por lo tanto ni siquiera definen estos macros -- sin este
// default, buildCapsJson() no compilaría en esas placas.
#ifndef BUZZER_ENABLE
  #define BUZZER_ENABLE 0
#endif
#ifndef DHT_ENABLE
  #define DHT_ENABLE 0
#endif

namespace NopalCluster {

constexpr uint16_t UDP_PORT             = 49820;
constexpr uint32_t DISCOVERY_TIMEOUT_MS = 4000;   // tiempo total buscando maestro antes de auto-nombrarse
constexpr uint32_t DISCOVERY_RETRY_MS   = 800;    // cada cuánto reintenta el WHO_IS_MASTER
constexpr uint32_t MASTER_ANNOUNCE_MS   = 4000;   // cada cuánto el maestro se anuncia (vivo + split-brain)
constexpr uint32_t HEARTBEAT_MS         = 5000;   // cada cuánto un esclavo confirma que sigue vivo
constexpr uint32_t JOIN_RETRY_MS        = 1000;   // cada cuánto reintenta el JOIN mientras no lo logre

// Timeouts HTTP explícitos: sin esto, HTTPClient se queda con su default
// de 5000 ms, y como service() corre dentro del loop() (no hay hilo
// aparte), un maestro o un esclavo que dejó de contestar congela la placa
// entera esos 5 s -- se nota como el panel web que no carga, la tira que
// no cambia de color y el buzzer que responde tarde. Todo el clúster vive
// en la misma LAN, donde una placa sana contesta en decenas de ms, así
// que estos valores son holgados y aun así cortan el bloqueo a tiempo.
constexpr uint16_t MASTER_HTTP_TIMEOUT_MS = 1500;  // JOIN/heartbeat contra el maestro
// La difusión de escena es "dispara y olvida" contra hasta MAX_SLAVES
// placas seguidas: acá el timeout se paga una vez POR ESCLAVO caído y por
// cada uno de los dos POST (/api/led y /api/buzzer), así que se usa uno
// más corto para que una escena siga sintiéndose instantánea aunque haya
// una placa muerta en el registro. Igual la va a dar de baja
// SLAVE_TIMEOUT_MS al no llegar su heartbeat.
constexpr uint16_t SLAVE_HTTP_TIMEOUT_MS  = 1000;
constexpr uint32_t SLAVE_TIMEOUT_MS     = 15000;  // 3 heartbeats perdidos = esclavo caído
constexpr uint8_t  MAX_SLAVES           = 8;
constexpr size_t   UDP_BUFFER_SIZE      = 160;

// Peso de elección: preferimos como maestro a la placa con más núcleos.
// Empate se resuelve por MAC (ver wins()). Ver decisión D4 del diseño.
#if defined(ESP32)
  constexpr uint8_t WEIGHT = 100;
#else
  constexpr uint8_t WEIGHT = 10;
#endif

enum class Role : uint8_t { DISCOVERY, MASTER, SLAVE };

struct SlaveInfo {
  bool used = false;
  String mac;
  IPAddress ip;
  String caps;             // JSON de capacidades tal como lo mandó el esclavo
  uint32_t lastSeenMs = 0;
};

// true recién al terminar setup() -- ver comentario en service() más
// abajo sobre por qué hace falta esta bandera.
inline bool initialized = false;

inline Role role = Role::DISCOVERY;
inline WiFiUDP udp;
inline String myMac;
inline String masterMac;
inline IPAddress masterIp;
inline uint32_t stateEnteredMs = 0;
inline uint32_t lastActionMs = 0;
inline uint8_t heartbeatFailures = 0;
inline bool joinedWithMaster = false;  // ver attemptJoin()/sendHeartbeat()
inline SlaveInfo slaves[MAX_SLAVES];

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

inline String macCompact() {
  String mac = WiFi.macAddress();
  mac.replace(":", "");
  return mac;
}

// true si (weightA, macA) debe ganar la elección sobre (weightB, macB).
inline bool wins(uint8_t weightA, const String& macA, uint8_t weightB, const String& macB) {
  if (weightA != weightB) {
    return weightA > weightB;
  }
  return macA < macB;
}

inline String tokenAt(const String& source, char separator, uint8_t index) {
  int start = 0;
  for (uint8_t i = 0; i < index; i++) {
    int pos = source.indexOf(separator, start);
    if (pos == -1) {
      return "";
    }
    start = pos + 1;
  }
  int end = source.indexOf(separator, start);
  if (end == -1) {
    end = source.length();
  }
  return source.substring(start, end);
}

// Inventario de capacidades del nodo (subconjunto enriquecido del "io" de
// /api/status). Se manda una sola vez en el JOIN y el maestro lo guarda
// tal cual -- por eso es solo identidad/inventario ESTÁTICO (qué hay y
// cómo se llama), nunca estado en vivo (on/off, lecturas de sensor): eso
// se consulta en caliente al nodo dueño, no se cachea acá.
//
// Los nombres de relé son el dato clave para que la IA (backend NOPAL)
// pueda componer escenas con sentido a partir del inventario del clúster
// (ver §11 del documento de diseño) -- sin nombres, solo sabría "hay 4
// relés", no cuáles corresponden a un ventilador o una bomba.
inline String buildCapsJson() {
  String caps = "{";
  caps += "\"hostname\":\"" + jsonEscape(String(NOPAL_HOSTNAME)) + "\",";
  caps += "\"fw\":\"" + jsonEscape(String(FW_VERSION)) + "\",";
  caps += "\"chip\":\"" + jsonEscape(chipModelText()) + "\",";

  caps += "\"relays\":[";
  for (uint8_t i = 0; i < RELAY_COUNT; i++) {
    if (i > 0) {
      caps += ",";
    }
    caps += "{\"n\":" + String(i + 1);
    caps += ",\"name\":\"" + jsonEscape(String(RELAY_NAMES[i])) + "\"";
    caps += ",\"gpio\":" + String(RELAY_PINS[i]);
    caps += "}";
  }
  caps += "],";

  caps += "\"pwm_led\":" + String(PWM_LED_ENABLE ? "true" : "false");
  caps += ",\"ws2812\":" + String(WS2812_ENABLE ? "true" : "false");
  caps += ",\"ws2812_count\":" + String(WS2812_ENABLE ? WS2812_COUNT : 0);
  caps += ",\"buzzer\":" + String(BUZZER_ENABLE ? "true" : "false");
  caps += ",\"dht\":" + String(DHT_ENABLE ? "true" : "false");
  caps += "}";
  return caps;
}

inline void sendPacket(IPAddress destination, const String& message) {
  udp.beginPacket(destination, UDP_PORT);
  udp.write(reinterpret_cast<const uint8_t*>(message.c_str()), message.length());
  udp.endPacket();
}

// Broadcast a la /24 local. Suficiente para una LAN doméstica/taller típica;
// si algún día se usa una subred distinta, ajustar la máscara acá.
inline void broadcastPacket(const String& message) {
  IPAddress broadcastAddress = WiFi.localIP();
  broadcastAddress[3] = 255;
  sendPacket(broadcastAddress, message);
}

inline void sendWhoIsMaster() {
  broadcastPacket(String("WHO_IS_MASTER|") + NOPAL_CLUSTER_ID + "|" + myMac + "|" + WEIGHT);
}

inline void sendIAmMaster(IPAddress destination) {
  sendPacket(destination, String("I_AM_MASTER|") + NOPAL_CLUSTER_ID + "|" + myMac + "|" + WEIGHT);
}

inline void sendMasterAnnounce() {
  broadcastPacket(String("MASTER_ANNOUNCE|") + NOPAL_CLUSTER_ID + "|" + myMac + "|" + WEIGHT);
}

// ---------------------------------------------------------------------------
// Transiciones de estado
// ---------------------------------------------------------------------------

inline void enterDiscovery() {
  role = Role::DISCOVERY;
  stateEnteredMs = millis();
  lastActionMs = 0;
  masterMac = "";
  Serial.println("NOPAL:CLUSTER:DISCOVERY");
}

inline void becomeMaster() {
  role = Role::MASTER;
  stateEnteredMs = millis();
  lastActionMs = 0;
  masterMac = myMac;
  masterIp = WiFi.localIP();
  for (uint8_t i = 0; i < MAX_SLAVES; i++) {
    slaves[i].used = false;
  }
  Serial.println("NOPAL:CLUSTER:MASTER");
}

inline void becomeSlave(const String& newMasterMac, IPAddress newMasterIp) {
  role = Role::SLAVE;
  stateEnteredMs = millis();
  lastActionMs = 0;  // fuerza un JOIN inmediato en el próximo service()
  masterMac = newMasterMac;
  masterIp = newMasterIp;
  heartbeatFailures = 0;
  joinedWithMaster = false;  // todo maestro nuevo exige un JOIN propio
  Serial.print("NOPAL:CLUSTER:SLAVE:");
  Serial.println(masterIp);
}

// ---------------------------------------------------------------------------
// Registro de esclavos (lado maestro)
// ---------------------------------------------------------------------------

// Devuelve true SOLO si el alta fue nueva. Un esclavo reintenta el JOIN
// cada JOIN_RETRY_MS mientras no lo logre, y vuelve a mandarlo si pierde y
// recupera contacto, así que sin esta distinción el aviso a NOPAL se
// dispararía una y otra vez con la misma placa -- y la Matriz LED quedaría
// anunciando lo mismo en bucle.
inline bool registerOrRefreshSlave(const String& mac, IPAddress ip, const String& caps) {
  for (uint8_t i = 0; i < MAX_SLAVES; i++) {
    if (slaves[i].used && slaves[i].mac == mac) {
      slaves[i].ip = ip;
      slaves[i].caps = caps;
      slaves[i].lastSeenMs = millis();
      return false;
    }
  }
  for (uint8_t i = 0; i < MAX_SLAVES; i++) {
    if (!slaves[i].used) {
      slaves[i].used = true;
      slaves[i].mac = mac;
      slaves[i].ip = ip;
      slaves[i].caps = caps;
      slaves[i].lastSeenMs = millis();
      return true;
    }
  }
  // Sin espacio libre (MAX_SLAVES alcanzado): se ignora la alta.
  return false;
}

// true si el mac SÍ estaba en el registro (y se refrescó su heartbeat).
// false si el maestro no lo conoce -- típicamente porque el maestro se
// reinició y perdió su registro, o el JOIN original nunca llegó a
// completarse. El que llama necesita distinguir esto: un simple "200 OK"
// no basta, porque un esclavo fantasma podría seguir "latiendo" para
// siempre sin que el maestro lo tenga registrado (bug real detectado en
// pruebas de failover, 2026-08-24 -- ver memoria de proyecto).
inline bool touchSlaveHeartbeat(const String& mac) {
  for (uint8_t i = 0; i < MAX_SLAVES; i++) {
    if (slaves[i].used && slaves[i].mac == mac) {
      slaves[i].lastSeenMs = millis();
      return true;
    }
  }
  return false;
}

// Definida más abajo, junto al resto del cliente HTTP: se declara acá
// porque pruneDeadSlaves() la necesita y viene antes en el archivo.
inline void notifyNopal(const char* event, const String& mac, IPAddress ip);

inline void pruneDeadSlaves() {
  const uint32_t now = millis();
  for (uint8_t i = 0; i < MAX_SLAVES; i++) {
    if (slaves[i].used && (now - slaves[i].lastSeenMs > SLAVE_TIMEOUT_MS)) {
      // Se copian antes de liberar la ranura: después de used=false los
      // campos siguen ahí pero ya no son de nadie, y avisar con datos de
      // una ranura liberada es pedir un bug la próxima vez que se toque.
      const String mac = slaves[i].mac;
      const IPAddress ip = slaves[i].ip;
      slaves[i].used = false;
      notifyNopal("leave", mac, ip);
    }
  }
}

// ---------------------------------------------------------------------------
// Cliente HTTP hacia el maestro (lado esclavo)
// ---------------------------------------------------------------------------

// Devuelve el código HTTP real (o -1 si ni siquiera se pudo conectar) --
// no alcanza con true/false: el llamador necesita distinguir "200 OK" de
// "404 no me conoces" para reaccionar distinto en cada caso.
// setTimeout() cubre la espera de respuesta en ambas plataformas; el
// timeout de CONEXIÓN (el caso que más duele: una placa apagada, donde el
// TCP SYN no se contesta nunca) solo es ajustable por separado en ESP32 --
// el ESP8266 usa su setTimeout para las dos cosas.
inline void applyHttpTimeout(HTTPClient& http, uint16_t timeoutMs) {
  http.setTimeout(timeoutMs);
#if defined(ESP32)
  http.setConnectTimeout(timeoutMs);
#endif
}

// Aviso a NOPAL de que una placa entró o salió del clúster. Es
// "dispara y olvida": si NOPAL está apagado, o el token no coincide, o la
// Matriz LED no está instalada, el clúster sigue funcionando igual -- esto
// es una notificación, no parte del protocolo de elección.
//
// Solo lo manda el MAESTRO: es el único que sabe quién entró y quién
// salió, y así el aviso llega una sola vez y no uno por cada placa.
inline void notifyNopal(const char* event, const String& mac, IPAddress ip) {
  if (strlen(NOPAL_SERVER_HOST) == 0 || strlen(NOPAL_CLUSTER_WEBHOOK_TOKEN) == 0) {
    return;  // sin servidor o sin token configurado, no hay a quién avisar
  }

  WiFiClient client;
  HTTPClient http;
  const String url = "http://" + String(NOPAL_SERVER_HOST) + ":" +
                     String(NOPAL_SERVER_PORT) + "/api/accessories/cluster/event";

  if (!http.begin(client, url)) {
    return;
  }

  applyHttpTimeout(http, SLAVE_HTTP_TIMEOUT_MS);
  http.addHeader("Content-Type", "application/x-www-form-urlencoded");
  http.addHeader("X-NOPAL-Token", NOPAL_CLUSTER_WEBHOOK_TOKEN);

  const int code = http.POST(
    "event=" + String(event) + "&mac=" + mac + "&address=" + ip.toString()
  );
  http.end();

  Serial.print("NOPAL:CLUSTER:NOTIFY,");
  Serial.print(event);
  Serial.print(",code=");
  Serial.println(code);
}

inline int httpPostToMaster(const String& path, const String& body) {
  WiFiClient client;
  HTTPClient http;
  const String url = "http://" + masterIp.toString() + path;

  if (!http.begin(client, url)) {
    return -1;
  }

  applyHttpTimeout(http, MASTER_HTTP_TIMEOUT_MS);

  http.addHeader("Content-Type", "application/x-www-form-urlencoded");
  const int code = http.POST(body);
  http.end();

  return code;
}

inline void attemptJoin() {
  const int code = httpPostToMaster(
    "/api/cluster/join",
    "mac=" + myMac + "&weight=" + String(WEIGHT) + "&caps=" + buildCapsJson()
  );

  if (code == 200) {
    joinedWithMaster = true;
    heartbeatFailures = 0;
    Serial.println("NOPAL:CLUSTER:JOINED");
  } else {
    // No se reintenta acá con un backoff propio: al dejar joinedWithMaster
    // en false, el siguiente tick de service() vuelve a llamar a esta
    // misma función (ver el case Role::SLAVE), con un reintento cada
    // JOIN_RETRY_MS -- no hace falta agendar nada aparte.
    heartbeatFailures++;
  }
}

inline void sendHeartbeat() {
  const int code = httpPostToMaster("/api/cluster/heartbeat", "mac=" + myMac);

  if (code == 200) {
    heartbeatFailures = 0;
    return;
  }

  if (code == 404) {
    // El maestro respondió pero no me tiene registrado (se reinició y
    // perdió su registro, o mi JOIN original nunca se completó de
    // verdad). No tiene caso seguir "latiendo" a un registro vacío --
    // unirme de nuevo YA, sin esperar a que se agoten los heartbeats.
    Serial.println("NOPAL:CLUSTER:UNKNOWN_TO_MASTER");
    joinedWithMaster = false;
    lastActionMs = 0;
    return;
  }

  heartbeatFailures++;
  if (heartbeatFailures >= 3) {
    Serial.println("NOPAL:CLUSTER:MASTER_LOST");
    enterDiscovery();
  }
}

// ---------------------------------------------------------------------------
// Escenas compuestas (Fase 4, paso 1: reparto sin IA todavía)
// ---------------------------------------------------------------------------
//
// Mismo catálogo de nombre->color que ya usa el panel web de un solo
// nodo (ver SCENE_COLORS en el JS del panel) -- se repite acá porque
// esto corre en el servidor (el maestro), no en el navegador. El
// maestro no inventa un mecanismo nuevo: para cada nodo (él mismo y
// cada esclavo conocido) llama exactamente los mismos endpoints que ya
// existen en cada placa (/api/led, /api/buzzer), nomás que por HTTP
// hacia la IP de cada esclavo en vez de solo localmente.

struct SceneColor {
  const char* name;
  uint8_t r, g, b;
};

constexpr SceneColor SCENE_TABLE[] = {
  {"READY",        25, 220,  95},
  {"WORKING",      20, 175, 255},
  {"WAITING",     255, 145,  20},
  {"ALARM",       255,   0,   0},
  {"MAINTENANCE", 175,  45, 255},
  {"DISCONNECTED",105, 120, 125},
  {"OFF",           0,   0,   0},
};
constexpr uint8_t SCENE_TABLE_COUNT = sizeof(SCENE_TABLE) / sizeof(SCENE_TABLE[0]);

inline bool findSceneColor(const String& name, uint8_t& r, uint8_t& g, uint8_t& b) {
  for (uint8_t i = 0; i < SCENE_TABLE_COUNT; i++) {
    if (name == SCENE_TABLE[i].name) {
      r = SCENE_TABLE[i].r;
      g = SCENE_TABLE[i].g;
      b = SCENE_TABLE[i].b;
      return true;
    }
  }
  return false;
}

// Aplica la escena en el propio maestro, sin pasar por HTTP -- llama
// directo las mismas funciones que usan /api/led y /api/buzzer.
inline void applySceneToSelf(const String& name, uint8_t r, uint8_t g, uint8_t b) {
#if WS2812_ENABLE
  setWs2812Color(r, g, b);
#endif

#if BUZZER_ENABLE
  if (NOPAL_BUZZER_SCENE_SOUNDS) {
    String response;
    handleBuzzerCommand(String("BUZZER:") + name, response);
  }
#endif
}

// Aplica la escena en un esclavo remoto -- mismos endpoints que el
// panel web de esa placa ya expone, autenticados con las credenciales
// del propio maestro (hoy compartidas entre todas las placas del
// clúster; si algún día no lo fueran, esto necesitaría guardar la
// credencial de cada esclavo en su registro).
inline void applySceneToSlave(IPAddress ip, const String& name, uint8_t r, uint8_t g, uint8_t b) {
  WiFiClient client;

  {
    HTTPClient http;
    if (http.begin(client, "http://" + ip.toString() + "/api/led")) {
      applyHttpTimeout(http, SLAVE_HTTP_TIMEOUT_MS);
      http.setAuthorization(NOPAL_OTA_USERNAME, NOPAL_OTA_PASSWORD);
      http.addHeader("Content-Type", "application/x-www-form-urlencoded");
      http.POST("mode=ws2812&r=" + String(r) + "&g=" + String(g) + "&b=" + String(b));
      http.end();
    }
  }

  {
    HTTPClient http;
    if (http.begin(client, "http://" + ip.toString() + "/api/buzzer")) {
      applyHttpTimeout(http, SLAVE_HTTP_TIMEOUT_MS);
      http.setAuthorization(NOPAL_OTA_USERNAME, NOPAL_OTA_PASSWORD);
      http.addHeader("Content-Type", "application/x-www-form-urlencoded");
      http.POST("action=" + name);
      http.end();
    }
  }
}

inline void dispatchScene(const String& name, uint8_t r, uint8_t g, uint8_t b) {
  applySceneToSelf(name, r, g, b);

  for (uint8_t i = 0; i < MAX_SLAVES; i++) {
    if (slaves[i].used) {
      applySceneToSlave(slaves[i].ip, name, r, g, b);
    }
  }
}

// ---------------------------------------------------------------------------
// Salida ordenada (llamar antes de un reinicio intencional, p.ej. OTA)
// ---------------------------------------------------------------------------
//
// Sin esto, un maestro que se reinicia a propósito (actualización OTA)
// deja a sus esclavos "a ciegas" hasta que se les agoten 3 heartbeats
// (~15 s) para recién entonces re-elegir. Avisando de salida, los
// esclavos reaccionan en menos de un segundo.

inline void sendMasterLeaving() {
  broadcastPacket(String("MASTER_LEAVING|") + NOPAL_CLUSTER_ID + "|" + myMac);
}

inline void prepareForReboot() {
  if (role != Role::MASTER) {
    return;  // un esclavo reiniciándose no le debe nada a nadie
  }

  // UDP no garantiza entrega; unos pocos reintentos seguidos es la única
  // oportunidad real de avisar antes de que el firmware se reinicie.
  for (uint8_t attempt = 0; attempt < 3; attempt++) {
    sendMasterLeaving();
    delay(20);
  }

  Serial.println("NOPAL:CLUSTER:MASTER_LEAVING");
}

// ---------------------------------------------------------------------------
// Recepción de paquetes UDP (todos los roles)
// ---------------------------------------------------------------------------

inline void servicePacket() {
  const int size = udp.parsePacket();
  if (size <= 0) {
    return;
  }

  char buffer[UDP_BUFFER_SIZE];
  const int length = udp.read(buffer, sizeof(buffer) - 1);
  if (length <= 0) {
    return;
  }
  buffer[length] = '\0';

  const String packet(buffer);
  const IPAddress remoteIp = udp.remoteIP();

  const String type = tokenAt(packet, '|', 0);
  const String cid  = tokenAt(packet, '|', 1);
  if (cid != String(NOPAL_CLUSTER_ID)) {
    return;  // paquete de otro clúster, se ignora
  }

  if (type == "WHO_IS_MASTER") {
    if (role == Role::MASTER) {
      sendIAmMaster(remoteIp);
    }
    return;
  }

  if (type == "I_AM_MASTER") {
    if (role == Role::DISCOVERY) {
      const String repliedMac = tokenAt(packet, '|', 2);
      const uint8_t repliedWeight = static_cast<uint8_t>(tokenAt(packet, '|', 3).toInt());

      if (wins(WEIGHT, myMac, repliedWeight, repliedMac)) {
        // Mi peso es mejor que el del maestro actual (p.ej. soy la ESP32
        // que acaba de reiniciar y el que contestó es la ESP8266 que
        // tomó el mando en mi ausencia). No me someto: reclamo el
        // liderazgo. El maestro actual se entera por MASTER_ANNOUNCE y
        // cede solo (mismo mecanismo que resuelve un split-brain).
        becomeMaster();
      } else {
        becomeSlave(repliedMac, remoteIp);
      }
    }
    return;
  }

  if (type == "MASTER_ANNOUNCE") {
    const String announcedMac = tokenAt(packet, '|', 2);
    const uint8_t announcedWeight = static_cast<uint8_t>(tokenAt(packet, '|', 3).toInt());

    if (announcedMac == myMac) {
      return;  // es mi propio anuncio, se ignora
    }

    if (role == Role::MASTER) {
      // Split-brain: hay otro maestro. Cede el que pierda la elección.
      if (wins(announcedWeight, announcedMac, WEIGHT, myMac)) {
        Serial.println("NOPAL:CLUSTER:STEP_DOWN");
        becomeSlave(announcedMac, remoteIp);
      }
      return;
    }

    if (role == Role::SLAVE && announcedMac != masterMac) {
      // El maestro cambió (failover/promoción ya resuelta en otro lado).
      becomeSlave(announcedMac, remoteIp);
    }
    return;
  }

  if (type == "MASTER_LEAVING") {
    const String leavingMac = tokenAt(packet, '|', 2);

    if (role == Role::SLAVE && leavingMac == masterMac) {
      // Reinicio intencional del maestro (p.ej. OTA): no hace falta
      // esperar a que fallen los heartbeats, se re-elige de inmediato.
      Serial.println("NOPAL:CLUSTER:MASTER_GONE");
      enterDiscovery();
    }
  }
}

// ---------------------------------------------------------------------------
// Ciclo principal (llamar desde loop())
// ---------------------------------------------------------------------------

inline void service() {
  // Algunos firmwares (p.ej. el am036/SIM800L) llaman a serviceNetwork()
  // -- y por lo tanto a esto -- DESDE DENTRO de su propio setup(), antes
  // de que WiFi/UDP estén listos (mientras esperan la respuesta del
  // módem). Sin esta guarda, servicePacket() intenta leer el socket UDP
  // (udp.parsePacket()) antes de udp.begin(), lo que en el core de
  // ESP32 revienta con "assert failed: xQueueSemaphoreTake" -- visto en
  // la práctica en la .83 (2026-08-24).
  if (!initialized) {
    return;
  }

  servicePacket();

  const uint32_t now = millis();

  switch (role) {
    case Role::DISCOVERY:
      if (now - lastActionMs >= DISCOVERY_RETRY_MS) {
        lastActionMs = now;
        sendWhoIsMaster();
      }
      if (now - stateEnteredMs >= DISCOVERY_TIMEOUT_MS) {
        becomeMaster();
      }
      break;

    case Role::MASTER:
      if (now - lastActionMs >= MASTER_ANNOUNCE_MS) {
        lastActionMs = now;
        sendMasterAnnounce();
        pruneDeadSlaves();
      }
      break;

    case Role::SLAVE:
      if (!joinedWithMaster) {
        // Reintenta el JOIN cada JOIN_RETRY_MS hasta que de verdad se
        // registre -- antes se intentaba una sola vez y, si fallaba, el
        // esclavo pasaba a mandar heartbeats sin haberse unido nunca
        // (bug real detectado en pruebas de failover, 2026-08-24).
        if (now - lastActionMs >= JOIN_RETRY_MS) {
          lastActionMs = now;
          attemptJoin();
        }
      } else if (now - lastActionMs >= HEARTBEAT_MS) {
        lastActionMs = now;
        sendHeartbeat();
      }
      break;
  }
}

// ---------------------------------------------------------------------------
// Estado en JSON, para GET /api/cluster
// ---------------------------------------------------------------------------

inline String buildStatusJson() {
  String json = "{";
  json += "\"cluster_id\":\"" + String(NOPAL_CLUSTER_ID) + "\",";

  json += "\"role\":\"";
  switch (role) {
    case Role::MASTER:    json += "master"; break;
    case Role::SLAVE:     json += "slave"; break;
    case Role::DISCOVERY: json += "discovery"; break;
  }
  json += "\",";

  json += "\"mac\":\"" + myMac + "\",";
  json += "\"weight\":" + String(WEIGHT) + ",";

  if (role == Role::SLAVE) {
    json += "\"master_mac\":\"" + masterMac + "\",";
    json += "\"master_ip\":\"" + masterIp.toString() + "\",";
  }

  if (role == Role::MASTER) {
    json += "\"slaves\":[";
    bool first = true;
    for (uint8_t i = 0; i < MAX_SLAVES; i++) {
      if (!slaves[i].used) {
        continue;
      }
      if (!first) {
        json += ",";
      }
      first = false;

      json += "{\"mac\":\"" + slaves[i].mac + "\",";
      json += "\"ip\":\"" + slaves[i].ip.toString() + "\",";
      json += "\"caps\":" + slaves[i].caps + ",";
      json += "\"age_ms\":" + String(millis() - slaves[i].lastSeenMs);
      json += "}";
    }
    json += "],";
  }

  json += "\"caps\":" + buildCapsJson();
  json += "}";
  return json;
}

// ---------------------------------------------------------------------------
// Rutas HTTP (llamar una vez desde setupWebServer())
// ---------------------------------------------------------------------------

inline void registerHttpRoutes() {
  server.on("/api/cluster", HTTP_GET, []() {
    server.send(200, "application/json", NopalCluster::buildStatusJson());
  });

  server.on("/api/cluster/join", HTTP_POST, []() {
    if (NopalCluster::role != NopalCluster::Role::MASTER) {
      server.send(409, "text/plain", "ERR:NOT_MASTER");
      return;
    }
    if (!server.hasArg("mac")) {
      server.send(400, "text/plain", "ERR:MISSING_MAC");
      return;
    }

    const String mac = server.arg("mac");
    const String caps = server.hasArg("caps") ? server.arg("caps") : "{}";
    const IPAddress slaveIp = server.client().remoteIP();
    const bool esNueva = NopalCluster::registerOrRefreshSlave(mac, slaveIp, caps);
    // Se contesta ANTES de avisarle a NOPAL: el esclavo ya cumplió su
    // parte y no tiene por qué esperar a que la Matriz LED dibuje.
    server.send(200, "text/plain", "OK:JOINED");
    if (esNueva) {
      NopalCluster::notifyNopal("join", mac, slaveIp);
    }
  });

  server.on("/api/cluster/heartbeat", HTTP_POST, []() {
    if (NopalCluster::role != NopalCluster::Role::MASTER) {
      server.send(409, "text/plain", "ERR:NOT_MASTER");
      return;
    }
    if (!server.hasArg("mac")) {
      server.send(400, "text/plain", "ERR:MISSING_MAC");
      return;
    }

    if (!NopalCluster::touchSlaveHeartbeat(server.arg("mac"))) {
      // El maestro no me tiene registrado -- que el esclavo se entere
      // YA (vía el código 404) en vez de seguir "latiendo" a ciegas.
      server.send(404, "text/plain", "ERR:UNKNOWN_SLAVE");
      return;
    }
    server.send(200, "text/plain", "OK");
  });

  server.on("/api/cluster/scene", HTTP_POST, []() {
    if (NopalCluster::role != NopalCluster::Role::MASTER) {
      server.send(409, "text/plain", "ERR:NOT_MASTER");
      return;
    }
    if (!server.hasArg("name")) {
      server.send(400, "text/plain", "ERR:MISSING_NAME");
      return;
    }

    const String name = server.arg("name");
    uint8_t r, g, b;
    if (!NopalCluster::findSceneColor(name, r, g, b)) {
      server.send(400, "text/plain", "ERR:UNKNOWN_SCENE");
      return;
    }

    NopalCluster::dispatchScene(name, r, g, b);
    server.send(200, "text/plain", "OK:" + name);
  });
}

// ---------------------------------------------------------------------------
// Arranque (llamar una vez desde setup(), después de setupWifi())
// ---------------------------------------------------------------------------

inline void setup() {
  myMac = macCompact();
  udp.begin(UDP_PORT);
  enterDiscovery();
  initialized = true;

  Serial.print("NOPAL:CLUSTER:BOOT:cid=");
  Serial.print(NOPAL_CLUSTER_ID);
  Serial.print(",mac=");
  Serial.print(myMac);
  Serial.print(",weight=");
  Serial.println(WEIGHT);
}

}  // namespace NopalCluster

#else  // !NOPAL_CLUSTER_ENABLE — módulo desactivado, todo no-op

namespace NopalCluster {
  inline void setup() {}
  inline void service() {}
  inline void registerHttpRoutes() {}
  inline void prepareForReboot() {}
}

#endif  // NOPAL_CLUSTER_ENABLE
