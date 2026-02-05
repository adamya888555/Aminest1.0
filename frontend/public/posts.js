document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/index.html';
        return;
    }

    const postForm = document.getElementById('post-form');
    const errorDiv = document.getElementById('error');
    const postsList = document.getElementById('posts-list');

    // Debugging: Log the DOM elements to verify they exist
    console.log('postForm:', postForm);
    console.log('errorDiv:', errorDiv);
    console.log('postsList:', postsList);

    // Ensure all required elements are found
    if (!postForm || !errorDiv || !postsList) {
        console.error('One or more DOM elements not found. Check HTML IDs.');
        return;
    }

    // Handle post creation
    postForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorDiv.textContent = ''; // Clear previous errors

        const caption = document.getElementById('caption').value;
        const media = document.getElementById('media').files[0];

        if (!caption || !media) {
            errorDiv.textContent = 'Caption and media are required';
            return;
        }

        const formData = new FormData();
        formData.append('caption', caption);
        formData.append('media', media);

        try {
            console.log('Sending POST request to /api/posts...'); // Debug
            const response = await fetch('http://localhost:5000/api/posts', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const result = await response.json();
            console.log('Response from /api/posts:', result); // Debug
            if (!response.ok) {
                throw new Error(result.message || 'Failed to create post');
            }

            // Clear the form
            postForm.reset();
            // Reload posts
            loadPosts();
        } catch (err) {
            errorDiv.textContent = err.message;
            console.error('Error creating post:', err);
        }
    });

    // Load and display posts
    const loadPosts = async () => {
        try {
            console.log('Fetching user profile...'); // Debug
            const response = await fetch('http://localhost:5000/api/profile', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const user = await response.json();
            console.log('User profile response:', user); // Debug
            if (!response.ok) {
                throw new Error(user.message || 'Failed to load profile');
            }

            const postIds = user.posts || [];
            postsList.innerHTML = ''; // Clear previous posts

            for (const postId of postIds) {
                console.log(`Fetching post ${postId}...`); // Debug
                const postResponse = await fetch(`http://localhost:5000/api/posts/${postId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const post = await postResponse.json();
                console.log(`Post ${postId} response:`, post); // Debug
                if (postResponse.ok) {
                    const postDiv = document.createElement('div');
                    postDiv.className = 'post';
                    postDiv.innerHTML = `
                        <div class="caption">${post.caption}</div>
                        <img src="${post.media}" alt="Post Media">
                        <div class="created">${new Date(post.createdAt).toLocaleString()}</div>
                    `;
                    postsList.appendChild(postDiv);
                }
            }
        } catch (err) {
            errorDiv.textContent = 'Error loading posts';
            console.error('Error loading posts:', err);
        }
    };

    // Initial load of posts
    loadPosts();
});