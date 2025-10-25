const prefersDark = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;
const THEME_KEY = 'tryme-theme';
const body = document.body;
const themeToggle = document.getElementById('themeToggle');
const waitlistForm = document.getElementById('waitlistForm');
const waitlistFeedback = document.getElementById('waitlistFeedback');
const waitlistNameInput = waitlistForm ? waitlistForm.querySelector('#profileName') : null;
const chatForm = document.getElementById('chatForm');
const chatMessage = document.getElementById('chatMessage');
const chatLog = document.getElementById('chatLog');
const wipeChatButton = document.getElementById('wipeChat');
const yearTarget = document.getElementById('year');
const chatStore = [];

const tokenValue = document.getElementById('tokenValue');
const copyTokenButton = document.getElementById('copyToken');
const profileNameDisplay = document.getElementById('profileNameDisplay');
const profileForm = document.getElementById('profileForm');
const profileNameField = document.getElementById('profileNameField');
const profileStatus = document.getElementById('profileStatus');
const directorySearch = document.getElementById('directorySearch');
const directoryResults = document.getElementById('directoryResults');
const chatHeader = document.getElementById('chatHeader');
const chatHistory = document.getElementById('chatHistory');
const chatIntro = document.getElementById('chatIntro');
const chatComposer = document.getElementById('chatComposer');
const chatComposerInput = document.getElementById('chatComposerInput');

const DIRECTORY = [
    { id: 'aurora', name: 'Aurora Quinn', status: 'Online' },
    { id: 'cipher', name: 'Cipher Fox', status: 'Away' },
    { id: 'nebula', name: 'Nebula Reyes', status: 'Online' },
    { id: 'vault', name: 'Vault-7', status: 'Offline' },
    { id: 'lattice', name: 'Lattice Bloom', status: 'Online' },
    { id: 'sable', name: 'Sable Ion', status: 'Offline' }
];

const threadStore = new Map();
let activeContactId = null;

const replies = [
    'Fingerprint verified. The channel is sealed.',
    'Message receipt confirmed. Metadata shredded.',
    'Key rotation complete. Ready for the next exchange.',
    'Steady stream padding engaged. Traffic looks normal.'
];

yearTarget.textContent = new Date().getFullYear();

function applyTheme(theme) {
    const label = theme === 'dark' ? 'Light mode' : 'Dark mode';
    body.classList.toggle('dark', theme === 'dark');
    themeToggle.textContent = label;
}

function getStoredTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) {
        return saved;
    }
    if (prefersDark && typeof prefersDark.matches === 'boolean') {
        return prefersDark.matches ? 'dark' : 'light';
    }
    return 'light';
}

applyTheme(getStoredTheme());

themeToggle.addEventListener('click', () => {
    const nextTheme = body.classList.contains('dark') ? 'light' : 'dark';
    localStorage.setItem(THEME_KEY, nextTheme);
    applyTheme(nextTheme);
});

if (prefersDark) {
    const handleSchemeChange = event => {
        const saved = localStorage.getItem(THEME_KEY);
        if (!saved) {
            applyTheme(event.matches ? 'dark' : 'light');
        }
    };

    if (typeof prefersDark.addEventListener === 'function') {
        prefersDark.addEventListener('change', handleSchemeChange);
    } else if (typeof prefersDark.addListener === 'function') {
        prefersDark.addListener(handleSchemeChange);
    }
}

function updateWaitlistFeedback(message, tone) {
    if (!waitlistFeedback) {
        return;
    }
    waitlistFeedback.textContent = message;
    waitlistFeedback.classList.remove('success', 'error');
    if (tone) {
        waitlistFeedback.classList.add(tone);
    }
}

if (waitlistForm) {
    waitlistForm.addEventListener('submit', event => {
        event.preventDefault();
        const formData = new FormData(waitlistForm);
        const name = (formData.get('profileName') || '').toString().trim();
        if (!name || (waitlistNameInput && !waitlistNameInput.checkValidity())) {
            if (waitlistNameInput) {
                waitlistNameInput.reportValidity();
            }
            updateWaitlistFeedback('Please share a name we can greet you by.', 'error');
            return;
        }
        localStorage.setItem('tryme-profile-name', name);
        localStorage.removeItem('tryme-waitlist-email');
        updateWaitlistFeedback('Welcome aboard. Preparing your secure space…', 'success');
        setTimeout(() => {
            window.location.href = 'portal.html';
        }, 500);
    });
}

function bufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }
    return btoa(binary);
}

async function sealMessage(plaintext) {
    // Demonstrates local-only salted digest to mimic client-side encryption.
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const salted = new Uint8Array(salt.length + data.length);
    salted.set(salt);
    salted.set(data, salt.length);
    const digest = await crypto.subtle.digest('SHA-256', salted);
    const combined = new Uint8Array(salt.length + digest.byteLength);
    combined.set(salt);
    combined.set(new Uint8Array(digest), salt.length);
    return bufferToBase64(combined.buffer);
}

function renderBubble({ author, plain, cipher, timestamp }) {
    const wrapper = document.createElement('div');
    wrapper.className = `chat-bubble ${author}`;
    wrapper.innerHTML = `
        <div>${plain}</div>
        <div class="chat-meta">
            <span title="Local-only cipher">Cipher: ${cipher.slice(0, 12)}…</span>
            <span>${timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
    `;
    chatLog.appendChild(wrapper);
    chatLog.scrollTop = chatLog.scrollHeight;
}

function storeMessage(entry) {
    chatStore.push(entry);
}

async function handleOutboundMessage(message) {
    const cipher = await sealMessage(message);
    const entry = {
        id: crypto.randomUUID ? crypto.randomUUID() : `local-${Date.now()}`,
        author: 'me',
        plain: message,
        cipher,
        timestamp: new Date()
    };
    storeMessage(entry);
    renderBubble(entry);
}

function simulateReply() {
    const text = replies[Math.floor(Math.random() * replies.length)];
    sealMessage(text).then(cipher => {
        const entry = {
            id: crypto.randomUUID ? crypto.randomUUID() : `remote-${Date.now()}`,
            author: 'them',
            plain: text,
            cipher,
            timestamp: new Date()
        };
        storeMessage(entry);
        renderBubble(entry);
    });
}

if (chatForm && chatMessage) {
    chatForm.addEventListener('submit', event => {
        event.preventDefault();
        const value = chatMessage.value.trim();
        if (!value) {
            return;
        }
        handleOutboundMessage(value).then(() => {
            chatMessage.value = '';
            setTimeout(simulateReply, 600);
        });
    });
}

if (wipeChatButton) {
    wipeChatButton.addEventListener('click', () => {
        chatStore.length = 0;
        chatLog.innerHTML = '';
    });
}

function generateToken(length = 8) {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    const source = (typeof crypto !== 'undefined' && crypto.getRandomValues)
        ? crypto.getRandomValues(new Uint8Array(length))
        : Array.from({ length }, () => Math.floor(Math.random() * alphabet.length * 2));
    for (const value of source) {
        result += alphabet[value % alphabet.length];
    }
    return result;
}

function ensurePortalToken() {
    const existing = localStorage.getItem('tryme-auth-token');
    if (existing && existing.length === 8) {
        return existing;
    }
    const token = generateToken();
    localStorage.setItem('tryme-auth-token', token);
    return token;
}

function renderTokenCard() {
    if (!tokenValue) {
        return;
    }
    tokenValue.textContent = ensurePortalToken();
}

function setProfileNameDisplay(name) {
    if (profileNameDisplay) {
        profileNameDisplay.textContent = name;
    }
    if (profileNameField) {
        profileNameField.value = name;
    }
}

function loadProfileName() {
    const stored = localStorage.getItem('tryme-profile-name');
    return stored && stored.trim() ? stored.trim() : 'Newcomer';
}

function persistProfileName(name) {
    localStorage.setItem('tryme-profile-name', name);
}

function updateProfileStatus(message, tone = 'success') {
    if (!profileStatus) {
        return;
    }
    profileStatus.textContent = message;
    profileStatus.classList.remove('success', 'error');
    profileStatus.classList.add(tone);
    setTimeout(() => {
        profileStatus.textContent = '';
        profileStatus.classList.remove('success', 'error');
    }, 4000);
}

function filteredDirectory(query) {
    const me = loadProfileName().toLowerCase();
    if (!query) {
        return DIRECTORY.filter(entry => entry.name.toLowerCase() !== me).slice(0, 5);
    }
    const q = query.toLowerCase();
    return DIRECTORY.filter(entry => entry.name.toLowerCase().includes(q) && entry.name.toLowerCase() !== me);
}

function renderDirectory(query = '') {
    if (!directoryResults) {
        return;
    }
    const matches = filteredDirectory(query);
    directoryResults.innerHTML = '';
    if (!matches.length) {
        const empty = document.createElement('li');
        empty.textContent = 'No secure contacts found yet.';
        directoryResults.appendChild(empty);
        return;
    }
    matches.forEach(entry => {
        const item = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.contact = entry.id;
        button.innerHTML = `
            <span class="directory-name">${entry.name}</span>
            <span class="directory-status">${entry.status}</span>
        `;
        button.addEventListener('click', () => {
            openConversation(entry.id);
        });
        item.appendChild(button);
        directoryResults.appendChild(item);
    });
}

function defaultThread(contactId) {
    return [
        {
            author: contactId,
            text: 'Channel spun up. Shall we sync notes?',
            timestamp: new Date(Date.now() - 1000 * 60 * 2)
        },
        {
            author: 'me',
            text: 'Absolutely. I will send the brief in a moment.',
            timestamp: new Date(Date.now() - 1000 * 60)
        }
    ];
}

function ensureThread(contactId) {
    if (!threadStore.has(contactId)) {
        threadStore.set(contactId, defaultThread(contactId));
    }
    return threadStore.get(contactId);
}

function renderConversation(contactId) {
    if (!chatHistory) {
        return;
    }
    const thread = ensureThread(contactId);
    chatHistory.innerHTML = '';
    thread.forEach(event => {
        const bubble = document.createElement('div');
        const mine = event.author === 'me';
        bubble.className = `chat-thread-bubble ${mine ? 'mine' : 'theirs'}`;
        bubble.innerHTML = `
            <p>${event.text}</p>
            <span>${event.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        `;
        chatHistory.appendChild(bubble);
    });
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

function openConversation(contactId) {
    if (!chatHeader || !chatHistory || !chatComposer) {
        return;
    }
    const contact = DIRECTORY.find(entry => entry.id === contactId);
    if (!contact) {
        return;
    }
    activeContactId = contactId;
    chatHeader.textContent = contact.name;
    chatComposer.classList.remove('hidden');
    if (chatIntro) {
        chatIntro.classList.add('hidden');
    }
    renderConversation(contactId);
}

function appendMessageToThread(contactId, text) {
    const thread = ensureThread(contactId);
    thread.push({
        author: 'me',
        text,
        timestamp: new Date()
    });
}

if (copyTokenButton) {
    copyTokenButton.addEventListener('click', () => {
        const token = ensurePortalToken();
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(token).then(() => {
                updateProfileStatus('Token copied. Keep it safe.');
            }).catch(() => {
                updateProfileStatus('Could not copy automatically. Please copy manually.', 'error');
            });
        } else {
            updateProfileStatus('Copy not supported here. Memorize the code.', 'error');
        }
    });
}

if (profileForm) {
    profileForm.addEventListener('submit', event => {
        event.preventDefault();
        if (!profileNameField) {
            return;
        }
        const nextName = profileNameField.value.trim();
        if (!nextName) {
            profileNameField.reportValidity();
            updateProfileStatus('Name cannot be empty.', 'error');
            return;
        }
        persistProfileName(nextName);
        setProfileNameDisplay(nextName);
        updateProfileStatus('Display name updated securely.');
        renderDirectory(directorySearch ? directorySearch.value : '');
    });
}

if (directorySearch) {
    directorySearch.addEventListener('input', event => {
        renderDirectory(event.target.value);
    });
}

if (chatComposer && chatComposerInput) {
    chatComposer.addEventListener('submit', event => {
        event.preventDefault();
        if (!activeContactId) {
            return;
        }
        const message = chatComposerInput.value.trim();
        if (!message) {
            return;
        }
        appendMessageToThread(activeContactId, message);
        chatComposerInput.value = '';
        renderConversation(activeContactId);
        setTimeout(() => {
            const contact = DIRECTORY.find(entry => entry.id === activeContactId);
            if (!contact) {
                return;
            }
            const reply = {
                author: activeContactId,
                text: 'Received. I will encrypt my response shortly.',
                timestamp: new Date()
            };
            ensureThread(activeContactId).push(reply);
            renderConversation(activeContactId);
        }, 900);
    });
}

function hydratePortal() {
    if (!tokenValue && !profileNameDisplay && !directoryResults) {
        return;
    }
    const name = loadProfileName();
    setProfileNameDisplay(name);
    renderTokenCard();
    renderDirectory();
}

hydratePortal();
