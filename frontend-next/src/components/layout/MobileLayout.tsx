"use client";
import React, { useMemo, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import MobileNavbar from '../mobile/MobileNavbar';
import ExamListMobile from '../mobile/ExamListMobile';
import MaterialsMobile from '../mobile/MaterialsMobile';
import HistoryMobile from '../mobile/HistoryMobile';
import './MobileLayout.css';

interface MobileLayoutProps {
    children: React.ReactNode;
}

export default function MobileLayout({ children }: MobileLayoutProps) {
    const pathname = usePathname();
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    // Determine if we are on a main tab route
    const isTabRoute = useMemo(() => {
        return ['/', '/materials', '/history'].includes(pathname) || pathname.startsWith('/exams');
    }, [pathname]);

    // Active tab ID
    const activeTab = useMemo(() => {
        if (pathname === '/' || pathname.startsWith('/exams')) return 'exams';
        if (pathname === '/materials') return 'materials';
        if (pathname === '/history') return 'history';
        return null;
    }, [pathname]);

    // SSR fallback
    if (!isClient) {
        return (
            <div className="mobile-layout">
                <header className="mobile-header">
                    <span className="mobile-brand">CivicMind</span>
                </header>
                <main className="mobile-content">{children}</main>
                <MobileNavbar />
            </div>
        );
    }

    return (
        <div className="mobile-layout">
            <header className="mobile-header">
                <span className="mobile-brand">CivicMind</span>
            </header>

            <main className="mobile-content">
                {/* 
                  微信级流畅度的核心：
                  1. 这里的三个 Tab 组件永远不会被销毁(Unmount)
                  2. 它们不再依赖 children 属性，避免了页面切换时的组件替换开销
                  3. 每个 Tab 拥有独立的滚动容器，保留滚动位置
                */}
                <div className={`tab-view ${activeTab === 'exams' ? 'active' : ''}`}
                    style={{ visibility: activeTab === 'exams' ? 'visible' : 'hidden' }}>
                    <ExamListMobile initialData={[]} />
                </div>

                <div className={`tab-view ${activeTab === 'materials' ? 'active' : ''}`}
                    style={{ visibility: activeTab === 'materials' ? 'visible' : 'hidden' }}>
                    <MaterialsMobile />
                </div>

                <div className={`tab-view ${activeTab === 'history' ? 'active' : ''}`}
                    style={{ visibility: activeTab === 'history' ? 'visible' : 'hidden' }}>
                    <HistoryMobile />
                </div>

                {/* 非主 Tab 路由（如：题目详情、报告、登录等） */}
                {!isTabRoute && (
                    <div className="detail-view active">
                        {children}
                    </div>
                )}
            </main>

            <MobileNavbar />
        </div>
    );
}
