import React from 'react';
import './PolishedText.css';

interface PolishedTextProps {
    text: string;
}

export default function PolishedText({ text }: PolishedTextProps) {
    if (!text) return null;

    const parts: React.ReactNode[] = [];
    const regex = /(~~([^~]+)~~\s*\*\*([^*]+)\*\*|~~([^~]+)~~|\*\*([^*]+)\*\*)/g;
    let lastIndex = 0;
    let match;
    let key = 0;

    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>);
        }

        if (match[2] && match[3]) {
            // ~~deleted~~ **added** combination
            parts.push(
                <span key={key++} className="polish-change">
                    <span className="polish-deleted">{match[2]}</span>
                    <span className="polish-added">{match[3]}</span>
                </span>
            );
        } else if (match[4]) {
            // ~~deleted~~
            parts.push(<span key={key++} className="polish-deleted">{match[4]}</span>);
        } else if (match[5]) {
            // **added**
            parts.push(<span key={key++} className="polish-added">{match[5]}</span>);
        }

        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
        parts.push(<span key={key++}>{text.slice(lastIndex)}</span>);
    }

    return <div className="polished-text-content">{parts}</div>;
}
