import {Icon} from '@astryxdesign/core/Icon';
import {HStack} from '@astryxdesign/core/Stack';
import {Text} from '@astryxdesign/core/Text';
import {Database, FileSpreadsheet, Plug, SquareTerminal, User, Workflow} from 'lucide-react';
import {type RefKind} from '../data';

export const REF_ICON: Record<RefKind, typeof Workflow> = {
  workflow: Workflow,
  step: SquareTerminal,
  dataset: Database,
  file: FileSpreadsheet,
  connection: Plug,
  person: User,
};



export function RefLabel({kind, label}: {kind: RefKind; label: string}) {
  return (
    <HStack gap={1} vAlign="center">
      <Icon icon={REF_ICON[kind]} size="xsm" color="secondary" />
      <Text type="supporting">{label}</Text>
    </HStack>
  );
}
