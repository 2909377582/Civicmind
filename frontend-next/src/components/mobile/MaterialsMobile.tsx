"use client";

import React, { useState, useMemo } from 'react';
import { Search, Heart, Quote, Copy, Sparkles } from 'lucide-react';
import { useMaterials } from '@/services/hooks';
import type { Material } from '@/services/api';
import './MaterialsMobile.css';

interface MaterialsMobileProps {
    initialData?: Material[];
}

export default function MaterialsMobile({ initialData = [] }: MaterialsMobileProps) {
    const [activeCategory, setActiveCategory] = useState('全部');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchMode, setIsSearchMode] = useState(false);

    const categories = ['全部', '乡村振兴', '基层治理', '科技创新', '生态文明', '民生保障', '文化建设'];

    const params = useMemo(() => ({
        category: activeCategory === '全部' ? undefined : activeCategory,
        query: searchQuery || undefined,
    }), [activeCategory, searchQuery]);

    const { materials, loading, toggleFavorite } = useMaterials(params, initialData);

    const dailyQuote = useMemo(() => {
        if (initialData && initialData.length > 0) return initialData[0];
        if (materials && materials.length > 0) return materials[0];
        return null;
    }, [initialData, materials]);

    const handleToggleFavorite = async (e: React.MouseEvent, id: string, isFavorite: boolean) => {
        e.preventDefault();
        e.stopPropagation();
        await toggleFavorite(id, isFavorite);
    };

    const handleCopy = (content: string) => {
        navigator.clipboard.writeText(content);
        // Simple success feedback can be added here if needed
    };

    return (
        <div className="materials-mobile-container">
            {!isSearchMode ? (
                <div className="materials-header-premium">
                    <div className="header-text-group">
                        <h1 className="main-title">素材积累</h1>
                        <p className="sub-title">每日精选金句，赋能申论写作</p>
                    </div>
                    <button className="premium-search-trigger" onClick={() => setIsSearchMode(true)}>
                        <Search size={22} strokeWidth={2.5} />
                    </button>
                </div>
            ) : (
                <div className="premium-search-overlay">
                    <div className="search-bar-glass">
                        <Search size={18} className="search-icon-dim" />
                        <input
                            autoFocus
                            className="premium-search-input"
                            type="text"
                            placeholder="搜索申论亮点素材..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <button className="exit-search-btn" onClick={() => {
                            setIsSearchMode(false);
                            setSearchQuery('');
                        }}>取消</button>
                    </div>
                </div>
            )}

            {/* Daily Highlight Card - The "Wow" Factor */}
            {!isSearchMode && dailyQuote && activeCategory === '全部' && (
                <div className="daily-highlight-wrapper">
                    <div className="daily-card-glass">
                        <div className="daily-tag">
                            <Sparkles size={14} className="sparkle-icon" />
                            <span>今日金句</span>
                        </div>
                        <Quote className="quote-icon-bg" size={80} />
                        <p className="daily-content">{dailyQuote.content}</p>
                        <div className="daily-footer">
                            <span className="daily-source">— {dailyQuote.source || '官方精选'}</span>
                            <button className="daily-copy-btn" onClick={() => handleCopy(dailyQuote.content)}>
                                <Copy size={16} />
                                <span>一键复制</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="premium-categories-wrapper">
                <div className="categories-glass-scroll">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            className={`premium-category-pill ${activeCategory === cat ? 'active' : ''}`}
                            onClick={() => setActiveCategory(cat)}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            <div className="premium-materials-list">
                {materials.length === 0 && !loading ? (
                    <div className="premium-empty-state">
                        <div className="empty-icon-wrapper">📖</div>
                        <p>探索中... 暂无相关素材</p>
                    </div>
                ) : (
                    materials.map((item, index) => (
                        <div
                            key={item.id}
                            className="premium-material-card"
                            style={{ animationDelay: `${index * 0.05}s` }}
                        >
                            <div className="card-top-info">
                                <span className="category-label">{item.category}</span>
                                <button
                                    className={`fav-icon-btn ${item.is_favorite ? 'is-active' : ''}`}
                                    onClick={(e) => handleToggleFavorite(e, item.id, item.is_favorite)}
                                >
                                    <Heart size={20} fill={item.is_favorite ? "currentColor" : "none"} strokeWidth={2} />
                                </button>
                            </div>

                            <div className="card-main-content">
                                <p className="editorial-text">{item.content}</p>
                            </div>

                            <div className="card-bottom-editorial">
                                <div className="source-info">
                                    <div className="source-dot"></div>
                                    <span className="source-text">{item.source || '新华社、人民日报等'}</span>
                                </div>
                                <button
                                    className="ghost-copy-btn"
                                    onClick={() => handleCopy(item.content)}
                                >
                                    <Copy size={14} />
                                    <span>复制</span>
                                </button>
                            </div>
                        </div>
                    ))
                )}
                {loading && (
                    <div className="premium-loading-shimmer">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="shimmer-card"></div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
