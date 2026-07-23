import { QueryClient } from '@tanstack/react-query';

export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
			// Выполнять запросы всегда — офлайн-логика в base44Client решает сама
			networkMode: 'always',
		},
		mutations: {
			networkMode: 'always',
		},
	},
});
