// Panneau de logs affiché DANS le casque (Canvas World Space qui suit la caméra) — remplace
// `adb logcat` quand on n'a pas d'accès USB/mode développeur (cas de ce projet : VDI sans
// passthrough USB, casques en MDM sans mode développeur visible). Construit son UI tout seul au
// démarrage : aucun Canvas/Text à préparer dans l'éditeur, attache juste ce script à n'importe
// quel GameObject de la scène.
//
// N'utilise que UnityEngine.UI (fourni par défaut avec tout projet Unity, pas de package en
// plus). Non testé sur casque réel — code simple mais jamais vu tourner faute d'éditeur/casque
// côté agent ; si le panneau n'apparaît pas, vérifie que `Camera.main` correspond bien à la
// caméra XR (le rig Meta doit taguer sa caméra centrale "MainCamera").

using System.Collections.Generic;
using System.Text;
using UnityEngine;
using UnityEngine.UI;

public class OnScreenLogger : MonoBehaviour
{
    [Tooltip("Nombre de lignes conservées à l'écran")]
    public int maxLines = 14;

    [Tooltip("Distance devant la caméra, en mètres")]
    public float distance = 1.2f;

    private readonly List<string> _lines = new List<string>();
    private Text _uiText;
    private Transform _panel;
    private Camera _cam;

    private void Start()
    {
        _cam = Camera.main;
        BuildUi();
    }

    private void OnEnable() => Application.logMessageReceived += HandleLog;
    private void OnDisable() => Application.logMessageReceived -= HandleLog;

    private void LateUpdate()
    {
        if (_panel == null) return;
        if (_cam == null) _cam = Camera.main;
        if (_cam == null) return;

        _panel.position = _cam.transform.position + _cam.transform.forward * distance;
        _panel.rotation = Quaternion.LookRotation(_panel.position - _cam.transform.position);
    }

    private void HandleLog(string condition, string stackTrace, LogType type)
    {
        string tag = type == LogType.Error || type == LogType.Exception ? "[ERR] "
            : type == LogType.Warning ? "[WARN] "
            : "";
        _lines.Add(tag + condition);
        while (_lines.Count > maxLines) _lines.RemoveAt(0);
        Refresh();
    }

    private void Refresh()
    {
        if (_uiText == null) return;
        var sb = new StringBuilder();
        foreach (var line in _lines) sb.AppendLine(line);
        _uiText.text = sb.ToString();
    }

    private void BuildUi()
    {
        var canvasGo = new GameObject("OnScreenLoggerCanvas");
        var canvas = canvasGo.AddComponent<Canvas>();
        canvas.renderMode = RenderMode.WorldSpace;
        canvasGo.AddComponent<CanvasScaler>();
        var rect = canvasGo.GetComponent<RectTransform>();
        rect.sizeDelta = new Vector2(800, 500);
        canvasGo.transform.localScale = Vector3.one * 0.001f; // 800x500 px -> ~0.8 x 0.5 m réels

        var bgGo = new GameObject("Background");
        bgGo.transform.SetParent(canvasGo.transform, false);
        var bg = bgGo.AddComponent<Image>();
        bg.color = new Color(0.06f, 0.07f, 0.08f, 0.85f);
        var bgRect = bgGo.GetComponent<RectTransform>();
        bgRect.anchorMin = Vector2.zero;
        bgRect.anchorMax = Vector2.one;
        bgRect.offsetMin = Vector2.zero;
        bgRect.offsetMax = Vector2.zero;

        var textGo = new GameObject("Text");
        textGo.transform.SetParent(canvasGo.transform, false);
        _uiText = textGo.AddComponent<Text>();
        _uiText.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
        _uiText.fontSize = 20;
        _uiText.color = Color.white;
        _uiText.alignment = TextAnchor.UpperLeft;
        var textRect = textGo.GetComponent<RectTransform>();
        textRect.anchorMin = Vector2.zero;
        textRect.anchorMax = Vector2.one;
        textRect.offsetMin = new Vector2(20, 20);
        textRect.offsetMax = new Vector2(-20, -20);

        _panel = canvasGo.transform;
    }
}
