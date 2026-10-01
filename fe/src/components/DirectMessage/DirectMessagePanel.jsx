import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Send, Paperclip, User, Download, Shield } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useAuth } from '../../context/AuthContext';

const MESSAGES_KEY = 'ct_channel_messages';
const MAX_FILES = 5;

const getJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const setJson = (key, val) => {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (err) {
    console.warn(`Write error on ${key}:`, err);
  }
};

export default function DirectMessagePanel() {
  const { activeDM, closeDM, markAsRead, adminProfile } = useWorkspace() || {};
  const { user } = useAuth() || {};

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [isSending, setIsSending] = useState(false);

  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Current session info
  const currentUserEmail = String(user?.email || 'admin@connectteams.com').toLowerCase();
  const currentUserIdStr = String(user?.id || '');

  // Target DM participant info
  const targetUserEmail = String(activeDM?.email || '').toLowerCase();
  const targetUserIdStr = String(activeDM?.id || '');

  const isSelf = targetUserEmail === currentUserEmail || (activeDM && targetUserIdStr === currentUserIdStr);
  const isTargetSystemAdmin = targetUserEmail === 'admin@connectteams.com';
  const isTargetMemberAdmin = !isTargetSystemAdmin && activeDM?.role === 'admin';

  // Dynamic admin name resolver: ensures "RK" or any custom name set by admin is used
  const targetBaseName = isTargetSystemAdmin
    ? (adminProfile?.full_name || 'System Admin')
    : (activeDM?.full_name || (activeDM?.email ? String(activeDM.email).split('@')[0] : 'User'));

  const displayName = isSelf ? `${targetBaseName} (you)` : targetBaseName;

  const targetId = activeDM
    ? isSelf
      ? `dm_self_${currentUserEmail}`
      : `dm_${[currentUserEmail, targetUserEmail].sort().join('__')}`
    : null;

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    try {
      messagesEndRef.current?.scrollIntoView({ behavior });
    } catch {}
  }, []);

  const loadDMMessages = useCallback(() => {
    if (!targetId) {
      setMessages([]);
      return;
    }
    try {
      const allStore = getJson(MESSAGES_KEY, {});
      const list = Array.isArray(allStore[targetId]) ? allStore[targetId] : [];
      setMessages(list);
      setTimeout(() => scrollToBottom('auto'), 40);
    } catch (e) {
      console.error('Error loading DM messages:', e);
      setMessages([]);
    }
  }, [targetId, scrollToBottom]);

  useEffect(() => {
    if (targetId) {
      loadDMMessages();
      if (markAsRead) {
        try {
          markAsRead(targetId);
        } catch {}
      }
    } else {
      setMessages([]);
    }
  }, [targetId, loadDMMessages, markAsRead]);

  if (!activeDM) return null;

  const handleSend = (e) => {
    if (e) e.preventDefault();
    const content = (inputText || '').trim();
    if (!content && attachedFiles.length === 0) return;
    if (isSending || !targetId) return;

    setIsSending(true);

    const senderDisplayName = currentUserEmail === 'admin@connectteams.com'
      ? (adminProfile?.full_name || 'System Admin')
      : (user?.full_name || 'User');

    const nowIso = new Date().toISOString();
    const newMsg = {
      id: Date.now(),
      channel_id: targetId,
      content: content || (attachedFiles.length === 1 ? attachedFiles[0].file_name : `${attachedFiles.length} files`),
      files: [...attachedFiles],
      file_url: attachedFiles.length > 0 ? attachedFiles[0].file_url : null,
      file_name: attachedFiles.length > 0 ? attachedFiles[0].file_name : null,
      created_at: nowIso,
      user_name: senderDisplayName,
      sender_id: user?.id || currentUserEmail,
      sender_email: currentUserEmail,
    };

    const allStore = getJson(MESSAGES_KEY, {});
    const existing = Array.isArray(allStore[targetId]) ? allStore[targetId] : [];
    const updated = [...existing, newMsg];
    allStore[targetId] = updated;
    setJson(MESSAGES_KEY, allStore);

    setMessages(updated);
    setInputText('');
    setAttachedFiles([]);
    setIsSending(false);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setTimeout(() => scrollToBottom('smooth'), 50);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (attachedFiles.length + files.length > MAX_FILES) {
      alert(`Maximum of ${MAX_FILES} files allowed.`);
      return;
    }

    const newFiles = files.map((f) => ({
      file_name: f.name,
      file_url: URL.createObjectURL(f),
      file_size: f.size,
    }));
    setAttachedFiles((prev) => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatMessageTime = (isoString) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <aside className="w-80 md:w-96 h-screen flex flex-col bg-[#FDFBF7] dark:bg-[#111113] border-l border-stone-200 dark:border-zinc-800 shrink-0 transition-colors z-30 shadow-2xl">
      {/* DM Header with Dynamic Name and Badges */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-stone-200 dark:border-zinc-800 bg-white/70 dark:bg-[#151518]/70 backdrop-blur-xs shrink-0">
        <div className="flex items-center space-x-2.5 truncate">
          <div className="relative shrink-0">
            <div className="w-7 h-7 rounded-full bg-stone-300 dark:bg-zinc-700 flex items-center justify-center text-xs font-semibold text-stone-800 dark:text-zinc-200">
              {String(targetBaseName || 'U').charAt(0).toUpperCase()}
            </div>
            <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border border-white dark:border-[#111113]" />
          </div>

          <div className="truncate">
            <div className="flex items-center space-x-1.5 truncate">
              <h3 className="text-xs font-semibold text-stone-900 dark:text-zinc-100 truncate">
                {displayName}
              </h3>

              {/* System Admin Badge */}
              {isTargetSystemAdmin && (
                <span className="text-[9px] px-1.5 py-0.2 rounded font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                  System Admin
                </span>
              )}

              {/* Member Admin Badge */}
              {isTargetMemberAdmin && (
                <span className="text-[9px] px-1.5 py-0.2 rounded font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                  admin
                </span>
              )}
            </div>
            <p className="text-[10px] text-stone-400 truncate">Direct Message</p>
          </div>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={() => closeDM && closeDM()}
          title="Close Direct Message"
          className="p-1.5 text-stone-400 hover:text-stone-900 dark:hover:text-zinc-100 hover:bg-stone-200/60 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Profile Card inside DM conversation */}
        <div className="p-3 text-center rounded-xl bg-stone-100/60 dark:bg-zinc-900/40 border border-stone-200/50 dark:border-zinc-800/50">
          <div className="w-8 h-8 mx-auto rounded-full bg-stone-200 dark:bg-zinc-800 flex items-center justify-center text-stone-700 dark:text-zinc-300 mb-1">
            <User size={16} />
          </div>
          
          <div className="flex items-center justify-center space-x-1.5">
            <p className="text-xs font-bold text-stone-800 dark:text-zinc-200">{displayName}</p>
            {isTargetSystemAdmin && (
              <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                System Admin
              </span>
            )}
            {isTargetMemberAdmin && (
              <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                admin
              </span>
            )}
          </div>

          <p className="text-[10px] text-stone-400 mt-0.5">
            {isSelf ? 'Personal notes & reminders' : `Direct messaging space with ${targetBaseName}`}
          </p>
        </div>

        {(!messages || messages.length === 0) ? (
          <p className="text-center text-[11px] text-stone-400 italic py-6">
            No messages yet. Send a message to {targetBaseName}.
          </p>
        ) : (
          messages.map((msg, idx) => {
            if (!msg) return null;
            const senderEmail = String(msg.sender_email || '').toLowerCase();
            const senderId = String(msg.sender_id || '').toLowerCase();
            const isMe =
              senderEmail === currentUserEmail ||
              senderId === currentUserEmail ||
              (currentUserIdStr && senderId === currentUserIdStr);

            const msgAuthor = isMe
              ? 'You'
              : (msg.sender_email === 'admin@connectteams.com'
                  ? (adminProfile?.full_name || 'System Admin')
                  : (msg.user_name || targetBaseName));

            const msgTime = formatMessageTime(msg.created_at || msg.timestamp);

            return (
              <div
                key={msg.id || idx}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center space-x-1 mb-0.5 text-[10px] text-stone-400">
                  <span className="font-semibold text-stone-600 dark:text-zinc-300">
                    {msgAuthor}
                  </span>
                  {msgTime && (
                    <>
                      <span>•</span>
                      <span>{msgTime}</span>
                    </>
                  )}
                </div>

                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed break-words shadow-xs ${
                    isMe
                      ? 'bg-stone-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-br-xs'
                      : 'bg-stone-200/80 text-stone-900 dark:bg-zinc-800 dark:text-zinc-100 rounded-bl-xs'
                  }`}
                >
                  <p>{msg.content || ''}</p>

                  {Array.isArray(msg.files) && msg.files.length > 0 && (
                    <div className="mt-1.5 space-y-1">
                      {msg.files.map((f, i) => (
                        <a
                          key={i}
                          href={f?.file_url || '#'}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center space-x-1 underline text-[10px] opacity-90 hover:opacity-100"
                        >
                          <Download size={10} />
                          <span className="truncate max-w-[150px]">{f?.file_name || 'attachment'}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Attachment Previews */}
      {attachedFiles.length > 0 && (
        <div className="px-3 pb-1 flex flex-wrap gap-1.5">
          {attachedFiles.map((file, idx) => (
            <span
              key={idx}
              className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] bg-stone-200 dark:bg-zinc-800 text-stone-700 dark:text-zinc-300"
            >
              <span className="truncate max-w-[100px]">{file.file_name}</span>
              <button
                type="button"
                onClick={() => setAttachedFiles((prev) => prev.filter((_, i) => i !== idx))}
                className="text-stone-400 hover:text-red-500 cursor-pointer"
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input Bar */}
      <div className="p-3 border-t border-stone-200 dark:border-zinc-800 bg-white/40 dark:bg-[#111113]/40 shrink-0">
        <form
          onSubmit={handleSend}
          className="relative flex flex-col justify-between bg-white dark:bg-[#18181B] border border-stone-300 dark:border-zinc-700 rounded-xl p-3 h-[130px] shadow-xs focus-within:ring-1 focus-within:ring-stone-400"
        >
          <input
            type="file"
            multiple
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Text Area: Comfortably accommodates 6 lines without a scrollbar */}
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${displayName}`}
            className="w-full flex-1 text-xs bg-transparent text-stone-900 dark:text-zinc-100 placeholder-stone-400 focus:outline-none resize-none leading-5 overflow-y-auto pr-1"
          />

          {/* Bottom Bar: Action buttons pinned to bottom-left and bottom-right */}
          <div className="flex items-center justify-between pt-1 border-t border-stone-100 dark:border-zinc-800/60 mt-1 shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Attach files"
              className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-zinc-200 cursor-pointer transition-colors"
            >
              <Paperclip size={16} />
            </button>

            <button
              type="submit"
              disabled={!inputText.trim() && attachedFiles.length === 0}
              title="Send message"
              className="p-1 text-stone-400 hover:text-stone-900 dark:hover:text-zinc-100 disabled:opacity-30 cursor-pointer transition-colors"
            >
              <Send size={16} />
            </button>
          </div>
        </form>
      </div>
    </aside>
  );
}