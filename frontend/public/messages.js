document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/';
        return;
    }

    // Decode JWT token to get userId
    let userId;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        userId = payload.userId;
    } catch (error) {
        console.error('Error decoding token:', error);
        window.location.href = '/';
        return;
    }
    const friendList = document.getElementById('friend-list');
    const logoutBtn = document.getElementById('logout-btn');
    const chatHeader = document.getElementById('chat-header');
    const chatMessages = document.getElementById('chat-messages');
    const messageInput = document.getElementById('message-input');
    const sendMessageBtn = document.getElementById('send-message');

    let selectedFriendId = null;
    const ws = new WebSocket('ws://localhost:8080');

    // Fetch friends
    const fetchFriends = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/friends', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) {
                throw new Error('Failed to fetch friends');
            }
            const friends = await response.json();
            friendList.innerHTML = '';
            friends.forEach(friend => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <img src="${friend.profilePicture || 'default.jpg'}" alt="Profile">
                    ${friend.fName} ${friend.lName}
                `;
                li.dataset.friendId = friend._id;
                // Inside the fetchFriends function, update the click event listener
                li.addEventListener('click', () => {
                    document.querySelectorAll('#friend-list li').forEach(item => item.classList.remove('active'));
  li.classList.add('active');
  selectedFriendId = friend._id;
  // Add a brief loading state
  chatHeader.innerHTML = `<span>Loading chat...</span>`;
  setTimeout(() => {
    chatHeader.innerHTML = `
      <img src="${friend.profilePicture || 'default.jpg'}" alt="Profile">
      ${friend.fName} ${friend.lName}
    `;
    fetchMessages(friend._id);
  }, 100); // Small delay for smoother transition
});
                friendList.appendChild(li);
                console.log('Friends fetched:', friends);
            });
        } catch (error) {
            console.error('Error fetching friends:', error);
        }
    };

ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.error) {
        console.error('WebSocket error:', msg.error);
        return;
    }
    if (msg.sender === selectedFriendId || msg.receiver === selectedFriendId) {
        const div = document.createElement('div');
        div.className = msg.sender === userId ? 'message sent' : 'message received';
        div.innerHTML = `
            <p>${msg.content}</p>
            <span class="timestamp">${new Date(msg.timeStamp).toLocaleTimeString()}</span>
        `;
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
};




const fetchMessages = async (friendId) => {
        try {
            chatMessages.innerHTML = '';
            const response = await fetch(`http://localhost:5000/api/message/${friendId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to fetch messages');
            const messages = await response.json();
            messages.forEach(msg => {
                const div = document.createElement('div');
                div.className = msg.sender === userId ? 'message sent' : 'message received';
                div.innerHTML = `
                    <p>${msg.content}</p>
                    <span class="timestamp">${new Date(msg.timeStamp).toLocaleTimeString()}</span>
                `;
                chatMessages.appendChild(div);
            });
            chatMessages.scrollTop = chatMessages.scrollHeight;
            console.log('Fetching messages for friendId:', friendId);
        } catch (error) {
                console.error('Error fetching messages:', error);
            chatMessages.innerHTML = '<p>Failed to load messages. Please try again.</p>';
            }
};

    const sendMessage = async () => {
    const content = messageInput.value.trim();
    if (!content || !selectedFriendId) return;

    try {
        ws.send(JSON.stringify({ token, receiverId: selectedFriendId, content }));
        messageInput.value = '';
    } catch (error) {
        console.error('Error sending WebSocket message:', error);
        // Fallback to HTTP
        const response = await fetch('http://localhost:5000/api/messages', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ receiverId: selectedFriendId, content })
        });
        if (!response.ok) throw new Error('Failed to send message');
        const result = await response.json();
        const div = document.createElement('div');
        div.className = 'message sent';
        div.innerHTML = `
            <p>${result.data.content}</p>
            <span class="timestamp">${new Date(result.data.timestamp).toLocaleTimeString()}</span>
        `;
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        messageInput.value = '';
    }
    };

    sendMessageBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

        
    

    // Logout
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = '/';
    });

    // Initial fetch
    fetchFriends();
});