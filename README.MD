# Información del proyecto

## Versionado de aplicaciones usadas

- Versión de Node usada: v20.16.0 (lts/iron)
- Versión de npm usada: 10.8.1
- Versión de nvm usada: 0.39.0
- Versión de MariaDB: Ver 15.1 Distrib 10.6.22-MariaDB, for debian-linux-gnu (x86_64) using EditLine wrapper

## Ayuda para la creación del proyecto

La ayuda es esta

### Pasos seguidos para la creación del proyecto

Todo las preguntas relacionadas están en la carpeta ayuda_pedida y se han seguido esos pasos cambiando las configuraciones específicas.

### Ejecución de test

Ejemplos para ejecución de tests:

Para test e2e de api: npm run test:apie2e -- --json --outputFile=apps/api/test/e2e-spec.jest-result.json
Para test unitarios de api: npm run test:api -- --json --outputFile=apps/api/test/unit-spec.jest-result.json
Para test e2e de gestion: npm run cypress:open:gestion
Para test unitarios de gestion: npm run test:gestion -- --json --outputFile=apps/gestion/test-unitarios.json
Para test de componentes y documentación de gestion: npm run storybook:gestion

### Documentación de la base de datos

Información de la base de datos en la dirección de la API, en el puerto configurado y con el end-point [api-docs](http://localhost:3101/api-docs#/)
