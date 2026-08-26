#pragma once

// ============================================================================
// NOPAL POWER — monitor de batería/energía (MAX17048 vía I2C)
// ============================================================================
//
// Módulo opcional para placas que llevan el módulo "UNIT Cargador de
// Batería LiPo Boost & I2C" (TP4056 + MT3608 + MAX17048) como fuente de
// energía. Hoy solo la .85, que además reparte energía a las otras dos
// placas del taller vía el boost -- ante un corte de luz, ese módulo se
// activa con su batería y las mantiene encendidas por un rato. En la
// práctica funciona como un no-break: no es un nodo que "se cae", es el
// que mantiene vivo al resto. Por eso acá interesa bastante más que un
// porcentaje: interesa saber si está cargando o descargando y cuánto
// tiempo queda.
//
// El TP4056 (carga) y el MT3608 (boost) no hablan I2C -- son circuitos
// analógicos fijos. El único chip que sí expone datos es el MAX17048
// (fuel gauge), dirección fija 0x36. Se lee directo con Wire.h, sin
// librería externa: son registros de 16 bits, no amerita una dependencia.
//
// OJO -- el IP5306 de la placa T-Call SIM800L NO sirve para esto aunque
// también esté en un bus I2C: es un PMIC de power bank (dirección 0x75),
// no un fuel gauge. No mide voltaje ni porcentaje fino. Ese módulo se
// deja como respaldo de energía y nada más; no se lee desde acá.
//
// Desactivado por defecto (NOPAL_POWER_MONITOR_ENABLE=0): todas las
// funciones quedan no-op y no se toca el bus I2C para nada si la placa
// no tiene este módulo.
//
// Integración en el .ino principal (fuera de este archivo), mismo
// patrón que nopal_cluster.h:
//   1. #include "nopal_power.h"  -- después de declarar `server`.
//   2. En setup(): NopalPower::setup();
//   3. En setupWebServer(): NopalPower::registerHttpRoutes();
//   4. En loop()/serviceNetwork(): NopalPower::service();

#ifndef NOPAL_POWER_MONITOR_ENABLE
  #define NOPAL_POWER_MONITOR_ENABLE 0
#endif

#if NOPAL_POWER_MONITOR_ENABLE

#ifndef NOPAL_POWER_SDA_PIN
  #define NOPAL_POWER_SDA_PIN 33
#endif

#ifndef NOPAL_POWER_SCL_PIN
  #define NOPAL_POWER_SCL_PIN 13
#endif

// Corrección fija (en volts) que se suma a la lectura cruda de VCELL.
// El MAX17048 mide el voltaje de celda en su propio pin, no en los bornes
// de la batería: la caída/ganancia del cableado y del módulo hace que lo
// que reporta no coincida con lo que marca un multímetro en la celda. Es
// un error de offset constante, no de escala (el LSB de 78.125 µV es
// exacto por datasheet), así que se corrige sumando una constante y no
// tocando VCELL_LSB_VOLTS.
//
// Cada placa necesita su propio valor, medido con un multímetro contra la
// celda: se define en secrets.h, no acá. Default 0.0 = sin corregir, que
// es lo correcto para una placa que todavía no se calibró -- mejor un
// dato crudo y honesto que uno "arreglado" con el número de otra placa.
//
//   #define NOPAL_POWER_VOLTAGE_OFFSET_V -0.095f   // ejemplo: reporta 95 mV de más
#ifndef NOPAL_POWER_VOLTAGE_OFFSET_V
  #define NOPAL_POWER_VOLTAGE_OFFSET_V 0.0f
#endif

// El MAX17048 entra en "hibernación" solo cuando ve poca actividad: deja
// de medir cada 250 ms y pasa a hacerlo cada ~45 s. Ahorra corriente
// (microamperes) a costa de que el dato quede viejo. Para un no-break eso
// es justo lo que no queremos: si se va la luz, el CRATE y el SOC tardan
// casi un minuto en enterarse. Con esto en 1 se deshabilita la
// hibernación (se escribe 0x0000 en HIBRT) y el chip mide siempre rápido.
//
// Se deja en 1 por defecto: esta placa está siempre alimentada, el ahorro
// de microamperes no le sirve de nada y la frescura del dato sí.
#ifndef NOPAL_POWER_DISABLE_HIBERNATE
  #define NOPAL_POWER_DISABLE_HIBERNATE 1
#endif

// Umbral de alerta por batería baja, en porcentaje (1..32). El chip
// levanta la bandera "HD" del registro STATUS al cruzarlo hacia abajo.
// No dispara nada por sí solo acá (no se cablea el pin ALRT), pero queda
// visible en /api/power para que NOPAL pueda reaccionar.
#ifndef NOPAL_POWER_ALERT_SOC_PCT
  #define NOPAL_POWER_ALERT_SOC_PCT 15
#endif

#include <Wire.h>

// Prototipo explícito, misma razón que en nopal_cluster.h: este archivo se
// incluye a mitad del .ino y los prototipos que Arduino auto-genera no son
// confiables para lo que se usa desde acá adentro. checkApiAuth() está
// definida bastante más abajo en el .ino.
bool checkApiAuth();

namespace NopalPower {

constexpr uint8_t  MAX17048_ADDR    = 0x36;
constexpr uint32_t POLL_INTERVAL_MS = 5000;

// Mapa de registros del MAX17048/49 (todos de 16 bits, big-endian).
constexpr uint8_t REG_VCELL   = 0x02;  // voltaje de celda
constexpr uint8_t REG_SOC     = 0x04;  // estado de carga
constexpr uint8_t REG_MODE    = 0x06;  // QuickStart (escritura) + HibStat
constexpr uint8_t REG_VERSION = 0x08;  // versión de silicio, solo lectura
constexpr uint8_t REG_HIBRT   = 0x0A;  // umbrales de hibernación
constexpr uint8_t REG_CONFIG  = 0x0C;  // RCOMP + umbral de alerta
constexpr uint8_t REG_VALRT   = 0x14;  // alerta por voltaje min/max
constexpr uint8_t REG_CRATE   = 0x16;  // ritmo de carga/descarga (con signo)
constexpr uint8_t REG_VRESET  = 0x18;  // umbral de reset + ID de chip
constexpr uint8_t REG_STATUS  = 0x1A;  // banderas de alerta
constexpr uint8_t REG_CMD     = 0xFE;  // comando POR (reset de fábrica)

// 78.125 µV por bit -- valor fijo del datasheet para VCELL.
constexpr float VCELL_LSB_VOLTS = 78.125f / 1000000.0f;
// 0.208 % por hora por bit -- valor fijo del datasheet para CRATE.
constexpr float CRATE_LSB_PCT_PER_HR = 0.208f;

// Debajo de este |CRATE| la estimación de tiempo restante se vuelve ruido
// (dividir por casi cero da horas absurdas), así que no se publica.
constexpr float CRATE_MIN_MEANINGFUL = 0.5f;
// Tope de la estimación publicada. Más allá de esto el número no dice
// nada útil y solo invita a creerle de más.
constexpr int32_t MINUTES_REMAINING_CAP = 60 * 48;

inline bool     valid          = false;
inline float    voltage        = 0.0f;
inline float    socPercent     = 0.0f;
inline float    cratePctPerHr  = 0.0f;
inline bool     hibernating    = false;
inline uint16_t versionRaw     = 0;
inline uint16_t statusRaw      = 0;
inline uint16_t configRaw      = 0;
inline uint16_t vresetRaw      = 0;
inline uint16_t valrtRaw       = 0;
inline uint16_t modeRaw        = 0;
inline uint32_t lastPollMs     = 0;
// Si estas quedan en false, el chip no aceptó la configuración: el dato
// que reporte hay que mirarlo con desconfianza (ver applyKnownGoodConfig).
inline bool     configWriteOk    = false;
inline bool     hibernateWriteOk = false;
inline bool     thresholdsWriteOk = false;

inline bool readRegister16(uint8_t reg, uint16_t& outValue) {
  Wire.beginTransmission(MAX17048_ADDR);
  Wire.write(reg);
  if (Wire.endTransmission(false) != 0) {
    return false;
  }

  if (Wire.requestFrom(static_cast<uint8_t>(MAX17048_ADDR), static_cast<uint8_t>(2)) != 2) {
    return false;
  }

  const uint8_t high = Wire.read();
  const uint8_t low  = Wire.read();
  outValue = (static_cast<uint16_t>(high) << 8) | low;
  return true;
}

inline bool writeRegister16(uint8_t reg, uint16_t value) {
  Wire.beginTransmission(MAX17048_ADDR);
  Wire.write(reg);
  Wire.write(static_cast<uint8_t>(value >> 8));
  Wire.write(static_cast<uint8_t>(value & 0xFF));
  return Wire.endTransmission() == 0;
}

// El MAX17048 puede quedar con su algoritmo ModelGauge "atorado" (SOC en
// 0% aunque el voltaje sea normal) tras un evento de energía anormal --
// visto en la práctica tras un corte/reconexión física del cable. El
// comando QuickStart (escribir 0x4000 en el registro MODE) le pide al
// chip recalcular desde cero. Se manda una vez al iniciar.
inline void quickStart() {
  writeRegister16(REG_MODE, 0x4000);
}

// Banderas de reset del registro STATUS: RI ("reset indicator", el chip la
// prende al arrancar) y VR ("voltage reset", la prende cuando detecta que
// se repuso la celda o que el comparador lo reinició). Ninguna se apaga
// sola.
//
// Si quedan prendidas para siempre dejan de servir para distinguir "arrancó
// recién" de "se reinició solo a mitad de la noche", que es justo el evento
// que interesa detectar en un no-break. Se limpian al final del arranque,
// cuando ya escribimos toda la configuración -- que es lo que las prende en
// primer lugar. De ahí en más, verlas prendidas significa un reset REAL.
//
// Las otras banderas (VL, VH, HD, SC) NO se tocan: ésas reflejan
// condiciones de la batería, no eventos que nosotros hayamos causado, y
// borrarlas sería esconder una alerta legítima.
inline void clearResetFlags() {
  constexpr uint16_t RESET_FLAGS = 0x0100 | 0x0800;  // RI | VR
  uint16_t status = 0;
  if (readRegister16(REG_STATUS, status)) {
    writeRegister16(REG_STATUS, status & ~RESET_FLAGS);
  }
}

// Deshabilita la hibernación escribiendo 0x0000 en HIBRT (ambos umbrales
// en cero = nunca hiberna). Ver NOPAL_POWER_DISABLE_HIBERNATE arriba.
inline bool disableHibernate() {
  if (!writeRegister16(REG_HIBRT, 0x0000)) {
    return false;
  }
  uint16_t readBack = 0xFFFF;
  return readRegister16(REG_HIBRT, readBack) && readBack == 0x0000;
}

// Escribe CONFIG con un valor conocido y bueno, y de paso DESPIERTA el
// chip.
//
// Acá NO se hace read-modify-write, y es a propósito. En la .85 este
// registro se lee 0xFFFF, o sea con el bit SLEEP en 1: un MAX17048
// dormido congela su algoritmo ModelGauge, y de ahí venía el SOC pegado
// en 0% con CRATE en 0 (el voltaje sigue leyéndose bien porque VCELL no
// depende del algoritmo). Conservar los bits de una lectura así
// re-escribía SLEEP en cada arranque y dejaba al chip dormido para
// siempre.
//
// El byte alto es RCOMP, la compensación del modelo de celda: 0x97 es el
// default de fábrica y el valor correcto mientras no se caracterice la
// batería puntual. Los 5 bits bajos son ATHD, codificado como
// (32 - porcentaje): 32 - 15 da 17 para una alerta al 15%. SLEEP, ALSC y
// ALRT quedan en 0.
inline bool applyKnownGoodConfig() {
  int pct = NOPAL_POWER_ALERT_SOC_PCT;
  if (pct < 1)  pct = 1;
  if (pct > 32) pct = 32;

  const uint16_t athd   = static_cast<uint16_t>(32 - pct) & 0x1F;
  const uint16_t wanted = static_cast<uint16_t>(0x9700 | athd);

  if (!writeRegister16(REG_CONFIG, wanted)) {
    return false;
  }

  // Se relee para confirmar que la escritura efectivamente entró. Sin esta
  // verificación no habría forma de distinguir "el chip aceptó el cambio"
  // de "el bus dijo que sí y el registro siguió igual", que es justo lo
  // que estaba pasando.
  // El bit ALRT (0x20) lo prende EL CHIP solo, cuando hay una alerta
  // activa -- no es nuestro. Compararlo daba un falso negativo justo
  // cuando había una alerta, que es cuando más importa poder confiar en
  // el dato. Se enmascara antes de comparar.
  constexpr uint16_t CHIP_OWNED_BITS = 0x0020;
  uint16_t readBack = 0;
  if (!readRegister16(REG_CONFIG, readBack)) {
    return false;
  }
  return (readBack & ~CHIP_OWNED_BITS) == (wanted & ~CHIP_OWNED_BITS);
}

// VALRT y VRESET son los otros dos registros de configuración que el chip
// conserva, y en esta placa vinieron con valores absurdos: VRESET en
// 5.08 V -- por encima del voltaje de cualquier celda LiPo, o sea siempre
// "en reset" -- y con su comparador deshabilitado, más una alerta de
// voltaje bajo prendida a 4.2 V. Se restauran a fábrica por la misma
// razón que CONFIG: partir de un estado conocido en vez de heredar
// basura.
inline bool applyKnownGoodThresholds() {
  // VALRT: mínimo 0x00 (0 V) y máximo 0xFF (5.1 V), o sea el rango
  // completo -- ninguna alerta espuria de voltaje. 20 mV por bit.
  const bool valrtOk = writeRegister16(REG_VALRT, 0x00FF);

  // VRESET: los 7 bits altos son el umbral en pasos de 40 mV; 0x96 da los
  // 3.00 V de fábrica. El bit 8 (Dis) en 0 rehabilita el comparador. El
  // byte bajo es el ID del chip, de solo lectura.
  const bool vresetOk = writeRegister16(REG_VRESET, 0x9600);

  return valrtOk && vresetOk;
}

// Reset completo a valores de fábrica (comando POR: 0x5400 en CMD). Es el
// martillo grande, para cuando la configuración quedó tan revuelta que no
// alcanza con reescribir registro por registro. No corre en cada arranque
// -- solo bajo pedido explícito, porque también borra lo que el chip haya
// aprendido del modelo de la celda.
inline void factoryReset() {
  writeRegister16(REG_CMD, 0x5400);
}

inline void poll() {
  uint16_t vcellRaw = 0;
  uint16_t socRaw   = 0;
  uint16_t crateRaw = 0;

  const bool vcellOk = readRegister16(REG_VCELL, vcellRaw);
  const bool socOk   = readRegister16(REG_SOC, socRaw);

  if (!vcellOk || !socOk) {
    valid = false;
    return;
  }

  voltage = vcellRaw * VCELL_LSB_VOLTS + NOPAL_POWER_VOLTAGE_OFFSET_V;

  // Byte alto = porcentaje entero, byte bajo = fracción en 1/256.
  // El MAX17048 puede reportar un poco arriba de 100% recién cargado
  // (compensación de su algoritmo ModelGauge) -- se limita a 100 para
  // que el dato no confunda a quien lo lea.
  const float rawSoc = (socRaw >> 8) + (socRaw & 0xFF) / 256.0f;
  socPercent = rawSoc > 100.0f ? 100.0f : rawSoc;

  // CRATE es complemento a dos con signo: positivo = cargando, negativo =
  // descargando. Es el dato que convierte esto de "un porcentaje" en un
  // monitor de no-break de verdad -- dice si la corriente de pared sigue
  // ahí sin necesidad de cablear nada más.
  if (readRegister16(REG_CRATE, crateRaw)) {
    cratePctPerHr = static_cast<int16_t>(crateRaw) * CRATE_LSB_PCT_PER_HR;
  }

  // Registros de diagnóstico: baratos de leer y son justo los que hacen
  // falta cuando el SOC se queda pegado (ver STATUS/RI y la nota de
  // quickStart()).
  readRegister16(REG_STATUS, statusRaw);
  readRegister16(REG_CONFIG, configRaw);
  readRegister16(REG_VALRT, valrtRaw);
  readRegister16(REG_VRESET, vresetRaw);
  if (readRegister16(REG_MODE, modeRaw)) {
    // HibStat: bit 12 del registro MODE. Importa porque en hibernación el
    // chip mide cada ~45 s, así que un dato "fresco" puede no serlo.
    hibernating = (modeRaw & 0x1000) != 0;
  }

  valid = true;
}

inline void setup() {
  Wire.begin(NOPAL_POWER_SDA_PIN, NOPAL_POWER_SCL_PIN);

  // VERSION y VRESET/ID se leen una sola vez: no cambian nunca. Sirven
  // para confirmar que el chip del bus es realmente un MAX17048 y no un
  // MAX17043/44, que usa OTRO LSB de voltaje (1.25 mV en vez de 78.125
  // µV) y daría lecturas mal escaladas con este mismo código.
  readRegister16(REG_VERSION, versionRaw);
  readRegister16(REG_VRESET, vresetRaw);

  // Orden deliberado: primero despertar el chip (CONFIG con SLEEP en 0),
  // porque un MAX17048 dormido no corre su algoritmo y todo lo que venga
  // después -- deshabilitar la hibernación, el QuickStart -- no tendría
  // sobre qué actuar.
  configWriteOk = applyKnownGoodConfig();
  thresholdsWriteOk = applyKnownGoodThresholds();

#if NOPAL_POWER_DISABLE_HIBERNATE
  hibernateWriteOk = disableHibernate();
#endif

  quickStart();
  delay(200);  // dar tiempo al chip a recalcular tras el QuickStart
  clearResetFlags();
  poll();
  lastPollMs = millis();

  Serial.print("NOPAL:POWER:SDA=");
  Serial.print(NOPAL_POWER_SDA_PIN);
  Serial.print(",SCL=");
  Serial.print(NOPAL_POWER_SCL_PIN);
  Serial.print(",OFFSET=");
  Serial.print(String(NOPAL_POWER_VOLTAGE_OFFSET_V, 3));
  Serial.print(",VERSION=0x");
  Serial.print(versionRaw, HEX);
  Serial.print(",ID=0x");
  Serial.println(vresetRaw & 0x00FF, HEX);
}

inline void service() {
  const uint32_t now = millis();
  if (now - lastPollMs >= POLL_INTERVAL_MS) {
    lastPollMs = now;
    poll();
  }
}

// Minutos que faltan para vaciarse (descargando) o para llenarse
// (cargando), derivados de SOC y CRATE. Devuelve -1 cuando el ritmo es
// demasiado chico para decir algo con sentido: preferimos no publicar el
// dato antes que publicar una cifra inventada.
inline int32_t minutesRemaining() {
  const bool  discharging = cratePctPerHr < 0.0f;
  const float rate        = discharging ? -cratePctPerHr : cratePctPerHr;

  if (!valid || rate < CRATE_MIN_MEANINGFUL) {
    return -1;  // ritmo dentro de la zona muerta, en cualquier sentido
  }

  const float pctToGo = discharging ? socPercent : (100.0f - socPercent);
  const int32_t mins  = static_cast<int32_t>((pctToGo / rate) * 60.0f);

  if (mins < 0) return -1;
  return mins > MINUTES_REMAINING_CAP ? MINUTES_REMAINING_CAP : mins;
}

// Devuelve el valor YA ENTRECOMILLADO como cadena JSON. Las comillas van
// acá adentro a propósito: JSON no tiene literales hexadecimales, así que
// emitir 0x1234 pelado produce un cuerpo que ningún parser acepta -- y en
// /api/power eso no rompe solo el campo, tira toda la respuesta (el panel
// de la placa esconde la batería y NOPAL no ve el medidor).
inline String hex16(uint16_t value) {
  char buffer[9];
  snprintf(buffer, sizeof(buffer), "\"0x%04X\"", value);
  return String(buffer);
}

inline String buildJson() {
  String json = "{";
  json += "\"valid\":";
  json += valid ? "true" : "false";

  if (valid) {
    json += ",\"voltage_v\":";
    json += String(voltage, 3);
    json += ",\"soc_pct\":";
    json += String(socPercent, 1);
    json += ",\"crate_pct_hr\":";
    json += String(cratePctPerHr, 2);

    // "charging" solo se emite cuando el ritmo alcanza para afirmarlo. Con
    // CRATE en 0 -- que es lo que pasa mientras el medidor no lo calcula --
    // un "charging": false se lee como "está descargando", o sea "se fue la
    // luz": una falsa alarma en una placa que hace de no-break. Ausente es
    // el dato honesto: no se sabe. Mismo criterio que minutes_remaining.
    const bool discharging = cratePctPerHr < 0.0f;
    const float rate = discharging ? -cratePctPerHr : cratePctPerHr;
    if (rate >= CRATE_MIN_MEANINGFUL) {
      json += ",\"charging\":";
      json += discharging ? "false" : "true";
    }

    const int32_t mins = minutesRemaining();
    if (mins >= 0) {
      json += ",\"minutes_remaining\":";
      json += String(mins);
    }

    json += ",\"hibernating\":";
    json += hibernating ? "true" : "false";

    // Banderas del registro STATUS. Las posiciones salen del datasheet;
    // el volcado crudo de más abajo queda a propósito para poder
    // contrastarlas contra el chip real si alguna no cuadra.
    json += ",\"alerts\":{";
    json += "\"reset\":";        json += (statusRaw & 0x0100) ? "true" : "false";
    json += ",\"voltage_high\":"; json += (statusRaw & 0x0200) ? "true" : "false";
    json += ",\"voltage_low\":";  json += (statusRaw & 0x0400) ? "true" : "false";
    json += ",\"voltage_reset\":";json += (statusRaw & 0x0800) ? "true" : "false";
    json += ",\"soc_low\":";      json += (statusRaw & 0x1000) ? "true" : "false";
    json += ",\"soc_change\":";   json += (statusRaw & 0x2000) ? "true" : "false";
    json += "}";

    // RCOMP vive en el byte alto de CONFIG; el umbral de alerta (ATHD) en
    // los 5 bits bajos, codificado como (32 - porcentaje).
    json += ",\"alert_soc_pct\":";
    json += String(32 - (configRaw & 0x1F));

    json += ",\"chip\":{";
    json += "\"version\":";  json += hex16(versionRaw);
    json += ",\"id\":";      json += hex16(vresetRaw & 0x00FF);
    json += "}";

    // Volcado crudo: es lo que permite diagnosticar sin volver a flashear
    // (por ejemplo el SOC pegado en 0%, donde hace falta ver VERSION y
    // STATUS reales en vez de confiar en la interpretación de arriba).
    json += ",\"config_write_ok\":";
    json += configWriteOk ? "true" : "false";
    json += ",\"hibernate_write_ok\":";
    json += hibernateWriteOk ? "true" : "false";
    json += ",\"thresholds_write_ok\":";
    json += thresholdsWriteOk ? "true" : "false";

    json += ",\"raw\":{";
    json += "\"mode\":";     json += hex16(modeRaw);
    json += ",\"config\":";  json += hex16(configRaw);
    json += ",\"status\":";  json += hex16(statusRaw);
    json += ",\"vreset\":";  json += hex16(vresetRaw);
    json += ",\"valrt\":";   json += hex16(valrtRaw);
    json += "}";
  }

  json += "}";
  return json;
}

inline void registerHttpRoutes() {
  server.on("/api/power", HTTP_GET, []() {
    server.send(200, "application/json", NopalPower::buildJson());
  });

  // Recuperación manual para el caso conocido del SOC pegado en 0%: repite
  // la misma secuencia que el arranque -- despertar el chip (CONFIG con
  // SLEEP en 0), deshabilitar la hibernación y pedir el recálculo -- sin
  // tener que reiniciar la placa entera, que se llevaría por delante al
  // clúster y a las tiras. La respuesta trae config_write_ok, así que se
  // ve en el acto si el chip aceptó o no.
  server.on("/api/power/quickstart", HTTP_POST, []() {
    if (!checkApiAuth()) return;

    NopalPower::configWriteOk = NopalPower::applyKnownGoodConfig();
#if NOPAL_POWER_DISABLE_HIBERNATE
    NopalPower::hibernateWriteOk = NopalPower::disableHibernate();
#endif
    NopalPower::quickStart();
    delay(200);
    NopalPower::clearResetFlags();
    NopalPower::poll();
    server.send(200, "application/json", NopalPower::buildJson());
  });

  // Último recurso: POR del chip y reconfiguración desde cero. Aparte del
  // quickstart porque esto además borra el modelo de celda que el chip
  // haya aprendido -- vuelve a empezar de verdad, no solo recalcula.
  server.on("/api/power/factory-reset", HTTP_POST, []() {
    if (!checkApiAuth()) return;

    NopalPower::factoryReset();
    delay(300);  // el POR tarda en asentar antes de aceptar escrituras
    NopalPower::configWriteOk     = NopalPower::applyKnownGoodConfig();
    NopalPower::thresholdsWriteOk = NopalPower::applyKnownGoodThresholds();
#if NOPAL_POWER_DISABLE_HIBERNATE
    NopalPower::hibernateWriteOk = NopalPower::disableHibernate();
#endif
    NopalPower::quickStart();
    delay(200);
    NopalPower::clearResetFlags();
    NopalPower::poll();
    server.send(200, "application/json", NopalPower::buildJson());
  });
}

}  // namespace NopalPower

#else  // !NOPAL_POWER_MONITOR_ENABLE — módulo desactivado, todo no-op

namespace NopalPower {
  inline void setup() {}
  inline void service() {}
  inline void registerHttpRoutes() {}
  inline String buildJson() { return "{\"valid\":false}"; }
}

#endif  // NOPAL_POWER_MONITOR_ENABLE
