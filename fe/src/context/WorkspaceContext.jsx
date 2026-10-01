import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const WorkspaceContext = createContext(null);

const STORAGE_KEYS = {
  WORKSPACES: 'ct_persistent_workspaces',
  CHANNELS: 'ct_persistent_channels',
  MEMBERS: 'ct_persistent_members',
  CURRENT_WS: 'ct_current_workspace_id',
  ADMIN_PROFILE: 'ct_system_admin_profile',
  MESSAGES: 'ct_channel_messages',
};

export const sanitizeChannelName = (name) => {
  return (name || '')
    .trim()
    .toLowerCase()
    .replace(/^[#\s\-_]+/, '')
    .replace(/[#\s\-_]+$/, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
};

const DEFAULT_WORKSPACES = [
  { id: 1, name: 'Acme Engineering', slug: 'acme-engineering' },
  { id: 2, name: 'Pi.ai', slug: 'pi-ai' },
];

const DEFAULT_CHANNELS = {
  1: [
    { id: 101, name: 'general', topic: 'General discussion', workspace_id: 1 },
    { id: 102, name: 'be-dev-group', topic: 'Backend engineering', workspace_id: 1 },
    { id: 103, name: 'fe-dev', topic: 'Frontend engineering', workspace_id: 1 },
    { id: 104, name: 'dev-ops', topic: 'DevOps & infrastructure', workspace_id: 1 },
  ],
  2: [
    { id: 201, name: 'general', topic: 'General Pi discussions', workspace_id: 2 },
  ],
};

const DEFAULT_ADMIN_PROFILE = {
  id: 'admin_root',
  full_name: 'System Admin',
  email: 'admin@connectteams.com',
  role: 'superadmin',
  is_online: true,
};

const DEFAULT_MEMBERS = {
  1: [
    { id: 'user_alex', full_name: 'Alex Mercer', email: 'alex@connectteams.com', role: 'member', is_online: true },
  ],
  2: [],
};

const getStored = (key, fallback) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
};

const setStored = (key, val) => {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (err) {
    console.warn(`Error writing to ${key}:`, err);
  }
};

export const WorkspaceProvider = ({ children }) => {
  const [workspaces, setWorkspaces] = useState(() => getStored(STORAGE_KEYS.WORKSPACES, DEFAULT_WORKSPACES));
  const [adminProfile, setAdminProfile] = useState(() => getStored(STORAGE_KEYS.ADMIN_PROFILE, DEFAULT_ADMIN_PROFILE));

  const [channelsMap, setChannelsMap] = useState(() => {
    const stored = getStored(STORAGE_KEYS.CHANNELS, DEFAULT_CHANNELS);
    const cleaned = {};
    Object.keys(stored).forEach((wsId) => {
      cleaned[wsId] = (stored[wsId] || []).map((ch) => ({
        ...ch,
        name: sanitizeChannelName(ch.name),
      }));
    });
    return cleaned;
  });

  const [membersMap, setMembersMap] = useState(() => {
    const stored = getStored(STORAGE_KEYS.MEMBERS, DEFAULT_MEMBERS);
    const cleaned = {};
    Object.keys(stored).forEach((wsId) => {
      cleaned[wsId] = (stored[wsId] || []).filter((m) => {
        if (!m || !m.email) return false;
        const em = m.email.toLowerCase();
        if (em.includes('@pi.ai') || em.includes('elena') || em === 'admin@connectteams.com') return false;
        return em.endsWith('@connectteams.com');
      });
    });
    return cleaned;
  });

  // RULE: Always default strictly to the FIRST workspace in the list on startup/login
  const [currentWorkspace, setCurrentWorkspace] = useState(() => {
    const initialList = getStored(STORAGE_KEYS.WORKSPACES, DEFAULT_WORKSPACES);
    return initialList && initialList.length > 0 ? initialList[0] : DEFAULT_WORKSPACES[0];
  });

  const [channels, setChannels] = useState([]);
  const [members, setMembers] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [activeDM, setActiveDM] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});

  useEffect(() => {
    setStored(STORAGE_KEYS.WORKSPACES, workspaces);
  }, [workspaces]);

  useEffect(() => {
    setStored(STORAGE_KEYS.ADMIN_PROFILE, adminProfile);
  }, [adminProfile]);

  useEffect(() => {
    setStored(STORAGE_KEYS.CHANNELS, channelsMap);
  }, [channelsMap]);

  useEffect(() => {
    setStored(STORAGE_KEYS.MEMBERS, membersMap);
  }, [membersMap]);

  const updateAdminName = (newName) => {
    const trimmed = (newName || '').trim();
    if (!trimmed) return;
    const updated = { ...adminProfile, full_name: trimmed };
    setAdminProfile(updated);

    try {
      const activeUser = getStored('user', null);
      if (activeUser && activeUser.email === 'admin@connectteams.com') {
        const syncedUser = { ...activeUser, full_name: trimmed };
        setStored('user', syncedUser);
      }
    } catch {}
  };

  const getUserReceipts = useCallback(() => {
    try {
      const activeUser = getStored('user', null);
      const userKey = activeUser?.email ? `ct_receipts_${activeUser.email.toLowerCase()}` : 'ct_receipts_guest';
      return getStored(userKey, {});
    } catch {
      return {};
    }
  }, []);

  const setUserReceipts = useCallback((newMap) => {
    try {
      const activeUser = getStored('user', null);
      const userKey = activeUser?.email ? `ct_receipts_${activeUser.email.toLowerCase()}` : 'ct_receipts_guest';
      setStored(userKey, newMap);
    } catch {}
  }, []);

  const computeUnreads = useCallback(() => {
    const allMessagesStore = getStored(STORAGE_KEYS.MESSAGES, {});
    const currentUser = getStored('user', null);
    if (!currentUser?.email) return;

    const currentEmail = currentUser.email.toLowerCase();
    const receipts = getUserReceipts();
    const counts = {};

    Object.entries(allMessagesStore).forEach(([convId, msgList]) => {
      if (!Array.isArray(msgList) || msgList.length === 0) return;

      const lastRead = receipts[convId] || 0;
      const unreadCount = msgList.filter((msg) => {
        if (!msg) return false;
        const msgTime = new Date(msg.created_at || msg.timestamp || 0).getTime();
        const senderEmail = String(msg.sender_email || msg.sender_id || '').toLowerCase();
        const isFromOther = senderEmail !== currentEmail && senderEmail !== '';
        return isFromOther && msgTime > lastRead;
      }).length;

      if (unreadCount > 0) {
        counts[convId] = unreadCount;
      }
    });

    setUnreadCounts(counts);
  }, [getUserReceipts]);

  useEffect(() => {
    computeUnreads();
    const interval = setInterval(computeUnreads, 1500);
    return () => clearInterval(interval);
  }, [computeUnreads]);

  const markAsRead = useCallback(
    (convId) => {
      if (!convId) return;
      const receipts = getUserReceipts();
      const updated = {
        ...receipts,
        [convId]: Date.now(),
      };
      setUserReceipts(updated);

      setUnreadCounts((prev) => {
        const next = { ...prev };
        delete next[convId];
        return next;
      });
    },
    [getUserReceipts, setUserReceipts]
  );

  const refreshWorkspaceData = useCallback((wsId) => {
    if (!wsId) return;

    setChannelsMap((prevChannelsMap) => {
      let wsChannels = prevChannelsMap[wsId];
      if (!wsChannels || wsChannels.length === 0) {
        wsChannels = [
          {
            id: Number(`${wsId}01`),
            name: 'general',
            topic: 'General discussion',
            workspace_id: wsId,
          },
        ];
      }
      wsChannels = wsChannels.map((ch) => ({ ...ch, name: sanitizeChannelName(ch.name) }));
      setChannels(wsChannels);

      const generalCh = wsChannels.find((c) => c.name.toLowerCase() === 'general') || wsChannels[0];
      setActiveChannel(generalCh);

      return { ...prevChannelsMap, [wsId]: wsChannels };
    });

    setMembersMap((prevMembersMap) => {
      const wsMembers = (prevMembersMap[wsId] || []).filter((m) =>
        m.email.endsWith('@connectteams.com') && !m.email.includes('elena') && m.email !== 'admin@connectteams.com'
      );
      setMembers(wsMembers);
      return { ...prevMembersMap, [wsId]: wsMembers };
    });

    setActiveDM(null);
  }, []);

  useEffect(() => {
    if (currentWorkspace?.id) {
      setStored(STORAGE_KEYS.CURRENT_WS, currentWorkspace.id);
      refreshWorkspaceData(currentWorkspace.id);
    }
  }, [currentWorkspace?.id, refreshWorkspaceData]);

  // Expose an explicit function to reset to the first listed workspace upon login
  const resetToFirstWorkspace = useCallback(() => {
    const list = getStored(STORAGE_KEYS.WORKSPACES, DEFAULT_WORKSPACES);
    if (list && list.length > 0) {
      setCurrentWorkspace(list[0]);
      setStored(STORAGE_KEYS.CURRENT_WS, list[0].id);
      refreshWorkspaceData(list[0].id);
    }
    setActiveDM(null);
  }, [refreshWorkspaceData]);

  const selectWorkspace = (ws) => {
    if (!ws) return;
    setCurrentWorkspace(ws);
    setStored(STORAGE_KEYS.CURRENT_WS, ws.id);
    setActiveDM(null);
  };

  const renameWorkspace = (wsId, newName) => {
    const trimmed = (newName || '').trim();
    if (!trimmed) return;

    setWorkspaces((prev) =>
      prev.map((w) => (w.id === wsId ? { ...w, name: trimmed, slug: trimmed.toLowerCase().replace(/\s+/g, '-') } : w))
    );

    setCurrentWorkspace((prev) =>
      prev?.id === wsId ? { ...prev, name: trimmed, slug: trimmed.toLowerCase().replace(/\s+/g, '-') } : prev
    );
  };

  const selectChannel = (ch) => {
    if (!ch) return;
    setActiveChannel(ch);
    markAsRead(String(ch.id));
  };

  const openDM = (dmMember, currentUserEmail) => {
    if (!dmMember) return;
    setActiveDM(dmMember);

    const isSelf = String(dmMember.email || '').toLowerCase() === String(currentUserEmail || '').toLowerCase();
    const dmKey = isSelf
      ? `dm_self_${currentUserEmail || 'me'}`
      : `dm_${[currentUserEmail || 'userA', dmMember.email].sort().join('__')}`;

    markAsRead(dmKey);
  };

  const closeDM = () => {
    setActiveDM(null);
  };

  const getGlobalMembers = useCallback(() => {
    const map = new Map();
    Object.values(membersMap).forEach((list) => {
      (list || []).forEach((m) => {
        if (
          m &&
          m.email &&
          m.email.toLowerCase().endsWith('@connectteams.com') &&
          !m.email.toLowerCase().includes('elena') &&
          m.email.toLowerCase() !== 'admin@connectteams.com'
        ) {
          map.set(m.email.toLowerCase(), m);
        }
      });
    });
    return Array.from(map.values());
  }, [membersMap]);

  const allWorkspaceParticipants = [
    adminProfile,
    ...(members || []),
  ];

  const addMemberToWorkspace = async (rawEmail, rawFullName = '', requestedRole = 'member') => {
    if (!currentWorkspace?.id || !rawEmail) return { success: false, error: 'Invalid details' };
    const wsId = currentWorkspace.id;

    let email = rawEmail.trim().toLowerCase();
    if (!email.includes('@')) {
      email = `${email}@connectteams.com`;
    }

    if (email === 'admin@connectteams.com') {
      return { success: false, error: 'admin@connectteams.com is reserved for the System Admin.' };
    }

    const currentWsMembers = membersMap[wsId] || [];
    if (currentWsMembers.some((m) => m.email.toLowerCase() === email)) {
      return { success: false, error: 'This user already exists in this workspace.' };
    }

    const allMembers = getGlobalMembers();
    const isBrandNewGlobal = !allMembers.some((m) => m.email.toLowerCase() === email);
    if (isBrandNewGlobal && allMembers.length >= 7) {
      return { success: false, error: 'Limit reached: Maximum 7 member accounts allowed across workspaces.' };
    }

    let finalRole = requestedRole === 'admin' ? 'admin' : 'member';
    if (finalRole === 'admin') {
      const currentAdminCount = allMembers.filter((m) => m.role === 'admin').length;
      if (currentAdminCount >= 2) {
        return { success: false, error: 'Admin badge limit reached: Only 2 members can hold the Admin badge.' };
      }
    }

    const cleanUsername = email.split('@')[0].replace(/[\._]/g, ' ');
    const defaultDisplayName = cleanUsername.charAt(0).toUpperCase() + cleanUsername.slice(1);

    const newMember = {
      id: `user_${Date.now()}`,
      full_name: rawFullName.trim() || defaultDisplayName,
      email,
      role: finalRole,
      is_online: true,
    };

    setMembersMap((prev) => {
      const updated = [...(prev[wsId] || []), newMember];
      setMembers(updated);
      return { ...prev, [wsId]: updated };
    });

    try {
      await api.post(`/workspaces/${wsId}/members`, { email: newMember.email, role: newMember.role });
    } catch {}

    return { success: true, member: newMember };
  };

  const updateMemberRole = (memberId, targetRole) => {
    const wsId = currentWorkspace.id;
    const allMembers = getGlobalMembers();

    if (targetRole === 'admin') {
      const currentAdminCount = allMembers.filter(
        (m) => m.role === 'admin' && String(m.id) !== String(memberId)
      ).length;

      if (currentAdminCount >= 2) {
        alert('Cannot grant Admin badge: Maximum limit of 2 Admin badge members reached.');
        return false;
      }
    }

    setMembersMap((prev) => {
      const updatedMap = {};
      Object.keys(prev).forEach((wId) => {
        updatedMap[wId] = (prev[wId] || []).map((m) => {
          if (String(m.id) === String(memberId)) return { ...m, role: targetRole };
          return m;
        });
      });
      setMembers(updatedMap[wsId] || []);
      return updatedMap;
    });

    return true;
  };

  const deleteMember = (memberId) => {
    const wsId = currentWorkspace.id;

    setMembersMap((prev) => {
      const updatedMap = {};
      Object.keys(prev).forEach((wId) => {
        updatedMap[wId] = (prev[wId] || []).filter((m) => String(m.id) !== String(memberId));
      });

      const currentList = updatedMap[wsId] || [];
      setMembers(currentList);
      return updatedMap;
    });

    if (activeDM && String(activeDM.id) === String(memberId)) {
      setActiveDM(null);
    }
  };

  const createChannel = async (rawName, topic = '') => {
    const cleanName = sanitizeChannelName(rawName);
    if (!cleanName || !currentWorkspace?.id) return;

    const wsId = currentWorkspace.id;
    const newChan = {
      id: Date.now(),
      name: cleanName,
      topic: topic || `${cleanName} channel`,
      workspace_id: wsId,
    };

    setChannelsMap((prev) => {
      const existing = prev[wsId] || [];
      if (existing.some((c) => sanitizeChannelName(c.name) === cleanName)) return prev;
      const updated = [...existing, newChan];
      setChannels(updated);
      return { ...prev, [wsId]: updated };
    });

    setActiveChannel(newChan);
    markAsRead(String(newChan.id));

    try {
      await api.post(`/workspaces/${wsId}/channels`, { name: cleanName, topic });
    } catch {}
  };

  const renameChannel = async (channelId, rawNewName, newTopic = null) => {
    const cleanNewName = sanitizeChannelName(rawNewName);
    if (!cleanNewName || !currentWorkspace?.id) return;

    const wsId = currentWorkspace.id;

    setChannelsMap((prevMap) => {
      const currentList = prevMap[wsId] || [];
      const updatedList = currentList.map((ch) => {
        if (ch.id === channelId) {
          return {
            ...ch,
            name: cleanNewName,
            topic: newTopic !== null ? newTopic : ch.topic,
          };
        }
        return ch;
      });

      setChannels(updatedList);

      setActiveChannel((prevActive) => {
        if (prevActive && prevActive.id === channelId) {
          return {
            ...prevActive,
            name: cleanNewName,
            topic: newTopic !== null ? newTopic : prevActive.topic,
          };
        }
        return prevActive;
      });

      return { ...prevMap, [wsId]: updatedList };
    });

    try {
      await api.patch(`/channels/${channelId}`, {
        name: cleanNewName,
        ...(newTopic !== null ? { topic: newTopic } : {}),
      });
    } catch {}
  };

  const deleteChannel = async (channelId) => {
    if (!currentWorkspace?.id) return;
    const wsId = currentWorkspace.id;

    setChannelsMap((prev) => {
      const existing = prev[wsId] || [];
      const updated = existing.filter((c) => c.id !== channelId);
      const safeUpdated = updated.length > 0 ? updated : [
        { id: Number(`${wsId}01`), name: 'general', topic: 'General discussion', workspace_id: wsId }
      ];
      setChannels(safeUpdated);
      setActiveChannel(safeUpdated[0]);
      return { ...prev, [wsId]: safeUpdated };
    });

    try {
      await api.delete(`/channels/${channelId}`);
    } catch {}
  };

  const createWorkspace = async (rawName) => {
    const cleanName = (rawName || '').trim();
    if (!cleanName) return null;

    const newWs = {
      id: Date.now(),
      name: cleanName,
      slug: cleanName.toLowerCase().replace(/\s+/g, '-'),
    };

    const defaultGeneral = {
      id: Number(`${newWs.id}01`),
      name: 'general',
      topic: `General discussion for ${newWs.name}`,
      workspace_id: newWs.id,
    };

    const baseMembers = [];

    // Append to workspaces list and initialize empty member/channel sets
    setWorkspaces((prev) => [...prev.filter((w) => w.name.toLowerCase() !== cleanName.toLowerCase()), newWs]);
    setChannelsMap((prev) => ({ ...prev, [newWs.id]: [defaultGeneral] }));
    setMembersMap((prev) => ({ ...prev, [newWs.id]: baseMembers }));

    // IMPORTANT: DO NOT call setCurrentWorkspace(newWs) here!
    // The current active workspace in the main dashboard remains unchanged.

    return newWs;
  };

  const deleteWorkspace = async (wsId) => {
    if (workspaces.length <= 1) {
      alert('You cannot delete the only remaining workspace.');
      return;
    }

    const updatedWorkspaces = workspaces.filter((w) => w.id !== wsId);
    setWorkspaces(updatedWorkspaces);

    setChannelsMap((prev) => {
      const clone = { ...prev };
      delete clone[wsId];
      return clone;
    });

    setMembersMap((prev) => {
      const clone = { ...prev };
      delete clone[wsId];
      return clone;
    });

    setCurrentWorkspace(updatedWorkspaces[0]);
  };

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        currentWorkspace,
        selectWorkspace,
        resetToFirstWorkspace,
        renameWorkspace,
        channels,
        activeChannel,
        selectChannel,
        members,
        adminProfile,
        updateAdminName,
        allWorkspaceParticipants,
        globalMembers: getGlobalMembers(),
        addMemberToWorkspace,
        updateMemberRole,
        deleteMember,
        activeDM,
        openDM,
        selectDM: openDM,
        closeDM,
        unreadCounts,
        markAsRead,
        createChannel,
        renameChannel,
        deleteChannel,
        createWorkspace,
        addWorkspace: createWorkspace,
        deleteWorkspace,
        refreshWorkspaces: refreshWorkspaceData,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};