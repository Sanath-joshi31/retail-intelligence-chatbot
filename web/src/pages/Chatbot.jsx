import React, { useState, useEffect, useRef } from 'react';
import { Send, Mic, MicOff, Volume2, VolumeX, Trash2, Bot, User, BookOpen, Wrench, Zap, CheckCircle2, RefreshCw, AlertTriangle, ShieldCheck, XCircle, TrendingUp, Package, Clock, DollarSign, BarChart2 } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { chatbotAPI } from '../services/api';

// Generate unique session ID
const generateSessionId = () => `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export default function Chatbot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [agentStep, setAgentStep] = useState('');
  const [approvals, setApprovals] = useState({});
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

    const steps = [
      '🔍 Analyzing retail objective & formulating plan...',
      '📦 Querying live inventory levels...',
      '📈 Computing 30-day product sales velocity...',
      '📄 Retrieving enterprise reorder policy via RAG...',
      '🧮 Running deterministic ROQ & MOQ calculations...',
      '🛡️ Evaluating stockout risk & human approval gate...'
    ];
    let stepIdx = 0;
    setAgentStep(steps[0]);
    const stepInterval = setInterval(() => {
      stepIdx = (stepIdx + 1) % steps.length;
      setAgentStep(steps[stepIdx]);
    }, 850);

    try {
      const res = await chatbotAPI.sendMessage({
        message: text,
        sessionId,
        platform: 'web',
      });

      const resData = res.data.data;
      const assistantMessage = {
        role: 'assistant',
        content: resData.text,
        type: resData.type || 'text',
        chartData: resData.chartData,
        chartType: resData.chartType,
        sources: resData.sources || [],
        tools_called: resData.tools_called || [],
        latency: resData.latency,
        data: resData.data,
        metadata: res.data.metadata,
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Auto-speak response if enabled
      if (autoSpeak && resData.text) {
        speakMessage(resData.text);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error communicating with the AI service. Please try again.',
        type: 'text',
        isError: true,
      }]);
    } finally {
      clearInterval(stepInterval);
      setAgentStep('');
      setIsLoading(false);
    }
  }

  function speakMessage(text) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
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
    if (confirm('Are you sure you want to clear the chat session and AI conversation memory?')) {
      chatbotAPI.clearHistory(sessionId);
      setMessages([]);
      setSessionId(generateSessionId());
    }
  }

  function ChartComponent({ type, chartData, height = 220 }) {
    if (!chartData || !chartData.labels || !chartData.datasets || !chartData.datasets[0]) return null;

    const labels = chartData.labels || [];
    const dataset = chartData.datasets[0];
    const rawData = dataset.data || [];

    const formattedData = labels.map((label, index) => ({
      label,
      value: typeof rawData[index] === 'number' ? rawData[index] : (rawData[index]?.value || 0),
    }));

    if (formattedData.length === 0) return null;

    const ChartEl = type === 'line' ? LineChart : BarChart;
    const DataEl = type === 'line' ? Line : Bar;
    const color = dataset.borderColor || dataset.backgroundColor?.[0] || 'var(--primary)';
    const bgColor = dataset.backgroundColor || 'rgba(99, 102, 241, 0.2)';

    return (
      <div style={{ marginTop: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '12px 16px 12px 0px' }}>
        <ResponsiveContainer width="100%" height={height}>
          <ChartEl data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="label" stroke="var(--text-muted)" fontSize={11} />
            <YAxis stroke="var(--text-muted)" fontSize={11} tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`} />
            <Tooltip
              contentStyle={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                fontSize: '12px',
                color: 'var(--text-primary)',
              }}
              formatter={(val) => [`${Number(val).toLocaleString()}`, dataset.label || 'Value']}
            />
            <DataEl
              type="monotone"
              dataKey="value"
              stroke={color}
              fill={typeof bgColor === 'string' ? bgColor : 'rgba(99, 102, 241, 0.2)'}
              strokeWidth={2}
            />
          </ChartEl>
        </ResponsiveContainer>
      </div>
    );
  }

  function ReplenishmentGraphics({ message, approvals, setApprovals }) {
    const recs = message.data?.recommendations || [];
    if (!recs.length) return null;

    const criticalCount = recs.filter(r => (r.stockout_risk === 'critical' || r.priority === 'CRITICAL')).length;
    const totalSpend = message.data?.total_estimated_spend || recs.reduce((acc, r) => acc + (r.estimated_order_cost || 0), 0);

    // Prepare chart items for comparison
    const chartItems = recs.slice(0, 8).map(r => {
      const name = r.product_name || 'Product';
      const shortName = name.length > 13 ? name.substring(0, 11) + '..' : name;
      const onHand = Math.max(0, r.on_hand_stock ?? (r.current_stock > 0 ? r.current_stock : 0));
      const demandBuffer = r.lead_time_demand ? (r.lead_time_demand + (r.safety_stock || 5)) : Math.ceil(((r.daily_sales_velocity || r.daily_velocity || 0) * (r.lead_time_days || 7)) + (r.safety_stock || 5));
      const recommended = r.recommended_quantity || r.recommended_reorder_qty || 10;
      return {
        name,
        shortName,
        onHand,
        demandBuffer,
        recommended
      };
    });

    return (
      <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Executive Graphical KPI Bar */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '10px',
          background: 'var(--bg-card)',
          borderRadius: '10px',
          padding: '12px 16px',
          border: '1px solid var(--border)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={20} color="#818cf8" />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>SKUs Needing Reorder</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{recs.length} Products</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={20} color="#f87171" />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Critical Stockout Risk</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: criticalCount > 0 ? '#f87171' : '#10b981' }}>{criticalCount} Critical SKUs</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={20} color="#34d399" />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Est. Purchase Investment</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>${Math.round(totalSpend).toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Graphical Comparison Bar Chart */}
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: '10px',
          padding: '16px',
          border: '1px solid var(--border)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
              <BarChart2 size={18} color="#6366f1" />
              <span>Stock vs Expected Demand vs Recommended Reorder</span>
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Units Comparison</span>
          </div>

          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartItems} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.06)" />
              <XAxis dataKey="shortName" stroke="var(--text-muted)" fontSize={11} interval={0} angle={-15} textAnchor="end" />
              <YAxis stroke="var(--text-muted)" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#f8fafc',
                  boxShadow: '0 8px 16px rgba(0,0,0,0.4)'
                }}
                formatter={(val, name) => [`${val} units`, name]}
                labelFormatter={(label, items) => items?.[0]?.payload?.name || label}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Bar dataKey="onHand" name="Current On-Hand" fill="#38bdf8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="demandBuffer" name="Lead Time Demand + Buffer" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="recommended" name="Recommended Order (MOQ)" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Detailed Product Recommendation Cards with Every Single Reason */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {recs.map((rec, idx) => {
            const recKey = `${message.id || 'msg'}-${rec.sku || idx}`;
            const currentStatus = approvals[recKey] || (rec.requires_approval ? 'pending' : 'pending');
            const riskColor =
              rec.stockout_risk === 'critical' ? '#ef4444' :
              rec.stockout_risk === 'high' ? '#f59e0b' :
              rec.stockout_risk === 'medium' ? '#3b82f6' : '#10b981';

            const onHand = Math.max(0, rec.on_hand_stock ?? (rec.current_stock > 0 ? rec.current_stock : 0));
            const deficit = rec.backorder_deficit || (rec.current_stock < 0 ? Math.abs(rec.current_stock) : 0);
            const dsv = rec.daily_sales_velocity || rec.daily_velocity || 0;
            const lt = rec.lead_time_days || 7;
            const ss = rec.safety_stock || 5;
            const rawRoq = rec.calculated_roq ?? Math.ceil(dsv * lt) + ss - onHand;
            const recommendedQty = rec.recommended_quantity || rec.recommended_reorder_qty || rec.moq || 10;
            const coverage = rec.coverage_days || 0;

            const coveragePct = Math.min(100, Math.round((coverage / Math.max(1, lt)) * 100));

            return (
              <div key={idx} style={{
                background: 'var(--bg-card)',
                borderRadius: '10px',
                padding: '16px',
                border: `1px solid ${rec.stockout_risk === 'critical' ? 'rgba(239, 68, 68, 0.4)' : 'var(--border)'}`,
                boxShadow: rec.stockout_risk === 'critical' ? '0 0 12px rgba(239, 68, 68, 0.15)' : 'none',
                fontSize: '0.85rem'
              }}>
                {/* Product Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                        {rec.product_name}
                      </span>
                      <span style={{
                        padding: '2px 8px',
                        background: 'rgba(255,255,255,0.06)',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        color: 'var(--text-muted)'
                      }}>
                        {rec.sku || 'SKU-N/A'} • {rec.category || 'General'}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '4px',
                      textTransform: 'uppercase',
                      background: `${riskColor}22`,
                      color: riskColor,
                      border: `1px solid ${riskColor}55`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <AlertTriangle size={12} />
                      Risk: {rec.stockout_risk || 'Normal'}
                    </span>
                    {rec.priority && (
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '4px',
                        background: 'rgba(99, 102, 241, 0.15)',
                        color: '#818cf8',
                        border: '1px solid rgba(99, 102, 241, 0.3)'
                      }}>
                        {rec.priority}
                      </span>
                    )}
                  </div>
                </div>

                {/* Visual Coverage Gauge Bar */}
                <div style={{ marginBottom: '12px', background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Stock Coverage: <strong style={{ color: coverage < lt ? '#f87171' : '#34d399' }}>{coverage} days</strong></span>
                    <span style={{ color: 'var(--text-muted)' }}>Supplier Lead Time: <strong>{lt} days</strong></span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${coveragePct}%`,
                      height: '100%',
                      background: coverage < 2 ? '#ef4444' : coverage < lt ? '#f59e0b' : '#10b981',
                      borderRadius: '3px'
                    }} />
                  </div>
                </div>

                {/* 6-Cell Key Metrics Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: '8px',
                  marginBottom: '12px'
                }}>
                  <div style={{ background: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Current Stock</div>
                    <div style={{ fontWeight: 700, color: deficit > 0 ? '#f87171' : 'var(--text-primary)' }}>
                      {deficit > 0 ? `0 on-hand (${deficit} backordered)` : `${onHand} units`}
                    </div>
                  </div>
                  <div style={{ background: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Daily Sales Velocity</div>
                    <div style={{ fontWeight: 700 }}>{dsv} units/day</div>
                  </div>
                  <div style={{ background: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Forward Coverage</div>
                    <div style={{ fontWeight: 700, color: coverage < lt ? '#f87171' : 'var(--text-primary)' }}>{coverage} days</div>
                  </div>
                  <div style={{ background: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Supplier Lead Time</div>
                    <div style={{ fontWeight: 700 }}>{lt} days</div>
                  </div>
                  <div style={{ background: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Safety Stock Buffer</div>
                    <div style={{ fontWeight: 700 }}>{ss} units</div>
                  </div>
                  <div style={{ background: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Supplier MOQ</div>
                    <div style={{ fontWeight: 700 }}>{rec.moq || 10} units</div>
                  </div>
                </div>

                {/* Graphical Math Formula Breakdown */}
                <div style={{
                  background: 'rgba(99, 102, 241, 0.07)',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  marginBottom: '10px',
                  fontSize: '0.75rem',
                  fontFamily: 'monospace'
                }}>
                  <div style={{ color: 'var(--text-muted)', marginBottom: '2px' }}>📐 <strong>Deterministic Calculation Step:</strong></div>
                  <div style={{ color: '#c7d2fe' }}>
                    ROQ = (Velocity × Lead Time) + Safety Buffer - Stock = ({dsv} × {lt}) + {ss} - {onHand} = <strong>{rawRoq} units</strong>
                    {recommendedQty > rawRoq && <span style={{ color: '#fbbf24' }}> → Rounded up to Supplier MOQ: <strong>{recommendedQty} units</strong></span>}
                  </div>
                </div>

                {/* Complete Business Reason Box */}
                <div style={{
                  background: 'var(--bg-secondary)',
                  borderRadius: '6px',
                  padding: '10px 12px',
                  marginBottom: '12px',
                  fontSize: '0.8rem',
                  lineHeight: 1.5,
                  borderLeft: `3px solid ${riskColor}`
                }}>
                  <strong style={{ color: 'var(--text-primary)' }}>💡 Decision Rationale: </strong>
                  <span style={{ color: 'var(--text-muted)' }}>{rec.reason}</span>
                </div>

                {/* Human Approval Gate & Recommended Order Bar */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '10px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Recommended Reorder Quantity:</span>
                    <span style={{
                      fontSize: '1.15rem',
                      fontWeight: 800,
                      color: '#818cf8',
                      background: 'rgba(99, 102, 241, 0.15)',
                      padding: '2px 10px',
                      borderRadius: '6px',
                      border: '1px solid rgba(99, 102, 241, 0.3)'
                    }}>
                      📦 {recommendedQty} units
                    </span>
                  </div>

                  {currentStatus === 'approved' ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontWeight: 700, fontSize: '0.82rem', background: 'rgba(16, 185, 129, 0.15)', padding: '4px 10px', borderRadius: '4px' }}>
                      <CheckCircle2 size={16} /> Purchase Order Approved!
                    </span>
                  ) : currentStatus === 'rejected' ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', fontWeight: 700, fontSize: '0.82rem', background: 'rgba(239, 68, 68, 0.15)', padding: '4px 10px', borderRadius: '4px' }}>
                      <XCircle size={16} /> Reorder Rejected
                    </span>
                  ) : (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => setApprovals(prev => ({ ...prev, [recKey]: 'approved' }))}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '6px',
                          background: '#10b981',
                          color: 'white',
                          border: 'none',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)'
                        }}
                      >
                        <CheckCircle2 size={14} /> Approve Order
                      </button>
                      <button
                        onClick={() => setApprovals(prev => ({ ...prev, [recKey]: 'rejected' }))}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          background: 'transparent',
                          color: 'var(--text-muted)',
                          border: '1px solid var(--border)',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <XCircle size={14} /> Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function MessageBubble({ message }) {
    const isUser = message.role === 'user';
    const hasSources = message.sources && message.sources.length > 0;
    const hasTools = message.tools_called && message.tools_called.length > 0;
    const hasRecs = !isUser && message.data?.recommendations && message.data.recommendations.length > 0;

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
          background: isUser ? 'var(--primary)' : 'linear-gradient(135deg, #6366f1, #4338ca)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          {isUser ? <User size={20} color="white" /> : <Bot size={20} color="white" />}
        </div>
        <div style={{
          flex: 1,
          maxWidth: '88%',
          background: isUser ? 'var(--primary)' : 'var(--bg-tertiary)',
          borderRadius: 'var(--radius-lg)',
          padding: '14px 18px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.08)'
        }}>
          {/* Tool execution indicator */}
          {!isUser && hasTools && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
              {message.tools_called.map((tool, i) => (
                <span key={i} style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.7rem',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: 'rgba(99, 102, 241, 0.15)',
                  color: '#818cf8',
                  border: '1px solid rgba(99, 102, 241, 0.3)'
                }}>
                  <Wrench size={10} /> {tool}
                </span>
              ))}
            </div>
          )}

          {/* Graphical Replenishment Dashboard when recommendations exist, or regular text */}
          {hasRecs ? (
            <div>
              <div style={{
                marginBottom: '10px',
                padding: '10px 14px',
                background: 'rgba(99, 102, 241, 0.1)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                fontSize: '0.88rem',
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <ShieldCheck size={18} color="#6366f1" />
                <span><strong>Autonomous Stock Replenishment Plan</strong>: Evaluated real-time inventory levels, rolling 30-day velocity, supplier lead times, and enterprise reorder policy constraints.</span>
              </div>

              {/* Render Rich Graphics Dashboard */}
              <ReplenishmentGraphics
                message={message}
                approvals={approvals}
                setApprovals={setApprovals}
              />
            </div>
          ) : (
            <p style={{
              whiteSpace: 'pre-wrap',
              lineHeight: 1.6,
              fontSize: '0.9375rem',
              margin: 0,
            }}>
              {message.content}
            </p>
          )}

          {/* Embedded Charts for standard chart responses */}
          {!hasRecs && message.chartData && (
            <ChartComponent
              type={message.chartType}
              chartData={message.chartData}
            />
          )}

          {/* Cited Sources Accordion */}
          {!isUser && hasSources && (
            <div style={{
              marginTop: '12px',
              paddingTop: '8px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                <BookOpen size={13} />
                <strong>Verified Enterprise Sources ({message.sources.length}):</strong>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {message.sources.map((s, i) => (
                  <span key={i} title={s.snippet || s.source} style={{
                    fontSize: '0.7rem',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: 'rgba(16, 185, 129, 0.12)',
                    color: '#34d399',
                    border: '1px solid rgba(16, 185, 129, 0.25)'
                  }}>
                    📄 {s.source.split('/').pop()} {s.page ? `(p.${s.page})` : ''}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Footer Metadata & Latency */}
          {!isUser && (
            <div style={{
              marginTop: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
            }}>
              <span>
                Engine: {message.metadata?.source || 'langgraph-agent'}
              </span>
              {message.latency && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <Zap size={11} color="#f59e0b" />
                  {message.latency.total_ms}ms
                  {message.latency.retrieval_ms > 0 ? ` (RAG: ${message.latency.retrieval_ms}ms)` : ''}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  const quickQuestions = [
    "What is our electronics return policy?",
    "Which products are currently low in stock?",
    "What were our top-selling products in the last 30 days?",
    "Which products should I reorder based on current inventory, sales, and our reorder policy?",
    "Forecast next week's sales"
  ];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 40px)',
      maxWidth: '960px',
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
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Bot size={24} color="white" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>Retail Intelligence AI Assistant</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
              {isLoading ? '🤖 LangGraph reasoning in progress...' : '⚡ RAG + Live MongoDB Tools Ready'}
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
            title="Reset conversation session"
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
            textAlign: 'center',
          }}>
            <Bot size={64} style={{ marginBottom: '16px', opacity: 0.5, color: '#6366f1' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>
              Retail Intelligence RAG + Agent Platform
            </h3>
            <p style={{ maxWidth: '480px', marginBottom: '24px', fontSize: '0.875rem' }}>
              Ask anything about enterprise return/warranty policies, live stock status, sales analytics, demand forecasts, or autonomous replenishment recommendations.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '580px' }}>
              {quickQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(q)}
                  style={{
                    padding: '10px 14px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                  onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  <span>{q}</span>
                  <Send size={14} color="var(--text-muted)" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, index) => (
            <MessageBubble key={index} message={msg} />
          ))
        )}
        {isLoading && (
          <div style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '16px',
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1, #4338ca)',
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
              alignItems: 'center',
              gap: '8px',
            }}>
              <RefreshCw size={16} className="animate-spin" />
              <span style={{ fontSize: '0.875rem', color: '#818cf8', fontWeight: 500 }}>
                {agentStep || 'LangGraph reasoning & evaluating tools...'}
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{
        display: 'flex',
        gap: '12px',
        padding: '16px',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)',
      }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask a question about policies, stock, sales, forecasting, or reorder decisions..."
          disabled={isLoading}
          style={{
            flex: 1,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            color: 'var(--text-primary)',
            fontSize: '0.9375rem',
            outline: 'none',
          }}
        />
        <button
          onClick={toggleListening}
          className={`btn btn-icon ${isListening ? 'active' : ''}`}
          disabled={isLoading}
          title={isListening ? 'Listening...' : 'Voice input'}
        >
          {isListening ? <Mic size={20} color="#ef4444" /> : <MicOff size={20} />}
        </button>
        <button
          onClick={() => sendMessage()}
          disabled={!input.trim() || isLoading}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 18px' }}
        >
          <Send size={18} />
          <span>Send</span>
        </button>
      </div>
    </div>
  );
}
