'use strict';

const { expect } = require('chai');
const { normalizeHost, parseActiveZones, parseZones, zoneKey } = require('./lib/trivum-api');

describe('trivum XML parsing', () => {
    it('parses one or multiple zones', () => {
        const zones = parseZones(
            '<rows><zone><id>3</id><description>Living room</description><status>playing</status><volume>42</volume></zone></rows>',
        );
        expect(zones).to.deep.equal([{ id: '3', description: 'Living room', status: 'playing', volume: 42 }]);
    });
    it('parses active-zone changes', () => {
        expect(parseActiveZones('<rows><system><activeZones>2</activeZones></system></rows>')).to.equal('2');
    });
    it('normalizes hosts and object IDs', () => {
        expect(normalizeHost('http://192.168.1.5/')).to.equal('192.168.1.5');
        expect(zoneKey('Küche / EG', '1')).to.equal('Kuche_EG');
    });
});
