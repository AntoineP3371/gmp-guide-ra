// Récupère le scene manifest d'une machine via GET /api/manifest/{code} (voir
// backend/pb_hooks/main.pb.js § routerAdd GET /api/manifest/{code}, racine du dépôt).
// {code} accepte le code complet ("GMP-XXXXXX") ou juste le suffixe ("XXXXXX").

using System;
using System.Threading.Tasks;
using Newtonsoft.Json;
using UnityEngine.Networking;

namespace GmpGuideRA.Manifest
{
    public static class ManifestClient
    {
        /// Ex. "https://api.gmpbordeaux.fr" — sans slash final.
        public static string BaseUrl;

        /// Token PocketBase du compte de service (voir AuthClient.LoginAsync).
        public static string AuthToken;

        public static async Task<SceneManifest> FetchByQrCodeAsync(string code)
        {
            if (string.IsNullOrEmpty(BaseUrl))
                throw new InvalidOperationException("ManifestClient.BaseUrl n'est pas configuré.");

            string url = $"{BaseUrl.TrimEnd('/')}/api/manifest/{UnityWebRequest.EscapeURL(code)}";

            using (var req = UnityWebRequest.Get(url))
            {
                if (!string.IsNullOrEmpty(AuthToken))
                    req.SetRequestHeader("Authorization", AuthToken);

                var op = req.SendWebRequest();
                while (!op.isDone) await Task.Yield();

                if (req.result != UnityWebRequest.Result.Success)
                {
                    throw new Exception(
                        $"Échec récupération manifest ({code}) : {req.error} — {req.downloadHandler?.text}");
                }

                return JsonConvert.DeserializeObject<SceneManifest>(req.downloadHandler.text);
            }
        }
    }
}
