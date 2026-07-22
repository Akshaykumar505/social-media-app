const express = require('express');
const router = express.Router();
const { getUserProfile, toggleFollow, updateProfile, searchUsers } = require('../controllers/userController');
const { protect } = require('../middleware/auth');

router.get('/search', searchUsers);                  // search sabse pehle (specific route)
router.get('/:username', getUserProfile);              // ye dynamic route baad me
router.put('/profile', protect, updateProfile);
router.put('/follow/:id', protect, toggleFollow);

module.exports = router;