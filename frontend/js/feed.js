// Login check - agar nahi hai toh login page pe bhej dega
const currentUser = requireAuth();

// Navbar me user ka naam/avatar dikhana
document.getElementById('navUsername').textContent = currentUser.username;
document.getElementById('navAvatar').innerHTML = renderAvatarInner(currentUser);
document.getElementById('createPostAvatar').innerHTML = renderAvatarInner(currentUser);

document.getElementById('logoutBtn').addEventListener('click', logout);

const feedContainer = document.getElementById('feedContainer');

// Ek post ka HTML banata hai
function renderPostCard(post) {
  const isLiked = post.likes.includes(currentUser.id);
  const isOwner = post.author.id === currentUser.id;

  return `
    <div class="card post-card" data-post-id="${post.id}">
      <div class="post-header">
        ${renderAvatar(post.author, 'avatar-md')}
        <div class="post-header-info">
          <div class="post-author-name">${escapeHtml(post.author.fullName || post.author.username)}</div>
          <div class="post-time">${timeAgo(post.createdAt)}</div>
        </div>
        ${isOwner ? `<button class="post-menu-btn delete-post-btn" data-id="${post.id}">🗑️</button>` : ''}
      </div>

      <div class="post-content">${escapeHtml(post.content)}</div>

      ${post.image ? `<img src="http://localhost:5000${post.image}" class="post-image" alt="post image" />` : ''}

      <div class="post-stats">
        <span>${post.likesCount || 0} likes</span>
        <span class="comment-count-text">0 comments</span>
      </div>

      <div class="post-actions">
        <button class="post-action-btn like-btn ${isLiked ? 'liked' : ''}" data-id="${post.id}">
          ${isLiked ? '❤️' : '🤍'} Like
        </button>
        <button class="post-action-btn toggle-comments-btn" data-id="${post.id}">
          💬 Comment
        </button>
      </div>

      <div class="comments-section hidden" id="comments-${post.id}">
        <div class="comments-list"></div>
        <form class="comment-form" data-post-id="${post.id}">
          ${renderAvatar(currentUser, 'avatar-sm')}
          <input type="text" class="input comment-input" placeholder="Write a comment..." required />
        </form>
      </div>
    </div>
  `;
}

// Feed load karna backend se
async function loadFeed() {
  try {
    const data = await api.get('/posts');
    if (data.posts.length === 0) {
      feedContainer.innerHTML = '<p class="text-muted">No posts yet. Be the first to post!</p>';
      return;
    }
    feedContainer.innerHTML = data.posts.map(renderPostCard).join('');
  } catch (error) {
    feedContainer.innerHTML = `<p class="error-text">Failed to load feed: ${error.message}</p>`;
  }
}

loadFeed();

// ===== IMAGE PREVIEW =====
const postImageInput = document.getElementById('postImageInput');
const imagePreviewWrap = document.getElementById('imagePreviewWrap');
const imagePreview = document.getElementById('imagePreview');
const removeImageBtn = document.getElementById('removeImageBtn');

postImageInput.addEventListener('change', () => {
  const file = postImageInput.files[0];
  if (file) {
    imagePreview.src = URL.createObjectURL(file);
    imagePreviewWrap.classList.remove('hidden');
  }
});

removeImageBtn.addEventListener('click', () => {
  postImageInput.value = '';
  imagePreviewWrap.classList.add('hidden');
});

// ===== CREATE POST =====
const submitPostBtn = document.getElementById('submitPostBtn');
const postContent = document.getElementById('postContent');

submitPostBtn.addEventListener('click', async () => {
  const content = postContent.value.trim();
const hasImage = postImageInput.files.length > 0;

if (!content && !hasImage) {
  alert('Please write something or add an image');
  return;
}
  submitPostBtn.disabled = true;
  submitPostBtn.textContent = 'Posting...';

  try {
    const formData = new FormData();
    formData.append('content', content);
    if (postImageInput.files[0]) {
      formData.append('image', postImageInput.files[0]);
    }

    await api.post('/posts', formData);

    // Form reset karna
    postContent.value = '';
    postImageInput.value = '';
    imagePreviewWrap.classList.add('hidden');

    await loadFeed(); // feed refresh karo taaki naya post dikhe
  } catch (error) {
    alert('Failed to create post: ' + error.message);
  } finally {
    submitPostBtn.disabled = false;
    submitPostBtn.textContent = 'Post';
  }
});

// ===== EVENT DELEGATION =====
// Feed container pe ek hi listener - kyunki posts dynamically add hote hain,
// har post pe alag se listener lagana inefficient hoga
feedContainer.addEventListener('click', async (e) => {
  // LIKE button
  if (e.target.closest('.like-btn')) {
    const btn = e.target.closest('.like-btn');
    const postId = btn.dataset.id;

    try {
      const data = await api.put(`/posts/${postId}/like`, {});
      btn.classList.toggle('liked', data.isLiked);
      btn.innerHTML = `${data.isLiked ? '❤️' : '🤍'} Like`;

      const statsSpan = btn.closest('.post-card').querySelector('.post-stats span');
      statsSpan.textContent = `${data.likesCount} likes`;
    } catch (error) {
      alert('Failed to like post: ' + error.message);
    }
  }

  // COMMENT toggle button
  if (e.target.closest('.toggle-comments-btn')) {
    const postId = e.target.closest('.toggle-comments-btn').dataset.id;
    const section = document.getElementById(`comments-${postId}`);
    section.classList.toggle('hidden');

    if (!section.classList.contains('hidden')) {
      await loadComments(postId);
    }
  }

  // DELETE post button
  if (e.target.closest('.delete-post-btn')) {
    const postId = e.target.closest('.delete-post-btn').dataset.id;
    if (!confirm('Delete this post?')) return;

    try {
      await api.delete(`/posts/${postId}`);
      await loadFeed();
    } catch (error) {
      alert('Failed to delete post: ' + error.message);
    }
  }
});

// COMMENT form submit (event delegation for dynamically added forms)
feedContainer.addEventListener('submit', async (e) => {
  if (e.target.classList.contains('comment-form')) {
    e.preventDefault();
    const postId = e.target.dataset.postId;
    const input = e.target.querySelector('.comment-input');
    const text = input.value.trim();
    if (!text) return;

    try {
      await api.post(`/posts/${postId}/comments`, { text });
      input.value = '';
      await loadComments(postId);
    } catch (error) {
      alert('Failed to add comment: ' + error.message);
    }
  }
});

// Comments load karke dikhana
async function loadComments(postId) {
  const section = document.getElementById(`comments-${postId}`);
  const list = section.querySelector('.comments-list');

  try {
    const data = await api.get(`/posts/${postId}/comments`);
    list.innerHTML = data.comments
      .map(
        (c) => `
        <div class="comment-item">
          ${renderAvatar(c.author, 'avatar-sm')}
          <div class="comment-bubble">
            <span class="comment-author">${escapeHtml(c.author.username)}</span>
            <span class="comment-text">${escapeHtml(c.text)}</span>
          </div>
        </div>
      `
      )
      .join('');

    // Comment count update karna post card ke stats me
    const card = document.querySelector(`.post-card[data-post-id="${postId}"]`);
    card.querySelector('.comment-count-text').textContent = `${data.comments.length} comments`;
  } catch (error) {
    list.innerHTML = `<p class="error-text">Failed to load comments</p>`;
  }
}