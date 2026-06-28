export * from './Action';

import type { Action } from './Action';
import { autoPlayNextVideoAction } from './AutoPlayNextVideoAction';
import { mojWarningStopAction } from './MojWarningStopAction';

export const actions: Action[] = [mojWarningStopAction, autoPlayNextVideoAction];
