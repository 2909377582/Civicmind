'use client';

import React, { useState, useMemo } from 'react'
import { useMaterials, useMaterialStats } from '@/services/hooks'
import type { Material } from '@/services/api'
import './MaterialsDesktop.css'

const categories = ['全部', '乡村振兴', '基层治理', '科技创新', '生态文明', '民生保障', '文化建设']

interface MaterialsDesktopProps {
    initialData?: Material[];
}

const MaterialsDesktop: React.FC<MaterialsDesktopProps> = ({ initialData = [] }) => {
    const [activeCategory, setActiveCategory] = useState('全部')
    const [searchQuery, setSearchQuery] = useState('')
    const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)

    const params = useMemo(() => ({
        category: activeCategory === '全部' ? undefined : activeCategory,
        query: searchQuery || undefined,
        is_favorite: showFavoritesOnly || undefined
    }), [activeCategory, searchQuery, showFavoritesOnly])

    // Pass initialData as fallback for SWR
    const { materials, loading, error, toggleFavorite } = useMaterials(params, initialData)
    const { stats } = useMaterialStats()

    const handleToggleFavorite = async (id: string, isFavorite: boolean) => {
        try {
            await toggleFavorite(id, isFavorite)
        } catch (err) {
            console.error('Toggle favorite failed:', err)
        }
    }

    const copyToClipboard = (content: string) => {
        navigator.clipboard.writeText(content)
        // Ideally use a toast here
    }

    return (
        <div className="materials-page">
            <div className="page-header">
                <div className="page-title-section">
                    <h1 className="page-title">素材积累</h1>
                    <p className="page-subtitle">精选金句与官方表达，助力申论写作</p>
                </div>
                <div className="header-actions">
                    <button
                        className={`filter-toggle ${showFavoritesOnly ? 'active' : ''}`}
                        onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                    >
                        {showFavoritesOnly ? '⭐ 仅显示收藏' : '☆ 显示全部'}
                    </button>
                </div>
            </div>

            <div className="materials-layout">
                <aside className="categories-sidebar">
                    <h3 className="sidebar-title">分类筛选</h3>
                    <div className="category-list">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                className={`category-btn ${activeCategory === cat ? 'active' : ''}`}
                                onClick={() => setActiveCategory(cat)}
                            >
                                {cat}
                                <span className="category-count">
                                    {stats[cat] || 0}
                                </span>
                            </button>
                        ))}
                    </div>

                    <div className="daily-quote">
                        <h3 className="quote-title">📅 每日金句</h3>
                        <blockquote className="quote-content">
                            "功成不必在我，功成必定有我。"
                        </blockquote>
                        <span className="quote-source">—— 习近平总书记</span>
                    </div>
                </aside>

                <main className="materials-main">
                    <div className="search-section">
                        <div className="search-box">
                            <span className="search-icon">🔍</span>
                            <input
                                type="text"
                                className="search-input"
                                placeholder="搜索金句内容或标题..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {loading && materials.length === 0 ? (
                        <div className="loading-state">
                            <div className="loader"></div>
                            <span>加载素材中...</span>
                        </div>
                    ) : error ? (
                        <div className="error-state">
                            <span className="error-icon">⚠️</span>
                            <span>{error}</span>
                        </div>
                    ) : (
                        <div className="materials-grid">
                            {materials.map((material, index) => (
                                <div
                                    key={material.id}
                                    className="material-card animate-fade-in"
                                    style={{ animationDelay: `${index * 0.05}s` }}
                                >
                                    <div className="material-header">
                                        <span className="material-category">{material.category}</span>
                                        <button
                                            className={`favorite-btn ${material.is_favorite ? 'active' : ''}`}
                                            onClick={() => handleToggleFavorite(material.id, material.is_favorite)}
                                            title={material.is_favorite ? '取消收藏' : '收藏'}
                                        >
                                            {material.is_favorite ? '⭐' : '☆'}
                                        </button>
                                    </div>

                                    <h3 className="material-title">{material.title}</h3>
                                    <p className="material-content">{material.content}</p>

                                    <div className="material-footer">
                                        <span className="material-source">{material.source}</span>
                                        <div className="material-actions">
                                            <button
                                                className="action-btn"
                                                onClick={() => copyToClipboard(material.content)}
                                                title="复制内容"
                                            >
                                                📋 复制
                                            </button>
                                        </div>
                                    </div>

                                    {material.tags && material.tags.length > 0 && (
                                        <div className="material-tags">
                                            {material.tags.map((tag, i) => (
                                                <span key={i} className="tag">{tag}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {!loading && materials.length === 0 && (
                        <div className="empty-state">
                            <span className="empty-icon">📭</span>
                            <p className="empty-text">没有找到相关素材</p>
                            <button
                                className="btn btn-secondary"
                                onClick={() => {
                                    setActiveCategory('全部')
                                    setSearchQuery('')
                                    setShowFavoritesOnly(false)
                                }}
                            >
                                清除筛选条件
                            </button>
                        </div>
                    )}
                </main>
            </div>
        </div>
    )
}

export default MaterialsDesktop
