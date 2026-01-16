import { useState, useCallback, useEffect } from 'react';
import { JiraConfig, JiraTicket, DEFAULT_JIRA_CONFIG } from '@/types/codeReview';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useConfigDatabase } from '@/hooks/useConfigDatabase';

interface UseJiraReturn {
  jiraConfig: JiraConfig;
  setJiraConfig: (config: JiraConfig) => void;
  extractTicketId: (text: string) => string | null;
  fetchTicket: (ticketId: string) => Promise<JiraTicket | null>;
  fetchTicketFromUrl: (url: string) => Promise<JiraTicket | null>;
  isLoading: boolean;
}

export function useJira(): UseJiraReturn {
  const { getJiraConfig, saveConfig } = useConfigDatabase();
  const [jiraConfig, setJiraConfigState] = useState<JiraConfig>(DEFAULT_JIRA_CONFIG);
  const [isLoading, setIsLoading] = useState(false);

  // Load config from database on mount
  useEffect(() => {
    const loadConfig = async () => {
      const dbConfig = await getJiraConfig();
      setJiraConfigState(dbConfig);
    };
    loadConfig();
  }, [getJiraConfig]);

  const setJiraConfig = useCallback(async (config: JiraConfig) => {
    setJiraConfigState(config);
    await saveConfig('jira', config);
  }, [saveConfig]);

  const extractTicketId = useCallback((text: string): string | null => {
    if (!jiraConfig.enabled) return null;

    // Use custom pattern or default Jira pattern
    const pattern = jiraConfig.projectKeyPattern 
      ? new RegExp(`((?:${jiraConfig.projectKeyPattern})-\\d+)`, 'i')
      : /([A-Z]+-\d+)/i;

    const match = text.match(pattern);
    return match ? match[1].toUpperCase() : null;
  }, [jiraConfig]);

  const fetchTicket = useCallback(async (ticketId: string): Promise<JiraTicket | null> => {
    if (!jiraConfig.enabled || !jiraConfig.apiToken || !jiraConfig.email) {
      return null;
    }

    setIsLoading(true);
    try {
      const { data: issue, error } = await supabase.functions.invoke('jira-proxy', {
        body: {
          action: 'fetchTicket',
          domain: jiraConfig.domain,
          email: jiraConfig.email,
          apiToken: jiraConfig.apiToken,
          ticketId,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (issue?.error) {
        throw new Error(issue.error);
      }

      // Extract attachments (screenshots/images)
      const attachments = issue.fields?.attachment || [];
      const imageAttachments = attachments
        .filter((att: any) => att.mimeType?.startsWith('image/'))
        .map((att: any) => ({
          id: att.id,
          filename: att.filename,
          mimeType: att.mimeType,
          url: att.content,
          thumbnail: att.thumbnail,
        }));

      // Parse description - handle Atlassian Document Format (ADF)
      const description = parseADFToText(issue.fields?.description);
      const renderedDescription = issue.renderedFields?.description || description;

      // Extract acceptance criteria if present (common custom field patterns)
      const acceptanceCriteria = extractAcceptanceCriteria(issue.fields || {}, description);

      const ticket: JiraTicket = {
        key: issue.key,
        summary: issue.fields?.summary,
        description,
        renderedDescription,
        status: issue.fields?.status?.name || 'Unknown',
        type: issue.fields?.issuetype?.name || 'Task',
        priority: issue.fields?.priority?.name || 'Medium',
        assignee: issue.fields?.assignee?.displayName,
        reporter: issue.fields?.reporter?.displayName,
        labels: issue.fields?.labels || [],
        attachments: imageAttachments,
        acceptanceCriteria,
        url: `https://${jiraConfig.domain}/browse/${ticketId}`,
      };

      return ticket;
    } catch (error) {
      console.error('Jira fetch error:', error);
      toast({
        title: "Failed to fetch Jira ticket",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [jiraConfig]);

  const fetchTicketFromUrl = useCallback(async (url: string): Promise<JiraTicket | null> => {
    // Extract ticket ID from URL (handles various Jira URL formats)
    const match = url.match(/\/browse\/([A-Z]+-\d+)/i) || 
                  url.match(/\/([A-Z]+-\d+)/i) ||
                  url.match(/([A-Z]+-\d+)/i);
    
    if (!match) {
      toast({
        title: "Invalid Jira URL",
        description: "Could not extract ticket ID from URL",
        variant: "destructive",
      });
      return null;
    }

    return fetchTicket(match[1].toUpperCase());
  }, [fetchTicket]);

  return {
    jiraConfig,
    setJiraConfig,
    extractTicketId,
    fetchTicket,
    fetchTicketFromUrl,
    isLoading,
  };
}

// Parse Atlassian Document Format to plain text
function parseADFToText(adf: any): string {
  if (!adf) return '';
  if (typeof adf === 'string') return adf;

  const extractText = (node: any): string => {
    if (!node) return '';
    
    if (node.type === 'text') {
      return node.text || '';
    }

    if (node.content && Array.isArray(node.content)) {
      return node.content.map(extractText).join('');
    }

    if (node.type === 'paragraph') {
      return extractText(node) + '\n';
    }

    if (node.type === 'bulletList' || node.type === 'orderedList') {
      return node.content?.map((item: any, i: number) => {
        const prefix = node.type === 'orderedList' ? `${i + 1}. ` : '• ';
        return prefix + extractText(item);
      }).join('\n') + '\n';
    }

    if (node.type === 'heading') {
      const level = node.attrs?.level || 1;
      return '#'.repeat(level) + ' ' + extractText(node) + '\n';
    }

    if (node.type === 'codeBlock') {
      return '```\n' + extractText(node) + '\n```\n';
    }

    return extractText(node);
  };

  return extractText(adf).trim();
}

// Extract acceptance criteria from common field patterns
function extractAcceptanceCriteria(fields: any, description: string): string | undefined {
  // Check common custom field names for acceptance criteria
  const customFieldPatterns = [
    'customfield_10020', // Common AC field
    'customfield_10021',
    'customfield_10022',
  ];

  for (const field of customFieldPatterns) {
    if (fields[field]) {
      const value = fields[field];
      if (typeof value === 'string') return value;
      if (typeof value === 'object') return parseADFToText(value);
    }
  }

  // Try to extract from description using common patterns
  const acPatterns = [
    /acceptance criteria[:\s]*([\s\S]*?)(?=\n\n|\n#|$)/i,
    /ac[:\s]*([\s\S]*?)(?=\n\n|\n#|$)/i,
    /given[\s\S]*?when[\s\S]*?then/i,
  ];

  for (const pattern of acPatterns) {
    const match = description.match(pattern);
    if (match) return match[0];
  }

  return undefined;
}
