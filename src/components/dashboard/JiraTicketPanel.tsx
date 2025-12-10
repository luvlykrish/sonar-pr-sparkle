import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { JiraTicket, PullRequest } from '@/types/codeReview';
import { Ticket, ExternalLink, User, Tag, Paperclip, FileCheck, Search, AlertCircle } from 'lucide-react';
import { useState } from 'react';

interface JiraTicketPanelProps {
  ticket: JiraTicket | null;
  detectedTicketId: string | null;
  pr: PullRequest | null;
  isLoading: boolean;
  onFetchTicket: (ticketId: string) => void;
  onFetchFromUrl: (url: string) => void;
}

export function JiraTicketPanel({
  ticket,
  detectedTicketId,
  pr,
  isLoading,
  onFetchTicket,
  onFetchFromUrl,
}: JiraTicketPanelProps) {
  const [manualInput, setManualInput] = useState('');

  const handleManualFetch = () => {
    if (!manualInput.trim()) return;
    
    if (manualInput.includes('http')) {
      onFetchFromUrl(manualInput.trim());
    } else {
      onFetchTicket(manualInput.trim().toUpperCase());
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      'Highest': 'bg-red-500/20 text-red-400',
      'High': 'bg-orange-500/20 text-orange-400',
      'Medium': 'bg-yellow-500/20 text-yellow-400',
      'Low': 'bg-green-500/20 text-green-400',
      'Lowest': 'bg-blue-500/20 text-blue-400',
    };
    return colors[priority] || 'bg-muted text-muted-foreground';
  };

  const getStatusColor = (status: string) => {
    const lower = status.toLowerCase();
    if (lower.includes('done') || lower.includes('closed')) return 'bg-green-500/20 text-green-400';
    if (lower.includes('progress') || lower.includes('review')) return 'bg-blue-500/20 text-blue-400';
    if (lower.includes('blocked')) return 'bg-red-500/20 text-red-400';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ticket className="h-5 w-5 text-primary" />
          Jira Ticket
        </CardTitle>
        <CardDescription>
          Business requirements from linked Jira ticket
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Manual Input */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            Enter ticket ID or Jira URL
          </Label>
          <div className="flex gap-2">
            <Input
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="PROJ-123 or https://..."
              className="flex-1"
              onKeyDown={(e) => e.key === 'Enter' && handleManualFetch()}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualFetch}
              disabled={isLoading || !manualInput.trim()}
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Auto-detected ticket */}
        {detectedTicketId && !ticket && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-primary" />
              <span className="text-sm">Detected: <strong>{detectedTicketId}</strong></span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onFetchTicket(detectedTicketId)}
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Fetch'}
            </Button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        )}

        {/* Ticket Details */}
        {ticket && !isLoading && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <a
                  href={ticket.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-sm text-primary hover:underline flex items-center gap-1"
                >
                  {ticket.key}
                  <ExternalLink className="h-3 w-3" />
                </a>
                <h3 className="font-medium mt-1">{ticket.summary}</h3>
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{ticket.type}</Badge>
              <Badge className={getPriorityColor(ticket.priority)}>{ticket.priority}</Badge>
              <Badge className={getStatusColor(ticket.status)}>{ticket.status}</Badge>
            </div>

            {/* Description */}
            {ticket.description && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Description</Label>
                <div className="p-3 rounded-lg bg-muted/30 text-sm max-h-40 overflow-y-auto whitespace-pre-wrap">
                  {ticket.description}
                </div>
              </div>
            )}

            {/* Acceptance Criteria */}
            {ticket.acceptanceCriteria && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <FileCheck className="h-3 w-3" />
                  Acceptance Criteria
                </Label>
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm max-h-40 overflow-y-auto whitespace-pre-wrap">
                  {ticket.acceptanceCriteria}
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              {ticket.assignee && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span>{ticket.assignee}</span>
                </div>
              )}
              {ticket.labels.length > 0 && (
                <div className="flex items-center gap-1 text-muted-foreground col-span-2">
                  <Tag className="h-3 w-3" />
                  <span>{ticket.labels.join(', ')}</span>
                </div>
              )}
            </div>

            {/* Attachments */}
            {ticket.attachments.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Paperclip className="h-3 w-3" />
                  Attachments ({ticket.attachments.length})
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {ticket.attachments.slice(0, 6).map((att) => (
                    <a
                      key={att.id}
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      {att.thumbnail ? (
                        <img
                          src={att.thumbnail}
                          alt={att.filename}
                          className="w-full h-16 object-cover rounded"
                        />
                      ) : (
                        <div className="w-full h-16 flex items-center justify-center text-xs text-muted-foreground">
                          {att.filename}
                        </div>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!ticket && !isLoading && !detectedTicketId && pr && (
          <div className="text-center py-6 text-muted-foreground">
            <Ticket className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No Jira ticket detected</p>
            <p className="text-xs mt-1">
              Enter a ticket ID or URL above to validate against requirements
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
