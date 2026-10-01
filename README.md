# Ritmo

Aplicación móvil local-first para organizar el día mediante un reloj de actividades, metas, notas y contabilidad simple.

## Funciones incluidas

- Reloj circular de la jornada con segmentos de actividad y huecos `Libre` automáticos.
- Categorías con color, actividades del día y sugerencia del primer espacio disponible.
- Metas diarias o semanales y registro de avance desde la pantalla principal.
- Notas locales con búsqueda y filtro por categoría.
- Registro manual de ingresos y gastos, cuentas, categorías y resumen semanal o mensual.
- Base SQLite cifrada con la llave almacenada en el dispositivo.

La app no necesita Internet ni cuenta. IA, respaldos en la nube, suscripciones, exportación y tiempo de pantalla están visibles como **Próximamente** y no se conectan a ningún servicio.

## Ejecutar

```sh
pnpm start
pnpm android
```

## Verificar

```sh
npx tsc --noEmit
pnpm test
```
