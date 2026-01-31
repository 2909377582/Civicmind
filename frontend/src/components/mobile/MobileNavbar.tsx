import './MobileNavbar.css';

interface MobileNavbarProps {
    currentPage: string;
    onNavigate: (page: string) => void;
}

export default function MobileNavbar({ currentPage, onNavigate }: MobileNavbarProps) {
    const navItems = [
        { id: 'exams', icon: '📝', label: '题库' },
        { id: 'materials', icon: '💡', label: '素材' },
        { id: 'history', icon: '🕒', label: '历史' },
        // { id: 'profile', icon: '👤', label: '我的' },
    ];

    return (
        <nav className="mobile-navbar">
            {navItems.map(item => (
                <button
                    key={item.id}
                    className={`mobile-nav-item ${currentPage === item.id ? 'active' : ''}`}
                    onClick={() => onNavigate(item.id)}
                >
                    <span className="mobile-nav-icon">{item.icon}</span>
                    <span className="mobile-nav-label">{item.label}</span>
                </button>
            ))}
        </nav>
    );
}
