import Header from './Header';
import Sidebar from './Sidebar';
import './DesktopLayout.css';

interface DesktopLayoutProps {
    children: React.ReactNode;
}

export default function DesktopLayout({ children }: DesktopLayoutProps) {
    return (
        <div className="app">
            <Header />
            <div className="flex" style={{ marginTop: '64px' }}>
                {/* Sidebar is hidden on small screens via CSS @media */}
                <Sidebar />
                <main className="desktop-main">
                    {children}
                </main>
            </div>
        </div>
    );
}
