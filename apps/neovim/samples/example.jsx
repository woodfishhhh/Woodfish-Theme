// Comparison sample (reuses the TypeScript statistics): a small React todo list.
import React, { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import PropTypes from 'prop-types';

const STORAGE_KEY = 'todos';
const FILTERS = { all: () => true, open: (todo) => !todo.done, done: (todo) => todo.done };

function reducer(state, action) {
  switch (action.type) {
    case 'add':
      return [...state, { id: Date.now(), text: action.text, done: false }];
    case 'toggle':
      return state.map((todo) => (todo.id === action.id ? { ...todo, done: !todo.done } : todo));
    case 'remove':
      return state.filter((todo) => todo.id !== action.id);
    default:
      throw new Error(`Unknown action: ${action.type}`);
  }
}

function TodoItem({ todo, onToggle, onRemove }) {
  return (
    <li className={todo.done ? 'todo done' : 'todo'} data-id={todo.id}>
      <label>
        <input type="checkbox" checked={todo.done} onChange={() => onToggle(todo.id)} />
        <span>{todo.text}</span>
      </label>
      <button type="button" aria-label="Remove" onClick={() => onRemove(todo.id)}>
        &times;
      </button>
    </li>
  );
}

TodoItem.propTypes = {
  todo: PropTypes.shape({ id: PropTypes.number, text: PropTypes.string, done: PropTypes.bool }).isRequired,
  onToggle: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};

export default function TodoApp({ title = 'Todos', initial = [] }) {
  const [todos, dispatch] = useReducer(reducer, initial, (seed) => {
    const saved = typeof localStorage === 'undefined' ? null : localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : seed;
  });
  const [filter, setFilter] = useState('all');
  const [draft, setDraft] = useState('');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  }, [todos]);

  const visible = useMemo(() => todos.filter(FILTERS[filter]), [todos, filter]);
  const remaining = todos.filter(FILTERS.open).length;

  const submit = useCallback(
    (event) => {
      event.preventDefault();
      if (draft.trim() === '') return;
      dispatch({ type: 'add', text: draft.trim() });
      setDraft('');
    },
    [draft]
  );

  return (
    <>
      <h1>{title}</h1>
      <form onSubmit={submit}>
        <input value={draft} placeholder="What needs doing?" onChange={(e) => setDraft(e.target.value)} />
      </form>
      {visible.length === 0 ? (
        <p className="empty">Nothing to show.</p>
      ) : (
        <ul>
          {visible.map((todo) => (
            <TodoItem key={todo.id} todo={todo} onToggle={(id) => dispatch({ type: 'toggle', id })} onRemove={(id) => dispatch({ type: 'remove', id })} />
          ))}
        </ul>
      )}
      <footer>
        {/* {remaining} items left */}
        <span>{remaining} left</span>
        {Object.keys(FILTERS).map((name) => (
          <button key={name} disabled={name === filter} onClick={() => setFilter(name)}>
            {name}
          </button>
        ))}
      </footer>
    </>
  );
}
