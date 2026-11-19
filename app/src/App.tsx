import {useEffect, useState} from 'react';
import {AppShell} from '@astryxdesign/core/AppShell';
import {SideNav, SideNavHeading, SideNavItem, SideNavSection} from '@astryxdesign/core/SideNav';
import {NavIcon} from '@astryxdesign/core/NavIcon';
import {Icon} from '@astryxdesign/core/Icon';
import {IconButton} from '@astryxdesign/core/IconButton';
import {Text} from '@astryxdesign/core/Text';
import {
  Home as HomeIcon, Plus, UserCircle, Workflow,
} from 'lucide-react';
import {TASKS, TICKETS, type Task} from './data';
import {attentionCount, boardItems, ticketRun, type BoardWorkflow, type TileRun} from './tasks';
import {SEED_HANDOFFS, type Handoff} from './handoffs';
import {SHARED_DATA} from './sharedData';
import {HomePage} from './pages/HomePage';
import {TicketPage} from './pages/TicketPage';
import {ChatPage} from './pages/ChatPage';
import {CHATS} from './chats';
import {BuiltWorkflowPage, LiveWorkflowPage} from './pages/WorkflowPages';
import {SCHEDULES, PREFILLED_WORKFLOWS, type BuiltStage, type BuiltWorkflow, type Workflow as WorkflowData} from './workflow';
import {useToast} from '@astryxdesign/core/Toast';
import {WorkflowBuilderPage, boardFromWorkflow, type LibraryItem, type SavedBoard} from './pages/WorkflowBuilder';

function useHashRoute(): string {
  const read = () => window.location.hash.slice(1) || 'home';
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const onChange = () => setRoute(read());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

/** "Nov 17": the date of a chat's last message, for the sidebar. */
const shortDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', {month: 'short', day: 'numeric'});

export default function App() {
  // A route can carry ?tile=<id>, which opens the board with that tile selected.
  const [route, query = ''] = useHashRoute().split('?');
  const selectTile = new URLSearchParams(query).get('tile') ?? undefined;
  // #workflow-new?data=<id> starts a new workflow with data someone shared as its first input.
  const startData = new URLSearchParams(query).get('data') ?? undefined;
  const openChat = CHATS.find(c => route === `chat-${c.id}`) ?? null;
  const [tasks, setTasks] = useState<Task[]>(TASKS);
  // Tickets the person approved here. A ticket's condition is read from the ticket plus this.
  const [approved, setApproved] = useState<number[]>([]);
  const [handoffs, setHandoffs] = useState<Handoff[]>(SEED_HANDOFFS);
  // Workflows that come with the prototype, each stored as a board like a built one: its page and its Edit
  // board both read that board. Any of them can be deleted.
  const [prefilled, setPrefilled] = useState(() => PREFILLED_WORKFLOWS.map(w => ({workflow: w, name: w.name, saved: boardFromWorkflow(w)})));
  // Workflows saved from the board.
  const [built, setBuilt] = useState<BuiltWorkflow[]>([]);
  const toast = useToast();
  const pageId = Number(route.match(/^workflow-(\d+)$/)?.[1] ?? NaN);
  const editId = Number(route.match(/^workflow-edit-(\d+)$/)?.[1] ?? NaN);
  const openPrefilled = prefilled.find(p => p.workflow.id === pageId) ?? null;
  const openBuilt = built.find(w => w.id === pageId) ?? null;
  const editingPrefilled = prefilled.find(p => p.workflow.id === editId) ?? null;
  const editingBuilt = built.find(w => w.id === editId) ?? null;

  const turnOn = (name: string, columns: BuiltStage[][], saved: SavedBoard) => {
    if (editingPrefilled) {
      setPrefilled(prev => prev.map(p => (p === editingPrefilled ? {...p, name, saved} : p)));
      window.location.hash = `workflow-${editingPrefilled.workflow.id}`;
      return;
    }
    if (editingBuilt) {
      setBuilt(prev => prev.map(w => (w.id === editingBuilt.id ? {...w, name, columns, saved} : w)));
      window.location.hash = `workflow-${editingBuilt.id}`;
      return;
    }
    const id = Math.max(...PREFILLED_WORKFLOWS.map(w => w.id), ...built.map(w => w.id)) + 1;
    const createdOn = new Date().toLocaleDateString('en-US', {month: 'long', day: 'numeric'});
    setBuilt(prev => [...prev, {id, name, columns, saved, schedule: SCHEDULES[0], nextRun: PREFILLED_WORKFLOWS[0].nextRun, nextRunAt: PREFILLED_WORKFLOWS[0].nextRunAt, createdOn}]);
    window.location.hash = `workflow-${id}`;
  };
  const deleteBuilt = (w: BuiltWorkflow) => {
    setBuilt(prev => prev.filter(x => x.id !== w.id));
    window.location.hash = 'home';
    toast({body: `${w.name} is deleted.`});
  };
  const deletePrefilled = (p: (typeof prefilled)[number]) => {
    setPrefilled(prev => prev.filter(x => x !== p));
    setTasks(prev => prev.filter(t => TICKETS[t.ticketId].workflow !== p.workflow.name));
    window.location.hash = 'home';
    toast({body: `${p.name} is deleted.`});
  };

  // A prefilled workflow's tiles that have a ticket: each step with one, and the Handoff after a last step with one.
  const runsFor = (w: WorkflowData): Record<string, TileRun> => {
    const lastStep = w.steps[w.steps.length - 1];
    return Object.fromEntries([
      ...w.steps.flatMap(st => (st.ticketId ? [[st.id, ticketRun(st.ticketId, approved)]] : [])),
      ...(lastStep.ticketId ? [['out', ticketRun(lastStep.ticketId, approved)]] : []),
    ]);
  };

  // Saved workflows, as the board's Library lists them: Monthly sales close first, then the ones built here.
  const library: LibraryItem[] = [
    ...prefilled.map(p => ({key: `workflow-${p.workflow.id}`, name: p.name, href: `#workflow-edit-${p.workflow.id}`, saved: p.saved, isCurrent: editId === p.workflow.id})),
    ...built.map(w => ({key: `workflow-${w.id}`, name: w.name, href: `#workflow-edit-${w.id}`, saved: w.saved as SavedBoard, isCurrent: route === `workflow-edit-${w.id}`})),
  ];

  // Each ticket's code as its workflow's saved board has it, so an edit on the board shows on the ticket too.
  const ticketCode = new Map(
    prefilled.flatMap(p =>
      p.workflow.steps.flatMap(st => {
        const node = p.saved.board.find(n => n.id === st.id);
        return st.ticketId !== undefined && node?.step.kind === 'instructions' && node.step.python ? [[st.ticketId, node.step.python] as const] : [];
      }),
    ),
  );

  const ticketMatch = route.match(/^ticket-(\d+)$/);
  const ticketId = ticketMatch ? Number(ticketMatch[1]) : null;
  // Home's board: every workflow's next and last run, and every task read from its ticket.
  const boardWorkflows: BoardWorkflow[] = [
    ...prefilled.map(p => ({
      key: `p${p.workflow.id}`,
      name: p.name,
      schedule: p.workflow.schedule,
      nextRunAt: p.workflow.nextRunAt,
      href: `#workflow-${p.workflow.id}`,
      lastFinished: p.workflow.runs.find(r => r.result === 'approved' || r.result === 'rerun')?.finished,
      isDraft: p.workflow.isDraft,
    })),
    ...built.map(w => ({key: `b${w.id}`, name: w.name, schedule: w.schedule, nextRunAt: w.nextRunAt, href: `#workflow-${w.id}`})),
  ];
  const homeItems = boardItems(tasks, approved, boardWorkflows, SHARED_DATA);
  const openCount = attentionCount(homeItems);
  const isHome = route === 'home';

  const markApproved = (id: number) => setApproved(prev => (prev.includes(id) ? prev : [...prev, id]));

  return (
    <AppShell
      variant="elevated"
      contentPadding={0}
      sideNav={
        <SideNav
          collapsible
          header={
            <SideNavHeading
              heading="Workspace"
              headingHref="#home"
              icon={<NavIcon icon={<Icon icon={Workflow} size="sm" />} />}
            />
          }
          footer={
            <SideNavSection title="Account" isHeaderHidden>
              <SideNavItem label="Daniel" icon={UserCircle} />
            </SideNavSection>
          }>
          <SideNavSection title="Main" isHeaderHidden>
            <SideNavItem
              label="Home"
              icon={HomeIcon}
              href="#home"
              isSelected={isHome}
              endContent={<Text type="supporting" hasTabularNumbers>{String(openCount)}</Text>}
            />
            <SideNavItem
              label="Workflows"
              icon={Workflow}
              collapsible={{defaultIsCollapsed: false}}
              actions={<IconButton label="New workflow" tooltip="New workflow" icon={<Icon icon={Plus} />} href="#workflow-new" variant="ghost" size="sm" />}>
              {prefilled.map(p => (
                <SideNavItem
                  key={p.workflow.id}
                  label={p.name}
                  href={`#workflow-${p.workflow.id}`}
                  isSelected={pageId === p.workflow.id || editId === p.workflow.id || (ticketId !== null && TICKETS[ticketId]?.workflow === p.workflow.name)}
                />
              ))}
              {built.map(w => (
                <SideNavItem key={w.id} label={w.name} href={`#workflow-${w.id}`} isSelected={route === `workflow-${w.id}` || route === `workflow-edit-${w.id}`} />
              ))}
            </SideNavItem>
          </SideNavSection>
          {/* The lower part of the sidebar: past conversations with the agent, newest first. */}
          <SideNavSection title="Chat history">
            {CHATS.map(c => (
              <SideNavItem
                key={c.id}
                label={c.title}
                href={`#chat-${c.id}`}
                isSelected={route === `chat-${c.id}`}
                endContent={<Text type="supporting" hasTabularNumbers>{shortDate(c.updatedAt)}</Text>}
              />
            ))}
          </SideNavSection>
        </SideNav>
      }>
      {ticketId !== null ? (
        <TicketPage
          key={ticketId}
          id={ticketId}
          code={ticketCode.get(ticketId)}
          handoffs={handoffs}
          onApprove={markApproved}
          onUndoApprove={tid => setApproved(prev => prev.filter(x => x !== tid))}
          onRemoveHandoff={hid => setHandoffs(prev => prev.filter(h => h.id !== hid))}
        />
      ) : route === 'workflow-new' || editingPrefilled || editingBuilt ? (
        <WorkflowBuilderPage
          // A different ?tile= opens the board fresh with that tile selected.
          key={`${route}?${query}`}
          editing={
            editingBuilt
              ? {name: editingBuilt.name, href: `#workflow-${editingBuilt.id}`, saved: editingBuilt.saved as SavedBoard}
              : editingPrefilled
                ? {name: editingPrefilled.name, href: `#workflow-${editingPrefilled.workflow.id}`, saved: editingPrefilled.saved, runs: runsFor(editingPrefilled.workflow)}
                : undefined
          }
          selectTile={selectTile}
          startData={route === 'workflow-new' ? startData : undefined}
          library={library}
          onTurnOn={turnOn}
        />
      ) : openPrefilled ? (
        <LiveWorkflowPage
          key={openPrefilled.workflow.id}
          workflow={openPrefilled.workflow}
          name={openPrefilled.name}
          saved={openPrefilled.saved}
          approved={approved}
          onDelete={() => deletePrefilled(openPrefilled)}
        />
      ) : openBuilt ? (
        <BuiltWorkflowPage key={openBuilt.id} workflow={openBuilt} onDelete={() => deleteBuilt(openBuilt)} />
      ) : (
        openChat ? <ChatPage key={openChat.id} chat={openChat} /> : <HomePage items={homeItems} />
      )}
    </AppShell>
  );
}
