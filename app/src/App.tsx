import {useEffect, useState} from 'react';
import {AppShell} from '@astryxdesign/core/AppShell';
import {SideNav, SideNavHeading, SideNavItem, SideNavSection} from '@astryxdesign/core/SideNav';
import {NavIcon} from '@astryxdesign/core/NavIcon';
import {Icon} from '@astryxdesign/core/Icon';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Badge} from '@astryxdesign/core/Badge';
import {
  BarChart3, Database, Home as HomeIcon, PlayCircle, Plus, Search, Tag, UserCircle, Workflow,
} from 'lucide-react';
import {TASKS, type Task} from './data';
import {SEED_HANDOFFS, type Handoff} from './handoffs';
import {HomePage} from './pages/HomePage';
import {TicketPage} from './pages/TicketPage';
import {CreateWorkflowPage, DraftWorkflowPage, LiveWorkflowPage} from './pages/WorkflowPages';

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
  const [handoffs, setHandoffs] = useState<Handoff[]>(SEED_HANDOFFS);
  const [query, setQuery] = useState('');

  const ticketMatch = route.match(/^ticket-(\d+)$/);
  const ticketId = ticketMatch ? Number(ticketMatch[1]) : null;
  const openCount = tasks.filter(t => t.group !== 'done').length;
  const isHome = route === 'home';
  const isStep3Approved = tasks.some(t => t.ticketId === 3 && t.group === 'done');

  const markApproved = (id: number) =>
    setTasks(prev => prev.map(t => (t.ticketId === id ? {...t, group: 'done', status: 'done'} : t)));

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
          topContent={
            <TextInput
                type="search"
                label="Search"
                isLabelHidden
                placeholder="Search"
                startIcon={Search}
                size="sm"
                value={query}
                onChange={setQuery}
              />
          }
          footer={
            <SideNavSection title="Account" isHeaderHidden>
              <SideNavItem label="Daniel" icon={UserCircle} href="#home" />
            </SideNavSection>
          }>
          <SideNavSection title="Main" isHeaderHidden>
            <SideNavItem
              label="Home"
              icon={HomeIcon}
              href="#home"
              isSelected={isHome}
              endContent={<Badge label={String(openCount)} />}
            />
            <SideNavItem label="Workflows" icon={Workflow} collapsible={{defaultIsCollapsed: false}}>
              <SideNavItem label="Monthly sales close" href="#workflow-1" isSelected={route === 'workflow-1' || ticketId === 3} />
              <SideNavItem label="New workflow" icon={Plus} href="#workflow-new" isSelected={route === 'workflow-new' || route === 'workflow-draft'} />
            </SideNavItem>
            <SideNavItem label="Datasets" icon={Database} href="#home" />
            <SideNavItem label="Runs" icon={PlayCircle} href="#home" />
            <SideNavItem label="Analytics" icon={BarChart3} href="#home" />
            <SideNavItem label="Tags" icon={Tag} href="#home" />
          </SideNavSection>
        </SideNav>
      }>
      {ticketId !== null ? (
        <TicketPage
          key={ticketId}
          id={ticketId}
          handoffs={handoffs}
          onApprove={markApproved}
          onUndoApprove={tid => setTasks(prev => prev.map(t => (t.ticketId === tid ? TASKS.find(o => o.id === t.id) ?? t : t)))}
          onAddHandoff={h => setHandoffs(prev => [...prev, h])}
          onRemoveHandoff={hid => setHandoffs(prev => prev.filter(h => h.id !== hid))}
        />
      ) : route === 'workflow-new' ? (
        <CreateWorkflowPage />
      ) : route === 'workflow-draft' ? (
        <DraftWorkflowPage onTurnOn={() => (window.location.hash = 'workflow-1')} />
      ) : route === 'workflow-1' ? (
        <LiveWorkflowPage handoffs={handoffs} isStep3Approved={isStep3Approved} />
      ) : (
        <HomePage tasks={tasks} />
      )}
    </AppShell>
  );
}
