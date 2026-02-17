import { useEffect, useMemo, useRef, useState } from "react";
import RequestForm from "./components/RequestForm";
import ResponseViewer from "./components/ResponseViewer";

const STORAGE_KEY = "api-playground-history-v2";

function normalizeUrl(u) {
  return String(u ?? "").trim();
}

function isValidHttpUrl(u) {
  try {
    const url = new URL(u);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function safeJsonParse(str) {
  try {
    return { ok: true, value: JSON.parse(str) };
  } catch (e) {
    return { ok: false, error: e };
  }
}

function normalizeHeadersRows(rows) {
  // Trim + retire vides + dédup par clé (case-insensitive) en gardant la dernière
  const map = new Map(); // lowerKey -> { key, value }
  for (const r of rows || []) {
    const key = String(r.key ?? "").trim();
    const value = String(r.value ?? "").trim();
    if (!key) continue;
    map.set(key.toLowerCase(), { key, value });
  }
  return Array.from(map.values());
}

function headersSignature(rows) {
  // Signature stable : clés en lower, triées
  const norm = normalizeHeadersRows(rows).map((h) => [h.key.toLowerCase(), h.value]);
  norm.sort((a, b) => a[0].localeCompare(b[0]));
  return norm;
}

function App() {
  // Requête
  const [url, setUrl] = useState("");
  const [method, setMethod] = useState("GET");
  const [headersRows, setHeadersRows] = useState([{ key: "", value: "" }]);
  const [body, setBody] = useState("");

  // Réponse
  const [resultat, setResultat] = useState("");
  const [erreur, setErreur] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [time, setTime] = useState(null);

  // Thème
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("api-playground-theme");
    return saved === "light" || saved === "dark" ? saved : "dark";
  });

  // Historique
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem("api-playground-theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const controllerRef = useRef(null);

  const canHaveBody = useMemo(() => ["POST", "PUT", "PATCH"].includes(method), [method]);

  useEffect(() => {
    const m = String(method).toUpperCase();
    if (m === "GET" || m === "DELETE") {
      setBody("");
    }
  }, [method]);


  const clearHistory = () => setHistory([]);
  const removeFromHistory = (id) => setHistory((prev) => prev.filter((x) => x.id !== id));

  const loadFromHistory = (entry) => {
    setUrl(entry.url || "");
    setMethod(entry.method || "GET");
    setHeadersRows(Array.isArray(entry.headersRows) && entry.headersRows.length ? entry.headersRows : [{ key: "", value: "" }]);
    setBody(entry.body || "");
  };

  const clearResponse = () => {
    setResultat("");
    setErreur("");
    setStatus(null);
    setTime(null);
  };

  const addOrMoveHistory = (entry) => {
    // Dédup robuste : url + method + headersSignature + canonicalBody
    const signature = JSON.stringify({
      url: entry.url,
      method: entry.method,
      headers: headersSignature(entry.headersRows),
      body: entry.canonicalBody,
    });

    setHistory((prev) => {
      const filtered = prev.filter((x) => {
        const sigX = JSON.stringify({
          url: x.url,
          method: x.method,
          headers: headersSignature(x.headersRows),
          body: x.canonicalBody,
        });
        return sigX !== signature;
      });

      return [{ ...entry, ts: Date.now() }, ...filtered].slice(0, 10);
    });
  };

  const envoyerRequete = async (override) => {
    const u = normalizeUrl(override?.url ?? url);
    const m = String(override?.method ?? method).toUpperCase();

    const rowsRaw = override?.headersRows ?? headersRows;
    const rows = normalizeHeadersRows(rowsRaw);

    const bRaw = override?.body ?? body;

    // Validation URL
    if (!u || !isValidHttpUrl(u)) {
      setErreur("URL invalide. Exemple : https://jsonplaceholder.typicode.com/users");
      setResultat("");
      setStatus(null);
      setTime(null);
      return;
    }

    // Body canonical (pour dédup)
    const bodyNeeded = ["POST", "PUT", "PATCH"].includes(m);
    let canonicalBody = "";
    let bodyToSend = undefined;

    if (bodyNeeded) {
      const trimmed = String(bRaw ?? "").trim();
      if (trimmed) {
        const parsed = safeJsonParse(trimmed);
        if (!parsed.ok) {
          setErreur("Body JSON invalide (vérifie guillemets, virgules, accolades…).");
          setResultat("");
          setStatus(null);
          setTime(null);
          return;
        }
        canonicalBody = JSON.stringify(parsed.value); // ✅ stable (pas d'espaces)
        bodyToSend = canonicalBody;
      } else {
        canonicalBody = "";
        bodyToSend = "";
      }
    }

    // Annuler requête précédente
    if (controllerRef.current) controllerRef.current.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setLoading(true);
    setErreur("");
    setResultat("");
    setStatus(null);
    setTime(null);

    // ✅ vider le champ URL uniquement si ça vient de l'input (pas d’un replay historique)
    if (!override) setUrl("");

    const start = performance.now();

    try {
      // Headers objet
      const headersObj = {};
      for (const r of rows) headersObj[r.key] = r.value;

      if (bodyNeeded) {
        const hasCT = Object.keys(headersObj).some((k) => k.toLowerCase() === "content-type");
        if (!hasCT) headersObj["Content-Type"] = "application/json";
      }

      const res = await fetch(u, {
        method: m,
        headers: headersObj,
        body: bodyNeeded ? bodyToSend : undefined,
        signal: controller.signal,
      });

      const ms = Math.round(performance.now() - start);
      setStatus(res.status);
      setTime(ms);

      const contentType = res.headers.get("content-type") || "";
      const raw = await res.text();

      if (!res.ok) {
        let msg = raw;
        if (contentType.includes("application/json")) {
          try {
            const j = JSON.parse(raw);
            msg = j.message || j.error || JSON.stringify(j, null, 2);
          } catch {}
        }
        setErreur(`HTTP ${res.status} ${res.statusText} — ${msg.slice(0, 800)}`);
        return; // ✅ pas d'historique si erreur HTTP
      }

      // ✅ succès : maintenant seulement on met en historique (ou on remonte)
      addOrMoveHistory({
        id: crypto.randomUUID(),
        url: u,
        method: m,
        headersRows: rows.length ? rows : [{ key: "", value: "" }],
        body: bodyNeeded ? (canonicalBody ? JSON.stringify(JSON.parse(canonicalBody), null, 2) : "") : "",
        canonicalBody,
      });

      if (contentType.includes("application/json")) {
        try {
          const j = JSON.parse(raw);
          setResultat(JSON.stringify(j, null, 2));
        } catch {
          setResultat(raw);
        }
      } else {
        setResultat(raw);
      }
    } catch (e) {
      if (e?.name === "AbortError") {
        setErreur("Requête annulée.");
        return;
      }
      const msg = e?.message ?? String(e);
      setErreur(
        msg.includes("Failed to fetch")
          ? "Erreur réseau: requête bloquée (souvent CORS) ou serveur injoignable."
          : `Erreur réseau: ${msg}`
      );
      // ✅ pas d'historique si erreur réseau
    } finally {
      setLoading(false);
    }
  };

  const annulerRequete = () => {
    if (controllerRef.current) controllerRef.current.abort();
  };

  const hasResponse = loading || erreur || resultat || status || time;

  return (
    <div style={{ padding: "40px", fontFamily: "Arial" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <h1 style={{ margin: 0 }}>API Playground</h1>

        <button onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))} title="Basculer le thème">
          Thème : {theme === "dark" ? "Sombre" : "Clair"}
        </button>
      </div>

      <div style={{ marginTop: 14 }}>
        <RequestForm
          url={url}
          setUrl={setUrl}
          method={method}
          setMethod={setMethod}
          headersRows={headersRows}
          setHeadersRows={setHeadersRows}
          body={body}
          setBody={setBody}
          loading={loading}
          onSend={() => envoyerRequete()}
          onCancel={annulerRequete}
          canHaveBody={canHaveBody}
        />
      </div>

      {hasResponse && (
        <div style={{ marginTop: 18 }}>
          <ResponseViewer
            data={resultat}
            error={erreur}
            loading={loading}
            status={status}
            time={time}
            onClear={clearResponse}
          />
        </div>
      )}

      {/* Historique (succès uniquement) */}
      {history.length > 0 && (
        <div style={{ marginTop: 18, marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h3 style={{ margin: 0, fontSize: 16, opacity: 0.9 }}>Historique</h3>
            <button onClick={clearHistory}>Tout effacer</button>
          </div>

          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
            {history.map((h) => (
              <div
                key={h.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  border: "1px solid var(--border)",
                  background: "var(--panel)",
                  padding: "10px 12px",
                  borderRadius: 12,
                }}
              >
                <button
                  onClick={() => {
                    loadFromHistory(h);
                    envoyerRequete(h);
                  }}
                  title="Recharger cette requête"
                  style={{ whiteSpace: "nowrap" }}
                >
                  Recharger
                </button>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, opacity: 0.95 }}>
                    {h.method} <span style={{ fontWeight: 600, opacity: 0.85 }}>{h.url}</span>
                  </div>
                  {String(h.body || "").trim() && (
                    <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
                      Body: {String(h.body).trim().slice(0, 120)}
                      {String(h.body).trim().length > 120 ? "…" : ""}
                    </div>
                  )}
                </div>

                <button onClick={() => removeFromHistory(h.id)} title="Supprimer" style={{ whiteSpace: "nowrap" }}>
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
