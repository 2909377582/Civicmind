import React from 'react';
import MobileNavbar from '../mobile/MobileNavbar';
import './MobileLayout.css';

interface MobileLayoutProps {
    children: React.ReactNode;
}

export default function MobileLayout({ children }: MobileLayoutProps) {
    return (
        <div className="mobile-layout">
            <header className="mobile-header">
                <span className="mobile-brand">CivicMind</span>
            </header>

            <main className="mobile-content">
                {children}
            </main>

            <MobileNavbar />
        </div>
    );
}
