import * as React from 'react';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const methodVariant: Record<string, BadgeProps['variant']> = {
  GET: 'ok',
  POST: 'secondary',
  PUT: 'muted',
  PATCH: 'muted',
  DELETE: 'danger',
};

interface EndpointProps {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  description?: string;
  className?: string;
}

export function Endpoint({ method, path, description, className }: EndpointProps) {
  return (
    <div className={cn('flex flex-col gap-2 rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm', className)}>
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant={methodVariant[method] ?? 'muted'} className="uppercase tracking-wide">
          {method}
        </Badge>
        <code className="text-sm font-semibold text-foreground">{path}</code>
      </div>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
    </div>
  );
}
