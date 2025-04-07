// app/page.tsx
'use client'; // This directive marks the component as a Client Component

import { useState, FormEvent } from 'react';
import styles from './page.module.css'; // Optional: for styling

export default function HomePage() {
  const [file, setFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null); // To store base64 image data URL
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [originalImagePreview, setOriginalImagePreview] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      // Create a preview URL for the selected image
      const reader = new FileReader();
      reader.onloadend = () => {
        setOriginalImagePreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
      setResultImage(null); // Clear previous result when new file is selected
      setError(null); // Clear previous error
    } else {
        setFile(null);
        setOriginalImagePreview(null);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file || !prompt) {
      setError('Please select an image file and enter a prompt.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResultImage(null);

    const formData = new FormData();
    formData.append('image', file);
    formData.append('prompt', prompt);

    try {
      const response = await fetch('/api/edit-image', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Request failed with status ${response.status}`);
      }

      if (data.imageData && data.mimeType) {
        // Create a data URL for the received base64 image
        const imageUrl = `data:${data.mimeType};base64,${data.imageData}`;
        setMimeType(data.mimeType.replace("image/", ""));
        setResultImage(imageUrl);
      } else {
          throw new Error(data.error || 'Received invalid image data from server.');
      }

    } catch (err: any) {
      console.error('Submission error:', err);
      setError(err.message || 'An unknown error occurred.');
      setResultImage(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // Use the styles object for class names
    <main className={styles.main}>
      <h1 className={styles.title}>Gemini Image Editor</h1>
      <p className={styles.description}>Upload an image and tell Gemini how to edit it!</p>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.inputGroup}>
          <label htmlFor="imageFile" className={styles.label}>1. Choose Image:</label>
          <input
            id="imageFile"
            className={styles.fileInput} // Added class
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            required
            disabled={isLoading}
          />
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="prompt" className={styles.label}>2. Editing Prompt:</label>
          <input
            id="prompt"
            className={styles.textInput} // Added class
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., Make the sky blue, add sunglasses"
            required
            disabled={isLoading}
          />
        </div>

        <button className={styles.button} type="submit" disabled={isLoading || !file || !prompt}>
          {isLoading ? (
            <>
              <span className={styles.spinner}></span> Processing...
            </>
          ) : (
            '✨ Edit Image'
          )}
        </button>
      </form>

      {error && <p className={styles.error}>Error: {error}</p>}

      {/* Container for Previews */}
      <div className={styles.previewsContainer}>
          {originalImagePreview && (
              <div className={styles.preview}>
                  <h3>Original</h3>
                  <img
                    src={originalImagePreview}
                    alt="Selected preview"
                    className={styles.imagePreview} // Added class
                  />
              </div>
          )}

          {resultImage && (
            <div className={styles.result}>
              <h2>Edited Image:</h2>
              <img
                src={resultImage}
                alt="Edited result"
                className={styles.imagePreview} // Added class
               />
               <a
                 className={`${styles.button} ${styles.downloadButton}`} // Re-use button style, add specific class
                 href={resultImage}
                 download={`editedImage-${Date.now()}.${mimeType}`} // Use dynamic filename
               >
                 Download Image
               </a>
            </div>
          )}
      </div>
    </main>
  );
}

// Optional: Add some basic CSS in app/page.module.css
/*
.main {
  font-family: sans-serif;
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
}

.inputGroup {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.inputGroup label {
  font-weight: bold;
}

.inputGroup input[type="text"] {
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
}

button {
  padding: 0.75rem 1.5rem;
  background-color: #0070f3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.2s ease;
}

button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

button:not(:disabled):hover {
  background-color: #005bb5;
}

.error {
  color: red;
  margin-top: 1rem;
  font-weight: bold;
}

.result, .preview {
  margin-top: 2rem;
  text-align: center;
}

.result h2, .preview h3 {
  margin-bottom: 1rem;
}
*/