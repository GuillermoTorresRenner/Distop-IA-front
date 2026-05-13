/**
 * Estilos compartidos para `<select>` nativos.
 *
 * REGLA OBLIGATORIA — todo `<select>` del proyecto DEBE usar `SELECT_DARK_CLASS`
 * (eventualmente combinado con `cn(SELECT_DARK_CLASS, "h-8", ...)`).
 * Está prohibido un `<select>` con fondo blanco / sin esta clase: rompe la paleta VtM.
 *
 * Detalles:
 * - El control usa `bg-input/30` (`dark:bg-input/50`) para mimetizar la hoja de personaje.
 * - El menú desplegable (las `<option>`) usa `bg-popover` / `text-popover-foreground`,
 *   que en dark mode coincide con `bg-card` y matchea el fondo de la hoja de personajes.
 * - Se usa el selector descendiente `[&_option]` (en vez de `[&>option]`) para que las
 *   opciones también queden temáticas dentro de un `<optgroup>` — los hijos directos
 *   son los optgroups y antes las opciones nietas se renderizaban con el blanco
 *   por defecto del browser.
 * - `[&_optgroup]` aplica el mismo fondo al label del grupo.
 *
 * Uso típico:
 *   <select className={SELECT_DARK_CLASS}> ... </select>
 *   <select className={cn(SELECT_DARK_CLASS, "h-8")}> ... </select>
 */
export const SELECT_DARK_CLASS =
  "h-9 w-full rounded-md border border-input bg-input/30 px-2.5 text-sm text-foreground dark:bg-input/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none [&_option]:bg-popover [&_option]:text-popover-foreground [&_optgroup]:bg-popover [&_optgroup]:text-popover-foreground";
