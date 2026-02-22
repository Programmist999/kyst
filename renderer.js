class PaletteMessenger {
    constructor() {
        this.socket = io('https://kyst.onrender.com', {
            transports: ['polling', 'websocket'],
            reconnectionAttempts: 10,
            reconnectionDelay: 1000
        });
        
        this.currentUser = null;
        this.currentChat = null;
        this.activeChats = [];
        this.messages = [];
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.typingTimeout = null;
        this.isRecording = false;
        this.recordingStartTime = null;
        this.replyToMessage = null;
        this.selectedMessage = null;
        this.forwardMessageData = null;
        this.selectedChatForMove = null;
        this.particles = [];
        this.selectedMembersList = [];
        this.currentSearchTab = 'users';
        this.currentFolder = 'inbox';
        this.customFolders = this.loadCustomFolders();
        this.sidebarWidth = 360;
        this.isResizing = false;
        this.particleInterval = null;
        this.ctx = null;
        this.particlesCanvas = null;

        // WebRTC для звонков
        this.peerConnection = null;
        this.localStream = null;
        this.remoteStream = null;
        this.isCallActive = false;
        this.isCallIncoming = false;
        this.callType = null; // 'voice' or 'video'
        this.callStartTime = null;
        this.callTimerInterval = null;
        this.currentCamera = 'user'; // 'user' or 'environment'
        this.isMuted = false;
        this.isVideoEnabled = true;

        this.sounds = {
            tap: new Audio('/assets/tapOnButton.wav'),
            welcome: new Audio('/assets/welcome.wav'),
            buybuy: new Audio('/assets/buybuy.wav')
        };
        
        // Настройка громкости
        this.sounds.tap.volume = 0.5;
        this.sounds.welcome.volume = 0.7;
        this.sounds.buybuy.volume = 0.7;
        
        // Предзагрузка звуков
        this.preloadSounds();
        
        this.init();
    }

    async init() {
        this.cacheElements();
        this.attachEventListeners();
        this.initSocketEvents();
        await this.checkAuthStatus();
        this.initParticles();
        this.loadTheme();
        this.setupAutoResize();
        this.generateUsernamePreview();
        this.initSidebarResize();
        this.initSmoothScroll();
        this.renderFolders();
    }

    cacheElements() {
        // Landing
        this.landingContainer = document.getElementById('landing-container');
        this.landingLoginBtn = document.getElementById('landing-login-btn');
        this.landingSignupBtn = document.getElementById('landing-signup-btn');
        this.heroSignupBtn = document.getElementById('hero-signup-btn');
        this.heroDemoBtn = document.getElementById('hero-demo-btn');
        this.backToLandingBtn = document.getElementById('back-to-landing-btn');
        this.backToLandingChatBtn = document.getElementById('back-to-landing-chat-btn');
        this.landingThemeToggle = document.getElementById('landing-theme-toggle');
        this.landingUserProfile = document.getElementById('landing-user-profile');
        this.landingUserAvatar = document.getElementById('landing-user-avatar');
        this.landingUserName = document.getElementById('landing-user-name');
        this.landingAuthButtons = document.querySelector('.landing-auth-buttons');
        
        // Nav links
        this.navLinks = document.querySelectorAll('.nav-links a');
        
        // Auth
        this.authContainer = document.getElementById('auth-container');
        this.loginForm = document.getElementById('login-form');
        this.signupForm = document.getElementById('signup-form');
        this.loginEmail = document.getElementById('login-email');
        this.loginPassword = document.getElementById('login-password');
        this.loginBtn = document.getElementById('login-btn');
        this.signupName = document.getElementById('signup-name');
        this.signupEmail = document.getElementById('signup-email');
        this.signupPassword = document.getElementById('signup-password');
        this.signupConfirmPassword = document.getElementById('signup-confirm-password');
        this.signupBtn = document.getElementById('signup-btn');
        this.showSignup = document.getElementById('show-signup');
        this.showLogin = document.getElementById('show-login');
        this.usernamePreview = document.getElementById('username-preview');
        this.passwordMatchError = document.getElementById('password-match-error');
        this.googleLoginBtn = document.getElementById('google-login');
        this.githubLoginBtn = document.getElementById('github-login');
        
        // Chat
        this.chatContainer = document.getElementById('chat-container');
        this.sidebar = document.querySelector('.sidebar');
        this.mainChat = document.querySelector('.main-chat');
        this.resizeHandle = document.querySelector('.sidebar-resize-handle');
        this.chatsList = document.getElementById('chats-list');
        this.messagesContainer = document.getElementById('messages-container');
        this.typingIndicator = document.getElementById('typing-indicator');
        this.messageInput = document.getElementById('message-input');
        this.sendMessageBtn = document.getElementById('send-message-btn');
        this.attachFileBtn = document.getElementById('attach-file-btn');
        this.fileInput = document.getElementById('file-input');
        this.voiceRecordBtn = document.getElementById('voice-record-btn');
        this.cancelVoiceBtn = document.getElementById('cancel-voice-btn');
        this.sendVoiceBtn = document.getElementById('send-voice-btn');
        this.voiceTimer = document.getElementById('voice-timer');
        this.voiceIndicator = document.getElementById('voice-recording-indicator');
        this.replyPreview = document.getElementById('reply-preview');
        this.replyUsername = document.getElementById('reply-username');
        this.replyText = document.getElementById('reply-text');
        this.cancelReply = document.getElementById('cancel-reply');
        this.particlesContainer = document.getElementById('particles-container');
        this.currentUsername = document.getElementById('current-username');
        this.currentUserAvatar = document.getElementById('current-user-avatar');
        this.userStatus = document.querySelector('.user-status');
        this.profileBtn = document.getElementById('profile-btn');
        this.themeToggle = document.getElementById('theme-toggle');
        this.chatMenuBtn = document.getElementById('chat-menu-btn');
        this.chatActionsBtn = document.getElementById('chat-actions-btn');
        this.newChatBtn = document.getElementById('new-chat-btn');
        this.addFolderBtn = document.getElementById('add-folder-btn');
        this.foldersList = document.getElementById('folders-list');
        this.chatHeaderInfo = document.querySelector('.chat-header-info');
        
        // Call elements
        this.callButtons = document.getElementById('call-buttons');
        this.voiceCallBtn = document.getElementById('voice-call-btn');
        this.videoCallBtn = document.getElementById('video-call-btn');
        this.callModal = document.getElementById('call-modal');
        this.incomingCallModal = document.getElementById('incoming-call-modal');
        this.remoteVideo = document.getElementById('remote-video');
        this.localVideo = document.getElementById('local-video');
        this.callTimer = document.getElementById('call-timer');
        this.callStatus = document.getElementById('call-status');
        this.callUserName = document.getElementById('call-user-name');
        this.callUserAvatar = document.getElementById('call-user-avatar');
        this.callAudioOnly = document.getElementById('call-audio-only');
        this.callAudioAvatar = document.getElementById('call-audio-avatar');
        this.callAudioName = document.getElementById('call-audio-name');
        this.muteAudioBtn = document.getElementById('mute-audio-btn');
        this.toggleVideoBtn = document.getElementById('toggle-video-btn');
        this.endCallBtn = document.getElementById('end-call-btn');
        this.switchCameraBtn = document.getElementById('switch-camera-btn');
        this.acceptCallBtn = document.getElementById('accept-call-btn');
        this.rejectCallBtn = document.getElementById('reject-call-btn');
        this.incomingCallName = document.getElementById('incoming-call-name');
        this.incomingCallAvatar = document.getElementById('incoming-call-avatar');
        this.incomingCallType = document.getElementById('incoming-call-type');
        
        // Profile Panel
        this.profilePanel = document.getElementById('profile-panel');
        this.panelCloseBtn = document.getElementById('panel-close-btn');
        this.panelSaveBtn = document.getElementById('panel-save-btn');
        this.panelChangeAvatar = document.getElementById('panel-change-avatar');
        this.panelAvatarInput = document.getElementById('panel-avatar-input');
        this.panelChangeHeader = document.getElementById('panel-change-header');
        this.panelDisplayName = document.getElementById('panel-display-name');
        this.panelUsername = document.getElementById('panel-username');
        this.panelBio = document.getElementById('panel-bio');
        this.panelStatus = document.getElementById('panel-status');
        this.panelEditName = document.getElementById('panel-edit-name');
        this.panelEditBio = document.getElementById('panel-edit-bio');
        this.panelTheme = document.getElementById('panel-theme');
        this.panelChatBg = document.getElementById('panel-chat-bg');
        this.panelCover = document.getElementById('panel-cover');
        this.panelAvatarPreview = document.getElementById('panel-avatar-preview');
        this.accountUsername = document.getElementById('account-username');
        this.accountEmail = document.getElementById('account-email');
        this.accountJoined = document.getElementById('account-joined');
        this.profileTabs = document.querySelectorAll('.profile-panel-tab');
        this.profileTabContents = document.querySelectorAll('.profile-panel-tab-content');
        
        // Right Panel
        this.rightPanel = document.getElementById('right-panel');
        this.closeRightPanelBtn = document.getElementById('close-right-panel');
        this.panelChatAvatar = document.getElementById('panel-chat-avatar');
        this.panelChatName = document.getElementById('panel-chat-name');
        this.panelChatDescription = document.getElementById('panel-chat-description');
        this.panelChatType = document.getElementById('panel-chat-type');
        this.panelInviteLink = document.getElementById('panel-invite-link');
        this.copyInviteLinkBtn = document.getElementById('copy-invite-link');
        this.panelEditName = document.getElementById('panel-edit-name');
        this.panelEditDescription = document.getElementById('panel-edit-description');
        this.saveChatSettingsBtn = document.getElementById('save-chat-settings');
        this.panelFilesList = document.getElementById('panel-files-list');
        this.panelVoicesList = document.getElementById('panel-voices-list');
        this.panelSearchInput = document.getElementById('panel-search-input');
        this.panelSearchResults = document.getElementById('panel-search-results');
        this.panelSearchTabs = document.querySelectorAll('.panel-search-tab');
        
        // Modals
        this.createChannelModal = document.getElementById('create-channel-modal');
        this.channelName = document.getElementById('channel-name');
        this.channelDescription = document.getElementById('channel-description');
        this.channelPrivate = document.getElementById('channel-private');
        this.createChannelBtn = document.getElementById('create-channel-btn');
        this.cancelChannelBtn = document.getElementById('cancel-channel');
        this.closeChannelModal = document.getElementById('close-channel-modal');
        
        this.createGroupModal = document.getElementById('create-group-modal');
        this.groupName = document.getElementById('group-name');
        this.groupMemberSearch = document.getElementById('group-member-search');
        this.userSearchResults = document.getElementById('user-search-results');
        this.selectedMembers = document.getElementById('selected-members');
        this.createGroupBtn = document.getElementById('create-group-btn');
        this.cancelGroupBtn = document.getElementById('cancel-group');
        this.closeGroupModal = document.getElementById('close-group-modal');
        
        this.createFolderModal = document.getElementById('create-folder-modal');
        this.folderName = document.getElementById('folder-name');
        this.folderIcon = document.getElementById('folder-icon');
        this.createFolderBtn = document.getElementById('create-folder-btn');
        this.cancelFolderBtn = document.getElementById('cancel-folder');
        this.closeFolderModal = document.getElementById('close-folder-modal');
        
        this.searchModal = document.getElementById('search-modal');
        this.globalSearch = document.getElementById('global-search');
        this.globalSearchResults = document.getElementById('global-search-results');
        this.closeSearchModal = document.getElementById('close-search-modal');
        this.searchTabs = document.querySelectorAll('.search-tab');
        
        this.statusModal = document.getElementById('status-modal');
        this.statusOptions = document.querySelectorAll('.status-option');
        this.customStatus = document.getElementById('custom-status');
        this.saveStatusBtn = document.getElementById('save-status');
        this.clearStatusBtn = document.getElementById('clear-status');
        this.closeStatusModal = document.getElementById('close-status-modal');
        
        this.forwardModal = document.getElementById('forward-modal');
        this.chatsForwardList = document.getElementById('chats-forward-list');
        this.cancelForward = document.getElementById('cancel-forward');
        
        this.contextMenu = document.getElementById('context-menu');
        this.replyMessage = document.getElementById('reply-message');
        this.forwardMessage = document.getElementById('forward-message');
        this.copyMessage = document.getElementById('copy-message');
        this.deleteMessage = document.getElementById('delete-message');
        
        this.chatContextMenu = document.getElementById('chat-context-menu');
        this.moveToFolderItem = document.querySelector('.move-to-folder-item');
        this.folderSubmenu = document.querySelector('.folder-submenu');
        this.pinChat = document.getElementById('pin-chat');
        this.muteChat = document.getElementById('mute-chat');
        this.deleteChat = document.getElementById('delete-chat');
        
        this.headerMenu = document.getElementById('header-menu');
        this.menuSearch = document.getElementById('menu-search');
        this.menuNewChannel = document.getElementById('menu-new-channel');
        this.menuNewGroup = document.getElementById('menu-new-group');
        this.menuNewFolder = document.getElementById('menu-new-folder');
        this.menuStatus = document.getElementById('menu-status');
        this.menuLogout = document.getElementById('menu-logout');
        
        this.audioPlayer = document.getElementById('audio-player');
    }

    attachEventListeners() {
        // Звук на все кнопки через делегирование
        document.addEventListener('click', (e) => {
            if (e.target.closest('.btn') || e.target.closest('.icon-btn')) {
                this.playSound('tap');
            }
        });

        // Landing
        this.landingLoginBtn?.addEventListener('click', () => {
            this.animateTransition(this.landingContainer, this.authContainer);
            this.switchAuthForm('login');
        });
        
        this.landingSignupBtn?.addEventListener('click', () => {
            this.animateTransition(this.landingContainer, this.authContainer);
            this.switchAuthForm('signup');
        });
        
        this.heroSignupBtn?.addEventListener('click', () => {
            this.animateTransition(this.landingContainer, this.authContainer);
            this.switchAuthForm('signup');
        });
        
        this.heroDemoBtn?.addEventListener('click', () => {
            this.showToast('Demo video coming soon!', 'info');
        });
        
        this.backToLandingBtn?.addEventListener('click', () => {
            this.animateTransition(this.authContainer, this.landingContainer);
            this.updateLandingUserProfile();
        });
        
        this.backToLandingChatBtn?.addEventListener('click', () => {
            this.animateTransition(this.chatContainer, this.landingContainer);
            this.updateLandingUserProfile();
        });
        
        this.landingUserProfile?.addEventListener('click', () => {
            if (this.currentUser) {
                this.animateTransition(this.landingContainer, this.chatContainer);
            }
        });
        
        this.landingThemeToggle?.addEventListener('click', () => this.toggleTheme());
        
        // Smooth scroll
        this.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href');
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
        
        // Auth
        this.loginBtn?.addEventListener('click', () => this.handleLogin());
        this.signupBtn?.addEventListener('click', () => this.handleSignup());
        
        this.showSignup?.addEventListener('click', (e) => {
            e.preventDefault();
            this.switchAuthForm('signup');
        });
        
        this.showLogin?.addEventListener('click', (e) => {
            e.preventDefault();
            this.switchAuthForm('login');
        });
        
        this.googleLoginBtn?.addEventListener('click', () => {
            window.location.href = '/auth/google';
        });
        
        this.githubLoginBtn?.addEventListener('click', () => {
            window.location.href = '/auth/github';
        });
        
        // Theme
        this.themeToggle?.addEventListener('click', () => this.toggleTheme());
        
        // Messages
        this.sendMessageBtn?.addEventListener('click', () => this.sendMessage());
        
        this.messageInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        this.messageInput?.addEventListener('input', () => this.handleTyping());
        this.messageInput?.addEventListener('focus', () => this.startParticles());
        this.messageInput?.addEventListener('blur', () => this.stopParticles());
        
        // File upload
        this.attachFileBtn?.addEventListener('click', () => this.fileInput?.click());
        this.fileInput?.addEventListener('change', () => this.handleFileUpload());
        
        // Voice recording
        this.voiceRecordBtn?.addEventListener('click', () => this.toggleVoiceRecording());
        this.cancelVoiceBtn?.addEventListener('click', () => this.cancelVoiceRecording());
        this.sendVoiceBtn?.addEventListener('click', () => this.sendVoiceRecording());
        
        // Profile
        this.profileBtn?.addEventListener('click', () => this.openProfilePanel());
        this.panelCloseBtn?.addEventListener('click', () => this.closeProfilePanel());
        this.panelSaveBtn?.addEventListener('click', () => this.saveProfileFromPanel());
        this.panelChangeAvatar?.addEventListener('click', () => this.panelAvatarInput?.click());
        this.panelAvatarInput?.addEventListener('change', (e) => this.handlePanelAvatarChange(e));
        this.panelChangeHeader?.addEventListener('click', () => this.changeProfileHeader());
        
        // Profile tabs
        this.profileTabs?.forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.profileTabs.forEach(t => t.classList.remove('active'));
                this.profileTabContents.forEach(c => c.classList.remove('active'));
                
                tab.classList.add('active');
                const tabName = tab.dataset.tab;
                document.getElementById(`panel-${tabName}-tab`)?.classList.add('active');
            });
        });
        
        // New chat
        this.newChatBtn?.addEventListener('click', () => this.openSearchModal());
        
        // Folders
        this.addFolderBtn?.addEventListener('click', () => this.openCreateFolderModal());
        
        // Context menu for messages
        this.replyMessage?.addEventListener('click', () => this.setupReply());
        this.forwardMessage?.addEventListener('click', () => this.showForwardModal());
        this.copyMessage?.addEventListener('click', () => this.copyMessageText());
        this.deleteMessage?.addEventListener('click', () => this.deleteSelectedMessage());
        
        // Context menu for chats
        this.moveToFolderItem?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.folderSubmenu?.classList.toggle('visible');
        });
        
        this.pinChat?.addEventListener('click', () => {
            if (this.selectedChatForMove) {
                this.showToast('Pin coming soon!', 'info');
            }
            this.closeChatContextMenu();
        });
        
        this.muteChat?.addEventListener('click', () => {
            if (this.selectedChatForMove) {
                this.showToast('Mute coming soon!', 'info');
            }
            this.closeChatContextMenu();
        });
        
        this.deleteChat?.addEventListener('click', () => {
            if (this.selectedChatForMove) {
                this.showToast('Delete coming soon!', 'info');
            }
            this.closeChatContextMenu();
        });
        
        // Close context menus on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.context-menu')) {
                this.closeContextMenu();
                this.closeChatContextMenu();
            }
        });
        
        // Cancel forward
        this.cancelForward?.addEventListener('click', () => this.closeModal(this.forwardModal));
        this.cancelReply?.addEventListener('click', () => this.cancelReplyAction());
        
        // Channel modal
        this.createChannelBtn?.addEventListener('click', () => this.createChannel());
        this.cancelChannelBtn?.addEventListener('click', () => this.closeModal(this.createChannelModal));
        this.closeChannelModal?.addEventListener('click', () => this.closeModal(this.createChannelModal));
        
        // Group modal
        this.createGroupBtn?.addEventListener('click', () => this.createGroup());
        this.cancelGroupBtn?.addEventListener('click', () => this.closeModal(this.createGroupModal));
        this.closeGroupModal?.addEventListener('click', () => this.closeModal(this.createGroupModal));
        this.groupMemberSearch?.addEventListener('input', (e) => this.searchUsers(e.target.value));
        
        // Folder modal
        this.createFolderBtn?.addEventListener('click', () => this.createFolder());
        this.cancelFolderBtn?.addEventListener('click', () => this.closeModal(this.createFolderModal));
        this.closeFolderModal?.addEventListener('click', () => this.closeModal(this.createFolderModal));
        
        // Search modal
        this.closeSearchModal?.addEventListener('click', () => this.closeModal(this.searchModal));
        this.globalSearch?.addEventListener('input', (e) => this.handleGlobalSearch(e));
        
        this.searchTabs?.forEach(tab => {
            tab.addEventListener('click', (e) => this.switchSearchTab(e));
        });
        
        // Status modal
        this.statusOptions?.forEach(option => {
            option.addEventListener('click', () => this.selectStatus(option));
        });
        
        this.saveStatusBtn?.addEventListener('click', () => this.saveStatus());
        this.clearStatusBtn?.addEventListener('click', () => this.clearStatus());
        this.closeStatusModal?.addEventListener('click', () => this.closeModal(this.statusModal));
        
        // Header menu
        this.chatMenuBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showHeaderMenu(e);
        });
        
        this.menuSearch?.addEventListener('click', () => this.openSearchModal());
        this.menuNewChannel?.addEventListener('click', () => this.openCreateChannelModal());
        this.menuNewGroup?.addEventListener('click', () => this.openCreateGroupModal());
        this.menuNewFolder?.addEventListener('click', () => this.openCreateFolderModal());
        this.menuStatus?.addEventListener('click', () => this.openStatusModal());
        this.menuLogout?.addEventListener('click', () => this.handleLogout());
        
        // Right panel
        this.chatActionsBtn?.addEventListener('click', () => this.openRightPanel());
        this.closeRightPanelBtn?.addEventListener('click', () => this.closeRightPanel());
        this.copyInviteLinkBtn?.addEventListener('click', () => this.copyInviteLink());
        this.saveChatSettingsBtn?.addEventListener('click', () => this.saveChatSettings());
        this.panelSearchInput?.addEventListener('input', (e) => this.panelSearch(e.target.value));
        
        this.panelSearchTabs?.forEach(tab => {
            tab.addEventListener('click', (e) => this.switchPanelSearchTab(e));
        });
        
        // Call buttons
        this.voiceCallBtn?.addEventListener('click', () => this.initiateCall('voice'));
        this.videoCallBtn?.addEventListener('click', () => this.initiateCall('video'));
        this.endCallBtn?.addEventListener('click', () => this.endCall());
        this.muteAudioBtn?.addEventListener('click', () => this.toggleMute());
        this.toggleVideoBtn?.addEventListener('click', () => this.toggleVideo());
        this.switchCameraBtn?.addEventListener('click', () => this.switchCamera());
        this.acceptCallBtn?.addEventListener('click', () => this.acceptCall());
        this.rejectCallBtn?.addEventListener('click', () => this.rejectCall());
        
        // Password validation
        this.signupPassword?.addEventListener('input', () => this.checkPasswordsMatch());
        this.signupConfirmPassword?.addEventListener('input', () => this.checkPasswordsMatch());
        this.signupName?.addEventListener('input', () => this.generateUsernamePreview());
        
        // Window events
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    initSocketEvents() {
        this.socket.on('connect', () => {
            console.log('✅ Socket connected');
            // Регистрируем пользователя для звонков
            if (this.currentUser?.id) {
                this.socket.emit('register_user', this.currentUser.id);
            }
        });
        
        this.socket.on('new_message', (message) => {
            this.displayMessage(message);
            this.updateChatListLastMessage(message);
        });
        
        this.socket.on('user_typing', ({ userId, isTyping }) => {
            if (this.currentChat && userId !== this.currentUser?.id) {
                this.showTypingIndicator(isTyping);
            }
        });
        
        // Call events
        this.socket.on('call_incoming', (data) => {
            this.handleIncomingCall(data);
        });
        
        this.socket.on('call_accepted', (data) => {
            this.handleCallAccepted(data);
        });
        
        this.socket.on('call_rejected', () => {
            this.handleCallRejected();
        });
        
        this.socket.on('call_ended', () => {
            this.handleCallEnded();
        });
        
        this.socket.on('call_offer', async (data) => {
            await this.handleCallOffer(data);
        });
        
        this.socket.on('call_answer', async (data) => {
            await this.handleCallAnswer(data);
        });
        
        this.socket.on('ice_candidate', async (data) => {
            await this.handleIceCandidate(data);
        });
    }

    // ============= ANIMATIONS =============
    
    animateTransition(from, to) {
        from.classList.add('fade-out');
        setTimeout(() => {
            from.classList.add('hidden');
            from.classList.remove('fade-out');
            to.classList.remove('hidden');
            to.classList.add('fade-in');
            setTimeout(() => to.classList.remove('fade-in'), 300);
        }, 200);
    }

    animateModal(modal) {
        modal.classList.add('scale-in');
        setTimeout(() => modal.classList.remove('scale-in'), 300);
    }

    initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }

    // ============= AUTH =============
    
    async checkAuthStatus() {
        const savedUser = localStorage.getItem('palette_user');
        
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            try {
                const response = await fetch('/api/auth/user');
                if (response.ok) {
                    const user = await response.json();
                    this.currentUser = user;
                    localStorage.setItem('palette_user', JSON.stringify(user));
                }
            } catch (error) {
                console.log('Using cached user data');
            }
            
            this.updateLandingUserProfile();
            
            // Show chat
            this.landingContainer?.classList.add('hidden');
            this.authContainer?.classList.add('hidden');
            this.chatContainer?.classList.remove('hidden');
            this.chatContainer.classList.add('fade-in');
            setTimeout(() => this.chatContainer.classList.remove('fade-in'), 300);
            
            await this.loadChats();
            await this.loadFolders();
            this.updateUserInfo();
            this.updateUserStatus();
            
            // Регистрируем пользователя для звонков
            if (this.currentUser?.id && this.socket.connected) {
                this.socket.emit('register_user', this.currentUser.id);
            }
            this.setTheme(this.currentUser.theme || 'light');
            return;
        }

        // Show landing if not logged in
        this.landingContainer?.classList.remove('hidden');
        this.authContainer?.classList.add('hidden');
        this.chatContainer?.classList.add('hidden');
        this.updateLandingUserProfile();
    }

    updateLandingUserProfile() {
        if (!this.landingUserProfile || !this.landingAuthButtons) return;
        
        if (this.currentUser) {
            this.landingUserProfile.classList.remove('hidden');
            this.landingAuthButtons.classList.add('hidden');
            
            if (this.landingUserAvatar) {
                if (this.currentUser.avatar) {
                    const avatarUrl = this.currentUser.avatar.startsWith('http') 
                        ? this.currentUser.avatar 
                        : `https://lh3.googleusercontent.com/a/${this.currentUser.avatar}`;
                    this.landingUserAvatar.innerHTML = `<img src="${avatarUrl}" alt="avatar">`;
                } else {
                    const initial = (this.currentUser.display_name || this.currentUser.username || 'U').charAt(0).toUpperCase();
                    this.landingUserAvatar.textContent = initial;
                }
            }
            
            if (this.landingUserName) {
                this.landingUserName.textContent = this.currentUser.display_name || this.currentUser.username || 'User';
            }
        } else {
            this.landingUserProfile.classList.add('hidden');
            this.landingAuthButtons.classList.remove('hidden');
        }
    }

    switchAuthForm(form) {
        document.querySelectorAll('.auth-form').forEach(el => {
            el.classList.remove('active');
            el.classList.add('fade-out');
            setTimeout(() => el.classList.remove('fade-out'), 200);
        });
        
        setTimeout(() => {
            if (form === 'login') {
                this.loginForm?.classList.add('active');
                this.loginForm?.classList.add('fade-in');
                setTimeout(() => this.loginForm?.classList.remove('fade-in'), 300);
            } else {
                this.signupForm?.classList.add('active');
                this.signupForm?.classList.add('fade-in');
                setTimeout(() => this.signupForm?.classList.remove('fade-in'), 300);
                this.generateUsernamePreview();
            }
        }, 200);
    }

    generateUsernamePreview() {
        if (!this.signupName || !this.usernamePreview) return;
        const name = this.signupName.value.trim();
        if (name) {
            const username = '@' + name.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20);
            this.usernamePreview.textContent = username;
        } else {
            this.usernamePreview.textContent = '@username';
        }
    }

    checkPasswordsMatch() {
        if (!this.signupPassword || !this.signupConfirmPassword || !this.passwordMatchError) return;
        const password = this.signupPassword.value;
        const confirm = this.signupConfirmPassword.value;
        
        if (confirm && password !== confirm) {
            this.passwordMatchError.classList.remove('hidden');
            return false;
        } else {
            this.passwordMatchError.classList.add('hidden');
            return true;
        }
    }

    async handleSignup() {
        const display_name = this.signupName?.value.trim();
        const email = this.signupEmail?.value.trim();
        const password = this.signupPassword?.value.trim();
        const confirmPassword = this.signupConfirmPassword?.value.trim();

        if (!display_name || !email || !password || !confirmPassword) {
            this.showToast('All fields are required', 'error');
            return;
        }

        if (password !== confirmPassword) {
            this.showToast('Passwords do not match', 'error');
            return;
        }

        if (password.length < 6) {
            this.showToast('Password must be at least 6 characters', 'error');
            return;
        }

        try {
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, display_name })
            });

            const data = await response.json();
            
            if (response.ok) {
                this.currentUser = data.user;
                localStorage.setItem('palette_user', JSON.stringify(data.user));
                
                this.updateLandingUserProfile();
                this.animateTransition(this.authContainer, this.chatContainer);
                
                // Проигрываем звук приветствия
                this.playSound('welcome');
                
                await this.loadChats();
                await this.loadFolders();
                this.updateUserInfo();
                this.updateUserStatus();
                this.setTheme(data.user.theme || 'light');
                
                // Регистрируем пользователя для звонков
                if (this.socket.connected) {
                    this.socket.emit('register_user', data.user.id);
                }
                
                this.showToast(`Welcome, ${data.user.display_name}!`, 'success');
            } else {
                this.showToast(data.error || 'Signup failed', 'error');
            }
        } catch (error) {
            this.showToast('Network error', 'error');
        }
    }

    async handleLogin() {
        const email = this.loginEmail?.value.trim();
        const password = this.loginPassword?.value.trim();

        if (!email || !password) {
            this.showToast('Please fill all fields', 'error');
            return;
        }

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();
            
            if (response.ok) {
                this.currentUser = data;
                localStorage.setItem('palette_user', JSON.stringify(data));
                
                this.updateLandingUserProfile();
                this.animateTransition(this.authContainer, this.chatContainer);
                
                // Проигрываем звук приветствия
                this.playSound('welcome');
                
                await this.loadChats();
                await this.loadFolders();
                this.updateUserInfo();
                this.updateUserStatus();
                this.setTheme(data.theme || 'light');
                
                // Регистрируем пользователя для звонков
                if (this.socket.connected) {
                    this.socket.emit('register_user', data.id);
                }
                
                this.showToast(`Welcome, ${data.display_name || data.username}!`, 'success');
            } else {
                if (data.googleLogin || data.githubLogin) {
                    this.showToast('This account uses social login', 'warning');
                } else {
                    this.showToast(data.error || 'Invalid credentials', 'error');
                }
            }
        } catch (error) {
            this.showToast('Login failed', 'error');
        }
    }

    async handleLogout() {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
        } catch (error) {}
        
        localStorage.removeItem('palette_user');
        localStorage.removeItem('palette_folders');
        this.currentUser = null;
        this.currentChat = null;
        this.customFolders = [];
        
        this.updateLandingUserProfile();
        this.animateTransition(this.chatContainer, this.landingContainer);
        this.closeModal(this.headerMenu);
        this.closeProfilePanel();
        this.closeRightPanel();
        
        // Проигрываем звук прощания
        this.playSound('buybuy');
        
        this.showToast('Signed out successfully', 'success');
    }

    // ============= FOLDERS =============
    
    loadCustomFolders() {
        const saved = localStorage.getItem('palette_folders');
        return saved ? JSON.parse(saved) : [];
    }

    saveCustomFolders() {
        localStorage.setItem('palette_folders', JSON.stringify(this.customFolders));
    }

    renderFolders() {
        if (!this.foldersList) return;
        
        // Keep default folders
        const defaultFolders = Array.from(this.foldersList.children).filter(
            child => child.dataset.default === 'true'
        );
        
        this.foldersList.innerHTML = '';
        
        // Add default folders
        defaultFolders.forEach(folder => {
            this.foldersList.appendChild(folder);
        });
        
        // Add custom folders
        this.customFolders.forEach(folder => {
            const folderItem = document.createElement('div');
            folderItem.className = 'folder-item';
            folderItem.dataset.folder = folder.id;
            folderItem.dataset.custom = 'true';
            folderItem.innerHTML = `
                <span class="material-symbols-outlined folder-icon">${folder.icon}</span>
                <span class="folder-name">${folder.name}</span>
                <span class="folder-count">0</span>
                <button class="icon-btn small delete-folder" data-folder-id="${folder.id}" title="Delete folder">
                    <span class="material-symbols-outlined">close</span>
                </button>
            `;
            
            folderItem.addEventListener('click', (e) => {
                if (!e.target.closest('.delete-folder')) {
                    this.selectCustomFolder(folder.id);
                }
            });
            
            folderItem.querySelector('.delete-folder')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteFolder(folder.id);
            });
            
            this.foldersList.appendChild(folderItem);
        });
        
        // Update counts
        this.updateFolderCounts();
    }

    async selectCustomFolder(folderId) {
        const folder = this.customFolders.find(f => f.id === folderId);
        if (!folder) return;
        
        this.currentFolder = folderId;
        
        // Highlight selected folder
        document.querySelectorAll('.folder-item').forEach(f => {
            f.classList.remove('active');
            if (f.dataset.folder === folderId) {
                f.classList.add('active');
            }
        });
        
        // Filter chats in this folder
        const folderChats = this.activeChats.filter(chat => 
            folder.chats?.includes(chat.id.toString())
        );
        
        this.renderCustomFolderChats(folderChats);
    }

    renderCustomFolderChats(chats) {
        if (!this.chatsList) return;
        
        if (chats.length === 0) {
            this.chatsList.innerHTML = '<div class="empty-state"><span class="material-symbols-outlined">folder</span><p>No chats in this folder</p></div>';
            return;
        }
        
        this.chatsList.innerHTML = chats.map(chat => this.createChatItem(chat)).join('');
        
        this.chatsList.querySelectorAll('.chat-item').forEach(item => {
            item.addEventListener('click', () => this.selectChat(item.dataset.chatId));
            item.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.showChatContextMenu(e, item.dataset.chatId);
            });
        });
    }

    async loadFolders() {
        try {
            const response = await fetch(`/api/folders/${this.currentUser.id}`);
            const folders = await response.json();
            this.updateFolderCounts(folders);
        } catch (error) {
            this.updateFolderCounts();
        }
    }

    updateFolderCounts(folders = null) {
        const counts = {
            inbox: folders?.inbox?.length || this.activeChats.length,
            direct: folders?.direct?.length || this.activeChats.filter(c => c.type === 'private').length,
            groups: folders?.groups?.length || this.activeChats.filter(c => c.type === 'group').length,
            channels: folders?.channels?.length || this.activeChats.filter(c => c.type === 'channel').length
        };
        
        // Update default folders
        document.querySelectorAll('.folder-item[data-default="true"]').forEach(folder => {
            const type = folder.dataset.folder;
            const countEl = folder.querySelector('.folder-count');
            if (countEl) countEl.textContent = counts[type] || '0';
        });
        
        // Update custom folders
        this.customFolders.forEach(folder => {
            const folderElement = document.querySelector(`.folder-item[data-folder="${folder.id}"]`);
            if (folderElement) {
                const countEl = folderElement.querySelector('.folder-count');
                const chatCount = folder.chats?.length || 0;
                if (countEl) countEl.textContent = chatCount;
            }
        });
    }

    openCreateFolderModal() {
        this.closeModal(this.headerMenu);
        this.openModal(this.createFolderModal);
        this.animateModal(this.createFolderModal);
        this.folderName.value = '';
    }

    createFolder() {
        const name = this.folderName?.value.trim();
        if (!name) {
            this.showToast('Folder name is required', 'error');
            return;
        }
        
        const icon = this.folderIcon?.value || 'folder';
        const id = 'folder_' + Date.now();
        
        const newFolder = {
            id,
            name,
            icon,
            chats: []
        };
        
        this.customFolders.push(newFolder);
        this.saveCustomFolders();
        this.renderFolders();
        
        this.closeModal(this.createFolderModal);
        this.showToast(`Folder "${name}" created!`, 'success');
    }

    deleteFolder(folderId) {
        if (confirm('Delete this folder? Chats will not be deleted.')) {
            this.customFolders = this.customFolders.filter(f => f.id !== folderId);
            this.saveCustomFolders();
            this.renderFolders();
            
            if (this.currentFolder === folderId) {
                this.currentFolder = 'inbox';
                document.querySelector('.folder-item[data-folder="inbox"]')?.classList.add('active');
                this.renderChatsList();
            }
            
            this.showToast('Folder deleted', 'success');
        }
    }

    moveChatToFolder(chatId, folderId) {
        const folder = this.customFolders.find(f => f.id === folderId);
        if (!folder) return;
        
        if (!folder.chats) folder.chats = [];
        
        // Remove from other folders
        this.customFolders.forEach(f => {
            if (f.chats) {
                f.chats = f.chats.filter(id => id !== chatId);
            }
        });
        
        // Add to selected folder
        if (!folder.chats.includes(chatId)) {
            folder.chats.push(chatId);
        }
        
        this.saveCustomFolders();
        this.renderFolders();
        this.showToast('Chat moved to folder', 'success');
    }

    // ============= PROFILE PANEL =============
    
    openProfilePanel() {
        if (!this.currentUser) {
            this.showToast('Please login first', 'error');
            return;
        }
        
        console.log('Opening profile panel for user:', this.currentUser);
        
        this.previousChat = this.currentChat;
        
        if (this.chatHeader) this.chatHeader.classList.add('hidden');
        if (this.messagesContainer) this.messagesContainer.classList.add('hidden');
        if (this.rightPanel) this.rightPanel.classList.add('hidden');
        
        // Прячем элементы ввода
        const inputActions = document.querySelector('.input-actions');
        const replyPreview = document.getElementById('reply-preview');
        const voiceIndicator = document.getElementById('voice-recording-indicator');
        
        if (inputActions) inputActions.classList.add('hidden');
        if (replyPreview) replyPreview.classList.add('hidden');
        if (voiceIndicator) voiceIndicator.classList.add('hidden');
        
        if (this.profilePanel) {
            this.profilePanel.classList.remove('hidden');
            this.profilePanel.classList.add('slide-in-right');
            this.loadProfileData();
            
            if (this.particlesContainer) {
                this.particlesContainer.classList.add('profile-mode');
            }
        } else {
            console.error('Profile panel element not found!');
            this.showToast('Profile panel not available', 'error');
        }
    }


    closeProfilePanel() {
        if (this.profilePanel) {
            this.profilePanel.classList.add('slide-out-right');
            setTimeout(() => {
                this.profilePanel.classList.add('hidden');
                this.profilePanel.classList.remove('slide-in-right', 'slide-out-right');
                
                if (this.chatHeader) this.chatHeader.classList.remove('hidden');
                if (this.messagesContainer) this.messagesContainer.classList.remove('hidden');
                
                // Show input elements
                const inputActions = document.querySelector('.input-actions');
                if (inputActions) inputActions.classList.remove('hidden');
                
                if (this.particlesContainer) {
                    this.particlesContainer.classList.remove('profile-mode');
                }
                
                if (this.previousChat) {
                    this.selectChat(this.previousChat.id);
                }
            }, 300);
        }
    }

    loadProfileData() {
        if (!this.currentUser) return;
        
        console.log('Loading profile data for user:', this.currentUser);
        
        // Основная информация
        if (this.panelDisplayName) {
            this.panelDisplayName.textContent = this.currentUser.display_name || this.currentUser.username || 'User';
        }
        
        if (this.panelUsername) {
            this.panelUsername.textContent = this.currentUser.username || '@username';
        }
        
        if (this.panelBio) {
            this.panelBio.textContent = this.currentUser.bio || 'No bio yet';
        }
        
        // Статус
        if (this.panelStatus) {
            const status = this.currentUser.status || 'online';
            this.panelStatus.innerHTML = `
                <span class="status-dot ${status}"></span>
                <span>${this.getStatusText(status)}</span>
                ${this.currentUser.custom_status ? `<span class="custom-status">• ${this.currentUser.custom_status}</span>` : ''}
            `;
        }
        
        // Аватар - ИСПРАВЛЕНО!
        if (this.panelAvatarPreview) {
            if (this.currentUser.avatar) {
                const avatarUrl = this.currentUser.avatar.startsWith('http') 
                    ? this.currentUser.avatar 
                    : `https://lh3.googleusercontent.com/a/${this.currentUser.avatar}`;
                this.panelAvatarPreview.innerHTML = `<img src="${avatarUrl}" alt="avatar" style="width:100%; height:100%; object-fit:cover;">`;
                this.panelAvatarPreview.style.background = 'none';
            } else {
                const initial = (this.currentUser.display_name || this.currentUser.username || 'U').charAt(0).toUpperCase();
                this.panelAvatarPreview.textContent = initial;
                this.panelAvatarPreview.style.background = 'linear-gradient(135deg, #6750a4, #9a82db)';
                this.panelAvatarPreview.style.display = 'flex';
                this.panelAvatarPreview.style.alignItems = 'center';
                this.panelAvatarPreview.style.justifyContent = 'center';
                this.panelAvatarPreview.style.color = 'white';
                this.panelAvatarPreview.style.fontSize = '48px';
            }
        }
        
        // Поля редактирования - СТИЛИ БУДУТ В CSS
        if (this.panelEditName) {
            this.panelEditName.value = this.currentUser.display_name || '';
        }
        
        if (this.panelEditBio) {
            this.panelEditBio.value = this.currentUser.bio || '';
        }
        
        if (this.panelTheme) {
            this.panelTheme.value = this.currentUser.theme || 'light';
        }
        
        if (this.panelChatBg) {
            this.panelChatBg.value = this.currentUser.chat_bg || 'default';
        }
        
        if (this.panelCover) {
            this.panelCover.value = this.currentUser.profile_header || 'default';
            const headerElement = document.querySelector('.profile-panel-cover');
            if (headerElement) {
                headerElement.setAttribute('data-header', this.currentUser.profile_header || 'default');
            }
        }
        
        // Информация об аккаунте
        if (this.accountUsername) {
            this.accountUsername.textContent = this.currentUser.username || '@username';
        }
        
        if (this.accountEmail) {
            this.accountEmail.textContent = this.currentUser.email || 'email@example.com';
        }
        
        if (this.accountJoined) {
            this.accountJoined.textContent = this.formatJoinDate(this.currentUser.created_at);
        }
        
        console.log('Profile data loaded successfully');
    }

    async saveProfileFromPanel() {
        const updates = {
            userId: this.currentUser.id,
            display_name: this.panelEditName?.value.trim() || this.currentUser.username,
            bio: this.panelEditBio?.value.trim() || '',
            theme: this.panelTheme?.value || 'light',
            profile_header: this.panelCover?.value || 'default'
        };
        
        try {
            const response = await fetch('/api/user/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });

            const data = await response.json();
            
            if (data.success) {
                this.currentUser = { 
                    ...this.currentUser, 
                    display_name: updates.display_name,
                    bio: updates.bio,
                    theme: updates.theme,
                    profile_header: updates.profile_header
                };
                
                localStorage.setItem('palette_user', JSON.stringify(this.currentUser));
                
                this.updateUserInfo();
                this.loadProfileData();
                this.updateLandingUserProfile();
                
                if (updates.theme) {
                    this.setTheme(updates.theme);
                }
                
                if (this.panelChatBg && this.panelChatBg.value !== this.currentUser.chat_bg) {
                    await this.saveChatBackground(this.panelChatBg.value);
                }
                
                this.showToast('Profile updated successfully', 'success');
            }
        } catch (error) {
            console.error('Profile update error:', error);
            this.showToast('Failed to update profile', 'error');
        }
    }

    async handlePanelAvatarChange(e) {
        const file = e.target.files?.[0];
        if (!file) return;
        
        if (!file.type.startsWith('image/')) {
            this.showToast('Please select an image file', 'error');
            return;
        }
        
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.currentUser.avatar = data.url;
                localStorage.setItem('palette_user', JSON.stringify(this.currentUser));
                
                if (this.panelAvatarPreview) {
                    this.panelAvatarPreview.innerHTML = `<img src="${data.url}" alt="avatar">`;
                    this.panelAvatarPreview.style.background = 'none';
                }
                
                this.updateUserInfo();
                this.updateLandingUserProfile();
                this.showToast('Avatar updated', 'success');
            }
        } catch (error) {
            console.error('Avatar upload error:', error);
            this.showToast('Failed to upload avatar', 'error');
        }
    }

    changeProfileHeader() {
        const header = this.panelCover?.value;
        const headerElement = document.querySelector('.profile-panel-cover');
        if (headerElement) {
            headerElement.setAttribute('data-header', header);
        }
    }

    // ============= USER INFO =============
    
    updateUserInfo() {
        if (this.currentUser && this.currentUsername) {
            this.currentUsername.textContent = this.currentUser.display_name || this.currentUser.username || 'User';
            
            if (this.currentUserAvatar) {
                if (this.currentUser.avatar) {
                    const avatarUrl = this.currentUser.avatar.startsWith('http') 
                        ? this.currentUser.avatar 
                        : `https://lh3.googleusercontent.com/a/${this.currentUser.avatar}`;
                    this.currentUserAvatar.innerHTML = `<img src="${avatarUrl}" alt="avatar">`;
                    this.currentUserAvatar.style.background = 'none';
                } else {
                    const initial = (this.currentUser.display_name || this.currentUser.username || 'U').charAt(0).toUpperCase();
                    this.currentUserAvatar.textContent = initial;
                    this.currentUserAvatar.style.background = 'linear-gradient(135deg, #6750a4, #9a82db)';
                }
            }
        }
    }

    updateUserStatus() {
        if (!this.userStatus || !this.currentUser) return;
        
        const status = this.currentUser.status || 'online';
        const customStatus = this.currentUser.custom_status;
        
        this.userStatus.innerHTML = `
            <span class="status-dot ${status}"></span>
            <span>${this.getStatusText(status)}</span>
            ${customStatus ? `<span class="custom-status-text">• ${customStatus}</span>` : ''}
        `;
    }

    getStatusText(status) {
        return {
            online: 'Online',
            away: 'Away',
            busy: 'Do not disturb',
            invisible: 'Invisible'
        }[status] || 'Online';
    }

    // ============= CHAT HEADER =============
    
    async updateChatHeader() {
        if (!this.currentChat) return;
        
        const headerInfo = document.querySelector('.chat-header-info');
        if (!headerInfo) return;
        
        let avatarHtml = '';
        let name = this.currentChat.name || 'Chat';
        let statusHtml = '';
        
        if (this.currentChat.type === 'private') {
            const otherUserId = this.currentChat.participants?.find(id => id != this.currentUser?.id);
            if (otherUserId) {
                try {
                    const response = await fetch(`/api/users/${otherUserId}`);
                    const user = await response.json();
                    
                    if (user.avatar) {
                        const avatarUrl = user.avatar.startsWith('http') 
                            ? user.avatar 
                            : `https://lh3.googleusercontent.com/a/${user.avatar}`;
                        avatarHtml = `<img src="${avatarUrl}" alt="avatar" class="chat-header-avatar">`;
                    } else {
                        const initial = (user.display_name || user.username || 'U').charAt(0).toUpperCase();
                        avatarHtml = `<div class="chat-header-avatar placeholder">${initial}</div>`;
                    }
                    
                    name = user.display_name || user.username || name;
                    
                    if (user.status === 'online') {
                        statusHtml = '<span class="chat-header-status online">online</span>';
                    } else {
                        const lastSeen = this.formatLastSeen(user.last_seen);
                        statusHtml = `<span class="chat-header-status offline">${lastSeen}</span>`;
                    }
                } catch (error) {
                    console.error('Failed to load user:', error);
                    avatarHtml = '<div class="chat-header-avatar placeholder">?</div>';
                    statusHtml = '<span class="chat-header-status offline">был(а) в сети давно</span>';
                }
            }
        } else if (this.currentChat.type === 'group') {
            avatarHtml = '<div class="chat-header-avatar group"><span class="material-symbols-outlined">group</span></div>';
            statusHtml = `<span class="chat-header-status">${this.currentChat.members_count || this.currentChat.participants?.length || 0} участников</span>`;
        } else if (this.currentChat.type === 'channel') {
            avatarHtml = '<div class="chat-header-avatar channel"><span class="material-symbols-outlined">campaign</span></div>';
            statusHtml = `<span class="chat-header-status">${this.currentChat.subscribers_count || 0} подписчиков</span>`;
        }
        
        headerInfo.innerHTML = `
            ${avatarHtml}
            <div class="chat-header-text">
                <h3>${name}</h3>
                ${statusHtml}
            </div>
        `;
        
        // Показываем кнопки звонка только для приватных чатов
        if (this.currentChat.type === 'private') {
            this.callButtons?.classList.remove('hidden');
        } else {
            this.callButtons?.classList.add('hidden');
        }
    }

    // ============= CHAT BACKGROUND =============
    
    async saveChatBackground(background) {
        try {
            const response = await fetch('/api/user/chat-bg', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: this.currentUser.id,
                    background
                })
            });

            const data = await response.json();
            
            if (data.success) {
                this.currentUser.chat_bg = background;
                localStorage.setItem('palette_user', JSON.stringify(this.currentUser));
                this.applyChatBackground();
                this.showToast('Chat background updated', 'success');
            }
        } catch (error) {
            this.showToast('Failed to update background', 'error');
        }
    }

    applyChatBackground() {
        if (this.messagesContainer && this.currentUser?.chat_bg) {
            this.messagesContainer.setAttribute('data-bg', this.currentUser.chat_bg);
        }
    }

    // ============= CHANNELS =============
    
    openCreateChannelModal() {
        this.closeModal(this.headerMenu);
        this.openModal(this.createChannelModal);
        this.animateModal(this.createChannelModal);
    }

    async createChannel() {
        const name = this.channelName?.value.trim();
        if (!name) {
            this.showToast('Channel name is required', 'error');
            return;
        }

        try {
            const response = await fetch('/api/channels/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    description: this.channelDescription?.value.trim(),
                    adminId: this.currentUser.id,
                    isPrivate: this.channelPrivate?.checked ? 1 : 0
                })
            });

            const data = await response.json();
            
            if (response.ok) {
                this.showToast(`✨ Channel "${name}" created!`, 'success');
                this.closeModal(this.createChannelModal);
                this.channelName.value = '';
                this.channelDescription.value = '';
                this.channelPrivate.checked = false;
                await this.loadChats();
                await this.loadFolders();
                
                setTimeout(() => {
                    const newChat = document.querySelector(`.chat-item[data-chat-id="${data.id}"]`);
                    if (newChat) {
                        newChat.classList.add('highlight');
                        setTimeout(() => newChat.classList.remove('highlight'), 1000);
                    }
                }, 100);
            }
        } catch (error) {
            console.error('Channel creation error:', error);
            this.showToast('Failed to create channel', 'error');
        }
    }

    // ============= GROUPS =============
    
    openCreateGroupModal() {
        this.closeModal(this.headerMenu);
        this.openModal(this.createGroupModal);
        this.animateModal(this.createGroupModal);
        
        this.selectedMembersList = [];
        this.updateSelectedMembers();
        this.groupMemberSearch.value = '';
        this.userSearchResults.innerHTML = '';
    }

    async searchUsers(query) {
        if (!query || query.length < 2) {
            this.userSearchResults.innerHTML = '';
            return;
        }

        try {
            const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}&currentUserId=${this.currentUser.id}`);
            const users = await response.json();
            this.renderUserSearchResults(users);
        } catch (error) {
            console.error('Search error:', error);
        }
    }

    renderUserSearchResults(users) {
        if (users.length === 0) {
            this.userSearchResults.innerHTML = '<div class="hint">No users found</div>';
            return;
        }

        this.userSearchResults.innerHTML = users.map(user => {
            const isSelected = this.selectedMembersList.includes(user.id.toString());
            return `
                <div class="search-result-item ${isSelected ? 'selected' : ''}" data-user-id="${user.id}">
                    <div class="result-avatar">${user.display_name?.charAt(0) || user.username?.charAt(0) || 'U'}</div>
                    <div class="result-info">
                        <div class="result-name">${user.display_name || user.username}</div>
                        <div class="result-username">${user.username}</div>
                    </div>
                    <span class="material-symbols-outlined">${isSelected ? 'check_circle' : 'add_circle'}</span>
                </div>
            `;
        }).join('');

        this.userSearchResults.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', () => this.toggleMemberSelection(item.dataset.userId));
        });
    }

    toggleMemberSelection(userId) {
        if (!this.selectedMembersList) this.selectedMembersList = [];
        const index = this.selectedMembersList.indexOf(userId);
        
        if (index === -1) {
            this.selectedMembersList.push(userId);
        } else {
            this.selectedMembersList.splice(index, 1);
        }
        
        this.updateSelectedMembers();
        this.searchUsers(this.groupMemberSearch.value);
    }

    async updateSelectedMembers() {
        if (!this.selectedMembersList || this.selectedMembersList.length === 0) {
            this.selectedMembers.innerHTML = '<span class="hint">Selected members will appear here</span>';
            this.createGroupBtn.disabled = true;
            return;
        }

        this.createGroupBtn.disabled = false;

        try {
            const users = await Promise.all(
                this.selectedMembersList.map(id => 
                    fetch(`/api/users/${id}`).then(res => res.json())
                )
            );
            
            this.selectedMembers.innerHTML = users.map(user => `
                <span class="member-tag" data-user-id="${user.id}">
                    ${user.display_name || user.username}
                    <span class="material-symbols-outlined remove" onclick="window.palette.removeMember('${user.id}')">close</span>
                </span>
            `).join('');
        } catch (error) {
            console.error('Failed to load members:', error);
        }
    }

    removeMember(userId) {
        this.selectedMembersList = this.selectedMembersList.filter(id => id !== userId);
        this.updateSelectedMembers();
        this.searchUsers(this.groupMemberSearch.value);
    }

    async createGroup() {
        const name = this.groupName?.value.trim();
        if (!name) {
            this.showToast('Group name is required', 'error');
            return;
        }

        if (!this.selectedMembersList || this.selectedMembersList.length === 0) {
            this.showToast('Add at least one member', 'error');
            return;
        }

        try {
            const response = await fetch('/api/groups/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    adminId: this.currentUser.id,
                    members: this.selectedMembersList
                })
            });

            const data = await response.json();
            
            if (response.ok) {
                this.showToast(`✨ Group "${name}" created!`, 'success');
                this.closeModal(this.createGroupModal);
                this.groupName.value = '';
                this.groupMemberSearch.value = '';
                this.selectedMembersList = [];
                this.updateSelectedMembers();
                await this.loadChats();
                await this.loadFolders();
                
                setTimeout(() => {
                    const newChat = document.querySelector(`.chat-item[data-chat-id="${data.id}"]`);
                    if (newChat) {
                        newChat.classList.add('highlight');
                        setTimeout(() => newChat.classList.remove('highlight'), 1000);
                    }
                }, 100);
            }
        } catch (error) {
            console.error('Group creation error:', error);
            this.showToast('Failed to create group', 'error');
        }
    }

    // ============= CHATS =============
    
    async loadChats() {
        if (!this.currentUser?.id) return;

        try {
            const response = await fetch(`/api/chats/${this.currentUser.id}`);
            const chats = await response.json();
            
            this.activeChats = Array.isArray(chats) ? chats.map(chat => {
                if (chat.type === 'private' && !chat.participants) {
                    chat.participants = [this.currentUser.id];
                    if (chat.other_user) {
                        chat.participants.push(chat.other_user.id);
                    }
                }
                return chat;
            }) : [];
            
            this.renderChatsList();
            this.updateFolderCounts();
            await this.loadChatAvatars();
        } catch (error) {
            console.error('Failed to load chats:', error);
            this.activeChats = [];
            this.renderChatsList();
        }
    }

    renderChatsList() {
        if (!this.chatsList) return;

        let filteredChats = this.activeChats;
        
        if (this.currentFolder === 'direct') {
            filteredChats = this.activeChats.filter(c => c.type === 'private');
        } else if (this.currentFolder === 'groups') {
            filteredChats = this.activeChats.filter(c => c.type === 'group');
        } else if (this.currentFolder === 'channels') {
            filteredChats = this.activeChats.filter(c => c.type === 'channel');
        } else {
            const folder = this.customFolders?.find(f => f.id === this.currentFolder);
            if (folder) {
                filteredChats = this.activeChats.filter(chat => 
                    folder.chats?.includes(chat.id.toString())
                );
            }
        }

        if (!filteredChats || filteredChats.length === 0) {
            this.chatsList.innerHTML = '<div class="empty-state"><span class="material-symbols-outlined">chat</span><p>No chats in this folder</p></div>';
            return;
        }

        this.chatsList.innerHTML = filteredChats.map(chat => this.createChatItem(chat)).join('');
        
        this.chatsList.querySelectorAll('.chat-item').forEach(item => {
            item.addEventListener('click', () => this.selectChat(item.dataset.chatId));
            item.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.showChatContextMenu(e, item.dataset.chatId);
            });
        });
    }

    async selectFolder(e) {
        const folder = e.currentTarget;
        this.folderItems.forEach(f => f.classList.remove('active'));
        folder.classList.add('active');
        folder.classList.add('pop');
        setTimeout(() => folder.classList.remove('pop'), 200);
        
        this.currentFolder = folder.dataset.folder;
        this.renderChatsList();
    }


    createChatItem(chat) {
        const isNarrow = this.sidebarWidth < 280;
        const isActive = this.currentChat?.id == chat.id;
        
        let avatarHtml = '';
        
        if (chat.type === 'private') {
            avatarHtml = '<span class="material-symbols-outlined">person</span>';
        } else if (chat.type === 'group') {
            avatarHtml = '<span class="material-symbols-outlined">group</span>';
        } else if (chat.type === 'channel') {
            avatarHtml = '<span class="material-symbols-outlined">campaign</span>';
        } else {
            avatarHtml = '<span class="material-symbols-outlined">chat</span>';
        }
        
        const lastMessage = chat.last_message || 'No messages';
        const time = chat.last_message_time ? this.formatTime(chat.last_message_time) : '';
        
        if (isNarrow) {
            return `<div class="chat-item ${isActive ? 'active' : ''}" data-chat-id="${chat.id}" data-type="${chat.type}" title="${chat.name || 'Chat'}">
                        <div class="chat-avatar">${avatarHtml}</div>
                    </div>`;
        }
        
        return `<div class="chat-item ${isActive ? 'active' : ''}" data-chat-id="${chat.id}" data-type="${chat.type}">
                    <div class="chat-avatar">${avatarHtml}</div>
                    <div class="chat-details">
                        <div class="chat-name">${chat.name || 'Unnamed'}</div>
                        <div class="chat-last-message">${this.truncateText(lastMessage, 30)}</div>
                    </div>
                    <div class="chat-meta">
                        <span class="chat-time">${time}</span>
                    </div>
                </div>`;
    }

    async loadChatAvatars() {
        for (const chat of this.activeChats) {
            if (chat.type === 'private') {
                let otherUserId = null;
                
                if (chat.participants && Array.isArray(chat.participants)) {
                    otherUserId = chat.participants.find(id => id != this.currentUser?.id);
                }
                
                if (!otherUserId && chat.other_user) {
                    otherUserId = chat.other_user.id;
                }
                
                if (otherUserId) {
                    try {
                        const response = await fetch(`/api/users/${otherUserId}`);
                        const user = await response.json();
                        
                        const chatItem = document.querySelector(`.chat-item[data-chat-id="${chat.id}"] .chat-avatar`);
                        if (chatItem) {
                            if (user.avatar) {
                                const avatarUrl = user.avatar.startsWith('http') 
                                    ? user.avatar 
                                    : `https://lh3.googleusercontent.com/a/${user.avatar}`;
                                chatItem.innerHTML = `<img src="${avatarUrl}" alt="avatar" onerror="this.onerror=null; this.parentElement.innerHTML='<span class=\'material-symbols-outlined\'>person</span>'">`;
                            } else {
                                const initial = (user.display_name || user.username || 'U').charAt(0).toUpperCase();
                                chatItem.innerHTML = `<span class="avatar-initial">${initial}</span>`;
                            }
                        }
                    } catch (error) {
                        console.error('Failed to load chat avatar for chat', chat.id, error);
                    }
                }
            }
        }
    }

    async selectChat(chatId) {
        this.currentChat = this.activeChats.find(c => c.id == chatId);
        if (!this.currentChat) return;
        
        this.socket.emit('join_chat', chatId);
        
        this.chatsList.querySelectorAll('.chat-item').forEach(item => {
            item.classList.toggle('active', item.dataset.chatId == chatId);
        });
        
        this.closeProfilePanel();
        this.closeRightPanel();
        await this.updateChatHeader();
        await this.loadMessages(chatId);
    }

    // ============= MESSAGES =============
    
    async loadMessages(chatId) {
        if (!this.currentUser?.id) {
            console.error('No current user');
            return;
        }
        
        try {
            const response = await fetch(`/api/messages/${chatId}?userId=${this.currentUser.id}`);
            
            if (!response.ok) {
                console.error('Failed to load messages:', response.status);
                this.messages = [];
                this.renderMessages();
                return;
            }
            
            const messages = await response.json();
            this.messages = Array.isArray(messages) ? messages : [];
            
            // Обновляем последнее сообщение в списке чатов
            if (this.messages.length > 0) {
                const lastMessage = this.messages[this.messages.length - 1];
                this.updateChatListLastMessage(lastMessage);
            }
            
            this.renderMessages();
        } catch (error) {
            console.error('Failed to load messages:', error);
            this.messages = [];
            this.renderMessages();
        }
    }


    renderMessages() {
        if (!this.messagesContainer) return;

        if (!this.messages || !Array.isArray(this.messages) || this.messages.length === 0) {
            this.messagesContainer.innerHTML = '<div class="empty-messages"><span class="material-symbols-outlined">chat</span><p>No messages yet</p></div>';
            return;
        }

        this.messagesContainer.innerHTML = this.messages.map(msg => this.createMessageElement(msg)).join('');
        this.scrollToBottom();
        
        this.messagesContainer.querySelectorAll('.message').forEach(msg => {
            msg.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                const message = this.messages.find(m => m.id == msg.dataset.messageId);
                this.showMessageContextMenu(e, message);
            });
        });
    }

    createMessageElement(message) {
        if (!message) return '';
        
        const isOwn = message.user_id === this.currentUser?.id;
        const displayName = message.display_name || message.username || 'User';
        const time = this.formatTime(message.created_at);
        
        let avatarHtml = '';
        if (message.avatar) {
            const avatarUrl = message.avatar.startsWith('http') 
                ? message.avatar 
                : `https://lh3.googleusercontent.com/a/${message.avatar}`;
            avatarHtml = `<img src="${avatarUrl}" alt="avatar">`;
        } else {
            avatarHtml = displayName.charAt(0).toUpperCase();
        }
        
        let content = '';
        if (message.type === 'text') {
            content = `<div class="message-text">${this.escapeHtml(message.content || '')}</div>`;
        } else if (message.type === 'file') {
            const isImage = message.file_url?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
            if (isImage) {
                content = `<div class="message-image-container" onclick="window.open('${message.file_url}', '_blank')">
                            <img src="${message.file_url}" alt="image">
                        </div>`;
            } else {
                content = `<a href="${message.file_url}" class="message-file" download>
                            <span class="material-symbols-outlined">description</span>
                            <span>${message.content || 'File'}</span>
                        </a>`;
            }
        } else if (message.type === 'voice') {
            content = `<div class="voice-message" onclick="this.classList.add('playing'); document.getElementById('audio-player').src='${message.file_url}'; document.getElementById('audio-player').play()">
                        <span class="material-symbols-outlined">play_circle</span>
                        <div class="voice-wave">
                            <span></span><span></span><span></span><span></span><span></span>
                        </div>
                        <span class="voice-duration">${message.content || '0:00'}</span>
                    </div>`;
        }
        
        let forwardHtml = '';
        if (message.forwarded_from) {
            forwardHtml = `<div class="message-forward">Forwarded</div>`;
        }
        
        let replyHtml = '';
        if (message.reply_to) {
            replyHtml = `<div class="message-reply" onclick="window.palette?.scrollToMessage(${message.reply_to})">
                            <span class="material-symbols-outlined">reply</span>
                            <span>Reply</span>
                        </div>`;
        }
        
        return `<div class="message ${isOwn ? 'own' : ''}" data-message-id="${message.id}">
                    <div class="message-avatar">${avatarHtml}</div>
                    <div class="message-content">
                        <div class="message-header">
                            <span class="message-author">${displayName}</span>
                            <span class="message-time">${time}</span>
                        </div>
                        ${forwardHtml}
                        ${replyHtml}
                        ${content}
                    </div>
                </div>`;
    }

    async sendMessage() {
        const content = this.messageInput?.value.trim();
        if (!content && !this.replyToMessage && !this.fileInput?.files.length) return;

        const tempId = 'temp-' + Date.now();
        const tempMessage = {
            id: tempId,
            chat_id: this.currentChat?.id,
            user_id: this.currentUser?.id,
            content,
            type: 'text',
            created_at: new Date().toISOString(),
            username: this.currentUser.username,
            display_name: this.currentUser.display_name || this.currentUser.username,
            avatar: this.currentUser.avatar,
            temp: true
        };

        if (!this.messages) this.messages = [];
        this.displayMessage(tempMessage);
        this.messageInput.value = '';
        this.messageInput.style.height = 'auto';

        try {
            const response = await fetch('/api/messages/send-encrypted', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chatId: this.currentChat?.id,
                    userId: this.currentUser?.id,
                    content,
                    replyTo: this.replyToMessage?.id || null,
                    username: this.currentUser.username,
                    display_name: this.currentUser.display_name || this.currentUser.username
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to send message');
            }

            const message = await response.json();
            
            const tempElement = document.querySelector(`.message[data-message-id="${tempId}"]`);
            if (tempElement) tempElement.remove();
            
            if (this.messages) {
                this.messages = this.messages.filter(m => m.id !== tempId);
            }
            
            this.displayMessage(message);
            this.socket.emit('send_message', {
                ...message,
                chatId: this.currentChat?.id
            });
            this.cancelReplyAction();
        } catch (error) {
            console.error('Send message error:', error);
            this.showToast('Failed to send message', 'error');
        }
    }

    displayMessage(message) {
        if (!this.messages) this.messages = [];
        
        const exists = Array.isArray(this.messages) && this.messages.some(m => m && m.id === message.id);
        
        if (!exists) {
            this.messages.push(message);
            
            if (this.currentChat?.id == message.chat_id) {
                const container = this.messagesContainer;
                const emptyState = container?.querySelector('.empty-messages');
                
                if (emptyState) {
                    this.renderMessages();
                } else {
                    container?.insertAdjacentHTML('beforeend', this.createMessageElement(message));
                    this.scrollToBottom();
                    
                    const newMessage = container?.lastElementChild;
                    if (newMessage) {
                        newMessage.classList.add('message-appear');
                        setTimeout(() => newMessage.classList.remove('message-appear'), 300);
                    }
                }
            }
        }
    }

    // ============= TYPING =============
    
    handleTyping() {
        if (!this.currentChat || !this.currentUser) return;
        
        this.socket.emit('typing', {
            chatId: this.currentChat.id,
            userId: this.currentUser.id,
            isTyping: true
        });
        
        clearTimeout(this.typingTimeout);
        this.typingTimeout = setTimeout(() => {
            this.socket.emit('typing', {
                chatId: this.currentChat.id,
                userId: this.currentUser.id,
                isTyping: false
            });
        }, 1000);
    }

    showTypingIndicator(isTyping) {
        if (this.typingIndicator) {
            this.typingIndicator.classList.toggle('hidden', !isTyping);
        }
    }

    // ============= VOICE RECORDING =============
    
    async toggleVoiceRecording() {
        if (this.isRecording) {
            this.stopVoiceRecording();
        } else {
            await this.startVoiceRecording();
        }
    }

    async startVoiceRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];
            
            this.mediaRecorder.ondataavailable = (event) => {
                this.audioChunks.push(event.data);
            };
            
            this.mediaRecorder.onstop = () => {
                stream.getTracks().forEach(track => track.stop());
            };
            
            this.mediaRecorder.start();
            this.isRecording = true;
            this.recordingStartTime = Date.now();
            
            // МИНИМАЛИСТИЧНЫЙ ИНДИКАТОР
            const indicator = document.getElementById('voice-recording-indicator');
            if (indicator) {
                indicator.classList.remove('hidden');
                indicator.classList.add('slide-up');
                this.updateVoiceTimer();
            }
        } catch (error) {
            console.error('Voice recording error:', error);
            this.showToast('Microphone access denied', 'error');
        }
    }

    stopVoiceRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
        }
    }

    cancelVoiceRecording() {
        this.stopVoiceRecording();
        this.audioChunks = [];
        
        const indicator = document.getElementById('voice-recording-indicator');
        if (indicator) {
            indicator.classList.add('slide-down');
            setTimeout(() => {
                indicator.classList.add('hidden');
                indicator.classList.remove('slide-up', 'slide-down');
                if (this.voiceTimer) this.voiceTimer.textContent = '0:00';
            }, 200);
        }
    }

    async sendVoiceRecording() {
        if (this.audioChunks.length === 0) {
            this.showToast('No recording to send', 'error');
            return;
        }
        
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('file', audioBlob, `voice-${Date.now()}.webm`);
        formData.append('chatId', this.currentChat?.id);
        formData.append('userId', this.currentUser?.id);
        formData.append('content', this.formatDuration(this.recordingStartTime, Date.now()));
        
        // Добавляем получателей для шифрования
        if (this.currentChat?.participants) {
            formData.append('recipients', JSON.stringify(this.currentChat.participants));
        }
        
        try {
            // Показываем индикатор отправки
            const indicator = document.getElementById('voice-recording-indicator');
            if (indicator) {
                indicator.classList.add('sending');
            }
            
            const response = await fetch('/api/messages/send-encrypted', {
                method: 'POST',
                body: formData
            });
            
            const message = await response.json();
            
            if (response.ok) {
                this.socket.emit('send_message', {
                    ...message,
                    chatId: this.currentChat?.id
                });
                this.displayMessage(message);
                this.cancelVoiceRecording();
                this.showToast('Voice message sent', 'success');
            } else {
                this.showToast('Failed to send voice message', 'error');
            }
        } catch (error) {
            console.error('Voice send error:', error);
            this.showToast('Failed to send voice message', 'error');
        }
    }


    updateVoiceTimer() {
        if (!this.isRecording) return;
        const duration = Date.now() - this.recordingStartTime;
        if (this.voiceTimer) this.voiceTimer.textContent = this.formatDurationFromMs(duration);
        setTimeout(() => this.updateVoiceTimer(), 1000);
    }

    // ============= FILE UPLOAD =============
    
    async handleFileUpload() {
        const files = this.fileInput?.files;
        if (!files || files.length === 0) return;
        
        for (const file of files) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('chatId', this.currentChat?.id);
            formData.append('userId', this.currentUser?.id);
            formData.append('content', file.name);
            
            try {
                const response = await fetch('/api/messages/send', {
                    method: 'POST',
                    body: formData
                });
                
                const message = await response.json();
                
                if (response.ok) {
                    this.socket.emit('send_message', {
                        ...message,
                        chatId: this.currentChat?.id
                    });
                    this.displayMessage(message);
                }
            } catch (error) {
                this.showToast(`Failed to upload ${file.name}`, 'error');
            }
        }
        
        this.fileInput.value = '';
    }

    // ============= THEME =============
    
    loadTheme() {
        const savedTheme = localStorage.getItem('palette_theme');
        
        if (savedTheme) {
            this.setTheme(savedTheme);
            return;
        }
        
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        this.setTheme(prefersDark ? 'dark' : 'light');
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
        this.showToast(`${newTheme === 'dark' ? '🌙' : '☀️'} Theme changed to ${newTheme}`, 'info');
    }

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('palette_theme', theme);
        
        if (this.currentUser) {
            this.currentUser.theme = theme;
        }
        
        const themeIcons = document.querySelectorAll('.theme-toggle-icon');
        themeIcons.forEach(icon => {
            if (icon) icon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
        });
    }

    // ============= PARTICLES =============
    
    initParticles() {
        if (!this.particlesContainer) return;
        
        this.particlesContainer.innerHTML = '';
        
        const canvas = document.createElement('canvas');
        canvas.id = 'particles-canvas';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '5';
        
        this.particlesContainer.appendChild(canvas);
        this.particlesCanvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
        
        this.resizeCanvas();
        this.startParticles();
    }

    startParticles() {
        if (this.particleInterval) clearInterval(this.particleInterval);
        
        for (let i = 0; i < 20; i++) this.createParticle();
        
        this.particleInterval = setInterval(() => {
            this.createParticle();
            this.animateParticles();
        }, 50);
    }

    createParticle() {
        if (!this.particlesCanvas) return;
        
        this.particles.push({
            x: Math.random() * this.particlesCanvas.width,
            y: this.particlesCanvas.height - 10,
            size: Math.random() * 6 + 2,
            speed: Math.random() * 1.5 + 0.5,
            opacity: Math.random() * 0.7 + 0.3,
            color: `rgba(76, 175, 80, ${Math.random() * 0.5 + 0.3})`
        });
    }

    animateParticles() {
        if (!this.ctx || !this.particlesCanvas) return;
        
        this.ctx.clearRect(0, 0, this.particlesCanvas.width, this.particlesCanvas.height);
        
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.y -= p.speed;
            p.opacity -= 0.003;
            p.x += Math.sin(Date.now() * 0.001 + i) * 0.3;
            
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fillStyle = p.color;
            this.ctx.shadowColor = '#4CAF50';
            this.ctx.shadowBlur = 8;
            this.ctx.fill();
            
            if (p.y < -20 || p.opacity <= 0) {
                this.particles.splice(i, 1);
            }
        }
        
        this.ctx.shadowBlur = 0;
    }

    stopParticles() {
        if (this.particleInterval) {
            clearInterval(this.particleInterval);
            this.particleInterval = null;
        }
    }

    resizeCanvas() {
        if (!this.particlesCanvas || !this.particlesContainer) return;
        const rect = this.particlesContainer.getBoundingClientRect();
        this.particlesCanvas.width = rect.width || 300;
        this.particlesCanvas.height = rect.height || 50;
    }

    // ============= RIGHT PANEL =============
    
    async openRightPanel() {
        if (!this.currentChat) {
            this.showToast('Select a chat first', 'error');
            return;
        }
        
        this.rightPanel?.classList.remove('hidden');
        this.rightPanel?.classList.add('slide-in-right');
        
        await this.loadChatInfo();
    }

    closeRightPanel() {
        this.rightPanel?.classList.add('slide-out-right');
        setTimeout(() => {
            this.rightPanel?.classList.add('hidden');
            this.rightPanel?.classList.remove('slide-in-right', 'slide-out-right');
        }, 300);
    }

    async loadChatInfo() {
        try {
            const response = await fetch(`/api/chats/${this.currentChat.id}/info?userId=${this.currentUser.id}`);
            const data = await response.json();
            
            this.currentChatInfo = data;
            this.renderRightPanel();
        } catch (error) {
            console.error('Failed to load chat info:', error);
        }
    }

    renderRightPanel() {
        if (!this.currentChatInfo) return;
        
        const chat = this.currentChatInfo;
        const isAdmin = chat.isAdmin;
        
        if (this.panelChatAvatar) {
            if (chat.type === 'private') {
                const otherUserId = chat.participants?.find(id => id != this.currentUser?.id);
                if (otherUserId) {
                    this.loadUserAvatar(otherUserId, this.panelChatAvatar);
                }
            } else if (chat.avatar) {
                this.panelChatAvatar.innerHTML = `<img src="${chat.avatar}" alt="avatar">`;
            } else {
                const icon = chat.type === 'group' ? 'group' : 'campaign';
                this.panelChatAvatar.innerHTML = `<span class="material-symbols-outlined">${icon}</span>`;
            }
        }
        
        if (this.panelChatName) {
            this.panelChatName.textContent = chat.name;
        }
        
        if (this.panelChatDescription) {
            this.panelChatDescription.textContent = chat.description || 'No description';
        }
        
        if (this.panelChatType) {
            const typeText = {
                private: 'Private Chat',
                group: 'Group',
                channel: 'Channel'
            }[chat.type] || 'Chat';
            
            const membersText = chat.type === 'private' ? '' 
                : chat.type === 'group' ? ` · ${chat.members_count || chat.participants?.length || 0} members`
                : ` · ${chat.subscribers_count || 0} subscribers`;
            
            this.panelChatType.textContent = `${typeText}${membersText}`;
        }
        
        if (this.panelInviteLink) {
            this.panelInviteLink.value = chat.inviteLink || 'No invite link available';
        }
        
        const editSection = document.getElementById('chat-edit-section');
        if (editSection) {
            editSection.style.display = isAdmin ? 'block' : 'none';
            
            if (isAdmin) {
                if (this.panelEditName) this.panelEditName.value = chat.name || '';
                if (this.panelEditDescription) this.panelEditDescription.value = chat.description || '';
            }
        }
        
        if (this.panelFilesList) {
            this.panelFilesList.innerHTML = chat.files?.map(file => `
                <div class="panel-file-item" onclick="window.open('${file.file_url}', '_blank')">
                    <span class="material-symbols-outlined">description</span>
                    <div class="panel-file-info">
                        <span class="panel-file-name">${file.content || 'File'}</span>
                        <span class="panel-file-date">${this.formatDate(file.created_at)}</span>
                    </div>
                </div>
            `).join('') || '<div class="panel-empty">No files</div>';
        }
        
        if (this.panelVoicesList) {
            this.panelVoicesList.innerHTML = chat.voices?.map(voice => `
                <div class="panel-voice-item" onclick="document.getElementById('audio-player').src='${voice.file_url}'; this.classList.add('playing'); document.getElementById('audio-player').play()">
                    <span class="material-symbols-outlined">play_circle</span>
                    <div class="panel-voice-info">
                        <span class="panel-voice-name">Voice message</span>
                        <span class="panel-voice-date">${this.formatDate(voice.created_at)}</span>
                    </div>
                    <span class="panel-voice-duration">${voice.content || '0:00'}</span>
                </div>
            `).join('') || '<div class="panel-empty">No voice messages</div>';
        }
    }

    async loadUserAvatar(userId, element) {
        try {
            const response = await fetch(`/api/users/${userId}`);
            const user = await response.json();
            
            if (user.avatar) {
                const avatarUrl = user.avatar.startsWith('http') 
                    ? user.avatar 
                    : `https://lh3.googleusercontent.com/a/${user.avatar}`;
                element.innerHTML = `<img src="${avatarUrl}" alt="avatar" onload="this.style.opacity=1" style="opacity:0; transition:opacity 0.3s">`;
                element.style.background = 'none';
                
                // Анимация загрузки
                const img = element.querySelector('img');
                if (img) {
                    img.onload = () => img.style.opacity = '1';
                }
            } else {
                const initial = (user.display_name || user.username || 'U').charAt(0).toUpperCase();
                element.innerHTML = `<span class="avatar-initial">${initial}</span>`;
                element.style.background = 'linear-gradient(135deg, #6750a4, #9a82db)';
            }
        } catch (error) {
            console.error('Failed to load user avatar:', error);
            element.innerHTML = '<span class="material-symbols-outlined" style="font-size:24px">person</span>';
            element.style.background = 'var(--md-sys-color-primary-container)';
        }
    }

    copyInviteLink() {
        if (this.panelInviteLink && this.panelInviteLink.value) {
            navigator.clipboard.writeText(this.panelInviteLink.value)
                .then(() => this.showToast('Invite link copied!', 'success'))
                .catch(() => this.showToast('Failed to copy', 'error'));
        }
    }

    async saveChatSettings() {
        if (!this.currentChatInfo?.isAdmin) {
            this.showToast('Only admin can edit', 'error');
            return;
        }
        
        const updates = {
            name: this.panelEditName?.value.trim() || this.currentChat.name,
            description: this.panelEditDescription?.value.trim() || '',
            userId: this.currentUser.id
        };
        
        console.log('Saving chat settings:', updates);
        
        try {
            const response = await fetch(`/api/chats/${this.currentChat.id}/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.currentChat.name = updates.name;
                this.currentChat.description = updates.description;
                this.renderRightPanel();
                this.updateChatHeader();
                this.showToast('Chat updated successfully!', 'success');
            } else {
                this.showToast(data.error || 'Failed to update chat', 'error');
            }
        } catch (error) {
            console.error('Failed to update chat:', error);
            this.showToast('Failed to update chat', 'error');
        }
    }

    async panelSearch(query) {
        if (!query || query.length < 2) {
            this.panelSearchResults.innerHTML = '';
            return;
        }
        
        const type = this.currentPanelSearchTab || 'all';
        
        try {
            const response = await fetch(`/api/chats/${this.currentChat.id}/search?q=${encodeURIComponent(query)}&type=${type}`);
            const results = await response.json();
            
            this.panelSearchResults.innerHTML = results.map(msg => {
                const icon = {
                    text: 'chat',
                    file: 'description',
                    voice: 'mic'
                }[msg.type] || 'chat';
                
                return `
                    <div class="panel-search-result" onclick="window.palette?.scrollToMessage(${msg.id})">
                        <span class="material-symbols-outlined">${icon}</span>
                        <div class="panel-search-content">
                            <div class="panel-search-text">${this.escapeHtml(msg.content)}</div>
                            <span class="panel-search-date">${this.formatDate(msg.created_at)}</span>
                        </div>
                    </div>
                `;
            }).join('') || '<div class="panel-empty">No results</div>';
        } catch (error) {
            console.error('Search error:', error);
        }
    }

    // ============= ПРЕДЗАГРУЗКА ЗВУКОВ =============
    preloadSounds() {
        Object.values(this.sounds).forEach(sound => {
            sound.load();
            // Добавляем обработчик ошибок
            sound.addEventListener('error', (e) => {
                console.log('Sound load error:', e.target.src);
            });
        });
    }

    // ============= ВОСПРОИЗВЕДЕНИЕ ЗВУКА =============
    playSound(soundName) {
        try {
            const sound = this.sounds[soundName];
            if (sound) {
                // Сбрасываем время если звук уже играл
                sound.currentTime = 0;
                sound.play().catch(e => console.log('Sound play error:', e));
            }
        } catch (error) {
            console.log('Sound error:', error);
        }
    }

    switchPanelSearchTab(e) {
        this.panelSearchTabs.forEach(t => t.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.currentPanelSearchTab = e.currentTarget.dataset.type;
        
        if (this.panelSearchInput?.value.length >= 2) {
            this.panelSearch(this.panelSearchInput.value);
        }
    }

    scrollToMessage(messageId) {
        const messageElement = document.querySelector(`.message[data-message-id="${messageId}"]`);
        if (messageElement) {
            messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            messageElement.classList.add('highlight');
            setTimeout(() => messageElement.classList.remove('highlight'), 2000);
            this.closeRightPanel();
        }
    }

    // ============= SEARCH =============
    
    openSearchModal() {
        this.closeModal(this.headerMenu);
        this.openModal(this.searchModal);
        this.animateModal(this.searchModal);
        this.globalSearch.value = '';
        this.globalSearchResults.innerHTML = '';
        this.currentSearchTab = 'users';
        
        this.searchTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === 'users');
        });
    }

    handleGlobalSearch(e) {
        const query = e.target.value;
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => this.performGlobalSearch(query), 300);
    }

    async performGlobalSearch(query) {
        if (!query || query.length < 2) {
            this.globalSearchResults.innerHTML = '';
            return;
        }

        const tab = this.currentSearchTab;
        
        try {
            const endpoint = tab === 'users' 
                ? `/api/users/search?q=${encodeURIComponent(query)}&currentUserId=${this.currentUser.id}`
                : `/api/channels/search?q=${encodeURIComponent(query)}`;
            
            const response = await fetch(endpoint);
            const results = await response.json();
            this.renderGlobalSearchResults(results, tab);
        } catch (error) {
            console.error('Search error:', error);
            this.globalSearchResults.innerHTML = '<div class="hint">Search failed</div>';
        }
    }

    renderGlobalSearchResults(results, type) {
        if (results.length === 0) {
            this.globalSearchResults.innerHTML = '<div class="hint">No results found</div>';
            return;
        }

        this.globalSearchResults.innerHTML = results.map(item => {
            if (type === 'users') {
                return `<div class="global-result-item" data-user-id="${item.id}">
                            <div class="result-icon">
                                <span class="material-symbols-outlined">person</span>
                            </div>
                            <div class="result-details">
                                <div class="result-title">${item.display_name || item.username}</div>
                                <div class="result-subtitle">${item.username}</div>
                            </div>
                            <button class="btn outline small start-chat-btn">Message</button>
                        </div>`;
            } else {
                return `<div class="global-result-item" data-channel-id="${item.id}">
                            <div class="result-icon">
                                <span class="material-symbols-outlined">campaign</span>
                            </div>
                            <div class="result-details">
                                <div class="result-title">${item.name}</div>
                                <div class="result-subtitle">Created by @${item.admin_name}</div>
                            </div>
                            <button class="btn outline small join-channel-btn">Join</button>
                        </div>`;
            }
        }).join('');

        if (type === 'users') {
            this.globalSearchResults.querySelectorAll('.start-chat-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const item = e.target.closest('.global-result-item');
                    this.startPrivateChat(item.dataset.userId);
                });
            });
        }
    }

    switchSearchTab(e) {
        this.searchTabs.forEach(t => t.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.currentSearchTab = e.currentTarget.dataset.tab;
        
        if (this.globalSearch.value.length >= 2) {
            this.performGlobalSearch(this.globalSearch.value);
        }
    }

    async startPrivateChat(userId) {
        const existingChat = this.activeChats.find(c => 
            c.type === 'private' && c.participants?.includes(parseInt(userId))
        );
        
        if (existingChat) {
            this.selectChat(existingChat.id);
            this.closeModal(this.searchModal);
            return;
        }
        
        try {
            const response = await fetch('/api/chats/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'private',
                    adminId: this.currentUser.id,
                    participants: [this.currentUser.id, parseInt(userId)]
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                await this.loadChats();
                this.selectChat(data.id);
                this.closeModal(this.searchModal);
                this.showToast('Chat started!', 'success');
            }
        } catch (error) {
            console.error('Start chat error:', error);
            this.showToast('Failed to start chat', 'error');
        }
    }

    // ============= STATUS =============
    
    openStatusModal() {
        this.closeModal(this.headerMenu);
        
        const currentStatus = this.currentUser?.status || 'online';
        const currentCustom = this.currentUser?.custom_status || '';
        
        this.statusOptions.forEach(opt => {
            opt.classList.toggle('active', opt.dataset.status === currentStatus);
        });
        
        this.customStatus.value = currentCustom;
        this.openModal(this.statusModal);
        this.animateModal(this.statusModal);
    }

    selectStatus(option) {
        this.statusOptions.forEach(opt => opt.classList.remove('active'));
        option.classList.add('active');
    }

    async saveStatus() {
        const selectedOption = document.querySelector('.status-option.active');
        const status = selectedOption?.dataset.status || 'online';
        const customStatus = this.customStatus.value.trim();

        try {
            const response = await fetch('/api/user/status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: this.currentUser.id,
                    status,
                    customStatus: customStatus || null
                })
            });

            const data = await response.json();
            
            if (data.success) {
                this.currentUser.status = status;
                this.currentUser.custom_status = customStatus;
                localStorage.setItem('palette_user', JSON.stringify(this.currentUser));
                
                this.updateUserStatus();
                this.loadProfileData();
                this.showToast('Status updated', 'success');
                this.closeModal(this.statusModal);
            }
        } catch (error) {
            console.error('Status update error:', error);
            this.showToast('Failed to update status', 'error');
        }
    }

    clearStatus() {
        this.customStatus.value = '';
    }

    // ============= SIDEBAR RESIZE =============
    
    initSidebarResize() {
        if (!this.resizeHandle || !this.sidebar) return;
        
        this.resizeHandle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.isResizing = true;
            
            const onMouseMove = (e) => {
                if (!this.isResizing) return;
                e.preventDefault();
                
                const newWidth = e.clientX;
                if (newWidth >= 240 && newWidth <= 480) {
                    this.sidebarWidth = newWidth;
                    this.sidebar.style.width = `${newWidth}px`;
                    this.sidebar.classList.toggle('narrow', newWidth < 280);
                    this.renderChatsList();
                }
            };
            
            const onMouseUp = () => {
                this.isResizing = false;
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }

    // ============= HEADER MENU =============
    
    showHeaderMenu(e) {
        const menu = this.headerMenu;
        const rect = e.currentTarget.getBoundingClientRect();
        menu.style.left = `${rect.left - 200}px`;
        menu.style.top = `${rect.bottom + 5}px`;
        menu.classList.remove('hidden');
        menu.classList.add('scale-in');
        setTimeout(() => menu.classList.remove('scale-in'), 200);
    }

    // ============= CONTEXT MENU =============
    
    showMessageContextMenu(e, message) {
        e.preventDefault();
        this.selectedMessage = message;
        
        const menu = this.contextMenu;
        menu.style.left = `${e.pageX}px`;
        menu.style.top = `${e.pageY}px`;
        menu.classList.remove('hidden');
        menu.classList.add('scale-in');
        setTimeout(() => menu.classList.remove('scale-in'), 200);
        
        const rect = menu.getBoundingClientRect();
        if (rect.right > window.innerWidth) menu.style.left = `${window.innerWidth - rect.width - 10}px`;
        if (rect.bottom > window.innerHeight) menu.style.top = `${window.innerHeight - rect.height - 10}px`;
    }

    showChatContextMenu(e, chatId) {
        e.preventDefault();
        this.selectedChatForMove = chatId;
        
        const menu = this.chatContextMenu;
        menu.style.left = `${e.pageX}px`;
        menu.style.top = `${e.pageY}px`;
        menu.classList.remove('hidden');
        
        // Populate folder submenu
        const submenu = menu.querySelector('.folder-submenu');
        if (submenu) {
            const foldersHtml = this.customFolders.map(folder => `
                <li class="folder-option" data-folder-id="${folder.id}">
                    <span class="material-symbols-outlined">${folder.icon}</span>
                    ${folder.name}
                </li>
            `).join('');
            
            submenu.innerHTML = foldersHtml || '<li class="empty">No folders</li>';
            
            submenu.querySelectorAll('.folder-option').forEach(option => {
                option.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.moveChatToFolder(chatId, option.dataset.folderId);
                    this.closeChatContextMenu();
                });
            });
        }
        
        const rect = menu.getBoundingClientRect();
        if (rect.right > window.innerWidth) menu.style.left = `${window.innerWidth - rect.width - 10}px`;
        if (rect.bottom > window.innerHeight) menu.style.top = `${window.innerHeight - rect.height - 10}px`;
    }

    closeChatContextMenu() {
        if (this.chatContextMenu) {
            this.chatContextMenu.classList.add('hidden');
            this.chatContextMenu.querySelector('.folder-submenu')?.classList.remove('visible');
        }
        this.selectedChatForMove = null;
    }

    closeContextMenu() {
        this.contextMenu?.classList.add('hidden');
        this.selectedMessage = null;
    }

    setupReply() {
        if (this.selectedMessage) {
            this.replyToMessage = this.selectedMessage;
            this.replyUsername.textContent = this.selectedMessage.display_name || this.selectedMessage.username || 'User';
            this.replyText.textContent = this.truncateText(this.selectedMessage.content || 'Message', 50);
            this.replyPreview.classList.remove('hidden');
            this.messageInput.focus();
        }
        this.closeContextMenu();
    }

    cancelReplyAction() {
        this.replyToMessage = null;
        this.replyPreview.classList.add('hidden');
    }

    async showForwardModal() {
        if (!this.selectedMessage) return;
        
        this.forwardMessageData = this.selectedMessage;
        
        if (this.chatsForwardList) {
            this.chatsForwardList.innerHTML = this.activeChats
                .filter(chat => chat.id !== this.currentChat?.id)
                .map(chat => `
                    <div class="forward-chat-item" data-chat-id="${chat.id}">
                        <div class="chat-avatar">
                            <span class="material-symbols-outlined">${chat.type === 'private' ? 'person' : 'group'}</span>
                        </div>
                        <div class="chat-details">
                            <div class="chat-name">${chat.name}</div>
                        </div>
                    </div>
                `).join('');
            
            this.chatsForwardList.querySelectorAll('.forward-chat-item').forEach(item => {
                item.addEventListener('click', () => this.forwardMessageToChat(item.dataset.chatId));
            });
        }
        
        this.openModal(this.forwardModal);
        this.animateModal(this.forwardModal);
        this.closeContextMenu();
    }

    async forwardMessageToChat(targetChatId) {
        try {
            const response = await fetch('/api/messages/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chatId: targetChatId,
                    userId: this.currentUser.id,
                    content: this.forwardMessageData.content,
                    forwardedFrom: this.forwardMessageData.id
                })
            });
            
            if (response.ok) {
                this.showToast('Message forwarded', 'success');
                this.closeModal(this.forwardModal);
            }
        } catch (error) {
            console.error('Forward error:', error);
            this.showToast('Failed to forward message', 'error');
        }
    }

    copyMessageText() {
        if (this.selectedMessage?.content) {
            navigator.clipboard.writeText(this.selectedMessage.content)
                .then(() => this.showToast('Message copied', 'success'))
                .catch(() => this.showToast('Failed to copy', 'error'));
        }
        this.closeContextMenu();
    }

    async deleteSelectedMessage() {
        if (!this.selectedMessage) return;
        
        if (confirm('Delete this message?')) {
            try {
                const response = await fetch(`/api/messages/${this.selectedMessage.id}`, {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    const element = document.querySelector(`.message[data-message-id="${this.selectedMessage.id}"]`);
                    if (element) {
                        element.classList.add('message-delete');
                        setTimeout(() => {
                            element.remove();
                            this.messages = this.messages.filter(m => m.id !== this.selectedMessage.id);
                        }, 200);
                    }
                    this.showToast('Message deleted', 'success');
                }
            } catch (error) {
                console.error('Delete error:', error);
                this.showToast('Failed to delete message', 'error');
            }
        }
        this.closeContextMenu();
    }

    // ============= UTILS =============
    
    openModal(modal) {
        if (modal) modal.classList.remove('hidden');
    }

    closeModal(modal) {
        if (modal) {
            modal.classList.add('scale-out');
            setTimeout(() => {
                modal.classList.add('hidden');
                modal.classList.remove('scale-out');
            }, 200);
        }
    }

    scrollToBottom() {
        if (this.messagesContainer) {
            this.messagesContainer.scrollTo({
                top: this.messagesContainer.scrollHeight,
                behavior: 'smooth'
            });
        }
    }

    setupAutoResize() {
        if (this.messageInput) {
            this.messageInput.addEventListener('input', () => {
                this.messageInput.style.height = 'auto';
                this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px';
            });
        }
    }

    formatTime(timestamp) {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
        if (diff < 86400000) return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        if (diff < 172800000) return 'Yesterday';
        return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    }

    formatLastSeen(timestamp) {
        if (!timestamp) return 'никогда';
        
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) {
            return 'online';
        }
        
        if (diff < 3600000) {
            const minutes = Math.floor(diff / 60000);
            return `был(а) в сети ${minutes} ${this.pluralize(minutes, 'минуту', 'минуты', 'минут')} назад`;
        }
        
        if (diff < 86400000) {
            const hours = Math.floor(diff / 3600000);
            return `был(а) в сети ${hours} ${this.pluralize(hours, 'час', 'часа', 'часов')} назад`;
        }
        
        if (diff < 604800000) {
            const days = Math.floor(diff / 86400000);
            return `был(а) в сети ${days} ${this.pluralize(days, 'день', 'дня', 'дней')} назад`;
        }
        
        return `был(а) в сети ${date.toLocaleDateString('ru-RU', { 
            day: 'numeric', 
            month: 'long',
            hour: '2-digit',
            minute: '2-digit'
        })}`;
    }

    pluralize(count, one, few, many) {
        count = Math.abs(count);
        count %= 100;
        if (count >= 5 && count <= 20) {
            return many;
        }
        count %= 10;
        if (count === 1) {
            return one;
        }
        if (count >= 2 && count <= 4) {
            return few;
        }
        return many;
    }

    formatDate(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 86400000) {
            return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        } else if (diff < 604800000) {
            return date.toLocaleDateString('ru-RU', { weekday: 'short' });
        } else {
            return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
        }
    }

    formatJoinDate(dateString) {
        if (!dateString) return 'Unknown';
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
    }

    formatDuration(startTime, endTime) {
        return this.formatDurationFromMs(endTime - startTime);
    }

    formatDurationFromMs(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
    }

    truncateText(text, maxLength) {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    updateChatListLastMessage(message) {
        const chatItem = document.querySelector(`.chat-item[data-chat-id="${message.chat_id}"]`);
        if (!chatItem) return;
        
        const lastMessageEl = chatItem.querySelector('.chat-last-message');
        if (lastMessageEl) {
            let messageText = '';
            if (message.type === 'file') {
                messageText = '📎 File';
            } else if (message.type === 'voice') {
                messageText = '🎤 Voice';
            } else {
                messageText = message.content || 'Message';
            }
            lastMessageEl.textContent = this.truncateText(messageText, 30);
        }
        
        const timeEl = chatItem.querySelector('.chat-time');
        if (timeEl) {
            timeEl.textContent = this.formatTime(message.created_at);
        }
        
        // Перемещаем чат вверх списка
        const parent = chatItem.parentNode;
        if (parent) {
            parent.prepend(chatItem);
        }
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="material-symbols-outlined">${
                type === 'success' ? 'check_circle' : 
                type === 'error' ? 'error' : 
                type === 'warning' ? 'warning' : 'info'
            }</span>
            <span>${message}</span>
        `;
        
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    // ============= WEBRTC CALLS =============
    
    async initiateCall(type) {
        if (!this.currentChat || this.currentChat.type !== 'private') {
            this.showToast('Calls are only available in private chats', 'error');
            return;
        }
        
        if (this.isCallActive || this.isCallIncoming) {
            this.showToast('Call already in progress', 'error');
            return;
        }
        
        const otherUserId = this.currentChat.participants?.find(id => id != this.currentUser?.id);
        if (!otherUserId) {
            this.showToast('Cannot find user to call', 'error');
            return;
        }
        
        this.callType = type;
        
        try {
            // Получаем медиа поток
            const constraints = {
                audio: true,
                video: type === 'video' ? { facingMode: 'user' } : false
            };
            
            this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
            
            // Создаем PeerConnection
            await this.createPeerConnection();
            
            // Добавляем локальный поток
            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
            });
            
            // Показываем локальное видео
            if (type === 'video') {
                if (this.localVideo) {
                    this.localVideo.srcObject = this.localStream;
                    this.localVideo.style.display = 'block';
                }
                if (this.callAudioOnly) {
                    this.callAudioOnly.classList.add('hidden');
                }
            } else {
                if (this.localVideo) {
                    this.localVideo.style.display = 'none';
                }
                if (this.callAudioOnly) {
                    this.callAudioOnly.classList.remove('hidden');
                    // Заполняем данные для аудио звонка
                    const otherUser = await this.getUserInfo(otherUserId);
                    if (otherUser) {
                        if (this.callAudioName) {
                            this.callAudioName.textContent = otherUser.display_name || otherUser.username;
                        }
                        if (this.callAudioAvatar) {
                            this.updateAvatar(this.callAudioAvatar, otherUser);
                        }
                    }
                }
            }
            
            // Отправляем предложение звонка
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);
            
            this.socket.emit('call_initiate', {
                from: this.currentUser.id,
                to: otherUserId,
                chatId: this.currentChat.id,
                type: type,
                offer: offer
            });
            
            // Показываем модальное окно звонка
            this.showCallModal(otherUserId, type, true);
            this.updateCallStatus('Calling...');
            this.isCallActive = true;
            
        } catch (error) {
            console.error('Error initiating call:', error);
            this.showToast('Failed to start call. Please check your permissions.', 'error');
            this.endCall();
        }
    }
    
    async createPeerConnection() {
        const configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };
        
        this.peerConnection = new RTCPeerConnection(configuration);
        
        // Обработка ICE кандидатов
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
            const otherUserId = this.currentChat.participants?.find(id => id != this.currentUser?.id);
            if (otherUserId && this.currentUser?.id) {
                this.socket.emit('ice_candidate', {
                    from: this.currentUser.id,
                    to: otherUserId,
                    chatId: this.currentChat.id,
                    candidate: event.candidate
                });
            }
            }
        };
        
        // Обработка удаленного потока
        this.peerConnection.ontrack = (event) => {
            this.remoteStream = event.streams[0];
            if (this.remoteVideo) {
                this.remoteVideo.srcObject = this.remoteStream;
            }
        };
        
        // Обработка изменения состояния соединения
        this.peerConnection.onconnectionstatechange = () => {
            console.log('Connection state:', this.peerConnection.connectionState);
            if (this.peerConnection.connectionState === 'disconnected' || 
                this.peerConnection.connectionState === 'failed') {
                this.endCall();
            }
        };
    }
    
    async getUserInfo(userId) {
        try {
            const response = await fetch(`/api/users/${userId}`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching user info:', error);
            return null;
        }
    }
    
    updateAvatar(element, user) {
        if (!element) return;
        
        if (user.avatar) {
            const avatarUrl = user.avatar.startsWith('http') 
                ? user.avatar 
                : `https://lh3.googleusercontent.com/a/${user.avatar}`;
            element.innerHTML = `<img src="${avatarUrl}" alt="avatar">`;
        } else {
            const initial = (user.display_name || user.username || 'U').charAt(0).toUpperCase();
            element.textContent = initial;
        }
    }
    
    showCallModal(userId, type, isCaller) {
        if (!this.callModal) return;
        
        this.callModal.classList.remove('hidden');
        if (this.incomingCallModal) {
            this.incomingCallModal.classList.add('hidden');
        }
        
        // Заполняем информацию о пользователе
        this.getUserInfo(userId).then(user => {
            if (user) {
                if (this.callUserName) {
                    this.callUserName.textContent = user.display_name || user.username;
                }
                if (this.callUserAvatar) {
                    this.updateAvatar(this.callUserAvatar, user);
                }
                
                if (type === 'voice') {
                    if (this.localVideo) this.localVideo.style.display = 'none';
                    if (this.remoteVideo) this.remoteVideo.style.display = 'none';
                    if (this.callAudioOnly) {
                        this.callAudioOnly.classList.remove('hidden');
                        if (this.callAudioName) {
                            this.callAudioName.textContent = user.display_name || user.username;
                        }
                        if (this.callAudioAvatar) {
                            this.updateAvatar(this.callAudioAvatar, user);
                        }
                    }
                } else {
                    if (this.localVideo) this.localVideo.style.display = 'block';
                    if (this.remoteVideo) this.remoteVideo.style.display = 'block';
                    if (this.callAudioOnly) this.callAudioOnly.classList.add('hidden');
                }
            }
        });
        
        if (!isCaller && this.callStartTime === null) {
            this.startCallTimer();
        }
    }
    
    handleIncomingCall(data) {
        if (this.isCallActive || this.isCallIncoming) {
            if (this.currentUser?.id) {
                this.socket.emit('call_reject', {
                    from: this.currentUser.id,
                    to: data.from,
                    chatId: data.chatId
                });
            }
            return;
        }
        
        // Проверяем, что это звонок для текущего чата или можем принять любой
        if (this.currentChat && this.currentChat.id != data.chatId) {
            // Можно добавить логику переключения на нужный чат или просто отклонить
            console.log('Incoming call from different chat');
        }
        
        this.isCallIncoming = true;
        this.callType = data.type;
        this.currentCallData = data;
        
        // Показываем модальное окно входящего звонка
        if (this.incomingCallModal) {
            this.incomingCallModal.classList.remove('hidden');
        }
        if (this.callModal) {
            this.callModal.classList.add('hidden');
        }
        
        this.getUserInfo(data.from).then(user => {
            if (user) {
                if (this.incomingCallName) {
                    this.incomingCallName.textContent = user.display_name || user.username;
                }
                if (this.incomingCallAvatar) {
                    this.updateAvatar(this.incomingCallAvatar, user);
                }
                if (this.incomingCallType) {
                    this.incomingCallType.textContent = data.type === 'video' ? 'Incoming video call' : 'Incoming voice call';
                }
            }
        });
        
        // Воспроизводим звук звонка
        this.playCallSound();
    }
    
    async acceptCall() {
        if (!this.isCallIncoming || !this.currentCallData) return;
        
        this.isCallIncoming = false;
        this.isCallActive = true;
        
        try {
            const constraints = {
                audio: true,
                video: this.callType === 'video' ? { facingMode: 'user' } : false
            };
            
            this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
            
            await this.createPeerConnection();
            
            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
            });
            
            // Устанавливаем удаленное описание
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(this.currentCallData.offer));
            
            // Создаем ответ
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);
            
            // Отправляем ответ
            this.socket.emit('call_answer', {
                from: this.currentUser.id,
                to: this.currentCallData.from,
                chatId: this.currentCallData.chatId,
                answer: answer
            });
            
            // Показываем локальное видео
            if (this.callType === 'video') {
                if (this.localVideo) {
                    this.localVideo.srcObject = this.localStream;
                    this.localVideo.style.display = 'block';
                }
                if (this.callAudioOnly) {
                    this.callAudioOnly.classList.add('hidden');
                }
            } else {
                if (this.localVideo) {
                    this.localVideo.style.display = 'none';
                }
                if (this.callAudioOnly) {
                    this.callAudioOnly.classList.remove('hidden');
                    const otherUser = await this.getUserInfo(this.currentCallData.from);
                    if (otherUser) {
                        if (this.callAudioName) {
                            this.callAudioName.textContent = otherUser.display_name || otherUser.username;
                        }
                        if (this.callAudioAvatar) {
                            this.updateAvatar(this.callAudioAvatar, otherUser);
                        }
                    }
                }
            }
            
            // Показываем модальное окно звонка
            this.showCallModal(this.currentCallData.from, this.callType, false);
            this.startCallTimer();
            
            this.incomingCallModal.classList.add('hidden');
            this.stopCallSound();
            
        } catch (error) {
            console.error('Error accepting call:', error);
            this.showToast('Failed to accept call', 'error');
            this.endCall();
        }
    }
    
    rejectCall() {
        if (!this.isCallIncoming || !this.currentCallData) return;
        
        this.socket.emit('call_reject', {
            from: this.currentUser.id,
            to: this.currentCallData.from,
            chatId: this.currentCallData.chatId
        });
        
        this.isCallIncoming = false;
        this.currentCallData = null;
        this.incomingCallModal.classList.add('hidden');
        this.stopCallSound();
    }
    
    async handleCallOffer(data) {
        // Это вызывается когда мы уже приняли звонок и получаем повторное предложение
        // (например, при переподключении)
        if (this.peerConnection && this.peerConnection.signalingState === 'have-local-offer') {
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);
            
            const otherUserId = this.currentChat.participants?.find(id => id != this.currentUser?.id);
            if (otherUserId && this.currentUser?.id) {
                this.socket.emit('call_answer', {
                    from: this.currentUser.id,
                    to: otherUserId,
                    chatId: this.currentChat.id,
                    answer: answer
                });
            }
        }
    }
    
    async handleCallAnswer(data) {
        if (this.peerConnection) {
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
            this.updateCallStatus('Connected');
            this.startCallTimer();
        }
    }
    
    async handleIceCandidate(data) {
        if (this.peerConnection && data.candidate) {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
    }
    
    handleCallAccepted(data) {
        this.updateCallStatus('Connected');
        this.startCallTimer();
    }
    
    handleCallRejected() {
        this.showToast('Call rejected', 'error');
        this.endCall();
    }
    
    handleCallEnded() {
        this.showToast('Call ended', 'info');
        this.endCall();
    }
    
    endCall() {
        const wasActive = this.isCallActive;
        
        this.isCallActive = false;
        this.isCallIncoming = false;
        this.callType = null;
        this.currentCallData = null;
        this.callStartTime = null;
        
        // Останавливаем таймер
        if (this.callTimerInterval) {
            clearInterval(this.callTimerInterval);
            this.callTimerInterval = null;
        }
        
        if (this.callTimer) {
            this.callTimer.textContent = '00:00';
        }
        
        // Останавливаем медиа потоки
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        
        if (this.remoteStream) {
            this.remoteStream.getTracks().forEach(track => track.stop());
            this.remoteStream = null;
        }
        
        // Закрываем PeerConnection
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        
        // Очищаем видео элементы
        if (this.localVideo) {
            this.localVideo.srcObject = null;
            this.localVideo.style.display = 'none';
        }
        if (this.remoteVideo) {
            this.remoteVideo.srcObject = null;
            this.remoteVideo.style.display = 'none';
        }
        
        // Скрываем модальные окна
        if (this.callModal) {
            this.callModal.classList.add('hidden');
        }
        if (this.incomingCallModal) {
            this.incomingCallModal.classList.add('hidden');
        }
        
        // Сбрасываем состояние
        this.isMuted = false;
        this.isVideoEnabled = true;
        this.updateCallControls();
        
        // Уведомляем другого пользователя только если звонок был активен
        if (wasActive && this.currentChat && this.currentUser?.id) {
            const otherUserId = this.currentChat.participants?.find(id => id != this.currentUser?.id);
            if (otherUserId) {
                this.socket.emit('call_end', {
                    from: this.currentUser.id,
                    to: otherUserId,
                    chatId: this.currentChat.id
                });
            }
        }
    }
    
    toggleMute() {
        if (!this.localStream) return;
        
        this.isMuted = !this.isMuted;
        this.localStream.getAudioTracks().forEach(track => {
            track.enabled = !this.isMuted;
        });
        
        this.updateCallControls();
    }
    
    toggleVideo() {
        if (!this.localStream || this.callType !== 'video') return;
        
        this.isVideoEnabled = !this.isVideoEnabled;
        this.localStream.getVideoTracks().forEach(track => {
            track.enabled = this.isVideoEnabled;
        });
        
        if (this.localVideo) {
            this.localVideo.style.display = this.isVideoEnabled ? 'block' : 'none';
        }
        
        this.updateCallControls();
    }
    
    async switchCamera() {
        if (!this.localStream || this.callType !== 'video') return;
        
        try {
            const videoTrack = this.localStream.getVideoTracks()[0];
            if (!videoTrack) return;
            
            // Останавливаем текущую камеру
            videoTrack.stop();
            
            // Переключаем камеру
            this.currentCamera = this.currentCamera === 'user' ? 'environment' : 'user';
            
            // Получаем новый поток
            const newStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: this.currentCamera }
            });
            
            const newVideoTrack = newStream.getVideoTracks()[0];
            const sender = this.peerConnection.getSenders().find(s => 
                s.track && s.track.kind === 'video'
            );
            
            if (sender) {
                await sender.replaceTrack(newVideoTrack);
            }
            
            // Обновляем локальный поток
            this.localStream.removeTrack(videoTrack);
            this.localStream.addTrack(newVideoTrack);
            
            if (this.localVideo) {
                this.localVideo.srcObject = this.localStream;
            }
            
            // Останавливаем старый поток
            newStream.getTracks().forEach(track => {
                if (track !== newVideoTrack) track.stop();
            });
            
        } catch (error) {
            console.error('Error switching camera:', error);
            this.showToast('Failed to switch camera', 'error');
        }
    }
    
    updateCallControls() {
        if (this.muteAudioBtn) {
            const icon = this.muteAudioBtn.querySelector('.material-symbols-outlined');
            if (icon) {
                icon.textContent = this.isMuted ? 'mic_off' : 'mic';
            }
            this.muteAudioBtn.classList.toggle('active', this.isMuted);
        }
        
        if (this.toggleVideoBtn) {
            const icon = this.toggleVideoBtn.querySelector('.material-symbols-outlined');
            if (icon) {
                icon.textContent = this.isVideoEnabled ? 'videocam' : 'videocam_off';
            }
            this.toggleVideoBtn.classList.toggle('active', !this.isVideoEnabled);
        }
    }
    
    startCallTimer() {
        this.callStartTime = Date.now();
        this.callTimerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.callStartTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            if (this.callTimer) {
                this.callTimer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        }, 1000);
    }
    
    updateCallStatus(status) {
        if (this.callStatus) {
            this.callStatus.textContent = status;
        }
    }
    
    playCallSound() {
        // Можно добавить звук звонка
        // this.sounds.incomingCall?.play();
    }
    
    stopCallSound() {
        // Останавливаем звук звонка
        // this.sounds.incomingCall?.pause();
        // this.sounds.incomingCall.currentTime = 0;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.palette = new PaletteMessenger();
});

window.removeMember = (userId) => {
    window.palette?.removeMember(userId);
};
