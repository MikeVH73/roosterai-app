import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, Plus, MessageCircle } from 'lucide-react';
import MessageBubble from './MessageBubble';

export default function AgentChat({ agentName = 'planning_assistent' }) {
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (!currentConversation) return;

    const unsubscribe = base44.agents.subscribeToConversation(currentConversation.id, (data) => {
      setMessages(data.messages || []);
    });

    return () => {
      unsubscribe();
    };
  }, [currentConversation]);

  const loadConversations = async () => {
    try {
      const convos = await base44.agents.listConversations({ agent_name: agentName });
      setConversations(convos || []);
      
      // Auto-select the most recent conversation
      if (convos && convos.length > 0) {
        const mostRecent = convos[0];
        await loadConversation(mostRecent.id);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoadingConversations(false);
    }
  };

  const loadConversation = async (conversationId) => {
    try {
      const conversation = await base44.agents.getConversation(conversationId);
      setCurrentConversation(conversation);
      setMessages(conversation.messages || []);
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  const createNewConversation = async () => {
    try {
      const conversation = await base44.agents.createConversation({
        agent_name: agentName,
        metadata: {
          name: 'Nieuwe conversatie',
          description: 'Planning assistent gesprek'
        }
      });
      setCurrentConversation(conversation);
      setMessages([]);
      setConversations([conversation, ...conversations]);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !currentConversation || loading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setLoading(true);

    try {
      await base44.agents.addMessage(currentConversation, {
        role: 'user',
        content: userMessage
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      setInputMessage(userMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loadingConversations) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!currentConversation) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <MessageCircle className="w-16 h-16 text-slate-300 mb-4" />
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Geen actief gesprek</h3>
        <p className="text-slate-600 mb-6">Start een nieuw gesprek met de Planning Assistent</p>
        <Button onClick={createNewConversation} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Nieuw gesprek starten
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] bg-white rounded-lg border border-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Planning Assistent</h3>
            <p className="text-xs text-slate-500">Stel vragen over roosters en diensten</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={createNewConversation}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nieuw gesprek
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageCircle className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-slate-600">Start het gesprek met een vraag</p>
            <p className="text-sm text-slate-500 mt-2">
              Bijvoorbeeld: "Wie werken er volgende week op locatie 't Dok?"
            </p>
          </div>
        ) : (
          messages.map((message, idx) => (
            <MessageBubble key={idx} message={message} />
          ))
        )}
        {loading && (
          <div className="flex items-start gap-3">
            <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl px-4 py-2.5">
              <p className="text-sm text-slate-600">Agent denkt na...</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="p-4 border-t border-slate-200">
        <div className="flex gap-2">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Stel een vraag over roosters, diensten of medewerkers..."
            disabled={loading}
            className="flex-1"
          />
          <Button 
            type="submit" 
            disabled={!inputMessage.trim() || loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}