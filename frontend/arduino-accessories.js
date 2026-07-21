(() => {
    const PLUGIN_ID = 'arduino-accessories';
    if (window.NopalPluginRegistry?.[PLUGIN_ID]) return;

    // ============================================================================
    // DATOS MOCK -- reemplazar por fetch() reales cuando exista backend para esto.
    // Nada de lo que hay en este bloque llama a la API hoy; es un prototipo de
    // frontend. Cada dato indica, en su comentario, qué endpoint/servicio real
    // lo alimentaría eventualmente.
    // ============================================================================

    // Categorías de función de pin -- color + si es editable + campos del
    // inspector. Agregar una categoría nueva es agregar una entrada acá, no
    // código nuevo en el renderer del inspector.
    const PIN_CATEGORIES = {
        power:        { label: 'Alimentación', color: '#ef4444', fixed: true, params: [] },
        ground:       { label: 'Tierra', color: '#94a3b8', fixed: true, params: [] },
        reserved:     { label: 'Reservado', color: '#94a3b8', fixed: true, params: [] },
        free:         { label: 'Libre', color: '#64748b', fixed: false, params: [] },
        led_ws2812:   { label: 'Tira LED WS2812', color: '#a855f7', fixed: false, params: [
            { key: 'stripType', label: 'Tipo de tira', type: 'select', options: ['WS2812B', 'SK6812', 'APA102'] },
            { key: 'ledCount', label: 'Cantidad de LEDs', type: 'select', options: ['8', '16', '30', '60', '144'] },
            { key: 'brightness', label: 'Brillo global', type: 'slider', min: 0, max: 100 },
            { key: 'invertData', label: 'Invertir datos', type: 'toggle' },
            { key: 'defaultColor', label: 'Color por defecto (standby)', type: 'color' },
        ] },
        led_pwm:      { label: 'LED PWM analógico', color: '#ec4899', fixed: false, params: [
            { key: 'channel', label: 'Canal', type: 'select', options: ['R', 'G', 'B'] },
            { key: 'invertData', label: 'Invertir salida', type: 'toggle' },
        ] },
        relay:        { label: 'Relé', color: '#f59e0b', fixed: false, params: [
            { key: 'activeLow', label: 'Activo en LOW', type: 'toggle' },
            { key: 'defaultOn', label: 'Encendido al arrancar', type: 'toggle' },
        ] },
        sensor_temp:  { label: 'Sensor de temperatura', color: '#3b82f6', fixed: false, params: [
            { key: 'sensorType', label: 'Tipo de sensor', type: 'select', options: ['DS18B20', 'NTC 100K', 'DHT22'] },
        ] },
        sensor_smoke: { label: 'Sensor de humo', color: '#dc2626', fixed: false, params: [
            { key: 'threshold', label: 'Umbral de alarma', type: 'select', options: ['Bajo', 'Medio', 'Alto'] },
        ] },
        sensor_door:  { label: 'Sensor de puerta', color: '#8b5cf6', fixed: false, params: [
            { key: 'normallyOpen', label: 'Normalmente abierto', type: 'toggle' },
        ] },
        i2c:          { label: 'I2C', color: '#06b6d4', fixed: false, params: [
            { key: 'role', label: 'Rol', type: 'select', options: ['SDA', 'SCL'] },
        ] },
        uart:         { label: 'UART', color: '#14b8a6', fixed: false, params: [
            { key: 'baud', label: 'Baud rate', type: 'select', options: ['9600', '19200', '115200'] },
        ] },
        spi:          { label: 'SPI', color: '#6366f1', fixed: false, params: [
            { key: 'role', label: 'Rol', type: 'select', options: ['MOSI', 'MISO', 'SCK', 'CS'] },
        ] },
        buzzer:       { label: 'Buzzer', color: '#eab308', fixed: false, params: [
            { key: 'activeLow', label: 'Activo en LOW', type: 'toggle' },
        ] },
        ventilation:  { label: 'Ventilación', color: '#0ea5e9', fixed: false, params: [
            { key: 'speedControl', label: 'Control de velocidad (PWM)', type: 'toggle' },
        ] },
        adc:          { label: 'Entrada analógica', color: '#22c55e', fixed: false, params: [] },
        dac:          { label: 'Salida DAC', color: '#c084fc', fixed: false, params: [] },
        // Pin hardwireado de fábrica al módem SIM800L de la placa T-Call V1.3
        // (no es una asignación de NOPAL, viene soldado así en la placa) --
        // por eso es "fixed" como power/ground/reserved, no se puede
        // reasignar a otra función.
        modem:        { label: 'Módem SIM800L', color: '#0d9488', fixed: true, params: [] },
    };

    // Catálogo de modelos de placa disponibles para "Agregar placa". Los pines
    // de esp32_devkit y esp8266_generic son los REALES de
    // firmware/nopal_accessory/nopal_accessory.ino (marcados firmwareDefault),
    // más pines genéricos de un devkit típico para completar el mapa visual
    // (marcados generic -- NO verificados contra este repo, son pinout público
    // conocido). nodemcu_v3 y wemos_d1_mini comparten exactamente los mismos
    // GPIO reales que esp8266_generic (el firmware trata todo ESP8266 igual,
    // ver el comentario del propio .ino) -- solo cambia si el pin se rotula
    // como GPIOn o como Dn.
    function buildEsp32Pins() {
        const left = [
            { gpio: '3V3', physical: 1, label: 'Alimentación', category: 'power' },
            { gpio: 'EN', physical: 2, label: 'Habilitar', category: 'reserved' },
            { gpio: 'GPIO36', physical: 3, label: 'ADC / Entrada', category: 'free', generic: true },
            { gpio: 'GPIO39', physical: 4, label: 'ADC / Entrada', category: 'free', generic: true },
            { gpio: 'GPIO34', physical: 5, label: 'ADC / Entrada', category: 'free', generic: true },
            { gpio: 'GPIO35', physical: 6, label: 'ADC / Entrada', category: 'free', generic: true },
            { gpio: 'GPIO32', physical: 7, label: 'Libre', category: 'free', generic: true },
            { gpio: 'GPIO33', physical: 8, label: 'Libre', category: 'free', generic: true },
            { gpio: 'GPIO25', physical: 9, label: 'LED PWM R', category: 'led_pwm', firmwareDefault: true },
            { gpio: 'GPIO26', physical: 10, label: 'LED PWM G', category: 'led_pwm', firmwareDefault: true },
            { gpio: 'GPIO27', physical: 11, label: 'LED PWM B', category: 'led_pwm', firmwareDefault: true },
            { gpio: 'GPIO14', physical: 12, label: 'Libre', category: 'free', generic: true },
            { gpio: 'GPIO12', physical: 13, label: 'Libre', category: 'free', generic: true },
            { gpio: 'GND', physical: 14, label: 'Tierra', category: 'ground' },
            { gpio: 'GPIO13', physical: 15, label: 'Libre', category: 'free', generic: true },
        ];
        const right = [
            { gpio: 'GPIO23', physical: 1, label: 'Libre', category: 'free', generic: true },
            { gpio: 'GPIO22', physical: 2, label: 'Libre', category: 'free', generic: true },
            { gpio: 'TXD0', physical: 3, label: 'Serial TX', category: 'free', generic: true },
            { gpio: 'RXD0', physical: 4, label: 'Serial RX', category: 'free', generic: true },
            { gpio: 'GPIO21', physical: 5, label: 'Libre', category: 'free', generic: true },
            { gpio: 'GPIO19', physical: 6, label: 'Relé 4', category: 'relay', firmwareDefault: true },
            { gpio: 'GPIO18', physical: 7, label: 'Relé 3', category: 'relay', firmwareDefault: true },
            { gpio: 'GPIO5', physical: 8, label: 'Libre', category: 'free', generic: true },
            { gpio: 'GPIO17', physical: 9, label: 'Relé 2', category: 'relay', firmwareDefault: true },
            { gpio: 'GPIO16', physical: 10, label: 'Relé 1', category: 'relay', firmwareDefault: true },
            { gpio: 'GPIO4', physical: 11, label: 'Tira LED WS2812', category: 'led_ws2812', firmwareDefault: true },
            { gpio: 'GPIO0', physical: 12, label: 'Libre (boot)', category: 'free', generic: true },
            { gpio: 'GPIO2', physical: 13, label: 'LED de estado', category: 'reserved', firmwareDefault: true },
            { gpio: 'GPIO15', physical: 14, label: 'Libre', category: 'free', generic: true },
            { gpio: '5V', physical: 15, label: 'Alimentación', category: 'power' },
        ];
        return { left, right };
    }

    function buildEsp8266Pins(useDLabels) {
        const name = (d, gpio) => useDLabels ? d : gpio;
        const left = [
            { gpio: name('3V3', '3V3'), physical: 1, label: 'Alimentación', category: 'power' },
            { gpio: name('GND', 'GND'), physical: 2, label: 'Tierra', category: 'ground' },
            { gpio: name('D0', 'GPIO16'), physical: 3, label: 'LED PWM B', category: 'led_pwm', firmwareDefault: true },
            { gpio: name('D1', 'GPIO5'), physical: 4, label: 'Relé 1', category: 'relay', firmwareDefault: true },
            { gpio: name('D2', 'GPIO4'), physical: 5, label: 'Relé 2', category: 'relay', firmwareDefault: true },
            { gpio: name('D3', 'GPIO0'), physical: 6, label: 'Libre (boot)', category: 'free', generic: true },
            { gpio: name('D4', 'GPIO2'), physical: 7, label: 'Tira LED WS2812', category: 'led_ws2812', firmwareDefault: true },
            { gpio: name('RX', 'GPIO3'), physical: 8, label: 'Serial RX', category: 'free', generic: true },
        ];
        const right = [
            { gpio: name('D5', 'GPIO14'), physical: 1, label: 'Relé 3', category: 'relay', firmwareDefault: true },
            { gpio: name('D6', 'GPIO12'), physical: 2, label: 'Relé 4', category: 'relay', firmwareDefault: true },
            { gpio: name('D7', 'GPIO13'), physical: 3, label: 'LED PWM R', category: 'led_pwm', firmwareDefault: true },
            { gpio: name('D8', 'GPIO15'), physical: 4, label: 'LED PWM G', category: 'led_pwm', firmwareDefault: true },
            { gpio: name('TX', 'GPIO1'), physical: 5, label: 'Serial TX', category: 'free', generic: true },
            { gpio: name('A0', 'A0'), physical: 6, label: 'Entrada analógica', category: 'adc', generic: true },
            { gpio: name('GND', 'GND'), physical: 7, label: 'Tierra', category: 'ground' },
            { gpio: name('5V', 'VIN'), physical: 8, label: 'Alimentación', category: 'power' },
        ];
        return { left, right };
    }

    // T-Call V1.3 (ESP32-WROVER-B + módem SIM800L + IP5306 integrados).
    // firmwareVerified: true -- a diferencia de la primera versión de estos
    // datos (que venía solo de la hoja de pines del fabricante), esto ahora
    // coincide con un firmware DEDICADO real y completo para esta placa:
    // firmware/nopal_tcall_sim800l/nopal_tcall_sim800l.ino (relés vía
    // MCP23017 I2C en vez de GPIO directo, RGB en 14/18/19, WS2812 en 25,
    // LED de estado azul en 13, batería IP5306, SMS/GPRS por TinyGSM). Los
    // 4 relés NO tienen pin de header propio -- viven detrás del bus I2C
    // (SDA/SCL, dirección MCP23017 0x20), por eso no aparece "Relé N" en
    // ningún GPIO acá como sí pasa en los otros modelos.
    //  · GPIO16/17 no están disponibles (el módulo WROVER declara PSRAM ahí).
    //  · Solo acepta SIM Nano.
    function buildTCallPins() {
        const left = [
            { gpio: '3V3', physical: 1, label: 'Alimentación', category: 'power' },
            { gpio: 'NC', physical: 2, label: 'Sin conexión', category: 'reserved' },
            { gpio: 'GPIO36', physical: 3, label: 'ADC0 / VP', category: 'adc' },
            { gpio: 'GPIO39', physical: 4, label: 'ADC3 / VN', category: 'adc' },
            { gpio: 'GPIO34', physical: 5, label: 'ADC6', category: 'adc' },
            { gpio: 'GPIO35', physical: 6, label: 'ADC7', category: 'adc' },
            { gpio: 'GPIO32', physical: 7, label: 'SIM800L DTR', category: 'modem', firmwareDefault: true },
            { gpio: 'GPIO33', physical: 8, label: 'SIM800L RI (ring)', category: 'modem', firmwareDefault: true },
            { gpio: 'GPIO25', physical: 9, label: 'Tira LED WS2812', category: 'led_ws2812', firmwareDefault: true },
            { gpio: 'GPIO26', physical: 10, label: 'SIM800L TX', category: 'modem', firmwareDefault: true },
            { gpio: 'GPIO27', physical: 11, label: 'SIM800L RX', category: 'modem', firmwareDefault: true },
            { gpio: 'GPIO14', physical: 12, label: 'LED PWM R', category: 'led_pwm', firmwareDefault: true },
            { gpio: 'GPIO12', physical: 13, label: 'Touch5', category: 'free' },
            { gpio: 'GND', physical: 14, label: 'Tierra', category: 'ground' },
            { gpio: 'GPIO13', physical: 15, label: 'LED de estado (azul)', category: 'reserved', firmwareDefault: true },
            { gpio: 'SD2', physical: 16, label: 'Flash SPI (reservado)', category: 'reserved' },
            { gpio: 'SD3', physical: 17, label: 'Flash SPI (reservado)', category: 'reserved' },
            { gpio: 'CMD', physical: 18, label: 'Flash SPI (reservado)', category: 'reserved' },
            { gpio: '5V', physical: 19, label: 'Alimentación', category: 'power' },
            { gpio: 'SPK+', physical: 20, label: 'Salida de audio +', category: 'reserved' },
            { gpio: 'SPK-', physical: 21, label: 'Salida de audio -', category: 'reserved' },
        ];
        const right = [
            { gpio: 'GND', physical: 1, label: 'Tierra', category: 'ground' },
            { gpio: 'GPIO23', physical: 2, label: 'SIM800L POWER ON', category: 'modem', firmwareDefault: true },
            { gpio: 'GPIO22', physical: 3, label: 'I2C SCL (IP5306 + 4 relés MCP23017 0x20)', category: 'i2c', firmwareDefault: true },
            { gpio: 'GPIO1', physical: 4, label: 'Serial TX (programación)', category: 'reserved' },
            { gpio: 'GPIO3', physical: 5, label: 'Serial RX (programación)', category: 'reserved' },
            { gpio: 'GPIO21', physical: 6, label: 'I2C SDA (IP5306 + 4 relés MCP23017 0x20)', category: 'i2c', firmwareDefault: true },
            { gpio: 'GND', physical: 7, label: 'Tierra', category: 'ground' },
            { gpio: 'GPIO19', physical: 8, label: 'LED PWM B', category: 'led_pwm', firmwareDefault: true },
            { gpio: 'GPIO18', physical: 9, label: 'LED PWM G', category: 'led_pwm', firmwareDefault: true },
            { gpio: 'GPIO5', physical: 10, label: 'SIM800L RESET', category: 'modem', firmwareDefault: true },
            { gpio: 'NC', physical: 11, label: 'Sin conexión', category: 'reserved' },
            { gpio: 'NC', physical: 12, label: 'Sin conexión', category: 'reserved' },
            { gpio: 'GPIO4', physical: 13, label: 'SIM800L PWRKEY', category: 'modem', firmwareDefault: true },
            { gpio: 'GPIO0', physical: 14, label: 'Touch1 (boot)', category: 'free' },
            { gpio: 'GPIO2', physical: 15, label: 'Touch2', category: 'free' },
            { gpio: 'GPIO15', physical: 16, label: 'Touch3', category: 'free' },
            { gpio: 'SD1', physical: 17, label: 'Flash SPI (reservado)', category: 'reserved' },
            { gpio: 'SD0', physical: 18, label: 'Flash SPI (reservado)', category: 'reserved' },
            { gpio: 'CLK', physical: 19, label: 'Flash SPI (reservado)', category: 'reserved' },
            { gpio: 'MIC-', physical: 20, label: 'Entrada de audio -', category: 'reserved' },
            { gpio: 'MIC+', physical: 21, label: 'Entrada de audio +', category: 'reserved' },
        ];
        return { left, right };
    }

    const BOARD_CATALOG = [
        { id: 'esp32_devkit', label: 'ESP32 (Dev Module)', chipLabel: 'ESP32-WROOM-32', pins: buildEsp32Pins(), firmwareVerified: true },
        { id: 'esp8266_generic', label: 'ESP8266 genérico', chipLabel: 'ESP8266EX', pins: buildEsp8266Pins(false), firmwareVerified: true },
        { id: 'nodemcu_v3', label: 'NodeMCU V3', chipLabel: 'ESP8266EX (NodeMCU)', pins: buildEsp8266Pins(true), firmwareVerified: true },
        { id: 'wemos_d1_mini', label: 'Wemos D1 mini', chipLabel: 'ESP8266EX (D1 mini)', pins: buildEsp8266Pins(true), firmwareVerified: true },
        { id: 'tcall_v13', label: 'ESP32 SIM800L T-Call V1.3', chipLabel: 'ESP32-WROVER-B + SIM800L + IP5306', pins: buildTCallPins(), firmwareVerified: true, image: '/plugins-static/arduino-accessories/frontend/assets/tcall-v13.png', note: 'Solo admite SIM Nano. Los 4 relés van por I2C (MCP23017 0x20, mismo bus que SDA/SCL), no tienen pin de header propio.' },
    ];
    // Nota: nodemcu_v3 y wemos_d1_mini muestran los mismos GPIO que
    // esp8266_generic con etiqueta Dn en vez de GPIOn -- no hay un mapeo
    // distinto real en este repo, ver firmware/nopal_accessory/nopal_accessory.ino.

    // Variables por máquina -- nombres de campo reales, no inventados:
    //  · Impresora: normalize_printer_payload(), backend/services/klipper_service.py:55-140
    //    (vía Moonraker -- "FLY_D5" es un apodo libre que escribe el usuario,
    //    NOPAL no reconoce nombres de placa MCU, solo habla con Moonraker).
    //  · Láser/CNC: _parse_grbl_status_line(), backend/services/laser_service.py:642,
    //    y LaserJob.to_dict() línea 1309. Láser y CNC comparten el mismo driver GRBL,
    //    se diferencian solo por el campo "kind" del registro de la máquina.
    const MACHINES = [
        {
            id: 'printer_fly_d5', kind: 'printer', name: 'Impresora 3D', nickname: 'FLY_D5 / Klipper', status: 'ACTIVO',
            variables: [
                { key: 'data.extruder.temperature', label: 'Temp. boquilla (°C)' },
                { key: 'data.heater_bed.temperature', label: 'Temp. cama (°C)' },
                { key: 'job.state', label: 'Estado de impresión' },
                { key: 'job.progress', label: 'Progreso (%)' },
            ],
            outputs: [{ accessoryLabel: 'Tira LED WS2812', port: 'GPIO4', on: true }],
            inlineRules: [
                { color: '#3b82f6', condition: 'Temp boquilla < 40°C', result: 'Máquina fría' },
                { color: '#eab308', condition: '40°C ≤ T boquilla < 200°C', result: 'Calentando' },
                { color: '#ef4444', condition: 'T boquilla ≥ 220°C', result: 'Sobre temperatura' },
                { color: '#22c55e', condition: 'Estado = Lista', result: 'Lista para imprimir' },
                { color: '#a855f7', condition: 'Imprimiendo', result: 'Gradiente según progreso' },
            ],
        },
        {
            id: 'laser_sculpfun', kind: 'laser', name: 'Láser', nickname: 'Sculpfun / GRBL', status: 'ACTIVO',
            variables: [
                { key: 'state', label: 'Estado GRBL' },
                { key: 'accessories.flood', label: 'Refrigerante' },
                { key: 'job.state', label: 'Estado del trabajo' },
                { key: 'job.current', label: 'Progreso actual' },
            ],
            outputs: [
                { accessoryLabel: 'Relé Extractor', port: 'GPIO18', on: true },
                { accessoryLabel: 'Sirena', port: 'GPIO19', on: true },
            ],
            inlineRules: [
                { color: '#22c55e', condition: 'Estado listo', result: 'Luz verde' },
                { color: '#eab308', condition: 'Grabando (Run)', result: 'Luz ámbar + extractor ON' },
                { color: '#ef4444', condition: 'Alarma', result: 'Rojo + sirena' },
                { color: '#a855f7', condition: 'Puerta abierta', result: 'Pausa + luz de aviso' },
            ],
        },
        {
            id: 'cnc_3018', kind: 'cnc', name: 'CNC', nickname: '3018 / GRBL', status: 'ACTIVO',
            variables: [
                { key: 'state', label: 'Estado GRBL' },
                { key: 'accessories.spindle_cw', label: 'Husillo activo' },
                { key: 'job.state', label: 'Estado del trabajo' },
            ],
            outputs: [
                { accessoryLabel: 'Relé Ventilador', port: 'GPIO26', on: true },
                { accessoryLabel: 'Baliza LED', port: 'GPIO25', on: true },
            ],
            inlineRules: [
                { color: '#3b82f6', condition: 'Trabajo activo', result: 'Baliza azul' },
                { color: '#22c55e', condition: 'Husillo activo', result: 'Extractor/ventilador ON' },
                { color: '#22c55e', condition: 'Fin de trabajo', result: 'Luz verde' },
                { color: '#ef4444', condition: 'Error o límite', result: 'Rojo intermitente' },
            ],
        },
    ];

    // Acciones con el mismo shape exacto que ya usa
    // backend/services/accessory_scenes.py (create_scene): {accessory_id,on} o
    // {accessory_id,color:[r,g,b]} -- así una futura pasada de backend puede
    // reusar ese código de aplicación de acciones sin cambiarlo.
    const GLOBAL_RULES = [
        { id: 'R01', condition: 'Temp boquilla > 220°C', action: { accessory_id: 'led_taller', color: [239, 68, 68] }, actionLabel: 'LED tira = Rojo', source: 'FLY_D5', enabled: true },
        { id: 'R02', condition: 'Impresión terminada', action: { accessory_id: 'led_taller', color: [34, 197, 94] }, actionLabel: 'LED = Verde + Ventilación OFF', source: 'FLY_D5', enabled: true },
        { id: 'R03', condition: 'Progreso impresión = X%', action: { accessory_id: 'led_taller', color: [168, 85, 247] }, actionLabel: 'LED tira = Gradiente(X%)', source: 'FLY_D5', enabled: true },
        { id: 'R04', condition: 'Láser estado = Grabando', action: { accessory_id: 'relay_extractor', on: true }, actionLabel: 'Extractor = ON', source: 'Sculpfun', enabled: true },
        { id: 'R05', condition: 'Puerta abierta', action: { accessory_id: 'relay_extractor', on: false }, actionLabel: 'Pausar láser + Luz amarilla', source: 'Sculpfun', enabled: true },
        { id: 'R06', condition: 'Husillo activo', action: { accessory_id: 'relay_ventilador', on: true }, actionLabel: 'Ventilador = ON', source: '3018', enabled: true },
        { id: 'R07', condition: 'Límite activado o Error', action: { accessory_id: 'led_baliza', color: [239, 68, 68] }, actionLabel: 'Luz roja intermitente', source: '3018', enabled: true },
    ];

    // Mismo shape que ya usaba el panel original (renderActivity()): {timestamp
    // unix, name, action, source}. timestamp fijo relativo a Date.now() para
    // que el mock se vea consistente en cada carga.
    const nowMs = Date.now();
    const ACTIVITY_LOG = [
        { timestamp: (nowMs - 5000) / 1000, name: 'Temp boquilla 215°C', action: 'reading', source: 'FLY_D5' },
        { timestamp: (nowMs - 67000) / 1000, name: 'Láser: Grabando…', action: 'reading', source: 'Sculpfun' },
        { timestamp: (nowMs - 128000) / 1000, name: 'Progreso impresión 65%', action: 'reading', source: 'FLY_D5' },
        { timestamp: (nowMs - 190000) / 1000, name: 'Husillo activado', action: 'reading', source: '3018' },
        { timestamp: (nowMs - 250000) / 1000, name: 'Puerta cerrada', action: 'reading', source: 'Sculpfun' },
    ];

    const SYSTEM_STATS = { cpu: 22, memory: 48, uptime: '2d 14h', connectionQuality: 'Excelente', latencyMs: 12 };

    // ============================================================================
    // ESTADO
    // ============================================================================

    function clonePins(pins) {
        return { left: pins.left.map(p => ({ ...p })), right: pins.right.map(p => ({ ...p })) };
    }

    const state = {
        view: 'pines', // overview | pines | scenes | leds | relays | sensors | automations | console | templates | alerts
        // connected: true cuando la placa se confirmó de verdad por USB (ver
        // asistente de firmware) -- una placa "connected" muestra solo sus
        // pines firmwareDefault por default (showAllPins la destapa toda);
        // una placa de referencia (agregada a mano, sin hardware real detrás)
        // arranca mostrando el mapa completo, útil para planear antes de
        // tener la placa en la mano.
        boards: [{ id: 'board_1', catalogId: 'esp32_devkit', name: 'Taller Principal', pins: clonePins(BOARD_CATALOG[0].pins), connected: false, showAllPins: true }],
        activeBoardId: 'board_1',
        selectedPinKey: null, // "left:8" | "right:3"
        pendingCategory: null, // categoría elegida en el dropdown del inspector, todavía sin "Aplicar" -- ver applyPinConfig()
        rules: GLOBAL_RULES.map(rule => ({ ...rule })),
        profile: { name: 'Taller Domótica', version: 'v1.0.2' },
        scanning: false, // "Escanear pines" -- ver scanPins()
        // Asistente de primer uso -- a diferencia de casi todo lo demás en
        // este archivo, esto SÍ habla con el backend real (discover/
        // list-ports/firmware/*, los mismos endpoints que ya usaba el panel
        // viejo) -- no es mock.
        wizard: {
            active: false,
            checked: false, // ya se hizo el chequeo inicial (discover) al montar
            step: 'intro', // intro | searching | found | notfound | ports | flashing | success
            foundBoard: null,
            ports: [],
            selectedPort: null,
            builds: [],
            selectedBuild: null,
            uploading: false,
            error: null,
        },
    };

    const WIZARD_DISMISSED_KEY = 'nopal_wsa_wizard_dismissed';
    let root = null;

    // ============================================================================
    // ICONOS
    // ============================================================================

    const icon = (body, size = 20) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
    const ICON_CPU = '<rect width="16" height="16" x="4" y="4" rx="2"/><rect width="6" height="6" x="9" y="9" rx="1"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/>';
    const ICON_GRID = '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>';
    const ICON_SCENE = '<path d="M12 2v4M4.9 4.9l2.8 2.8M2 12h4M4.9 19.1l2.8-2.8M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z"/>';
    const ICON_LED = '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.5.5.8 1 .8 1.7V16h6.4v-.8c0-.7.3-1.2.8-1.7A6 6 0 0 0 12 3Z"/>';
    const ICON_PLUG = '<path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v3a6 6 0 0 1-6 6 6 6 0 0 1-6-6V8Z"/>';
    const ICON_THERMO = '<path d="M14 4v10.5a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/>';
    const ICON_ZAP = '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z"/>';
    const ICON_TERMINAL = '<polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/>';
    const ICON_LAYOUT = '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/>';
    const ICON_BELL = '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>';
    const ICON_CLOSE = '<path d="M18 6 6 18M6 6l12 12"/>';
    const ICON_PLUS = '<path d="M12 5v14M5 12h14"/>';
    const ICON_GEAR = '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>';
    const ICON_CHECK = '<path d="M20 6 9 17l-5-5"/>';
    const ICON_ACTIVITY = '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>';
    const ICON_FOLDER = '<path d="M4 4h6l2 3h8a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"/>';

    // ============================================================================
    // AUXILIARES
    // ============================================================================

    const esc = value => typeof window.escapeHtml === 'function' ? window.escapeHtml(value) : String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
    const toast = (message, tone = 'success') => typeof window.showToast === 'function' ? window.showToast(message, tone) : console.log(message);

    // Único punto del archivo que habla con el backend real -- todo lo
    // demás (mapa de pines, escenas, reglas) es mock, ver banner al inicio.
    async function api(url, options = {}) {
        const response = await fetch(url, options);
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.detail || 'La operación no se pudo completar.');
        return data;
    }

    function activeBoard() {
        return state.boards.find(b => b.id === state.activeBoardId) || state.boards[0];
    }

    function catalogEntry(catalogId) {
        return BOARD_CATALOG.find(b => b.id === catalogId);
    }

    function categoryInfo(categoryId) {
        return PIN_CATEGORIES[categoryId] || PIN_CATEGORIES.free;
    }

    function selectedPin() {
        if (!state.selectedPinKey) return null;
        const [side, idx] = state.selectedPinKey.split(':');
        const board = activeBoard();
        return board?.pins?.[side]?.[Number(idx)] || null;
    }

    function pinSummary(board) {
        const counts = { assigned: 0, free: 0, reserved: 0, warnings: 0, byCategory: {} };
        const seenGpio = new Map();
        ['left', 'right'].forEach(side => {
            (board.pins[side] || []).forEach(pin => {
                const cat = pin.category;
                if (cat === 'free') counts.free++;
                else if (cat === 'power' || cat === 'ground' || cat === 'reserved') counts.reserved++;
                else counts.assigned++;
                counts.byCategory[cat] = (counts.byCategory[cat] || 0) + 1;
                seenGpio.set(pin.gpio, (seenGpio.get(pin.gpio) || 0) + 1);
            });
        });
        counts.warnings = [...seenGpio.values()].filter(n => n > 1).length;
        counts.total = counts.assigned + counts.free + counts.reserved;
        return counts;
    }

    function formatRelativeTime(unixSeconds) {
        const diffMs = Date.now() - unixSeconds * 1000;
        const minutes = Math.floor(diffMs / 60000);
        if (minutes < 1) return 'Justo ahora';
        if (minutes < 60) return `Hace ${minutes} min`;
        const hours = Math.floor(minutes / 60);
        return `Hace ${hours} h`;
    }

    function boardPlaceholderSvg(catalogId) {
        const entry = catalogEntry(catalogId);
        const chip = entry ? entry.chipLabel : 'MCU';
        const rows = 8;
        const height = 14 + rows * 11 + 8;
        let pinRects = '';
        for (let i = 0; i < rows; i++) {
            const y = 14 + i * 11;
            pinRects += `<rect x="6" y="${y}" width="10" height="5" rx="1" fill="var(--wsa-border)"/>`;
            pinRects += `<rect x="104" y="${y}" width="10" height="5" rx="1" fill="var(--wsa-border)"/>`;
        }
        return `
            <svg width="120" height="${height}" viewBox="0 0 120 ${height}" xmlns="http://www.w3.org/2000/svg">
                <rect x="16" y="4" width="88" height="${height - 8}" rx="8" fill="var(--wsa-panel)" stroke="var(--wsa-accent)" stroke-width="1.5"/>
                <rect x="34" y="${(height - 8) / 2 - 12}" width="52" height="24" rx="4" fill="var(--wsa-control)" stroke="var(--wsa-border)"/>
                <text x="60" y="${(height - 8) / 2 + 4}" text-anchor="middle" font-size="7" fill="var(--wsa-text-muted)" font-family="monospace">${esc(chip)}</text>
                ${pinRects}
            </svg>`;
    }

    // Si el modelo tiene foto real (hoy solo tcall_v13), se usa esa en vez del
    // placeholder genérico -- la ruta es relativa al propio script del plugin,
    // servido por NOPAL en /plugins-static/arduino-accessories/frontend/...
    function boardImageHtml(catalogId) {
        const entry = catalogEntry(catalogId);
        if (entry?.image) {
            return `<img class="wsa-board-photo" src="${esc(entry.image)}" alt="${esc(entry.label)}">`;
        }
        return boardPlaceholderSvg(catalogId);
    }

    // ============================================================================
    // ACCIONES (mock, todas locales -- ver banner de datos mock arriba)
    // ============================================================================

    async function addBoardFromForm(form) {
        const catalogId = form.querySelector('#wsa-addboard-model').value;
        const name = form.querySelector('#wsa-addboard-name').value.trim();
        const entry = catalogEntry(catalogId);
        if (!entry) return toast('Elige un modelo.', 'error');
        if (!name) return toast('Ponle un nombre a la placa.', 'error');
        try {
            const created = await api('/api/accessories/arduino/boards', {
                method: 'POST',
                body: new URLSearchParams({ catalog_id: catalogId, name, pins: JSON.stringify(entry.pins) }),
            });
            state.boards.push({ id: created.id, catalogId, name, pins: created.pins, connected: false, showAllPins: true });
            state.activeBoardId = created.id;
            state.selectedPinKey = null;
            closeAddBoardPanel();
            toast(`${name} (${entry.label}) se agregó.`);
            render();
        } catch (e) {
            toast(e.message || 'No se pudo agregar la placa.', 'error');
        }
    }

    // Carga las placas persistidas de verdad (ver board_pinmap_service.py) y
    // reemplaza la placa mock inicial en cuanto resuelve. Si todavía no hay
    // ninguna guardada (primera vez que se usa el plugin), crea la placa
    // por defecto en el backend para que quede persistida desde ya, en vez
    // de dejarla solo en memoria como antes.
    async function loadBoardsFromBackend() {
        try {
            const data = await api('/api/accessories/arduino/boards');
            let boards = data.boards || [];
            if (boards.length === 0) {
                const defaultEntry = BOARD_CATALOG[0];
                const created = await api('/api/accessories/arduino/boards', {
                    method: 'POST',
                    body: new URLSearchParams({
                        catalog_id: defaultEntry.id,
                        name: 'Taller Principal',
                        pins: JSON.stringify(defaultEntry.pins),
                    }),
                });
                boards = [created];
            }
            state.boards = boards.map(b => ({
                id: b.id,
                catalogId: b.catalog_id,
                name: b.name,
                pins: b.pins,
                device: b.device || null,
                ip: b.ip || null,
                connected: false,
                showAllPins: true,
            }));
            state.activeBoardId = state.boards[0]?.id || null;
            render();
        } catch (e) {
            toast('No se pudieron cargar las placas guardadas.', 'error');
        }
    }

    function selectPin(side, index) {
        state.selectedPinKey = `${side}:${index}`;
        state.pendingCategory = null;
        render();
    }

    // El dropdown "Función asignada" NO toca el pin real todavía -- solo
    // actualiza pendingCategory, así el badge/parámetros de abajo lo
    // reflejan en vivo mientras el usuario decide, sin comprometer nada
    // hasta que apriete "Aplicar configuración" (mismo criterio que el
    // mockup: elegir función != aplicarla).
    function setPendingCategory(categoryId) {
        state.pendingCategory = categoryId;
        render();
    }

    // Único otro punto del archivo (además de api()/asistente de firmware)
    // que habla con el backend real: guarda de verdad qué le asignaste a
    // este pin (ver board_pinmap_service.py). Es documentación/planificación
    // real -- el firmware sigue teniendo roles de pin fijos de fábrica, esto
    // no lo reconfigura a él.
    async function applyPinConfig() {
        const pin = selectedPin();
        const board = activeBoard();
        if (!pin || !board || !state.selectedPinKey) return;
        const category = state.pendingCategory || pin.category;
        const cat = categoryInfo(category);

        const common = {};
        root?.querySelectorAll('.wsa-inspector-common [data-wsa-common]').forEach(field => {
            common[field.dataset.wsaCommon] = field.type === 'checkbox' ? field.checked : field.value;
        });
        const params = {};
        cat.params.forEach(param => {
            const field = root?.querySelector(`[data-wsa-param="${param.key}"]`);
            if (!field) return;
            params[param.key] = field.type === 'checkbox' ? field.checked : field.value;
        });

        const [side, idxStr] = state.selectedPinKey.split(':');
        try {
            await api(`/api/accessories/arduino/boards/${board.id}/pins/${side}/${idxStr}`, {
                method: 'PUT',
                body: new URLSearchParams({ category, common: JSON.stringify(common), params: JSON.stringify(params) }),
            });
            pin.category = category;
            pin.label = cat.label;
            pin.common = common;
            pin.params = params;
            state.pendingCategory = null;
            toast('Configuración aplicada.');
            render();
        } catch (e) {
            toast(e.message || 'No se pudo guardar la configuración del pin.', 'error');
        }
    }

    function toggleRule(ruleId) {
        const rule = state.rules.find(r => r.id === ruleId);
        if (rule) rule.enabled = !rule.enabled;
        render();
    }

    // Mock: todavía no hay comando real de firmware para "leer el estado
    // eléctrico de cada pin" -- esto simula el tiempo de un escaneo real y
    // reporta cuántos pines de la placa activa están libres/asignados/con
    // conflicto, usando los datos que ya tenemos en memoria (no inventa
    // hardware nuevo). Sirve como el punto donde después se conecta un
    // comando NOPAL:PINS? real.
    function scanPins() {
        if (state.scanning) return;
        state.scanning = true;
        render();
        setTimeout(() => {
            const summary = pinSummary(activeBoard());
            state.scanning = false;
            toast(`Escaneo completo: ${summary.assigned} asignados, ${summary.free} libres${summary.warnings ? `, ${summary.warnings} con conflicto` : ''}.`, summary.warnings ? 'warning' : 'success');
            render();
        }, 900);
    }

    // ============================================================================
    // ASISTENTE DE FIRMWARE -- primer uso, real (no mock)
    // ============================================================================
    // Reusa los mismos endpoints reales que ya usaba el panel viejo
    // (backend/router.py, sin cambios): /arduino/discover, /arduino/list-ports
    // (nuevo, agregado para este asistente -- expone list_usb_arduino_ports()
    // que ya existía en el backend pero no estaba conectado a ningún
    // endpoint), /firmware/builds, /firmware/upload, /firmware/flash-usb.

    function wizardDismissed() {
        try { return localStorage.getItem(WIZARD_DISMISSED_KEY) === '1'; } catch { return false; }
    }
    function dismissWizard() {
        try { localStorage.setItem(WIZARD_DISMISSED_KEY, '1'); } catch { /* localStorage no disponible -- no es crítico */ }
    }

    // Convierte el resultado real de /discover (USB, trae "device" y "chip")
    // o de /probe-wifi (WiFi, trae "ip" pero NO "chip" -- ese endpoint pega
    // a GET /api/status de la placa, que no reporta modelo de chip, solo
    // capacidades) en una entrada de state.boards. El catálogo se adivina
    // por el nombre del chip cuando está disponible (USB); por WiFi no hay
    // forma de saberlo así que se asume esp32_devkit (es el único de los 4
    // modelos con WiFi realmente ejercitado hasta ahora). Si en el futuro
    // el firmware reporta más detalle esto se afina.
    function adoptDiscoveredBoard(info) {
        const key = info.device || info.ip;
        const catalogId = /esp8266/i.test(info.chip || '') ? 'esp8266_generic' : 'esp32_devkit';
        const entry = catalogEntry(catalogId);
        const existing = state.boards.find(b => (b.device || b.ip) === key);
        const board = existing || { id: `board_${info.device ? 'usb' : 'wifi'}_${key}`, pins: clonePins(entry.pins) };
        Object.assign(board, {
            catalogId,
            name: existing?.name || (info.device ? `Placa USB (${info.device})` : `Placa WiFi (${info.hostname || info.ip})`),
            device: info.device || null,
            ip: info.ip || null,
            connected: true,
            showAllPins: false,
            deviceInfo: info, // chip/firmware/relays/pwm_led/ws2812/wifi crudos, para mostrar datos reales
        });
        if (!existing) {
            state.boards.push(board);
            persistNewlyDiscoveredBoard(board);
        }
        state.activeBoardId = board.id;
        return board;
    }

    // Best-effort: persiste en el backend una placa recién adoptada por el
    // asistente (antes quedaba solo en memoria) -- así, si el usuario le
    // cambia la función a algún pin después, applyPinConfig() tiene un
    // board.id real contra el cual guardar. No bloquea ni revierte el
    // flujo del asistente si falla -- nunca interrumpir una operación real
    // de hardware por un problema de persistencia.
    async function persistNewlyDiscoveredBoard(board) {
        try {
            const created = await api('/api/accessories/arduino/boards', {
                method: 'POST',
                body: new URLSearchParams({
                    catalog_id: board.catalogId,
                    name: board.name,
                    pins: JSON.stringify(board.pins),
                    device: board.device || '',
                    ip: board.ip || '',
                }),
            });
            const oldId = board.id;
            board.id = created.id;
            if (state.activeBoardId === oldId) state.activeBoardId = created.id;
        } catch (e) {
            // Sin red o backend no disponible momentáneamente: la placa
            // sigue funcionando en memoria, solo no persiste todavía.
        }
    }

    async function wizardProbeWifi(ip, username, password) {
        if (!ip) return toast('Ponle la IP de la placa.', 'error');
        state.wizard.step = 'wifi-probing';
        state.wizard.error = null;
        render();
        try {
            const board = await api('/api/accessories/arduino/probe-wifi', {
                method: 'POST',
                body: new URLSearchParams({ ip, username: username || '', password: password || '' }),
            });
            state.wizard.foundBoard = adoptDiscoveredBoard(board);
            state.wizard.step = 'found';
        } catch (error) {
            state.wizard.step = 'wifi';
            state.wizard.error = error.message;
        }
        render();
    }

    // Se llama una sola vez al montar. Si /discover encuentra una placa real
    // respondiendo, el asistente ni se muestra -- va directo al panel con
    // esa placa ya marcada como conectada. Si no encuentra nada, solo
    // interrumpe con el asistente la primera vez (después, "Saltar por
    // ahora" queda guardado en localStorage); si el usuario nunca lo
    // saltó explícitamente y sigue sin haber placa, se lo mostramos igual
    // cada vez que entra -- es información real (no hay firmware detectado),
    // no algo para ocultar por comodidad.
    async function checkSetupStatus() {
        try {
            const data = await api('/api/accessories/arduino/discover');
            const boards = data.boards || [];
            if (boards.length) {
                boards.forEach(adoptDiscoveredBoard);
                state.wizard.active = false;
            } else {
                state.wizard.active = !wizardDismissed();
            }
        } catch {
            // Sin permiso/error de red -- no se traba el panel, solo no se
            // puede confirmar una placa real; se sigue tratando todo como mock.
            state.wizard.active = !wizardDismissed();
        }
        state.wizard.checked = true;
        render();
    }

    async function wizardSearch() {
        state.wizard.step = 'searching';
        state.wizard.error = null;
        render();
        try {
            const data = await api('/api/accessories/arduino/discover');
            const boards = data.boards || [];
            if (boards.length) {
                state.wizard.foundBoard = adoptDiscoveredBoard(boards[0]);
                state.wizard.step = 'found';
            } else {
                state.wizard.step = 'notfound';
            }
        } catch (error) {
            state.wizard.step = 'notfound';
            state.wizard.error = error.message;
        }
        render();
    }

    async function wizardShowPorts() {
        state.wizard.step = 'ports';
        state.wizard.error = null;
        render();
        try {
            const [portsData, buildsData] = await Promise.all([
                api('/api/accessories/arduino/list-ports'),
                api('/api/accessories/firmware/builds'),
            ]);
            state.wizard.ports = portsData.ports || [];
            state.wizard.builds = buildsData.builds || [];
            state.wizard.selectedBuild = state.wizard.builds[0]?.filename || null;
        } catch (error) {
            state.wizard.error = error.message;
        }
        render();
    }

    async function wizardUploadFile(file) {
        if (!file) return;
        state.wizard.uploading = true;
        render();
        const form = new FormData();
        form.append('file', file);
        try {
            const result = await api('/api/accessories/firmware/upload', { method: 'POST', body: form });
            state.wizard.builds.unshift(result.build);
            state.wizard.selectedBuild = result.build.filename;
            toast(`${file.name} se subió correctamente.`);
        } catch (error) {
            toast(error.message, 'error');
        }
        state.wizard.uploading = false;
        render();
    }

    async function wizardFlash() {
        const { selectedPort, selectedBuild } = state.wizard;
        if (!selectedPort) return toast('Elegí un puerto primero.', 'error');
        if (!selectedBuild) return toast('Elegí (o subí) un binario .bin primero.', 'error');
        state.wizard.step = 'flashing';
        state.wizard.error = null;
        render();
        try {
            await api('/api/accessories/firmware/flash-usb', {
                method: 'POST',
                body: new URLSearchParams({ device: selectedPort, filename: selectedBuild }),
            });
            // Tras flashear la placa reinicia sola -- le damos un margen antes
            // de re-consultar /discover para confirmar que ya contesta.
            await new Promise(resolve => setTimeout(resolve, 2500));
            const data = await api('/api/accessories/arduino/discover');
            const found = (data.boards || []).find(b => b.device === selectedPort);
            if (found) {
                state.wizard.foundBoard = adoptDiscoveredBoard(found);
                state.wizard.step = 'success';
            } else {
                state.wizard.step = 'notfound';
                state.wizard.error = 'El flasheo terminó pero la placa todavía no contesta -- puede necesitar más tiempo o un reset manual.';
            }
        } catch (error) {
            state.wizard.step = 'ports';
            state.wizard.error = error.message;
        }
        render();
    }

    function wizardSkip() {
        dismissWizard();
        state.wizard.active = false;
        render();
    }

    function wizardFinish() {
        state.wizard.active = false;
        render();
    }

    function wizardRestart() {
        state.wizard.step = 'intro';
        state.wizard.error = null;
        render();
    }

    // ============================================================================
    // RENDER -- shell
    // ============================================================================

    const SUBVIEWS = [
        { id: 'overview', label: 'Vista general', icon: ICON_LAYOUT },
        { id: 'pines', label: 'Mapa de pines', icon: ICON_GRID },
        { id: 'scenes', label: 'Escenas de máquina', icon: ICON_SCENE, badge: 'NUEVO' },
        { id: 'leds', label: 'LEDs', icon: ICON_LED },
        { id: 'relays', label: 'Relés', icon: ICON_PLUG },
        { id: 'sensors', label: 'Sensores', icon: ICON_THERMO },
        { id: 'automations', label: 'Automatizaciones', icon: ICON_ZAP },
        { id: 'console', label: 'Consola', icon: ICON_TERMINAL },
        { id: 'templates', label: 'Plantillas', icon: ICON_FOLDER },
        { id: 'alerts', label: 'Alertas', icon: ICON_BELL },
    ];

    function moduleHtml() {
        return `
            <section id="arduino-accessories-section" class="view-section wsa-section" style="display:none">
                <header class="wsa-header">
                    <div class="wsa-header-icon">${icon(ICON_CPU, 26)}</div>
                    <div class="wsa-header-copy">
                        <h1>Automatización de Taller</h1>
                        <span class="wsa-header-sub">Controla escenas y dispositivos del taller por máquina</span>
                    </div>
                    <div class="wsa-header-chips" id="wsa-header-chips"></div>
                    <button type="button" class="wsa-btn-icon" id="wsa-close-btn" title="Cerrar">${icon(ICON_CLOSE, 16)}</button>
                </header>

                <div class="wsa-layout">
                    <aside class="wsa-sidebar">
                        <nav class="wsa-subnav" id="wsa-subnav"></nav>
                        <div class="wsa-profile-card">
                            <div><strong>${esc(state.profile.name)}</strong><small>${esc(state.profile.version)}</small></div>
                            <button type="button" class="wsa-btn-icon" title="Ajustes">${icon(ICON_GEAR, 15)}</button>
                        </div>
                    </aside>
                    <div class="wsa-content" id="wsa-content"></div>
                </div>

                <footer class="wsa-statusbar" id="wsa-statusbar"></footer>

                <div class="wsa-panel-overlay" id="wsa-addboard-panel" hidden>
                    <div class="wsa-panel-backdrop" data-wsa-close-addboard></div>
                    <form class="wsa-panel-dialog" id="wsa-addboard-form">
                        <div class="wsa-panel-header"><span><strong>Agregar placa</strong><small>Elige el modelo y dale un nombre -- se crea su propia pestaña en Mapa de pines.</small></span><button type="button" data-wsa-close-addboard>×</button></div>
                        <label><span>Modelo</span>
                            <select id="wsa-addboard-model">${BOARD_CATALOG.map(b => `<option value="${b.id}">${esc(b.label)}</option>`).join('')}</select>
                        </label>
                        <label><span>Nombre / apodo</span><input type="text" id="wsa-addboard-name" maxlength="40" placeholder="Ej. Estación láser"></label>
                        <div class="wsa-panel-actions"><button type="button" data-wsa-close-addboard>Cancelar</button><button type="submit" class="wsa-btn-accent">Agregar</button></div>
                    </form>
                </div>
            </section>`;
    }

    function renderHeaderChips() {
        const board = activeBoard();
        const entry = catalogEntry(board.catalogId);
        const summary = pinSummary(board);
        root.querySelector('#wsa-header-chips').innerHTML = `
            <div class="wsa-chip">
                <label><span class="wsa-status-dot is-on"></span>DISPOSITIVO CONECTADO</label>
                <strong>${esc(entry?.label || board.catalogId)}</strong>
                <small>${esc(board.name)}</small>
            </div>
            <div class="wsa-chip">
                <label>PERFIL ACTIVO</label>
                <strong>${esc(state.profile.name)}</strong>
                <small>${esc(state.profile.version)}</small>
            </div>
            <div class="wsa-chip">
                <label>${icon(ICON_CHECK, 13)} ESTADO DEL TALLER</label>
                <strong>${summary.warnings ? 'Con advertencias' : 'Todo en orden'}</strong>
                <small>${state.boards.length} placa(s) · ${MACHINES.length} máquinas activas</small>
            </div>
            <div class="wsa-chip wsa-chip-alert">
                <label>${icon(ICON_BELL, 13)} ALERTAS</label>
                <strong>${summary.warnings}</strong>
                <small>${summary.warnings === 1 ? 'advertencia' : 'advertencias'}</small>
            </div>`;
    }

    function renderSubnav() {
        root.querySelector('#wsa-subnav').innerHTML = SUBVIEWS.map(item => `
            <button type="button" class="wsa-subnav-item${state.view === item.id ? ' active' : ''}" data-wsa-view="${item.id}">
                ${icon(item.icon, 17)}
                <span>${esc(item.label)}</span>
                ${item.badge ? `<em class="wsa-nav-badge">${item.badge}</em>` : ''}
            </button>`).join('');
    }

    function renderStatusbar() {
        const summary = pinSummary(activeBoard());
        root.querySelector('#wsa-statusbar').innerHTML = `
            <span><span class="wsa-status-dot is-on"></span>Estado: Listo</span>
            <span>Pines asignados: ${summary.assigned}/${summary.total}</span>
            <span>Memoria: ${SYSTEM_STATS.memory}%</span>
            <span>Latencia: ${SYSTEM_STATS.latencyMs} ms</span>
            <span>${esc(state.profile.name)} – Panel Principal</span>`;
    }

    function switchWorkshopView(view) {
        state.view = view;
        state.selectedPinKey = null;
        render();
    }

    // ============================================================================
    // RENDER -- vistas
    // ============================================================================

    function renderContent() {
        const content = root.querySelector('#wsa-content');
        if (!state.wizard.checked) { content.innerHTML = viewWizardChecking(); return; }
        if (state.wizard.active) { content.innerHTML = viewWizard(); return; }
        switch (state.view) {
            case 'overview': content.innerHTML = viewOverview(); break;
            case 'pines': content.innerHTML = viewPinMap(); break;
            case 'scenes': content.innerHTML = viewScenes(); break;
            case 'leds': content.innerHTML = viewFilteredPins('led_ws2812,led_pwm', 'LEDs', 'Tiras y LEDs PWM asignados en todas tus placas.'); break;
            case 'relays': content.innerHTML = viewFilteredPins('relay', 'Relés', 'Salidas de relé asignadas en todas tus placas.'); break;
            case 'sensors': content.innerHTML = viewFilteredPins('sensor_temp,sensor_smoke,sensor_door,i2c,adc', 'Sensores', 'Entradas de sensor asignadas en todas tus placas.'); break;
            case 'automations': content.innerHTML = viewAutomations(); break;
            case 'console': content.innerHTML = viewConsole(); break;
            case 'templates': content.innerHTML = viewTemplates(); break;
            case 'alerts': content.innerHTML = viewAlerts(); break;
            default: content.innerHTML = '';
        }
    }

    function cardWrap(title, iconBody, bodyHtml, extraClass = '') {
        return `<section class="wsa-card ${extraClass}"><h2>${icon(iconBody, 16)}${title}</h2>${bodyHtml}</section>`;
    }

    // ============================================================================
    // RENDER -- asistente de firmware
    // ============================================================================

    function viewWizardChecking() {
        return `<div class="wsa-wizard"><div class="wsa-wizard-card">
            <div class="wsa-spinner"></div>
            <p>Verificando si tu placa ya tiene firmware NOPAL…</p>
        </div></div>`;
    }

    function wizardDeviceInfoHtml(info) {
        return `<div class="wsa-info-grid">
            ${info.chip ? `<div><label>Chip</label><strong>${esc(info.chip)}</strong></div>` : ''}
            <div><label>Firmware</label><strong>v${esc(info.firmware || '—')}</strong></div>
            <div><label>${info.device ? 'Puerto' : 'IP'}</label><strong>${esc(info.device || info.ip || '—')}</strong></div>
            <div><label>Relés</label><strong>${info.relays ?? '—'}</strong></div>
            <div><label>LED PWM</label><strong>${info.pwm_led ? 'Sí' : 'No'}</strong></div>
            <div><label>WS2812</label><strong>${info.ws2812 ? `Sí (${info.ws2812_count || 0} px)` : 'No'}</strong></div>
        </div>`;
    }

    function viewWizard() {
        const w = state.wizard;
        const errorHtml = w.error ? `<p class="wsa-wizard-error">${esc(w.error)}</p>` : '';

        if (w.step === 'intro') {
            return `<div class="wsa-wizard"><div class="wsa-wizard-card">
                <div class="wsa-wizard-icon">${icon(ICON_CPU, 30)}</div>
                <h2>Antes de empezar</h2>
                <p>No detectamos ninguna placa con firmware NOPAL respondiendo ahora mismo. Si ya tenés una placa flasheada (por USB o ya conectada a tu WiFi), buscala. Si es una placa nueva, te ayudamos a flashearla acá mismo.</p>
                <div class="wsa-wizard-actions">
                    <button type="button" class="wsa-btn wsa-btn-accent wsa-btn-block" id="wsa-wizard-search">${icon(ICON_ZAP, 15)}<span>Buscar por USB</span></button>
                    <button type="button" class="wsa-btn wsa-btn-block" id="wsa-wizard-wifi">${icon(ICON_ZAP, 15)}<span>Buscar por WiFi (IP)</span></button>
                    <button type="button" class="wsa-btn wsa-btn-block" id="wsa-wizard-skip">Ya tengo una placa configurada / Saltar por ahora</button>
                </div>
            </div></div>`;
        }

        if (w.step === 'wifi' || w.step === 'wifi-probing') {
            if (w.step === 'wifi-probing') {
                return `<div class="wsa-wizard"><div class="wsa-wizard-card">
                    <div class="wsa-spinner"></div>
                    <p>Probando conexión con la placa…</p>
                </div></div>`;
            }
            return `<div class="wsa-wizard"><div class="wsa-wizard-card">
                <h2>Buscar por WiFi</h2>
                <p class="wsa-empty-note">Misma IP y credenciales OTA que usa la placa para ElegantOTA (ver secrets.h del firmware).</p>
                ${errorHtml}
                <label><span>IP de la placa</span><input type="text" id="wsa-wizard-wifi-ip" placeholder="192.168.1.50"></label>
                <label><span>Usuario OTA</span><input type="text" id="wsa-wizard-wifi-user" placeholder="nopal"></label>
                <label><span>Contraseña OTA</span><input type="password" id="wsa-wizard-wifi-pass"></label>
                <div class="wsa-wizard-actions">
                    <button type="button" class="wsa-btn wsa-btn-accent wsa-btn-block" id="wsa-wizard-wifi-probe">${icon(ICON_ZAP, 15)}<span>Probar conexión</span></button>
                    <button type="button" class="wsa-btn wsa-btn-block" id="wsa-wizard-restart">← Volver</button>
                </div>
            </div></div>`;
        }

        if (w.step === 'searching') {
            return `<div class="wsa-wizard"><div class="wsa-wizard-card">
                <div class="wsa-spinner"></div>
                <p>Buscando placas conectadas por USB…</p>
            </div></div>`;
        }

        if (w.step === 'found') {
            return `<div class="wsa-wizard"><div class="wsa-wizard-card">
                <div class="wsa-wizard-icon wsa-wizard-icon-ok">${icon(ICON_CHECK, 30)}</div>
                <h2>¡Encontramos tu placa!</h2>
                ${wizardDeviceInfoHtml(w.foundBoard?.deviceInfo || {})}
                <div class="wsa-wizard-actions">
                    <button type="button" class="wsa-btn wsa-btn-accent wsa-btn-block" id="wsa-wizard-finish">${icon(ICON_CHECK, 15)}<span>Continuar al panel</span></button>
                </div>
            </div></div>`;
        }

        if (w.step === 'notfound') {
            return `<div class="wsa-wizard"><div class="wsa-wizard-card">
                <h2>No detectamos ninguna placa</h2>
                <p class="wsa-empty-note">Conectá tu placa por USB (esperá unos segundos a que arranque) y volvé a intentar. Si es una placa nueva sin firmware todavía, flasheala desde acá.</p>
                ${errorHtml}
                <div class="wsa-wizard-actions">
                    <button type="button" class="wsa-btn wsa-btn-block" id="wsa-wizard-search">${icon(ICON_ZAP, 15)}<span>Reintentar por USB</span></button>
                    <button type="button" class="wsa-btn wsa-btn-block" id="wsa-wizard-wifi">${icon(ICON_ZAP, 15)}<span>Buscar por WiFi (IP)</span></button>
                    <button type="button" class="wsa-btn wsa-btn-accent wsa-btn-block" id="wsa-wizard-ports">${icon(ICON_ZAP, 15)}<span>Flashear firmware ahora</span></button>
                    <button type="button" class="wsa-btn wsa-btn-block" id="wsa-wizard-skip">Saltar por ahora</button>
                </div>
            </div></div>`;
        }

        if (w.step === 'ports') {
            return `<div class="wsa-wizard"><div class="wsa-wizard-card wsa-wizard-card-wide">
                <h2>Flashear firmware</h2>
                <p class="wsa-empty-note">NOPAL no compila nada -- solo flashea un binario .bin ya exportado desde Arduino IDE (Sketch → Export Compiled Binary).</p>
                ${errorHtml}
                <div class="wsa-param-title">Puerto</div>
                ${w.ports.length ? w.ports.map(p => `
                    <label class="wsa-wizard-radio-row"><input type="radio" name="wsa-wizard-port" value="${esc(p.device)}" ${w.selectedPort === p.device ? 'checked' : ''}><span><strong>${esc(p.device)}</strong><small>${esc(p.chip || '')} ${esc(p.description || '')}</small></span></label>`).join('')
                    : '<p class="wsa-empty">No vemos puertos USB candidatos -- revisá el cable/drivers.</p>'}
                <div class="wsa-param-title">Binario (.bin)</div>
                <label><span>Subir uno nuevo</span><input type="file" id="wsa-wizard-file" accept=".bin" ${w.uploading ? 'disabled' : ''}></label>
                ${w.builds.length ? w.builds.map(b => `
                    <label class="wsa-wizard-radio-row"><input type="radio" name="wsa-wizard-build" value="${esc(b.filename)}" ${w.selectedBuild === b.filename ? 'checked' : ''}><span>${esc(b.filename)}</span></label>`).join('')
                    : '<p class="wsa-empty">Todavía no subiste ningún binario.</p>'}
                <div class="wsa-wizard-actions">
                    <button type="button" class="wsa-btn wsa-btn-accent wsa-btn-block" id="wsa-wizard-flash">${icon(ICON_ZAP, 15)}<span>Flashear</span></button>
                    <button type="button" class="wsa-btn wsa-btn-block" id="wsa-wizard-restart">← Volver</button>
                </div>
            </div></div>`;
        }

        if (w.step === 'flashing') {
            return `<div class="wsa-wizard"><div class="wsa-wizard-card">
                <div class="wsa-spinner"></div>
                <p>Flasheando firmware -- no desconectes la placa…</p>
            </div></div>`;
        }

        if (w.step === 'success') {
            return `<div class="wsa-wizard"><div class="wsa-wizard-card">
                <div class="wsa-wizard-icon wsa-wizard-icon-ok">${icon(ICON_CHECK, 30)}</div>
                <h2>Firmware flasheado</h2>
                ${wizardDeviceInfoHtml(w.foundBoard?.deviceInfo || {})}
                <div class="wsa-wizard-actions">
                    <button type="button" class="wsa-btn wsa-btn-accent wsa-btn-block" id="wsa-wizard-finish">${icon(ICON_CHECK, 15)}<span>Ir al panel</span></button>
                </div>
            </div></div>`;
        }

        return '';
    }

    function viewOverview() {
        const summary = pinSummary(activeBoard());
        return `
            <div class="wsa-grid-3">
                <div class="wsa-tile"><strong>${state.boards.length}</strong><span>Placas configuradas</span></div>
                <div class="wsa-tile"><strong>${MACHINES.length}</strong><span>Máquinas con escenas</span></div>
                <div class="wsa-tile"><strong>${state.rules.filter(r => r.enabled).length}/${state.rules.length}</strong><span>Reglas activas</span></div>
                <div class="wsa-tile"><strong>${summary.assigned}</strong><span>Pines asignados</span></div>
            </div>
            ${cardWrap('Máquinas del taller', ICON_SCENE, `<div class="wsa-machine-mini-list">${MACHINES.map(m => `
                <div class="wsa-machine-mini-row"><span class="wsa-status-dot is-on"></span><div><strong>${esc(m.name)}</strong><small>${esc(m.nickname)}</small></div></div>`).join('')}</div>`)}
            ${cardWrap('Actividad reciente', ICON_ACTIVITY, renderActivityListHtml())}
            <p class="wsa-empty-note">Esta vista es un resumen de las demás secciones -- entra a "Mapa de pines" o "Escenas de máquina" para el detalle completo.</p>`;
    }

    // Con showAllPins=false (default para una placa `connected` de verdad),
    // solo se listan los pines firmwareDefault -- lo que el firmware
    // realmente expone hoy -- en vez del mapa genérico completo. Se conserva
    // el índice ORIGINAL de cada pin en board.pins[side] (no la posición
    // dentro de la lista filtrada), porque selectPin()/selectedPin() buscan
    // por ese índice real.
    function visiblePinEntries(board, side) {
        const entries = board.pins[side].map((pin, i) => ({ pin, i }));
        if (board.showAllPins) return entries;
        return entries.filter(({ pin }) => pin.firmwareDefault);
    }

    function viewPinMap() {
        const board = activeBoard();
        const entry = catalogEntry(board.catalogId);
        const summary = pinSummary(board);
        const leftEntries = visiblePinEntries(board, 'left');
        const rightEntries = visiblePinEntries(board, 'right');
        return `
            <div class="wsa-boardbar">
                <div class="wsa-board-tabs" id="wsa-board-tabs">
                    ${state.boards.map(b => `<button type="button" class="wsa-board-tab${b.id === state.activeBoardId ? ' active' : ''}" data-wsa-board="${b.id}">${b.connected ? '<span class="wsa-status-dot is-on"></span>' : ''}${esc(b.name)}</button>`).join('')}
                    <button type="button" class="wsa-board-tab wsa-board-tab-add" id="wsa-addboard-btn">${icon(ICON_PLUS, 14)}<span>Agregar placa</span></button>
                </div>
                <div class="wsa-boardbar-actions">
                    <button type="button" class="wsa-btn" id="wsa-connect-btn">${icon(ICON_ZAP, 14)}<span>Conectar placa real (USB/WiFi)</span></button>
                    <button type="button" class="wsa-btn" id="wsa-scan-btn" ${state.scanning ? 'disabled' : ''}>${icon(ICON_ZAP, 14)}<span>${state.scanning ? 'Escaneando…' : 'Escanear pines'}</span></button>
                </div>
            </div>

            ${board.connected && board.deviceInfo ? cardWrap('Datos reales de la placa (por USB, no mock)', ICON_CHECK, wizardDeviceInfoHtml(board.deviceInfo)) : ''}

            <div class="wsa-pinmap-grid">
                <div class="wsa-card wsa-pinmap-card">
                    <div class="wsa-card-title-row">
                        <h2>${icon(ICON_GRID, 16)}Mapa de pines · ${esc(entry?.label || '')}${board.connected ? ' <small class="wsa-connected-tag">placa conectada</small>' : ''}</h2>
                        ${!entry?.firmwareVerified ? `<small class="wsa-note">${esc(entry?.note || 'Pinout genérico, no verificado')}</small>` : (entry?.note ? `<small class="wsa-text-muted">${esc(entry.note)}</small>` : '')}
                    </div>
                    <label class="wsa-showall-toggle"><input type="checkbox" id="wsa-showall-pins" ${board.showAllPins ? 'checked' : ''}><span></span> Mostrar todos los pines del conector (no solo los que usa el firmware)</label>
                    <div class="wsa-pin-columns">
                        <div class="wsa-pin-col">${leftEntries.map(({ pin, i }) => pinRowHtml(pin, 'left', i)).join('') || '<p class="wsa-empty">El firmware no usa pines de este lado.</p>'}</div>
                        <div class="wsa-board-image">${boardImageHtml(board.catalogId)}</div>
                        <div class="wsa-pin-col">${rightEntries.map(({ pin, i }) => pinRowHtml(pin, 'right', i)).join('') || '<p class="wsa-empty">El firmware no usa pines de este lado.</p>'}</div>
                    </div>
                </div>
                <div class="wsa-card wsa-inspector-card" id="wsa-inspector">${renderPinInspectorHtml()}</div>
            </div>

            ${cardWrap('Leyenda de roles', ICON_GRID, `<div class="wsa-legend">${Object.entries(PIN_CATEGORIES).map(([id, cat]) => `<span class="wsa-legend-item"><i style="background:${cat.color}"></i>${esc(cat.label)}</span>`).join('')}</div>`)}

            <div class="wsa-grid-2">
                ${cardWrap('Resumen de pines', ICON_GRID, pinDonutHtml(summary))}
                ${cardWrap('Asignaciones activas', ICON_CHECK, assignmentsChecklistHtml(summary))}
            </div>

            ${machinesInlineHtml()}

            ${cardWrap('Automatizaciones activas (reglas globales)', ICON_ZAP, rulesTableHtml(), 'wsa-span-full')}

            <div class="wsa-grid-2">
                ${cardWrap('Actividad reciente', ICON_ACTIVITY, renderActivityListHtml())}
                ${cardWrap('Estado del sistema', ICON_CPU, systemStatsHtml())}
            </div>`;
    }

    function pinRowHtml(pin, side, index) {
        const cat = categoryInfo(pin.category);
        const key = `${side}:${index}`;
        const selected = state.selectedPinKey === key;
        return `
            <div class="wsa-pin-row${selected ? ' selected' : ''}" data-wsa-pin="${key}">
                <span class="wsa-pin-chip" style="background:${cat.color}22;color:${cat.color};border-color:${cat.color}55">${esc(pin.gpio)}</span>
                <span class="wsa-pin-desc">${esc(pin.label)}</span>
                <span class="wsa-pin-num">${pin.physical}</span>
            </div>`;
    }

    function renderPinInspectorHtml() {
        const pin = selectedPin();
        if (!pin) {
            return `<h2>${icon(ICON_GEAR, 16)}Inspector de pin</h2><p class="wsa-empty">Selecciona un pin del mapa para configurarlo.</p>`;
        }
        const fixed = categoryInfo(pin.category).fixed;
        // displayCategoryId es lo que se MUESTRA (badge + parámetros): la
        // categoría pendiente en el dropdown si el usuario ya la cambió, o
        // si no, la real del pin -- así el badge nunca contradice al
        // dropdown como pasaba antes de este fix.
        const displayCategoryId = state.pendingCategory || pin.category;
        const cat = categoryInfo(displayCategoryId);
        const dirty = state.pendingCategory && state.pendingCategory !== pin.category;
        const common = pin.common || {};
        const paramsHtml = cat.params.map(param => pinParamFieldHtml(param, (pin.params || {})[param.key])).join('');
        return `
            <h2>${icon(ICON_GEAR, 16)}Inspector de pin</h2>
            <div class="wsa-inspector-title"><strong>${esc(pin.gpio)}</strong><span>#${pin.physical}</span></div>
            <p class="wsa-inspector-sub">${esc(pin.label)}</p>
            <label><span>Función asignada</span>
                <select id="wsa-inspector-category" ${fixed ? 'disabled' : ''}>
                    ${Object.entries(PIN_CATEGORIES).filter(([id, c]) => !c.fixed || id === pin.category).map(([id, c]) => `<option value="${id}" ${id === displayCategoryId ? 'selected' : ''}>${esc(c.label)}</option>`).join('')}
                </select>
            </label>
            <div class="wsa-category-badge" style="color:${cat.color}"><span style="background:${cat.color}"></span>${esc(cat.label)}${dirty ? ' <em>(sin aplicar)</em>' : ''}</div>
            ${!fixed ? `
            <div class="wsa-inspector-common">
                <label><span>Modo</span><select data-wsa-common="mode"><option${common.mode === 'Entrada' ? '' : ' selected'}>Salida</option><option${common.mode === 'Entrada' ? ' selected' : ''}>Entrada</option></select></label>
                <label><span>Estado inicial</span><select data-wsa-common="initialState"><option${common.initialState === 'HIGH (Encendido)' ? '' : ' selected'}>LOW (Apagado)</option><option${common.initialState === 'HIGH (Encendido)' ? ' selected' : ''}>HIGH (Encendido)</option></select></label>
                <label><span>Nivel lógico</span><select data-wsa-common="logicLevel"><option${common.logicLevel === '5V' ? '' : ' selected'}>3.3V</option><option${common.logicLevel === '5V' ? ' selected' : ''}>5V</option></select></label>
                <label class="wsa-inline-toggle"><span>Invertir salida</span><label class="wsa-switch"><input type="checkbox" data-wsa-common="invertOutput"${common.invertOutput ? ' checked' : ''}><span></span></label></label>
            </div>` : '<p class="wsa-empty">Pin fijo del conector -- no configurable.</p>'}
            ${paramsHtml ? `<div class="wsa-param-title">Parámetros</div>${paramsHtml}` : ''}
            <button type="button" class="wsa-btn wsa-btn-accent wsa-btn-block" id="wsa-apply-pin" ${fixed ? 'disabled' : ''}>${icon(ICON_CHECK, 15)}<span>Aplicar configuración</span></button>`;
    }

    function pinParamFieldHtml(param, currentValue) {
        const label = `<span>${esc(param.label)}</span>`;
        if (param.type === 'select') {
            const val = currentValue !== undefined ? currentValue : param.options[0];
            return `<label>${label}<select data-wsa-param="${param.key}">${param.options.map(o => `<option${o === val ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select></label>`;
        }
        if (param.type === 'slider') {
            const val = currentValue !== undefined ? currentValue : 75;
            return `<label>${label}<input type="range" data-wsa-param="${param.key}" min="${param.min}" max="${param.max}" value="${esc(val)}"></label>`;
        }
        if (param.type === 'color') {
            const val = currentValue !== undefined ? currentValue : '#34f58b';
            return `<label>${label}<input type="color" data-wsa-param="${param.key}" value="${esc(val)}"></label>`;
        }
        if (param.type === 'toggle') {
            return `<label class="wsa-inline-toggle">${label}<label class="wsa-switch"><input type="checkbox" data-wsa-param="${param.key}"${currentValue ? ' checked' : ''}><span></span></label></label>`;
        }
        return '';
    }

    function pinDonutHtml(summary) {
        const total = summary.total || 1;
        const order = Object.keys(summary.byCategory);
        let acc = 0;
        const stops = order.map(cat => {
            const from = acc;
            acc += (summary.byCategory[cat] / total) * 100;
            return `${categoryInfo(cat).color} ${from}% ${acc}%`;
        }).join(', ');
        return `
            <div class="wsa-donut-wrap">
                <div class="wsa-donut" style="background: conic-gradient(${stops || 'var(--wsa-border) 0 100%'})"><span>${summary.total}<small>Total</small></span></div>
                <div class="wsa-donut-legend">${order.map(cat => `<span><i style="background:${categoryInfo(cat).color}"></i>${esc(categoryInfo(cat).label)} · ${summary.byCategory[cat]}</span>`).join('')}</div>
            </div>
            <div class="wsa-progress-row"><span>Asignados</span><strong>${summary.assigned}/${summary.total}</strong></div>
            <div class="wsa-progress-bar"><div style="width:${(summary.assigned / total) * 100}%"></div></div>`;
    }

    function assignmentsChecklistHtml(summary) {
        const rows = [
            ['LEDs', (summary.byCategory.led_ws2812 || 0) + (summary.byCategory.led_pwm || 0)],
            ['Relés', summary.byCategory.relay || 0],
            ['Sensores', (summary.byCategory.sensor_temp || 0) + (summary.byCategory.sensor_smoke || 0) + (summary.byCategory.sensor_door || 0)],
            ['Comunicaciones', (summary.byCategory.i2c || 0) + (summary.byCategory.uart || 0) + (summary.byCategory.spi || 0)],
        ];
        return `<div class="wsa-checklist">${rows.map(([label, n]) => `<div class="wsa-checklist-row"><span>${label}</span><strong>${n}</strong></div>`).join('')}</div>
            <div class="wsa-progress-row"><span>Total</span><strong>${summary.assigned}/${summary.total}</strong></div>
            <div class="wsa-progress-bar"><div style="width:${(summary.assigned / (summary.total || 1)) * 100}%"></div></div>`;
    }

    function renderActivityListHtml() {
        if (!ACTIVITY_LOG.length) return '<p class="wsa-empty">Sin actividad todavía.</p>';
        return `<ul class="wsa-activity-list">${ACTIVITY_LOG.map(e => `<li><span class="wsa-status-dot is-on"></span><span>${esc(e.name)} <em>${esc(e.source)}</em></span><small>${formatRelativeTime(e.timestamp)}</small></li>`).join('')}</ul>`;
    }

    function systemStatsHtml() {
        return `
            <div class="wsa-stats-rings">
                <div class="wsa-ring" style="background: conic-gradient(var(--wsa-accent) 0 ${SYSTEM_STATS.cpu}%, var(--wsa-border) 0)"><span>${SYSTEM_STATS.cpu}%</span></div>
                <div class="wsa-ring-label">CPU</div>
                <div class="wsa-ring" style="background: conic-gradient(var(--wsa-accent) 0 ${SYSTEM_STATS.memory}%, var(--wsa-border) 0)"><span>${SYSTEM_STATS.memory}%</span></div>
                <div class="wsa-ring-label">Memoria</div>
                <div class="wsa-ring wsa-ring-text"><span>${SYSTEM_STATS.uptime}</span></div>
                <div class="wsa-ring-label">Uptime</div>
            </div>
            <div class="wsa-info-grid">
                <div><label>Conexión</label><strong>${esc(SYSTEM_STATS.connectionQuality)}</strong></div>
                <div><label>Latencia</label><strong>${SYSTEM_STATS.latencyMs} ms</strong></div>
            </div>
            <button type="button" class="wsa-btn wsa-btn-block">Diagnóstico</button>`;
    }

    function machinesInlineHtml() {
        return `<section class="wsa-card wsa-span-full">
            <div class="wsa-card-title-row"><h2>${icon(ICON_SCENE, 16)}Escenas por máquina</h2></div>
            <div class="wsa-machine-cards">
                ${MACHINES.map(machineCardHtml).join('')}
                <div class="wsa-machine-card wsa-machine-card-add"><div>${icon(ICON_PLUS, 22)}<strong>Añadir máquina</strong><small>Configura escenas para más equipos de tu taller.</small></div></div>
            </div>
        </section>`;
    }

    function viewScenes() {
        return `<div class="wsa-card"><h2>${icon(ICON_SCENE, 16)}Escenas de máquina</h2><p class="wsa-empty-note">Reglas propias por máquina -- fuente de datos, variables disponibles y salidas asociadas.</p></div>
            <div class="wsa-machine-cards">${MACHINES.map(machineCardHtml).join('')}
            <div class="wsa-machine-card wsa-machine-card-add"><div>${icon(ICON_PLUS, 22)}<strong>Añadir máquina</strong><small>Configura escenas para más equipos de tu taller.</small></div></div></div>`;
    }

    function machineCardHtml(machine) {
        return `
            <div class="wsa-machine-card">
                <div class="wsa-machine-card-head"><strong>${esc(machine.name.toUpperCase())}</strong><span class="wsa-status-pill">${machine.status}</span></div>
                <small class="wsa-machine-nickname">${esc(machine.nickname)}</small>
                <div class="wsa-machine-section-title">Fuente de datos: ${esc(machine.nickname)}</div>
                <div class="wsa-var-chips">${machine.variables.map(v => `<span>${esc(v.label)}</span>`).join('')}</div>
                <div class="wsa-machine-section-title">Escenas</div>
                <div class="wsa-inline-rules">${machine.inlineRules.map(r => `<div><span class="wsa-status-dot" style="background:${r.color}"></span>${esc(r.condition)} → ${esc(r.result)}</div>`).join('')}</div>
                <div class="wsa-machine-section-title">Salidas / Acciones</div>
                ${machine.outputs.map(o => `<div class="wsa-output-row"><span>${esc(o.accessoryLabel)}</span><small>Puerto: ${esc(o.port)}</small><label class="wsa-switch"><input type="checkbox" ${o.on ? 'checked' : ''}><span></span></label></div>`).join('')}
                <button type="button" class="wsa-btn wsa-btn-block">Ver editor de reglas →</button>
            </div>`;
    }

    // Agrupado por placa (no una lista plana mezclada) -- el mismo número de
    // GPIO significa cosas distintas según la placa (ej. GPIO4 es WS2812 en
    // el ESP32 genérico pero el módem SIM800L en el T-Call), así que cada
    // placa necesita su propia sección claramente separada para que no se
    // lea como una contradicción.
    function viewFilteredPins(categoryCsv, title, subtitle) {
        const categories = categoryCsv.split(',');
        const groups = state.boards.map(board => {
            const rows = [];
            ['left', 'right'].forEach(side => (board.pins[side] || []).forEach(pin => {
                if (categories.includes(pin.category)) rows.push(pin);
            }));
            return { board, rows };
        }).filter(group => group.rows.length);

        return `<div class="wsa-card"><h2>${icon(ICON_GRID, 16)}${title}</h2><p class="wsa-empty-note">${subtitle}</p></div>
            ${groups.length ? groups.map(({ board, rows }) => `
                <div class="wsa-card">
                    <div class="wsa-card-title-row"><h2>${board.connected ? '<span class="wsa-status-dot is-on"></span>' : ''}${esc(board.name)}</h2><small class="wsa-text-muted">${rows.length} pin(es)</small></div>
                    <div class="wsa-filtered-list">${rows.map(pin => `
                        <div class="wsa-device-row"><span class="wsa-status-dot is-on"></span><div><strong>${esc(pin.label)}</strong><small>${esc(pin.gpio)}</small></div><span class="wsa-pill" style="color:${categoryInfo(pin.category).color}">${esc(categoryInfo(pin.category).label)}</span></div>`).join('')}</div>
                </div>`).join('')
            : '<div class="wsa-card"><p class="wsa-empty">No hay pines asignados a esta categoría todavía, en ninguna placa.</p></div>'}
        `;
    }

    function rulesTableHtml() {
        return `<div class="wsa-table-scroll"><table class="wsa-table">
            <thead><tr><th>ID</th><th>SI (Condición)</th><th>ENTONCES (Acción)</th><th>Fuente</th><th>Estado</th></tr></thead>
            <tbody>${state.rules.map(r => `
                <tr>
                    <td>${esc(r.id)}</td>
                    <td>${esc(r.condition)}</td>
                    <td>${esc(r.actionLabel)}</td>
                    <td>${esc(r.source)}</td>
                    <td><label class="wsa-switch"><input type="checkbox" data-wsa-rule="${r.id}" ${r.enabled ? 'checked' : ''}><span></span></label></td>
                </tr>`).join('')}</tbody>
        </table></div>
        <button type="button" class="wsa-btn wsa-btn-accent" id="wsa-new-rule-btn">${icon(ICON_PLUS, 14)}<span>Nueva regla</span></button>`;
    }

    function viewAutomations() {
        return cardWrap('Automatizaciones activas (reglas globales)', ICON_ZAP, rulesTableHtml());
    }

    function viewConsole() {
        return `<div class="wsa-card"><h2>${icon(ICON_TERMINAL, 16)}Consola</h2>
            <div class="wsa-console">${['NOPAL:ID?', 'NOPAL,role=accessory,chip=ESP32,fw=1.4,relays=4,...', 'NOPAL:R1:ON', 'OK'].map(line => `<div>${esc(line)}</div>`).join('')}</div>
            <p class="wsa-empty-note">Consola de solo lectura (mock) -- se conectará al puerto serie/HTTP real de la placa.</p>
        </div>`;
    }

    function viewTemplates() {
        const templates = [
            { name: 'Impresora 3D básica', desc: 'LED de estado + relé de ventilación.' },
            { name: 'Estación láser', desc: 'Extractor + sirena + luces de alarma.' },
            { name: 'CNC con baliza', desc: 'Baliza tricolor + extractor de polvo.' },
        ];
        return `<div class="wsa-card"><h2>${icon(ICON_FOLDER, 16)}Plantillas</h2><p class="wsa-empty-note">Configuraciones de pines predefinidas para arrancar rápido.</p>
            <div class="wsa-template-list">${templates.map(t => `<div class="wsa-device-row"><span class="wsa-status-dot is-on"></span><div><strong>${esc(t.name)}</strong><small>${esc(t.desc)}</small></div><button type="button" class="wsa-btn">Usar</button></div>`).join('')}</div>
        </div>`;
    }

    function viewAlerts() {
        const summary = pinSummary(activeBoard());
        const alerts = [];
        if (summary.warnings) alerts.push({ tone: 'warning', text: `${summary.warnings} pin(es) con más de una función asignada en "${activeBoard().name}".` });
        alerts.push({ tone: 'info', text: 'El transporte WiFi del accesorio requiere reflashear el firmware v1.4 para quedar activo.' });
        return `<div class="wsa-card"><h2>${icon(ICON_BELL, 16)}Alertas</h2>
            <div class="wsa-alert-list">${alerts.map(a => `<div class="wsa-alert-row wsa-alert-${a.tone}">${esc(a.text)}</div>`).join('')}</div>
        </div>`;
    }

    // ============================================================================
    // EVENTOS
    // ============================================================================

    function openAddBoardPanel() { root.querySelector('#wsa-addboard-panel').hidden = false; }
    function closeAddBoardPanel() {
        root.querySelector('#wsa-addboard-panel').hidden = true;
        root.querySelector('#wsa-addboard-form').reset();
    }

    function render() {
        if (!root) return;
        renderHeaderChips();
        renderSubnav();
        renderContent();
        renderStatusbar();
    }

    function bindEvents() {
        root.querySelector('#wsa-close-btn').addEventListener('click', () => window.switchSection?.('dashboard'));

        root.querySelector('#wsa-subnav').addEventListener('click', event => {
            const btn = event.target.closest('[data-wsa-view]');
            if (btn) switchWorkshopView(btn.dataset.wsaView);
        });

        root.querySelectorAll('[data-wsa-close-addboard]').forEach(el => el.addEventListener('click', closeAddBoardPanel));
        root.querySelector('#wsa-addboard-form').addEventListener('submit', event => { event.preventDefault(); addBoardFromForm(event.target); });

        root.querySelector('#wsa-content').addEventListener('click', event => {
            const boardTab = event.target.closest('[data-wsa-board]');
            if (boardTab) { state.activeBoardId = boardTab.dataset.wsaBoard; state.selectedPinKey = null; render(); return; }

            if (event.target.closest('#wsa-addboard-btn')) { openAddBoardPanel(); return; }

            if (event.target.closest('#wsa-scan-btn')) { scanPins(); return; }

            if (event.target.closest('#wsa-connect-btn')) {
                state.wizard.active = true;
                state.wizard.step = 'intro';
                state.wizard.error = null;
                render();
                return;
            }

            const pinRow = event.target.closest('[data-wsa-pin]');
            if (pinRow) { const [side, idx] = pinRow.dataset.wsaPin.split(':'); selectPin(side, Number(idx)); return; }

            if (event.target.closest('#wsa-apply-pin')) { applyPinConfig(); return; }
            if (event.target.closest('#wsa-new-rule-btn')) { toast('Editor de reglas: próximamente.'); return; }

            const ruleToggle = event.target.closest('[data-wsa-rule]');
            if (ruleToggle) { toggleRule(ruleToggle.dataset.wsaRule); return; }

            if (event.target.closest('#wsa-wizard-search')) { wizardSearch(); return; }
            if (event.target.closest('#wsa-wizard-skip')) { wizardSkip(); return; }
            if (event.target.closest('#wsa-wizard-finish')) { wizardFinish(); return; }
            if (event.target.closest('#wsa-wizard-ports')) { wizardShowPorts(); return; }
            if (event.target.closest('#wsa-wizard-restart')) { wizardRestart(); return; }
            if (event.target.closest('#wsa-wizard-flash')) { wizardFlash(); return; }
            if (event.target.closest('#wsa-wizard-wifi')) { state.wizard.step = 'wifi'; state.wizard.error = null; render(); return; }
            if (event.target.closest('#wsa-wizard-wifi-probe')) {
                const ip = root.querySelector('#wsa-wizard-wifi-ip').value.trim();
                const username = root.querySelector('#wsa-wizard-wifi-user').value;
                const password = root.querySelector('#wsa-wizard-wifi-pass').value;
                wizardProbeWifi(ip, username, password);
                return;
            }
        });

        root.querySelector('#wsa-content').addEventListener('change', event => {
            if (event.target.id === 'wsa-inspector-category') { setPendingCategory(event.target.value); return; }
            if (event.target.id === 'wsa-showall-pins') {
                const board = activeBoard();
                board.showAllPins = event.target.checked;
                state.selectedPinKey = null;
                render();
                return;
            }
            if (event.target.name === 'wsa-wizard-port') { state.wizard.selectedPort = event.target.value; return; }
            if (event.target.name === 'wsa-wizard-build') { state.wizard.selectedBuild = event.target.value; return; }
            if (event.target.id === 'wsa-wizard-file') { wizardUploadFile(event.target.files[0]); event.target.value = ''; }
        });
    }

    // ============================================================================
    // MONTAJE
    // ============================================================================

    function mount() {
        if (document.getElementById('arduino-accessories-section')) return;
        const pluginsContainer = document.querySelector('.nav-category[data-group="plugins"] .nav-category-items');
        const navButton = document.createElement('button');
        navButton.type = 'button';
        navButton.className = 'nav-item';
        navButton.dataset.section = 'arduino-accessories';
        navButton.dataset.pluginNav = PLUGIN_ID;
        navButton.title = 'Automatización de Taller';
        navButton.innerHTML = `${icon(ICON_CPU, 20)}<span>Automatización de Taller</span>`;
        navButton.addEventListener('click', () => window.switchSection?.('arduino-accessories'));
        pluginsContainer?.appendChild(navButton);

        const wrapper = document.createElement('div');
        wrapper.innerHTML = moduleHtml();
        root = wrapper.firstElementChild;
        const content = document.querySelector('.content');
        content?.insertBefore(root, document.getElementById('gcode-editor-section'));

        bindEvents();
        render();
        window.applySidebarOrder?.();
        checkSetupStatus();
        loadBoardsFromBackend();
    }

    function unmount() {
        document.querySelector(`[data-plugin-nav="${PLUGIN_ID}"]`)?.remove();
        document.getElementById('arduino-accessories-section')?.remove();
        root = null;
    }

    window.NopalPluginRegistry = window.NopalPluginRegistry || {};
    window.NopalPluginRegistry[PLUGIN_ID] = { mount, unmount, version: '2.0.0' };
    mount();
})();
