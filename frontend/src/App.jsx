import { useEffect, useMemo, useState } from 'react'
import './App.css'

const emptyForm = {
  title: '',
  content: '',
  category: '',
  tags: '',
}

function App() {
  const [notes, setNotes] = useState([])
  const [selectedNoteId, setSelectedNoteId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [mode, setMode] = useState('create')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const selectedNote = useMemo(
    () => notes.find((note) => note.id === selectedNoteId) ?? null,
    [notes, selectedNoteId],
  )

  const categories = useMemo(() => {
    const values = new Set(
      notes.map((note) => note.category).filter((category) => category && category.trim()),
    )
    return ['All', ...values]
  }, [notes])

  const fetchNotes = async () => {
    try {
      setIsLoading(true)
      setError('')

      const params = new URLSearchParams()
      if (searchTerm.trim()) {
        params.set('search', searchTerm.trim())
      }
      if (activeCategory !== 'All') {
        params.set('category', activeCategory)
      }

      const response = await fetch(`/_/backend/api/notes?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Unable to load notes.')
      }

      const data = await response.json()
      setNotes(data)

      if (data.length === 0) {
        setSelectedNoteId(null)
        if (mode !== 'edit') {
          setMode('create')
        }
        return
      }

      setSelectedNoteId((currentId) => {
        const stillExists = data.some((note) => note.id === currentId)
        return stillExists ? currentId : data[0].id
      })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchNotes()
  }, [searchTerm, activeCategory])

  useEffect(() => {
    if (!selectedNote && mode === 'edit') {
      setMode('create')
      setForm(emptyForm)
      return
    }

    if (selectedNote && mode === 'edit') {
      setForm({
        title: selectedNote.title,
        content: selectedNote.content,
        category: selectedNote.category ?? '',
        tags: selectedNote.tags?.join(', ') ?? '',
      })
    }
  }, [selectedNote, mode])

  const updateFormField = (event) => {
    const { name, value } = event.target
    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const resetForm = () => {
    setMode('create')
    setForm(emptyForm)
    setMessage('')
    setError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    try {
      setIsSaving(true)
      setMessage('')
      setError('')

      const payload = {
        title: form.title,
        content: form.content,
        category: form.category,
        tags: form.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
      }

      const endpoint = mode === 'edit' && selectedNote ? `/_/backend/api/notes/${selectedNote.id}` : '/_/backend/api/notes'
      const method = mode === 'edit' && selectedNote ? 'PUT' : 'POST'

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const responseData = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(responseData?.message ?? 'Unable to save the note.')
      }

      setMessage(mode === 'edit' ? 'Note updated successfully.' : 'Note created successfully.')
      setMode('create')
      setForm(emptyForm)
      setSelectedNoteId(responseData.id)
      await fetchNotes()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (noteId) => {
    if (!window.confirm('Delete this note permanently?')) {
      return
    }

    try {
      setError('')
      setMessage('')

      const response = await fetch(`/_/backend/api/notes/${noteId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const responseData = await response.json().catch(() => null)
        throw new Error(responseData?.message ?? 'Unable to delete the note.')
      }

      if (selectedNoteId === noteId) {
        setSelectedNoteId(null)
      }

      setMessage('Note deleted successfully.')
      if (mode === 'edit' && selectedNoteId === noteId) {
        resetForm()
      }
      await fetchNotes()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  const startEditing = () => {
    if (!selectedNote) {
      return
    }

    setMode('edit')
    setMessage('')
    setError('')
    setForm({
      title: selectedNote.title,
      content: selectedNote.content,
      category: selectedNote.category ?? '',
      tags: selectedNote.tags?.join(', ') ?? '',
    })
  }

  const formatDate = (value) =>
    new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))

  return (
    <main className="app-shell">
      <header className="hero-panel">
        <div>
          <p className="eyebrow">Notes Management System</p>
          <h1>Capture, organize, and revisit your notes in one place.</h1>
          <p className="hero-copy">
            Create notes, group them by category, add tags, search instantly, and keep
            everything persisted in the database.
          </p>
        </div>
        <div className="hero-stats" aria-label="Application summary">
          <article>
            <strong>{notes.length}</strong>
            <span>Total notes</span>
          </article>
          <article>
            <strong>{categories.length - 1}</strong>
            <span>Categories</span>
          </article>
          <article>
            <strong>{notes.filter((note) => note.tags?.length).length}</strong>
            <span>Tagged notes</span>
          </article>
        </div>
      </header>

      <section className="workspace-grid">
        <aside className="panel">
          <div className="panel-header">
            <div>
              <p className="panel-label">Create or edit</p>
              <h2>{mode === 'edit' ? 'Edit note' : 'New note'}</h2>
            </div>
            {mode === 'edit' ? (
              <button type="button" className="secondary-button" onClick={resetForm}>
                Cancel
              </button>
            ) : null}
          </div>

          <form className="note-form" onSubmit={handleSubmit}>
            <label>
              Title
              <input
                name="title"
                value={form.title}
                onChange={updateFormField}
                placeholder="Meeting summary"
                required
              />
            </label>

            <label>
              Category
              <input
                name="category"
                value={form.category}
                onChange={updateFormField}
                placeholder="Work, Personal, Ideas..."
              />
            </label>

            <label>
              Tags
              <input
                name="tags"
                value={form.tags}
                onChange={updateFormField}
                placeholder="react, backend, study"
              />
            </label>

            <label>
              Content
              <textarea
                name="content"
                value={form.content}
                onChange={updateFormField}
                placeholder="Write your note here..."
                rows="10"
                required
              />
            </label>

            <button type="submit" className="primary-button" disabled={isSaving}>
              {isSaving ? 'Saving...' : mode === 'edit' ? 'Update note' : 'Create note'}
            </button>
          </form>

          {message ? <p className="feedback success">{message}</p> : null}
          {error ? <p className="feedback error">{error}</p> : null}
        </aside>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="panel-label">Browse notes</p>
              <h2>Notes list</h2>
            </div>
          </div>

          <div className="filters">
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search title, content, or tags"
              aria-label="Search notes"
            />
            <div className="category-filter" role="tablist" aria-label="Filter by category">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  className={category === activeCategory ? 'filter-chip active' : 'filter-chip'}
                  onClick={() => setActiveCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="notes-list">
            {isLoading ? <p className="empty-state">Loading notes...</p> : null}
            {!isLoading && notes.length === 0 ? (
              <p className="empty-state">No notes found. Create your first note to get started.</p>
            ) : null}

            {notes.map((note) => (
              <article
                key={note.id}
                className={note.id === selectedNoteId ? 'note-card selected' : 'note-card'}
              >
                <button
                  type="button"
                  className="note-card-button"
                  onClick={() => {
                    setSelectedNoteId(note.id)
                    setMode('create')
                  }}
                >
                  <div className="note-card-head">
                    <h3>{note.title}</h3>
                    {note.category ? <span className="badge">{note.category}</span> : null}
                  </div>
                  <p>{note.content.slice(0, 96)}{note.content.length > 96 ? '…' : ''}</p>
                  <div className="note-meta">
                    <span>Updated {formatDate(note.updatedAt)}</span>
                    <div className="tag-row">
                      {note.tags?.slice(0, 3).map((tag) => (
                        <span key={tag} className="tag">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </button>
                <div className="card-actions">
                  <button type="button" className="secondary-button" onClick={() => {
                    setSelectedNoteId(note.id)
                    setMode('edit')
                  }}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="danger-button"
                    onClick={() => handleDelete(note.id)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel viewer-panel">
          <div className="panel-header">
            <div>
              <p className="panel-label">View note</p>
              <h2>Details</h2>
            </div>
            {selectedNote ? (
              <button type="button" className="secondary-button" onClick={startEditing}>
                Edit selected
              </button>
            ) : null}
          </div>

          {selectedNote ? (
            <article className="viewer-card">
              <div className="viewer-title-row">
                <div>
                  <h3>{selectedNote.title}</h3>
                  <p className="viewer-date">Created {formatDate(selectedNote.createdAt)}</p>
                </div>
                {selectedNote.category ? <span className="badge">{selectedNote.category}</span> : null}
              </div>

              <div className="tag-row">
                {selectedNote.tags?.length ? (
                  selectedNote.tags.map((tag) => (
                    <span key={tag} className="tag">
                      #{tag}
                    </span>
                  ))
                ) : (
                  <span className="subtle">No tags added</span>
                )}
              </div>

              <p className="viewer-content">{selectedNote.content}</p>

              <p className="viewer-date">Last updated {formatDate(selectedNote.updatedAt)}</p>
            </article>
          ) : (
            <div className="empty-viewer">
              <h3>Select a note</h3>
              <p>Choose a note from the list to preview its full content here.</p>
            </div>
          )}
        </section>
      </section>
    </main>
  )
}

export default App
