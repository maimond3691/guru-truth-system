import { PreviewMessage, ThinkingMessage } from './message';
import { Greeting } from '../greeting';
import { memo, useEffect, useState, useCallback } from 'react';
import equal from 'fast-deep-equal';
import type { UseChatHelpers } from '@ai-sdk/react';
import { motion } from 'framer-motion';
import { useMessages } from '@/hooks/use-messages';
import type { ChatMessage } from '@/lib/types';
import { useDataStream } from '../data-stream/data-stream-provider';
import { generateUUID } from '@/lib/utils';
import { Phase1SequentialSetup } from '../phase1/sequential-setup';
import { usePhase2Coordinator } from '../phase2/phase-coordinator';

interface MessagesProps {
  chatId: string;
  status: UseChatHelpers<ChatMessage>['status'];
  messages: ChatMessage[];
  setMessages: UseChatHelpers<ChatMessage>['setMessages'];
  regenerate: UseChatHelpers<ChatMessage>['regenerate'];
  isReadonly: boolean;
  isArtifactVisible: boolean;
  sendMessage: UseChatHelpers<ChatMessage>['sendMessage'];
}

function PureMessages({
  chatId,
  status,
  messages,
  setMessages,
  regenerate,
  isReadonly,
  sendMessage,
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

  // Use Phase 2 coordinator for phase-specific logic
  const {
    sendMessageWithPhase,
    saveMessagesToDatabase,
    handlePhase2Selection,
    handleOtherPhaseSelection,
  } = usePhase2Coordinator({
    chatId,
    messages,
    setMessages,
    sendMessage,
    selectedPhase,
  });

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
        .join(' + ');
      setMessages((prev) => [
        ...prev,
        {
          id: newId,
          role: 'assistant',
          parts: [
            { type: 'text', text: `I will help collect raw context from ${label}. We'll proceed one source at a time. Fill in the setup below to continue.` },
          ],
          metadata: { createdAt: new Date().toISOString() },
        } as ChatMessage,
      ]);
      
      // Save the new assistant message to database
      setTimeout(() => {
        const newMessage = {
          id: newId,
          role: 'assistant' as const,
          parts: [
            { type: 'text', text: `I will help collect raw context from ${label}. We'll proceed one source at a time. Fill in the setup below to continue.` },
          ],
          metadata: { createdAt: new Date().toISOString() },
        } as ChatMessage;
        const currentMessages = [...messages, newMessage];
        saveMessagesToDatabase(currentMessages);
      }, 100);
    }
  }, [messages, selectedPhase, selectedSources, setMessages, saveMessagesToDatabase]);

  // Suppress the next assistant response (typically the model reply) after we inject our own
  useEffect(() => {
    if (!suppressNextAssistant) return;
    const last = [...messages].reverse().find((m) => m.role === 'assistant');
    if (!last) return;
    if (last.id === injectedAssistantId) return; // our injected message; wait for the next one
    setMessages((prev) => prev.filter((m) => m.id !== last.id));
    setSuppressNextAssistant(false);
  }, [messages, suppressNextAssistant, injectedAssistantId, setMessages]);

  return (
    <div
      ref={messagesContainerRef}
      className="flex flex-col min-w-0 gap-6 flex-1 overflow-y-scroll pt-4 relative"
    >
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
                    type: 'text',
                    text:
                      'For Phase 1, which data sources should I read from? You can choose multiple.\n\n- GitHub\n- Google Docs\n- Google Sheets\n- Guru',
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
            } else if (p === 'phase-2') {
              handlePhase2Selection();
            } else {
              handleOtherPhaseSelection(p);
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
                    isLoading={status === 'streaming' && messages.length - 1 === index}
                    setMessages={setMessages}
                    regenerate={regenerate}
                    isReadonly={isReadonly}
                    requiresScrollPadding={hasSentMessage && index === messages.length - 1}
                  />
                ))}
                <div className="w-full mx-auto max-w-3xl px-4 -mt-6">
                  <Phase1SequentialSetup
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
                    isLoading={status === 'streaming' && messages.length - 1 === index}
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
        // Default: render all messages normally when setup is not inserted inline
        return messages.map((message, index) => (
          <PreviewMessage
            key={message.id}
            chatId={chatId}
            message={message}
            isLoading={status === 'streaming' && messages.length - 1 === index}
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
          <Phase1SequentialSetup
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

      <motion.div
        ref={messagesEndRef}
        className="shrink-0 min-w-[24px] min-h-[24px]"
        onViewportLeave={onViewportLeave}
        onViewportEnter={onViewportEnter}
      />
    </div>
  );
}

export const Messages = memo(PureMessages, (prevProps, nextProps) => {
  if (prevProps.isArtifactVisible && nextProps.isArtifactVisible) return true;

  if (prevProps.status !== nextProps.status) return false;
  if (prevProps.status && nextProps.status) return false;
  if (prevProps.messages.length !== nextProps.messages.length) return false;
  if (!equal(prevProps.messages, nextProps.messages)) return false;
  return true;
});
