import React, { useState, useEffect, useRef } from 'react';
import { Send, Mic, MicOff, Volume2, VolumeX, Trash2, Bot, User } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { chatbotAPI } from '../services/api';

// Generate unique session ID
const generateSessionId = () => `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export default function Chatbot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(() => generateSessionId());
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        setInput(transcript);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };
    }
  }, []);

  // Load chat history
  useEffect(() => {
    loadHistory();
  }, [sessionId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadHistory() {
    try {
      const res = await chatbotAPI.getHistory(sessionId);
      setMessages(res.data.data || []);
    } catch (error) {
      console.error('Error loading history:', error);
    }
  }

  async function sendMessage(text = input) {
    if (!text.trim()) return;

    const userMessage = {
      role: 'user',
      content: text,
      type: 'text',
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await chatbotAPI.sendMessage({
        message: text,
        sessionId,
        platform: 'web',
      });

      const assistantMessage = {
        role: 'assistant',
        content: res.data.data.text,
        type: res.data.data.type,
        chartData: res.data.data.chartData,
        chartType: res.data.data.chartType,
        metadata: res.data.metadata,
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Auto-speak response if enabled
      if (autoSpeak && res.data.data.text) {
        speakMessage(res.data.data.text);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        type: 'text',
        isError: true,
      }]);
    } finally {
      setIsLoading(false);
    }
  }

  function speakMessage(text) {
    if (!('speechSynthesis' in window)) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Strip markdown for speech
    const cleanText = text.replace(/\*\*/g, '').replace(/•/g, '').replace(/📊|📈|📉|✅|⚠️|❌|💡|🛍️|🔮|💰|📦|🏆/g, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }

  function toggleListening() {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser. Try Chrome or Edge.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  }

  function handleKeyPress(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function clearChat() {
    if (confirm('Are you sure you want to clear the chat history?')) {
      chatbotAPI.clearHistory(sessionId);
      setMessages([]);
      setSessionId(generateSessionId());
    }
  }

  function ChartComponent({ type, data, height = 200 }) {
    if (!data || !data.labels || !data.datasets) return null;

    const ChartEl = type === 'line' ? LineChart : BarChart;
    const DataEl = type === 'line' ? Line : Bar;

    return (
      <div style={{ marginTop: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '12px' }}>
        <ResponsiveContainer width="100%" height={height}>
          <ChartEl data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey={data.labels[0] ? 'label' : null} stroke="var(--text-muted)" fontSize={10}
              tickFormatter={(v, i) => data.labels?.[i] || v} />
            <YAxis stroke="var(--text-muted)" fontSize={10} />
            <Tooltip
              contentStyle={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                fontSize: '12px',
              }}
            />
            <DataEl
              dataKey="value"
              stroke={data.datasets[0]?.borderColor || 'var(--primary)'}
              fill={data.datasets[0]?.backgroundColor || 'rgba(99, 102, 241, 0.2)'}
              strokeWidth={2}
            />
          </ChartEl>
        </ResponsiveContainer>
      </div>
    );
  }

  function MessageBubble({ message }) {
    const isUser = message.role === 'user';

    return (
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '16px',
        animation: 'slideUp 0.3s ease',
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: isUser ? 'var(--primary)' : 'var(--secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          {isUser ? <User size={20} color="white" /> : <Bot size={20} color="white" />}
        </div>
        <div style={{
          flex: 1,
          maxWidth: '80%',
          background: isUser ? 'var(--primary)' : 'var(--bg-tertiary)',
          borderRadius: 'var(--radius-lg)',
          padding: '12px 16px',
        }}>
          <p style={{
            whiteSpace: 'pre-wrap',
            lineHeight: 1.6,
            fontSize: '0.9375rem',
          }}>
            {message.content}
          </p>
          {message.chartData && (
            <ChartComponent
              type={message.chartType}
              data={{
                labels: message.chartData.labels,
                datasets: message.chartData.datasets.map(d => ({
                  ...d,
                  value: d.data,
                })),
              }}
            />
          )}
          {message.metadata && (
            <p style={{
              marginTop: '8px',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
            }}>
              Source: {message.metadata.source} • {Math.round(message.metadata.responseTime)}ms
            </p>
          )}
        </div>
      </div>
    );
  }

  const quickQuestions = [
    "What is low stock?",
    "Show sales trends",
    "Recommend products",
    "Top selling items",
    "What's our revenue?",
  ];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 40px)',
      maxWidth: '900px',
      margin: '0 auto',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        marginBottom: '16px',
        border: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Bot size={24} color="white" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>AI Assistant</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {isLoading ? 'Thinking...' : 'Ready to help'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setAutoSpeak(!autoSpeak)}
            className={`btn btn-icon ${autoSpeak ? 'active' : ''}`}
            title="Toggle auto-speak"
          >
            {autoSpeak ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
          <button
            onClick={clearChat}
            className="btn btn-icon"
            title="Clear chat"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        marginBottom: '16px',
        border: '1px solid var(--border)',
      }}>
        {messages.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'var(--text-muted)',
          }}>
            <Bot size={64} style={{ marginBottom: '16px', opacity: 0.5 }} />
            <h3 style={{ marginBottom: '8px' }}>Welcome to Retail AI Assistant</h3>
            <p style={{ textAlign: 'center', maxWidth: '400px', marginBottom: '24px' }}>
              Ask me anything about your sales, inventory, or get product recommendations!
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
              {quickQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(q)}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8125rem' }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <MessageBubble key={i} message={msg} />
            ))}
            {isLoading && (
              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'var(--secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Bot size={20} color="white" />
                </div>
                <div style={{
                  background: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '12px 16px',
                  display: 'flex',
                  gap: '4px',
                  alignItems: 'center',
                }}>
                  <div className="spinner" style={{ width: '16px', height: '16px' }} />
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div style={{
        display: 'flex',
        gap: '12px',
        padding: '16px',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)',
      }}>
        <button
          onClick={toggleListening}
          className={`btn btn-icon ${isListening ? 'active' : ''}`}
          style={{
            background: isListening ? 'rgba(239, 68, 68, 0.1)' : undefined,
            color: isListening ? 'var(--danger)' : undefined,
            animation: isListening ? 'pulse 1.5s infinite' : undefined,
          }}
          title="Voice input"
        >
          {isListening ? <MicOff size={20} /> : <Mic size={20} />}
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask about sales, inventory, or recommendations..."
          className="input"
          style={{ flex: 1 }}
          disabled={isLoading}
        />
        <button
          onClick={() => sendMessage()}
          className="btn btn-primary"
          disabled={isLoading || !input.trim()}
        >
          <Send size={18} />
          Send
        </button>
      </div>

      {/* Speaking indicator */}
      {isSpeaking && (
        <div style={{
          position: 'fixed',
          bottom: '100px',
          right: '20px',
          padding: '8px 16px',
          background: 'var(--bg-tertiary)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.875rem',
        }}>
          <Volume2 size={16} className="animate-pulse" />
          Speaking...
        </div>
      )}
    </div>
  );
}
