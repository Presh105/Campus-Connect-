import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface PostContentProps {
  content: string;
  maxLength?: number;
}

export function PostContent({ content, maxLength = 150 }: PostContentProps) {
  const [expanded, setExpanded] = useState(false);
  
  const shouldTruncate = content.length > maxLength;
  const displayContent = expanded || !shouldTruncate 
    ? content 
    : content.slice(0, maxLength).trim() + '...';

  return (
    <div>
      <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">
        {displayContent}
      </p>
      {shouldTruncate && (
        <Button
          variant="link"
          size="sm"
          className="p-0 h-auto text-primary font-medium mt-1"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
        >
          {expanded ? 'Show less' : 'See more'}
        </Button>
      )}
    </div>
  );
}
