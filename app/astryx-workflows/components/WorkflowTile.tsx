import type {ReactNode} from 'react';
import {HStack, VStack} from '@astryxdesign/core/Stack';
import {Text} from '@astryxdesign/core/Text';
import {Card} from '@astryxdesign/core/Card';
import {ClickableCard} from '@astryxdesign/core/ClickableCard';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import {Divider} from '@astryxdesign/core/Divider';
import {Icon} from '@astryxdesign/core/Icon';
import {Database, Send, WandSparkles} from 'lucide-react';

/** The three kinds of tile a workflow is made of. */
export type WorkflowTileKind = 'input' | 'step' | 'output';

export type WorkflowTileTone = 'success' | 'info' | 'warning' | 'error' | 'neutral';

/**
 * Name, icon and one-line hint for each kind. The board toolbar, the board tiles and the workflow page all
 * read from here, so a kind is named and drawn the same way everywhere.
 */
export const WORKFLOW_TILE_KINDS: Record<WorkflowTileKind, {label: string; icon: typeof Send; hint: string}> = {
  input: {label: 'Input', icon: Database, hint: 'Excel upload or an app through MCP'},
  step: {label: 'LLM', icon: WandSparkles, hint: 'Tell the AI what to do with the data'},
  output: {label: 'Pass on to', icon: Send, hint: 'Who gets the result, and who OKs it'},
};

export type WorkflowTileProps = {
  kind: WorkflowTileKind;
  /** Name of the source, step or output. */
  title: string;
  /** Where the data comes from, the AI's instructions, or where the result goes. */
  detail: string;
  status?: {tone: WorkflowTileTone; label: string};
  /** Extra facts shown under a divider, such as who gives the OK or which step an input feeds. */
  notes?: string[];
  /** Actions or results shown at the bottom, such as a See output button. */
  footer?: ReactNode;
  /** Cuts the detail to this many lines. */
  detailMaxLines?: number;
  width?: number | string;
  /** Raised for a tile that is selected or needs attention. */
  elevation?: 'none' | 'low' | 'high';
  /** Makes the whole tile a button. Leave it out when something else, such as a board, handles clicks. */
  onClick?: () => void;
};

/**
 * One tile of a workflow: an Input, an LLM step or a Pass on to. Used on the workflow board and on every
 * workflow page, so a tile looks the same wherever it appears.
 */
export function WorkflowTile({kind, title, detail, status, notes, footer, detailMaxLines, width = '100%', elevation = 'none', onClick}: WorkflowTileProps) {
  const info = WORKFLOW_TILE_KINDS[kind];
  const body = (
    <VStack gap={2}>
      <HStack gap={2} hAlign="between" vAlign="center" wrap="wrap">
        <HStack gap={1.5} vAlign="center">
          <Icon icon={info.icon} size="sm" color="secondary" />
          <Text type="supporting" weight="medium">{info.label}</Text>
        </HStack>
        {status && (
          <HStack gap={1} vAlign="center">
            <StatusDot variant={status.tone} label={status.label} />
            <Text type="supporting">{status.label}</Text>
          </HStack>
        )}
      </HStack>
      <Text weight="semibold">{title}</Text>
      <Text type="supporting" maxLines={detailMaxLines}>{detail}</Text>
      {!!notes?.length && (
        <>
          <Divider />
          {notes.map(n => <Text key={n} type="supporting">{n}</Text>)}
        </>
      )}
      {footer}
    </VStack>
  );
  return onClick ? (
    <ClickableCard label={`Open ${info.label}: ${title}`} onClick={onClick} padding={3} width={width} elevation={elevation}>
      {body}
    </ClickableCard>
  ) : (
    <Card padding={3} width={width} elevation={elevation}>
      {body}
    </Card>
  );
}
