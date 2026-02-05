const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const Joi = require('joi');
const multer = require('multer');
const path  = require('path')
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({ origin: 'http://localhost:5000' , credentials: true})); // Restrict to frontend origin

// Rate limiting
app.use('/api/', rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit to 100 requests per IP
}));


app.use(express.static(path.join(__dirname, '../frontend' ,'public')));

// Serve index.html for the root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'public', 'index.html'));
});

const PORT = process.env.PORT || 5000;
if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined');
}
const JWT_SECRET = process.env.JWT_SECRET;

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB connection error:', err));


    const authenticateToken = (req, res, next) => {
        const token = req.headers['authorization']?.split(' ')[1];
        if (!token) {
            console.log('No token provided for request:', req.url);
            return res.status(401).json({ message: 'No token provided' });
        }
        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (err) {
                console.log('Token verification error:', err.message);
                return res.status(403).json({ message: 'Invalid token' });
            }
            req.user = user;
            next();
        });
    };

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../frontend/public/uploads');
        console.log('Saving file to:', uploadPath); // Debug log
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Images only (jpeg, jpg, png formatt allowed)'));
        }
    }
});
    
    
app.get('/home', (req, res) => {
    const filePath = path.join(__dirname, '../frontend', 'public', 'homepage.html');
    console.log('Serving /home, file path:', filePath);
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('Error sending file:', err);
            res.status(404).send('Homepage not found');
        }
    });
});

app.get('/messages', (req, res) => {
    const filePath = path.join(__dirname, '../frontend', 'public', 'messages.html');
    console.log('Serving /messages, file path:', filePath);
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('Error sending file:', err);
            res.status(404).send('Messages page not found');
        }
    });
});

app.get('/profile', (req, res) => {
    const filePath = path.join(__dirname, '../frontend', 'public', 'profile.html');
    console.log('Serving /profile, file path:', filePath);
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('Error sending file:', err);
            res.status(404).send('Messages page not found');
        }
    });
});

app.get('/posts', (req, res) => {
    const filePath = path.join(__dirname, '../frontend', 'public', 'posts.html');
    console.log('Serving /posts, file path:', filePath);
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('Error sending file:', err);
            res.status(404).send('Posts page not found');
        }
    });
});


//Post schema
const postSchema= new mongoose.Schema({
    userId:{type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
    caption: {type: String, required: true},
    media: {type: String, required: true},
    createdAt: {type: Date, default: Date.now},
});

const Post = mongoose.model('Post',postSchema); 

//Friend request Schema
const friendRequestSchema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'accepted'], default: 'pending' },
    createdAt: { type: Date, default: Date.now },
});

const FriendRequest = mongoose.model('FriendRequest', friendRequestSchema);

// User Schema
const userSchema = new mongoose.Schema({
    fName: { type: String, required: true },
    lName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    bio: { type: String, default: ''},
    profilePicture: {type: String, default: './frontend/uploads/default.png'},
    friends:[{type: mongoose.Schema.Types.ObjectId, ref:'User' }],
    posts: [{type: mongoose.Schema.Types.ObjectId, ref:'Post'}]
});

const User = mongoose.model('User', userSchema);
//Message schema

const messageSchema = new mongoose.Schema({
    sender: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
    receiver: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
    content: {type: String, required: true},
    timeStamp: {type: Date, default: Date.now},
});
const Message = mongoose.model('Message', messageSchema);

// Validation schemas
const signupSchema = Joi.object({
    fName: Joi.string().min(1).required(),
    lName: Joi.string().min(1).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
});

const messageValidationSchema = Joi.object({
    receiverId: Joi.string().required(),
    content: Joi.string().min(1).required(),
})

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
});

const friendRequestValidationSchema = Joi.object({
    receiverId: Joi.string().required(),
});

//User route
app.get('/api/user', authenticateToken ,async (req , res) => {
    try{
        const user = await User.findById(req.user.userId).select('fName lName email bio profilePicture friends posts');
        if(!user) {
            return res.status(404).json({message: 'User not found'});
        }
        res.json(user);
    } catch (err) {
        res.status(500).json({message: 'Server error', error: err.message});
    }
});

// Signup Route
app.post('/api/signup', async (req, res) => {
    const { error } = signupSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ message: error.details[0].message });
    }

    const { fName, lName, email, password } = req.body;
    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ fName, lName, email, password: hashedPassword });
        await user.save();

        res.status(201).json({ message: 'User created successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Login Route
app.post('/api/login', async (req, res) => {
    const { error } = loginSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ message: error.details[0].message });
    }

    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ token });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

app.get('/api/users/search', authenticateToken, async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) return res.status(400).json({ message: 'Query required' });
        const users = await User.find({
            $or: [
                { email: { $regex: query, $options: 'i' } },
                { fName: { $regex: query, $options: 'i' } },
                { lName: { $regex: query, $options: 'i' } }
            ],
            _id: { $ne: req.user.userId }
        }).select('fName lName email profilePicture').limit(10);
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

app.put('/api/profile', authenticateToken, upload.single('profilePicture'), async (req, res) => {
    try {
        const updates = {}
        if (req.body.bio) updates.bio =  req.body.bio;
        if (req.file) updates.profilePicture = `/uploads/${req.file.filename}`;
        const user = await User.findByIdAndUpdate(
            req.user.userId,
            { $set: updates},
            { new: true, runValidators: true }
        ).select('fName lName email bio profilePicture');

        if (!user) return res.status(404).json({ message: 'User not found' });

        res.json({ message: 'Profile updated', user });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

app.get('/api/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('fName lName email bio profilePicture friends posts');
        if (!user) return res.status(404).json({ message: 'User not found' });

        res.json(user);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

app.get('/api/users/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId).select('fName lName profilePicture posts');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (err) {
        console.error('Error in /api/users/:id:', err.message);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

app.get('/api/fix-profile-pictures', async (req, res) => {
    try {
        const result = await User.updateMany(
            { profilePicture: /\${req\.file\.filename}/ },
            { $set: { profilePicture: '/uploads/default.png' } }
        );
        res.json({ message: 'Profile pictures updated', modified: result.nModified });
    } catch (err) {
        res.status(500).json({ message: 'Error updating profiles', error: err.message });
    }
});

app.post('/api/friend-request', authenticateToken, async (req, res) => {
    const { error } = friendRequestValidationSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ message: error.details[0].message });
    }

    const { receiverId } = req.body;
    const senderId = req.user.userId;

    try {
        if (senderId === receiverId) {
            return res.status(400).json({ message: 'Cannot send friend request to yourself' });
        }

        const receiver = await User.findById(receiverId);
        if (!receiver) {
            return res.status(404).json({ message: 'Receiver not found' });
        }

        const sender = await User.findById(senderId);
        if (sender.friends.includes(receiverId)) {
            return res.status(400).json({ message: 'Already friends' });
        }

        const existingRequest = await FriendRequest.findOne({
            sender: senderId,
            receiver: receiverId,
            status: 'pending',
        });
        if (existingRequest) {
            return res.status(400).json({ message: 'Friend request already sent' });
        }

        const friendRequest = new FriendRequest({
            sender: senderId,
            receiver: receiverId,
        });
        await friendRequest.save();

        res.status(201).json({ message: 'Friend request sent' });
    } catch (err) {
        console.error('Error in /api/friend-request:', err.message);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

app.get('/api/friend-requests/incoming', authenticateToken, async (req, res) => {
    try {
        const requests = await FriendRequest.find({
            receiver: req.user.userId,
            status: 'pending'
        }).populate('sender', 'fName lName profilePicture');
        res.json(requests);
    } catch (err) {
        console.error('Error in /api/friend-requests/incoming:', err.message);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Accept Friend Request
app.put('/api/friend-request/:id/accept', authenticateToken, async (req, res) => {
    try {
        const requestId = req.params.id;
        const userId = req.user.userId;

        const friendRequest = await FriendRequest.findById(requestId);
        if (!friendRequest) {
            return res.status(404).json({ message: 'Friend request not found' });
        }

        if (friendRequest.receiver.toString() !== userId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        if (friendRequest.status === 'accepted') {
            return res.status(400).json({ message: 'Request already accepted' });
        }

        friendRequest.status = 'accepted';
        await friendRequest.save();

        await User.findByIdAndUpdate(friendRequest.sender, {
            $addToSet: { friends: friendRequest.receiver },
        });
        await User.findByIdAndUpdate(friendRequest.receiver, {
            $addToSet: { friends: friendRequest.sender },
        });

        res.json({ message: 'Friend request accepted' });
    } catch (err) {
        console.error('Error in /api/friend-request/:id/accept:', err.message);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

app.delete('/api/friend-request/:id/decline', authenticateToken, async (req, res) => {
    try {
        const requestId = req.params.id;
        const userId = req.user.userId;
        const friendRequest = await FriendRequest.findById(requestId);
        if (!friendRequest) return res.status(404).json({ message: 'Friend request not found' });
        if (friendRequest.receiver.toString() !== userId) return res.status(403).json({ message: 'Unauthorized' });
        await friendRequest.deleteOne();
        res.json({ message: 'Friend request declined' });
    } catch (err) {
        console.error('Error in /api/friend-request/:id/decline:', err.message);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});



app.get('/api/friends', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).populate('friends', 'fName lName profilePicture');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user.friends);
    } catch (err) {
        console.error('Error in /api/friends:', err.message);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

app.post('/api/message', authenticateToken, async (req,res) => {
    const {error} = messageValidationSchema.validate(req.body);
    if(error){
        return res.status(400).json({message: error.details[0].message });
    }
    const { receiverId, content} = req.body;
    const senderId = req.user.userId;

    try{
        const receiver = await User.findById(receiverId);
        if(!receiver){
            return res.status(404).json({message: 'Receiver not found'});
        }
        if(!receiver.friends.includes(senderId)){
            return res.status(400).json({message: 'Not friends'});
        }
        const message = new Message({
            sender: senderId,
            receiver: receiverId,
            content,                          
        });
        await message.save();
        res.status(201).json({ message: 'Message sent', data: message });
    } catch (err) {
        console.error('Error in /api/message:', err.message);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

app.get('/api/message/:friendId', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const friendId = req.params.friendId;
        const messages = await Message.find({
            $or: [
                { sender: userId, receiver: friendId },
                { sender: friendId, receiver: userId },
            ],
        }).sort({ timeStamp: 1 });
        res.json(messages);
    } catch (err) {
        console.error('Error in /api/message/:friendId:', err.message);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

app.post('/api/friends/remove', authenticateToken, async (req, res) => {
    try {
        const { friendId } = req.body;
        if (!friendId) return res.status(400).json({ message: 'Friend ID required' });
        const user = await User.findById(req.user.userId);
        if (!user.friends.includes(friendId)) return res.status(400).json({ message: 'Not friends' });
        user.friends = user.friends.filter(id => id.toString() !== friendId);
        const friend = await User.findById(friendId);
        if (!friend) return res.status(404).json({ message: 'Friend not found' });
        friend.friends = friend.friends.filter(id => id.toString() !== req.user.userId);
        await user.save();
        await friend.save();
        console.log(`Removed friend ${friendId} for user ${req.user.userId}`);
        res.json({ message: 'Friend removed' });
    } catch (err) {
        console.error('Remove friend error:', err.message);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

const postValidationSchema = Joi.object({
    caption: Joi.string().min(1).required()
});

app.post('/api/posts', authenticateToken, upload.single('media'), async (req, res) => {
    console.log('Received POST /api/posts:', req.body, req.file); // Debug log
    const { error } = postValidationSchema.validate(req.body);
    if (error) {
        console.log('Validation error:', error.details[0].message);
        return res.status(400).json({ message: error.details[0].message });
    }
    if (!req.file) {
        console.log('No file uploaded');
        return res.status(400).json({ message: 'Photo required' });
    }

    try {
        const post = new Post({
            userId: req.user.userId,
            caption: req.body.caption,
            media: `/uploads/${req.file.filename}`
        });
        await post.save();
        await User.findByIdAndUpdate(req.user.userId, { $push: { posts: post._id } });
        // console.log('Post created:', post);
        res.status(201).json({ message: 'Post created', post });
    } catch (err) {
        console.error('Error in /api/posts:', err.message);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

app.get('/api/posts/:id', authenticateToken, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });
        res.json(post);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});


wss.on('connection', (ws) => {
    ws.on('message', async (data) => {
        const { token, receiverId, content } = JSON.parse(data);
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            const senderId = decoded.userId;
            const receiver = await User.findById(receiverId);
            if (!receiver || !receiver.friends.includes(senderId)) {
                ws.send(JSON.stringify({ error: 'Invalid receiver or not friends' }));
                return;
            }

            const message = new Message({
                sender: senderId,
                receiver: receiverId,
                content,
            });
            await message.save();

            const messageData = {
                _id: message._id,
                sender: senderId,
                receiver: receiverId,
                content,
                timeStamp: message.timeStamp,
            };

            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(messageData));
                }
            });
        } catch (err) {
            ws.send(JSON.stringify({ error: 'Server error' }));
        }
    });
});


app.listen(PORT, () => console.log(`Server running on port ${PORT}`));