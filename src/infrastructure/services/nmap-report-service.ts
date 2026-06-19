import { parseStringPromise as parser } from 'xml2js';
import { Base64Message, NMAPReport, NMAPService } from '../../types';
import { ReportService } from '../../domain/services/report-service';
import { NMAPReadableReport, Readable } from '../../domain/entities/nmap-readable-report';

// eslint-disable-next-line import/prefer-default-export
export class NMAPReportService extends ReportService {
  private static unique(haystack: Array<any>, needle: Array<any>, key: string): Array<any> {
    return haystack.concat(needle.filter((item) => !haystack.some((h) => h[key] === item[key])));
  }

  private static reducer(iterable: Array<any>): Array<any> {
    return iterable.reduce((total, current) => total.concat(current), []);
  }

  private static resolver(service: NMAPService): string {
    if (service?.cpe !== undefined) return service?.cpe.reduce((total, current) => total.concat(current), '');
    return `${service.$.name}:${service.$.product}:${service.$.version ?? ''}:${service.$.conf}`;
  }

  static async toReadable(base64Messages: Base64Message[]): Promise<string> {
    if (base64Messages.length > 0) {
      const reports: NMAPReport[] = [];
      const decoded = base64Messages.map((message) => message.decode());
      await Promise.all(decoded.map(async (message) => reports.push(await parser(message))));
      let final: Readable = {};
      reports.forEach((report) => {
        // console.log(report.nmaprun.$.args);

        if (report.nmaprun.host) {
          report.nmaprun.host.forEach((host) => {
            let hostnames = NMAPReportService.reducer(
              host.hostnames.map((hname) => hname.hostname.map((last) => last.$.name)),
            );
            hostnames = hostnames.filter((value, index) => hostnames.indexOf(value) === index);

            const ports = NMAPReportService.reducer(
              host.ports.map((hport) => hport.port.map((p) => ({
                id: p.$.portid,
                protocol: p.$.protocol,
                services: p.service?.map((hservice) => NMAPReportService.resolver(hservice)),
              }))),
            );

            if (final.ports) {
              final.ports = NMAPReportService.unique(final.ports, ports, 'id');
              const mergedHostnames = (final.hostnames || []).concat(hostnames);
              final.hostnames = Array.from(new Set(mergedHostnames));
            } else {
              final = { hostnames, ports: [...ports] };
            }
          });
        }
      });

      // console.log(util.inspect(final, {depth: 5, colors: true}));
      return new NMAPReadableReport(final).toJson();
    }

    return '{}';
  }
}
