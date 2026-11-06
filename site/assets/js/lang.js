// The story reads ?lang=es|en from its own address and hands it to the panel inside the two iframes (the plane in the
// story and the "Use the panel" overlay), so a visitor who arrives with ?lang=es gets the Spanish panel and any other
// value, or none, gets English. Only these two values ever reach the panel's address.
// The panel in site/demo/ reads ?lang= and switches language; the story's own text follows the same value (i18n.js).

const SUPPORTED = ["en", "es"];
export const DEFAULT_LANG = "en";

export function storyLang(search = window.location.search) {
  let wanted = "";
  try {
    wanted = (new URLSearchParams(search).get("lang") || "").trim().toLowerCase();
  } catch (e) {
    /* a malformed address: the default stays */
  }
  return SUPPORTED.includes(wanted) ? wanted : DEFAULT_LANG;
}

/** "demo/index.html?scenario=urgent&theme=dark" -> the same with &lang=<es|en> (any lang already there is replaced) */
export function withLang(url, lang = storyLang()) {
  const [path, query = ""] = url.split("?");
  const params = new URLSearchParams(query);
  params.set("lang", lang);
  return path + "?" + params.toString();
}
