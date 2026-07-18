const express = require('express');
const router = express.Router();
const { getUserProfile, toggleFollow, updateProfile } = require('../controllers/userController');
const { protect } = require('../middleware/auth');

router.get('/:username', getUserProfile);           // kisi ka bhi profile dekhna (public)
router.put('/profile', protect, updateProfile);      // apna profile edit karna (login zaroori)
router.put('/follow/:id', protect, toggleFollow);     // follow/unfollow (login zaroori)

module.exports = router;