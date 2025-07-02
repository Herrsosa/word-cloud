import React, { useState } from 'react';
import axios from 'axios';

function FileUpload({ setData, setIsLoading, setError }) {
  const [file, setFile] = useState(null);

  const onFileChange = (e) => {
    // LOG 1: Let's see if this function is being called when you choose a file.
    console.log('File selected in onFileChange:', e.target.files[0]);
    setFile(e.target.files[0]);
  };

  const onFileUpload = async () => {
    // LOG 2: Let's see what the 'file' state is when you click the button.
    console.log('Attempting to upload file:', file);

    if (!file) {
      // LOG 3: This will tell us if the upload is stopping here.
      console.error('Upload function stopped because no file was selected in state.');
      setError('Please select a file first.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setIsLoading(true);
    setError('');
    setData(null);

    try {
      console.log('Sending file to /upload...');
      const response = await axios.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log('Received data from server:', response.data);
      setData(response.data);
    } catch (err) {
      console.error('Error during upload API call:', err);
      setError(err.response?.data || 'An error occurred while uploading the file.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <input type="file" onChange={onFileChange} accept=".txt,.docx" />
      <button onClick={onFileUpload}>Generate Cloud</button>
    </div>
  );
}

export default FileUpload;