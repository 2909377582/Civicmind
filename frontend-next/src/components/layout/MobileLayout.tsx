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
                {/* Persistent Tab Views - Client Side Only */}
                <div className={`tab-view ${activeTab === 'exams' ? 'active' : ''}`}
                    style={{ display: activeTab === 'exams' ? 'block' : 'none' }}>
                    {activeTab === 'exams' ? children : <ExamListMobile initialData={[]} />}
                </div>

                <div className={`tab-view ${activeTab === 'materials' ? 'active' : ''}`}
                    style={{ display: activeTab === 'materials' ? 'block' : 'none' }}>
                    {activeTab === 'materials' ? children : <MaterialsMobile />}
                </div>

                <div className={`tab-view ${activeTab === 'history' ? 'active' : ''}`}
                    style={{ display: activeTab === 'history' ? 'block' : 'none' }}>
                    {activeTab === 'history' ? children : <HistoryMobile />}
                </div>

                {/* Non-tab routes (Details, Reports, etc.) */}
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
