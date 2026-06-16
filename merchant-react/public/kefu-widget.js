(function () {
  var STYLE_ID = 'xiaoone-kefu-widget-style';
  var STORE_PREFIX = 'xiaoone.kefu.visitor.';

  function trimSlash(value) {
    return String(value || '').replace(/\/$/, '');
  }

  function scriptDataset() {
    var script = document.currentScript;
    if (!script) {
      var scripts = document.querySelectorAll('script[data-xiaoone-kefu]');
      script = scripts[scripts.length - 1];
    }
    return script ? script.dataset || {} : {};
  }

  function randomKey(appId) {
    var key = STORE_PREFIX + appId;
    try {
      var existing = window.localStorage.getItem(key);
      if (existing) return existing;
      var next = 'web-' + Date.now() + '-' + Math.random().toString(16).slice(2);
      window.localStorage.setItem(key, next);
      return next;
    }
    catch (err) {
      return 'web-' + Date.now() + '-' + Math.random().toString(16).slice(2);
    }
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '.x1-kefu-widget{position:fixed;right:24px;bottom:24px;z-index:2147483000;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#0f172a}',
      '.x1-kefu-widget.is-left{right:auto;left:24px}',
      '.x1-kefu-widget__bubble{width:56px;height:56px;border:0;border-radius:999px;background:var(--x1-kefu-primary,#6366f1);color:#fff;box-shadow:0 18px 40px rgba(15,23,42,.24);cursor:pointer;font-size:22px}',
      '.x1-kefu-widget__panel{position:absolute;right:0;bottom:72px;width:min(360px,calc(100vw - 32px));height:min(520px,calc(100vh - 120px));display:none;grid-template-rows:auto auto 1fr auto;border:1px solid rgba(148,163,184,.35);border-radius:16px;background:#fff;box-shadow:0 24px 60px rgba(15,23,42,.22);overflow:hidden}',
      '.x1-kefu-widget.is-left .x1-kefu-widget__panel{left:0;right:auto}',
      '.x1-kefu-widget.is-open .x1-kefu-widget__panel{display:grid}',
      '.x1-kefu-widget.is-dark .x1-kefu-widget__panel{background:#111827;color:#f8fafc;border-color:rgba(255,255,255,.12)}',
      '.x1-kefu-widget__head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;border-bottom:1px solid rgba(148,163,184,.25);font-weight:700}',
      '.x1-kefu-widget__status{font-size:12px;font-weight:500;color:#64748b}',
      '.x1-kefu-widget.is-dark .x1-kefu-widget__status{color:#94a3b8}',
      '.x1-kefu-widget__close{border:0;background:transparent;color:inherit;cursor:pointer;font-size:18px}',
      '.x1-kefu-widget__quick{display:none;gap:8px;flex-wrap:wrap;padding:10px 12px;border-bottom:1px solid rgba(148,163,184,.22);background:#fff}',
      '.x1-kefu-widget__quick.has-items{display:flex}',
      '.x1-kefu-widget.is-dark .x1-kefu-widget__quick{background:#111827;border-color:rgba(255,255,255,.12)}',
      '.x1-kefu-widget__quick-btn{border:1px solid rgba(99,102,241,.28);border-radius:999px;background:rgba(99,102,241,.08);color:var(--x1-kefu-primary,#6366f1);padding:6px 10px;font:inherit;font-size:12px;font-weight:700;cursor:pointer;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.x1-kefu-widget.is-dark .x1-kefu-widget__quick-btn{background:rgba(99,102,241,.18);border-color:rgba(129,140,248,.36);color:#c7d2fe}',
      '.x1-kefu-widget__messages{padding:14px;overflow:auto;background:#f8fafc}',
      '.x1-kefu-widget.is-dark .x1-kefu-widget__messages{background:#020617}',
      '.x1-kefu-widget__msg{max-width:82%;margin:0 0 10px;padding:10px 12px;border-radius:14px;font-size:14px;line-height:1.55;white-space:pre-wrap;word-break:break-word;background:#fff;border:1px solid rgba(148,163,184,.25)}',
      '.x1-kefu-widget.is-dark .x1-kefu-widget__msg{background:#1f2937;border-color:rgba(255,255,255,.1)}',
      '.x1-kefu-widget__msg.is-mine{margin-left:auto;background:var(--x1-kefu-primary,#6366f1);color:#fff;border-color:transparent}',
      '.x1-kefu-widget__form{display:flex;gap:8px;padding:12px;border-top:1px solid rgba(148,163,184,.25)}',
      '.x1-kefu-widget__input{flex:1;min-width:0;border:1px solid rgba(148,163,184,.45);border-radius:10px;padding:10px 12px;font:inherit;outline:none;background:#fff;color:#0f172a}',
      '.x1-kefu-widget.is-dark .x1-kefu-widget__input{background:#111827;color:#f8fafc;border-color:rgba(255,255,255,.16)}',
      '.x1-kefu-widget__send{border:0;border-radius:10px;padding:0 14px;background:var(--x1-kefu-primary,#6366f1);color:#fff;font-weight:700;cursor:pointer}'
    ].join('');
    document.head.appendChild(style);
  }

  function readError(body, fallback) {
    var code = String((body && body.code) || (body && body.data && body.data.error) || '').trim();
    var workspaceMessages = {
      workspace_suspended: '工作区已冻结或试用已到期，请续费会员后继续使用客服。',
      workspace_provisioning: '工作区正在开通或恢复中，请稍后再试。',
      workspace_failed: '工作区开通失败，请联系商户处理。',
      workspace_deleted: '工作区已注销，客服功能不可用。'
    };
    if (code && workspaceMessages[code]) return workspaceMessages[code];
    return String((body && body.data && body.data.message) || (body && body.message) || fallback);
  }

  function wsBaseFromApi(apiBase, explicit) {
    var url = new URL(explicit || apiBase || window.location.origin, window.location.origin);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.pathname = '/ws/visitor/';
    url.search = '';
    return url.toString();
  }

  function createWidget(options) {
    if (!options.appId || !options.apiKey) {
      throw new Error('Xiaoone kefu widget requires appId and apiKey.');
    }
    injectStyle();
    var apiBase = trimSlash(options.apiBaseUrl || window.location.origin);
    var root = document.createElement('div');
    root.className = 'x1-kefu-widget';
    root.style.setProperty('--x1-kefu-primary', '#6366f1');
    root.innerHTML = [
      '<div class="x1-kefu-widget__panel" role="dialog" aria-label="在线客服">',
      '<div class="x1-kefu-widget__head"><span><span data-title>在线客服</span><br><span class="x1-kefu-widget__status" data-status>未连接</span></span><button class="x1-kefu-widget__close" type="button" aria-label="关闭">x</button></div>',
      '<div class="x1-kefu-widget__quick" data-quick></div>',
      '<div class="x1-kefu-widget__messages" data-messages></div>',
      '<form class="x1-kefu-widget__form"><input class="x1-kefu-widget__input" data-input autocomplete="off" placeholder="请输入您要咨询的问题"><button class="x1-kefu-widget__send" type="submit">发送</button></form>',
      '</div>',
      '<button class="x1-kefu-widget__bubble" type="button" aria-label="在线客服">...</button>'
    ].join('');
    document.body.appendChild(root);

    var messages = root.querySelector('[data-messages]');
    var status = root.querySelector('[data-status]');
    var title = root.querySelector('[data-title]');
    var quick = root.querySelector('[data-quick]');
    var input = root.querySelector('[data-input]');
    var form = root.querySelector('form');
    var bubble = root.querySelector('.x1-kefu-widget__bubble');
    var close = root.querySelector('.x1-kefu-widget__close');
    var socket = null;
    var session = null;
    var pingTimer = null;
    var destroyed = false;
    var quickLoaded = false;

    function setStatus(text) {
      status.textContent = text;
    }

    function addMessage(role, content) {
      if (!content) return;
      var node = document.createElement('div');
      node.className = 'x1-kefu-widget__msg' + (role === 'visitor' ? ' is-mine' : '');
      node.textContent = String(content);
      messages.appendChild(node);
      messages.scrollTop = messages.scrollHeight;
    }

    function applyAppearance(appearance) {
      if (!appearance) return;
      var color = /^#[0-9a-f]{6}$/i.test(appearance.primary_color || '') ? appearance.primary_color : '#6366f1';
      root.style.setProperty('--x1-kefu-primary', color);
      root.classList.toggle('is-left', appearance.bubble_position === 'bottom-left');
      root.classList.toggle('is-dark', appearance.theme === 'dark');
      if (appearance.status_waiting_label) title.textContent = appearance.status_waiting_label;
      if (appearance.welcome_message) addMessage('bot', appearance.welcome_message);
    }

    function requestJson(path, payload) {
      return fetch(apiBase + path, {
        method: payload ? 'POST' : 'GET',
        headers: payload ? { 'Content-Type': 'application/json' } : undefined,
        body: payload ? JSON.stringify(payload) : undefined
      }).then(function (response) {
        return response.json().catch(function () { return {}; }).then(function (body) {
          if (!response.ok) throw new Error(readError(body, '客服服务暂时不可用'));
          return body.data || body;
        });
      });
    }

    function renderQuickReplies(items) {
      if (!quick) return;
      quick.innerHTML = '';
      var usable = (items || []).filter(function (item) {
        return item && String(item.text || '').trim();
      }).slice(0, 10);
      quick.classList.toggle('has-items', usable.length > 0);
      usable.forEach(function (item) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'x1-kefu-widget__quick-btn';
        btn.textContent = item.label || item.text;
        btn.title = item.text;
        btn.addEventListener('click', function () {
          send(item.text).catch(function (err) { setStatus(err.message || '消息发送失败'); });
        });
        quick.appendChild(btn);
      });
    }

    function loadQuickReplies() {
      if (quickLoaded || destroyed) return;
      quickLoaded = true;
      requestJson('/api/v1/kefu/visitor/quick-replies/', {
        app_id: options.appId,
        api_key: options.apiKey,
        limit: 10
      }).then(function (data) {
        renderQuickReplies(Array.isArray(data.items) ? data.items : []);
      }).catch(function () {
        quickLoaded = false;
      });
    }

    function connectSocket() {
      if (destroyed || !session || !window.WebSocket) return;
      if (socket) socket.close();
      if (pingTimer) window.clearInterval(pingTimer);
      var url = new URL(wsBaseFromApi(apiBase, options.wsBaseUrl));
      url.searchParams.set('conversation', session.conversationId);
      url.searchParams.set('token', session.visitorToken);
      socket = new WebSocket(url.toString());
      socket.onopen = function () {
        setStatus('已连接');
      };
      socket.onmessage = function (event) {
        var payload;
        try { payload = JSON.parse(event.data); }
        catch (err) { return; }
        if (payload.type === 'pong') return;
        if (payload.type === 'message') {
          var message = payload.data && (payload.data.message || payload.data);
          if (message && message.sender_role !== 'visitor')
            addMessage(message.sender_role || 'bot', message.visitor_content || message.content);
        }
        if (payload.type === 'state') {
          var state = payload.data && payload.data.conversation && payload.data.conversation.state;
          if (state === 'active') setStatus('人工客服已接入');
          if (state === 'closed') setStatus('会话已归档');
        }
      };
      socket.onclose = function () {
        if (destroyed) return;
        setStatus('实时通道重连中');
        window.setTimeout(function () {
          if (session && !destroyed) connectSocket();
        }, 3000);
      };
      pingTimer = window.setInterval(function () {
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'ping', ts: Date.now() }));
        }
      }, 20000);
    }

    function ensureSession() {
      if (session) return Promise.resolve(session);
      setStatus('连接中');
      return requestJson('/api/v1/chat/visitor/handshake/', {
        app_id: options.appId,
        api_key: options.apiKey,
        visitor_name: options.visitorName || '',
        visitor_key: options.visitorKey || randomKey(options.appId),
        visitor_email: options.visitorEmail || '',
        locale: options.locale || navigator.language || 'zh-CN',
        channel: options.channel || 'official_site',
        subject: options.subject || ''
      }).then(function (data) {
        session = {
          conversationId: data.conversation.id,
          visitorToken: data.visitor_token
        };
        applyAppearance(data.sdk_appearance);
        loadQuickReplies();
        connectSocket();
        setStatus('已连接');
        return session;
      });
    }

    function send(text) {
      return ensureSession().then(function (current) {
        var clientMessageId = 'widget-' + Date.now() + '-' + Math.random().toString(16).slice(2);
        addMessage('visitor', text);
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'visitor.send', content: text, client_message_id: clientMessageId }));
          return;
        }
        return requestJson('/api/v1/chat/visitor/messages/', {
          conversation: current.conversationId,
          token: current.visitorToken,
          content: text,
          client_message_id: clientMessageId
        }).then(function (data) {
          var items = Array.isArray(data.messages) ? data.messages : [data.auto_reply, data.message, data];
          items.forEach(function (item) {
            if (item && item.sender_role !== 'visitor')
              addMessage(item.sender_role || 'bot', item.visitor_content || item.content);
          });
        });
      });
    }

    bubble.addEventListener('click', function () {
      root.classList.toggle('is-open');
      if (root.classList.contains('is-open')) {
        ensureSession().catch(function (err) { setStatus(err.message || '客服服务暂时不可用'); });
      }
    });
    close.addEventListener('click', function () {
      root.classList.remove('is-open');
    });
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var text = input.value.trim();
      if (!text) return;
      input.value = '';
      send(text).catch(function (err) { setStatus(err.message || '消息发送失败'); });
    });

    return {
      open: function () { root.classList.add('is-open'); return ensureSession(); },
      close: function () { root.classList.remove('is-open'); },
      destroy: function () {
        destroyed = true;
        if (pingTimer) window.clearInterval(pingTimer);
        if (socket) socket.close();
        root.remove();
      }
    };
  }

  window.XiaooneKefuWidget = { mount: createWidget };

  var data = scriptDataset();
  if (data.appId && data.apiKey) {
    createWidget({
      appId: data.appId,
      apiKey: data.apiKey,
      apiBaseUrl: data.apiBaseUrl,
      wsBaseUrl: data.wsBaseUrl,
      visitorName: data.visitorName,
      visitorKey: data.visitorKey,
      visitorEmail: data.visitorEmail,
      locale: data.locale,
      channel: data.channel || 'official_site',
      subject: data.subject || ''
    });
  }
})();
