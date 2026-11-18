import {useState} from 'react';
import {Layout, LayoutContent, LayoutFooter} from '@astryxdesign/core/Layout';
import {HStack, VStack} from '@astryxdesign/core/Stack';
import {Text} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {TextArea} from '@astryxdesign/core/TextArea';
import {TextInput} from '@astryxdesign/core/TextInput';
import {List, ListItem} from '@astryxdesign/core/List';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import {Dialog, DialogHeader} from '@astryxdesign/core/Dialog';
import {Icon} from '@astryxdesign/core/Icon';
import {useToast} from '@astryxdesign/core/Toast';
import {ArrowRight} from 'lucide-react';
import {
  WorkflowOverview, type WorkflowStage, type WorkflowTone,
} from '@workspace/astryx-workflows/components/WorkflowOverview';
import {MONTHLY_SALES_CLOSE, type BuiltWorkflow, type StepRunStatus, type WorkflowStep} from '../workflow';
import type {Handoff} from '../handoffs';

const SOURCE_LABEL = {
  connected: {dot: 'success', label: 'Connected'},
  needsConnection: {dot: 'warning', label: 'Needs connection'},
  handoff: {dot: 'info', label: 'From another workflow'},
  upload: {dot: 'neutral', label: 'Uploaded'},
} as const;

/* ---------- Step detail ---------- */

function StepDialog({step, index, isEditable, onClose, onSave}: {
  step: WorkflowStep;
  index: number;
  isEditable: boolean;
  onClose: () => void;
  onSave?: (s: WorkflowStep) => void;
}) {
  const toast = useToast();
  const [name, setName] = useState(step.name);
  const [does, setDoes] = useState(step.does);
  return (
    <Dialog isOpen onOpenChange={open => !open && onClose()} width={520} purpose={isEditable ? 'form' : 'info'}>
      <Layout
        height="auto"
        header={<DialogHeader title={`Step ${index + 1}: ${step.name}`} subtitle={isEditable ? 'Change anything that’s wrong.' : undefined} onOpenChange={open => !open && onClose()} />}
        content={
          <LayoutContent padding={4}>
            <VStack gap={4}>
              {isEditable ? (
                <>
                  <TextInput label="Step name" value={name} onChange={setName} />
                  <TextArea label="What happens" value={does} onChange={setDoes} rows={3} />
                </>
              ) : (
                <VStack gap={1}>
                  <Text type="label">What happens</Text>
                  <Text>{step.does}</Text>
                </VStack>
              )}
              <List header={<Text type="label">Uses</Text>} hasDividers edge="outset">
                {step.inputs.map(input => {
                  const src = SOURCE_LABEL[input.status];
                  return (
                    <ListItem
                      key={input.label}
                      label={<Text>{input.label}</Text>}
                      description={
                        <HStack gap={1.5} vAlign="center">
                          <StatusDot variant={src.dot} label={src.label} />
                          <Text type="supporting">{`${src.label} · ${input.detail}`}</Text>
                        </HStack>
                      }
                      endContent={
                        input.status === 'needsConnection' ? (
                          <Button
                            label="Request access"
                            size="sm"
                            onClick={() => toast({body: `Asked your workspace admin to connect ${input.label}. Setup can carry on meanwhile.`})}
                          />
                        ) : undefined
                      }
                    />
                  );
                })}
              </List>
              <VStack gap={1}>
                <Text type="label">Produces</Text>
                <HStack gap={1.5} vAlign="center">
                  <Icon icon={ArrowRight} size="sm" color="secondary" />
                  <Text>{step.output}</Text>
                </HStack>
              </VStack>
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter padding={4}>
            <HStack gap={2} hAlign="end">
              {isEditable ? (
                <>
                  <Button label="Cancel" variant="ghost" onClick={onClose} />
                  <Button label="Save step" variant="primary" onClick={() => onSave?.({...step, name: name.trim() || step.name, does})} />
                </>
              ) : (
                <Button label="Close" onClick={onClose} />
              )}
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}

/* ---------- Workflow pages ----------
 * Every workflow page is the WorkflowOverview component from the app's Astryx integration
 * (app/astryx-workflows). These functions only map a workflow's data into its props.
 */

const STEP_STATUS: Record<StepRunStatus, {tone: WorkflowTone; label: string}> = {
  done: {tone: 'success', label: 'Done'},
  review: {tone: 'info', label: 'Needs your OK'},
  waiting: {tone: 'warning', label: 'Waiting'},
  draft: {tone: 'neutral', label: 'Draft'},
};
const NOT_RUN = {tone: 'neutral' as const, label: 'Not run yet'};
const RUN_TONE = {review: 'info', approved: 'success', rerun: 'success'} as const;
const runNow = (toast: ReturnType<typeof useToast>) => () => toast({body: 'Preview only. Running a workflow comes with the real build.'});
const handoffDetail = (h: Handoff) => `${h.value ?? ''} · used by ${h.usedBy.length ? h.usedBy.join(', ') : 'nothing yet'}`;

export function LiveWorkflowPage({handoffs, isStep3Approved, onDelete}: {handoffs: Handoff[]; isStep3Approved: boolean; onDelete: () => void}) {
  const toast = useToast();
  const w = MONTHLY_SALES_CLOSE;
  const steps = w.steps.map(s => (s.ticketId === 3 && isStep3Approved ? {...s, status: 'done' as const} : s));
  const [openStep, setOpenStep] = useState<number | null>(null);

  // Inputs first, then each step, then where the result goes: the same order a board-built workflow uses.
  const inputs: WorkflowStage[] = steps.flatMap((s, i) =>
    s.inputs.map((input, k) => ({
      id: `${s.id}-in-${k}`, kind: 'input' as const, title: input.label, detail: input.detail,
      notes: [`Goes to Step ${i + 1}: ${s.name}`],
      status: input.status === 'handoff' ? {tone: 'info' as const, label: 'From a workflow'} : input.status === 'needsConnection' ? {tone: 'warning' as const, label: 'Not connected'} : {tone: 'success' as const, label: 'Connected'},
    })),
  );
  const stepStages: WorkflowStage[][] = steps.map((s, i) => [
    {id: s.id, kind: 'step', title: `Step ${i + 1}: ${s.name}`, detail: s.does, notes: [`Makes: ${s.output}`], status: STEP_STATUS[s.status]},
  ]);
  const last = steps[steps.length - 1];
  const output: WorkflowStage = {
    id: 'out', kind: 'output', title: last.output, detail: 'Excel sheet',
    notes: [`Waits for an OK from ${w.approver}`, `Goes to ${w.destinations.join(', ')}`],
    status: isStep3Approved ? {tone: 'success', label: 'Sent'} : {tone: 'info', label: 'Waiting for OK'},
  };
  const runs = w.runs.map(r =>
    r.result === 'review' && isStep3Approved
      ? {period: r.period, tone: 'success' as const, result: 'Approved by Daniel', finished: r.finished}
      : {period: r.period, tone: RUN_TONE[r.result], result: r.detail, finished: r.finished},
  );

  return (
    <>
      <WorkflowOverview
        name={w.name}
        summary={w.description}
        schedule={w.schedule}
        nextRun={w.nextRun}
        approvers={[w.approver]}
        sendTo={w.destinations}
        columns={[inputs, ...stepStages, [output]]}
        onOpenStage={st => {
          const step = steps.find(s => s.id === st.id);
          if (step?.ticketId) window.location.hash = `ticket-${step.ticketId}`;
          else if (step) setOpenStep(steps.indexOf(step));
          else if (st.kind === 'output') window.location.hash = 'ticket-3';
        }}
        uses={handoffs.filter(h => w.uses.includes(h.id)).map(h => ({id: h.id, name: h.name, detail: `From ${h.workflow} · ${h.value ?? ''}`}))}
        shares={handoffs.filter(h => h.workflow === w.name).map(h => ({id: h.id, name: h.name, detail: handoffDetail(h)}))}
        runs={runs}
        editHref="#workflow-edit"
        onRunNow={runNow(toast)}
        onDelete={onDelete}
      />
      {openStep !== null && (
        <StepDialog key={openStep} step={steps[openStep]} index={openStep} isEditable={false} onClose={() => setOpenStep(null)} />
      )}
    </>
  );
}

export function BuiltWorkflowPage({workflow: w, onDelete}: {workflow: BuiltWorkflow; onDelete: () => void}) {
  const toast = useToast();
  const stages = w.columns.flat();
  const outputs = stages.filter(s => s.kind === 'output');
  const count = (k: string) => stages.filter(s => s.kind === k).length;
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const columns: WorkflowStage[][] = w.columns.map(col =>
    col.map(st => ({
      id: st.id,
      kind: st.kind === 'instructions' ? 'step' : st.kind,
      title: st.title,
      detail: st.detail,
      notes:
        st.kind === 'output'
          ? [st.approver ? `Waits for an OK from ${st.approver}` : 'Goes out without an OK', `Goes to ${st.sendTo?.length ? st.sendTo.join(', ') : 'nobody yet'}`]
          : st.feeds?.length ? [`Goes to ${st.feeds.join(', ')}`] : undefined,
      status: NOT_RUN,
    })),
  );
  return (
    <WorkflowOverview
      name={w.name}
      summary={`${plural(count('input'), 'input', 'inputs')}, ${plural(count('instructions'), 'LLM step', 'LLM steps')}, ${plural(count('output'), 'pass on to', 'pass on tos')}. Turned on ${w.createdOn}.`}
      schedule={w.schedule}
      nextRun={w.nextRun}
      approvers={[...new Set(outputs.map(o => o.approver).filter((a): a is string => !!a))]}
      sendTo={[...new Set(outputs.flatMap(o => o.sendTo ?? []))]}
      columns={columns}
      onOpenStage={() => (window.location.hash = `workflow-edit-${w.id}`)}
      uses={[]}
      shares={[]}
      runs={[]}
      editHref={`#workflow-edit-${w.id}`}
      onRunNow={runNow(toast)}
      onDelete={onDelete}
    />
  );
}
