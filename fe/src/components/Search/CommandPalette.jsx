import React, { useState, useEffect, useRef } from 'react';
import { Search, Hash, MessageSquare, FileText, ArrowRight, X } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import api from '../../services/api';

const ATTACHMENT_STORAGE_KEY = 'connect_teams_attachments';

export default function CommandPalette({ isOpen, onClose }) {
  const { channels, selectChannel } = useWorkspace();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ channels: [], messages: [], files: [] });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Keyboard navigation & escape handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, flatResults.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && flatResults[selectedIndex]) {
        e.preventDefault();
        handleSelect(flatResults[selectedIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Query search across channels, messages, and files
  useEffect(() => {
    if (!query.trim()) {
      setResults({
        channels: channels.slice(0, 5).map((c) => ({ ...c, type: 'channel' })),
        messages: [],
        files: [],
      });
      return;
    }

    const q = query.toLowerCase();

    // 1. Matched Channels
    const matchedChannels = channels
      .filter((c) => c.name.toLowerCase().includes(q) || c.topic?.toLowerCase().includes(q))
      .map((c) => ({ ...c, type: 'channel' }));

    // 2. Matched Files (from local attachment cache)
    let storedFiles = [];
    try {
      const raw = localStorage.getItem(ATTACHMENT_STORAGE_KEY);
      const attachments = raw ? JSON.parse(raw) : {};
      Object.entries(attachments).forEach(([msgId, files]) => {
        files.forEach((f) => {
          if (f.file_name?.toLowerCase().includes(q)) {
            storedFiles.push({ ...f, message_id: msgId, type: 'file' });
          }
        });
      });
    } catch {
      storedFiles = [];
    }

    // 3. Search Messages from API or fallbacks
    const searchMessages = async () => {
      setIsSearching(true);
      let matchedMessages = [];
      try {
        const { data } = await api.get(`/search/?q=${encodeURIComponent(query)}`);
        matchedMessages = (Array.isArray(data) ? data : data.messages || []).map((m) => ({
          ...m,
          type: 'message',
        }));
      } catch {
        matchedMessages = [];
      } finally {
        setIsSearching(false);
        setResults({
          channels: matchedChannels,
          messages: matchedMessages,
          files: storedFiles,
        });
      }
    };

    searchMessages();
  }, [query, channels]);

  // Flattened results for continuous index navigation
  const flatResults = [
    ...results.channels,
    ...results.files,
    ...results.messages,
  ];

  const handleSelect = (item) => {
    if (item.type === 'channel') {
      selectChannel(item);
      onClose();
    } else if (item.type === 'file') {
      window.open(item.file_url, '_blank', 'noopener,noreferrer');
      onClose();
    } else if (item.type === 'message') {
      const targetChan = channels.find((c) => c.id === item.channel_id);
      if (targetChan) selectChannel(targetChan);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-start justify-center pt-24 z-50 p-4">
      <div
        className="w-full max-w-xl bg-white dark:bg-[#151518] border border-stone-200 dark:border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-colors animate-in fade-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-stone-200 dark:border-zinc-800/80">
          <Search size={18} className="text-stone-400 dark:text-zinc-500 mr-2.5 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search channels, files, or message history..."
            className="flex-1 bg-transparent text-sm text-stone-900 dark:text-zinc-100 placeholder-stone-400 dark:placeholder-zinc-500 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-stone-400 hover:text-stone-600 dark:hover:text-zinc-300 p-1 mr-1"
            >
              <X size={14} />
            </button>
          )}
          <span className="text-[10px] bg-stone-100 dark:bg-zinc-800 text-stone-500 dark:text-zinc-400 px-1.5 py-0.5 rounded border border-stone-200 dark:border-zinc-700 select-none">
            ESC
          </span>
        </div>

        {/* Results Container */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-3">
          {/* Channels */}
          {results.channels.length > 0 && (
            <div>
              <p className="px-3 py-1 text-[10px] font-semibold text-stone-400 dark:text-zinc-500 uppercase tracking-wider">
                Channels
              </p>
              <div className="space-y-0.5">
                {results.channels.map((ch) => {
                  const currIdx = flatResults.indexOf(ch);
                  const isSelected = currIdx === selectedIndex;
                  return (
                    <button
                      key={ch.id}
                      onClick={() => handleSelect(ch)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors ${
                        isSelected
                          ? 'bg-stone-200/70 dark:bg-zinc-800 text-stone-900 dark:text-zinc-100'
                          : 'text-stone-700 dark:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-800/40'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <Hash size={14} className="text-stone-400 shrink-0" />
                        <span className="font-medium">{ch.name}</span>
                        {ch.topic && (
                          <span className="text-[11px] text-stone-400 dark:text-zinc-500 truncate">
                            — {ch.topic}
                          </span>
                        )}
                      </div>
                      <ArrowRight size={12} className={isSelected ? 'opacity-100' : 'opacity-0'} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Files */}
          {results.files.length > 0 && (
            <div>
              <p className="px-3 py-1 text-[10px] font-semibold text-stone-400 dark:text-zinc-500 uppercase tracking-wider">
                Files & Media
              </p>
              <div className="space-y-0.5">
                {results.files.map((file, idx) => {
                  const currIdx = flatResults.indexOf(file);
                  const isSelected = currIdx === selectedIndex;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelect(file)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors ${
                        isSelected
                          ? 'bg-stone-200/70 dark:bg-zinc-800 text-stone-900 dark:text-zinc-100'
                          : 'text-stone-700 dark:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-800/40'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <FileText size={14} className="text-blue-500 shrink-0" />
                        <span className="font-medium truncate">{file.file_name}</span>
                      </div>
                      <span className="text-[10px] text-stone-400">Open file</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Messages */}
          {results.messages.length > 0 && (
            <div>
              <p className="px-3 py-1 text-[10px] font-semibold text-stone-400 dark:text-zinc-500 uppercase tracking-wider">
                Messages
              </p>
              <div className="space-y-0.5">
                {results.messages.map((msg) => {
                  const currIdx = flatResults.indexOf(msg);
                  const isSelected = currIdx === selectedIndex;
                  return (
                    <button
                      key={msg.id}
                      onClick={() => handleSelect(msg)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors ${
                        isSelected
                          ? 'bg-stone-200/70 dark:bg-zinc-800 text-stone-900 dark:text-zinc-100'
                          : 'text-stone-700 dark:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-800/40'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <MessageSquare size={14} className="text-stone-400 shrink-0" />
                        <span className="truncate">{msg.content}</span>
                      </div>
                      <span className="text-[10px] text-stone-400 shrink-0">Jump</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {flatResults.length === 0 && (
            <div className="p-8 text-center text-xs text-stone-400 dark:text-zinc-500">
              {isSearching ? 'Searching...' : `No results found for "${query}"`}
            </div>
          )}
        </div>

        {/* Footer Shortcut Hints */}
        <div className="px-4 py-2 bg-stone-50 dark:bg-zinc-900/60 border-t border-stone-200 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-stone-400 dark:text-zinc-500">
          <div className="flex items-center space-x-3">
            <span>
              <kbd className="font-mono bg-stone-200/70 dark:bg-zinc-800 px-1 py-0.5 rounded text-[10px]">
                ↑
              </kbd>{' '}
              <kbd className="font-mono bg-stone-200/70 dark:bg-zinc-800 px-1 py-0.5 rounded text-[10px]">
                ↓
              </kbd>{' '}
              Navigate
            </span>
            <span>
              <kbd className="font-mono bg-stone-200/70 dark:bg-zinc-800 px-1 py-0.5 rounded text-[10px]">
                ↵
              </kbd>{' '}
              Select
            </span>
          </div>
          <span>Quick Workspace Finder</span>
        </div>
      </div>
    </div>
  );
}