import {StatusText} from '@workspace/astryx-workflows/components/StatusText';
import {Icon} from '@astryxdesign/core/Icon';
import {HStack} from '@astryxdesign/core/Stack';
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

/** A step page's status, shown with the shared StatusText so it reads the same as everywhere else. */
export function StatusLabel({status}: {status: Status}) {
  return <StatusText status={STATUS[status]} />;
}

export function RefLabel({kind, label}: {kind: RefKind; label: string}) {
  return (
    <HStack gap={1} vAlign="center">
      <Icon icon={REF_ICON[kind]} size="xsm" color="secondary" />
      <Text type="supporting">{label}</Text>
    </HStack>
  );
}
