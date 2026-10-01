import React, { useState } from 'react';
import { Smile, MessageSquare, Trash2, Paperclip, Download } from 'lucide-react';

const COMMON_EMOJIS = ['👍', '❤️', '🔥', '🎉', '🚀', '👀'];

export default function MessageItem({
  message,
  currentUserId,
  isOwnMessage,
  replyCount = 0,
  onAddReaction,
  onDeleteMessage,
  onOpenThread,
}) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  if (!message) return null;

  // SAFE string conversion: prevents ".toLowerCase is not a function" on numbers
  const senderEmail = String(message.sender_email || '').toLowerCase();
  const senderId = String(message.sender_id || '').toLowerCase();
  const currentIdStr = String(currentUserId || '').toLowerCase();

  const isOwn =
    isOwnMessage !== undefined
      ? isOwnMessage
      : senderEmail === currentIdStr || senderId === currentIdStr;

  const authorName = message.user_name || message.author || 'User';

  const formatTime = (ts) => {
    if (!ts) return '';
    try {
      const d = new Date(ts);
      return isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const timeString = formatTime(message.created_at || message.timestamp);

  return (
    <div className="group relative flex items-start space-x-3 px-6 py-2 hover:bg-stone-200/40 dark:hover:bg-zinc-800/40 transition-colors">
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-stone-300 dark:bg-zinc-700 flex items-center justify-center text-xs font-semibold text-stone-800 dark:text-zinc-200 shrink-0 select-none">
        {authorName.charAt(0).toUpperCase()}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline space-x-2">
          <span className="text-xs font-semibold text-stone-900 dark:text-zinc-100">
            {authorName}
          </span>
          {timeString && (
            <span className="text-[10px] text-stone-400 dark:text-zinc-500 font-normal">
              {timeString}
            </span>
          )}
        </div>

        <div className="text-xs text-stone-800 dark:text-zinc-200 leading-relaxed mt-0.5 break-words">
          {message.content}
        </div>

        {/* Attachments */}
        {Array.isArray(message.files) && message.files.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {message.files.map((file, idx) => (
              <a
                key={idx}
                href={file.file_url || '#'}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-stone-200/70 dark:bg-zinc-800 border border-stone-300 dark:border-zinc-700 text-xs hover:opacity-80 transition-opacity"
              >
                <Paperclip size={12} className="text-stone-500 dark:text-zinc-400" />
                <span className="text-[11px] font-medium text-stone-800 dark:text-zinc-200 truncate max-w-[150px]">
                  {file.file_name || 'attachment'}
                </span>
                <Download size={11} className="text-stone-400" />
              </a>
            ))}
          </div>
        )}

        {/* Reactions List */}
        {Array.isArray(message.reactions) && message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {message.reactions.map((r, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onAddReaction && onAddReaction(message.id, r.emoji)}
                className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-full text-[11px] bg-stone-200/80 dark:bg-zinc-800 border border-stone-300 dark:border-zinc-700"
              >
                <span>{r.emoji}</span>
              </button>
            ))}
          </div>
        )}

        {/* Thread replies button */}
        {replyCount > 0 && (
          <button
            type="button"
            onClick={() => onOpenThread && onOpenThread(message)}
            className="mt-1.5 inline-flex items-center space-x-1 text-[11px] text-stone-500 hover:text-stone-900 dark:hover:text-zinc-100 font-medium cursor-pointer"
          >
            <MessageSquare size={12} />
            <span>{replyCount} {replyCount === 1 ? 'reply' : 'replies'}</span>
          </button>
        )}
      </div>

      {/* Floating Action Menu on Hover */}
      <div className="absolute right-6 -top-3 hidden group-hover:flex items-center bg-white dark:bg-[#18181B] border border-stone-200 dark:border-zinc-700 rounded-lg shadow-sm px-1 py-0.5 space-x-0.5 z-10">
        <button
          type="button"
          onClick={() => setShowEmojiPicker((prev) => !prev)}
          title="Add reaction"
          className="p-1 text-stone-400 hover:text-stone-800 dark:hover:text-zinc-200 rounded cursor-pointer"
        >
          <Smile size={13} />
        </button>

        {onOpenThread && (
          <button
            type="button"
            onClick={() => onOpenThread(message)}
            title="Reply in thread"
            className="p-1 text-stone-400 hover:text-stone-800 dark:hover:text-zinc-200 rounded cursor-pointer"
          >
            <MessageSquare size={13} />
          </button>
        )}

        {isOwn && onDeleteMessage && (
          <button
            type="button"
            onClick={() => onDeleteMessage(message.id)}
            title="Delete message"
            className="p-1 text-stone-400 hover:text-red-600 rounded cursor-pointer"
          >
            <Trash2 size={13} />
          </button>
        )}

        {/* Emoji Palette */}
        {showEmojiPicker && (
          <div className="absolute right-0 top-7 bg-white dark:bg-[#18181B] border border-stone-200 dark:border-zinc-700 rounded-lg shadow-lg p-1.5 flex space-x-1 z-20">
            {COMMON_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  if (onAddReaction) onAddReaction(message.id, emoji);
                  setShowEmojiPicker(false);
                }}
                className="hover:scale-125 transition-transform text-sm p-1 cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}