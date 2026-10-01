import React, { useState, useEffect, useRef } from 'react';
import { X, Send, MessageSquare } from 'lucide-react';
import api from '../../services/api';

const THREAD_STORAGE_KEY = 'connect_teams_threads';

const getStoredThreads = () => {
  try {
    const raw = localStorage.getItem(THREAD_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveStoredThreads = (threads) => {
  try {
    localStorage.setItem(THREAD_STORAGE_KEY, JSON.stringify(threads));
  } catch (err) {
    console.warn('Failed to cache threads:', err);
  }
};

export default function ThreadPanel({ parentMessage, onClose, currentUserId, currentUserName }) {
  const [replies, setReplies] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const repliesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const parentId = parentMessage?.id;

  const scrollToBottom = () => {
    repliesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!parentId) return;

    const stored = getStoredThreads();
    const cached = stored[parentId] || [];
    setReplies(cached);

    const fetchReplies = async () => {
      try {
        const { data } = await api.get(`/messages/${parentId}/replies`);
        if (Array.isArray(data)) {
          setReplies(data);
          stored[parentId] = data;
          saveStoredThreads(stored);
        }
      } catch {
        // Cached fallback
      }
    };

    fetchReplies();
  }, [parentId]);

  const handleReplyChange = (e) => {
    setReplyText(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  const handleSendReply = async (e) => {
    if (e) e.preventDefault();
    const content = replyText.trim();
    if (!content || isSending || !parentId) return;

    setIsSending(true);

    const newReply = {
      id: Date.now(),
      parent_id: parentId,
      content,
      created_at: new Date().toISOString(),
      user_id: currentUserId,
      user_name: currentUserName,
    };

    try {
      try {
        const res = await api.post(`/messages/${parentId}/replies`, { content });
        if (res?.data) {
          newReply.id = res.data.id || newReply.id;
        }
      } catch {
        // Fallback local persistence
      }

      setReplies((prev) => {
        const updated = [...prev, newReply];
        const stored = getStoredThreads();
        stored[parentId] = updated;
        saveStoredThreads(stored);
        return updated;
      });

      setReplyText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      setTimeout(scrollToBottom, 50);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  const parentSender =
    parentMessage.sender?.full_name ||
    parentMessage.user_name ||
    parentMessage.sender?.email ||
    'Teammate';

  return (
    <aside className="w-80 md:w-96 h-screen flex flex-col bg-[#FAF9F6] dark:bg-[#121214] border-l border-stone-200 dark:border-zinc-800 shrink-0 transition-colors z-20">
      {/* Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-stone-200 dark:border-zinc-800">
        <div className="flex items-center space-x-2">
          <MessageSquare size={16} className="text-stone-500 dark:text-zinc-400" />
          <h3 className="text-sm font-semibold text-stone-900 dark:text-zinc-100">Thread</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-stone-400 hover:text-stone-800 dark:hover:text-zinc-200 rounded-lg transition-colors cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>

      {/* Main Thread Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Root Message Card */}
        <div className="p-3 rounded-xl bg-stone-100 dark:bg-zinc-800/50 border border-stone-200 dark:border-zinc-700/60">
          <div className="flex items-center space-x-2 mb-1.5">
            <div className="w-6 h-6 rounded-full bg-stone-300 dark:bg-zinc-700 flex items-center justify-center text-[10px] font-semibold text-stone-800 dark:text-zinc-200">
              {parentSender.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs font-semibold text-stone-900 dark:text-zinc-100 truncate">
              {parentSender}
            </span>
          </div>
          <p className="text-xs text-stone-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
            {parentMessage.content}
          </p>
        </div>

        <div className="flex items-center space-x-2 px-1">
          <span className="text-[11px] font-medium text-stone-400 uppercase tracking-wider">
            {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
          </span>
          <div className="flex-1 h-px bg-stone-200 dark:bg-zinc-800" />
        </div>

        {/* Reply List */}
        <div className="space-y-3">
          {replies.map((reply) => (
            <div key={reply.id} className="flex items-start space-x-2.5">
              <div className="w-6 h-6 rounded-full bg-stone-300 dark:bg-zinc-700 flex items-center justify-center text-[10px] font-semibold text-stone-800 dark:text-zinc-200 shrink-0">
                {(reply.user_name || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline space-x-2">
                  <span className="text-xs font-medium text-stone-900 dark:text-zinc-200">
                    {reply.user_name || 'Teammate'}
                  </span>
                  <span className="text-[10px] text-stone-400">
                    {new Date(reply.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-xs text-stone-700 dark:text-zinc-300 mt-0.5 whitespace-pre-wrap leading-relaxed">
                  {reply.content}
                </p>
              </div>
            </div>
          ))}
          <div ref={repliesEndRef} />
        </div>
      </div>

      {/* Auto-Expanding Textarea for Thread */}
      <div className="p-3 border-t border-stone-200 dark:border-zinc-800 bg-white/40 dark:bg-[#121214]/40">
        <form
          onSubmit={handleSendReply}
          className="flex items-end space-x-2 bg-white dark:bg-[#18181B] border border-stone-300 dark:border-zinc-700 rounded-xl px-3 py-2 shadow-xs focus-within:ring-1 focus-within:ring-stone-500"
        >
          <textarea
            ref={textareaRef}
            rows={1}
            value={replyText}
            onChange={handleReplyChange}
            onKeyDown={handleKeyDown}
            placeholder="Reply in thread..."
            className="flex-1 text-xs bg-transparent text-stone-900 dark:text-zinc-100 placeholder-stone-400 focus:outline-none resize-none max-h-28 leading-relaxed py-1"
          />
          <button
            type="submit"
            disabled={!replyText.trim() || isSending}
            className="p-1 text-stone-400 hover:text-stone-900 dark:hover:text-zinc-100 disabled:opacity-30 transition-colors cursor-pointer mb-0.5"
          >
            <Send size={14} />
          </button>
        </form>
      </div>
    </aside>
  );
}