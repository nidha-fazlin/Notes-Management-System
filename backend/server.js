const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const Datastore = require('nedb-promises');

const app = express();
const PORT = process.env.PORT || 5000;
const dataDirectory = path.join(__dirname, 'data');
const databasePath = path.join(dataDirectory, 'notes.db');

if (!fs.existsSync(dataDirectory)) {
  fs.mkdirSync(dataDirectory, { recursive: true });
}

const db = Datastore.create({
  filename: databasePath,
  autoload: true,
  timestampData: false,
});

const generateId = () => `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;

const sortByUpdatedAt = (notes) =>
  [...notes].sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt));

app.use(cors());
app.use(express.json());

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.get('/api/notes', async (request, response) => {
  try {
    const search = request.query.search?.trim() ?? '';
    const category = request.query.category?.trim() ?? '';
    const lowerSearch = search.toLowerCase();
    const lowerCategory = category.toLowerCase();

    const notes = await db.find({});
    const filteredNotes = notes.filter((note) => {
      const matchesSearch = search
        ? [note.title, note.content, ...(note.tags ?? [])]
            .join(' ')
            .toLowerCase()
            .includes(lowerSearch)
        : true;

      const matchesCategory = category
        ? (note.category ?? '').toLowerCase() === lowerCategory
        : true;

      return matchesSearch && matchesCategory;
    });

    response.json(sortByUpdatedAt(filteredNotes));
  } catch (error) {
    response.status(500).json({ message: 'Failed to fetch notes.' });
  }
});

app.get('/api/notes/:id', async (request, response) => {
  try {
    const note = await db.findOne({ id: request.params.id });

    if (!note) {
      return response.status(404).json({ message: 'Note not found.' });
    }

    return response.json(note);
  } catch (error) {
    return response.status(500).json({ message: 'Failed to fetch the note.' });
  }
});

app.post('/api/notes', async (request, response) => {
  try {
    const title = request.body.title?.trim();
    const content = request.body.content?.trim();
    const category = request.body.category?.trim() ?? '';
    const tags = Array.isArray(request.body.tags)
      ? request.body.tags.filter(Boolean).map((tag) => tag.trim())
      : [];

    if (!title || !content) {
      return response.status(400).json({ message: 'Title and content are required.' });
    }

    const timestamp = new Date().toISOString();
    const createdNote = {
      id: generateId(),
      title,
      content,
      category,
      tags,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await db.insert(createdNote);

    return response.status(201).json(createdNote);
  } catch (error) {
    return response.status(500).json({ message: 'Failed to create the note.' });
  }
});

app.put('/api/notes/:id', async (request, response) => {
  try {
    const title = request.body.title?.trim();
    const content = request.body.content?.trim();
    const category = request.body.category?.trim() ?? '';
    const tags = Array.isArray(request.body.tags)
      ? request.body.tags.filter(Boolean).map((tag) => tag.trim())
      : [];

    if (!title || !content) {
      return response.status(400).json({ message: 'Title and content are required.' });
    }

    const existingNote = await db.findOne({ id: request.params.id });

    if (!existingNote) {
      return response.status(404).json({ message: 'Note not found.' });
    }

    const updatedAt = new Date().toISOString();
    const updatedNote = {
      ...existingNote,
      title,
      content,
      category,
      tags,
      updatedAt,
    };

    await db.update({ id: request.params.id }, updatedNote);

    return response.json(updatedNote);
  } catch (error) {
    return response.status(500).json({ message: 'Failed to update the note.' });
  }
});

app.delete('/api/notes/:id', async (request, response) => {
  try {
    const removedCount = await db.remove({ id: request.params.id }, {});

    if (!removedCount) {
      return response.status(404).json({ message: 'Note not found.' });
    }

    return response.status(204).send();
  } catch (error) {
    return response.status(500).json({ message: 'Failed to delete the note.' });
  }
});

app.listen(PORT, () => {
  console.log(`Notes API running on http://localhost:${PORT}`);
});
