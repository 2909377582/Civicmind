"use client";

import React, { useState, useMemo } from 'react';
import { Search, Heart } from 'lucide-react';
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

    const handleToggleFavorite = async (e: React.MouseEvent, id: string, isFavorite: boolean) => {
        e.preventDefault();
        e.stopPropagation();
        await toggleFavorite(id, isFavorite);
    };

    return (
        <div className="materials-mobile">
            {!isSearchMode ? (
                <div className="mobile-header-inner">
                    <h1 className="mobile-page-title">素材积累</h1>
                    <button className="mobile-search-trigger" onClick={() => setIsSearchMode(true)}>
                        <Search size={22} />
                    </button>
                </div>
            ) : (
                <div className="mobile-search-container">
                    <div className="mobile-search-wrapper">
                        <Search size={18} className="mobile-search-icon" />
                        <input
                            autoFocus
                            className="mobile-search-input"
                            type="text"
                            placeholder="搜索金句、素材..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <button className="mobile-cancel-search" onClick={() => {
                            setIsSearchMode(false);
                            setSearchQuery('');
                        }}>取消</button>
                    </div>
                </div>
            )}

            <div className="mobile-categories-scroll">
                {categories.map(cat => (
                    <button
                        key={cat}
                        className={`mobile-category-pill ${activeCategory === cat ? 'active' : ''}`}
                        onClick={() => setActiveCategory(cat)}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            <div className="mobile-materials-list">
                {materials.length === 0 && !loading ? (
                    <div className="mobile-empty">
                        <p>没有找到相关素材</p>
                    </div>
                ) : (
                    materials.map(item => (
                        <div key={item.id} className="mobile-material-card">
                            <div className="mobile-material-header">
                                <span className="mobile-material-cat">{item.category}</span>
                                <button
                                    className={`mobile-fav-btn ${item.is_favorite ? 'active' : ''}`}
                                    onClick={(e) => handleToggleFavorite(e, item.id, item.is_favorite)}
                                >
                                    <Heart size={18} fill={item.is_favorite ? "currentColor" : "none"} />
                                </button>
                            </div>
                            <div className="mobile-material-content">
                                {item.content}
                            </div>
                            <div className="mobile-material-footer">
                                <span className="mobile-material-source">{item.source || '官方精选'}</span>
                                <button
                                    className="mobile-copy-btn"
                                    onClick={() => {
                                        navigator.clipboard.writeText(item.content);
                                        // Simple feedback could be added here
                                    }}
                                >
                                    复制
                                </button>
                            </div>
                        </div>
                    ))
                )}
                {loading && materials.length === 0 && (
                    <div className="mobile-loading">加载中...</div>
                )}
            </div>
        </div>
    );
}
