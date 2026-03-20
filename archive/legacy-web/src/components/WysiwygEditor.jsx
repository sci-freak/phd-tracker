import React, { useState, useRef, useEffect } from 'react';

const WysiwygEditor = ({ value, onChange, placeholder, rows = 3 }) => {
    const editorRef = useRef(null);
    const [showContextMenu, setShowContextMenu] = useState(false);
    const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
    const [showLinkDialog, setShowLinkDialog] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [linkText, setLinkText] = useState('');
    const savedSelectionRef = useRef(null);
    const isTypingRef = useRef(false);
    const isUpdatingRef = useRef(false);
    const debounceTimerRef = useRef(null);

    // Convert markdown to HTML for display
    const markdownToHtml = (markdown) => {
        if (!markdown) return '';

        // Handle both markdown links [text](url) and plain URLs in one pass to avoid double-linking
        let html = markdown.replace(
            /(\[([^\]]+)\]\(([^)]+)\))|(https?:\/\/[^\s<]+)/g,
            (match, fullMarkdownLink, text, url, plainUrl) => {
                if (fullMarkdownLink) {
                    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="editor-link">${text}</a>`;
                }
                if (plainUrl) {
                    return `<a href="${plainUrl}" target="_blank" rel="noopener noreferrer" class="editor-link">${plainUrl}</a>`;
                }
                return match;
            }
        );

        html = html
            // Bold: **text**
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            // Italic: *text*
            .replace(/\*([^*]+)\*/g, '<em>$1</em>');

        return html;
    };

    // Close context menu
    useEffect(() => {
        const handleClick = (e) => {
            if (!e.target.closest('.context-menu')) {
                setShowContextMenu(false);
            }
        };

        if (showContextMenu) {
            document.addEventListener('click', handleClick);
            return () => document.removeEventListener('click', handleClick);
        }
    }, [showContextMenu]);

    // Apply formatting
    const applyFormat = (command) => {
        restoreSelection();
        document.execCommand(command, false, null);
        setShowContextMenu(false);
        editorRef.current?.focus();
        setTimeout(handleInput, 0);
    };

    // Save/Restore selection helpers
    const saveSelection = () => {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            savedSelectionRef.current = selection.getRangeAt(0);
        }
    };

    // Convert HTML back to markdown for storage
    const htmlToMarkdown = (html) => {
        if (!html) return '';
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        // Links
        tempDiv.querySelectorAll('a').forEach(link => {
            const text = link.textContent;
            const href = link.getAttribute('href');
            link.outerHTML = `[${text}](${href})`;
        });
        // Bold
        tempDiv.querySelectorAll('strong, b').forEach(b => {
            b.outerHTML = `**${b.textContent}**`;
        });
        // Italic
        tempDiv.querySelectorAll('em, i').forEach(i => {
            i.outerHTML = `*${i.textContent}*`;
        });
        // Replace line breaks and divs with newlines
        // Replace line breaks and divs with newlines
        let markdown = tempDiv.innerHTML
            .replace(/<br\s*\/?>/gi, '\n') // Handle <br>
            .replace(/<\/div><div>/gi, '\n') // Handle adjacent divs
            .replace(/<div>/gi, '\n') // Handle opening divs
            .replace(/<\/div>/gi, '') // Handle closing divs
            .replace(/<p>/gi, '') // Handle opening p
            .replace(/<\/p>/gi, '\n\n') // Handle closing p (double newline for paragraphs)
            .replace(/<[^>]+>/g, '') // Strip other tags
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"');

        // Clean up excessive newlines
        markdown = markdown.replace(/\n{3,}/g, '\n\n').trim();

        return markdown;
    };

    // Initialize editor content when value changes
    useEffect(() => {
        if (editorRef.current && value !== undefined) {
            // Only update if the content is actually different to prevent cursor jumping
            const currentMarkdown = htmlToMarkdown(editorRef.current.innerHTML);
            if (value !== currentMarkdown && !isTypingRef.current) {
                const html = markdownToHtml(value);
                isUpdatingRef.current = true;
                editorRef.current.innerHTML = html;
                setTimeout(() => {
                    isUpdatingRef.current = false;
                }, 0);
            }
        }
    }, [value]);

    // Handle user input changes
    const handleInput = () => {
        if (editorRef.current) {
            if (isUpdatingRef.current) return;

            isTypingRef.current = true;

            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }

            debounceTimerRef.current = setTimeout(() => {
                const markdown = htmlToMarkdown(editorRef.current.innerHTML);
                onChange({ target: { value: markdown } });
                isTypingRef.current = false;
            }, 500); // 500ms debounce
        }
    };

    const restoreSelection = () => {
        if (savedSelectionRef.current) {
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(savedSelectionRef.current);
        }
    };

    // Handle context menu
    const handleContextMenu = (e) => {
        e.preventDefault();
        saveSelection();
        setContextMenuPos({ x: e.clientX, y: e.clientY });
        setShowContextMenu(true);
    };

    // Handle link insertion
    const handleLinkClick = () => {
        // If we have a saved selection from context menu, restore it temporarily to get text
        if (savedSelectionRef.current) {
            restoreSelection();
        }

        const selection = window.getSelection();
        const selectedText = selection.toString().trim();

        setLinkText(selectedText);
        setLinkUrl('');
        setShowLinkDialog(true);
        setShowContextMenu(false);
    };

    const insertLink = () => {
        if (linkUrl && linkText) {
            // Ensure URL has protocol
            let url = linkUrl;
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + url;
            }

            restoreSelection();

            // Create actual DOM node instead of using insertHTML
            const linkElement = document.createElement('a');
            linkElement.href = url;
            linkElement.target = '_blank';
            linkElement.rel = 'noopener noreferrer';
            linkElement.className = 'editor-link';
            linkElement.textContent = linkText;

            // Insert the node
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                range.deleteContents();
                range.insertNode(linkElement);

                // Add a space after the link
                const space = document.createTextNode(' ');
                range.setStartAfter(linkElement);
                range.insertNode(space);

                // Move cursor after the space
                range.setStartAfter(space);
                range.setEndAfter(space);
                selection.removeAllRanges();
                selection.addRange(range);
            }

            setShowLinkDialog(false);
            setLinkUrl('');
            setLinkText('');
            editorRef.current?.focus();

            // Trigger onChange to save
            handleInput();
        }
    };

    // Handle clicks on links
    const handleMouseDown = (e) => {
        if (e.target.tagName === 'A' && e.target.classList.contains('editor-link')) {
            e.preventDefault();
            e.stopPropagation();
            const url = e.target.getAttribute('href');
            if (url) {
                window.open(url, '_blank', 'noopener,noreferrer');
            }
        }
    };

    const minHeight = `${rows * 1.5}rem`;

    return (
        <div style={{ position: 'relative' }}>
            <div
                ref={editorRef}
                contentEditable
                onInput={handleInput}
                onContextMenu={handleContextMenu}
                onMouseDown={handleMouseDown}
                suppressContentEditableWarning
                style={{
                    minHeight,
                    padding: '0.75rem',
                    background: 'var(--bg-primary)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '0.5rem',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    lineHeight: '1.5',
                    outline: 'none',
                    overflowY: 'auto',
                    maxHeight: '200px',
                    cursor: 'text'
                }}
                data-placeholder={placeholder}
            />

            {/* Context Menu */}
            {showContextMenu && (
                <div
                    className="context-menu"
                    style={{
                        position: 'fixed',
                        top: contextMenuPos.y,
                        left: contextMenuPos.x,
                        background: 'var(--bg-card)',
                        border: 'var(--glass-border)',
                        borderRadius: '0.5rem',
                        padding: '0.5rem',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                        zIndex: 1000,
                        display: 'flex',
                        gap: '0.5rem'
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        type="button"
                        onClick={() => applyFormat('bold')}
                        style={{
                            padding: '0.4rem 0.6rem',
                            background: 'var(--bg-primary)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '0.25rem',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            fontSize: '0.85rem'
                        }}
                        title="Bold"
                    >
                        B
                    </button>
                    <button
                        type="button"
                        onClick={() => applyFormat('italic')}
                        style={{
                            padding: '0.4rem 0.6rem',
                            background: 'var(--bg-primary)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '0.25rem',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            fontStyle: 'italic',
                            fontSize: '0.85rem'
                        }}
                        title="Italic"
                    >
                        I
                    </button>
                    <button
                        type="button"
                        onClick={handleLinkClick}
                        style={{
                            padding: '0.4rem 0.6rem',
                            background: 'var(--bg-primary)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '0.25rem',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            fontSize: '0.85rem'
                        }}
                        title="Add Link"
                    >
                        🔗
                    </button>
                    <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)', margin: '0 0.25rem' }} />
                    <button
                        type="button"
                        onClick={() => {
                            restoreSelection();
                            const selection = window.getSelection();
                            navigator.clipboard.writeText(selection.toString());
                            setShowContextMenu(false);
                        }}
                        style={{
                            padding: '0.4rem 0.6rem',
                            background: 'var(--bg-primary)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '0.25rem',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            fontSize: '0.85rem'
                        }}
                        title="Copy"
                    >
                        📋
                    </button>
                    <button
                        type="button"
                        onClick={async () => {
                            restoreSelection();
                            try {
                                const text = await navigator.clipboard.readText();
                                document.execCommand('insertText', false, text);
                                handleInput();
                            } catch (err) {
                                console.error('Failed to read clipboard contents: ', err);
                            }
                            setShowContextMenu(false);
                        }}
                        style={{
                            padding: '0.4rem 0.6rem',
                            background: 'var(--bg-primary)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '0.25rem',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            fontSize: '0.85rem'
                        }}
                        title="Paste"
                    >
                        📥
                    </button>
                </div>
            )}

            {/* Link Dialog */}
            {showLinkDialog && (
                <>
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
                                autoFocus
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
                                onKeyPress={(e) => e.key === 'Enter' && insertLink()}
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
                </>
            )}

            <style>{`
                [contenteditable]:empty:before {
                    content: attr(data-placeholder);
                    color: var(--text-secondary);
                    opacity: 0.5;
                }
                .editor-link {
                    color: var(--accent-primary) !important;
                    text-decoration: underline !important;
                    cursor: pointer !important;
                    pointer-events: auto !important;
                }
                .editor-link:hover {
                    opacity: 0.8;
                    background: rgba(56, 189, 248, 0.1);
                }
            `}</style>
        </div>
    );
};

export default WysiwygEditor;
