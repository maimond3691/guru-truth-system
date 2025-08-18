import { useCallback } from 'react';
import type { UseChatHelpers } from '@ai-sdk/react';
import type { ChatMessage } from '@/lib/types';
import { generateUUID } from '@/lib/utils';

export interface Phase2CoordinatorProps {
  chatId: string;
  messages: ChatMessage[];
  setMessages: UseChatHelpers<ChatMessage>['setMessages'];
  sendMessage: UseChatHelpers<ChatMessage>['sendMessage'];
  selectedPhase: 'phase-1' | 'phase-2' | 'phase-3' | null;
}

export function usePhase2Coordinator({
  chatId,
  messages,
  setMessages,
  sendMessage,
  selectedPhase,
}: Phase2CoordinatorProps) {
  // Helper function to save messages to database
  const saveMessagesToDatabase = useCallback(async (messagesToSave: ChatMessage[]) => {
    try {
      await fetch('/api/chat', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: chatId,
          messages: messagesToSave,
        }),
      });
    } catch (error) {
      console.warn('Failed to save messages to database:', error);
    }
  }, [chatId]);

  // Create a wrapper around sendMessage that includes the selected phase
  const sendMessageWithPhase = useCallback((message: Parameters<typeof sendMessage>[0], body?: any) => {
    const bodyWithPhase = {
      ...body,
      ...(selectedPhase && { hintPhaseId: selectedPhase })
    };
    return sendMessage(message, bodyWithPhase);
  }, [sendMessage, selectedPhase]);

  // Handle phase selection for Phase 2
  const handlePhase2Selection = useCallback(() => {
    const text = 'You selected phase 2. Please upload the raw context markdown (.md) file you generated in Phase 1 so I can draft Guru cards from it.';

    const newMessage = {
      id: generateUUID(),
      role: 'assistant' as const,
      parts: [
        {
          type: 'text',
          text,
        },
      ],
      metadata: { createdAt: new Date().toISOString() },
    } as ChatMessage;
    
    setMessages((prev) => [...prev, newMessage]);
    
    // Save the new message to database  
    setTimeout(() => {
      const currentMessages = [...messages, newMessage];
      saveMessagesToDatabase(currentMessages);
    }, 100);
  }, [messages, setMessages, saveMessagesToDatabase]);

  // Handle phase selection for other phases
  const handleOtherPhaseSelection = useCallback((phase: 'phase-1' | 'phase-3') => {
    const text = `You selected ${phase.replace('-', ' ')}. Describe what you want to do to begin.`;

    const newMessage = {
      id: generateUUID(),
      role: 'assistant' as const,
      parts: [
        {
          type: 'text',
          text,
        },
      ],
      metadata: { createdAt: new Date().toISOString() },
    } as ChatMessage;
    
    setMessages((prev) => [...prev, newMessage]);
    
    // Save the new message to database  
    setTimeout(() => {
      const currentMessages = [...messages, newMessage];
      saveMessagesToDatabase(currentMessages);
    }, 100);
  }, [messages, setMessages, saveMessagesToDatabase]);

  return {
    sendMessageWithPhase,
    saveMessagesToDatabase,
    handlePhase2Selection,
    handleOtherPhaseSelection,
  };
}
