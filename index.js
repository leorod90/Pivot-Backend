import express from "express";
import cors from "cors";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import { nanoid } from "nanoid";
import bcrypt from "bcrypt";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Define default structure for the DB
const defaultData = {
  users: [],
  profiles: []
};

// Setup LowDB with default data for persistence
const file = join(__dirname, "db.json");
const adapter = new JSONFile(file);
const db = new Low(adapter, defaultData);

// Read DB or initialize with defaults if empty
await db.read();

// Save default data if file was empty or missing
if (!db.data) {
  db.data = defaultData;
  await db.write();
}

const app = express();

app.use(cors());
app.use(express.json());

// POST register
app.post("/auth/register", async (req, res) => {
  const { username, password } = req.body;
  const existingUser = db.data.users.find(u => u.username === username);
  if (existingUser) return res.status(409).json({ error: "Username taken" });

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = { id: nanoid(), username, password: hashedPassword };
  db.data.users.push(user);
  await db.write();
  res.status(201).json({ id: user.id, username: user.username });
});

// POST login
app.post("/auth/login", async (req, res) => {
  const { username, password } = req.body;
  const user = db.data.users.find(u => u.username === username);
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) return res.status(401).json({ error: "Invalid credentials" });

  res.json({ id: user.id, username: user.username });
});

// GET all profiles (public, without ownerId)
app.get("/profiles", (req, res) => {
  const profilesWithCommentCount = db.data.profiles.map(profile => {
    const { ownerId, comments, ...publicProfile } = profile;
    const commentCount = comments ? comments.length : 0;
    return { ...publicProfile, commentCount };
  });
  res.json(profilesWithCommentCount);
});

// GET a single profile by ID (public view, hides ownerId and comments)
app.get("/profiles/:id", (req, res) => {
  const { id } = req.params;
  const profile = db.data.profiles.find(p => p.id === id);

  if (!profile) {
    return res.status(404).json({ message: "Profile not found" });
  }

  const { ownerId, comments, ...publicProfile } = profile;
  const commentCount = comments ? comments.length : 0;
  res.json({ ...publicProfile, commentCount });
});


// POST create profile (requires userId)
app.post("/profiles", (req, res) => {
  const { name, image, description, ownerId } = req.body;
  const user = db.data.users.find(u => u.id === ownerId);
  if (!user) return res.status(401).json({ error: "Invalid ownerId" });

  const newProfile = {
    id: nanoid(),
    name,
    image,
    description,
    ownerId,
    comments: []
  };
  db.data.profiles.push(newProfile);
  db.write();
  res.status(201).json(newProfile);
});

// PUT update profile (only by owner)
app.put("/profiles/:id", (req, res) => {
  const profile = db.data.profiles.find(p => p.id === req.params.id);
  if (!profile) return res.status(404).json({ error: "Profile not found" });
  if (profile.ownerId !== req.body.ownerId)
    return res.status(403).json({ error: "Not your profile" });

  profile.name = req.body.name || profile.name;
  profile.image = req.body.image || profile.image;
  profile.description = req.body.description || profile.description;
  db.write();
  res.json(profile);
});

// GET comments for a profile (public)
app.get("/profiles/:id/comments", (req, res) => {
  const profile = db.data.profiles.find(p => p.id === req.params.id);
  if (!profile) return res.status(404).json({ error: "Profile not found" });

  res.json(profile.comments || []);
});

// POST add comment to profile (requires userId)
app.post("/profiles/:id/comments", (req, res) => {
  const { text, ownerId } = req.body;
  const user = db.data.users.find(u => u.id === ownerId);
  if (!user) return res.status(401).json({ error: "Invalid ownerId" });

  const profile = db.data.profiles.find(p => p.id === req.params.id);
  if (!profile) return res.status(404).json({ error: "Profile not found" });

  const newComment = {
    id: nanoid(),
    username: user.username,
    text
  };

  profile.comments = profile.comments || [];
  profile.comments.push(newComment);
  db.write();
  res.status(201).json(newComment);
});

// PUT update comment (by owner only)
app.put("/comments/:id", (req, res) => {
  const { ownerId, text } = req.body;
  let found = false;

  for (const profile of db.data.profiles) {
    const comment = profile.comments?.find(c => c.id === req.params.id);
    if (comment) {
      const user = db.data.users.find(u => u.id === ownerId);
      if (!user || user.username !== comment.username)
        return res.status(403).json({ error: "Not your comment" });

      comment.text = text || comment.text;
      found = true;
      break;
    }
  }

  if (!found) return res.status(404).json({ error: "Comment not found" });

  db.write();
  res.json({ success: true });
});

// DELETE comment (by owner only)
app.delete("/comments/:id", (req, res) => {
  const { ownerId } = req.body;
  const index = db.data.comments.findIndex(c => c.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Comment not found" });
  if (db.data.comments[index].ownerId !== ownerId)
    return res.status(403).json({ error: "Not your comment" });

  db.data.comments.splice(index, 1);
  db.write();
  res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
