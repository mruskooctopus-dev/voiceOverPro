// VoiceFlow Pro - Frontend Application Logic

const API_BASE = '';

// ==================== NAVIGATION ====================
function navigateTo(page) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    // Show selected page
    document.getElementById(`page-${page}`).classList.add('active');
    // Update sidebar
    document.querySelectorAll('.sidebar-nav a').forEach(a => {
        a.classList.toggle('active', a.dataset.page === page);
    });
    // Load page data
    switch (page) {
        case 'dashboard': loadDashboard(); break;
        case 'history': loadHistory(); break;
        case 'voices': loadVoices(); break;
        case 'settings': loadSettings(); break;
        case 'api': loadApiKey(); break;
    }
}

// ==================== DASHBOARD ====================
async function loadDashboard() {
    try {
        const res = await fetch(`${API_BASE}/api/v1/stats`);
        const data = await res.json();

        document.getElementById('stat-conversions').textContent = data.conversions_this_month || 0;
        document.getElementById('stat-minutes').textContent = data.minutes_used || 0;
        document.getElementById('stat-quota').textContent = data.minutes_quota || 60;
        document.getElementById('stat-success').textContent = data.success_rate || 0;
        document.getElementById('stat-quota-pct').textContent = data.quota_usage || 0;
        document.getElementById('stat-quota-used').textContent = data.minutes_used || 0;
        document.getElementById('stat-quota-total').textContent = data.minutes_quota || 60;
        document.getElementById('quota-bar-fill').style.width = `${data.quota_usage || 0}%`;

        // Recent conversions
        if (data.recent_conversions && data.recent_conversions.length > 0) {
            const html = `
                <table class="conversion-table">
                    <thead>
                        <tr><th>Text</th><th>Voice</th><th>Status</th><th>Created</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                        ${data.recent_conversions.map(c => `
                            <tr>
                                <td>${truncate(c.text, 50)}</td>
                                <td>${c.voice}</td>
                                <td><span class="status-badge ${c.status}">${c.status}</span></td>
                                <td>${formatDate(c.created_at)}</td>
                                <td>${c.file_url ? `<a href="${c.file_url}" class="btn btn-sm btn-secondary" target="_blank">Play</a>` : '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            document.getElementById('recent-conversions').innerHTML = html;
        }
    } catch (err) {
        console.error('Failed to load dashboard:', err);
    }
}

// ==================== CONVERT TEXT ====================
function switchTextSource(source) {
    document.querySelectorAll('.text-source-tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById('source-manual').style.display = source === 'manual' ? 'block' : 'none';
    document.getElementById('source-octopus').style.display = source === 'octopus' ? 'block' : 'none';
}

// Text counter
document.addEventListener('DOMContentLoaded', () => {
    const textarea = document.getElementById('convert-text');
    if (textarea) {
        textarea.addEventListener('input', () => {
            const text = textarea.value;
            document.getElementById('char-count').textContent = text.length;
            document.getElementById('word-count').textContent = text.trim() ? text.trim().split(/\s+/).length : 0;
        });
    }
    // Load initial page
    loadDashboard();
});

async function startConversion() {
    const text = document.getElementById('convert-text').value.trim();
    if (!text) {
        showToast('Please enter some text to convert', 'error');
        return;
    }

    const body = {
        text: text,
        voice: document.getElementById('convert-voice').value,
        settings: {
            provider: document.getElementById('convert-provider').value,
            stability: parseFloat(document.getElementById('convert-stability').value),
            similarity_boost: parseFloat(document.getElementById('convert-similarity').value)
        },
        metadata: {
            article_id: document.getElementById('convert-article-id').value || '',
            category: document.getElementById('convert-category').value || ''
        }
    };

    try {
        const res = await fetch(`${API_BASE}/api/v1/conversions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();

        if (res.ok) {
            showToast(`Conversion queued! ID: ${data.id}`, 'success');
            document.getElementById('convert-text').value = '';
            document.getElementById('char-count').textContent = '0';
            document.getElementById('word-count').textContent = '0';

            // Poll for completion
            pollConversion(data.id);
        } else {
            showToast(data.error || 'Conversion failed', 'error');
        }
    } catch (err) {
        showToast('Network error: ' + err.message, 'error');
    }
}

async function pollConversion(id) {
    let attempts = 0;
    const maxAttempts = 30;

    const check = async () => {
        attempts++;
        try {
            const res = await fetch(`${API_BASE}/api/v1/conversions/${id}`);
            const data = await res.json();

            if (data.status === 'completed') {
                showToast('Conversion completed! Audio ready.', 'success');
                return;
            } else if (data.status === 'failed') {
                showToast('Conversion failed: ' + (data.error || 'Unknown error'), 'error');
                return;
            } else if (attempts < maxAttempts) {
                setTimeout(check, 2000);
            }
        } catch (err) {
            console.error('Poll error:', err);
        }
    };

    setTimeout(check, 2000);
}

// ==================== OCTOPUS INTEGRATION ====================
let searchTimeout;

function searchOctopusStories() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
        const search = document.getElementById('octopus-search').value.trim();
        if (search.length < 2) return;

        try {
            const res = await fetch(`${API_BASE}/api/v1/octopus/stories?search=${encodeURIComponent(search)}`);
            const data = await res.json();

            if (data.stories && data.stories.length > 0) {
                document.getElementById('octopus-stories').innerHTML = data.stories.map(s => `
                    <div class="story-item" onclick="selectOctopusStory('${s.id}')">
                        <h4>${escapeHtml(s.title || 'Untitled')}</h4>
                        <p>${escapeHtml(truncate(s.text || s.body || '', 100))} &bull; ${s.category || ''}</p>
                    </div>
                `).join('');
            } else {
                document.getElementById('octopus-stories').innerHTML = '<div class="empty-state"><p>No stories found</p></div>';
            }
        } catch (err) {
            document.getElementById('octopus-stories').innerHTML = '<div class="empty-state"><p>Error connecting to Octopus</p></div>';
        }
    }, 500);
}

async function selectOctopusStory(storyId) {
    document.getElementById('octopus-story-id').value = storyId;
    await fetchOctopusStory();
}

async function fetchOctopusStory() {
    const storyId = document.getElementById('octopus-story-id').value.trim();
    if (!storyId) {
        showToast('Please enter a story ID', 'error');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/api/v1/octopus/fetch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ story_id: storyId })
        });
        const data = await res.json();

        if (data.text) {
            document.getElementById('octopus-text').value = data.text;
            document.getElementById('octopus-preview').style.display = 'block';
            if (data.story_id) {
                document.getElementById('convert-article-id').value = data.story_id;
            }
            if (data.category) {
                document.getElementById('convert-category').value = data.category;
            }
            showToast('Story fetched from Octopus', 'success');
        } else {
            showToast('No text content found in story', 'error');
        }
    } catch (err) {
        showToast('Failed to fetch from Octopus: ' + err.message, 'error');
    }
}

function useOctopusText() {
    const text = document.getElementById('octopus-text').value;
    document.getElementById('convert-text').value = text;
    document.getElementById('char-count').textContent = text.length;
    document.getElementById('word-count').textContent = text.trim().split(/\s+/).length;
    switchTextSource('manual');
    document.querySelectorAll('.text-source-tab')[0].classList.add('active');
    document.querySelectorAll('.text-source-tab')[1].classList.remove('active');
    showToast('Text loaded from Octopus', 'success');
}

// ==================== HISTORY ====================
async function loadHistory() {
    const status = document.getElementById('history-status').value;
    const search = document.getElementById('history-search').value;

    try {
        const params = new URLSearchParams();
        if (status !== 'all') params.set('status', status);
        if (search) params.set('search', search);

        const res = await fetch(`${API_BASE}/api/v1/conversions?${params}`);
        const data = await res.json();

        if (data.conversions && data.conversions.length > 0) {
            document.getElementById('history-content').innerHTML = `
                <table class="conversion-table">
                    <thead>
                        <tr><th>ID</th><th>Text</th><th>Voice</th><th>Provider</th><th>Status</th><th>Created</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                        ${data.conversions.map(c => `
                            <tr>
                                <td><code style="font-size:12px">${c.id}</code></td>
                                <td>${truncate(c.text, 40)}</td>
                                <td>${c.voice}</td>
                                <td>${c.provider}</td>
                                <td><span class="status-badge ${c.status}">${c.status}</span></td>
                                <td>${formatDate(c.created_at)}</td>
                                <td>
                                    ${c.file_url ? `<a href="${c.file_url}" class="btn btn-sm btn-secondary" target="_blank">&#9654; Play</a>` : '-'}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                ${data.pages > 1 ? `<div style="text-align:center;margin-top:16px;color:var(--text-muted);font-size:13px;">Page ${data.page} of ${data.pages} (${data.total} total)</div>` : ''}
            `;
        } else {
            document.getElementById('history-content').innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    <h3>No conversions found</h3>
                    <p>Start by creating your first conversion</p>
                </div>
            `;
        }
    } catch (err) {
        console.error('Failed to load history:', err);
    }
}

// ==================== VOICE LIBRARY ====================
async function loadVoices() {
    const search = document.getElementById('voice-search').value;
    const provider = document.getElementById('voice-provider-filter').value;
    const gender = document.getElementById('voice-gender-filter').value;

    try {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (provider !== 'all') params.set('provider', provider);
        if (gender !== 'all') params.set('gender', gender);

        const res = await fetch(`${API_BASE}/api/v1/voices?${params}`);
        const data = await res.json();

        if (data.voices && data.voices.length > 0) {
            document.getElementById('voices-grid').innerHTML = data.voices.map(v => `
                <div class="voice-card" onclick="selectVoice('${v.id}')">
                    <div class="voice-card-header">
                        <div class="voice-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/></svg>
                        </div>
                        <div>
                            <div class="voice-name">${v.name} - ${v.description}</div>
                            <div class="voice-provider">${v.provider}</div>
                        </div>
                    </div>
                    <div class="voice-tags">
                        <span class="tag">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                            ${v.gender}
                        </span>
                        <span class="tag">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>
                            ${v.language}
                        </span>
                        <span class="tag">${v.accent}</span>
                    </div>
                    <button class="voice-preview-btn" onclick="event.stopPropagation(); previewVoice('${v.id}')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                        Preview Voice
                    </button>
                </div>
            `).join('');
        } else {
            document.getElementById('voices-grid').innerHTML = '<div class="empty-state"><p>No voices found matching your filters</p></div>';
        }
    } catch (err) {
        console.error('Failed to load voices:', err);
    }
}

function selectVoice(voiceId) {
    document.getElementById('convert-voice').value = voiceId;
    showToast(`Voice "${voiceId}" selected`, 'success');
    navigateTo('convert');
}

function previewVoice(voiceId) {
    showToast(`Previewing voice: ${voiceId}...`, 'success');
    // Send a short preview conversion
    fetch(`${API_BASE}/api/v1/conversions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            text: 'Hello, this is a preview of this voice. Welcome to VoiceFlow Pro.',
            voice: voiceId,
            settings: { provider: 'elevenlabs', stability: 0.5, similarity_boost: 0.75 }
        })
    }).then(r => r.json()).then(data => {
        if (data.id) pollConversion(data.id);
    });
}

// ==================== SETTINGS ====================
async function loadSettings() {
    try {
        const res = await fetch(`${API_BASE}/api/v1/settings`);
        const data = await res.json();

        document.getElementById('settings-org-name').value = data.organization_name || '';
        document.getElementById('settings-url-slug').value = data.url_slug || '';
        document.getElementById('settings-default-provider').value = data.default_provider || 'elevenlabs';
        document.getElementById('settings-fallback-provider').value = data.fallback_provider || '';
        document.getElementById('settings-webhook-url').value = data.webhook_url || '';

        const toggle = document.getElementById('settings-webhooks-toggle');
        if (data.webhooks_enabled) {
            toggle.classList.add('active');
        } else {
            toggle.classList.remove('active');
        }
    } catch (err) {
        console.error('Failed to load settings:', err);
    }
}

async function saveSettings() {
    const settings = {
        organization_name: document.getElementById('settings-org-name').value,
        url_slug: document.getElementById('settings-url-slug').value,
        default_provider: document.getElementById('settings-default-provider').value,
        fallback_provider: document.getElementById('settings-fallback-provider').value,
        webhook_url: document.getElementById('settings-webhook-url').value,
        webhooks_enabled: document.getElementById('settings-webhooks-toggle').classList.contains('active')
    };

    try {
        const res = await fetch(`${API_BASE}/api/v1/settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });
        const data = await res.json();

        if (data.success) {
            showToast('Settings saved successfully', 'success');
        } else {
            showToast('Failed to save settings', 'error');
        }
    } catch (err) {
        showToast('Error saving settings: ' + err.message, 'error');
    }
}

function switchSettingsTab(tab) {
    document.querySelectorAll('#page-settings .tab').forEach(t => t.classList.remove('active'));
    event.target.closest('.tab').classList.add('active');

    document.getElementById('settings-organization').style.display = tab === 'organization' ? 'block' : 'none';
    document.getElementById('settings-providers').style.display = tab === 'providers' ? 'block' : 'none';
    document.getElementById('settings-webhooks').style.display = tab === 'webhooks' ? 'block' : 'none';
}

// ==================== API PAGE ====================
async function loadApiKey() {
    try {
        const res = await fetch(`${API_BASE}/api/v1/apikey`);
        const data = await res.json();
        document.getElementById('api-key-display').textContent = data.api_key || 'No API key generated yet';
    } catch (err) {
        document.getElementById('api-key-display').textContent = 'Error loading API key';
    }
}

async function regenerateApiKey() {
    if (!confirm('Are you sure you want to regenerate the API key? The old key will stop working immediately.')) return;

    try {
        const res = await fetch(`${API_BASE}/api/v1/apikey/regenerate`, { method: 'POST' });
        const data = await res.json();
        document.getElementById('api-key-display').textContent = data.api_key;
        showToast('API key regenerated. Store the full key securely.', 'success');
    } catch (err) {
        showToast('Failed to regenerate API key', 'error');
    }
}

function toggleApiKeyVisibility() {
    // This would toggle between masked and full key display
    showToast('Key visibility toggled', 'success');
}

function copyApiKey() {
    const keyText = document.getElementById('api-key-display').textContent;
    navigator.clipboard.writeText(keyText).then(() => {
        showToast('API key copied to clipboard', 'success');
    });
}

function switchApiTab(tab) {
    document.querySelectorAll('#page-api .tab').forEach(t => t.classList.remove('active'));
    event.target.closest('.tab').classList.add('active');

    document.getElementById('api-endpoints').style.display = tab === 'endpoints' ? 'block' : 'none';
    document.getElementById('api-nodered').style.display = tab === 'nodered' ? 'block' : 'none';
    document.getElementById('api-api-webhooks').style.display = tab === 'api-webhooks' ? 'block' : 'none';
}

// ==================== UTILITIES ====================
function truncate(str, len) {
    if (!str) return '';
    return str.length > len ? str.substring(0, len) + '...' : str;
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            ${type === 'success'
                ? '<path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'
                : '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>'}
        </svg>
        ${escapeHtml(message)}
    `;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Handle browser back/forward
window.addEventListener('hashchange', () => {
    const page = window.location.hash.replace('#', '') || 'dashboard';
    navigateTo(page);
});
