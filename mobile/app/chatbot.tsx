import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { API_URL } from '../services/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  type?: string;
  chartData?: any;
}

export default function ChatbotScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const listeningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadHistory();
    return () => {
      Speech.stop();
      if (listeningTimeoutRef.current) {
        clearTimeout(listeningTimeoutRef.current);
        listeningTimeoutRef.current = null;
      }
    };
  }, []);

  async function loadHistory() {
    // Welcome message
    setMessages([
      {
        role: 'assistant',
        content: "👋 Hi! I'm your Retail AI Assistant. Ask me about sales, inventory, or get product recommendations!",
        type: 'text',
      },
    ]);
  }

  async function sendMessage(text: string = input) {
    if (!text.trim()) return;

    const userMessage: Message = {
      role: 'user',
      content: text,
      type: 'text',
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/chatbot/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: text,
          sessionId: 'mobile-session',
          platform: 'mobile',
        }),
      });

      const data = await response.json();

      if (data.success) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.data.text,
          type: data.data.type,
          chartData: data.data.chartData,
        };

        setMessages((prev) => [...prev, assistantMessage]);

        if (autoSpeak && data.data.text) {
          speakMessage(data.data.text);
        }
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      console.warn('Unable to reach API, using mock chatbot response:', error);

      // Fallback with mock responses
      const mockResponse = getMockResponse(text);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: mockResponse,
          type: 'text',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function getMockResponse(question: string): string {
    const lowerQuestion = question.toLowerCase();

    if (lowerQuestion.includes('low stock') || lowerQuestion.includes('inventory')) {
      return "⚠️ **Low Stock Alert**\n\n• iPhone 15 Pro: 5 units left\n• Levi's 501 Jeans: 3 units left\n• Peloton Bike+: OUT OF STOCK\n\nConsider reordering these items soon!";
    }

    if (lowerQuestion.includes('sales') || lowerQuestion.includes('revenue')) {
      return "📊 **Sales Summary (Last 30 Days)**\n\n• Total Revenue: $45,280\n• Total Orders: 342\n• Average Order: $132.40\n• Trend: 📈 +12.5% vs last month";
    }

    if (lowerQuestion.includes('recommend') || lowerQuestion.includes('suggest')) {
      return "🛍️ **Recommended Products**\n\n1. **iPhone 15 Pro** - $999.99\n   Why: Best seller, high demand\n\n2. **AirPods Pro 2** - $249.99\n   Why: Great margins, popular\n\n3. **Nike Air Max 270** - $149.99\n   Why: Seasonal favorite";
    }

    if (lowerQuestion.includes('top') || lowerQuestion.includes('best sell')) {
      return "🏆 **Top Selling Products**\n\n1. iPhone 15 Pro - 45 units\n2. AirPods Pro 2 - 38 units\n3. Nike Air Max 270 - 32 units\n4. MacBook Air M3 - 12 units\n5. Samsung S24 Ultra - 18 units";
    }

    if (lowerQuestion.includes('hello') || lowerQuestion.includes('hi')) {
      return "👋 Hello! How can I help you today? Ask me about:\n\n• Sales and revenue\n• Inventory levels\n• Product recommendations\n• Top selling items";
    }

    return "🤔 I'm not sure about that. Try asking about:\n\n• \"What is low stock?\"\n• \"Show sales trends\"\n• \"Recommend products\"\n• \"Top selling items\"";
  }

  async function speakMessage(text: string) {
    try {
      await Speech.stop();

      // Strip markdown for speech
      const cleanText = text
        .replace(/\*\*/g, '')
        .replace(/•/g, '')
        .replace(/📊|📈|📉|✅|⚠️|❌|💡|🛍️|🔮|💰|📦|🏆|👋/g, '');

      setIsSpeaking(true);
      await Speech.speak(cleanText, {
        language: 'en',
        pitch: 1,
        rate: 1,
        onStart: () => setIsSpeaking(true),
        onDone: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    } catch (error) {
      console.warn('Speech playback warning:', error);
      setIsSpeaking(false);
    }
  }

  async function toggleListening() {
    if (isListening) {
      await stopRecording();
      setIsListening(false);
      return;
    }

    await startRecording();
    setIsListening(true);
  }

  async function startRecording() {
    if (listeningTimeoutRef.current) {
      clearTimeout(listeningTimeoutRef.current);
    }

    // Keep a lightweight voice-input demo flow without depending on expo-av.
    listeningTimeoutRef.current = setTimeout(() => {
      setInput('Show sales trends');
      setIsListening(false);
      listeningTimeoutRef.current = null;
    }, 2500);
  }

  async function stopRecording() {
    if (listeningTimeoutRef.current) {
      clearTimeout(listeningTimeoutRef.current);
      listeningTimeoutRef.current = null;
    }
  }

  function toggleSpeak() {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
    } else {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.role === 'assistant') {
        speakMessage(lastMessage.content);
      }
    }
  }

  function MessageBubble({ message }: { message: Message }) {
    const isUser = message.role === 'user';

    return (
      <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        <View style={styles.messageHeader}>
          <Ionicons
            name={isUser ? 'person-circle' : 'hardware-chip-outline'}
            size={24}
            color={isUser ? '#6366f1' : '#10b981'}
          />
          <Text style={styles.messageSender}>
            {isUser ? 'You' : 'AI Assistant'}
          </Text>
        </View>
        <Text style={styles.messageContent}>{message.content}</Text>
      </View>
    );
  }

  const quickQuestions = [
    'Low stock?',
    'Sales trend',
    'Recommend',
    'Top items',
  ];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.botIcon}>
            <Ionicons name="hardware-chip-outline" size={24} color="#fff" />
          </View>
          <View>
            <Text style={styles.headerTitle}>AI Assistant</Text>
            <Text style={styles.headerStatus}>
              {isLoading ? 'Thinking...' : 'Online'}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => setAutoSpeak(!autoSpeak)}
          style={[styles.headerButton, autoSpeak && styles.headerButtonActive]}
        >
          <Ionicons
            name={autoSpeak ? 'volume-high' : 'volume-mute'}
            size={22}
            color={autoSpeak ? '#6366f1' : '#6b6b80'}
          />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        data={messages}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item }) => <MessageBubble message={item} />}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
      />

      {/* Quick Questions */}
      {messages.length <= 1 && (
        <View style={styles.quickQuestions}>
          <Text style={styles.quickQuestionsTitle}>Try asking:</Text>
          <View style={styles.quickQuestionsList}>
            {quickQuestions.map((q, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => sendMessage(q)}
                style={styles.quickQuestionChip}
              >
                <Text style={styles.quickQuestionText}>{q}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#6366f1" />
          <Text style={styles.loadingText}>AI is thinking...</Text>
        </View>
      )}

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <TouchableOpacity
          onPress={toggleListening}
          style={[
            styles.voiceButton,
            isListening && styles.voiceButtonActive,
            isListening && styles.voiceButtonPulse,
          ]}
        >
          <Ionicons
            name={isListening ? 'mic-off' : 'mic'}
            size={22}
            color={isListening ? '#fff' : '#6b6b80'}
          />
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Ask about sales, inventory..."
          placeholderTextColor="#6b6b80"
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={500}
        />

        <TouchableOpacity
          onPress={() => sendMessage()}
          style={[styles.sendButton, (!input.trim() || isLoading) && styles.sendButtonDisabled]}
          disabled={!input.trim() || isLoading}
        >
          <Ionicons
            name="send"
            size={20}
            color={input.trim() && !isLoading ? '#fff' : '#6b6b80'}
          />
        </TouchableOpacity>
      </View>

      {/* Speaking indicator */}
      {isSpeaking && (
        <View style={styles.speakingIndicator}>
          <Ionicons name="volume-high" size={18} color="#10b981" />
          <Text style={styles.speakingText}>Speaking...</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 60,
    backgroundColor: '#1e1e3f',
    borderBottomWidth: 1,
    borderBottomColor: '#2d2d4a',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  botIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  headerStatus: {
    fontSize: 12,
    color: '#6b6b80',
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
  },
  headerButtonActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  messagesList: {
    padding: 16,
    paddingBottom: 0,
  },
  messageBubble: {
    maxWidth: '85%',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#6366f1',
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#1e1e3f',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  messageSender: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  messageContent: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 20,
  },
  quickQuestions: {
    padding: 16,
  },
  quickQuestionsTitle: {
    fontSize: 12,
    color: '#6b6b80',
    marginBottom: 8,
  },
  quickQuestionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickQuestionChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#1e1e3f',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2d2d4a',
  },
  quickQuestionText: {
    fontSize: 12,
    color: '#fff',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
  },
  loadingText: {
    fontSize: 13,
    color: '#6b6b80',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 16,
    backgroundColor: '#1e1e3f',
    borderTopWidth: 1,
    borderTopColor: '#2d2d4a',
  },
  voiceButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1e1e3f',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2d2d4a',
  },
  voiceButtonActive: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  voiceButtonPulse: {
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#0f0f23',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#fff',
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#1e1e3f',
  },
  speakingIndicator: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1e1e3f',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2d2d4a',
  },
  speakingText: {
    fontSize: 12,
    color: '#10b981',
  },
});
