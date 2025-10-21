import { useState } from "react";
import "./ChatPanel.css";

type Message = {
  id: string;
  content: string;
  author: string;
};

type Props = {
  onSend: (text: string, author: string) => void;
};

export default function ChatPanel({ onSend }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");

  function handleSend() {
    if (!input.trim()) return;

    const msg: Message = {
      id: crypto.randomUUID(),
      content: input,
      author: "user",
    };

    setMessages((prev) => [...prev, msg]);
    onSend(input, "user");
    setInput("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="chat-panel">
      <div className="chat-messages">
        {messages.map((m) => (
          <div key={m.id} className={`chat-message ${m.author}`}>
            <span>{m.content}</span>
          </div>
        ))}
      </div>

      <div className="chat-input">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
        />
        <button onClick={handleSend}>Send</button>
      </div>
    </div>
  );
}
