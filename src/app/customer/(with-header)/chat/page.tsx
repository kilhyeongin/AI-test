"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const MAX_MESSAGES = 10;

const SUGGESTIONS = [
  "일본 5박 6일 여행, 예산 150만원으로 가능한가요?",
  "동남아 3박 4일 상품 요금 알려주세요",
  "유럽 10일 일정표 만들어 주세요",
  "가족 4명 제주도 2박 3일 예산은?",
];

export default function CustomerChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "안녕하세요! 여행 AI 상담사입니다. 여행지, 기간, 예산을 알려주시면 맞춤 요금과 일정표를 안내해드릴게요. 😊",
    },
  ]);
  const [isLimitReached, setIsLimitReached] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/auth/customer/me", { cache: "no-store" }).then((r) => r.json()).then((d) => {
      if (!d?.ok) router.replace("/customer/login");
    });
  }, [router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function resetChat() {
    setMessages([{
      role: "assistant",
      content: "안녕하세요! 여행 AI 상담사입니다. 여행지, 기간, 예산을 알려주시면 맞춤 요금과 일정표를 안내해드릴게요. 😊",
    }]);
    setIsLimitReached(false);
    setInput("");
  }

  async function sendMessage(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading || isLimitReached) return;

    const newMessages: Message[] = [...messages, { role: "user", content: msg }];

    // 대화 10턴(20개 메시지) 초과 시 새 대화 유도
    if (newMessages.filter((m) => m.role === "user").length > MAX_MESSAGES) {
      setIsLimitReached(true);
      setMessages([...newMessages, {
        role: "assistant",
        content: "대화가 길어졌습니다. 더 정확한 답변을 위해 새 대화를 시작해주세요 😊",
      }]);
      setInput("");
      return;
    }

    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/customer/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });
      const data = await res.json();

      if (data.ok) {
        setMessages([...newMessages, { role: "assistant", content: data.reply }]);
      } else {
        setMessages([...newMessages, { role: "assistant", content: `오류가 발생했습니다: ${data.error}` }]);
      }
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "네트워크 오류가 발생했습니다. 다시 시도해주세요." }]);
    }

    setLoading(false);
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 60px)", background: "#f8fafc" }}>
      {/* 헤더 */}
      <div style={{ padding: "16px 20px", background: "#fff", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 36, height: 36, background: "#2563eb", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
          🤖
        </div>
        <div>
          <p style={{ fontWeight: 700, fontSize: 15 }}>여행 AI 상담사</p>
          <p style={{ fontSize: 12, color: "#64748b" }}>요금 · 일정표 자동 생성</p>
        </div>
      </div>

      {/* 메시지 목록 */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                maxWidth: "80%",
                padding: "12px 16px",
                borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                background: msg.role === "user" ? "#2563eb" : "#fff",
                color: msg.role === "user" ? "#fff" : "#1e293b",
                fontSize: 14,
                lineHeight: 1.6,
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{ padding: "12px 16px", background: "#fff", borderRadius: "18px 18px 18px 4px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", color: "#94a3b8", fontSize: 14 }}>
              답변을 생성하는 중...
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* 추천 질문 (메시지가 1개일 때만) */}
      {messages.length === 1 && (
        <div style={{ padding: "0 16px 12px", display: "flex", gap: 8, flexWrap: "wrap" }}>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => sendMessage(s)}
              style={{ padding: "8px 14px", fontSize: 13, background: "#fff", border: "1px solid #cbd5e1", borderRadius: 20, cursor: "pointer", color: "#334155" }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* 대화 초과 시 새 대화 버튼 */}
      {isLimitReached && (
        <div style={{ padding: "10px 16px", background: "#fefce8", borderTop: "1px solid #fde68a", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <p style={{ fontSize: 13, color: "#92400e" }}>대화 한도에 도달했습니다.</p>
          <button
            onClick={resetChat}
            style={{ padding: "7px 16px", background: "#f59e0b", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13, whiteSpace: "nowrap" }}
          >
            새 대화 시작
          </button>
        </div>
      )}

      {/* 입력창 */}
      <div style={{ padding: "12px 16px", background: "#fff", borderTop: "1px solid #e2e8f0", display: "flex", gap: 10, alignItems: "flex-end" }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={isLimitReached ? "새 대화를 시작해주세요" : "여행지, 기간, 예산을 입력하세요... (Enter로 전송)"}
          rows={2}
          disabled={isLimitReached}
          style={{
            flex: 1,
            resize: "none",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            padding: "10px 14px",
            fontSize: 14,
            outline: "none",
            fontFamily: "inherit",
            lineHeight: 1.5,
            background: isLimitReached ? "#f8fafc" : "#fff",
            color: isLimitReached ? "#94a3b8" : "inherit",
          }}
        />
        <button
          onClick={() => sendMessage()}
          disabled={loading || !input.trim() || isLimitReached}
          style={{
            padding: "10px 20px",
            background: loading || !input.trim() || isLimitReached ? "#94a3b8" : "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: 12,
            cursor: loading || !input.trim() || isLimitReached ? "default" : "pointer",
            fontWeight: 700,
            fontSize: 14,
            whiteSpace: "nowrap",
          }}
        >
          전송
        </button>
      </div>
    </div>
  );
}
