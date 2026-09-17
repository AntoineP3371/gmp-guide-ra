// Câblage MR Utility Kit vérifié contre le code source réel de l'échantillon officiel Meta
// (QRCodeManager.cs) :
// https://github.com/oculus-samples/Unity-MRUtilityKitSample/blob/main/Assets/MRUKSamples/QRCodeDetection/Scripts/QRCodeManager.cs
// L'abonnement se fait sur MRUK.Instance.SceneSettings (PAS sur MRUKRoom — première version de ce
// fichier avait une erreur ici, corrigée après un vrai retour de compilation).
//
// Rôle de ce script (walking skeleton, Phase 2 — voir docs/roadmap.md racine) : demander la
// permission caméra, détecter un QR, en tirer le code machine, charger son manifest, logger le
// résultat. PAS ENCORE FAIT ici : instanciation des objets, pose de la Spatial Anchor, scénario.

using System;
using GmpGuideRA.Manifest;
using Meta.XR.MRUtilityKit;
using UnityEngine;
using UnityEngine.Android;

public class QrManifestLoader : MonoBehaviour
{
    [Header("Backend")]
    [Tooltip("Ex. https://api_guidera.gmpbordeaux.fr (prod) ou http://<ip-locale>:8090 (dev)")]
    public string backendBaseUrl = "https://api_guidera.gmpbordeaux.fr";

    [Tooltip("Compte de service PocketBase role \"viewer\" — voir backend/README.md")]
    public string viewerEmail;
    public string viewerPassword;

    private void Start()
    {
        RequestScenePermissionIfNeeded();
        _ = LoginAsync(); // fire-and-forget : Start() ne peut pas être async lui-même

        if (!MRUK.Instance)
        {
            Debug.LogError("[GMP] Aucun objet MRUK dans la scène — ajoute le prefab MRUK fourni par le SDK.");
            return;
        }
        MRUK.Instance.SceneSettings.TrackableAdded.AddListener(OnTrackableAdded);
    }

    private void OnDestroy()
    {
        if (MRUK.Instance)
            MRUK.Instance.SceneSettings.TrackableAdded.RemoveListener(OnTrackableAdded);
    }

    private async System.Threading.Tasks.Task LoginAsync()
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
        }
    }

    // La détection de QR fait partie de l'API Scene/spatial data de Meta, qui demande une
    // permission Android à l'exécution (en plus de la déclaration dans AndroidManifest.xml —
    // voir docs/SETUP.md étape 8). Version simple ici : on demande, sans réagir finement au
    // callback d'octroi — si refusée, MRUK ne déclenchera simplement jamais TrackableAdded pour
    // des QR (redémarrer l'app après avoir accepté suffit en pratique).
    private void RequestScenePermissionIfNeeded()
    {
#if !UNITY_EDITOR
        if (!Permission.HasUserAuthorizedPermission(OVRPermissionsRequester.ScenePermission))
        {
            Permission.RequestUserPermission(OVRPermissionsRequester.ScenePermission);
        }
#endif
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
            //  1. Poser une Spatial Anchor à la pose de `trackable.transform` (persiste après ce scan).
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
