'use client';

import { useMemo } from 'react';
import {
  useQuery,
  type UseQueryOptions,
  type UseQueryResult,
  type DefinedUseQueryResult,
  type UseSuspenseQueryOptions,
  type DefinedInitialDataOptions,
  type UndefinedInitialDataOptions,
  type QueryKey,
} from '@tanstack/react-query';
import type {
  DefaultError,
  QueryClient,
  QueryFunction,
} from '@tanstack/query-core';

export type UseDualQueryOptions<
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
> = UseQueryOptions<TQueryFnData, TError, TData, TQueryKey> & {
  localQueryFn?: UseQueryOptions<
    TQueryFnData,
    TError,
    TData,
    TQueryKey
  >['queryFn'];
  shouldUseLocal?: boolean | (() => boolean);
};

type UseDualDefinedInitialDataOptions<
  TQueryFnData,
  TError,
  TData,
  TQueryKey extends QueryKey,
> = DefinedInitialDataOptions<TQueryFnData, TError, TData, TQueryKey> & {
  localQueryFn?: UseQueryOptions<
    TQueryFnData,
    TError,
    TData,
    TQueryKey
  >['queryFn'];
  shouldUseLocal?: boolean | (() => boolean);
};

type UseDualUndefinedInitialDataOptions<
  TQueryFnData,
  TError,
  TData,
  TQueryKey extends QueryKey,
> = UndefinedInitialDataOptions<TQueryFnData, TError, TData, TQueryKey> & {
  localQueryFn?: UseQueryOptions<
    TQueryFnData,
    TError,
    TData,
    TQueryKey
  >['queryFn'];
  shouldUseLocal?: boolean | (() => boolean);
};

function resolveShouldUseLocal(
  shouldUseLocal: boolean | (() => boolean) | undefined,
): boolean {
  if (typeof shouldUseLocal === 'function') {
    return shouldUseLocal();
  }
  return Boolean(shouldUseLocal);
}

export function useDualQueryOptions<
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  options: UseDualQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
): UseQueryOptions<TQueryFnData, TError, TData, TQueryKey> {
  return useMemo(() => {
    const shouldLocal = resolveShouldUseLocal(options.shouldUseLocal);

    if (shouldLocal) {
      if (!options.localQueryFn) {
        throw new Error('localQueryFn is required when shouldUseLocal is true');
      }

      const { localQueryFn, shouldUseLocal: _unused, ...rest } = options;
      return { ...rest, queryFn: localQueryFn };
    }

    const { localQueryFn: _l, shouldUseLocal: _s, ...rest } = options;
    // Narrow TRPC's possible `skipToken` union on queryFn for suspense compatibility
    if (typeof rest.queryFn !== 'function') {
      throw new Error('queryFn is required for remote queries');
    }
    const remoteQueryFn = rest.queryFn;
    return { ...rest, queryFn: remoteQueryFn };
  }, [options]);
}

export function useDualQuery<
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  options: UseDualDefinedInitialDataOptions<
    TQueryFnData,
    TError,
    TData,
    TQueryKey
  >,
  queryClient?: QueryClient,
): DefinedUseQueryResult<TData, TError>;
export function useDualQuery<
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  options: UseDualUndefinedInitialDataOptions<
    TQueryFnData,
    TError,
    TData,
    TQueryKey
  >,
  queryClient?: QueryClient,
): UseQueryResult<TData, TError>;
export function useDualQuery<
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  options: UseDualQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
  queryClient?: QueryClient,
): UseQueryResult<TData, TError>;
export function useDualQuery<
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  options: UseDualQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
  queryClient?: QueryClient,
): UseQueryResult<TData, TError> {
  const merged = useDualQueryOptions<TQueryFnData, TError, TData, TQueryKey>(
    options,
  );
  return useQuery<TQueryFnData, TError, TData, TQueryKey>(merged, queryClient);
}

export function useDualSuspenseQueryOptions<
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  options: UseDualQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
): UseSuspenseQueryOptions<TQueryFnData, TError, TData, TQueryKey> {
  const merged = useDualQueryOptions<TQueryFnData, TError, TData, TQueryKey>(
    options,
  );
  const {
    enabled: _e,
    throwOnError: _t,
    placeholderData: _p,
    ...rest
  } = merged;
  const qf = rest.queryFn;
  if (typeof qf !== 'function') {
    throw new Error('queryFn is required for suspense queries');
  }
  const safeQueryFn = qf as QueryFunction<TQueryFnData, TQueryKey>;
  return { ...rest, queryFn: safeQueryFn };
}
