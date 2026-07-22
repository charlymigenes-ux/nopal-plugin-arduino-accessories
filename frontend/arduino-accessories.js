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
        view: 'overview', // overview | pines | scenes | leds | relays | sensors | automations | console | templates | alerts
        overviewTab: 'relays',
        accessories: [],
        scenes: [],
        activity: [],
        boardTelemetry: [],
        workshopLoading: true,
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
            pendingBoardInfo: null,
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
    const ICON_BOOK = '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V5H6.5A2.5 2.5 0 0 0 4 7.5z"/><path d="M12 5v12"/>';

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

    async function loadWorkshopData({ quiet = false } = {}) {
        if (!quiet) state.workshopLoading = true;
        try {
            const [accessoriesData, scenesData, activityData, telemetryData] = await Promise.all([
                api('/api/accessories/status'),
                api('/api/accessories/scenes'),
                api('/api/accessories/activity'),
                api('/api/accessories/arduino/telemetry'),
            ]);
            state.accessories = accessoriesData.accessories || [];
            state.scenes = scenesData.scenes || [];
            state.activity = activityData.activity || [];
            state.boardTelemetry = telemetryData.boards || [];
        } catch (error) {
            if (!quiet) toast(error.message || 'No se pudo cargar el estado del taller.', 'error');
        } finally {
            state.workshopLoading = false;
            if (state.view === 'overview') render();
        }
    }

    async function setWorkshopAccessoryPower(accessoryId, on) {
        const accessory = state.accessories.find(item => item.id === accessoryId);
        if (!accessory) return;
        const previous = accessory.on;
        accessory.on = on;
        render();
        try {
            await api('/api/accessories/power', {
                method: 'POST',
                body: new URLSearchParams({ id: accessoryId, on: String(on) }),
            });
            toast(`${accessory.name}: ${on ? 'encendido' : 'apagado'}.`);
            await loadWorkshopData({ quiet: true });
        } catch (error) {
            accessory.on = previous;
            render();
            toast(error.message || 'No se pudo cambiar el accesorio.', 'error');
        }
    }

    function hexToRgb(hex) {
        const normalized = String(hex || '').replace('#', '');
        if (!/^[0-9a-f]{6}$/i.test(normalized)) return null;
        return [0, 2, 4].map(offset => parseInt(normalized.slice(offset, offset + 2), 16));
    }

    function rgbToHex(rgb) {
        if (!Array.isArray(rgb) || rgb.length !== 3) return '#57e04b';
        return `#${rgb.map(value => Math.max(0, Math.min(255, Number(value) || 0)).toString(16).padStart(2, '0')).join('')}`;
    }

    async function setWorkshopLedColor(accessoryId, hex) {
        const rgb = hexToRgb(hex);
        if (!rgb) return;
        try {
            await api('/api/accessories/led', {
                method: 'POST',
                body: new URLSearchParams({ id: accessoryId, r: rgb[0], g: rgb[1], b: rgb[2] }),
            });
            toast('Color actualizado.');
            await loadWorkshopData({ quiet: true });
        } catch (error) {
            toast(error.message || 'No se pudo cambiar la iluminación.', 'error');
        }
    }

    async function runWorkshopScene(sceneId) {
        const scene = state.scenes.find(item => item.id === sceneId);
        try {
            await api(`/api/accessories/scenes/${encodeURIComponent(sceneId)}/run`, { method: 'POST' });
            toast(`Escena “${scene?.name || 'Taller'}” aplicada.`);
            await loadWorkshopData({ quiet: true });
        } catch (error) {
            toast(error.message || 'No se pudo ejecutar la escena.', 'error');
        }
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

    function formatDuration(milliseconds) {
        const totalMinutes = Math.max(0, Math.floor(Number(milliseconds || 0) / 60000));
        const days = Math.floor(totalMinutes / 1440);
        const hours = Math.floor((totalMinutes % 1440) / 60);
        const minutes = totalMinutes % 60;
        return `${days}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`;
    }

    // `rowCount` = la cantidad de filas de pines visibles a los costados
    // (el mayor entre izquierda/derecha) -- antes esto era un número fijo
    // (8) sin relación con las filas reales, así que el dibujo quedaba
    // chico y centrado en medio de una columna mucho más alta, con un
    // montón de espacio vacío arriba/abajo (se leía como "falta la
    // imagen"). Ahora dibuja una fila por cada fila real, para que las
    // marcas de pines del costado del chip queden a la misma altura que
    // las filas del mapa (la placa se estira al 100% de su columna via
    // CSS -- ver .wsa-board-image / .wsa-board-image svg).
    function boardPlaceholderSvg(catalogId, rowCount) {
        const entry = catalogEntry(catalogId);
        const chip = entry ? entry.chipLabel : 'MCU';
        const rows = Math.max(rowCount || 8, 1);
        const height = 14 + rows * 11 + 8;
        let pinRects = '';
        for (let i = 0; i < rows; i++) {
            const y = 14 + i * 11;
            pinRects += `<rect x="6" y="${y}" width="10" height="5" rx="1" fill="var(--wsa-border)"/>`;
            pinRects += `<rect x="104" y="${y}" width="10" height="5" rx="1" fill="var(--wsa-border)"/>`;
        }
        return `
            <svg width="120" height="100%" viewBox="0 0 120 ${height}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="16" y="4" width="88" height="${height - 8}" rx="8" fill="var(--wsa-panel)" stroke="var(--wsa-accent)" stroke-width="1.5"/>
                <rect x="34" y="${(height - 8) / 2 - 12}" width="52" height="24" rx="4" fill="var(--wsa-control)" stroke="var(--wsa-border)"/>
                <text x="60" y="${(height - 8) / 2 + 4}" text-anchor="middle" font-size="7" fill="var(--wsa-text-muted)" font-family="monospace">${esc(chip)}</text>
                ${pinRects}
            </svg>`;
    }

    // Si el modelo tiene foto real (hoy solo tcall_v13), se usa esa en vez del
    // placeholder genérico -- la ruta es relativa al propio script del plugin,
    // servido por NOPAL en /plugins-static/arduino-accessories/frontend/...
    // Con foto real no hace falta rowCount -- la foto se estira sola con
    // "height:auto" (ver CSS), no está hecha de filas dibujadas a mano.
    function boardImageHtml(catalogId, rowCount) {
        const entry = catalogEntry(catalogId);
        if (entry?.image) {
            return `<img class="wsa-board-photo" src="${esc(entry.image)}" alt="${esc(entry.label)}">`;
        }
        return boardPlaceholderSvg(catalogId, rowCount);
    }

    // ============================================================================
    // ACCIONES (mock, todas locales -- ver banner de datos mock arriba)
    // ============================================================================

    async function addBoardFromForm(form) {
        const catalogId = form.querySelector('#wsa-wizard-manual-model').value;
        const name = form.querySelector('#wsa-wizard-manual-name').value.trim();
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
            state.wizard.active = false;
            state.view = 'pines';
            toast(`${name} (${entry.label}) se agregó.`);
            render();
        } catch (e) {
            toast(e.message || 'No se pudo agregar la placa.', 'error');
        }
    }

    // ============================================================================
    // GESTIONAR PLACAS -- editar nombre/puerto/IP o eliminar una placa ya
    // agregada. Habla con el backend real (ver board_pinmap_service.py),
    // igual que addBoardFromForm/applyPinConfig.
    // ============================================================================

    function manageBoardsListHtml() {
        if (!state.boards.length) return '<p class="wsa-empty">Todavía no agregaste ninguna placa.</p>';
        return state.boards.map(board => `
            <div class="wsa-manageboard-row" data-wsa-manageboard="${board.id}">
                <div class="wsa-manageboard-fields">
                    <label><span>Nombre</span><input type="text" data-wsa-manageboard-field="name" value="${esc(board.name)}" maxlength="40"></label>
                    <label><span>Puerto USB</span><input type="text" data-wsa-manageboard-field="device" value="${esc(board.device || '')}" placeholder="/dev/ttyUSB0"></label>
                    <label><span>IP</span><input type="text" data-wsa-manageboard-field="ip" value="${esc(board.ip || '')}" placeholder="192.168.0.83"></label>
                </div>
                <div class="wsa-manageboard-actions">
                    <button type="button" class="wsa-btn-icon" data-wsa-manageboard-save="${board.id}" title="Guardar">${icon(ICON_CHECK, 14)}</button>
                    <button type="button" class="wsa-btn-icon wsa-btn-icon-danger" data-wsa-manageboard-delete="${board.id}" title="Eliminar">${icon(ICON_CLOSE, 14)}</button>
                </div>
            </div>`).join('');
    }

    function openManageBoardsPanel() {
        root.querySelector('#wsa-manageboards-list').innerHTML = manageBoardsListHtml();
        root.querySelector('#wsa-manageboards-panel').hidden = false;
    }

    function closeManageBoardsPanel() {
        root.querySelector('#wsa-manageboards-panel').hidden = true;
    }

    async function saveManageBoardInfo(boardId) {
        const row = root.querySelector(`.wsa-manageboard-row[data-wsa-manageboard="${boardId}"]`);
        if (!row) return;
        const name = row.querySelector('[data-wsa-manageboard-field="name"]').value.trim();
        const device = row.querySelector('[data-wsa-manageboard-field="device"]').value.trim();
        const ip = row.querySelector('[data-wsa-manageboard-field="ip"]').value.trim();
        if (!name) return toast('Ponle un nombre a la placa.', 'error');
        try {
            const updated = await api(`/api/accessories/arduino/boards/${boardId}`, {
                method: 'PUT',
                body: new URLSearchParams({ name, device, ip }),
            });
            const board = state.boards.find(b => b.id === boardId);
            if (board) Object.assign(board, { name: updated.name, device: updated.device, ip: updated.ip });
            toast('Placa actualizada.');
            render();
        } catch (e) {
            toast(e.message || 'No se pudo actualizar la placa.', 'error');
        }
    }

    async function deleteManageBoard(boardId) {
        const board = state.boards.find(b => b.id === boardId);
        if (!board) return;
        const confirmed = window.appConfirm
            ? await window.appConfirm(`¿Eliminar "${board.name}"? Se borra su configuración de pines guardada.`, 'Eliminar placa')
            : window.confirm(`¿Eliminar "${board.name}"?`);
        if (!confirmed) return;
        try {
            await api(`/api/accessories/arduino/boards/${boardId}`, { method: 'DELETE' });
            state.boards = state.boards.filter(b => b.id !== boardId);
            if (state.activeBoardId === boardId) {
                state.activeBoardId = state.boards[0]?.id || null;
                state.selectedPinKey = null;
            }
            toast('Placa eliminada.');
            if (state.boards.length) openManageBoardsPanel(); else closeManageBoardsPanel();
            render();
        } catch (e) {
            toast(e.message || 'No se pudo eliminar la placa.', 'error');
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
    function catalogIdForDiscoveredBoard(info) {
        const identity = [info.board, info.chip, info.model, info.hostname, info.firmware]
            .filter(Boolean).join(' ').toLowerCase().replace(/[\s-]+/g, '_');
        if (/tcall|sim800l/.test(identity)) return 'tcall_v13';
        if (/wemos|d1_?mini/.test(identity)) return 'wemos_d1_mini';
        if (/nodemcu/.test(identity)) return 'nodemcu_v3';
        if (/esp8266|esp_?12/.test(identity)) return 'esp8266_generic';
        if (/esp32_devkit|esp32_wroom|esp32_d0wd|esp32/.test(identity)) return 'esp32_devkit';
        return null;
    }

    function handleDiscoveredBoard(info) {
        const catalogId = catalogIdForDiscoveredBoard(info);
        if (!catalogId) {
            state.wizard.pendingBoardInfo = info;
            state.wizard.step = 'identify';
            return null;
        }
        return adoptDiscoveredBoard(info, catalogId);
    }

    function adoptDiscoveredBoard(info, catalogId) {
        const key = info.device || info.ip;
        const entry = catalogEntry(catalogId);
        const existing = state.boards.find(b => (b.device || b.ip) === key);
        const board = existing || { id: `board_${info.device ? 'usb' : 'wifi'}_${key}`, pins: clonePins(entry.pins) };
        const profileChanged = existing && existing.catalogId !== catalogId;
        Object.assign(board, {
            catalogId,
            name: existing?.name || (info.device ? `Placa USB (${info.device})` : `Placa WiFi (${info.hostname || info.ip})`),
            device: info.device || null,
            ip: info.ip || null,
            connected: true,
            showAllPins: false,
            deviceInfo: info, // chip/firmware/relays/pwm_led/ws2812/wifi crudos, para mostrar datos reales
        });
        if (profileChanged) board.pins = clonePins(entry.pins);
        if (!existing) {
            state.boards.push(board);
            persistNewlyDiscoveredBoard(board);
        } else if (profileChanged) {
            persistDetectedBoardProfile(board);
        }
        state.activeBoardId = board.id;
        return board;
    }

    async function persistDetectedBoardProfile(board) {
        try {
            await api(`/api/accessories/arduino/boards/${encodeURIComponent(board.id)}`, {
                method: 'PUT',
                body: new URLSearchParams({
                    catalog_id: board.catalogId,
                    pins: JSON.stringify(board.pins),
                    device: board.device || '',
                    ip: board.ip || '',
                }),
            });
        } catch (e) {
            toast('Detectamos el modelo, pero no pudimos guardar el mapa corregido.', 'error');
        }
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
            state.wizard.foundBoard = handleDiscoveredBoard(board);
            if (state.wizard.foundBoard) state.wizard.step = 'found';
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
                boards.forEach(info => {
                    const catalogId = catalogIdForDiscoveredBoard(info);
                    if (catalogId) adoptDiscoveredBoard(info, catalogId);
                });
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
                state.wizard.foundBoard = handleDiscoveredBoard(boards[0]);
                if (state.wizard.foundBoard) state.wizard.step = 'found';
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
                state.wizard.foundBoard = handleDiscoveredBoard(found);
                if (state.wizard.foundBoard) state.wizard.step = 'success';
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
        state.view = 'pines';
        state.selectedPinKey = null;
        render();
    }

    function wizardUseIdentifiedModel() {
        const model = root.querySelector('#wsa-wizard-identify-model')?.value;
        const info = state.wizard.pendingBoardInfo;
        if (!info || !catalogEntry(model)) return;
        state.wizard.foundBoard = adoptDiscoveredBoard(info, model);
        state.wizard.pendingBoardInfo = null;
        state.wizard.step = 'found';
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
                    <div class="wsa-header-icon">${icon(ICON_CPU, 34)}</div>
                    <div class="wsa-header-copy">
                        <h1>Accesorios Arduino/ESP32</h1>
                        <span class="wsa-header-sub"><strong>NOPAL Labs</strong> · v2.4.0</span>
                    </div>
                    <span class="wsa-header-online" id="wsa-header-online"><span class="wsa-status-dot"></span>Comprobando…</span>
                    <div class="wsa-header-actions">
                        <button type="button" class="wsa-btn" id="wsa-docs-btn">${icon(ICON_BOOK, 15)}<span>Documentación</span></button>
                        <button type="button" class="wsa-btn" id="wsa-config-btn">${icon(ICON_GEAR, 15)}<span>Configuración</span></button>
                        <button type="button" class="wsa-btn-icon" id="wsa-manage-header-btn" title="Gestionar placas">•••</button>
                    </div>
                    <div class="wsa-header-chips" id="wsa-header-chips"></div>
                    <button type="button" class="wsa-btn-icon" id="wsa-close-btn" title="Cerrar">${icon(ICON_CLOSE, 16)}</button>
                </header>

                <div class="wsa-layout">
                    <aside class="wsa-sidebar">
                        <nav class="wsa-subnav" id="wsa-subnav"></nav>
                        <div class="wsa-profile-card">
                            <div><strong>${esc(state.profile.name)}</strong><small>${esc(state.profile.version)}</small></div>
                            <button type="button" class="wsa-btn-icon wsa-btn-icon-ghost" id="wsa-profile-settings-btn" title="Ajustes">${icon(ICON_GEAR, 15)}</button>
                        </div>
                    </aside>
                    <div class="wsa-content" id="wsa-content"></div>
                </div>

                <footer class="wsa-statusbar" id="wsa-statusbar"></footer>

                <div class="wsa-panel-overlay" id="wsa-manageboards-panel" hidden>
                    <div class="wsa-panel-backdrop" data-wsa-close-manageboards></div>
                    <div class="wsa-panel-dialog wsa-manageboards-dialog">
                        <div class="wsa-panel-header"><span><strong>Gestionar placas</strong><small>Edita el nombre, puerto USB o IP de cada placa, o eliminala.</small></span><button type="button" data-wsa-close-manageboards>×</button></div>
                        <div class="wsa-manageboards-list" id="wsa-manageboards-list"></div>
                    </div>
                </div>
            </section>`;
    }

    function renderHeaderChips() {
        const board = activeBoard();
        const entry = catalogEntry(board.catalogId);
        const live = state.boardTelemetry.find(item => item.id === board.id);
        const info = live?.telemetry || board.deviceInfo || {};
        const online = Boolean(live?.online || board.connected);
        root.querySelector('#wsa-header-chips').innerHTML = `
            <div class="wsa-chip"><label>Placa</label><strong>${esc(info.chip || entry?.chipLabel || entry?.label || board.catalogId)}</strong></div>
            <div class="wsa-chip"><label>${board.ip ? 'IP local' : 'Puerto USB'}</label><strong>${esc(board.ip || board.device || '—')}</strong></div>
            <div class="wsa-chip"><label>Uptime</label><strong>${info.uptime_ms ? esc(formatDuration(info.uptime_ms)) : '—'}</strong></div>
            <div class="wsa-chip"><label>Firmware</label><strong>${info.firmware ? `v${esc(info.firmware)}` : '—'}</strong></div>`;
        const onlineEl = root.querySelector('#wsa-header-online');
        onlineEl.classList.toggle('is-online', online);
        onlineEl.innerHTML = `<span class="wsa-status-dot${online ? ' is-on' : ''}"></span>${online ? 'Activo y conectado' : 'Sin conexión confirmada'}`;
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
            case 'documentation': content.innerHTML = viewDocumentation(); break;
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
                    <button type="button" class="wsa-btn wsa-btn-block" id="wsa-wizard-manual">Agregar manualmente</button>
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

        if (w.step === 'identify') {
            const info = w.pendingBoardInfo || {};
            return `<div class="wsa-wizard"><div class="wsa-wizard-card">
                <h2>Placa detectada: confirma el modelo</h2>
                <p class="wsa-empty-note">La conexiÃ³n funciona, pero el firmware no reportÃ³ un identificador suficientemente preciso. Elige el modelo para cargar su mapa de pines correcto.</p>
                ${wizardDeviceInfoHtml(info)}
                <label><span>Modelo</span><select id="wsa-wizard-identify-model">${BOARD_CATALOG.map(b => `<option value="${b.id}">${esc(b.label)}</option>`).join('')}</select></label>
                <div class="wsa-wizard-actions">
                    <button type="button" class="wsa-btn wsa-btn-accent wsa-btn-block" id="wsa-wizard-identify-use">Usar este mapa de pines</button>
                    <button type="button" class="wsa-btn wsa-btn-block" id="wsa-wizard-restart">Volver</button>
                </div>
            </div></div>`;
        }

        if (w.step === 'manual') {
            return `<div class="wsa-wizard"><form class="wsa-wizard-card" id="wsa-wizard-manual-form">
                <h2>Agregar placa manualmente</h2>
                <p class="wsa-empty-note">Usa esta opciÃ³n sÃ³lo si la placa no puede identificarse por USB o WiFi.</p>
                <label><span>Modelo</span><select id="wsa-wizard-manual-model">${BOARD_CATALOG.map(b => `<option value="${b.id}">${esc(b.label)}</option>`).join('')}</select></label>
                <label><span>Nombre / apodo</span><input type="text" id="wsa-wizard-manual-name" maxlength="40" placeholder="Ej. EstaciÃ³n lÃ¡ser"></label>
                <div class="wsa-wizard-actions">
                    <button type="button" class="wsa-btn wsa-btn-accent wsa-btn-block" id="wsa-wizard-manual-add">Agregar con este mapa</button>
                    <button type="button" class="wsa-btn wsa-btn-block" id="wsa-wizard-restart">Volver</button>
                </div>
            </form></div>`;
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
        const board = activeBoard();
        const entry = catalogEntry(board?.catalogId);
        const liveBoard = state.boardTelemetry.find(item => item.id === board?.id);
        const info = liveBoard?.telemetry || board?.deviceInfo || {};
        const relays = state.accessories.filter(item => item.config?.relay != null || (item.kind !== 'led_strip' && !item.config?.led_mode));
        const leds = state.accessories.filter(item => item.kind === 'led_strip' || item.config?.led_mode);
        const activeCount = relays.filter(item => item.on === true).length;
        const relayCount = Number(info.relays || relays.length || 0);
        const ledCount = Number(info.ws2812_count || leds.length || 0);
        const online = Boolean(liveBoard?.online || board?.connected);
        const rssi = info.rssi != null ? `${info.rssi} dBm` : 'No reportada';
        const tabs = [
            ['relays', 'Relés'], ['lights', 'Tiras LED'], ['inputs', 'Entradas'],
            ['sensors', 'Sensores'], ['scenes', 'Macros'],
        ];
        return `
            <div class="wsa-classic-dashboard">
                <section class="wsa-classic-panel wsa-classic-summary">
                    <h2>${icon(ICON_ACTIVITY, 17)}Resumen del sistema</h2>
                    <div class="wsa-classic-metrics">
                        <article>${icon(ICON_LAYOUT, 34)}<strong>${relayCount || '—'}</strong><span>Relés</span><small>${activeCount} activos</small></article>
                        <article class="is-yellow">${icon(ICON_LED, 34)}<strong>${ledCount || '—'}</strong><span>Tiras LED</span><small>${leds.filter(item => item.on).length} activas</small></article>
                        <article class="is-blue">${icon(ICON_ZAP, 34)}<span>Conectividad</span><strong class="is-word">${board?.ip ? 'WiFi' : (board?.device ? 'USB' : '—')}</strong><small>Señal: ${esc(rssi)}</small></article>
                        <article class="is-purple">${icon(ICON_CHECK, 34)}<span>Estado</span><strong class="is-word">${online ? 'Óptimo' : 'Pendiente'}</strong><small>${online ? 'Telemetría real' : 'Sin respuesta'}</small></article>
                    </div>
                </section>

                <section class="wsa-classic-panel wsa-classic-power">
                    <h2>${icon(ICON_ZAP, 17)}Consumo y voltaje</h2>
                    <div class="wsa-classic-power-values"><div><span>Entrada ADC GPIO${esc(info.adc_gpio || '—')}</span><strong>${info.a0_raw != null ? `${esc(info.a0_raw)} RAW` : '—'}</strong><small>${info.a0_percent != null ? `${esc(info.a0_percent)}% del rango` : 'Sin lectura'}</small></div><div><span>Consumo actual</span><strong>—</strong><small>Sensor no instalado</small></div></div>
                    <div class="wsa-classic-signal"><i style="width:${Math.max(0, Math.min(100, Number(info.a0_percent || 0)))}%"></i></div>
                    <p>Lectura instantánea del ADC; NOPAL no inventa historial ni amperaje.</p>
                </section>

                <section class="wsa-classic-panel wsa-classic-connection">
                    <h2>${icon(ICON_ZAP, 17)}Estado de conexión</h2>
                    <ul><li><i class="${online ? 'on' : ''}"></i><span>Placa</span><strong>${online ? 'Conectada' : 'Sin respuesta'}</strong></li><li><i class="${info.wifi_connected ? 'on' : ''}"></i><span>WiFi${info.ssid ? ` (${esc(info.ssid)})` : ''}</span><strong>${info.wifi_connected ? esc(rssi) : 'No reportado'}</strong></li><li><i class="${online ? 'on' : ''}"></i><span>API / USB</span><strong>${online ? 'Disponible' : 'Pendiente'}</strong></li><li><i class="${online ? 'on' : ''}"></i><span>Tiempo de respuesta</span><strong>${info.latency_ms != null ? `${esc(info.latency_ms)} ms` : '—'}</strong></li></ul>
                    <button type="button" class="wsa-btn wsa-btn-block" id="wsa-workshop-refresh">${icon(ICON_ACTIVITY, 14)}Probar conexión</button>
                </section>

                <section class="wsa-classic-panel wsa-classic-controls">
                    <div class="wsa-classic-panel-head"><h2>${icon(ICON_LAYOUT, 17)}Dispositivos y controles</h2><button type="button" class="wsa-btn" id="wsa-classic-quick">${icon(ICON_ZAP, 14)}Acciones rápidas</button></div>
                    <nav class="wsa-classic-tabs">${tabs.map(([id, label]) => `<button type="button" class="${state.overviewTab === id ? 'active' : ''}" data-wsa-overview-tab="${id}">${esc(label)}</button>`).join('')}</nav>
                    ${classicControlPanel(relays, leds, board, info, liveBoard)}
                </section>

                <section class="wsa-classic-panel wsa-classic-activity">
                    <h2>${icon(ICON_ACTIVITY, 17)}Actividad reciente</h2>
                    ${classicActivityHtml()}
                </section>

                <section class="wsa-classic-panel wsa-classic-scenes">
                    <h2>${icon(ICON_SCENE, 17)}Macros y escenas</h2>
                    <div>${state.scenes.length ? state.scenes.map(scene => `<button type="button" class="wsa-btn" data-wsa-workshop-scene="${esc(scene.id)}">${icon(ICON_ZAP, 14)}${esc(scene.name)}</button>`).join('') : '<span class="wsa-empty">No hay escenas guardadas.</span>'}</div>
                </section>

                <section class="wsa-classic-panel wsa-classic-device">
                    <h2>${icon(ICON_CPU, 17)}Información del dispositivo</h2>
                    <div class="wsa-classic-device-body"><dl><dt>Modelo</dt><dd>${esc(info.chip || entry?.chipLabel || entry?.label || '—')}</dd><dt>Placa</dt><dd>${esc(info.board || board?.catalogId || '—')}</dd><dt>Conexión</dt><dd>${esc(board?.ip || board?.device || '—')}</dd><dt>Firmware</dt><dd>${info.firmware ? `v${esc(info.firmware)}` : '—'}</dd></dl><div><span>Memoria libre</span><strong>${info.free_heap ? `${Math.round(info.free_heap / 1024)} KB` : 'No disponible'}</strong><i><em style="width:${info.free_heap ? '63%' : '0%'}"></em></i><span>Perfil de pines</span><strong>${esc(entry?.label || 'Sin perfil')}</strong></div></div>
                </section>
            </div>`;
    }

    function classicControlPanel(relays, leds, board, info, liveBoard) {
        if (state.workshopLoading) return '<div class="wsa-classic-loading"><div class="wsa-spinner"></div><span>Leyendo la placa…</span></div>';
        if (state.overviewTab === 'relays') {
            const count = Math.max(relays.length, Number(info.relays || 0));
            if (!count) return '<div class="wsa-classic-empty">La placa no reportó relés. Revisa la conexión o la configuración.</div>';
            return `<div class="wsa-classic-relays">${Array.from({ length: count }, (_, index) => {
                const item = relays[index];
                return `<article>${icon(ICON_PLUG, 22)}<p><strong>${esc(item?.name || `Relé ${index + 1}`)}</strong><span>${item ? esc(item.kind || `Salida ${index + 1}`) : 'Sin registrar en NOPAL'}</span></p>${item ? `<label class="wsa-switch"><input type="checkbox" data-wsa-workshop-power="${esc(item.id)}" ${item.on ? 'checked' : ''} ${item.on === null ? 'disabled' : ''}><span></span></label>` : '<span class="wsa-classic-unassigned">Configurar</span>'}</article>`;
            }).join('')}</div><footer class="wsa-classic-control-footer"><span><i class="on"></i>${relays.filter(item => item.on).length} activos</span><span>${Math.max(0, count - relays.filter(item => item.on).length)} inactivos</span><button type="button" class="wsa-btn" id="wsa-workshop-add-accessory">Editar relés</button></footer>`;
        }
        if (state.overviewTab === 'lights') return workshopLightsPanel(leds);
        if (state.overviewTab === 'inputs') return `<div class="wsa-classic-telemetry"><article><span>Entrada</span><strong>GPIO${esc(info.adc_gpio || '—')} · ADC1</strong><small>Compatible con WiFi</small></article><article><span>Lectura RAW</span><strong>${info.a0_raw ?? '—'}</strong><small>12 bits · 0–4095</small></article><article><span>Porcentaje</span><strong>${info.a0_percent != null ? `${esc(info.a0_percent)}%` : '—'}</strong><small>Del rango ADC</small></article><article><span>Transporte</span><strong>${esc(liveBoard?.transport?.toUpperCase() || (board.ip ? 'WIFI' : 'USB'))}</strong><small>${esc(board.ip || board.device || 'Sin configurar')}</small></article></div>`;
        if (state.overviewTab === 'sensors') return workshopSensorsPanel(board, info, liveBoard);
        return workshopScenesPanel();
    }

    function classicActivityHtml() {
        if (!state.activity.length) return '<p class="wsa-classic-empty">Sin actividad reciente.</p>';
        return `<ul>${state.activity.slice(0, 5).map(event => `<li>${icon(ICON_ACTIVITY, 15)}<span>${esc(event.name)} · ${esc(event.action || 'evento')}</span><time>${formatRelativeTime(event.timestamp)}</time></li>`).join('')}</ul><button type="button" class="wsa-btn wsa-btn-block" data-wsa-view="console">Ver historial completo</button>`;
    }

    function viewDocumentation() {
        const board = activeBoard();
        const entry = catalogEntry(board.catalogId);
        const pins = [...(board.pins?.left || []), ...(board.pins?.right || [])];
        const usedPins = pins.filter(pin => pin.firmwareDefault || !['free', 'power', 'ground'].includes(pin.category));
        return `<div class="wsa-docs">
            <header class="wsa-docs-hero">
                <div><span>GUÍA INTEGRADA · PERFIL ACTIVO</span><h2>Documentación de ${esc(entry?.label || board.name)}</h2><p>Conexión, funciones, mapa de pines y comandos del firmware NOPAL en un solo lugar.</p></div>
                <button type="button" class="wsa-btn" id="wsa-docs-back">Volver al panel</button>
            </header>
            <nav><a href="#wsa-doc-start">Inicio rápido</a><a href="#wsa-doc-functions">Funciones</a><a href="#wsa-doc-pins">Mapa de pines</a><a href="#wsa-doc-safety">Seguridad</a><a href="#wsa-doc-services">Servicios</a><a href="#wsa-doc-commands">Comandos</a></nav>
            <div class="wsa-docs-grid">
                <section id="wsa-doc-start" class="wsa-doc-card wsa-doc-wide"><small>01</small><h3>Inicio rápido</h3><ol><li><b>Conecta la placa</b><span>En Mapa de pines pulsa “Agregar placa” y elige USB o WiFi.</span></li><li><b>Confirma el modelo</b><span>NOPAL lo detecta; sólo pregunta si el firmware no lo identifica.</span></li><li><b>Revisa el mapa</b><span>Se carga automáticamente el perfil ${esc(entry?.label || '')}.</span></li><li><b>Registra las salidas</b><span>Desde Configuración asigna nombres a relés, luces y sensores.</span></li></ol></section>
                <section id="wsa-doc-functions" class="wsa-doc-card wsa-doc-wide"><small>02</small><h3>Funciones incluidas</h3><div class="wsa-doc-features"><article><b>Relés</b><span>Control ON/OFF real desde el panel.</span></article><article><b>Iluminación</b><span>Color y estado de tiras PWM/WS2812.</span></article><article><b>Telemetría</b><span>WiFi, memoria, uptime y ADC sin datos simulados.</span></article><article><b>Escenas</b><span>Varias acciones con un solo botón.</span></article><article><b>USB y WiFi</b><span>Un mismo asistente para detectar y registrar.</span></article><article><b>Mapa automático</b><span>Perfil corregido incluso en placas ya guardadas.</span></article></div></section>
                <section id="wsa-doc-pins" class="wsa-doc-card"><small>03</small><h3>Mapa de pines · ${esc(entry?.label || '')}</h3><div class="wsa-doc-pinlist">${usedPins.map(pin => `<div><code>${esc(pin.gpio)}</code><span>${esc(pin.label)}</span><em>${esc(PIN_CATEGORIES[pin.category]?.label || pin.category)}</em></div>`).join('') || '<p>No hay asignaciones documentadas para este perfil.</p>'}</div><button type="button" class="wsa-btn wsa-btn-block" id="wsa-docs-open-pinmap">Abrir mapa interactivo</button></section>
                <section id="wsa-doc-safety" class="wsa-doc-card wsa-doc-warning"><small>04</small><h3>Seguridad eléctrica</h3><ul><li>Los GPIO trabajan a 3.3 V; no admiten señales directas de 5 V.</li><li>Usa fuente externa adecuada para relés y tiras LED.</li><li>Une la tierra de la fuente externa con GND de la placa.</li><li>No conectes cargas de potencia directamente a un GPIO.</li><li>Revisa los pines de arranque antes de reasignarlos.</li></ul></section>
                <section id="wsa-doc-services" class="wsa-doc-card"><small>05</small><h3>Servicios y conexión</h3><dl><dt>Detección USB</dt><dd>Handshake NOPAL por puerto serie</dd><dt>Velocidad serie</dt><dd>115200 baudios</dd><dt>Estado WiFi</dt><dd>GET /api/status</dd><dt>Prueba de salud</dt><dd>GET /health</dd><dt>Actualización</dt><dd>ElegantOTA / firmware USB</dd><dt>Placa activa</dt><dd>${esc(board.ip || board.device || 'Sin conexión configurada')}</dd></dl></section>
                <section id="wsa-doc-commands" class="wsa-doc-card"><small>06</small><h3>Comandos NOPAL</h3><div class="wsa-doc-commands"><code>NOPAL:ID?<span>Identificación</span></code><code>NOPAL:NET?<span>Estado de red</span></code><code>NOPAL:STATUS?<span>Estado JSON</span></code><code>NOPAL:R1:ON<span>Encender relé</span></code><code>NOPAL:R1:OFF<span>Apagar relé</span></code><code>NOPAL:WS:255,80,0<span>Color LED</span></code><code>NOPAL:SCENE:READY<span>Aplicar escena</span></code><code>NOPAL:ADC?<span>Leer ADC</span></code></div></section>
            </div>
        </div>`;
    }

    function workshopOverviewPanel(relays, leds, board, info, liveBoard) {
        if (state.workshopLoading) return '<div class="wsa-card wsa-workshop-loading"><div class="wsa-spinner"></div><p>Cargando el estado real del taller…</p></div>';
        if (state.overviewTab === 'relays') return workshopRelaysPanel(relays);
        if (state.overviewTab === 'lights') return workshopLightsPanel(leds);
        if (state.overviewTab === 'sensors') return workshopSensorsPanel(board, info, liveBoard);
        return workshopScenesPanel();
    }

    function workshopRelaysPanel(relays) {
        if (!relays.length) return `<div class="wsa-card wsa-workshop-empty"><h2>${icon(ICON_PLUG, 16)}Salidas del taller</h2><p>No hay relés registrados todavía.</p><button type="button" class="wsa-btn wsa-btn-accent" id="wsa-workshop-add-accessory">${icon(ICON_PLUS, 14)}<span>Agregar accesorio</span></button></div>`;
        return `<section class="wsa-card"><div class="wsa-card-title-row"><h2>${icon(ICON_PLUG, 16)}Salidas del taller</h2><button type="button" class="wsa-btn wsa-btn-small" id="wsa-workshop-add-accessory">${icon(ICON_PLUS, 13)}<span>Agregar</span></button></div>
            <div class="wsa-table-scroll"><table class="wsa-table wsa-workshop-table"><thead><tr><th>Salida</th><th>Uso</th><th>Conexión</th><th>Estado</th></tr></thead><tbody>${relays.map(item => `<tr>
                <td><strong>${esc(item.name)}</strong></td><td>${esc(item.kind || 'Accesorio')}</td>
                <td><code>${esc(item.config?.transport === 'wifi' ? item.config?.ip : (item.config?.device || item.driver))}</code>${item.config?.relay != null ? ` · R${esc(item.config.relay)}` : ''}</td>
                <td><div class="wsa-workshop-state-cell"><label class="wsa-switch"><input type="checkbox" data-wsa-workshop-power="${esc(item.id)}" ${item.on ? 'checked' : ''} ${item.on === null ? 'disabled' : ''}><span></span></label><small>${item.on === null ? 'Sin respuesta' : (item.on ? 'Encendido' : 'Apagado')}</small></div></td>
            </tr>`).join('')}</tbody></table></div></section>`;
    }

    function workshopLightsPanel(leds) {
        if (!leds.length) return `<div class="wsa-card wsa-workshop-empty"><h2>${icon(ICON_LED, 16)}Iluminación</h2><p>No hay tiras LED registradas todavía.</p><button type="button" class="wsa-btn wsa-btn-accent" id="wsa-workshop-add-accessory">${icon(ICON_PLUS, 14)}<span>Agregar tira LED</span></button></div>`;
        return `<div class="wsa-workshop-led-grid">${leds.map(item => `<section class="wsa-card wsa-workshop-led">
            <div class="wsa-card-title-row"><h2>${icon(ICON_LED, 16)}${esc(item.name)}</h2><span class="wsa-status-pill">${esc((item.config?.led_mode || 'LED').toUpperCase())}</span></div>
            <label><span>Color</span><input type="color" data-wsa-workshop-led-color="${esc(item.id)}" value="${rgbToHex(item.config?.led_color)}"></label>
            <button type="button" class="wsa-btn wsa-btn-accent" data-wsa-workshop-led-apply="${esc(item.id)}">Aplicar color</button>
            <small>${esc(item.config?.transport === 'wifi' ? item.config?.ip : (item.config?.device || 'Placa NOPAL'))}</small>
        </section>`).join('')}</div>`;
    }

    function workshopSensorsPanel(board, info, liveBoard) {
        const metrics = [
            ['Conexión de placa', liveBoard?.online || board?.connected ? 'En línea' : 'Sin confirmar', board?.ip || board?.device || 'No configurada'],
            ['Latencia', info.latency_ms != null ? `${info.latency_ms} ms` : 'No reportada', 'Handshake NOPAL'],
            ['Memoria libre', info.free_heap ? `${Math.round(info.free_heap / 1024)} KB` : 'No reportada', 'Heap disponible'],
            ['WiFi', info.wifi_connected ? 'Conectado' : (info.wifi ? 'Disponible' : 'No reportado'), info.ip || board?.ip || 'Sin IP'],
            ['Uptime', info.uptime_ms ? `${Math.floor(info.uptime_ms / 3600000)} h` : 'No reportado', 'Desde el último reinicio'],
            ['Firmware', info.firmware || 'No reportado', info.hostname || 'Placa NOPAL'],
            ['Entrada analógica', info.a0_raw != null ? `${info.a0_raw} RAW` : 'No reportada', info.a0_percent != null ? `${info.a0_percent}% · GPIO ${info.adc_gpio || '—'}` : 'ADC'],
            ['Señal WiFi', info.rssi ? `${info.rssi} dBm` : 'No reportada', info.ssid || info.wifi_mode || 'Red local'],
        ];
        return `<section class="wsa-card"><div class="wsa-card-title-row"><h2>${icon(ICON_ACTIVITY, 16)}Telemetría de la placa</h2><small class="wsa-text-muted">Datos del último handshake real</small></div>
            <div class="wsa-workshop-sensors">${metrics.map(([label, value, note]) => `<div><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(note)}</small></div>`).join('')}</div></section>`;
    }

    function workshopScenesPanel() {
        if (!state.scenes.length) return `<div class="wsa-card wsa-workshop-empty"><h2>${icon(ICON_SCENE, 16)}Escenas</h2><p>Crea una escena para encender relés y ajustar luces con una sola acción.</p><button type="button" class="wsa-btn wsa-btn-accent" id="wsa-workshop-add-accessory">Ir a Accesorios</button></div>`;
        return `<section class="wsa-card"><div class="wsa-card-title-row"><h2>${icon(ICON_SCENE, 16)}Acciones rápidas</h2><small class="wsa-text-muted">${state.scenes.length} escena(s)</small></div>
            <div class="wsa-workshop-scenes">${state.scenes.map(scene => `<button type="button" class="wsa-btn" data-wsa-workshop-scene="${esc(scene.id)}">${icon(ICON_ZAP, 14)}<span>${esc(scene.name)}</span><small>${scene.actions?.length || 0} acción(es)</small></button>`).join('')}</div></section>`;
    }

    function workshopLatestActivity() {
        const event = state.activity[0];
        if (!event) return 'Sin actividad reciente en los accesorios.';
        const labels = { power_on: 'encendido', power_off: 'apagado', led_color: 'cambió de color', scene_run: 'ejecutó una escena', registered: 'fue agregado', removed: 'fue eliminado' };
        return `Última actividad: ${esc(event.name)} ${esc(labels[event.action] || event.action || '')} · ${formatRelativeTime(event.timestamp)}`;
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
                    <button type="button" class="wsa-btn-icon" id="wsa-manageboards-btn" title="Gestionar placas">${icon(ICON_LAYOUT, 15)}</button>
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
                        <div class="wsa-board-image">${boardImageHtml(board.catalogId, Math.max(leftEntries.length, rightEntries.length))}</div>
                        <div class="wsa-pin-col">${rightEntries.map(({ pin, i }) => pinRowHtml(pin, 'right', i)).join('') || '<p class="wsa-empty">El firmware no usa pines de este lado.</p>'}</div>
                    </div>
                </div>
                <div class="wsa-card wsa-inspector-card" id="wsa-inspector">
                    <div class="wsa-card-title-row">
                        <h2>${icon(ICON_GEAR, 16)}Inspector de pin</h2>
                        <button type="button" class="wsa-btn wsa-btn-small" id="wsa-scan-btn" ${state.scanning ? 'disabled' : ''}>${icon(ICON_ZAP, 13)}<span>${state.scanning ? 'Escaneando…' : 'Escanear pines'}</span></button>
                    </div>
                    <div id="wsa-inspector-body">${renderPinInspectorHtml()}</div>
                </div>
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
            return `<p class="wsa-empty">Selecciona un pin del mapa para configurarlo.</p>`;
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

    function render() {
        if (!root) return;
        root.classList.toggle('wsa-dashboard-mode', state.view === 'overview' && !state.wizard.active);
        root.classList.toggle('wsa-docs-mode', state.view === 'documentation' && !state.wizard.active);
        renderHeaderChips();
        renderSubnav();
        renderContent();
        renderStatusbar();
    }

    function bindEvents() {
        root.querySelector('#wsa-close-btn').addEventListener('click', () => window.switchSection?.('dashboard'));
        root.querySelector('#wsa-docs-btn').addEventListener('click', () => switchWorkshopView('documentation'));
        root.querySelector('#wsa-config-btn').addEventListener('click', () => switchWorkshopView('pines'));
        root.querySelector('#wsa-manage-header-btn').addEventListener('click', openManageBoardsPanel);

        root.querySelector('#wsa-subnav').addEventListener('click', event => {
            const btn = event.target.closest('[data-wsa-view]');
            if (btn) switchWorkshopView(btn.dataset.wsaView);
        });

        root.querySelectorAll('[data-wsa-close-manageboards]').forEach(el => el.addEventListener('click', closeManageBoardsPanel));
        root.querySelector('#wsa-manageboards-list').addEventListener('click', event => {
            const saveBtn = event.target.closest('[data-wsa-manageboard-save]');
            if (saveBtn) { saveManageBoardInfo(saveBtn.dataset.wsaManageboardSave); return; }
            const deleteBtn = event.target.closest('[data-wsa-manageboard-delete]');
            if (deleteBtn) { deleteManageBoard(deleteBtn.dataset.wsaManageboardDelete); return; }
        });

        root.querySelector('#wsa-content').addEventListener('click', event => {
            const viewButton = event.target.closest('[data-wsa-view]');
            if (viewButton) { switchWorkshopView(viewButton.dataset.wsaView); return; }
            if (event.target.closest('#wsa-docs-back')) { switchWorkshopView('overview'); return; }
            if (event.target.closest('#wsa-docs-open-pinmap')) { switchWorkshopView('pines'); return; }
            const overviewTab = event.target.closest('[data-wsa-overview-tab]');
            if (overviewTab) { state.overviewTab = overviewTab.dataset.wsaOverviewTab; render(); return; }
            if (event.target.closest('#wsa-workshop-refresh')) { loadWorkshopData(); return; }
            if (event.target.closest('#wsa-workshop-configure')) { switchWorkshopView('pines'); return; }
            if (event.target.closest('#wsa-workshop-add-accessory')) {
                window.switchSection?.('settings');
                setTimeout(() => document.getElementById('accessories-settings-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
                return;
            }
            const ledApply = event.target.closest('[data-wsa-workshop-led-apply]');
            if (ledApply) {
                const color = root.querySelector(`[data-wsa-workshop-led-color="${CSS.escape(ledApply.dataset.wsaWorkshopLedApply)}"]`)?.value;
                setWorkshopLedColor(ledApply.dataset.wsaWorkshopLedApply, color);
                return;
            }
            const sceneButton = event.target.closest('[data-wsa-workshop-scene]');
            if (sceneButton) { runWorkshopScene(sceneButton.dataset.wsaWorkshopScene); return; }

            const boardTab = event.target.closest('[data-wsa-board]');
            if (boardTab) { state.activeBoardId = boardTab.dataset.wsaBoard; state.selectedPinKey = null; render(); return; }

            if (event.target.closest('#wsa-addboard-btn')) {
                state.wizard.active = true;
                state.wizard.step = 'intro';
                state.wizard.error = null;
                render();
                return;
            }
            if (event.target.closest('#wsa-manageboards-btn')) { openManageBoardsPanel(); return; }

            if (event.target.closest('#wsa-scan-btn')) { scanPins(); return; }

            const pinRow = event.target.closest('[data-wsa-pin]');
            if (pinRow) { const [side, idx] = pinRow.dataset.wsaPin.split(':'); selectPin(side, Number(idx)); return; }

            if (event.target.closest('#wsa-apply-pin')) { applyPinConfig(); return; }
            if (event.target.closest('#wsa-new-rule-btn')) { toast('Editor de reglas: próximamente.'); return; }

            const ruleToggle = event.target.closest('[data-wsa-rule]');
            if (ruleToggle) { toggleRule(ruleToggle.dataset.wsaRule); return; }

            if (event.target.closest('#wsa-wizard-search')) { wizardSearch(); return; }
            if (event.target.closest('#wsa-wizard-manual')) { state.wizard.step = 'manual'; render(); return; }
            if (event.target.closest('#wsa-wizard-manual-add')) {
                addBoardFromForm(root.querySelector('#wsa-wizard-manual-form'));
                return;
            }
            if (event.target.closest('#wsa-wizard-identify-use')) { wizardUseIdentifiedModel(); return; }
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
            if (event.target.matches('[data-wsa-workshop-power]')) {
                setWorkshopAccessoryPower(event.target.dataset.wsaWorkshopPower, event.target.checked);
                return;
            }
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
        loadWorkshopData();
    }

    function unmount() {
        document.querySelector(`[data-plugin-nav="${PLUGIN_ID}"]`)?.remove();
        document.getElementById('arduino-accessories-section')?.remove();
        root = null;
    }

    window.NopalPluginRegistry = window.NopalPluginRegistry || {};
    window.NopalPluginRegistry[PLUGIN_ID] = { mount, unmount, version: '2.4.0' };
    mount();
})();
