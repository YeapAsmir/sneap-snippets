export interface Snippet {
    id?: number;
    name: string;
    prefix: string;
    body: string[];
    description: string;
    scope?: string[];
    usageCount?: number;
}

export interface SearchResponse {
    data: Snippet[];
    meta?: {
        searchTime?: string;
        count?: number;
        method?: string;
        engine?: string;
    };
    personalized?: boolean;
}

export interface UsageMetric {
    snippetId: number;
    userId: string;
    language: string;
    fileExtension?: string;
    searchTime?: number;
    wasAccepted: boolean;
}

export interface UserStats {
    totalUsage: number;
    favoriteLanguages: Array<{
        language: string;
        count: number;
    }>;
    performance: {
        avgSearchTime?: number;
    };
}