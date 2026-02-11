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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
    <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-amber-700 border-2 h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-amber-400 text-lg flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          Chat
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-4 pt-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto mb-3 space-y-2 min-h-[400px] max-h-[500px]">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`p-2 rounded-lg ${
                msg.playerId === myId
                  ? 'bg-blue-600 ml-8 text-right'
                  : 'bg-slate-700 mr-8'
              }`}
            >
              <div className="text-xs text-amber-400 mb-1">{msg.nickname}</div>
              <div className="text-white text-sm break-words">{msg.message}</div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
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
  );
}
