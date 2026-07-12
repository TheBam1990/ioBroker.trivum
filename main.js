'use strict';

const axios = require('axios').default;
const utils = require('@iobroker/adapter-core');
const { normalizeHost, parseActiveZones, parseZones, zoneKey } = require('./lib/trivum-api');

function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}

class Trivum extends utils.Adapter {
    constructor(options) {
        super({ ...options, name: 'trivum' });
        this.client = axios.create();
        this.zones = new Map();
        this.pollTimer = null;
        this.resetTimers = new Map();
        this.stopped = false;
        this.polling = false;
        this.on('ready', () => this.onReady());
        this.on('stateChange', (id, state) => this.onStateChange(id, state));
        this.on('unload', callback => this.onUnload(callback));
    }

    async onReady() {
        this.stopped = false;
        await this.setStateAsync('info.connection', false, true);
        await this.setStateAsync('info.lastError', '', true);
        await this.createGlobalObjects();
        await this.subscribeStatesAsync('*');

        const host = normalizeHost(this.config.adresse);
        if (!host) {
            await this.setError('trivum IP address is missing');
            return;
        }
        this.pollInterval = Math.max(Number(this.config.pollInterval) || 5000, 1000);
        this.client = axios.create({
            baseURL: `http://${host}`,
            timeout: Math.max(Number(this.config.timeout) || 10000, 1000),
            responseType: 'text',
        });
        try {
            await this.refresh();
            await this.createPagingObjects();
            this.schedulePoll(this.pollInterval);
        } catch (error) {
            await this.setError(`Initialization failed: ${errorMessage(error)}`);
            this.schedulePoll(this.pollInterval);
        }
    }

    async createGlobalObjects() {
        await this.extendObjectAsync('Global', { type: 'channel', common: { name: 'Global controls' }, native: {} });
        await this.ensureState('Global.ALLOFF', 'All zones off', 'boolean', 'button', false, true);
        await this.ensureState('Global.Aktive_zonen', 'Active zones', 'string', 'text', true, false);
    }

    async createPagingObjects() {
        const count = Math.max(Number(this.config.option3) || 0, 0);
        for (let index = 0; index < count; index++) {
            await this.ensureState(`Global.Paging${index}`, `Paging ${index}`, 'boolean', 'button', false, true);
        }
    }

    async ensureState(id, name, type, role, read, write, unit) {
        const common = { name, type, role, read, write };
        if (unit) {
            common.unit = unit;
        }
        await this.extendObjectAsync(id, { type: 'state', common, native: {} });
    }

    async refresh() {
        if (!this.client || this.polling) {
            return;
        }
        this.polling = true;
        try {
            const response = await this.client.get('/xml/zone/getAll.xml');
            const zones = parseZones(response.data);
            for (const zone of zones) {
                await this.registerZone(zone);
            }
            try {
                const changes = await this.client.get('/xml/zone/getChanges.xml', {
                    params: { zone: '@0', clientid: 90, now: '', apilevel: 3 },
                });
                const activeZones = parseActiveZones(changes.data);
                if (activeZones !== '') {
                    await this.setStateChangedAsync('Global.Aktive_zonen', activeZones, true);
                }
            } catch (error) {
                this.log.debug(`Active-zone query failed: ${errorMessage(error)}`);
            }
            await this.setStateAsync('info.connection', true, true);
            await this.setStateAsync('info.lastError', '', true);
            await this.setStateAsync('info.lastUpdate', Date.now(), true);
        } finally {
            this.polling = false;
        }
    }

    async registerZone(zone) {
        let stored = this.zones.get(zone.id);
        if (!stored) {
            stored = { ...zone, key: zoneKey(zone.description, zone.id) };
            this.zones.set(zone.id, stored);
            await this.createZoneObjects(stored);
        } else {
            Object.assign(stored, zone);
        }
        await this.setStateChangedAsync(`${stored.key}.Status`, zone.status, true);
        await this.setStateChangedAsync(`${stored.key}.VOLUME`, zone.volume, true);
    }

    async createZoneObjects(zone) {
        await this.extendObjectAsync(zone.key, {
            type: 'device',
            common: { name: zone.description },
            native: { zoneId: zone.id },
        });
        await this.ensureState(`${zone.key}.Muten`, 'Mute', 'boolean', 'switch.mute', true, true);
        await this.ensureState(`${zone.key}.DEFAULT_STREAMING`, 'Default stream', 'boolean', 'button', false, true);
        await this.ensureState(`${zone.key}.ZONECMD_DEFAULT_TUNER`, 'Default tuner', 'boolean', 'button', false, true);
        await this.ensureState(`${zone.key}.VOLUME`, 'Volume', 'number', 'level.volume', true, true, '%');
        await this.ensureState(`${zone.key}.ZONECMD_POWER_OFF`, 'Zone off', 'boolean', 'button', false, true);
        await this.ensureState(`${zone.key}.Status`, 'Status', 'string', 'text', true, false);
    }

    schedulePoll(delay) {
        if (this.stopped) {
            return;
        }
        if (this.pollTimer) {
            this.clearTimeout(this.pollTimer);
        }
        this.pollTimer = this.setTimeout(async () => {
            try {
                await this.refresh();
            } catch (error) {
                await this.setError(`Polling failed: ${errorMessage(error)}`);
            }
            this.schedulePoll(this.pollInterval);
        }, delay);
    }

    async onStateChange(id, state) {
        if (!state || state.ack || !this.client || this.stopped) {
            return;
        }
        const relative = id.startsWith(`${this.namespace}.`) ? id.slice(this.namespace.length + 1) : id;
        try {
            if (relative === 'Global.ALLOFF') {
                if (state.val) {
                    await this.runCommand('@0', 15);
                }
                await this.resetButton(relative);
                return;
            }
            const paging = /^Global\.Paging(\d+)$/.exec(relative);
            if (paging) {
                if (state.val) {
                    await this.client.get('/xml/paging/start.xml', { params: { id: paging[1] } });
                }
                await this.resetButton(relative);
                return;
            }
            const separator = relative.lastIndexOf('.');
            if (separator < 0) {
                return;
            }
            const key = relative.slice(0, separator);
            const property = relative.slice(separator + 1);
            const zone = [...this.zones.values()].find(item => item.key === key);
            if (!zone) {
                return;
            }
            if (property === 'Muten') {
                await this.runCommand(zone.id, state.val ? 680 : 681);
                await this.setStateAsync(relative, Boolean(state.val), true);
            } else if (property === 'DEFAULT_STREAMING' && state.val) {
                await this.runCommand(zone.id, 50);
                await this.resetButton(relative);
            } else if (property === 'ZONECMD_DEFAULT_TUNER' && state.val) {
                await this.runCommand(zone.id, 51);
                await this.resetButton(relative);
            } else if (property === 'ZONECMD_POWER_OFF' && state.val) {
                await this.runCommand(zone.id, 1);
                await this.resetButton(relative);
            } else if (property === 'VOLUME') {
                const volume = Math.min(Math.max(Math.round(Number(state.val)), 0), 100);
                await this.runCommand(zone.id, `9${String(volume).padStart(2, '0')}`);
                await this.setStateAsync(relative, volume, true);
            }
            await this.setStateAsync('info.connection', true, true);
        } catch (error) {
            await this.setError(`Command failed for ${relative}: ${errorMessage(error)}`);
        }
    }

    async runCommand(zoneId, command) {
        await this.client.get('/xml/zone/runCommand.xml', { params: { zone: `@${zoneId}`, command } });
    }

    async resetButton(id) {
        const previous = this.resetTimers.get(id);
        if (previous) {
            this.clearTimeout(previous);
        }
        const timer = this.setTimeout(() => {
            this.resetTimers.delete(id);
            void this.setStateAsync(id, false, true);
        }, 1000);
        this.resetTimers.set(id, timer);
    }

    async setError(message) {
        this.log.warn(message);
        await this.setStateAsync('info.lastError', message, true);
        await this.setStateAsync('info.connection', false, true);
    }

    onUnload(callback) {
        this.stopped = true;
        if (this.pollTimer) {
            this.clearTimeout(this.pollTimer);
        }
        for (const timer of this.resetTimers.values()) {
            this.clearTimeout(timer);
        }
        this.resetTimers.clear();
        callback();
    }
}

if (require.main !== module) {
    module.exports = options => new Trivum(options);
} else {
    new Trivum();
}
