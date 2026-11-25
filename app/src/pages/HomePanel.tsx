import {useRef, type ReactNode} from 'react';
import {Drawer, DrawerHeader} from '@astryxdesign/core/Drawer';
import {Layout, LayoutContent} from '@astryxdesign/core/Layout';
import {ResizeHandle, useResizable} from '@astryxdesign/core/Resizable';
import {useMediaQuery} from '@astryxdesign/core/hooks';

/** The panel starts this wide and can be dragged between the two limits. The last width is remembered. */
const DEFAULT_WIDTH = 720;
const MIN_WIDTH = 420;
/** How much of Home stays visible when the panel is dragged as wide as it goes. */
const HOME_REVEAL = 160;

/**
 * Home's side panel. Clicking a card on Home's board opens that card's page here, sliding in from the right,
 * so the board stays in view. The handle on its left edge drags it wider or narrower. The page's title (its
 * nameHref) opens the full page.
 *
 * `route` is the page shown (such as "workflow-1"), or null when closed; `page` is that page, rendered with
 * isInPanel. The last page stays rendered while the panel slides out.
 */
export function HomePanel({route, title, page, onClose}: {route: string | null; title: string; page: ReactNode; onClose: () => void}) {
  const isSmall = useMediaQuery('(max-width: 640px)');
  // Keep the last page while the panel slides out, so it doesn't go blank mid-slide.
  const last = useRef<{route: string; title: string; page: ReactNode} | null>(null);
  if (route && page) last.current = {route, title, page};
  const shown = last.current;
  const resizable = useResizable({
    defaultSize: DEFAULT_WIDTH,
    minSize: MIN_WIDTH,
    maxSize: Math.max(MIN_WIDTH, window.innerWidth - HOME_REVEAL),
    autoSaveId: 'home-panel-width',
  });
  const isOpen = !!route && !!page;

  return (
    <Drawer
      isOpen={isOpen}
      onOpenChange={open => !open && onClose()}
      label={shown?.title ?? 'Details'}
      width={isSmall ? '100%' : resizable.size}
      hasScrim={false}
      padding={0}>
      <Layout
        height="fill"
        padding={4}
        // The handle runs down the panel's left edge; drag it left to widen the panel, right to narrow it.
        start={isSmall ? undefined : <ResizeHandle resizable={resizable} isReversed label="Drag to resize the panel" />}
        header={
          <DrawerHeader
            title={shown?.title ?? ''}
            onOpenChange={open => !open && onClose()}
            hasDivider={false}
          />
        }
        content={<LayoutContent padding={0}>{shown?.page}</LayoutContent>}
      />
    </Drawer>
  );
}
