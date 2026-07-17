import { Check, ChevronRight, X } from 'lucide-react';
import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { useApp } from '../AppContext';
import { formatTimer } from '../utils';

export function Button({ variant = 'primary', className = '', children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }) {
  return <button className={`button button--${variant} ${className}`} {...props}>{children}</button>;
}

export function IconButton({ label, className = '', children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return <button className={`icon-button ${className}`} aria-label={label} title={label} {...props}>{children}</button>;
}

export function SectionTitle({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return <div className="section-heading"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h2>{title}</h2></div>{action}</div>;
}

export function Modal({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal__header"><h2 id="modal-title">{title}</h2><IconButton label="Close" onClick={onClose}><X size={20} /></IconButton></div>
        <div className="modal__content">{children}</div>
        {footer && <div className="modal__footer">{footer}</div>}
      </section>
    </div>
  );
}

export function RowLink({ title, subtitle, leading, onClick }: { title: string; subtitle?: string; leading?: ReactNode; onClick?: () => void }) {
  return <button className="row-link" onClick={onClick}><span className="row-link__leading">{leading}</span><span className="row-link__copy"><strong>{title}</strong>{subtitle && <small>{subtitle}</small>}</span><ChevronRight size={18} /></button>;
}

export function SaveStatus() {
  const { saveStatus } = useApp();
  return <span className={`save-status save-status--${saveStatus}`}>{saveStatus === 'saved' && <Check size={12} />}{saveStatus === 'saving' ? 'Saving…' : saveStatus === 'error' ? 'Save error' : 'Saved'}</span>;
}

export function Toast() {
  const { toast } = useApp();
  if (!toast) return null;
  return <div className="toast" role="status"><span>{toast.message}</span>{toast.action && <button onClick={toast.action.run}>{toast.action.label}</button>}</div>;
}

export function RestTimer() {
  const { restEnd, stopRest, startRest } = useApp();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!restEnd) return;
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [restEnd]);
  useEffect(() => { if (restEnd && restEnd <= now) stopRest(); }, [restEnd, now, stopRest]);
  if (!restEnd || restEnd <= now) return null;
  const remaining = Math.ceil((restEnd - now) / 1000);
  return (
    <div className="rest-timer" role="timer" aria-label={`${remaining} seconds rest remaining`}>
      <span className="rest-timer__pulse" />
      <span><small>REST</small><strong>{formatTimer(remaining)}</strong></span>
      <button onClick={() => startRest(remaining + 30)}>+30s</button>
      <button onClick={stopRest}>Skip</button>
    </div>
  );
}

export function ConfirmDialog({ open, title, body, confirmLabel, destructive, onConfirm, onClose }: { open: boolean; title: string; body: string; confirmLabel: string; destructive?: boolean; onConfirm: () => void; onClose: () => void }) {
  return <Modal open={open} onClose={onClose} title={title} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant={destructive ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel}</Button></>}><p className="modal-copy">{body}</p></Modal>;
}
