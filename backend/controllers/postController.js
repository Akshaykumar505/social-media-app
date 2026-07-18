const Post = require('../models/Post');
const { asyncHandler } = require('../middleware/errorHandler');

// Naya post banana
const createPost = asyncHandler(async (req, res) => {
  const { content } = req.body;

  const post = await Post.create({
    author: req.user._id,
    content,
    image: req.file ? `/uploads/posts/${req.file.filename}` : '',
  });

  // author ka data (username, avatar) bhi saath me bhejna, taaki frontend ko alag query na karni pade
  await post.populate('author', 'username fullName avatar');

  res.status(201).json({ success: true, post });
});

// Saare posts dekhna (feed) - sabse naye pehle
const getFeed = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const posts = await Post.find()
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('author', 'username fullName avatar');

  const total = await Post.countDocuments();

  res.json({
    success: true,
    posts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// Ek single post dekhna (uski ID se)
const getSinglePost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id).populate('author', 'username fullName avatar');

  if (!post) {
    res.status(404);
    throw new Error('Post not found');
  }

  res.json({ success: true, post });
});

// Apna post edit karna (sirf jo post banaya hai wahi edit kar sakta hai)
const updatePost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    res.status(404);
    throw new Error('Post not found');
  }

  // Check: kya ye post isi user ne banaya tha?
  if (post.author.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('You can only edit your own posts');
  }

  post.content = req.body.content ?? post.content;
  await post.save();
  await post.populate('author', 'username fullName avatar');

  res.json({ success: true, post });
});

// Apna post delete karna
const deletePost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    res.status(404);
    throw new Error('Post not found');
  }

  if (post.author.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('You can only delete your own posts');
  }

  await post.deleteOne();

  res.json({ success: true, message: 'Post deleted successfully' });
});

// Post like ya unlike karna (toggle)
const toggleLike = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    res.status(404);
    throw new Error('Post not found');
  }

  const userId = req.user._id.toString();
  const alreadyLiked = post.likes.some((id) => id.toString() === userId);

  if (alreadyLiked) {
    post.likes.pull(req.user._id);
  } else {
    post.likes.push(req.user._id);
  }

  await post.save();

  res.json({
    success: true,
    message: alreadyLiked ? 'Post unliked' : 'Post liked',
    isLiked: !alreadyLiked,
    likesCount: post.likes.length,
  });
});

module.exports = { createPost, getFeed, getSinglePost, updatePost, deletePost, toggleLike };