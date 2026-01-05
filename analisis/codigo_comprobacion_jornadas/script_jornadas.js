// Script principal que orquesta todas las operaciones
function generarHojaRutasPresencias() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Extraer y agregar el ID del trabajador en las hojas de origen
  // _extraerIdTrabajadorEnHojasOrigen(spreadsheet);

  // 2. Procesar los datos de las diferentes hojas para generar la salida
  const fichajesAsociados = _procesarYGenerarHojaDeSalida(spreadsheet);

  // 3. Buscar los horarios repetidos del mismo trabajador en la misma fecha y ajustarlos
  _ajustarHorariosDePresencia();

  // 4. Buscar los horarios repetidos del mismo trabajador en el mismo turno y distintos servicios para mostrar lo que comprobar
  _identificarRutasDuplicadas();

  // 5. Generar la hoja con los fichajes sin ruta
  _generarHojaPresenciasSinRutas(spreadsheet, fichajesAsociados);
}

// Función que extrae el ID numérico de la columna de código de trabajador
function _extraerIdTrabajadorEnHojasOrigen(spreadsheet) {
  const titularSheet = spreadsheet.getSheetByName("titulares");
  const auxiliarSheet = spreadsheet.getSheetByName("auxiliares");

  // Procesa la hoja "titulares"
  if (titularSheet) {
    const data = titularSheet.getDataRange().getValues();
    const headers = data[0];
    let idColumnIndex = headers.indexOf("Id trabajador");
    if (idColumnIndex === -1) {
      titularSheet.insertColumnAfter(headers.length);
      titularSheet.getRange(1, headers.length + 1).setValue("Id trabajador");
      idColumnIndex = headers.length;
      const idData = data.slice(1).map(row => {
        const workerCode = row[9]; // Columna J
        return [workerCode ? workerCode.split(' - ')[0].trim() : ''];
      });
      titularSheet.getRange(2, idColumnIndex + 1, idData.length, 1).setValues(idData);
    }
  }

  // Procesa la hoja "auxiliares"
  if (auxiliarSheet) {
    const data = auxiliarSheet.getDataRange().getValues();
    const headers = data[0];
    let idColumnIndex = headers.indexOf("Id trabajador");
    if (idColumnIndex === -1) {
      auxiliarSheet.insertColumnAfter(headers.length);
      auxiliarSheet.getRange(1, headers.length + 1).setValue("Id trabajador");
      idColumnIndex = headers.length;
      const idData = data.slice(1).map(row => {
        const workerCode = row[3]; // Columna D
        return [workerCode ? workerCode.split(' - ')[0].trim() : ''];
      });
      auxiliarSheet.getRange(2, idColumnIndex + 1, idData.length, 1).setValues(idData);
    }
  }
}

// Función principal que realiza la casación y genera la hoja de salida
function _procesarYGenerarHojaDeSalida(spreadsheet) {
  const titularesSheet = spreadsheet.getSheetByName("titulares");
  const auxiliaresSheet = spreadsheet.getSheetByName("auxiliares");
  const trabajadoresSheet = spreadsheet.getSheetByName("trabajadores");
  const fichajesSheet = spreadsheet.getSheetByName("fichajes");
  const outputSheetName = "rutas-presencias";

  let outputSheet = spreadsheet.getSheetByName(outputSheetName);
  if (outputSheet) {
    spreadsheet.deleteSheet(outputSheet);
  }
  outputSheet = spreadsheet.insertSheet(outputSheetName);

  const headers = ["fechageneral", "código parte trabajo", "servicio", "turno", "equipo trabajo", "fechahoraini", "fechahorafin", "id trabajador", "nombre trabajador", "puesto trabajo", "vehiculo", "kms", "partes asociados", "entrada", "salida", "fichaje"];
  outputSheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold");

  const fichajesData = fichajesSheet.getDataRange().getValues();
  const trabajadoresData = trabajadoresSheet.getDataRange().getValues();

  const trabajadoresMap = new Map();
  trabajadoresData.slice(1).forEach(row => trabajadoresMap.set(Number(String(row[0]).trim()), { apellido1: row[4], apellido2: row[5], nombre: row[6], puesto: row[22] }));

  const fichajesMap = new Map();
  fichajesData.slice(1).forEach(row => {
    const workerId = Number(String(row[4]).trim());
    if (workerId) {
      if (!fichajesMap.has(workerId)) {
        fichajesMap.set(workerId, []);
      }
      fichajesMap.get(workerId).push({ time: _corregirHusoHorarioExacto(row[0]), type: row[7], rawRow: row });
    }
  });

  const outputData = [];
  const fichajesAsociados = new Set();
  let fullName = "";

  // Procesa la hoja "titulares"
  if (titularesSheet) {
    const titularesData = titularesSheet.getDataRange().getValues();
    titularesData.slice(1).forEach(row => {
      const partCode = row[0]; // A
      const workerId = Number(String(row[9].split(' - ')[0]).trim()); // J
      const generalDate = row[3]; // D
      const service = row[1]; // B
      const turno = row[4]; // E
      const team = row[2]; // C
      const vehicle = row[6] // G
      const kms = row[14] // O
      const startTime = _corregirHusoHorarioExacto(row[16]); // Q
      const endTime = _corregirHusoHorarioExacto(row[20]); // U
      const associatedParts = row[30]; // AE
      const workerDetails = trabajadoresMap.get(workerId) || {};
      const { entryTime, exitTime } = _getFichajeTimes(fichajesMap, workerId, startTime, endTime, fichajesAsociados);

      if(workerDetails.apellido1) {
        fullName = `${workerDetails.apellido1 || ''} ${workerDetails.apellido2 || ''}, ${workerDetails.nombre || ''}`;
      } else {
        fullName = "";
      }

      const fichajeStatus = entryTime && exitTime ? "completo" : (entryTime || exitTime ? "incompleto" : "sin presencia");
      const startTimeCorrect = startTime ? _formatoFechaSalida(startTime) : "";
      const endTimeCorrect = endTime ? _formatoFechaSalida(endTime) : "";

      outputData.push([
        generalDate, partCode, service, turno, team,
        startTimeCorrect, endTimeCorrect,
        workerId, fullName,
        workerDetails.puesto || '', vehicle || '', kms || '',
        associatedParts, entryTime, exitTime, fichajeStatus
      ]);
    });
  }

  // Procesa la hoja "auxiliares"
  if (auxiliaresSheet) {
    const auxiliaresData = auxiliaresSheet.getDataRange().getValues();
    const titularesData = titularesSheet.getDataRange().getValues();
    const titularesMap = new Map();
    titularesData.slice(1).forEach(row => titularesMap.set(row[0], { team: row[2], turno: row[4], startTime: _corregirHusoHorarioExacto(row[16]), endTime: _corregirHusoHorarioExacto(row[20]), associatedParts: row[30], generalDate: row[3], service: row[1], vehicle: row[6], kms: row[14] }));

    auxiliaresData.slice(1).forEach(row => {
      const partCode = row[1]; // B
      const workerId = Number(String(row[3].split(' - ')[0]).trim()); // D
      const titular = titularesMap.get(partCode);

      if (titular) {
        const workerDetails = trabajadoresMap.get(workerId) || {};
        const { entryTime, exitTime } = _getFichajeTimes(fichajesMap, workerId, titular.startTime, titular.endTime, fichajesAsociados);
        const fichajeStatus = entryTime && exitTime ? "completo" : (entryTime || exitTime ? "incompleto" : "sin presencia");

        if(workerDetails.apellido1) {
          fullName = `${workerDetails.apellido1 || ''} ${workerDetails.apellido2 || ''}, ${workerDetails.nombre || ''}`;
        } else {
          fullName = "";
        }

        outputData.push([
          titular.generalDate, partCode, titular.service, titular.turno, titular.team,
          titular.startTime ? _formatoFechaSalida(titular.startTime) : "",
          titular.endTime ? _formatoFechaSalida(titular.endTime) : "",
          workerId, fullName,
          workerDetails.puesto || '', titular.vehicle || '', titular.kms || '',
          titular.associatedParts, entryTime, exitTime, fichajeStatus
        ]);
      }
    });
  }

  // Escribe los resultados en la hoja de salida
  if (outputData.length > 0) {
    outputSheet.getRange(2, 1, outputData.length, outputData[0].length).setValues(outputData);
  }

  return fichajesAsociados;
}

// Función auxiliar para obtener las horas de fichaje con tolerancia de 2 horas
function _getFichajeTimes(fichajesMap, workerId, startTime, endTime, fichajesAsociados) {
  let entryTime = null;
  let exitTime = null;
  
  if (!fichajesMap.has(workerId)) {
    return { entryTime: "", exitTime: "" };
  }

  const workerFichajes = fichajesMap.get(workerId);
  const entryWindowStart = startTime ? startTime.getTime() - 2 * 60 * 60 * 1000 : null;
  const exitWindowEnd = endTime ? endTime.getTime() + 2 * 60 * 60 * 1000 : null;

  let validEntries = [];
  let validExits = [];

  for (const fichaje of workerFichajes) {
    // Para la entrada, el fichaje debe ser hasta 2h antes del inicio y antes del final
    if (fichaje.type === "1 - Entrada" && entryWindowStart && fichaje.time >= entryWindowStart && fichaje.time <= endTime) {
      validEntries.push(fichaje.time);
      fichajesAsociados.add(fichaje.time.getTime() + "_" + workerId);
    }
    // Para la salida, el fichaje debe ser después del inicio y hasta 2h después del final
    if (fichaje.type === "2 - Salida" && exitWindowEnd && fichaje.time >= startTime && fichaje.time <= exitWindowEnd) {
      validExits.push(fichaje.time);
      fichajesAsociados.add(fichaje.time.getTime() + "_" + workerId);
    }
  }

  if (validEntries.length > 0) {
    validEntries.sort((a, b) => a.getTime() - b.getTime());
    entryTime = _formatoFechaSalida(validEntries[0]); // El más antiguo
  }

  if (validExits.length > 0) {
    validExits.sort((a, b) => b.getTime() - a.getTime());
    exitTime = _formatoFechaSalida(validExits[0]); // El más reciente
  }

  return { entryTime, exitTime };
}

function _ajustarHorariosDePresencia() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName("rutas-presencias");

  if (!sheet) {
    Logger.log("La hoja 'rutas-presencias' no existe. Por favor, ejecuta primero el script de casación.");
    return;
  }

  const dataRange = sheet.getDataRange();
  const data = dataRange.getValues();
  const headers = data[0];
  const rows = data.slice(1);

  // Mapear índices de columnas
  const colIndices = {
    FECHA_GENERAL: headers.indexOf("fechageneral"),
    ID_TRABAJADOR: headers.indexOf("id trabajador"),
    EQUIPO_TRABAJO: headers.indexOf("equipo trabajo"),
    FECHA_HORA_INI: headers.indexOf("fechahoraini"),
    FECHA_HORA_FIN: headers.indexOf("fechahorafin"),
    ENTRADA: headers.indexOf("entrada"),
    SALIDA: headers.indexOf("salida")
  };

  if (Object.values(colIndices).some(idx => idx === -1)) {
    Logger.log("Una o más columnas necesarias no se encontraron en la hoja 'rutas-presencias'.");
    return;
  }

  // Ordenar las filas para garantizar que el ajuste se haga correctamente
  rows.sort((a, b) => {
    const fechaA = new Date(a[colIndices.FECHA_GENERAL]);
    const fechaB = new Date(b[colIndices.FECHA_GENERAL]);
    const idA = String(a[colIndices.ID_TRABAJADOR]);
    const idB = String(b[colIndices.ID_TRABAJADOR]);
    const equipoA = (a[colIndices.EQUIPO_TRABAJO] ?? "").toLocaleString();
    const equipoB = (b[colIndices.EQUIPO_TRABAJO] ?? "").toLocaleString();
    const inicioA = new Date(a[colIndices.FECHA_HORA_INI]);
    const inicioB = new Date(b[colIndices.FECHA_HORA_INI]);

    if (fechaA.getTime() !== fechaB.getTime()) {
      return fechaA.getTime() - fechaB.getTime();
    }
    if (idA !== idB) {
      return idA.localeCompare(idB);
    }
    if (equipoA !== equipoB) {
      return equipoA.localeCompare(equipoB);
    }
    return inicioA.getTime() - inicioB.getTime();
  });

  const updatedRows = [];
  let i = 0;
  while (i < rows.length) {
    const currentRow = rows[i];
    const workerId = String(currentRow[colIndices.ID_TRABAJADOR]);
    const generalDate = currentRow[colIndices.FECHA_GENERAL];
    const team = currentRow[colIndices.EQUIPO_TRABAJO];
    const group = [];
    
    let j = i;
    while (j < rows.length &&
           String(rows[j][colIndices.ID_TRABAJADOR]) === workerId &&
           rows[j][colIndices.FECHA_GENERAL].getTime() === generalDate.getTime() &&
           rows[j][colIndices.EQUIPO_TRABAJO] === team) {
      group.push(rows[j]);
      j++;
    }

    if (group.length > 1) {
      // Tomar las horas de fichaje del grupo
      const fichajeEntrada = group[0][colIndices.ENTRADA];
      const fichajeSalida = group[group.length - 1][colIndices.SALIDA];

      // Primera hoja de ruta
      if (fichajeEntrada) {
        group[0][colIndices.ENTRADA] = fichajeEntrada;
        group[0][colIndices.SALIDA] = group[0][colIndices.FECHA_HORA_FIN];
      }

      // Última hoja de ruta
      if (fichajeSalida) {
        group[group.length - 1][colIndices.ENTRADA] = group[group.length - 1][colIndices.FECHA_HORA_INI];
        group[group.length - 1][colIndices.SALIDA] = fichajeSalida;
      }

      // Hojas de ruta intermedias
      for (let k = 1; k < group.length - 1; k++) {
        group[k][colIndices.ENTRADA] = group[k][colIndices.FECHA_HORA_INI];
        group[k][colIndices.SALIDA] = group[k][colIndices.FECHA_HORA_FIN];
      }
    }
    updatedRows.push(...group);
    i = j;
  }

  if (updatedRows.length > 0) {
    sheet.getRange(2, 1, updatedRows.length, updatedRows[0].length).setValues(updatedRows);
  }
}

function _identificarRutasDuplicadas() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName("rutas-presencias");
  if (!sheet) {
    Logger.log("La hoja 'rutas-presencias' no existe. Por favor, ejecuta primero el script de casación.");
    return;
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);

  // Añade las nuevas columnas si no existen
  const rutasDuplicadasCol = headers.indexOf("rutas duplicadas") === -1 ? headers.length : headers.indexOf("rutas duplicadas");
  const rutasARevisarCol = headers.indexOf("rutas a revisar") === -1 ? headers.length + (rutasDuplicadasCol === headers.length ? 1 : 0) : headers.indexOf("rutas a revisar");

  if (rutasDuplicadasCol === headers.length) headers.push("rutas duplicadas");
  if (rutasARevisarCol === headers.length) headers.push("rutas a revisar");

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold");

  // Índices de las columnas
  const ID_TRABAJADOR_COL = headers.indexOf("id trabajador");
  const FECHA_GENERAL_COL = headers.indexOf("fechageneral");
  const TURNO_COL = headers.indexOf("turno");
  const PARTES_ASOCIADOS_COL = headers.indexOf("partes asociados");
  const EQUIPO_TRABAJO_COL = headers.indexOf("equipo trabajo");

  // Agrupa filas por la clave de duplicidad
  const grupos = {};
  rows.forEach((row, index) => {
    const key = `${row[ID_TRABAJADOR_COL]}-${row[FECHA_GENERAL_COL]}-${row[TURNO_COL]}`;
    if (!grupos[key]) {
      grupos[key] = [];
    }
    grupos[key].push({ row, index });
  });

  const updatedRows = rows.map(row => {
    row[rutasDuplicadasCol] = false;
    row[rutasARevisarCol] = false;
    return row;
  });

  for (const key in grupos) {
    const grupo = grupos[key];
    if (grupo.length > 1) {
      // Marcar todas las filas del grupo como duplicadas
      grupo.forEach(item => updatedRows[item.index][rutasDuplicadasCol] = true);
      
      // Lógica para marcar "rutas a revisar"
      const partesAsociadosCount0 = grupo.filter(item => item.row[PARTES_ASOCIADOS_COL] === 0).length;
      const equiposUnicos = new Set(grupo.map(item => item.row[EQUIPO_TRABAJO_COL]));
      
      let revisar = true;
      if (grupo.length === 2 && partesAsociadosCount0 > 0) { // Caso 1 
        revisar = false;
      } else if (equiposUnicos.size === 1) { // Caso 2 
        revisar = false;
      } else if (equiposUnicos.size === 2 && partesAsociadosCount0 > 0) { // Caso 3 
        revisar = false;
      }

      grupo.forEach(item => updatedRows[item.index][rutasARevisarCol] = revisar);
    }
  }

  // Escribe los datos actualizados
  sheet.getRange(2, 1, updatedRows.length, updatedRows[0].length).setValues(updatedRows);
}

// NUEVA FUNCIONALIDAD: GENERAR LA HOJA DE PRESENCIAS SIN RUTAS
function _generarHojaPresenciasSinRutas(spreadsheet, fichajesAsociados) {
  const fichajesSheet = spreadsheet.getSheetByName("fichajes");
  const trabajadoresSheet = spreadsheet.getSheetByName("trabajadores");
  const outputSheetName = "no-rutas";

  let outputSheet = spreadsheet.getSheetByName(outputSheetName);
  if (outputSheet) {
    spreadsheet.deleteSheet(outputSheet);
  }
  outputSheet = spreadsheet.insertSheet(outputSheetName);

  const headers = ["entrada", "salida", "id trabajador", "estado", "nombre trabajador", "puesto"];
  outputSheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold");

  const fichajesData = fichajesSheet.getDataRange().getValues();
  const trabajadoresData = trabajadoresSheet.getDataRange().getValues();
  
  const trabajadoresMap = new Map();
  trabajadoresData.slice(1).forEach(row => trabajadoresMap.set(Number(String(row[0]).trim()), { apellido1: row[4], apellido2: row[5], nombre: row[6], puesto: row[22] }));

  // Filtrar los fichajes no asociados
  const fichajesNoAsociados = fichajesData.slice(1).filter(row => {
    const fichajeTime = _corregirHusoHorarioExacto(row[0]);
    const workerId = Number(String(row[4]).trim());
    const key = fichajeTime.getTime() + "_" + workerId;
    return !fichajesAsociados.has(key);
  });

  // Agrupar los fichajes no asociados por trabajador y fecha
  const fichajesAgrupados = new Map();
  fichajesNoAsociados.forEach(row => {
    const workerId = Number(String(row[4]).trim());
    const fichajeTime = _corregirHusoHorarioExacto(row[0]);
    const dateKey = fichajeTime ? Utilities.formatDate(fichajeTime, "GMT", "yyyy-MM-dd") : null;
    
    if (workerId && dateKey) {
      const groupKey = `${workerId}-${dateKey}`;
      if (!fichajesAgrupados.has(groupKey)) {
        fichajesAgrupados.set(groupKey, { entries: [], exits: [], workerId: workerId });
      }
      const group = fichajesAgrupados.get(groupKey);
      if (row[7] === "1 - Entrada") {
        group.entries.push(fichajeTime);
      } else if (row[7] === "2 - Salida") {
        group.exits.push(fichajeTime);
      }
    }
  });

  const outputData = [];

  // Procesar cada grupo para encontrar entrada y salida y generar la fila de salida
  for (const [key, group] of fichajesAgrupados.entries()) {
    const workerDetails = trabajadoresMap.get(group.workerId) || {};
    let fullName = "";
    if(workerDetails.apellido1) {
      fullName = `${workerDetails.apellido1 || ''} ${workerDetails.apellido2 || ''}, ${workerDetails.nombre || ''}`;
    }

    let entryTime = "";
    if (group.entries.length > 0) {
      group.entries.sort((a, b) => a.getTime() - b.getTime());
      entryTime = _formatoFechaSalida(group.entries[0]);
    }

    let exitTime = "";
    if (group.exits.length > 0) {
      group.exits.sort((a, b) => b.getTime() - a.getTime());
      exitTime = _formatoFechaSalida(group.exits[0]);
    }

    const estado = (entryTime && exitTime) ? "completo" : (entryTime || exitTime ? "incompleto" : "sin presencia");

    if (estado !== "sin presencia") {
      outputData.push([
        entryTime,
        exitTime,
        group.workerId,
        estado,
        fullName,
        workerDetails.puesto || ''
      ]);
    }
  }

  if (outputData.length > 0) {
    outputSheet.getRange(2, 1, outputData.length, outputData[0].length).setValues(outputData);
  }
}

/**
 * Formatea un objeto Date a una cadena con el formato "dd/MM/yyyy HH:mm:ss".
 * @param {Date} dateObj El objeto Date a formatear.
 * @return {string} La fecha formateada.
 */
function _formatoFechaSalida(dateObj) {
  // if (!dateObj || !(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
  //   return "";
  // }
  // const timezone = SpreadsheetApp.getActive().getSpreadsheetTimeZone();
  // return Utilities.formatDate(dateObj, timezone, "dd/MM/yyyy HH:mm:ss");

  if (!dateObj || !(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
    return "";
  }

  const options = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false // Para usar formato de 24 horas
  };

  // Usamos 'es-ES' para asegurar el formato día/mes/año
  return dateObj.toLocaleString('es-ES', options);

}

/**
 * Corrige el desfase de huso horario de un objeto Date de Google Sheets.
 * @param {Date} dateObj El objeto Date leído directamente de una celda.
 * @return {Date} Un nuevo objeto Date con el huso horario correcto.
 */
function _corregirHusoHorarioExacto(dateObj) {
  if (!dateObj || !(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
    return null; 
  }
  const timezone = SpreadsheetApp.getActive().getSpreadsheetTimeZone();
  const formattedDate = Utilities.formatDate(dateObj, timezone, "yyyy-MM-dd'T'HH:mm:ss");
  return new Date(formattedDate);
}

/**
 * Función principal para procesar los datos según las peticiones del usuario.
 * Se puede ejecutar directamente desde el editor de Apps Script.
 */
function procesarDatosCompletos() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  try {
    // PASO 1: Extraer registros únicos a la hoja 'rp-unicas' (con filtro de id trabajador = 0)
    Logger.log("Iniciando Paso 1: Extracción de registros únicos...");
    const sheetUnicas = _extraerRegistrosUnicos(ss);
    if (!sheetUnicas) return; // Detener si falla la extracción inicial.

    // PASO 2: Agregar Puesto Incorpora y Equal desde 'trabajadores'
    Logger.log("Iniciando Paso 2: Búsqueda y unión de datos de 'trabajadores'...");
    _agregarPuestosYEqual(ss, sheetUnicas);

    // PASO 3: Crear el resumen por Puesto Incorpora y Equal (con filtro de partes asociados distinto de 0)
    Logger.log("Iniciando Paso 3: Creación de la hoja resumen...");
    _crearResumenPuestos(ss, sheetUnicas);

    Browser.msgBox('Proceso Completado', 'Las hojas "rp-unicas" y "resumen-puestos" han sido creadas/actualizadas con éxito.', Browser.Buttons.OK);

  } catch (e) {
    Logger.log('Error en el procesamiento: ' + e.toString());
    Browser.msgBox('Error', 'Ocurrió un error durante el proceso: ' + e.message, Browser.Buttons.OK);
  }
}

// ----------------------------------------------------------------------
// PASO 1: CREAR 'rp-unicas' - MODIFICADO CON FILTRO id trabajador != 0
// ----------------------------------------------------------------------
function _extraerRegistrosUnicos(ss) {
  const SOURCE_SHEET_NAME = 'rutas-presencias';
  const TARGET_SHEET_NAME = 'rp-unicas';

  const sheetRutas = ss.getSheetByName(SOURCE_SHEET_NAME);
  if (!sheetRutas) {
    Browser.msgBox('Error', `No se encontró la hoja de origen: "${SOURCE_SHEET_NAME}". Asegúrate de que el nombre sea correcto.`, Browser.Buttons.OK);
    return null;
  }

  const allData = sheetRutas.getDataRange().getValues();
  if (allData.length <= 1) { 
    Logger.log('La hoja ' + SOURCE_SHEET_NAME + ' está vacía o solo contiene la cabecera.');
    return null;
  }

  const headers = allData[0];
  const data = allData.slice(1);

  const COL_INDEXES = {
    fechageneral: _getHeaderIndex('fechageneral', headers),
    turno: _getHeaderIndex('turno', headers),
    equipoTrabajo: _getHeaderIndex('equipo trabajo', headers),
    idTrabajador: _getHeaderIndex('id trabajador', headers),
    nombreTrabajador: _getHeaderIndex('nombre trabajador', headers),
    partesAsociados: _getHeaderIndex('partes asociados', headers)
  };

  for (const key in COL_INDEXES) {
    if (COL_INDEXES[key] === -1) {
      Browser.msgBox('Error', `No se encontró la columna requerida: "${key.replace(/([A-Z])/g, ' $1').trim()}".`, Browser.Buttons.OK);
      return null;
    }
  }

  const uniqueRecords = new Map();

  data.forEach(row => {
    // ✨ MODIFICACIÓN 1: No incluir registros cuyo id trabajador sea 0
    const idTrabajadorValue = String(row[COL_INDEXES.idTrabajador]).trim();
    if (idTrabajadorValue === '0' || idTrabajadorValue === '') {
      // Si el id es '0' o vacío, se salta este registro.
      return; 
    }

    // Crear una clave única con los campos identificadores
    const key = [
      row[COL_INDEXES.fechageneral],
      row[COL_INDEXES.turno],
      row[COL_INDEXES.equipoTrabajo],
      idTrabajadorValue // Usar el valor ya procesado
    ].join('|_|');

    if (!uniqueRecords.has(key)) {
      // Si el registro es único, lo añadimos
      const newRow = [
        row[COL_INDEXES.fechageneral],
        row[COL_INDEXES.turno],
        row[COL_INDEXES.equipoTrabajo],
        idTrabajadorValue,
        row[COL_INDEXES.nombreTrabajador],
        row[COL_INDEXES.partesAsociados],
        "",
        0
      ];
      uniqueRecords.set(key, newRow);
    }
  });

  const sheetUnicas = _getOrCreateSheet(ss, TARGET_SHEET_NAME);
  sheetUnicas.clearContents();

  const newHeaders = [
    'fechageneral', 'turno', 'equipo trabajo', 'id trabajador', 'nombre trabajador', 'partes asociados',
    'Puesto Incorpora', 'Equal'
  ];

  const outputData = [newHeaders, ...Array.from(uniqueRecords.values())];

  sheetUnicas.getRange(1, 1, outputData.length, outputData[0].length).setValues(outputData);
  
  return sheetUnicas;
}

// ----------------------------------------------------------------------
// PASO 2: AGREGAR PUESTOS Y EQUAL (Sin cambios)
// ----------------------------------------------------------------------
function _agregarPuestosYEqual(ss, sheetUnicas) {
  const WORKERS_SHEET_NAME = 'trabajadores';
  
  const sheetTrabajadores = ss.getSheetByName(WORKERS_SHEET_NAME);
  if (!sheetTrabajadores) {
    Browser.msgBox('Error', `No se encontró la hoja de trabajadores: "${WORKERS_SHEET_NAME}". Asegúrate de que el nombre sea correcto.`, Browser.Buttons.OK);
    return;
  }

  const workerData = sheetTrabajadores.getDataRange().getValues();
  if (workerData.length <= 1) {
    Logger.log('La hoja ' + WORKERS_SHEET_NAME + ' está vacía.');
    return;
  }

  const workerHeaders = workerData[0];
  const workerRows = workerData.slice(1);

  const CODE_INDEX = _getHeaderIndex('Código', workerHeaders);
  const PUESTO_INDEX = _getHeaderIndex('Puesto Incorpora', workerHeaders);
  const EQUAL_INDEX = _getHeaderIndex('Equal', workerHeaders);

  if (CODE_INDEX === -1 || PUESTO_INDEX === -1 || EQUAL_INDEX === -1) {
    Browser.msgBox('Error', 'Faltan columnas en la hoja "trabajadores". Se requiere "Código", "Puesto Incorpora" y "Equal".', Browser.Buttons.OK);
    return;
  }

  const workerMap = new Map();
  workerRows.forEach(row => {
    const codigo = row[CODE_INDEX];
    workerMap.set(String(codigo).trim(), {
      puesto: row[PUESTO_INDEX],
      equal: row[EQUAL_INDEX]
    });
  });

  const rpUnicasData = sheetUnicas.getDataRange().getValues();
  if (rpUnicasData.length <= 1) return; 

  const rpUnicasHeaders = rpUnicasData[0];
  const rpUnicasBody = rpUnicasData.slice(1);

  const ID_TRABAJADOR_INDEX_RP = _getHeaderIndex('id trabajador', rpUnicasHeaders);
  const PUESTO_COL_INDEX = _getHeaderIndex('Puesto Incorpora', rpUnicasHeaders);
  const EQUAL_COL_INDEX = _getHeaderIndex('Equal', rpUnicasHeaders);

  if (ID_TRABAJADOR_INDEX_RP === -1 || PUESTO_COL_INDEX === -1 || EQUAL_COL_INDEX === -1) {
    Browser.msgBox('Error', 'Falta la columna "id trabajador" o las columnas nuevas en la hoja "rp-unicas".', Browser.Buttons.OK);
    return;
  }

  const updatedData = [rpUnicasHeaders];

  rpUnicasBody.forEach(row => {
    const idTrabajador = String(row[ID_TRABAJADOR_INDEX_RP]).trim();
    const workerInfo = workerMap.get(idTrabajador);

    while (row.length <= EQUAL_COL_INDEX) {
        row.push('');
    }

    if (workerInfo) {
      row[PUESTO_COL_INDEX] = workerInfo.puesto;
      row[EQUAL_COL_INDEX] = workerInfo.equal;
    } else {
      row[PUESTO_COL_INDEX] = 'NO ENCONTRADO';
      row[EQUAL_COL_INDEX] = 'NO ENCONTRADO';
    }
    updatedData.push(row);
  });

  sheetUnicas.getRange(1, 1, updatedData.length, updatedData[0].length).setValues(updatedData);
}

// ----------------------------------------------------------------------
// PASO 3: CREAR RESUMEN POR PUESTO Y EQUAL - MODIFICADO CON FILTRO partes asociados != 0
// ----------------------------------------------------------------------
function _crearResumenPuestos(ss, sheetUnicas) {
  const TARGET_SHEET_NAME = 'resumen-puestos';

  const allData = sheetUnicas.getDataRange().getValues();
  if (allData.length <= 1) {
    Logger.log('La hoja ' + sheetUnicas.getName() + ' está vacía.');
    return;
  }

  const headers = allData[0];
  const data = allData.slice(1);

  // Índices de las columnas de agrupación y la nueva columna de filtro
  const PUESTO_INDEX = _getHeaderIndex('Puesto Incorpora', headers);
  const EQUAL_INDEX = _getHeaderIndex('Equal', headers);
  const PARTES_ASOCIADOS_INDEX = _getHeaderIndex('partes asociados', headers); // Nuevo índice

  if (PUESTO_INDEX === -1 || EQUAL_INDEX === -1 || PARTES_ASOCIADOS_INDEX === -1) {
    Browser.msgBox('Error', 'Faltan las columnas requeridas ("Puesto Incorpora", "Equal" o "partes asociados") en "rp-unicas".', Browser.Buttons.OK);
    return;
  }

  const summaryMap = new Map();

  data.forEach(row => {
    const partesAsociados = String(row[PARTES_ASOCIADOS_INDEX]).trim();
    
    // ✨ MODIFICACIÓN 2: Solo contar si partes asociados es distinto de 0
    // Asumimos que "distinto de 0" es suficiente, ya que el usuario indica que es "igual a 1".
    if (partesAsociados === '0') {
      return; // Saltar este registro
    }
    
    const puesto = row[PUESTO_INDEX] || '(Vacío)';
    const equal = row[EQUAL_INDEX] || '(Vacío)';

    const key = `${puesto}|${equal}`;

    summaryMap.set(key, (summaryMap.get(key) || 0) + 1);
  });

  // Formatear los resultados para la hoja
  const summaryOutput = [['Puesto Incorpora', 'Equal', 'Conteo de Registros Únicos (Partes Asociados != 0)']];
  
  summaryMap.forEach((count, key) => {
    const [puesto, equal] = key.split('|');
    summaryOutput.push([puesto, equal, count]);
  });

  // Escribir los resultados en la nueva hoja
  const sheetResumen = _getOrCreateSheet(ss, TARGET_SHEET_NAME);
  sheetResumen.clearContents();
  sheetResumen.getRange(1, 1, summaryOutput.length, summaryOutput[0].length).setValues(summaryOutput);
  sheetResumen.autoResizeColumns(1, 3);
}


// ----------------------------------------------------------------------
// FUNCIONES AUXILIARES (Sin cambios)
// ----------------------------------------------------------------------
function _getHeaderIndex(headerName, headers) {
  return headers.findIndex(h => h.toString().trim().toLowerCase() === headerName.trim().toLowerCase());
}

function _getOrCreateSheet(ss, sheetName) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    Logger.log(`Hoja "${sheetName}" creada.`);
  }
  return sheet;
}

