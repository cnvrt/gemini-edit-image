// app/page.tsx (Sirf changed/added parts)
'use client';

import { useState, FormEvent, ChangeEvent } from 'react';
import styles from '../page.module.css';

export default function HomePage() {
  // --- STATE CHANGES ---
  const [file1, setFile1] = useState<File | null>(null); // First file
  const [file2, setFile2] = useState<File | null>(null); // Second file
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null); // Single result image
  const [originalPreview1, setOriginalPreview1] = useState<string | null>(null); // Preview 1
  const [originalPreview2, setOriginalPreview2] = useState<string | null>(null); // Preview 2

  // --- SEPARATE FILE HANDLERS (or one handler checking event.target.name) ---
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    const inputName = event.target.name; // 'image1' or 'image2'

    if (selectedFile) {
      if (inputName === 'image1') {
        setFile1(selectedFile);
      } else if (inputName === 'image2') {
        setFile2(selectedFile);
      }

      // Generate preview
      const reader = new FileReader();
      reader.onloadend = () => {
        if (inputName === 'image1') {
          setOriginalPreview1(reader.result as string);
        } else if (inputName === 'image2') {
          setOriginalPreview2(reader.result as string);
        }
      };
      reader.readAsDataURL(selectedFile);

      setResultImage(null); // Clear previous result
      setError(null);    // Clear previous error
    } else {
       // Clear if file is deselected
        if (inputName === 'image1') {
            setFile1(null);
            setOriginalPreview1(null);
        } else if (inputName === 'image2') {
            setFile2(null);
            setOriginalPreview2(null);
        }
    }
  };


  // --- UPDATED SUBMIT HANDLER ---
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // *** CHANGE: Check for both files ***
    if (!file1 || !file2 || !prompt) {
      setError('Please select two image files and enter a prompt.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResultImage(null);

    const formData = new FormData();
    // *** CHANGE: Append both files with distinct keys ***
    formData.append('image1', file1);
    formData.append('image2', file2);
    formData.append('prompt', prompt);

    try {
      // *** CHANGE: Call the new API endpoint ***
      const response = await fetch('/api/edit-two-images', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Request failed with status ${response.status}`);
      }

      // Expecting single image result
      if (data.imageData && data.mimeType) {
        const imageUrl = `data:${data.mimeType};base64,${data.imageData}`;
        setResultImage(imageUrl); // Set the single result image
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

   // Helper to generate download info (no changes needed if resultImage is single)
   // const downloadInfo = useMemo(() => { ... });

  // --- JSX CHANGES (Inside return statement) ---
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Gemini Image Combiner</h1>
      <p className={styles.description}>Upload two images and tell Gemini how to combine or edit them based on your prompt!</p>

      <form onSubmit={handleSubmit} className={styles.form}>
         {/* --- Input for First Image --- */}
        <div className={styles.inputGroup}>
          <label htmlFor="imageFile1" className={styles.label}>1. Choose First Image:</label>
          <input
            id="imageFile1"
            name="image1" // *** Add name attribute ***
            className={styles.fileInput}
            type="file"
            accept="image/*"
            onChange={handleFileChange} // Use the unified handler
            required
            disabled={isLoading}
          />
        </div>

         {/* --- Input for Second Image --- */}
        <div className={styles.inputGroup}>
          <label htmlFor="imageFile2" className={styles.label}>2. Choose Second Image:</label>
          <input
            id="imageFile2"
            name="image2" // *** Add name attribute ***
            className={styles.fileInput}
            type="file"
            accept="image/*"
            onChange={handleFileChange} // Use the unified handler
            required
            disabled={isLoading}
          />
        </div>

        {/* --- Prompt Input --- */}
        <div className={styles.inputGroup}>
          <label htmlFor="prompt" className={styles.label}>3. Editing/Combining Prompt:</label>
          <input
            id="prompt"
            className={styles.textInput}
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., Combine these images, put object from image 1 into image 2"
            required
            disabled={isLoading}
          />
        </div>

        {/* --- Submit Button --- */}
        <button className={styles.button} type="submit" disabled={isLoading || !file1 || !file2 || !prompt}>
          {isLoading ? (
            <> <span className={styles.spinner}></span> Processing... </>
          ) : ( '✨ Combine/Edit Images' )}
        </button>
      </form>

      {error && <p className={styles.error}>⛔ Error: {error}</p>}

      {/* --- Container for TWO Original Previews --- */}
      <div className={styles.previewsContainer}>
          {originalPreview1 && (
              <div className={styles.preview}>
                  <h3>Original 1</h3>
                  <img src={originalPreview1} alt="Selected preview 1" className={styles.imagePreview} />
                  {file1 && <span className={styles.imageFilename}>{file1.name}</span>}
              </div>
          )}
           {originalPreview2 && (
              <div className={styles.preview}>
                  <h3>Original 2</h3>
                  <img src={originalPreview2} alt="Selected preview 2" className={styles.imagePreview} />
                   {file2 && <span className={styles.imageFilename}>{file2.name}</span>}
              </div>
          )}
      </div>

      {/* --- Container for ONE Result Image --- */}
      {resultImage && (
        <div className={styles.resultSection}> {/* New wrapper or reuse existing */}
          <h2>Combined/Edited Result:</h2>
          <div className={styles.result}> {/* Reuse preview styling or create new */}
              {/* Calculate download info for the single result */}
              {(() => {
                  const mimeMatch = resultImage.match(/data:(image\/\w+);base64,/);
                  const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
                  const extension = mimeType.split('/')[1] || 'png';
                  const downloadFilename = `combined-edited-${Date.now()}.${extension}`;
                  return (
                      <>
                          <img src={resultImage} alt="Edited result" className={styles.imagePreview} />
                          <a
                              className={`${styles.button} ${styles.downloadButton}`}
                              href={resultImage}
                              download={downloadFilename}
                          >
                              Download Result
                          </a>
                      </>
                  );
              })()}
          </div>
        </div>
      )}
    </main>
  );
}