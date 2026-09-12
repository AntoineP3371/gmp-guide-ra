// ⚠️ ÉBAUCHE NON VÉRIFIÉE — écrite à partir de la documentation Meta MR Utility Kit, jamais
// compilée ni exécutée (pas d'éditeur Unity disponible côté agent). Avant de lui faire confiance,
// compare le câblage des événements MRUK avec la scène d'exemple officielle "QRCodeDetection" :
// https://github.com/oculus-samples/Unity-MRUtilityKitSample
// Les noms de classes/méthodes MRUK ci-dessous (MRUK.Instance, RegisterSceneLoadedCallback,
// MRUKRoom.TrackableAdded, MRUKTrackable...) sont ceux documentés ici :
// https://developers.meta.com/horizon/documentation/unity/unity-mr-utility-kit-qrcode-detection/
// mais l'API MRUK évolue — si ça ne compile pas, c'est probablement un renommage à ajuster ici,
// pas une erreur de logique.
//
// Rôle de ce script (walking skeleton, Phase 2 du chantier — voir docs/roadmap.md racine) :
// détecter un QR, en tirer le code machine, charger son manifest, logger le résultat.
// PAS ENCORE FAIT ici : instanciation des objets, pose de la Spatial Anchor, scénario.

using System;
using GmpGuideRA.Manifest;
using Meta.XR.MRUtilityKit; // ajuster si le namespace réel diffère
using UnityEngine;

public class QrManifestLoader : MonoBehaviour
{
    [Header("Backend")]
    [Tooltip("Ex. https://api.gmpbordeaux.fr (prod) ou http://<ip-locale>:8090 (dev)")]
    public string backendBaseUrl = "https://api.gmpbordeaux.fr";

    [Tooltip("Compte de service PocketBase role \"viewer\" — voir backend/README.md")]
    public string viewerEmail;
    public string viewerPassword;

    private async void Start()
    {
        ManifestClient.BaseUrl = backendBaseUrl;

        try
        {
            ManifestClient.AuthToken = await AuthClient.LoginAsync(backendBaseUrl, viewerEmail, viewerPassword);
            Debug.Log("[GMP] Authentifié auprès du backend.");
        }
        catch (Exception e)
        {
            Debug.LogError($"[GMP] Échec authentification backend : {e.Message}");
            return;
        }

        // MRUK : s'abonner à la détection de trackables une fois la scène MR chargée.
        MRUK.Instance.RegisterSceneLoadedCallback(OnMrSceneLoaded);
    }

    private void OnMrSceneLoaded()
    {
        foreach (var room in MRUK.Instance.Rooms)
        {
            room.TrackableAdded.AddListener(OnTrackableAdded);
        }
    }

    private async void OnTrackableAdded(MRUKTrackable trackable)
    {
        if (trackable.TrackableType != OVRAnchor.TrackableType.QRCode) return;
        if (string.IsNullOrEmpty(trackable.MarkerPayloadString)) return;

        string payload = trackable.MarkerPayloadString; // "GMP-XXXXXX" ou "https://.../m/XXXXXX"
        string code = ExtractCode(payload);
        Debug.Log($"[GMP] QR détecté — payload={payload} code={code}");

        try
        {
            SceneManifest manifest = await ManifestClient.FetchByQrCodeAsync(code);
            Debug.Log(
                $"[GMP] Manifest chargé : {manifest.Machine.Name} (rév. {manifest.Machine.Revision}) — " +
                $"{manifest.Objects.Count} objet(s), scénario={manifest.Scenario?.Mode ?? "freeform"}");

            // TODO (prochaine étape du chantier) :
            //  1. Poser une Spatial Anchor à la pose de `trackable` (persiste après ce scan).
            //  2. Instancier manifest.Objects à leur placement (FrameConversion.ToUnityPosition/Rotation),
            //     relatif à cette ancre.
            //  3. Si manifest.Scenario?.Mode == "guided", piloter la visibilité par étape au lieu de
            //     tout afficher — logique déjà validée côté web (packages/viewer3d, même dépôt) à
            //     porter ici à l'identique (alwaysVisible + objets de l'étape courante).
        }
        catch (Exception e)
        {
            Debug.LogError($"[GMP] Échec chargement manifest ({code}) : {e.Message}");
        }
    }

    private static string ExtractCode(string payload)
    {
        int slash = payload.LastIndexOf('/');
        return slash >= 0 ? payload.Substring(slash + 1) : payload;
    }
}
