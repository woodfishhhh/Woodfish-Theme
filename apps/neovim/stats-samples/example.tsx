// Statistics corpus: a typed multi-step form with a reducer, a select component and a validation hook.
import {
  type ChangeEvent,
  type FormEvent,
  type ReactElement,
  type ReactNode,
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useId,
  useMemo,
  useReducer,
} from 'react';
import clsx from 'clsx';
import type { Locale } from './i18n';

export type StepId = 'account' | 'profile' | 'review';

export enum Severity {
  Hint,
  Warning = 5,
  Error = 10,
}

export interface Field<T extends string | number = string> {
  readonly name: string;
  value: T;
  touched?: boolean;
  validate?: (value: T) => string | null;
}

interface WizardState {
  step: StepId;
  fields: Record<string, Field<string>>;
  errors: ReadonlyMap<string, string>;
  submitting: boolean;
}

type WizardAction =
  | { type: 'change'; name: string; value: string }
  | { type: 'goto'; step: StepId }
  | { type: 'submit' }
  | { type: 'fail'; errors: [string, string][] };

const STEPS = ['account', 'profile', 'review'] as const;
const MIN_PASSWORD = 12;
const EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const initial: WizardState = { step: 'account', fields: {}, errors: new Map(), submitting: false };

function reducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'change': {
      const field = state.fields[action.name] ?? { name: action.name, value: '' };
      return { ...state, fields: { ...state.fields, [action.name]: { ...field, value: action.value, touched: true } } };
    }
    case 'goto':
      return { ...state, step: action.step };
    case 'submit':
      return { ...state, submitting: true, errors: new Map() };
    case 'fail':
      return { ...state, submitting: false, errors: new Map(action.errors) };
    default: {
      const unreachable: never = action;
      throw new Error(`Unhandled action ${JSON.stringify(unreachable)}`);
    }
  }
}

const WizardContext = createContext<{ state: WizardState; dispatch: (action: WizardAction) => void } | null>(null);

function useWizard() {
  const context = useContext(WizardContext);
  if (context === null) throw new Error('useWizard must be used inside <Wizard>');
  return context;
}

const rules = {
  email: (value: string) => (EMAIL.test(value) ? null : 'Enter a valid e-mail address'),
  password: (value: string) => (value.length >= MIN_PASSWORD ? null : `Use at least ${MIN_PASSWORD} characters`),
} satisfies Record<string, (value: string) => string | null>;

export function useValidation<K extends keyof typeof rules>(name: K, value: string): { message: string | null; severity: Severity } {
  return useMemo(() => {
    const message = rules[name](value);
    return { message, severity: message === null ? Severity.Hint : Severity.Error };
  }, [name, value]);
}

interface SelectProps<T extends string> extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'> {
  options: readonly T[];
  value: T;
  label: ReactNode;
  onChange: (value: T) => void;
  format?: (option: T, locale?: Locale) => string;
}

function SelectInner<T extends string>({ options, value, label, onChange, format = String, ...rest }: SelectProps<T>, ref: React.Ref<HTMLSelectElement>) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select ref={ref} id={id} value={value} onChange={(event: ChangeEvent<HTMLSelectElement>) => onChange(event.target.value as T)} {...rest}>
        {options.map((option) => (
          <option key={option} value={option}>
            {format(option)}
          </option>
        ))}
      </select>
    </div>
  );
}

export const Select = forwardRef(SelectInner) as <T extends string>(props: SelectProps<T> & { ref?: React.Ref<HTMLSelectElement> }) => ReactElement;

const identity = <T,>(value: T): T => value;

function TextField({ name, label, type = 'text' }: { name: string; label: string; type?: 'text' | 'email' | 'password' }) {
  const { state, dispatch } = useWizard();
  const value = state.fields[name]?.value ?? '';
  const error = state.errors.get(name);
  return (
    <div className={clsx('field', { invalid: error !== undefined })}>
      <label>
        <span className="label">{label}</span>
        <input type={type} name={name} value={value} aria-invalid={!!error} onChange={(event) => dispatch({ type: 'change', name, value: event.target.value })} />
      </label>
      {error && <small role="alert">{error}</small>}
    </div>
  );
}

export default function Wizard({ onFinish, title = 'Sign up' }: { onFinish: (values: Record<string, string>) => Promise<void>; title?: string }) {
  const [state, dispatch] = useReducer(reducer, initial);
  const index = STEPS.indexOf(state.step);

  const next = useCallback(() => dispatch({ type: 'goto', step: STEPS[Math.min(index + 1, STEPS.length - 1)] }), [index]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    dispatch({ type: 'submit' });
    const values = Object.fromEntries(Object.values(state.fields).map(({ name, value }) => [name, identity(value)]));
    try {
      await onFinish(values);
    } catch (error: unknown) {
      dispatch({ type: 'fail', errors: [['email', error instanceof Error ? error.message : 'Unknown error']] });
    }
  };

  return (
    <WizardContext.Provider value={{ state, dispatch }}>
      <form onSubmit={submit} noValidate>
        <h2>{title}</h2>
        <p>
          Step {index + 1} of {STEPS.length}: <strong>{state.step}</strong>
        </p>
        {state.step === 'account' && (
          <>
            <TextField name="email" label="E-mail" type="email" />
            <TextField name="password" label="Password" type="password" />
          </>
        )}
        {state.step === 'profile' && <Select options={['en', 'de', 'zh'] as const} value="en" label="Language" onChange={(code) => console.log(code)} />}
        {state.step === 'review' && (
          <>
            <h3>Almost done</h3>
            <p>
              Your data is <b>safe</b>, <i>editable</i> and <u>reversible</u>; the old price <s>$20</s> is gone.
            </p>
            <p>
              By continuing you accept the <a href="/terms">terms</a> and the <em>privacy</em> policy, see <code>docs/legal.md</code>.
            </p>
            <img src="/badge.svg" alt="Secure" />
          </>
        )}
        {state.step === 'review' ? (
          <button type="submit" disabled={state.submitting}>
            {state.submitting ? 'Saving…' : 'Finish'}
          </button>
        ) : (
          <button type="button" onClick={next}>
            Next &rarr;
          </button>
        )}
      </form>
    </WizardContext.Provider>
  );
}
