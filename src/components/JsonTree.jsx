import { useEffect, useMemo, useState } from "react";

function isObject(value) {
  return value !== null && typeof value === "object";
}

function normalize(str) {
  return String(str ?? "").toLowerCase();
}

/**
 * Recherche dans tout l'arbre :
 * - match sur les clés
 * - match sur les valeurs primitives
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
      if (normalize(k).includes(q)) addMatch(childPath);
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

  // ✅ Nouveau modèle robuste
  const [forcedOpen, setForcedOpen] = useState(() => new Set());
  const [forcedClosed, setForcedClosed] = useState(() => new Set());

  useEffect(() => {
    if (normalize(query).trim()) {
      setForcedOpen(new Set());
      setForcedClosed(new Set());
    }
  }, [query]);


  // Informer le parent (ResponseViewer) des matchs
  useEffect(() => {
    onMatchesChange?.(matchPaths);
  }, [query, data]);

  // Auto-open renforcé: si on a un match "actif", on force l'ouverture de ses parents
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
      // fermer -> forcedClosed
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
      // ouvrir -> forcedOpen
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

  // Appliquer actions "expand/collapse all"
  useEffect(() => {
    if (!treeActionId || !treeAction) return;

    const containers = getContainerPaths(data);

    if (treeAction === "expandAll") {
      setForcedClosed(new Set());
      setForcedOpen(new Set(containers)); // tout ouvert
    }

    if (treeAction === "collapseAll") {
      // tout fermé sauf root
      const closed = new Set(containers);
      closed.delete("root");

      setForcedOpen(new Set(["root"]));
      setForcedClosed(closed);
    }
  }, [treeActionId, treeAction, data]);

  // Scroll sur le match actif
  useEffect(() => {
    if (!activeMatchPath) return;
    const el = document.querySelector(`[data-path="${activeMatchPath}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeMatchPath]);

  const Row = ({ depth, path, children, active }) => (
    <div
      data-path={path}
      style={{
        paddingLeft: `${depth * 20}px`,
        paddingTop: "2px",
        paddingBottom: "2px",
        background: active ? "#1f1f1f" : "transparent",
        borderRadius: active ? "6px" : "0px",
      }}
    >
      {children}
    </div>
  );

  const renderNode = (name, value, path, depth) => {
    const active = activeMatchPath === path;

    // Primitive
    if (!isObject(value)) {
      const display = typeof value === "string" ? `"${value}"` : String(value);
      const highlightLine =
        q && (normalize(name).includes(q) || normalize(value).includes(q));

      return (
        <Row key={path} depth={depth} path={path} active={active}>
          <span
            style={{
              color: highlightLine ? "#fff" : "#B39DDB",
              opacity: 0.9,
              fontWeight: highlightLine ? 700 : 400,
            }}
          >
            {name}:
          </span>{" "}
          <span
            style={{
              color: getValueColor(value),
              fontWeight: highlightLine ? 700 : 400,
            }}
          >
            {display}
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
            onClick={() => {toggleOpen(path);}}

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
            {name}:
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
