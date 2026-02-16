import { useState } from 'react';

function RequestForm({ onSend }) {
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
    </div>
  );
}

export default RequestForm;