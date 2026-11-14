import {Icon} from '@astryxdesign/core/Icon';
import {HStack} from '@astryxdesign/core/Stack';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import {Text} from '@astryxdesign/core/Text';
import {Database, FileSpreadsheet, Plug, SquareTerminal, Workflow} from 'lucide-react';
import {STATUS, type RefKind, type Status} from '../data';

export const REF_ICON: Record<RefKind, typeof Workflow> = {
  workflow: Workflow,
  step: SquareTerminal,
  dataset: Database,
  file: FileSpreadsheet,
  connection: Plug,
};

/** Status shown as a coloured dot plus words, so colour is never the only signal. */
export function StatusLabel({status}: {status: Status}) {
  const s = STATUS[status];
  return (
    <HStack gap={1.5} vAlign="center">
      <StatusDot variant={s.dot} label={s.label} />
      <Text type="supporting" weight="medium">{s.label}</Text>
    </HStack>
  );
}

export function RefLabel({kind, label}: {kind: RefKind; label: string}) {
  return (
    <HStack gap={1} vAlign="center">
      <Icon icon={REF_ICON[kind]} size="xsm" color="secondary" />
      <Text type="supporting">{label}</Text>
    </HStack>
  );
}
