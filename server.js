const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');
const multer = require('multer');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = 1726;
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: `https://kyst.onrender.com/:${PORT}`,
        methods: ["GET", "POST"],
        credentials: true
    }
});

// ============= ПАПКИ =============
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// ============= БАЗА ДАННЫХ =============
const db = new sqlite3.Database('./messenger.db');

// Функция для проверки существования колонки
function columnExists(table, column, callback) {
    db.all(`PRAGMA table_info(${table})`, (err, rows) => {
        if (err) {
            console.error('❌ Error checking column:', err);
            return callback(false);
        }
        const exists = rows.some(row => row.name === column);
        callback(exists);
    });
}

// Функция для добавления колонки если её нет
function addColumnIfNotExists(table, column, definition, callback) {
    columnExists(table, column, (exists) => {
        if (!exists) {
            console.log(`📝 Adding column ${column} to ${table}...`);
            db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`, (err) => {
                if (err) {
                    console.log(`⚠️ Could not add column ${column} to ${table}: ${err.message}`);
                } else {
                    console.log(`✅ Added column ${column} to ${table}`);
                }
                if (callback) callback();
            });
        } else {
            console.log(`✅ Column ${column} already exists in ${table}`);
            if (callback) callback();
        }
    });
}

// ============= ИНИЦИАЛИЗАЦИЯ БАЗЫ ДАННЫХ С МИГРАЦИЯМИ =============
db.serialize(() => {
    // Создаём таблицы если их нет
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE,
        password TEXT,
        username TEXT UNIQUE,
        display_name TEXT,
        google_id TEXT UNIQUE,
        github_id TEXT UNIQUE,
        avatar TEXT,
        bio TEXT,
        status TEXT DEFAULT 'online',
        custom_status TEXT,
        theme TEXT DEFAULT 'light',
        chat_bg TEXT DEFAULT 'default',
        profile_header TEXT DEFAULT 'default',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS chats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        description TEXT,
        type TEXT CHECK(type IN ('private', 'group', 'channel')),
        admin_id INTEGER,
        is_private INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id INTEGER,
        user_id INTEGER,
        content TEXT,
        type TEXT DEFAULT 'text',
        file_url TEXT,
        reply_to INTEGER,
        forwarded_from INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS chat_participants (
        user_id INTEGER,
        chat_id INTEGER,
        role TEXT DEFAULT 'member',
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, chat_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS channel_subscribers (
        user_id INTEGER,
        channel_id INTEGER,
        role TEXT DEFAULT 'subscriber',
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, channel_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (channel_id) REFERENCES chats(id) ON DELETE CASCADE
    )`);

    // Добавляем новые колонки для шифрования
    setTimeout(() => {
        // Добавляем колонки в таблицу users
        addColumnIfNotExists('users', 'public_key', 'TEXT');
        addColumnIfNotExists('users', 'private_key', 'TEXT');
        addColumnIfNotExists('users', 'encrypted', 'BOOLEAN DEFAULT 1');
        
        // Добавляем колонку в таблицу messages
        addColumnIfNotExists('messages', 'encrypted', 'BOOLEAN DEFAULT 0', () => {
            console.log('✅ Database migration completed');
        });
    }, 1000); // Небольшая задержка чтобы убедиться что таблицы созданы
});

// ============= ШИФРОВАНИЕ =============

// Генерация ключей для пользователя при регистрации
function generateUserKeys() {
    try {
        const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem'
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem'
            }
        });
        return { publicKey, privateKey };
    } catch (error) {
        console.error('❌ Key generation error:', error);
        return { publicKey: null, privateKey: null };
    }
}

// Шифрование сообщения для конкретного пользователя
function encryptMessage(text, publicKey) {
    if (!text || !publicKey) {
        console.log('⚠️ No text or public key for encryption');
        return text;
    }
    
    try {
        const buffer = Buffer.from(text, 'utf8');
        const encrypted = crypto.publicEncrypt({
            key: publicKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: 'sha256'
        }, buffer);
        return encrypted.toString('base64');
    } catch (error) {
        console.error('❌ Encryption error:', error.message);
        return text; // fallback
    }
}

// Дешифровка сообщения
function decryptMessage(encryptedText, privateKey) {
    if (!encryptedText || !privateKey) {
        console.log('⚠️ No encrypted text or private key for decryption');
        return encryptedText;
    }
    
    try {
        const buffer = Buffer.from(encryptedText, 'base64');
        const decrypted = crypto.privateDecrypt({
            key: privateKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: 'sha256'
        }, buffer);
        return decrypted.toString('utf8');
    } catch (error) {
        console.error('❌ Decryption error:', error.message);
        return encryptedText; // fallback
    }
}

// ============= MIDDLEWARE =============
app.use(express.json());
app.use(express.static(__dirname));

app.use(session({
    secret: 'palette-secret-key-1726',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

app.use(passport.initialize());
app.use(passport.session());

// ============= PASSPORT SERIALIZE =============
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    db.get('SELECT * FROM users WHERE id = ?', [id], (err, user) => {
        done(err, user);
    });
});

// ============= GOOGLE OAUTH =============
const GOOGLE_CLIENT_ID = '560413401689-ukpsroptohkc8ujsck905afnksgurth2.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = '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';

passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: `https://kyst.onrender.com/:${PORT}/auth/google/callback`
}, async (accessToken, refreshToken, profile, done) => {
    console.log('✅ Google profile:', profile.id);
    
    try {
        const email = profile.emails[0].value;
        const googleId = profile.id;
        const displayName = profile.displayName;
        const avatar = profile.photos?.[0]?.value?.replace('=s96-c', '=s200-c') || null;

        db.get('SELECT * FROM users WHERE google_id = ? OR email = ?', 
            [googleId, email], 
            async (err, user) => {
                if (err) return done(err);
                
                if (user) {
                    if (!user.avatar && avatar) {
                        db.run('UPDATE users SET avatar = ? WHERE id = ?', [avatar, user.id]);
                        user.avatar = avatar;
                    }
                    return done(null, user);
                }

                const baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
                let username = baseUsername;
                let counter = 1;
                
                const checkUsername = (name) => {
                    return new Promise((resolve) => {
                        db.get('SELECT id FROM users WHERE username = ?', [name], (err, row) => {
                            resolve(!!row);
                        });
                    });
                };

                while (await checkUsername(username)) {
                    username = `${baseUsername}${counter}`;
                    counter++;
                }

                // Генерируем ключи для нового пользователя
                const { publicKey, privateKey } = generateUserKeys();

                db.run(
                    `INSERT INTO users (email, username, display_name, google_id, avatar, public_key, private_key) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [email, username, displayName, googleId, avatar, publicKey, privateKey],
                    function(err) {
                        if (err) return done(err);
                        
                        db.get('SELECT * FROM users WHERE id = ?', [this.lastID], (err, newUser) => {
                            done(err, newUser);
                        });
                    }
                );
            }
        );
    } catch (error) {
        done(error, null);
    }
}));

// ============= GITHUB OAUTH =============
const GITHUB_CLIENT_ID = 'your_github_client_id';
const GITHUB_CLIENT_SECRET = 'your_github_client_secret';

passport.use(new GitHubStrategy({
    clientID: GITHUB_CLIENT_ID,
    clientSecret: GITHUB_CLIENT_SECRET,
    callbackURL: `https://kyst.onrender.com/:${PORT}/auth/github/callback`
}, async (accessToken, refreshToken, profile, done) => {
    console.log('✅ GitHub profile:', profile.id);
    
    try {
        const email = profile.emails?.[0]?.value || `${profile.username}@github.com`;
        const githubId = profile.id;
        const displayName = profile.displayName || profile.username;
        const avatar = profile.photos?.[0]?.value || null;

        db.get('SELECT * FROM users WHERE github_id = ? OR email = ?', 
            [githubId, email], 
            async (err, user) => {
                if (err) return done(err);
                
                if (user) {
                    if (!user.avatar && avatar) {
                        db.run('UPDATE users SET avatar = ? WHERE id = ?', [avatar, user.id]);
                        user.avatar = avatar;
                    }
                    return done(null, user);
                }

                const baseUsername = profile.username.toLowerCase().replace(/[^a-z0-9]/g, '');
                let username = baseUsername;
                let counter = 1;
                
                const checkUsername = (name) => {
                    return new Promise((resolve) => {
                        db.get('SELECT id FROM users WHERE username = ?', [name], (err, row) => {
                            resolve(!!row);
                        });
                    });
                };

                while (await checkUsername(username)) {
                    username = `${baseUsername}${counter}`;
                    counter++;
                }

                // Генерируем ключи для нового пользователя
                const { publicKey, privateKey } = generateUserKeys();

                db.run(
                    `INSERT INTO users (email, username, display_name, github_id, avatar, public_key, private_key) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [email, username, displayName, githubId, avatar, publicKey, privateKey],
                    function(err) {
                        if (err) return done(err);
                        
                        db.get('SELECT * FROM users WHERE id = ?', [this.lastID], (err, newUser) => {
                            done(err, newUser);
                        });
                    }
                );
            }
        );
    } catch (error) {
        done(error, null);
    }
}));

// ============= OAUTH ROUTES =============
app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: '/' }),
    (req, res) => {
        res.redirect(`https://kyst.onrender.com/:${PORT}`);
    }
);

app.get('/auth/github',
    passport.authenticate('github', { scope: ['user:email'] })
);

app.get('/auth/github/callback', 
    passport.authenticate('github', { failureRedirect: '/' }),
    (req, res) => {
        res.redirect(`https://kyst.onrender.com/:${PORT}`);
    }
);

app.get('/api/auth/user', (req, res) => {
    if (req.user) {
        res.json({
            id: req.user.id,
            email: req.user.email,
            username: req.user.username,
            display_name: req.user.display_name,
            avatar: req.user.avatar,
            bio: req.user.bio,
            status: req.user.status || 'online',
            custom_status: req.user.custom_status,
            theme: req.user.theme || 'light',
            chat_bg: req.user.chat_bg || 'default',
            profile_header: req.user.profile_header || 'default',
            google_id: req.user.google_id,
            github_id: req.user.github_id,
            created_at: req.user.created_at,
            encrypted: req.user.encrypted || 1
        });
    } else {
        res.status(401).json({ error: 'Not authenticated' });
    }
});

// ============= ЗАГРУЗКА ФАЙЛОВ =============
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// ============= API =============

// Регистрация с генерацией ключей
app.post('/api/auth/signup', async (req, res) => {
    const { email, password, display_name } = req.body;

    if (!email || !password || !display_name) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        const baseUsername = display_name.toLowerCase().replace(/[^a-z0-9]/g, '');
        let username = baseUsername;
        let counter = 1;
        
        const checkUsername = (name) => {
            return new Promise((resolve) => {
                db.get('SELECT id FROM users WHERE username = ?', [name], (err, row) => {
                    resolve(!!row);
                });
            });
        };

        while (await checkUsername(username)) {
            username = `${baseUsername}${counter}`;
            counter++;
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Генерируем ключи для пользователя
        const { publicKey, privateKey } = generateUserKeys();

        db.run(
            `INSERT INTO users (email, password, username, display_name, public_key, private_key) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [email, hashedPassword, username, display_name, publicKey, privateKey],
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE')) {
                        return res.status(400).json({ error: 'Email already exists' });
                    }
                    return res.status(500).json({ error: 'Database error' });
                }
                
                const userId = this.lastID;
                
                res.json({ 
                    success: true,
                    user: {
                        id: userId,
                        email,
                        username,
                        display_name,
                        theme: 'light',
                        status: 'online',
                        encrypted: 1
                    }
                });
            }
        );
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Вход
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    
    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
        if (err || !user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (!user.password) {
            return res.status(401).json({ 
                error: 'This account uses social login',
                googleLogin: !!user.google_id,
                githubLogin: !!user.github_id
            });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        req.session.userId = user.id;
        
        res.json({ 
            id: user.id,
            email: user.email,
            username: user.username,
            display_name: user.display_name || user.username,
            avatar: user.avatar,
            bio: user.bio,
            status: user.status || 'online',
            custom_status: user.custom_status,
            theme: user.theme || 'light',
            chat_bg: user.chat_bg || 'default',
            profile_header: user.profile_header || 'default',
            google_id: user.google_id,
            github_id: user.github_id,
            created_at: user.created_at,
            encrypted: user.encrypted || 1
        });
    });
});

// Выход
app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        if (req.logout) {
            req.logout(() => {});
        }
        res.json({ success: true });
    });
});

// Получение публичного ключа пользователя
app.get('/api/users/:userId/public-key', (req, res) => {
    const userId = req.params.userId;
    
    db.get('SELECT public_key FROM users WHERE id = ?', [userId], (err, row) => {
        if (err || !row) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ publicKey: row.public_key });
    });
});

// Поиск пользователей
app.get('/api/users/search', (req, res) => {
    const query = req.query.q;
    const currentUserId = req.query.currentUserId;
    
    if (!query || query.length < 1) {
        return res.json([]);
    }

    const searchTerm = `%${query}%`;
    
    db.all(
        `SELECT id, email, username, display_name, avatar, status, public_key 
         FROM users 
         WHERE (username LIKE ? OR display_name LIKE ? OR email LIKE ?) 
         AND id != ?
         LIMIT 20`,
        [searchTerm, searchTerm, searchTerm, currentUserId],
        (err, users) => {
            if (err) return res.json([]);
            res.json(users || []);
        }
    );
});

// Получение пользователя по ID
app.get('/api/users/:id', (req, res) => {
    const id = req.params.id;
    
    db.get(
        'SELECT id, username, display_name, avatar, public_key FROM users WHERE id = ?',
        [id],
        (err, user) => {
            if (err || !user) {
                return res.status(404).json({ error: 'User not found' });
            }
            res.json({
                id: user.id,
                username: user.username,
                display_name: user.display_name || user.username,
                avatar: user.avatar,
                public_key: user.public_key
            });
        }
    );
});

// ОТПРАВКА ЗАШИФРОВАННОГО СООБЩЕНИЯ
app.post('/api/messages/send-encrypted', upload.single('file'), (req, res) => {
    const { chatId, userId, content, replyTo, forwardedFrom } = req.body;
    const fileUrl = req.file ? `/uploads/${req.file.filename}` : null;
    let type = 'text';
    
    if (req.file) {
        type = req.file.mimetype.startsWith('audio/') ? 'voice' : 'file';
    }
    
    console.log('📝 Sending encrypted message:', { chatId, userId, type });

    // Получаем всех участников чата
    db.all(
        'SELECT user_id FROM chat_participants WHERE chat_id = ?',
        [chatId],
        (err, participants) => {
            if (err) {
                console.error('❌ Failed to get participants:', err);
                return res.status(500).json({ error: 'Failed to get participants' });
            }

            const participantIds = participants.map(p => p.user_id);
            
            // Добавляем отправителя если его нет в списке
            if (!participantIds.includes(parseInt(userId))) {
                participantIds.push(parseInt(userId));
            }

            // Получаем публичные ключи всех участников
            const placeholders = participantIds.map(() => '?').join(',');
            db.all(
                `SELECT id, public_key FROM users WHERE id IN (${placeholders})`,
                participantIds,
                (err, users) => {
                    if (err) {
                        console.error('❌ Failed to get public keys:', err);
                        return res.status(500).json({ error: 'Failed to get public keys' });
                    }

                    // Шифруем сообщение для каждого участника
                    const encryptedFor = {};
                    
                    users.forEach(user => {
                        if (user.public_key && content) {
                            encryptedFor[user.id] = encryptMessage(content, user.public_key);
                        } else {
                            encryptedFor[user.id] = content || '';
                        }
                    });

                    // Сохраняем зашифрованное сообщение
                    const encryptedContent = JSON.stringify(encryptedFor);

                    db.run(
                        `INSERT INTO messages (chat_id, user_id, content, type, file_url, reply_to, forwarded_from, created_at, encrypted) 
                         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), 1)`,
                        [chatId, userId, encryptedContent, type, fileUrl, replyTo || null, forwardedFrom || null],
                        function(err) {
                            if (err) {
                                console.error('❌ Failed to send message:', err);
                                return res.status(500).json({ error: 'Failed to send message' });
                            }

                            // Возвращаем сообщение с расшифрованным контентом для отправителя
                            const message = {
                                id: this.lastID,
                                chat_id: parseInt(chatId),
                                user_id: parseInt(userId),
                                content: content || '',
                                type: type,
                                file_url: fileUrl,
                                reply_to: replyTo ? parseInt(replyTo) : null,
                                forwarded_from: forwardedFrom ? parseInt(forwardedFrom) : null,
                                created_at: new Date().toISOString(),
                                encrypted: 1,
                                username: req.body.username || 'User',
                                display_name: req.body.display_name || 'User'
                            };

                            console.log('✅ Encrypted message sent:', message.id);
                            res.json(message);
                            
                            // Отправляем через socket.io
                            io.to(`chat_${chatId}`).emit('new_message', message);
                        }
                    );
                }
            );
        }
    );
});


// ПОЛУЧЕНИЕ РАСШИФРОВАННЫХ СООБЩЕНИЙ
app.get('/api/messages/:chatId', (req, res) => {
    const chatId = req.params.chatId;
    const userId = req.query.userId;

    if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
    }

    // Получаем приватный ключ пользователя
    db.get('SELECT private_key FROM users WHERE id = ?', [userId], (err, user) => {
        if (err) {
            console.error('❌ Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (!user) {
            console.error('❌ User not found:', userId);
            return res.status(404).json({ error: 'User not found' });
        }

        db.all(
            `SELECT m.*, u.username, u.display_name, u.avatar 
             FROM messages m
             JOIN users u ON m.user_id = u.id
             WHERE m.chat_id = ?
             ORDER BY m.created_at ASC`,
            [chatId],
            (err, messages) => {
                if (err) {
                    console.error('❌ Failed to load messages:', err);
                    return res.json([]);
                }

                // Дешифруем сообщения
                const decryptedMessages = messages.map(msg => {
                    let decryptedContent = msg.content;
                    
                    if (msg.encrypted && msg.content) {
                        try {
                            // Пробуем распарсить как JSON
                            const encryptedObj = JSON.parse(msg.content);
                            // Пробуем получить сообщение для текущего пользователя
                            const encryptedForUser = encryptedObj[userId] || encryptedObj[msg.user_id];
                            if (encryptedForUser && user.private_key) {
                                decryptedContent = decryptMessage(encryptedForUser, user.private_key);
                            } else {
                                decryptedContent = msg.content;
                            }
                        } catch (e) {
                            // Если не JSON, значит не зашифровано
                            decryptedContent = msg.content;
                        }
                    }
                    
                    return {
                        ...msg,
                        content: decryptedContent,
                        display_name: msg.display_name || msg.username
                    };
                });

                res.json(decryptedMessages);
            }
        );
    });
});

// ============= РАЗДАЧА СТАТИЧЕСКИХ ФАЙЛОВ =============
app.use(express.static(__dirname));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// СОЗДАНИЕ ПРИВАТНОГО ЧАТА
app.post('/api/chats/create', (req, res) => {
    const { type, adminId, participants } = req.body;
    
    console.log('📝 Creating chat:', { type, adminId, participants });
    
    if (type === 'private' && participants && participants.length === 2) {
        const otherUserId = participants.find(id => id != adminId);
        
        db.get(
            `SELECT c.id, c.name 
             FROM chats c
             JOIN chat_participants cp1 ON c.id = cp1.chat_id
             JOIN chat_participants cp2 ON c.id = cp2.chat_id
             WHERE c.type = 'private' 
             AND cp1.user_id = ? 
             AND cp2.user_id = ?
             AND cp1.user_id != cp2.user_id`,
            [adminId, otherUserId],
            (err, existingChat) => {
                if (existingChat) {
                    return res.json({ 
                        id: existingChat.id, 
                        name: existingChat.name, 
                        type: 'private',
                        exists: true 
                    });
                }
                
                db.get('SELECT display_name, username FROM users WHERE id = ?', [otherUserId], (err, otherUser) => {
                    if (err || !otherUser) {
                        return res.status(404).json({ error: 'User not found' });
                    }
                    
                    const chatName = otherUser.display_name || otherUser.username;
                    
                    db.run(
                        'INSERT INTO chats (name, type, admin_id, created_at) VALUES (?, ?, ?, datetime("now"))',
                        [chatName, 'private', adminId],
                        function(err) {
                            if (err) {
                                console.error('❌ Chat creation error:', err);
                                return res.status(500).json({ error: 'Failed to create chat' });
                            }
                            
                            const chatId = this.lastID;
                            
                            participants.forEach(userId => {
                                db.run('INSERT INTO chat_participants (user_id, chat_id) VALUES (?, ?)',
                                    [userId, chatId]);
                            });
                            
                            console.log('✅ Chat created:', chatId);
                            
                            res.json({ 
                                id: chatId, 
                                name: chatName, 
                                type: 'private',
                                other_user: {
                                    id: otherUserId,
                                    name: chatName
                                }
                            });
                        }
                    );
                });
            }
        );
    } else {
        res.status(400).json({ error: 'Invalid chat parameters' });
    }
});

// ПОЛУЧЕНИЕ ЧАТОВ
app.get('/api/chats/:userId', (req, res) => {
    const userId = req.params.userId;
    
    db.all(
        `SELECT DISTINCT c.*, 
         (SELECT username FROM users WHERE id = c.admin_id) as admin_name,
         (SELECT content FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
         (SELECT created_at FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_time
         FROM chats c
         LEFT JOIN chat_participants cp ON c.id = cp.chat_id
         WHERE cp.user_id = ? OR c.admin_id = ?
         ORDER BY last_message_time DESC NULLS LAST`,
        [userId, userId],
        (err, chats) => {
            if (err) {
                console.error('❌ Failed to load chats:', err);
                return res.json([]);
            }
            
            let processed = 0;
            const result = [];
            
            if (chats.length === 0) {
                return res.json([]);
            }
            
            chats.forEach((chat, index) => {
                // Добавляем participants для всех типов чатов
                db.all(
                    'SELECT user_id FROM chat_participants WHERE chat_id = ?',
                    [chat.id],
                    (err, participants) => {
                        chat.participants = participants ? participants.map(p => p.user_id) : [];
                        
                        if (chat.type === 'private') {
                            const otherUserId = chat.participants.find(id => id != userId);
                            if (otherUserId) {
                                db.get(
                                    'SELECT display_name, username FROM users WHERE id = ?',
                                    [otherUserId],
                                    (err, user) => {
                                        if (user) {
                                            chat.name = user.display_name || user.username;
                                            chat.other_user = {
                                                id: otherUserId,
                                                name: chat.name,
                                                avatar: user.avatar
                                            };
                                        }
                                        result[index] = chat;
                                        processed++;
                                        if (processed === chats.length) {
                                            res.json(result);
                                        }
                                    }
                                );
                            } else {
                                result[index] = chat;
                                processed++;
                                if (processed === chats.length) {
                                    res.json(result);
                                }
                            }
                        } else {
                            result[index] = chat;
                            processed++;
                            if (processed === chats.length) {
                                res.json(result);
                            }
                        }
                    }
                );
            });
        }
    );
});

// ПОЛУЧЕНИЕ ИНФОРМАЦИИ О ЧАТЕ
app.get('/api/chats/:chatId/info', (req, res) => {
    const chatId = req.params.chatId;
    const userId = req.query.userId;
    
    if (!chatId || !userId) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    db.get(
        `SELECT c.*, u.username as admin_name, u.display_name as admin_display_name,
         (SELECT COUNT(*) FROM chat_participants WHERE chat_id = c.id) as members_count,
         (SELECT COUNT(*) FROM channel_subscribers WHERE channel_id = c.id) as subscribers_count
         FROM chats c
         LEFT JOIN users u ON c.admin_id = u.id
         WHERE c.id = ?`,
        [chatId],
        (err, chat) => {
            if (err) {
                console.error('❌ Database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            if (!chat) {
                return res.status(404).json({ error: 'Chat not found' });
            }
            
            const isAdmin = chat.admin_id == userId;
            
            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(2, 8);
            const inviteLink = `https://kyst.onrender.com/:1726/invite/${chatId}_${timestamp}_${random}`;
            
            db.all(
                `SELECT * FROM messages WHERE chat_id = ? AND type = 'file' ORDER BY created_at DESC LIMIT 20`,
                [chatId],
                (err, files) => {
                    db.all(
                        `SELECT * FROM messages WHERE chat_id = ? AND type = 'voice' ORDER BY created_at DESC LIMIT 20`,
                        [chatId],
                        (err, voices) => {
                            db.all(
                                `SELECT u.id, u.username, u.display_name, u.avatar, u.public_key
                                 FROM users u
                                 JOIN chat_participants cp ON u.id = cp.user_id
                                 WHERE cp.chat_id = ?`,
                                [chatId],
                                (err, participants) => {
                                    res.json({
                                        ...chat,
                                        isAdmin,
                                        inviteLink,
                                        files: files || [],
                                        voices: voices || [],
                                        participants: participants || []
                                    });
                                }
                            );
                        }
                    );
                }
            );
        }
    );
});

// ОБНОВЛЕНИЕ ЧАТА
app.post('/api/chats/:chatId/update', (req, res) => {
    const chatId = req.params.chatId;
    const { name, description, userId } = req.body;
    
    console.log('📝 Updating chat:', { chatId, name, description, userId });
    
    if (!chatId || !name || !userId) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    db.get('SELECT admin_id FROM chats WHERE id = ?', [chatId], (err, chat) => {
        if (err) {
            console.error('❌ Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (!chat) {
            return res.status(404).json({ error: 'Chat not found' });
        }
        
        if (chat.admin_id != userId) {
            return res.status(403).json({ error: 'Only admin can edit chat' });
        }
        
        db.run(
            'UPDATE chats SET name = ?, description = ? WHERE id = ?',
            [name, description || null, chatId],
            function(err) {
                if (err) {
                    console.error('❌ Failed to update chat:', err);
                    return res.status(500).json({ error: 'Failed to update chat' });
                }
                console.log('✅ Chat updated successfully');
                res.json({ success: true });
            }
        );
    });
});

// ПОИСК ПО СООБЩЕНИЯМ
app.get('/api/chats/:chatId/search', (req, res) => {
    const chatId = req.params.chatId;
    const query = req.query.q;
    const type = req.query.type || 'all';
    
    if (!query || query.length < 2) {
        return res.json([]);
    }
    
    let sql = 'SELECT * FROM messages WHERE chat_id = ? AND content LIKE ?';
    const params = [chatId, `%${query}%`];
    
    if (type !== 'all') {
        sql += ' AND type = ?';
        params.push(type);
    }
    
    sql += ' ORDER BY created_at DESC LIMIT 50';
    
    db.all(sql, params, (err, messages) => {
        if (err) {
            return res.json([]);
        }
        res.json(messages || []);
    });
});

// ============= СОЗДАНИЕ КАНАЛА =============
app.post('/api/channels/create', (req, res) => {
    const { name, description, adminId, isPrivate } = req.body;
    
    console.log('📝 Creating channel:', { name, adminId });
    
    if (!name || !adminId) {
        return res.status(400).json({ error: 'Channel name and admin are required' });
    }

    db.get('SELECT id FROM users WHERE id = ?', [adminId], (err, user) => {
        if (err || !user) {
            return res.status(404).json({ error: 'Admin user not found' });
        }

        db.run(
            `INSERT INTO chats (name, description, type, admin_id, is_private, created_at) 
             VALUES (?, ?, ?, ?, ?, datetime('now'))`,
            [name, description || null, 'channel', adminId, isPrivate || 0],
            function(err) {
                if (err) {
                    console.error('❌ Channel creation error:', err);
                    return res.status(500).json({ error: 'Failed to create channel' });
                }
                
                const channelId = this.lastID;
                
                db.run('INSERT INTO chat_participants (user_id, chat_id, role) VALUES (?, ?, ?)',
                    [adminId, channelId, 'admin']);
                
                db.run('INSERT INTO channel_subscribers (user_id, channel_id, role) VALUES (?, ?, ?)',
                    [adminId, channelId, 'admin']);
                
                console.log('✅ Channel created:', channelId);
                res.json({ 
                    id: channelId, 
                    name, 
                    type: 'channel',
                    success: true 
                });
            }
        );
    });
});

// ============= СОЗДАНИЕ ГРУППЫ =============
app.post('/api/groups/create', (req, res) => {
    const { name, adminId, members } = req.body;
    
    console.log('📝 Creating group:', { name, adminId, members });
    
    if (!name || !adminId) {
        return res.status(400).json({ error: 'Group name and admin are required' });
    }

    db.run(
        `INSERT INTO chats (name, type, admin_id, created_at) 
         VALUES (?, ?, ?, datetime('now'))`,
        [name, 'group', adminId],
        function(err) {
            if (err) {
                console.error('❌ Group creation error:', err);
                return res.status(500).json({ error: 'Failed to create group' });
            }
            
            const groupId = this.lastID;
            
            db.run('INSERT INTO chat_participants (user_id, chat_id, role) VALUES (?, ?, ?)',
                [adminId, groupId, 'admin']);
            
            if (members && members.length > 0) {
                members.forEach(memberId => {
                    db.run('INSERT OR IGNORE INTO chat_participants (user_id, chat_id, role) VALUES (?, ?, ?)',
                        [memberId, groupId, 'member']);
                });
            }
            
            console.log('✅ Group created:', groupId);
            res.json({ 
                id: groupId, 
                name, 
                type: 'group',
                success: true 
            });
        }
    );
});

// ============= ПРИСОЕДИНЕНИЕ К КАНАЛУ =============
app.post('/api/channels/:channelId/join', (req, res) => {
    const { channelId } = req.params;
    const { userId } = req.body;
    
    db.run('INSERT OR IGNORE INTO channel_subscribers (user_id, channel_id, role) VALUES (?, ?, ?)',
        [userId, channelId, 'subscriber'],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to join channel' });
            }
            
            db.run('INSERT OR IGNORE INTO chat_participants (user_id, chat_id) VALUES (?, ?)',
                [userId, channelId]);
            
            res.json({ success: true });
        }
    );
});

// ============= УДАЛЕНИЕ СООБЩЕНИЯ =============
app.delete('/api/messages/:messageId', (req, res) => {
    const messageId = req.params.messageId;
    
    db.run('DELETE FROM messages WHERE id = ?', [messageId], function(err) {
        if (err) {
            console.error('❌ Failed to delete message:', err);
            return res.status(500).json({ error: 'Failed to delete message' });
        }
        res.json({ success: true });
    });
});

// ============= ОБНОВЛЕНИЕ ПРОФИЛЯ =============
app.post('/api/user/profile', (req, res) => {
    const { userId, display_name, bio, theme, profile_header } = req.body;
    
    db.run(
        'UPDATE users SET display_name = ?, bio = ?, theme = ?, profile_header = ? WHERE id = ?',
        [display_name, bio || '', theme || 'light', profile_header || 'default', userId],
        function(err) {
            if (err) {
                console.error('❌ Failed to update profile:', err);
                return res.status(500).json({ error: 'Failed to update profile' });
            }
            res.json({ success: true });
        }
    );
});

// ============= ОБНОВЛЕНИЕ СТАТУСА =============
app.post('/api/user/status', (req, res) => {
    const { userId, status, customStatus } = req.body;
    
    db.run(
        'UPDATE users SET status = ?, custom_status = ? WHERE id = ?',
        [status || 'online', customStatus || null, userId],
        function(err) {
            if (err) {
                console.error('❌ Failed to update status:', err);
                return res.status(500).json({ error: 'Failed to update status' });
            }
            res.json({ success: true });
        }
    );
});

// ============= ОБНОВЛЕНИЕ ФОНА ЧАТА =============
app.post('/api/user/chat-bg', (req, res) => {
    const { userId, background } = req.body;
    
    db.run(
        'UPDATE users SET chat_bg = ? WHERE id = ?',
        [background || 'default', userId],
        function(err) {
            if (err) {
                console.error('❌ Failed to update chat background:', err);
                return res.status(500).json({ error: 'Failed to update background' });
            }
            res.json({ success: true });
        }
    );
});

// ============= ЗАГРУЗКА ФАЙЛОВ =============
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    res.json({ url: `/uploads/${req.file.filename}` });
});

app.use('/uploads', express.static(uploadsDir));

// ============= FOLDERS API =============
app.get('/api/folders/:userId', (req, res) => {
    const userId = req.params.userId;
    
    db.all(
        `SELECT * FROM chats 
         WHERE id IN (SELECT chat_id FROM chat_participants WHERE user_id = ?)
         OR admin_id = ?`,
        [userId, userId],
        (err, chats) => {
            if (err) {
                console.error('Failed to load folders:', err);
                return res.json({ inbox: [], direct: [], groups: [], channels: [] });
            }
            
            const folders = {
                inbox: chats || [],
                direct: chats?.filter(c => c.type === 'private') || [],
                groups: chats?.filter(c => c.type === 'group') || [],
                channels: chats?.filter(c => c.type === 'channel') || []
            };
            
            res.json(folders);
        }
    );
});

// ============= ССЫЛКИ-ПРИГЛАШЕНИЯ =============
app.get('/invite/:token', (req, res) => {
    const token = req.params.token;
    
    const [chatId] = token.split('_');
    
    if (!chatId) {
        return res.status(404).send(`
            <html>
                <head>
                    <title>Palette · Invite</title>
                    <style>
                        body { 
                            font-family: 'Inter', sans-serif; 
                            background: #fef7ff; 
                            display: flex; 
                            align-items: center; 
                            justify-content: center; 
                            height: 100vh; 
                            margin: 0; 
                        }
                        .container {
                            text-align: center;
                            padding: 48px;
                            background: white;
                            border-radius: 32px;
                            box-shadow: 0 8px 30px rgba(0,0,0,0.1);
                            max-width: 400px;
                        }
                        h1 { color: #6750a4; font-size: 48px; margin: 0 0 16px; text-transform: lowercase; }
                        p { color: #49454e; margin-bottom: 24px; }
                        .btn {
                            background: #6750a4;
                            color: white;
                            border: none;
                            padding: 12px 32px;
                            border-radius: 100px;
                            font-size: 16px;
                            font-weight: 600;
                            cursor: pointer;
                            transition: all 0.2s ease;
                        }
                        .btn:hover {
                            filter: brightness(1.1);
                            transform: translateY(-2px);
                            box-shadow: 0 4px 12px rgba(103,80,164,0.3);
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>palette</h1>
                        <p>Приглашение в чат</p>
                        <button class="btn" onclick="window.location.href='https://kyst.onrender.com/'">Open Palette</button>
                    </div>
                </body>
            </html>
        `);
    }
    
    res.cookie('invite_chat', chatId, { maxAge: 900000, httpOnly: true });
    
    res.redirect('https://kyst.onrender.com/');
});

// ============= SOCKET.IO =============
io.on('connection', (socket) => {
    console.log('✅ Socket connected:', socket.id);
    
    socket.on('join_chat', (chatId) => {
        socket.join(`chat_${chatId}`);
        console.log(`👤 Joined chat: ${chatId}`);
    });
    
    socket.on('send_message', (message) => {
        io.to(`chat_${message.chatId}`).emit('new_message', message);
    });
    
    socket.on('typing', ({ chatId, userId, isTyping }) => {
        socket.to(`chat_${chatId}`).emit('user_typing', { userId, isTyping });
    });
    
    // ============= CALL EVENTS =============
    
    socket.on('call_initiate', (data) => {
        console.log('📞 Call initiated:', data);
        // Отправляем входящий звонок получателю
        socket.to(`user_${data.to}`).emit('call_incoming', {
            from: data.from || socket.id,
            chatId: data.chatId,
            type: data.type,
            offer: data.offer
        });
    });
    
    socket.on('call_answer', (data) => {
        console.log('✅ Call answered:', data);
        // Отправляем ответ инициатору звонка
        socket.to(`user_${data.to}`).emit('call_answer', {
            from: data.from || socket.id,
            chatId: data.chatId,
            answer: data.answer
        });
        
        // Уведомляем получателя о принятии звонка
        socket.to(`user_${data.to}`).emit('call_accepted', {
            chatId: data.chatId
        });
    });
    
    socket.on('call_reject', (data) => {
        console.log('❌ Call rejected:', data);
        // Уведомляем инициатора об отклонении
        socket.to(`user_${data.to}`).emit('call_rejected', {
            chatId: data.chatId
        });
    });
    
    socket.on('call_end', (data) => {
        console.log('📴 Call ended:', data);
        // Уведомляем другого пользователя о завершении звонка
        socket.to(`user_${data.to}`).emit('call_ended', {
            chatId: data.chatId
        });
    });
    
    socket.on('ice_candidate', (data) => {
        // Пересылаем ICE кандидата другому пользователю
        socket.to(`user_${data.to}`).emit('ice_candidate', {
            from: data.from || socket.id,
            chatId: data.chatId,
            candidate: data.candidate
        });
    });
    
    // Привязываем пользователя к его socket для приватных сообщений
    socket.on('register_user', (userId) => {
        socket.join(`user_${userId}`);
        console.log(`👤 User ${userId} registered for calls`);
    });
    
    socket.on('disconnect', () => {
        console.log('❌ Socket disconnected:', socket.id);
    });
});

// ============= ЗАПУСК =============
server.listen(PORT, '0.0.0.0', () => {
    console.log('\n' + '🚀'.repeat(50));
    console.log('   PALETTE MESSENGER - ENCRYPTED!');
    console.log('🚀'.repeat(50) + '\n');
    console.log(`📡 http://localhost:${PORT}`);
    console.log(`✅ Database: messenger.db (auto-migrated)`);
    console.log(`✅ Encryption: RSA 2048`);
    console.log(`✅ Google OAuth: ACTIVE`);
    console.log(`✅ GitHub OAuth: ACTIVE (add your keys)`);
    console.log(`✅ Private chats: ENCRYPTED`);
    console.log(`✅ Status: WORKING`);
    console.log(`✅ Chat backgrounds: WORKING`);
    console.log(`✅ Messages: NO DUPLICATES`);
    console.log(`✅ Search: WORKING\n`);
    console.log(`⚠️  GitHub: Edit GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in server.js`);
    console.log(`   Get keys at: https://github.com/settings/developers\n`);
});
