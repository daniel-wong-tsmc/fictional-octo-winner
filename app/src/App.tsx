import {useEffect, useState} from 'react';
import {AppShell} from '@astryxdesign/core/AppShell';
import {SideNav, SideNavHeading, SideNavItem, SideNavSection} from '@astryxdesign/core/SideNav';
import {NavIcon} from '@astryxdesign/core/NavIcon';
import {Icon} from '@astryxdesign/core/Icon';
import {TextInput} from '@astryxdesign/core/TextInput';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import {Badge} from '@astryxdesign/core/Badge';
import {Button} from '@astryxdesign/core/Button';
import {
  BarChart3, Database, Home as HomeIcon, PlayCircle, Search, Tag, UserCircle, Workflow,
} from 'lucide-react';
import {RECENT_RUNS, TASKS, type Task} from './data';
import {SEED_HANDOFFS, type Handoff} from './handoffs';
import {HomePage} from './pages/HomePage';
import {TicketPage} from './pages/TicketPage';

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
              isSelected={ticketId === null}
              endContent={<Badge label={String(openCount)} />}
            />
            <SideNavItem label="Workflows" icon={Workflow} href="#home" />
            <SideNavItem label="Datasets" icon={Database} href="#home" />
            <SideNavItem label="Runs" icon={PlayCircle} href="#home" />
            <SideNavItem label="Analytics" icon={BarChart3} href="#home" />
            <SideNavItem label="Tags" icon={Tag} href="#home" />
          </SideNavSection>
          <SideNavSection
            title="Recent runs"
            endContent={<Button label="View all" variant="ghost" size="sm" href="#home" />}>
            {RECENT_RUNS.map(run => (
              <SideNavItem
                key={run.name}
                label={run.name}
                href={`#ticket-${run.ticketId}`}
                isSelected={ticketId === run.ticketId}
                endContent={<StatusDot variant={run.dot} label={run.label} tooltip={`${run.label}, ${run.ago} ago`} />}
              />
            ))}
          </SideNavSection>
        </SideNav>
      }>
      {ticketId !== null ? (
        <TicketPage
          key={ticketId}
          id={ticketId}
          handoffs={handoffs}
          onApprove={markApproved}
          onAddHandoff={h => setHandoffs(prev => [...prev, h])}
          onRemoveHandoff={hid => setHandoffs(prev => prev.filter(h => h.id !== hid))}
        />
      ) : (
        <HomePage tasks={tasks} />
      )}
    </AppShell>
  );
}
