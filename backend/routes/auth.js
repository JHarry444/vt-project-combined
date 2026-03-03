const express = require('express');
const router = express.Router();
const db = require('../database');
const { generateToken, verifyToken } = require('../middleware/auth');

// Register route
router.post('/register', (req, res) => {
  const { username, password, confirmPassword, email, fullName, phone } = req.body;
  
  if (!username || !password || !confirmPassword || !email || !fullName || !phone) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  
  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }
  
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  
  const user = db.createUser(username, password, email, fullName, phone);
  
  if (!user) {
    return res.status(400).json({ error: 'Username already exists' });
  }
  
  res.json({ message: 'Account created successfully', userId: user.id });
});

// Login route
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  const user = db.findUserByUsername(username);
  
  if (!user || !db.validatePassword(password, user.password)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  
  // Generate JWT token
  const token = generateToken(user.id, user.username);
  
  res.json({
    message: 'Login successful',
    token: token,
    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      email: user.email
    }
  });
});

// Logout route (with JWT, logout is handled on client side)
router.post('/logout', (req, res) => {
  // With JWT, we don't need to do anything on the server
  // The client will remove the token from storage
  res.json({ message: 'Logged out successfully' });
});

// Get current user
router.get('/user', verifyToken, (req, res) => {
  const user = db.findUserById(req.userId);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.json({
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone
  });
});

// Check if authenticated
router.get('/authenticated', verifyToken, (req, res) => {
  res.json({ authenticated: true, userId: req.userId });
});

module.exports = router;
