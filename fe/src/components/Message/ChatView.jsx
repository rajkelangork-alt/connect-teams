import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { Hash, Search, Users, Send, Paperclip, X, Settings as SettingsIcon } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useAuth } from '../../context/AuthContext';
import { useWebSocket } from '../../hooks/useWebSocket';
import api from '../../services/api';
import MessageItem from './MessageItem';
import ThreadPanel from './ThreadPanel';

const MESSAGES_KEY = 'ct_channel_messages';
const THREADS_KEY = 'ct_threads_cache';
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

export default function ChatView({ onOpenSearch, onOpenMembers, onOpenSettings }) {
  const { currentWorkspace, activeChannel, markAsRead } = useWorkspace() || {};
  const { user } = useAuth() || {};

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [activeThreadMessage, setActiveThreadMessage] = useState(null);

  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const typingTimerRef = useRef(null);
  const isInitialChannelLoad = useRef(true);

  const channelId = activeChannel?.id ? String(activeChannel.id) : '101';
  const channelName = (activeChannel?.name || 'general').replace(/^#+/, '');
  const currentUserEmail = String(user?.email || '').toLowerCase();
  const currentUserIdStr = String(user?.id || '').toLowerCase();

  const scrollToBottom = useCallback((behavior = 'auto') => {
    if (scrollContainerRef.current) {
      if (behavior === 'auto') {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      } else {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, []);

  const loadChannelMessages = useCallback((chId) => {
    const allStore = getJson(MESSAGES_KEY, {});
    const list = Array.isArray(allStore[chId]) ? allStore[chId] : [];
    setMessages(list);
    requestAnimationFrame(() => scrollToBottom('auto'));
  }, [scrollToBottom]);

  const persistChannelMessages = useCallback((chId, updatedList) => {
    const allStore = getJson(MESSAGES_KEY, {});
    allStore[chId] = updatedList;
    setJson(MESSAGES_KEY, allStore);
    setMessages(updatedList);
  }, []);

  useLayoutEffect(() => {
    if (isInitialChannelLoad.current && messages.length > 0) {
      scrollToBottom('auto');
      isInitialChannelLoad.current = false;
    }
  }, [messages, scrollToBottom]);

  useEffect(() => {
    isInitialChannelLoad.current = true;
    loadChannelMessages(channelId);
    setTypingUsers(new Set());
    setAttachedFiles([]);
    setActiveThreadMessage(null);

    if (markAsRead) {
      markAsRead(channelId);
    }

    const syncBackend = async () => {
      try {
        let res;
        try {
          res = await api.get(`/messages/channel/${channelId}`);
        } catch {
          res = await api.get(`/messages/?channel_id=${channelId}`);
        }
        if (res?.data) {
          const raw = Array.isArray(res.data) ? res.data : res.data?.items || [];
          if (raw.length > 0) {
            const allStore = getJson(MESSAGES_KEY, {});
            const local = Array.isArray(allStore[channelId]) ? allStore[channelId] : [];
            const map = new Map();
            local.forEach((m) => map.set(m.id, m));
            raw.forEach((m) => map.set(m.id, { ...map.get(m.id), ...m }));
            const merged = Array.from(map.values());
            persistChannelMessages(channelId, merged);
          }
        }
      } catch {}
    };

    syncBackend();
  }, [channelId, loadChannelMessages, persistChannelMessages, markAsRead]);

  const handleWsEvent = useCallback(
    (payload) => {
      if (payload.type === 'new_message' || payload.type === 'message') {
        const incoming = payload.message || payload.data || payload;
        setMessages((prev) => {
          if (prev.some((m) => m.id === incoming.id)) return prev;
          const updated = [...prev, incoming];
          const allStore = getJson(MESSAGES_KEY, {});
          allStore[channelId] = updated;
          setJson(MESSAGES_KEY, allStore);
          return updated;
        });
        if (markAsRead) markAsRead(channelId);
        setTimeout(() => scrollToBottom('smooth'), 50);
      }

      if (payload.type === 'typing' && payload.user_name) {
        if (payload.user_name === user?.full_name) return;
        setTypingUsers((prev) => new Set(prev).add(payload.user_name));
        setTimeout(() => {
          setTypingUsers((prev) => {
            const next = new Set(prev);
            next.delete(payload.user_name);
            return next;
          });
        }, 2500);
      }
    },
    [user?.full_name, channelId, scrollToBottom, markAsRead]
  );

  const { sendTyping } = useWebSocket(channelId, handleWsEvent);

  const handleTextareaChange = (e) => {
    setInputText(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;

    if (!typingTimerRef.current) {
      if (sendTyping) sendTyping(user?.full_name || 'User');
      typingTimerRef.current = setTimeout(() => {
        typingTimerRef.current = null;
      }, 1500);
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (attachedFiles.length + files.length > MAX_FILES) {
      alert(`Maximum of ${MAX_FILES} files allowed.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    try {
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        try {
          const { data } = await api.post('/files/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          return data;
        } catch {
          return {
            file_name: file.name,
            file_url: URL.createObjectURL(file),
            file_size: file.size,
          };
        }
      });

      const uploadedResults = await Promise.all(uploadPromises);
      setAttachedFiles((prev) => [...prev, ...uploadedResults]);
    } catch (err) {
      alert(`Upload note: ${err.message}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAttachedFile = (index) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const content = (inputText || '').trim();
    if ((!content && attachedFiles.length === 0) || isSending) return;

    setIsSending(true);

    const filesToSend = [...attachedFiles];
    const newMsg = {
      id: Date.now(),
      channel_id: channelId,
      content: content || (filesToSend.length === 1 ? filesToSend[0].file_name : `${filesToSend.length} attachments`),
      files: filesToSend,
      file_url: filesToSend.length > 0 ? filesToSend[0].file_url : null,
      file_name: filesToSend.length > 0 ? filesToSend[0].file_name : null,
      created_at: new Date().toISOString(),
      user_name: user?.full_name || 'User',
      sender_id: user?.id || currentUserEmail,
      sender_email: currentUserEmail,
    };

    const updated = [...messages, newMsg];
    persistChannelMessages(channelId, updated);

    setInputText('');
    setAttachedFiles([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    try {
      await api.post('/messages/', {
        content: newMsg.content,
        channel_id: activeChannel?.id || 1,
        files: filesToSend,
      });
    } catch {}

    setIsSending(false);
    setTimeout(() => scrollToBottom('smooth'), 50);
  };

  const handleAddReaction = async (messageId, emoji) => {
    const currentUserId = user?.id || currentUserEmail;
    const updated = messages.map((m) => {
      if (m.id !== messageId) return m;
      const reactions = Array.isArray(m.reactions) ? [...m.reactions] : [];
      const idx = reactions.findIndex((r) => r.emoji === emoji && (String(r.user_id).toLowerCase() === String(currentUserId).toLowerCase()));
      if (idx > -1) {
        reactions.splice(idx, 1);
      } else {
        reactions.push({ emoji, user_id: currentUserId, user_name: user?.full_name });
      }
      return { ...m, reactions };
    });

    persistChannelMessages(channelId, updated);
    try {
      await api.post(`/messages/${messageId}/reactions`, { emoji });
    } catch {}
  };

  const handleDeleteMessage = async (messageId) => {
    const updated = messages.filter((m) => m.id !== messageId);
    persistChannelMessages(channelId, updated);
    try {
      await api.delete(`/messages/${messageId}`);
    } catch {}
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const storedThreads = getJson(THREADS_KEY, {});
  const typingArray = Array.from(typingUsers);

  return (
    <div className="flex-1 flex h-screen overflow-hidden min-w-0">
      <main className="flex-1 h-screen flex flex-col bg-[#FDFBF7] dark:bg-[#0F0F11] min-w-0 transition-colors">
        {/* Header */}
        <header className="h-14 px-6 flex items-center justify-between border-b border-stone-200 dark:border-zinc-800/80 bg-white/50 dark:bg-[#121214]/50 backdrop-blur-sm shrink-0">
          <div className="flex items-center space-x-2.5 truncate">
            <Hash size={18} className="text-stone-500 dark:text-zinc-400 shrink-0" />
            <h1 className="text-sm font-semibold tracking-tight text-stone-900 dark:text-zinc-100 truncate">
              {channelName}
            </h1>

            {activeChannel?.topic && (
              <>
                <span className="text-stone-300 dark:text-zinc-700">|</span>
                <p className="text-xs text-stone-500 dark:text-zinc-400 truncate font-normal">
                  {activeChannel.topic}
                </p>
              </>
            )}
          </div>

          <div className="flex items-center space-x-3 text-stone-500 dark:text-zinc-400">
            <button
              onClick={onOpenSearch}
              title="Search workspace (Ctrl + K)"
              className="p-1.5 hover:text-stone-900 dark:hover:text-zinc-100 rounded-lg transition-colors cursor-pointer"
            >
              <Search size={16} />
            </button>
            <button
              onClick={onOpenMembers}
              title="Workspace members"
              className="p-1.5 hover:text-stone-900 dark:hover:text-zinc-100 rounded-lg transition-colors cursor-pointer"
            >
              <Users size={16} />
            </button>
            <button
              onClick={onOpenSettings}
              title="Workspace & channel settings"
              className="p-1.5 hover:text-stone-900 dark:hover:text-zinc-100 rounded-lg transition-colors cursor-pointer"
            >
              <SettingsIcon size={16} />
            </button>
          </div>
        </header>

        {/* Message Feed */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto py-4 flex flex-col justify-start">
          <div className="px-6 py-6 border-b border-stone-200/50 dark:border-zinc-800/50 mb-2">
            <div className="w-11 h-11 rounded-2xl bg-stone-200/70 dark:bg-zinc-800/60 flex items-center justify-center text-stone-700 dark:text-zinc-300 mb-2.5">
              <Hash size={22} />
            </div>
            <h2 className="text-base font-semibold text-stone-900 dark:text-zinc-100">
              Welcome to #{channelName}
            </h2>
            <p className="text-xs text-stone-500 dark:text-zinc-400 mt-1">
              This is the start of the #{channelName} channel in {currentWorkspace?.name || 'the workspace'}.
            </p>
          </div>

          <div className="flex-1 space-y-1">
            {messages.length === 0 ? (
              <div className="p-6 text-center text-xs text-stone-400 italic">
                No messages yet. Send a message to start the conversation.
              </div>
            ) : (
              messages.map((msg, index) => {
                if (!msg) return null;
                const senderEmailStr = String(msg.sender_email || '').toLowerCase();
                const senderIdStr = String(msg.sender_id || '').toLowerCase();
                
                // Safe check: NO calling .toLowerCase() on raw numeric values
                const isOwn =
                  senderEmailStr === currentUserEmail ||
                  senderIdStr === currentUserEmail ||
                  (currentUserIdStr && senderIdStr === currentUserIdStr);

                return (
                  <MessageItem
                    key={msg.id || index}
                    message={msg}
                    currentUserId={user?.id || currentUserEmail}
                    isOwnMessage={isOwn}
                    replyCount={(storedThreads[msg.id] || []).length}
                    onAddReaction={handleAddReaction}
                    onDeleteMessage={handleDeleteMessage}
                    onOpenThread={(m) => setActiveThreadMessage(m)}
                  />
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Typing indicator */}
        <div className="h-5 px-6 flex items-center">
          {typingArray.length > 0 && (
            <div className="flex items-center space-x-1.5 text-[11px] text-stone-500 dark:text-zinc-400">
              <span className="flex space-x-0.5">
                <span className="w-1 h-1 bg-stone-400 dark:bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1 h-1 bg-stone-400 dark:bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1 h-1 bg-stone-400 dark:bg-zinc-500 rounded-full animate-bounce" />
              </span>
              <span>{typingArray.join(', ')} typing...</span>
            </div>
          )}
        </div>

        {/* Attached files */}
        {attachedFiles.length > 0 && (
          <div className="px-4 pb-2 flex flex-wrap gap-2">
            {attachedFiles.map((file, idx) => (
              <div
                key={idx}
                className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-stone-200/70 dark:bg-zinc-800 border border-stone-300 dark:border-zinc-700 text-xs"
              >
                <Paperclip size={12} className="text-stone-500 dark:text-zinc-400" />
                <span className="font-medium text-stone-800 dark:text-zinc-200 truncate max-w-[140px]">
                  {file.file_name}
                </span>
                <button
                  type="button"
                  onClick={() => removeAttachedFile(idx)}
                  className="text-stone-400 hover:text-red-500 p-0.5 ml-1 cursor-pointer"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            <span className="text-[11px] text-stone-400 self-center">
              {attachedFiles.length}/{MAX_FILES}
            </span>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-4 pt-1 border-t border-stone-200/80 dark:border-zinc-800/80 bg-white/40 dark:bg-[#0F0F11]/40">
          <form
            onSubmit={handleSend}
            className="flex items-end space-x-2 bg-white dark:bg-[#18181B] border border-stone-300 dark:border-zinc-700 rounded-xl px-3 py-2 shadow-xs focus-within:ring-1 focus-within:ring-stone-500"
          >
            <input
              type="file"
              multiple
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || attachedFiles.length >= MAX_FILES}
              className="p-1 text-stone-400 hover:text-stone-800 dark:hover:text-zinc-200 disabled:opacity-30 cursor-pointer mb-0.5"
            >
              <Paperclip size={16} />
            </button>

            <textarea
              ref={textareaRef}
              rows={1}
              value={inputText}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder={`Message #${channelName}`}
              className="flex-1 text-xs bg-transparent text-stone-900 dark:text-zinc-100 placeholder-stone-400 focus:outline-none resize-none max-h-36 leading-relaxed py-1"
            />

            <button
              type="submit"
              disabled={(!inputText.trim() && attachedFiles.length === 0) || isSending || isUploading}
              className="p-1 text-stone-400 hover:text-stone-900 dark:hover:text-zinc-100 disabled:opacity-30 cursor-pointer mb-0.5"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      </main>

      {activeThreadMessage && (
        <ThreadPanel
          parentMessage={activeThreadMessage}
          onClose={() => setActiveThreadMessage(null)}
          currentUserId={user?.id || currentUserEmail}
          currentUserName={user?.full_name || 'User'}
        />
      )}
    </div>
  );
}