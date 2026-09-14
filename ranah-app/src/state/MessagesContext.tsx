import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { localTransport } from '../messages/transport';
import { useContacts } from './ContactsContext';
import { readPersisted, usePersist } from './persist';

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

// One text message. `from` and `to` are user ids: your own (`myId`) or the
// other person's. For now the other person's id is their contact id; once
// CloClo has accounts it becomes their CloClo user id, and each person's app
// fetches only messages whose `to` is their own id (see messages/transport).
export interface Message {
  id: string;
  from: string;
  to: string;
  text: string;
  at: number;
  status: MessageStatus;
  // When you read a message sent to you.
  readAt?: number;
}

// Everything with one other person, newest message first.
export interface Conversation {
  peerId: string;
  last: Message;
  unread: number;
}

interface Profile {
  id: string;
}

const HOUR = 60 * 60 * 1000;
const newId = (prefix: string) => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

// A few starter conversations for a fresh install.
function seedMessages(me: string, now: number): Message[] {
  const message = (from: string, to: string, text: string, hoursAgo: number, read: boolean): Message => ({
    id: newId('m'),
    from,
    to,
    text,
    at: now - hoursAgo * HOUR,
    status: 'sent',
    readAt: read ? now - hoursAgo * HOUR + 60 * 1000 : undefined,
  });
  return [
    message(me, 'nadia', 'Dinner this Friday?', 26, true),
    message('nadia', me, 'Yes! 7 pm at the usual place 🍝', 25, true),
    message('nadia', me, 'Running a little late — save me a seat!', 2, false),
    message(me, 'omar', 'Call you after work', 20, true),
    message('omar', me, '👍', 19.5, true),
    message('mama', me, 'كلميني لما توصلي يا حبيبتي ❤️', 0.7, false),
  ];
}

interface MessagesValue {
  // This device's user id (an account id, once CloClo has accounts).
  myId: string;
  // Conversations with people still in Contacts, most recent first.
  conversations: Conversation[];
  unreadTotal: number;
  // All messages with one person, oldest first.
  thread: (peerId: string) => Message[];
  sendMessage: (peerId: string, text: string) => void;
  // A message arriving from someone (for now only from the preview button).
  receiveMessage: (peerId: string, text: string) => void;
  markThreadRead: (peerId: string) => void;
  deleteMessage: (id: string) => void;
  deleteThread: (peerId: string) => void;
}

const MessagesContext = createContext<MessagesValue | null>(null);

export function MessagesProvider({ children }: { children: React.ReactNode }) {
  const { contactById } = useContacts();
  const [profile] = useState<Profile>(() =>
    readPersisted<Profile>('profile', { id: newId('me-') }, (v) => typeof (v as Profile | null)?.id === 'string')
  );
  usePersist('profile', profile);
  const myId = profile.id;
  const [messages, setMessages] = useState<Message[]>(() => readPersisted('messages', seedMessages(myId, Date.now()), Array.isArray));
  usePersist('messages', messages);

  const peerOf = useCallback((message: Message) => (message.from === myId ? message.to : message.from), [myId]);

  const conversations = useMemo(() => {
    const byPeer = new Map<string, Conversation>();
    for (const message of messages) {
      const peerId = peerOf(message);
      // Conversations with deleted contacts are hidden.
      if (!contactById(peerId)) continue;
      const conversation = byPeer.get(peerId) ?? { peerId, last: message, unread: 0 };
      if (message.at >= conversation.last.at) conversation.last = message;
      if (message.to === myId && !message.readAt) conversation.unread += 1;
      byPeer.set(peerId, conversation);
    }
    return [...byPeer.values()].sort((a, b) => b.last.at - a.last.at);
  }, [messages, contactById, peerOf, myId]);

  const unreadTotal = conversations.reduce((sum, c) => sum + c.unread, 0);

  const thread = useCallback(
    (peerId: string) => messages.filter((m) => peerOf(m) === peerId).sort((a, b) => a.at - b.at),
    [messages, peerOf]
  );

  const sendMessage = useCallback(
    (peerId: string, text: string) => {
      const message: Message = { id: newId('m'), from: myId, to: peerId, text, at: Date.now(), status: 'sending' };
      setMessages((prev) => [...prev, message]);
      const setStatus = (status: MessageStatus) =>
        setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, status } : m)));
      localTransport
        .send(message)
        .then(setStatus)
        .catch(() => setStatus('failed'));
    },
    [myId]
  );

  const receiveMessage = useCallback(
    (peerId: string, text: string) => {
      setMessages((prev) => [...prev, { id: newId('m'), from: peerId, to: myId, text, at: Date.now(), status: 'delivered' }]);
    },
    [myId]
  );

  const markThreadRead = useCallback(
    (peerId: string) => {
      const isUnread = (m: Message) => m.from === peerId && m.to === myId && !m.readAt;
      setMessages((prev) => {
        if (!prev.some(isUnread)) return prev;
        const now = Date.now();
        return prev.map((m) => (isUnread(m) ? { ...m, readAt: now } : m));
      });
    },
    [myId]
  );

  const deleteMessage = useCallback((id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const deleteThread = useCallback(
    (peerId: string) => {
      setMessages((prev) => prev.filter((m) => (m.from === myId ? m.to : m.from) !== peerId));
    },
    [myId]
  );

  const value = useMemo<MessagesValue>(
    () => ({ myId, conversations, unreadTotal, thread, sendMessage, receiveMessage, markThreadRead, deleteMessage, deleteThread }),
    [myId, conversations, unreadTotal, thread, sendMessage, receiveMessage, markThreadRead, deleteMessage, deleteThread]
  );

  return <MessagesContext.Provider value={value}>{children}</MessagesContext.Provider>;
}

export function useMessages() {
  const ctx = useContext(MessagesContext);
  if (!ctx) throw new Error('useMessages must be used within MessagesProvider');
  return ctx;
}
