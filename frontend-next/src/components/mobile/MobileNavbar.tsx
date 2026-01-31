'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import './MobileNavbar.css';

export default function MobileNavbar() {
    const pathname = usePathname();

    const isActive = (path: string) => {
        if (path === '/') return pathname === '/' || pathname.startsWith('/exams');
        return pathname.startsWith(path);
    };

    const navItems = [
        { id: 'exams', path: '/', icon: '📝', label: '题库' },
        { id: 'materials', path: '/materials', icon: '💡', label: '素材' },
        { id: 'history', path: '/history', icon: '🕒', label: '历史' },
    ];

    return (
        <nav className="mobile-navbar">
            {navItems.map(item => (
                <Link
                    key={item.id}
                    href={item.path}
                    className={`mobile-nav-item ${isActive(item.path) ? 'active' : ''}`}
                >
                    <span className="mobile-nav-icon">{item.icon}</span>
                    <span className="mobile-nav-label">{item.label}</span>
                </Link>
            ))}
        </nav>
    );
}
