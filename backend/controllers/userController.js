const User = require('../models/User');
const Notification = require('../models/Notification');
const { asyncHandler } = require('../middleware/errorHandler');

// Kisi bhi user ka public profile dekhna (username se)
const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findOne({ username: req.params.username });

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  res.json({ success: true, user });
});

// Kisi user ko follow ya unfollow karna (toggle)
const toggleFollow = asyncHandler(async (req, res) => {
  const targetUserId = req.params.id;
  const currentUserId = req.user._id.toString();

  if (targetUserId === currentUserId) {
    res.status(400);
    throw new Error("You can't follow yourself");
  }

  const targetUser = await User.findById(targetUserId);
  if (!targetUser) {
    res.status(404);
    throw new Error('User not found');
  }

  const currentUser = await User.findById(currentUserId);
  const isFollowing = currentUser.following.includes(targetUserId);

  if (isFollowing) {
    // Already follow karta tha -> unfollow
    currentUser.following.pull(targetUserId);
    targetUser.followers.pull(currentUserId);
  } else {
    // Follow karna
    currentUser.following.push(targetUserId);
    targetUser.followers.push(currentUserId);

    // Notification banao (sirf follow karte waqt, unfollow pe nahi)
    await Notification.create({
      recipient: targetUserId,
      sender: currentUserId,
      type: 'follow',
    });
  }

  await currentUser.save();
  await targetUser.save();

  res.json({
    success: true,
    message: isFollowing ? 'Unfollowed successfully' : 'Followed successfully',
    isFollowing: !isFollowing,
  });
});

// Apna profile edit karna (sirf apna, kisi aur ka nahi)
const updateProfile = asyncHandler(async (req, res) => {
  const { fullName, bio } = req.body;

  const user = await User.findById(req.user._id);

  if (fullName !== undefined) user.fullName = fullName;
  if (bio !== undefined) user.bio = bio;

  await user.save();

  res.json({ success: true, user });
});

// Username se users search karna (partial match, case-insensitive)
const searchUsers = asyncHandler(async (req, res) => {
  const query = req.query.q;

  if (!query || query.trim() === '') {
    return res.json({ success: true, users: [] });
  }

  const users = await User.find({
    username: { $regex: query, $options: 'i' }, // 'i' = case-insensitive
  })
    .select('username fullName avatar bio')
    .limit(10);

  res.json({ success: true, users });
});

module.exports = { getUserProfile, toggleFollow, updateProfile, searchUsers };