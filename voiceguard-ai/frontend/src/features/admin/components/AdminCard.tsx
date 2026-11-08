import React from 'react';
import clsx from 'clsx';

interface AdminCardProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}

export const AdminCard: React.FC<AdminCardProps> = ({
  title,
  subtitle,
  action,
  icon,
  children,
  className,
  bodyClassName,
}) => {
  return (
    <div
      className={clsx(
        'bg-bg-card border border-border-subtle rounded-xl shadow-lg transition-all duration-200',
        className
      )}
    >
      {(title || subtitle || action || icon) && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
          <div className="flex items-center gap-3">
            {icon && <div className="text-accent-blue p-2 bg-accent-blue/10 rounded-lg">{icon}</div>}
            <div>
              {title && <h3 className="text-sm font-semibold text-text-primary tracking-wide">{title}</h3>}
              {subtitle && <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {action && <div className="flex items-center gap-2">{action}</div>}
        </div>
      )}
      <div className={clsx('p-6', bodyClassName)}>{children}</div>
    </div>
  );
};

