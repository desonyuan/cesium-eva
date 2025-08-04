"use client";
import React, { useRef, useEffect, useMemo, useCallback } from "react";
import { Input, List, Avatar, Button } from "antd";
import { useChat } from "@ai-sdk/react";
import { OpenAIOutlined, UserOutlined } from "@ant-design/icons";
import { UIMessage } from "ai";

import ConentFormat from "./ConentFormat";

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

  const renderItem = useCallback((msg: UIMessage) => {
    const isMe = msg.role === "user";

    const parts = msg.parts;

    return (
      <List.Item key={msg.id}>
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
          <div className="pt-1">
            {isMe ? (
              <div>{msg.content}</div>
            ) : (
              parts.map((part, idx) => {
                switch (part.type) {
                  case "text":
                    return <ConentFormat key={idx} content={msg.content} />;
                  case "tool-invocation":
                    switch (part.toolInvocation.state) {
                      case "call":
                        return (
                          <div
                            key={part.toolInvocation.toolCallId}
                            className="px-2 py-1 text-white rounded-lg"
                            style={{
                              display: "flex",
                              backgroundColor: "rgba(0, 0, 0, 0.3)",
                              width: "100%",
                              justifyContent: isMe ? "end !important" : "start !important",
                              flexDirection: isMe ? "row-reverse" : "row",
                              columnGap: 10,
                            }}
                          >
                            <div>工具调用：{part.toolInvocation.toolName}</div>
                            <span>正在调用...</span>
                          </div>
                        );
                      case "result":
                        return <ConentFormat key={idx} content={part.toolInvocation.result} />;
                      default:
                        break;
                    }
                  default:
                    return null;
                }
              })
            )}
          </div>
        </div>
      </List.Item>
    );
  }, []);

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
        <List dataSource={messages} renderItem={renderItem} />
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
