import { PullRequest } from '@/types/codeReview';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  GitPullRequest, 
  GitMerge, 
  GitPullRequestClosed, 
  Clock, 
  FileCode, 
  Plus, 
  Minus,
  RefreshCw,
  Loader2,
  Search
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

interface PRListProps {
  pullRequests: PullRequest[];
  selectedPR: PullRequest | null;
  onSelectPR: (pr: PullRequest) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export function PRList({ pullRequests, selectedPR, onSelectPR, onRefresh, isLoading }: PRListProps) {
  const [search, setSearch] = useState('');

  const filteredPRs = pullRequests.filter(pr => 
    pr.title.toLowerCase().includes(search.toLowerCase()) ||
    pr.author.toLowerCase().includes(search.toLowerCase()) ||
    String(pr.number).includes(search)
  );

  const getStateIcon = (state: PullRequest['state']) => {
    switch (state) {
      case 'open':
        return <GitPullRequest className="h-4 w-4 text-success" />;
      case 'merged':
        return <GitMerge className="h-4 w-4 text-primary" />;
      case 'closed':
        return <GitPullRequestClosed className="h-4 w-4 text-destructive" />;
    }
  };

  const getStateBadge = (state: PullRequest['state']) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      open: 'default',
      merged: 'secondary',
      closed: 'destructive',
    };
    return <Badge variant={variants[state]}>{state}</Badge>;
  };

  return (
    <Card className="glass-card h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <GitPullRequest className="h-5 w-5" />
            Pull Requests
            <Badge variant="outline" className="ml-2">{pullRequests.length}</Badge>
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onRefresh} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search PRs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full px-4 pb-4">
          {filteredPRs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
              <GitPullRequest className="h-12 w-12 mb-4 opacity-50" />
              <p>No pull requests found</p>
              <p className="text-sm">Configure GitHub and refresh to see PRs</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPRs.map((pr) => (
                <button
                  key={pr.id}
                  onClick={() => onSelectPR(pr)}
                  className={`w-full text-left p-3 rounded-lg border transition-all duration-200 hover:border-primary/50 hover:bg-accent/50 ${
                    selectedPR?.id === pr.id 
                      ? 'border-primary bg-primary/5 shadow-sm' 
                      : 'border-border bg-card/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-8 w-8 mt-0.5">
                      <AvatarImage src={pr.authorAvatar} />
                      <AvatarFallback>{pr.author[0].toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getStateIcon(pr.state)}
                        <span className="font-medium text-sm truncate">{pr.title}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="font-mono">#{pr.number}</span>
                        <span>{pr.author}</span>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(pr.updatedAt), { addSuffix: true })}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs">
                        <div className="flex items-center gap-1">
                          <FileCode className="h-3 w-3 text-muted-foreground" />
                          <span>{pr.changedFiles} files</span>
                        </div>
                        <div className="flex items-center gap-1 text-success">
                          <Plus className="h-3 w-3" />
                          <span>{pr.additions}</span>
                        </div>
                        <div className="flex items-center gap-1 text-destructive">
                          <Minus className="h-3 w-3" />
                          <span>{pr.deletions}</span>
                        </div>
                        {getStateBadge(pr.state)}
                      </div>
                      {pr.labels.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {pr.labels.slice(0, 3).map((label) => (
                            <Badge key={label} variant="outline" className="text-xs">
                              {label}
                            </Badge>
                          ))}
                          {pr.labels.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{pr.labels.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}