import React, { useState, useEffect, useRef } from 'react';

const SearchModal = ({ isOpen, onClose, applications, onSelect }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const inputRef = useRef(null);
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
            setSearchTerm('');
            setSelectedIndex(0);
        }
    }, [isOpen]);

    const filteredApps = applications.filter(app =>
        app.university.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.program.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 10); // Limit to top 10 results

    const handleKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % filteredApps.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + filteredApps.length) % filteredApps.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (filteredApps[selectedIndex]) {
                onSelect(filteredApps[selectedIndex]);
                onClose();
            }
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            paddingTop: '20vh'
        }} onClick={onClose}>
            <div style={{
                width: '600px',
                maxWidth: '90%',
                background: 'var(--bg-card)',
                border: 'var(--glass-border)',
                borderRadius: '1rem',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
            }} onClick={e => e.stopPropagation()}>
                <div style={{
                    padding: '1rem',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                }}>
                    <span style={{ fontSize: '1.2rem' }}>🔍</span>
                    <input
                        ref={inputRef}
                        type="text"
                        value={searchTerm}
                        onChange={e => {
                            setSearchTerm(e.target.value);
                            setSelectedIndex(0);
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder="Search applications..."
                        style={{
                            flex: 1,
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-primary)',
                            fontSize: '1.1rem',
                            outline: 'none'
                        }}
                    />
                    <div style={{
                        fontSize: '0.8rem',
                        color: 'var(--text-secondary)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '0.3rem'
                    }}>
                        ESC to close
                    </div>
                </div>

                {filteredApps.length > 0 ? (
                    <div style={{ padding: '0.5rem 0' }}>
                        {filteredApps.map((app, index) => (
                            <div
                                key={app.id}
                                onClick={() => {
                                    onSelect(app);
                                    onClose();
                                }}
                                onMouseEnter={() => setSelectedIndex(index)}
                                style={{
                                    padding: '0.75rem 1rem',
                                    cursor: 'pointer',
                                    background: index === selectedIndex ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                                    borderLeft: index === selectedIndex ? '3px solid var(--accent-primary)' : '3px solid transparent',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}
                            >
                                <div>
                                    <div style={{ fontWeight: 500 }}>{app.university}</div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{app.program}</div>
                                </div>
                                <div style={{
                                    fontSize: '0.8rem',
                                    padding: '0.2rem 0.5rem',
                                    borderRadius: '1rem',
                                    background: 'rgba(255,255,255,0.05)',
                                    color: 'var(--text-secondary)'
                                }}>
                                    {app.status}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : searchTerm ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        No results found
                    </div>
                ) : (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        Type to search...
                    </div>
                )}
            </div>
        </div>
    );
};

export default SearchModal;
