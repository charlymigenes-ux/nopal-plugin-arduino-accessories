(() => {
    const PLUGIN_ID = 'arduino-accessories';
    const PLUGIN_VERSION = '2.6.0';
    if (window.NopalPluginRegistry?.[PLUGIN_ID]) return;

    // Mismo patrón que font-library.js/svg-toolkit.js/spoolman.js/matriz-led.js:
    // diccionario propio del plugin (no existe un t()/i18n global expuesto a
    // plugins), lee el idioma ya elegido en Configuración (localStorage.language).
    // Va primero en el archivo porque PIN_CATEGORIES/buildEsp32Pins/
    // buildEsp8266Pins/buildTCallPins/BOARD_CATALOG/MACHINES/GLOBAL_RULES/
    // ACTIVITY_LOG/SYSTEM_STATS (todos mock, ver banner de datos
    // mock más abajo) llaman tr() al definirse -- una vez, al cargar el
    // script, igual que ya hacía matriz-led con sus constantes.
const I18N = {
    es: {
        headerSubtitle: 'gestión de placas, pines y automatizaciones', scanBtn: 'Escanear', backToPanel: 'Volver al panel',
        connectedBoardsLabel: 'Placas conectadas', withWarningLabel: 'Con advertencia', totalRelaysLabel: 'Relés totales',
        totalLedsLabel: 'LEDs totales', freePinsLabel: 'Pines libres', networkUptimeLabel: 'Uptime red', wifiHealthLabel: 'WiFi (salud)',
        connectedBoardsTitle: 'Placas conectadas', withWarningCount: '{count} con advertencia',
        sortLabel: 'Orden:', sortByName: 'Nombre', sortByStatus: 'Estado', sortBySignal: 'Señal', toggleViewTitle: 'Cambiar vista',
        boardStatusWarning: 'Advertencia', boardStatusOnline: 'Online', boardStatusOffline: 'Sin conexión',
        editBtn: 'Editar', duplicateBtn: 'Duplicar',
        quickViewTitle: 'Vista rápida de la placa seleccionada', quickTabSummary: 'Resumen de pines', quickTabFree: 'Libres',
        noFreePinsLabel: 'Esta placa no tiene pines libres.', restartBoardBtn: 'Reiniciar placa', viewFullMapBtn: 'Ver mapa completo',
        quickActionsAutomationsTitle: 'Acciones rápidas y automatizaciones', quickActionsSubtitle: 'Acciones rápidas',
        testRelaysBtn: 'Probar relés', testLedsBtn: 'Probar LEDs', syncBtn: 'Sincronizar',
        recentScenesTitle: 'Escenas activas', viewAllBtn: 'Ver todas', noScenesRunYet: 'Todavía no se ejecutó ninguna escena.',
        lastRunLabel: 'Ejecutada',
        resourcesTitle: 'Recursos y ayuda',
        resQuickGuideTitle: 'Guía rápida', resQuickGuideSub: 'Primeros pasos',
        resApiTitle: 'HTTP / API', resApiSub: 'Endpoints disponibles',
        resHaTitle: 'Home Assistant', resHaSub: 'Integración y entidades',
        resFirmwareTitle: 'Firmware NOPAL', resFirmwareSub: 'Versiones y cambios',
        resDiagnosticsTitle: 'Diagnóstico', resDiagnosticsSub: 'Herramientas de red',
        warnReasonPins: 'Hay pines con función duplicada en el mapa de esta placa.', warnReasonSignal: 'Señal WiFi débil (RSSI muy bajo).',
        boardConnectionOk: '{name} respondió correctamente.', boardConnectionFailed: 'No se pudo confirmar la conexión de {name}.',
        noRelaysToTest: 'Esta placa no tiene relés registrados para probar.', noLedsToTest: 'Esta placa no tiene tiras/LEDs registrados para probar.',
        testingRelays: 'Probando {count} relé(s)…', testingLeds: 'Probando {count} tira(s)/LED(s)…',
        duplicatedBoardName: '{name} (copia)', syncStarted: 'Sincronizando datos del taller…',
        allScenesTitle: 'Todas las escenas', allScenesDesc: 'Ejecutá, editá o creá escenas y macros del taller.',
        diagnosticsResult: 'Diagnóstico: {online}/{total} placas en línea, {warnings} con advertencia.',
        docsHaTitle: 'Home Assistant', docsHaBody: 'No hay un plugin dedicado -- usá la plataforma RESTful/command_line de Home Assistant contra estos endpoints reales del panel:',
        docsHaStatus: 'Estado de todos los accesorios registrados', docsHaPower: 'Encender/apagar un relé (id, on=true|false)',
        docsHaLed: 'Fijar color de una tira LED (id, r, g, b)', docsHaScene: 'Ejecutar una escena guardada',
        catPower: 'Alimentación', catGround: 'Tierra', catReserved: 'Reservado', catFree: 'Libre',
        catLedWs2812: 'Tira LED WS2812', catLedPwm: 'LED PWM analógico', catRelay: 'Relé',
        catSensorTemp: 'Sensor de temperatura', catSensorSmoke: 'Sensor de humo', catSensorDoor: 'Sensor de puerta',
        catI2c: 'I2C', catUart: 'UART', catSpi: 'SPI', catBuzzer: 'Buzzer', catVentilation: 'Ventilación',
        catAdc: 'Entrada analógica', catDac: 'Salida DAC', catModem: 'Módem SIM800L',
        paramStripType: 'Tipo de tira', paramLedCount: 'Cantidad de LEDs', paramBrightness: 'Brillo global',
        paramInvertData: 'Invertir datos', paramDefaultColor: 'Color por defecto (standby)',
        paramChannel: 'Canal', paramInvertOutput: 'Invertir salida',
        paramActiveLow: 'Activo en LOW', paramDefaultOn: 'Encendido al arrancar',
        paramSensorType: 'Tipo de sensor', paramThreshold: 'Umbral de alarma', paramNormallyOpen: 'Normalmente abierto',
        paramRole: 'Rol', paramBaud: 'Baud rate', paramSpeedControl: 'Control de velocidad (PWM)',
        pinAlimentacion: 'Alimentación', pinHabilitar: 'Habilitar', pinAdcEntrada: 'ADC / Entrada', pinLibre: 'Libre',
        pinLedPwmR: 'LED PWM R', pinLedPwmG: 'LED PWM G', pinLedPwmB: 'LED PWM B', pinTierra: 'Tierra',
        pinRele1: 'Relé 1', pinRele2: 'Relé 2', pinRele3: 'Relé 3', pinRele4: 'Relé 4',
        pinTiraLed: 'Tira LED WS2812', pinLibreBoot: 'Libre (boot)', pinLedEstado: 'LED de estado',
        pinSerialRx: 'Serial RX', pinSerialTx: 'Serial TX', pinEntradaAnalogica: 'Entrada analógica',
        pinSinConexion: 'Sin conexión', pinAdc0Vp: 'ADC0 / VP', pinAdc3Vn: 'ADC3 / VN', pinAdc6: 'ADC6', pinAdc7: 'ADC7',
        pinSim800lDtr: 'SIM800L DTR', pinSim800lRi: 'SIM800L RI (ring)', pinSim800lTx: 'SIM800L TX', pinSim800lRx: 'SIM800L RX',
        pinTouch5: 'Touch5', pinLedEstadoAzul: 'LED de estado (azul)', pinFlashSpiReservado: 'Flash SPI (reservado)',
        pinSalidaAudioMas: 'Salida de audio +', pinSalidaAudioMenos: 'Salida de audio -',
        pinSim800lPowerOn: 'SIM800L POWER ON', pinI2cSclCompartido: 'I2C SCL (IP5306 + 4 relés MCP23017 0x20)',
        pinSerialTxProg: 'Serial TX (programación)', pinSerialRxProg: 'Serial RX (programación)',
        pinI2cSdaCompartido: 'I2C SDA (IP5306 + 4 relés MCP23017 0x20)',
        pinSim800lReset: 'SIM800L RESET', pinSim800lPwrkey: 'SIM800L PWRKEY',
        pinTouch1Boot: 'Touch1 (boot)', pinTouch2: 'Touch2', pinTouch3: 'Touch3',
        pinEntradaAudioMenos: 'Entrada de audio -', pinEntradaAudioMas: 'Entrada de audio +',
        boardEsp32Label: 'ESP32 DevKit V1 / NodeMCU', boardEsp8266Label: 'ESP8266 genérico',
        boardNodemcuLabel: 'NodeMCU V3', boardWemosLabel: 'Wemos D1 mini', boardTcallLabel: 'ESP32 SIM800L T-Call V1.3',
        boardTcallNote: 'Solo admite SIM Nano. Los 4 relés van por I2C (MCP23017 0x20, mismo bus que SDA/SCL), no tienen pin de header propio.',
        machinePrinterName: 'Impresora 3D', machineLaserName: 'Láser', machineCncName: 'CNC',
        varNozzleTemp: 'Temp. boquilla (°C)', varBedTemp: 'Temp. cama (°C)', varPrintState: 'Estado de impresión', varPrintProgress: 'Progreso (%)',
        varGrblState: 'Estado GRBL', varCoolant: 'Refrigerante', varJobState: 'Estado del trabajo', varJobProgress: 'Progreso actual',
        varSpindleActive: 'Husillo activo',
        outputLedStrip: 'Tira LED WS2812', outputExtractorRelay: 'Relé Extractor', outputSiren: 'Sirena',
        outputFanRelay: 'Relé Ventilador', outputBeacon: 'Baliza LED',
        ruleColdMachine: 'Máquina fría', ruleHeating: 'Calentando', ruleOverTemp: 'Sobre temperatura',
        ruleReadyToPrint: 'Lista para imprimir', ruleGradientProgress: 'Gradiente según progreso',
        ruleGreenLight: 'Luz verde', ruleAmberLightExtractor: 'Luz ámbar + extractor ON', ruleRedSiren: 'Rojo + sirena',
        rulePauseWarning: 'Pausa + luz de aviso', ruleBlueBeacon: 'Baliza azul', ruleFanOn: 'Extractor/ventilador ON',
        ruleRedBlink: 'Rojo intermitente',
        condNozzleBelow40: 'Temp boquilla < 40°C', condNozzle40to200: '40°C ≤ T boquilla < 200°C', condNozzleAbove220: 'T boquilla ≥ 220°C',
        condStateReady: 'Estado = Lista', condPrinting: 'Imprimiendo', condReadyState: 'Estado listo', condEngraving: 'Grabando (Run)',
        condAlarm: 'Alarma', condDoorOpen: 'Puerta abierta', condJobActive: 'Trabajo activo', condSpindleActive: 'Husillo activo',
        condJobEnd: 'Fin de trabajo', condErrorLimit: 'Error o límite',
        ruleCondNozzleAbove220: 'Temp boquilla > 220°C', ruleCondPrintDone: 'Impresión terminada', ruleCondProgressX: 'Progreso impresión = X%',
        ruleCondLaserEngraving: 'Láser estado = Grabando', ruleCondSpindleActive: 'Husillo activo',
        ruleCondLimitOrError: 'Límite activado o Error',
        ruleActionLedRed: 'LED tira = Rojo', ruleActionLedGreenFanOff: 'LED = Verde + Ventilación OFF', ruleActionLedGradient: 'LED tira = Gradiente(X%)',
        ruleActionExtractorOn: 'Extractor = ON', ruleActionPauseYellow: 'Pausar láser + Luz amarilla', ruleActionFanOn: 'Ventilador = ON',
        ruleActionRedBlink: 'Luz roja intermitente',
        actNozzle215: 'Temp boquilla 215°C', actLaserEngraving: 'Láser: Grabando…', actProgress65: 'Progreso impresión 65%',
        actSpindleOn: 'Husillo activado', actDoorClosed: 'Puerta cerrada',
        connectionExcellent: 'Excelente',
        subOverview: 'Vista general', subPines: 'Mapa de pines', subScenes: 'Escenas de máquina', subLeds: 'LEDs',
        subRelays: 'Relés', subSensors: 'Sensores', subAutomations: 'Automatizaciones', subConsole: 'Consola',
        subTemplates: 'Plantillas', subAlerts: 'Alertas', subBadgeNew: 'NUEVO', statusActive: 'ACTIVO',
        headerTitle: 'Accesorios Arduino/ESP32', checkingStatus: 'Comprobando…', docsBtn: 'Documentación', configBtn: 'Configuración',
        manageBoardsTitle: 'Gestionar placas', closeTitle: 'Cerrar', settingsTitle: 'Ajustes',
        manageBoardsDesc: 'Edita el nombre, puerto USB o IP de cada placa, o elimínala.',
        chipBoard: 'Placa', chipLocalIp: 'IP local', chipUsbPort: 'Puerto USB', chipUptime: 'Uptime', chipFirmware: 'Firmware',
        activeAndConnected: 'Activo y conectado', noConnectionConfirmed: 'Sin conexión confirmada',
        statusReady: 'Estado: Listo', assignedPinsLabel: 'Pines asignados: {assigned}/{total}',
        memoryLabel: 'Memoria: {value}%', latencyLabel: 'Latencia: {value} ms', mainPanelLabel: 'Panel Principal',
        wizardCheckingFirmware: 'Verificando si tu placa ya tiene firmware NOPAL…',
        wizardTileChip: 'Chip', wizardTileFirmware: 'Firmware', wizardTilePort: 'Puerto', wizardTileIp: 'IP',
        wizardTileRelays: 'Relés', wizardTileLedPwm: 'LED PWM', yesWord: 'Sí', noWord: 'No',
        wizardTileWs2812Yes: 'Sí ({count} px)',
        wizardIntroTitle: 'Antes de empezar',
        wizardIntroBody: 'No detectamos ninguna placa con firmware NOPAL respondiendo ahora mismo. Si ya tenés una placa flasheada (por USB o ya conectada a tu WiFi), buscala. Si es una placa nueva, te ayudamos a flashearla acá mismo.',
        wizardSearchUsb: 'Buscar por USB', wizardSearchWifi: 'Buscar por WiFi (IP)', wizardAddManually: 'Agregar manualmente',
        wizardSkipIntro: 'Ya tengo una placa configurada / Saltar por ahora',
        wizardProbingConnection: 'Probando conexión con la placa…',
        wizardWifiHint: 'Misma IP y credenciales OTA que usa la placa para ElegantOTA (ver secrets.h del firmware).',
        wizardBoardIp: 'IP de la placa', wizardOtaUser: 'Usuario OTA', wizardOtaPassword: 'Contraseña OTA',
        wizardTestConnection: 'Probar conexión', wizardBack: 'Volver',
        wizardSearchingUsb: 'Buscando placas conectadas por USB…',
        wizardIdentifyTitle: 'Placa detectada: confirma el modelo',
        wizardIdentifyBody: 'La conexión funciona, pero el firmware no reportó un identificador suficientemente preciso. Elige el modelo para cargar su mapa de pines correcto.',
        wizardModelLabel: 'Modelo', wizardUsePinMap: 'Usar este mapa de pines',
        wizardManualTitle: 'Agregar placa manualmente',
        wizardManualBody: 'Usa esta opción sólo si la placa no puede identificarse por USB o WiFi.',
        wizardNicknameLabel: 'Nombre / apodo', wizardNicknamePlaceholder: 'Ej. Estación láser',
        wizardAddWithMap: 'Agregar con este mapa',
        wizardFoundTitle: '¡Encontramos tu placa!', wizardContinueToPanel: 'Continuar al panel',
        wizardNotFoundTitle: 'No detectamos ninguna placa',
        wizardNotFoundBody: 'Conectá tu placa por USB (esperá unos segundos a que arranque) y volvé a intentar. Si es una placa nueva sin firmware todavía, flasheala desde acá.',
        wizardRetryUsb: 'Reintentar por USB', wizardFlashNow: 'Flashear firmware ahora', wizardSkipForNow: 'Saltar por ahora',
        wizardFlashTitle: 'Flashear firmware',
        wizardFlashBody: 'NOPAL no compila nada -- solo flashea un binario .bin ya exportado desde Arduino IDE (Sketch → Export Compiled Binary).',
        wizardPortLabel: 'Puerto', wizardNoPortsFound: 'No vemos puertos USB candidatos -- revisá el cable/drivers.',
        wizardBinaryLabel: 'Binario (.bin)', wizardUploadNew: 'Subir uno nuevo',
        wizardNoBuildsUploaded: 'Todavía no subiste ningún binario.', wizardFlashBtn: 'Flashear',
        wizardFlashing: 'Flasheando firmware -- no desconectes la placa…',
        wizardFlashSuccessTitle: 'Firmware flasheado', wizardGoToPanel: 'Ir al panel',
        notReported: 'No reportada', notReportedMasc: 'No reportado',
        tabLedStrips: 'Tiras LED', tabInputs: 'Entradas', tabMacros: 'Macros',
        systemSummary: 'Resumen del sistema', activeCount: '{count} activos', activeCountFem: '{count} activas',
        connectivity: 'Conectividad', signalLabel: 'Señal:', stateLabel: 'Estado',
        optimalState: 'Óptimo', pendingState: 'Pendiente', realTelemetry: 'Telemetría real', noResponse: 'Sin respuesta',
        consumptionVoltage: 'Consumo y voltaje', adcInputGpio: 'Entrada ADC GPIO{gpio}',
        percentOfRange: '{value}% del rango', noReading: 'Sin lectura', currentConsumption: 'Consumo actual',
        sensorNotInstalled: 'Sensor no instalado', adcInstantReadingNote: 'Lectura instantánea del ADC; NOPAL no inventa historial ni amperaje.',
        connectionState: 'Estado de conexión', connectedState: 'Conectada', availableState: 'Disponible',
        responseTime: 'Tiempo de respuesta',
        devicesAndControls: 'Dispositivos y controles', quickActions: 'Acciones rápidas',
        recentActivity: 'Actividad reciente', macrosAndScenes: 'Macros y escenas', newWord: 'Nueva',
        editSceneTitle: 'Editar escena', noScenesSaved: 'No hay escenas guardadas.',
        deviceInfo: 'Información del dispositivo', connectionLabel: 'Conexión', freeMemory: 'Memoria libre',
        notAvailable: 'No disponible', pinProfile: 'Perfil de pines', noProfile: 'Sin perfil',
        readingBoard: 'Leyendo la placa…', boardNoRelaysReported: 'La placa no reportó relés. Revisa la conexión o la configuración.',
        relayNumber: 'Relé {n}', outputNumber: 'Salida {n}', notRegisteredInNopal: 'Sin registrar en NOPAL',
        inactiveCount: '{count} inactivos', editRelays: 'Editar relés',
        inputLabel: 'Entrada', wifiCompatible: 'Compatible con WiFi', rawReading: 'Lectura RAW',
        percentageLabel: 'Porcentaje', ofAdcRange: 'Del rango ADC', transportLabel: 'Transporte',
        notConfiguredMasc: 'Sin configurar', noRecentActivity: 'Sin actividad reciente.', eventWord: 'evento',
        viewFullHistory: 'Ver historial completo',
        docsEyebrow: 'GUÍA INTEGRADA · PERFIL ACTIVO', docsTitle: 'Documentación de {name}',
        docsSubtitle: 'Conexión, funciones, mapa de pines y comandos del firmware NOPAL en un solo lugar.',
        docsBackToPanel: 'Volver al panel',
        docsNavQuickstart: 'Inicio rápido', docsNavFunctions: 'Funciones', docsNavSafety: 'Seguridad',
        docsNavServices: 'Servicios', docsNavCommands: 'Comandos',
        docsStep1Title: 'Conecta la placa', docsStep1Body: 'En Mapa de pines pulsa "Agregar placa" y elige USB o WiFi.',
        docsStep2Title: 'Confirma el modelo', docsStep2Body: 'NOPAL lo detecta; sólo pregunta si el firmware no lo identifica.',
        docsStep3Title: 'Revisa el mapa', docsStep3Body: 'Se carga automáticamente el perfil {profile}.',
        docsStep4Title: 'Registra las salidas', docsStep4Body: 'Desde Configuración asigna nombres a relés, luces y sensores.',
        docsFunctionsTitle: 'Funciones incluidas', docsFeatureRelays: 'Control ON/OFF real desde el panel.',
        docsFeatureLightingTitle: 'Iluminación', docsFeatureLighting: 'Color y estado de tiras PWM/WS2812.',
        docsFeatureTelemetryTitle: 'Telemetría', docsFeatureTelemetry: 'WiFi, memoria, uptime y ADC sin datos simulados.',
        docsFeatureScenesTitle: 'Escenas', docsFeatureScenes: 'Varias acciones con un solo botón.',
        docsFeatureUsbWifiTitle: 'USB y WiFi', docsFeatureUsbWifi: 'Un mismo asistente para detectar y registrar.',
        docsFeatureAutoMapTitle: 'Mapa automático', docsFeatureAutoMap: 'Perfil corregido incluso en placas ya guardadas.',
        docsNoAssignments: 'No hay asignaciones documentadas para este perfil.', docsOpenInteractiveMap: 'Abrir mapa interactivo',
        docsSafetyTitle: 'Seguridad eléctrica',
        docsSafety1: 'Los GPIO trabajan a 3.3 V; no admiten señales directas de 5 V.',
        docsSafety2: 'Usa fuente externa adecuada para relés y tiras LED.',
        docsSafety3: 'Une la tierra de la fuente externa con GND de la placa.',
        docsSafety4: 'No conectes cargas de potencia directamente a un GPIO.',
        docsSafety5: 'Revisa los pines de arranque antes de reasignarlos.',
        docsServicesTitle: 'Servicios y conexión', docsUsbDetection: 'Detección USB',
        docsUsbDetectionValue: 'Handshake NOPAL por puerto serie', docsSerialSpeed: 'Velocidad serie', docsBaud: 'baudios',
        docsWifiState: 'Estado WiFi', docsHealthCheck: 'Prueba de salud', docsUpdate: 'Actualización',
        docsActiveBoard: 'Placa activa', docsNoConnectionConfigured: 'Sin conexión configurada',
        docsCommandsTitle: 'Comandos NOPAL', docsCmdId: 'Identificación', docsCmdNet: 'Estado de red',
        docsCmdStatus: 'Estado JSON', docsCmdRelayOn: 'Encender relé', docsCmdRelayOff: 'Apagar relé',
        docsCmdLedColor: 'Color LED', docsCmdScene: 'Aplicar escena', docsCmdAdc: 'Leer ADC',
        loadingWorkshopState: 'Cargando el estado real del taller…', workshopOutputsTitle: 'Salidas del taller',
        noRelaysRegisteredYet: 'No hay relés registrados todavía.', addAccessory: 'Agregar accesorio', addWord: 'Agregar',
        outputColumn: 'Salida', usageColumn: 'Uso', subStateColumn: 'Estado', accessoryWord: 'Accesorio',
        onState: 'Encendido', offState: 'Apagado',
        lightingTitle: 'Iluminación', noLedStripsRegisteredYet: 'No hay tiras LED registradas todavía.',
        addLedStrip: 'Agregar tira LED', registeredLighting: 'Iluminación registrada', addLedOrStrip: 'Agregar LED o tira',
        moreOptions: 'Más opciones', viewDetails: 'Ver detalles', updateFirmware: 'Actualizar firmware',
        colorWord: 'Color', applyColor: 'Aplicar color', turnOffBtn: 'Apagar', whiteWord: 'Blanco',
        readyWord: 'Listo', alertWord: 'Alerta', nopalBoardWord: 'Placa NOPAL',
        boardConnectionLabel: 'Conexión de placa', onlineState: 'En línea', unconfirmedState: 'Sin confirmar',
        notConfiguredFem: 'No configurada', latencyWord: 'Latencia', nopalHandshake: 'Handshake NOPAL',
        heapAvailable: 'Heap disponible', noIpWord: 'Sin IP', uptimeWord: 'Uptime', sinceLastRestart: 'Desde el último reinicio',
        inputAnalog: 'Entrada analógica', wifiSignal: 'Señal WiFi', localNetwork: 'Red local', dhtSensorLabel: 'Sensor DHT11', batteryLabel: 'Batería', batteryCharging: 'Cargando', batteryDischarging: 'Descargando', batteryUntilFull: '{time} para llenarse', batteryUntilEmpty: '{time} restantes', batteryHibernating: 'medidor en reposo', batteryResetAlert: 'El medidor se reinició solo', batteryVoltageNote: 'Voltaje medido',
        boardTelemetry: 'Telemetría de la placa', lastRealHandshakeData: 'Datos del último handshake real',
        subScenes2: 'Escenas', createSceneHint: 'Crea una escena para encender relés y ajustar luces con una sola acción.',
        newSceneWord: 'Nueva escena', actionCount: '{count} acción(es)',
        noRecentAccessoryActivity: 'Sin actividad reciente en los accesorios.',
        actPowerOn: 'encendido', actPowerOff: 'apagado', actLedColor: 'cambió de color', actSceneRun: 'ejecutó una escena',
        actRegistered: 'fue agregado', actRemoved: 'fue eliminado',
        lastActivityLine: 'Última actividad: {name} {action} · {time}',
        addBoardBtn: 'Agregar placa', realBoardDataTitle: 'Datos reales de la placa (por {transport}, no mock)',
        boardConnectedTag: 'placa conectada', genericPinoutUnverified: 'Pinout genérico, no verificado',
        showAllConnectorPins: 'Mostrar todos los pines del conector (no solo los que usa el firmware)',
        firmwareNoPinsThisSide: 'El firmware no usa pines de este lado.',
        pinInspectorTitle: 'Inspector de pin', scanningWord: 'Escaneando…', scanPinsBtn: 'Escanear pines',
        rolesLegend: 'Leyenda de roles', pinSummaryTitle: 'Resumen de pines', activeAssignmentsTitle: 'Asignaciones activas',
        activeAutomationsTitle: 'Automatizaciones activas (reglas globales)', systemStateTitle: 'Estado del sistema',
        selectPinToConfigure: 'Selecciona un pin del mapa para configurarlo.',
        assignedFunctionLabel: 'Función asignada', notAppliedYet: 'sin aplicar',
        modeLabel: 'Modo', initialStateLabel: 'Estado inicial', logicLevelLabel: 'Nivel lógico',
        fixedConnectorPin: 'Pin fijo del conector -- no configurable.', parametersTitle: 'Parámetros',
        applyConfigBtn: 'Aplicar configuración',
        totalWord: 'Total', assignedWord: 'Asignados', communicationsWord: 'Comunicaciones',
        noActivityYet: 'Sin actividad todavía.',
        scenesByMachine: 'Escenas por máquina', addMachine: 'Añadir máquina',
        addMachineHint: 'Configura escenas para más equipos de tu taller.',
        machineScenesSubtitle: 'Reglas propias por máquina -- fuente de datos, variables disponibles y salidas asociadas.',
        dataSourceLabel: 'Fuente de datos:', outputsActionsTitle: 'Salidas / Acciones', portLabel: 'Puerto:',
        viewRuleEditor: 'Ver editor de reglas',
        pinCount: '{count} pin(es)', noPinsAssignedCategory: 'No hay pines asignados a esta categoría todavía, en ninguna placa.',
        ifConditionHeader: 'SI (Condición)', thenActionHeader: 'ENTONCES (Acción)', sourceHeader: 'Fuente',
        newRuleWord: 'Nueva regla',
        consoleReadOnlyNote: 'Consola de solo lectura (mock) -- se conectará al puerto serie/HTTP real de la placa.',
        tplPrinterBasic: 'Impresora 3D básica', tplPrinterBasicDesc: 'LED de estado + relé de ventilación.',
        tplLaserStation: 'Estación láser', tplLaserStationDesc: 'Extractor + sirena + luces de alarma.',
        tplCncBeacon: 'CNC con baliza', tplCncBeaconDesc: 'Baliza tricolor + extractor de polvo.',
        templatesSubtitle: 'Configuraciones de pines predefinidas para arrancar rápido.', useBtn: 'Usar',
        warningMultipleFunctionsPin: '{count} pin(es) con más de una función asignada en "{board}".',
        wifiTransportReflashNote: 'El transporte WiFi del accesorio requiere reflashear el firmware v1.4 para quedar activo.',
        errCouldNotLoadWorkshopState: 'No se pudo cargar el estado del taller.',
        accessoryToggled: '{name}: {state}.', errCouldNotChangeAccessory: 'No se pudo cambiar el accesorio.',
        colorUpdated: 'Color actualizado.', errCouldNotChangeLighting: 'No se pudo cambiar la iluminación.',
        chooseModel: 'Elige un modelo.', giveBoardName: 'Ponle un nombre a la placa.',
        boardAdded: '{name} ({label}) se agregó.', errCouldNotAddBoard: 'No se pudo agregar la placa.',
        boardUpdated: 'Placa actualizada.', errCouldNotUpdateBoard: 'No se pudo actualizar la placa.',
        ambientSensorLabel: 'Sensor ambiente del taller', ambientSensorHint: 'Usa el DHT11 de esta placa para la ficha "Temp. ambiente del taller" del panel principal. Solo una placa a la vez.',
        boardDeleted: 'Placa eliminada.', errCouldNotDeleteBoard: 'No se pudo eliminar la placa.',
        errCouldNotLoadSavedBoards: 'No se pudieron cargar las placas guardadas.',
        configApplied: 'Configuración aplicada.', errCouldNotSavePinConfig: 'No se pudo guardar la configuración del pin.',
        modelDetectedMapSaveFailed: 'Detectamos el modelo, pero no pudimos guardar el mapa corregido.',
        giveBoardIp: 'Ponle la IP de la placa.', fileUploadedOk: '{name} se subió correctamente.',
        choosePortFirst: 'Elegí un puerto primero.', chooseBinaryFirst: 'Elegí (o subí) un binario .bin primero.',
        errCouldNotOpenFirmwareUpdater: 'No se pudo abrir el actualizador de firmware.',
        ruleEditorComingSoon: 'Editor de reglas: próximamente.',
        sceneApplied: 'Escena "{name}" aplicada.', errCouldNotRunScene: 'No se pudo ejecutar la escena.',
        sceneAppliedState: '"{name}": {state}.',
        needAccessoryForScene: 'Registra al menos un accesorio (relé o LED) antes de crear una escena.',
        sceneNeedsAction: 'La escena necesita al menos una acción.',
        sceneNeedsTwoStates: 'El modo doble/múltiple necesita al menos 2 estados.',
        sceneModeLabel: 'Modo de la escena',
        modeNormalLabel: 'Normal', modeNormalHint: 'Cada ejecución hace siempre lo mismo.',
        modeToggleLabel: 'Doble', modeToggleHint: 'Alterna entre 2 estados con cada clic, como un interruptor.',
        modeCycleLabel: 'Múltiple', modeCycleHint: 'Va rotando entre 3 o más estados, en orden.',
        stateNamePlaceholder: 'Ej. Encendido', removeStateTitle: 'Quitar estado', addStateBtn: 'Agregar estado',
        stateOnDefault: 'Encendido', stateOffDefault: 'Apagado', stateDefaultName: 'Estado {number}',
        sceneDeleted: 'Escena eliminada.', errCouldNotDeleteScene: 'No se pudo eliminar la escena.',
        sceneUpdated: 'Escena actualizada.', sceneCreated: 'Escena creada.', errCouldNotSaveScene: 'No se pudo guardar la escena.',
        nameWord: 'Nombre', ledModeLabel: 'Modo LED', protocolLabel: 'Protocolo', otaUserLabel: 'Usuario OTA',
        accessoryDetailsEyebrow: 'DETALLES DEL ACCESORIO', thisAccessoryWord: 'este accesorio',
        confirmDeleteAccessory: 'Vas a eliminar "{name}" de NOPAL. Esta acción no se puede deshacer.',
        deleteAccessoryTitle: 'Eliminar accesorio', accessoryDeletedToast: 'Accesorio eliminado.',
        otherBoardByIp: 'Otra placa por IP',
        boardLightingEyebrow: 'ILUMINACIÓN DE LA PLACA', addLedOrNeopixel: 'Agregar LED o tira NeoPixel',
        registerLightHint: 'Registra la luz directamente desde una placa NOPAL ya agregada.',
        boardIpLabel: 'IP de la placa', workshopLightingDefaultName: 'Iluminación del taller',
        neopixelNamePlaceholder: 'Ej. NeoPixel impresoras', typeWord: 'Tipo', dataGpioLabel: 'GPIO de datos',
        ledCountHint: 'La cantidad puede ser 1 para un solo NeoPixel, 8 para tu tira actual o cualquier longitud que tenga configurada el firmware de esa placa.',
        showOnPanelLabel: 'Mostrar en panel',
        showOnPanelHint: 'Si la dejas activada, la ficha de cada dispositivo que tenga "Usar alertas visuales" activado con esta tira mostrará una réplica de sus LEDs -- por ejemplo, si esta tira enciende 4 LEDs por el estado de una impresora, esa impresora también los va a mostrar en su propia tarjeta.',
        addLightingBtn: 'Agregar iluminación',
        boardOutputEyebrow: 'SALIDA DE LA PLACA', registerRelayN: 'Registrar Relé {n}',
        boardReportedRelayHint: 'La placa ya reportó este relé -- solo falta ponerle nombre.',
        relayNamePlaceholder: 'Ej. Ventilador extractor', relayNumberLabel: 'Número de relé',
        registerRelayBtn: 'Registrar relé', relayRegisteredToast: 'Relé registrado.', workshopWord: 'Taller',
        turnOnOption: 'Encender', turnOffOption: 'Apagar', setColorOption: 'Fijar color', removeActionTitle: 'Quitar acción',
        workshopMacroEyebrow: 'MACRO DEL TALLER', sceneEditorHint: 'Aplica varias acciones sobre tus relés y luces con un solo botón.', aiSceneHintTitle: 'Deja que NOPAL Intelligence te la arme', aiSceneHintBody: 'Con la IA activada puedes pedir escenas en palabras ("ciclo de ventilación") y proponerlas a partir de tus accesorios.', aiSceneHintCta: 'Activar NOPAL Intelligence',
        addActionBtn: 'Agregar acción', saveChangesBtn: 'Guardar cambios', createSceneBtn: 'Crear escena',
        confirmDeleteScene: 'Vas a eliminar la escena "{name}". Esta acción no se puede deshacer.', deleteSceneTitle: 'Eliminar escena',
        noBoardsAddedYet: 'Todavía no agregaste ninguna placa.',
        confirmDeleteBoard: '¿Eliminar "{name}"? Se borra su configuración de pines guardada.', deleteBoardTitle: 'Eliminar placa',
        confirmDeleteBoardShort: '¿Eliminar "{name}"?',
        mainWorkshopName: 'Taller Principal', domoticWorkshopName: 'Taller Domótica',
        scanCompleteMsg: 'Escaneo completo: {assigned} asignados, {free} libres{conflictSuffix}.',
        scanConflictSuffix: ', {count} con conflicto',
        flashDoneNoResponse: 'El flasheo terminó pero la placa todavía no contesta -- puede necesitar más tiempo o un reset manual.',
        operationCouldNotComplete: 'La operación no se pudo completar.', navLabel: 'Automatización de Taller',
        cancelBtn: 'Cancelar', configureBtn: 'Configurar', deleteTitle: 'Eliminar', diagnosticsTitle: 'Diagnóstico',
        errCouldNotDeleteAccessory: 'No se pudo eliminar el accesorio.',
        lightingAddedHint: 'Iluminación agregada. Ya puedes asignarla a escenas por máquina.',
        memoryWord: 'Memoria', saveBtn: 'Guardar',
        ledsFilteredSubtitle: 'Tiras y LEDs PWM asignados en todas tus placas.',
        relaysFilteredSubtitle: 'Salidas de relé asignadas en todas tus placas.',
        sensorsFilteredSubtitle: 'Entradas de sensor asignadas en todas tus placas.',
        usbBoardName: 'Placa USB ({device})', wifiBoardName: 'Placa WiFi ({host})',
    },
    en: {
        headerSubtitle: 'boards, pins and automations management', scanBtn: 'Scan', backToPanel: 'Back to panel',
        connectedBoardsLabel: 'Connected boards', withWarningLabel: 'With warning', totalRelaysLabel: 'Total relays',
        totalLedsLabel: 'Total LEDs', freePinsLabel: 'Free pins', networkUptimeLabel: 'Network uptime', wifiHealthLabel: 'WiFi (health)',
        connectedBoardsTitle: 'Connected boards', withWarningCount: '{count} with warning',
        sortLabel: 'Sort:', sortByName: 'Name', sortByStatus: 'Status', sortBySignal: 'Signal', toggleViewTitle: 'Toggle view',
        boardStatusWarning: 'Warning', boardStatusOnline: 'Online', boardStatusOffline: 'Offline',
        editBtn: 'Edit', duplicateBtn: 'Duplicate',
        quickViewTitle: 'Quick view of the selected board', quickTabSummary: 'Pin summary', quickTabFree: 'Free',
        noFreePinsLabel: 'This board has no free pins.', restartBoardBtn: 'Restart board', viewFullMapBtn: 'View full map',
        quickActionsAutomationsTitle: 'Quick actions & automations', quickActionsSubtitle: 'Quick actions',
        testRelaysBtn: 'Test relays', testLedsBtn: 'Test LEDs', syncBtn: 'Sync',
        recentScenesTitle: 'Active scenes', viewAllBtn: 'View all', noScenesRunYet: 'No scene has run yet.',
        lastRunLabel: 'Run',
        resourcesTitle: 'Resources & help',
        resQuickGuideTitle: 'Quick guide', resQuickGuideSub: 'Getting started',
        resApiTitle: 'HTTP / API', resApiSub: 'Available endpoints',
        resHaTitle: 'Home Assistant', resHaSub: 'Integration & entities',
        resFirmwareTitle: 'NOPAL firmware', resFirmwareSub: 'Versions & changes',
        resDiagnosticsTitle: 'Diagnostics', resDiagnosticsSub: 'Network tools',
        warnReasonPins: 'This board has pins with a duplicate function on the pin map.', warnReasonSignal: 'Weak WiFi signal (very low RSSI).',
        boardConnectionOk: '{name} responded correctly.', boardConnectionFailed: 'Could not confirm the connection to {name}.',
        noRelaysToTest: 'This board has no registered relays to test.', noLedsToTest: 'This board has no registered strips/LEDs to test.',
        testingRelays: 'Testing {count} relay(s)…', testingLeds: 'Testing {count} strip(s)/LED(s)…',
        duplicatedBoardName: '{name} (copy)', syncStarted: 'Syncing workshop data…',
        allScenesTitle: 'All scenes', allScenesDesc: 'Run, edit or create workshop scenes and macros.',
        diagnosticsResult: 'Diagnostics: {online}/{total} boards online, {warnings} with warning.',
        docsHaTitle: 'Home Assistant', docsHaBody: 'There is no dedicated plugin -- use Home Assistant\'s RESTful/command_line platform against these real panel endpoints:',
        docsHaStatus: 'Status of every registered accessory', docsHaPower: 'Turn a relay on/off (id, on=true|false)',
        docsHaLed: 'Set an LED strip color (id, r, g, b)', docsHaScene: 'Run a saved scene',
        catPower: 'Power', catGround: 'Ground', catReserved: 'Reserved', catFree: 'Free',
        catLedWs2812: 'WS2812 LED strip', catLedPwm: 'Analog PWM LED', catRelay: 'Relay',
        catSensorTemp: 'Temperature sensor', catSensorSmoke: 'Smoke sensor', catSensorDoor: 'Door sensor',
        catI2c: 'I2C', catUart: 'UART', catSpi: 'SPI', catBuzzer: 'Buzzer', catVentilation: 'Ventilation',
        catAdc: 'Analog input', catDac: 'DAC output', catModem: 'SIM800L modem',
        paramStripType: 'Strip type', paramLedCount: 'LED count', paramBrightness: 'Global brightness',
        paramInvertData: 'Invert data', paramDefaultColor: 'Default color (standby)',
        paramChannel: 'Channel', paramInvertOutput: 'Invert output',
        paramActiveLow: 'Active LOW', paramDefaultOn: 'On at boot',
        paramSensorType: 'Sensor type', paramThreshold: 'Alarm threshold', paramNormallyOpen: 'Normally open',
        paramRole: 'Role', paramBaud: 'Baud rate', paramSpeedControl: 'Speed control (PWM)',
        pinAlimentacion: 'Power', pinHabilitar: 'Enable', pinAdcEntrada: 'ADC / Input', pinLibre: 'Free',
        pinLedPwmR: 'LED PWM R', pinLedPwmG: 'LED PWM G', pinLedPwmB: 'LED PWM B', pinTierra: 'Ground',
        pinRele1: 'Relay 1', pinRele2: 'Relay 2', pinRele3: 'Relay 3', pinRele4: 'Relay 4',
        pinTiraLed: 'WS2812 LED strip', pinLibreBoot: 'Free (boot)', pinLedEstado: 'Status LED',
        pinSerialRx: 'Serial RX', pinSerialTx: 'Serial TX', pinEntradaAnalogica: 'Analog input',
        pinSinConexion: 'No connection', pinAdc0Vp: 'ADC0 / VP', pinAdc3Vn: 'ADC3 / VN', pinAdc6: 'ADC6', pinAdc7: 'ADC7',
        pinSim800lDtr: 'SIM800L DTR', pinSim800lRi: 'SIM800L RI (ring)', pinSim800lTx: 'SIM800L TX', pinSim800lRx: 'SIM800L RX',
        pinTouch5: 'Touch5', pinLedEstadoAzul: 'Status LED (blue)', pinFlashSpiReservado: 'Flash SPI (reserved)',
        pinSalidaAudioMas: 'Audio out +', pinSalidaAudioMenos: 'Audio out -',
        pinSim800lPowerOn: 'SIM800L POWER ON', pinI2cSclCompartido: 'I2C SCL (IP5306 + 4 relays MCP23017 0x20)',
        pinSerialTxProg: 'Serial TX (programming)', pinSerialRxProg: 'Serial RX (programming)',
        pinI2cSdaCompartido: 'I2C SDA (IP5306 + 4 relays MCP23017 0x20)',
        pinSim800lReset: 'SIM800L RESET', pinSim800lPwrkey: 'SIM800L PWRKEY',
        pinTouch1Boot: 'Touch1 (boot)', pinTouch2: 'Touch2', pinTouch3: 'Touch3',
        pinEntradaAudioMenos: 'Audio in -', pinEntradaAudioMas: 'Audio in +',
        boardEsp32Label: 'ESP32 DevKit V1 / NodeMCU', boardEsp8266Label: 'Generic ESP8266',
        boardNodemcuLabel: 'NodeMCU V3', boardWemosLabel: 'Wemos D1 mini', boardTcallLabel: 'ESP32 SIM800L T-Call V1.3',
        boardTcallNote: 'Nano SIM only. The 4 relays run over I2C (MCP23017 0x20, same bus as SDA/SCL) -- they have no header pin of their own.',
        machinePrinterName: '3D Printer', machineLaserName: 'Laser', machineCncName: 'CNC',
        varNozzleTemp: 'Nozzle temp (°C)', varBedTemp: 'Bed temp (°C)', varPrintState: 'Print state', varPrintProgress: 'Progress (%)',
        varGrblState: 'GRBL state', varCoolant: 'Coolant', varJobState: 'Job state', varJobProgress: 'Current progress',
        varSpindleActive: 'Spindle active',
        outputLedStrip: 'WS2812 LED strip', outputExtractorRelay: 'Extractor relay', outputSiren: 'Siren',
        outputFanRelay: 'Fan relay', outputBeacon: 'LED beacon',
        ruleColdMachine: 'Machine cold', ruleHeating: 'Heating', ruleOverTemp: 'Over temperature',
        ruleReadyToPrint: 'Ready to print', ruleGradientProgress: 'Gradient based on progress',
        ruleGreenLight: 'Green light', ruleAmberLightExtractor: 'Amber light + extractor ON', ruleRedSiren: 'Red + siren',
        rulePauseWarning: 'Pause + warning light', ruleBlueBeacon: 'Blue beacon', ruleFanOn: 'Extractor/fan ON',
        ruleRedBlink: 'Blinking red',
        condNozzleBelow40: 'Nozzle temp < 40°C', condNozzle40to200: '40°C ≤ nozzle temp < 200°C', condNozzleAbove220: 'Nozzle temp ≥ 220°C',
        condStateReady: 'State = Ready', condPrinting: 'Printing', condReadyState: 'State ready', condEngraving: 'Engraving (Run)',
        condAlarm: 'Alarm', condDoorOpen: 'Door open', condJobActive: 'Job active', condSpindleActive: 'Spindle active',
        condJobEnd: 'Job end', condErrorLimit: 'Error or limit',
        ruleCondNozzleAbove220: 'Nozzle temp > 220°C', ruleCondPrintDone: 'Print finished', ruleCondProgressX: 'Print progress = X%',
        ruleCondLaserEngraving: 'Laser state = Engraving', ruleCondSpindleActive: 'Spindle active',
        ruleCondLimitOrError: 'Limit triggered or Error',
        ruleActionLedRed: 'LED strip = Red', ruleActionLedGreenFanOff: 'LED = Green + Ventilation OFF', ruleActionLedGradient: 'LED strip = Gradient(X%)',
        ruleActionExtractorOn: 'Extractor = ON', ruleActionPauseYellow: 'Pause laser + Yellow light', ruleActionFanOn: 'Fan = ON',
        ruleActionRedBlink: 'Blinking red light',
        actNozzle215: 'Nozzle temp 215°C', actLaserEngraving: 'Laser: Engraving…', actProgress65: 'Print progress 65%',
        actSpindleOn: 'Spindle activated', actDoorClosed: 'Door closed',
        connectionExcellent: 'Excellent',
        subOverview: 'Overview', subPines: 'Pin map', subScenes: 'Machine scenes', subLeds: 'LEDs',
        subRelays: 'Relays', subSensors: 'Sensors', subAutomations: 'Automations', subConsole: 'Console',
        subTemplates: 'Templates', subAlerts: 'Alerts', subBadgeNew: 'NEW', statusActive: 'ACTIVE',
        headerTitle: 'Arduino/ESP32 Accessories', checkingStatus: 'Checking…', docsBtn: 'Documentation', configBtn: 'Settings',
        manageBoardsTitle: 'Manage boards', closeTitle: 'Close', settingsTitle: 'Settings',
        manageBoardsDesc: 'Edit the name, USB port, or IP of each board, or delete it.',
        chipBoard: 'Board', chipLocalIp: 'Local IP', chipUsbPort: 'USB port', chipUptime: 'Uptime', chipFirmware: 'Firmware',
        activeAndConnected: 'Active and connected', noConnectionConfirmed: 'No confirmed connection',
        statusReady: 'Status: Ready', assignedPinsLabel: 'Assigned pins: {assigned}/{total}',
        memoryLabel: 'Memory: {value}%', latencyLabel: 'Latency: {value} ms', mainPanelLabel: 'Main Panel',
        wizardCheckingFirmware: 'Checking whether your board already has NOPAL firmware…',
        wizardTileChip: 'Chip', wizardTileFirmware: 'Firmware', wizardTilePort: 'Port', wizardTileIp: 'IP',
        wizardTileRelays: 'Relays', wizardTileLedPwm: 'LED PWM', yesWord: 'Yes', noWord: 'No',
        wizardTileWs2812Yes: 'Yes ({count} px)',
        wizardIntroTitle: 'Before you start',
        wizardIntroBody: 'We didn\'t detect any board with NOPAL firmware responding right now. If you already have a flashed board (via USB or already on your WiFi), search for it. If it\'s a new board, we\'ll help you flash it right here.',
        wizardSearchUsb: 'Search over USB', wizardSearchWifi: 'Search over WiFi (IP)', wizardAddManually: 'Add manually',
        wizardSkipIntro: 'I already have a board set up / Skip for now',
        wizardProbingConnection: 'Testing connection to the board…',
        wizardWifiHint: 'Same IP and OTA credentials the board uses for ElegantOTA (see the firmware\'s secrets.h).',
        wizardBoardIp: 'Board IP', wizardOtaUser: 'OTA username', wizardOtaPassword: 'OTA password',
        wizardTestConnection: 'Test connection', wizardBack: 'Back',
        wizardSearchingUsb: 'Searching for boards connected over USB…',
        wizardIdentifyTitle: 'Board detected: confirm the model',
        wizardIdentifyBody: 'The connection works, but the firmware didn\'t report a precise enough identifier. Pick the model to load its correct pin map.',
        wizardModelLabel: 'Model', wizardUsePinMap: 'Use this pin map',
        wizardManualTitle: 'Add board manually',
        wizardManualBody: 'Only use this option if the board can\'t be identified over USB or WiFi.',
        wizardNicknameLabel: 'Name / nickname', wizardNicknamePlaceholder: 'E.g. Laser station',
        wizardAddWithMap: 'Add with this map',
        wizardFoundTitle: 'We found your board!', wizardContinueToPanel: 'Continue to panel',
        wizardNotFoundTitle: 'We didn\'t detect any board',
        wizardNotFoundBody: 'Connect your board over USB (wait a few seconds for it to boot) and try again. If it\'s a new board with no firmware yet, flash it from here.',
        wizardRetryUsb: 'Retry over USB', wizardFlashNow: 'Flash firmware now', wizardSkipForNow: 'Skip for now',
        wizardFlashTitle: 'Flash firmware',
        wizardFlashBody: 'NOPAL doesn\'t compile anything -- it only flashes a .bin binary already exported from Arduino IDE (Sketch → Export Compiled Binary).',
        wizardPortLabel: 'Port', wizardNoPortsFound: 'We don\'t see any candidate USB ports -- check the cable/drivers.',
        wizardBinaryLabel: 'Binary (.bin)', wizardUploadNew: 'Upload a new one',
        wizardNoBuildsUploaded: 'You haven\'t uploaded any binary yet.', wizardFlashBtn: 'Flash',
        wizardFlashing: 'Flashing firmware -- do not disconnect the board…',
        wizardFlashSuccessTitle: 'Firmware flashed', wizardGoToPanel: 'Go to panel',
        notReported: 'Not reported', notReportedMasc: 'Not reported',
        tabLedStrips: 'LED strips', tabInputs: 'Inputs', tabMacros: 'Macros',
        systemSummary: 'System summary', activeCount: '{count} active', activeCountFem: '{count} active',
        connectivity: 'Connectivity', signalLabel: 'Signal:', stateLabel: 'State',
        optimalState: 'Optimal', pendingState: 'Pending', realTelemetry: 'Real telemetry', noResponse: 'No response',
        consumptionVoltage: 'Consumption and voltage', adcInputGpio: 'ADC input GPIO{gpio}',
        percentOfRange: '{value}% of range', noReading: 'No reading', currentConsumption: 'Current consumption',
        sensorNotInstalled: 'Sensor not installed', adcInstantReadingNote: 'Instant ADC reading; NOPAL doesn\'t invent history or current draw.',
        connectionState: 'Connection status', connectedState: 'Connected', availableState: 'Available',
        responseTime: 'Response time',
        devicesAndControls: 'Devices and controls', quickActions: 'Quick actions',
        recentActivity: 'Recent activity', macrosAndScenes: 'Macros and scenes', newWord: 'New',
        editSceneTitle: 'Edit scene', noScenesSaved: 'No saved scenes.',
        deviceInfo: 'Device information', connectionLabel: 'Connection', freeMemory: 'Free memory',
        notAvailable: 'Not available', pinProfile: 'Pin profile', noProfile: 'No profile',
        readingBoard: 'Reading the board…', boardNoRelaysReported: 'The board didn\'t report any relays. Check the connection or configuration.',
        relayNumber: 'Relay {n}', outputNumber: 'Output {n}', notRegisteredInNopal: 'Not registered in NOPAL',
        inactiveCount: '{count} inactive', editRelays: 'Edit relays',
        inputLabel: 'Input', wifiCompatible: 'WiFi compatible', rawReading: 'RAW reading',
        percentageLabel: 'Percentage', ofAdcRange: 'Of ADC range', transportLabel: 'Transport',
        notConfiguredMasc: 'Not configured', noRecentActivity: 'No recent activity.', eventWord: 'event',
        viewFullHistory: 'View full history',
        docsEyebrow: 'BUILT-IN GUIDE · ACTIVE PROFILE', docsTitle: '{name} documentation',
        docsSubtitle: 'Connection, functions, pin map, and NOPAL firmware commands in one place.',
        docsBackToPanel: 'Back to panel',
        docsNavQuickstart: 'Quick start', docsNavFunctions: 'Functions', docsNavSafety: 'Safety',
        docsNavServices: 'Services', docsNavCommands: 'Commands',
        docsStep1Title: 'Connect the board', docsStep1Body: 'In Pin map, click "Add board" and choose USB or WiFi.',
        docsStep2Title: 'Confirm the model', docsStep2Body: 'NOPAL detects it; it only asks if the firmware doesn\'t identify it.',
        docsStep3Title: 'Check the map', docsStep3Body: 'The {profile} profile loads automatically.',
        docsStep4Title: 'Register the outputs', docsStep4Body: 'From Settings, assign names to relays, lights, and sensors.',
        docsFunctionsTitle: 'Included functions', docsFeatureRelays: 'Real ON/OFF control from the panel.',
        docsFeatureLightingTitle: 'Lighting', docsFeatureLighting: 'Color and state of PWM/WS2812 strips.',
        docsFeatureTelemetryTitle: 'Telemetry', docsFeatureTelemetry: 'WiFi, memory, uptime, and ADC with no simulated data.',
        docsFeatureScenesTitle: 'Scenes', docsFeatureScenes: 'Several actions with a single button.',
        docsFeatureUsbWifiTitle: 'USB and WiFi', docsFeatureUsbWifi: 'The same wizard to detect and register.',
        docsFeatureAutoMapTitle: 'Automatic map', docsFeatureAutoMap: 'Corrected profile even on already-saved boards.',
        docsNoAssignments: 'No documented assignments for this profile.', docsOpenInteractiveMap: 'Open interactive map',
        docsSafetyTitle: 'Electrical safety',
        docsSafety1: 'GPIOs run at 3.3 V; they don\'t support direct 5 V signals.',
        docsSafety2: 'Use a suitable external power source for relays and LED strips.',
        docsSafety3: 'Connect the external power source\'s ground to the board\'s GND.',
        docsSafety4: 'Don\'t connect power loads directly to a GPIO.',
        docsSafety5: 'Check the boot pins before reassigning them.',
        docsServicesTitle: 'Services and connection', docsUsbDetection: 'USB detection',
        docsUsbDetectionValue: 'NOPAL handshake over serial port', docsSerialSpeed: 'Serial speed', docsBaud: 'baud',
        docsWifiState: 'WiFi status', docsHealthCheck: 'Health check', docsUpdate: 'Update',
        docsActiveBoard: 'Active board', docsNoConnectionConfigured: 'No connection configured',
        docsCommandsTitle: 'NOPAL commands', docsCmdId: 'Identification', docsCmdNet: 'Network status',
        docsCmdStatus: 'JSON status', docsCmdRelayOn: 'Turn relay on', docsCmdRelayOff: 'Turn relay off',
        docsCmdLedColor: 'LED color', docsCmdScene: 'Apply scene', docsCmdAdc: 'Read ADC',
        loadingWorkshopState: 'Loading the workshop\'s real state…', workshopOutputsTitle: 'Workshop outputs',
        noRelaysRegisteredYet: 'No relays registered yet.', addAccessory: 'Add accessory', addWord: 'Add',
        outputColumn: 'Output', usageColumn: 'Use', subStateColumn: 'State', accessoryWord: 'Accessory',
        onState: 'On', offState: 'Off',
        lightingTitle: 'Lighting', noLedStripsRegisteredYet: 'No LED strips registered yet.',
        addLedStrip: 'Add LED strip', registeredLighting: 'Registered lighting', addLedOrStrip: 'Add LED or strip',
        moreOptions: 'More options', viewDetails: 'View details', updateFirmware: 'Update firmware',
        colorWord: 'Color', applyColor: 'Apply color', turnOffBtn: 'Off', whiteWord: 'White',
        readyWord: 'Ready', alertWord: 'Alert', nopalBoardWord: 'NOPAL board',
        boardConnectionLabel: 'Board connection', onlineState: 'Online', unconfirmedState: 'Unconfirmed',
        notConfiguredFem: 'Not configured', latencyWord: 'Latency', nopalHandshake: 'NOPAL handshake',
        heapAvailable: 'Available heap', noIpWord: 'No IP', uptimeWord: 'Uptime', sinceLastRestart: 'Since last restart',
        inputAnalog: 'Analog input', wifiSignal: 'WiFi signal', localNetwork: 'Local network', dhtSensorLabel: 'DHT11 sensor', batteryLabel: 'Battery', batteryCharging: 'Charging', batteryDischarging: 'Discharging', batteryUntilFull: '{time} to full', batteryUntilEmpty: '{time} remaining', batteryHibernating: 'gauge asleep', batteryResetAlert: 'The gauge reset itself', batteryVoltageNote: 'Measured voltage',
        boardTelemetry: 'Board telemetry', lastRealHandshakeData: 'Data from the last real handshake',
        subScenes2: 'Scenes', createSceneHint: 'Create a scene to turn on relays and adjust lights with a single action.',
        newSceneWord: 'New scene', actionCount: '{count} action(s)',
        noRecentAccessoryActivity: 'No recent accessory activity.',
        actPowerOn: 'turned on', actPowerOff: 'turned off', actLedColor: 'changed color', actSceneRun: 'ran a scene',
        actRegistered: 'was added', actRemoved: 'was removed',
        lastActivityLine: 'Last activity: {name} {action} · {time}',
        addBoardBtn: 'Add board', realBoardDataTitle: 'Real board data (via {transport}, not mock)',
        boardConnectedTag: 'board connected', genericPinoutUnverified: 'Generic pinout, unverified',
        showAllConnectorPins: 'Show all connector pins (not just the ones the firmware uses)',
        firmwareNoPinsThisSide: 'The firmware doesn\'t use pins on this side.',
        pinInspectorTitle: 'Pin inspector', scanningWord: 'Scanning…', scanPinsBtn: 'Scan pins',
        rolesLegend: 'Role legend', pinSummaryTitle: 'Pin summary', activeAssignmentsTitle: 'Active assignments',
        activeAutomationsTitle: 'Active automations (global rules)', systemStateTitle: 'System state',
        selectPinToConfigure: 'Select a pin on the map to configure it.',
        assignedFunctionLabel: 'Assigned function', notAppliedYet: 'not applied',
        modeLabel: 'Mode', initialStateLabel: 'Initial state', logicLevelLabel: 'Logic level',
        fixedConnectorPin: 'Fixed connector pin -- not configurable.', parametersTitle: 'Parameters',
        applyConfigBtn: 'Apply configuration',
        totalWord: 'Total', assignedWord: 'Assigned', communicationsWord: 'Communications',
        noActivityYet: 'No activity yet.',
        scenesByMachine: 'Scenes by machine', addMachine: 'Add machine',
        addMachineHint: 'Set up scenes for more of your workshop\'s equipment.',
        machineScenesSubtitle: 'Rules of their own per machine -- data source, available variables, and associated outputs.',
        dataSourceLabel: 'Data source:', outputsActionsTitle: 'Outputs / Actions', portLabel: 'Port:',
        viewRuleEditor: 'View rule editor',
        pinCount: '{count} pin(s)', noPinsAssignedCategory: 'No pins assigned to this category yet, on any board.',
        ifConditionHeader: 'IF (Condition)', thenActionHeader: 'THEN (Action)', sourceHeader: 'Source',
        newRuleWord: 'New rule',
        consoleReadOnlyNote: 'Read-only console (mock) -- will connect to the board\'s real serial/HTTP port.',
        tplPrinterBasic: 'Basic 3D printer', tplPrinterBasicDesc: 'Status LED + ventilation relay.',
        tplLaserStation: 'Laser station', tplLaserStationDesc: 'Extractor + siren + alarm lights.',
        tplCncBeacon: 'CNC with beacon', tplCncBeaconDesc: 'Tricolor beacon + dust extractor.',
        templatesSubtitle: 'Predefined pin configurations to get started quickly.', useBtn: 'Use',
        warningMultipleFunctionsPin: '{count} pin(s) with more than one function assigned on "{board}".',
        wifiTransportReflashNote: 'The accessory\'s WiFi transport needs firmware v1.4 reflashed to become active.',
        errCouldNotLoadWorkshopState: 'Could not load the workshop state.',
        accessoryToggled: '{name}: {state}.', errCouldNotChangeAccessory: 'Could not change the accessory.',
        colorUpdated: 'Color updated.', errCouldNotChangeLighting: 'Could not change the lighting.',
        chooseModel: 'Choose a model.', giveBoardName: 'Give the board a name.',
        boardAdded: '{name} ({label}) was added.', errCouldNotAddBoard: 'Could not add the board.',
        boardUpdated: 'Board updated.', errCouldNotUpdateBoard: 'Could not update the board.',
        ambientSensorLabel: 'Workshop ambient sensor', ambientSensorHint: 'Use this board\'s DHT11 for the "Workshop ambient temp." card on the main dashboard. Only one board at a time.',
        boardDeleted: 'Board deleted.', errCouldNotDeleteBoard: 'Could not delete the board.',
        errCouldNotLoadSavedBoards: 'Could not load saved boards.',
        configApplied: 'Configuration applied.', errCouldNotSavePinConfig: 'Could not save the pin configuration.',
        modelDetectedMapSaveFailed: 'We detected the model, but couldn\'t save the corrected map.',
        giveBoardIp: 'Enter the board\'s IP.', fileUploadedOk: '{name} uploaded successfully.',
        choosePortFirst: 'Choose a port first.', chooseBinaryFirst: 'Choose (or upload) a .bin binary first.',
        errCouldNotOpenFirmwareUpdater: 'Could not open the firmware updater.',
        ruleEditorComingSoon: 'Rule editor: coming soon.',
        sceneApplied: 'Scene "{name}" applied.', errCouldNotRunScene: 'Could not run the scene.',
        sceneAppliedState: '"{name}": {state}.',
        needAccessoryForScene: 'Register at least one accessory (relay or LED) before creating a scene.',
        sceneNeedsAction: 'The scene needs at least one action.',
        sceneNeedsTwoStates: 'Toggle/cycle mode needs at least 2 states.',
        sceneModeLabel: 'Scene mode',
        modeNormalLabel: 'Normal', modeNormalHint: 'Every run always does the same thing.',
        modeToggleLabel: 'Toggle', modeToggleHint: 'Alternates between 2 states on each click, like a switch.',
        modeCycleLabel: 'Cycle', modeCycleHint: 'Rotates through 3 or more states, in order.',
        stateNamePlaceholder: 'E.g. On', removeStateTitle: 'Remove state', addStateBtn: 'Add state',
        stateOnDefault: 'On', stateOffDefault: 'Off', stateDefaultName: 'State {number}',
        sceneDeleted: 'Scene deleted.', errCouldNotDeleteScene: 'Could not delete the scene.',
        sceneUpdated: 'Scene updated.', sceneCreated: 'Scene created.', errCouldNotSaveScene: 'Could not save the scene.',
        nameWord: 'Name', ledModeLabel: 'LED mode', protocolLabel: 'Protocol', otaUserLabel: 'OTA username',
        accessoryDetailsEyebrow: 'ACCESSORY DETAILS', thisAccessoryWord: 'this accessory',
        confirmDeleteAccessory: 'You\'re about to delete "{name}" from NOPAL. This action can\'t be undone.',
        deleteAccessoryTitle: 'Delete accessory', accessoryDeletedToast: 'Accessory deleted.',
        otherBoardByIp: 'Another board by IP',
        boardLightingEyebrow: 'BOARD LIGHTING', addLedOrNeopixel: 'Add LED or NeoPixel strip',
        registerLightHint: 'Register the light directly from an already-added NOPAL board.',
        boardIpLabel: 'Board IP', workshopLightingDefaultName: 'Workshop lighting',
        neopixelNamePlaceholder: 'E.g. Printers NeoPixel', typeWord: 'Type', dataGpioLabel: 'Data GPIO',
        ledCountHint: 'The count can be 1 for a single NeoPixel, 8 for your current strip, or any length that board\'s firmware has configured.',
        showOnPanelLabel: 'Show on panel',
        showOnPanelHint: 'If you leave this on, every device with "Use visual alerts" enabled with this strip will show a replica of its LEDs on its own card -- e.g. if this strip lights 4 LEDs for a printer\'s status, that printer will also show them on its own card.',
        addLightingBtn: 'Add lighting',
        boardOutputEyebrow: 'BOARD OUTPUT', registerRelayN: 'Register Relay {n}',
        boardReportedRelayHint: 'The board already reported this relay -- it just needs a name.',
        relayNamePlaceholder: 'E.g. Extractor fan', relayNumberLabel: 'Relay number',
        registerRelayBtn: 'Register relay', relayRegisteredToast: 'Relay registered.', workshopWord: 'Workshop',
        turnOnOption: 'Turn on', turnOffOption: 'Turn off', setColorOption: 'Set color', removeActionTitle: 'Remove action',
        workshopMacroEyebrow: 'WORKSHOP MACRO', sceneEditorHint: 'Apply several actions to your relays and lights with a single button.', aiSceneHintTitle: 'Let NOPAL Intelligence build it', aiSceneHintBody: 'With AI enabled you can ask for scenes in plain words ("ventilation cycle") and have them proposed from your accessories.', aiSceneHintCta: 'Enable NOPAL Intelligence',
        addActionBtn: 'Add action', saveChangesBtn: 'Save changes', createSceneBtn: 'Create scene',
        confirmDeleteScene: 'You\'re about to delete the scene "{name}". This action can\'t be undone.', deleteSceneTitle: 'Delete scene',
        noBoardsAddedYet: 'You haven\'t added any boards yet.',
        confirmDeleteBoard: 'Delete "{name}"? Its saved pin configuration will be erased.', deleteBoardTitle: 'Delete board',
        confirmDeleteBoardShort: 'Delete "{name}"?',
        mainWorkshopName: 'Main Workshop', domoticWorkshopName: 'Home Automation Workshop',
        scanCompleteMsg: 'Scan complete: {assigned} assigned, {free} free{conflictSuffix}.',
        scanConflictSuffix: ', {count} with conflict',
        flashDoneNoResponse: 'Flashing finished but the board still isn\'t responding -- it may need more time or a manual reset.',
        operationCouldNotComplete: 'The operation could not be completed.', navLabel: 'Workshop Automation',
        cancelBtn: 'Cancel', configureBtn: 'Configure', deleteTitle: 'Delete', diagnosticsTitle: 'Diagnostics',
        errCouldNotDeleteAccessory: 'Could not delete the accessory.',
        lightingAddedHint: 'Lighting added. You can now assign it to machine scenes.',
        memoryWord: 'Memory', saveBtn: 'Save',
        ledsFilteredSubtitle: 'PWM LEDs and strips assigned across all your boards.',
        relaysFilteredSubtitle: 'Relay outputs assigned across all your boards.',
        sensorsFilteredSubtitle: 'Sensor inputs assigned across all your boards.',
        usbBoardName: 'USB Board ({device})', wifiBoardName: 'WiFi Board ({host})',
    },
    de: {
        catPower: 'Stromversorgung', catGround: 'Masse', catReserved: 'Reserviert', catFree: 'Frei',
        catLedWs2812: 'WS2812 LED-Streifen', catLedPwm: 'Analoge PWM-LED', catRelay: 'Relais',
        catSensorTemp: 'Temperatursensor', catSensorSmoke: 'Rauchmelder', catSensorDoor: 'Türsensor',
        catI2c: 'I2C', catUart: 'UART', catSpi: 'SPI', catBuzzer: 'Summer', catVentilation: 'Belüftung',
        catAdc: 'Analogeingang', catDac: 'DAC-Ausgang', catModem: 'SIM800L-Modem',
        paramStripType: 'Streifentyp', paramLedCount: 'LED-Anzahl', paramBrightness: 'Globale Helligkeit',
        paramInvertData: 'Daten invertieren', paramDefaultColor: 'Standardfarbe (Standby)',
        paramChannel: 'Kanal', paramInvertOutput: 'Ausgang invertieren',
        paramActiveLow: 'Aktiv bei LOW', paramDefaultOn: 'Beim Start eingeschaltet',
        paramSensorType: 'Sensortyp', paramThreshold: 'Alarmschwelle', paramNormallyOpen: 'Normal offen',
        paramRole: 'Rolle', paramBaud: 'Baudrate', paramSpeedControl: 'Drehzahlregelung (PWM)',
        pinAlimentacion: 'Stromversorgung', pinHabilitar: 'Aktivieren', pinAdcEntrada: 'ADC / Eingang', pinLibre: 'Frei',
        pinLedPwmR: 'LED PWM R', pinLedPwmG: 'LED PWM G', pinLedPwmB: 'LED PWM B', pinTierra: 'Masse',
        pinRele1: 'Relais 1', pinRele2: 'Relais 2', pinRele3: 'Relais 3', pinRele4: 'Relais 4',
        pinTiraLed: 'WS2812 LED-Streifen', pinLibreBoot: 'Frei (Boot)', pinLedEstado: 'Status-LED',
        pinSerialRx: 'Serial RX', pinSerialTx: 'Serial TX', pinEntradaAnalogica: 'Analogeingang',
        pinSinConexion: 'Keine Verbindung', pinAdc0Vp: 'ADC0 / VP', pinAdc3Vn: 'ADC3 / VN', pinAdc6: 'ADC6', pinAdc7: 'ADC7',
        pinSim800lDtr: 'SIM800L DTR', pinSim800lRi: 'SIM800L RI (Klingeln)', pinSim800lTx: 'SIM800L TX', pinSim800lRx: 'SIM800L RX',
        pinTouch5: 'Touch5', pinLedEstadoAzul: 'Status-LED (blau)', pinFlashSpiReservado: 'Flash SPI (reserviert)',
        pinSalidaAudioMas: 'Audioausgang +', pinSalidaAudioMenos: 'Audioausgang -',
        pinSim800lPowerOn: 'SIM800L POWER ON', pinI2cSclCompartido: 'I2C SCL (IP5306 + 4 Relais MCP23017 0x20)',
        pinSerialTxProg: 'Serial TX (Programmierung)', pinSerialRxProg: 'Serial RX (Programmierung)',
        pinI2cSdaCompartido: 'I2C SDA (IP5306 + 4 Relais MCP23017 0x20)',
        pinSim800lReset: 'SIM800L RESET', pinSim800lPwrkey: 'SIM800L PWRKEY',
        pinTouch1Boot: 'Touch1 (Boot)', pinTouch2: 'Touch2', pinTouch3: 'Touch3',
        pinEntradaAudioMenos: 'Audioeingang -', pinEntradaAudioMas: 'Audioeingang +',
        boardEsp32Label: 'ESP32 DevKit V1 / NodeMCU', boardEsp8266Label: 'ESP8266 (generisch)',
        boardNodemcuLabel: 'NodeMCU V3', boardWemosLabel: 'Wemos D1 mini', boardTcallLabel: 'ESP32 SIM800L T-Call V1.3',
        boardTcallNote: 'Nur Nano-SIM. Die 4 Relais laufen über I2C (MCP23017 0x20, gleicher Bus wie SDA/SCL) -- sie haben keinen eigenen Header-Pin.',
        machinePrinterName: '3D-Drucker', machineLaserName: 'Laser', machineCncName: 'CNC',
        varNozzleTemp: 'Düsentemp. (°C)', varBedTemp: 'Betttemp. (°C)', varPrintState: 'Druckstatus', varPrintProgress: 'Fortschritt (%)',
        varGrblState: 'GRBL-Status', varCoolant: 'Kühlmittel', varJobState: 'Jobstatus', varJobProgress: 'Aktueller Fortschritt',
        varSpindleActive: 'Spindel aktiv',
        outputLedStrip: 'WS2812 LED-Streifen', outputExtractorRelay: 'Absaugung-Relais', outputSiren: 'Sirene',
        outputFanRelay: 'Lüfter-Relais', outputBeacon: 'LED-Leuchte',
        ruleColdMachine: 'Maschine kalt', ruleHeating: 'Heizt auf', ruleOverTemp: 'Übertemperatur',
        ruleReadyToPrint: 'Druckbereit', ruleGradientProgress: 'Verlauf nach Fortschritt',
        ruleGreenLight: 'Grünes Licht', ruleAmberLightExtractor: 'Gelbes Licht + Absaugung EIN', ruleRedSiren: 'Rot + Sirene',
        rulePauseWarning: 'Pause + Warnlicht', ruleBlueBeacon: 'Blaue Leuchte', ruleFanOn: 'Absaugung/Lüfter EIN',
        ruleRedBlink: 'Blinkt rot',
        condNozzleBelow40: 'Düsentemp. < 40°C', condNozzle40to200: '40°C ≤ Düsentemp. < 200°C', condNozzleAbove220: 'Düsentemp. ≥ 220°C',
        condStateReady: 'Status = Bereit', condPrinting: 'Druckt', condReadyState: 'Status bereit', condEngraving: 'Graviert (Run)',
        condAlarm: 'Alarm', condDoorOpen: 'Tür offen', condJobActive: 'Job aktiv', condSpindleActive: 'Spindel aktiv',
        condJobEnd: 'Job beendet', condErrorLimit: 'Fehler oder Limit',
        ruleCondNozzleAbove220: 'Düsentemp. > 220°C', ruleCondPrintDone: 'Druck beendet', ruleCondProgressX: 'Druckfortschritt = X%',
        ruleCondLaserEngraving: 'Laserstatus = Graviert', ruleCondSpindleActive: 'Spindel aktiv',
        ruleCondLimitOrError: 'Limit ausgelöst oder Fehler',
        ruleActionLedRed: 'LED-Streifen = Rot', ruleActionLedGreenFanOff: 'LED = Grün + Belüftung AUS', ruleActionLedGradient: 'LED-Streifen = Verlauf(X%)',
        ruleActionExtractorOn: 'Absaugung = EIN', ruleActionPauseYellow: 'Laser pausieren + gelbes Licht', ruleActionFanOn: 'Lüfter = EIN',
        ruleActionRedBlink: 'Blinkendes rotes Licht',
        actNozzle215: 'Düsentemp. 215°C', actLaserEngraving: 'Laser: Graviert…', actProgress65: 'Druckfortschritt 65%',
        actSpindleOn: 'Spindel aktiviert', actDoorClosed: 'Tür geschlossen',
        connectionExcellent: 'Ausgezeichnet',
        subOverview: 'Übersicht', subPines: 'Pin-Karte', subScenes: 'Maschinenszenen', subLeds: 'LEDs',
        subRelays: 'Relais', subSensors: 'Sensoren', subAutomations: 'Automatisierungen', subConsole: 'Konsole',
        subTemplates: 'Vorlagen', subAlerts: 'Warnungen', subBadgeNew: 'NEU', statusActive: 'AKTIV',
        headerTitle: 'Arduino/ESP32-Zubehör', checkingStatus: 'Wird geprüft…', docsBtn: 'Dokumentation', configBtn: 'Einstellungen',
        manageBoardsTitle: 'Platinen verwalten', closeTitle: 'Schließen', settingsTitle: 'Einstellungen',
        manageBoardsDesc: 'Bearbeite Name, USB-Port oder IP jeder Platine, oder lösche sie.',
        chipBoard: 'Platine', chipLocalIp: 'Lokale IP', chipUsbPort: 'USB-Port', chipUptime: 'Laufzeit', chipFirmware: 'Firmware',
        activeAndConnected: 'Aktiv und verbunden', noConnectionConfirmed: 'Keine bestätigte Verbindung',
        statusReady: 'Status: Bereit', assignedPinsLabel: 'Zugewiesene Pins: {assigned}/{total}',
        memoryLabel: 'Speicher: {value}%', latencyLabel: 'Latenz: {value} ms', mainPanelLabel: 'Hauptbereich',
        wizardCheckingFirmware: 'Wird geprüft, ob deine Platine bereits NOPAL-Firmware hat…',
        wizardTileChip: 'Chip', wizardTileFirmware: 'Firmware', wizardTilePort: 'Port', wizardTileIp: 'IP',
        wizardTileRelays: 'Relais', wizardTileLedPwm: 'LED PWM', yesWord: 'Ja', noWord: 'Nein',
        wizardTileWs2812Yes: 'Ja ({count} px)',
        wizardIntroTitle: 'Bevor du beginnst',
        wizardIntroBody: 'Wir haben gerade keine Platine mit antwortender NOPAL-Firmware erkannt. Wenn du bereits eine geflashte Platine hast (per USB oder schon im WLAN), suche sie. Wenn es eine neue Platine ist, helfen wir dir hier beim Flashen.',
        wizardSearchUsb: 'Über USB suchen', wizardSearchWifi: 'Über WLAN suchen (IP)', wizardAddManually: 'Manuell hinzufügen',
        wizardSkipIntro: 'Ich habe bereits eine Platine eingerichtet / Vorerst überspringen',
        wizardProbingConnection: 'Verbindung zur Platine wird getestet…',
        wizardWifiHint: 'Gleiche IP und OTA-Zugangsdaten, die die Platine für ElegantOTA verwendet (siehe secrets.h der Firmware).',
        wizardBoardIp: 'IP der Platine', wizardOtaUser: 'OTA-Benutzer', wizardOtaPassword: 'OTA-Passwort',
        wizardTestConnection: 'Verbindung testen', wizardBack: 'Zurück',
        wizardSearchingUsb: 'Suche nach über USB verbundenen Platinen…',
        wizardIdentifyTitle: 'Platine erkannt: Modell bestätigen',
        wizardIdentifyBody: 'Die Verbindung funktioniert, aber die Firmware hat keine ausreichend genaue Kennung gemeldet. Wähle das Modell, um die richtige Pin-Karte zu laden.',
        wizardModelLabel: 'Modell', wizardUsePinMap: 'Diese Pin-Karte verwenden',
        wizardManualTitle: 'Platine manuell hinzufügen',
        wizardManualBody: 'Verwende diese Option nur, wenn die Platine per USB oder WLAN nicht identifiziert werden kann.',
        wizardNicknameLabel: 'Name / Spitzname', wizardNicknamePlaceholder: 'z. B. Laserstation',
        wizardAddWithMap: 'Mit dieser Karte hinzufügen',
        wizardFoundTitle: 'Wir haben deine Platine gefunden!', wizardContinueToPanel: 'Weiter zum Bereich',
        wizardNotFoundTitle: 'Wir haben keine Platine erkannt',
        wizardNotFoundBody: 'Verbinde deine Platine per USB (warte ein paar Sekunden, bis sie startet) und versuche es erneut. Wenn es eine neue Platine ohne Firmware ist, flashe sie hier.',
        wizardRetryUsb: 'Über USB erneut versuchen', wizardFlashNow: 'Firmware jetzt flashen', wizardSkipForNow: 'Vorerst überspringen',
        wizardFlashTitle: 'Firmware flashen',
        wizardFlashBody: 'NOPAL kompiliert nichts -- es flasht nur eine bereits aus der Arduino IDE exportierte .bin-Datei (Sketch → Export Compiled Binary).',
        wizardPortLabel: 'Port', wizardNoPortsFound: 'Wir sehen keine passenden USB-Ports -- prüfe Kabel/Treiber.',
        wizardBinaryLabel: 'Binärdatei (.bin)', wizardUploadNew: 'Neue hochladen',
        wizardNoBuildsUploaded: 'Du hast noch keine Binärdatei hochgeladen.', wizardFlashBtn: 'Flashen',
        wizardFlashing: 'Firmware wird geflasht -- Platine nicht trennen…',
        wizardFlashSuccessTitle: 'Firmware geflasht', wizardGoToPanel: 'Zum Bereich',
        notReported: 'Nicht gemeldet', notReportedMasc: 'Nicht gemeldet',
        tabLedStrips: 'LED-Streifen', tabInputs: 'Eingänge', tabMacros: 'Makros',
        systemSummary: 'Systemübersicht', activeCount: '{count} aktiv', activeCountFem: '{count} aktiv',
        connectivity: 'Konnektivität', signalLabel: 'Signal:', stateLabel: 'Status',
        optimalState: 'Optimal', pendingState: 'Ausstehend', realTelemetry: 'Echte Telemetrie', noResponse: 'Keine Antwort',
        consumptionVoltage: 'Verbrauch und Spannung', adcInputGpio: 'ADC-Eingang GPIO{gpio}',
        percentOfRange: '{value}% des Bereichs', noReading: 'Kein Messwert', currentConsumption: 'Aktueller Verbrauch',
        sensorNotInstalled: 'Sensor nicht installiert', adcInstantReadingNote: 'Sofortiger ADC-Messwert; NOPAL erfindet keinen Verlauf oder Stromverbrauch.',
        connectionState: 'Verbindungsstatus', connectedState: 'Verbunden', availableState: 'Verfügbar',
        responseTime: 'Antwortzeit',
        devicesAndControls: 'Geräte und Steuerungen', quickActions: 'Schnellaktionen',
        recentActivity: 'Letzte Aktivität', macrosAndScenes: 'Makros und Szenen', newWord: 'Neu',
        editSceneTitle: 'Szene bearbeiten', noScenesSaved: 'Keine gespeicherten Szenen.',
        deviceInfo: 'Geräteinformationen', connectionLabel: 'Verbindung', freeMemory: 'Freier Speicher',
        notAvailable: 'Nicht verfügbar', pinProfile: 'Pin-Profil', noProfile: 'Kein Profil',
        readingBoard: 'Platine wird gelesen…', boardNoRelaysReported: 'Die Platine hat keine Relais gemeldet. Prüfe Verbindung oder Konfiguration.',
        relayNumber: 'Relais {n}', outputNumber: 'Ausgang {n}', notRegisteredInNopal: 'Nicht in NOPAL registriert',
        inactiveCount: '{count} inaktiv', editRelays: 'Relais bearbeiten',
        inputLabel: 'Eingang', wifiCompatible: 'WLAN-kompatibel', rawReading: 'RAW-Messwert',
        percentageLabel: 'Prozentsatz', ofAdcRange: 'Vom ADC-Bereich', transportLabel: 'Transport',
        notConfiguredMasc: 'Nicht konfiguriert', noRecentActivity: 'Keine aktuelle Aktivität.', eventWord: 'Ereignis',
        viewFullHistory: 'Vollständigen Verlauf anzeigen',
        docsEyebrow: 'INTEGRIERTE ANLEITUNG · AKTIVES PROFIL', docsTitle: 'Dokumentation für {name}',
        docsSubtitle: 'Verbindung, Funktionen, Pin-Karte und NOPAL-Firmwarebefehle an einem Ort.',
        docsBackToPanel: 'Zurück zum Bereich',
        docsNavQuickstart: 'Schnellstart', docsNavFunctions: 'Funktionen', docsNavSafety: 'Sicherheit',
        docsNavServices: 'Dienste', docsNavCommands: 'Befehle',
        docsStep1Title: 'Platine verbinden', docsStep1Body: 'Klicke in der Pin-Karte auf "Platine hinzufügen" und wähle USB oder WLAN.',
        docsStep2Title: 'Modell bestätigen', docsStep2Body: 'NOPAL erkennt es; es fragt nur, wenn die Firmware es nicht identifiziert.',
        docsStep3Title: 'Karte prüfen', docsStep3Body: 'Das Profil {profile} wird automatisch geladen.',
        docsStep4Title: 'Ausgänge registrieren', docsStep4Body: 'Weise in den Einstellungen Namen für Relais, Lichter und Sensoren zu.',
        docsFunctionsTitle: 'Enthaltene Funktionen', docsFeatureRelays: 'Echte EIN/AUS-Steuerung vom Bereich aus.',
        docsFeatureLightingTitle: 'Beleuchtung', docsFeatureLighting: 'Farbe und Status von PWM/WS2812-Streifen.',
        docsFeatureTelemetryTitle: 'Telemetrie', docsFeatureTelemetry: 'WLAN, Speicher, Laufzeit und ADC ohne simulierte Daten.',
        docsFeatureScenesTitle: 'Szenen', docsFeatureScenes: 'Mehrere Aktionen mit einem einzigen Knopf.',
        docsFeatureUsbWifiTitle: 'USB und WLAN', docsFeatureUsbWifi: 'Derselbe Assistent zum Erkennen und Registrieren.',
        docsFeatureAutoMapTitle: 'Automatische Karte', docsFeatureAutoMap: 'Korrigiertes Profil auch bei bereits gespeicherten Platinen.',
        docsNoAssignments: 'Keine dokumentierten Zuweisungen für dieses Profil.', docsOpenInteractiveMap: 'Interaktive Karte öffnen',
        docsSafetyTitle: 'Elektrische Sicherheit',
        docsSafety1: 'GPIOs arbeiten mit 3,3 V; sie unterstützen keine direkten 5-V-Signale.',
        docsSafety2: 'Verwende eine geeignete externe Stromquelle für Relais und LED-Streifen.',
        docsSafety3: 'Verbinde die Masse der externen Stromquelle mit GND der Platine.',
        docsSafety4: 'Verbinde keine Lasten direkt mit einem GPIO.',
        docsSafety5: 'Prüfe die Boot-Pins, bevor du sie neu zuweist.',
        docsServicesTitle: 'Dienste und Verbindung', docsUsbDetection: 'USB-Erkennung',
        docsUsbDetectionValue: 'NOPAL-Handshake über serielle Schnittstelle', docsSerialSpeed: 'Serielle Geschwindigkeit', docsBaud: 'Baud',
        docsWifiState: 'WLAN-Status', docsHealthCheck: 'Gesundheitsprüfung', docsUpdate: 'Aktualisierung',
        docsActiveBoard: 'Aktive Platine', docsNoConnectionConfigured: 'Keine Verbindung konfiguriert',
        docsCommandsTitle: 'NOPAL-Befehle', docsCmdId: 'Identifikation', docsCmdNet: 'Netzwerkstatus',
        docsCmdStatus: 'JSON-Status', docsCmdRelayOn: 'Relais einschalten', docsCmdRelayOff: 'Relais ausschalten',
        docsCmdLedColor: 'LED-Farbe', docsCmdScene: 'Szene anwenden', docsCmdAdc: 'ADC lesen',
        loadingWorkshopState: 'Echter Werkstattstatus wird geladen…', workshopOutputsTitle: 'Werkstattausgänge',
        noRelaysRegisteredYet: 'Noch keine Relais registriert.', addAccessory: 'Zubehör hinzufügen', addWord: 'Hinzufügen',
        outputColumn: 'Ausgang', usageColumn: 'Verwendung', subStateColumn: 'Status', accessoryWord: 'Zubehör',
        onState: 'Ein', offState: 'Aus',
        lightingTitle: 'Beleuchtung', noLedStripsRegisteredYet: 'Noch keine LED-Streifen registriert.',
        addLedStrip: 'LED-Streifen hinzufügen', registeredLighting: 'Registrierte Beleuchtung', addLedOrStrip: 'LED oder Streifen hinzufügen',
        moreOptions: 'Weitere Optionen', viewDetails: 'Details anzeigen', updateFirmware: 'Firmware aktualisieren',
        colorWord: 'Farbe', applyColor: 'Farbe anwenden', turnOffBtn: 'Aus', whiteWord: 'Weiß',
        readyWord: 'Bereit', alertWord: 'Alarm', nopalBoardWord: 'NOPAL-Platine',
        boardConnectionLabel: 'Platinenverbindung', onlineState: 'Online', unconfirmedState: 'Unbestätigt',
        notConfiguredFem: 'Nicht konfiguriert', latencyWord: 'Latenz', nopalHandshake: 'NOPAL-Handshake',
        heapAvailable: 'Verfügbarer Heap', noIpWord: 'Keine IP', uptimeWord: 'Laufzeit', sinceLastRestart: 'Seit dem letzten Neustart',
        inputAnalog: 'Analogeingang', wifiSignal: 'WLAN-Signal', localNetwork: 'Lokales Netzwerk', dhtSensorLabel: 'DHT11-Sensor', batteryLabel: 'Batterie', batteryCharging: 'Wird geladen', batteryDischarging: 'Wird entladen', batteryUntilFull: '{time} bis voll', batteryUntilEmpty: 'noch {time}', batteryHibernating: 'Messgerät im Ruhezustand', batteryResetAlert: 'Das Messgerät hat sich zurückgesetzt', batteryVoltageNote: 'Gemessene Spannung',
        boardTelemetry: 'Platinen-Telemetrie', lastRealHandshakeData: 'Daten des letzten echten Handshakes',
        subScenes2: 'Szenen', createSceneHint: 'Erstelle eine Szene, um Relais einzuschalten und Lichter mit einer einzigen Aktion anzupassen.',
        newSceneWord: 'Neue Szene', actionCount: '{count} Aktion(en)',
        noRecentAccessoryActivity: 'Keine aktuelle Zubehöraktivität.',
        actPowerOn: 'eingeschaltet', actPowerOff: 'ausgeschaltet', actLedColor: 'Farbe geändert', actSceneRun: 'Szene ausgeführt',
        actRegistered: 'wurde hinzugefügt', actRemoved: 'wurde entfernt',
        lastActivityLine: 'Letzte Aktivität: {name} {action} · {time}',
        addBoardBtn: 'Platine hinzufügen', realBoardDataTitle: 'Echte Platinendaten (über {transport}, kein Mock)',
        boardConnectedTag: 'Platine verbunden', genericPinoutUnverified: 'Generisches Pinout, nicht verifiziert',
        showAllConnectorPins: 'Alle Steckerpins anzeigen (nicht nur die von der Firmware verwendeten)',
        firmwareNoPinsThisSide: 'Die Firmware verwendet keine Pins auf dieser Seite.',
        pinInspectorTitle: 'Pin-Inspektor', scanningWord: 'Wird gescannt…', scanPinsBtn: 'Pins scannen',
        rolesLegend: 'Rollenlegende', pinSummaryTitle: 'Pin-Übersicht', activeAssignmentsTitle: 'Aktive Zuweisungen',
        activeAutomationsTitle: 'Aktive Automatisierungen (globale Regeln)', systemStateTitle: 'Systemstatus',
        selectPinToConfigure: 'Wähle einen Pin auf der Karte aus, um ihn zu konfigurieren.',
        assignedFunctionLabel: 'Zugewiesene Funktion', notAppliedYet: 'nicht angewendet',
        modeLabel: 'Modus', initialStateLabel: 'Anfangszustand', logicLevelLabel: 'Logikpegel',
        fixedConnectorPin: 'Fester Steckerpin -- nicht konfigurierbar.', parametersTitle: 'Parameter',
        applyConfigBtn: 'Konfiguration anwenden',
        totalWord: 'Gesamt', assignedWord: 'Zugewiesen', communicationsWord: 'Kommunikation',
        noActivityYet: 'Noch keine Aktivität.',
        scenesByMachine: 'Szenen nach Maschine', addMachine: 'Maschine hinzufügen',
        addMachineHint: 'Richte Szenen für weitere Geräte deiner Werkstatt ein.',
        machineScenesSubtitle: 'Eigene Regeln pro Maschine -- Datenquelle, verfügbare Variablen und zugehörige Ausgänge.',
        dataSourceLabel: 'Datenquelle:', outputsActionsTitle: 'Ausgänge / Aktionen', portLabel: 'Port:',
        viewRuleEditor: 'Regeleditor öffnen',
        pinCount: '{count} Pin(s)', noPinsAssignedCategory: 'Noch keine Pins für diese Kategorie zugewiesen, auf keiner Platine.',
        ifConditionHeader: 'WENN (Bedingung)', thenActionHeader: 'DANN (Aktion)', sourceHeader: 'Quelle',
        newRuleWord: 'Neue Regel',
        consoleReadOnlyNote: 'Schreibgeschützte Konsole (Mock) -- wird mit dem echten seriellen/HTTP-Port der Platine verbunden.',
        tplPrinterBasic: 'Einfacher 3D-Drucker', tplPrinterBasicDesc: 'Status-LED + Belüftungsrelais.',
        tplLaserStation: 'Laserstation', tplLaserStationDesc: 'Absaugung + Sirene + Alarmlichter.',
        tplCncBeacon: 'CNC mit Leuchte', tplCncBeaconDesc: 'Dreifarbige Leuchte + Staubabsaugung.',
        templatesSubtitle: 'Vordefinierte Pin-Konfigurationen für einen schnellen Start.', useBtn: 'Verwenden',
        warningMultipleFunctionsPin: '{count} Pin(s) mit mehr als einer zugewiesenen Funktion auf "{board}".',
        wifiTransportReflashNote: 'Der WLAN-Transport des Zubehörs erfordert ein erneutes Flashen der Firmware v1.4, um aktiv zu werden.',
        errCouldNotLoadWorkshopState: 'Der Werkstattstatus konnte nicht geladen werden.',
        accessoryToggled: '{name}: {state}.', errCouldNotChangeAccessory: 'Das Zubehör konnte nicht geändert werden.',
        colorUpdated: 'Farbe aktualisiert.', errCouldNotChangeLighting: 'Die Beleuchtung konnte nicht geändert werden.',
        chooseModel: 'Wähle ein Modell.', giveBoardName: 'Gib der Platine einen Namen.',
        boardAdded: '{name} ({label}) wurde hinzugefügt.', errCouldNotAddBoard: 'Die Platine konnte nicht hinzugefügt werden.',
        boardUpdated: 'Platine aktualisiert.', errCouldNotUpdateBoard: 'Die Platine konnte nicht aktualisiert werden.',
        ambientSensorLabel: 'Umgebungssensor der Werkstatt', ambientSensorHint: 'Verwendet den DHT11 dieser Platine für die Karte „Umgebungstemp. der Werkstatt" im Hauptpanel. Nur eine Platine gleichzeitig.',
        boardDeleted: 'Platine gelöscht.', errCouldNotDeleteBoard: 'Die Platine konnte nicht gelöscht werden.',
        errCouldNotLoadSavedBoards: 'Gespeicherte Platinen konnten nicht geladen werden.',
        configApplied: 'Konfiguration angewendet.', errCouldNotSavePinConfig: 'Die Pin-Konfiguration konnte nicht gespeichert werden.',
        modelDetectedMapSaveFailed: 'Wir haben das Modell erkannt, konnten aber die korrigierte Karte nicht speichern.',
        giveBoardIp: 'Gib die IP der Platine ein.', fileUploadedOk: '{name} erfolgreich hochgeladen.',
        choosePortFirst: 'Wähle zuerst einen Port.', chooseBinaryFirst: 'Wähle (oder lade) zuerst eine .bin-Datei hoch.',
        errCouldNotOpenFirmwareUpdater: 'Der Firmware-Updater konnte nicht geöffnet werden.',
        ruleEditorComingSoon: 'Regeleditor: demnächst verfügbar.',
        sceneApplied: 'Szene "{name}" angewendet.', errCouldNotRunScene: 'Die Szene konnte nicht ausgeführt werden.',
        sceneAppliedState: '"{name}": {state}.',
        needAccessoryForScene: 'Registriere mindestens ein Zubehör (Relais oder LED), bevor du eine Szene erstellst.',
        sceneNeedsAction: 'Die Szene benötigt mindestens eine Aktion.',
        sceneNeedsTwoStates: 'Der Umschalt-/Zyklusmodus braucht mindestens 2 Zustände.',
        sceneModeLabel: 'Szenenmodus',
        modeNormalLabel: 'Normal', modeNormalHint: 'Jede Ausführung macht immer dasselbe.',
        modeToggleLabel: 'Umschalten', modeToggleHint: 'Wechselt bei jedem Klick zwischen 2 Zuständen, wie ein Schalter.',
        modeCycleLabel: 'Zyklus', modeCycleHint: 'Rotiert der Reihe nach durch 3 oder mehr Zustände.',
        stateNamePlaceholder: 'Z.B. Ein', removeStateTitle: 'Zustand entfernen', addStateBtn: 'Zustand hinzufügen',
        stateOnDefault: 'Ein', stateOffDefault: 'Aus', stateDefaultName: 'Zustand {number}',
        sceneDeleted: 'Szene gelöscht.', errCouldNotDeleteScene: 'Die Szene konnte nicht gelöscht werden.',
        sceneUpdated: 'Szene aktualisiert.', sceneCreated: 'Szene erstellt.', errCouldNotSaveScene: 'Die Szene konnte nicht gespeichert werden.',
        nameWord: 'Name', ledModeLabel: 'LED-Modus', protocolLabel: 'Protokoll', otaUserLabel: 'OTA-Benutzer',
        accessoryDetailsEyebrow: 'ZUBEHÖRDETAILS', thisAccessoryWord: 'dieses Zubehör',
        confirmDeleteAccessory: 'Du bist dabei, "{name}" aus NOPAL zu löschen. Diese Aktion kann nicht rückgängig gemacht werden.',
        deleteAccessoryTitle: 'Zubehör löschen', accessoryDeletedToast: 'Zubehör gelöscht.',
        otherBoardByIp: 'Andere Platine per IP',
        boardLightingEyebrow: 'PLATINENBELEUCHTUNG', addLedOrNeopixel: 'LED oder NeoPixel-Streifen hinzufügen',
        registerLightHint: 'Registriere das Licht direkt von einer bereits hinzugefügten NOPAL-Platine.',
        boardIpLabel: 'IP der Platine', workshopLightingDefaultName: 'Werkstattbeleuchtung',
        neopixelNamePlaceholder: 'z. B. NeoPixel Drucker', typeWord: 'Typ', dataGpioLabel: 'Daten-GPIO',
        ledCountHint: 'Die Anzahl kann 1 für ein einzelnes NeoPixel, 8 für deinen aktuellen Streifen oder jede Länge sein, die die Firmware dieser Platine konfiguriert hat.',
        showOnPanelLabel: 'Im Bereich anzeigen',
        showOnPanelHint: 'Wenn aktiviert, zeigt die Karte jedes Geräts mit aktivierten "Visuellen Warnungen" für diesen Streifen eine Kopie seiner LEDs -- z. B. wenn dieser Streifen 4 LEDs für den Status eines Druckers einschaltet, zeigt dieser Drucker sie auch auf seiner eigenen Karte.',
        addLightingBtn: 'Beleuchtung hinzufügen',
        boardOutputEyebrow: 'PLATINENAUSGANG', registerRelayN: 'Relais {n} registrieren',
        boardReportedRelayHint: 'Die Platine hat dieses Relais bereits gemeldet -- es fehlt nur ein Name.',
        relayNamePlaceholder: 'z. B. Absaugventilator', relayNumberLabel: 'Relaisnummer',
        registerRelayBtn: 'Relais registrieren', relayRegisteredToast: 'Relais registriert.', workshopWord: 'Werkstatt',
        turnOnOption: 'Einschalten', turnOffOption: 'Ausschalten', setColorOption: 'Farbe festlegen', removeActionTitle: 'Aktion entfernen',
        workshopMacroEyebrow: 'WERKSTATT-MAKRO', sceneEditorHint: 'Wende mehrere Aktionen auf deine Relais und Lichter mit einem einzigen Knopf an.', aiSceneHintTitle: 'Lass NOPAL Intelligence sie bauen', aiSceneHintBody: 'Mit aktivierter KI kannst du Szenen in Worten anfordern ("Lüftungszyklus") und sie aus deinem Zubehör vorschlagen lassen.', aiSceneHintCta: 'NOPAL Intelligence aktivieren',
        addActionBtn: 'Aktion hinzufügen', saveChangesBtn: 'Änderungen speichern', createSceneBtn: 'Szene erstellen',
        confirmDeleteScene: 'Du bist dabei, die Szene "{name}" zu löschen. Diese Aktion kann nicht rückgängig gemacht werden.', deleteSceneTitle: 'Szene löschen',
        noBoardsAddedYet: 'Du hast noch keine Platinen hinzugefügt.',
        confirmDeleteBoard: '"{name}" löschen? Die gespeicherte Pin-Konfiguration wird gelöscht.', deleteBoardTitle: 'Platine löschen',
        confirmDeleteBoardShort: '"{name}" löschen?',
        mainWorkshopName: 'Hauptwerkstatt', domoticWorkshopName: 'Hausautomatisierungs-Werkstatt',
        scanCompleteMsg: 'Scan abgeschlossen: {assigned} zugewiesen, {free} frei{conflictSuffix}.',
        scanConflictSuffix: ', {count} mit Konflikt',
        flashDoneNoResponse: 'Das Flashen ist fertig, aber die Platine antwortet noch nicht -- sie braucht möglicherweise mehr Zeit oder einen manuellen Reset.',
        operationCouldNotComplete: 'Der Vorgang konnte nicht abgeschlossen werden.', navLabel: 'Werkstattautomatisierung',
        cancelBtn: 'Abbrechen', configureBtn: 'Konfigurieren', deleteTitle: 'Löschen', diagnosticsTitle: 'Diagnose',
        errCouldNotDeleteAccessory: 'Das Zubehör konnte nicht gelöscht werden.',
        lightingAddedHint: 'Beleuchtung hinzugefügt. Du kannst sie jetzt Maschinenszenen zuweisen.',
        memoryWord: 'Speicher', saveBtn: 'Speichern',
        ledsFilteredSubtitle: 'PWM-LEDs und Streifen, die auf all deinen Platinen zugewiesen sind.',
        relaysFilteredSubtitle: 'Relaisausgänge, die auf all deinen Platinen zugewiesen sind.',
        sensorsFilteredSubtitle: 'Sensoreingänge, die auf all deinen Platinen zugewiesen sind.',
        usbBoardName: 'USB-Platine ({device})', wifiBoardName: 'WLAN-Platine ({host})',
    },
    fr: {
        catPower: 'Alimentation', catGround: 'Masse', catReserved: 'Réservé', catFree: 'Libre',
        catLedWs2812: 'Bande LED WS2812', catLedPwm: 'LED PWM analogique', catRelay: 'Relais',
        catSensorTemp: 'Capteur de température', catSensorSmoke: 'Capteur de fumée', catSensorDoor: 'Capteur de porte',
        catI2c: 'I2C', catUart: 'UART', catSpi: 'SPI', catBuzzer: 'Buzzer', catVentilation: 'Ventilation',
        catAdc: 'Entrée analogique', catDac: 'Sortie DAC', catModem: 'Modem SIM800L',
        paramStripType: 'Type de bande', paramLedCount: 'Nombre de LED', paramBrightness: 'Luminosité globale',
        paramInvertData: 'Inverser les données', paramDefaultColor: 'Couleur par défaut (veille)',
        paramChannel: 'Canal', paramInvertOutput: 'Inverser la sortie',
        paramActiveLow: 'Actif à LOW', paramDefaultOn: 'Allumé au démarrage',
        paramSensorType: 'Type de capteur', paramThreshold: 'Seuil d\'alarme', paramNormallyOpen: 'Normalement ouvert',
        paramRole: 'Rôle', paramBaud: 'Débit en bauds', paramSpeedControl: 'Contrôle de vitesse (PWM)',
        pinAlimentacion: 'Alimentation', pinHabilitar: 'Activer', pinAdcEntrada: 'ADC / Entrée', pinLibre: 'Libre',
        pinLedPwmR: 'LED PWM R', pinLedPwmG: 'LED PWM G', pinLedPwmB: 'LED PWM B', pinTierra: 'Masse',
        pinRele1: 'Relais 1', pinRele2: 'Relais 2', pinRele3: 'Relais 3', pinRele4: 'Relais 4',
        pinTiraLed: 'Bande LED WS2812', pinLibreBoot: 'Libre (boot)', pinLedEstado: 'LED d\'état',
        pinSerialRx: 'Serial RX', pinSerialTx: 'Serial TX', pinEntradaAnalogica: 'Entrée analogique',
        pinSinConexion: 'Sans connexion', pinAdc0Vp: 'ADC0 / VP', pinAdc3Vn: 'ADC3 / VN', pinAdc6: 'ADC6', pinAdc7: 'ADC7',
        pinSim800lDtr: 'SIM800L DTR', pinSim800lRi: 'SIM800L RI (sonnerie)', pinSim800lTx: 'SIM800L TX', pinSim800lRx: 'SIM800L RX',
        pinTouch5: 'Touch5', pinLedEstadoAzul: 'LED d\'état (bleue)', pinFlashSpiReservado: 'Flash SPI (réservé)',
        pinSalidaAudioMas: 'Sortie audio +', pinSalidaAudioMenos: 'Sortie audio -',
        pinSim800lPowerOn: 'SIM800L POWER ON', pinI2cSclCompartido: 'I2C SCL (IP5306 + 4 relais MCP23017 0x20)',
        pinSerialTxProg: 'Serial TX (programmation)', pinSerialRxProg: 'Serial RX (programmation)',
        pinI2cSdaCompartido: 'I2C SDA (IP5306 + 4 relais MCP23017 0x20)',
        pinSim800lReset: 'SIM800L RESET', pinSim800lPwrkey: 'SIM800L PWRKEY',
        pinTouch1Boot: 'Touch1 (boot)', pinTouch2: 'Touch2', pinTouch3: 'Touch3',
        pinEntradaAudioMenos: 'Entrée audio -', pinEntradaAudioMas: 'Entrée audio +',
        boardEsp32Label: 'ESP32 DevKit V1 / NodeMCU', boardEsp8266Label: 'ESP8266 générique',
        boardNodemcuLabel: 'NodeMCU V3', boardWemosLabel: 'Wemos D1 mini', boardTcallLabel: 'ESP32 SIM800L T-Call V1.3',
        boardTcallNote: 'Nano SIM uniquement. Les 4 relais passent par I2C (MCP23017 0x20, même bus que SDA/SCL) -- ils n\'ont pas de broche de connecteur propre.',
        machinePrinterName: 'Imprimante 3D', machineLaserName: 'Laser', machineCncName: 'CNC',
        varNozzleTemp: 'Temp. buse (°C)', varBedTemp: 'Temp. plateau (°C)', varPrintState: 'État d\'impression', varPrintProgress: 'Progression (%)',
        varGrblState: 'État GRBL', varCoolant: 'Liquide de refroidissement', varJobState: 'État du travail', varJobProgress: 'Progression actuelle',
        varSpindleActive: 'Broche active',
        outputLedStrip: 'Bande LED WS2812', outputExtractorRelay: 'Relais extracteur', outputSiren: 'Sirène',
        outputFanRelay: 'Relais ventilateur', outputBeacon: 'Balise LED',
        ruleColdMachine: 'Machine froide', ruleHeating: 'Chauffe', ruleOverTemp: 'Surchauffe',
        ruleReadyToPrint: 'Prête à imprimer', ruleGradientProgress: 'Dégradé selon la progression',
        ruleGreenLight: 'Lumière verte', ruleAmberLightExtractor: 'Lumière ambre + extracteur ON', ruleRedSiren: 'Rouge + sirène',
        rulePauseWarning: 'Pause + lumière d\'avertissement', ruleBlueBeacon: 'Balise bleue', ruleFanOn: 'Extracteur/ventilateur ON',
        ruleRedBlink: 'Rouge clignotant',
        condNozzleBelow40: 'Temp. buse < 40°C', condNozzle40to200: '40°C ≤ temp. buse < 200°C', condNozzleAbove220: 'Temp. buse ≥ 220°C',
        condStateReady: 'État = Prête', condPrinting: 'Impression en cours', condReadyState: 'État prêt', condEngraving: 'Gravure (Run)',
        condAlarm: 'Alarme', condDoorOpen: 'Porte ouverte', condJobActive: 'Travail actif', condSpindleActive: 'Broche active',
        condJobEnd: 'Fin de travail', condErrorLimit: 'Erreur ou limite',
        ruleCondNozzleAbove220: 'Temp. buse > 220°C', ruleCondPrintDone: 'Impression terminée', ruleCondProgressX: 'Progression impression = X%',
        ruleCondLaserEngraving: 'État laser = Gravure', ruleCondSpindleActive: 'Broche active',
        ruleCondLimitOrError: 'Limite déclenchée ou erreur',
        ruleActionLedRed: 'Bande LED = Rouge', ruleActionLedGreenFanOff: 'LED = Vert + Ventilation OFF', ruleActionLedGradient: 'Bande LED = Dégradé(X%)',
        ruleActionExtractorOn: 'Extracteur = ON', ruleActionPauseYellow: 'Pause laser + lumière jaune', ruleActionFanOn: 'Ventilateur = ON',
        ruleActionRedBlink: 'Lumière rouge clignotante',
        actNozzle215: 'Temp. buse 215°C', actLaserEngraving: 'Laser : Gravure…', actProgress65: 'Progression impression 65%',
        actSpindleOn: 'Broche activée', actDoorClosed: 'Porte fermée',
        connectionExcellent: 'Excellente',
        subOverview: 'Vue d\'ensemble', subPines: 'Carte des broches', subScenes: 'Scènes machine', subLeds: 'LEDs',
        subRelays: 'Relais', subSensors: 'Capteurs', subAutomations: 'Automatisations', subConsole: 'Console',
        subTemplates: 'Modèles', subAlerts: 'Alertes', subBadgeNew: 'NOUVEAU', statusActive: 'ACTIF',
        headerTitle: 'Accessoires Arduino/ESP32', checkingStatus: 'Vérification…', docsBtn: 'Documentation', configBtn: 'Paramètres',
        manageBoardsTitle: 'Gérer les cartes', closeTitle: 'Fermer', settingsTitle: 'Paramètres',
        manageBoardsDesc: 'Modifiez le nom, le port USB ou l\'IP de chaque carte, ou supprimez-la.',
        chipBoard: 'Carte', chipLocalIp: 'IP locale', chipUsbPort: 'Port USB', chipUptime: 'Disponibilité', chipFirmware: 'Firmware',
        activeAndConnected: 'Active et connectée', noConnectionConfirmed: 'Connexion non confirmée',
        statusReady: 'État : Prêt', assignedPinsLabel: 'Broches assignées : {assigned}/{total}',
        memoryLabel: 'Mémoire : {value}%', latencyLabel: 'Latence : {value} ms', mainPanelLabel: 'Panneau principal',
        wizardCheckingFirmware: 'Vérification si votre carte a déjà le firmware NOPAL…',
        wizardTileChip: 'Puce', wizardTileFirmware: 'Firmware', wizardTilePort: 'Port', wizardTileIp: 'IP',
        wizardTileRelays: 'Relais', wizardTileLedPwm: 'LED PWM', yesWord: 'Oui', noWord: 'Non',
        wizardTileWs2812Yes: 'Oui ({count} px)',
        wizardIntroTitle: 'Avant de commencer',
        wizardIntroBody: 'Nous n\'avons détecté aucune carte avec le firmware NOPAL répondant actuellement. Si vous avez déjà une carte flashée (par USB ou déjà connectée à votre WiFi), recherchez-la. S\'il s\'agit d\'une nouvelle carte, nous vous aidons à la flasher ici même.',
        wizardSearchUsb: 'Rechercher par USB', wizardSearchWifi: 'Rechercher par WiFi (IP)', wizardAddManually: 'Ajouter manuellement',
        wizardSkipIntro: 'J\'ai déjà une carte configurée / Passer pour l\'instant',
        wizardProbingConnection: 'Test de connexion à la carte…',
        wizardWifiHint: 'Même IP et identifiants OTA que la carte utilise pour ElegantOTA (voir secrets.h du firmware).',
        wizardBoardIp: 'IP de la carte', wizardOtaUser: 'Utilisateur OTA', wizardOtaPassword: 'Mot de passe OTA',
        wizardTestConnection: 'Tester la connexion', wizardBack: 'Retour',
        wizardSearchingUsb: 'Recherche de cartes connectées par USB…',
        wizardIdentifyTitle: 'Carte détectée : confirmez le modèle',
        wizardIdentifyBody: 'La connexion fonctionne, mais le firmware n\'a pas signalé d\'identifiant suffisamment précis. Choisissez le modèle pour charger la bonne carte des broches.',
        wizardModelLabel: 'Modèle', wizardUsePinMap: 'Utiliser cette carte des broches',
        wizardManualTitle: 'Ajouter une carte manuellement',
        wizardManualBody: 'N\'utilisez cette option que si la carte ne peut pas être identifiée par USB ou WiFi.',
        wizardNicknameLabel: 'Nom / surnom', wizardNicknamePlaceholder: 'Ex. Station laser',
        wizardAddWithMap: 'Ajouter avec cette carte',
        wizardFoundTitle: 'Nous avons trouvé votre carte !', wizardContinueToPanel: 'Continuer vers le panneau',
        wizardNotFoundTitle: 'Nous n\'avons détecté aucune carte',
        wizardNotFoundBody: 'Connectez votre carte par USB (attendez quelques secondes qu\'elle démarre) et réessayez. S\'il s\'agit d\'une nouvelle carte sans firmware, flashez-la ici.',
        wizardRetryUsb: 'Réessayer par USB', wizardFlashNow: 'Flasher le firmware maintenant', wizardSkipForNow: 'Passer pour l\'instant',
        wizardFlashTitle: 'Flasher le firmware',
        wizardFlashBody: 'NOPAL ne compile rien -- il flashe seulement un binaire .bin déjà exporté depuis Arduino IDE (Sketch → Export Compiled Binary).',
        wizardPortLabel: 'Port', wizardNoPortsFound: 'Nous ne voyons aucun port USB candidat -- vérifiez le câble/pilotes.',
        wizardBinaryLabel: 'Binaire (.bin)', wizardUploadNew: 'En téléverser un nouveau',
        wizardNoBuildsUploaded: 'Vous n\'avez encore téléversé aucun binaire.', wizardFlashBtn: 'Flasher',
        wizardFlashing: 'Flashage du firmware -- ne débranchez pas la carte…',
        wizardFlashSuccessTitle: 'Firmware flashé', wizardGoToPanel: 'Aller au panneau',
        notReported: 'Non signalée', notReportedMasc: 'Non signalé',
        tabLedStrips: 'Bandes LED', tabInputs: 'Entrées', tabMacros: 'Macros',
        systemSummary: 'Résumé du système', activeCount: '{count} actifs', activeCountFem: '{count} actives',
        connectivity: 'Connectivité', signalLabel: 'Signal :', stateLabel: 'État',
        optimalState: 'Optimal', pendingState: 'En attente', realTelemetry: 'Télémétrie réelle', noResponse: 'Pas de réponse',
        consumptionVoltage: 'Consommation et tension', adcInputGpio: 'Entrée ADC GPIO{gpio}',
        percentOfRange: '{value}% de la plage', noReading: 'Pas de lecture', currentConsumption: 'Consommation actuelle',
        sensorNotInstalled: 'Capteur non installé', adcInstantReadingNote: 'Lecture instantanée de l\'ADC ; NOPAL n\'invente ni historique ni ampérage.',
        connectionState: 'État de la connexion', connectedState: 'Connectée', availableState: 'Disponible',
        responseTime: 'Temps de réponse',
        devicesAndControls: 'Appareils et contrôles', quickActions: 'Actions rapides',
        recentActivity: 'Activité récente', macrosAndScenes: 'Macros et scènes', newWord: 'Nouvelle',
        editSceneTitle: 'Modifier la scène', noScenesSaved: 'Aucune scène enregistrée.',
        deviceInfo: 'Informations sur l\'appareil', connectionLabel: 'Connexion', freeMemory: 'Mémoire libre',
        notAvailable: 'Non disponible', pinProfile: 'Profil de broches', noProfile: 'Aucun profil',
        readingBoard: 'Lecture de la carte…', boardNoRelaysReported: 'La carte n\'a signalé aucun relais. Vérifiez la connexion ou la configuration.',
        relayNumber: 'Relais {n}', outputNumber: 'Sortie {n}', notRegisteredInNopal: 'Non enregistré dans NOPAL',
        inactiveCount: '{count} inactifs', editRelays: 'Modifier les relais',
        inputLabel: 'Entrée', wifiCompatible: 'Compatible WiFi', rawReading: 'Lecture RAW',
        percentageLabel: 'Pourcentage', ofAdcRange: 'De la plage ADC', transportLabel: 'Transport',
        notConfiguredMasc: 'Non configuré', noRecentActivity: 'Aucune activité récente.', eventWord: 'événement',
        viewFullHistory: 'Voir l\'historique complet',
        docsEyebrow: 'GUIDE INTÉGRÉ · PROFIL ACTIF', docsTitle: 'Documentation de {name}',
        docsSubtitle: 'Connexion, fonctions, carte des broches et commandes du firmware NOPAL au même endroit.',
        docsBackToPanel: 'Retour au panneau',
        docsNavQuickstart: 'Démarrage rapide', docsNavFunctions: 'Fonctions', docsNavSafety: 'Sécurité',
        docsNavServices: 'Services', docsNavCommands: 'Commandes',
        docsStep1Title: 'Connectez la carte', docsStep1Body: 'Dans Carte des broches, cliquez sur "Ajouter une carte" et choisissez USB ou WiFi.',
        docsStep2Title: 'Confirmez le modèle', docsStep2Body: 'NOPAL le détecte ; il ne demande que si le firmware ne l\'identifie pas.',
        docsStep3Title: 'Vérifiez la carte', docsStep3Body: 'Le profil {profile} se charge automatiquement.',
        docsStep4Title: 'Enregistrez les sorties', docsStep4Body: 'Depuis Paramètres, attribuez des noms aux relais, lumières et capteurs.',
        docsFunctionsTitle: 'Fonctions incluses', docsFeatureRelays: 'Contrôle ON/OFF réel depuis le panneau.',
        docsFeatureLightingTitle: 'Éclairage', docsFeatureLighting: 'Couleur et état des bandes PWM/WS2812.',
        docsFeatureTelemetryTitle: 'Télémétrie', docsFeatureTelemetry: 'WiFi, mémoire, disponibilité et ADC sans données simulées.',
        docsFeatureScenesTitle: 'Scènes', docsFeatureScenes: 'Plusieurs actions avec un seul bouton.',
        docsFeatureUsbWifiTitle: 'USB et WiFi', docsFeatureUsbWifi: 'Le même assistant pour détecter et enregistrer.',
        docsFeatureAutoMapTitle: 'Carte automatique', docsFeatureAutoMap: 'Profil corrigé même sur des cartes déjà enregistrées.',
        docsNoAssignments: 'Aucune attribution documentée pour ce profil.', docsOpenInteractiveMap: 'Ouvrir la carte interactive',
        docsSafetyTitle: 'Sécurité électrique',
        docsSafety1: 'Les GPIO fonctionnent à 3,3 V ; ils ne supportent pas les signaux directs de 5 V.',
        docsSafety2: 'Utilisez une source externe adaptée pour les relais et bandes LED.',
        docsSafety3: 'Reliez la masse de la source externe au GND de la carte.',
        docsSafety4: 'Ne connectez pas de charges de puissance directement à un GPIO.',
        docsSafety5: 'Vérifiez les broches de démarrage avant de les réattribuer.',
        docsServicesTitle: 'Services et connexion', docsUsbDetection: 'Détection USB',
        docsUsbDetectionValue: 'Handshake NOPAL par port série', docsSerialSpeed: 'Vitesse série', docsBaud: 'bauds',
        docsWifiState: 'État WiFi', docsHealthCheck: 'Test de santé', docsUpdate: 'Mise à jour',
        docsActiveBoard: 'Carte active', docsNoConnectionConfigured: 'Aucune connexion configurée',
        docsCommandsTitle: 'Commandes NOPAL', docsCmdId: 'Identification', docsCmdNet: 'État du réseau',
        docsCmdStatus: 'État JSON', docsCmdRelayOn: 'Allumer le relais', docsCmdRelayOff: 'Éteindre le relais',
        docsCmdLedColor: 'Couleur LED', docsCmdScene: 'Appliquer la scène', docsCmdAdc: 'Lire l\'ADC',
        loadingWorkshopState: 'Chargement de l\'état réel de l\'atelier…', workshopOutputsTitle: 'Sorties de l\'atelier',
        noRelaysRegisteredYet: 'Aucun relais enregistré pour l\'instant.', addAccessory: 'Ajouter un accessoire', addWord: 'Ajouter',
        outputColumn: 'Sortie', usageColumn: 'Usage', subStateColumn: 'État', accessoryWord: 'Accessoire',
        onState: 'Allumé', offState: 'Éteint',
        lightingTitle: 'Éclairage', noLedStripsRegisteredYet: 'Aucune bande LED enregistrée pour l\'instant.',
        addLedStrip: 'Ajouter une bande LED', registeredLighting: 'Éclairage enregistré', addLedOrStrip: 'Ajouter LED ou bande',
        moreOptions: 'Plus d\'options', viewDetails: 'Voir les détails', updateFirmware: 'Mettre à jour le firmware',
        colorWord: 'Couleur', applyColor: 'Appliquer la couleur', turnOffBtn: 'Éteindre', whiteWord: 'Blanc',
        readyWord: 'Prêt', alertWord: 'Alerte', nopalBoardWord: 'Carte NOPAL',
        boardConnectionLabel: 'Connexion de la carte', onlineState: 'En ligne', unconfirmedState: 'Non confirmée',
        notConfiguredFem: 'Non configurée', latencyWord: 'Latence', nopalHandshake: 'Handshake NOPAL',
        heapAvailable: 'Heap disponible', noIpWord: 'Pas d\'IP', uptimeWord: 'Disponibilité', sinceLastRestart: 'Depuis le dernier redémarrage',
        inputAnalog: 'Entrée analogique', wifiSignal: 'Signal WiFi', localNetwork: 'Réseau local', dhtSensorLabel: 'Capteur DHT11', batteryLabel: 'Batterie', batteryCharging: 'En charge', batteryDischarging: 'En décharge', batteryUntilFull: '{time} avant charge complète', batteryUntilEmpty: '{time} restantes', batteryHibernating: 'jauge en veille', batteryResetAlert: "La jauge s'est réinitialisée", batteryVoltageNote: 'Tension mesurée',
        boardTelemetry: 'Télémétrie de la carte', lastRealHandshakeData: 'Données du dernier handshake réel',
        subScenes2: 'Scènes', createSceneHint: 'Créez une scène pour allumer des relais et ajuster les lumières en une seule action.',
        newSceneWord: 'Nouvelle scène', actionCount: '{count} action(s)',
        noRecentAccessoryActivity: 'Aucune activité récente sur les accessoires.',
        actPowerOn: 'allumé', actPowerOff: 'éteint', actLedColor: 'a changé de couleur', actSceneRun: 'a exécuté une scène',
        actRegistered: 'a été ajouté', actRemoved: 'a été supprimé',
        lastActivityLine: 'Dernière activité : {name} {action} · {time}',
        addBoardBtn: 'Ajouter une carte', realBoardDataTitle: 'Données réelles de la carte (via {transport}, pas mock)',
        boardConnectedTag: 'carte connectée', genericPinoutUnverified: 'Brochage générique, non vérifié',
        showAllConnectorPins: 'Afficher toutes les broches du connecteur (pas seulement celles utilisées par le firmware)',
        firmwareNoPinsThisSide: 'Le firmware n\'utilise pas de broches de ce côté.',
        pinInspectorTitle: 'Inspecteur de broche', scanningWord: 'Analyse en cours…', scanPinsBtn: 'Analyser les broches',
        rolesLegend: 'Légende des rôles', pinSummaryTitle: 'Résumé des broches', activeAssignmentsTitle: 'Attributions actives',
        activeAutomationsTitle: 'Automatisations actives (règles globales)', systemStateTitle: 'État du système',
        selectPinToConfigure: 'Sélectionnez une broche sur la carte pour la configurer.',
        assignedFunctionLabel: 'Fonction attribuée', notAppliedYet: 'non appliqué',
        modeLabel: 'Mode', initialStateLabel: 'État initial', logicLevelLabel: 'Niveau logique',
        fixedConnectorPin: 'Broche fixe du connecteur -- non configurable.', parametersTitle: 'Paramètres',
        applyConfigBtn: 'Appliquer la configuration',
        totalWord: 'Total', assignedWord: 'Attribuées', communicationsWord: 'Communications',
        noActivityYet: 'Aucune activité pour l\'instant.',
        scenesByMachine: 'Scènes par machine', addMachine: 'Ajouter une machine',
        addMachineHint: 'Configurez des scènes pour d\'autres équipements de votre atelier.',
        machineScenesSubtitle: 'Règles propres par machine -- source de données, variables disponibles et sorties associées.',
        dataSourceLabel: 'Source de données :', outputsActionsTitle: 'Sorties / Actions', portLabel: 'Port :',
        viewRuleEditor: 'Voir l\'éditeur de règles',
        pinCount: '{count} broche(s)', noPinsAssignedCategory: 'Aucune broche attribuée à cette catégorie pour l\'instant, sur aucune carte.',
        ifConditionHeader: 'SI (Condition)', thenActionHeader: 'ALORS (Action)', sourceHeader: 'Source',
        newRuleWord: 'Nouvelle règle',
        consoleReadOnlyNote: 'Console en lecture seule (mock) -- se connectera au port série/HTTP réel de la carte.',
        tplPrinterBasic: 'Imprimante 3D basique', tplPrinterBasicDesc: 'LED d\'état + relais de ventilation.',
        tplLaserStation: 'Station laser', tplLaserStationDesc: 'Extracteur + sirène + lumières d\'alarme.',
        tplCncBeacon: 'CNC avec balise', tplCncBeaconDesc: 'Balise tricolore + extracteur de poussière.',
        templatesSubtitle: 'Configurations de broches prédéfinies pour démarrer rapidement.', useBtn: 'Utiliser',
        warningMultipleFunctionsPin: '{count} broche(s) avec plus d\'une fonction attribuée sur "{board}".',
        wifiTransportReflashNote: 'Le transport WiFi de l\'accessoire nécessite de reflasher le firmware v1.4 pour devenir actif.',
        errCouldNotLoadWorkshopState: 'Impossible de charger l\'état de l\'atelier.',
        accessoryToggled: '{name} : {state}.', errCouldNotChangeAccessory: 'Impossible de modifier l\'accessoire.',
        colorUpdated: 'Couleur mise à jour.', errCouldNotChangeLighting: 'Impossible de modifier l\'éclairage.',
        chooseModel: 'Choisissez un modèle.', giveBoardName: 'Donnez un nom à la carte.',
        boardAdded: '{name} ({label}) a été ajoutée.', errCouldNotAddBoard: 'Impossible d\'ajouter la carte.',
        boardUpdated: 'Carte mise à jour.', errCouldNotUpdateBoard: 'Impossible de mettre à jour la carte.',
        ambientSensorLabel: 'Capteur ambiant de l\'atelier', ambientSensorHint: 'Utilise le DHT11 de cette carte pour la fiche « Temp. ambiante de l\'atelier » du tableau de bord principal. Une seule carte à la fois.',
        boardDeleted: 'Carte supprimée.', errCouldNotDeleteBoard: 'Impossible de supprimer la carte.',
        errCouldNotLoadSavedBoards: 'Impossible de charger les cartes enregistrées.',
        configApplied: 'Configuration appliquée.', errCouldNotSavePinConfig: 'Impossible d\'enregistrer la configuration de la broche.',
        modelDetectedMapSaveFailed: 'Nous avons détecté le modèle, mais n\'avons pas pu enregistrer la carte corrigée.',
        giveBoardIp: 'Indiquez l\'IP de la carte.', fileUploadedOk: '{name} téléversé avec succès.',
        choosePortFirst: 'Choisissez d\'abord un port.', chooseBinaryFirst: 'Choisissez (ou téléversez) d\'abord un binaire .bin.',
        errCouldNotOpenFirmwareUpdater: 'Impossible d\'ouvrir le programme de mise à jour du firmware.',
        ruleEditorComingSoon: 'Éditeur de règles : bientôt disponible.',
        sceneApplied: 'Scène "{name}" appliquée.', errCouldNotRunScene: 'Impossible d\'exécuter la scène.',
        sceneAppliedState: '"{name}" : {state}.',
        needAccessoryForScene: 'Enregistrez au moins un accessoire (relais ou LED) avant de créer une scène.',
        sceneNeedsAction: 'La scène nécessite au moins une action.',
        sceneNeedsTwoStates: 'Le mode double/multiple nécessite au moins 2 états.',
        sceneModeLabel: 'Mode de la scène',
        modeNormalLabel: 'Normal', modeNormalHint: 'Chaque exécution fait toujours la même chose.',
        modeToggleLabel: 'Double', modeToggleHint: 'Alterne entre 2 états à chaque clic, comme un interrupteur.',
        modeCycleLabel: 'Multiple', modeCycleHint: 'Tourne entre 3 états ou plus, dans l\'ordre.',
        stateNamePlaceholder: 'Ex. Allumé', removeStateTitle: 'Supprimer l\'état', addStateBtn: 'Ajouter un état',
        stateOnDefault: 'Allumé', stateOffDefault: 'Éteint', stateDefaultName: 'État {number}',
        sceneDeleted: 'Scène supprimée.', errCouldNotDeleteScene: 'Impossible de supprimer la scène.',
        sceneUpdated: 'Scène mise à jour.', sceneCreated: 'Scène créée.', errCouldNotSaveScene: 'Impossible d\'enregistrer la scène.',
        nameWord: 'Nom', ledModeLabel: 'Mode LED', protocolLabel: 'Protocole', otaUserLabel: 'Utilisateur OTA',
        accessoryDetailsEyebrow: 'DÉTAILS DE L\'ACCESSOIRE', thisAccessoryWord: 'cet accessoire',
        confirmDeleteAccessory: 'Vous allez supprimer "{name}" de NOPAL. Cette action est irréversible.',
        deleteAccessoryTitle: 'Supprimer l\'accessoire', accessoryDeletedToast: 'Accessoire supprimé.',
        otherBoardByIp: 'Autre carte par IP',
        boardLightingEyebrow: 'ÉCLAIRAGE DE LA CARTE', addLedOrNeopixel: 'Ajouter une LED ou une bande NeoPixel',
        registerLightHint: 'Enregistrez la lumière directement depuis une carte NOPAL déjà ajoutée.',
        boardIpLabel: 'IP de la carte', workshopLightingDefaultName: 'Éclairage de l\'atelier',
        neopixelNamePlaceholder: 'Ex. NeoPixel imprimantes', typeWord: 'Type', dataGpioLabel: 'GPIO de données',
        ledCountHint: 'La quantité peut être 1 pour un seul NeoPixel, 8 pour votre bande actuelle, ou toute longueur configurée par le firmware de cette carte.',
        showOnPanelLabel: 'Afficher sur le panneau',
        showOnPanelHint: 'Si vous laissez activé, la fiche de chaque appareil ayant "Utiliser les alertes visuelles" activé avec cette bande affichera une réplique de ses LED -- par exemple, si cette bande allume 4 LED pour l\'état d\'une imprimante, cette imprimante les affichera aussi sur sa propre fiche.',
        addLightingBtn: 'Ajouter l\'éclairage',
        boardOutputEyebrow: 'SORTIE DE LA CARTE', registerRelayN: 'Enregistrer le relais {n}',
        boardReportedRelayHint: 'La carte a déjà signalé ce relais -- il ne reste qu\'à le nommer.',
        relayNamePlaceholder: 'Ex. Ventilateur extracteur', relayNumberLabel: 'Numéro de relais',
        registerRelayBtn: 'Enregistrer le relais', relayRegisteredToast: 'Relais enregistré.', workshopWord: 'Atelier',
        turnOnOption: 'Allumer', turnOffOption: 'Éteindre', setColorOption: 'Définir la couleur', removeActionTitle: 'Retirer l\'action',
        workshopMacroEyebrow: 'MACRO DE L\'ATELIER', sceneEditorHint: 'Appliquez plusieurs actions sur vos relais et lumières avec un seul bouton.', aiSceneHintTitle: 'Laissez NOPAL Intelligence la créer', aiSceneHintBody: 'Avec l\'IA activée, demandez des scènes en mots ("cycle de ventilation") et laissez-les être proposées depuis vos accessoires.', aiSceneHintCta: 'Activer NOPAL Intelligence',
        addActionBtn: 'Ajouter une action', saveChangesBtn: 'Enregistrer les modifications', createSceneBtn: 'Créer la scène',
        confirmDeleteScene: 'Vous allez supprimer la scène "{name}". Cette action est irréversible.', deleteSceneTitle: 'Supprimer la scène',
        noBoardsAddedYet: 'Vous n\'avez encore ajouté aucune carte.',
        confirmDeleteBoard: 'Supprimer "{name}" ? Sa configuration de broches enregistrée sera effacée.', deleteBoardTitle: 'Supprimer la carte',
        confirmDeleteBoardShort: 'Supprimer "{name}" ?',
        mainWorkshopName: 'Atelier principal', domoticWorkshopName: 'Atelier domotique',
        scanCompleteMsg: 'Analyse terminée : {assigned} attribuées, {free} libres{conflictSuffix}.',
        scanConflictSuffix: ', {count} en conflit',
        flashDoneNoResponse: 'Le flashage est terminé mais la carte ne répond toujours pas -- elle peut nécessiter plus de temps ou une réinitialisation manuelle.',
        operationCouldNotComplete: 'L\'opération n\'a pas pu être terminée.', navLabel: 'Automatisation d\'atelier',
        cancelBtn: 'Annuler', configureBtn: 'Configurer', deleteTitle: 'Supprimer', diagnosticsTitle: 'Diagnostic',
        errCouldNotDeleteAccessory: 'Impossible de supprimer l\'accessoire.',
        lightingAddedHint: 'Éclairage ajouté. Vous pouvez maintenant l\'assigner à des scènes machine.',
        memoryWord: 'Mémoire', saveBtn: 'Enregistrer',
        ledsFilteredSubtitle: 'LED PWM et bandes assignées sur toutes vos cartes.',
        relaysFilteredSubtitle: 'Sorties de relais assignées sur toutes vos cartes.',
        sensorsFilteredSubtitle: 'Entrées de capteur assignées sur toutes vos cartes.',
        usbBoardName: 'Carte USB ({device})', wifiBoardName: 'Carte WiFi ({host})',
    },
    'pt-BR': {
        catPower: 'Alimentação', catGround: 'Terra', catReserved: 'Reservado', catFree: 'Livre',
        catLedWs2812: 'Fita LED WS2812', catLedPwm: 'LED PWM analógico', catRelay: 'Relé',
        catSensorTemp: 'Sensor de temperatura', catSensorSmoke: 'Sensor de fumaça', catSensorDoor: 'Sensor de porta',
        catI2c: 'I2C', catUart: 'UART', catSpi: 'SPI', catBuzzer: 'Buzzer', catVentilation: 'Ventilação',
        catAdc: 'Entrada analógica', catDac: 'Saída DAC', catModem: 'Modem SIM800L',
        paramStripType: 'Tipo de fita', paramLedCount: 'Quantidade de LEDs', paramBrightness: 'Brilho global',
        paramInvertData: 'Inverter dados', paramDefaultColor: 'Cor padrão (standby)',
        paramChannel: 'Canal', paramInvertOutput: 'Inverter saída',
        paramActiveLow: 'Ativo em LOW', paramDefaultOn: 'Ligado ao iniciar',
        paramSensorType: 'Tipo de sensor', paramThreshold: 'Limite de alarme', paramNormallyOpen: 'Normalmente aberto',
        paramRole: 'Função', paramBaud: 'Taxa de transmissão', paramSpeedControl: 'Controle de velocidade (PWM)',
        pinAlimentacion: 'Alimentação', pinHabilitar: 'Habilitar', pinAdcEntrada: 'ADC / Entrada', pinLibre: 'Livre',
        pinLedPwmR: 'LED PWM R', pinLedPwmG: 'LED PWM G', pinLedPwmB: 'LED PWM B', pinTierra: 'Terra',
        pinRele1: 'Relé 1', pinRele2: 'Relé 2', pinRele3: 'Relé 3', pinRele4: 'Relé 4',
        pinTiraLed: 'Fita LED WS2812', pinLibreBoot: 'Livre (boot)', pinLedEstado: 'LED de status',
        pinSerialRx: 'Serial RX', pinSerialTx: 'Serial TX', pinEntradaAnalogica: 'Entrada analógica',
        pinSinConexion: 'Sem conexão', pinAdc0Vp: 'ADC0 / VP', pinAdc3Vn: 'ADC3 / VN', pinAdc6: 'ADC6', pinAdc7: 'ADC7',
        pinSim800lDtr: 'SIM800L DTR', pinSim800lRi: 'SIM800L RI (toque)', pinSim800lTx: 'SIM800L TX', pinSim800lRx: 'SIM800L RX',
        pinTouch5: 'Touch5', pinLedEstadoAzul: 'LED de status (azul)', pinFlashSpiReservado: 'Flash SPI (reservado)',
        pinSalidaAudioMas: 'Saída de áudio +', pinSalidaAudioMenos: 'Saída de áudio -',
        pinSim800lPowerOn: 'SIM800L POWER ON', pinI2cSclCompartido: 'I2C SCL (IP5306 + 4 relés MCP23017 0x20)',
        pinSerialTxProg: 'Serial TX (programação)', pinSerialRxProg: 'Serial RX (programação)',
        pinI2cSdaCompartido: 'I2C SDA (IP5306 + 4 relés MCP23017 0x20)',
        pinSim800lReset: 'SIM800L RESET', pinSim800lPwrkey: 'SIM800L PWRKEY',
        pinTouch1Boot: 'Touch1 (boot)', pinTouch2: 'Touch2', pinTouch3: 'Touch3',
        pinEntradaAudioMenos: 'Entrada de áudio -', pinEntradaAudioMas: 'Entrada de áudio +',
        boardEsp32Label: 'ESP32 DevKit V1 / NodeMCU', boardEsp8266Label: 'ESP8266 genérico',
        boardNodemcuLabel: 'NodeMCU V3', boardWemosLabel: 'Wemos D1 mini', boardTcallLabel: 'ESP32 SIM800L T-Call V1.3',
        boardTcallNote: 'Aceita apenas SIM Nano. Os 4 relés passam por I2C (MCP23017 0x20, mesmo barramento que SDA/SCL) -- não têm pino de header próprio.',
        machinePrinterName: 'Impressora 3D', machineLaserName: 'Laser', machineCncName: 'CNC',
        varNozzleTemp: 'Temp. bico (°C)', varBedTemp: 'Temp. mesa (°C)', varPrintState: 'Estado de impressão', varPrintProgress: 'Progresso (%)',
        varGrblState: 'Estado GRBL', varCoolant: 'Refrigerante', varJobState: 'Estado do trabalho', varJobProgress: 'Progresso atual',
        varSpindleActive: 'Fuso ativo',
        outputLedStrip: 'Fita LED WS2812', outputExtractorRelay: 'Relé do exaustor', outputSiren: 'Sirene',
        outputFanRelay: 'Relé do ventilador', outputBeacon: 'Sinalizador LED',
        ruleColdMachine: 'Máquina fria', ruleHeating: 'Aquecendo', ruleOverTemp: 'Temperatura excessiva',
        ruleReadyToPrint: 'Pronta para imprimir', ruleGradientProgress: 'Gradiente conforme o progresso',
        ruleGreenLight: 'Luz verde', ruleAmberLightExtractor: 'Luz âmbar + exaustor ON', ruleRedSiren: 'Vermelho + sirene',
        rulePauseWarning: 'Pausa + luz de aviso', ruleBlueBeacon: 'Sinalizador azul', ruleFanOn: 'Exaustor/ventilador ON',
        ruleRedBlink: 'Vermelho intermitente',
        condNozzleBelow40: 'Temp. bico < 40°C', condNozzle40to200: '40°C ≤ temp. bico < 200°C', condNozzleAbove220: 'Temp. bico ≥ 220°C',
        condStateReady: 'Estado = Pronta', condPrinting: 'Imprimindo', condReadyState: 'Estado pronto', condEngraving: 'Gravando (Run)',
        condAlarm: 'Alarme', condDoorOpen: 'Porta aberta', condJobActive: 'Trabalho ativo', condSpindleActive: 'Fuso ativo',
        condJobEnd: 'Fim do trabalho', condErrorLimit: 'Erro ou limite',
        ruleCondNozzleAbove220: 'Temp. bico > 220°C', ruleCondPrintDone: 'Impressão concluída', ruleCondProgressX: 'Progresso da impressão = X%',
        ruleCondLaserEngraving: 'Estado laser = Gravando', ruleCondSpindleActive: 'Fuso ativo',
        ruleCondLimitOrError: 'Limite acionado ou erro',
        ruleActionLedRed: 'Fita LED = Vermelho', ruleActionLedGreenFanOff: 'LED = Verde + Ventilação OFF', ruleActionLedGradient: 'Fita LED = Gradiente(X%)',
        ruleActionExtractorOn: 'Exaustor = ON', ruleActionPauseYellow: 'Pausar laser + luz amarela', ruleActionFanOn: 'Ventilador = ON',
        ruleActionRedBlink: 'Luz vermelha intermitente',
        actNozzle215: 'Temp. bico 215°C', actLaserEngraving: 'Laser: Gravando…', actProgress65: 'Progresso da impressão 65%',
        actSpindleOn: 'Fuso ativado', actDoorClosed: 'Porta fechada',
        connectionExcellent: 'Excelente',
        subOverview: 'Visão geral', subPines: 'Mapa de pinos', subScenes: 'Cenas de máquina', subLeds: 'LEDs',
        subRelays: 'Relés', subSensors: 'Sensores', subAutomations: 'Automações', subConsole: 'Console',
        subTemplates: 'Modelos', subAlerts: 'Alertas', subBadgeNew: 'NOVO', statusActive: 'ATIVO',
        headerTitle: 'Acessórios Arduino/ESP32', checkingStatus: 'Verificando…', docsBtn: 'Documentação', configBtn: 'Configurações',
        manageBoardsTitle: 'Gerenciar placas', closeTitle: 'Fechar', settingsTitle: 'Configurações',
        manageBoardsDesc: 'Edite o nome, a porta USB ou o IP de cada placa, ou exclua-a.',
        chipBoard: 'Placa', chipLocalIp: 'IP local', chipUsbPort: 'Porta USB', chipUptime: 'Uptime', chipFirmware: 'Firmware',
        activeAndConnected: 'Ativa e conectada', noConnectionConfirmed: 'Sem conexão confirmada',
        statusReady: 'Estado: Pronto', assignedPinsLabel: 'Pinos atribuídos: {assigned}/{total}',
        memoryLabel: 'Memória: {value}%', latencyLabel: 'Latência: {value} ms', mainPanelLabel: 'Painel Principal',
        wizardCheckingFirmware: 'Verificando se sua placa já tem firmware NOPAL…',
        wizardTileChip: 'Chip', wizardTileFirmware: 'Firmware', wizardTilePort: 'Porta', wizardTileIp: 'IP',
        wizardTileRelays: 'Relés', wizardTileLedPwm: 'LED PWM', yesWord: 'Sim', noWord: 'Não',
        wizardTileWs2812Yes: 'Sim ({count} px)',
        wizardIntroTitle: 'Antes de começar',
        wizardIntroBody: 'Não detectamos nenhuma placa com firmware NOPAL respondendo no momento. Se você já tem uma placa gravada (por USB ou já conectada ao seu WiFi), procure-a. Se for uma placa nova, te ajudamos a gravá-la aqui mesmo.',
        wizardSearchUsb: 'Buscar por USB', wizardSearchWifi: 'Buscar por WiFi (IP)', wizardAddManually: 'Adicionar manualmente',
        wizardSkipIntro: 'Já tenho uma placa configurada / Pular por agora',
        wizardProbingConnection: 'Testando conexão com a placa…',
        wizardWifiHint: 'Mesma IP e credenciais OTA que a placa usa para ElegantOTA (ver secrets.h do firmware).',
        wizardBoardIp: 'IP da placa', wizardOtaUser: 'Usuário OTA', wizardOtaPassword: 'Senha OTA',
        wizardTestConnection: 'Testar conexão', wizardBack: 'Voltar',
        wizardSearchingUsb: 'Buscando placas conectadas por USB…',
        wizardIdentifyTitle: 'Placa detectada: confirme o modelo',
        wizardIdentifyBody: 'A conexão funciona, mas o firmware não reportou um identificador suficientemente preciso. Escolha o modelo para carregar o mapa de pinos correto.',
        wizardModelLabel: 'Modelo', wizardUsePinMap: 'Usar este mapa de pinos',
        wizardManualTitle: 'Adicionar placa manualmente',
        wizardManualBody: 'Use esta opção somente se a placa não puder ser identificada por USB ou WiFi.',
        wizardNicknameLabel: 'Nome / apelido', wizardNicknamePlaceholder: 'Ex. Estação laser',
        wizardAddWithMap: 'Adicionar com este mapa',
        wizardFoundTitle: 'Encontramos sua placa!', wizardContinueToPanel: 'Continuar ao painel',
        wizardNotFoundTitle: 'Não detectamos nenhuma placa',
        wizardNotFoundBody: 'Conecte sua placa por USB (aguarde alguns segundos até ela iniciar) e tente novamente. Se for uma placa nova sem firmware ainda, grave-a a partir daqui.',
        wizardRetryUsb: 'Tentar novamente por USB', wizardFlashNow: 'Gravar firmware agora', wizardSkipForNow: 'Pular por agora',
        wizardFlashTitle: 'Gravar firmware',
        wizardFlashBody: 'O NOPAL não compila nada -- apenas grava um binário .bin já exportado do Arduino IDE (Sketch → Export Compiled Binary).',
        wizardPortLabel: 'Porta', wizardNoPortsFound: 'Não vemos portas USB candidatas -- verifique o cabo/drivers.',
        wizardBinaryLabel: 'Binário (.bin)', wizardUploadNew: 'Enviar um novo',
        wizardNoBuildsUploaded: 'Você ainda não enviou nenhum binário.', wizardFlashBtn: 'Gravar',
        wizardFlashing: 'Gravando firmware -- não desconecte a placa…',
        wizardFlashSuccessTitle: 'Firmware gravado', wizardGoToPanel: 'Ir ao painel',
        notReported: 'Não reportada', notReportedMasc: 'Não reportado',
        tabLedStrips: 'Fitas LED', tabInputs: 'Entradas', tabMacros: 'Macros',
        systemSummary: 'Resumo do sistema', activeCount: '{count} ativos', activeCountFem: '{count} ativas',
        connectivity: 'Conectividade', signalLabel: 'Sinal:', stateLabel: 'Estado',
        optimalState: 'Ótimo', pendingState: 'Pendente', realTelemetry: 'Telemetria real', noResponse: 'Sem resposta',
        consumptionVoltage: 'Consumo e voltagem', adcInputGpio: 'Entrada ADC GPIO{gpio}',
        percentOfRange: '{value}% da faixa', noReading: 'Sem leitura', currentConsumption: 'Consumo atual',
        sensorNotInstalled: 'Sensor não instalado', adcInstantReadingNote: 'Leitura instantânea do ADC; o NOPAL não inventa histórico nem amperagem.',
        connectionState: 'Estado da conexão', connectedState: 'Conectada', availableState: 'Disponível',
        responseTime: 'Tempo de resposta',
        devicesAndControls: 'Dispositivos e controles', quickActions: 'Ações rápidas',
        recentActivity: 'Atividade recente', macrosAndScenes: 'Macros e cenas', newWord: 'Nova',
        editSceneTitle: 'Editar cena', noScenesSaved: 'Nenhuma cena salva.',
        deviceInfo: 'Informações do dispositivo', connectionLabel: 'Conexão', freeMemory: 'Memória livre',
        notAvailable: 'Não disponível', pinProfile: 'Perfil de pinos', noProfile: 'Sem perfil',
        readingBoard: 'Lendo a placa…', boardNoRelaysReported: 'A placa não reportou relés. Verifique a conexão ou a configuração.',
        relayNumber: 'Relé {n}', outputNumber: 'Saída {n}', notRegisteredInNopal: 'Não registrado no NOPAL',
        inactiveCount: '{count} inativos', editRelays: 'Editar relés',
        inputLabel: 'Entrada', wifiCompatible: 'Compatível com WiFi', rawReading: 'Leitura RAW',
        percentageLabel: 'Porcentagem', ofAdcRange: 'Da faixa ADC', transportLabel: 'Transporte',
        notConfiguredMasc: 'Não configurado', noRecentActivity: 'Sem atividade recente.', eventWord: 'evento',
        viewFullHistory: 'Ver histórico completo',
        docsEyebrow: 'GUIA INTEGRADO · PERFIL ATIVO', docsTitle: 'Documentação de {name}',
        docsSubtitle: 'Conexão, funções, mapa de pinos e comandos do firmware NOPAL em um só lugar.',
        docsBackToPanel: 'Voltar ao painel',
        docsNavQuickstart: 'Início rápido', docsNavFunctions: 'Funções', docsNavSafety: 'Segurança',
        docsNavServices: 'Serviços', docsNavCommands: 'Comandos',
        docsStep1Title: 'Conecte a placa', docsStep1Body: 'Em Mapa de pinos, clique em "Adicionar placa" e escolha USB ou WiFi.',
        docsStep2Title: 'Confirme o modelo', docsStep2Body: 'O NOPAL o detecta; só pergunta se o firmware não o identifica.',
        docsStep3Title: 'Revise o mapa', docsStep3Body: 'O perfil {profile} é carregado automaticamente.',
        docsStep4Title: 'Registre as saídas', docsStep4Body: 'Em Configurações, atribua nomes a relés, luzes e sensores.',
        docsFunctionsTitle: 'Funções incluídas', docsFeatureRelays: 'Controle ON/OFF real a partir do painel.',
        docsFeatureLightingTitle: 'Iluminação', docsFeatureLighting: 'Cor e estado de fitas PWM/WS2812.',
        docsFeatureTelemetryTitle: 'Telemetria', docsFeatureTelemetry: 'WiFi, memória, uptime e ADC sem dados simulados.',
        docsFeatureScenesTitle: 'Cenas', docsFeatureScenes: 'Várias ações com um único botão.',
        docsFeatureUsbWifiTitle: 'USB e WiFi', docsFeatureUsbWifi: 'O mesmo assistente para detectar e registrar.',
        docsFeatureAutoMapTitle: 'Mapa automático', docsFeatureAutoMap: 'Perfil corrigido mesmo em placas já salvas.',
        docsNoAssignments: 'Não há atribuições documentadas para este perfil.', docsOpenInteractiveMap: 'Abrir mapa interativo',
        docsSafetyTitle: 'Segurança elétrica',
        docsSafety1: 'Os GPIOs trabalham em 3,3 V; não suportam sinais diretos de 5 V.',
        docsSafety2: 'Use fonte externa adequada para relés e fitas LED.',
        docsSafety3: 'Una o terra da fonte externa com o GND da placa.',
        docsSafety4: 'Não conecte cargas de potência diretamente a um GPIO.',
        docsSafety5: 'Revise os pinos de boot antes de reatribuí-los.',
        docsServicesTitle: 'Serviços e conexão', docsUsbDetection: 'Detecção USB',
        docsUsbDetectionValue: 'Handshake NOPAL pela porta serial', docsSerialSpeed: 'Velocidade serial', docsBaud: 'baud',
        docsWifiState: 'Estado WiFi', docsHealthCheck: 'Teste de integridade', docsUpdate: 'Atualização',
        docsActiveBoard: 'Placa ativa', docsNoConnectionConfigured: 'Sem conexão configurada',
        docsCommandsTitle: 'Comandos NOPAL', docsCmdId: 'Identificação', docsCmdNet: 'Estado da rede',
        docsCmdStatus: 'Estado JSON', docsCmdRelayOn: 'Ligar relé', docsCmdRelayOff: 'Desligar relé',
        docsCmdLedColor: 'Cor do LED', docsCmdScene: 'Aplicar cena', docsCmdAdc: 'Ler ADC',
        loadingWorkshopState: 'Carregando o estado real da oficina…', workshopOutputsTitle: 'Saídas da oficina',
        noRelaysRegisteredYet: 'Ainda não há relés registrados.', addAccessory: 'Adicionar acessório', addWord: 'Adicionar',
        outputColumn: 'Saída', usageColumn: 'Uso', subStateColumn: 'Estado', accessoryWord: 'Acessório',
        onState: 'Ligado', offState: 'Desligado',
        lightingTitle: 'Iluminação', noLedStripsRegisteredYet: 'Ainda não há fitas LED registradas.',
        addLedStrip: 'Adicionar fita LED', registeredLighting: 'Iluminação registrada', addLedOrStrip: 'Adicionar LED ou fita',
        moreOptions: 'Mais opções', viewDetails: 'Ver detalhes', updateFirmware: 'Atualizar firmware',
        colorWord: 'Cor', applyColor: 'Aplicar cor', turnOffBtn: 'Desligar', whiteWord: 'Branco',
        readyWord: 'Pronto', alertWord: 'Alerta', nopalBoardWord: 'Placa NOPAL',
        boardConnectionLabel: 'Conexão da placa', onlineState: 'Online', unconfirmedState: 'Não confirmada',
        notConfiguredFem: 'Não configurada', latencyWord: 'Latência', nopalHandshake: 'Handshake NOPAL',
        heapAvailable: 'Heap disponível', noIpWord: 'Sem IP', uptimeWord: 'Uptime', sinceLastRestart: 'Desde a última reinicialização',
        inputAnalog: 'Entrada analógica', wifiSignal: 'Sinal WiFi', localNetwork: 'Rede local', dhtSensorLabel: 'Sensor DHT11', batteryLabel: 'Bateria', batteryCharging: 'Carregando', batteryDischarging: 'Descarregando', batteryUntilFull: '{time} até encher', batteryUntilEmpty: '{time} restantes', batteryHibernating: 'medidor em repouso', batteryResetAlert: 'O medidor se reiniciou sozinho', batteryVoltageNote: 'Tensão medida',
        boardTelemetry: 'Telemetria da placa', lastRealHandshakeData: 'Dados do último handshake real',
        subScenes2: 'Cenas', createSceneHint: 'Crie uma cena para ligar relés e ajustar luzes com uma única ação.',
        newSceneWord: 'Nova cena', actionCount: '{count} ação(ões)',
        noRecentAccessoryActivity: 'Sem atividade recente nos acessórios.',
        actPowerOn: 'ligado', actPowerOff: 'desligado', actLedColor: 'mudou de cor', actSceneRun: 'executou uma cena',
        actRegistered: 'foi adicionado', actRemoved: 'foi removido',
        lastActivityLine: 'Última atividade: {name} {action} · {time}',
        addBoardBtn: 'Adicionar placa', realBoardDataTitle: 'Dados reais da placa (via {transport}, sem mock)',
        boardConnectedTag: 'placa conectada', genericPinoutUnverified: 'Pinout genérico, não verificado',
        showAllConnectorPins: 'Mostrar todos os pinos do conector (não só os que o firmware usa)',
        firmwareNoPinsThisSide: 'O firmware não usa pinos deste lado.',
        pinInspectorTitle: 'Inspetor de pino', scanningWord: 'Escaneando…', scanPinsBtn: 'Escanear pinos',
        rolesLegend: 'Legenda de funções', pinSummaryTitle: 'Resumo de pinos', activeAssignmentsTitle: 'Atribuições ativas',
        activeAutomationsTitle: 'Automações ativas (regras globais)', systemStateTitle: 'Estado do sistema',
        selectPinToConfigure: 'Selecione um pino no mapa para configurá-lo.',
        assignedFunctionLabel: 'Função atribuída', notAppliedYet: 'não aplicado',
        modeLabel: 'Modo', initialStateLabel: 'Estado inicial', logicLevelLabel: 'Nível lógico',
        fixedConnectorPin: 'Pino fixo do conector -- não configurável.', parametersTitle: 'Parâmetros',
        applyConfigBtn: 'Aplicar configuração',
        totalWord: 'Total', assignedWord: 'Atribuídos', communicationsWord: 'Comunicações',
        noActivityYet: 'Sem atividade ainda.',
        scenesByMachine: 'Cenas por máquina', addMachine: 'Adicionar máquina',
        addMachineHint: 'Configure cenas para mais equipamentos da sua oficina.',
        machineScenesSubtitle: 'Regras próprias por máquina -- fonte de dados, variáveis disponíveis e saídas associadas.',
        dataSourceLabel: 'Fonte de dados:', outputsActionsTitle: 'Saídas / Ações', portLabel: 'Porta:',
        viewRuleEditor: 'Ver editor de regras',
        pinCount: '{count} pino(s)', noPinsAssignedCategory: 'Ainda não há pinos atribuídos a esta categoria, em nenhuma placa.',
        ifConditionHeader: 'SE (Condição)', thenActionHeader: 'ENTÃO (Ação)', sourceHeader: 'Fonte',
        newRuleWord: 'Nova regra',
        consoleReadOnlyNote: 'Console somente leitura (mock) -- irá se conectar à porta serial/HTTP real da placa.',
        tplPrinterBasic: 'Impressora 3D básica', tplPrinterBasicDesc: 'LED de status + relé de ventilação.',
        tplLaserStation: 'Estação laser', tplLaserStationDesc: 'Exaustor + sirene + luzes de alarme.',
        tplCncBeacon: 'CNC com sinalizador', tplCncBeaconDesc: 'Sinalizador tricolor + exaustor de pó.',
        templatesSubtitle: 'Configurações de pinos predefinidas para começar rápido.', useBtn: 'Usar',
        warningMultipleFunctionsPin: '{count} pino(s) com mais de uma função atribuída em "{board}".',
        wifiTransportReflashNote: 'O transporte WiFi do acessório requer regravar o firmware v1.4 para ficar ativo.',
        errCouldNotLoadWorkshopState: 'Não foi possível carregar o estado da oficina.',
        accessoryToggled: '{name}: {state}.', errCouldNotChangeAccessory: 'Não foi possível alterar o acessório.',
        colorUpdated: 'Cor atualizada.', errCouldNotChangeLighting: 'Não foi possível alterar a iluminação.',
        chooseModel: 'Escolha um modelo.', giveBoardName: 'Dê um nome à placa.',
        boardAdded: '{name} ({label}) foi adicionada.', errCouldNotAddBoard: 'Não foi possível adicionar a placa.',
        boardUpdated: 'Placa atualizada.', errCouldNotUpdateBoard: 'Não foi possível atualizar a placa.',
        ambientSensorLabel: 'Sensor ambiente da oficina', ambientSensorHint: 'Usa o DHT11 desta placa para o cartão "Temp. ambiente da oficina" do painel principal. Apenas uma placa por vez.',
        boardDeleted: 'Placa excluída.', errCouldNotDeleteBoard: 'Não foi possível excluir a placa.',
        errCouldNotLoadSavedBoards: 'Não foi possível carregar as placas salvas.',
        configApplied: 'Configuração aplicada.', errCouldNotSavePinConfig: 'Não foi possível salvar a configuração do pino.',
        modelDetectedMapSaveFailed: 'Detectamos o modelo, mas não conseguimos salvar o mapa corrigido.',
        giveBoardIp: 'Informe o IP da placa.', fileUploadedOk: '{name} enviado com sucesso.',
        choosePortFirst: 'Escolha uma porta primeiro.', chooseBinaryFirst: 'Escolha (ou envie) um binário .bin primeiro.',
        errCouldNotOpenFirmwareUpdater: 'Não foi possível abrir o atualizador de firmware.',
        ruleEditorComingSoon: 'Editor de regras: em breve.',
        sceneApplied: 'Cena "{name}" aplicada.', errCouldNotRunScene: 'Não foi possível executar a cena.',
        sceneAppliedState: '"{name}": {state}.',
        needAccessoryForScene: 'Registre pelo menos um acessório (relé ou LED) antes de criar uma cena.',
        sceneNeedsAction: 'A cena precisa de pelo menos uma ação.',
        sceneNeedsTwoStates: 'O modo duplo/múltiplo precisa de pelo menos 2 estados.',
        sceneModeLabel: 'Modo da cena',
        modeNormalLabel: 'Normal', modeNormalHint: 'Cada execução sempre faz a mesma coisa.',
        modeToggleLabel: 'Duplo', modeToggleHint: 'Alterna entre 2 estados a cada clique, como um interruptor.',
        modeCycleLabel: 'Múltiplo', modeCycleHint: 'Roda entre 3 ou mais estados, em ordem.',
        stateNamePlaceholder: 'Ex. Ligado', removeStateTitle: 'Remover estado', addStateBtn: 'Adicionar estado',
        stateOnDefault: 'Ligado', stateOffDefault: 'Desligado', stateDefaultName: 'Estado {number}',
        sceneDeleted: 'Cena excluída.', errCouldNotDeleteScene: 'Não foi possível excluir a cena.',
        sceneUpdated: 'Cena atualizada.', sceneCreated: 'Cena criada.', errCouldNotSaveScene: 'Não foi possível salvar a cena.',
        nameWord: 'Nome', ledModeLabel: 'Modo LED', protocolLabel: 'Protocolo', otaUserLabel: 'Usuário OTA',
        accessoryDetailsEyebrow: 'DETALHES DO ACESSÓRIO', thisAccessoryWord: 'este acessório',
        confirmDeleteAccessory: 'Você vai excluir "{name}" do NOPAL. Esta ação não pode ser desfeita.',
        deleteAccessoryTitle: 'Excluir acessório', accessoryDeletedToast: 'Acessório excluído.',
        otherBoardByIp: 'Outra placa por IP',
        boardLightingEyebrow: 'ILUMINAÇÃO DA PLACA', addLedOrNeopixel: 'Adicionar LED ou fita NeoPixel',
        registerLightHint: 'Registre a luz diretamente de uma placa NOPAL já adicionada.',
        boardIpLabel: 'IP da placa', workshopLightingDefaultName: 'Iluminação da oficina',
        neopixelNamePlaceholder: 'Ex. NeoPixel impressoras', typeWord: 'Tipo', dataGpioLabel: 'GPIO de dados',
        ledCountHint: 'A quantidade pode ser 1 para um único NeoPixel, 8 para sua fita atual, ou qualquer tamanho que o firmware daquela placa tenha configurado.',
        showOnPanelLabel: 'Mostrar no painel',
        showOnPanelHint: 'Se você deixar ativado, a ficha de cada dispositivo com "Usar alertas visuais" ativado com esta fita mostrará uma réplica de seus LEDs -- por exemplo, se esta fita acende 4 LEDs pelo estado de uma impressora, essa impressora também os mostrará em sua própria ficha.',
        addLightingBtn: 'Adicionar iluminação',
        boardOutputEyebrow: 'SAÍDA DA PLACA', registerRelayN: 'Registrar Relé {n}',
        boardReportedRelayHint: 'A placa já reportou este relé -- só falta dar um nome.',
        relayNamePlaceholder: 'Ex. Ventilador exaustor', relayNumberLabel: 'Número do relé',
        registerRelayBtn: 'Registrar relé', relayRegisteredToast: 'Relé registrado.', workshopWord: 'Oficina',
        turnOnOption: 'Ligar', turnOffOption: 'Desligar', setColorOption: 'Definir cor', removeActionTitle: 'Remover ação',
        workshopMacroEyebrow: 'MACRO DA OFICINA', sceneEditorHint: 'Aplique várias ações aos seus relés e luzes com um único botão.', aiSceneHintTitle: 'Deixe o NOPAL Intelligence montá-la', aiSceneHintBody: 'Com a IA ativada você pode pedir cenas em palavras ("ciclo de ventilação") e tê-las propostas a partir dos seus acessórios.', aiSceneHintCta: 'Ativar o NOPAL Intelligence',
        addActionBtn: 'Adicionar ação', saveChangesBtn: 'Salvar alterações', createSceneBtn: 'Criar cena',
        confirmDeleteScene: 'Você vai excluir a cena "{name}". Esta ação não pode ser desfeita.', deleteSceneTitle: 'Excluir cena',
        noBoardsAddedYet: 'Você ainda não adicionou nenhuma placa.',
        confirmDeleteBoard: 'Excluir "{name}"? A configuração de pinos salva será apagada.', deleteBoardTitle: 'Excluir placa',
        confirmDeleteBoardShort: 'Excluir "{name}"?',
        mainWorkshopName: 'Oficina Principal', domoticWorkshopName: 'Oficina de Domótica',
        scanCompleteMsg: 'Escaneamento completo: {assigned} atribuídos, {free} livres{conflictSuffix}.',
        scanConflictSuffix: ', {count} com conflito',
        flashDoneNoResponse: 'A gravação terminou, mas a placa ainda não responde -- pode precisar de mais tempo ou de um reset manual.',
        operationCouldNotComplete: 'Não foi possível concluir a operação.', navLabel: 'Automação de Oficina',
        cancelBtn: 'Cancelar', configureBtn: 'Configurar', deleteTitle: 'Excluir', diagnosticsTitle: 'Diagnóstico',
        errCouldNotDeleteAccessory: 'Não foi possível excluir o acessório.',
        lightingAddedHint: 'Iluminação adicionada. Você já pode atribuí-la a cenas de máquina.',
        memoryWord: 'Memória', saveBtn: 'Salvar',
        ledsFilteredSubtitle: 'Fitas e LEDs PWM atribuídos em todas as suas placas.',
        relaysFilteredSubtitle: 'Saídas de relé atribuídas em todas as suas placas.',
        sensorsFilteredSubtitle: 'Entradas de sensor atribuídas em todas as suas placas.',
        usbBoardName: 'Placa USB ({device})', wifiBoardName: 'Placa WiFi ({host})',
    },
};

    function lang() {
        const raw = document.documentElement.lang || localStorage.getItem('language') || 'es';
        if (raw.toLowerCase().startsWith('pt')) return 'pt-BR';
        const short = raw.slice(0, 2).toLowerCase();
        return ['es', 'en', 'de', 'fr'].includes(short) ? short : 'en';
    }
    function tr(key, vars) {
        let text = I18N[lang()]?.[key] || I18N.en[key] || key;
        if (vars) Object.entries(vars).forEach(([name, value]) => { text = text.replace(`{${name}}`, value); });
        return text;
    }

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
        power:        { label: tr('catPower'), color: '#ef4444', fixed: true, params: [] },
        ground:       { label: tr('catGround'), color: '#94a3b8', fixed: true, params: [] },
        reserved:     { label: tr('catReserved'), color: '#94a3b8', fixed: true, params: [] },
        free:         { label: tr('catFree'), color: '#64748b', fixed: false, params: [] },
        led_ws2812:   { label: tr('catLedWs2812'), color: '#a855f7', fixed: false, params: [
            { key: 'stripType', label: tr('paramStripType'), type: 'select', options: ['WS2812B', 'SK6812', 'APA102'] },
            { key: 'ledCount', label: tr('paramLedCount'), type: 'select', options: ['8', '16', '30', '60', '144'] },
            { key: 'brightness', label: tr('paramBrightness'), type: 'slider', min: 0, max: 100 },
            { key: 'invertData', label: tr('paramInvertData'), type: 'toggle' },
            { key: 'defaultColor', label: tr('paramDefaultColor'), type: 'color' },
        ] },
        led_pwm:      { label: tr('catLedPwm'), color: '#ec4899', fixed: false, params: [
            { key: 'channel', label: tr('paramChannel'), type: 'select', options: ['R', 'G', 'B'] },
            { key: 'invertData', label: tr('paramInvertOutput'), type: 'toggle' },
        ] },
        relay:        { label: tr('catRelay'), color: '#f59e0b', fixed: false, params: [
            { key: 'activeLow', label: tr('paramActiveLow'), type: 'toggle' },
            { key: 'defaultOn', label: tr('paramDefaultOn'), type: 'toggle' },
        ] },
        sensor_temp:  { label: tr('catSensorTemp'), color: '#3b82f6', fixed: false, params: [
            { key: 'sensorType', label: tr('paramSensorType'), type: 'select', options: ['DS18B20', 'NTC 100K', 'DHT22'] },
        ] },
        sensor_smoke: { label: tr('catSensorSmoke'), color: '#dc2626', fixed: false, params: [
            { key: 'threshold', label: tr('paramThreshold'), type: 'select', options: ['Bajo', 'Medio', 'Alto'] },
        ] },
        sensor_door:  { label: tr('catSensorDoor'), color: '#8b5cf6', fixed: false, params: [
            { key: 'normallyOpen', label: tr('paramNormallyOpen'), type: 'toggle' },
        ] },
        i2c:          { label: tr('catI2c'), color: '#06b6d4', fixed: false, params: [
            { key: 'role', label: tr('paramRole'), type: 'select', options: ['SDA', 'SCL'] },
        ] },
        uart:         { label: tr('catUart'), color: '#14b8a6', fixed: false, params: [
            { key: 'baud', label: tr('paramBaud'), type: 'select', options: ['9600', '19200', '115200'] },
        ] },
        spi:          { label: tr('catSpi'), color: '#6366f1', fixed: false, params: [
            { key: 'role', label: tr('paramRole'), type: 'select', options: ['MOSI', 'MISO', 'SCK', 'CS'] },
        ] },
        buzzer:       { label: tr('catBuzzer'), color: '#eab308', fixed: false, params: [
            { key: 'activeLow', label: tr('paramActiveLow'), type: 'toggle' },
        ] },
        ventilation:  { label: tr('catVentilation'), color: '#0ea5e9', fixed: false, params: [
            { key: 'speedControl', label: tr('paramSpeedControl'), type: 'toggle' },
        ] },
        adc:          { label: tr('catAdc'), color: '#22c55e', fixed: false, params: [] },
        dac:          { label: tr('catDac'), color: '#c084fc', fixed: false, params: [] },
        // Pin hardwireado de fábrica al módem SIM800L de la placa T-Call V1.3
        // (no es una asignación de NOPAL, viene soldado así en la placa) --
        // por eso es "fixed" como power/ground/reserved, no se puede
        // reasignar a otra función.
        modem:        { label: tr('catModem'), color: '#0d9488', fixed: true, params: [] },
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
            { gpio: '3V3', physical: 1, label: tr('pinAlimentacion'), category: 'power' },
            { gpio: 'EN', physical: 2, label: tr('pinHabilitar'), category: 'reserved' },
            { gpio: 'GPIO36', physical: 3, label: tr('pinAdcEntrada'), category: 'free', generic: true },
            { gpio: 'GPIO39', physical: 4, label: tr('pinAdcEntrada'), category: 'free', generic: true },
            { gpio: 'GPIO34', physical: 5, label: tr('pinAdcEntrada'), category: 'free', generic: true },
            { gpio: 'GPIO35', physical: 6, label: tr('pinAdcEntrada'), category: 'free', generic: true },
            { gpio: 'GPIO32', physical: 7, label: tr('pinLibre'), category: 'free', generic: true },
            { gpio: 'GPIO33', physical: 8, label: tr('pinLibre'), category: 'free', generic: true },
            { gpio: 'GPIO25', physical: 9, label: tr('pinLedPwmR'), category: 'led_pwm', firmwareDefault: true },
            { gpio: 'GPIO26', physical: 10, label: tr('pinLedPwmG'), category: 'led_pwm', firmwareDefault: true },
            { gpio: 'GPIO27', physical: 11, label: tr('pinLedPwmB'), category: 'led_pwm', firmwareDefault: true },
            { gpio: 'GPIO14', physical: 12, label: tr('pinLibre'), category: 'free', generic: true },
            { gpio: 'GPIO12', physical: 13, label: tr('pinLibre'), category: 'free', generic: true },
            { gpio: 'GND', physical: 14, label: tr('pinTierra'), category: 'ground' },
            { gpio: 'GPIO13', physical: 15, label: tr('pinLibre'), category: 'free', generic: true },
        ];
        const right = [
            { gpio: 'GPIO23', physical: 1, label: tr('pinLibre'), category: 'free', generic: true },
            { gpio: 'GPIO22', physical: 2, label: tr('pinLibre'), category: 'free', generic: true },
            { gpio: 'TXD0', physical: 3, label: tr('pinSerialTx'), category: 'free', generic: true },
            { gpio: 'RXD0', physical: 4, label: tr('pinSerialRx'), category: 'free', generic: true },
            { gpio: 'GPIO21', physical: 5, label: tr('pinLibre'), category: 'free', generic: true },
            { gpio: 'GPIO19', physical: 6, label: tr('pinRele4'), category: 'relay', firmwareDefault: true },
            { gpio: 'GPIO18', physical: 7, label: tr('pinRele3'), category: 'relay', firmwareDefault: true },
            { gpio: 'GPIO5', physical: 8, label: tr('pinLibre'), category: 'free', generic: true },
            { gpio: 'GPIO17', physical: 9, label: tr('pinRele2'), category: 'relay', firmwareDefault: true },
            { gpio: 'GPIO16', physical: 10, label: tr('pinRele1'), category: 'relay', firmwareDefault: true },
            { gpio: 'GPIO4', physical: 11, label: tr('pinTiraLed'), category: 'led_ws2812', firmwareDefault: true },
            { gpio: 'GPIO0', physical: 12, label: tr('pinLibreBoot'), category: 'free', generic: true },
            { gpio: 'GPIO2', physical: 13, label: tr('pinLedEstado'), category: 'reserved', firmwareDefault: true },
            { gpio: 'GPIO15', physical: 14, label: tr('pinLibre'), category: 'free', generic: true },
            { gpio: '5V', physical: 15, label: tr('pinAlimentacion'), category: 'power' },
        ];
        return { left, right };
    }

    function buildEsp8266Pins(useDLabels) {
        const name = (d, gpio) => useDLabels ? d : gpio;
        const left = [
            { gpio: name('3V3', '3V3'), physical: 1, label: tr('pinAlimentacion'), category: 'power' },
            { gpio: name('GND', 'GND'), physical: 2, label: tr('pinTierra'), category: 'ground' },
            { gpio: name('D0', 'GPIO16'), physical: 3, label: tr('pinLedPwmB'), category: 'led_pwm', firmwareDefault: true },
            { gpio: name('D1', 'GPIO5'), physical: 4, label: tr('pinRele1'), category: 'relay', firmwareDefault: true },
            { gpio: name('D2', 'GPIO4'), physical: 5, label: tr('pinRele2'), category: 'relay', firmwareDefault: true },
            { gpio: name('D3', 'GPIO0'), physical: 6, label: tr('pinLibreBoot'), category: 'free', generic: true },
            { gpio: name('D4', 'GPIO2'), physical: 7, label: tr('pinTiraLed'), category: 'led_ws2812', firmwareDefault: true },
            { gpio: name('RX', 'GPIO3'), physical: 8, label: tr('pinSerialRx'), category: 'free', generic: true },
        ];
        const right = [
            { gpio: name('D5', 'GPIO14'), physical: 1, label: tr('pinRele3'), category: 'relay', firmwareDefault: true },
            { gpio: name('D6', 'GPIO12'), physical: 2, label: tr('pinRele4'), category: 'relay', firmwareDefault: true },
            { gpio: name('D7', 'GPIO13'), physical: 3, label: tr('pinLedPwmR'), category: 'led_pwm', firmwareDefault: true },
            { gpio: name('D8', 'GPIO15'), physical: 4, label: tr('pinLedPwmG'), category: 'led_pwm', firmwareDefault: true },
            { gpio: name('TX', 'GPIO1'), physical: 5, label: tr('pinSerialTx'), category: 'free', generic: true },
            { gpio: name('A0', 'A0'), physical: 6, label: tr('pinEntradaAnalogica'), category: 'adc', generic: true },
            { gpio: name('GND', 'GND'), physical: 7, label: tr('pinTierra'), category: 'ground' },
            { gpio: name('5V', 'VIN'), physical: 8, label: tr('pinAlimentacion'), category: 'power' },
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
            { gpio: '3V3', physical: 1, label: tr('pinAlimentacion'), category: 'power' },
            { gpio: 'NC', physical: 2, label: tr('pinSinConexion'), category: 'reserved' },
            { gpio: 'GPIO36', physical: 3, label: tr('pinAdc0Vp'), category: 'adc' },
            { gpio: 'GPIO39', physical: 4, label: tr('pinAdc3Vn'), category: 'adc' },
            { gpio: 'GPIO34', physical: 5, label: tr('pinAdc6'), category: 'adc' },
            { gpio: 'GPIO35', physical: 6, label: tr('pinAdc7'), category: 'adc' },
            { gpio: 'GPIO32', physical: 7, label: tr('pinSim800lDtr'), category: 'modem', firmwareDefault: true },
            { gpio: 'GPIO33', physical: 8, label: tr('pinSim800lRi'), category: 'modem', firmwareDefault: true },
            { gpio: 'GPIO25', physical: 9, label: tr('pinTiraLed'), category: 'led_ws2812', firmwareDefault: true },
            { gpio: 'GPIO26', physical: 10, label: tr('pinSim800lTx'), category: 'modem', firmwareDefault: true },
            { gpio: 'GPIO27', physical: 11, label: tr('pinSim800lRx'), category: 'modem', firmwareDefault: true },
            { gpio: 'GPIO14', physical: 12, label: tr('pinLedPwmR'), category: 'led_pwm', firmwareDefault: true },
            { gpio: 'GPIO12', physical: 13, label: tr('pinTouch5'), category: 'free' },
            { gpio: 'GND', physical: 14, label: tr('pinTierra'), category: 'ground' },
            { gpio: 'GPIO13', physical: 15, label: tr('pinLedEstadoAzul'), category: 'reserved', firmwareDefault: true },
            { gpio: 'SD2', physical: 16, label: tr('pinFlashSpiReservado'), category: 'reserved' },
            { gpio: 'SD3', physical: 17, label: tr('pinFlashSpiReservado'), category: 'reserved' },
            { gpio: 'CMD', physical: 18, label: tr('pinFlashSpiReservado'), category: 'reserved' },
            { gpio: '5V', physical: 19, label: tr('pinAlimentacion'), category: 'power' },
            { gpio: 'SPK+', physical: 20, label: tr('pinSalidaAudioMas'), category: 'reserved' },
            { gpio: 'SPK-', physical: 21, label: tr('pinSalidaAudioMenos'), category: 'reserved' },
        ];
        const right = [
            { gpio: 'GND', physical: 1, label: tr('pinTierra'), category: 'ground' },
            { gpio: 'GPIO23', physical: 2, label: tr('pinSim800lPowerOn'), category: 'modem', firmwareDefault: true },
            { gpio: 'GPIO22', physical: 3, label: tr('pinI2cSclCompartido'), category: 'i2c', firmwareDefault: true },
            { gpio: 'GPIO1', physical: 4, label: tr('pinSerialTxProg'), category: 'reserved' },
            { gpio: 'GPIO3', physical: 5, label: tr('pinSerialRxProg'), category: 'reserved' },
            { gpio: 'GPIO21', physical: 6, label: tr('pinI2cSdaCompartido'), category: 'i2c', firmwareDefault: true },
            { gpio: 'GND', physical: 7, label: tr('pinTierra'), category: 'ground' },
            { gpio: 'GPIO19', physical: 8, label: tr('pinLedPwmB'), category: 'led_pwm', firmwareDefault: true },
            { gpio: 'GPIO18', physical: 9, label: tr('pinLedPwmG'), category: 'led_pwm', firmwareDefault: true },
            { gpio: 'GPIO5', physical: 10, label: tr('pinSim800lReset'), category: 'modem', firmwareDefault: true },
            { gpio: 'NC', physical: 11, label: tr('pinSinConexion'), category: 'reserved' },
            { gpio: 'NC', physical: 12, label: tr('pinSinConexion'), category: 'reserved' },
            { gpio: 'GPIO4', physical: 13, label: tr('pinSim800lPwrkey'), category: 'modem', firmwareDefault: true },
            { gpio: 'GPIO0', physical: 14, label: tr('pinTouch1Boot'), category: 'free' },
            { gpio: 'GPIO2', physical: 15, label: tr('pinTouch2'), category: 'free' },
            { gpio: 'GPIO15', physical: 16, label: tr('pinTouch3'), category: 'free' },
            { gpio: 'SD1', physical: 17, label: tr('pinFlashSpiReservado'), category: 'reserved' },
            { gpio: 'SD0', physical: 18, label: tr('pinFlashSpiReservado'), category: 'reserved' },
            { gpio: 'CLK', physical: 19, label: tr('pinFlashSpiReservado'), category: 'reserved' },
            { gpio: 'MIC-', physical: 20, label: tr('pinEntradaAudioMenos'), category: 'reserved' },
            { gpio: 'MIC+', physical: 21, label: tr('pinEntradaAudioMas'), category: 'reserved' },
        ];
        return { left, right };
    }

    const BOARD_CATALOG = [
        { id: 'esp32_devkit', label: tr('boardEsp32Label'), chipLabel: 'ESP32-WROOM-32', pins: buildEsp32Pins(), firmwareVerified: true, image: '/plugins-static/arduino-accessories/frontend/assets/esp32-devkit-v1-nodemcu.png' },
        { id: 'esp8266_generic', label: tr('boardEsp8266Label'), chipLabel: 'ESP8266EX', pins: buildEsp8266Pins(false), firmwareVerified: true },
        { id: 'nodemcu_v3', label: tr('boardNodemcuLabel'), chipLabel: 'ESP8266EX (NodeMCU)', pins: buildEsp8266Pins(true), firmwareVerified: true },
        { id: 'wemos_d1_mini', label: tr('boardWemosLabel'), chipLabel: 'ESP8266EX (D1 mini)', pins: buildEsp8266Pins(true), firmwareVerified: true },
        { id: 'tcall_v13', label: tr('boardTcallLabel'), chipLabel: 'ESP32-WROVER-B + SIM800L + IP5306', pins: buildTCallPins(), firmwareVerified: true, image: '/plugins-static/arduino-accessories/frontend/assets/tcall-v13.png', note: tr('boardTcallNote') },
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
            id: 'printer_fly_d5', kind: 'printer', name: tr('machinePrinterName'), nickname: 'FLY_D5 / Klipper', status: tr('statusActive'),
            variables: [
                { key: 'data.extruder.temperature', label: tr('varNozzleTemp') },
                { key: 'data.heater_bed.temperature', label: tr('varBedTemp') },
                { key: 'job.state', label: tr('varPrintState') },
                { key: 'job.progress', label: tr('varPrintProgress') },
            ],
            outputs: [{ accessoryLabel: tr('outputLedStrip'), port: 'GPIO4', on: true }],
            inlineRules: [
                { color: '#3b82f6', condition: tr('condNozzleBelow40'), result: tr('ruleColdMachine') },
                { color: '#eab308', condition: tr('condNozzle40to200'), result: tr('ruleHeating') },
                { color: '#ef4444', condition: tr('condNozzleAbove220'), result: tr('ruleOverTemp') },
                { color: '#22c55e', condition: tr('condStateReady'), result: tr('ruleReadyToPrint') },
                { color: '#a855f7', condition: tr('condPrinting'), result: tr('ruleGradientProgress') },
            ],
        },
        {
            id: 'laser_sculpfun', kind: 'laser', name: tr('machineLaserName'), nickname: 'Sculpfun / GRBL', status: tr('statusActive'),
            variables: [
                { key: 'state', label: tr('varGrblState') },
                { key: 'accessories.flood', label: tr('varCoolant') },
                { key: 'job.state', label: tr('varJobState') },
                { key: 'job.current', label: tr('varJobProgress') },
            ],
            outputs: [
                { accessoryLabel: tr('outputExtractorRelay'), port: 'GPIO18', on: true },
                { accessoryLabel: tr('outputSiren'), port: 'GPIO19', on: true },
            ],
            inlineRules: [
                { color: '#22c55e', condition: tr('condReadyState'), result: tr('ruleGreenLight') },
                { color: '#eab308', condition: tr('condEngraving'), result: tr('ruleAmberLightExtractor') },
                { color: '#ef4444', condition: tr('condAlarm'), result: tr('ruleRedSiren') },
                { color: '#a855f7', condition: tr('condDoorOpen'), result: tr('rulePauseWarning') },
            ],
        },
        {
            id: 'cnc_3018', kind: 'cnc', name: tr('machineCncName'), nickname: '3018 / GRBL', status: tr('statusActive'),
            variables: [
                { key: 'state', label: tr('varGrblState') },
                { key: 'accessories.spindle_cw', label: tr('varSpindleActive') },
                { key: 'job.state', label: tr('varJobState') },
            ],
            outputs: [
                { accessoryLabel: tr('outputFanRelay'), port: 'GPIO26', on: true },
                { accessoryLabel: tr('outputBeacon'), port: 'GPIO25', on: true },
            ],
            inlineRules: [
                { color: '#3b82f6', condition: tr('condJobActive'), result: tr('ruleBlueBeacon') },
                { color: '#22c55e', condition: tr('condSpindleActive'), result: tr('ruleFanOn') },
                { color: '#22c55e', condition: tr('condJobEnd'), result: tr('ruleGreenLight') },
                { color: '#ef4444', condition: tr('condErrorLimit'), result: tr('ruleRedBlink') },
            ],
        },
    ];

    // Acciones con el mismo shape exacto que ya usa
    // backend/services/accessory_scenes.py (create_scene): {accessory_id,on} o
    // {accessory_id,color:[r,g,b]} -- así una futura pasada de backend puede
    // reusar ese código de aplicación de acciones sin cambiarlo.
    const GLOBAL_RULES = [
        { id: 'R01', condition: tr('ruleCondNozzleAbove220'), action: { accessory_id: 'led_taller', color: [239, 68, 68] }, actionLabel: tr('ruleActionLedRed'), source: 'FLY_D5', enabled: true },
        { id: 'R02', condition: tr('ruleCondPrintDone'), action: { accessory_id: 'led_taller', color: [34, 197, 94] }, actionLabel: tr('ruleActionLedGreenFanOff'), source: 'FLY_D5', enabled: true },
        { id: 'R03', condition: tr('ruleCondProgressX'), action: { accessory_id: 'led_taller', color: [168, 85, 247] }, actionLabel: tr('ruleActionLedGradient'), source: 'FLY_D5', enabled: true },
        { id: 'R04', condition: tr('ruleCondLaserEngraving'), action: { accessory_id: 'relay_extractor', on: true }, actionLabel: tr('ruleActionExtractorOn'), source: 'Sculpfun', enabled: true },
        { id: 'R05', condition: tr('condDoorOpen'), action: { accessory_id: 'relay_extractor', on: false }, actionLabel: tr('ruleActionPauseYellow'), source: 'Sculpfun', enabled: true },
        { id: 'R06', condition: tr('ruleCondSpindleActive'), action: { accessory_id: 'relay_ventilador', on: true }, actionLabel: tr('ruleActionFanOn'), source: '3018', enabled: true },
        { id: 'R07', condition: tr('ruleCondLimitOrError'), action: { accessory_id: 'led_baliza', color: [239, 68, 68] }, actionLabel: tr('ruleActionRedBlink'), source: '3018', enabled: true },
    ];

    // Mismo shape que ya usaba el panel original (renderActivity()): {timestamp
    // unix, name, action, source}. timestamp fijo relativo a Date.now() para
    // que el mock se vea consistente en cada carga.
    const nowMs = Date.now();
    const ACTIVITY_LOG = [
        { timestamp: (nowMs - 5000) / 1000, name: tr('actNozzle215'), action: 'reading', source: 'FLY_D5' },
        { timestamp: (nowMs - 67000) / 1000, name: tr('actLaserEngraving'), action: 'reading', source: 'Sculpfun' },
        { timestamp: (nowMs - 128000) / 1000, name: tr('actProgress65'), action: 'reading', source: 'FLY_D5' },
        { timestamp: (nowMs - 190000) / 1000, name: tr('actSpindleOn'), action: 'reading', source: '3018' },
        { timestamp: (nowMs - 250000) / 1000, name: tr('actDoorClosed'), action: 'reading', source: 'Sculpfun' },
    ];

    const SYSTEM_STATS = { cpu: 22, memory: 48, uptime: '2d 14h', connectionQuality: tr('connectionExcellent'), latencyMs: 12 };

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
        // Estado de NOPAL Intelligence (core, no es un plugin instalable):
        // null = todavía no se consultó. Se usa solo para ofrecer la ayuda
        // de IA donde suma; el plugin funciona igual sin ella.
        aiAvailable: null,
        boardTelemetry: [],
        ambientSensorBoardId: null,
        workshopLoading: true,
        // connected: true cuando la placa se confirmó de verdad por USB (ver
        // asistente de firmware) -- una placa "connected" muestra solo sus
        // pines firmwareDefault por default (showAllPins la destapa toda);
        // una placa de referencia (agregada a mano, sin hardware real detrás)
        // arranca mostrando el mapa completo, útil para planear antes de
        // tener la placa en la mano.
        boards: [{ id: 'board_1', catalogId: 'esp32_devkit', name: tr('mainWorkshopName'), pins: clonePins(BOARD_CATALOG[0].pins), connected: false, showAllPins: true }],
        activeBoardId: 'board_1',
        selectedPinKey: null, // "left:8" | "right:3"
        pendingCategory: null, // categoría elegida en el dropdown del inspector, todavía sin "Aplicar" -- ver applyPinConfig()
        rules: GLOBAL_RULES.map(rule => ({ ...rule })),
        scanning: false, // "Escanear pines" -- ver scanPins()
        boardsSort: 'name', // name | status | signal -- orden del grid de tarjetas, solo cliente
        boardsViewMode: 'grid', // grid | list -- solo cliente, no persistido
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
    const ICON_MORE = '<circle cx="12" cy="5" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1.6" fill="currentColor" stroke="none"/>';
    const ICON_WARNING = '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>';
    const ICON_WIFI = '<path d="M5 13a10 10 0 0 1 14 0"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/><path d="M12 20h.01"/>';
    const ICON_CLOCK = '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>';
    const ICON_SORT = '<path d="M3 6h18M6 12h12M10 18h4"/>';
    const ICON_LIST = '<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/>';
    const ICON_REFRESH = '<path d="M3 12a9 9 0 0 1 15.3-6.4L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.3 6.4L3 16"/><path d="M3 21v-5h5"/>';
    const ICON_COPY = '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16V4a2 2 0 0 1 2-2h10"/>';

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
        if (!response.ok) throw new Error(data.detail || tr('operationCouldNotComplete'));
        return data;
    }

    // NOPAL Intelligence vive en el core (se activa configurándolo, no se
    // instala como plugin). Se consulta aparte de loadWorkshopData y en su
    // propio try: si falla o no está, `aiAvailable` queda en false y la UI
    // simplemente no ofrece la ayuda de IA -- nunca rompe el plugin.
    async function refreshAiAvailability() {
        try {
            const status = await api('/api/ai/status');
            state.aiAvailable = Boolean(status.enabled && status.configured);
        } catch (error) {
            state.aiAvailable = false;
        }
    }

    async function loadWorkshopData({ quiet = false } = {}) {
        if (!quiet) state.workshopLoading = true;
        try {
            const [accessoriesData, scenesData, activityData, telemetryData, ambientSensorData] = await Promise.all([
                api('/api/accessories/status'),
                api('/api/accessories/scenes'),
                api('/api/accessories/activity'),
                api('/api/accessories/arduino/telemetry'),
                api('/api/accessories/arduino/ambient-sensor'),
            ]);
            state.accessories = accessoriesData.accessories || [];
            state.scenes = scenesData.scenes || [];
            state.activity = activityData.activity || [];
            state.boardTelemetry = telemetryData.boards || [];
            state.ambientSensorBoardId = ambientSensorData.board_id || null;
            reconcileBoardConnections();
        } catch (error) {
            if (!quiet) toast(error.message || tr('errCouldNotLoadWorkshopState'), 'error');
        } finally {
            state.workshopLoading = false;
            if (state.view === 'overview') render();
        }
    }

    // Una placa NOPAL y sus relés/tiras son el mismo hardware. Antes cada
    // endpoint se dibujaba como si fuera una conexión diferente; aquí se
    // cruzan por IP/USB y el mapa de pines hereda la telemetría real del
    // accesorio sin volver a detectar ni abrir el puerto otra vez.
    function reconcileBoardConnections() {
        const telemetryById = new Map(state.boardTelemetry.map(item => [String(item.id), item]));
        state.boards.forEach(board => {
            const telemetryEntry = telemetryById.get(String(board.id));
            const accessory = state.accessories.find(item => {
                if (item.driver !== 'arduino') return false;
                const config = item.config || {};
                return (board.ip && config.ip === board.ip) || (board.device && config.device === board.device);
            });
            const telemetry = telemetryEntry?.telemetry || {};
            if (telemetryEntry?.online || accessory) board.connected = true;
            if (Object.keys(telemetry).length || accessory) {
                const config = accessory?.config || {};
                board.deviceInfo = {
                    ...(board.deviceInfo || {}),
                    ...telemetry,
                    firmware: telemetry.firmware || config.firmware || board.deviceInfo?.firmware,
                    protocol: telemetry.protocol ?? config.protocol ?? board.deviceInfo?.protocol,
                    ws2812: telemetry.ws2812 ?? (config.led_mode === 'ws2812'),
                    ws2812_count: telemetry.ws2812_count || config.led_count || config.ws2812_count,
                    ip: board.ip || config.ip,
                    device: board.device || config.device,
                };
            }
        });
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
            toast(tr('accessoryToggled', { name: accessory.name, state: on ? tr('onState').toLowerCase() : tr('offState').toLowerCase() }));
            await loadWorkshopData({ quiet: true });
        } catch (error) {
            accessory.on = previous;
            render();
            toast(error.message || tr('errCouldNotChangeAccessory'), 'error');
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
            toast(tr('colorUpdated'));
            await loadWorkshopData({ quiet: true });
        } catch (error) {
            toast(error.message || tr('errCouldNotChangeLighting'), 'error');
        }
    }

    function openLedDetailsPanel(accessoryId) {
        const accessory = state.accessories.find(item => item.id === accessoryId);
        if (!accessory) return;
        const config = accessory.config || {};
        const isWifi = config.transport === 'wifi';
        root.querySelector('#wsa-led-details-modal')?.remove();
        const rows = [
            [tr('nameWord'), accessory.name],
            ['ID', accessory.id],
            ['Driver', accessory.driver],
            [tr('transportLabel'), isWifi ? 'WiFi' : 'USB'],
            [isWifi ? 'IP' : tr('wizardTilePort'), isWifi ? (config.ip || '—') : (config.device || '—')],
            ['GPIO', config.gpio ?? '—'],
            [tr('ledModeLabel'), (config.led_mode || '—').toUpperCase()],
            [tr('paramLedCount'), config.led_count || config.ws2812_count || '—'],
            [tr('protocolLabel'), config.protocol ?? '—'],
        ];
        if (isWifi) rows.push([tr('otaUserLabel'), config.ota_username || '—']);
        root.insertAdjacentHTML('beforeend', `<div class="wsa-lighting-modal" id="wsa-led-details-modal"><div class="wsa-lighting-backdrop" data-wsa-led-details-close></div>
            <div class="wsa-lighting-dialog wsa-led-details-dialog">
                <button type="button" class="wsa-lighting-close" data-wsa-led-details-close>×</button>
                <div class="wsa-lighting-heading">${icon(ICON_ACTIVITY, 24)}<div><small>${tr('accessoryDetailsEyebrow')}</small><h2>${esc(accessory.name)}</h2></div></div>
                <div class="wsa-led-details-rows">${rows.map(([label, value]) => `<div><span>${esc(label)}</span><strong>${esc(String(value))}</strong></div>`).join('')}</div>
                <div class="wsa-lighting-actions"><button type="button" class="wsa-btn wsa-btn-accent" data-wsa-led-details-close>${tr('closeTitle')}</button></div>
            </div></div>`);
        root.querySelectorAll('[data-wsa-led-details-close]').forEach(btn => btn.addEventListener('click', () => root.querySelector('#wsa-led-details-modal')?.remove()));
    }

    async function deleteWorkshopAccessory(accessoryId) {
        const accessory = state.accessories.find(item => item.id === accessoryId);
        const name = accessory?.name || tr('thisAccessoryWord');
        const message = tr('confirmDeleteAccessory', { name });
        const confirmed = typeof window.appConfirm === 'function'
            ? await window.appConfirm(message, tr('deleteAccessoryTitle'), 'danger')
            : window.confirm(message);
        if (!confirmed) return;
        try {
            await api('/api/accessories/remove', { method: 'POST', body: new URLSearchParams({ id: accessoryId }) });
            toast(tr('accessoryDeletedToast'));
            await loadWorkshopData({ quiet: true });
        } catch (error) {
            toast(error.message || tr('errCouldNotDeleteAccessory'), 'error');
        }
    }

    function lightingBoardOptions() {
        const configured = state.boards.filter(board => board.ip || board.device).map(board => {
            const live = state.boardTelemetry.find(item => item.board_id === board.id || (board.ip && item.ip === board.ip) || (board.device && item.device === board.device));
            return { ...board, live: live || {}, info: live?.telemetry || board.deviceInfo || {} };
        });
        configured.push({ id: '__manual_wifi__', name: tr('otherBoardByIp'), ip: '', device: null, manual: true, info: {} });
        return configured;
    }

    function openLightingEditor() {
        root.querySelector('#wsa-lighting-modal')?.remove();
        const boards = lightingBoardOptions();
        root.insertAdjacentHTML('beforeend', `<div class="wsa-lighting-modal" id="wsa-lighting-modal"><div class="wsa-lighting-backdrop" data-wsa-lighting-close></div>
            <form class="wsa-lighting-dialog" id="wsa-lighting-form">
                <button type="button" class="wsa-lighting-close" data-wsa-lighting-close>×</button>
                <div class="wsa-lighting-heading">${icon(ICON_LED, 24)}<div><small>${tr('boardLightingEyebrow')}</small><h2>${tr('addLedOrNeopixel')}</h2><p>${tr('registerLightHint')}</p></div></div>
                <label><span>${tr('chipBoard')}</span><select id="wsa-lighting-board">${boards.map(board => `<option value="${esc(board.id)}">${esc(board.name)}${board.ip || board.device ? ` · ${esc(board.ip || board.device)}` : ''}</option>`).join('')}</select></label>
                <label id="wsa-lighting-manual-ip" hidden><span>${tr('boardIpLabel')}</span><input id="wsa-lighting-ip" placeholder="Ej. 192.168.0.85"></label>
                <label><span>${tr('nameWord')}</span><input id="wsa-lighting-name" required value="${tr('workshopLightingDefaultName')}" placeholder="${tr('neopixelNamePlaceholder')}"></label>
                <div class="wsa-lighting-grid"><label><span>${tr('typeWord')}</span><select id="wsa-lighting-mode"><option value="ws2812">NeoPixel / WS2812</option><option value="pwm">LED RGB PWM</option></select></label>
                <label><span>${tr('dataGpioLabel')}</span><input id="wsa-lighting-gpio" type="number" min="0" max="48" value="23" required></label>
                <label><span>${tr('paramLedCount')}</span><input id="wsa-lighting-count" type="number" min="1" max="2048" value="8" required></label></div>
                <div class="wsa-lighting-preview" id="wsa-lighting-preview"></div>
                <div class="wsa-lighting-credentials" id="wsa-lighting-credentials"><label><span>${tr('wizardOtaUser')}</span><input id="wsa-lighting-user" value="admin" autocomplete="username"></label><label><span>${tr('wizardOtaPassword')}</span><input id="wsa-lighting-pass" type="password" autocomplete="current-password"></label></div>
                <p class="wsa-lighting-note">${tr('ledCountHint')}</p>
                <label class="wsa-showall-toggle"><input type="checkbox" id="wsa-lighting-show-on-panel" checked><span></span> ${tr('showOnPanelLabel')}</label>
                <p class="wsa-lighting-note">${tr('showOnPanelHint')}</p>
                <div class="wsa-lighting-actions"><button type="button" class="wsa-btn" data-wsa-lighting-close>${tr('cancelBtn')}</button><button type="submit" class="wsa-btn wsa-btn-accent">${tr('addLightingBtn')}</button></div>
            </form></div>`);
        root.querySelectorAll('[data-wsa-lighting-close]').forEach(button => button.addEventListener('click', () => root.querySelector('#wsa-lighting-modal')?.remove()));
        const boardSelect = root.querySelector('#wsa-lighting-board');
        const countInput = root.querySelector('#wsa-lighting-count');
        const syncBoard = () => {
            const board = boards.find(item => item.id === boardSelect.value) || boards[0];
            const info = board.info || {};
            root.querySelector('#wsa-lighting-gpio').value = info.led_gpio ?? 23;
            countInput.value = info.ws2812_count || info.led_count || countInput.value || 1;
            root.querySelector('#wsa-lighting-manual-ip').hidden = !board.manual;
            root.querySelector('#wsa-lighting-credentials').hidden = Boolean(board.device);
            drawLightingPreview();
        };
        const drawLightingPreview = () => {
            const count = Math.max(1, Math.min(64, Number(countInput.value) || 1));
            root.querySelector('#wsa-lighting-preview').innerHTML = Array.from({ length: count }, (_, index) => `<i title="LED ${index + 1}"></i>`).join('') + (Number(countInput.value) > 64 ? `<span>+${Number(countInput.value) - 64}</span>` : '');
        };
        boardSelect.addEventListener('change', syncBoard);
        countInput.addEventListener('input', drawLightingPreview);
        syncBoard();
        root.querySelector('#wsa-lighting-form').addEventListener('submit', async event => {
            event.preventDefault();
            const button = event.submitter;
            button.disabled = true;
            const board = boards.find(item => item.id === boardSelect.value) || boards[0];
            const info = board.info || {};
            try {
                await api('/api/accessories/arduino/lighting', { method: 'POST', body: new URLSearchParams({
                    name: root.querySelector('#wsa-lighting-name').value.trim(),
                    transport: board.device ? 'usb' : 'wifi', ip: board.ip || root.querySelector('#wsa-lighting-ip').value.trim(), device: board.device || '',
                    username: root.querySelector('#wsa-lighting-user').value, password: root.querySelector('#wsa-lighting-pass').value,
                    mode: root.querySelector('#wsa-lighting-mode').value, gpio: root.querySelector('#wsa-lighting-gpio').value,
                    count: countInput.value, protocol: info.protocol || 0,
                    show_on_panel: root.querySelector('#wsa-lighting-show-on-panel').checked,
                }) });
                root.querySelector('#wsa-lighting-modal')?.remove();
                state.overviewTab = 'lights';
                await loadWorkshopData({ quiet: true });
                toast(tr('lightingAddedHint'));
            } catch (error) { toast(error.message, 'error'); button.disabled = false; }
        });
    }

    function openRelayEditor(relayNumber) {
        root.querySelector('#wsa-relay-modal')?.remove();
        const boards = lightingBoardOptions();
        root.insertAdjacentHTML('beforeend', `<div class="wsa-lighting-modal" id="wsa-relay-modal"><div class="wsa-lighting-backdrop" data-wsa-relay-close></div>
            <form class="wsa-lighting-dialog" id="wsa-relay-form">
                <button type="button" class="wsa-lighting-close" data-wsa-relay-close>×</button>
                <div class="wsa-lighting-heading">${icon(ICON_PLUG, 24)}<div><small>${tr('boardOutputEyebrow')}</small><h2>${tr('registerRelayN', { n: relayNumber })}</h2><p>${tr('boardReportedRelayHint')}</p></div></div>
                <label><span>${tr('chipBoard')}</span><select id="wsa-relay-board">${boards.map(board => `<option value="${esc(board.id)}">${esc(board.name)}${board.ip || board.device ? ` · ${esc(board.ip || board.device)}` : ''}</option>`).join('')}</select></label>
                <label id="wsa-relay-manual-ip" hidden><span>${tr('boardIpLabel')}</span><input id="wsa-relay-ip" placeholder="Ej. 192.168.0.85"></label>
                <label><span>${tr('nameWord')}</span><input id="wsa-relay-name" required value="${tr('relayNumber', { n: relayNumber })}" placeholder="${tr('relayNamePlaceholder')}"></label>
                <label><span>${tr('relayNumberLabel')}</span><input id="wsa-relay-number" type="number" min="1" max="16" value="${relayNumber}" required></label>
                <div class="wsa-lighting-credentials" id="wsa-relay-credentials"><label><span>${tr('wizardOtaUser')}</span><input id="wsa-relay-user" value="admin" autocomplete="username"></label><label><span>${tr('wizardOtaPassword')}</span><input id="wsa-relay-pass" type="password" autocomplete="current-password"></label></div>
                <div class="wsa-lighting-actions"><button type="button" class="wsa-btn" data-wsa-relay-close>${tr('cancelBtn')}</button><button type="submit" class="wsa-btn wsa-btn-accent">${tr('registerRelayBtn')}</button></div>
            </form></div>`);
        root.querySelectorAll('[data-wsa-relay-close]').forEach(button => button.addEventListener('click', () => root.querySelector('#wsa-relay-modal')?.remove()));
        const boardSelect = root.querySelector('#wsa-relay-board');
        const syncBoard = () => {
            const board = boards.find(item => item.id === boardSelect.value) || boards[0];
            root.querySelector('#wsa-relay-manual-ip').hidden = !board.manual;
            root.querySelector('#wsa-relay-credentials').hidden = Boolean(board.device);
        };
        boardSelect.addEventListener('change', syncBoard);
        syncBoard();
        root.querySelector('#wsa-relay-form').addEventListener('submit', async event => {
            event.preventDefault();
            const button = event.submitter;
            button.disabled = true;
            const board = boards.find(item => item.id === boardSelect.value) || boards[0];
            try {
                await api('/api/accessories/arduino/relay', { method: 'POST', body: new URLSearchParams({
                    name: root.querySelector('#wsa-relay-name').value.trim(),
                    transport: board.device ? 'usb' : 'wifi', ip: board.ip || root.querySelector('#wsa-relay-ip').value.trim(), device: board.device || '',
                    username: root.querySelector('#wsa-relay-user').value, password: root.querySelector('#wsa-relay-pass').value,
                    relay: root.querySelector('#wsa-relay-number').value,
                }) });
                root.querySelector('#wsa-relay-modal')?.remove();
                state.overviewTab = 'relays';
                await loadWorkshopData({ quiet: true });
                toast(tr('relayRegisteredToast'));
            } catch (error) { toast(error.message, 'error'); button.disabled = false; }
        });
    }

    async function runWorkshopScene(sceneId) {
        const scene = state.scenes.find(item => item.id === sceneId);
        try {
            await api(`/api/accessories/scenes/${encodeURIComponent(sceneId)}/run`, { method: 'POST' });
            await loadWorkshopData({ quiet: true });
            // Doble/múltiple: el estado activo cambió con esta corrida --
            // se lee de nuevo (loadWorkshopData ya trajo el dato fresco)
            // para avisar A CUÁL quedó, no solo que "se aplicó algo".
            const updated = state.scenes.find(item => item.id === sceneId);
            toast(updated?.current_state_name
                ? tr('sceneAppliedState', { name: updated.name, state: updated.current_state_name })
                : tr('sceneApplied', { name: scene?.name || tr('workshopWord') }));
        } catch (error) {
            toast(error.message || tr('errCouldNotRunScene'), 'error');
        }
    }

    // Una fila de acción dentro del editor de escenas: qué accesorio y qué
    // hacerle (encender / apagar / fijar color). Mismo shape que ya usa
    // accessory_scenes.py -- {accessory_id, on} o {accessory_id, color}.
    function sceneActionRowHtml(action, accessories) {
        const hasColor = Array.isArray(action.color);
        const type = hasColor ? 'color' : (action.on ? 'on' : 'off');
        return `<div class="wsa-scene-action-row" data-scene-action-row>
            <select data-scene-action-accessory>${accessories.map(item => `<option value="${esc(item.id)}" ${item.id === action.accessory_id ? 'selected' : ''}>${esc(item.name)}</option>`).join('')}</select>
            <select data-scene-action-type>
                <option value="on" ${type === 'on' ? 'selected' : ''}>${tr('turnOnOption')}</option>
                <option value="off" ${type === 'off' ? 'selected' : ''}>${tr('turnOffOption')}</option>
                <option value="color" ${type === 'color' ? 'selected' : ''}>${tr('setColorOption')}</option>
            </select>
            <input type="color" data-scene-action-color value="${rgbToHex(action.color)}" ${type === 'color' ? '' : 'hidden'}>
            <button type="button" class="wsa-card-menu-btn wsa-btn-icon-danger" data-scene-action-remove title="${tr('removeActionTitle')}">${icon(ICON_CLOSE, 14)}</button>
        </div>`;
    }

    // Lee las filas de acción de CUALQUIER lista (la única del modo normal,
    // o la de un estado puntual en modo doble/múltiple) -- mismo shape que
    // ya valida accessory_scenes.py.
    function parseActionRows(listEl) {
        return [...listEl.querySelectorAll('[data-scene-action-row]')].map(row => {
            const accessoryId = row.querySelector('[data-scene-action-accessory]').value;
            const type = row.querySelector('[data-scene-action-type]').value;
            if (type === 'color') {
                return { accessory_id: accessoryId, color: hexToRgb(row.querySelector('[data-scene-action-color]').value) || [0, 0, 0] };
            }
            return { accessory_id: accessoryId, on: type === 'on' };
        });
    }

    // Un "estado" del modo doble/múltiple: nombre + su propia lista de
    // acciones -- doble siempre tiene 2 (no removibles, sin botón de
    // agregar), múltiple tiene 2 o más (agregar/quitar estados enteros).
    function sceneVariantBlockHtml(variant, index, accessories, removable) {
        const rowsActions = variant.actions?.length ? variant.actions : [{ accessory_id: accessories[0].id, on: true }];
        return `<div class="wsa-scene-variant" data-scene-variant>
            <div class="wsa-scene-variant-header">
                <input type="text" data-scene-variant-name value="${esc(variant.name || '')}" placeholder="${esc(tr('stateNamePlaceholder'))}" maxlength="40">
                ${removable ? `<button type="button" class="wsa-card-menu-btn wsa-btn-icon-danger" data-scene-variant-remove title="${tr('removeStateTitle')}">${icon(ICON_CLOSE, 14)}</button>` : ''}
            </div>
            <div class="wsa-scene-actions" data-scene-variant-actions>${rowsActions.map(action => sceneActionRowHtml(action, accessories)).join('')}</div>
            <button type="button" class="wsa-btn wsa-btn-small" data-scene-variant-add-action>${icon(ICON_PLUS, 13)}<span>${tr('addActionBtn')}</span></button>
        </div>`;
    }

    const SCENE_DEFAULT_VARIANTS = accessories => [
        { name: tr('stateOnDefault'), actions: [{ accessory_id: accessories[0].id, on: true }] },
        { name: tr('stateOffDefault'), actions: [{ accessory_id: accessories[0].id, on: false }] },
    ];

    function openSceneEditor(sceneId = null) {
        root.querySelector('#wsa-scene-modal')?.remove();
        const scene = sceneId ? state.scenes.find(item => item.id === sceneId) : null;
        const accessories = state.accessories;
        if (!accessories.length) {
            toast(tr('needAccessoryForScene'), 'error');
            return;
        }
        const mode = scene?.mode || 'normal';
        const actions = scene?.actions?.length ? scene.actions : [{ accessory_id: accessories[0].id, on: true }];
        const variants = (mode !== 'normal' && scene?.variants?.length) ? scene.variants : SCENE_DEFAULT_VARIANTS(accessories);

        root.insertAdjacentHTML('beforeend', `<div class="wsa-lighting-modal" id="wsa-scene-modal"><div class="wsa-lighting-backdrop" data-wsa-scene-close></div>
            <form class="wsa-lighting-dialog wsa-scene-dialog" id="wsa-scene-form">
                <button type="button" class="wsa-lighting-close" data-wsa-scene-close>×</button>
                <div class="wsa-lighting-heading">${icon(ICON_SCENE, 24)}<div><small>${tr('workshopMacroEyebrow')}</small><h2>${scene ? tr('editSceneTitle') : tr('newSceneWord')}</h2><p>${tr('sceneEditorHint')}</p></div></div>
                <label><span>${tr('nameWord')}</span><input id="wsa-scene-name" required maxlength="60" value="${esc(scene?.name || '')}" placeholder="Ej. Taller ON"></label>

                ${state.aiAvailable === false ? `<div class="wsa-ai-hint">
                    <div class="wsa-ai-hint-body">
                        <strong>${tr('aiSceneHintTitle')}</strong>
                        <small>${tr('aiSceneHintBody')}</small>
                    </div>
                    <a class="wsa-btn wsa-btn-small" href="/ajustes#ia" target="_blank" rel="noopener">${tr('aiSceneHintCta')}</a>
                </div>` : ''}


                <div class="wsa-scene-mode-field">
                    <span class="wsa-scene-mode-label">${tr('sceneModeLabel')}</span>
                    <label class="wsa-wizard-radio-row"><input type="radio" name="wsa-scene-mode" value="normal" ${mode === 'normal' ? 'checked' : ''}><span><strong>${tr('modeNormalLabel')}</strong><small>${tr('modeNormalHint')}</small></span></label>
                    <label class="wsa-wizard-radio-row"><input type="radio" name="wsa-scene-mode" value="toggle" ${mode === 'toggle' ? 'checked' : ''}><span><strong>${tr('modeToggleLabel')}</strong><small>${tr('modeToggleHint')}</small></span></label>
                    <label class="wsa-wizard-radio-row"><input type="radio" name="wsa-scene-mode" value="cycle" ${mode === 'cycle' ? 'checked' : ''}><span><strong>${tr('modeCycleLabel')}</strong><small>${tr('modeCycleHint')}</small></span></label>
                </div>

                <div id="wsa-scene-normal-block" ${mode === 'normal' ? '' : 'hidden'}>
                    <div class="wsa-scene-actions" id="wsa-scene-actions">${actions.map(action => sceneActionRowHtml(action, accessories)).join('')}</div>
                    <button type="button" class="wsa-btn wsa-btn-small" id="wsa-scene-add-action">${icon(ICON_PLUS, 13)}<span>${tr('addActionBtn')}</span></button>
                </div>

                <div id="wsa-scene-variants-block" ${mode === 'normal' ? 'hidden' : ''}>
                    <div id="wsa-scene-variants-list">${variants.map((v, i) => sceneVariantBlockHtml(v, i, accessories, mode === 'cycle' && variants.length > 2)).join('')}</div>
                    <button type="button" class="wsa-btn wsa-btn-small" id="wsa-scene-add-variant" ${mode === 'toggle' ? 'hidden' : ''}>${icon(ICON_PLUS, 13)}<span>${tr('addStateBtn')}</span></button>
                </div>

                <div class="wsa-lighting-actions">
                    ${scene ? `<button type="button" class="wsa-btn wsa-btn-icon-danger" id="wsa-scene-delete" style="width:auto;padding:9px 14px;margin-right:auto;">${icon(ICON_CLOSE, 14)}<span>${tr('deleteTitle')}</span></button>` : ''}
                    <button type="button" class="wsa-btn" data-wsa-scene-close>${tr('cancelBtn')}</button>
                    <button type="submit" class="wsa-btn wsa-btn-accent">${scene ? tr('saveChangesBtn') : tr('createSceneBtn')}</button>
                </div>
            </form></div>`);

        const syncRowType = row => {
            const type = row.querySelector('[data-scene-action-type]').value;
            row.querySelector('[data-scene-action-color]').hidden = type !== 'color';
        };

        // `listEl` explícito (no una lista fija por closure): el modo normal
        // tiene UNA lista de acciones, el modo doble/múltiple tiene una POR
        // estado -- la misma fila/lógica sirve para las dos, reusada.
        const wireActionRow = (row, listEl) => {
            row.querySelector('[data-scene-action-type]').addEventListener('change', () => syncRowType(row));
            row.querySelector('[data-scene-action-remove]').addEventListener('click', () => {
                if (listEl.querySelectorAll('[data-scene-action-row]').length <= 1) {
                    toast(tr('sceneNeedsAction'), 'error');
                    return;
                }
                row.remove();
            });
        };

        const wireVariantBlock = block => {
            const actionsEl = block.querySelector('[data-scene-variant-actions]');
            actionsEl.querySelectorAll('[data-scene-action-row]').forEach(row => wireActionRow(row, actionsEl));
            block.querySelector('[data-scene-variant-add-action]').addEventListener('click', () => {
                actionsEl.insertAdjacentHTML('beforeend', sceneActionRowHtml({ accessory_id: accessories[0].id, on: true }, accessories));
                wireActionRow(actionsEl.lastElementChild, actionsEl);
            });
            block.querySelector('[data-scene-variant-remove]')?.addEventListener('click', () => {
                const list = root.querySelector('#wsa-scene-variants-list');
                if (list.querySelectorAll('[data-scene-variant]').length <= 2) {
                    toast(tr('sceneNeedsTwoStates'), 'error');
                    return;
                }
                block.remove();
            });
        };

        const normalActionsList = root.querySelector('#wsa-scene-actions');
        normalActionsList.querySelectorAll('[data-scene-action-row]').forEach(row => wireActionRow(row, normalActionsList));
        root.querySelectorAll('[data-scene-variant]').forEach(wireVariantBlock);

        root.querySelectorAll('[data-wsa-scene-close]').forEach(button => button.addEventListener('click', () => root.querySelector('#wsa-scene-modal')?.remove()));

        root.querySelector('#wsa-scene-add-action').addEventListener('click', () => {
            normalActionsList.insertAdjacentHTML('beforeend', sceneActionRowHtml({ accessory_id: accessories[0].id, on: true }, accessories));
            wireActionRow(normalActionsList.lastElementChild, normalActionsList);
        });

        root.querySelector('#wsa-scene-add-variant').addEventListener('click', () => {
            const list = root.querySelector('#wsa-scene-variants-list');
            const nextIndex = list.querySelectorAll('[data-scene-variant]').length + 1;
            list.insertAdjacentHTML('beforeend', sceneVariantBlockHtml({ name: tr('stateDefaultName', { number: nextIndex }), actions: [] }, nextIndex - 1, accessories, true));
            wireVariantBlock(list.lastElementChild);
            // Con 3+ estados ya se puede quitar -- el 1° y 2° empiezan sin
            // botón de quitar (doble mínimo 2), se los habilita recién acá.
            list.querySelectorAll('[data-scene-variant]').forEach(block => {
                if (!block.querySelector('[data-scene-variant-remove]')) {
                    block.querySelector('.wsa-scene-variant-header').insertAdjacentHTML('beforeend',
                        `<button type="button" class="wsa-card-menu-btn wsa-btn-icon-danger" data-scene-variant-remove title="${tr('removeStateTitle')}">${icon(ICON_CLOSE, 14)}</button>`);
                    wireVariantBlock(block);
                }
            });
        });

        root.querySelectorAll('input[name="wsa-scene-mode"]').forEach(radio => {
            radio.addEventListener('change', () => {
                const selected = radio.value;
                root.querySelector('#wsa-scene-normal-block').hidden = selected !== 'normal';
                root.querySelector('#wsa-scene-variants-block').hidden = selected === 'normal';
                root.querySelector('#wsa-scene-add-variant').hidden = selected === 'toggle';
                if (selected === 'toggle') {
                    // Doble: siempre exactamente 2, sin botón de quitar en ninguno.
                    const list = root.querySelector('#wsa-scene-variants-list');
                    [...list.querySelectorAll('[data-scene-variant]')].slice(2).forEach(block => block.remove());
                    list.querySelectorAll('[data-scene-variant-remove]').forEach(btn => btn.remove());
                }
            });
        });

        if (scene) {
            root.querySelector('#wsa-scene-delete').addEventListener('click', async () => {
                const message = tr('confirmDeleteScene', { name: scene.name });
                const confirmed = typeof window.appConfirm === 'function'
                    ? await window.appConfirm(message, tr('deleteSceneTitle'), 'danger')
                    : window.confirm(message);
                if (!confirmed) return;
                try {
                    await api(`/api/accessories/scenes/${encodeURIComponent(scene.id)}`, { method: 'DELETE' });
                    root.querySelector('#wsa-scene-modal')?.remove();
                    toast(tr('sceneDeleted'));
                    await loadWorkshopData({ quiet: true });
                } catch (error) {
                    toast(error.message || tr('errCouldNotDeleteScene'), 'error');
                }
            });
        }

        root.querySelector('#wsa-scene-form').addEventListener('submit', async event => {
            event.preventDefault();
            const button = event.submitter;
            button.disabled = true;
            const name = root.querySelector('#wsa-scene-name').value.trim();
            const selectedMode = root.querySelector('input[name="wsa-scene-mode"]:checked')?.value || 'normal';
            const params = { name, mode: selectedMode };
            if (selectedMode === 'normal') {
                params.actions = JSON.stringify(parseActionRows(normalActionsList));
            } else {
                const variantsPayload = [...root.querySelectorAll('[data-scene-variant]')].map(block => ({
                    name: block.querySelector('[data-scene-variant-name]').value.trim() || tr('stateDefaultName', { number: 1 }),
                    actions: parseActionRows(block.querySelector('[data-scene-variant-actions]')),
                }));
                params.variants = JSON.stringify(variantsPayload);
            }
            try {
                const url = scene ? `/api/accessories/scenes/${encodeURIComponent(scene.id)}` : '/api/accessories/scenes';
                await api(url, { method: scene ? 'PUT' : 'POST', body: new URLSearchParams(params) });
                root.querySelector('#wsa-scene-modal')?.remove();
                toast(scene ? tr('sceneUpdated') : tr('sceneCreated'));
                await loadWorkshopData({ quiet: true });
            } catch (error) {
                toast(error.message || tr('errCouldNotSaveScene'), 'error');
                button.disabled = false;
            }
        });
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
        if (!entry) return toast(tr('chooseModel'), 'error');
        if (!name) return toast(tr('giveBoardName'), 'error');
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
            toast(tr('boardAdded', { name, label: entry.label }));
            render();
        } catch (e) {
            toast(e.message || tr('errCouldNotAddBoard'), 'error');
        }
    }

    // ============================================================================
    // GESTIONAR PLACAS -- editar nombre/puerto/IP o eliminar una placa ya
    // agregada. Habla con el backend real (ver board_pinmap_service.py),
    // igual que addBoardFromForm/applyPinConfig.
    // ============================================================================

    function manageBoardsListHtml() {
        if (!state.boards.length) return `<p class="wsa-empty">${tr('noBoardsAddedYet')}</p>`;
        return state.boards.map(board => `
            <div class="wsa-manageboard-row" data-wsa-manageboard="${board.id}">
                <div class="wsa-manageboard-fields">
                    <label><span>${tr('nameWord')}</span><input type="text" data-wsa-manageboard-field="name" value="${esc(board.name)}" maxlength="40"></label>
                    <label><span>${tr('wizardTilePort')} USB</span><input type="text" data-wsa-manageboard-field="device" value="${esc(board.device || '')}" placeholder="/dev/ttyUSB0"></label>
                    <label><span>IP</span><input type="text" data-wsa-manageboard-field="ip" value="${esc(board.ip || '')}" placeholder="192.168.0.83"></label>
                    <label class="wsa-manageboard-ambient" title="${tr('ambientSensorHint')}">
                        <input type="checkbox" data-wsa-manageboard-ambient="${board.id}" ${state.ambientSensorBoardId === board.id ? 'checked' : ''}>
                        <span>${tr('ambientSensorLabel')}</span>
                    </label>
                </div>
                <div class="wsa-manageboard-actions">
                    <button type="button" class="wsa-btn-icon" data-wsa-manageboard-save="${board.id}" title="${tr('saveBtn')}">${icon(ICON_CHECK, 14)}</button>
                    <button type="button" class="wsa-btn-icon wsa-btn-icon-danger" data-wsa-manageboard-delete="${board.id}" title="${tr('deleteTitle')}">${icon(ICON_CLOSE, 14)}</button>
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
        if (!name) return toast(tr('giveBoardName'), 'error');
        try {
            const updated = await api(`/api/accessories/arduino/boards/${boardId}`, {
                method: 'PUT',
                body: new URLSearchParams({ name, device, ip }),
            });
            const board = state.boards.find(b => b.id === boardId);
            if (board) Object.assign(board, { name: updated.name, device: updated.device, ip: updated.ip });
            toast(tr('boardUpdated'));
            render();
        } catch (e) {
            toast(e.message || tr('errCouldNotUpdateBoard'), 'error');
        }
    }

    // Solo una placa a la vez puede ser el sensor ambiente del taller --
    // el backend ya hace cumplir esto (set_ambient_sensor_board desmarca
    // cualquier otra), acá solo hay que reflejarlo en los demás checkboxes
    // sin esperar un refresco completo del panel.
    async function setAmbientSensorBoard(boardId, checked) {
        try {
            const result = await api('/api/accessories/arduino/ambient-sensor', {
                method: 'POST',
                body: new URLSearchParams({ board_id: checked ? boardId : '' }),
            });
            state.ambientSensorBoardId = result.board_id || null;
            root.querySelectorAll('[data-wsa-manageboard-ambient]').forEach(input => {
                input.checked = input.dataset.wsaManageboardAmbient === state.ambientSensorBoardId;
            });
        } catch (e) {
            toast(e.message || tr('errCouldNotUpdateBoard'), 'error');
            openManageBoardsPanel();
        }
    }

    async function deleteManageBoard(boardId) {
        const board = state.boards.find(b => b.id === boardId);
        if (!board) return;
        const confirmed = window.appConfirm
            ? await window.appConfirm(tr('confirmDeleteBoard', { name: board.name }), tr('deleteBoardTitle'))
            : window.confirm(tr('confirmDeleteBoardShort', { name: board.name }));
        if (!confirmed) return;
        try {
            await api(`/api/accessories/arduino/boards/${boardId}`, { method: 'DELETE' });
            state.boards = state.boards.filter(b => b.id !== boardId);
            if (state.activeBoardId === boardId) {
                state.activeBoardId = state.boards[0]?.id || null;
                state.selectedPinKey = null;
            }
            toast(tr('boardDeleted'));
            if (state.boards.length) openManageBoardsPanel(); else closeManageBoardsPanel();
            render();
        } catch (e) {
            toast(e.message || tr('errCouldNotDeleteBoard'), 'error');
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
                        name: tr('mainWorkshopName'),
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
            toast(tr('errCouldNotLoadSavedBoards'), 'error');
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
            toast(tr('configApplied'));
            render();
        } catch (e) {
            toast(e.message || tr('errCouldNotSavePinConfig'), 'error');
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
            toast(tr('scanCompleteMsg', { assigned: summary.assigned, free: summary.free, conflictSuffix: summary.warnings ? tr('scanConflictSuffix', { count: summary.warnings }) : '' }), summary.warnings ? 'warning' : 'success');
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
            name: existing?.name || (info.device ? tr('usbBoardName', { device: info.device }) : tr('wifiBoardName', { host: info.hostname || info.ip })),
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
            toast(tr('modelDetectedMapSaveFailed'), 'error');
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
        if (!ip) return toast(tr('giveBoardIp'), 'error');
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
            toast(tr('fileUploadedOk', { name: file.name }));
        } catch (error) {
            toast(error.message, 'error');
        }
        state.wizard.uploading = false;
        render();
    }

    async function wizardFlash() {
        const { selectedPort, selectedBuild } = state.wizard;
        if (!selectedPort) return toast(tr('choosePortFirst'), 'error');
        if (!selectedBuild) return toast(tr('chooseBinaryFirst'), 'error');
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
                state.wizard.error = tr('flashDoneNoResponse');
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

    function moduleHtml() {
        return `
            <section id="arduino-accessories-section" class="view-section wsa-section" style="display:none">
                <header class="wsa-header wsa-dash-header">
                    <div class="wsa-header-icon">${icon(ICON_CPU, 34)}</div>
                    <div class="wsa-header-copy">
                        <h1>${tr('headerTitle')}</h1>
                        <span class="wsa-header-sub"><strong>NOPAL Labs</strong> · ${tr('headerSubtitle')}</span>
                    </div>
                    <span class="wsa-header-online" id="wsa-header-online"><span class="wsa-status-dot"></span>${tr('checkingStatus')}</span>
                    <div class="wsa-header-actions">
                        <button type="button" class="wsa-btn" id="wsa-docs-btn">${icon(ICON_BOOK, 15)}<span>${tr('docsBtn')}</span></button>
                        <button type="button" class="wsa-btn wsa-btn-accent" id="wsa-header-addboard-btn">${icon(ICON_PLUS, 15)}<span>${tr('addBoardBtn')}</span></button>
                        <button type="button" class="wsa-btn" id="wsa-scan-boards-btn">${icon(ICON_ZAP, 15)}<span>${tr('scanBtn')}</span></button>
                        <div class="wsa-card-menu">
                            <button type="button" class="wsa-btn-icon" id="wsa-more-menu-btn" title="${tr('moreOptions')}">${icon(ICON_MORE, 16)}</button>
                            <div class="wsa-card-menu-dropdown" id="wsa-more-menu" hidden>
                                <button type="button" id="wsa-manage-header-btn">${icon(ICON_LAYOUT, 14)}<span>${tr('manageBoardsTitle')}</span></button>
                                <button type="button" data-wsa-view="scenes">${icon(ICON_SCENE, 14)}<span>${tr('subScenes')}</span></button>
                                <button type="button" data-wsa-view="automations">${icon(ICON_ZAP, 14)}<span>${tr('subAutomations')}</span></button>
                            </div>
                        </div>
                    </div>
                    <button type="button" class="wsa-btn-icon" id="wsa-close-btn" title="${tr('closeTitle')}">${icon(ICON_CLOSE, 16)}</button>
                </header>

                <div class="wsa-layout">
                    <div class="wsa-content" id="wsa-content"></div>
                </div>

                <div class="wsa-panel-overlay" id="wsa-manageboards-panel" hidden>
                    <div class="wsa-panel-backdrop" data-wsa-close-manageboards></div>
                    <div class="wsa-panel-dialog wsa-manageboards-dialog">
                        <button type="button" class="wsa-manageboards-close" data-wsa-close-manageboards>×</button>
                        <img class="wsa-manageboards-cactus wsa-manageboards-cactus-left" src="/static/img/cactus1.png" alt="">
                        <img class="wsa-manageboards-cactus wsa-manageboards-cactus-right" src="/static/img/cactus2.png" alt="">
                        <div class="wsa-manageboards-header">
                            <div class="wsa-manageboards-hexagon">${icon(ICON_LAYOUT, 24)}</div>
                            <div class="wsa-manageboards-title-row">
                                <svg class="wsa-manageboards-trace" width="34" height="10" viewBox="0 0 44 12" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M44 6 H28 M28 6 L24 2 M24 2 H12 M12 2 V10 M12 10 H0"/></svg>
                                <h2>${tr('manageBoardsTitle')}</h2>
                                <svg class="wsa-manageboards-trace" width="34" height="10" viewBox="0 0 44 12" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M0 6 H16 M16 6 L20 2 M20 2 H32 M32 2 V10 M32 10 H44"/></svg>
                            </div>
                            <p>${tr('manageBoardsDesc')}</p>
                        </div>
                        <div class="wsa-manageboards-list" id="wsa-manageboards-list"></div>
                    </div>
                </div>

                <div class="wsa-panel-overlay" id="wsa-allscenes-panel" hidden>
                    <div class="wsa-panel-backdrop" data-wsa-close-allscenes></div>
                    <div class="wsa-panel-dialog wsa-manageboards-dialog">
                        <button type="button" class="wsa-manageboards-close" data-wsa-close-allscenes>×</button>
                        <div class="wsa-manageboards-header">
                            <div class="wsa-manageboards-hexagon">${icon(ICON_SCENE, 24)}</div>
                            <h2>${tr('allScenesTitle')}</h2>
                            <p>${tr('allScenesDesc')}</p>
                        </div>
                        <div id="wsa-allscenes-list"></div>
                    </div>
                </div>
            </section>`;
    }

    // Estado global del header -- "activo y conectado" si CUALQUIER placa
    // registrada está online ahora mismo (telemetry.online real o accesorio
    // emparejado, ver reconcileBoardConnections()), no solo la placa activa
    // del mapa de pines como antes.
    function renderHeaderStatus() {
        const online = state.boards.some(board => board.connected);
        const onlineEl = root.querySelector('#wsa-header-online');
        onlineEl.classList.toggle('is-online', online);
        onlineEl.innerHTML = `<span class="wsa-status-dot${online ? ' is-on' : ''}"></span>${online ? tr('activeAndConnected') : tr('noConnectionConfirmed')}`;
    }

    function switchWorkshopView(view) {
        state.view = view;
        state.selectedPinKey = null;
        render();
    }

    function closeHeaderMenu() {
        const menu = root.querySelector('#wsa-more-menu');
        if (menu) menu.hidden = true;
    }

    // ============================================================================
    // RENDER -- vistas
    // ============================================================================

    function renderContent() {
        const content = root.querySelector('#wsa-content');
        if (!state.wizard.checked) { content.innerHTML = viewWizardChecking(); return; }
        if (state.wizard.active) { content.innerHTML = viewWizard(); return; }
        if (state.view === 'overview') { content.innerHTML = viewDashboard(); return; }
        if (state.view === 'documentation') { content.innerHTML = viewDocumentation(); return; }
        let body = '';
        switch (state.view) {
            case 'pines': body = viewPinMap(); break;
            case 'scenes': body = viewScenes(); break;
            case 'leds': body = viewFilteredPins('led_ws2812,led_pwm', tr('subLeds'), tr('ledsFilteredSubtitle')); break;
            case 'relays': body = viewFilteredPins('relay', tr('subRelays'), tr('relaysFilteredSubtitle')); break;
            case 'sensors': body = viewFilteredPins('sensor_temp,sensor_smoke,sensor_door,i2c,adc', tr('subSensors'), tr('sensorsFilteredSubtitle')); break;
            case 'automations': body = viewAutomations(); break;
            default: body = '';
        }
        content.innerHTML = `<button type="button" class="wsa-btn wsa-back-to-dashboard" id="wsa-back-to-dashboard">← ${tr('backToPanel')}</button>${body}`;
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
            <p>${tr('wizardCheckingFirmware')}</p>
        </div></div>`;
    }

    function wizardDeviceInfoHtml(info) {
        const tiles = [
            info.chip ? [ICON_CPU, tr('wizardTileChip'), esc(info.chip)] : null,
            [ICON_ZAP, tr('wizardTileFirmware'), `v${esc(info.firmware || '—')}`],
            [ICON_TERMINAL, info.device ? tr('wizardTilePort') : tr('wizardTileIp'), esc(info.device || info.ip || '—')],
            [ICON_PLUG, tr('wizardTileRelays'), info.relays ?? '—'],
            [ICON_LED, tr('wizardTileLedPwm'), info.pwm_led ? tr('yesWord') : tr('noWord')],
            [ICON_LED, 'WS2812', info.ws2812 ? tr('wizardTileWs2812Yes', { count: info.ws2812_count || 0 }) : tr('noWord')],
        ].filter(Boolean);
        return `<div class="wsa-info-grid wsa-info-grid-device">${tiles.map(([iconBody, label, value]) =>
            `<div class="wsa-info-tile"><span class="wsa-info-tile-icon">${icon(iconBody, 15)}</span><div><label>${label}</label><strong>${value}</strong></div></div>`
        ).join('')}</div>`;
    }

    function viewWizard() {
        const w = state.wizard;
        const errorHtml = w.error ? `<p class="wsa-wizard-error">${esc(w.error)}</p>` : '';

        if (w.step === 'intro') {
            return `<div class="wsa-wizard"><div class="wsa-wizard-card">
                <div class="wsa-wizard-icon">${icon(ICON_CPU, 30)}</div>
                <h2>${tr('wizardIntroTitle')}</h2>
                <p>${tr('wizardIntroBody')}</p>
                <div class="wsa-wizard-actions">
                    <button type="button" class="wsa-btn wsa-btn-accent wsa-btn-block" id="wsa-wizard-search">${icon(ICON_ZAP, 15)}<span>${tr('wizardSearchUsb')}</span></button>
                    <button type="button" class="wsa-btn wsa-btn-block" id="wsa-wizard-wifi">${icon(ICON_ZAP, 15)}<span>${tr('wizardSearchWifi')}</span></button>
                    <button type="button" class="wsa-btn wsa-btn-block" id="wsa-wizard-manual">${tr('wizardAddManually')}</button>
                    <button type="button" class="wsa-btn wsa-btn-block" id="wsa-wizard-skip">${tr('wizardSkipIntro')}</button>
                </div>
            </div></div>`;
        }

        if (w.step === 'wifi' || w.step === 'wifi-probing') {
            if (w.step === 'wifi-probing') {
                return `<div class="wsa-wizard"><div class="wsa-wizard-card">
                    <div class="wsa-spinner"></div>
                    <p>${tr('wizardProbingConnection')}</p>
                </div></div>`;
            }
            return `<div class="wsa-wizard"><div class="wsa-wizard-card">
                <h2>${tr('wizardSearchWifi')}</h2>
                <p class="wsa-empty-note">${tr('wizardWifiHint')}</p>
                ${errorHtml}
                <label><span>${tr('wizardBoardIp')}</span><input type="text" id="wsa-wizard-wifi-ip" placeholder="192.168.1.50"></label>
                <label><span>${tr('wizardOtaUser')}</span><input type="text" id="wsa-wizard-wifi-user" placeholder="nopal"></label>
                <label><span>${tr('wizardOtaPassword')}</span><input type="password" id="wsa-wizard-wifi-pass"></label>
                <div class="wsa-wizard-actions">
                    <button type="button" class="wsa-btn wsa-btn-accent wsa-btn-block" id="wsa-wizard-wifi-probe">${icon(ICON_ZAP, 15)}<span>${tr('wizardTestConnection')}</span></button>
                    <button type="button" class="wsa-btn wsa-btn-block" id="wsa-wizard-restart">← ${tr('wizardBack')}</button>
                </div>
            </div></div>`;
        }

        if (w.step === 'searching') {
            return `<div class="wsa-wizard"><div class="wsa-wizard-card">
                <div class="wsa-spinner"></div>
                <p>${tr('wizardSearchingUsb')}</p>
            </div></div>`;
        }

        if (w.step === 'identify') {
            const info = w.pendingBoardInfo || {};
            return `<div class="wsa-wizard"><div class="wsa-wizard-card">
                <h2>${tr('wizardIdentifyTitle')}</h2>
                <p class="wsa-empty-note">${tr('wizardIdentifyBody')}</p>
                ${wizardDeviceInfoHtml(info)}
                <label><span>${tr('wizardModelLabel')}</span><select id="wsa-wizard-identify-model">${BOARD_CATALOG.map(b => `<option value="${b.id}">${esc(b.label)}</option>`).join('')}</select></label>
                <div class="wsa-wizard-actions">
                    <button type="button" class="wsa-btn wsa-btn-accent wsa-btn-block" id="wsa-wizard-identify-use">${tr('wizardUsePinMap')}</button>
                    <button type="button" class="wsa-btn wsa-btn-block" id="wsa-wizard-restart">${tr('wizardBack')}</button>
                </div>
            </div></div>`;
        }

        if (w.step === 'manual') {
            return `<div class="wsa-wizard"><form class="wsa-wizard-card" id="wsa-wizard-manual-form">
                <h2>${tr('wizardManualTitle')}</h2>
                <p class="wsa-empty-note">${tr('wizardManualBody')}</p>
                <label><span>${tr('wizardModelLabel')}</span><select id="wsa-wizard-manual-model">${BOARD_CATALOG.map(b => `<option value="${b.id}">${esc(b.label)}</option>`).join('')}</select></label>
                <label><span>${tr('wizardNicknameLabel')}</span><input type="text" id="wsa-wizard-manual-name" maxlength="40" placeholder="${tr('wizardNicknamePlaceholder')}"></label>
                <div class="wsa-wizard-actions">
                    <button type="button" class="wsa-btn wsa-btn-accent wsa-btn-block" id="wsa-wizard-manual-add">${tr('wizardAddWithMap')}</button>
                    <button type="button" class="wsa-btn wsa-btn-block" id="wsa-wizard-restart">${tr('wizardBack')}</button>
                </div>
            </form></div>`;
        }

        if (w.step === 'found') {
            return `<div class="wsa-wizard"><div class="wsa-wizard-card">
                <div class="wsa-wizard-icon wsa-wizard-icon-ok">${icon(ICON_CHECK, 30)}</div>
                <h2>${tr('wizardFoundTitle')}</h2>
                ${wizardDeviceInfoHtml(w.foundBoard?.deviceInfo || {})}
                <div class="wsa-wizard-actions">
                    <button type="button" class="wsa-btn wsa-btn-accent wsa-btn-block" id="wsa-wizard-finish">${icon(ICON_CHECK, 15)}<span>${tr('wizardContinueToPanel')}</span></button>
                </div>
            </div></div>`;
        }

        if (w.step === 'notfound') {
            return `<div class="wsa-wizard"><div class="wsa-wizard-card">
                <h2>${tr('wizardNotFoundTitle')}</h2>
                <p class="wsa-empty-note">${tr('wizardNotFoundBody')}</p>
                ${errorHtml}
                <div class="wsa-wizard-actions">
                    <button type="button" class="wsa-btn wsa-btn-block" id="wsa-wizard-search">${icon(ICON_ZAP, 15)}<span>${tr('wizardRetryUsb')}</span></button>
                    <button type="button" class="wsa-btn wsa-btn-block" id="wsa-wizard-wifi">${icon(ICON_ZAP, 15)}<span>${tr('wizardSearchWifi')}</span></button>
                    <button type="button" class="wsa-btn wsa-btn-accent wsa-btn-block" id="wsa-wizard-ports">${icon(ICON_ZAP, 15)}<span>${tr('wizardFlashNow')}</span></button>
                    <button type="button" class="wsa-btn wsa-btn-block" id="wsa-wizard-skip">${tr('wizardSkipForNow')}</button>
                </div>
            </div></div>`;
        }

        if (w.step === 'ports') {
            return `<div class="wsa-wizard"><div class="wsa-wizard-card wsa-wizard-card-wide">
                <h2>${tr('wizardFlashTitle')}</h2>
                <p class="wsa-empty-note">${tr('wizardFlashBody')}</p>
                ${errorHtml}
                <div class="wsa-param-title">${tr('wizardPortLabel')}</div>
                ${w.ports.length ? w.ports.map(p => `
                    <label class="wsa-wizard-radio-row"><input type="radio" name="wsa-wizard-port" value="${esc(p.device)}" ${w.selectedPort === p.device ? 'checked' : ''}><span><strong>${esc(p.device)}</strong><small>${esc(p.chip || '')} ${esc(p.description || '')}</small></span></label>`).join('')
                    : `<p class="wsa-empty">${tr('wizardNoPortsFound')}</p>`}
                <div class="wsa-param-title">${tr('wizardBinaryLabel')}</div>
                <label><span>${tr('wizardUploadNew')}</span><input type="file" id="wsa-wizard-file" accept=".bin" ${w.uploading ? 'disabled' : ''}></label>
                ${w.builds.length ? w.builds.map(b => `
                    <label class="wsa-wizard-radio-row"><input type="radio" name="wsa-wizard-build" value="${esc(b.filename)}" ${w.selectedBuild === b.filename ? 'checked' : ''}><span>${esc(b.filename)}</span></label>`).join('')
                    : `<p class="wsa-empty">${tr('wizardNoBuildsUploaded')}</p>`}
                <div class="wsa-wizard-actions">
                    <button type="button" class="wsa-btn wsa-btn-accent wsa-btn-block" id="wsa-wizard-flash">${icon(ICON_ZAP, 15)}<span>${tr('wizardFlashBtn')}</span></button>
                    <button type="button" class="wsa-btn wsa-btn-block" id="wsa-wizard-restart">← ${tr('wizardBack')}</button>
                </div>
            </div></div>`;
        }

        if (w.step === 'flashing') {
            return `<div class="wsa-wizard"><div class="wsa-wizard-card">
                <div class="wsa-spinner"></div>
                <p>${tr('wizardFlashing')}</p>
            </div></div>`;
        }

        if (w.step === 'success') {
            return `<div class="wsa-wizard"><div class="wsa-wizard-card">
                <div class="wsa-wizard-icon wsa-wizard-icon-ok">${icon(ICON_CHECK, 30)}</div>
                <h2>${tr('wizardFlashSuccessTitle')}</h2>
                ${wizardDeviceInfoHtml(w.foundBoard?.deviceInfo || {})}
                <div class="wsa-wizard-actions">
                    <button type="button" class="wsa-btn wsa-btn-accent wsa-btn-block" id="wsa-wizard-finish">${icon(ICON_CHECK, 15)}<span>${tr('wizardGoToPanel')}</span></button>
                </div>
            </div></div>`;
        }

        return '';
    }

    // ============================================================================
    // PANEL PRINCIPAL -- barra de stats, galería de placas, vista rápida de
    // la placa seleccionada y acciones rápidas. Todo agregado a partir de
    // pinSummary() (pines realmente asignados) + state.boardTelemetry
    // (última telemetría real probada) + state.activity (eventos reales) --
    // ver tabla de decisiones del plan, nada de esto es inventado.
    // ============================================================================

    function boardAccessories(board) {
        if (!board) return [];
        return state.accessories.filter(item => {
            const config = item.config || {};
            return (board.ip && config.ip === board.ip) || (board.device && config.device === board.device);
        });
    }

    function boardLiveTelemetry(board) {
        return state.boardTelemetry.find(item => String(item.id) === String(board?.id));
    }

    // "Con advertencia" = pines con función duplicada en el mapa (dato ya
    // calculado por pinSummary) o señal WiFi débil reportada de verdad
    // (rssi <= -70 dBm). No existe un flag de advertencia en el backend --
    // ver tabla de decisiones del plan.
    function dashboardBoardWarning(summary, live) {
        if (summary.warnings > 0) return { warn: true, reason: tr('warnReasonPins') };
        const rssi = live?.telemetry?.rssi;
        if (live?.online && rssi != null && Number(rssi) <= -70) return { warn: true, reason: tr('warnReasonSignal') };
        return { warn: false, reason: '' };
    }

    function activityActionLabel(action) {
        const labels = { power_on: tr('actPowerOn'), power_off: tr('actPowerOff'), led_color: tr('actLedColor'), scene_run: tr('actSceneRun'), registered: tr('actRegistered'), removed: tr('actRemoved') };
        return labels[action] || action || '';
    }

    function boardLatestActivityLine(board) {
        const ids = new Set(boardAccessories(board).map(item => item.id));
        if (!ids.size) return '';
        const event = state.activity.find(item => ids.has(item.accessory_id));
        if (!event) return '';
        const tone = event.action === 'power_on' || event.action === 'scene_run' ? 'is-on' : (event.action === 'power_off' ? 'is-off' : 'is-info');
        return `<span class="wsa-board-activity-dot ${tone}"></span>${esc(event.name)} · ${esc(activityActionLabel(event.action))}`;
    }

    function dashboardStats() {
        const stats = { totalBoards: state.boards.length, connectedBoards: 0, warningBoards: 0, relays: 0, leds: 0, sensors: 0, freePins: 0, totalPins: 0, bestRssi: null, maxUptime: 0 };
        state.boards.forEach(board => {
            const summary = pinSummary(board);
            const live = boardLiveTelemetry(board);
            const info = live?.telemetry || {};
            if (board.connected) stats.connectedBoards++;
            if (dashboardBoardWarning(summary, live).warn) stats.warningBoards++;
            stats.relays += summary.byCategory.relay || 0;
            stats.leds += (summary.byCategory.led_ws2812 || 0) + (summary.byCategory.led_pwm || 0);
            stats.sensors += (summary.byCategory.sensor_temp || 0) + (summary.byCategory.sensor_smoke || 0) + (summary.byCategory.sensor_door || 0) + (summary.byCategory.i2c || 0) + (summary.byCategory.adc || 0);
            stats.freePins += summary.free;
            stats.totalPins += summary.total;
            if (live?.online && info.rssi != null && (stats.bestRssi === null || Number(info.rssi) > stats.bestRssi)) stats.bestRssi = Number(info.rssi);
            if (live?.online && info.uptime_ms) stats.maxUptime = Math.max(stats.maxUptime, Number(info.uptime_ms));
        });
        return stats;
    }

    function sortedDashboardBoards() {
        const boards = [...state.boards];
        if (state.boardsSort === 'status') {
            boards.sort((a, b) => Number(b.connected) - Number(a.connected));
        } else if (state.boardsSort === 'signal') {
            const rssiOf = board => { const info = boardLiveTelemetry(board)?.telemetry; return info?.rssi != null ? Number(info.rssi) : -999; };
            boards.sort((a, b) => rssiOf(b) - rssiOf(a));
        } else {
            boards.sort((a, b) => a.name.localeCompare(b.name));
        }
        return boards;
    }

    function boardCardHtml(board) {
        const entry = catalogEntry(board.catalogId);
        const live = boardLiveTelemetry(board);
        const info = live?.telemetry || board.deviceInfo || {};
        const summary = pinSummary(board);
        const warning = dashboardBoardWarning(summary, live);
        const online = Boolean(live?.online || board.connected);
        const statusClass = warning.warn ? 'is-warning' : (online ? 'is-online' : 'is-offline');
        const statusLabel = warning.warn ? tr('boardStatusWarning') : (online ? tr('boardStatusOnline') : tr('boardStatusOffline'));
        const relayCount = Number(info.relays || summary.byCategory.relay || 0);
        const ledCount = Number(info.ws2812_count || (summary.byCategory.led_ws2812 || 0) + (summary.byCategory.led_pwm || 0));
        const sensorCount = (summary.byCategory.sensor_temp || 0) + (summary.byCategory.sensor_smoke || 0) + (summary.byCategory.sensor_door || 0) + (summary.byCategory.i2c || 0) + (summary.byCategory.adc || 0);
        const activityLine = boardLatestActivityLine(board);
        return `<article class="wsa-board-card ${statusClass}${board.id === state.activeBoardId ? ' is-selected' : ''}" data-wsa-board="${esc(board.id)}">
            <div class="wsa-board-card-media">${boardImageHtml(board.catalogId, 6)}</div>
            <div class="wsa-board-card-head">
                <div><strong>${esc(board.name)}</strong><small>${esc(entry?.label || board.catalogId || '—')}</small></div>
                <span class="wsa-status-pill wsa-status-pill-${statusClass}" title="${esc(warning.reason)}">${warning.warn ? icon(ICON_WARNING, 12) : ''}${statusLabel}</span>
            </div>
            <div class="wsa-board-card-meta">
                <span>${icon(board.ip ? ICON_WIFI : ICON_PLUG, 13)}${esc(board.ip || board.device || '—')}</span>
                ${board.ip ? `<span>${icon(ICON_WIFI, 13)}${info.rssi != null ? `${esc(info.rssi)} dBm` : '—'}</span>` : ''}
                <span>${info.firmware ? `FW v${esc(info.firmware)}` : `FW —`}</span>
            </div>
            ${activityLine ? `<div class="wsa-board-card-activity">${activityLine}</div>` : ''}
            <div class="wsa-board-card-stats">
                <div><strong>${relayCount}</strong><span>${tr('subRelays')}</span></div>
                <div><strong>${ledCount}</strong><span>LEDs</span></div>
                <div><strong>${sensorCount}</strong><span>${tr('subSensors')}</span></div>
                <div><strong>${summary.free}/${summary.total}</strong><span>${tr('freePinsLabel')}</span></div>
            </div>
            <div class="wsa-board-card-actions">
                <button type="button" class="wsa-btn wsa-btn-small" data-wsa-card-edit="${esc(board.id)}">${icon(ICON_GEAR, 12)}<span>${tr('editBtn')}</span></button>
                <button type="button" class="wsa-btn wsa-btn-small" data-wsa-card-pins="${esc(board.id)}">${icon(ICON_GRID, 12)}<span>${tr('subPines')}</span></button>
                <button type="button" class="wsa-btn wsa-btn-small" data-wsa-card-actions="${esc(board.id)}">${icon(ICON_ZAP, 12)}<span>${tr('quickActions')}</span></button>
                <button type="button" class="wsa-btn wsa-btn-small" data-wsa-card-duplicate="${esc(board.id)}">${icon(ICON_COPY, 12)}<span>${tr('duplicateBtn')}</span></button>
                <button type="button" class="wsa-btn wsa-btn-small wsa-btn-icon-danger" data-wsa-card-delete="${esc(board.id)}">${icon(ICON_CLOSE, 12)}<span>${tr('deleteTitle')}</span></button>
            </div>
        </article>`;
    }

    function quickViewTabsDef(summary) {
        return [
            ['summary', tr('quickTabSummary')],
            ['relays', `${tr('subRelays')} (${summary.byCategory.relay || 0})`],
            ['lights', `LEDs (${(summary.byCategory.led_ws2812 || 0) + (summary.byCategory.led_pwm || 0)})`],
            ['sensors', `${tr('subSensors')} (${(summary.byCategory.sensor_temp || 0) + (summary.byCategory.sensor_smoke || 0) + (summary.byCategory.sensor_door || 0) + (summary.byCategory.i2c || 0) + (summary.byCategory.adc || 0)})`],
            ['inputs', tr('tabInputs')],
            ['free', `${tr('quickTabFree')} (${summary.free})`],
        ];
    }

    function quickViewTabContent(board, summary, info, live) {
        if (state.workshopLoading) return `<div class="wsa-classic-loading"><div class="wsa-spinner"></div><span>${tr('readingBoard')}</span></div>`;
        const relays = boardAccessories(board).filter(item => item.config?.relay != null || (item.kind !== 'led_strip' && !item.config?.led_mode));
        const leds = boardAccessories(board).filter(item => item.kind === 'led_strip' || item.config?.led_mode);
        if (state.overviewTab === 'summary') {
            const entries = [...visiblePinEntries(board, 'left'), ...visiblePinEntries(board, 'right')].filter(({ pin }) => !['free', 'power', 'ground'].includes(pin.category));
            if (!entries.length) return `<p class="wsa-empty">${tr('firmwareNoPinsThisSide')}</p>`;
            return `<div class="wsa-quickview-pinlist">${entries.map(({ pin }) => { const cat = categoryInfo(pin.category); return `<div><span class="wsa-pin-chip" style="background:${cat.color}22;color:${cat.color};border-color:${cat.color}55">${esc(pin.gpio)}</span><span>${esc(pin.label)}</span><em>${esc(cat.label)}</em></div>`; }).join('')}</div>`;
        }
        if (state.overviewTab === 'relays') {
            const count = Math.max(relays.length, Number(info.relays || 0));
            if (!count) return `<div class="wsa-classic-empty">${tr('boardNoRelaysReported')}</div>`;
            const relaysByNumber = {};
            relays.forEach(item => { const relayNumber = Number(item.config?.relay); if (relayNumber) relaysByNumber[relayNumber] = item; });
            return `<div class="wsa-classic-relays">${Array.from({ length: count }, (_, index) => {
                const slotNumber = index + 1;
                const item = relaysByNumber[slotNumber];
                return `<article>${icon(ICON_PLUG, 22)}<p><strong>${esc(item?.name || tr('relayNumber', { n: slotNumber }))}</strong><span>${item ? esc(item.kind || tr('outputNumber', { n: slotNumber })) : tr('notRegisteredInNopal')}</span></p>${item ? `<label class="wsa-switch"><input type="checkbox" data-wsa-workshop-power="${esc(item.id)}" ${item.on ? 'checked' : ''} ${item.on === null ? 'disabled' : ''}><span></span></label>` : `<span class="wsa-classic-unassigned" data-wsa-relay-configure="${slotNumber}">${tr('configureBtn')}</span>`}</article>`;
            }).join('')}</div><footer class="wsa-classic-control-footer"><span><i class="on"></i>${tr('activeCount', { count: relays.filter(item => item.on).length })}</span><span>${tr('inactiveCount', { count: Math.max(0, count - relays.filter(item => item.on).length) })}</span><button type="button" class="wsa-btn" id="wsa-workshop-add-accessory">${tr('editRelays')}</button></footer>`;
        }
        if (state.overviewTab === 'lights') return workshopLightsPanel(leds);
        if (state.overviewTab === 'sensors') return workshopSensorsPanel(board, info, live);
        if (state.overviewTab === 'inputs') return `<div class="wsa-classic-telemetry"><article><span>${tr('inputLabel')}</span><strong>GPIO${esc(info.adc_gpio || '—')} · ADC1</strong><small>${tr('wifiCompatible')}</small></article><article><span>${tr('rawReading')}</span><strong>${info.a0_raw ?? '—'}</strong><small>12 bits · 0–4095</small></article><article><span>${tr('percentageLabel')}</span><strong>${info.a0_percent != null ? `${esc(info.a0_percent)}%` : '—'}</strong><small>${tr('ofAdcRange')}</small></article><article><span>${tr('transportLabel')}</span><strong>${esc(live?.transport?.toUpperCase() || (board.ip ? 'WIFI' : 'USB'))}</strong><small>${esc(board.ip || board.device || tr('notConfiguredMasc'))}</small></article></div>`;
        if (state.overviewTab === 'free') {
            const freeEntries = [...visiblePinEntries(board, 'left'), ...visiblePinEntries(board, 'right')].filter(({ pin }) => pin.category === 'free');
            if (!freeEntries.length) return `<p class="wsa-empty">${tr('noFreePinsLabel')}</p>`;
            return `<div class="wsa-quickview-pinlist">${freeEntries.map(({ pin }) => `<div><span class="wsa-pin-chip">${esc(pin.gpio)}</span><span>${esc(pin.label)}</span></div>`).join('')}</div>`;
        }
        return '';
    }

    function quickViewPanelHtml(board) {
        if (!board) return `<section class="wsa-card wsa-quickview"><h2>${icon(ICON_LAYOUT, 17)}${tr('quickViewTitle')}</h2><p class="wsa-empty">${tr('noBoardsAddedYet')}</p></section>`;
        const live = boardLiveTelemetry(board);
        const info = live?.telemetry || board.deviceInfo || {};
        const online = Boolean(live?.online || board.connected);
        const summary = pinSummary(board);
        if (!['summary', 'relays', 'lights', 'sensors', 'inputs', 'free'].includes(state.overviewTab)) state.overviewTab = 'summary';
        const tabs = quickViewTabsDef(summary);
        return `<section class="wsa-card wsa-quickview">
            <div class="wsa-card-title-row"><h2>${icon(ICON_LAYOUT, 17)}${tr('quickViewTitle')}</h2><span class="wsa-status-pill">${esc(board.name)}</span></div>
            <div class="wsa-quickview-body">
                <div class="wsa-quickview-media">
                    ${boardImageHtml(board.catalogId, 8)}
                    <span class="wsa-quickview-state"><span class="wsa-status-dot${online ? ' is-on' : ''}"></span>${online ? tr('connectedState') : tr('noResponse')}</span>
                    <span class="wsa-text-muted">${tr('signalLabel')} ${info.rssi != null ? `${esc(info.rssi)} dBm` : '—'}</span>
                </div>
                <div class="wsa-quickview-main">
                    <nav class="wsa-classic-tabs">${tabs.map(([id, label]) => `<button type="button" class="${state.overviewTab === id ? 'active' : ''}" data-wsa-overview-tab="${id}">${label}</button>`).join('')}</nav>
                    <div class="wsa-quickview-content">${quickViewTabContent(board, summary, info, live)}</div>
                </div>
            </div>
            <div class="wsa-quickview-footer">
                <button type="button" class="wsa-btn" id="wsa-workshop-refresh">${icon(ICON_REFRESH, 14)}<span>${tr('restartBoardBtn')}</span></button>
                <button type="button" class="wsa-btn wsa-btn-accent" data-wsa-card-pins="${esc(board.id)}">${icon(ICON_GRID, 14)}<span>${tr('viewFullMapBtn')}</span></button>
            </div>
        </section>`;
    }

    // Doble/múltiple: qué estado quedó activo la última vez que se corrió
    // (persistido en el propio scene, no inferido acá) -- vacío en modo
    // normal, que no tiene "estado", siempre hace lo mismo.
    function sceneStateBadge(scene) {
        if (scene.mode === 'normal' || !scene.current_state_name) return '';
        return `<small class="wsa-scene-state-badge">${esc(scene.current_state_name)}</small>`;
    }

    function recentScenesHtml(limit) {
        const runs = state.scenes
            .map(scene => ({ scene, event: state.activity.find(item => item.accessory_id === `scene:${scene.id}`) }))
            .filter(item => item.event)
            .sort((a, b) => b.event.timestamp - a.event.timestamp);
        const list = limit ? runs.slice(0, limit) : runs;
        if (!list.length) return `<p class="wsa-empty">${tr('noScenesRunYet')}</p>`;
        return `<div class="wsa-scene-list">${list.map(({ scene, event }) => `<div class="wsa-scene-row">
            <button type="button" class="wsa-btn" data-wsa-workshop-scene="${esc(scene.id)}">${icon(ICON_ZAP, 14)}${esc(scene.name)}${sceneStateBadge(scene)}</button>
            <small class="wsa-text-muted">${tr('lastRunLabel')}: ${formatRelativeTime(event.timestamp)}</small>
            <button type="button" class="wsa-card-menu-btn" data-wsa-scene-edit="${esc(scene.id)}" title="${tr('editSceneTitle')}">${icon(ICON_GEAR, 14)}</button>
        </div>`).join('')}</div>`;
    }

    function quickActionsPanelHtml() {
        const quickScenes = state.scenes.slice(0, 2);
        return `<section class="wsa-card wsa-quickactions" id="wsa-quickactions-anchor">
            <h2>${icon(ICON_ZAP, 17)}${tr('quickActionsAutomationsTitle')}</h2>
            <div class="wsa-quickactions-block">
                <h3>${tr('quickActionsSubtitle')}</h3>
                <div class="wsa-quickactions-grid">
                    ${quickScenes.map(scene => `<button type="button" class="wsa-btn" data-wsa-workshop-scene="${esc(scene.id)}">${icon(ICON_ZAP, 14)}<span>${esc(scene.name)}</span>${sceneStateBadge(scene)}</button>`).join('')}
                    <button type="button" class="wsa-btn" id="wsa-test-relays-btn">${icon(ICON_PLUG, 14)}<span>${tr('testRelaysBtn')}</span></button>
                    <button type="button" class="wsa-btn" id="wsa-test-leds-btn">${icon(ICON_LED, 14)}<span>${tr('testLedsBtn')}</span></button>
                    <button type="button" class="wsa-btn" id="wsa-test-connection-btn">${icon(ICON_REFRESH, 14)}<span>${tr('restartBoardBtn')}</span></button>
                    <button type="button" class="wsa-btn" id="wsa-sync-btn">${icon(ICON_REFRESH, 14)}<span>${tr('syncBtn')}</span></button>
                </div>
            </div>
            <div class="wsa-card-title-row"><h3>${tr('recentScenesTitle')}</h3><button type="button" class="wsa-btn wsa-btn-small" id="wsa-scenes-viewall">${tr('viewAllBtn')}</button></div>
            ${recentScenesHtml(3)}
        </section>`;
    }

    function resourcesFooterHtml() {
        const links = [
            { iconBody: ICON_BOOK, title: tr('resQuickGuideTitle'), sub: tr('resQuickGuideSub'), action: 'docs-start' },
            { iconBody: ICON_TERMINAL, title: tr('resApiTitle'), sub: tr('resApiSub'), action: 'docs-commands' },
            { iconBody: ICON_ZAP, title: tr('resHaTitle'), sub: tr('resHaSub'), action: 'docs-ha' },
            { iconBody: ICON_CPU, title: tr('resFirmwareTitle'), sub: tr('resFirmwareSub'), action: 'docs-services' },
            { iconBody: ICON_ACTIVITY, title: tr('resDiagnosticsTitle'), sub: tr('resDiagnosticsSub'), action: 'diagnostics' },
        ];
        return `<section class="wsa-resources-footer">
            <h2>${tr('resourcesTitle')}</h2>
            <div class="wsa-resources-grid">${links.map(link => `<button type="button" class="wsa-resource-link" data-wsa-resource="${link.action}">${icon(link.iconBody, 20)}<div><strong>${esc(link.title)}</strong><small>${esc(link.sub)}</small></div></button>`).join('')}</div>
        </section>`;
    }

    function viewDashboard() {
        const stats = dashboardStats();
        const board = activeBoard();
        return `<div class="wsa-dashboard">
            <div class="wsa-dash-statbar">
                <div class="wsa-dash-stat">${icon(ICON_CPU, 20)}<strong>${stats.totalBoards}</strong><span>${tr('connectedBoardsLabel')}</span></div>
                <div class="wsa-dash-stat${stats.warningBoards ? ' is-warning' : ''}">${icon(ICON_WARNING, 20)}<strong>${stats.warningBoards}</strong><span>${tr('withWarningLabel')}</span></div>
                <div class="wsa-dash-stat">${icon(ICON_PLUG, 20)}<strong>${stats.relays}</strong><span>${tr('totalRelaysLabel')}</span></div>
                <div class="wsa-dash-stat">${icon(ICON_LED, 20)}<strong>${stats.leds}</strong><span>${tr('totalLedsLabel')}</span></div>
                <div class="wsa-dash-stat">${icon(ICON_THERMO, 20)}<strong>${stats.sensors}</strong><span>${tr('subSensors')}</span></div>
                <div class="wsa-dash-stat">${icon(ICON_GRID, 20)}<strong>${stats.freePins} / ${stats.totalPins}</strong><span>${tr('freePinsLabel')}</span></div>
                <div class="wsa-dash-stat">${icon(ICON_CLOCK, 20)}<strong>${stats.maxUptime ? formatDuration(stats.maxUptime) : '—'}</strong><span>${tr('networkUptimeLabel')}</span></div>
                <div class="wsa-dash-stat">${icon(ICON_WIFI, 20)}<strong>${stats.bestRssi != null ? `${stats.bestRssi} dBm` : '—'}</strong><span>${tr('wifiHealthLabel')}</span></div>
            </div>

            <section class="wsa-card wsa-dash-boards">
                <div class="wsa-card-title-row">
                    <h2>${icon(ICON_LAYOUT, 17)}${tr('connectedBoardsTitle')}<span class="wsa-status-pill">${stats.totalBoards}</span>${stats.warningBoards ? `<span class="wsa-status-pill wsa-status-pill-is-warning">${icon(ICON_WARNING, 11)} ${tr('withWarningCount', { count: stats.warningBoards })}</span>` : ''}</h2>
                    <div class="wsa-dash-boards-tools">
                        <label class="wsa-dash-sort"><span>${tr('sortLabel')}</span>
                            <select id="wsa-boards-sort">
                                <option value="name" ${state.boardsSort === 'name' ? 'selected' : ''}>${tr('sortByName')}</option>
                                <option value="status" ${state.boardsSort === 'status' ? 'selected' : ''}>${tr('sortByStatus')}</option>
                                <option value="signal" ${state.boardsSort === 'signal' ? 'selected' : ''}>${tr('sortBySignal')}</option>
                            </select>
                        </label>
                        <button type="button" class="wsa-btn-icon" id="wsa-boards-viewmode" title="${tr('toggleViewTitle')}">${icon(state.boardsViewMode === 'grid' ? ICON_LIST : ICON_GRID, 15)}</button>
                    </div>
                </div>
                <div class="wsa-board-grid${state.boardsViewMode === 'list' ? ' is-list' : ''}">
                    ${sortedDashboardBoards().map(boardCardHtml).join('') || `<p class="wsa-empty">${tr('noBoardsAddedYet')}</p>`}
                </div>
            </section>

            <div class="wsa-dash-lower">
                ${quickViewPanelHtml(board)}
                ${quickActionsPanelHtml()}
            </div>

            ${resourcesFooterHtml()}
        </div>`;
    }

    async function testBoardConnection(boardId) {
        await loadWorkshopData({ quiet: true });
        const board = state.boards.find(item => item.id === boardId);
        toast(board?.connected ? tr('boardConnectionOk', { name: board.name }) : tr('boardConnectionFailed', { name: board?.name || '' }), board?.connected ? 'success' : 'error');
        render();
    }

    // "Probar relés/LEDs" -- enciende cada accesorio real de la placa
    // seleccionada un momento y lo vuelve a apagar, en secuencia (no todos
    // a la vez) usando los mismos endpoints reales de encendido/color. No
    // existe un endpoint bulk de prueba en el backend.
    async function testWorkshopRelays(board) {
        const relays = boardAccessories(board).filter(item => item.config?.relay != null || (item.kind !== 'led_strip' && !item.config?.led_mode));
        if (!relays.length) return toast(tr('noRelaysToTest'), 'error');
        toast(tr('testingRelays', { count: relays.length }));
        for (const item of relays) {
            try {
                await api('/api/accessories/power', { method: 'POST', body: new URLSearchParams({ id: item.id, on: 'true' }) });
                await new Promise(resolve => setTimeout(resolve, 400));
                await api('/api/accessories/power', { method: 'POST', body: new URLSearchParams({ id: item.id, on: 'false' }) });
            } catch (error) { /* seguimos con el resto aunque uno falle */ }
        }
        await loadWorkshopData({ quiet: true });
        render();
    }

    async function testWorkshopLeds(board) {
        const leds = boardAccessories(board).filter(item => item.kind === 'led_strip' || item.config?.led_mode);
        if (!leds.length) return toast(tr('noLedsToTest'), 'error');
        toast(tr('testingLeds', { count: leds.length }));
        for (const item of leds) {
            try {
                await api('/api/accessories/led', { method: 'POST', body: new URLSearchParams({ id: item.id, r: 255, g: 255, b: 255 }) });
                await new Promise(resolve => setTimeout(resolve, 500));
                await api('/api/accessories/led', { method: 'POST', body: new URLSearchParams({ id: item.id, r: 0, g: 0, b: 0 }) });
            } catch (error) { /* seguimos con el resto aunque uno falle */ }
        }
        await loadWorkshopData({ quiet: true });
        render();
    }

    async function duplicateBoard(boardId) {
        const board = state.boards.find(item => item.id === boardId);
        const entry = board && catalogEntry(board.catalogId);
        if (!board || !entry) return toast(tr('errCouldNotAddBoard'), 'error');
        try {
            const created = await api('/api/accessories/arduino/boards', {
                method: 'POST',
                body: new URLSearchParams({ catalog_id: board.catalogId, name: tr('duplicatedBoardName', { name: board.name }), pins: JSON.stringify(board.pins) }),
            });
            state.boards.push({ id: created.id, catalogId: board.catalogId, name: created.name, pins: created.pins, connected: false, showAllPins: true });
            toast(tr('boardAdded', { name: created.name, label: entry.label }));
            render();
        } catch (error) {
            toast(error.message || tr('errCouldNotAddBoard'), 'error');
        }
    }

    function openAllScenesPanel() {
        root.querySelector('#wsa-allscenes-list').innerHTML = workshopScenesPanel();
        root.querySelector('#wsa-allscenes-panel').hidden = false;
    }

    function closeAllScenesPanel() {
        root.querySelector('#wsa-allscenes-panel').hidden = true;
    }

    function openDocsAnchor(anchorId) {
        switchWorkshopView('documentation');
        setTimeout(() => root.querySelector(`#${anchorId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    }

    async function runDiagnostics() {
        await loadWorkshopData();
        const stats = dashboardStats();
        toast(tr('diagnosticsResult', { online: stats.connectedBoards, total: stats.totalBoards, warnings: stats.warningBoards }));
    }

    function viewDocumentation() {
        const board = activeBoard();
        const entry = catalogEntry(board.catalogId);
        const pins = [...(board.pins?.left || []), ...(board.pins?.right || [])];
        const usedPins = pins.filter(pin => pin.firmwareDefault || !['free', 'power', 'ground'].includes(pin.category));
        return `<div class="wsa-docs">
            <header class="wsa-docs-hero">
                <div><span>${tr('docsEyebrow')}</span><h2>${tr('docsTitle', { name: esc(entry?.label || board.name) })}</h2><p>${tr('docsSubtitle')}</p></div>
                <button type="button" class="wsa-btn" id="wsa-docs-back">${tr('docsBackToPanel')}</button>
            </header>
            <nav><a href="#wsa-doc-start">${tr('docsNavQuickstart')}</a><a href="#wsa-doc-functions">${tr('docsNavFunctions')}</a><a href="#wsa-doc-pins">${tr('subPines')}</a><a href="#wsa-doc-safety">${tr('docsNavSafety')}</a><a href="#wsa-doc-services">${tr('docsNavServices')}</a><a href="#wsa-doc-commands">${tr('docsNavCommands')}</a></nav>
            <div class="wsa-docs-grid">
                <section id="wsa-doc-start" class="wsa-doc-card wsa-doc-wide"><small>01</small><h3>${tr('docsNavQuickstart')}</h3><ol><li><b>${tr('docsStep1Title')}</b><span>${tr('docsStep1Body')}</span></li><li><b>${tr('docsStep2Title')}</b><span>${tr('docsStep2Body')}</span></li><li><b>${tr('docsStep3Title')}</b><span>${tr('docsStep3Body', { profile: esc(entry?.label || '') })}</span></li><li><b>${tr('docsStep4Title')}</b><span>${tr('docsStep4Body')}</span></li></ol></section>
                <section id="wsa-doc-functions" class="wsa-doc-card wsa-doc-wide"><small>02</small><h3>${tr('docsFunctionsTitle')}</h3><div class="wsa-doc-features"><article><b>${tr('subRelays')}</b><span>${tr('docsFeatureRelays')}</span></article><article><b>${tr('docsFeatureLightingTitle')}</b><span>${tr('docsFeatureLighting')}</span></article><article><b>${tr('docsFeatureTelemetryTitle')}</b><span>${tr('docsFeatureTelemetry')}</span></article><article><b>${tr('docsFeatureScenesTitle')}</b><span>${tr('docsFeatureScenes')}</span></article><article><b>${tr('docsFeatureUsbWifiTitle')}</b><span>${tr('docsFeatureUsbWifi')}</span></article><article><b>${tr('docsFeatureAutoMapTitle')}</b><span>${tr('docsFeatureAutoMap')}</span></article></div></section>
                <section id="wsa-doc-pins" class="wsa-doc-card"><small>03</small><h3>${tr('subPines')} · ${esc(entry?.label || '')}</h3><div class="wsa-doc-pinlist">${usedPins.map(pin => `<div><code>${esc(pin.gpio)}</code><span>${esc(pin.label)}</span><em>${esc(PIN_CATEGORIES[pin.category]?.label || pin.category)}</em></div>`).join('') || `<p>${tr('docsNoAssignments')}</p>`}</div><button type="button" class="wsa-btn wsa-btn-block" id="wsa-docs-open-pinmap">${tr('docsOpenInteractiveMap')}</button></section>
                <section id="wsa-doc-safety" class="wsa-doc-card wsa-doc-warning"><small>04</small><h3>${tr('docsSafetyTitle')}</h3><ul><li>${tr('docsSafety1')}</li><li>${tr('docsSafety2')}</li><li>${tr('docsSafety3')}</li><li>${tr('docsSafety4')}</li><li>${tr('docsSafety5')}</li></ul></section>
                <section id="wsa-doc-services" class="wsa-doc-card"><small>05</small><h3>${tr('docsServicesTitle')}</h3><dl><dt>${tr('docsUsbDetection')}</dt><dd>${tr('docsUsbDetectionValue')}</dd><dt>${tr('docsSerialSpeed')}</dt><dd>115200 ${tr('docsBaud')}</dd><dt>${tr('docsWifiState')}</dt><dd>GET /api/status</dd><dt>${tr('docsHealthCheck')}</dt><dd>GET /health</dd><dt>${tr('docsUpdate')}</dt><dd>ElegantOTA / firmware USB</dd><dt>${tr('docsActiveBoard')}</dt><dd>${esc(board.ip || board.device || tr('docsNoConnectionConfigured'))}</dd></dl></section>
                <section id="wsa-doc-commands" class="wsa-doc-card"><small>06</small><h3>${tr('docsCommandsTitle')}</h3><div class="wsa-doc-commands"><code>NOPAL:ID?<span>${tr('docsCmdId')}</span></code><code>NOPAL:NET?<span>${tr('docsCmdNet')}</span></code><code>NOPAL:STATUS?<span>${tr('docsCmdStatus')}</span></code><code>NOPAL:R1:ON<span>${tr('docsCmdRelayOn')}</span></code><code>NOPAL:R1:OFF<span>${tr('docsCmdRelayOff')}</span></code><code>NOPAL:WS:255,80,0<span>${tr('docsCmdLedColor')}</span></code><code>NOPAL:SCENE:READY<span>${tr('docsCmdScene')}</span></code><code>NOPAL:ADC?<span>${tr('docsCmdAdc')}</span></code></div></section>
                <section id="wsa-doc-ha" class="wsa-doc-card"><small>07</small><h3>${tr('docsHaTitle')}</h3><p class="wsa-empty-note">${tr('docsHaBody')}</p><div class="wsa-doc-commands"><code>GET /api/accessories/status<span>${tr('docsHaStatus')}</span></code><code>POST /api/accessories/power<span>${tr('docsHaPower')}</span></code><code>POST /api/accessories/led<span>${tr('docsHaLed')}</span></code><code>POST /api/accessories/scenes/{id}/run<span>${tr('docsHaScene')}</span></code></div></section>
            </div>
        </div>`;
    }

    function workshopOverviewPanel(relays, leds, board, info, liveBoard) {
        if (state.workshopLoading) return `<div class="wsa-card wsa-workshop-loading"><div class="wsa-spinner"></div><p>${tr('loadingWorkshopState')}</p></div>`;
        if (state.overviewTab === 'relays') return workshopRelaysPanel(relays);
        if (state.overviewTab === 'lights') return workshopLightsPanel(leds);
        if (state.overviewTab === 'sensors') return workshopSensorsPanel(board, info, liveBoard);
        return workshopScenesPanel();
    }

    function workshopRelaysPanel(relays) {
        if (!relays.length) return `<div class="wsa-card wsa-workshop-empty"><h2>${icon(ICON_PLUG, 16)}${tr('workshopOutputsTitle')}</h2><p>${tr('noRelaysRegisteredYet')}</p><button type="button" class="wsa-btn wsa-btn-accent" id="wsa-workshop-add-accessory">${icon(ICON_PLUS, 14)}<span>${tr('addAccessory')}</span></button></div>`;
        return `<section class="wsa-card"><div class="wsa-card-title-row"><h2>${icon(ICON_PLUG, 16)}${tr('workshopOutputsTitle')}</h2><button type="button" class="wsa-btn wsa-btn-small" id="wsa-workshop-add-accessory">${icon(ICON_PLUS, 13)}<span>${tr('addWord')}</span></button></div>
            <div class="wsa-table-scroll"><table class="wsa-table wsa-workshop-table"><thead><tr><th>${tr('outputColumn')}</th><th>${tr('usageColumn')}</th><th>${tr('connectionLabel')}</th><th>${tr('subStateColumn')}</th></tr></thead><tbody>${relays.map(item => `<tr>
                <td><strong>${esc(item.name)}</strong></td><td>${esc(item.kind || tr('accessoryWord'))}</td>
                <td><code>${esc(item.config?.transport === 'wifi' ? item.config?.ip : (item.config?.device || item.driver))}</code>${item.config?.relay != null ? ` · R${esc(item.config.relay)}` : ''}</td>
                <td><div class="wsa-workshop-state-cell"><label class="wsa-switch"><input type="checkbox" data-wsa-workshop-power="${esc(item.id)}" ${item.on ? 'checked' : ''} ${item.on === null ? 'disabled' : ''}><span></span></label><small>${item.on === null ? tr('noResponse') : (item.on ? tr('onState') : tr('offState'))}</small></div></td>
            </tr>`).join('')}</tbody></table></div></section>`;
    }

    function workshopLightsPanel(leds) {
        if (!leds.length) return `<div class="wsa-card wsa-workshop-empty"><h2>${icon(ICON_LED, 16)}${tr('lightingTitle')}</h2><p>${tr('noLedStripsRegisteredYet')}</p><button type="button" class="wsa-btn wsa-btn-accent" id="wsa-workshop-add-accessory">${icon(ICON_PLUS, 14)}<span>${tr('addLedStrip')}</span></button></div>`;
        return `<div class="wsa-card-title-row wsa-workshop-light-toolbar"><h2>${icon(ICON_LED, 16)}${tr('registeredLighting')}</h2><button type="button" class="wsa-btn wsa-btn-accent" id="wsa-workshop-add-accessory">${icon(ICON_PLUS, 13)}${tr('addLedOrStrip')}</button></div><div class="wsa-workshop-led-grid">${leds.map(item => `<section class="wsa-card wsa-workshop-led">
            <div class="wsa-card-title-row">
                <div class="wsa-card-title-group"><h2>${icon(ICON_LED, 16)}${esc(item.name)}</h2><span class="wsa-status-pill">${esc((item.config?.led_mode || 'LED').toUpperCase())}</span></div>
                <div class="wsa-card-menu">
                    <button type="button" class="wsa-card-menu-btn" data-wsa-led-menu-toggle="${esc(item.id)}" aria-label="${tr('moreOptions')}">${icon(ICON_MORE, 15)}</button>
                    <div class="wsa-card-menu-dropdown" data-wsa-led-menu="${esc(item.id)}" hidden>
                        <button type="button" data-wsa-led-view="${esc(item.id)}">${icon(ICON_ACTIVITY, 14)}<span>${tr('viewDetails')}</span></button>
                        <button type="button" data-wsa-led-firmware="${esc(item.id)}">${icon(ICON_ZAP, 14)}<span>${tr('updateFirmware')}</span></button>
                        <button type="button" class="wsa-card-menu-danger" data-wsa-led-delete="${esc(item.id)}">${icon(ICON_CLOSE, 14)}<span>${tr('deleteTitle')}</span></button>
                    </div>
                </div>
            </div>
            <label><span>${tr('colorWord')}</span><input type="color" data-wsa-workshop-led-color="${esc(item.id)}" value="${rgbToHex(item.config?.led_color)}"></label>
            <button type="button" class="wsa-btn wsa-btn-accent" data-wsa-workshop-led-apply="${esc(item.id)}">${tr('applyColor')}</button>
            <div class="wsa-led-presets"><button type="button" data-wsa-led-preset="${esc(item.id)}:#000000">${tr('turnOffBtn')}</button><button type="button" data-wsa-led-preset="${esc(item.id)}:#ffffff">${tr('whiteWord')}</button><button type="button" data-wsa-led-preset="${esc(item.id)}:#22c55e">${tr('readyWord')}</button><button type="button" data-wsa-led-preset="${esc(item.id)}:#ef4444">${tr('alertWord')}</button></div>
            <small>${esc(item.config?.transport === 'wifi' ? item.config?.ip : (item.config?.device || tr('nopalBoardWord')))} · GPIO${esc(item.config?.gpio ?? '?')} · ${esc(item.config?.led_count || item.config?.ws2812_count || 1)} LED(s)</small>
        </section>`).join('')}</div>`;
    }

    // Minutos -> "3 h 40 min" / "45 min". El firmware ya omite el dato
    // cuando el ritmo de carga es demasiado chico para estimar algo, así
    // que acá nunca se inventa un tiempo: si no vino, no se muestra.
    function formatMinutes(total) {
        const mins = Math.max(0, Math.round(Number(total)));
        const hours = Math.floor(mins / 60);
        return hours ? `${hours} h ${mins % 60} min` : `${mins} min`;
    }

    // Valor principal de la ficha de batería: voltaje y, si el medidor lo
    // entrega, porcentaje de carga. Un SOC en 0 no se muestra como "0%"
    // porque el MAX17048 reporta justamente eso cuando su algoritmo se
    // queda atorado -- se leería como "batería vacía", que es otra cosa.
    function batteryValueText(info) {
        if (!info.battery_valid) return tr('notReported');
        const parts = [];
        if (info.battery_voltage_v != null) parts.push(`${Number(info.battery_voltage_v).toFixed(2)} V`);
        if (info.battery_soc_pct) parts.push(`${Number(info.battery_soc_pct).toFixed(0)}%`);
        return parts.length ? parts.join(' · ') : tr('notReported');
    }

    // Nota al pie: qué está haciendo la carga de la batería.
    //
    // A propósito NO dice "en batería" / "se fue la luz": el MAX17048 mide
    // flujo de carga en la celda, no presencia de corriente de pared, y no
    // puede distinguir las dos cosas. Con la batería llena, el TP4056 corta
    // la carga y la celda se relaja de 4.28 V hacia 4.1 V sola -- el
    // medidor lo reporta como descarga aunque el taller esté enchufado.
    // Afirmar un corte de luz ahí sería una falsa alarma.
    function batteryNoteText(info) {
        if (!info.battery_valid) return tr('batteryVoltageNote');
        if (info.battery_alert_reset) return tr('batteryResetAlert');

        // Doble llave con el firmware: éste ya omite battery_charging cuando
        // el ritmo no alcanza para afirmarlo, pero una placa con firmware
        // anterior lo manda siempre. Sin este filtro, un CRATE en 0 se
        // mostraba como "En batería" -- o sea "se fue la luz" -- en una
        // placa que estaba tranquilamente enchufada.
        const rate = Math.abs(Number(info.battery_crate_pct_hr ?? 0));
        const rateIsMeaningful = rate >= 0.5;

        const bits = [];
        if (rateIsMeaningful && info.battery_charging === true) bits.push(tr('batteryCharging'));
        else if (rateIsMeaningful && info.battery_charging === false) bits.push(tr('batteryDischarging'));

        if (rateIsMeaningful && info.battery_minutes_remaining != null) {
            const time = formatMinutes(info.battery_minutes_remaining);
            bits.push(info.battery_charging ? tr('batteryUntilFull', { time }) : tr('batteryUntilEmpty', { time }));
        }
        if (info.battery_hibernating) bits.push(tr('batteryHibernating'));

        return bits.length ? bits.join(' · ') : tr('batteryVoltageNote');
    }

    function workshopSensorsPanel(board, info, liveBoard) {
        const metrics = [
            [tr('boardConnectionLabel'), liveBoard?.online || board?.connected ? tr('onlineState') : tr('unconfirmedState'), board?.ip || board?.device || tr('notConfiguredFem')],
            [tr('latencyWord'), info.latency_ms != null ? `${info.latency_ms} ms` : tr('notReported'), tr('nopalHandshake')],
            [tr('freeMemory'), info.free_heap ? `${Math.round(info.free_heap / 1024)} KB` : tr('notReported'), tr('heapAvailable')],
            ['WiFi', info.wifi_connected ? tr('connectedState') : (info.wifi ? tr('availableState') : tr('notReportedMasc')), info.ip || board?.ip || tr('noIpWord')],
            [tr('uptimeWord'), info.uptime_ms ? `${Math.floor(info.uptime_ms / 3600000)} h` : tr('notReportedMasc'), tr('sinceLastRestart')],
            [tr('chipFirmware'), info.firmware || tr('notReportedMasc'), info.hostname || tr('nopalBoardWord')],
            [tr('inputAnalog'), info.a0_raw != null ? `${info.a0_raw} RAW` : tr('notReported'), info.a0_percent != null ? `${info.a0_percent}% · GPIO ${info.adc_gpio || '—'}` : 'ADC'],
            [tr('wifiSignal'), info.rssi ? `${info.rssi} dBm` : tr('notReported'), info.ssid || info.wifi_mode || tr('localNetwork')],
        ];
        // Solo si el firmware de esta placa reporta el bloque "dht" (ver
        // probe_wifi_board() en accessory_service.py) -- una placa vieja o
        // sin el sensor cableado simplemente no agrega esta fila, en vez
        // de mostrar un dato inventado.
        if (info.dht_enabled) {
            metrics.push([
                tr('dhtSensorLabel'),
                info.dht_valid ? `${Number(info.dht_temp_c).toFixed(1)}°C / ${Number(info.dht_humidity_pct).toFixed(1)}%` : tr('notReported'),
                `GPIO ${info.dht_pin}`,
            ]);
        }
        // Igual que el DHT11: solo las placas cuyo firmware monta
        // GET /api/power (medidor MAX17048 presente en el bus I2C) traen
        // este bloque -- ver _probe_wifi_battery() en accessory_service.py.
        // El voltaje es la lectura directa del chip; el porcentaje de carga
        // se omite si el medidor todavía no lo entrega, en vez de mostrar
        // un 0% que no significa "batería vacía".
        if (info.battery_valid != null) {
            metrics.push([tr('batteryLabel'), batteryValueText(info), batteryNoteText(info)]);
        }
        return `<section class="wsa-card"><div class="wsa-card-title-row"><h2>${icon(ICON_ACTIVITY, 16)}${tr('boardTelemetry')}</h2><small class="wsa-text-muted">${tr('lastRealHandshakeData')}</small></div>
            <div class="wsa-workshop-sensors">${metrics.map(([label, value, note]) => `<div><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(note)}</small></div>`).join('')}</div></section>`;
    }

    function workshopScenesPanel() {
        if (!state.scenes.length) return `<div class="wsa-card wsa-workshop-empty"><h2>${icon(ICON_SCENE, 16)}${tr('subScenes2')}</h2><p>${tr('createSceneHint')}</p><button type="button" class="wsa-btn wsa-btn-accent" id="wsa-scene-new">${icon(ICON_PLUS, 14)}<span>${tr('newSceneWord')}</span></button></div>`;
        return `<section class="wsa-card"><div class="wsa-card-title-row"><h2>${icon(ICON_SCENE, 16)}${tr('quickActions')}</h2><button type="button" class="wsa-btn wsa-btn-small wsa-btn-accent" id="wsa-scene-new">${icon(ICON_PLUS, 13)}<span>${tr('newSceneWord')}</span></button></div>
            <div class="wsa-workshop-scenes">${state.scenes.map(scene => `<div class="wsa-scene-card"><button type="button" class="wsa-btn" data-wsa-workshop-scene="${esc(scene.id)}">${icon(ICON_ZAP, 14)}<span>${esc(scene.name)}</span>${sceneStateBadge(scene)}<small>${tr('actionCount', { count: scene.actions?.length || 0 })}</small></button><button type="button" class="wsa-card-menu-btn" data-wsa-scene-edit="${esc(scene.id)}" title="${tr('editSceneTitle')}">${icon(ICON_GEAR, 14)}</button></div>`).join('')}</div></section>`;
    }

    function workshopLatestActivity() {
        const event = state.activity[0];
        if (!event) return tr('noRecentAccessoryActivity');
        const labels = { power_on: tr('actPowerOn'), power_off: tr('actPowerOff'), led_color: tr('actLedColor'), scene_run: tr('actSceneRun'), registered: tr('actRegistered'), removed: tr('actRemoved') };
        return tr('lastActivityLine', { name: esc(event.name), action: esc(labels[event.action] || event.action || ''), time: formatRelativeTime(event.timestamp) });
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
                    <button type="button" class="wsa-board-tab wsa-board-tab-add" id="wsa-addboard-btn">${icon(ICON_PLUS, 14)}<span>${tr('addBoardBtn')}</span></button>
                </div>
                <div class="wsa-boardbar-actions">
                    <button type="button" class="wsa-btn-icon" id="wsa-manageboards-btn" title="${tr('manageBoardsTitle')}">${icon(ICON_LAYOUT, 15)}</button>
                </div>
            </div>

            ${board.connected && board.deviceInfo ? cardWrap(tr('realBoardDataTitle', { transport: board.deviceInfo.device ? 'USB' : 'WiFi' }), ICON_CHECK, wizardDeviceInfoHtml(board.deviceInfo), 'wsa-card-verified') : ''}

            <div class="wsa-pinmap-grid">
                <div class="wsa-card wsa-pinmap-card">
                    <div class="wsa-card-title-row">
                        <h2>${icon(ICON_GRID, 16)}${tr('subPines')} · ${esc(entry?.label || '')}${board.connected ? ` <small class="wsa-connected-tag">${tr('boardConnectedTag')}</small>` : ''}</h2>
                        ${!entry?.firmwareVerified ? `<small class="wsa-note">${esc(entry?.note || tr('genericPinoutUnverified'))}</small>` : (entry?.note ? `<small class="wsa-text-muted">${esc(entry.note)}</small>` : '')}
                    </div>
                    <label class="wsa-showall-toggle"><input type="checkbox" id="wsa-showall-pins" ${board.showAllPins ? 'checked' : ''}><span></span> ${tr('showAllConnectorPins')}</label>
                    <div class="wsa-pin-columns">
                        <div class="wsa-pin-col">${leftEntries.map(({ pin, i }) => pinRowHtml(pin, 'left', i)).join('') || `<p class="wsa-empty">${tr('firmwareNoPinsThisSide')}</p>`}</div>
                        <div class="wsa-board-image">${boardImageHtml(board.catalogId, Math.max(leftEntries.length, rightEntries.length))}</div>
                        <div class="wsa-pin-col">${rightEntries.map(({ pin, i }) => pinRowHtml(pin, 'right', i)).join('') || `<p class="wsa-empty">${tr('firmwareNoPinsThisSide')}</p>`}</div>
                    </div>
                </div>
                <div class="wsa-card wsa-inspector-card" id="wsa-inspector">
                    <div class="wsa-card-title-row">
                        <h2>${icon(ICON_GEAR, 16)}${tr('pinInspectorTitle')}</h2>
                        <button type="button" class="wsa-btn wsa-btn-small" id="wsa-scan-btn" ${state.scanning ? 'disabled' : ''}>${icon(ICON_ZAP, 13)}<span>${state.scanning ? tr('scanningWord') : tr('scanPinsBtn')}</span></button>
                    </div>
                    <div id="wsa-inspector-body">${renderPinInspectorHtml()}</div>
                </div>
            </div>

            ${cardWrap(tr('rolesLegend'), ICON_GRID, `<div class="wsa-legend">${Object.entries(PIN_CATEGORIES).map(([id, cat]) => `<span class="wsa-legend-item"><i style="background:${cat.color}"></i>${esc(cat.label)}</span>`).join('')}</div>`)}

            <div class="wsa-grid-2">
                ${cardWrap(tr('pinSummaryTitle'), ICON_GRID, pinDonutHtml(summary))}
                ${cardWrap(tr('activeAssignmentsTitle'), ICON_CHECK, assignmentsChecklistHtml(summary))}
            </div>

            ${machinesInlineHtml()}

            ${cardWrap(tr('activeAutomationsTitle'), ICON_ZAP, rulesTableHtml(), 'wsa-span-full')}

            <div class="wsa-grid-2">
                ${cardWrap(tr('recentActivity'), ICON_ACTIVITY, renderActivityListHtml())}
                ${cardWrap(tr('systemStateTitle'), ICON_CPU, systemStatsHtml())}
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
            return `<p class="wsa-empty">${tr('selectPinToConfigure')}</p>`;
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
        // Los valores de "Modo"/"Estado inicial"/"Nivel lógico" (Salida,
        // Entrada, HIGH (Encendido), etc.) NO se traducen a propósito -- son
        // el string literal que applyPinConfig() manda y persiste tal cual
        // al backend real (board_pinmap_service.py), y este mismo código los
        // vuelve a comparar (common.mode === 'Entrada') para decidir qué
        // <option> marcar selected. Traducir el texto visible sin traducir
        // la comparación rompería la selección en cualquier idioma que no
        // sea español; mismo criterio que las opciones de PIN_CATEGORIES.
        return `
            <div class="wsa-inspector-title"><strong>${esc(pin.gpio)}</strong><span>#${pin.physical}</span></div>
            <p class="wsa-inspector-sub">${esc(pin.label)}</p>
            <label><span>${tr('assignedFunctionLabel')}</span>
                <select id="wsa-inspector-category" ${fixed ? 'disabled' : ''}>
                    ${Object.entries(PIN_CATEGORIES).filter(([id, c]) => !c.fixed || id === pin.category).map(([id, c]) => `<option value="${id}" ${id === displayCategoryId ? 'selected' : ''}>${esc(c.label)}</option>`).join('')}
                </select>
            </label>
            <div class="wsa-category-badge" style="color:${cat.color}"><span style="background:${cat.color}"></span>${esc(cat.label)}${dirty ? ` <em>(${tr('notAppliedYet')})</em>` : ''}</div>
            ${!fixed ? `
            <div class="wsa-inspector-common">
                <label><span>${tr('modeLabel')}</span><select data-wsa-common="mode"><option${common.mode === 'Entrada' ? '' : ' selected'}>Salida</option><option${common.mode === 'Entrada' ? ' selected' : ''}>Entrada</option></select></label>
                <label><span>${tr('initialStateLabel')}</span><select data-wsa-common="initialState"><option${common.initialState === 'HIGH (Encendido)' ? '' : ' selected'}>LOW (Apagado)</option><option${common.initialState === 'HIGH (Encendido)' ? ' selected' : ''}>HIGH (Encendido)</option></select></label>
                <label><span>${tr('logicLevelLabel')}</span><select data-wsa-common="logicLevel"><option${common.logicLevel === '5V' ? '' : ' selected'}>3.3V</option><option${common.logicLevel === '5V' ? ' selected' : ''}>5V</option></select></label>
                <label class="wsa-inline-toggle"><span>${tr('paramInvertOutput')}</span><label class="wsa-switch"><input type="checkbox" data-wsa-common="invertOutput"${common.invertOutput ? ' checked' : ''}><span></span></label></label>
            </div>` : `<p class="wsa-empty">${tr('fixedConnectorPin')}</p>`}
            ${paramsHtml ? `<div class="wsa-param-title">${tr('parametersTitle')}</div>${paramsHtml}` : ''}
            <button type="button" class="wsa-btn wsa-btn-accent wsa-btn-block" id="wsa-apply-pin" ${fixed ? 'disabled' : ''}>${icon(ICON_CHECK, 15)}<span>${tr('applyConfigBtn')}</span></button>`;
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
                <div class="wsa-donut" style="background: conic-gradient(${stops || 'var(--wsa-border) 0 100%'})"><span>${summary.total}<small>${tr('totalWord')}</small></span></div>
                <div class="wsa-donut-legend">${order.map(cat => `<span><i style="background:${categoryInfo(cat).color}"></i>${esc(categoryInfo(cat).label)} · ${summary.byCategory[cat]}</span>`).join('')}</div>
            </div>
            <div class="wsa-progress-row"><span>${tr('assignedWord')}</span><strong>${summary.assigned}/${summary.total}</strong></div>
            <div class="wsa-progress-bar"><div style="width:${(summary.assigned / total) * 100}%"></div></div>`;
    }

    function assignmentsChecklistHtml(summary) {
        const rows = [
            ['LEDs', (summary.byCategory.led_ws2812 || 0) + (summary.byCategory.led_pwm || 0)],
            [tr('subRelays'), summary.byCategory.relay || 0],
            [tr('subSensors'), (summary.byCategory.sensor_temp || 0) + (summary.byCategory.sensor_smoke || 0) + (summary.byCategory.sensor_door || 0)],
            [tr('communicationsWord'), (summary.byCategory.i2c || 0) + (summary.byCategory.uart || 0) + (summary.byCategory.spi || 0)],
        ];
        return `<div class="wsa-checklist">${rows.map(([label, n]) => `<div class="wsa-checklist-row"><span>${label}</span><strong>${n}</strong></div>`).join('')}</div>
            <div class="wsa-progress-row"><span>${tr('totalWord')}</span><strong>${summary.assigned}/${summary.total}</strong></div>
            <div class="wsa-progress-bar"><div style="width:${(summary.assigned / (summary.total || 1)) * 100}%"></div></div>`;
    }

    function renderActivityListHtml() {
        if (!ACTIVITY_LOG.length) return `<p class="wsa-empty">${tr('noActivityYet')}</p>`;
        return `<ul class="wsa-activity-list">${ACTIVITY_LOG.map(e => `<li><span class="wsa-status-dot is-on"></span><span>${esc(e.name)} <em>${esc(e.source)}</em></span><small>${formatRelativeTime(e.timestamp)}</small></li>`).join('')}</ul>`;
    }

    function systemStatsHtml() {
        return `
            <div class="wsa-stats-rings">
                <div class="wsa-ring" style="background: conic-gradient(var(--wsa-accent) 0 ${SYSTEM_STATS.cpu}%, var(--wsa-border) 0)"><span>${SYSTEM_STATS.cpu}%</span></div>
                <div class="wsa-ring-label">CPU</div>
                <div class="wsa-ring" style="background: conic-gradient(var(--wsa-accent) 0 ${SYSTEM_STATS.memory}%, var(--wsa-border) 0)"><span>${SYSTEM_STATS.memory}%</span></div>
                <div class="wsa-ring-label">${tr('memoryWord')}</div>
                <div class="wsa-ring wsa-ring-text"><span>${SYSTEM_STATS.uptime}</span></div>
                <div class="wsa-ring-label">${tr('uptimeWord')}</div>
            </div>
            <div class="wsa-info-grid">
                <div><label>${tr('connectionLabel')}</label><strong>${esc(SYSTEM_STATS.connectionQuality)}</strong></div>
                <div><label>${tr('latencyWord')}</label><strong>${SYSTEM_STATS.latencyMs} ms</strong></div>
            </div>
            <button type="button" class="wsa-btn wsa-btn-block">${tr('diagnosticsTitle')}</button>`;
    }

    function machinesInlineHtml() {
        return `<section class="wsa-card wsa-span-full">
            <div class="wsa-card-title-row"><h2>${icon(ICON_SCENE, 16)}${tr('scenesByMachine')}</h2></div>
            <div class="wsa-machine-cards">
                ${MACHINES.map(machineCardHtml).join('')}
                <div class="wsa-machine-card wsa-machine-card-add"><div>${icon(ICON_PLUS, 22)}<strong>${tr('addMachine')}</strong><small>${tr('addMachineHint')}</small></div></div>
            </div>
        </section>`;
    }

    function viewScenes() {
        return `<div class="wsa-card"><h2>${icon(ICON_SCENE, 16)}${tr('subScenes')}</h2><p class="wsa-empty-note">${tr('machineScenesSubtitle')}</p></div>
            <div class="wsa-machine-cards">${MACHINES.map(machineCardHtml).join('')}
            <div class="wsa-machine-card wsa-machine-card-add"><div>${icon(ICON_PLUS, 22)}<strong>${tr('addMachine')}</strong><small>${tr('addMachineHint')}</small></div></div></div>`;
    }

    function machineCardHtml(machine) {
        return `
            <div class="wsa-machine-card">
                <div class="wsa-machine-card-head"><strong>${esc(machine.name.toUpperCase())}</strong><span class="wsa-status-pill">${machine.status}</span></div>
                <small class="wsa-machine-nickname">${esc(machine.nickname)}</small>
                <div class="wsa-machine-section-title">${tr('dataSourceLabel')} ${esc(machine.nickname)}</div>
                <div class="wsa-var-chips">${machine.variables.map(v => `<span>${esc(v.label)}</span>`).join('')}</div>
                <div class="wsa-machine-section-title">${tr('subScenes2')}</div>
                <div class="wsa-inline-rules">${machine.inlineRules.map(r => `<div><span class="wsa-status-dot" style="background:${r.color}"></span>${esc(r.condition)} → ${esc(r.result)}</div>`).join('')}</div>
                <div class="wsa-machine-section-title">${tr('outputsActionsTitle')}</div>
                ${machine.outputs.map(o => `<div class="wsa-output-row"><span>${esc(o.accessoryLabel)}</span><small>${tr('portLabel')} ${esc(o.port)}</small><label class="wsa-switch"><input type="checkbox" ${o.on ? 'checked' : ''}><span></span></label></div>`).join('')}
                <button type="button" class="wsa-btn wsa-btn-block">${tr('viewRuleEditor')} →</button>
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
                    <div class="wsa-card-title-row"><h2>${board.connected ? '<span class="wsa-status-dot is-on"></span>' : ''}${esc(board.name)}</h2><small class="wsa-text-muted">${tr('pinCount', { count: rows.length })}</small></div>
                    <div class="wsa-filtered-list">${rows.map(pin => `
                        <div class="wsa-device-row"><span class="wsa-status-dot is-on"></span><div><strong>${esc(pin.label)}</strong><small>${esc(pin.gpio)}</small></div><span class="wsa-pill" style="color:${categoryInfo(pin.category).color}">${esc(categoryInfo(pin.category).label)}</span></div>`).join('')}</div>
                </div>`).join('')
            : `<div class="wsa-card"><p class="wsa-empty">${tr('noPinsAssignedCategory')}</p></div>`}
        `;
    }

    function rulesTableHtml() {
        return `<div class="wsa-table-scroll"><table class="wsa-table">
            <thead><tr><th>ID</th><th>${tr('ifConditionHeader')}</th><th>${tr('thenActionHeader')}</th><th>${tr('sourceHeader')}</th><th>${tr('subStateColumn')}</th></tr></thead>
            <tbody>${state.rules.map(r => `
                <tr>
                    <td>${esc(r.id)}</td>
                    <td>${esc(r.condition)}</td>
                    <td>${esc(r.actionLabel)}</td>
                    <td>${esc(r.source)}</td>
                    <td><label class="wsa-switch"><input type="checkbox" data-wsa-rule="${r.id}" ${r.enabled ? 'checked' : ''}><span></span></label></td>
                </tr>`).join('')}</tbody>
        </table></div>
        <button type="button" class="wsa-btn wsa-btn-accent" id="wsa-new-rule-btn">${icon(ICON_PLUS, 14)}<span>${tr('newRuleWord')}</span></button>`;
    }

    function viewAutomations() {
        return cardWrap(tr('activeAutomationsTitle'), ICON_ZAP, rulesTableHtml());
    }

    // ============================================================================
    // EVENTOS
    // ============================================================================

    function render() {
        if (!root) return;
        root.classList.toggle('wsa-dashboard-mode', state.view === 'overview' && !state.wizard.active);
        root.classList.toggle('wsa-docs-mode', state.view === 'documentation' && !state.wizard.active);
        renderHeaderStatus();
        renderContent();
    }

    function bindEvents() {
        root.querySelector('#wsa-close-btn').addEventListener('click', () => window.switchSection?.('dashboard'));
        root.querySelector('#wsa-docs-btn').addEventListener('click', () => switchWorkshopView('documentation'));
        root.querySelector('#wsa-header-addboard-btn').addEventListener('click', () => {
            state.wizard.active = true;
            state.wizard.step = 'intro';
            state.wizard.error = null;
            render();
        });
        root.querySelector('#wsa-scan-boards-btn').addEventListener('click', () => {
            state.wizard.active = true;
            state.wizard.error = null;
            wizardSearch();
        });
        root.querySelector('#wsa-manage-header-btn').addEventListener('click', () => { closeHeaderMenu(); openManageBoardsPanel(); });
        root.querySelector('#wsa-more-menu-btn').addEventListener('click', event => {
            event.stopPropagation();
            const menu = root.querySelector('#wsa-more-menu');
            menu.hidden = !menu.hidden;
        });
        document.addEventListener('click', event => {
            if (!root || !root.querySelector('#wsa-more-menu') || root.querySelector('#wsa-more-menu').hidden) return;
            if (!event.target.closest('#wsa-more-menu') && !event.target.closest('#wsa-more-menu-btn')) closeHeaderMenu();
        });
        root.querySelector('#wsa-more-menu').addEventListener('click', event => {
            const viewButton = event.target.closest('[data-wsa-view]');
            if (viewButton) { closeHeaderMenu(); switchWorkshopView(viewButton.dataset.wsaView); }
        });

        root.querySelectorAll('[data-wsa-close-manageboards]').forEach(el => el.addEventListener('click', closeManageBoardsPanel));
        root.querySelector('#wsa-manageboards-list').addEventListener('click', event => {
            const saveBtn = event.target.closest('[data-wsa-manageboard-save]');
            if (saveBtn) { saveManageBoardInfo(saveBtn.dataset.wsaManageboardSave); return; }
            const deleteBtn = event.target.closest('[data-wsa-manageboard-delete]');
            if (deleteBtn) { deleteManageBoard(deleteBtn.dataset.wsaManageboardDelete); return; }
        });
        root.querySelector('#wsa-manageboards-list').addEventListener('change', event => {
            const ambientCheckbox = event.target.closest('[data-wsa-manageboard-ambient]');
            if (ambientCheckbox) setAmbientSensorBoard(ambientCheckbox.dataset.wsaManageboardAmbient, ambientCheckbox.checked);
        });

        root.querySelectorAll('[data-wsa-close-allscenes]').forEach(el => el.addEventListener('click', closeAllScenesPanel));
        root.querySelector('#wsa-allscenes-list').addEventListener('click', event => {
            const sceneButton = event.target.closest('[data-wsa-workshop-scene]');
            if (sceneButton) { runWorkshopScene(sceneButton.dataset.wsaWorkshopScene); return; }
            if (event.target.closest('#wsa-scene-new')) { openSceneEditor(); return; }
            const sceneEdit = event.target.closest('[data-wsa-scene-edit]');
            if (sceneEdit) { openSceneEditor(sceneEdit.dataset.wsaSceneEdit); return; }
        });

        root.querySelector('#wsa-content').addEventListener('click', event => {
            if (!event.target.closest('.wsa-card-menu')) {
                root.querySelectorAll('.wsa-card-menu-dropdown').forEach(el => { el.hidden = true; });
            }
            const viewButton = event.target.closest('[data-wsa-view]');
            if (viewButton) { switchWorkshopView(viewButton.dataset.wsaView); return; }
            if (event.target.closest('#wsa-docs-back')) { switchWorkshopView('overview'); return; }
            if (event.target.closest('#wsa-back-to-dashboard')) { switchWorkshopView('overview'); return; }
            if (event.target.closest('#wsa-docs-open-pinmap')) { switchWorkshopView('pines'); return; }
            const overviewTab = event.target.closest('[data-wsa-overview-tab]');
            if (overviewTab) { state.overviewTab = overviewTab.dataset.wsaOverviewTab; render(); return; }
            if (event.target.closest('#wsa-workshop-refresh')) { loadWorkshopData(); return; }
            if (event.target.closest('#wsa-workshop-configure')) { switchWorkshopView('pines'); return; }
            if (event.target.closest('#wsa-workshop-add-accessory')) {
                if (state.overviewTab === 'lights') openLightingEditor();
                else {
                    window.switchSection?.('settings');
                    setTimeout(() => document.getElementById('accessories-settings-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
                }
                return;
            }
            const relayConfigure = event.target.closest('[data-wsa-relay-configure]');
            if (relayConfigure) { openRelayEditor(Number(relayConfigure.dataset.wsaRelayConfigure)); return; }
            const relayClose = event.target.closest('[data-wsa-relay-close]');
            if (relayClose) { root.querySelector('#wsa-relay-modal')?.remove(); return; }
            const lightingClose = event.target.closest('[data-wsa-lighting-close]');
            if (lightingClose) { root.querySelector('#wsa-lighting-modal')?.remove(); return; }
            const ledPreset = event.target.closest('[data-wsa-led-preset]');
            if (ledPreset) { const separator = ledPreset.dataset.wsaLedPreset.lastIndexOf(':'); setWorkshopLedColor(ledPreset.dataset.wsaLedPreset.slice(0, separator), ledPreset.dataset.wsaLedPreset.slice(separator + 1)); return; }
            const ledApply = event.target.closest('[data-wsa-workshop-led-apply]');
            if (ledApply) {
                const color = root.querySelector(`[data-wsa-workshop-led-color="${CSS.escape(ledApply.dataset.wsaWorkshopLedApply)}"]`)?.value;
                setWorkshopLedColor(ledApply.dataset.wsaWorkshopLedApply, color);
                return;
            }
            const ledMenuToggle = event.target.closest('[data-wsa-led-menu-toggle]');
            if (ledMenuToggle) {
                const id = ledMenuToggle.dataset.wsaLedMenuToggle;
                const dropdown = root.querySelector(`[data-wsa-led-menu="${CSS.escape(id)}"]`);
                const wasHidden = dropdown ? dropdown.hidden : true;
                root.querySelectorAll('.wsa-card-menu-dropdown').forEach(el => { el.hidden = true; });
                if (dropdown) dropdown.hidden = !wasHidden;
                return;
            }
            const ledView = event.target.closest('[data-wsa-led-view]');
            if (ledView) { openLedDetailsPanel(ledView.dataset.wsaLedView); return; }
            const ledFirmware = event.target.closest('[data-wsa-led-firmware]');
            if (ledFirmware) {
                const accessory = state.accessories.find(item => item.id === ledFirmware.dataset.wsaLedFirmware);
                if (accessory && typeof window.openFirmwareUpdateModal === 'function') {
                    window.openFirmwareUpdateModal(accessory.id, accessory.name);
                } else {
                    toast(tr('errCouldNotOpenFirmwareUpdater'), 'error');
                }
                return;
            }
            const ledDelete = event.target.closest('[data-wsa-led-delete]');
            if (ledDelete) { deleteWorkshopAccessory(ledDelete.dataset.wsaLedDelete); return; }
            const sceneButton = event.target.closest('[data-wsa-workshop-scene]');
            if (sceneButton) { runWorkshopScene(sceneButton.dataset.wsaWorkshopScene); return; }
            if (event.target.closest('#wsa-scene-new')) { openSceneEditor(); return; }
            const sceneEdit = event.target.closest('[data-wsa-scene-edit]');
            if (sceneEdit) { openSceneEditor(sceneEdit.dataset.wsaSceneEdit); return; }

            const cardEdit = event.target.closest('[data-wsa-card-edit]');
            if (cardEdit) { openManageBoardsPanel(); return; }
            const cardPins = event.target.closest('[data-wsa-card-pins]');
            if (cardPins) { state.activeBoardId = cardPins.dataset.wsaCardPins; state.selectedPinKey = null; switchWorkshopView('pines'); return; }
            const cardActions = event.target.closest('[data-wsa-card-actions]');
            if (cardActions) { state.activeBoardId = cardActions.dataset.wsaCardActions; render(); root.querySelector('#wsa-quickactions-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
            const cardDuplicate = event.target.closest('[data-wsa-card-duplicate]');
            if (cardDuplicate) { duplicateBoard(cardDuplicate.dataset.wsaCardDuplicate); return; }
            const cardDelete = event.target.closest('[data-wsa-card-delete]');
            if (cardDelete) { deleteManageBoard(cardDelete.dataset.wsaCardDelete); return; }

            if (event.target.closest('#wsa-boards-viewmode')) { state.boardsViewMode = state.boardsViewMode === 'grid' ? 'list' : 'grid'; render(); return; }
            if (event.target.closest('#wsa-test-relays-btn')) { testWorkshopRelays(activeBoard()); return; }
            if (event.target.closest('#wsa-test-leds-btn')) { testWorkshopLeds(activeBoard()); return; }
            if (event.target.closest('#wsa-test-connection-btn')) { testBoardConnection(state.activeBoardId); return; }
            if (event.target.closest('#wsa-sync-btn')) { loadWorkshopData(); toast(tr('syncStarted')); return; }
            if (event.target.closest('#wsa-scenes-viewall')) { openAllScenesPanel(); return; }
            const resourceLink = event.target.closest('[data-wsa-resource]');
            if (resourceLink) {
                const action = resourceLink.dataset.wsaResource;
                if (action === 'docs-start') openDocsAnchor('wsa-doc-start');
                else if (action === 'docs-commands') openDocsAnchor('wsa-doc-commands');
                else if (action === 'docs-services') openDocsAnchor('wsa-doc-services');
                else if (action === 'docs-ha') openDocsAnchor('wsa-doc-ha');
                else if (action === 'diagnostics') runDiagnostics();
                return;
            }

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
            if (event.target.closest('#wsa-new-rule-btn')) { toast(tr('ruleEditorComingSoon')); return; }

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
            if (event.target.id === 'wsa-boards-sort') { state.boardsSort = event.target.value; render(); return; }
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
        navButton.title = tr('navLabel');
        navButton.innerHTML = `${icon(ICON_CPU, 20)}<span>${esc(tr('navLabel'))}</span>`;
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
        (async () => {
            // Primero carga la identidad persistida; después detección y
            // accesorios pueden enriquecerla en vez de crear/reemplazar
            // placas durante una carrera asíncrona.
            await loadBoardsFromBackend();
            await Promise.all([checkSetupStatus(), loadWorkshopData(), refreshAiAvailability()]);
        })();
    }

    function unmount() {
        document.querySelector(`[data-plugin-nav="${PLUGIN_ID}"]`)?.remove();
        document.getElementById('arduino-accessories-section')?.remove();
        root = null;
    }

    // NOPAL core dispara este evento al cambiar de idioma (ver setLanguage()
    // en translations.js) -- sin esto, la ficha ya montada se quedaba en el
    // idioma con el que abrió hasta que el usuario navegaba a otra sección
    // y volvía (issue #50). render() ya revisa `root` antes de pintar, así
    // que es seguro llamarlo aunque el plugin no esté montado.
    window.addEventListener('nopal:language-changed', () => { if (root) render(); });

    window.NopalPluginRegistry = window.NopalPluginRegistry || {};
    window.NopalPluginRegistry[PLUGIN_ID] = { mount, unmount, version: PLUGIN_VERSION };
    mount();
})();
