// Authentification du compte de service PocketBase (role "viewer", ex. casque@gmpbordeaux.fr —
// voir backend/README.md racine du dépôt). Ce compte a le droit de lire les manifests et de
// PATCH les placements (source forcée à "headset" côté hook backend), rien de plus.

using System;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json.Linq;
using UnityEngine.Networking;

namespace GmpGuideRA.Manifest
{
    public static class AuthClient
    {
        public static async Task<string> LoginAsync(string baseUrl, string email, string password)
        {
            string url = $"{baseUrl.TrimEnd('/')}/api/collections/users/auth-with-password";
            var body = new JObject { ["identity"] = email, ["password"] = password };
            byte[] bytes = Encoding.UTF8.GetBytes(body.ToString());

            using (var req = new UnityWebRequest(url, "POST"))
            {
                req.uploadHandler = new UploadHandlerRaw(bytes);
                req.downloadHandler = new DownloadHandlerBuffer();
                req.SetRequestHeader("Content-Type", "application/json");

                var op = req.SendWebRequest();
                while (!op.isDone) await Task.Yield();

                if (req.result != UnityWebRequest.Result.Success)
                {
                    throw new Exception(
                        $"Échec authentification PocketBase : {req.error} — {req.downloadHandler?.text}");
                }

                var json = JObject.Parse(req.downloadHandler.text);
                string token = json["token"]?.ToString();
                if (string.IsNullOrEmpty(token))
                    throw new Exception("Authentification : réponse sans token.");
                return token;
            }
        }
    }
}
