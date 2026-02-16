function RequestForm({
  url,
  setUrl,
  method,
  setMethod,
  headersRows,
  setHeadersRows,
  body,
  setBody,
  loading,
  onSend,
  onCancel,
  canHaveBody,
}) {
  const updateHeader = (idx, field, value) => {
    setHeadersRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const addHeaderRow = () => setHeadersRows((prev) => [...prev, { key: "", value: "" }]);

  const removeHeaderRow = (idx) => {
    setHeadersRows((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      return next.length ? next : [{ key: "", value: "" }];
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSend();
      }}
    >
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <select value={method} onChange={(e) => setMethod(e.target.value)} style={{ width: 140 }} title="Méthode HTTP">
          <option>GET</option>
          <option>POST</option>
          <option>PUT</option>
          <option>PATCH</option>
          <option>DELETE</option>
        </select>

        <input type="text" placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} style={{ flex: 1, minWidth: 260 }} />

        <button type="submit" disabled={loading} title="Envoyer (Entrée)">
          Envoyer
        </button>

        <button type="button" onClick={onCancel} disabled={!loading} title="Annuler la requête">
          Annuler
        </button>
      </div>

      <div style={{ marginTop: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <h3 style={{ margin: 0, fontSize: 16, opacity: 0.9 }}>Headers</h3>
          <button type="button" onClick={addHeaderRow}>
            + Ajouter
          </button>
        </div>

        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          {headersRows.map((row, idx) => (
            <div key={idx} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <input
                type="text"
                placeholder="Header (ex: Authorization)"
                value={row.key}
                onChange={(e) => updateHeader(idx, "key", e.target.value)}
                style={{ flex: 1, minWidth: 220 }}
              />
              <input
                type="text"
                placeholder="Valeur (ex: Bearer …)"
                value={row.value}
                onChange={(e) => updateHeader(idx, "value", e.target.value)}
                style={{ flex: 2, minWidth: 260 }}
              />
              <button type="button" onClick={() => removeHeaderRow(idx)} title="Supprimer ce header">
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <h3 style={{ margin: 0, fontSize: 16, opacity: 0.9 }}>Body (JSON) {canHaveBody ? "" : "— (désactivé pour GET/DELETE)"}</h3>

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={canHaveBody ? '{ "hello": "world" }' : "Body désactivé pour cette méthode"}
          disabled={!canHaveBody}
          rows={8}
          style={{ marginTop: 10 }}
        />
      </div>
    </form>
  );
}

export default RequestForm;
