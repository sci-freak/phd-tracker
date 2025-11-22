import React, { useState, useRef } from 'react';

const RichTextEditor = ({ value, onChange, placeholder, rows = 3 }) => {
    const textareaRef = useRef(null);
    const [showLinkDialog, setShowLinkDialog] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [linkText, setLinkText] = useState('');

    const getSelectedText = () => {
        const textarea = textareaRef.current;
        if (!textarea) return { start: 0, end: 0, text: '' };

        return {
            start: textarea.selectionStart,
            end: textarea.selectionEnd,
            text: textarea.value.substring(textarea.selectionStart, textarea.selectionEnd)
        };
    };

    const insertFormatting = (before, after = before) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const { start, end, text } = getSelectedText();
        const newText = value.substring(0, start) + before + text + after + value.substring(end);

        onChange({ target: { value: newText } });

        // Restore focus and selection
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + before.length, end + before.length);
        }, 0);
    };

    const handleBold = () => insertFormatting('**');
    const handleItalic = () => insertFormatting('*');

    const handleLinkClick = () => {
        const { text } = getSelectedText();
        if (text) {
            setLinkText(text);
            setLinkUrl('');
            setShowLinkDialog(true);
        } else {
            alert('Please select some text first to create a link');
        }
    };

    const insertLink = () => {
        if (!linkUrl) return;

        const textarea = textareaRef.current;
        const { start, end } = getSelectedText();
        const linkMarkdown = `[${linkText}](${linkUrl})`;
        const newText = value.substring(0, start) + linkMarkdown + value.substring(end);

        onChange({ target: { value: newText } });
        setShowLinkDialog(false);
        setLinkUrl('');
        setLinkText('');

        setTimeout(() => textarea.focus(), 0);
    };

    return (
        <div style={{ position: 'relative' }}>
            <div style={{
                display: 'flex',
                gap: '0.5rem',
                marginBottom: '0.5rem',
                padding: '0.5rem',
                background: 'rgba(0,0,0,0.2)',
                borderRadius: '0.5rem',
                flexWrap: 'wrap'
            }}>
                <button
                    type="button"
                    onClick={handleBold}
                    style={{
                        padding: '0.25rem 0.5rem',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '0.25rem',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '0.85rem'
                    }}
                    title="Bold (Ctrl+B)"
                >
                    B
                </button>
                <button
                    type="button"
                    onClick={handleItalic}
                    style={{
                        padding: '0.25rem 0.5rem',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '0.25rem',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        fontStyle: 'italic',
                        fontSize: '0.85rem'
                    }}
                    title="Italic (Ctrl+I)"
                >
                    I
                </button>
                <button
                    type="button"
                    onClick={handleLinkClick}
                    style={{
                        padding: '0.25rem 0.5rem',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '0.25rem',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        fontSize: '0.85rem'
                    }}
                    title="Add Link"
                >
                    🔗
                </button>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', alignSelf: 'center', marginLeft: 'auto' }}>
                    Select text to format
                </span>
            </div>

            <textarea
                ref={textareaRef}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                rows={rows}
                style={{ width: '100%' }}
            />

            {showLinkDialog && (
                <div style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'var(--bg-card)',
                    border: 'var(--glass-border)',
                    borderRadius: '1rem',
                    padding: '1.5rem',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                    zIndex: 1000,
                    minWidth: '300px'
                }}>
                    <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.1rem' }}>Add Hyperlink</h3>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                            Link Text
                        </label>
                        <input
                            type="text"
                            value={linkText}
                            onChange={(e) => setLinkText(e.target.value)}
                            placeholder="Display text"
                            style={{ width: '100%' }}
                        />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                            URL
                        </label>
                        <input
                            type="url"
                            value={linkUrl}
                            onChange={(e) => setLinkUrl(e.target.value)}
                            placeholder="https://example.com"
                            style={{ width: '100%' }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button
                            type="button"
                            onClick={() => {
                                setShowLinkDialog(false);
                                setLinkUrl('');
                                setLinkText('');
                            }}
                            className="btn-action"
                            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={insertLink}
                            className="btn-action"
                            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', borderColor: 'var(--accent-success)', color: 'var(--accent-success)' }}
                        >
                            Insert
                        </button>
                    </div>
                </div>
            )}

            {showLinkDialog && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.5)',
                        zIndex: 999
                    }}
                    onClick={() => setShowLinkDialog(false)}
                />
            )}
        </div>
    );
};

export default RichTextEditor;
