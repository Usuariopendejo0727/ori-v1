(function () {
  'use strict';

  /* ========================================
     Ori AI Chat Widget — Estilo AI Moderno
     Inspirado en Gemini / ChatGPT
     ======================================== */

  const SCRIPT_TAG = document.currentScript;
  const BOT_ID = SCRIPT_TAG?.getAttribute('data-bot-id') || '';
  const API_BASE = SCRIPT_TAG?.getAttribute('data-api-url') || window.location.origin;

  let config = null;
  let sessionId = null;
  let messages = [];
  let isOpen = false;
  let isTyping = false;
  let detectedLanguage = 'es';

  function detectLanguage() {
    const lang = navigator.language || navigator.userLanguage || 'es';
    detectedLanguage = lang.startsWith('en') ? 'en' : 'es';
    return detectedLanguage;
  }

  /* ========================================
     API Calls
     ======================================== */

  async function fetchConfig() {
    try {
      const res = await fetch(`${API_BASE}/api/widget-config?botId=${BOT_ID}`);
      config = await res.json();
    } catch (err) {
      console.error('[Ori Widget] Config error:', err);
    }
  }

  async function sendMessage(text) {
    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId, botId: BOT_ID, language: detectedLanguage }),
      });
      const data = await res.json();
      sessionId = data.sessionId;
      return data;
    } catch {
      return { reply: detectedLanguage === 'en' ? 'Sorry, something went wrong.' : 'Lo siento, ocurrió un error.', sources: [] };
    }
  }

  async function sendFeedback(messageId, feedbackType) {
    try {
      await fetch(`${API_BASE}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, feedback: feedbackType }),
      });
    } catch { }
  }

  /* ========================================
     Styles
     ======================================== */

  function getCSS() {
    const w = config?.widget || {};
    const primaryColor = w.primary_color || '#6366f1';
    const pos = w.position === 'bottom-left' ? 'left: 24px;' : 'right: 24px;';

    return `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

      :host {
        position: fixed;
        bottom: 24px;
        ${pos}
        z-index: 999999;
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
      }

      * { margin: 0; padding: 0; box-sizing: border-box; }

      /* === Trigger Fab === */
      .ori-fab {
        width: 60px; height: 60px; border-radius: 50%;
        background: linear-gradient(135deg, ${primaryColor} 0%, #7c3aed 100%);
        border: none; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 6px 24px rgba(99,102,241,0.35);
        transition: transform 0.25s cubic-bezier(.4,0,.2,1), box-shadow 0.25s;
      }
      .ori-fab:hover { transform: scale(1.08); box-shadow: 0 8px 32px rgba(99,102,241,0.45); }
      .ori-fab svg { width: 28px; height: 28px; fill: white; }
      .ori-fab.open .ori-icon-chat { display: none; }
      .ori-fab.open .ori-icon-close { display: block; }
      .ori-fab .ori-icon-close { display: none; }

      /* === Panel === */
      .ori-panel {
        display: none; flex-direction: column;
        width: 400px; max-width: calc(100vw - 48px);
        height: 620px; max-height: calc(100vh - 100px);
        background: #ffffff; border-radius: 20px;
        box-shadow: 0 12px 48px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04);
        margin-bottom: 14px; overflow: hidden;
        animation: oriSlideIn 0.35s cubic-bezier(.4,0,.2,1);
      }
      .ori-panel.open { display: flex; }

      @keyframes oriSlideIn {
        from { opacity: 0; transform: translateY(12px) scale(0.97); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
      }

      /* === Header === */
      .ori-hdr {
        display: flex; align-items: center; gap: 12px;
        padding: 16px 20px;
        background: linear-gradient(135deg, ${primaryColor} 0%, #7c3aed 100%);
      }
      .ori-hdr-avatar {
        width: 38px; height: 38px; border-radius: 50%;
        background: rgba(255,255,255,0.2);
        display: flex; align-items: center; justify-content: center;
        font-weight: 700; font-size: 16px; color: white;
        overflow: hidden;
      }
      .ori-hdr-avatar img { width: 100%; height: 100%; object-fit: cover; }
      .ori-hdr-info { flex: 1; }
      .ori-hdr-name { font-weight: 600; font-size: 15px; color: white; }
      .ori-hdr-status { font-size: 11px; color: rgba(255,255,255,0.75); display: flex; align-items: center; gap: 5px; }
      .ori-hdr-status::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: #4ade80; }
      .ori-hdr-close {
        width: 32px; height: 32px; border-radius: 10px;
        background: rgba(255,255,255,0.12); border: none; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        transition: background 0.2s;
      }
      .ori-hdr-close:hover { background: rgba(255,255,255,0.25); }

      /* === Body (messages + welcome) === */
      .ori-body {
        flex: 1; overflow-y: auto; padding: 0;
        display: flex; flex-direction: column;
        background: #fafbfc;
      }
      .ori-body::-webkit-scrollbar { width: 5px; }
      .ori-body::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }

      /* === Welcome State === */
      .ori-welcome {
        flex: 1; display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        padding: 40px 28px 20px; text-align: center;
      }
      .ori-orb {
        width: 80px; height: 80px; border-radius: 50%;
        background: linear-gradient(135deg, ${primaryColor}30 0%, #a78bfa40 50%, #e879f920 100%);
        display: flex; align-items: center; justify-content: center;
        margin-bottom: 20px; position: relative;
        animation: oriFloat 4s ease-in-out infinite;
      }
      .ori-orb::before {
        content: ''; position: absolute; inset: -4px; border-radius: 50%;
        background: linear-gradient(135deg, ${primaryColor}15, #7c3aed15, #e879f915);
        filter: blur(12px);
      }
      .ori-orb svg { width: 36px; height: 36px; position: relative; z-index: 1; }
      @keyframes oriFloat {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-8px); }
      }
      .ori-welcome h2 {
        font-size: 20px; font-weight: 700; color: #0f172a;
        margin-bottom: 6px; letter-spacing: -0.3px;
      }
      .ori-welcome p {
        font-size: 14px; color: #64748b; line-height: 1.5;
        max-width: 280px;
      }

      /* === Suggestion Chips === */
      .ori-chips {
        display: flex; flex-wrap: wrap; gap: 8px;
        justify-content: center; margin-top: 20px;
      }
      .ori-chip {
        padding: 8px 16px; border-radius: 20px;
        background: white; border: 1px solid #e2e8f0;
        color: #334155; font-size: 13px; font-weight: 500;
        cursor: pointer; transition: all 0.2s;
        font-family: inherit; box-shadow: 0 1px 2px rgba(0,0,0,0.04);
      }
      .ori-chip:hover { border-color: ${primaryColor}; color: ${primaryColor}; background: ${primaryColor}06; }

      /* === Messages === */
      .ori-msgs {
        flex: 1; padding: 20px; display: flex; flex-direction: column; gap: 16px;
        overflow-y: auto;
      }
      .ori-msg { display: flex; gap: 10px; animation: oriFadeMsg 0.3s ease; max-width: 100%; }
      .ori-msg.user { flex-direction: row-reverse; }
      @keyframes oriFadeMsg { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

      .ori-msg-ava {
        width: 30px; height: 30px; border-radius: 50%;
        background: linear-gradient(135deg, ${primaryColor}, #7c3aed);
        display: flex; align-items: center; justify-content: center;
        font-size: 12px; font-weight: 700; color: white; flex-shrink: 0;
      }
      .ori-msg.user .ori-msg-ava { display: none; }

      .ori-msg-body { max-width: 80%; }
      .ori-bubble {
        padding: 12px 16px; font-size: 14px; line-height: 1.6;
        word-break: break-word; white-space: pre-wrap;
      }
      .ori-msg.bot .ori-bubble {
        background: white; color: #1e293b;
        border-radius: 4px 16px 16px 16px;
        border: 1px solid #f1f5f9;
        box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      }
      .ori-msg.user .ori-bubble {
        background: linear-gradient(135deg, ${primaryColor}, #7c3aed);
        color: white; border-radius: 16px 4px 16px 16px;
      }

      /* Feedback */
      .ori-fb { display: flex; gap: 4px; margin-top: 6px; }
      .ori-fb button {
        background: none; border: 1px solid #e2e8f0; border-radius: 8px;
        padding: 4px 8px; cursor: pointer; font-size: 13px;
        color: #94a3b8; transition: all 0.2s; font-family: inherit;
      }
      .ori-fb button:hover { background: #f8fafc; color: #475569; }
      .ori-fb button.on { background: ${primaryColor}; color: white; border-color: ${primaryColor}; }

      /* Typing */
      .ori-typing { display: flex; gap: 10px; align-items: flex-start; }
      .ori-typing-ava {
        width: 30px; height: 30px; border-radius: 50%;
        background: linear-gradient(135deg, ${primaryColor}, #7c3aed);
        display: flex; align-items: center; justify-content: center;
        font-size: 12px; font-weight: 700; color: white; flex-shrink: 0;
      }
      .ori-dots {
        display: flex; gap: 5px; padding: 14px 18px;
        background: white; border-radius: 4px 16px 16px 16px;
        border: 1px solid #f1f5f9;
      }
      .ori-dots span {
        width: 8px; height: 8px; border-radius: 50%;
        background: #94a3b8; animation: oriBounce 1.4s infinite;
      }
      .ori-dots span:nth-child(2) { animation-delay: 0.2s; }
      .ori-dots span:nth-child(3) { animation-delay: 0.4s; }
      @keyframes oriBounce {
        0%, 60%, 100% { transform: translateY(0); }
        30% { transform: translateY(-8px); }
      }

      /* === Input Area === */
      .ori-input-area {
        padding: 16px 20px 12px; background: white;
        border-top: 1px solid #f1f5f9;
      }
      .ori-input-box {
        display: flex; align-items: flex-end; gap: 10px;
        border: 1px solid #e2e8f0; border-radius: 16px;
        padding: 10px 14px; background: #fafbfc;
        transition: border-color 0.2s, box-shadow 0.2s;
      }
      .ori-input-box:focus-within {
        border-color: ${primaryColor}; box-shadow: 0 0 0 3px ${primaryColor}12;
      }
      .ori-input-box svg { flex-shrink: 0; margin-bottom: 2px; }
      .ori-input-box textarea {
        flex: 1; border: none; outline: none; resize: none;
        font-size: 14px; font-family: inherit;
        color: #0f172a; background: transparent;
        line-height: 1.5; max-height: 100px;
      }
      .ori-input-box textarea::placeholder { color: #94a3b8; }
      .ori-send-ai {
        width: 36px; height: 36px; border-radius: 50%;
        background: linear-gradient(135deg, ${primaryColor}, #7c3aed);
        border: none; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        transition: opacity 0.2s, transform 0.2s; flex-shrink: 0;
      }
      .ori-send-ai:hover { transform: scale(1.05); }
      .ori-send-ai:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
      .ori-send-ai svg { width: 18px; height: 18px; fill: white; }

      /* === Footer === */
      .ori-foot {
        text-align: center; padding: 8px; font-size: 11px;
        color: #94a3b8; background: white;
      }

      /* === Mobile === */
      @media (max-width: 480px) {
        .ori-panel {
          width: 100vw; height: 100vh; max-width: 100vw; max-height: 100vh;
          border-radius: 0; position: fixed; inset: 0; margin: 0;
        }
        .ori-panel.open + .ori-fab { display: none; }
        .ori-input-area { padding-bottom: max(12px, env(safe-area-inset-bottom)); }
      }
    `;
  }

  /* ========================================
     Build Widget DOM
     ======================================== */

  function createWidget() {
    const host = document.createElement('div');
    host.id = 'ori-chat-widget';
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });

    const bot = config?.bot || {};
    const widget = config?.widget || {};
    const lang = detectLanguage();
    const botName = bot.bot_name || 'Ori';
    const avatarUrl = bot.avatar_url;
    const primaryColor = widget.primary_color || '#6366f1';
    const showPoweredBy = widget.show_powered_by !== false;
    const showFeedback = widget.show_feedback_buttons !== false;
    const quickReplies = bot.quick_replies || [
      lang === 'en' ? 'What is Integro Suite?' : '¿Qué es Integro Suite?',
      lang === 'en' ? 'Plans and pricing' : 'Planes y precios',
      lang === 'en' ? 'Technical support' : 'Soporte técnico',
    ];

    shadow.innerHTML = `
      <style>${getCSS()}</style>
      <div class="ori-panel" id="panel">
        <!-- Header -->
        <div class="ori-hdr">
          <div class="ori-hdr-avatar">
            ${avatarUrl ? `<img src="${avatarUrl}" alt="${botName}">` : botName.charAt(0)}
          </div>
          <div class="ori-hdr-info">
            <div class="ori-hdr-name">${botName}</div>
            <div class="ori-hdr-status">${lang === 'en' ? 'Online' : 'En línea'}</div>
          </div>
          <button class="ori-hdr-close" id="close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <!-- Body -->
        <div class="ori-body" id="body">
          <!-- Welcome (visible when no messages) -->
          <div class="ori-welcome" id="welcome">
            <div class="ori-orb">
              <svg viewBox="0 0 24 24" fill="none" stroke="${primaryColor}" stroke-width="1.5">
                <path d="M12 3l1.912 5.813a2 2 0 001.272 1.278L21 12l-5.816 1.91a2 2 0 00-1.272 1.278L12 21l-1.912-5.813a2 2 0 00-1.272-1.278L3 12l5.816-1.91a2 2 0 001.272-1.277L12 3z"/>
              </svg>
            </div>
            <h2>${lang === 'en' ? 'How can I help you?' : '¿Cómo puedo ayudarte?'}</h2>
            <p>${lang === 'en' ? `I'm ${botName}, your Integro Suite assistant.` : `Soy ${botName}, tu asistente de Integro Suite.`}</p>
            <div class="ori-chips" id="chips">
              ${quickReplies.map(q => `<button class="ori-chip">${q}</button>`).join('')}
            </div>
          </div>

          <!-- Messages container (hidden when welcome visible) -->
          <div class="ori-msgs" id="msgs" style="display:none;"></div>
        </div>

        <!-- Input -->
        <div class="ori-input-area">
          <div class="ori-input-box">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5">
              <path d="M12 3l1.912 5.813a2 2 0 001.272 1.278L21 12l-5.816 1.91a2 2 0 00-1.272 1.278L12 21l-1.912-5.813a2 2 0 00-1.272-1.278L3 12l5.816-1.91a2 2 0 001.272-1.277L12 3z"/>
            </svg>
            <textarea id="input" rows="1" placeholder="${lang === 'en' ? `Send a message to ${botName}...` : `Envía un mensaje a ${botName}...`}"></textarea>
            <button class="ori-send-ai" id="send">
              <svg viewBox="0 0 24 24"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
            </button>
          </div>
        </div>

        ${showPoweredBy ? '<div class="ori-foot">Powered by Integro Suite</div>' : ''}
      </div>

      <!-- FAB -->
      <button class="ori-fab" id="fab">
        <svg class="ori-icon-chat" viewBox="0 0 24 24">
          <path d="M12 3c5.5 0 10 3.58 10 8s-4.5 8-10 8c-1.24 0-2.43-.18-3.53-.5C5.55 21 2 21 2 21c2.33-2.33 2.7-3.9 2.75-4.5C3.05 15.07 2 13.13 2 11c0-4.42 4.5-8 10-8z"/>
        </svg>
        <svg class="ori-icon-close" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    `;

    // DOM refs
    const panel = shadow.getElementById('panel');
    const fab = shadow.getElementById('fab');
    const closeBtn = shadow.getElementById('close');
    const input = shadow.getElementById('input');
    const sendBtn = shadow.getElementById('send');
    const welcomeEl = shadow.getElementById('welcome');
    const msgsEl = shadow.getElementById('msgs');
    const chipsEl = shadow.getElementById('chips');

    // Auto-resize textarea
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 100) + 'px';
    });

    // Toggle
    function toggle() {
      isOpen = !isOpen;
      panel.classList.toggle('open', isOpen);
      fab.classList.toggle('open', isOpen);
      if (isOpen) input.focus();
    }
    fab.addEventListener('click', toggle);
    closeBtn.addEventListener('click', toggle);

    // Send
    async function handleSend(text) {
      const msg = (text || input.value).trim();
      if (!msg || isTyping) return;

      input.value = '';
      input.style.height = 'auto';

      // Switch from welcome to messages
      welcomeEl.style.display = 'none';
      msgsEl.style.display = 'flex';

      // Add user message
      messages.push({ role: 'user', content: msg });
      render();

      // Show typing
      isTyping = true;
      render();

      const response = await sendMessage(msg);
      isTyping = false;
      messages.push({ role: 'assistant', content: response.reply, id: response.messageId, sources: response.sources });
      render();
    }

    sendBtn.addEventListener('click', () => handleSend());
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    });

    // Chips
    chipsEl.addEventListener('click', (e) => {
      if (e.target.classList.contains('ori-chip')) handleSend(e.target.textContent);
    });

    // Render messages
    function render() {
      let html = '';
      for (const m of messages) {
        const isUser = m.role === 'user';
        html += `<div class="ori-msg ${isUser ? 'user' : 'bot'}">`;
        if (!isUser) html += `<div class="ori-msg-ava">${botName.charAt(0)}</div>`;
        html += `<div class="ori-msg-body"><div class="ori-bubble">${m.content.replace(/\n/g, '<br>')}</div>`;
        if (!isUser && showFeedback && m.id) {
          html += `<div class="ori-fb" data-id="${m.id}"><button data-f="positive">👍</button><button data-f="negative">👎</button></div>`;
        }
        html += `</div></div>`;
      }
      if (isTyping) {
        html += `<div class="ori-typing"><div class="ori-typing-ava">${botName.charAt(0)}</div><div class="ori-dots"><span></span><span></span><span></span></div></div>`;
      }
      msgsEl.innerHTML = html;
      msgsEl.scrollTop = msgsEl.scrollHeight;

      // Feedback
      msgsEl.querySelectorAll('.ori-fb button').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const fb = e.target.closest('.ori-fb');
          sendFeedback(fb.dataset.id, e.target.dataset.f);
          fb.querySelectorAll('button').forEach(b => b.classList.remove('on'));
          e.target.classList.add('on');
        });
      });
    }
  }

  /* ========================================
     Init
     ======================================== */
  async function init() {
    await fetchConfig();
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', createWidget);
    else createWidget();
  }
  init();
})();
