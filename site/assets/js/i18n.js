// The story in Spanish. index.html is written in English and stays the source; with ?lang=es this module rewrites its
// text in place before any scene is built (the scenes read their text once, when they are created), and t() gives the
// scripts their own few strings. Switching language reloads the page with the other ?lang=, at the same point of the
// night. All the Spanish lives here, as static strings: no service, no request, nothing the CSP has to allow.

import { storyLang } from "./lang.js";

export const LANG = storyLang();

// strings the scripts write (dial, approve, honest, machine)
const ES_T = {
  "dial.aria": "Reloj de 24 horas del turno de noche, de 18:00 a 09:00",
  "dial.busy": "OCUPADO  09:00 - 18:00",
  "dial.local": "HORA LOCAL",
  "approve.idle": "APROBAR",
  "approve.sending": "ENVIANDO",
  "approve.sent": "ENVIADA",
  "approve.count": (n) => `APROBADAS ${n} / 5`,
  "approve.done": "5 / 5 APROBADAS. AHORA CORRE SOLO.",
  "honest.word": "HONESTO.",
  "machine.note": (j) => `Contado el ${j.counted_on} por scripts/receipts.py: ${j.rust_files} archivos Rust; las pruebas son los #[test] no marcados #[ignore], no una ejecución de pruebas.`,
};
const EN_T = {
  "dial.aria": "24-hour dial of the night shift, 18:00 to 09:00",
  "dial.busy": "OCCUPIED  09:00 - 18:00",
  "dial.local": "LOCAL TIME",
  "approve.idle": "APPROVE",
  "approve.sending": "SENDING",
  "approve.sent": "SENT",
  "approve.count": (n) => `APPROVED ${n} / 5`,
  "approve.done": "5 / 5 APPROVED. IT RUNS BY ITSELF NOW.",
  "honest.word": "HONEST.",
  "machine.note": (j) => `Counted on ${j.counted_on} by scripts/receipts.py: ${j.rust_files} Rust files; tests are #[test]s not marked #[ignore], not a test run.`,
};

/** t("approve.count", 3) -> the string for this page's language */
export function t(key, ...args) {
  const table = LANG === "es" ? ES_T : EN_T;
  const v = key in table ? table[key] : EN_T[key];
  return typeof v === "function" ? v(...args) : v;
}

// [selector, value(s), attribute]. A list of values goes to the matched elements in document order; a value with markup
// is set as HTML (it is a fixed string from this file), anything else as text. No attribute: the element's content.
const ES_DOM = [
  ["a.skip", "Saltar al contenido"],
  ["#plane iframe", "El panel real funcionando con datos ficticios", "title"],
  [".hud", "Estado del turno de noche", "aria-label"],
  [".hud-left span", "TURNO DE NOCHE"],
  ["[data-try]", ["Usar el panel", "Usar el panel"]],
  [".act", ["LA VENTANA SE ABRE", "LEER", "DECIDIR", "LLENAR", "SALA DE MÁQUINAS", "SEGUIR", "APROBAR", "LA VENTANA SE CIERRA"], "data-label"],

  // 01 the window opens
  [".a1-copy .kicker", "Un bot en Rust que hace una búsqueda de empleo. Todo en esta página son datos ficticios."],
  ["#h1", '<span class="line" data-split>El bot trabaja</span><span class="line"><span data-split>las horas que</span> <em class="serif" data-split="word">yo no.</em></span>'],
  [".a1-copy .lede", "De 18:00 a 09:00, jobbot lee portales públicos de empleo, puntúa lo que encuentra, adapta un CV y llena los formularios. Se detiene en cada punto donde una persona debe decidir."],
  [".a1-copy .cue", "<i></i>BAJA: EL TURNO PARTE A LAS 18:00"],
  [".beat-title", "Este es el panel real."],
  [".beat-sub", "Lo dibuja un servidor en Rust. Lo que ves es su versión demo, con datos ficticios."],

  // 02 read
  ["#h2", "Solo portales públicos.<br>Sin cuentas ni claves."],
  [".a2-copy .sub", "Greenhouse, Lever y Ashby publican sus ofertas a propósito. jobbot lee exactamente eso."],
  [".a2-copy .stats dt", ["OFERTAS LEÍDAS", "SOBRE EL UMBRAL", "PUNTAJE MÁXIMO"]],
  [".slider-head span", "UMBRAL DE PUNTAJE"],
  [".a2-copy .note", "412 ofertas ficticias. El umbral por defecto, 60, es el real."],

  // 03 decide
  ["#h3", "Cinco capas entre una oferta y un envío."],
  [".steps li", [
    '<b class="mono">OFERTA</b><p>Una oferta pública, leída del propio feed del portal. Primero se descartan los duplicados y las empresas excluidas.</p>',
    '<b class="mono">PUNTAJE</b><p>Un número a partir de seis factores con peso: calce 30, estabilidad 20, sueldo 15, aprendizaje 15, tipo de entrevista 10, otros 10. Bajo 60, la oferta no entra a la cola.</p>',
    '<b class="mono">CV</b><p>Mi CV maestro se reordena para cada oferta y recibe una frase nueva. Solo puede usar habilidades que ya están en él.</p>',
    '<b class="mono">RESPUESTAS</b><p>Las respuestas conocidas salen de un archivo que escribí yo. Una pregunta sin respuesta queda en blanco: nunca se adivina.</p>',
    '<b class="mono">COMPUERTA</b><p>Cada envío es un ensayo hasta que yo lo apruebo. El modo real envía solo lo aprobado.</p>',
  ]],
  [".p-post .chips i", ["REMOTO", "RANGO US$", "RUST"]],
  [".gate-row .pill", ["ENSAYO", "REAL"]],
  [".gate-btn", "ENVIAR"],
  [".tags li", [
    "<b>OFERTA</b><span>leída</span>",
    "<b>PUNTAJE</b><span>92 / 100</span>",
    "<b>CV</b><span>reordenado</span>",
    "<b>RESPUESTAS</b><span>1 en blanco</span>",
    "<b>COMPUERTA</b><span>ensayo</span>",
  ]],

  // 04 fill
  ["#h4", "Deja en blanco.<br>Nunca inventa."],
  [".a4-copy .sub", "Cada campo que conoce, lo escribe. Cada pregunta que no puede responder, la marca y me la deja a mí."],
  [".a4-copy .stats dt", ["LLENADOS", "PARA MÍ"]],
  [".a4-copy .note", "Un ensayo: la página se llena, se guarda una captura y no se envía nada."],
  [".form-head em", "POSTULACIÓN"],
  [".form .fld label", ["Nombre completo", "Correo", "Ubicación", "Permiso de trabajo", "Disponible desde", "CV", "¿Por qué este equipo?", "¿Abierto a turnos de guardia?"]],
  [".form .fld[data-text]", ["Mateo Vidal", "mateo.vidal@example.com", "Remoto, Latinoamérica", "Contratista (B2B)", "En dos semanas", "cv-adaptado.pdf"], "data-text"],
  [".form .opts span", ["<i></i>Sí", "<i></i>No"]],
  [".form .flag", ["TE NECESITA", "TE NECESITA"]],
  [".form .stamp", "TE NECESITA"],

  // 05 machine room
  ["#h5", "Un programa en Rust,<br>en mi propio PC."],
  [".a5-copy .cap", [
    "Una tarea programada lo despierta fuera de mi horario de trabajo. Sigue una cadena de módulos, y el último eslabón es una persona.",
    "Bajo la cadena: un reloj que conoce mi calendario, un archivo SQLite que recuerda cada estado y el servidor detrás del panel que viste.",
  ]],
  [".a5-copy .stats dt", ["LÍNEAS DE RUST", "PRUEBAS SIN RED", "DEPENDENCIAS"]],
  ["#r-note", "Contado por scripts/receipts.py: atributos #[test] en src/, tests/ y crates/ que corren sin red; no es una ejecución de pruebas."],
  ["#a5 .arch svg", "Arquitectura: los portales públicos alimentan el descubrimiento, el puntaje y la adaptación del CV; luego vienen el llenado del formulario, una compuerta, la entrega y una persona. Bajo la cadena están el horario, un registro en SQLite y el servidor del panel.", "aria-label"],
  ["#a5 .n-name", ["portales", "discovery.rs", "scoring.rs", "cv.rs", "form.rs", "gate.rs", "handoff.rs", "una persona", "window.rs", "tracker.rs", "jobbot-panel"]],
  ["#a5 .n-sub", ["portales públicos", "duplicados, filtros", "6 factores, 0 a 100", "nunca inventa nada", "Playwright llena", "revisa todo antes", "llena, nunca envía", "confirma el envío", "calla en horas ocupadas", "SQLite, 12 estados", "tiny_http, el panel que viste"]],

  // 06 follow
  ["#h6", "El silencio<br>no es el final."],
  [".a6-copy .sub", "Cada respuesta mueve una postulación un paso por la línea. Quedar sin respuesta es un estado como los demás: una respuesta tardía todavía puede convertirla en una prueba, una entrevista o una oferta."],
  [".a6-copy .note", "Números de demo. Los estados son los reales de crates/jobbot-domain/src/state.rs: submitted, replied, technical_test, interview, offer y ghosted."],
  [".a6-viz svg", "Embudo de 38 postulaciones que se reduce a 1 oferta en cinco estados, con una rama sin respuesta que puede volver a la línea más tarde.", "aria-label"],
  [".a6-viz .state", ["ENVIADAS", "RESPONDIDAS", "PRUEBA", "ENTREVISTA", "OFERTA"]],
  [".a6-viz .ghost .n-name", "sin respuesta"],
  [".a6-viz .ghost .n-sub", "sigue abierta"],
  [".ghost-label", "UNA RESPUESTA TARDÍA LA MUEVE DE NUEVO"],

  // 07 approve
  ["#h7", '<span class="l">El bot propone.</span><span class="l">Yo apruebo las primeras cinco.</span>'],
  [".a7-copy .sub", "Después de cinco aprobaciones corre solo, con un máximo de 25 al día. Hasta entonces, cada envío es mío."],
  [".pc-lines li", ["PUNTAJE 92", "ENSAYO GUARDADO CON CAPTURA", "2 EN BLANCO, RESPONDIDOS POR MÍ"]],
  [".pc-btn .lab", "APROBAR"],
  [".five-label", "APROBADAS 0 / 5"],

  // 08 the window closes
  ["#h8", "Honesto.", "aria-label"],
  [".rules li p", [
    "Nunca inventa una habilidad.",
    "Deja un espacio en blanco antes que adivinar.",
    "Nada sale sin pasar por la compuerta, y nunca en LinkedIn ni Upwork.",
    "Donde un bot sería detectado, llena el formulario y yo lo envío.",
    "Se queda en silencio en mis horas ocupadas.",
  ]],
  [".paper-end .foot", 'Hecho con ayuda de IA. Todos los datos de esta página son ficticios; las cifras salen del código real (scripts/receipts.py). El código está en <a href="https://github.com/gonzalo-rosas-rojas/jobbot">GitHub</a>.'],

  // the live panel overlay
  ["#try", "El panel de jobbot, funcionando con datos ficticios", "aria-label"],
  [".try-note", "<b>panel de jobbot</b> Datos ficticios. Nada sale de tu navegador. Prueba J y K, o presiona ? para ver las teclas."],
  [".try-close", "Volver a la historia <kbd>Esc</kbd>"],
  [".try-frame", "El panel de jobbot, funcionando con datos ficticios", "title"],
];

const ES_META = {
  title: "El turno de noche: un bot en Rust que hace una búsqueda de empleo",
  description: "jobbot es un programa en Rust que lee portales públicos de empleo, puntúa lo que encuentra, adapta un CV y llena los formularios entre las 18:00 y las 09:00, y se detiene en cada punto donde una persona debe decidir. Esta página recorre una noche. Todos los datos son ficticios.",
};

function put(node, value, attr) {
  if (attr) node.setAttribute(attr, value);
  else if (value.includes("<")) node.innerHTML = value;
  else node.textContent = value;
}

/** Rewrites the page into this address's language (English is the page as written: nothing to do) and sets up the switch. */
export function applyLanguage(doc = document) {
  if (LANG === "es") {
    doc.documentElement.lang = "es";
    doc.title = ES_META.title;
    const desc = doc.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", ES_META.description);
    for (const [sel, value, attr] of ES_DOM) {
      const nodes = [...doc.querySelectorAll(sel)];
      const values = Array.isArray(value) ? value : nodes.map(() => value);
      // a page that no longer matches the list stays in English there rather than getting text in the wrong place; a
      // selector that matches nothing is the same fault, even when it has a single text
      if (nodes.length !== values.length || nodes.length === 0) {
        console.warn(`i18n: "${sel}" matches ${nodes.length} element(s), ${Array.isArray(value) ? value.length : 1} text(s); left in English`);
        continue;
      }
      nodes.forEach((n, i) => put(n, values[i], attr));
    }
  }
  setupSwitch(doc);
}

const SCROLL_KEY = "story.scrollAt";

// the HUD switch, ES | EN: the half of this page's language is marked current (filled), the other is a plain link to the same
// address with that ?lang= (it works with scripts off too); following it remembers how far down the night the reader was,
// so the new page opens at the same point
function setupSwitch(doc) {
  const group = doc.getElementById("lang-switch");
  if (!group) return;
  for (const a of group.querySelectorAll("a[data-lang]")) {
    const lang = a.dataset.lang;
    const params = new URLSearchParams(window.location.search);
    params.set("lang", lang);
    a.href = "?" + params.toString() + window.location.hash;
    if (lang === LANG) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
    a.setAttribute("aria-label", lang === "es" ? "Español" : "English");
    a.addEventListener("click", (e) => {
      if (lang === LANG) {
        e.preventDefault(); // already here
        return;
      }
      const max = doc.documentElement.scrollHeight - window.innerHeight;
      try {
        sessionStorage.setItem(SCROLL_KEY, String(max > 0 ? window.scrollY / max : 0));
      } catch (err) {
        /* storage off: the new page starts at the top */
      }
    });
  }
}

/** After the first layout: back to the point of the night the reader left on the other language, once. */
export function restoreScroll() {
  let at = null;
  try {
    at = sessionStorage.getItem(SCROLL_KEY);
    sessionStorage.removeItem(SCROLL_KEY);
  } catch (e) {
    return false;
  }
  const f = parseFloat(at);
  if (!(f > 0 && f <= 1)) return false;
  window.scrollTo(0, Math.round(f * (document.documentElement.scrollHeight - window.innerHeight)));
  return true;
}
