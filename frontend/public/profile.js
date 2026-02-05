document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) return (window.location.href = '/index.html');
    try {
        const response = await fetch('/api/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const user = await response.json();
        console.log('User data:', user);
        if (response.ok) {
            document.getElementById('fName').textContent = user.fName;
            document.getElementById('lName').textContent = user.lName;
            document.getElementById('email').textContent = user.email;
            document.getElementById('bio').textContent = user.bio || 'No bio';
            const profilePic = document.getElementById('profilePic');
            profilePic.src = user.profilePicture || '/Uploads/default.png';
            profilePic.alt = `${user.fName} ${user.lName}'s Profile Picture`;
            loadFriends(token);
            loadPendingRequests(token);
        } else {
            document.getElementById('error').textContent = user.message;
        }
    } catch (err) {
        document.getElementById('error').textContent = 'Error loading profile';
    }
});

async function updateBio() {
    const bioInput = document.getElementById('bioInput');
    const bio = bioInput.value;
    const token = localStorage.getItem('token');
    try {
        const response = await fetch('/api/profile', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ bio })
        });
        const data = await response.json();
        if (response.ok) {
            document.getElementById('bio').textContent = data.user.bio || 'No bio';
            bioInput.value = '';
            document.getElementById('error').textContent = 'Bio updated successfully!';
        } else {
            document.getElementById('error').textContent = data.message;
        }
    } catch (err) {
        document.getElementById('error').textContent = 'Error updating bio';
    }
}

async function updateProfilePic() {
    const fileInput = document.getElementById('profilePicInput');
    const token = localStorage.getItem('token');
    if (!fileInput.files[0]) {
        document.getElementById('error').textContent = 'Please select an image.';
        return;
    }
    const formData = new FormData();
    formData.append('profilePicture', fileInput.files[0]);
    try {
        const response = await fetch('/api/profile', {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        const data = await response.json();
        console.log('Update response:', data);
        if (response.ok) {
            const profilePic = document.getElementById('profilePic');
            profilePic.src = data.user.profilePicture || '/Uploads/default.png';
             profilePic.alt = `${data.user.fName} ${data.user.lName}'s Profile Picture`;
            fileInput.value = '';
            document.getElementById('error').textContent = 'Profile picture updated successfully!';
        } else {
            document.getElementById('error').textContent = data.message;
        }
    } catch (err) {
        document.getElementById('error').textContent = 'Error uploading picture';
    }
}

async function searchUsers() {
    const searchInput = document.getElementById('searchInput');
    const query = searchInput.value;
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`/api/users/search?query=${encodeURIComponent(query)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const users = await response.json();
        const searchResultsDiv = document.getElementById('searchResults');
        searchResultsDiv.innerHTML = '';
        if (response.ok) {
            if (users.length === 0) {
                searchResultsDiv.innerHTML = '<p class="text-gray-500 dark:text-gray-400">No users found.</p>';
                return;
            }
            users.forEach(user => {
                const userDiv = document.createElement('div');
                userDiv.className = 'search-result flex items-center justify-between p-2 rounded-md bg-gray-100 dark:bg-gray-700 mb-2';
                userDiv.innerHTML = `
                    <div class="flex items-center">
                        <img src="${user.profilePicture || '/Uploads/default.png'}" alt="${user.fName} ${user.lName}'s Profile Picture" class="friend-pic">
                        <span class="text-gray-800 dark:text-gray-200 font-medium">${user.fName} ${user.lName} (${user.email})</span>
                    </div>
                    <button class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 ease-in-out shadow-md text-sm" onclick="sendFriendRequest('${user._id}')">Send Friend Request</button>
                `;
                searchResultsDiv.appendChild(userDiv);
            });
        } else {
            document.getElementById('error').textContent = users.message;
        }
        searchInput.value = '';
    } catch (err) {
        document.getElementById('error').textContent = 'Error searching users';
    }
}

async function sendFriendRequest(receiverId) {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch('/api/friend-request', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ receiverId })
        });
        const data = await response.json();
        if (response.ok) {
            document.getElementById('error').textContent = 'Friend request sent successfully!';
            document.getElementById('searchResults').innerHTML = '';
        } else {
            document.getElementById('error').textContent = data.message;
        }
    } catch (err) {
        document.getElementById('error').textContent = 'Error sending friend request';
    }
}

async function removeFriend(friendId) {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch('/api/friends/remove', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ friendId })
        });
        const data = await response.json();
        console.log('Remove friend response:', data);
        if (response.ok) {
            document.getElementById('error').textContent = 'Friend removed successfully!';
            await loadFriends(token);
        } else {
            document.getElementById('error').textContent = data.message || 'Failed to remove friend';
        }
    } catch (err) {
        console.error('Remove friend error:', err);
        document.getElementById('error').textContent = 'Error removing friend';
    }
}

async function loadFriends(token) {
    try {
        const response = await fetch('/api/friends', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const friends = await response.json();
        const friendsListDiv = document.getElementById('friendsList');
        friendsListDiv.innerHTML = '';
        if (friends.length === 0) {
            friendsListDiv.innerHTML = '<p class="text-gray-500 dark:text-gray-400">No friends yet.</p>';
            return;
        }
        friends.forEach(friend => {
            const friendDiv = document.createElement('div');
            friendDiv.className = 'friend flex items-center justify-between p-2 rounded-md bg-gray-100 dark:bg-gray-700 mb-2';
            friendDiv.innerHTML = `
                <div class="flex items-center">
                    <img src="${friend.profilePicture || '/Uploads/default.png'}" alt="${friend.fName} ${friend.lName}'s Profile Picture" class="friend-pic">
                    <span class="text-gray-800 dark:text-gray-200 font-medium">${friend.fName} ${friend.lName}</span>
                </div>
                <button class="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 ease-in-out shadow-md text-sm" onclick="removeFriend('${friend._id}')">Remove</button>
            `;
            friendsListDiv.appendChild(friendDiv);
        });
    } catch (err) {
        document.getElementById('error').textContent = 'Error loading friends';
    }
}

async function loadPendingRequests(token) {
    try {
        const response = await fetch('/api/friend-requests/incoming', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const requests = await response.json();
        const requestsListDiv = document.getElementById('requestsList');
        requestsListDiv.innerHTML = '';
        if (requests.length === 0) {
            requestsListDiv.innerHTML = '<p class="text-gray-500 dark:text-gray-400">No pending friend requests.</p>';
            return;
        }
        requests.forEach(request => {
            const requestDiv = document.createElement('div');
            requestDiv.className = 'request flex items-center justify-between p-2 rounded-md bg-gray-100 dark:bg-gray-700 mb-2';
            requestDiv.innerHTML = `
                <div class="flex items-center">
                    <img src="${request.sender.profilePicture || '/Uploads/default.png'}" alt="${request.sender.fName} ${request.sender.lName}'s Profile Picture" class="friend-pic">
                    <span class="text-gray-800 dark:text-gray-200 font-medium">${request.sender.fName} ${request.sender.lName}</span>
                </div>
                <div class="flex gap-2">
                    <button class="accept bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 ease-in-out shadow-md text-sm" onclick="acceptFriendRequest('${request._id}')">Accept</button>
                    <button class="decline bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 ease-in-out shadow-md text-sm" onclick="declineFriendRequest('${request._id}')">Decline</button>
                </div>
            `;
            requestsListDiv.appendChild(requestDiv);
        });
    } catch (err) {
        document.getElementById('error').textContent = 'Error loading friend requests';
    }
}

async function acceptFriendRequest(requestId) {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`/api/friend-request/${requestId}/accept`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        console.log('Accept request response:', data);
        if (response.ok) {
            document.getElementById('error').textContent = 'Friend request accepted successfully!';
            await loadFriends(token);
            await loadPendingRequests(token);
        } else {
            document.getElementById('error').textContent = data.message;
        }
    } catch (err) {
        console.error('Accept request error:', err);
        document.getElementById('error').textContent = 'Error accepting request';
    }
}

async function declineFriendRequest(requestId) {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`/api/friend-request/${requestId}/decline`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        console.log('Decline request response:', data);
        if (response.ok) {
            document.getElementById('error').textContent = 'Friend request declined successfully!';
            await loadPendingRequests(token);
        } else {
            document.getElementById('error').textContent = data.message;
        }
    } catch (err) {
        console.error('Decline request error:', err);
        document.getElementById('error').textContent = 'Error declining request';
    }
}
