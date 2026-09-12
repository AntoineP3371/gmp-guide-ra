// Conversion du repère F_qr (main droite — manifest, glTF, three.js) vers le repère Unity
// (main gauche, Y haut, Z avant). Voir docs/manifest-contract.md § "Conversion vers Unity" —
// NE PAS modifier l'un sans l'autre, ils doivent rester synchronisés.
//
//   position_unity = (x, y, -z)
//   rotation_unity = (-qx, -qy, qz, qw)
//
// Conséquence : dans le repère F_qr côté Unity, +Z pointe VERS la machine (dos du QR), pas vers
// l'observateur. Un objet "devant" l'opérateur a donc position.z < 0 côté Unity.
// Les modèles glTF importés dans Unity subissent déjà cette conversion via l'importateur — ne
// pas la réappliquer une deuxième fois aux objets de type "model".

using UnityEngine;

namespace GmpGuideRA.Manifest
{
    public static class FrameConversion
    {
        public static Vector3 ToUnityPosition(float[] p)
        {
            if (p == null || p.Length < 3) return Vector3.zero;
            return new Vector3(p[0], p[1], -p[2]);
        }

        public static Quaternion ToUnityRotation(float[] q)
        {
            if (q == null || q.Length < 4) return Quaternion.identity;
            return new Quaternion(-q[0], -q[1], q[2], q[3]);
        }

        /// Taille [largeur, hauteur] en mètres -> inchangée (pas d'axe à retourner sur une taille).
        public static Vector2 ToUnitySize(float[] size, Vector2 fallback)
        {
            if (size == null || size.Length < 2) return fallback;
            return new Vector2(size[0], size[1]);
        }
    }
}
