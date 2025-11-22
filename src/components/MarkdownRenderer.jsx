import React from 'react';

const MarkdownRenderer = ({ text }) => {
    if (!text) return null;

    const parseMarkdown = (markdown) => {
        const elements = [];
        let currentIndex = 0;
        let key = 0;

        // Regex patterns for markdown
        const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
        const boldPattern = /\*\*([^*]+)\*\*/g;
        const italicPattern = /\*([^*]+)\*/g;
        const urlPattern = /(https?:\/\/[^\s]+)/g;

        // Combine all patterns
        const combinedPattern = /(\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*|(https?:\/\/[^\s]+))/g;

        let match;
        const matches = [];

        while ((match = combinedPattern.exec(markdown)) !== null) {
            matches.push({
                index: match.index,
                length: match[0].length,
                type: match[1].startsWith('[') ? 'link' :
                    match[1].startsWith('**') ? 'bold' :
                        match[1].startsWith('*') ? 'italic' : 'url',
                fullMatch: match[0],
                content: match[2] || match[4] || match[5] || match[6],
                url: match[3] || match[6]
            });
        }

        // Sort matches by index
        matches.sort((a, b) => a.index - b.index);

        // Build elements
        matches.forEach((m) => {
            // Add text before match
            if (currentIndex < m.index) {
                elements.push(markdown.substring(currentIndex, m.index));
            }

            // Add formatted element
            switch (m.type) {
                case 'link':
                    elements.push(
                        <a
                            key={key++}
                            href={m.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}
                        >
                            {m.content}
                        </a>
                    );
                    break;
                case 'bold':
                    elements.push(<strong key={key++}>{m.content}</strong>);
                    break;
                case 'italic':
                    elements.push(<em key={key++}>{m.content}</em>);
                    break;
                case 'url':
                    elements.push(
                        <a
                            key={key++}
                            href={m.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}
                        >
                            {m.url}
                        </a>
                    );
                    break;
            }

            currentIndex = m.index + m.length;
        });

        // Add remaining text
        if (currentIndex < markdown.length) {
            elements.push(markdown.substring(currentIndex));
        }

        return elements.length > 0 ? elements : markdown;
    };

    return <>{parseMarkdown(text)}</>;
};

export default MarkdownRenderer;
