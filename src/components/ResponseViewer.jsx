function ResponseViewer({ data, error, loading, status, time }) {
    return (
        <div>
            {loading && <p>Chargement...</p>}
            {status && <p>Status HTTP: {status}</p>}
            {time && <p>Temps de réponse: {time} ms</p>}
            {error && <p style={{ color: 'red' }}>Erreur: {error}</p>}
        
            <pre
                style={{
                    background: '#111',
                    color: '#eee',
                    padding: '20px',
                    borderRadius: '8px',
                    overflowX: 'auto',
                    maxHeight: '60vh',
                }}
            >
                {data}
            </pre>
        </div>
    )
}

export default ResponseViewer;