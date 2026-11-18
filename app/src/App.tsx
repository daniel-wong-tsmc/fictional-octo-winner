import {useEffect, useState} from 'react';
import {AppShell} from '@astryxdesign/core/AppShell';
import {SideNav, SideNavHeading, SideNavItem, SideNavSection} from '@astryxdesign/core/SideNav';
import {NavIcon} from '@astryxdesign/core/NavIcon';
import {Icon} from '@astryxdesign/core/Icon';
import {Text} from '@astryxdesign/core/Text';
import {
  Home as HomeIcon, Plus, UserCircle, Workflow,
} from 'lucide-react';
import {TASKS, TICKETS, ticketCondition, type Task} from './data';
import {SEED_HANDOFFS, type Handoff} from './handoffs';
import {HomePage} from './pages/HomePage';
import {TicketPage} from './pages/TicketPage';
import {BuiltWorkflowPage, LiveWorkflowPage} from './pages/WorkflowPages';
import {SCHEDULES, MONTHLY_SALES_CLOSE, type BuiltStage, type BuiltWorkflow} from './workflow';
import {useToast} from '@astryxdesign/core/Toast';
import {WorkflowBuilderPage, type SavedBoard} from './pages/WorkflowBuilder';

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

export default function App() {
  const route = useHashRoute();
  const [tasks, setTasks] = useState<Task[]>(TASKS);
  // Tickets the person approved here. A ticket's condition is read from the ticket plus this.
  const [approved, setApproved] = useState<number[]>([]);
  const [handoffs, setHandoffs] = useState<Handoff[]>(SEED_HANDOFFS);
  // Workflows turned on from the board. Monthly sales close is the prefilled one and can be deleted too.
  const [built, setBuilt] = useState<BuiltWorkflow[]>([]);
  const [hasSalesClose, setHasSalesClose] = useState(true);
  const toast = useToast();
  const builtMatch = route.match(/^workflow-(\d+)$/);
  const openBuilt = builtMatch ? built.find(w => w.id === Number(builtMatch[1])) ?? null : null;
  const editMatch = route.match(/^workflow-edit-(\d+)$/);
  const editingBuilt = editMatch ? built.find(w => w.id === Number(editMatch[1])) ?? null : null;

  const turnOn = (name: string, columns: BuiltStage[][], saved: SavedBoard) => {
    if (editingBuilt) {
      setBuilt(prev => prev.map(w => (w.id === editingBuilt.id ? {...w, name, columns, saved} : w)));
      window.location.hash = `workflow-${editingBuilt.id}`;
      return;
    }
    const id = Math.max(1, ...built.map(w => w.id)) + 1;
    const createdOn = new Date().toLocaleDateString('en-US', {month: 'long', day: 'numeric'});
    setBuilt(prev => [...prev, {id, name, columns, saved, schedule: SCHEDULES[0], nextRun: MONTHLY_SALES_CLOSE.nextRun, createdOn}]);
    window.location.hash = `workflow-${id}`;
  };
  const deleteBuilt = (w: BuiltWorkflow) => {
    setBuilt(prev => prev.filter(x => x.id !== w.id));
    window.location.hash = 'home';
    toast({body: `${w.name} is deleted.`});
  };
  const deleteSalesClose = () => {
    setHasSalesClose(false);
    setTasks(prev => prev.filter(t => TICKETS[t.ticketId].workflow !== MONTHLY_SALES_CLOSE.name));
    window.location.hash = 'home';
    toast({body: `${MONTHLY_SALES_CLOSE.name} is deleted.`});
  };

  const ticketMatch = route.match(/^ticket-(\d+)$/);
  const ticketId = ticketMatch ? Number(ticketMatch[1]) : null;
  const openCount = tasks.filter(t => ticketCondition(TICKETS[t.ticketId], approved.includes(t.ticketId)) !== 'complete').length;
  const isHome = route === 'home';
  const isStep3Approved = approved.includes(3);

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
            <SideNavItem label="Workflows" icon={Workflow} collapsible={{defaultIsCollapsed: false}}>
              {hasSalesClose && (
                <SideNavItem label="Monthly sales close" href="#workflow-1" isSelected={route === 'workflow-1' || route === 'workflow-edit' || ticketId === 3} />
              )}
              {built.map(w => (
                <SideNavItem key={w.id} label={w.name} href={`#workflow-${w.id}`} isSelected={route === `workflow-${w.id}` || route === `workflow-edit-${w.id}`} />
              ))}
              <SideNavItem label="New workflow" icon={Plus} href="#workflow-new" isSelected={route === 'workflow-new'} />
            </SideNavItem>
          </SideNavSection>
        </SideNav>
      }>
      {ticketId !== null ? (
        <TicketPage
          key={ticketId}
          id={ticketId}
          handoffs={handoffs}
          onApprove={markApproved}
          onUndoApprove={tid => setApproved(prev => prev.filter(x => x !== tid))}
          onAddHandoff={h => setHandoffs(prev => [...prev, h])}
          onRemoveHandoff={hid => setHandoffs(prev => prev.filter(h => h.id !== hid))}
        />
      ) : route === 'workflow-new' || route === 'workflow-edit' || editingBuilt ? (
        <WorkflowBuilderPage
          key={route}
          editing={
            editingBuilt
              ? {name: editingBuilt.name, href: `#workflow-${editingBuilt.id}`, saved: editingBuilt.saved as SavedBoard}
              : route === 'workflow-edit' ? {name: MONTHLY_SALES_CLOSE.name, href: '#workflow-1'} : undefined
          }
          onTurnOn={(name, columns, saved) => (route === 'workflow-edit' ? (window.location.hash = 'workflow-1') : turnOn(name, columns, saved))}
        />
      ) : route === 'workflow-1' && hasSalesClose ? (
        <LiveWorkflowPage handoffs={handoffs} isStep3Approved={isStep3Approved} onDelete={deleteSalesClose} />
      ) : openBuilt ? (
        <BuiltWorkflowPage key={openBuilt.id} workflow={openBuilt} onDelete={() => deleteBuilt(openBuilt)} />
      ) : (
        <HomePage tasks={tasks} approved={approved} />
      )}
    </AppShell>
  );
}
