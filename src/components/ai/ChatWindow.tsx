"use client";
import React, { useRef, useEffect, useMemo } from "react";
import { Input, List, Avatar, Button } from "antd";
import { useChat } from "@ai-sdk/react";
import { OpenAIOutlined, UserOutlined } from "@ant-design/icons";

const { TextArea } = Input;

interface Message {
  role: "user" | "assistant";
  content: string;
}

const ChatWindow: React.FC = () => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, input, handleInputChange, handleSubmit, status } = useChat();

  const isLoading = useMemo(() => {
    if (status === "streaming" || status === "submitted") {
      return true;
    }

    return false;
  }, [status]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <>
      <div
        style={{
          height: "400px",
          overflowY: "auto",
          border: "1px solid #eee",
          padding: 12,
          marginBottom: 12,
          background: "#fafafa",
        }}
      >
        <List
          dataSource={messages}
          renderItem={(msg) => {
            console.log(msg, "1111111111");
            const isMe = msg.role === "user";

            return (
              <List.Item>
                <div
                  style={{
                    display: "flex",
                    width: "100%",
                    // alignItems: "start",
                    justifyContent: isMe ? "end !important" : "start !important",
                    flexDirection: isMe ? "row-reverse" : "row",
                    columnGap: 10,
                  }}
                >
                  <div>
                    {isMe ? (
                      <Avatar icon={<UserOutlined />} style={{ backgroundColor: "#87d068" }} />
                    ) : (
                      <Avatar icon={<OpenAIOutlined />} />
                    )}
                  </div>
                  <div className="pt-1">{msg.content}</div>
                </div>
              </List.Item>
            );
          }}
        />
        <div ref={messagesEndRef} />
      </div>

      <div className="flex gap-x-3">
        <TextArea
          disabled={isLoading}
          placeholder="Please enter content and press Enter to send"
          rows={1}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
        />
        <Button loading={isLoading} type="primary" onClick={handleSubmit}>
          Send
        </Button>
      </div>
    </>
  );
};

export default ChatWindow;
