'use client';
// src/app/list/page.tsx
import { useEffect, useState } from 'react';

type Movie = {
  id: number;
  name: string;
  url: string;
  rating: number;
  releaseDate: string;
  tags: string;
};

export default function MoviePage() {
  const [movieName, setMovieName] = useState('');
  const [existingMovie, setExistingMovie] = useState<Movie | null>(null);
  const [movieList, setMovieList] = useState<Movie[]>([]);
  const [filteredMovies, setFilteredMovies] = useState<Movie[]>([]);
  const [showSaveFields, setShowSaveFields] = useState(false);
  const [url, setUrl] = useState('');
  const [rating, setRating] = useState<number | ''>('');
  const [releaseDate, setReleaseDate] = useState('');
  const [tags, setTags] = useState<string[]>(["movies"]);
  const [status, setStatus] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [filteredTags, setFilteredTags] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);

  useEffect(() => {
    fetchMovies();
    fetchHashtags();
  }, []);

  useEffect(() => {
    filterMovieList();
  }, [movieName, tags, movieList]);

  const fetchMovies = async () => {
    const res = await fetch('/api/movies');
    const data = await res.json();
    setMovieList(data);
  };

  const fetchHashtags = async () => {
    const res = await fetch('/api/hashtags');
    const data = await res.json();
    setAllTags(data);
  };

  const filterMovieList = () => {
    let filtered = movieList;

    if (movieName.trim()) {
      filtered = filtered.filter(m =>
        m.name.toLowerCase().includes(movieName.trim().toLowerCase())
      );
    }

    if (tags.length > 0) {
      filtered = filtered.filter(movie =>
        tags.every(tag =>
          movie.tags.toLowerCase().split(',').map(t => t.trim()).includes(tag.toLowerCase())
        )
      );
    }

    setFilteredMovies(filtered);
  };

  const handleMovieNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMovieName(value);

    const found = movieList.find(
      (m) => m.name.toLowerCase() === value.toLowerCase()
    );
    if (found) {
      setExistingMovie(found);
      setShowSaveFields(false);
      setStatus('');
    } else {
      setExistingMovie(null);
      setShowSaveFields(true);
    }
  };

  const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase();
    setTagInput(value);
    setFilteredTags(
      allTags.filter(tag => tag.includes(value) && !tags.includes(tag))
    );
  };

  const handleTagClick = (tag: string) => {
    const trimmedTag = tag.trim();
    if (!trimmedTag || tags.includes(trimmedTag)) return;
    setTags([...tags, trimmedTag]);
    setTagInput('');
    setFilteredTags([]);
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === 'Tab') && tagInput.trim() !== '') {
      e.preventDefault();
      const newTag = tagInput.trim();
      if (!tags.includes(newTag)) {
        setTags([...tags, newTag]);
      }
      setTagInput('');
      setFilteredTags([]);
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleSave = async () => {
    const cleanedTags = tags.map(t => t.trim()).filter(t => t !== '');
    const cleanedName = movieName.trim();

    if (!cleanedName || cleanedTags.length === 0) {
      setStatus('❌ Name aur Tags required hain.');
      return;
    }

    const res = await fetch('/api/movies', {
      method: existingMovie ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: existingMovie?.id,
        name: cleanedName,
        url,
        rating,
        releaseDate,
        tags: cleanedTags.join(','),
      }),
    });

    if (res.ok) {
      setStatus(existingMovie ? `✅ '${cleanedName}' updated!` : `✅ '${cleanedName}' saved!`);
      resetForm();
      fetchMovies();
      fetchHashtags();
    } else {
      const data = await res.json();
      setStatus(data.error || '❌ Error saving movie');
    }
  };

  const handleDelete = async (id: number) => {
    const res1 = await fetch(`/api/movies/${id}`, { method: 'GET' });
    const mdata = await res1.json();
    if (res1.ok) {
      const confirmDelete = window.confirm(`Are you sure you want to delete '${mdata.name}' from List?`);
      if (confirmDelete) {
        const res = await fetch(`/api/movies/${id}`, { method: 'DELETE' });
        if (res.ok) {
          setStatus(`✅ '${mdata.name}' deleted successfully!`);
          fetchMovies();
        } else {
          const data = await res.json();
          setStatus(data.error || '❌ Error deleting List');
        }
      }
    } else {
      setStatus(mdata.error || '❌ not Found!');
    }
  };

  const handleEdit = (movie: Movie) => {
    setMovieName(movie.name);
    setUrl(movie.url);
    setRating(movie.rating);
    setReleaseDate(movie.releaseDate);
    setTags(movie.tags.split(',').map(tag => tag.trim()));
    setExistingMovie(movie);
    setShowSaveFields(true);
  };

  const resetForm = () => {
    setMovieName('');
    setUrl('');
    setRating('');
    setReleaseDate('');
    setTags([]);
    setTagInput('');
    setFilteredTags([]);
    setShowSaveFields(false);
    setExistingMovie(null);
  };

  return (
    <div style={{ padding: '30px', maxWidth: '700px', margin: 'auto', fontFamily: 'Arial, sans-serif' }}>
      <h2>🎬 List Manager</h2>

      <input
        type="text"
        placeholder="Filter / Add name"
        value={movieName}
        onChange={handleMovieNameChange}
        style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
      />

      <input
        type="text"
        placeholder="Search/Add tags..."
        value={tagInput}
        onChange={handleTagInputChange}
        onKeyDown={handleTagKeyDown}
        style={{ width: '100%', padding: '10px', marginBottom: '5px' }}
      />
      {filteredTags.length > 0 && (
        <div style={{ marginBottom: '10px' }}>
          {filteredTags.map(tag => (
            <span
              key={tag}
              style={{
                marginRight: 8, padding: '5px 10px', background: '#0070f3',
                cursor: 'pointer', borderRadius: '20px'
              }}
              onClick={() => handleTagClick(tag)}
            >
              + {tag}
            </span>
          ))}
        </div>
      )}
      <div style={{ marginBottom: 10 }}>
        {tags.map(tag => (
          <span
            key={tag}
            style={{
              display: 'inline-block',
              marginRight: 6,
              padding: '4px 10px',
              background: '#0070f3',
              color: '#fff',
              borderRadius: '15px',
              cursor: 'pointer'
            }}
            onClick={() => removeTag(tag)}
          >
            {tag} ✕
          </span>
        ))}
      </div>

      {showSaveFields && (
        <>
          <input
            type="text"
            placeholder="URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
          />
          <input
            type="number"
            placeholder="Rating (1–10)"
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
            style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
          />
          <input
            type="date"
            value={releaseDate}
            onChange={(e) => setReleaseDate(e.target.value)}
            style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
          />
          <button onClick={handleSave} style={{ padding: '10px 20px', fontSize: '16px' }}>
            {existingMovie ? 'Update List' : 'Save List'}
          </button>
        </>
      )}

      {status && (
        <p style={{ marginTop: '10px', color: status.includes('❌') ? 'red' : 'green' }}>
          {status}
        </p>
      )}

      <hr />
      <h3>🎞 Filtered List</h3>
      {filteredMovies.length === 0 ? (
        <p>No List found.</p>
      ) : (
        <ul>
          {filteredMovies.map((movie) => (
            <li key={movie.id}>
              <strong>{movie.name}</strong> — {movie.releaseDate}
              <button onClick={() => handleEdit(movie)} style={{ marginLeft: 10 }}>✏️ Edit</button>
              <button onClick={() => handleDelete(movie.id)} style={{ marginLeft: 5 }}>🗑 Delete</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
