import {STATUSES} from '@workspace/astryx-workflows/components/StatusText';
import {useEffect, useState, type ReactElement} from 'react';
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
import {SHARED_DATA, sharedById} from './sharedData';
import {SharedDataPage} from './pages/SharedDataPage';
import {longDate, shortDate} from './dates';
import {RUN_DETAILS, failureKind, firstFailedTile, ranBetween, type TileRunDetail} from './runs';
import {HomePage} from './pages/HomePage';
import {HomePanel} from './pages/HomePanel';
import {TicketPage} from './pages/TicketPage';
import {ChatPage} from './pages/ChatPage';
import {CHATS} from './chats';
import {BuiltWorkflowPage, LiveWorkflowPage} from './pages/WorkflowPages';
import {timing} from './schedule';
import {PREFILLED_WORKFLOWS, type BuiltStage, type BuiltWorkflow, type Workflow as WorkflowData} from './workflow';
import {useToast} from '@astryxdesign/core/Toast';
import {WorkflowBuilderPage, boardFromWorkflow, sharedInputsOf, type LibraryItem, type SavedBoard} from './pages/WorkflowBuilder';

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

/** The tile a run opens on: the red tile where it first broke, or else the step waiting for approval. */
function firstRunTile(tiles: Record<string, TileRunDetail>): string | undefined {
  return firstFailedTile(tiles) ?? Object.entries(tiles).find(([, t]) => t.status === 'review')?.[0];
}

export default function App() {
  // A route can carry ?tile=<id>, which opens the board with that tile selected.
  const [route, query = ''] = useHashRoute().split('?');
  const selectTile = new URLSearchParams(query).get('tile') ?? undefined;
  // #home?panel=<page> opens that page in Home's side panel, such as #home?panel=workflow-1.
  const panelRoute = route === 'home' ? new URLSearchParams(query).get('panel') : null;
  // #workflow-new?data=<id> starts a new workflow with data someone shared as its first input.
  const startData = new URLSearchParams(query).get('data') ?? undefined;
  const openChat = CHATS.find(c => route === `chat-${c.id}`) ?? null;
  const [tasks, setTasks] = useState<Task[]>(TASKS);
  // Tickets the person approved here. A ticket's condition is read from the ticket plus this.
  const [approved, setApproved] = useState<number[]>([]);
  const [handoffs] = useState<Handoff[]>(SEED_HANDOFFS);
  // Workflows that come with the prototype, each stored as a board like a built one: its page and its Edit
  // board both read that board. Any of them can be deleted.
  const [prefilled, setPrefilled] = useState(() => PREFILLED_WORKFLOWS.map(w => ({workflow: w, name: w.name, saved: boardFromWorkflow(w)})));
  // Workflows saved from the board.
  const [built, setBuilt] = useState<BuiltWorkflow[]>([]);
  const toast = useToast();
  const pageId = Number(route.match(/^workflow-(\d+)$/)?.[1] ?? NaN);
  const editId = Number(route.match(/^workflow-edit-(\d+)$/)?.[1] ?? NaN);
  /**
   * A prefilled workflow's schedule as last saved from its board. A draft keeps its schedule but has no next
   * run until it's turned on.
   */
  const scheduleOf = (p: (typeof prefilled)[number]) => {
    const t = timing(p.saved.when ?? p.workflow.when);
    return p.workflow.isDraft ? {...t, nextRun: p.workflow.nextRun, nextRunAt: p.workflow.nextRunAt} : t;
  };
  const editingPrefilled = prefilled.find(p => p.workflow.id === editId) ?? null;
  const editingBuilt = built.find(w => w.id === editId) ?? null;
  // #workflow-N-run-K: run K (0 is the newest) of a prefilled workflow, shown on its board.
  const runMatch = route.match(/^workflow-(\d+)-run-(\d+)$/);
  const runOf = runMatch ? prefilled.find(p => p.workflow.id === Number(runMatch[1])) ?? null : null;
  const runIndex = runMatch ? Number(runMatch[2]) : -1;
  const runData = runOf?.workflow.runs[runIndex];
  const runTiles = runOf && runData ? RUN_DETAILS[runOf.workflow.id]?.[runData.period] : undefined;

  const turnOn = (name: string, columns: BuiltStage[][], saved: SavedBoard) => {
    if (editingPrefilled) {
      setPrefilled(prev => prev.map(p => (p === editingPrefilled ? {...p, name, saved} : p)));
      window.location.hash = `workflow-${editingPrefilled.workflow.id}`;
      return;
    }
    if (editingBuilt) {
      setBuilt(prev => prev.map(w => (w.id === editingBuilt.id ? {...w, name, columns, saved, ...timing(saved.when)} : w)));
      window.location.hash = `workflow-${editingBuilt.id}`;
      return;
    }
    const id = Math.max(...PREFILLED_WORKFLOWS.map(w => w.id), ...built.map(w => w.id)) + 1;
    const createdOn = longDate(new Date());
    setBuilt(prev => [...prev, {id, name, columns, saved, ...timing(saved.when), createdOn}]);
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
      ...scheduleOf(p),
      href: `#workflow-${p.workflow.id}`,
      lastFinished: p.workflow.runs.find(r => r.result === 'approved' || r.result === 'rerun')?.finished,
      isDraft: p.workflow.isDraft,
      sharedInputs: sharedInputsOf(p.saved),
      lastStopped: p.workflow.runs[0]?.result === 'stopped' ? p.workflow.runs[0].started : undefined,
    })),
    ...built.map(w => ({key: `b${w.id}`, name: w.name, schedule: w.schedule, nextRunAt: w.nextRunAt, href: `#workflow-${w.id}`, sharedInputs: sharedInputsOf(w.saved as SavedBoard)})),
  ];
  const homeItems = boardItems(tasks, approved, boardWorkflows, SHARED_DATA);
  const openCount = attentionCount(homeItems);
  const isHome = route === 'home';

  const markApproved = (id: number) => setApproved(prev => (prev.includes(id) ? prev : [...prev, id]));

  /**
   * The page for a ticket, workflow or shared data route, as a full page or in Home's side panel. Both use
   * this, so the panel always shows exactly the page. Null for any other route.
   */
  const detailPage = (r: string, isInPanel = false): {title: string; page: ReactElement} | null => {
    const tid = Number(r.match(/^ticket-(\d+)$/)?.[1] ?? NaN);
    if (TICKETS[tid]) {
      return {
        title: 'Task',
        page: (
          <TicketPage
            key={tid}
            id={tid}
            code={ticketCode.get(tid)}
            handoffs={handoffs}
            onApprove={markApproved}
            onUndoApprove={id => setApproved(prev => prev.filter(x => x !== id))}
            isInPanel={isInPanel}
          />
        ),
      };
    }
    const wid = Number(r.match(/^workflow-(\d+)$/)?.[1] ?? NaN);
    const p = prefilled.find(x => x.workflow.id === wid);
    if (p) {
      return {
        title: 'Workflow',
        page: <LiveWorkflowPage key={wid} workflow={{...p.workflow, ...scheduleOf(p)}} name={p.name} saved={p.saved} approved={approved} onDelete={() => deletePrefilled(p)} isInPanel={isInPanel} />,
      };
    }
    const b = built.find(x => x.id === wid);
    if (b) return {title: 'Workflow', page: <BuiltWorkflowPage key={wid} workflow={b} onDelete={() => deleteBuilt(b)} isInPanel={isInPanel} />};
    const d = sharedById(r.match(/^data-(.+)$/)?.[1] ?? '');
    if (d) return {title: 'Shared data', page: <SharedDataPage key={d.id} data={d} isInPanel={isInPanel} />};
    return null;
  };
  const fullPage = detailPage(route);
  const panel = panelRoute ? detailPage(panelRoute, true) : null;
  // Home's cards open their page in the side panel instead of leaving Home.
  const panelItems = homeItems.map(item => (item.href?.startsWith('#') ? {...item, href: `#home?panel=${item.href.slice(1)}`} : item));

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
                  isSelected={pageId === p.workflow.id || editId === p.workflow.id || runOf === p || (ticketId !== null && TICKETS[ticketId]?.workflow === p.workflow.name)}
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
      {fullPage ? (
        fullPage.page
      ) : runOf && runData && runTiles ? (
        <WorkflowBuilderPage
          key={route}
          editing={{name: runOf.name, href: `#workflow-${runOf.workflow.id}`, saved: runOf.saved}}
          // Opens, zoomed in, on the red tile where the run first broke, or else the step waiting for approval.
          selectTile={firstRunTile(runTiles)}
          viewRun={{
            title: `Run of ${runData.started}`,
            status: STATUSES[runData.result === 'stopped' ? 'failed' : runData.result === 'review' ? 'needsApproval' : 'done'],
            ran: ranBetween(runData.started, runData.finished),
            why: runData.result === 'stopped' ? failureKind(runTiles) : undefined,
            tiles: runTiles,
            editHref: `#workflow-edit-${runOf.workflow.id}`,
          }}
          library={library}
          onTurnOn={turnOn}
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
      ) : openChat ? (
        <ChatPage key={openChat.id} chat={openChat} />
      ) : (
        <>
          <HomePage items={panelItems} />
          <HomePanel route={panel ? panelRoute : null} title={panel?.title ?? ''} page={panel?.page} onClose={() => (window.location.hash = 'home')} />
        </>
      )}
    </AppShell>
  );
}
