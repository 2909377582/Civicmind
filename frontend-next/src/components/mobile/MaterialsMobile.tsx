"use client";

import React, { useState, useMemo } from 'react';
import { Search, ChevronRight, Heart } from 'lucide-react';
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

    // Pass initialData as fallback for SWR
    const { materials, loading, toggleFavorite } = useMaterials(params, initialData);

    const handleToggleFavorite = async (e: React.MouseEvent, id: string, isFavorite: boolean) => {
        e.preventDefault();
        e.stopPropagation();
        await toggleFavorite(id, isFavorite);
    };

    return (
        <div className="materials-mobile">
            {!isSearchMode ? (
                <div className="materials-header">
                    <h1 className="materials-title">素材积累</h1>
                    <button className="search-trigger" onClick={() => setIsSearchMode(true)}>
                        <Search size={22} />
                    </button>
                </div>
            ) : (
                <div className="search-bar-active">
                    <div className="search-input-wrapper">
                        <Search size={18} className="inner-search-icon" />
                        <input
                            autoFocus
                            type="text"
                            placeholder="搜索金句、素材..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <button className="cancel-search" onClick={() => {
                            setIsSearchMode(false);
                            setSearchQuery('');
                        }}>取消</button>
                    </div>
                </div>
            )}

            <div className="categories-scroll">
                {categories.map(cat => (
                    <button
                        key={cat}
                        className={`category-chip ${activeCategory === cat ? 'active' : ''}`}
                        onClick={() => setActiveCategory(cat)}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            <div className="materials-list">
                {materials.length === 0 && !loading ? (
                    <div className="empty-state">
                        <p>没有找到相关素材</p>
                    </div>
                ) : (
                    materials.map(item => (
                        <div key={item.id} className="material-card">
                            <div className="material-content">
                                <p className="material-text">{item.content}</p>
                                <div className="material-meta">
                                    <span className="material-tag">{item.category}</span>
                                    <button
                                        className={`favorite-btn ${item.is_favorite ? 'active' : ''}`}
                                        onClick={(e) => handleToggleFavorite(e, item.id, item.is_favorite)}
                                    >
                                        <Heart size={18} fill={item.is_favorite ? "currentColor" : "none"} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
