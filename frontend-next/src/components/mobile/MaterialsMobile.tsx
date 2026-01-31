'use client';

import React, { useState, useMemo } from 'react';
import { useMaterials } from '../../services/hooks';
import './MaterialsMobile.css';

const categories = ['全部', '乡村振兴', '基层治理', '科技创新', '生态文明', '民生保障', '文化建设'];

export default function MaterialsMobile() {
    const [activeCategory, setActiveCategory] = useState('全部');
    const [searchQuery, setSearchQuery] = useState('');

    const params = useMemo(() => ({
        category: activeCategory === '全部' ? undefined : activeCategory,
        query: searchQuery || undefined,
    }), [activeCategory, searchQuery]);

    const { materials, loading, error, toggleFavorite } = useMaterials(params);

    const handleToggleFavorite = async (e: React.MouseEvent, id: string, isFavorite: boolean) => {
        e.stopPropagation();
        try {
            await toggleFavorite(id, isFavorite);
        } catch (err) {
            console.error('Toggle favorite failed:', err);
        }
    };

    const copyToClipboard = (e: React.MouseEvent, content: string) => {
        e.stopPropagation();
        navigator.clipboard.writeText(content);
        // Could show a toast here
        // alert('已复制到剪贴板'); 
        // In mobile, browsers might block alert usage or it is annoying. 
        // We will skip alert for now or implement a proper toast later.
    };

    return (
        <div className="materials-mobile">
            <h2 className="mobile-page-title">素材积累</h2>

            {/* Search Bar */}
            <div className="mobile-search-container">
                <input
                    type="text"
                    className="mobile-search-input"
                    placeholder="搜索金句..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                <span className="mobile-search-icon">🔍</span>
            </div>

            {/* Horizontal Categories */}
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

            {/* Daily Quote Banner */}
            {activeCategory === '全部' && !searchQuery && (
                <div className="mobile-daily-quote">
                    <p className="quote-text">"功成不必在我，功成必定有我。"</p>
                    <span className="quote-author">—— 习近平总书记</span>
                </div>
            )}

            {/* List */}
            <div className="mobile-materials-list">
                {loading ? (
                    <div className="mobile-loading">加载中...</div>
                ) : error ? (
                    <div className="mobile-error">{error}</div>
                ) : materials.length === 0 ? (
                    <div className="mobile-empty">暂无相关素材</div>
                ) : (
                    materials.map(material => (
                        <div key={material.id} className="mobile-material-card">
                            <div className="mobile-material-header">
                                <span className="mobile-material-cat">{material.category}</span>
                                <button
                                    className={`mobile-fav-btn ${material.is_favorite ? 'active' : ''}`}
                                    onClick={(e) => handleToggleFavorite(e, material.id, material.is_favorite)}
                                >
                                    {material.is_favorite ? '⭐' : '☆'}
                                </button>
                            </div>
                            <h3 className="mobile-material-title">{material.title}</h3>
                            <p className="mobile-material-content">{material.content}</p>
                            <div className="mobile-material-footer">
                                <span className="mobile-material-source">{material.source || '未知来源'}</span>
                                <button
                                    className="mobile-copy-btn"
                                    onClick={(e) => copyToClipboard(e, material.content)}
                                >
                                    复制
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
