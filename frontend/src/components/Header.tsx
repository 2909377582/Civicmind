import { useAuth } from '../contexts/AuthContext'
import './Header.css'

interface HeaderProps {
    onLogin?: () => void;
}

function Header({ onLogin }: HeaderProps) {
    const { user, signOut } = useAuth()

    return (
        <header className="header">
            <div className="header-brand">
                <div className="logo">
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect width="32" height="32" rx="8" fill="url(#gradient)" />
                        <path d="M8 22V10L16 6L24 10V22L16 26L8 22Z" stroke="white" strokeWidth="2" fill="none" />
                        <path d="M16 14V20M13 17H19" stroke="white" strokeWidth="2" strokeLinecap="round" />
                        <defs>
                            <linearGradient id="gradient" x1="0" y1="0" x2="32" y2="32">
                                <stop offset="0%" stopColor="#0066ff" />
                                <stop offset="100%" stopColor="#00c6ff" />
                            </linearGradient>
                        </defs>
                    </svg>
                </div>
                <h1 className="brand-name">CivicMind</h1>
                <span className="brand-tagline">申论智能批改</span>
            </div>

            <nav className="header-nav">
                <a href="#" className="nav-link active">首页</a>
                <a href="#" className="nav-link">使用指南</a>
                <a href="#" className="nav-link">关于我们</a>
            </nav>

            <div className="header-actions">
                {user ? (
                    <>
                        <span className="user-email">{user.email}</span>
                        <button className="btn btn-secondary btn-sm" onClick={() => signOut()}>
                            登出
                        </button>
                    </>
                ) : (
                    <>
                        <button className="btn btn-secondary btn-sm" onClick={onLogin}>
                            登录
                        </button>
                        <button className="btn btn-primary btn-sm" onClick={onLogin}>
                            免费试用
                        </button>
                    </>
                )}
            </div>
        </header>
    )
}

export default Header

