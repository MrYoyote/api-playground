import { useState } from 'react';

function RequestForm({ onSend, history }) {
  const [url, setUrl] = useState('');

  return (
    <div>
      <input
        type="text"
        placeholder="Colle une URL d'API ici..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        style={{
            width: '100%',
            padding: '10px',
            borderRadius: '8px',
            border: '1px solid #555',
            background: '#1b1b1b',
            color: '#fff',
        }}
      />

        <br /><br />

        <button onClick={() => onSend(url)}>
            Envoyer
        </button>

        {history.length > 0 && (
            <div style={{ marginTop: '20px' }}>
                <h3>Historique des requêtes:</h3>
                {history.map((item, index) => (
                    <div key={index}>
                        <button onClick={() => onSend(item) }>
                            {item}
                        </button>
                    </div>
                ))}
            </div>
        )}
    </div>
  );
}

export default RequestForm;