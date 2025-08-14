import { PreviewMessage, ThinkingMessage } from './message';
import { Greeting } from '../greeting';
import { memo, useEffect, useState, useRef } from 'react';
import equal from 'fast-deep-equal';
import type { UseChatHelpers } from '@ai-sdk/react';
import { motion } from 'framer-motion';
import { useMessages } from '@/hooks/use-messages';
import type { ChatMessage } from '@/lib/types';
import { useDataStream } from '../data-stream-provider';
import { generateUUID } from '@/lib/utils';
import { Phase1Setup } from '../phases/phase1/phase1-setup';
import { useScrollToBottom } from '@/hooks/use-scroll-to-bottom';

interface MessagesProps {
  chatId: string;
  status: UseChatHelpers<ChatMessage>['status'];
  messages: ChatMessage[];
  setMessages: UseChatHelpers<ChatMessage>['setMessages'];
  regenerate: UseChatHelpers<ChatMessage>['regenerate'];
  isReadonly: boolean;
  isArtifactVisible: boolean;
}

function PureMessages({
  chatId,
  status,
  messages,
  setMessages,
  regenerate,
  isReadonly,
}: MessagesProps) {
  const {
    containerRef: messagesContainerRef,
    endRef: messagesEndRef,
    onViewportEnter,
    onViewportLeave,
    hasSentMessage,
  } = useMessages({
    chatId,
    status,
  });

  useDataStream();

  const [selectedPhase, setSelectedPhase] = useState<'phase-1' | 'phase-2' | 'phase-3' | null>(null);
  const [selectedSources, setSelectedSources] = useState<Array<'github' | 'docs' | 'sheets' | 'guru'>>([]);
  const [showPhase1Setup, setShowPhase1Setup] = useState<boolean>(false);
  const [suppressNextAssistant, setSuppressNextAssistant] = useState<boolean>(false);
  const [injectedAssistantId, setInjectedAssistantId] = useState<string | null>(null);

  // Helper function to save messages to database
  const saveMessagesToDatabase = async (messagesToSave: ChatMessage[]) => {
    try {
      await fetch('/api/workflow', {
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
  };

  // When Phase 1 is active and the user responds with data sources, show sequential setup
  useEffect(() => {
    if (selectedPhase !== 'phase-1') return;
    if (selectedSources.length > 0) return;
    if (!messages || messages.length === 0) return;

    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    const userText =
      lastUser?.parts
        ?.filter((p) => p.type === 'text')
        .map((p: any) => p.text)
        .join(' ')
        .toLowerCase() || '';
    if (!userText) return;

    const sources: Array<'github' | 'docs' | 'sheets' | 'guru'> = [];
    if (userText.includes('github')) sources.push('github');
    if (userText.includes('google docs') || userText.includes('docs')) sources.push('docs');
    if (userText.includes('google sheets') || userText.includes('sheets')) sources.push('sheets');
    if (userText.includes('guru')) sources.push('guru');

    if (sources.length > 0) {
      setSelectedSources(sources);
      setShowPhase1Setup(true);
      const newId = generateUUID();
      setInjectedAssistantId(newId);
      setSuppressNextAssistant(true);
      const label = sources
        .map((s) => (s === 'github' ? 'GitHub' : s === 'guru' ? 'Guru' : 'Google'))
        .filter((v, i, a) => a.indexOf(v) === i)
        .join(', ');
      const guideText = `Great! I'll help you set up Phase 1 to gather raw context from **${label}**. Please configure each source below:`;

      setMessages((prev) => [
        ...prev,
        {
          id: newId,
          role: 'assistant',
          parts: [{ type: 'text', text: guideText }],
          metadata: { createdAt: new Date().toISOString() },
        } as ChatMessage,
      ]);
    }
  }, [selectedPhase, selectedSources, messages, setMessages]);

  const onBeforeGenerate = () => setSuppressNextAssistant(false);

  return (
    <div className="flex-1 overflow-y-auto" ref={messagesContainerRef}>
      {messages.length === 0 && (
        <Greeting
          onSelectPhase={(p) => {
            setSelectedPhase(p);
            if (p === 'phase-1') {
              const newMessage = {
                id: generateUUID(),
                role: 'assistant' as const,
                parts: [
                  {
                    type: 'text' as const,
                    text: 'Welcome to **Phase 1**! I\'ll help you gather raw context from your data sources.\n\nWhich sources would you like to include?\n- **GitHub** (repositories, commits, files)\n- **Google Docs** (documentation)\n- **Google Sheets** (data, configs)\n- **Guru** (existing cards)\n\nJust mention the sources you want, like: "I want to use GitHub and Google Docs"',
                  },
                ],
                metadata: { createdAt: new Date().toISOString() },
              };
              setMessages([newMessage]);
            } else if (p === 'phase-2') {
              const newMessage = {
                id: generateUUID(),
                role: 'assistant' as const,
                parts: [
                  {
                    type: 'text' as const,
                    text: 'Welcome to **Phase 2**! I\'ll help you generate Guru cards from your raw context.\n\nPlease upload your raw context markdown file (the output from Phase 1) to get started.',
                  },
                ],
                metadata: { createdAt: new Date().toISOString() },
              };
              setMessages([newMessage]);
            } else if (p === 'phase-3') {
              const newMessage = {
                id: generateUUID(),
                role: 'assistant' as const,
                parts: [
                  {
                    type: 'text' as const,
                    text: 'Welcome to **Phase 3**! I\'ll help you refine and finalize your Guru cards.\n\n(Phase 3 functionality coming soon)',
                  },
                ],
                metadata: { createdAt: new Date().toISOString() },
              };
              setMessages([newMessage]);
            }
          }}
        />
      )}

      {(() => {
        // If we are showing the Phase 1 setup, insert it right after the injected guidance message
        if (selectedPhase === 'phase-1' && showPhase1Setup && injectedAssistantId) {
          const idx = messages.findIndex((m) => m.id === injectedAssistantId);
          if (idx >= 0) {
            const before = messages.slice(0, idx + 1);
            const after = messages.slice(idx + 1);
            return (
              <>
                {before.map((message, index) => (
                  <PreviewMessage
                    key={message.id}
                    chatId={chatId}
                    message={message}
                    isLoading={status === 'submitted'}
                    setMessages={setMessages}
                    regenerate={regenerate}
                    isReadonly={isReadonly}
                    requiresScrollPadding={hasSentMessage && index === messages.length - 1}
                  />
                ))}
                <div className="w-full mx-auto max-w-3xl px-4 -mt-6">
                  <Phase1Setup
                    selectedSources={selectedSources}
                    appendAssistantMessage={(text) =>
                      setMessages((prev) => [
                        ...prev,
                        {
                          id: generateUUID(),
                          role: 'assistant',
                          parts: [{ type: 'text', text }],
                          metadata: { createdAt: new Date().toISOString() },
                        } as ChatMessage,
                      ])
                    }
                    onBeforeGenerate={() => setSuppressNextAssistant(false)}
                  />
                </div>
                {after.map((message, index) => (
                  <PreviewMessage
                    key={message.id}
                    chatId={chatId}
                    message={message}
                    isLoading={status === 'submitted'}
                    setMessages={setMessages}
                    regenerate={regenerate}
                    isReadonly={isReadonly}
                    requiresScrollPadding={hasSentMessage && index === messages.length - 1}
                  />
                ))}
              </>
            );
          }
        }

        // Default: render all messages normally
        return messages.map((message, index) => (
          <PreviewMessage
            key={message.id}
            chatId={chatId}
            message={message}
            isLoading={status === 'submitted'}
            setMessages={setMessages}
            regenerate={regenerate}
            isReadonly={isReadonly}
            requiresScrollPadding={hasSentMessage && index === messages.length - 1}
          />
        ));
      })()}

      {/* When setup is shown but guidance message not found (edge case), render setup at the end under guidance */}
      {selectedPhase === 'phase-1' && showPhase1Setup && !injectedAssistantId && (
        <div className="w-full mx-auto max-w-3xl px-4 -mt-6">
          <Phase1Setup
            selectedSources={selectedSources}
            appendAssistantMessage={(text) =>
              setMessages((prev) => [
                ...prev,
                {
                  id: generateUUID(),
                  role: 'assistant',
                  parts: [{ type: 'text', text }],
                  metadata: { createdAt: new Date().toISOString() },
                } as ChatMessage,
              ])
            }
            onBeforeGenerate={() => setSuppressNextAssistant(false)}
          />
        </div>
      )}

      {status === 'submitted' && messages.length > 0 && messages[messages.length - 1].role === 'user' && <ThinkingMessage />}

      <div
        ref={messagesEndRef}
        className="shrink-0 min-w-[24px] min-h-[24px]"
      />
    </div>
  );
}

export const Messages = memo(PureMessages, (prevProps, nextProps) => {
  if (prevProps.isArtifactVisible && nextProps.isArtifactVisible) return true;

  if (prevProps.status !== nextProps.status) return false;
  if (prevProps.isReadonly !== nextProps.isReadonly) return false;
  if (prevProps.chatId !== nextProps.chatId) return false;

  if (prevProps.messages.length !== nextProps.messages.length) return false;

  return equal(prevProps.messages, nextProps.messages);
});
