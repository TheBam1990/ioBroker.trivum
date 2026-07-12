'use strict';

const convert = require('xml-js');

function text(value, fallback = '') {
    if (value === undefined || value === null) {
        return fallback;
    }
    if (typeof value === 'object' && '_text' in value) {
        return String(value._text ?? fallback);
    }
    return String(value);
}

function asArray(value) {
    if (!value) {
        return [];
    }
    return Array.isArray(value) ? value : [value];
}

/**
 * Convert an XML response into the compact xml-js representation.
 *
 * @param {unknown} xml XML response
 * @returns {import("xml-js").ElementCompact} Parsed XML
 */
function parseXml(xml) {
    return convert.xml2js(String(xml || ''), { compact: true });
}

/**
 * Parse the zone list returned by trivum.
 *
 * @param {unknown} xml XML response
 * @returns {Array<{id: string, description: string, status: string, volume: number}>} Zones
 */
function parseZones(xml) {
    const document = parseXml(xml);
    const zones = asArray(document.rows && document.rows.zone);
    return zones
        .map((zone, index) => ({
            id: text(zone.id, String(index)),
            description: text(zone.description, `Zone ${index + 1}`),
            status: text(zone.status),
            volume: Number(text(zone.volume, '0')),
        }))
        .filter(zone => zone.id);
}

/**
 * Read the active-zone value from a change response.
 *
 * @param {unknown} xml XML response
 * @returns {string} Active zones
 */
function parseActiveZones(xml) {
    const document = parseXml(xml);
    return text(document.rows && document.rows.system && document.rows.system.activeZones, '');
}

/**
 * Create a stable ioBroker object ID for a zone.
 *
 * @param {unknown} description Zone description
 * @param {unknown} id Zone ID
 * @returns {string} Object ID
 */
function zoneKey(description, id) {
    const sanitized = String(description || '')
        .normalize('NFKD')
        .replace(/\p{M}+/gu, '')
        .replace(/[^a-zA-Z0-9_-]+/g, '_')
        .replace(/^_+|_+$/g, '');
    return sanitized || `Zone_${id}`;
}

/**
 * Normalize an IP address or host entered by the user.
 *
 * @param {unknown} value Configured host
 * @returns {string} Normalized host
 */
function normalizeHost(value) {
    return String(value || '')
        .trim()
        .replace(/^https?:\/\//i, '')
        .replace(/\/+$/, '');
}

module.exports = { normalizeHost, parseActiveZones, parseZones, zoneKey };
