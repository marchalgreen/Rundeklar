'use client';
import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CodeProps {
  value: string;
  language?: string;
  className?: string;
}

export function Code({ value, language, className }: CodeProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('clipboard copy failed', error);
    }
  };

  return (
    <div className={cn('overflow-hidden rounded-xl border border-border/60 bg-background/70 shadow-sm', className)}>
      <div className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-4 py-2">
        <Badge variant="muted" className="capitalize">
          {language ?? 'snippet'}
        </Badge>
        <Button size="sm" variant="ghost" className="text-xs" onClick={handleCopy}>
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      <pre className="max-h-[500px] overflow-x-auto px-4 py-4 text-xs leading-relaxed text-foreground/90">
        <code>{value}</code>
      </pre>
    </div>
  );
}
