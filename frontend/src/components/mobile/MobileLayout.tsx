import type { ReactNode } from 'react';
import MobileNavbar from './MobileNavbar';
import './MobileLayout.css';

interface MobileLayoutProps {
    children: ReactNode;
    currentPage: string;
    onNavigate: (page: string) => void;
}

export default function MobileLayout({ children, currentPage, onNavigate }: MobileLayoutProps) {
    return (
        <div className="mobile-layout">
            <header className="mobile-header">
                <span className="mobile-brand">CivicMind</span>
                {/* 可以添加更多顶部元素，如设置按钮 */}
            </header>

            <main className="mobile-content">
                {children}
            </main>

            <MobileNavbar currentPage={currentPage} onNavigate={onNavigate} />
        </div>
    );
}
