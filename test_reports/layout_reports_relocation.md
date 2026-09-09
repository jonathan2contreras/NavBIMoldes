# Verificación — Cabecera y total del proyecto en Reportes

Fecha: 9 septiembre 2026. Cambio incremental exclusivamente de frontend.

## Resultado: correcto
- Login real con los roles existentes Administrador y Usuario.
- Verificados 320, 768, 1024, 1440 y 1920 px para ambos roles: navegación en una línea; título del rol centrado; botón de salir a la derecha; fondo superior gris `rgb(229,229,229)`; sin desbordamiento horizontal de página.
- Control de total únicamente en Reportes, dentro del mismo grupo de acciones que PDF/Excel/actualizar; ningún control en la navegación ni en Objetos.
- Administrador: editor abre desde control reubicado y KPI; cancelar/Escape funcionan. Usuario: total visible sin edición.
- Navegación de ida/vuelta a Objetos no deja un diálogo abierto ni hace reaparecer el editor.
- Descargas auténticas `reporte_moldes_all.pdf` y `reporte_moldes_all.xlsx` completadas sin errores.
- Botón de salir devuelve a login para ambos roles.
- Comparación GET `/api/project/panels` antes/después: configuración intacta. No se modificaron datos ni credenciales. Ninguna integración simulada.

Captura: `/tmp/reports-header-layout.jpg`.
Log: `/root/.emergent/automation_output/20260909_172508/console_20260909_172508.log`.