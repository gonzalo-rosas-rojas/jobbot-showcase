// The story reads ?lang=es|en from its own address and hands it to the panel inside the two iframes (the plane in the
// story and the "Use the panel" overlay), so a visitor who arrives with ?lang=es gets the Spanish panel and any other
// value, or none, gets English. Only these two values ever reach the panel's address.
// Panel builds that read ?lang= (the v2 build does) switch language; the v1 build that ships in site/demo/ does not read
// it and stays in Spanish, which is harmless: the parameter is ignored.

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
