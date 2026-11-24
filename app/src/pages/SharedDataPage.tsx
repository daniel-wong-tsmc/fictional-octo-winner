import {Layout, LayoutContent, LayoutHeader} from '@astryxdesign/core/Layout';
import {HStack, VStack} from '@astryxdesign/core/Stack';
import {Heading, Text} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {Breadcrumbs, BreadcrumbItem} from '@astryxdesign/core/Breadcrumbs';
import {Banner} from '@astryxdesign/core/Banner';
import {Card} from '@astryxdesign/core/Card';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import {MetadataList, MetadataListItem} from '@astryxdesign/core/MetadataList';
import {List, ListItem} from '@astryxdesign/core/List';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {Icon} from '@astryxdesign/core/Icon';
import {useToast} from '@astryxdesign/core/Toast';
import {CalendarClock, ChevronRight, FileSpreadsheet, Plus, Send, User, Workflow as WorkflowIcon} from 'lucide-react';
import {WorkflowSheetTable} from '@workspace/astryx-workflows/components/WorkflowSheetTable';
import {failedMessage, personName, type SharedData} from '../sharedData';
import {shortDateTime} from '../tasks';

/**
 * A page for data someone else's workflow shares with you, laid out like a workflow page: whether it's
 * ready, what it holds and where it comes from, its rows, and which of your workflows already read it.
 * Ready data starts a new workflow with it as the first Input.
 */
export function SharedDataPage({data: d, usedBy}: {
  data: SharedData;
  /** Your workflows that read this data, with their pages. */
  usedBy: {name: string; href: string}[];
}) {
  const toast = useToast();
  const isReady = d.lastRun.result === 'ready';
  const owner = personName(d.owner);
  const {columns, rows} = d.preview;

  return (
    <Layout
      height="fill"
      contentWidth={1240}
      header={
        <LayoutHeader hasDivider padding={4}>
          <Breadcrumbs>
            <BreadcrumbItem href="#home">Home</BreadcrumbItem>
            <BreadcrumbItem isCurrent>{d.name}</BreadcrumbItem>
          </Breadcrumbs>
        </LayoutHeader>
      }
      content={
        <LayoutContent padding={6}>
          <VStack gap={6}>
            <HStack gap={4} hAlign="between" vAlign="start" wrap="wrap">
              <VStack gap={1.5}>
                <HStack gap={3} vAlign="center" wrap="wrap">
                  <HStack gap={1.5} vAlign="center">
                    <StatusDot variant={isReady ? 'success' : 'error'} label={isReady ? 'Ready' : 'Failed'} />
                    <Text type="supporting" weight="medium">{isReady ? 'Ready' : 'Failed'}</Text>
                  </HStack>
                  <Text type="supporting">{isReady ? `Updated ${shortDateTime(d.lastRun.at)}` : `Last run failed ${shortDateTime(d.lastRun.at)}`}</Text>
                </HStack>
                <Heading level={1}>{d.name}</Heading>
                <Text type="supporting">{d.description}</Text>
              </VStack>
              <HStack gap={2} wrap="wrap">
                {isReady ? (
                  <Button label="Use in a new workflow" variant="primary" icon={<Icon icon={Plus} />} href={`#workflow-new?data=${d.id}`} />
                ) : (
                  <Button
                    label={`Ask ${owner}`}
                    icon={<Icon icon={Send} />}
                    onClick={() => toast({body: `Asked ${owner} to check ${d.workflow}. Workflows that read it wait until it produces an output.`})}
                  />
                )}
              </HStack>
            </HStack>

            {!isReady && <Banner status="error" title="No new data this time." description={failedMessage(d)} collapsible={false} />}

            <MetadataList orientation="horizontal">
              <MetadataListItem label="Shared by" icon={<Icon icon={User} size="sm" />}>{d.owner}</MetadataListItem>
              <MetadataListItem label="From their workflow" icon={<Icon icon={WorkflowIcon} size="sm" />}>{d.workflow}</MetadataListItem>
              <MetadataListItem label="Updates" icon={<Icon icon={CalendarClock} size="sm" />}>{d.updates}</MetadataListItem>
              <MetadataListItem label="Format" icon={<Icon icon={FileSpreadsheet} size="sm" />}>{d.format}</MetadataListItem>
            </MetadataList>

            <Card padding={0}>
              <VStack>
                <VStack gap={0.5} padding={4}>
                  <Text type="label">The data</Text>
                  <Text type="supporting">
                    {`${rows.length} rows, ${columns.length} columns. ${isReady ? `As of ${shortDateTime(d.preview.asOf)}.` : `From the last run that worked, ${shortDateTime(d.preview.asOf)}.`}`}
                  </Text>
                </VStack>
                <WorkflowSheetTable sheet={{columns, rows}} />
              </VStack>
            </Card>

            <Card padding={0}>
              <VStack>
                <HStack padding={4}>
                  <Text type="label">Your workflows that read it</Text>
                </HStack>
                {usedBy.length ? (
                  <List>
                    {usedBy.map(w => (
                      <ListItem
                        key={w.href}
                        href={w.href}
                        startContent={<Icon icon={WorkflowIcon} size="sm" color="secondary" />}
                        label={w.name}
                        description={isReady ? 'Reads the latest version on its next run.' : 'Didn’t process on its last run, because this data wasn’t produced.'}
                        endContent={<Icon icon={ChevronRight} size="sm" color="secondary" />}
                      />
                    ))}
                  </List>
                ) : (
                  <EmptyState
                    isCompact
                    title="None yet"
                    description={isReady ? 'Use it in a new workflow, or add it to one from the board’s Library.' : `You can use it once ${owner}’s workflow produces it again.`}
                  />
                )}
              </VStack>
            </Card>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
