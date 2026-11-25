import type {ReactNode} from 'react';
import {HStack, VStack} from '@astryxdesign/core/Stack';
import {Text} from '@astryxdesign/core/Text';
import {Card} from '@astryxdesign/core/Card';
import {ClickableCard} from '@astryxdesign/core/ClickableCard';
import {StatusText} from './StatusText';
import {Icon} from '@astryxdesign/core/Icon';
import {MetadataList, MetadataListItem} from '@astryxdesign/core/MetadataList';
import {Database, Send, WandSparkles} from 'lucide-react';

/** The three kinds of tile a workflow is made of. */
export type WorkflowTileKind = 'input' | 'step' | 'output';

export type WorkflowTileTone = 'success' | 'info' | 'warning' | 'error' | 'neutral';

/**
 * Name, icon and one-line hint for each kind. The board toolbar and the board tiles both
 * read from here, so a kind is named and drawn the same way everywhere.
 */
export const WORKFLOW_TILE_KINDS: Record<WorkflowTileKind, {label: string; icon: typeof Send; hint: string}> = {
  input: {label: 'Input', icon: Database, hint: 'Excel upload, an app through MCP, or data shared with you'},
  step: {label: 'LLM', icon: WandSparkles, hint: 'Tell the AI what to do with the data'},
  output: {label: 'Handoff', icon: Send, hint: 'Who gets the result, and who approves it'},
};

/** How an input gets its data. */
export type WorkflowInputVia = 'upload' | 'mcp' | 'workflow' | 'shared';

/**
 * What a tile says, by kind. Each field is one setting of the tile, and each kind always shows the same
 * details in the same order:
 * - Input: title is the source; details From, Reads.
 * - LLM: title is "Step N" (plus its name when it has one); details Instructions.
 * Where a tile leads is shown by the lines or arrows around it, not in its text.
 * - Handoff: title is the output's name; details Format, Approver, Sends to.
 */
export type WorkflowTileContent =
  | {
      kind: 'input';
      /** The file or app the data comes from. Empty until it is chosen. */
      source: string;
      via: WorkflowInputVia | null;
      /** Sheets, table or value it reads. */
      reads: string;
    }
  | {
      kind: 'step';
      /** Position among the LLM steps, counting from 1. */
      number: number;
      /** Short name, when the step has one. */
      name?: string;
      /** What the AI is told to do. */
      instructions: string;
    }
  | {
      kind: 'output';
      name: string;
      format: string;
      /** Who approves it before it goes out. Empty means it goes out without approval. */
      approver: string;
      sendTo: string[];
    };

const VIA_LABEL: Record<WorkflowInputVia, string> = {
  upload: 'Excel upload',
  mcp: 'App, through MCP',
  workflow: 'Another workflow',
  shared: 'Shared with you',
};
const NOT_SET = 'Not set yet';
/** Fits the longest label, "Instructions", so values start in one column. */
const LABEL_WIDTH = 84;

/** The title and labeled details for a tile. Exported so text versions (search, tooltips) match the tile. */
export function tileText(c: WorkflowTileContent): {title: string; details: {label: string; value: string}[]} {
  if (c.kind === 'input') {
    return {
      title: c.source || 'Add your data',
      details: [
        {label: 'From', value: c.via ? VIA_LABEL[c.via] : NOT_SET},
        {label: 'Reads', value: c.reads || NOT_SET},
      ],
    };
  }
  if (c.kind === 'step') {
    return {
      title: c.name ? `Step ${c.number}: ${c.name}` : `Step ${c.number}`,
      details: [
        {label: 'Instructions', value: c.instructions || NOT_SET},
      ],
    };
  }
  return {
    title: c.name || 'Output',
    details: [
      {label: 'Format', value: c.format || NOT_SET},
      {label: 'Approver', value: c.approver || 'Nobody, it goes straight out'},
      {label: 'Sends to', value: c.sendTo.length ? c.sendTo.join(', ') : 'Nobody yet'},
    ],
  };
}

export type WorkflowTileProps = {
  /** What the tile says. The kind decides which details it shows. */
  content: WorkflowTileContent;
  status?: {tone: WorkflowTileTone; label: string};
  /** Actions or results shown at the bottom, such as a See output button. */
  footer?: ReactNode;
  /** Cuts each detail to this many lines, for small tiles such as those on a board. */
  detailMaxLines?: number;
  /** inline puts each label beside its value, for wide tiles such as those on a board; stacked puts it above, for narrow ones. */
  detailLayout?: 'inline' | 'stacked';
  width?: number | string;
  /** Raised for a tile that is selected or needs attention. */
  elevation?: 'none' | 'low' | 'high';
  /**
   * How much the tile stands out. failed turns it red and raises it, for the tile where a run stopped; muted
   * greys it, for tiles that didn't run. Leave it out for a normal tile.
   */
  emphasis?: 'failed' | 'muted';
  /** Makes the whole tile a button. Leave it out when something else, such as a board, handles clicks. */
  onClick?: () => void;
};

/**
 * One tile of a workflow: an Input, an LLM step or a Handoff. Used for every tile on the workflow board,
 * so a tile looks and reads the same wherever it appears.
 */
export function WorkflowTile({content, status, footer, detailMaxLines, detailLayout = 'stacked', width = '100%', elevation = 'none', emphasis, onClick}: WorkflowTileProps) {
  const variant = emphasis === 'failed' ? 'red' : emphasis === 'muted' ? 'muted' : 'default';
  const raised = emphasis === 'failed' ? 'high' : elevation;
  const info = WORKFLOW_TILE_KINDS[content.kind];
  const {title, details} = tileText(content);
  const body = (
    <VStack gap={2}>
      <HStack gap={2} hAlign="between" vAlign="center" wrap="wrap">
        <HStack gap={1.5} vAlign="center">
          <Icon icon={info.icon} size="sm" color="secondary" />
          <Text type="supporting" weight="medium">{info.label}</Text>
        </HStack>
        {status && <StatusText status={status} />}
      </HStack>
      <Text weight="semibold">{title}</Text>
      {/* Each detail is its label, then its value: the same labels in the same order for every tile of a kind. */}
      <MetadataList label={{position: detailLayout === 'inline' ? 'start' : 'top', width: LABEL_WIDTH}}>
        {details.map(d => (
          <MetadataListItem key={d.label} label={d.label}>
            <Text type="supporting" maxLines={detailMaxLines}>{d.value}</Text>
          </MetadataListItem>
        ))}
      </MetadataList>
      {footer}
    </VStack>
  );
  return onClick ? (
    <ClickableCard label={`Open ${info.label}: ${title}`} onClick={onClick} padding={3} width={width} elevation={raised} variant={variant}>
      {body}
    </ClickableCard>
  ) : (
    <Card padding={3} width={width} elevation={raised} variant={variant}>
      {body}
    </Card>
  );
}
