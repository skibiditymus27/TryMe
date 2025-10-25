const prefersDark = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;
const THEME_KEY = 'tryme-theme';
const body = document.body;
const themeToggle = document.getElementById('themeToggle');
const waitlistForm = document.getElementById('waitlistForm');
const waitlistFeedback = document.getElementById('waitlistFeedback');
const waitlistNameInput = waitlistForm ? waitlistForm.querySelector('#profileName') : null;
const API_BASE_URL = window.__TRYME_API_BASE__ || 'http://localhost:8081/api';
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

const threadStore = new Map();
let activeContactId = null;

const replies = [
    'Fingerprint verified. The channel is sealed.',
    'Message receipt confirmed. Metadata shredded.',
    'Key rotation complete. Ready for the next exchange.',
    'Steady stream padding engaged. Traffic looks normal.'
];

let currentToken = null;
let directoryQueryCounter = 0;
const directoryCache = new Map();

async function requestJson(path, options = {}) {
    const config = { ...options };
    config.headers = {
        'Accept': 'application/json',
        ...(options.headers || {})
    };
    const response = await fetch(`${API_BASE_URL}${path}`, config);
    if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Request failed with status ${response.status}`);
    }
    return response.json();
}

async function fetchTokenFromServer() {
    const data = await requestJson('/token', { method: 'GET' });
    if (!data?.token) {
        throw new Error('Server did not return a token');
    }
    currentToken = data.token;
    localStorage.setItem('tryme-auth-token', currentToken);
    return currentToken;
}

async function rotateToken(current) {
    const data = await requestJson('/token/rotate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ currentToken: current })
    });
    if (!data?.token) {
        throw new Error('Token rotation failed');
    }
    currentToken = data.token;
    localStorage.setItem('tryme-auth-token', currentToken);
    return currentToken;
}

async function sendProfileUpdate(name) {
    const data = await requestJson('/profile/update', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ displayName: name })
    });
    if (!data?.displayName) {
        throw new Error('Profile update failed');
    }
    return data.displayName;
}

async function fetchDirectoryRemote(query = '') {
    const params = new URLSearchParams();
    if (query) {
        params.set('query', query);
    }
    const search = params.toString();
    const path = `/directory${search ? `?${search}` : ''}`;
    const data = await requestJson(path, { method: 'GET' });
    return Array.isArray(data?.results) ? data.results : [];
}

if (yearTarget) {
    yearTarget.textContent = new Date().getFullYear();
}

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
    waitlistForm.addEventListener('submit', async event => {
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
        try {
            const confirmedName = await sendProfileUpdate(name);
            localStorage.setItem('tryme-profile-name', confirmedName);
            localStorage.removeItem('tryme-waitlist-email');
            await fetchTokenFromServer();
            updateWaitlistFeedback('Welcome aboard. Preparing your secure space…', 'success');
            setTimeout(() => {
                window.location.href = 'portal.html';
            }, 500);
        } catch (error) {
            console.error(error);
            updateWaitlistFeedback('Could not reach the secure service. Try again shortly.', 'error');
        }
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

async function renderTokenCard({ forceRefresh = false } = {}) {
    if (!tokenValue) {
        return;
    }
    const stored = !forceRefresh && (currentToken || localStorage.getItem('tryme-auth-token'));
    try {
        const token = forceRefresh
            ? await rotateToken(stored || undefined)
            : stored || await fetchTokenFromServer();
        tokenValue.textContent = token;
    } catch (error) {
        console.error('Token retrieval failed', error);
        tokenValue.textContent = stored || '--------';
        updateProfileStatus('Unable to retrieve token from the server.', 'error');
    }
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

async function renderDirectory(query = '') {
    if (!directoryResults) {
        return;
    }
    const requestId = ++directoryQueryCounter;
    directoryResults.innerHTML = '';
    const loading = document.createElement('li');
    loading.textContent = 'Loading secure contacts…';
    directoryResults.appendChild(loading);
    try {
        const matches = await fetchDirectoryRemote(query);
        if (requestId !== directoryQueryCounter) {
            return;
        }
        directoryResults.innerHTML = '';
        if (!matches.length) {
            const empty = document.createElement('li');
            empty.textContent = 'No secure contacts found yet.';
            directoryResults.appendChild(empty);
            return;
        }
        matches.forEach(entry => {
            directoryCache.set(entry.id, entry);
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
    } catch (error) {
        console.error('Directory fetch failed', error);
        directoryResults.innerHTML = '';
        const failure = document.createElement('li');
        failure.textContent = 'Unable to load contacts right now.';
        directoryResults.appendChild(failure);
    }
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
    const contact = directoryCache.get(contactId);
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
    copyTokenButton.addEventListener('click', async () => {
        try {
            const token = currentToken || localStorage.getItem('tryme-auth-token') || await fetchTokenFromServer();
            if (!token) {
                throw new Error('No token available');
            }
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(token);
                updateProfileStatus('Token copied. Keep it safe.');
            } else {
                updateProfileStatus('Copy not supported here. Memorize the code.', 'error');
            }
        } catch (error) {
            console.error('Copy token failed', error);
            updateProfileStatus('Unable to copy token right now.', 'error');
        }
    });
}

if (profileForm) {
    profileForm.addEventListener('submit', async event => {
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
        try {
            const confirmed = await sendProfileUpdate(nextName);
            persistProfileName(confirmed);
            setProfileNameDisplay(confirmed);
            updateProfileStatus('Display name updated securely.');
            await renderDirectory(directorySearch ? directorySearch.value : '');
        } catch (error) {
            console.error('Profile update failed', error);
            updateProfileStatus('Could not update display name right now.', 'error');
        }
    });
}

if (directorySearch) {
    directorySearch.addEventListener('input', event => {
        const query = event.target.value;
        void renderDirectory(query);
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
            const contact = directoryCache.get(activeContactId);
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

function setupAnchorNavigation() {
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    if (!anchorLinks.length) {
        return;
    }
    anchorLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (!href || href.length <= 1) {
            return;
        }
        const targetId = href.slice(1);
        link.addEventListener('click', event => {
            const target = document.getElementById(targetId);
            if (!target) {
                return;
            }
            event.preventDefault();
            const currentHighlight = document.querySelector('.portal-highlight');
            if (currentHighlight) {
                currentHighlight.classList.remove('portal-highlight');
            }
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            if (window.history && typeof window.history.replaceState === 'function') {
                window.history.replaceState(null, '', `#${targetId}`);
            } else {
                window.location.hash = targetId;
            }
            target.classList.add('portal-highlight');
            setTimeout(() => {
                target.classList.remove('portal-highlight');
            }, 1200);
        });
    });
}

async function hydratePortal() {
    if (!tokenValue && !profileNameDisplay && !directoryResults) {
        return;
    }
    const name = loadProfileName();
    setProfileNameDisplay(name);
    await Promise.all([
        renderTokenCard(),
        renderDirectory()
    ]);
}

setupAnchorNavigation();
void hydratePortal();
