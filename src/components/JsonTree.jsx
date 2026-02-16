import { useEffect, useMemo, useState } from "react";

function isObject(value) {
  return value !== null && typeof value === "object";
}

function normalize(str) {
  return String(str ?? "").toLowerCase();
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Mot entier (borne de mot) : name match "name" mais pas "username"
function keyMatches(text, query) {
  const q = String(query ?? "").trim().toLowerCase();
  const t = String(text ?? "").toLowerCase();
  if (!q) return false;

  // match si mot entier OU si la clé commence par query
  if (t === q) return true;
  return t.startsWith(q);
}

// Surlignage "contient" (toutes occurrences)
function highlightAll(text, query) {
  const q = String(query ?? "").trim();
  const s = String(text ?? "");

  if (!q) return s;

  const lowerS = s.toLowerCase();
  const lowerQ = q.toLowerCase();

  const parts = [];
  let i = 0;

  while (true) {
    const idx = lowerS.indexOf(lowerQ, i);
    if (idx === -1) {
      parts.push(s.slice(i));
      break;
    }
    if (idx > i) parts.push(s.slice(i, idx));

    parts.push(
      <span
        key={`${idx}-${q}`}
        style={{
          background: "rgba(124, 131, 255, 0.25)",
          color: "inherit",
          borderRadius: "6px",
          padding: "0 3px",
          fontWeight: 700,
          boxShadow: "inset 0 0 0 1px rgba(124, 131, 255, 0.25)",
        }}

      >
        {s.slice(idx, idx + q.length)}
      </span>
    );

    i = idx + q.length;
  }

  return <>{parts}</>;
}

// Surlignage "mot entier" (toutes occurrences)
function highlightWholeWord(text, query) {
  const q = String(query ?? "").trim();
  const s = String(text ?? "");
  if (!q) return s;

  const re = new RegExp(`\\b${escapeRegExp(q)}\\b`, "gi");
  const parts = [];
  let last = 0;

  for (const match of s.matchAll(re)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;

    if (start > last) parts.push(s.slice(last, start));

    parts.push(
      <span
        key={`${start}-${end}`}
        style={{
          background: "#41ff3b",
          color: "#000",
          borderRadius: "4px",
          padding: "0 3px",
          fontWeight: 800,
        }}
      >
        {s.slice(start, end)}
      </span>
    );

    last = end;
  }

  parts.push(s.slice(last));
  return <>{parts}</>;
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Recherche dans tout l'arbre :
 * - match sur les clés (mot entier)
 * - match sur les valeurs primitives (contient)
 * Retourne:
 * - matchPaths: liste des paths matchés (ordre de parcours)
 * - matchSet: set des paths matchés
 * - autoOpenSet: paths à ouvrir (match + parents)
 */
function buildSearchIndex(data, query) {
  const q = normalize(query).trim();
  const matchPaths = [];
  const matchSet = new Set();
  const autoOpenSet = new Set();

  if (!q) return { matchPaths, matchSet, autoOpenSet };

  const addParents = (path) => {
    const parts = path.split(".");
    let cur = parts[0]; // "root"
    autoOpenSet.add(cur);
    for (let i = 1; i < parts.length; i++) {
      cur += "." + parts[i];
      autoOpenSet.add(cur);
    }
  };

  const addMatch = (path) => {
    if (!matchSet.has(path)) {
      matchSet.add(path);
      matchPaths.push(path);
      addParents(path);
    }
  };

  const walk = (value, path) => {
    if (!isObject(value)) {
      if (normalize(value).includes(q)) addMatch(path);
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((v, i) => walk(v, `${path}.[${i}]`));
      return;
    }

    for (const [k, v] of Object.entries(value)) {
      const childPath = `${path}.${k}`;

      // ✅ si la clé match, on match le noeud (childPath) ET on force l'ouverture de ses parents
      if (keyMatches(k, query)) {
        addMatch(childPath);
      }

      walk(v, childPath);
    }
  };

  walk(data, "root");
  return { matchPaths, matchSet, autoOpenSet };
}

function getValueColor(val) {
  if (typeof val === "string") return "#4FC3F7";
  if (typeof val === "number") return "#FFD54F";
  if (typeof val === "boolean") return "#81C784";
  if (val === null) return "#E57373";
  return "#eee";
}

// Liste tous les "containers" (objets + arrays) pour expand/collapse all
function getContainerPaths(value, path = "root", out = []) {
  if (!isObject(value)) return out;

  out.push(path);

  if (Array.isArray(value)) {
    value.forEach((v, i) => getContainerPaths(v, `${path}.[${i}]`, out));
  } else {
    for (const [k, v] of Object.entries(value)) {
      getContainerPaths(v, `${path}.${k}`, out);
    }
  }

  return out;
}

function JsonTree({
  data,
  query,
  onMatchesChange,
  activeMatchPath,
  treeAction, // "expandAll" | "collapseAll" | null
  treeActionId, // number incrementé à chaque clic
}) {
  const q = normalize(query).trim();

  const { matchPaths, matchSet, autoOpenSet } = useMemo(
    () => buildSearchIndex(data, query),
    [data, query]
  );

  // modèle robuste
  const [forcedOpen, setForcedOpen] = useState(() => new Set());
  const [forcedClosed, setForcedClosed] = useState(() => new Set());

  // hover pour bouton copier
  const [hoveredPath, setHoveredPath] = useState(null);

  // Remonter la liste des matchs (sans boucle infinie)
  useEffect(() => {
    onMatchesChange?.(matchPaths);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, data]);

  // ✅ Quand une recherche démarre, on enlève les fermetures forcées (sinon ça bloque l'auto-open)
  useEffect(() => {
    if (normalize(query).trim()) {
      setForcedClosed(new Set());
    }
  }, [query]);

  // Auto-open renforcé: match actif => ouvrir ses parents
  const autoOpenWithActiveParents = useMemo(() => {
    if (!q || !activeMatchPath) return autoOpenSet;

    const set = new Set(autoOpenSet);
    const parts = activeMatchPath.split(".");
    let cur = parts[0];
    set.add(cur);
    for (let i = 1; i < parts.length; i++) {
      cur += "." + parts[i];
      set.add(cur);
    }
    return set;
  }, [autoOpenSet, q, activeMatchPath]);

  const computeOpen = (path) => {
    if (forcedOpen.has(path)) return true;
    if (forcedClosed.has(path)) return false;

    if (q) return autoOpenWithActiveParents.has(path);

    const depth = path.split(".").length - 1;
    return depth < 2;
  };

  const toggleOpen = (path) => {
    const currentlyOpen = computeOpen(path);

    if (currentlyOpen) {
      // fermer
      setForcedOpen((prev) => {
        const next = new Set(prev);
        next.delete(path);
        return next;
      });
      setForcedClosed((prev) => {
        const next = new Set(prev);
        next.add(path);
        return next;
      });
    } else {
      // ouvrir
      setForcedClosed((prev) => {
        const next = new Set(prev);
        next.delete(path);
        return next;
      });
      setForcedOpen((prev) => {
        const next = new Set(prev);
        next.add(path);
        return next;
      });
    }
  };

  // expand/collapse all
  useEffect(() => {
    if (!treeActionId || !treeAction) return;

    const containers = getContainerPaths(data);

    if (treeAction === "expandAll") {
      setForcedClosed(new Set());
      setForcedOpen(new Set(containers));
    }

    if (treeAction === "collapseAll") {
      const closed = new Set(containers);
      closed.delete("root");

      setForcedOpen(new Set(["root"]));
      setForcedClosed(closed);
    }
  }, [treeActionId, treeAction, data]);

  // scroll vers match actif
  useEffect(() => {
    if (!activeMatchPath) return;
    const el = document.querySelector(`[data-path="${activeMatchPath}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeMatchPath]);

  const Row = ({ depth, path, children, active }) => {
    const showCopy = hoveredPath === path;

    return (
      <div
        data-path={path}
        onMouseEnter={() => setHoveredPath(path)}
        onMouseLeave={() => setHoveredPath((p) => (p === path ? null : p))}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          paddingLeft: `${depth * 20}px`,
          paddingTop: "4px",
          paddingBottom: "4px",
          background: active ? "#1f1f1f" : "transparent",
          borderRadius: active ? "6px" : "0px",
        }}
      >
        <button
          onClick={async (e) => {
            e.stopPropagation();
            await copyToClipboard(path);
          }}
          title="Copier le chemin"
          style={{
            opacity: showCopy ? 1 : 0,
            pointerEvents: showCopy ? "auto" : "none",
            transition: "opacity 120ms ease",
            cursor: "pointer",
            borderRadius: "8px",
            border: "1px solid #444",
            background: "#1b1b1b",
            color: "#fff",
            padding: "2px 8px",
            lineHeight: 1.2,
          }}
        >
          📋
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      </div>
    );
  };

  const renderNode = (name, value, path, depth) => {
    const active = activeMatchPath === path;

    // Primitive
    if (!isObject(value)) {
      const display = typeof value === "string" ? `"${value}"` : String(value);

      // clés : mot entier, valeurs : contient
      const highlightLine =
        q && (keyMatches(name, query) || normalize(value).includes(q));

      return (
        <Row key={path} depth={depth} path={path} active={active}>
          <span
            style={{
              color: highlightLine ? "#fff" : "#B39DDB",
              opacity: 0.9,
              fontWeight: highlightLine ? 700 : 400,
            }}
          >
            {highlightWholeWord(name, query)}:
          </span>{" "}
          <span
            style={{
              color: getValueColor(value),
              fontWeight: highlightLine ? 700 : 400,
              wordBreak: "break-word",
            }}
          >
            {highlightAll(display, query)}
          </span>
        </Row>
      );
    }

    // Object / Array
    const open = computeOpen(path);
    const matched = q ? matchSet.has(path) : false;

    const isArr = Array.isArray(value);
    const entries = isArr ? value.map((v, i) => [i, v]) : Object.entries(value);
    const preview = isArr
      ? `[ ${value.length} élément${value.length > 1 ? "s" : ""} ]`
      : `{ ${entries.length} propriété${entries.length > 1 ? "s" : ""} }`;

    return (
      <div key={path}>
        <Row depth={depth} path={path} active={active}>
          <button
            onClick={() => toggleOpen(path)}
            style={{
              marginRight: "8px",
              cursor: "pointer",
              borderRadius: "6px",
              border: matched ? "1px solid #fff" : "1px solid #444",
              background: "#1b1b1b",
              color: "#fff",
              padding: "2px 8px",
            }}
            title={open ? "Replier" : "Déplier"}
          >
            {open ? "−" : "+"}
          </button>

          <span
            style={{
              color: matched ? "#fff" : "#B39DDB",
              fontWeight: matched ? 700 : 400,
              opacity: 0.95,
            }}
          >
            {highlightWholeWord(name, query)}:
          </span>{" "}
          <span style={{ opacity: 0.9 }}>{preview}</span>
        </Row>

        {open && (
          <div>
            {entries.map(([k, v]) => {
              const childName = isArr ? `[${k}]` : k;
              const childPath = isArr ? `${path}.[${k}]` : `${path}.${k}`;
              return renderNode(childName, v, childPath, depth + 1);
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {renderNode("root", data, "root", 0)}
      {q && (
        <div style={{ marginTop: "12px", opacity: 0.85 }}>
          Matchs: {matchPaths.length}
        </div>
      )}
    </div>
  );
}

export default JsonTree;
