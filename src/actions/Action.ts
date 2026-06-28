export interface Action {
  name: string;
  match: RegExp;
  run: () => void | Promise<void>;
}

export function matchesAction(action: Action, url = window.location.href): boolean {
  return action.match.test(url);
}
