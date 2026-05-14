import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

export default function IncidentAIChat({ incidentContext }) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => {
    let unsubscribe;
    const init = async () => {
      const conv = await base44.agents.createConversation({ agent_name: 'incident_assistant' });
      setConversation(conv);
      setMessages(conv.messages || []);
      setInitializing(false);

      unsubscribe = base44.agents.subscribeToConversation(conv.id, (data) => {
        setMessages(data.messages || []);
        setLoading(false);
      });
    };
    init();
    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !conversation || loading) return;
    setInput('');
    setLoading(true);

    // Build context prefix for first message
    const contextPrefix = messages.length === 0 && incidentContext
      ? `[Контекст аварии: объект — ${incidentContext.object_name || '?'}, дата — ${incidentContext.incident_date || '?'}, комплект БИ — ${incidentContext.bi_kit_number || '?'}, труба — ${incidentContext.pipe_number || '?'}]\n\n`
      : '';

    await base44.agents.addMessage(conversation, { role: 'user', content: contextPrefix + text });
  };

  if (initializing) {
    return (
      <div className="flex items-center justify-center py-6 text-muted-foreground text-sm gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Инициализация ассистента...
      </div>
    );
  }

  return (
    <div className="flex flex-col border border-border rounded-xl overflow-hidden bg-muted/20" style={{ height: 320 }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 border-b border-border">
        <Bot className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-primary">AI Ассистент</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center pt-4">
            Опишите ситуацию — ассистент поможет разобраться в причинах аварии
          </p>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className={cn(
              'max-w-[85%] rounded-2xl px-3 py-2 text-sm',
              msg.role === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'bg-card border border-border text-foreground'
            )}>
              {msg.role === 'user' ? (
                <p>{msg.content}</p>
              ) : (
                <ReactMarkdown className="prose prose-sm max-w-none dark:prose-invert [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                  {msg.content}
                </ReactMarkdown>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-card border border-border rounded-2xl px-3 py-2">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 p-2 border-t border-border bg-background">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder="Спросите ассистента..."
          className="flex-1 h-9 text-sm"
        />
        <Button size="icon" className="h-9 w-9" onClick={sendMessage} disabled={!input.trim() || loading}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}