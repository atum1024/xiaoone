import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      refetchIntervalInBackground: false,
      retry: (count, err: any) => {
        const status = err?.response?.status
        if (status === 401 || status === 403)
          return false
        return count < 2
      },
      retryDelay: count => Math.min(12_000 * (2 ** count), 60_000),
    },
  },
})
