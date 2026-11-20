// Statistics corpus: a notification center with a theme context, a class component and a form.
import React, { Component, createContext, forwardRef, Fragment, useContext, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import clsx from 'clsx';

const ThemeContext = createContext({ mode: 'light', accent: '#3b82f6' });
const POLL_INTERVAL = 30_000;
const LEVELS = ['info', 'success', 'warning', 'error'];
const ICONS = { info: 'i', success: '✓', warning: '!', error: '×' };

function useTheme() {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme needs a ThemeContext.Provider');
  return theme;
}

const Icon = ({ name, size = 16, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" role="img" aria-hidden="true" {...rest}>
    <title>{name} icon</title>
    <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth={1.5} />
    <path d="M4 8l3 3 5-6" xlinkHref="#check" />
  </svg>
);

const Badge = forwardRef(function Badge({ level, children }, ref) {
  const { accent } = useTheme();
  return (
    <span ref={ref} className={clsx('badge', `badge-${level}`)} style={{ borderColor: level === 'info' ? accent : undefined }}>
      {ICONS[level]} {children}
    </span>
  );
});

class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.props.onError?.(error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (error === null) return this.props.children;
    return (
      <div role="alert" className="boundary">
        <h2>Something went wrong</h2>
        <p>
          <strong>{error.name}</strong>: <em>{error.message}</em>
        </p>
        <p>
          If this keeps happening, <a href="/help">read the help</a> or <em>reload</em> the page.
        </p>
        <button type="button" onClick={() => this.setState({ error: null })}>
          Try again
        </button>
      </div>
    );
  }
}

function Notification({ item, onDismiss }) {
  const [open, setOpen] = useState(false);
  const bodyRef = useRef(null);

  useEffect(() => {
    if (open) bodyRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [open]);

  return (
    <li className={clsx('note', { unread: !item.read, [`note-${item.level}`]: true })} data-id={item.id}>
      <Badge level={item.level}>{item.level.toUpperCase()}</Badge>
      <h3 onClick={() => setOpen((value) => !value)}>{item.title}</h3>
      {open && (
        <div ref={bodyRef} className="body">
          <p>
            Sent by <a href={`/users/${item.author}`}>{item.author}</a> at <code>{item.time}</code>
          </p>
          <p dangerouslySetInnerHTML={{ __html: item.html }} />
          <img src={item.image ?? '/placeholder.png'} alt="" width={64} />
          <img src="/logo.svg" alt="Logo" />
          <button className="dismiss" onClick={() => onDismiss(item.id)} disabled={!item.read && item.level === 'error'}>
            Dismiss
          </button>
        </div>
      )}
    </li>
  );
}

function Composer({ onSend }) {
  const [text, setText] = useState('');
  const [level, setLevel] = useState(LEVELS[0]);

  const submit = (event) => {
    event.preventDefault();
    if (!text.trim()) return;
    onSend({ id: crypto.randomUUID(), title: text, level, read: false, time: new Date().toLocaleTimeString() });
    setText('');
  };

  return (
    <form className="composer" onSubmit={submit}>
      <label htmlFor="level">Level</label>
      <select id="level" value={level} onChange={(event) => setLevel(event.target.value)}>
        {LEVELS.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
      <input type="text" value={text} placeholder="Write a note&hellip;" onChange={(event) => setText(event.target.value)} />
      <button type="submit">
        Send <kbd>Enter</kbd>
      </button>
      <small>
        Hold <i>Shift</i> and press <kbd>Enter</kbd> for a new line.
      </small>
    </form>
  );
}

export default function NotificationCenter({ initial = [], fetchItems }) {
  const [items, setItems] = useState(initial);
  const [mode, setMode] = useState('light');
  const theme = { mode, accent: mode === 'dark' ? '#93c5fd' : '#3b82f6' };

  useEffect(() => {
    if (!fetchItems) return undefined;
    const timer = setInterval(async () => setItems(await fetchItems()), POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [fetchItems]);

  const unread = items.filter((item) => !item.read).length;

  return (
    <ThemeContext.Provider value={theme}>
      <ErrorBoundary onError={(error) => console.warn('boundary caught', error)}>
        <section className={`center center-${mode}`}>
          <h1>Notifications {unread > 0 ? <b>({unread})</b> : <s>none</s>}</h1>
          <button onClick={() => setMode(mode === 'light' ? 'dark' : 'light')}>
            Switch to <u>{mode === 'light' ? 'dark' : 'light'}</u> mode
          </button>
          <p className="hint">
            Tip: <u>unread</u> items come first, <del>read</del> ones fade out.
          </p>
          <h3>Recent</h3>
          {items.length === 0 ? (
            <p className="empty">Nothing new &mdash; enjoy the quiet.</p>
          ) : (
            <ul>
              {items.map((item) => (
                <Fragment key={item.id}>
                  {/* Unread items come first. */}
                  <Notification item={item} onDismiss={(id) => setItems(items.filter((entry) => entry.id !== id))} />
                </Fragment>
              ))}
            </ul>
          )}
          <Composer onSend={(item) => setItems([item, ...items])} />
          <ThemeContext.Consumer>{({ accent }) => <Icon name="done" color={accent} />}</ThemeContext.Consumer>
        </section>
      </ErrorBoundary>
    </ThemeContext.Provider>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <NotificationCenter fetchItems={() => fetch('/api/notes').then((response) => response.json())} />
  </React.StrictMode>
);
