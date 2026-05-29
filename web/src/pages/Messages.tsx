import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import { socket } from "../socket";
import "./Messages.scss";

type Conversation = {
  partner_id: number;
  partner_username: string;
  partner_avatar: string | null;
  last_message: string;
  last_message_at: string;
  last_sender_id: number;
  unread_count: number | null;
};

type Message = {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  is_read: boolean;
  created_at: string;
};

type Partner = {
  id: number;
  username: string;
  avatar_url: string | null;
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours}h`;
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function Avatar({ username, avatar, size = 40 }: { username: string; avatar: string | null; size?: number }) {
  const style = { width: size, height: size, fontSize: size * 0.38 };
  if (avatar) return <img src={avatar} alt={username} className="msg-avatar" style={style} />;
  return (
    <div className="msg-avatar msg-avatar--placeholder" style={style}>
      {username.charAt(0).toUpperCase()}
    </div>
  );
}

export default function Messages() {
  const { user } = useAuth();
  const token = localStorage.getItem("token");
  const navigate = useNavigate();
  const { partnerId } = useParams<{ partnerId?: string }>();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages]           = useState<Message[]>([]);
  const [partner, setPartner]             = useState<Partner | null>(null);
  const [activeId, setActiveId]           = useState<number | null>(
    partnerId ? parseInt(partnerId) : null
  );
  const [input, setInput]               = useState("");
  const [sending, setSending]           = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs]   = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [isMutualError, setIsMutualError] = useState(false);

  const bottomRef   = useRef<HTMLDivElement>(null);
  const activeIdRef = useRef<number | null>(activeId);
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);

  const loadConversations = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get("/api/messages/conversations", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setConversations(res.data);
    } catch { /* silently fail */ }
    finally { setLoadingConvs(false); }
  }, [token]);

  const loadMessages = useCallback(async (pid: number) => {
    if (!token) return;
    setLoadingMsgs(true);
    setError(null);
    setIsMutualError(false);
    try {
      const res = await axios.get(`/api/messages/${pid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages(res.data.messages);
      setPartner(res.data.partner);
      setConversations((prev) =>
        prev.map((c) => (c.partner_id === pid ? { ...c, unread_count: 0 } : c))
      );
    } catch (err: any) {
      const msg = err.response?.data?.error ?? "Erreur de chargement.";
      setError(msg);

      if (err.response?.status === 403) setIsMutualError(true);
      setMessages([]);
      setPartner(null);
    } finally {
      setLoadingMsgs(false);
    }
  }, [token]);

  const selectConversation = (pid: number) => {
    setActiveId(pid);
    navigate(`/messages/${pid}`, { replace: true });
    loadMessages(pid);
  };

  const sendMessage = async () => {
    if (!input.trim() || !activeId || !token || sending) return;
    setSending(true);

    const optimistic: Message = {
      id: -Date.now(),
      sender_id: user!.id,
      receiver_id: activeId,
      content: input.trim(),
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput("");

    try {
      const res = await axios.post(
        `/api/messages/${activeId}`,
        { content: optimistic.content },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessages((prev) =>
        prev.map((m) => (m.id === optimistic.id ? res.data : m))
      );
      const roomId = [user!.id, activeId].sort().join("-");
      socket.emit("send_message", { roomId, message: res.data });
      setConversations((prev) =>
        prev.map((c) =>
          c.partner_id === activeId
            ? { ...c, last_message: res.data.content, last_message_at: res.data.created_at, last_sender_id: user!.id }
            : c
        )
      );
    } catch (err: any) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      alert(err.response?.data?.error ?? "Erreur lors de l'envoi.");
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    socket.connect();
    return () => { socket.disconnect(); };
  }, [user]);

  useEffect(() => {
    if (!activeId || !user) return;
    const roomId = [user.id, activeId].sort().join("-");
    socket.emit("join_room", roomId);
  }, [activeId, user]);

  useEffect(() => {
    const handler = (message: Message) => {
      const cur = activeIdRef.current;
      if (cur && (message.sender_id === cur || message.receiver_id === cur)) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
        loadConversations();
      }
    };
    socket.on("receive_message", handler);
    return () => { socket.off("receive_message", handler); };
  }, [loadConversations]);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    loadConversations();
  }, [user]);

  useEffect(() => {
    if (activeId) loadMessages(activeId);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div className="messages-page">

      <aside className="msg-sidebar">
        <div className="msg-sidebar__header"><h2>Messages</h2></div>

        {loadingConvs ? (
          <div className="msg-sidebar__loading"><div className="spinner" /></div>
        ) : conversations.length === 0 ? (
          <div className="msg-sidebar__empty">
            <p>Aucune conversation.</p>
            <p className="msg-sidebar__hint">
              Suivez-vous mutuellement avec un utilisateur pour lui envoyer un message.
            </p>
          </div>
        ) : (
          <ul className="msg-conv-list">
            {conversations.map((c) => (
              <li
                key={c.partner_id}
                className={`msg-conv-item ${activeId === c.partner_id ? "msg-conv-item--active" : ""}`}
                onClick={() => selectConversation(c.partner_id)}
              >
                <Avatar username={c.partner_username} avatar={c.partner_avatar} size={42} />
                <div className="msg-conv-item__body">
                  <div className="msg-conv-item__top">
                    <span className="msg-conv-item__name">{c.partner_username}</span>
                    <span className="msg-conv-item__time">{timeAgo(c.last_message_at)}</span>
                  </div>
                  <div className="msg-conv-item__preview">
                    {c.last_sender_id === user?.id && <span className="msg-conv-item__you">Vous : </span>}
                    <span>{c.last_message}</span>
                  </div>
                </div>
                {!!c.unread_count && c.unread_count > 0 && (
                  <span className="msg-conv-item__badge">{c.unread_count}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </aside>

      <main className="msg-chat">
        {!activeId ? (
          <div className="msg-chat__empty">
            <span className="msg-chat__empty-icon">💬</span>
            <p>Sélectionnez une conversation</p>
            <p className="msg-chat__empty-hint">
              Seuls les utilisateurs qui se suivent mutuellement peuvent échanger des messages.
            </p>
          </div>
        ) : loadingMsgs && messages.length === 0 ? (
          <div className="msg-chat__loading"><div className="spinner" /></div>
        ) : error ? (
          <div className="msg-chat__error">
            <p>⚠️ {error}</p>
            {isMutualError && activeId && (
              <div className="msg-chat__mutual-hint">
                <p>Pour échanger des messages, vous devez vous suivre mutuellement.</p>
                <Link to={`/profile/${activeId}`} className="msg-chat__follow-link">
                  Voir le profil et s'abonner →
                </Link>
              </div>
            )}
          </div>
        ) : (
          <>
            {partner && (
              <div className="msg-chat__header">
                <Avatar username={partner.username} avatar={partner.avatar_url} size={36} />
                <span className="msg-chat__partner-name">{partner.username}</span>
              </div>
            )}

            <div className="msg-chat__messages">
              {messages.length === 0 ? (
                <p className="msg-chat__no-msg">Aucun message. Commencez la conversation !</p>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.sender_id === user?.id;
                  return (
                    <div key={msg.id} className={`msg-bubble ${isMine ? "msg-bubble--mine" : "msg-bubble--theirs"}`}>
                      <p className="msg-bubble__text">{msg.content}</p>
                      <span className="msg-bubble__time">{timeAgo(msg.created_at)}</span>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            <div className="msg-chat__input-area">
              <textarea
                className="msg-chat__input"
                placeholder="Écrivez un message… (Entrée pour envoyer)"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                maxLength={2000}
              />
              <button className="msg-chat__send" onClick={sendMessage} disabled={!input.trim() || sending}>
                {sending ? "…" : "➤"}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}