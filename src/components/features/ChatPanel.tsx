import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MessageCircle, Send } from 'lucide-react';
import type { ChatMessage } from '@/types/game';

interface ChatPanelProps {
  messages: ChatMessage[];
  myId: string;
  onSendMessage: (message: string) => void;
}

export default function ChatPanel({ messages, myId, onSendMessage }: ChatPanelProps) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;

    el.scrollTop = el.scrollHeight;
  }, [messages]);

  const handleSend = () => {
    if (inputValue.trim()) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

return (
    /* 1. Ensure the outermost wrapper has a fixed height or flex-1 from its own parent */
    <div className="h-full max-h-screen flex flex-col"> 
      <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-amber-700 border-2 h-full flex flex-col overflow-hidden">
        <CardHeader className="flex-none pb-3">
          <CardTitle className="text-amber-400 text-lg flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Chat
          </CardTitle>
        </CardHeader>

        {/* 2. CardContent needs flex-1 and min-h-0 to tell the browser it can't expand forever */}
        <CardContent className="flex-1 flex flex-col p-4 pt-0 min-h-0">
          
          {/* 3. The Messages container needs flex-1 and overflow-y-auto */}
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto mb-3 space-y-2 pr-2 custom-scrollbar"
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`p-2 rounded-lg ${
                  msg.playerId === myId
                    ? 'bg-blue-600 ml-8'
                    : 'bg-slate-700 mr-8'
                }`}
              >
                <div className={`text-xs text-amber-400 mb-1 ${msg.playerId === myId ? 'text-right' : 'text-left'}`}>
                  {msg.nickname}
                </div>
                <div className={`text-white text-sm break-words ${msg.playerId === myId ? 'text-right' : 'text-left'}`}>
                  {msg.message}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* 4. Input area: flex-none ensures it stays at the bottom and doesn't shrink */}
          <div className="flex-none flex gap-2 pt-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress} // Changed from onKeyPress (deprecated)
              placeholder="Type a message..."
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
              maxLength={200}
            />
            <Button
              onClick={handleSend}
              disabled={!inputValue.trim()}
              className="bg-amber-600 hover:bg-amber-700 text-white"
              size="icon"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
