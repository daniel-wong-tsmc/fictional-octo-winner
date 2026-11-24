import {useToast} from '@astryxdesign/core/Toast';
import {SharedDataOverview} from '@workspace/astryx-workflows/components/SharedDataOverview';
import {failedMessage, personName, type SharedData} from '../sharedData';
import {shortDateTime} from '../tasks';

/**
 * The page for data someone else's workflow shares with you. It renders SharedDataOverview, which is built
 * from the same parts as every workflow page; this only maps the data into its props.
 */
export function SharedDataPage({data: d, isInPanel}: {data: SharedData; isInPanel?: boolean}) {
  const toast = useToast();
  const isReady = d.lastRun.result === 'ready';
  const owner = personName(d.owner);
  const {columns, rows, asOf} = d.preview;
  return (
    <SharedDataOverview
      name={d.name}
      summary={d.description}
      updated={shortDateTime(d.lastRun.at)}
      sharedBy={d.owner}
      workflow={d.workflow}
      updates={d.updates}
      format={d.format}
      sheet={{columns, rows}}
      sheetNote={`${rows.length} rows, ${columns.length} columns. ${isReady ? `As of ${shortDateTime(asOf)}.` : `From the last run that worked, ${shortDateTime(asOf)}.`}`}
      runs={d.runs.map(r => ({
        period: r.started,
        started: shortDateTime(r.started),
        tone: r.result === 'ready' ? 'success' : 'error',
        result: r.result === 'ready' ? 'Ready' : 'Failed, no output',
        finished: shortDateTime(r.finished),
      }))}
      useHref={`#workflow-new?data=${d.id}`}
      isInPanel={isInPanel}
      failure={
        isReady
          ? undefined
          : {
              message: failedMessage(d),
              askLabel: `Ask ${owner}`,
              onAsk: () => toast({body: `Asked ${owner} to check ${d.workflow}. Workflows that read it wait until it produces an output.`}),
            }
      }
    />
  );
}
