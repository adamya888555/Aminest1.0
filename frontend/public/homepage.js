document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/index.html';
        return;
    }

    // Navigation buttons
    const messagesBtn = document.getElementById('messages-notifications');
    messagesBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = '/messages';
    });

    const profileBtn = document.getElementById('my-profile');
    profileBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = '/profile';
    });

    const createPostBtn = document.getElementById('CREATEPOSTBUT');
    createPostBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = '/posts';
    });

    // Load logged-in user's profile
    const loadUserProfile = async () => {
        try {
            const profileResponse = await fetch('http://localhost:5000/api/profile', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const user = await profileResponse.json();
            if (!profileResponse.ok) {
                throw new Error(user.message || 'Failed to load user profile');
            }

            // Update the profile section with user's name and picture
            const profileSection = document.querySelector('.left .profile');
            profileSection.innerHTML = `
                <div class="profile-photo">
                    <img src="${user.profilePicture || '/uploads/default.png'}" alt="Profile">
                </div>
                <div class="handle">
                    <h4>${user.fName} ${user.lName}</h4>
                    <p class="text-muted">@${user.fName.toLowerCase()}${user.lName.toLowerCase()}</p>
                </div>
            `;
        } catch (err) {
            console.error('Error loading user profile:', err);
        }
    };

    // Load friends' posts
    const loadFriendsPosts = async () => {
        const feedsSection = document.querySelector('.feeds');
        feedsSection.innerHTML = '<p>Loading posts...</p>'; // Loading indicator

        try {
            // Fetch friends
            console.log('Fetching friends...');
            const friendsResponse = await fetch('http://localhost:5000/api/friends', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const friends = await friendsResponse.json();
            console.log('Friends response:', friends);
            if (!friendsResponse.ok) {
                throw new Error(friends.message || 'Failed to load friends');
            }

            if (friends.length === 0) {
                console.log('No friends found for the user.');
                feedsSection.innerHTML = '<p>No friends yet. Add some friends to see their posts!</p>';
                return;
            }

            // Clear feeds section
            feedsSection.innerHTML = '';
            let postCount = 0;

            // Fetch posts for each friend
            for (const friend of friends) {
                console.log(`Fetching profile for friend: ${friend.fName} ${friend.lName} (${friend._id})`);
                const friendProfileResponse = await fetch(`http://localhost:5000/api/users/${friend._id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const friendProfile = await friendProfileResponse.json();
                console.log(`Friend profile for ${friend.fName} ${friend.lName}:`, friendProfile);
                if (!friendProfileResponse.ok) {
                    console.log(`Failed to fetch profile for ${friend.fName} ${friend.lName}:`, friendProfile.message);
                    continue;
                }

                const postIds = friendProfile.posts || [];
                console.log(`Posts for ${friend.fName} ${friend.lName}:`, postIds);

                if (postIds.length === 0) {
                    console.log(`No posts found for ${friend.fName} ${friend.lName}.`);
                    continue;
                }

                for (const postId of postIds) {
                    console.log(`Fetching post ${postId}...`);
                    const postResponse = await fetch(`http://localhost:5000/api/posts/${postId}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const post = await postResponse.json();
                    console.log(`Post ${postId} response:`, post);
                    if (postResponse.ok) {
                        const postDiv = document.createElement('div');
                        postDiv.className = 'feed';
                        postDiv.innerHTML = `
                            <div class="head">
                                <div class="user">
                                    <div class="profile-photo">
                                        <img src="${friend.profilePicture || '/uploads/default.png'}" alt="Profile">
                                    </div>
                                    <div class="ingo">
                                        <h3>${friend.fName} ${friend.lName}</h3>
                                        <small>${new Date(post.createdAt).toLocaleString()}</small>
                                    </div>
                                </div>
                                <span class="edit">
                                    <i class="uil uil-ellipsis-h"></i>
                                </span>
                            </div>
                            <div class="photo">
                                <img src="${post.media}" alt="Post Media">
                            </div>
                            <div class="action-buttons">
                                <div class="interaction-buttons">
                                    <span><i class="uil uil-heart"></i></span>
                                    <span><i class="uil uil-comment-dots"></i></span>
                                    <span><i class="uil uil-share-alt"></i></span>
                                </div>
                                <div class="bookmark">
                                    <span><i class="uil uil-bookmark"></i></span>
                                </div>
                            </div>
                            <div class="liked-by">
                                <span><img src="/uploads/default.png"></span>
                                <span><img src="/uploads/default.png"></span>
                                <span><img src="/uploads/default.png"></span>
                                <p>Liked by <b>Someone</b> and <b>others</b></p>
                            </div>
                            <div class="caption">
                                <p><b>${friend.fName} ${friend.lName}</b> ${post.caption}</p>
                            </div>
                            <div class="comments text-muted">View all comments</div>
                        `;
                        feedsSection.appendChild(postDiv);
                        postCount++;
                    } else {
                        console.log(`Failed to fetch post ${postId}:`, post.message);
                    }
                }
            }

            if (postCount === 0) {
                console.log('No posts found from friends.');
                feedsSection.innerHTML = '<p>No posts from friends yet.</p>';
            } else {
                console.log(`Loaded ${postCount} posts.`);
            }
        } catch (err) {
            feedsSection.innerHTML = '<p>Error loading posts.</p>';
            console.error('Error loading friends\' posts:', err);
        }
    };

    // Load incoming friend requests
    const loadFriendRequests = async () => {
        const friendRequestsSection = document.querySelector('.friend-requests');
        friendRequestsSection.innerHTML = '<p>Loading friend requests...</p>';

        try {
            const requestsResponse = await fetch('http://localhost:5000/api/friend-requests/incoming', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const requests = await requestsResponse.json();
            if (!requestsResponse.ok) {
                throw new Error(requests.message || 'Failed to load friend requests');
            }

            friendRequestsSection.innerHTML = ''; // Clear loading message

            if (requests.length === 0) {
                friendRequestsSection.innerHTML = '<p>No incoming friend requests.</p>';
                return;
            }

            requests.forEach(request => {
                const requestDiv = document.createElement('div');
                requestDiv.className = 'request';
                requestDiv.innerHTML = `
                    <div class="info">
                        <div class="profile-photo">
                            <img src="${request.sender.profilePicture || '/uploads/default.png'}">
                        </div>
                        <div>
                            <h5>${request.sender.fName} ${request.sender.lName}</h5>
                            <p class="text-muted">Sent a friend request</p>
                        </div>
                    </div>
                    <div class="action">
                        <button class="btn btn-primary accept-request" data-request-id="${request._id}">Accept</button>
                        <button class="btn reject-request" data-request-id="${request._id}">Decline</button>
                    </div>
                `;
                friendRequestsSection.appendChild(requestDiv);
            });

            // Add event listeners for accept and reject buttons
            document.querySelectorAll('.accept-request').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const requestId = e.target.getAttribute('data-request-id');
                    try {
                        const response = await fetch(`http://localhost:5000/api/friend-request/${requestId}/accept`, {
                            method: 'PUT',
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        const result = await response.json();
                        if (response.ok) {
                            alert('Friend request accepted!');
                            loadFriendRequests(); // Refresh the list
                        } else {
                            throw new Error(result.message || 'Failed to accept request');
                        }
                    } catch (err) {
                        console.error('Error accepting friend request:', err);
                        alert('Error accepting friend request.');
                    }
                });
            });

            document.querySelectorAll('.reject-request').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const requestId = e.target.getAttribute('data-request-id');
                    try {
                        const response = await fetch(`http://localhost:5000/api/friend-request/${requestId}/decline`, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        const result = await response.json();
                        if (response.ok) {
                            alert('Friend request declined.');
                            loadFriendRequests(); // Refresh the list
                        } else {
                            throw new Error(result.message || 'Failed to decline request');
                        }
                    } catch (err) {
                        console.error('Error declining friend request:', err);
                        alert('Error declining friend request.');
                    }
                });
            });
        } catch (err) {
            friendRequestsSection.innerHTML = '<p>Error loading friend requests.</p>';
            console.error('Error loading friend requests:', err);
        }
    };

    // Initial load of user profile, friends' posts, and friend requests
    loadUserProfile();
    loadFriendsPosts();
    loadFriendRequests();
});