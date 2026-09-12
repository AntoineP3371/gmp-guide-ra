// Modèles C# du scene manifest — reflètent schemas/manifest.schema.json et
// docs/manifest-contract.md (racine du dépôt). Toute évolution du schéma doit se répercuter ici.
//
// Utilise Newtonsoft.Json (package "com.unity.nuget.newtonsoft-json", voir docs/SETUP.md) :
// JsonUtility (natif Unity) ne gère pas les dictionnaires (`title`/labels localisés) ni le champ
// `config` dont la forme dépend de `type` — Newtonsoft s'en sort avec JObject pour cette partie.

using System.Collections.Generic;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace GmpGuideRA.Manifest
{
    public class SceneManifest
    {
        [JsonProperty("manifestVersion")] public string ManifestVersion;
        [JsonProperty("machine")] public MachineInfo Machine;
        [JsonProperty("qr")] public QrInfo Qr;
        [JsonProperty("frame")] public FrameInfo Frame;
        [JsonProperty("sections")] public List<SectionInfo> Sections;
        [JsonProperty("scenario")] public ScenarioInfo Scenario; // absent/null -> comportement freeform
        [JsonProperty("objects")] public List<ManifestObject> Objects;
    }

    public class MachineInfo
    {
        [JsonProperty("id")] public string Id;
        [JsonProperty("name")] public string Name;
        [JsonProperty("slug")] public string Slug;
        [JsonProperty("category")] public string Category;
        [JsonProperty("location")] public string Location;
        [JsonProperty("languages")] public List<string> Languages;
        [JsonProperty("revision")] public int Revision;
        [JsonProperty("publishedAt")] public string PublishedAt;
    }

    public class QrInfo
    {
        [JsonProperty("code")] public string Code;
        [JsonProperty("payload")] public string Payload;
        [JsonProperty("physicalSizeMeters")] public float PhysicalSizeMeters;
        [JsonProperty("errorCorrection")] public string ErrorCorrection;
    }

    public class FrameInfo
    {
        [JsonProperty("convention")] public string Convention; // toujours "right-handed" en v1
        [JsonProperty("units")] public string Units; // toujours "meters"
    }

    public class SectionInfo
    {
        [JsonProperty("id")] public string Id; // usage | maintenance | capabilities | safety
        [JsonProperty("label")] public Dictionary<string, string> Label;
    }

    public class ScenarioInfo
    {
        [JsonProperty("mode")] public string Mode; // "freeform" | "guided"
        [JsonProperty("alwaysVisible")] public List<string> AlwaysVisible;
        [JsonProperty("steps")] public List<ScenarioStep> Steps;
    }

    public class ScenarioStep
    {
        [JsonProperty("id")] public string Id;
        [JsonProperty("title")] public Dictionary<string, string> Title;
        [JsonProperty("objectIds")] public List<string> ObjectIds;
        [JsonProperty("enter")] public EnterInfo Enter;
        [JsonProperty("advance")] public AdvanceInfo Advance;
    }

    public class EnterInfo
    {
        [JsonProperty("transition")] public string Transition; // none | fade | pop | slide
        [JsonProperty("durationMs")] public int DurationMs;
    }

    public class AdvanceInfo
    {
        [JsonProperty("trigger")] public string Trigger; // tap | timer | media_end
        [JsonProperty("afterSeconds")] public float? AfterSeconds; // seulement si trigger == "timer"
    }

    public class ManifestObject
    {
        [JsonProperty("id")] public string Id;
        [JsonProperty("type")] public string Type; // video|pdf|image|model|callout|text|hotspot
        [JsonProperty("section")] public string Section;
        [JsonProperty("title")] public Dictionary<string, string> Title;
        [JsonProperty("sort")] public int Sort;
        [JsonProperty("placement")] public PlacementInfo Placement;
        // Forme dépendante de `type` — voir la table dans docs/manifest-contract.md.
        // Accès via les helpers ci-dessous plutôt qu'à la main dans le code appelant.
        [JsonProperty("config")] public JObject Config;

        public string ConfigString(string key) => (string)Config?[key];
        public JArray ConfigArray(string key) => Config?[key] as JArray;
        public Dictionary<string, string> ConfigLocalized(string key) =>
            Config?[key]?.ToObject<Dictionary<string, string>>();
    }

    public class PlacementInfo
    {
        [JsonProperty("anchorMode")] public string AnchorMode; // "qr-relative" en v1
        [JsonProperty("position")] public float[] Position; // [x,y,z] mètres, repère F_qr MAIN DROITE
        [JsonProperty("rotation")] public float[] Rotation; // [x,y,z,w] quaternion, MAIN DROITE
        [JsonProperty("size")] public float[] Size; // [largeur,hauteur] mètres, objets plans — ou null
        [JsonProperty("scale")] public float? Scale; // objets volumiques (model)
        [JsonProperty("billboard")] public string Billboard; // none | y | full
        [JsonProperty("source")] public string Source; // photo2d | headset
        [JsonProperty("updatedAt")] public string UpdatedAt;
    }
}
