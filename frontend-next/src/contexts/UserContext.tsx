'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
    const [stats, setStats] = useState<UserStats>({
        total_count: 0,
        avg_score_rate: 0,
        continuous_days: 0,
        history: []
    });
    const [loading, setLoading] = useState(true);

    const fetchStats = useCallback(async () => {
        try {
            // setLoading(true); // Don't set loading to true on refetch to avoid flickering
            const history = await gradingApi.myHistory(20);

            const completedItems = history.filter(h => h.is_graded && h.total_score !== null);
            const totalCount = history.length;
            const totalScoreRate = completedItems.reduce((acc, curr) => {
                const scoreRate = curr.total_score && curr.max_score
                    ? curr.total_score / curr.max_score
                    : 0;
                return acc + scoreRate;
            }, 0);

            setStats({
                total_count: totalCount,
                avg_score_rate: completedItems.length > 0 ? (totalScoreRate / completedItems.length) : 0,
                continuous_days: totalCount > 0 ? 1 : 0,
                history: history
            });
        } catch (err) {
            console.error('获取批改历史失败:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();

        // Polling every 5 seconds to keep status in sync
        const interval = setInterval(fetchStats, 5000);
        return () => clearInterval(interval);
    }, [fetchStats]);

    return (
        <UserContext.Provider value={{ stats, loading, refetch: fetchStats }}>
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
