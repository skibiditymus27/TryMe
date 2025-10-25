const prefersDark = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;
const THEME_KEY = 'tryme-theme';
const body = document.body;
const themeToggle = document.getElementById('themeToggle');
const waitlistForm = document.getElementById('waitlistForm');
const waitlistFeedback = document.getElementById('waitlistFeedback');
const waitlistEmailInput = waitlistForm ? waitlistForm.querySelector('#email') : null;
const chatForm = document.getElementById('chatForm');
const chatMessage = document.getElementById('chatMessage');
const chatLog = document.getElementById('chatLog');
const wipeChatButton = document.getElementById('wipeChat');
const yearTarget = document.getElementById('year');
const chatStore = [];

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

function clearWaitlistFeedback() {
    if (!waitlistFeedback) {
        return;
    }
    waitlistFeedback.textContent = '';
    waitlistFeedback.classList.remove('success', 'error');
}

if (waitlistForm) {
    waitlistForm.addEventListener('submit', event => {
        event.preventDefault();
        const formData = new FormData(waitlistForm);
        const email = (formData.get('email') || '').toString().trim();
        if (!email || (waitlistEmailInput && !waitlistEmailInput.checkValidity())) {
            if (waitlistEmailInput) {
                waitlistEmailInput.reportValidity();
            }
            updateWaitlistFeedback('Please provide a valid email address.', 'error');
            return;
        }
        localStorage.setItem('tryme-waitlist-email', email);
        updateWaitlistFeedback('Thanks. Your request stays on this device until you sync the app.', 'success');
        waitlistForm.reset();
        setTimeout(() => {
            clearWaitlistFeedback();
        }, 6000);
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
