// server.js

const express = require('express');
const app = express();

const bcrypt = require('bcryptjs'); // bcrypt की जगह bcryptjs
const jwt = require('jsonwebtoken');

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Insta API running 🚀");
});

const SECRET_KEY = "mysecret123";

// Simple in-memory storage
let users = {}; // { username: { passwordHash } }
let posts = []; // { id, userId, content, likes: [], comments: [] }
let followers = {}; // { userId: [followerIds] }

// ----------------- SIGNUP -----------------
app.post('/signup', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password required" });

    if (users[username]) return res.status(400).json({ error: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    users[username] = { passwordHash: hashedPassword };
    followers[username] = [];

    res.json({ message: "Signup successful ✅" });
});

// ----------------- LOGIN -----------------
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = users[username];
    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ message: "Login successful ✅", token });
});

// ----------------- AUTH MIDDLEWARE -----------------
function authenticate(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ error: "No token provided" });

    const token = authHeader.split(' ')[1];
    try {
        const payload = jwt.verify(token, SECRET_KEY);
        req.user = payload.username;
        next();
    } catch (err) {
        return res.status(401).json({ error: "Invalid token" });
    }
}

// ----------------- FEED (POSTS) -----------------
app.post('/post', authenticate, (req, res) => {
    const { content } = req.body;
    const id = posts.length + 1;
    posts.push({ id, userId: req.user, content, likes: [], comments: [] });
    res.json({ message: "Post created ✅", postId: id });
});

app.get('/feed', authenticate, (req, res) => {
    res.json(posts);
});

// ----------------- LIKE -----------------
app.post('/like/:postId', authenticate, (req, res) => {
    const post = posts.find(p => p.id == req.params.postId);
    if (!post) return res.status(404).json({ error: "Post not found" });

    if (!post.likes.includes(req.user)) post.likes.push(req.user);
    res.json({ message: "Post liked ✅", likes: post.likes.length });
});

// ----------------- COMMENT -----------------
app.post('/comment/:postId', authenticate, (req, res) => {
    const { comment } = req.body;
    const post = posts.find(p => p.id == req.params.postId);
    if (!post) return res.status(404).json({ error: "Post not found" });

    post.comments.push({ user: req.user, comment });
    res.json({ message: "Comment added ✅", comments: post.comments });
});

// ----------------- FOLLOW -----------------
app.post('/follow/:username', authenticate, (req, res) => {
    const toFollow = req.params.username;
    if (!users[toFollow]) return res.status(404).json({ error: "User not found" });

    if (!followers[toFollow].includes(req.user)) followers[toFollow].push(req.user);
    res.json({ message: `You followed ${toFollow} ✅` });
});

// ----------------- UNFOLLOW -----------------
app.post('/unfollow/:username', authenticate, (req, res) => {
    const toUnfollow = req.params.username;
    if (!users[toUnfollow]) return res.status(404).json({ error: "User not found" });

    followers[toUnfollow] = followers[toUnfollow].filter(u => u !== req.user);
    res.json({ message: `You unfollowed ${toUnfollow} ✅` });
});

// ----------------- PROFILE -----------------
app.get('/profile', authenticate, (req, res) => {
    const userPosts = posts.filter(p => p.userId === req.user);
    res.json({ username: req.user, followers: followers[req.user].length, posts: userPosts });
});

// ----------------- SERVER -----------------
app.listen(3000, () => console.log("Server running 🚀 on http://localhost:3000"));
