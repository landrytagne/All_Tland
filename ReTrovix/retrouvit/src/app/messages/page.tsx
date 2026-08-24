"use client";

import * as React from "react";
import { Send, Search, MoreVertical, Phone, Video, ArrowLeft, Loader2, X, Image as ImageIcon, MessageCircle, PackageCheck, CheckCircle2, XCircle, Clock, Wallet, Smile, Mic, MicOff, Play, Pause, Check, CheckCheck, Reply, Trash2, Pencil } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { AuthGuard } from "@/components/auth-guard";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ConversationListSkeleton } from "@/components/skeletons";
import { conversationsApi, type ConversationResponse } from "@/lib/api-chat";
import { apiRequest } from "@/lib/api-core";
import { returnsApi } from "@/lib/api-returns";
import { formatRelativeTime, getInitials, cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/lib/i18n";
import { wsClient, type WsMessage } from "@/lib/websocket";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const API_BASE_URL = "";

export default function MessagesPage() {
  return (
    <AuthGuard>
      <MessagesContent />
    </AuthGuard>
  );
}

// ─── WhatsApp-style Voice Message Player ─────────────────────────
function VoiceMessage({ src, isMe }: { src: string; isMe: boolean }) {
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [currentTime, setCurrentTime] = React.useState(0);

  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      setProgress(audio.duration ? (audio.currentTime / audio.duration) * 100 : 0);
    };
    const onLoaded = () => setDuration(audio.duration);
    const onEnd = () => { setPlaying(false); setProgress(0); setCurrentTime(0); };
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("ended", onEnd);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); } else { audio.play(); }
    setPlaying(!playing);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  // Generate fake waveform bars based on progress
  const bars = React.useMemo(() => {
    const count = 28;
    return Array.from({ length: count }, (_, i) => {
      const h = Math.random() * 0.7 + 0.3;
      return h;
    });
  }, [src]);

  return (
    <div className="flex items-center gap-2.5 min-w-[180px]">
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        onClick={togglePlay}
        className={cn(
          "h-9 w-9 rounded-full flex items-center justify-center shrink-0 transition-colors",
          isMe ? "bg-white/20 hover:bg-white/30" : "bg-forest/10 dark:bg-forest-light/10 hover:bg-forest/20 dark:hover:bg-forest-light/20"
        )}
      >
        {playing ? (
          <Pause className={cn("h-4 w-4", isMe ? "text-white" : "text-forest dark:text-forest-light")} />
        ) : (
          <Play className={cn("h-4 w-4 ml-0.5", isMe ? "text-white" : "text-forest dark:text-forest-light")} />
        )}
      </button>
      <div className="flex-1 flex flex-col gap-1">
        {/* Waveform bars */}
        <div className="flex items-end gap-[2px] h-5">
          {bars.map((h, i) => {
            const barProgress = (i / bars.length) * 100;
            const active = barProgress < progress;
            return (
              <div
                key={i}
                className={cn(
                  "w-[3px] rounded-full transition-colors",
                  active
                    ? (isMe ? "bg-white/80" : "bg-forest dark:bg-forest-light")
                    : (isMe ? "bg-white/25" : "bg-gray-300 dark:bg-gray-600")
                )}
                style={{ height: `${h * 100}%`, minHeight: 3 }}
              />
            );
          })}
        </div>
        {/* Time */}
        <p className={cn("text-[10px] tabular-nums", isMe ? "text-white/60" : "text-gray-400 dark:text-gray-500")}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </p>
      </div>
    </div>
  );
}

function MessagesContent() {
  const { user, token } = useAuth();
  const { t, locale } = useTranslation();
  const [conversations, setConversations] = React.useState<ConversationResponse[]>([]);
  const [selectedConversation, setSelectedConversation] = React.useState<ConversationResponse | null>(null);
  const [newMessage, setNewMessage] = React.useState("");
  const [showMobileList, setShowMobileList] = React.useState(true);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSending, setIsSending] = React.useState(false);
  const [isConnected, setIsConnected] = React.useState(false);
  const [typingUser, setTypingUser] = React.useState<string | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [previewImage, setPreviewImage] = React.useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = React.useState<File | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = React.useState(false);
  const [isRecording, setIsRecording] = React.useState(false);
  const [recordingTime, setRecordingTime] = React.useState(0);
  const [audioBlob, setAudioBlob] = React.useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = React.useState<string | null>(null);
  const [replyTo, setReplyTo] = React.useState<{ id: number; content: string; senderName: string } | null>(null);
  const [messageMenuId, setMessageMenuId] = React.useState<number | null>(null);
  const [editingMessage, setEditingMessage] = React.useState<{ id: number; content: string } | null>(null);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [acceptingReward, setAcceptingReward] = React.useState(false);
  const [returnModalOpen, setReturnModalOpen] = React.useState(false);
  const [returnLoading, setReturnLoading] = React.useState(false);
  const [returnSuccess, setReturnSuccess] = React.useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = React.useState(false);
  const [paymentAmount, setPaymentAmount] = React.useState("");
  const [paymentLoading, setPaymentLoading] = React.useState(false);
  const [paymentStep, setPaymentStep] = React.useState<"form" | "sent" | "validated">("form");
  const [activeReturnId, setActiveReturnId] = React.useState<number | null>(null);
  const router = useRouter();
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const typingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const lastMessageIdRef = React.useRef<number>(0);
  const pollingRef = React.useRef<NodeJS.Timeout | null>(null);

  // Deduplicate messages by id to prevent React key collisions
  const dedupMessages = React.useCallback(<T extends { id: number }>(msgs: T[]): T[] => {
    const seen = new Set<string>();
    return msgs.filter((m) => {
      const key = String(m.id);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, []);

  React.useEffect(() => {
    if (token) {
      wsClient.connect(token, () => setIsConnected(true));
      return () => { wsClient.disconnect(); setIsConnected(false); };
    }
  }, [token]);

  // HTTP polling fallback when WebSocket is down
  React.useEffect(() => {
    if (isConnected || !selectedConversation) {
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
      return;
    }

    // Poll every 3 seconds when WS is not connected
    pollingRef.current = setInterval(async () => {
      try {
        const newMessages = await conversationsApi.pollMessages(
          selectedConversation.id,
          lastMessageIdRef.current
        );
        if (newMessages.length > 0) {
          setSelectedConversation((prev) => {
            if (!prev) return prev;
            const existingIds = new Set(prev.messages.map((m) => m.id));
            const uniqueNew = newMessages.filter((m) => !existingIds.has(m.id));
            if (uniqueNew.length === 0) return prev;
            const updated = { ...prev, messages: [...prev.messages, ...uniqueNew] };
            lastMessageIdRef.current = Math.max(...uniqueNew.map((m) => m.id));
            return updated;
          });
        }
      } catch (err) {
        console.warn("Polling failed:", err);
      }
    }, 3000);

    return () => { if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; } };
  }, [isConnected, selectedConversation?.id]);

  // Update lastMessageIdRef when conversation changes
  React.useEffect(() => {
    if (selectedConversation?.messages?.length) {
      lastMessageIdRef.current = Math.max(...selectedConversation.messages.map((m) => m.id));
    } else {
      lastMessageIdRef.current = 0;
    }
  }, [selectedConversation?.id]);

  React.useEffect(() => { fetchConversations(); }, []);

  // When entering a conversation, mark all messages as read and reset unread count
  React.useEffect(() => {
    if (!selectedConversation || !isConnected) return;
    // Mark conversation as read on the server
    conversationsApi.markAsRead(selectedConversation.id).catch(() => {});
    // Reset unread count locally
    setConversations((prev) => prev.map((c) => c.id === selectedConversation.id ? { ...c, unread: 0 } : c));
    setSelectedConversation((prev) => prev ? { ...prev, unread: 0 } : prev);
    wsClient.subscribeToConversation(selectedConversation.id, handleWsMessage);
    wsClient.sendReadReceipt(selectedConversation.id);
    return () => { wsClient.unsubscribeFromConversation(selectedConversation.id); };
  }, [selectedConversation?.id, isConnected]);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedConversation?.messages]);

  // Extract imageUrl/audioUrl from attachments[] (ChatMessageResponse format) or flat fields (WsMessage format)
  const extractMediaFromWs = (msg: WsMessage): { imageUrl?: string; audioUrl?: string } => {
    // Already flat
    if (msg.imageUrl || msg.audioUrl) return { imageUrl: msg.imageUrl, audioUrl: msg.audioUrl };
    // Extract from attachments[]
    if (msg.attachments && msg.attachments.length > 0) {
      const imageAtt = msg.attachments.find((a) => a.contentType === "IMAGE" || (a.contentType && a.contentType.startsWith("image/")));
      const audioAtt = msg.attachments.find((a) => a.contentType === "AUDIO" || (a.contentType && a.contentType.startsWith("audio/")));
      return {
        imageUrl: imageAtt?.contentUrl,
        audioUrl: audioAtt?.contentUrl,
      };
    }
    return {};
  };

  const handleWsMessage = (wsMessage: WsMessage) => {
    // Handle both WsMessage format (with type) and ChatMessageResponse format (without type)
    const msgType = wsMessage.type || (wsMessage.senderId ? "CHAT" : undefined);
    if (!msgType) return; // Not a chat message

    switch (msgType) {
      case "CHAT":
      case "IMAGE":
      case "AUDIO":
        if (wsMessage.conversationId === selectedConversation?.id) {
          // Skip echo of our own messages — already added from the REST response
          const senderIdNum = Number(wsMessage.senderId || 0);
          if (senderIdNum && senderIdNum === Number(user?.id)) return;

          const { imageUrl, audioUrl } = extractMediaFromWs(wsMessage);
          const msgId = Number(wsMessage.messageId || 0);

          setSelectedConversation((prev) => {
            if (!prev) return prev;
            if (msgId && prev.messages.some((m) => m.id === msgId)) return prev;
            // Find participant name/avatar from conversation if not provided
            const senderName = wsMessage.senderName ||
              prev.participant?.name || "";
            const senderAvatar = wsMessage.senderAvatar ||
              prev.participant?.avatar;
            return {
              ...prev,
              messages: dedupMessages([...prev.messages, {
                id: msgId || Date.now(),
                senderId: senderIdNum,
                senderName,
                senderAvatar,
                content: wsMessage.content || "",
                imageUrl,
                audioUrl,
                read: false,
                createdAt: wsMessage.createdAt || wsMessage.timestamp || new Date().toISOString(),
              }]),
              lastMessage: wsMessage.content || (imageUrl ? "📷 Image" : audioUrl ? "🎤 Message vocal" : ""),
              lastMessageAt: wsMessage.createdAt || wsMessage.timestamp || "",
              unread: 0, // We're viewing this conversation, so it's read
            };
          });
          // Mark as read since we're actively viewing this conversation
          if (isConnected && selectedConversation) {
            conversationsApi.markAsRead(selectedConversation.id).catch(() => {});
          }
        }
        setConversations((prev) => prev.map((c) => c.id === wsMessage.conversationId ? {
          ...c,
          lastMessage: wsMessage.content || (wsMessage.imageUrl ? "\ud83d\udcf7 Image" : wsMessage.audioUrl ? "\ud83c\udfa4 Message vocal" : c.lastMessage),
          lastMessageAt: wsMessage.createdAt || wsMessage.timestamp || c.lastMessageAt,
          // Only increment unread if we're NOT viewing this conversation
          unread: wsMessage.conversationId !== selectedConversation?.id ? c.unread + 1 : 0,
        } : c));
        break;
      case "TYPING":
        if (Number(wsMessage.senderId) !== Number(user?.id)) {
          setTypingUser(wsMessage.senderName || null);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setTypingUser(null), 3000);
        }
        break;
      case "READ":
        if (Number(wsMessage.senderId) === Number(user?.id)) {
          setSelectedConversation((prev) => prev ? { ...prev, messages: prev.messages.map((m) => ({ ...m, read: true })), unread: 0 } : prev);
        }
        break;
      case "DELETE":
        if (wsMessage.messageId) {
          setSelectedConversation((prev) => prev ? {
            ...prev,
            messages: prev.messages.map((m) => m.id === wsMessage.messageId ? { ...m, deleted: true, content: "", imageUrl: undefined, audioUrl: undefined } : m),
          } : prev);
        }
        break;
      case "EDIT":
        if (wsMessage.messageId && wsMessage.content) {
          setSelectedConversation((prev) => prev ? {
            ...prev,
            messages: prev.messages.map((m) => m.id === wsMessage.messageId ? { ...m, content: wsMessage.content! } : m),
          } : prev);
        }
        break;
    }
  };

  const fetchConversations = async () => {
    try {
      const data = await conversationsApi.getAll();
      setConversations(data);
      if (data.length > 0 && !selectedConversation) {
        const conv = data[0];
        setSelectedConversation({ ...conv, messages: dedupMessages(conv.messages || []) });
      }
    } catch (err) { console.warn("Could not fetch conversations:", err); }
    finally { setIsLoading(false); }
  };

  const handleSend = async () => {
    // Handle edit mode
    if (editingMessage && selectedConversation) {
      const newContent = newMessage.trim();
      if (!newContent) return;
      setNewMessage(""); setEditingMessage(null);
      setIsSending(true);
      try {
        await apiRequest(`/api/conversations/${selectedConversation.id}/messages/${editingMessage.id}`, {
          method: "PUT",
          body: { content: newContent },
        });
        setSelectedConversation((prev) => prev ? {
          ...prev,
          messages: prev.messages.map((m) => m.id === editingMessage.id ? { ...m, content: newContent } : m),
        } : prev);
      } catch (err) {
        console.error("Failed to edit message:", err);
      } finally { setIsSending(false); }
      return;
    }

    if ((!newMessage.trim() && !previewImage && !audioBlob && !uploadedFile) || !selectedConversation) return;
    const messageContent = newMessage.trim();
    const fileToSend = uploadedFile;
    const replyToCopy = replyTo;
    setNewMessage(""); setPreviewImage(null); setUploadedFile(null); setReplyTo(null);

    setIsSending(true);
    try {
      let saved: any;
      let imageUrl: string | undefined;

      if (fileToSend) {
        // Step 1: Upload file to /api/files/upload
        const formData = new FormData();
        formData.append("file", fileToSend);
        const uploadRes = await apiRequest<{ url: string; filename: string }>(
          "/api/files/upload",
          { method: "POST", body: formData }
        );
        imageUrl = uploadRes.url;
        // Step 2: Send message with imageUrl via REST
        saved = await conversationsApi.sendMessage(selectedConversation.id, messageContent || undefined, imageUrl, undefined, replyToCopy?.id);
      } else {
        saved = await conversationsApi.sendMessage(selectedConversation.id, messageContent, undefined, undefined, replyToCopy?.id);
      }

      setSelectedConversation((prev) => prev ? {
        ...prev,
        messages: dedupMessages([...prev.messages, {
          id: saved.id,
          senderId: saved.senderId,
          senderName: user?.name || "",
          senderAvatar: user?.avatar,
          content: saved.content || messageContent,
          imageUrl: imageUrl || saved.imageUrl,
          audioUrl: undefined,
          replyToId: replyToCopy?.id,
          replyToContent: replyToCopy?.content,
          replyToSenderName: replyToCopy?.senderName,
          read: false,
          deleted: false,
          createdAt: saved.createdAt,
        }]),
        lastMessage: messageContent || (imageUrl ? "\ud83d\udcf7 Image" : ""),
        lastMessageAt: saved.createdAt,
      } : prev);
      lastMessageIdRef.current = Math.max(lastMessageIdRef.current, Number(saved.id));
      setConversations((prev) => prev.map((c) => c.id === selectedConversation.id ? {
        ...c, lastMessage: messageContent || (imageUrl ? "\ud83d\udcf7 Image" : ""),
        lastMessageAt: saved.createdAt,
      } : c));
    } catch (err) {
      console.error("Error sending:", err);
      // If REST fails, try WS as last resort
      if (isConnected) {
        wsClient.sendMessage(selectedConversation.id, messageContent, undefined);
        setSelectedConversation((prev) => prev ? { ...prev, messages: dedupMessages([...prev.messages, {
          id: Date.now(), senderId: user?.id || 0, senderName: user?.name || "", senderAvatar: user?.avatar,
          content: messageContent, imageUrl: undefined, audioUrl: undefined, read: false, createdAt: new Date().toISOString(),
        }]), lastMessage: messageContent, lastMessageAt: new Date().toISOString() } : prev);
      }
    } finally { setIsSending(false); }
  };

  const handleDeleteMessage = async (messageId: number) => {
    if (!selectedConversation) return;
    setMessageMenuId(null);
    try {
      await conversationsApi.deleteMessage(selectedConversation.id, messageId);
      // Mark message as deleted locally
      setSelectedConversation((prev) => prev ? {
        ...prev,
        messages: prev.messages.map((m) => m.id === messageId ? { ...m, deleted: true, content: "", imageUrl: undefined, audioUrl: undefined } : m),
      } : prev);
    } catch (err) {
      console.error("Failed to delete message:", err);
    }
  };

  const handleReplyTo = (msg: { id: number; content: string; senderName: string }) => {
    setReplyTo(msg);
    setMessageMenuId(null);
  };

  const handleEditMessage = (msg: { id: number; content: string }) => {
    setEditingMessage(msg);
    setNewMessage(msg.content);
    setMessageMenuId(null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("Image trop volumineuse (max 5MB)"); return; }
    const preview = URL.createObjectURL(file);
    setPreviewImage(preview);
    // Store the raw file for later upload via the attachment endpoint
    setUploadedFile(file);
    setIsUploading(false);
  };

  const removePreviewImage = () => {
    if (previewImage?.startsWith("blob:")) URL.revokeObjectURL(previewImage);
    setPreviewImage(null);
    setUploadedFile(null);
  };

  // ─── Emoji Picker ──────────────────────────────────────────────────
  const EMOJI_CATEGORIES: Record<string, string[]> = {
    "Fréquents": ["👍", "❤️", "😂", "😮", "😢", "🙏", "👋", "✅", "🎉", "🔥"],
    "Visages": ["😀", "😁", "😆", "🤣", "😊", "😍", "🥰", "😘", "😎", "🤩", "😏", "🤔", "😴", "🙄", "😤", "😱"],
    "Gestes": ["👍", "👎", "👋", "🤝", "🙏", "💪", "👏", "🙌", "🫶", "✌️", "🤞", "🫡"],
    "Objets": ["📦", "🔑", "📱", "💰", "🎁", "📸", "🔍", "📝", "🏷️", "🔒", "🔔", "⏰"],
    "Cœurs": ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💔", "❣️", "💕", "💗"],
    "Symboles": ["✅", "❌", "⚠️", "❓", "❗", "💯", "⭐", "🌟", "💫", "✅", "🆕", "🔄"],
  };

  // ─── Voice Recording ───────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access denied:", err);
      alert(locale === "fr" ? "Autorisez l'accès au microphone pour envoyer des messages vocaux" : "Allow microphone access to send voice messages");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
  };

  const cancelRecording = () => {
    stopRecording();
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
  };

  // Convert webm/opus blob to WAV so the backend accepts it
  const convertToWav = async (blob: Blob): Promise<Blob> => {
    const audioCtx = new AudioContext();
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length;
    const bytesPerSample = 2; // 16-bit
    const dataSize = length * numChannels * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
    // WAV header
    const writeString = (offset: number, str: string) => { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)); };
    writeString(0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true); // chunk size
    view.setUint16(20, 1, true);  // PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
    view.setUint16(32, numChannels * bytesPerSample, true);
    view.setUint16(34, 16, true); // bits per sample
    writeString(36, "data");
    view.setUint32(40, dataSize, true);
    // Interleave channel data
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(ch)[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }
    await audioCtx.close();
    return new Blob([buffer], { type: "audio/wav" });
  };

  const uploadAndSendVoice = async () => {
    if (!audioBlob || !selectedConversation) return;
    setIsSending(true);
    try {
      const wavBlob = await convertToWav(audioBlob);
      const wavFile = new File([wavBlob], `voice-${Date.now()}.wav`, { type: "audio/wav" });
      // Step 1: Upload audio file to /api/files/upload
      const formData = new FormData();
      formData.append("file", wavFile);
      const uploadRes = await apiRequest<{ url: string; filename: string }>(
        "/api/files/upload",
        { method: "POST", body: formData }
      );
      const audioFileUrl = uploadRes.url;
      // Step 2: Send message with audioUrl via REST
      const saved = await conversationsApi.sendMessage(selectedConversation.id, undefined, undefined, audioFileUrl);
      setSelectedConversation((prev) => prev ? {
        ...prev,
        messages: dedupMessages([...prev.messages, {
          id: saved.id,
          senderId: saved.senderId,
          senderName: user?.name || "",
          senderAvatar: user?.avatar,
          content: "",
          imageUrl: undefined,
          audioUrl: audioFileUrl,
          read: false,
          createdAt: saved.createdAt,
        }]),
        lastMessage: "\ud83c\udfa4 Message vocal",
        lastMessageAt: saved.createdAt,
      } : prev);
      lastMessageIdRef.current = Math.max(lastMessageIdRef.current, Number(saved.id));
      setAudioBlob(null);
      setAudioUrl(null);
      setRecordingTime(0);
    } catch (err) {
      console.error("Failed to send voice message:", err);
    } finally {
      setIsSending(false);
    }
  };

  const handleTyping = () => {
    if (selectedConversation && isConnected) wsClient.sendTyping(selectedConversation.id);
  };

  const handleInitiateReturn = async () => {
    if (!selectedConversation || !user) return;
    setReturnLoading(true);
    try {
      const result = await returnsApi.initiate({
        loserId: user.id,
        finderId: selectedConversation.participant.id,
        foundObjectId: undefined,
        lostObjectId: undefined,
      });
      setReturnSuccess(true);
      setReturnModalOpen(false);
      // Send a system-like message in the chat via REST
      const msgContent = "📦 Demande de restitution initiée. Cliquez sur le lien pour suivre le processus : /return/" + result.id;
      try {
        await conversationsApi.sendMessage(selectedConversation.id, msgContent);
        const updated = await conversationsApi.getById(selectedConversation.id);
        setSelectedConversation({ ...updated, messages: dedupMessages(updated.messages || []) });
      } catch (e) { console.warn("Could not send return message:", e); }
      setTimeout(() => {
        router.push("/return/" + result.id);
      }, 1500);
    } catch (err) {
      console.error("Failed to initiate return:", err);
    } finally {
      setReturnLoading(false);
    }
  };

  const handleSendPaymentProposal = async () => {
    if (!selectedConversation || !user || !paymentAmount) return;
    const amount = parseInt(paymentAmount);
    if (isNaN(amount) || amount <= 0) return;

    setPaymentLoading(true);
    try {
      // 1. Create the return request with reward
      const result = await returnsApi.initiate({
        loserId: user.id,
        finderId: selectedConversation.participant.id,
        foundObjectId: undefined,
        lostObjectId: undefined,
      });

      // 2. Propose the reward
      await returnsApi.proposeReward(result.id, amount);

      setActiveReturnId(result.id);
      setPaymentStep("sent");

      // 3. Send proposal message in chat
      const proposalMsg = "💰 Proposition de récompense : " + amount.toLocaleString() + " FCFA.\n📦 Restitution initiée. Le retrouveur doit valider le montant.\n➡️ Voir le processus : /return/" + result.id;
      await conversationsApi.sendMessage(selectedConversation.id, proposalMsg);

      const updated = await conversationsApi.getById(selectedConversation.id);
      setSelectedConversation({ ...updated, messages: dedupMessages(updated.messages || []) });
      setConversations((prev) => prev.map((c) => c.id === updated.id ? updated : c));

    } catch (err: any) {
      console.error("Failed to send payment proposal:", err);
      alert(err.message || "Erreur lors de l'envoi de la proposition");
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleAcceptReward = async (returnId: number, amount: number) => {
    setAcceptingReward(true);
    try {
      await returnsApi.acceptReward(returnId, amount);
      // Send confirmation message in chat
      const msgContent = "✅ Récompense de " + amount.toLocaleString() + " FCFA acceptée ! \n📦 Montant mis en séquestre. \n➡️ Validez la collaboration : /return/" + returnId;
      await conversationsApi.sendMessage(selectedConversation!.id, msgContent);
      // Refresh conversation
      const updated = await conversationsApi.getById(selectedConversation!.id);
      setSelectedConversation({ ...updated, messages: dedupMessages(updated.messages || []) });
      setConversations((prev) => prev.map((c) => c.id === updated.id ? updated : c));
    } catch (err: any) {
      console.error("Failed to accept reward:", err);
      alert(err.message || "Erreur lors de l'acceptation de la récompense");
    } finally {
      setAcceptingReward(false);
    }
  };

  const handleAcceptConversation = async () => {
    if (!selectedConversation || !user) return;
    try {
      const updated = await conversationsApi.accept(selectedConversation.id);
      setSelectedConversation({ ...updated, messages: dedupMessages(updated.messages || []) });
      setConversations((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } catch (err) {
      console.error("Failed to accept:", err);
    }
  };

  const handleRejectConversation = async () => {
    if (!selectedConversation || !user) return;
    try {
      const updated = await conversationsApi.reject(selectedConversation.id);
      setSelectedConversation({ ...updated, messages: dedupMessages(updated.messages || []) });
      setConversations((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } catch (err) {
      console.error("Failed to reject:", err);
    }
  };

  const getAvatarUrl = (avatar?: string) => {
    if (!avatar) return undefined;
    return avatar.startsWith("http") ? avatar : `${API_BASE_URL}${avatar}`;
  };

  const filteredConversations = conversations.filter((c) =>
    !searchQuery || c.participant.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalUnread = conversations.reduce((acc, c) => acc + c.unread, 0);

  return (
    <MainLayout showFooter={false}>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-forest/10 dark:bg-forest-light/10 flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-forest dark:text-forest-light" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{t("messages.title")}</h1>
              <p className="text-sm text-muted-foreground">
                {conversations.length} {t("messages.conversations").toLowerCase()}
                {totalUnread > 0 && ` · ${totalUnread} ${t("messages.unread").toLowerCase()}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn("h-2 w-2 rounded-full", isConnected ? "bg-forest dark:bg-forest-light animate-pulse" : "bg-red-500")} />
            <span className="text-xs text-muted-foreground hidden sm:inline">{isConnected ? t("messages.online") : t("messages.offline")}</span>
          </div>
        </div>

        <Card className="overflow-hidden border-0 shadow-lg" style={{ height: "calc(100vh - 180px)" }}>
          <div className="flex h-full">
            {/* Conversation List */}
            <div className={cn("w-full sm:w-80 border-r flex flex-col bg-card", !showMobileList && "hidden sm:flex")}>
              <div className="p-3 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={t("messages.searchPlaceholder")}
                    className="pl-9 h-10 bg-muted/50 border-0 rounded-xl"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                  <ConversationListSkeleton count={5} />
                ) : filteredConversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4">
                    <div className="h-16 w-16 rounded-2xl bg-forest/10 dark:bg-forest-light/10 flex items-center justify-center mb-3">
                      <MessageCircle className="h-8 w-8 text-forest/30 dark:text-forest-light/30" />
                    </div>
                    <p className="text-sm text-muted-foreground text-center">{t("messages.noConversations")}</p>
                  </div>
                ) : (
                  filteredConversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => { setSelectedConversation(conv); setShowMobileList(false); }}
                      className={cn(
                        "w-full text-left p-3 hover:bg-muted/50 transition-all border-b border-border/50",
                        selectedConversation?.id === conv.id && "bg-forest/5 dark:bg-forest-light/5 border-l-2 border-l-forest dark:border-l-forest-light",
                        conv.status === "REJECTED" && "opacity-50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="h-11 w-11">
                            <AvatarImage src={getAvatarUrl(conv.participant.avatar)} />
                            <AvatarFallback className="text-xs bg-forest/10 dark:bg-forest-light/10 text-forest dark:text-forest-light font-semibold">
                              {getInitials(conv.participant.name)}
                            </AvatarFallback>
                          </Avatar>
                          {conv.status === "ACTIVE" && <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-forest dark:bg-forest-light border-2 border-card" />}
                          {conv.status === "PENDING" && <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-orange-brand border-2 border-card animate-pulse" />}
                          {conv.status === "REJECTED" && <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-red-500 border-2 border-card" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={cn("text-sm truncate", conv.unread > 0 ? "font-semibold" : "font-medium")}>
                              {conv.participant.name}
                            </p>
                            {conv.lastMessageAt && (
                              <p className="text-[10px] text-muted-foreground shrink-0 ml-2">
                                {formatRelativeTime(conv.lastMessageAt)}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-0.5">
                            <p className={cn("text-xs truncate", conv.unread > 0 ? "text-foreground font-medium" : "text-muted-foreground")}>
                              {conv.status === "PENDING" && conv.pendingForMe ? (
                                <span className="text-orange-brand font-medium">{(locale === "fr" ? "⏳ Demande en attente" : "⏳ Pending request")}</span>
                              ) : conv.status === "PENDING" ? (
                                <span className="text-orange-brand font-medium">{(locale === "fr" ? "⏳ En attente de validation" : "⏳ Awaiting validation")}</span>
                              ) : conv.status === "REJECTED" ? (
                                <span className="text-red-500">{(locale === "fr" ? "❌ Discussion refusée" : "❌ Rejected")}</span>
                              ) : (
                                conv.lastMessage || t("messages.noMessages")
                              )}
                            </p>
                            {conv.unread > 0 && (
                              <Badge className="ml-2 h-5 min-w-[20px] px-1 text-[10px] bg-orange-brand text-white border-0 shrink-0">
                                {conv.unread}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Chat Area */}
            <div className={cn("flex-1 flex flex-col bg-background", showMobileList && "hidden sm:flex")}>
              {selectedConversation ? (
                <>
                  {/* Chat Header */}
                  <div className="flex items-center justify-between p-3 border-b bg-card">
                    <div className="flex items-center gap-3">
                      <button className="sm:hidden p-1" onClick={() => setShowMobileList(true)}>
                        <ArrowLeft className="h-5 w-5" />
                      </button>
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={getAvatarUrl(selectedConversation.participant.avatar)} />
                        <AvatarFallback className="text-xs bg-forest/10 dark:bg-forest-light/10 text-forest dark:text-forest-light font-semibold">
                          {getInitials(selectedConversation.participant.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-semibold">{selectedConversation.participant.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {selectedConversation.status === "PENDING" && selectedConversation.pendingForMe ? (
                            <span className="text-orange-brand font-medium">{(locale === "fr" ? "⏳ Demande de discussion en attente" : "⏳ Discussion request pending")}</span>
                          ) : selectedConversation.status === "PENDING" ? (
                            <span className="text-orange-brand font-medium">{(locale === "fr" ? "⏳ En attente de validation..." : "⏳ Awaiting validation...")}</span>
                          ) : selectedConversation.status === "REJECTED" ? (
                            <span className="text-red-500">{(locale === "fr" ? "Discussion refusée" : "Discussion rejected")}</span>
                          ) : typingUser ? (
                            <span className="text-orange-brand font-medium italic">{typingUser} {t("messages.typing")}</span>
                          ) : isConnected ? (
                            <span className="flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-forest dark:bg-forest-light" />
                              {t("messages.online")}
                            </span>
                          ) : t("messages.offline")}
                        </p>
                      </div>
                    </div>
                    {selectedConversation.status === "ACTIVE" && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          className="h-8 gap-1 bg-amber-500 hover:bg-amber-600 text-white text-xs px-3 rounded-lg"
                          title={locale === "fr" ? "Initier le paiement" : "Initiate payment"}
                          onClick={() => { setPaymentModalOpen(true); setPaymentStep("form"); setPaymentAmount(""); }}
                        >
                          <Wallet className="h-3.5 w-3.5" />
                          <span className="hidden lg:inline">{locale === "fr" ? "Initier le paiement" : "Initiate payment"}</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 hover:bg-primary/10 hover:text-primary"
                          title="Initier une restitution"
                          onClick={() => setReturnModalOpen(true)}
                        >
                          <PackageCheck className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-orange-brand/10 hover:text-orange-brand">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-muted/20 to-background" onClick={() => { if (messageMenuId) setMessageMenuId(null); }}>
                    {dedupMessages(selectedConversation.messages).map((msg, idx) => {
                      const senderIdNum = Number(msg.senderId);
                      const userIdNum = Number(user?.id);
                      const isMe = userIdNum > 0 && senderIdNum === userIdNum;
                      // Resolve audio URL (relative paths need API_BASE_URL prefix)
                      const rawAudioUrl = msg.audioUrl;
                      const audioDataUrl = rawAudioUrl ? (rawAudioUrl.startsWith("http") ? rawAudioUrl : `${API_BASE_URL}${rawAudioUrl}`) : undefined;
                      // If message has audio, don't show the "🎤 Message vocal" text — just show the player
                      const displayContent = audioDataUrl ? "" : msg.content;
                      const isDeleted = msg.deleted === true;
                      return (
                        <div key={`${msg.id}-${idx}`} className={cn("flex gap-2 animate-fade-in group", isMe ? "justify-end" : "justify-start")}>
                          {!isMe && (
                            <Avatar className="h-8 w-8 mt-auto">
                              <AvatarImage src={getAvatarUrl(msg.senderAvatar)} />
                              <AvatarFallback className="text-[10px] bg-forest/10 dark:bg-forest-light/10 text-forest dark:text-forest-light">
                                {msg.senderName ? getInitials(msg.senderName) : "?"}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div className="relative max-w-[75%]">
                            {/* Reply preview */}
                            {msg.replyToId && (
                              <div className={cn("mb-1 px-3 py-1.5 rounded-lg text-xs border-l-[3px]", isMe ? "bg-white/15 border-white/50" : "bg-gray-100 dark:bg-gray-800 border-[#075E36] dark:border-[#40916C]")}>
                                <p className={cn("font-semibold text-[11px]", isMe ? "text-white/90" : "text-[#075E36] dark:text-[#40916C]")}>{msg.replyToSenderName}</p>
                                <p className={cn("truncate", isMe ? "text-white/60" : "text-gray-500 dark:text-gray-400")}>{msg.replyToContent || "(image)"}</p>
                              </div>
                            )}
                            <div
                              className={cn(
                                "rounded-2xl px-4 py-2.5",
                                isMe ? "rounded-br-md bg-[#075E36] dark:bg-[#40916C] text-white shadow-md" : "rounded-bl-md bg-white dark:bg-[#2A3942] text-gray-900 dark:text-gray-100 shadow-sm border border-gray-100 dark:border-gray-600/30",
                                isDeleted && "italic opacity-60"
                              )}
                            >
                              {isDeleted ? (
                                <p className="text-sm">{locale === "fr" ? "\ud83d\udd91 Message supprimé" : "\ud83d\udd91 Message deleted"}</p>
                              ) : (
                                <>
                                  {msg.imageUrl && (
                                    <div className="mb-2 rounded-xl overflow-hidden">
                                      <img
                                        src={msg.imageUrl.startsWith("http") ? msg.imageUrl : `${API_BASE_URL}${msg.imageUrl}`}
                                        alt="Image partag\u00e9e"
                                        className="max-w-full max-h-64 object-cover rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                                        onClick={() => window.open(msg.imageUrl?.startsWith("http") ? msg.imageUrl : `${API_BASE_URL}${msg.imageUrl}`, "_blank")}
                                      />
                                    </div>
                                  )}
                                  {audioDataUrl && (
                                    <div className="mb-1">
                                      <VoiceMessage src={audioDataUrl} isMe={isMe} />
                                    </div>
                                  )}
                                  {displayContent && <p className={cn("text-sm leading-relaxed whitespace-pre-line", isMe ? "text-white" : "")}>{displayContent}</p>}
                                  {/* Reward proposal action buttons */}
                                  {!isMe && !isDeleted && displayContent && /Proposition de récompense/.test(displayContent) && (() => {
                                    const returnMatch = displayContent.match(/\/return\/(\d+)/);
                                    const amountMatch = displayContent.match(/([\d\s]+)\s*(?:FCFA|XAF)/);
                                    if (!returnMatch) return null;
                                    const returnId = Number(returnMatch[1]);
                                    const amount = amountMatch ? Number(amountMatch[1].replace(/\s/g, "")) : 0;
                                    return (
                                      <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600/30">
                                        <button
                                          onClick={() => handleAcceptReward(returnId, amount)}
                                          disabled={acceptingReward}
                                          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#075E36] dark:bg-[#40916C] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                                        >
                                          {acceptingReward ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                          ) : (
                                            <Wallet className="h-4 w-4" />
                                          )}
                                          {acceptingReward
                                            ? (locale === "fr" ? "Acceptation en cours..." : "Accepting...")
                                            : (locale === "fr" ? "Accepter la récompense" : "Accept reward")}
                                        </button>
                                        <p className="text-[10px] text-center mt-1 text-gray-500 dark:text-gray-400">
                                          {locale === "fr" ? "Le montant sera mis en séquestre" : "Amount will be held in escrow"}
                                        </p>
                                      </div>
                                    );
                                  })()}
                                  {/* Owner: deposit funds button */}
                                  {isMe && !isDeleted && displayContent && /Proposition de récompense/.test(displayContent) && (() => {
                                    const returnMatch = displayContent.match(/\/return\/(\d+)/);
                                    const amountMatch = displayContent.match(/([\d\s]+)\s*(?:FCFA|XAF)/);
                                    if (!returnMatch || !amountMatch) return null;
                                    const amount = Number(amountMatch[1].replace(/\s/g, ""));
                                    return (
                                      <div className="mt-2 pt-2 border-t border-white/20">
                                        <a
                                          href={"/wallet/deposit?amount=" + amount}
                                          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-sm font-medium transition-opacity"
                                        >
                                          <Wallet className="h-4 w-4" />
                                          {locale === "fr" ? "Déposer les fonds (" + amount.toLocaleString() + " FCFA)" : "Deposit funds (" + amount.toLocaleString() + " FCFA)"}
                                        </a>
                                        <p className="text-[10px] text-center mt-1 text-white/60">
                                          {locale === "fr" ? "Le retrouveur pourra accepter après le dépôt" : "The finder can accept after deposit"}
                                        </p>
                                      </div>
                                    );
                                  })()}
                                  {/* Accept reward confirmation message */}
                                  {!isMe && !isDeleted && displayContent && /récompense.*acceptée/i.test(displayContent) && (() => {
                                    const returnMatch = displayContent.match(/\/return\/(\d+)/);
                                    if (!returnMatch) return null;
                                    const returnId = Number(returnMatch[1]);
                                    return (
                                      <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600/30">
                                        <button
                                          onClick={async () => {
                                            try {
                                              await returnsApi.validate(returnId);
                                              const msgContent = "\u2705 Collaboration validée ! Fixons un rendez-vous.";
                                              await conversationsApi.sendMessage(selectedConversation!.id, msgContent);
                                              const updated = await conversationsApi.getById(selectedConversation!.id);
                                              setSelectedConversation({ ...updated, messages: dedupMessages(updated.messages || []) });
                                            } catch (err: any) {
                                              alert(err.message || "Erreur lors de la validation");
                                            }
                                          }}
                                          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#075E36] dark:bg-[#40916C] text-white text-sm font-medium hover:opacity-90 transition-opacity"
                                        >
                                          <CheckCircle2 className="h-4 w-4" />
                                          {locale === "fr" ? "Valider la collaboration" : "Validate collaboration"}
                                        </button>
                                      </div>
                                    );
                                  })()}
                                </>
                              )}
                              <div className="flex items-center justify-end gap-1 mt-1">
                                <p className={cn("text-[10px]", isMe ? "text-white/60" : "text-gray-500 dark:text-gray-400")}>
                                  {formatRelativeTime(msg.createdAt)}
                                </p>
                                {isMe && !isDeleted && (
                                  msg.read
                                    ? <CheckCheck className="h-3.5 w-3.5 text-blue-300" />
                                    : <Check className="h-3.5 w-3.5 text-white/50" />
                                )}
                              </div>
                            </div>
                            {/* Action menu button */}
                            {!isDeleted && (
                              <div className="relative z-10 flex flex-col items-end">
                                <button
                                  className="p-1 rounded-full hover:bg-muted/80 transition-opacity self-end"
                                  onClick={(e) => { e.stopPropagation(); setMessageMenuId(messageMenuId === msg.id ? null : msg.id); }}
                                >
                                  <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                                </button>
                                {messageMenuId === msg.id && (
                                  <div
                                    className={cn("absolute z-50 bottom-7 bg-card border rounded-xl shadow-lg py-1 min-w-[160px]", isMe ? "right-0" : "left-0")}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 flex items-center gap-2"
                                      onClick={() => handleReplyTo({ id: msg.id, content: msg.content, senderName: msg.senderName || "" })}
                                    >
                                      <Reply className="h-3.5 w-3.5" /> {locale === "fr" ? "R\u00e9pondre" : "Reply"}
                                    </button>
                                    {isMe && (
                                      <button
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 flex items-center gap-2"
                                        onClick={() => handleEditMessage({ id: msg.id, content: msg.content })}
                                      >
                                        <Pencil className="h-3.5 w-3.5" /> {locale === "fr" ? "Modifier" : "Edit"}
                                      </button>
                                    )}
                                    {isMe && (
                                      <button
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 text-red-500 flex items-center gap-2"
                                        onClick={() => handleDeleteMessage(msg.id)}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" /> {locale === "fr" ? "Supprimer" : "Delete"}
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          {isMe && (
                            <Avatar className="h-8 w-8 mt-auto hidden">
                              <AvatarFallback className="text-[10px]">{getInitials(user?.name || "")}</AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      );
                    })}

                    {typingUser && (
                      <div className="flex justify-start gap-2 animate-fade-in">
                        <Avatar className="h-8 w-8 mt-auto">
                          <AvatarFallback className="text-[10px] bg-forest/10 dark:bg-forest-light/10">?</AvatarFallback>
                        </Avatar>
                        <div className="bg-card border rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                          <div className="flex gap-1.5">
                            <span className="h-2 w-2 bg-forest/40 dark:bg-forest-light/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                            <span className="h-2 w-2 bg-forest/40 dark:bg-forest-light/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                            <span className="h-2 w-2 bg-forest/40 dark:bg-forest-light/40 rounded-full animate-bounce" />
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Image Preview */}
                  {previewImage && (
                    <div className="px-4 pt-2 border-t bg-card">
                      <div className="relative inline-block">
                        <img src={previewImage} alt="Aperçu" className="h-20 rounded-xl object-cover border-2 border-forest/20 dark:border-forest-light/20" />
                        <button
                          onClick={removePreviewImage}
                          className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-orange-brand text-white flex items-center justify-center shadow-md hover:bg-orange-brand/90"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        {isUploading && (
                          <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                            <Loader2 className="h-5 w-5 text-white animate-spin" />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Pending — you're waiting for other to accept */}
                  {selectedConversation.status === "PENDING" && !selectedConversation.pendingForMe && (
                    <div className="p-4 border-t bg-orange-brand/5">
                      <div className="text-center space-y-1">
                        <div className="flex items-center justify-center gap-2">
                          <Clock className="h-5 w-5 text-orange-brand animate-pulse" />
                          <p className="text-sm font-medium">{(locale === "fr" ? "En attente de validation..." : "Waiting for validation...")}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {(locale === "fr"
                            ? selectedConversation.participant.name + " n'a pas encore accepté votre demande"
                            : selectedConversation.participant.name + " hasn't accepted your request yet")}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Pending Accept/Reject Banner */}
                  {selectedConversation.status === "PENDING" && selectedConversation.pendingForMe && (
                    <div className="p-4 border-t bg-orange-brand/5">
                      <div className="text-center space-y-3">
                        <div className="flex items-center justify-center gap-2">
                          <Clock className="h-5 w-5 text-orange-brand" />
                          <p className="text-sm font-medium">{(locale === "fr" ? "Ce utilisateur souhaite discuter avec vous" : "This user wants to chat with you")}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {(locale === "fr"
                            ? "Acceptez pour débloquer la messagerie avec " + selectedConversation.participant.name
                            : "Accept to unlock messaging with " + selectedConversation.participant.name)}
                        </p>
                        <div className="flex gap-2 justify-center">
                          <Button
                            onClick={handleAcceptConversation}
                            className="bg-forest hover:bg-forest/90 dark:bg-forest-light dark:hover:bg-forest-light/90 text-white px-6"
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            {(locale === "fr" ? "Accepter" : "Accept")}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={handleRejectConversation}
                            className="border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 px-6"
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            {(locale === "fr" ? "Refuser" : "Reject")}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Rejected state */}
                  {selectedConversation.status === "REJECTED" && (
                    <div className="p-4 border-t bg-red-50 dark:bg-red-950/30">
                      <div className="text-center">
                        <p className="text-sm text-red-600 dark:text-red-400">
                          {(locale === "fr"
                            ? "Vous avez refusé cette discussion"
                            : "You rejected this discussion")}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Recording UI — replaces input when recording */}
                  {isRecording && (
                    <div className="p-3 border-t bg-red-50 dark:bg-red-950/30">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
                          <span className="text-sm font-medium text-red-600 dark:text-red-400">
                            {locale === "fr" ? "Enregistrement..." : "Recording..."} {Math.floor(recordingTime / 60).toString().padStart(2, "0")}:{(recordingTime % 60).toString().padStart(2, "0")}
                          </span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={cancelRecording} className="text-red-500 hover:text-red-700">
                          {locale === "fr" ? "Annuler" : "Cancel"}
                        </Button>
                        <Button size="sm" onClick={stopRecording} className="bg-forest hover:bg-forest/90 dark:bg-forest-light text-white">
                          <MicOff className="h-4 w-4 mr-1" />
                          {locale === "fr" ? "Arrêter" : "Stop"}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Audio preview — shown after recording stops */}
                  {audioUrl && !isRecording && (
                    <div className="p-3 border-t bg-muted/30">
                      <div className="flex items-center gap-3">
                        <audio controls src={audioUrl} className="flex-1 h-8" />
                        <Button variant="ghost" size="icon" onClick={() => { setAudioBlob(null); setAudioUrl(null); setRecordingTime(0); }} className="h-8 w-8 text-red-500">
                          <X className="h-4 w-4" />
                        </Button>
                        <Button size="icon" onClick={uploadAndSendVoice} disabled={isSending} className="h-8 w-8 bg-forest hover:bg-forest/90 dark:bg-forest-light text-white">
                          {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Emoji Picker */}
                  {showEmojiPicker && (
                    <div className="border-t bg-card p-3">
                      <div className="max-h-48 overflow-y-auto">
                        {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
                          <div key={category} className="mb-2">
                            <p className="text-[10px] font-medium text-muted-foreground mb-1 uppercase tracking-wide">{category}</p>
                            <div className="flex flex-wrap gap-1">
                              {emojis.map((emoji, i) => (
                                <button
                                  key={`${category}-${i}`}
                                  onClick={() => { setNewMessage((prev) => prev + emoji); setShowEmojiPicker(false); }}
                                  className="h-8 w-8 flex items-center justify-center text-lg hover:bg-muted/80 rounded-lg transition-colors"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Edit indicator */}
                  {editingMessage && (
                    <div className="px-4 py-2 border-t bg-amber-50 dark:bg-amber-950/30 flex items-center gap-2">
                      <Pencil className="h-4 w-4 text-amber-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-medium text-amber-600">{locale === "fr" ? "Modifier le message" : "Edit message"}</p>
                        <p className="text-xs truncate text-muted-foreground">{editingMessage.content}</p>
                      </div>
                      <button onClick={() => { setEditingMessage(null); setNewMessage(""); }} className="p-1 hover:bg-muted/50 rounded">
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </div>
                  )}

                  {/* Reply preview */}
                  {replyTo && !editingMessage && (
                    <div className="px-4 py-2 border-t bg-muted/30 flex items-center gap-2">
                      <Reply className="h-4 w-4 text-forest dark:text-forest-light shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-medium text-forest dark:text-forest-light">{replyTo.senderName}</p>
                        <p className="text-xs truncate text-muted-foreground">{replyTo.content || "(image)"}</p>
                      </div>
                      <button onClick={() => setReplyTo(null)} className="p-1 hover:bg-muted/50 rounded">
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </div>
                  )}

                  {/* Input — only show if conversation is ACTIVE and not recording */}
                  {selectedConversation.status === "ACTIVE" && !isRecording && !audioUrl && (
                    <div className="p-3 border-t bg-card">
                      <div className="flex gap-2 items-end">
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 shrink-0 rounded-xl hover:bg-orange-brand/10 hover:text-orange-brand"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                        >
                          {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 shrink-0 rounded-xl hover:bg-amber-500/10 hover:text-amber-500"
                          onClick={() => setShowEmojiPicker((prev) => !prev)}
                        >
                          <Smile className="h-4 w-4" />
                        </Button>
                        <Input
                          placeholder={t("messages.typePlaceholder")}
                          value={newMessage}
                          onChange={(e) => { setNewMessage(e.target.value); handleTyping(); }}
                          onKeyDown={(e) => e.key === "Enter" && !isSending && handleSend()}
                          className="flex-1 h-10 bg-muted/50 border-0 rounded-xl"
                          disabled={isSending}
                        />
                        {(newMessage.trim() || previewImage || editingMessage) ? (
                          <Button
                            size="icon"
                            onClick={handleSend}
                            disabled={isSending}
                            className="h-10 w-10 shrink-0 rounded-xl bg-forest hover:bg-forest/90 dark:bg-forest-light dark:hover:bg-forest-light/90 shadow-lg shadow-forest/20 dark:shadow-forest-light/20"
                          >
                            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : editingMessage ? <Pencil className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                          </Button>
                        ) : (
                          <Button
                            size="icon"
                            onClick={isRecording ? stopRecording : startRecording}
                            className={cn("h-10 w-10 shrink-0 rounded-xl shadow-lg", isRecording ? "bg-red-500 hover:bg-red-600 animate-pulse" : "bg-orange-brand hover:bg-orange-brand/90 shadow-orange-brand/20")}
                          >
                            <Mic className="h-4 w-4 text-white" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
                  <div className="h-20 w-20 rounded-2xl bg-forest/10 dark:bg-forest-light/10 flex items-center justify-center mb-4">
                    <MessageCircle className="h-10 w-10 text-forest/30 dark:text-forest-light/30" />
                  </div>
                  <h3 className="text-lg font-semibold mb-1">{t("messages.noMessages")}</h3>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    {t("messages.noMessagesDesc")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Payment Initiation Modal */}
        <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-amber-500" />
                {locale === "fr" ? "Initier le paiement" : "Initiate payment"}
              </DialogTitle>
              <DialogDescription>
                {locale === "fr"
                  ? "Proposez une récompense à " + (selectedConversation?.participant.name || "") + " pour la restitution de votre objet"
                  : "Propose a reward to " + (selectedConversation?.participant.name || "") + " for returning your object"}
              </DialogDescription>
            </DialogHeader>

            {paymentStep === "form" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {locale === "fr" ? "Montant de la récompense (FCFA)" : "Reward amount (FCFA)"}
                  </label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="Ex: 25000"
                    className="w-full h-10 px-3 rounded-xl border bg-muted/50 text-sm"
                    min="100"
                  />
                  <p className="text-xs text-muted-foreground">
                    {locale === "fr"
                      ? "Frais plateforme : 15%. Le retrouveur recevra " + (paymentAmount ? Math.round(parseInt(paymentAmount || "0") * 0.85).toLocaleString() : "0") + " FCFA"
                      : "Platform fee: 15%. The finder will receive " + (paymentAmount ? Math.round(parseInt(paymentAmount || "0") * 0.85).toLocaleString() : "0") + " FCFA"}
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    {locale === "fr"
                      ? "⚠️ La proposition sera envoyée dans la messagerie. Le retrouveur devra valider le montant avant la création de l'escrow."
                      : "⚠️ The proposal will be sent in the chat. The finder must validate the amount before the escrow is created."}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={handleSendPaymentProposal}
                    disabled={!paymentAmount || parseInt(paymentAmount) <= 0 || paymentLoading}
                  >
                    {paymentLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <Wallet className="h-4 w-4 mr-1" />
                    )}
                    {locale === "fr" ? "Envoyer la proposition" : "Send proposal"}
                  </Button>
                  <Button variant="outline" onClick={() => setPaymentModalOpen(false)}>
                    {locale === "fr" ? "Annuler" : "Cancel"}
                  </Button>
                </div>
              </div>
            )}

            {paymentStep === "sent" && (
              <div className="space-y-4 text-center">
                <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <p className="text-sm">
                  {locale === "fr"
                    ? "✅ Proposition envoyée dans la messagerie. En attente de la validation de " + (selectedConversation?.participant.name || "")
                    : "✅ Proposal sent in chat. Waiting for " + (selectedConversation?.participant.name || "") + " to validate"}
                </p>
                <Button
                  onClick={() => { setPaymentModalOpen(false); router.push("/return/" + activeReturnId); }}
                >
                  {locale === "fr" ? "Voir le processus" : "View process"}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Return Initiation Modal */}
        <Dialog open={returnModalOpen} onOpenChange={setReturnModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <PackageCheck className="h-5 w-5 text-primary" />
                {locale === "fr" ? "Initier une restitution" : "Initiate return"}
              </DialogTitle>
              <DialogDescription>
                {locale === "fr"
                  ? "Démarrez le processus de restitution avec " + (selectedConversation?.participant.name || "")
                  : "Start the return process with " + (selectedConversation?.participant.name || "")}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {locale === "fr"
                  ? "Un canal de restitution sécurisé sera créé. Vous pourrez ensuite proposer la récompense, fixer un rendez-vous et valider la restitution."
                  : "A secure return channel will be created. You can then propose the reward, set an appointment, and confirm the return."}
              </p>

              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">
                  {locale === "fr" ? "Participant" : "Participant"}
                </p>
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-[10px]">
                      {selectedConversation?.participant.name?.split(" ").map((n) => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{selectedConversation?.participant.name}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={handleInitiateReturn}
                  disabled={returnLoading}
                >
                  {returnLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <PackageCheck className="h-4 w-4 mr-1" />
                  )}
                  {locale === "fr" ? "Démarrer la restitution" : "Start return"}
                </Button>
                <Button variant="outline" onClick={() => setReturnModalOpen(false)}>
                  {locale === "fr" ? "Annuler" : "Cancel"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Success Toast */}
        {returnSuccess && (
          <div className="fixed bottom-4 right-4 z-50 bg-green-600 text-white px-4 py-3 rounded-xl shadow-lg animate-fade-in flex items-center gap-2">
            <PackageCheck className="h-5 w-5" />
            <span className="text-sm font-medium">
              {locale === "fr" ? "Redirection vers le flow de restitution..." : "Redirecting to return flow..."}
            </span>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
