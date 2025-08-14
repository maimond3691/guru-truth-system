'use client';
import cx from 'classnames';
import { AnimatePresence, motion } from 'framer-motion';
import { memo, useState } from 'react';
import { DocumentToolCall, DocumentToolResult } from '../document';
import { PencilEditIcon, SparklesIcon } from '../icons';
import { Markdown } from '../markdown';
import { MessageActions } from '../message-actions';
import { PreviewAttachment } from '../preview-attachment';
import equal from 'fast-deep-equal';
import { cn, sanitizeText } from '@/lib/utils';
import { Button } from '../ui/button';
import { MessageEditor } from '../message-editor';
import { Phase2ProgressMessage } from '../phases/phase2/phase2-progress-message';
import type { UseChatHelpers } from '@ai-sdk/react';
import type { ChatMessage } from '@/lib/types';
import { useDataStream } from '../data-stream-provider';
import { useArtifact } from '@/hooks/use-artifact';

function ProceedCanvas({ cta }: { cta: string }) {
  const { setArtifact } = useArtifact();
  try {
    const match = cta.match(/\[\[PROCEED_CANVAS\|(.+)\]\]/);
    const payload = match ? JSON.parse(match[1]) : null;
    if (!payload || !payload.id) return null;

    return (
      <div className="pt-2">
        <Button
          onClick={() =>
            setArtifact((curr) => ({
              ...curr,
              isVisible: true,
              documentId: payload.id,
              title: payload.title || 'Guru Canvas',
              kind: 'text',
              status: 'idle',
            }))
          }
        >
          Proceed
        </Button>
      </div>
    );
  } catch {
    return null;
  }
}

const PurePreviewMessage = ({
  chatId,
  message,
  isLoading,
  setMessages,
  regenerate,
  isReadonly,
  requiresScrollPadding,
}: {
  chatId: string;
  message: ChatMessage;
  isLoading: boolean;
  setMessages: UseChatHelpers<ChatMessage>['setMessages'];
  regenerate: UseChatHelpers<ChatMessage>['regenerate'];
  isReadonly: boolean;
  requiresScrollPadding: boolean;
}) => {
  const [mode, setMode] = useState<'view' | 'edit'>('view');

  const attachmentsFromMessage = message.parts.filter(
    (part) => part.type === 'file',
  );

  useDataStream();

  return (
    <AnimatePresence>
      <motion.div
        data-testid={`message-${message.role}`}
        className="w-full mx-auto max-w-3xl px-4 group/message"
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        data-role={message.role}
      >
        <div
          className={cn(
            'flex gap-4 w-full group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl',
            {
              'w-full': mode === 'edit',
              'group-data-[role=user]/message:w-fit': mode !== 'edit',
            },
          )}
        >
          {message.role === 'assistant' && (
            <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border bg-background">
              <div className="translate-y-px">
                <SparklesIcon size={14} />
              </div>
            </div>
          )}

          <div
            className={cn('flex flex-col gap-4 w-full', {
              'min-h-96': message.role === 'assistant' && requiresScrollPadding,
            })}
          >
            {attachmentsFromMessage.length > 0 && (
              <div
                data-testid={`message-attachments`}
                className="flex flex-row justify-end gap-2"
              >
                {attachmentsFromMessage.map((attachment) => (
                  <PreviewAttachment
                    key={attachment.url}
                    attachment={{
                      name: attachment.filename ?? 'file',
                      contentType: attachment.mediaType,
                      url: attachment.url,
                    }}
                  />
                ))}
              </div>
            )}

            {message.parts?.map((part, index) => {
              const { type } = part;

              if (type === 'text') {
                if (mode === 'edit') {
                  return (
                    <MessageEditor
                      key={index}
                      message={message}
                      setMode={setMode}
                      setMessages={setMessages}
                      regenerate={regenerate}
                    />
                  );
                }

                const { text } = part;

                // Enhanced progress handling for Phase 2
                if (
                  text.includes('Large Document Detected') ||
                  text.includes('PROCESSING') ||
                  text.includes('CHUNKING') ||
                  text.includes('WAITING') ||
                  text.includes('PROCESSING COMPLETE')
                ) {
                  return (
                    <Phase2ProgressMessage key={index} text={text} />
                  );
                }

                return (
                  <div
                    key={index}
                    className={cx(
                      'prose dark:prose-invert prose-gray max-w-none',
                      {
                        'prose-sm': true,
                      },
                    )}
                  >
                    <>
                      <Markdown>{sanitizeText(text)}</Markdown>
                      {text.match(/\[\[PROCEED_CANVAS\|(.+?)\]\]/) && (
                        <ProceedCanvas cta={text.match(/\[\[PROCEED_CANVAS\|(.+?)\]\]/)?.[1] || ''} />
                      )}
                    </>
                  </div>
                );
              }

              if ((part as any).type === 'tool-call') {
                const { toolName, args, toolCallId } = part as any;

                if (toolName === 'createDocument') {
                  return (
                    <DocumentToolCall
                      key={toolCallId}
                      type="create"
                      args={args}
                      isReadonly={isReadonly}
                    />
                  );
                }

                if (toolName === 'updateDocument') {
                  return (
                    <DocumentToolCall
                      key={toolCallId}
                      type="update"
                      args={args}
                      isReadonly={isReadonly}
                    />
                  );
                }

                if (toolName === 'requestSuggestions') {
                  return (
                    <DocumentToolCall
                      key={toolCallId}
                      type="request-suggestions"
                      args={args}
                      isReadonly={isReadonly}
                    />
                  );
                }

                return null;
              }

              if ((part as any).type === 'tool-result') {
                const { toolName, result, toolCallId } = part as any;

                if (toolName === 'createDocument') {
                  return (
                    <DocumentToolResult
                      key={toolCallId}
                      type="create"
                      result={result}
                      isReadonly={isReadonly}
                    />
                  );
                }

                if (toolName === 'updateDocument') {
                  return (
                    <DocumentToolResult
                      key={toolCallId}
                      type="update"
                      result={result}
                      isReadonly={isReadonly}
                    />
                  );
                }

                if (toolName === 'requestSuggestions') {
                  return (
                    <DocumentToolResult
                      key={toolCallId}
                      type="request-suggestions"
                      result={result}
                      isReadonly={isReadonly}
                    />
                  );
                }

                return null;
              }

              return null;
            })}

            {/* TODO: Re-enable when reasoning is properly typed
            {message.reasoning && (
              <MessageReasoning
                isLoading={isLoading}
                reasoning={message.reasoning}
              />
            )}
            */}

            <MessageActions
              key={`action-${message.id}`}
              chatId={chatId}
              message={message}
              isLoading={isLoading}
            />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export const PreviewMessage = memo(
  PurePreviewMessage,
  (prevProps, nextProps) => {
    if (prevProps.isLoading !== nextProps.isLoading) return false;
    // Note: removed mode comparison as it's not in props

    return equal(prevProps.message, nextProps.message);
  },
);

export const ThinkingMessage = () => {
  return (
    <div className="w-full mx-auto max-w-3xl px-4 group/message">
      <div className="flex gap-4 w-full">
        <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border">
          <div className="translate-y-px">
            <SparklesIcon size={14} />
          </div>
        </div>

        <div className="flex flex-col gap-2 w-full">
          <div className="flex flex-col gap-1 text-gray-400">
            <div>Thinking...</div>
          </div>
        </div>
      </div>
    </div>
  );
};
