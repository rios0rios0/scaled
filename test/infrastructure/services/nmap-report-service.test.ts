import { expect } from 'chai';
import { NMAPReportService } from '../../../src/infrastructure/services/nmap-report-service';
import { Base64Message } from '../../../src/types';

function buildNmapXml(hosts: Array<{
  hostname: string;
  ports: Array<{ portid: string; protocol: string }>;
}>): string {
  const hostsXml = hosts.map((host) => `
  <host starttime="1617000000" endtime="1617000001">
    <status state="up" reason="echo-reply" reason_ttl="64"/>
    <address addr="192.168.1.1" addrtype="ipv4"/>
    <hostnames>
      <hostname name="${host.hostname}" type="PTR"/>
    </hostnames>
    <ports>
      <extraports state="closed" count="999">
        <extrareasons reason="resets" count="999"/>
      </extraports>
      ${host.ports.map((p) => `<port protocol="${p.protocol}" portid="${p.portid}">
        <state state="open" reason="syn-ack" reason_ttl="64"/>
      </port>`).join('\n      ')}
    </ports>
    <times srtt="1000" rttvar="500" to="100000"/>
  </host>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<nmaprun scanner="nmap" args="nmap -sV" start="1617000000" startstr="Thu Apr 01 00:00:00 2021" version="7.92" xmloutputversion="1.04">
  <scaninfo type="syn" protocol="tcp" numservices="1000" services="1-1000"/>
  <verbose level="0"/>
  <debugging level="0"/>
  ${hostsXml}
  <runstats>
    <finished time="1617000001" timestr="Thu Apr 01 00:00:01 2021" elapsed="1.00" summary="Nmap done" exit="success"/>
    <hosts up="1" down="0" total="1"/>
  </runstats>
</nmaprun>`;
}

function toBase64(xml: string): Base64Message {
  return new Base64Message(Buffer.from(xml).toString('base64'));
}

describe('NMAPReportService', () => {
  describe('unique() (via toReadable)', () => {
    it('should not duplicate ports with the same id across multiple reports', async () => {
      const xml1 = buildNmapXml([{ hostname: 'host1.example.com', ports: [{ portid: '80', protocol: 'tcp' }] }]);
      const xml2 = buildNmapXml([{ hostname: 'host2.example.com', ports: [{ portid: '80', protocol: 'tcp' }, { portid: '443', protocol: 'tcp' }] }]);

      const result = JSON.parse(await NMAPReportService.toReadable([toBase64(xml1), toBase64(xml2)]));

      const portIds = result.ports.map((p: { id: string }) => p.id);
      expect(portIds).to.deep.equal(['80', '443']);
      expect(portIds.filter((id: string) => id === '80').length).to.equal(1);
    });

    it('should keep all unique ports when there are no duplicates', async () => {
      const xml = buildNmapXml([{ hostname: 'host.example.com', ports: [{ portid: '22', protocol: 'tcp' }, { portid: '80', protocol: 'tcp' }, { portid: '443', protocol: 'tcp' }] }]);

      const result = JSON.parse(await NMAPReportService.toReadable([toBase64(xml)]));

      const portIds = result.ports.map((p: { id: string }) => p.id);
      expect(portIds).to.have.members(['22', '80', '443']);
    });
  });

  describe('toReadable()', () => {
    it('should return empty object when no messages provided', async () => {
      const result = await NMAPReportService.toReadable([]);
      expect(result).to.equal('{}');
    });

    it('should return ports and hostnames for a single host', async () => {
      const xml = buildNmapXml([{ hostname: 'single.example.com', ports: [{ portid: '80', protocol: 'tcp' }] }]);

      const result = JSON.parse(await NMAPReportService.toReadable([toBase64(xml)]));

      expect(result.hostnames).to.include('single.example.com');
      expect(result.ports).to.have.length(1);
      expect(result.ports[0].id).to.equal('80');
    });

    it('should accumulate ports from multiple hosts in a single report', async () => {
      const xml = buildNmapXml([
        { hostname: 'host1.example.com', ports: [{ portid: '22', protocol: 'tcp' }] },
        { hostname: 'host2.example.com', ports: [{ portid: '80', protocol: 'tcp' }] },
      ]);

      const result = JSON.parse(await NMAPReportService.toReadable([toBase64(xml)]));

      const portIds = result.ports.map((p: { id: string }) => p.id);
      expect(portIds).to.include('22');
      expect(portIds).to.include('80');
    });

    it('should not lose the first port when aggregating across multiple hosts', async () => {
      const xml = buildNmapXml([
        { hostname: 'first.example.com', ports: [{ portid: '22', protocol: 'tcp' }] },
        { hostname: 'second.example.com', ports: [{ portid: '80', protocol: 'tcp' }] },
        { hostname: 'third.example.com', ports: [{ portid: '443', protocol: 'tcp' }] },
      ]);

      const result = JSON.parse(await NMAPReportService.toReadable([toBase64(xml)]));

      const portIds = result.ports.map((p: { id: string }) => p.id);
      expect(portIds).to.include('22');
      expect(portIds).to.include('80');
      expect(portIds).to.include('443');
    });

    it('should accumulate hostnames from multiple hosts', async () => {
      const xml = buildNmapXml([
        { hostname: 'host1.example.com', ports: [{ portid: '22', protocol: 'tcp' }] },
        { hostname: 'host2.example.com', ports: [{ portid: '80', protocol: 'tcp' }] },
      ]);

      const result = JSON.parse(await NMAPReportService.toReadable([toBase64(xml)]));

      expect(result.hostnames).to.include('host1.example.com');
      expect(result.hostnames).to.include('host2.example.com');
    });

    it('should not duplicate hostnames across multiple hosts', async () => {
      const xml = buildNmapXml([
        { hostname: 'shared.example.com', ports: [{ portid: '22', protocol: 'tcp' }] },
        { hostname: 'shared.example.com', ports: [{ portid: '80', protocol: 'tcp' }] },
      ]);

      const result = JSON.parse(await NMAPReportService.toReadable([toBase64(xml)]));

      const sharedCount = result.hostnames.filter((h: string) => h === 'shared.example.com').length;
      expect(sharedCount).to.equal(1);
    });
  });
});
