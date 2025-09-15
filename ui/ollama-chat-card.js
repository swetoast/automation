// ollama-chat-card.js

class OllamaChatCard extends HTMLElement {
  setConfig(config) {
    this.config = {
      host: config.host || 'http://localhost',
      port: config.port || '11434',
      model: config.model || 'llama3.1',
      thinkingDebounce: 300,
      minThinkingMs: 2000,
      notreachable_message:
        config.notreachable_message || '⚠️ Server is not reachable',
      check_interval: config.check_interval || 15000,
      check_timeout: config.check_timeout || 4000,
      ...config
    };

    this.messages = [];
    this.status = '';
    this.thinkingData = '';
    this._thinkingBuffer = '';
    this._thinkingTimer = null;
    this._thinkingStart = null;

    this.serverOnline = null;    // null = unknown, true = online, false = offline
    this._heartbeatTimer = null;

    this.render();
    this._startHeartbeat();
  }

  connectedCallback() {
    if (!this._heartbeatTimer) this._startHeartbeat();
  }

  disconnectedCallback() {
    this._stopHeartbeat();
  }

  _startHeartbeat() {
    this._stopHeartbeat();
    this._checkAndUpdateStatus(true);
    this._heartbeatTimer = setInterval(
      () => this._checkAndUpdateStatus(false),
      this.config.check_interval
    );
  }

  _stopHeartbeat() {
    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer);
      this._heartbeatTimer = null;
    }
  }

  async _checkAndUpdateStatus(isInitial) {
    const reachable = await this._checkServerReachable();
    if (reachable !== this.serverOnline) {
      this.serverOnline = reachable;
      this.render();
    } else if (isInitial) {
      this.render();
    }
  }

  async _checkServerReachable() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.check_timeout);
    try {
      const res = await fetch(`${this.config.host}:${this.config.port}/`, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (!res.ok) return false;
      const text = await res.text();
      return text.includes('Ollama is running');
    } catch {
      clearTimeout(timeout);
      return false;
    }
  }

  render() {
    if (this.serverOnline === false) {
      this.innerHTML = `
<ha-card style="display:flex;align-items:center;justify-content:center;height:400px;">
  <style>
    .offline-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 20px;
      color: var(--primary-text-color);
      font-size: 1.2rem;
      gap: 8px;
    }
    .offline-icon {
      font-size: 2.5rem;
      opacity: 0.7;
    }
  </style>
  <div class="offline-container">
    <div class="offline-icon">🚫</div>
    <div>${this.config.notreachable_message}</div>
    <div style="font-size:0.9rem;opacity:0.7;">Retrying…</div>
  </div>
</ha-card>`;
      return;
    }

    this.innerHTML = `
<ha-card style="display:flex;flex-direction:column;height:400px;max-height:400px;">
  <style>
    :host {
      display: flex;
      flex-direction: column;
      height: 400px;
      max-height: 400px;
    }

    .chat-log {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      padding: 4px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .bubble {
      display: inline-block;
      width: auto;
      max-width: 60%;
      margin: 2px 0;
      padding: 4px 8px;
      border-radius: 12px;
      white-space: pre-wrap;
      word-break: break-word;
      position: relative;
    }
    .bubble.user {
      align-self: flex-start;
      background-color: var(--secondary-background-color);
      color: var(--primary-text-color);
    }
    .bubble.assistant {
      align-self: flex-end;
      background-color: var(--primary-color);
      color: var(--text-primary-color);
    }

    .thinking-bubble {
      display: inline-block;
      align-self: flex-end;
      background-color: var(--info-color, var(--secondary-background-color));
      color: var(--primary-text-color);
      border: 1px dashed var(--divider-color);
      font-style: italic;
      padding: 4px 8px;
      border-radius: 12px;
    }

    pre {
      background: var(--code-editor-background-color);
      color: var(--primary-text-color);
      padding: 4px;
      border-radius: 6px;
      overflow-x: auto;
      margin: 2px 0;
    }

    .copy-btn {
      opacity: 0;
      position: absolute;
      top: 4px;
      right: 4px;
      background: transparent;
      color: inherit;
      border: 1px solid currentColor;
      padding: 1px 4px;
      font-size: 0.6rem;
      border-radius: 4px;
      cursor: pointer;
      transition: opacity 0.15s ease;
    }
    .bubble.assistant:hover .copy-btn {
      opacity: 1;
    }
    .copy-btn.copied {
      background: var(--text-primary-color);
      color: var(--primary-color);
    }

    .chat-input {
      display: flex;
      border-top: 1px solid var(--divider-color);
      padding: 4px;
      gap: 4px;
      background: var(--card-background-color);
    }
    .chat-input input {
      flex: 1;
      border: none;
      padding: 6px;
      background: var(--input-background-color, var(--card-background-color));
      color: var(--primary-text-color);
      border-radius: 6px;
      font-size: 1rem;
    }
    .chat-input button {
      background: var(--primary-color);
      color: var(--text-primary-color);
      border: none;
      padding: 0 12px;
      cursor: pointer;
      border-radius: 6px;
      font-size: 1rem;
      flex-shrink: 0;
    }
  </style>

  <div class="chat-log"></div>
  <div class="chat-input">
    <input type="text" placeholder="Type your message…" />
    <button>Send</button>
  </div>
</ha-card>`;

    this.querySelector('button').addEventListener('click', () => this.sendMessage());
    this.querySelector('input').addEventListener('keydown', e => {
      if (e.key === 'Enter') this.sendMessage();
    });

    this.renderChat();
  }

  async sendMessage() {
    const input = this.querySelector('input');
    const text = input.value.trim();
    if (!text) return;

    if (this.serverOnline === false) {
      this.render();
      return;
    }

    this.messages.push({ role: 'user', content: text });
    input.value = '';
    this.status = 'thinking';
    this.thinkingData = '';
    this._thinkingBuffer = '';
    this._thinkingStart = Date.now();
    this.renderChat();

    try {
      const res = await fetch(
        `${this.config.host}:${this.config.port}/api/chat`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: this.config.model,
            messages: this.messages,
            think: true,
            stream: true
          })
        }
      );
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let partial = '';
      let gotContent = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.replace(/\r\n/g, '\n').split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.trim()) continue;
          const json = JSON.parse(line);

          if (!gotContent && json.message?.thinking) {
            this._accumulateThinking(json.message.thinking);
          }

          if (json.message?.content) {
            if (!gotContent) {
              gotContent = true;
              const elapsed = Date.now() - this._thinkingStart;
              const wait = Math.max(0, this.config.minThinkingMs - elapsed);
              setTimeout(() => {
                this.status = 'typing';
                this.thinkingData = '';
                this._thinkingBuffer = '';
                partial += json.message.content;
                this.renderPartial(partial);
              }, wait);
            } else {
              partial += json.message.content;
              this.renderPartial(partial);
            }
          }

          if (json.done) {
            if (gotContent) {
              this.messages.push({ role: 'assistant', content: partial });
            }
            this.status = '';
            this.thinkingData = '';
            this._thinkingBuffer = '';
            this.renderChat();
          }
        }
      }
    } catch (err) {
      console.warn('Chat stream error:', err);
      this.serverOnline = false;
      this.render();
    }
  }

  _accumulateThinking(chunk) {
    this._thinkingBuffer += chunk;
    if (/[.!?]["')\]]?\s*$/.test(this._thinkingBuffer)) {
      this._flushThinking();
    } else {
      clearTimeout(this._thinkingTimer);
      this._thinkingTimer = setTimeout(
        () => this._flushThinking(),
        this.config.thinkingDebounce
      );
    }
  }

  _flushThinking() {
    if (!this._thinkingBuffer) return;
    this.thinkingData = this._thinkingBuffer.trim();
    this._thinkingBuffer = '';
    this.renderChat();
  }

  renderPartial(text) {
    const log = this.querySelector('.chat-log');
    if (!log) return;
    const bubbles = this.messages.map(m => this.formatMessage(m)).join('');
    log.innerHTML = bubbles + `<div class="bubble assistant">${text}</div>`;
    log.scrollTop = log.scrollHeight;
    this._attachCopyHandlers();

    // If you’ve loaded Prism in Lovelace resources, this will colorize code blocks
    if (window.Prism) {
      Prism.highlightAllUnder(log);
    }
  }

  renderChat() {
    const log = this.querySelector('.chat-log');
    if (!log) return;
    let html = this.messages.map(m => this.formatMessage(m)).join('');
    if (this.status === 'thinking' && this.thinkingData) {
      html += `<div class="bubble thinking-bubble">${this.thinkingData}</div>`;
    }
    log.innerHTML = html;
    log.scrollTop = log.scrollHeight;
    this._attachCopyHandlers();

    if (window.Prism) {
      Prism.highlightAllUnder(log);
    }
  }

  _attachCopyHandlers() {
    const log = this.querySelector('.chat-log');
    if (!log) return;
    log.querySelectorAll('.copy-btn').forEach(btn => {
      btn.onclick = () => {
        const text = decodeURIComponent(btn.dataset.content || '');
        navigator.clipboard.writeText(text).then(() => {
          btn.textContent = '✔';
          btn.classList.add('copied');
          setTimeout(() => {
            btn.textContent = 'Copy';
            btn.classList.remove('copied');
          }, 1200);
        });
      };
    });
  }

  formatMessage(m) {
    let content = m.content;

    // handle fenced code blocks, preserve `language-` class
    if (content.includes('```')) {
      content = content.replace(
        /```(\w+)?\n([\s\S]*?)```/g,
        (_, lang = 'none', code) => {
          const escaped = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
          return `<pre><code class="language-${lang}">${escaped}</code></pre>`;
        }
      );
    }

    if (m.role === 'assistant') {
      // no leading spaces or line breaks
      return `<div class="bubble assistant">${content}
<button class="copy-btn" data-content="${encodeURIComponent(m.content)}">Copy</button>
</div>`;
    }

    return `<div class="bubble user">${content}</div>`;
  }

  getCardSize() {
    return 4;
  }
}

customElements.define('ollama-chat-card', OllamaChatCard);
