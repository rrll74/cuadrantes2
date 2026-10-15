# PRODUCTIVIDAD / EVALUACIÓN AL DESEMPEÑO

## Introducción

Se pretende generar una nueva funcionalidad o módulo para la productividad (también llamada Evaluación al Desempeño) dentro del apartado general de Servicios Operativos que agrupe los trabajadores (que pasarán a llamarse colaboradores cuando se refieran en este apartado) con un supervisor. A su vez puede existir un supervisor que gestione a una serie de supervisores con lo que estos supervisores pasarían a llamarse supervisores intermedios.
El periodo de duración de cada productividad se agrupará anualmente y se extenderá desde el 1 de julio de un año hasta el 30 de junio del año siguiente.
La productividad será marcada para supervisores, supervisores intermedios y colaboradores, y son diferentes para cada categoría de las señaladas. Incluso dentro de los grupos de colaboradores puede existir diferencias entre los objetivos de un trabajador y otro, aunque existirán unos objetivos obligatorios comunes a todos los colaboradores, otros comunes a todos los supervisores intermedios, otros comunes a los supervisores y otros genéricos dentro del grupo al que pertenezcan, de manera que estos últimos objetivos pueden asignarse al grupo completo y después modificarse individualmente, siempre que no sea uno de los objetivos obligatorios.
Esta distribución viene totalmente explicada en el documento del reglamento redactado por la Sección de Personal en el fichero "reglamento-manual_evaluacion-desempeno-2025.pdf" (también en formato Markdown para mejor compresión del agente de IA .md) en la carpeta `analisis/productividad`.

## Detalles técnicos

Para la implementación de la productividad será necesario crear nuevas tablas en la base de datos, formularios de interacción para incluir, modificar o eliminar datos y para la obtención de listados y fichas en formato PDF o Excel que se entregarán a la Comisión de Garantías.

### Base de datos

Las nuevas tablas que se crearán se realizarían en la base de datos que se considera nueva. La antigua se utilizará para la obtención de muchos de los datos necesarios para saber información sobre los colaboradores y cambio que se han realizado de cuadrantes o contratos para el rellenado de listas o fichas.

#### Base de datos antigua (Consulta)

La información necesaria en la base de datos antigua que se puede necesitar es la siguiente:

1. **Ficha del trabajador**: Para saber su nombre, DNI o cualquier otro dato personal o profesional que fuese necesario.
2. **Contratos/Puestos**: Para saber en qué periodos ha trabajado el año que corresponda a la productividad.
3. **Vinculación a tipo de cuadrante**: Para saber en qué cuadrante está asignado durante un periodo de tiempo ya que, aunque el puesto indica en qué departamento ha realizado el trabajo, por cada departamento pueden existir varios cuadrantes diferentes y, por lo tanto, no determinarse en qué programa está ubicado el trabajador.
4. **Asignaciones en cuadrantes**: Una vez extraídas las distintas vinculaciones que tiene un trabajador con los distintos cuadrantes en los que ha estado incluido, la forma más correcta de saber las fechas entre las que ha estado exactamente es mirar las asignaciones de estados de trabajo que ha tenido para, de esta forma, determinar con más exactitud que porcentajes de tiempo correspondería a cada programa en la productividad del trabajador.

**Nota**:
Un cuadrante podría contener varios programas con sus supervisores o supervisores intermedios debido a la gran cantidad de trabajadores que contendría, por lo que cierta parte de asignación de colaboradores a programas tendría que poder hacerse manualmente ya que no hay forma de discriminar si un trabajador hace un cambio de programa entre los de un mismo cuadrante.
Con esta información se determina exactamente en qué cuadrantes/programas ha estado cada trabajador en cada periodo de tiempo, a excepción de los cuadrantes con varios programas y cuyos trabajadores no varían de cuadrante. Para estos casos exclusivos, se tendría que poder crear/editar la información de colaboradores en cambios de programa.

#### Base de datos nueva (nuevas tablas)

Las tablas para el almacenamiento de toda la información relativa a la productividad se realizará en la base de datos nueva. Estas tablas deberán contar una serie de campos mínimos que pueden ser los siguientes:

1. **Programas**: Debe contener el año del programa (Por ejemplo 2025, significaría la productividad de jul-2025 a jun-2026), nombre del programa, el cuadrante al que se vinculará, el supervisor intermedio y el supervisor, y los colaboradores (trabajadores).
2. **Objetivos**: Debe contener, tanto el detalle de los objetivos, cuyo contenido está descrito en la ficha de objetivos, como la consecución de esos objetivos.
3. **Registro de informes**: Se debe vincular cada informe o documento que se genere con el programa, trabajador y año al que pertenezca por si fuese necesario reimprimirlo y poder ser eliminable cuando ya no sea necesario.
4. **Documentos importados**: Debe contener la información vinculante entre los documentos subidos a cada objetivo y trabajador al que se refiere.
5. **Documentos exportados**: Debe contener la información vinculante sobre los distintos informes o fichas que se hayan ido generando, ya sea como listados que se han pasado para la Comisión de Garantías como fichas o informes de "Variación de Objetivos" o "Cambios de Programa".
6. **Objetivos por defecto**: Debe contener la información relativa a los objetivos obligatorios para los colaboradores, para los supervisores o supervisores intermedios y los objetivos por defecto en un programa específico. Esta información deberá ser copiada a los objetivos de un trabajador para un periodo de tiempo específico y en un programa en particular, por lo que la edición o borrado de uno de estos objetivos no alterará los datos existentes en los objetivos creados y/o conseguidos por los trabajadores, ya que sólo sirven de plantilla para el rellenado de información.

### Formularios a crear

El diseño básico de la colocación de formularios está detallado en el documento "Formularios ED.pdf".

#### Formulario de agregar/editar supervisor

El formulario contendrá, además del dato del supervisor que se esté editando (en su caso), un selector donde se podrá elegir a un trabajador de entre todos los existentes en la base de datos y dos botones, uno para agregarlo/editarlo y otro para cancelar el proceso.

#### Formulario de agregar/editar supervisor intermedio

El formulario contendrá, además del dato del supervisor intermedio que se esté editando (en su caso), un selector donde se podrá elegir a un trabajador de entre todos los existentes en la base de datos, un selector donde se podrá elegir el supervisor entre los ya creados y dos botones, uno para agregarlo/editarlo y otro para cancelar el proceso.

#### Formulario de lista de supervisores y supervisores intermedios

El formulario contendrá:

1. Un radiobutton con dos opciones: una para Supervisores y otra para Supervisores intermedios.
2. Un botón de nuevo supervisor que llevará al formulario de agregar/editar supervisor.
3. Un botón de nuevo supervisor intermedio que llevará al formulario de agregar/editar supervisor intermedio.
4. Una tabla con la lista de Supervisores intermedios, supervisores y las opciones de editar y eliminar en sendos botones. Si el radiobutton que está elegido es el de supervisores la columna de supervisores intermedios no aparecerá en la lista.

#### Formulario para agregar/editar un programa

El formulario debe tener, al menos, la siguiente información:

1. Año del programa (obligatorio): Indicará el año, el día 1 de julio, en el que comienza el programa y el año siguiente, el 30 de junio, es cuando terminaría el periodo de vigencia del programa.
2. Nombre del programa (obligatorio): Como norma general hará referencia parecida a la del cuadrante donde se incluye, aunque si pueden existir más programas en ese mismo cuadrante deberá llevar algún distintivo que lo diferencie.
3. Cuadrante: Se elegirá de entre los Cuadrantes existentes. Este campo no es obligatoria ya que puede existir un programa que obtenga los colaboradores de varios cuadrantes como puede ser el programa que controla a los supervisores intermedios.
4. Supervisor intermedio: Se elegirá de entre cualquiera de los trabajadores, ya que el propio supervisor intermedio no tiene porqué estar incluido en el cuadrante elegido, puede estar en otro. Este campo no es obligatorio, ya que puede no existir un supervisor intermedio.
5. Supervisor (obligatorio): Al igual que el Supervisor intermedio, se puede elegir de entre cualquiera de los trabajadores. Un mismo supervisor puede serlo de varios programas al mismo tiempo, sin embargo un Supervisor intermedio solo puede serlo de uno.
6. Es Programa de supervisores (obligatorio): Una casilla de verificación que indique si el programa es el de control del supervisor a supervisores intermedios.
7. Botón agregar/editar: Permite incluir esta información en la base de datos, agregándola si es nueva o modificándola si ya existía.
8. Botón cancelar: Permite salir del formulario sin guardar ningún cambio

#### Listado de programas

El formulario contendrá:

1. Una tabla con la lista de programas, su supervisor, el supervisor intermedio (si hay), un botón para editar los colaboradores, un botón de editar que llevaría al formulario de edición de programa, un botón de eliminar que eliminaría toda la información del programa (hay que avisar muy claramente que se perdería toda la información que cuelga de ese programa) y un botón de colaboradores que llevaría al listado de colaboradores del programa.
2. Un botón de agregar un nuevo programa que llevará al formulario de agregar/editar un programa.
3. Un botón de agregar un nuevo supervisor que llevará al formulario de agregar/editar un supervisor.
4. Un botón de agregar un nuevo supervisor intermedio al formulario de agregar/editar un supervisor intermedio.
5. Un botón para exportar la información en formato PDF y Excel. Este listado contendrá un resumen completo de la información de cada programa y de los supervisores intermedios y colaboradores que contiene. Para la generación en los distintos formatos quizás es necesario generar dos botones que lo identifiquen o un radiobutton, que por defecto escoja el PDF, que discrimine entre ambos formatos.
6. Un buscador en el que al escribir se vayan filtrando las filas cuyos caracteres escritos coincidan con alguno de los campos de ella, total o parcialmente.

#### Listado de colaboradores

El formulario contendrá:

1. La información del Supervisor, Supervisor intermedio (si existe) y el cuadrante por defecto del programa.
2. Una lista seleccionable que contenga todos los trabajadores del cuadrante por defecto que aún no estén incluidos en la tabla de colaboradores (para evitar duplicarlos), en el que se sea multiselección.
3. Un botón de Agregar trabajador/es que permita agregar los trabajadores seleccionados a la tabla con la lista de colaboradores.
4. Un selector que incluya el listado de trabajadores activos durante el tiempo de vigencia del programa para prevenir que se incluya algún trabajador que pudiese estar inmerso en un cuadrante que fuese distinto del incluido en programa por defecto.
5. Una tabla con la lista de colaboradores, la fechas de inicio y fin en el programa (si es un trabajador que está todo el año en el mismo programa se pondría la fecha de inicio y fin del programa, aunque puede ser un trabajador que haya tenido varios periodos por cortes de contrato, por lo que puede tener varios periodos), la lista de los objetivos no cumplidos (esta columna deberá quitarse si el cálculo para ponerla es demasiado complejo y retrasa mucho la exposición del listado), un botón de modificar la información que llevaría al formulario del colaborador y un botón de eliminar que eliminase toda la información relativa a ese colaborador en ese programa, avisando de la pérdida de esa información.

#### Formulario de colaborador

El Formulario del colaborador mostrará inicialmente una tabla con todos los periodos de inicio y fin del trabajador como contratos, de manera que se pueden dar 3 casos para cada línea de los periodos de contrato de un trabajador:

1. Que el inicio sea igual o anterior al 1 de julio del periodo de productividad, por lo que se marcará como inicio el 1 de julio.
2. Que el fin sea igual o posterior al 30 de junio del periodo de productividad, por lo que se marcará como fin el 30 de junio.
3. Que las fechas de inicio o fin, o ambas, estén incluidas en el periodo de productividad, por lo que se pondrán esas fechas de inicio y fin.

Por cada una de esas líneas de periodos se incluirá un botón de "Agregar periodo" que agregará el periodo a una segunda tabla dentro de este mismo formulario que mostrará lo siguiente por cada columna:

1. Columna Periodo: indicará el inicio y fin de un periodo para objetivos del colaborador en ese programa.
2. Columna días: indicará el número de días entre la fecha de inicio y la de fin y el porcentaje que supone del periodo de productividad. Por ejemplo, 31 días (8,4931%)
3. Columna Objetivos: indicará los objetivos que tiene marcados el trabajador para ese periodo y si los tiene cumplidos o no indicando un check ✅ de conseguido o un aspa ❎ en caso de no conseguido.
4. Columna de opciones: incluirá tres botones:
   1. Editar periodo: lanzará un popup que permitirá editar las fechas de inicio y fin y tendrá dos botones, uno para guardar el periodo y otro para cancelar la operación. Los seleccionables de las fechas serán desplegables de tipo fecha y antes de almacenar la información se deberá verificar que el trabajador no tiene otros periodos creados que solapen al que se desea guardar.
   2. Editar objetivos: que llevará al formulario de agregar/editar objetivos de un trabajador para un periodo.
   3. Eliminar: eliminará la información relativa al periodo y objetivos de ese trabajador. Se tiene que indicar claramente que esa información no podrá ser recuperada, ya que con esa eliminación, si se han subido documentos de consecución de objetivos para ese periodo pueden perderse definitivamente.

#### Formulario de agregar/editar objetivos de un trabajador para un periodo

El formulario contendrá:

1. Un botón de "Insertar objetivos Obligatorios" que insertará los objetivos obligatorios para los colaboradores en la tabla de más abajo.
2. Un botón de "Insertar objetivos por defecto para el Programa" que insertará los objetivos marcados para ese programa específico por defecto.
3. Un botón de "Agregar objetivo" que lanzará el formulario de agregar/editar objetivo de trabajador.
4. Tabla de objetivos. Tendrá las siguientes columnas de información (las columnas Resultado, Superado y Puntuación serán sólo informativas para que, si se va a borrar el objetivo se sepa que ya tiene información o documentos vinculados con él y que serán borrados igualmente). Las columnas 7, 8 y 9 de la tabla son opcionales y no es necesario incluirlas si van a generar más problema que solución.:
   1. Columna Obligatorio: indicará si es un objetivo obligatorio, por defecto para el programa o creado para este trabajador. Si es obligatorio, en la edición sólo se podrá modificar el umbral debido a que por el periodo que tenga asignado este trabajador, este objetivo pueda ser inferior la marcado inicialmente.
   2. Columna Descripción: indicará el detalle del objetivo.
   3. Columna Tipo: indicará si es un objetivo individual o colectivo.
   4. Columna Ponderación: indicará qué peso se le asigna a este objetivo. Se ha de tener en cuenta que la suma de todas las ponderaciones debe dar el 100%.
   5. Columna Categoría: indicará si es del tipo número o porcentaje para el objetivo.
   6. Columna Umbral: indicará el número mínimo o máximo para superar el objetivo. Si es mínimo o máximo vendrá marcado por el campo de Superación que sería al alza o baja, respectivamente.
   7. Columna Resultado: indicará el número alcanzado respecto del objetivo marcado en el umbral.
   8. Columna Superado: indicará si ha sido superado o no, según la columna resultado comparada con la de umbral, teniendo en cuenta la de superación (alza o baja).
   9. Columna Puntuación: indicará como número el valor que tenga asignado en la ponderación, dependiendo si lo ha superado o no.
   10. Columna Opciones: contendrá dos botones, uno para eliminar el objetivo (se deberá avisar que el borrado es irrecuperable y que se puede perder información de documentos ya subidos) y otro para editar que llevará al formulario de inserción/edición de objetivos de un trabajador.

Para los botones de los puntos 1 y 2, cuando se agregan estos objetivos se debe incluir en el registro del objetivo del trabajador una marca que determine de qué objetivo genérico proviene para que, si se modifica, se pueda afectar directamente a todos sin que haya que pasar uno por uno.

#### Formulario de agregar/editar de objetivo de trabajador

Si lo que se quiere hacer es editar el objetivo y este está marcado como obligatorio, sólo se podrá editar el campo de umbral, ya que los demás, por el valor de este campo no debería poderse cambiar.
En el caso de inserción de un nuevo objetivo, los campos a poder editar son:

- Obligatorio: será un radiobutton con las opciones de Sí y No.
- Descripción: será un input o memo que permita un texto largo de unos 500 caracteres como máximo.
- Tipo: será un radiobutton con las opciones de Individual y Colectivo.
- Ponderación: será un input en el que se podrá poner un valor numérico y que indicará un valor porcentual de peso del objetivo respecto del total de objetivos.
- Categoría: será un radiobutton con las opciones Número y Porcentaje.
- Umbral: será un input en el que se podrá poner un valor numérico y que indicará el valor mínimo o máximo a alcanzar para cumplir el objetivo.
- Inferior al anual: será una casilla de verificación que indicará si este objetivo es reducido, respecto a los objetivos generales para un año completo.
- Razón por inferior al anual: será un input donde se indicará brevemente la razón por la reducción de este objetivo.
- Superación: será un radiobutton con las opciones de Alza y Baja.

Esta información irá directamente vinculada con la tabla que corresponda de la base de datos de trabajador, periodo, programa y objetivos.

#### Formulario de agregar/editar objetivo por defecto

Este tipo de objetivos son los genéricos que se utilizarán cuando a un trabajador se le deseen asignar objetivos por defecto, ya sean obligatorios o de programa, que posteriormente pueden ser editados individualmente para cada trabajador.
Este tipo de formulario contendrá:

1. Tipo de trabajador: será un selector donde se podrá seleccionar si es supervisor, supervisor intermedio o colaborador.
2. Programa por defecto: será un selector que contendrá los distintos programas existentes y que puede quedar vacío. En tal caso, este tipo de objetivo será genérico para el tipo de trabajador elegido.
3. Un cuadro con la información del objetivo, aunque no editable este mismo formulario. Si aún no se ha dado ninguna, se incluirán unos valores por defecto para mostrar y se indicará que todavía no están cumplimentados los datos. Se podrá editar a través de un botón que se incluya en el propio cuadro. La información contenida en el cuadro será toda la que se puede modificar en un formulario de agregar/editar objetivos de un trabajador. Al clicar sobre el botón de editar se lanzará el formulario de editar objetivos de un trabajador, pero con los datos de este objetivo.
4. Un botón de Guardar que almacenará la información en la base de datos.
5. Un botón de Guardar y afectar dependientes que, además de almacenar la información en la base de datos, buscará todos los objetivos relacionados para los trabajadores y los modificará en base a la información dada.
6. Un botón de Cancelar que volverá al listado de objetivos obligatorios por tipo de trabajador por defecto por Programa.

#### Listado de objetivos obligatorios por tipo de trabajador y por defecto en Programa

Este listado contendrá la información de los distintos objetivos que se podrán utilizar por defecto en los siguientes casos:

1. Cuando se deseen asignar los objetivos obligatorios por defecto para un tipo de trabajador (Supervisor, Supervisor intermedio o colaborador).
2. Cuando se deseen asignar los objetivos por defecto de un programa en particular a un trabajador específico.

Este formulario contendrá:

1. Un botón de Agregar objetivo que llevará al formulario de agregar/editar objetivo por defecto.
2. Una tabla con las siguientes columnas:
   1. Tipo trabajador: indicará si el objetivo creado es para un tipo específico de trabajador (Supervisor, Supervisor Intermedio o Colaborador).
   2. Obligatorio: indicará si el objetivo creado es de los obligatorios para ese tipo de trabajador o no lo es. En caso de no serlo, tendrá que tener un programa por defecto asignado.
   3. Descripción: indicará el texto específico que describe el objetivo a cumplir por el trabajador.
   4. Programa: indicará el Programa por defecto al que se asignará este objetivo, que deberá ser No obligatorio.
   5. Opciones: Un botón de editar que llevará al formulario de agregar/editar objetivo por defecto y un botón de eliminar, que borrará este objetivo de la base de datos. El borrado de este tipo de objetivos debe estar muy claramente indicado y, en caso de hacerse, se tiene que eliminar la referencia de origen de todos los registros de objetivos de trabajadores a las que les afecte.

#### Formulario de detección automática de cambios de programa e inclusión en el nuevo programa

Para detectar los cambios automáticos den Programas se parte de que cada trabajador está incluido en el programa del cuadrante al que pertenezca, de esta forma, se puede saber rápidamente:

1. Los nuevos colaboradores de un programa debido a que un trabajador tenga asignaciones en los estados de trabajo durante el periodo de la productividad.
2. Los cambios de Programa de un trabajador debido a la detección de asignaciones en los estados de trabajo en un cuadrante diferente al del Programa en el que ya está incluido.

Se interpretarán como nuevas incorporaciones, si no existen inclusiones del trabajador en ningún Programa ese año, y cambios de Programa, si ya existen en algún otro.

El formulario de detección de cambios contendrá dos tablas con la siguiente información:

Un selector de año que indicará el año de la productividad. Seguidamente, tras su selección, se indicará el periodo que conlleva esa productividad o evaluación al desempeño que lleva desde el 1 de julio del año marcado hasta el 30 de junio del año siguiente.

_Tabla de nuevas incorporaciones_ contiene los siguientes campos:

1. Trabajador: nombre del trabajador detectado.
2. Periodo: fechas de inicio y fin detectadas en el cuadrante, según las asignaciones de estados de trabajo.
3. Cuadrante: cuadrante donde se han detectado las asignaciones en las fechas marcadas.
4. Programa propuesto: Según los programas que tenga asignado ese cuadrante se incluirá su nombre y un botón de "Incluir". Un cuadrante puede tener varios programas asignados, por lo que puede ocurrir que en esta celda se tengan que incluir varios Programas con sus respectivos botones de inclusión.

_Tabla de cambios de Programa_ contiene los siguientes campos o columnas:

1. Trabajador: nombre del trabajador detectado.
2. Periodo programa: último periodo del programa en el que estuvo incluido.
3. Programa: último programa en el que estuvo incluido.
4. Periodo: fechas de inicio y fin detectadas en el cuadrante, según las asignaciones de estados de trabajo.
5. Cuadrante: cuadrante donde se han detectado las asignaciones en las fechas marcadas.
6. Programa propuesto: Según los programas que tenga asignado ese cuadrante se incluirá su nombre y un botón de "Incluir". Un cuadrante puede tener varios programas asignados, por lo que puede ocurrir que en esta celda se tengan que incluir varios Programas con sus respectivos botones de inclusión.

#### Gestión de documentación de un trabajador para la consecución de objetivos en un programa

##### Listado de empleados en programa

Este listado mostrará de forma general los objetivos de cada trabajador y su documentación faltante, dando acceso a su edición. Contendrá lo siguiente:

1. Selector de año: se podrá elegir el año de de referencia y después se mostrarán las fechas del periodo que implica (del 1 de julio del año elegido hasta el 30 de junio del siguiente).
2. Selector de programa: se podrá elegir uno de los programas entre los existentes.
3. Tabla de información:
   1. Columna Trabajador: mostrará el nombre completo del trabajador.
   2. Columna % objetivos subidos: mostrará, según la información de cumplimiento de objetivos y documentación subida, el porcentaje alcanzado.
   3. Columna Documentación faltante: Indicará un listado de los objetivos que tienen un valor de consecución diferente a 0 y que no tienen documentación subida.
   4. Columna Opciones: incluirá un botón "Documentación adjunta" que llevará al listado de Documentación y consecución de objetivos de un trabajador para un programa.

Los selectores indicados actualizarán la tabla cada vez que se les cambie la opción.

##### Listado de documentación y consecución de objetivos de un trabajador para un programa

Este listado mostrará la información básica del trabajador (nombre completo, programa donde está incluido y año de referencia de la productividad) y un tabla con la información del cumplimiento de los objetivos de ese trabajador para ese programa:

1. Columna Obligatorio: Indica si el objetivo del trabajador es obligatorio (Sí) o está entre los adicionales que puede tener (No).
2. Columna Descripción: Indica la descripción completa del objetivo.
3. Columna Tipo: Indica si es un objetivo de tipo individual o colectivo.
4. Columna Doc. Subida: Indica si ese objetivo tiene documentación subida que respalde su cumplimiento (Sí/No).
5. Columna Categoría: Indica si el objetivo es de categoría número o porcentual.
6. Columna Umbral: Indica el umbral mínimo o máximo para conseguir el objetivo (numérico).
7. Columna Alza/Baja: Indica si se tiene que alcanzar como mínimo el umbral (alza) o como máximo (baja).
8. Columna Resultado: Indica el valor obtenido para ese objetivo.
9. Columna Superado: Indica si el resultado, junto con el umbral y el valor de alza/baja hacen que se llegue a la superación del objetivo. Si no se ha subido documentación que acredite esta superacón, se dará por no superado también.
10. Columna Puntuación: Es el valor de peso que se aplica a ese objetivo para la puntuación final.
11. Columna Opciones: Se incluirán dos botones:
    1. Editar: permite editar si se ha conseguido el objetivo, indicado por un número.
    2. Eliminar: borra toda la información de ese objetivo para ese trabajador en ese programa y la documentación que tenga aparejada.

##### Formulario de consecución y subida de documentación de objetivo

Este formulario rellena la información sobre el cumplimiento de un objetivo. Este formulario contendrá:

1. Un cuadro con todos los datos no editables del objetivo: año, programa, trabajador, obligatorio, descripción, tipo, ponderación, categoría, umbral y alza/baja.
2. Un input donde se indicará el valor o puntuación conseguida en ese objetivo.
3. Un listado con los distintos documentos justificativos del objetivo subidos. Cada fila del listado contendrá:
   1. Descripción del documento.
   2. Botón Ver/Descargar que permitirá ver y descargar el documento.
   3. Botón Eliminar que borrará el documento de la base de datos y del almacenamiento.
4. Un botón para agregar un nuevo documento que llevará al formulario de subida de documento.

Si el valor conseguido supera el umbral, pero no hay documentación subida, se debe mostrar un mensaje de advertencia indicando que falta esto.

##### Formulario de subida de documento

El formulario servirá para anexar un nuevo documento a un objetivo de un trabajador para un programa. Constará de:

1. Un input donde se incluirá la descripción del documento. Si no se da ninguno se dará un por defecto, por ejemplo (documento [número de documento]).
2. Un input de tipo file que permitirá la anexión del documento, sólo deben permitirse documentos PDF.
3. Un botón agregar que realice el almacenamiento de la información.

### Filtros y listados

Se necesitarán, como mínimo, una serie de listados para realizar el seguimiento y comunicación de información a la Comisión de Garantías sobre los objetivos para el año siguiente (fichas sin rellenar la parte de objetivos cumplidos), la consecución parcial/total de objetivos (fichas con la parte de objetivos cumplidos rellena), informe económico final para la Comisión de Garantías (ficha general y matriz de resultados de informe económico), informe mensual de nuevas incorporaciones a programas, informe mensual de cambios de programa de colaboradores con informe mensual de variación de objetivos, además de los listados de los estados actuales sobre la información de documentos subida para la consecución de objetivos.

- **Objetivos para el siguiente año**: Son las fichas con los objetivos de los colaboradores con la salvedad de que no tienen rellena la información sobre el cumplimiento de objetivos, ya que esta sólo sirve para informar a la Comisión de Garantías sobre cuales van a ser los objetivos de cada trabajador de cada programa para el año siguiente.
- **Consecución parcial/total de objetivos para Comisión de Garantías**: Son las fichas con los objetivos de los colaboradores con toda la información existente sobre la consecución de objetivos ya realizada. Todas estas fichas se acompañan de un informe que indica el listado con toda la información resumida que se está generando.
- **Informe económico final para la comisión de Garantías**: Es el informe de resumen de valores económicos y la matriz de resultados por cada programa y el reparte económico en base al valor económico asignado por trabajador en el curso de evaluación al desempeño correspondiente.
- **Informe mensual de nuevas incorporaciones a programas**: Se trata de un informe que resume las nuevas incorporaciones a los distintos programas y donde se incluyen todas las sin los objetivos cumplidos.
- **Informe mensual de cambios de programa de colaboradores con informe mensual de variación de objetivos**: Se trata de un informe doble; por un lado se genera un informe indicando qué colaboradores han cambiado de programa y las fechas en las que ha estado en el programa anterior y el comienzo de la nueva, y por otro un informe de la variación de objetivos que se ha sufrido debido a esa diferencia de periodo de tiempo en distintos programas.
- **Listados de los estados de los colaboradores (seguimiento)**:
  - _Estado de consecución de objetivos_: Se trataría de un listado donde se indique el estado de consecución de cada objetivo de cada colaborador de un programa específico.
  - _Documentación enviada y faltante a Comisión de Garantías_: Se trata de un informe sobre la información que ya se ha generada en PDF o Excel y que está almacenada en el registro de informes para no olvidar enviar nada a la Comisión de Garantías.

#### Objetivos para el siguiente año

- Los objetivos deberán haber sido rellenados en los formularios correspondientes donde se debe haber indicado todos los que vaya a tener cada trabajador de cada programa. La suma de la ponderación de objetivos de cada trabajador deber ser 100%.
- La ficha a visualizar de cada trabajador deber ser igual a la que se utiliza, según el formato suministrado por la Comisión de Garantías.
- El listado a mostrar se debe poder generar en dos formatos diferentes, PDF y Excel.
  - El PDF creará una página por cada trabajador con toda la información necesaria. Es útil para imprimir y que la firmen los encargados y colaboradores.
  - El Excel será necesario entregarlo para que la Comisión de Garantías realice sus cálculos pertinentes. En ese sentido, las celdas deberán tener valores calculados cuando dependan de otros. Se creará una hoja de cálculo en el libro por cada trabajador, además de una del Supervisor, otra del Supervisor intermedio y otra de resumen.

El formulario de listado de objetivos para el siguiente año contendrá:

1. Un selector de año, donde se indicará el año a buscar.
2. Un selector de programa, donde se mostrarán todos los programas para ese año seleccionado.
3. Un multiselector para los empleados de ese programa, donde si no se indica ninguno, se entenderá que se eligen todos.
4. Un radiobutton donde se podrá elegir el formato de salida: PDF o Excel.
5. Un botón de Crear documento que realizará la generación del fichero correspondiente y lo descargará automáticamente.

#### Consecución total/parcial de objetivos para Comisión de Garantías

- El formulario necesario para este listado es exactamente el mismo que para el anterior, por lo que, para generar este, se podrá simplemente agregar un selector o radiobutton que discrimine ambos listados.
  - radiobutton: Objetivos para el siguiente año
  - radiobutton: Consecución total/parcial de objetivos para la Comisión de Garantías
- En este listado, además de la información del listado anterior, se debe incluir la que indique qué objetivos se han cumplido y su repercusión en los porcentajes. Además, para el formato PDF, se deberá hacer un compendio, por trabajador, de la documentación justificativa de la consecución de objetivos.

#### Informe económico final para la Comisión de Garantías

El listado deberá seguir las directrices marcadas por el departamento de Personal y que actualmente son:

- Se asignará una cantidad fija de reparto por trabajador.
- Se establecerá un coeficiente único por trabajador en una unidad organizativa que será: Coef. = Sum (días trabajados x % jornada).
- La cantidad económica máxima asignada sera el valor fijo por trabajador multiplicada por el coeficiente único: Asig = Max 100% x Coef.
- Se establecerá una puntuación en base a los objetivos alcanzados (Punt).
- Se calculará un incentivo inicial (I0) que será la multiplicación del valor asignado por la puntuación dividido por 100: I0 = (Asig x Punt) / 100.
- Se generará una bolsa con la suma de todos los restantes que no han sido asignados a los trabajadores por no cumpir todos los objetivos: Bolsa = Sum (Asig - I0).
- La bolsa será dividida por el número de trabajadores que han alcanzado, al menos, una puntuación de 70: Reparto = Bolsa / Trab. min 70.
- El incentivo final de cada trabajador sería la suma de su incentivo inicial (I0) más o que le corresponda por reparto: If = I0 + Reparto.

La ficha tiene que asemejarse a la suministrada por la Comisión de Garantías y el formulario de petición puede ser muy parecido al utilizado en el apartado anterior. Incluso puede añadirse como una opción adicional. Deberá contener:

1. Un selector de año, donde se indicará el año a buscar.
2. Un selector de programa, donde se mostrarán todos los programas para ese año seleccionado.
3. Un input donde se indique la cantidad base asignada a cada trabajador.
4. Un radiobutton donde se podrá elegir el formato de salida: PDF o Excel.
5. Un botón de Crear documento que realizará la generación del fichero correspondiente y lo descargará automáticamente.

La creación de este informe debe quedar abierta, ya que aún quedan flecos por afinar y mejoras que pueden llegar a realizarse como son:

- Reparto de bolsa, en caso de que ningún trabajador llegue a la puntuación de 70 en un programa.
- Posible reparto más equitativo frente a:
  - Trabajadores que no han obtenido 100 puntos.
  - Trabajadores con coeficiente único menor a 1 (100%).
- Posible acumulación del valor de reparto para presupuesto del año siguiente.

#### Informe mensual de nuevas incorporaciones a programas

- Este listado deberá poder generar un resumen de las nuevas incorporaciones a programas y un listado con las fichas de presentación de objetivos para Comisión de Garantías.
- El listado también deberá poder generarse en los formatos PDF y Excel.
- Preferentemente se tendrán por meses, pero deberá contemplarse la posibilidad de periodos distintos.
- Los trabajadores ya deberán estar incluidos en algún programa, porr lo que se realizarán búsquedas en las tablas donde se hayan recogido los datos de programas de trabajadores y se seleccionarán los que existan nuevos y que no estén contemplados en otros programas.
- El formulario de petición contendrá:
  - Un input de petición de fecha inicial.
  - Un input de petición de fecha final.
  - Un radiobutton donde se podrá elegir el formato de salida: PDF o Excel.
  - Un botón de Vista previa que mostrará el listado resumen antes de generarlo.
  - Un botón Generar resumen que lo generará en el formato elegido.
  - Un botón Fichas que generará las fichas de las nuevas incorporaciones en el formato elegido.

#### Informe mensual de cambio de programa de colaboradores con informe mensual de variación de objetivos

##### Informe mensual de cambio de programa de colaboradores

- Este informe tendrá todas las características del informe anterior, con la salvedad de que el trabajador ya debe estar incluido en un programa anterior.
- Tanto el formulario como la extracción de información se obtendrán de las mismas tablas que las del formulario anterior, pero en la especificación del resumen y la ficha incluirán el comienzo del periodo en el nuevo programa.

##### Informe mensual de variación de objetivos

- El formulario será igual que el informe anterior, pero sin el botón de "Fichas".
- La información se obtendrá de los valores de objetivos, donde previamente deberá existir una marca referenciando que los objetivos no corresponden a los de un año completo.

#### Listado de los estados de los colaboradores (seguimiento)

##### Estado de consecución de objetivos

Este listado deberá mostrar, por cada empleado, el estado de consecución de cada objetivo, buscando esta información en las tablas de objetivos del empleado. El formulario contendrá:

1. Un selector de año, donde se indicará el año a buscar.
2. Un selector de programa, donde se mostrarán todos los programas para ese año seleccionado.
3. Un multiselector para los empleados de ese programa, donde si no se indica ninguno, se entenderá que se eligen todos.
4. Un botón de Vista previa donde se previsualizará la información por pantalla.
5. Un botón de Crear documento que realizará la generación del fichero correspondiente y lo descargará automáticamente.

##### Documentación enviada y faltante para comisión de garantías

El formulario del listado es exactamente igual que el anterior, desde el punto de vista de elementos.
Este listado, además de mostrar la información del anterior, también indicará a qué objetivos les falta el documento escaneado, por lo que el listado anterior y este se podrían resumir en uno:

1. Un selector de año, donde se indicará el año a buscar.
2. Un selector de programa, donde se mostrarán todos los programas para ese año seleccionado.
3. Un multiselector para los empleados de ese programa, donde si no se indica ninguno, se entenderá que se eligen todos.
4. Un radiobutton con las opciones:
   1. Estado de consecución de objetivos.
   2. Documentación subida y faltante.
5. Un botón de Vista previa donde se previsualizará la información por pantalla.
6. Un botón de Crear documento que realizará la generación del fichero correspondiente y lo descargará automáticamente.

## Ficha de Objetivos

Los objetivos se plasmarán en una hoja resumen; ejemplos de la hoja resumen para supervisores (y supervisores intermedios) es "FICHA_RESULTADO_SUPERVISORES-INTERMEDIOS.pdf" y para colaboradores "FICHA_RESULTADO_COLABORADORES.pdf". Ejemplos de estas fichas se pueden encontrar en los documentos "FICHA_EJEMPLO_COLABORADOR.pdf", "FICHA_EJEMPLO_SUPERVISOR-INTERMEDIO.pdf" y "FICHA_EJEMPLO_SUPERVISOR.pdf". También existen herramientas en formato EXCEL para generar esta información de los ficheros anteriores pdf; las herramientas son "HERRAMIENTA_ED_OBJETIVOS COLABORADORES.xlsx" y "HERRAMIENTA_ED_OBJETIVOS SSOO-SUPERVISORES.xlsx". Todos estos documentos se encuentran en la carpeta `analisis/productividad` y contienen también los mismos ficheros con el mismo nombre, pero en formato Markdown (.md), para mejor compresión del agente de IA. Contendrá la siguiente información:

### Cabecera 1

Información sobre la Unidad o Programa: Nombre de la Unidad o Programa que el supervisor tiene a su cargo.
Supervisor/a: Nombre del/a supervisor/a.

### Cabecera 2

Puesto evaluado: Nombre del puesto del colaborador a supervisar.
Empleado/a evaluado/a: Nombre y apellidos del/a empleado/a evaluado/a.
DNI: DNI del empleado/a evaluado/a.

### Tabla descriptiva de objetivos

Es una tabla con una serie de columnas que indicarán, no solo los objetivos que se tienen que cumplir, sino también la consecución de estos objetivos.

#### Columna: ID

Es una columna autonumérica que indica el número de objetivo.

#### Columna: Objetivo (Descripción)

En una columna en la que se describirán cada uno de los objetivos que deberá realizar el trabajador. Entre ellas habrá una serie de objetivos que serán comunes para todo el grupo de colaboradores y otros que pueden ser individualizados según el puesto de trabajo que esté ocupando.

#### Columna: Tipo de objetivo

Existirán objetivos con dos tipos:

- Individual: Consistirá en que la evaluación de este objetivo depende exclusivamente de la realización del trabajador.
- Colectivo: Consistirá en que la evaluación de este objetivo será evaluada de forma conjunta para todo el colectivo de colaboradores que forman el grupo bajo el supervisor.

#### Columna: Ponderación / Peso Objetivo

La ponderación del objetivo marca el porcentaje de peso que se le atribuirá cuando se haga la distribución económica total que le correspondería por la consecución de objetivos.

#### Columna: Categoría

El objetivo puede tener dos tipos de categoría:

- Número: Indica que el valor mínimo o máximo que se tiene que alcanzar para conseguir el objetivo es un número.
- Porcentaje: Indica que el porcentaje mínimo o máximo que se tien que alcanzar para conseguir el objetivo es un porcentaje.

#### Columna: Umbral (numérico)

Es el valor numérico a alcanzar según la categoría indicada.

#### Columna: Superación

Existen dos valores diferentes:

- Alza: Cuando el valor numérico de umbral a alcanzar debe ser el marcado o por encima. Por ejemplo, cuando se tienen que gestionar un mínimo de x expedientes a la semana.
- Baja: Cuando el valor numérico de umbral a alcanzar debe ser el marcado o por debajo. Por ejemplo, cuando el número de encargos no gestionados no pueden superar el 15%.

#### Columna: Resultado alcanzado

Indica numéricamente los valores que el colaborador del grupo ha alcanzado en ese objetivo en concreto.

#### Columna: Superación Umbral

Este campo o columna realiza la comparativa de las columnas "Umbral (numérico)" y "Superación" con la de "Resultado Alcanzado" y refleja un Sí en caso de haberla superado y un No en caso contrario.

#### Columna: Puntuación aportada

En caso de que la columna "Superación Umbral" sea Sí, entonces refleja como valor numérico el mismo valor que esté establecido en la columna "Ponderación / Peso Objetivo", pero no en valor porcentual, sino numérico. Es decir que si la ponderación es, por ejemplo, del 20% reflejará el valor 20.

#### Fila final de la tabla

Se debe incluir un sumatorio de la columna "Ponderación /Peso Objetivo" y si estos suman el 100% se pintará la celda de verde y, en caso de ser diferente se pintará de rojo.
Se debe incluir un sumatorio de la columna "Puntuación aportada" que marcará el sumatorio de esa columna.

### Nota final

Se debe incluir siempre en la parte de abajo de la ficha el siguiente texto:

- IMPORTANTE: Esta hoja será firmada por la persona supervisada y evaluada antes del 31 de mayo del año de evaluación.

### Firmas

Se debe reflejar que debe ser firmada por Supervisor y Colaborador.

## Ficha de matriz de resultados

Los resultados económicos de los objetivos alcanzados por un programa y su reparto se plasmarán en una hoja resumen; ejemplo de la hoja resumen es "FICHA_MATRIZ_RESULTADOS_RESUMEN.pdf". El detalle del reparto económico se puede encontrar en el documento "FICHA_MATRIZ_RESULTADOS_DETALLE.pdf". También existe la herramientas en formato EXCEL para generar esta información de los ficheros anteriores pdf; la herramienta es "HERRAMIENTA_ED_MATRIZ_DE_RESULTADOS.xls". Todos estos documentos se encuentran en la carpeta `analisis/productividad` y contienen también los mismos ficheros con el mismo nombre, pero en formato Markdown (.md), para mejor compresión del agente de IA.

### Ficha detalle de matriz de resultados

Se puede encontrar un ejemplo en la carpeta `analisis/productividad`, en el documento "FICHA_MATRIZ_RESULTADOS_DETALLE.pdf" y también como parte de la hoja "Matriz de Resultados" del libro "HERRAMIENTA_ED_MATRIZ_DE_RESULTADOS.xlsx".
Esta ficha contiene los siguientes apartados:

#### Cabecera detalle

En la cabecera se proporcionará la siguiente información:

1. Nombre del programa.
2. Supervisor del programa.
3. Periodo evaluado.
4. Presupuesto asignado al programa. Este valor se calculará como el sumatorio de la columna "Incentivo inicial" de la tabla de detalle.
5. Base: Es la asignación económica que se obtiene al dividir el presupuesto general para toda la evaluación al desempeño entre toda la plantilla.
6. Número de empleados: es el número de empleados que cuentan para este listado.
7. Total bolsa incentivos: Es sumatorio de la columna "Suma de aportaciones a la bolsa del programa" de la tabla de detalle.
8. Número de empleados que participan en la bolsa: Es el número de trabajadores que llegan o superan los 70 puntos en la columna de la tabla de detalle "Puntuación resultante de los objetivivos alcanzados (de 0 a 100)".

#### Tabla de detalle

Esta tabla contiene 15 columnas, algunas de ellas calculadas desde otras o desde valores de la cabecera. Son las siguientes:

1. Columna DNI: Incluirá el DNI del trabajador sin guiones ni espacios. Se incluirá una última fila de totales donde se indicará el número de personas incluidas en el listado.
2. Columna Apellido 1: Incluirá el primer apellido del trabajador.
3. Columna Apellido 2: Incluirá el segundo apellido del trabajador.
4. Columna Nombre: Incluirá el nombre del trabajador.
5. Columna Coeficiente de participación: Será el valor, en tanto por uno, de los días, respecto al total de días del periodo de productividad, que ha estado el trabajador en ese programa. Si ha tenido una jornada diferente al 100%, se deberá hacer la multiplicación por el porcentaje de la jornada que haya tenido el trabajador en ese periodo. El sumatorio de todos los periodos del trabajador dará el coeficiente de participación, también llamado único.
6. Columna Coeficiente Bolsa Programa: será el valor, en tanto por uno, de los días, respecto al total de días del perido de productividad, que el trabajador aporta a la bolsa por razón de algún tipo de incidencia (permisos, suspensión, etc.).
7. Columna Incentivo inicial (€): Es el valor calculado de la multiplicación de la "Base" (ndicado en la cabecera) por la columna de "Coeficiente de participación". Esta columna tiene una fila final de total donde realiza el sumatorio de toda ella.
8. Columna Aporta a la bolsa del programa por incidencias (€): Es el valor calculado de la multiplicación de la columna "Incentivo Inicial" por la columna "Coeficiente bolsa programa".
9. Columna Incentivo definitivo (€): Es un valor calculado de la resta de la columna "Incentivo inicial" menos la columna "Aporta a la bolsa del programa por incidencias".
10. Columna Puntuación resultante de los objetivos alcanzados (de 0 a 100): Esta columna se obtiene de la puntuación que resulta para el trabajador en el programa seleccionado durante el periodo que estuvo activo.
11. Columna Incentivo tras aplicación puntuacion objetivos (€): Es un valor calculado que multiplica la columna "Incentivo definitivo" por la columna "Puntuación resultante de los objetivos alcanzados (de 0 a 100)" y lo divide por 100.
12. Columna Aporta a la bolsa del programa por apliación de objetivos: (€) Es un valor calculado que resta la columna "Incentivo definitivo" menos la columna "Incentivo tras aplicación puntuación objetivos".
13. Columna Suma de aportaciones a la bolsa del programa (€): Es un valor calculado que resta la columna "Incentivo inicial" menos la columna "Incentivo tras aplicación puntuación objetivos". Esta columna tiene una fila final de total donde realiza el sumatorio de toda ella.
14. Columna Reparto de la bolsa del programa (€): Esta columna tiene una fila final de total donde realiza el sumatorio de toda ella. Es un campo calculado que tiene en cuenta lo siguiente:
    1. Si la Columna "Puntuación resultante de los objetivos alcanzados (de 0 a 100) es menor de 70 pone 0.
    2. Si la Columna "Puntuación resultante de los objetivos alcanzados (de 0 a 100) es mayor o igual que 70, divide el valor de la cabecera "Total bolsa incentivos" y lo divide entre el otro valor de la cabecera "Número de empleados que participan en la bolsa".
15. Columna Incentivo final a abonar (€): Es un valor calculado como la suma de la columna "Incentivo tras aplicación puntuación objetivos" más la columna "Reparto de la bolsa del programa". Esta columna tiene una fila final de total donde realiza el sumatorio de toda ella.

#### Texto informativo y de asunción de responsabilidad, y firmas

Se incluye un texto final de información sobre los datos reflejados en este informe que serán específicamente:

- Como Supervisor/a del programa, hago constar que las puntuaciones introducidas en la columna «Puntuación resultante de los objetivos alcanzados» se corresponden con las obtenidas por cada empleado en la herramienta de evaluación de objetivos, y que la herramienta ha sido utilizada conforme a las indicaciones establecidas, manteniéndose en los términos en que ha sido facilitada por la Sección de Recursos Humanos, sin realizar modificaciones en sus datos, fórmulas, cálculos o configuración.
- Asumo la responsabilidad sobre la veracidad de los datos y puntuaciones que me corresponde introducir y validar (Columna “Puntuación resultante de los objetivos alcanzados”), sin que dicha responsabilidad comprenda los datos, fórmulas, cálculos internos o procesos automáticos de la herramienta facilitada por la Sección de Recursos Humanos.

Posteriormente se incluirá la firma del supervisor y la del Concejal Delegado

### Ficha resumen de matriz de resultados

Se puede encontrar un ejemplo en la carpeta `analisis/productividad`, en el documento "FICHA_MATRIZ_RESULTADOS_RESUMEN.pdf" y también como parte de la hoja "RESUMEN" del libro "HERRAMIENTA_ED_MATRIZ_DE_RESULTADOS.xlsx".
Esta ficha contiene los siguientes apartados:

#### Cabecera resumen

La cabecera debe suministrar la siguiente información:

1. Nombre del programa.
2. Supervisor del programa.
3. Periodo evaluado.

#### Tabla resumen

Esta tabla contendrá 5 columnas con los siguientes datos:

- Columna DNI: Incluirá el DNI de cada trabajador del programa sin guiones ni espacios. Se incluirá una última fila de totales donde se indicará el número de personas incluidas en el listado.
- Columna Apellido 1: Incluirá el primer apellido del trabajador.
- Columna Apellido 2: Incluirá el segundo apellido del trabajador.
- Columna Nombre: Incluirá el nombre del trabajador.
- Columna Total incentivo: Incluirá el lmismo valor que se incluye en la columna "Incentivo final a abonar" de la tabla de detalle de la matriz de resultados para ese trabajador.

#### Texto informativo y firmas

Se incluye un texto final de información sobre los datos reflejados en este informe que serán específicamente:

- Listado de empleados participantes en el programa, con el detalle del importe a abonar a cada uno de ellos.
  Dicho importe es el resultado de aplicar la puntuación obtenida en los objetivos del programa de Evaluación del Desempeño [periodo de productividad], conforme a la matriz de resultados facilitada por Recursos Humanos.

Posteriormente se incluirá la firma del supervisor y la del Concejal Delegado

## Fijación de objetivos

Cada Objetivo debe tener, al menos, una ponderación del 10%, y la suma ponderaciones de todos los objetivos debe resultar el 100%.

Existen unos objetivos obligatorios que deben tener los supervisores, otros los supervisores intermedios y otros los colaboradores.

1. Los objetivos obligatorios de los colaboradores son (suman un total del 60%):
   1. ID: 1. Objetivo: Realizar, al menos, 15 horas de formación "no obligatoria" en el período a evaluar, con las consideraciones recogidas en el Manual de ED. Tipo: Individual. Ponderación: 20%. Categoría: Número. Umbral: 15. Superación: Alza.
   2. ID: 2. Objetivo: Realizar, de forma conjunta por los miembros de la unidad, una propuesta de mejora sobre la actividad que se realiza, en la que se haya indicado los siguientes aspectos "..." En el supuesto de no ser posible/viable realizar la propuesta de forma conjunta, se podrá presentar de forma individual. Tipo: Colectivo. Ponderación: 20%. Categoría: Número. Umbral: 1. Superación: Alza.
   3. ID: 3. Objetivo: Desarrollo de dos conversaciones individuales de feedback al año con las personas bajo tu responsabilidad y/o con tu responsable directo para llevar a cabo una valoración mutua del desarrollo de la actividad. Tipo: Individual. Ponderación: 20%. Categoría: Número. Umbral: 2. Superación: Alza.
2. Los objetivos obligatorios de los supervisores y supervisores intermedios son (suman un total del 84%):
   1. ID: 1. Objetivo: Realizar al menos 15 horas de formación "no obligatoria" en el periodo a evaluar, con las consideraciones recogidas en el Reglamento de ED. Tipo: Individual. Ponderación: 20%. Categoría: Número. Umbral: 15. Superación: Alza.
   2. ID: 2. Objetivo: Atender y conversar la totalidad de propuestas de mejora presentadas por el equipo en un plazo máximo de 2 meses desde su presentación. Tipo: Colectivo. Ponderación: 20%. Categoría: Número. Umbral: 1. Superación: Alza.
   3. ID: 3. Objetivo: Desarrollo de dos conversaciones individuales de feedback al año con las personas bajo tu responsabilidad y/o con tu responsable directo para llevar a cabo una valoración mutua del desarrollo de la actividad. Ponderación: 20%. Categoría: Número. Umbral: 2. Superación: Alza.
   4. ID: 4. Objetivo: Presentar los objetivos de desempeño de todo su personal a la Comisión de Garantías de la Evaluación del Desempeño antes del 31 de mayo. Tipo: Individual. Ponderación: 12%. Categoría: Número. Umbral: 1. Superación: Alza.
   5. ID: 5. Objetivo: Presentar el resultado de evaluación de objetivos de desempeño de todo su personal a la Comisión de Garantías de la Evaluación del Desempeño antes del 1 de septiembre. Tipo: Individual. Ponderación: 12%. Categoría: Número. Umbral: 1. Superación: Alza.

El resto de objetivos deben ser marcados para cada trabajador, aunque puede indicarse que se sigan unos objetivos comunes para todos los integrantes del grupo de colaboradores de un supervisor o se pueden hacer objetivos individualizados por trabajador, según se acuerde entre el trabajador y el supervisor, acordando también el peso que se le dará a cada objetivo.

## Calendario del seguimiento y realización de objetivos

El calendario que se sigue lleva dos vertientes:

1. La que realiza el supervisor con los supervisores intermedios y el de los supervisores intermedios con los colaboradores. También se puede dar el caso que un supervisor tenga directamente colaboradores, sin supervisores intermedios. Además de que un supervisor puede tener varios programas o servicios a su cargo.
2. La que realiza el supervisor o supervisor intermedio con el órgano de Recursos Humanos que gestiona todo este tema que se llama Comisión de Garantías.

La duración temporal de la evaluación al desempeño o productividad es del 1 de julio de un año hasta el 30 de junio del año siguiente. Durante ese periodo los pasos que se deben realizar son los siguientes:

- El 1 de julio, todos los trabajadores estarán encuadrados en su programa con unos objetivos específicos. Si un trabajador se incorpora posteriormente a esta fecha, se deberá pasar un listado mensual con los trabajadores en estas circunstancias de ese mes y la ficha rellena correspondiente a la Comisión de Garantías.
- Como norma general, del 15 de octubre al 15 de noviembre se realizará la primera conversación o entrevista de evaluación o feedback del supervisor o supervisor intermedio con el colaborador. Cuando estén realizadas todas las entrevistas de cada programa, y antes del 30 de noviembre, se enviarán a la Comisión de Garantías como un listado independiente por cada uno de los programas a la Comisión de Garantías. Es importante que se pueda recabar mediante la subida de documentos PDF, cada una de las entrevistas realizadas a cada colaborador.
- Del 15 de abril al 15 de mayo se acuerdan los nuevos objetivos de siguiente año y se comunican mediante un listado y la generación de fichas a la Comisión de Garantías antes del 31 de mayo.
- En el segundo semestre, es decir entre el 1 de enero y 30 de junio, se realiza la segunda entrevista y se recoge la propuesta dada por los colaboradores, que puede ser individual o colectiva.
- Durante todo el periodo que dura la productividad, es decir entre el 1 de julio y el 30 de junio del año siguiente, el supervisor o supervisor intermedio deberá llevar el control de los objetivos cumplidos por sus colaboradores a cargo, especialmente los que se salen de los objetivos obligatorios llevando algún tipo de anotación externa que posteriormente se pueda subir a la aplicación como justificación de esos objetivos.
- Del 1 de julio al 31 de agosto, ya pasado el periodo del año de la productividad el supervisor o supervisor intermedio deberá recopilar el resto de información que le falte sobre los objetivos, se generará un listado del personal de cada programa y se le incluirán las fichas ya rellenas con los objetivos cumplidos o sin cumplir. Esa información será remitida a la Comisión de Garantías.

De todo este proceso pueden darse casos especiales en los colaboradores de los programas que pueden repercutir en que se realice un informe anual de variación de objetivos. Los casos son:

1. Bajas:
   1. Todo el año: Los objetivos se reducen a 0 para indicar que no ha podido realizarlos. Se debe marcar e rojo en la ficha, en la columna Umbral, y se debe incluir en el informe final mensual de Variación de Objetivos junto con la ficha sin rellenar.
   2. Parte del año: Los objetivos NO se reducen y se indican exclusivamente los que se hayan cumplido. No se incluyen en el informe mensual de Variación de Objetivos.
2. Cambios de programa:
   1. Programa inicial: Se ajustan los objetivos al tiempo trabajado, si el programa corresponde a alguno de los existentes.
   2. Programa destino: Se ajustan los objetivos al tiempo trabajado, si el programa corresponde a alguno de los existentes.
   3. Informar: Tanto el programa de inicio como el de destino, deben incluir al trabajador en el informe de "Variación de Objetivos", indicando las razones de los nuevos valores y las fechas en las que ha estado en cada programa.
