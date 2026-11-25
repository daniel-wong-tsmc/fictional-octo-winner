import {useId, useState, type ReactNode} from 'react';
import {TabList, Tab} from '@astryxdesign/core/TabList';
import {VStack} from '@astryxdesign/core/Stack';
import {Divider} from '@astryxdesign/core/Divider';
import {WorkflowSheetTable, type WorkflowSheet} from './WorkflowSheetTable';

/** One sheet of a file. note is shown above its rows, such as what the preview covers or that the step doesn't read it. */
export type WorkflowWorkbookSheet = {name: string; sheet: WorkflowSheet; note?: ReactNode};

/**
 * A file's sheets, shown like a spreadsheet app: the selected sheet's rows, with a tab for each sheet under them.
 * A file with one sheet shows just its rows and no tabs. Give it a key per file so a new file opens on its first sheet.
 */
export function WorkflowWorkbook({sheets, fileName, defaultSheet}: {
  sheets: WorkflowWorkbookSheet[];
  /** Names the tabs for screen readers: "Sheets in <fileName>". */
  fileName: string;
  /** The sheet to open on. Defaults to the first. */
  defaultSheet?: string;
}) {
  const panelId = useId();
  const [selected, setSelected] = useState(defaultSheet ?? sheets[0].name);
  const current = sheets.find(s => s.name === selected) ?? sheets[0];
  const hasTabs = sheets.length > 1;
  return (
    <VStack>
      {current.note}
      <VStack id={panelId} role={hasTabs ? 'tabpanel' : undefined} aria-label={hasTabs ? current.name : undefined}>
        <WorkflowSheetTable sheet={current.sheet} />
      </VStack>
      {hasTabs && <Divider />}
      {hasTabs && (
        <TabList value={current.name} onChange={setSelected} size="sm" role="tablist" aria-label={`Sheets in ${fileName}`}>
          {sheets.map(s => <Tab key={s.name} value={s.name} label={s.name} panelId={panelId} />)}
        </TabList>
      )}
    </VStack>
  );
}
