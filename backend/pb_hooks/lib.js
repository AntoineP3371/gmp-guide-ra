// Helpers PURS (chaînes/nombres uniquement, aucun accès à un Record) partagés via
// require() depuis les handlers.
//
// IMPORTANT — piège JSVM observé expérimentalement : passer un `Record` à une
// fonction définie dans un module require()'é, puis appeler `.get()` dessus
// LÀ-BAS, corrompt les champs `json` complexes (array/objet) — ils reviennent
// comme un tableau des octets de leur représentation JSON au lieu de la valeur
// décodée, alors que le même appel fonctionne correctement en inline dans le
// handler d'origine. Cause probable : isolation de scope/realm du JSVM entre le
// module require()'é et le contexte qui a produit le Record.
// => Toute logique qui appelle record.get() sur un champ `json`/`file` (multi)
//    reste INLINE dans main.pb.js, dans le même scope que le Record. Ce fichier
//    ne contient que des fonctions pur-primitives (string/number en entrée et
//    sortie), sûres à traverser via require().

function publicBaseUrl() {
  return $os.getenv("PUBLIC_BASE_URL") || "https://guide.gmp.example";
}

function slugify(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

function randomCode() {
  return $security.randomStringWithAlphabet(6, "ABCDEFGHJKMNPQRSTUVWXYZ23456789");
}

const SECTIONS = [
  { id: "usage", label: { fr: "Utilisation", en: "Usage" } },
  { id: "maintenance", label: { fr: "Entretien", en: "Maintenance" } },
  { id: "capabilities", label: { fr: "Capacités", en: "Capabilities" } },
  { id: "safety", label: { fr: "Sécurité", en: "Safety" } },
];

module.exports = { SECTIONS, publicBaseUrl, slugify, randomCode };
