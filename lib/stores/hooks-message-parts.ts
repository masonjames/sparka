import type { ChatMessage } from '../ai/types';
import equal from 'fast-deep-equal';
import { shallow } from 'zustand/shallow';
import type { PartsAugmentedState } from './with-message-parts';
import { useStoreWithEqualityFn } from 'zustand/traditional';
import { useChatStoreContext } from './chat-store-context';

export function usePartsStore<T>(
  selector: (store: PartsAugmentedState<ChatMessage>) => T,
  equalityFn?: (a: T, b: T) => boolean,
): T {
  const store = useChatStoreContext();
  if (!store)
    throw new Error('usePartsStore must be used within ChatStoreProvider');
  return useStoreWithEqualityFn(store, selector, equalityFn);
}

export const useMessagePartTypesById = (
  messageId: string,
): Array<ChatMessage['parts'][number]['type']> =>
  usePartsStore((state) => state.getMessagePartTypesById(messageId), shallow);

export function useMessagePartByPartIdx(
  messageId: string,
  partIdx: number,
): ChatMessage['parts'][number];
export function useMessagePartByPartIdx<
  T extends ChatMessage['parts'][number]['type'],
>(
  messageId: string,
  partIdx: number,
  type: T,
): Extract<ChatMessage['parts'][number], { type: T }>;
export function useMessagePartByPartIdx<
  T extends ChatMessage['parts'][number]['type'],
>(messageId: string, partIdx: number, type?: T) {
  const part = usePartsStore((state) =>
    state.getMessagePartByIdxCached(messageId, partIdx),
  );
  if (type !== undefined) {
    if (part.type !== type) {
      throw new Error(
        `Part type mismatch for id: ${messageId} at partIdx: ${partIdx}. Expected ${String(type)}, got ${String(
          part.type,
        )}`,
      );
    }
  }
  return part as unknown as T extends ChatMessage['parts'][number]['type']
    ? Extract<ChatMessage['parts'][number], { type: T }>
    : ChatMessage['parts'][number];
}

export function useMessagePartsByPartRange(
  messageId: string,
  startIdx: number,
  endIdx: number,
): ChatMessage['parts'];
export function useMessagePartsByPartRange<
  T extends ChatMessage['parts'][number]['type'],
>(
  messageId: string,
  startIdx: number,
  endIdx: number,
  type: T,
): Array<Extract<ChatMessage['parts'][number], { type: T }>>;
export function useMessagePartsByPartRange<
  T extends ChatMessage['parts'][number]['type'],
>(messageId: string, startIdx: number, endIdx: number, type?: T) {
  return usePartsStore(
    (state) =>
      state.getMessagePartsRangeCached(
        messageId,
        startIdx,
        endIdx,
        type as unknown as string | undefined,
      ) as unknown as ChatMessage['parts'],
    equal,
  ) as unknown as T extends ChatMessage['parts'][number]['type']
    ? Array<Extract<ChatMessage['parts'][number], { type: T }>>
    : ChatMessage['parts'];
}
