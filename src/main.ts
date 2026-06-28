import { actions, matchesAction } from './actions';

console.log('[Paul.LTC] userscript loaded', {
  href: window.location.href,
  isTopWindow: window.top === window.self,
});

async function bootstrap() {
  if (window.top !== window.self) {
    console.log('[Paul.LTC] 略過 iframe', window.location.href);
    return;
  }

  console.log('[Paul.LTC] 腳本啟動', window.location.href);

  const matchedActions = actions.filter((action) => matchesAction(action));
  console.log(
    '[Paul.LTC] 匹配任務',
    matchedActions.map((action) => action.name),
  );

  for (const action of matchedActions) {
    try {
      await action.run();
    } catch (error) {
      console.error(`[Paul.LTC] ${action.name} failed`, error);
    }
  }
}

void bootstrap();
