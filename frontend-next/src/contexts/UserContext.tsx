'use client';

import React, { createContext, useContext, useMemo } from 'react';
import useSWR from 'swr';
import { gradingApi } from '../services/api';
import type { GradingHistoryItem } from '../services/api';

interface UserStats {
    total_count: number;
    avg_score_rate: number;
    continuous_days: number;
    history: GradingHistoryItem[];
}

interface UserContextType {
    stats: UserStats;
    loading: boolean;
    refetch: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Use SWR for history and statistics
    const {
        data: history = [],
        error,
        isLoading,
        mutate: refetch
    } = useSWR(
        'user/history',
        () => gradingApi.myHistory(20),
        {
            refreshInterval: 5000, // Poll every 5 seconds
            revalidateOnFocus: true
        }
    );

    // Calculate stats based on history data
    const stats: UserStats = useMemo(() => {
        const completedItems = history.filter(h => h.is_graded && h.total_score !== null);
        const totalCount = history.length;
        const totalScoreRate = completedItems.reduce((acc, curr) => {
            const scoreRate = curr.total_score && curr.max_score
                ? curr.total_score / curr.max_score
                : 0;
            return acc + scoreRate;
        }, 0);

        return {
            total_count: totalCount,
            avg_score_rate: completedItems.length > 0 ? (totalScoreRate / completedItems.length) : 0,
            continuous_days: totalCount > 0 ? 1 : 0,
            history: history
        };
    }, [history]);

    const handleRefetch = async () => {
        await refetch();
    };

    return (
        <UserContext.Provider value={{ stats, loading: isLoading, refetch: handleRefetch }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUserContext = () => {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUserContext must be used within a UserProvider');
    }
    return context;
};
