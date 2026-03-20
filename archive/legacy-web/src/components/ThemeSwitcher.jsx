import { useTheme } from '../context/ThemeContext';

const ThemeSwitcher = () => {
    const { theme, toggleTheme } = useTheme();

    const themes = [
        { id: 'light', icon: '☀️', label: 'Light' },
        { id: 'dark', icon: '🌙', label: 'Dark' },
        { id: 'midnight', icon: '🌌', label: 'Midnight' },
    ];

    return (
        <div className="theme-switcher" style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '0.25rem', borderRadius: '2rem', border: 'var(--glass-border)' }}>
            {themes.map((t) => (
                <button
                    key={t.id}
                    onClick={() => toggleTheme(t.id)}
                    title={t.label}
                    style={{
                        background: theme === t.id ? 'var(--accent-primary)' : 'transparent',
                        color: theme === t.id ? '#fff' : 'var(--text-secondary)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '2rem',
                        height: '2rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        transition: 'all 0.2s ease'
                    }}
                >
                    {t.icon}
                </button>
            ))}
        </div>
    );
};

export default ThemeSwitcher;
