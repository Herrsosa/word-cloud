import React, { useState } from 'react';
import FileUpload from './components/FileUpload';
import WordCloud from './components/WordCloud';
import './App.css';

function App() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedNode, setSelectedNode] = useState(null); // To store info on a clicked node

  // A simple detail panel
  const DetailPanel = () => {
    if (!selectedNode) return null;
    return (
      <div style={{
        position: 'absolute',
        top: '160px',
        right: '20px',
        width: '250px',
        background: 'rgba(255, 255, 255, 0.9)',
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '15px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        textAlign: 'left',
        fontSize: '14px',
        maxHeight: '70vh',
        overflowY: 'auto'
      }}>
        <h3 style={{marginTop: 0, marginBottom: '10px'}}>{selectedNode.text}</h3>
        <p><strong>Context:</strong> <em>"{selectedNode.context}"</em></p>
      </div>
    );
  };

  return (
    <div className="App">
      <header className="header">
        <h1>Podcast Narrative Visualizer</h1>
        <p>Upload a podcast transcript (.txt or .docx) to see its topics in 3D space.</p>
        <FileUpload 
          setData={setData} 
          setIsLoading={setIsLoading} 
          setError={setError} 
        />
      </header>
      
      <main>
        {isLoading && <p className="loading-message">Analyzing transcript... this may take a moment.</p>}
        {error && <p className="error-message">{error}</p>}
        {data && !isLoading && (
          <div className="word-cloud-container">
            <WordCloud data={data} setSelectedNode={setSelectedNode} />
            <DetailPanel />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;