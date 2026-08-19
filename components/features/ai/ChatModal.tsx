import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSchoolData } from '../../contexts/SchoolDataContext';
import { getCurrentAcademicPeriod, money, currentPeriod } from '../../utils/helpers';
import { supabase } from '../../../lib/supabaseClient';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function ChatModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Bonjour ! Je suis Wallu, votre assistant. Comment puis-je vous aider avec la gestion de l'école aujourd'hui ?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { session, schoolName } = useAuth();
  
  // Data for AI context
  const { students, staff, classes, staffPayments } = useSchoolData();

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const newMessages = [...messages, { role: 'user', content: input } as Message];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      // Compute metrics
      const now = new Date();
      const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      let expectedAmount = 0;
      let collectedAmount = 0;
      const unpaidStudents: any[] = [];

      students.forEach((s: any) => {
        if (!s.classId || s.status === 'parti' || s.status === 'exclu') return;
        
        let studentOwed = 0;
        if (s.dues) {
          for (const due of s.dues) {
            if (due.period === currentMonthKey) {
              expectedAmount += due.amountDue;
              collectedAmount += due.amountAllocated;
            }
            if (due.period <= currentMonthKey && due.amountDue > due.amountAllocated) {
              studentOwed += (due.amountDue - due.amountAllocated);
            }
          }
        }
        
        if (studentOwed > 0) {
          unpaidStudents.push({ name: s.name, owed: studentOwed });
        }
      });

      unpaidStudents.sort((a, b) => b.owed - a.owed);
      const topUnpaid = unpaidStudents.slice(0, 3).map(u => `${u.name} (${money(u.owed)})`);

      const currentStaffPeriod = currentPeriod();
      const unpaidStaff = staff.filter((m: any) => {
        const paidThisMonth = staffPayments.filter((p: any) => p.staffId === m.id && p.period && p.period.startsWith(currentStaffPeriod.substring(0, 7))).reduce((a: any, p: any) => a + p.amount, 0);
        return (m.salary - paidThisMonth) > 0;
      });

      const unpaidStaffNames = unpaidStaff.map((m: any) => m.name);

      const metrics = {
        activeStudents: students.length,
        unpaidCount: unpaidStudents.length,
        topUnpaid,
        collectedAmount,
        expectedAmount,
        pendingSalariesCount: unpaidStaff.length,
        unpaidStaffNames
      };

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          messages: newMessages,
          schoolName,
          metrics
        })
      });

      if (!response.ok) throw new Error('Erreur réseau');

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Désolé, je n'ai pas pu répondre à votre question. Veuillez réessayer plus tard." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 p-4 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-colors z-50 flex items-center gap-2"
        >
          <MessageCircle size={24} />
          <span className="font-medium hidden sm:inline">Discuter avec Wallu</span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 max-w-[calc(100vw-3rem)] h-[500px] max-h-[calc(100vh-6rem)] bg-white rounded-2xl shadow-2xl flex flex-col z-50 border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="p-4 bg-indigo-600 text-white flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <MessageCircle size={18} />
              </div>
              <div>
                <h3 className="font-semibold">Wallu IA</h3>
                <p className="text-xs text-indigo-100">Assistant de direction</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white">
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto bg-gray-50 flex flex-col gap-3">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-tr-sm' 
                    : 'bg-white text-gray-800 border border-gray-100 rounded-tl-sm shadow-sm'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-100 p-3 rounded-2xl rounded-tl-sm shadow-sm">
                  <Loader2 size={16} className="animate-spin text-indigo-600" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={sendMessage} className="p-3 border-t bg-white">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Posez votre question..."
                className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                disabled={isLoading}
              />
              <button 
                type="submit" 
                disabled={!input.trim() || isLoading}
                className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={18} />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
