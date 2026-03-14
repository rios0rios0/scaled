/* eslint-disable import/prefer-default-export */
import * as marked from 'marked';
import * as TerminalRenderer from 'marked-terminal';
import * as util from 'util';
import { ServiceDefinition } from '../types';

marked.setOptions({
  renderer: new TerminalRenderer() as unknown as marked.Renderer,
});

export const printServices = (service: ServiceDefinition, report: JSON) => {
  const lines: string[] = ['# Execution Report'];
  lines.push(`## ${service.name}`);
  lines.push(util.inspect(report, { depth: 5, colors: true }));
  process.stdout.write('\n');
  process.stdout.write(marked(lines.join('\n')));
};
